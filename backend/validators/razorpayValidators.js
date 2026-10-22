const { body, param, checkExact } = require('express-validator');
const { validate } = require('../middleware/validator');

const createSubscriptionValidator = [
  checkExact([
    body('plan_name').isIn(['pro', 'pro_plus']).withMessage('Invalid plan name. Choose pro or pro_plus.'),
    body('billing_cycle').optional().isIn(['monthly', 'yearly']).withMessage('Invalid billing cycle. Choose monthly or yearly.')
  ], { locations: ['body'] }),
  validate
];

const verifySubscriptionValidator = [
  checkExact([
    body('razorpay_subscription_id').isString().trim().notEmpty().withMessage('Razorpay subscription ID is required'),
    body('razorpay_payment_id').isString().trim().notEmpty().withMessage('Razorpay payment ID is required'),
    body('razorpay_signature').isString().trim().notEmpty().withMessage('Razorpay signature is required')
  ], { locations: ['body'] }),
  validate
];

const initiateRefundValidator = [
  param('orderId').isMongoId().withMessage('Valid order ID required'),
  checkExact([
    body('reason').optional().isString().trim().isLength({ max: 200 }).withMessage('Reason cannot exceed 200 characters')
  ], { locations: ['body'] }),
  validate
];

const createOrderPaymentValidator = [
  checkExact([
    body('cafe_id').isString().trim().notEmpty().withMessage('Cafe identifier is required'),
    body('customer_name').optional({ checkFalsy: true }).isString().trim().isLength({ max: 50 }),
    body('customer_phone').optional({ checkFalsy: true }).isString().trim().isLength({ min: 10, max: 15 }).matches(/^[0-9+\-\s]+$/).withMessage('Invalid customer phone number'),
    body('table_number').optional({ checkFalsy: true }).isString().trim().isLength({ max: 20 }),
    body('notes').optional({ checkFalsy: true }).isString().trim().isLength({ max: 500 }),
    body('items').isArray({ min: 1, max: 100 }).withMessage('Items must be an array of 1 to 100 items'),
    body('items.*.menu_item_id').isMongoId().withMessage('Valid menu item ID required'),
    body('items.*.name').optional().isString().trim().isLength({ max: 100 }),
    body('items.*.quantity').isInt({ min: 1, max: 99 }).withMessage('Quantity must be between 1 and 99'),
    body('items.*.price').optional().isFloat({ min: 0 }).withMessage('Valid price required'),
    body('items.*.notes').optional().isString().trim().isLength({ max: 200 })
  ], { locations: ['body'] }),
  validate
];

const verifyOrderPaymentValidator = [
  checkExact([
    body('razorpay_order_id').isString().trim().notEmpty().withMessage('Razorpay order ID is required'),
    body('razorpay_payment_id').isString().trim().notEmpty().withMessage('Razorpay payment ID is required'),
    body('razorpay_signature').isString().trim().notEmpty().withMessage('Razorpay signature is required')
  ], { locations: ['body'] }),
  validate
];

module.exports = {
  createSubscriptionValidator,
  verifySubscriptionValidator,
  initiateRefundValidator,
  createOrderPaymentValidator,
  verifyOrderPaymentValidator
};
