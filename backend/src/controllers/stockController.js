const { Stock, StockTransaction } = require('../models/Stock');

// Resolve branch: query param overrides user's branch (for admin/owner viewing other branches)
const resolveBranch = (req) => req.query.branch || req.body.branch || req.user.branch;

exports.getStock = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, lowStock, outOfStock } = req.query;
    const branch = resolveBranch(req);
    if (!branch) return res.status(400).json({ message: 'Branch required' });

    const query = { branch };
    if (lowStock === 'true') query.available = { $gt: 0, $lte: 10 };
    if (outOfStock === 'true') query.available = 0;

    const productMatch = search ? { name: new RegExp(search, 'i'), status: 'active' } : { status: 'active' };

    // For 1L+ records: paginate on Stock, then populate product with match
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Stock.find(query)
        .populate({ path: 'product', match: productMatch, select: 'name sku barcode sellingPrice purchasePrice minStock maxStock unit' })
        .sort({ available: 1 })
        .skip(skip)
        .limit(+limit)
        .lean(),
      Stock.countDocuments(query),
    ]);

    res.json({ data: data.filter(s => s.product), total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

exports.adjustStock = async (req, res, next) => {
  try {
    const { product, quantity, type, note } = req.body;
    const branch = resolveBranch(req);
    if (!product || !quantity || !type || !branch) return res.status(400).json({ message: 'product, quantity, type, branch required' });

    const inc = type === 'inward' ? Math.abs(+quantity) : -Math.abs(+quantity);

    // Prevent negative stock on outward
    if (inc < 0) {
      const current = await Stock.findOne({ product, branch });
      if (!current || current.available + inc < 0)
        return res.status(400).json({ message: 'Insufficient stock for outward adjustment' });
    }

    const stock = await Stock.findOneAndUpdate(
      { product, branch },
      { $inc: { available: inc } },
      { upsert: true, new: true }
    );
    await StockTransaction.create({
      product, branch,
      type: 'adjustment',
      quantity: Math.abs(+quantity),
      note,
      performedBy: req.user._id,
    });
    res.json(stock);
  } catch (err) { next(err); }
};

exports.transferStock = async (req, res, next) => {
  try {
    const { product, quantity, toBranch, note } = req.body;
    const fromBranch = resolveBranch(req);
    if (!product || !quantity || !toBranch || !fromBranch) return res.status(400).json({ message: 'product, quantity, toBranch required' });
    if (fromBranch.toString() === toBranch.toString()) return res.status(400).json({ message: 'Cannot transfer to same branch' });

    const fromStock = await Stock.findOne({ product, branch: fromBranch });
    if (!fromStock || fromStock.available < +quantity)
      return res.status(400).json({ message: `Insufficient stock. Available: ${fromStock?.available || 0}` });

    await Promise.all([
      Stock.findOneAndUpdate({ product, branch: fromBranch }, { $inc: { available: -quantity } }),
      Stock.findOneAndUpdate({ product, branch: toBranch }, { $inc: { available: +quantity } }, { upsert: true }),
      StockTransaction.create({ product, branch: fromBranch, type: 'transfer', quantity: -quantity, note, performedBy: req.user._id }),
      StockTransaction.create({ product, branch: toBranch, type: 'transfer', quantity: +quantity, note, performedBy: req.user._id }),
    ]);
    res.json({ message: 'Stock transferred successfully' });
  } catch (err) { next(err); }
};

exports.getTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, product, type } = req.query;
    const branch = resolveBranch(req);
    const query = { branch };
    if (product) query.product = product;
    if (type) query.type = type;
    const [data, total] = await Promise.all([
      StockTransaction.find(query)
        .populate('product', 'name sku')
        .populate('performedBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit).limit(+limit).lean(),
      StockTransaction.countDocuments(query),
    ]);
    res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};
