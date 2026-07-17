const router = require('express').Router();
const { login, verifyOTP, refreshToken, logout, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/refresh', refreshToken);
router.post('/logout', protect, logout);
router.put('/change-password', protect, changePassword);

module.exports = router;
