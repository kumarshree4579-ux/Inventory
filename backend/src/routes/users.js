const router = require('express').Router();
const { getUsers, createUser, updateUser, resetPassword, toggleStatus } = require('../controllers/userController');
const { protect, can } = require('../middleware/auth');
const audit = require('../middleware/audit');

router.use(protect);
router.get('/', can('users', 'view'), getUsers);
router.post('/', can('users', 'create'), audit('users', 'create'), createUser);
router.put('/:id', can('users', 'edit'), audit('users', 'update'), updateUser);
router.put('/:id/reset-password', can('users', 'edit'), audit('users', 'update'), resetPassword);
router.put('/:id/toggle-status', can('users', 'edit'), audit('users', 'update'), toggleStatus);

module.exports = router;
