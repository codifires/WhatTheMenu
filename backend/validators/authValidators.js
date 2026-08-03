const { body, checkExact } = require('express-validator');
const { validate } = require('../middleware/validator');

const loginValidator = [
  checkExact([
    body('email')
      .isEmail().withMessage('Valid email is required')
      .normalizeEmail(),
    body('password')
      .isString().withMessage('Password must be a string')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ]),
  validate
];

module.exports = { loginValidator };
