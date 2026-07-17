const router = require('express').Router();
const { getDashboard } = require('../controllers/dashboardController');
const { protect, can } = require('../middleware/auth');

router.get('/', protect, can('reports', 'view'), getDashboard);

module.exports = router;
