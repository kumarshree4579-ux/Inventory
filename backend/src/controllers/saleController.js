const Sale = require('../models/Sale');
const { Stock, StockTransaction } = require('../models/Stock');
const { generateBillNumber } = require('../utils/helpers');

exports.createSale = async (req, res, next) => {
  try {
    const { items, customer, paymentMethod, paymentDetails, discountAmount, coupon, branch: bodyBranch, counter: bodyCounter, roundingMethod, originalTotal } = req.body;

    if (!items?.length) return res.status(400).json({ message: 'Cart is empty' });
    if (!paymentMethod) return res.status(400).json({ message: 'Payment method required' });

    const branch = req.effectiveBranch || req.user.branch?._id || req.user.branch;
    const counter = bodyCounter || req.user.counter?._id || req.user.counter;
    if (!branch) return res.status(400).json({ message: 'Branch required' });

    // Validate stock availability
    for (const item of items) {
      const stock = await Stock.findOne({ product: item.product, branch });
      if (!stock || stock.available < item.quantity)
        return res.status(400).json({ message: `Insufficient stock for product ${item.product}` });
    }

    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const taxAmount = items.reduce((sum, i) => sum + (i.total * ((i.gst || 0) / 100)), 0);
    let total = subtotal + taxAmount - (discountAmount || 0);
    
    // Apply rounding
    if (roundingMethod === 'round') total = Math.round(total);
    else if (roundingMethod === 'floor') total = Math.floor(total);
    else if (roundingMethod === 'ceil') total = Math.ceil(total);

    const created = await Sale.create({
      billNumber: generateBillNumber('INV'),
      customer: customer || undefined,
      branch,
      counter: counter || undefined,
      cashier: req.user._id,
      items,
      subtotal,
      taxAmount,
      discountAmount: discountAmount || 0,
      total,
      coupon,
      paymentMethod,
      paymentDetails,
      roundingMethod: roundingMethod || 'none',
      originalTotal: originalTotal || total,
    });

    await Promise.all(items.map(item => Promise.all([
      Stock.findOneAndUpdate(
        { product: item.product, branch },
        { $inc: { available: -item.quantity } }
      ),
      StockTransaction.create({
        product: item.product,
        branch,
        type: 'outward',
        quantity: item.quantity,
        reference: 'sale',
        referenceId: created._id,
        performedBy: req.user._id,
      }),
    ])));

    // Populate product references so frontend can render names in receipt
    const sale = await Sale.findById(created._id)
      .populate('customer', 'name phone')
      .populate('cashier', 'name')
      .populate('items.product', 'name sku')
      .lean();

    const io = req.app.get('io');
    io?.to(`branch_${branch}`).emit('new_sale', { saleId: sale._id, total: sale.total });

    res.status(201).json(sale);
  } catch (err) { next(err); }
};

exports.holdBill = async (req, res, next) => {
  try {
    const sale = await Sale.findByIdAndUpdate(req.params.id, { status: 'held' }, { new: true });
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    res.json(sale);
  } catch (err) { next(err); }
};

exports.resumeBill = async (req, res, next) => {
  try {
    const sale = await Sale.findByIdAndUpdate(req.params.id, { status: 'completed' }, { new: true });
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    res.json(sale);
  } catch (err) { next(err); }
};

exports.getSales = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, from, to, status, cashier } = req.query;
    const branch = req.effectiveBranch;
    const query = {};
    if (branch) query.branch = branch;
    if (status) query.status = status;
    if (cashier) query.cashier = cashier;
    if (from || to) query.createdAt = {
      ...(from && { $gte: new Date(from) }),
      ...(to && { $lte: new Date(to) }),
    };
    const [data, total] = await Promise.all([
      Sale.find(query)
        .populate('customer', 'name phone')
        .populate('cashier', 'name')
        .populate('items.product', 'name sku')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit).limit(+limit).lean(),
      Sale.countDocuments(query),
    ]);
    res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};
