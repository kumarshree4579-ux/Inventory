const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const PurchaseOrder = require('../models/PurchaseOrder');
const { Stock } = require('../models/Stock');
const Counter = require('../models/Counter');

exports.getDashboard = async (req, res, next) => {
  try {
    // Owner/admin can pass ?branch=id, otherwise use user's branch
    const rawBranch = req.query.branch || req.user.branch?._id || req.user.branch;
    const branchId = rawBranch ? new mongoose.Types.ObjectId(rawBranch.toString()) : null;
    const branchMatch = branchId ? { branch: branchId } : {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todaySales, todayPurchases, lowStock, outOfStock, pendingPOs, todayCustomers, counters] = await Promise.all([
      Sale.aggregate([
        { $match: { ...branchMatch, createdAt: { $gte: today, $lt: tomorrow }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      PurchaseOrder.aggregate([
        { $match: { ...branchMatch, createdAt: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Stock.countDocuments({ ...branchMatch, available: { $gt: 0, $lte: 10 } }),
      Stock.countDocuments({ ...branchMatch, available: 0 }),
      PurchaseOrder.countDocuments({ ...branchMatch, status: { $in: ['pending', 'approved'] } }),
      Sale.distinct('customer', { ...branchMatch, createdAt: { $gte: today, $lt: tomorrow }, customer: { $ne: null } }),
      Counter.find(branchMatch).populate('cashier', 'name').select('number name cashier status currentCash openingCash').lean(),
    ]);

    const topProducts = await Sale.aggregate([
      { $match: { ...branchMatch, createdAt: { $gte: today, $lt: tomorrow }, status: 'completed' } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', totalQty: { $sum: '$items.quantity' }, totalRevenue: { $sum: '$items.total' } } },
      { $sort: { totalQty: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    ]);

    const monthlySales = await Sale.aggregate([
      { $match: { ...branchMatch, status: 'completed', createdAt: { $gte: monthStart } } },
      { $group: { _id: { $dayOfMonth: '$createdAt' }, total: { $sum: '$total' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      todaySale: todaySales[0]?.total || 0,
      todayBills: todaySales[0]?.count || 0,
      todayPurchase: todayPurchases[0]?.total || 0,
      todayCustomers: todayCustomers.length,
      lowStock,
      outOfStock,
      pendingPOs,
      counters,
      topProducts,
      monthlySales,
    });
  } catch (err) { next(err); }
};
