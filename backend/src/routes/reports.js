const router = require('express').Router();
const { salesReport, purchaseReport, profitReport, gstReport, inventoryReport } = require('../controllers/reportController');
const { protect, can } = require('../middleware/auth');

router.use(protect);
router.get('/sales', can('reports', 'view'), salesReport);
router.get('/purchase', can('reports', 'view'), purchaseReport);
router.get('/profit', can('reports', 'view'), profitReport);
router.get('/gst', can('reports', 'view'), gstReport);
router.get('/inventory', can('reports', 'view'), inventoryReport);

module.exports = router;
