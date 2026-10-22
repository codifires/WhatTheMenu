const express = require('express');
const router = express.Router();
const {
  register,
  login,
  verifyLoginOtp,
  getMe,
  logout,
  setPassword,
  forgotPassword,
  checkAvailability
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  authLimiter,
  otpLimiter,
  passwordResetLimiter,
  apiLimiter
} = require('../middleware/rateLimiter');
const {
  loginValidator,
  registerValidator,
  forgotPasswordValidator,
  setPasswordValidator,
  verifyLoginOtpValidator,
  checkAvailabilityValidator
} = require('../validators/authValidators');

router.post('/register', authLimiter, registerValidator, register);
router.post('/check-availability', authLimiter, checkAvailabilityValidator, checkAvailability);
router.post('/login', authLimiter, loginValidator, login);
router.post('/verify-login-otp', otpLimiter, verifyLoginOtpValidator, verifyLoginOtp);
router.post('/forgotpassword', passwordResetLimiter, forgotPasswordValidator, forgotPassword);
router.post('/set-password/:token', passwordResetLimiter, setPasswordValidator, setPassword);
router.get('/me', protect, apiLimiter, getMe);
router.post('/logout', protect, apiLimiter, logout);

module.exports = router;
