const router = require('express').Router();
const { createPO, approvePO, receiveGoods, getPOs } = require('../controllers/purchaseController');
const { protect, can } = require('../middleware/auth');

router.use(protect);
router.get('/', can('purchase', 'view'), getPOs);
router.post('/', can('purchase', 'create'), createPO);
router.put('/:id/approve', can('purchase', 'approve'), approvePO);
router.post('/:id/receive', can('purchase', 'edit'), receiveGoods);

module.exports = router;
