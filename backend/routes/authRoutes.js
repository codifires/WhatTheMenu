const express = require('express');
const router = express.Router();
const { register, login, getMe, logout, setPassword, forgotPassword, checkAvailability } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validator');
const { loginValidator } = require('../validators/authValidators');

router.post('/register', authLimiter, register);
router.post('/check-availability', authLimiter, checkAvailability);
router.post('/login', authLimiter, loginValidator, validate, login);
router.post('/forgotpassword', authLimiter, forgotPassword);
router.post('/set-password/:token', authLimiter, setPassword);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
