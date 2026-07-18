const router = require('express').Router();
const Return = require('../models/Return');
const Expense = require('../models/Expense');
const CashDrawer = require('../models/CashDrawer');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const Settings = require('../models/Settings');
const Printer = require('../models/Printer');
const createCRUD = require('../controllers/crudController');
const { protect, can } = require('../middleware/auth');
const audit = require('../middleware/audit');

const getBranch = (req) => req.query.branch || req.user.branch?._id || req.user.branch;

// ── Returns ───────────────────────────────────────────────────────────────────
router.get('/returns', protect, can('pos', 'view'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const branch = getBranch(req);
    const query = branch ? { branch } : {};
    const [data, total] = await Promise.all([
      Return.find(query).populate('items.product', 'name').populate('processedBy', 'name').populate('approvedBy', 'name')
        .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(+limit).lean(),
      Return.countDocuments(query),
    ]);
    res.json({ data, total, page: +page });
  } catch (err) { next(err); }
});

router.post('/returns', protect, can('pos', 'create'), async (req, res, next) => {
  try {
    const branch = getBranch(req);
    const doc = await Return.create({ ...req.body, branch, processedBy: req.user._id });
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

router.put('/returns/:id/approve', protect, can('pos', 'approve'), async (req, res, next) => {
  try {
    const doc = await Return.findByIdAndUpdate(req.params.id, { status: 'approved', approvedBy: req.user._id }, { new: true });
    if (!doc) return res.status(404).json({ message: 'Return not found' });
    res.json(doc);
  } catch (err) { next(err); }
});

// ── Expenses ──────────────────────────────────────────────────────────────────
router.get('/expenses', protect, can('reports', 'view'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, from, to, category } = req.query;
    const branch = getBranch(req);
    const query = branch ? { branch } : {};
    if (category) query.category = category;
    if (from || to) query.date = { ...(from && { $gte: new Date(from) }), ...(to && { $lte: new Date(to) }) };
    const [data, total] = await Promise.all([
      Expense.find(query).populate('paidBy', 'name').sort({ date: -1 }).skip((page - 1) * limit).limit(+limit).lean(),
      Expense.countDocuments(query),
    ]);
    res.json({ data, total, page: +page });
  } catch (err) { next(err); }
});

router.post('/expenses', protect, can('reports', 'create'), async (req, res, next) => {
  try {
    const branch = getBranch(req);
    if (!branch) return res.status(400).json({ message: 'Branch required' });
    const doc = await Expense.create({ ...req.body, branch, paidBy: req.user._id });
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

// ── Cash Drawer ───────────────────────────────────────────────────────────────
router.get('/cash-drawer', protect, can('pos', 'view'), async (req, res, next) => {
  try {
    const branch = getBranch(req);
    const query = { status: 'open', ...(branch && { branch }) };
    const drawer = await CashDrawer.findOne(query).populate('openedBy', 'name').populate('counter', 'number name').lean();
    res.json(drawer || null);
  } catch (err) { next(err); }
});

router.get('/cash-drawer/history', protect, can('pos', 'view'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const branch = getBranch(req);
    const query = branch ? { branch } : {};
    const [data, total] = await Promise.all([
      CashDrawer.find(query).populate('openedBy', 'name').populate('closedBy', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(+limit).lean(),
      CashDrawer.countDocuments(query),
    ]);
    res.json({ data, total, page: +page });
  } catch (err) { next(err); }
});

router.post('/cash-drawer/open', protect, can('pos', 'create'), async (req, res, next) => {
  try {
    const branch = req.body.branch || req.user.branch?._id || req.user.branch;
    if (!branch) return res.status(400).json({ message: 'Branch required' });
    if (req.body.counter) {
      await CashDrawer.updateMany({ counter: req.body.counter, status: 'open' }, { status: 'closed' });
    }
    const drawer = await CashDrawer.create({ ...req.body, branch, openedBy: req.user._id, status: 'open' });
    res.status(201).json(drawer);
  } catch (err) { next(err); }
});

router.put('/cash-drawer/:id/close', protect, can('pos', 'edit'), async (req, res, next) => {
  try {
    const drawer = await CashDrawer.findById(req.params.id);
    if (!drawer) return res.status(404).json({ message: 'Drawer not found' });
    const expectedCash = drawer.openingCash + drawer.cashIn - drawer.cashOut - drawer.expenses;
    const closingCash = req.body.closingCash ?? expectedCash;
    const updated = await CashDrawer.findByIdAndUpdate(
      req.params.id,
      { ...req.body, closingCash, expectedCash, difference: closingCash - expectedCash, closedBy: req.user._id, status: 'closed' },
      { new: true }
    );
    res.json(updated);
  } catch (err) { next(err); }
});

// ── Audit Logs ────────────────────────────────────────────────────────────────
router.get('/audit-logs', protect, can('settings', 'view'), async (req, res, next) => {
  try {
    const { page = 1, limit = 50, module, action } = req.query;
    const branch = getBranch(req);
    const query = branch ? { branch } : {};
    if (module) query.module = module;
    if (action) query.action = action;
    const [data, total] = await Promise.all([
      AuditLog.find(query).populate('user', 'name username').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(+limit).lean(),
      AuditLog.countDocuments(query),
    ]);
    res.json({ data, total, page: +page });
  } catch (err) { next(err); }
});

// ── Notifications ─────────────────────────────────────────────────────────────
router.get('/notifications', protect, async (req, res, next) => {
  try {
    const data = await Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(30).lean();
    res.json(data);
  } catch (err) { next(err); }
});

router.put('/notifications/:id/read', protect, async (req, res, next) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ message: 'Marked as read' });
  } catch (err) { next(err); }
});

router.put('/notifications/read-all', protect, async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
    res.json({ message: 'All marked as read' });
  } catch (err) { next(err); }
});

// ── Settings ──────────────────────────────────────────────────────────────────
router.get('/settings', protect, async (req, res, next) => {
  try {
    const branch = getBranch(req);
    const query = branch ? { branch } : {};
    const settings = await Settings.findOne(query).lean();
    res.json(settings || {});
  } catch (err) { next(err); }
});

router.put('/settings', protect, can('settings', 'edit'), async (req, res, next) => {
  try {
    const branch = getBranch(req);
    const settings = await Settings.findOneAndUpdate(
      { branch: branch || null },
      { ...req.body, branch: branch || undefined },
      { upsert: true, new: true, runValidators: true }
    );
    res.json(settings);
  } catch (err) { next(err); }
});

// ── Printers ──────────────────────────────────────────────────────────────────
const printerCRUD = createCRUD(Printer, 'branch');
router.get('/printers', protect, can('settings', 'view'), printerCRUD.getAll);
router.get('/printers/:id', protect, can('settings', 'view'), printerCRUD.getOne);
router.post('/printers', protect, can('settings', 'create'), audit('printers', 'create'), printerCRUD.create);
router.put('/printers/:id', protect, can('settings', 'edit'), audit('printers', 'update'), printerCRUD.update);
router.delete('/printers/:id', protect, can('settings', 'delete'), audit('printers', 'delete'), printerCRUD.remove);

module.exports = router;
