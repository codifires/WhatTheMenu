const { body, checkExact } = require('express-validator');
const { validate } = require('../middleware/validator');

const placeOrderValidator = [
  body('cafe_id').isMongoId().withMessage('Valid cafe ID required'),
  body('table_number').optional({ checkFalsy: true }).isString(),
  body('customer_name').optional({ checkFalsy: true }).isString().isLength({ max: 50 }),
  body('customer_phone').optional({ checkFalsy: true }).isString().isLength({ max: 15 }),
  body('payment_method').optional().isIn(['upi', 'online']).withMessage('Payment method must be upi or online'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.menu_item_id').isMongoId().withMessage('Valid menu item ID required'),
  body('items.*.name').optional().isString(),
  body('items.*.quantity').isInt({ gt: 0 }).withMessage('Quantity must be greater than 0'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Valid price required'),
  validate
];

const feedbackValidator = [
  checkExact([
    body('order_number').isString().withMessage('Valid order number required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('review').optional().isString().isLength({ max: 500 })
  ]),
  validate
];

const initiateUpiValidator = [
  body('cafe_id').isMongoId().withMessage('Valid cafe ID required'),
  body('table_number').optional({ checkFalsy: true }).isString(),
  body('customer_name').optional({ checkFalsy: true }).isString().isLength({ max: 50 }),
  body('customer_phone').optional({ checkFalsy: true }).isString().isLength({ max: 15 }),
  body('notes').optional({ checkFalsy: true }).isString().isLength({ max: 500 }),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.menu_item_id').isMongoId().withMessage('Valid menu item ID required'),
  body('items.*.name').optional().isString(),
  body('items.*.quantity').isInt({ gt: 0 }).withMessage('Quantity must be greater than 0'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Valid price required'),
  validate
];

module.exports = {
  placeOrderValidator,
  initiateUpiValidator,
  feedbackValidator
};

