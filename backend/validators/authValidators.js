const { body, param, checkExact } = require('express-validator');
const { validate } = require('../middleware/validator');

const loginValidator = [
  checkExact([
    body('email')
      .isEmail().withMessage('Valid email is required')
      .normalizeEmail(),
    body('password')
      .isString().withMessage('Password must be a string')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('forceLogout')
      .optional()
      .isBoolean().withMessage('forceLogout must be a boolean'),
    body('logoutSessionIds')
      .optional()
      .isArray().withMessage('logoutSessionIds must be an array')
  ]),
  validate
];

const registerValidator = [
  checkExact([
    body('name')
      .isString().withMessage('Name must be a string')
      .trim()
      .isLength({ min: 2, max: 60 }).withMessage('Name must be between 2 and 60 characters'),
    body('email')
      .isEmail().withMessage('Valid email is required')
      .normalizeEmail(),
    body('password')
      .isString().withMessage('Password must be a string')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone')
      .isString().withMessage('Phone must be a string')
      .trim()
      .isLength({ min: 10, max: 15 }).withMessage('Phone must be between 10 and 15 digits')
      .matches(/^[0-9+\-\s]+$/).withMessage('Invalid phone number format'),
    body('address')
      .isString().withMessage('Address must be a string')
      .trim()
      .isLength({ min: 3, max: 200 }).withMessage('Address must be between 3 and 200 characters'),
    body('plan_name')
      .optional()
      .isIn(['starter', 'pro', 'pro_plus']).withMessage('Plan name must be starter, pro, or pro_plus')
  ]),
  validate
];

const forgotPasswordValidator = [
  checkExact([
    body('email')
      .isEmail().withMessage('Valid email is required')
      .normalizeEmail()
  ]),
  validate
];

const setPasswordValidator = [
  param('token')
    .isString().withMessage('Reset token is required')
    .trim()
    .isLength({ min: 10 }).withMessage('Invalid reset token'),
  checkExact([
    body('password')
      .isString().withMessage('Password must be a string')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ]),
  validate
];

const verifyLoginOtpValidator = [
  checkExact([
    body('email')
      .isEmail().withMessage('Valid email is required')
      .normalizeEmail(),
    body('otp')
      .isString().withMessage('OTP must be a string')
      .trim()
      .isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits')
      .isNumeric().withMessage('OTP must be numeric'),
    body('forceLogout')
      .optional()
      .isBoolean().withMessage('forceLogout must be a boolean'),
    body('logoutSessionIds')
      .optional()
      .isArray().withMessage('logoutSessionIds must be an array')
  ]),
  validate
];

const checkAvailabilityValidator = [
  checkExact([
    body('email')
      .optional({ checkFalsy: true })
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('phone')
      .optional({ checkFalsy: true })
      .isString()
      .trim()
      .isLength({ min: 10, max: 15 }).withMessage('Phone must be between 10 and 15 digits')
  ]),
  validate
];

module.exports = {
  loginValidator,
  registerValidator,
  forgotPasswordValidator,
  setPasswordValidator,
  verifyLoginOtpValidator,
  checkAvailabilityValidator
};