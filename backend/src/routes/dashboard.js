const router = require('express').Router();
const { getDashboard } = require('../controllers/dashboardController');
const { protect, can, branchGuard } = require('../middleware/auth');

router.get('/', protect, branchGuard, can('reports', 'view'), getDashboard);

module.exports = router;
