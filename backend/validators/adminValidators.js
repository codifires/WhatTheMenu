const { body, checkExact } = require('express-validator');
const { validate } = require('../middleware/validator');

const createCafeValidator = [
  checkExact([
    body('name').isString().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('phone').isString().isLength({ min: 10, max: 15 }).matches(/^[0-9]+$/).withMessage('Phone must be numeric and 10-15 digits'),
    body('address').isString().notEmpty().withMessage('Address is required'),
    body('plan_name').isIn(['starter', 'pro', 'pro_plus']).withMessage('Plan name must be free, starter, or pro')
  ]),
  validate
];

const updateCafeValidator = [
  body('name').optional().isString().isLength({ min: 2, max: 50 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().isString().isLength({ min: 10, max: 15 }).matches(/^[0-9]+$/),
  body('address').optional().isString().notEmpty(),
  validate
];

const updateSubscriptionValidator = [
  checkExact([
    body('status').isIn(['active', 'suspended', 'expired']).withMessage('Invalid status'),
    body('plan_name').optional().isIn(['starter', 'pro_plus', 'enterprise']),
    body('end_date').optional().isISO8601().toDate()
  ]),
  validate
];

module.exports = { createCafeValidator, updateCafeValidator, updateSubscriptionValidator };
