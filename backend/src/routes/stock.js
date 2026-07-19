const router = require('express').Router();
const { getStock, getProductStock, adjustStock, transferStock, getTransactions } = require('../controllers/stockController');
const { protect, can, branchGuard } = require('../middleware/auth');

router.use(protect, branchGuard);
router.get('/', can('inventory', 'view'), getStock);
router.get('/transactions', can('inventory', 'view'), getTransactions);
router.get('/product/:productId', can('pos', 'view'), getProductStock);
router.post('/adjust', can('inventory', 'edit'), adjustStock);
router.post('/transfer', can('inventory', 'edit'), transferStock);

module.exports = router;
