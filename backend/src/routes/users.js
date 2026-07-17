const router = require('express').Router();
const { getUsers, createUser, updateUser, resetPassword, toggleStatus } = require('../controllers/userController');
const { protect, can } = require('../middleware/auth');

router.use(protect);
router.get('/', can('users', 'view'), getUsers);
router.post('/', can('users', 'create'), createUser);
router.put('/:id', can('users', 'edit'), updateUser);
router.put('/:id/reset-password', can('users', 'edit'), resetPassword);
router.put('/:id/toggle-status', can('users', 'edit'), toggleStatus);

module.exports = router;
