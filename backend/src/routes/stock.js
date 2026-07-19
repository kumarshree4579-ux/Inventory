const router = require('express').Router();
const { getStock, adjustStock, transferStock, getTransactions } = require('../controllers/stockController');
const { protect, can, branchGuard } = require('../middleware/auth');

router.use(protect, branchGuard);
router.get('/', can('inventory', 'view'), getStock);
router.post('/adjust', can('inventory', 'edit'), adjustStock);
router.post('/transfer', can('inventory', 'edit'), transferStock);
router.get('/transactions', can('inventory', 'view'), getTransactions);

module.exports = router;
