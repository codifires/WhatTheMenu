const { body, checkExact } = require('express-validator');
const { validate } = require('../middleware/validator');

const categoryValidator = [
  checkExact([
    body('name').isString().isLength({ min: 2, max: 30 }).withMessage('Name must be between 2 and 30 characters'),
    body('sort_order').optional().isInt({ min: 0 }).withMessage('Sort order must be a non-negative integer')
  ]),
  validate
];

const menuItemValidator = [
  checkExact([
    body('name').isString().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('description').optional().isString().isLength({ max: 200 }),
    body('price').isFloat({ gt: 0 }).withMessage('Price must be greater than 0'),
    body('category_id').isMongoId().withMessage('Valid category ID required'),
    body('is_veg').optional().isBoolean().withMessage('is_veg must be a boolean'),
    body('image_url').optional().isString().withMessage('image_url must be a string')
  ]),
  validate
];

const settingsValidator = [
  body('name').optional({ checkFalsy: true }).isString().isLength({ min: 2, max: 50 }),
  body('phone').optional({ checkFalsy: true }).isString().isLength({ min: 10, max: 15 }).matches(/^[0-9]+$/),
  body('address').optional({ checkFalsy: true }).isString(),
  body('upi_id').optional({ checkFalsy: true }).isString().matches(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/).withMessage('Valid UPI ID format required'),
  body('tax_percentage').optional({ checkFalsy: true }).isFloat({ min: 0, max: 100 }).withMessage('Tax percentage must be between 0 and 100'),
  validate
];

const orderStatusValidator = [
  checkExact([
    body('order_status').isIn(['pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled']).withMessage('Invalid order status')
  ]),
  validate
];

const subscriptionRequestValidator = [
  checkExact([
    body('amount').isNumeric().withMessage('Amount must be numeric'),
    body('plan_name').isIn(['starter', 'pro', 'pro_plus']).withMessage('Invalid plan name')
  ]),
  validate
];

const initiateSubscriptionSessionValidator = [
  checkExact([
    body('plan_name').isIn(['pro', 'pro_plus']).withMessage('Plan name must be starter or pro')
  ]),
  validate
];

module.exports = {
  categoryValidator,
  menuItemValidator,
  settingsValidator,
  orderStatusValidator,
  subscriptionRequestValidator,
  initiateSubscriptionSessionValidator
};
