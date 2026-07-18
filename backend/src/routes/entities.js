const router = require('express').Router();
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const Supplier = require('../models/Supplier');
const Customer = require('../models/Customer');
const Branch = require('../models/Branch');
const Counter = require('../models/Counter');
const createCRUD = require('../controllers/crudController');
const { protect, can } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const audit = require('../middleware/audit');

const makeRouter = (Model, viewPerm, writePerm, populate = '') => {
  const r = require('express').Router();
  const crud = createCRUD(Model, populate);
  r.use(protect);
  r.get('/', can(viewPerm, 'view'), crud.getAll);
  r.get('/:id', can(viewPerm, 'view'), crud.getOne);
  r.post('/', can(writePerm, 'create'), crud.create);
  r.put('/:id', can(writePerm, 'edit'), crud.update);
  r.delete('/:id', can(writePerm, 'delete'), crud.remove);
  return r;
};

// Categories
router.use('/categories', makeRouter(Category, 'inventory', 'inventory', 'parent'));

// Brands with logo upload
(() => {
  const r = require('express').Router();
  const crud = createCRUD(Brand);
  r.use(protect);
  r.get('/', can('inventory', 'view'), crud.getAll);
  r.get('/:id', can('inventory', 'view'), crud.getOne);
  r.post('/', can('inventory', 'create'), upload.single('logo'), async (req, res, next) => {
    try {
      if (req.file) req.body.logo = req.file.path;
      res.status(201).json(await Brand.create(req.body));
    } catch (err) { next(err); }
  });
  r.put('/:id', can('inventory', 'edit'), upload.single('logo'), async (req, res, next) => {
    try {
      if (req.file) req.body.logo = req.file.path;
      const doc = await Brand.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!doc) return res.status(404).json({ message: 'Not found' });
      res.json(doc);
    } catch (err) { next(err); }
  });
  r.delete('/:id', can('inventory', 'delete'), crud.remove);
  router.use('/brands', r);
})();

// Suppliers
router.use('/suppliers', makeRouter(Supplier, 'purchase', 'purchase'));

// Customers
(() => {
  const r = require('express').Router();
  const crud = createCRUD(Customer, 'branch');
  r.use(protect);
  r.get('/', can('pos', 'view'), crud.getAll);
  r.get('/by-phone/:phone', can('pos', 'view'), async (req, res, next) => {
    try {
      const doc = await Customer.findOne({ phone: req.params.phone.trim() }).lean();
      if (!doc) return res.status(404).json({ message: 'Not found' });
      res.json(doc);
    } catch (err) { next(err); }
  });
  r.get('/:id', can('pos', 'view'), crud.getOne);
  r.post('/', can('pos', 'create'), crud.create);
  r.put('/:id', can('pos', 'edit'), async (req, res, next) => {
    try {
      const existing = await Customer.findById(req.params.id);
      if (!existing) return res.status(404).json({ message: 'Not found' });
      const update = { ...req.body };
      if (req.body.name && req.body.name.trim() !== existing.name) {
        update.$push = { nameHistory: { from: existing.name, to: req.body.name.trim(), changedBy: req.user._id } };
      }
      const doc = await Customer.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
      res.json(doc);
    } catch (err) { next(err); }
  });
  r.delete('/:id', can('pos', 'delete'), crud.remove);
  router.use('/customers', r);
})();

// Branches — all authenticated users can view (needed for dropdowns)
(() => {
  const r = require('express').Router();
  const crud = createCRUD(Branch, 'manager');
  r.use(protect);
  r.get('/', crud.getAll);                                    // any logged-in user
  r.get('/:id', crud.getOne);
  r.post('/', can('settings', 'create'), audit('branches', 'create'), crud.create);
  r.put('/:id', can('settings', 'edit'), audit('branches', 'update'), crud.update);
  r.delete('/:id', can('settings', 'delete'), audit('branches', 'delete'), crud.remove);
  router.use('/branches', r);
})();

// Counters — filter by branch query param
(() => {
  const r = require('express').Router();
  r.use(protect);
  r.get('/', can('pos', 'view'), async (req, res, next) => {
    try {
      const { page = 1, limit = 50, branch, status } = req.query;
      const query = {};
      if (branch) query.branch = branch;
      else if (req.user.branch) query.branch = req.user.branch;
      if (status) query.status = status;
      const [data, total] = await Promise.all([
        Counter.find(query).populate('branch', 'name').populate('cashier', 'name').populate('printer', 'name')
          .sort({ number: 1 }).skip((page - 1) * limit).limit(+limit).lean(),
        Counter.countDocuments(query),
      ]);
      res.json({ data, total, page: +page });
    } catch (err) { next(err); }
  });
  r.get('/:id', can('pos', 'view'), async (req, res, next) => {
    try {
      const doc = await Counter.findById(req.params.id).populate('branch cashier printer').lean();
      if (!doc) return res.status(404).json({ message: 'Not found' });
      res.json(doc);
    } catch (err) { next(err); }
  });
  r.post('/', can('pos', 'create'), audit('counters', 'create'), async (req, res, next) => {
    try {
      const branch = req.body.branch || req.user.branch;
      if (!branch) return res.status(400).json({ message: 'Branch required' });
      const doc = await Counter.create({ ...req.body, branch });
      res.status(201).json(doc);
    } catch (err) { next(err); }
  });
  r.put('/:id', can('pos', 'edit'), audit('counters', 'update'), async (req, res, next) => {
    try {
      const doc = await Counter.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!doc) return res.status(404).json({ message: 'Not found' });
      res.json(doc);
    } catch (err) { next(err); }
  });
  r.delete('/:id', can('pos', 'delete'), audit('counters', 'delete'), async (req, res, next) => {
    try {
      const doc = await Counter.findByIdAndDelete(req.params.id);
      if (!doc) return res.status(404).json({ message: 'Not found' });
      res.json({ message: 'Deleted' });
    } catch (err) { next(err); }
  });
  router.use('/counters', r);
})();

module.exports = router;
