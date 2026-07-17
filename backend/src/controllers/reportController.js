const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const PurchaseOrder = require('../models/PurchaseOrder');
const Expense = require('../models/Expense');
const { Stock } = require('../models/Stock');

const toObjectId = (id) => new mongoose.Types.ObjectId(id?._id || id);
const getBranchId = (user) => {
  const id = user.branch?._id || user.branch;
  return id ? toObjectId(id) : null;
};

const dateRange = (from, to) => ({
  $gte: from ? new Date(from) : new Date(new Date().setHours(0, 0, 0, 0)),
  $lte: to ? new Date(to) : new Date(),
});

exports.salesReport = async (req, res, next) => {
  try {
    const { from, to, groupBy = 'day' } = req.query;
    const groupFormat = { day: '%Y-%m-%d', month: '%Y-%m', year: '%Y' }[groupBy] || '%Y-%m-%d';
    const branchId = getBranchId(req.user);
    const branchMatch = branchId ? { branch: branchId } : {};
    const data = await Sale.aggregate([
      { $match: { ...branchMatch, status: 'completed', createdAt: dateRange(from, to) } },
      { $group: { _id: { $dateToString: { format: groupFormat, date: '$createdAt' } }, total: { $sum: '$total' }, count: { $sum: 1 }, tax: { $sum: '$taxAmount' }, discount: { $sum: '$discountAmount' } } },
      { $sort: { _id: 1 } },
    ]);
    res.json(data);
  } catch (err) { next(err); }
};

exports.purchaseReport = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const branchId = getBranchId(req.user);
    const branchMatch = branchId ? { branch: branchId } : {};
    const data = await PurchaseOrder.aggregate([
      { $match: { ...branchMatch, createdAt: dateRange(from, to) } },
      { $group: { _id: '$status', total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]);
    res.json(data);
  } catch (err) { next(err); }
};

exports.profitReport = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const branchId = getBranchId(req.user);
    const bm = branchId ? { branch: branchId } : {};
    const [sales, purchases, expenses] = await Promise.all([
      Sale.aggregate([
        { $match: { ...bm, status: 'completed', createdAt: dateRange(from, to) } },
        { $group: { _id: null, revenue: { $sum: '$total' } } },
      ]),
      PurchaseOrder.aggregate([
        { $match: { ...bm, status: 'received', createdAt: dateRange(from, to) } },
        { $group: { _id: null, cost: { $sum: '$total' } } },
      ]),
      Expense.aggregate([
        { $match: { ...bm, date: dateRange(from, to) } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);
    const revenue = sales[0]?.revenue || 0;
    const cost = purchases[0]?.cost || 0;
    const expenseTotal = expenses[0]?.total || 0;
    res.json({ revenue, cost, expenses: expenseTotal, grossProfit: revenue - cost, netProfit: revenue - cost - expenseTotal });
  } catch (err) { next(err); }
};

exports.gstReport = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const branchId = getBranchId(req.user);
    const branchMatch = branchId ? { branch: branchId } : {};
    const data = await Sale.aggregate([
      { $match: { ...branchMatch, status: 'completed', createdAt: dateRange(from, to) } },
      { $unwind: '$items' },
      { $group: { _id: '$items.gst', taxableAmount: { $sum: '$items.total' }, taxAmount: { $sum: { $multiply: ['$items.total', { $divide: ['$items.gst', 100] }] } } } },
      { $sort: { _id: 1 } },
    ]);
    res.json(data);
  } catch (err) { next(err); }
};

exports.inventoryReport = async (req, res, next) => {
  try {
    const branchId = getBranchId(req.user);
    const query = branchId ? { branch: branchId } : {};
    const data = await Stock.find(query)
      .populate('product', 'name sku purchasePrice sellingPrice minStock')
      .sort({ available: 1 });
    res.json(data);
  } catch (err) { next(err); }
};
