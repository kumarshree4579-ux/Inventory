const PurchaseOrder = require('../models/PurchaseOrder');
const { Stock, StockTransaction } = require('../models/Stock');
const { generatePONumber } = require('../utils/helpers');

exports.createPO = async (req, res, next) => {
  try {
    if (!req.body.items?.length) return res.status(400).json({ message: 'Items required' });
    const branchId = req.effectiveBranch || req.user.branch?._id || req.user.branch;
    const subtotal = req.body.items.reduce((s, i) => s + i.total, 0);
    const taxAmount = req.body.items.reduce((s, i) => s + (i.total * ((i.gst || 0) / 100)), 0);
    const po = await PurchaseOrder.create({
      ...req.body,
      poNumber: generatePONumber(),
      branch: branchId,
      createdBy: req.user._id,
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
      status: 'pending',
    });
    res.status(201).json(po);
  } catch (err) { next(err); }
};

exports.approvePO = async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ message: 'PO not found' });
    if (po.status !== 'pending') return res.status(400).json({ message: `Cannot approve PO with status: ${po.status}` });
    po.status = 'approved';
    po.approvedBy = req.user._id;
    await po.save();
    res.json(po);
  } catch (err) { next(err); }
};

exports.receiveGoods = async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!items?.length) return res.status(400).json({ message: 'Items required' });

    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ message: 'PO not found' });
    if (po.status === 'cancelled') return res.status(400).json({ message: 'PO is cancelled' });
    if (po.status === 'received') return res.status(400).json({ message: 'PO already fully received' });

    for (const item of items) {
      const poItem = po.items.id(item.itemId);
      if (!poItem) continue;
      poItem.receivedQty = (poItem.receivedQty || 0) + item.quantity;

      await Promise.all([
        Stock.findOneAndUpdate(
          { product: poItem.product, branch: po.branch },
          { $inc: { available: item.quantity } },
          { upsert: true, new: true }
        ),
        StockTransaction.create({
          product: poItem.product,
          branch: po.branch,
          type: 'inward',
          quantity: item.quantity,
          reference: 'purchase',
          referenceId: po._id,
          performedBy: req.user._id,
        }),
      ]);
    }

    const allReceived = po.items.every(i => i.receivedQty >= i.quantity);
    po.status = allReceived ? 'received' : 'partial';
    await po.save();
    res.json(po);
  } catch (err) { next(err); }
};

exports.getPOs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, supplier } = req.query;
    const query = {};
    if (req.effectiveBranch) query.branch = req.effectiveBranch;
    if (status) query.status = status;
    if (supplier) query.supplier = supplier;
    const [data, total] = await Promise.all([
      PurchaseOrder.find(query).populate('supplier', 'name phone').populate('createdBy', 'name').populate('approvedBy', 'name').skip((page - 1) * limit).limit(+limit).sort({ createdAt: -1 }),
      PurchaseOrder.countDocuments(query),
    ]);
    res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};
