const { body } = require('express-validator');
const { validate } = require('../middleware/validator');

const loginValidator = [
  body('email')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isString().withMessage('Password must be a string')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('forceLogout')
    .optional()
    .isBoolean().withMessage('forceLogout must be a boolean'),
  validate
];

module.exports = { loginValidator };