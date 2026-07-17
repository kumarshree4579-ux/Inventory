const router = require('express').Router();
const { createSale, holdBill, resumeBill, getSales } = require('../controllers/saleController');
const { protect, can } = require('../middleware/auth');

router.use(protect);
router.get('/', can('pos', 'view'), getSales);
router.post('/', can('pos', 'create'), (req, res, next) => { req.io = req.app.get('io'); next(); }, createSale);
router.put('/:id/hold', can('pos', 'create'), holdBill);
router.put('/:id/resume', can('pos', 'create'), resumeBill);

module.exports = router;
