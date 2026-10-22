const { body, param, query, checkExact } = require('express-validator');
const { validate } = require('../middleware/validator');

const mongoIdParamValidator = [
  param('id').isMongoId().withMessage('Valid MongoDB ID required'),
  validate
];


const categoryValidator = [
  checkExact([
    body('name').isString().trim().isLength({ min: 2, max: 30 }).withMessage('Name must be between 2 and 30 characters'),
    body('sort_order').optional().isInt({ min: 0 }).withMessage('Sort order must be a non-negative integer')
  ], { locations: ['body'] }),
  validate
];

const updateCategoryValidator = [
  param('id').isMongoId().withMessage('Valid category ID required'),
  checkExact([
    body('name').optional().isString().trim().isLength({ min: 2, max: 30 }).withMessage('Name must be between 2 and 30 characters'),
    body('sort_order').optional().isInt({ min: 0 }).withMessage('Sort order must be a non-negative integer')
  ], { locations: ['body'] }),
  validate
];

const menuItemValidator = [
  checkExact([
    body('name').isString().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('description').optional().isString().trim().isLength({ max: 200 }),
    body('price').isFloat({ gt: 0, max: 100000 }).withMessage('Price must be greater than 0 and less than 100,000'),
    body('category_id').isMongoId().withMessage('Valid category ID required'),
    body('is_veg').optional().isBoolean().withMessage('is_veg must be a boolean'),
    body('image_url').optional({ checkFalsy: true }).isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage('image_url must be a valid http or https URL')
  ], { locations: ['body'] }),
  validate
];

const updateMenuItemValidator = [
  param('id').isMongoId().withMessage('Valid menu item ID required'),
  checkExact([
    body('name').optional().isString().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('description').optional().isString().trim().isLength({ max: 200 }),
    body('price').optional().isFloat({ gt: 0, max: 100000 }).withMessage('Price must be greater than 0 and less than 100,000'),
    body('category_id').optional().isMongoId().withMessage('Valid category ID required'),
    body('is_veg').optional().isBoolean().withMessage('is_veg must be a boolean'),
    body('availability').optional().isBoolean().withMessage('availability must be a boolean'),
    body('image_url').optional({ checkFalsy: true }).isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage('image_url must be a valid http or https URL')
  ], { locations: ['body'] }),
  validate
];

const reorderMenuItemsValidator = [
  checkExact([
    body('itemIds').isArray({ min: 1, max: 500 }).withMessage('itemIds must be an array of item IDs'),
    body('itemIds.*').isMongoId().withMessage('Each item ID must be a valid MongoDB ID')
  ], { locations: ['body'] }),
  validate
];

const toggleAvailabilityValidator = [
  param('id').isMongoId().withMessage('Valid menu item ID required'),
  validate
];

const getOrdersValidator = [
  query('status').optional().isIn(['pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled']).withMessage('Invalid order status filter'),
  query('date').optional().matches(/^(today|\d{4}-\d{2}-\d{2})$/).withMessage('Date must be "today" or YYYY-MM-DD'),
  query('page').optional().isInt({ min: 1, max: 10000 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  validate
];

const orderStatusValidator = [
  param('id').isMongoId().withMessage('Valid order ID required'),
  checkExact([
    body('order_status').isIn(['pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled']).withMessage('Invalid order status')
  ], { locations: ['body'] }),
  validate
];

const updatePaymentStatusValidator = [
  param('id').isMongoId().withMessage('Valid order ID required'),
  checkExact([
    body('payment_status').isIn(['pending', 'completed', 'received', 'failed']).withMessage('Invalid payment status')
  ], { locations: ['body'] }),
  validate
];

const getRevenueValidator = [
  query('view').optional().isIn(['yearly', 'monthly', 'daily']).withMessage('View must be yearly, monthly, or daily'),
  query('year').optional().isInt({ min: 2000, max: 2100 }).withMessage('Valid year required'),
  query('month').optional().isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  validate
];

const settingsValidator = [
  body('name').optional({ checkFalsy: true }).isString().trim().isLength({ min: 2, max: 50 }),
  body('phone').optional({ checkFalsy: true }).isString().trim().isLength({ min: 10, max: 15 }).matches(/^[0-9+\-\s]+$/).withMessage('Phone must be 10-15 digits'),
  body('address').optional({ checkFalsy: true }).isString().trim().isLength({ max: 200 }),
  body('upi_id').optional({ checkFalsy: true }).isString().trim().matches(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/).withMessage('Valid UPI ID format required'),
  body('tax_percentage').optional({ checkFalsy: true }).isFloat({ min: 0, max: 100 }).withMessage('Tax percentage must be between 0 and 100'),
  body('slug').optional({ checkFalsy: true }).isString().trim().matches(/^[a-z0-9-]+$/).withMessage('Custom URL can only contain lowercase letters, numbers, and hyphens'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email address').normalizeEmail(),
  body('razorpay_key_id').optional({ checkFalsy: true }).isString().trim().isLength({ max: 100 }),
  body('razorpay_key_secret').optional({ checkFalsy: true }).isString().trim().isLength({ max: 100 }),
  body('razorpay_webhook_secret').optional({ checkFalsy: true }).isString().trim().isLength({ max: 100 }),
  body('billing_settings').optional(),
  validate
];

const themeSettingsValidator = [
  checkExact([
    body('active_theme').optional().isString().trim().isLength({ min: 2, max: 30 }),
    body('unlock_theme').optional().isString().trim().isLength({ min: 2, max: 30 })
  ], { locations: ['body'] }),
  validate
];

module.exports = {
  mongoIdParamValidator,
  categoryValidator,
  updateCategoryValidator,
  menuItemValidator,
  updateMenuItemValidator,
  reorderMenuItemsValidator,
  toggleAvailabilityValidator,
  getOrdersValidator,
  orderStatusValidator,
  updatePaymentStatusValidator,
  getRevenueValidator,
  settingsValidator,
  themeSettingsValidator
};
