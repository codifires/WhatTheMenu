const { body, param, checkExact } = require('express-validator');
const { validate } = require('../middleware/validator');

const placeOrderValidator = [
  checkExact([
    body('cafe_id').isMongoId().withMessage('Valid cafe ID required'),
    body('table_number').optional({ checkFalsy: true }).isString().trim().isLength({ max: 20 }),
    body('customer_name').optional({ checkFalsy: true }).isString().trim().isLength({ max: 50 }),
    body('customer_phone').optional({ checkFalsy: true }).isString().trim().isLength({ min: 10, max: 15 }).matches(/^[0-9+\-\s]+$/).withMessage('Invalid customer phone number'),
    body('payment_method').optional().isIn(['cash', 'razorpay', 'online']).withMessage('Payment method must be cash or razorpay'),
    body('payment_transaction_id').optional({ checkFalsy: true }).isString().trim().isLength({ max: 100 }),
    body('notes').optional({ checkFalsy: true }).isString().trim().isLength({ max: 500 }),
    body('items').isArray({ min: 1, max: 100 }).withMessage('Order must contain between 1 and 100 items'),
    body('items.*.menu_item_id').isMongoId().withMessage('Valid menu item ID required'),
    body('items.*.name').optional().isString().trim().isLength({ max: 100 }),
    body('items.*.quantity').isInt({ min: 1, max: 99 }).withMessage('Quantity must be between 1 and 99'),
    body('items.*.price').optional().isFloat({ min: 0 }).withMessage('Valid price required'),
    body('items.*.notes').optional().isString().trim().isLength({ max: 200 })
  ], { locations: ['body'] }),
  validate
];

const trackOrderValidator = [
  param('orderNumber')
    .isString()
    .trim()
    .matches(/^[a-zA-Z0-9-]+$/)
    .isLength({ min: 3, max: 50 })
    .withMessage('Valid order number required'),
  validate
];

const staffAlertValidator = [
  param('orderNumber')
    .isString()
    .trim()
    .matches(/^[a-zA-Z0-9-]+$/)
    .isLength({ min: 3, max: 50 })
    .withMessage('Valid order number required'),
  checkExact([
    body('type').isIn(['waiter', 'bill']).withMessage('Alert type must be waiter or bill')
  ], { locations: ['body'] }),
  validate
];

const feedbackValidator = [
  checkExact([
    body('order_number').isString().trim().isLength({ min: 3, max: 50 }).withMessage('Valid order number required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('review').optional().isString().trim().isLength({ max: 500 })
  ], { locations: ['body'] }),
  validate
];

module.exports = {
  placeOrderValidator,
  trackOrderValidator,
  staffAlertValidator,
  feedbackValidator
};
