const router = require('express').Router();
const { login, verifyOTP, refreshToken, logout, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const audit = require('../middleware/audit');

router.post('/login', audit('auth', 'login'), login);
router.post('/verify-otp', verifyOTP);
router.post('/refresh', refreshToken);
router.post('/logout', protect, audit('auth', 'logout'), logout);
router.put('/change-password', protect, audit('auth', 'update'), changePassword);

module.exports = router;
