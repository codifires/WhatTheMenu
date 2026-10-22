const { body, param, query, checkExact } = require('express-validator');
const { validate } = require('../middleware/validator');

const mongoIdParamValidator = [
  param('id').isMongoId().withMessage('Valid MongoDB ID required'),
  validate
];

const cafeIdParamValidator = [
  param('cafeId').isMongoId().withMessage('Valid Cafe ID required'),
  validate
];

const createCafeValidator = [
  checkExact([
    body('name').isString().trim().isLength({ min: 2, max: 60 }).withMessage('Name must be between 2 and 60 characters'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('phone').isString().trim().isLength({ min: 10, max: 15 }).matches(/^[0-9+\-\s]+$/).withMessage('Phone must be 10-15 digits'),
    body('address').isString().trim().notEmpty().withMessage('Address is required'),
    body('plan_name').isIn(['starter', 'pro', 'pro_plus']).withMessage('Plan name must be starter, pro, or pro_plus')
  ], { locations: ['body'] }),
  validate
];

const updateCafeValidator = [
  param('id').isMongoId().withMessage('Valid Cafe ID required'),
  checkExact([
    body('name').optional().isString().trim().isLength({ min: 2, max: 60 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().isString().trim().isLength({ min: 10, max: 15 }).matches(/^[0-9+\-\s]+$/),
    body('address').optional().isString().trim().notEmpty(),
    body('plan_name').optional().isIn(['starter', 'pro', 'pro_plus']),
    body('is_active').optional().isBoolean(),
    body('subscription_status').optional().isIn(['active', 'expired', 'suspended'])
  ], { locations: ['body'] }),
  validate
];

const updateSubscriptionValidator = [
  param('id').isMongoId().withMessage('Valid Subscription ID required'),
  checkExact([
    body('status').isIn(['active', 'suspended', 'expired']).withMessage('Invalid status'),
    body('plan_name').optional().isIn(['starter', 'pro', 'pro_plus']).withMessage('Plan name must be starter, pro, or pro_plus'),
    body('end_date').optional().isISO8601().toDate().withMessage('End date must be a valid ISO date')
  ], { locations: ['body'] }),
  validate
];

const rejectSubscriptionRequestValidator = [
  param('id').isMongoId().withMessage('Valid Request ID required'),
  checkExact([
    body('reason').optional().isString().trim().isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters')
  ], { locations: ['body'] }),
  validate
];

const updatePlatformSettingsValidator = [
  checkExact([
    body('trial_days').optional().isInt({ min: 1, max: 365 }).withMessage('Trial days must be between 1 and 365'),
    body('currency').optional().isString().trim().isLength({ min: 1, max: 10 }),
    body('tax_rate').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100'),
    body('payment_live_mode').optional().isBoolean(),
    body('platform_name').optional().isString().trim().isLength({ min: 2, max: 50 }),
    body('contact_email').optional().isEmail().normalizeEmail(),
    body('support_phone').optional().isString().trim().isLength({ max: 20 }),
    body('support_whatsapp').optional().isString().trim().isLength({ max: 20 }),
    body('support_hours').optional().isString().trim().isLength({ max: 100 }),
    body('starter_price').optional().isFloat({ min: 0 }),
    body('pro_price').optional().isFloat({ min: 0 }),
    body('pro_plus_price').optional().isFloat({ min: 0 }),
    body('yearly_discount_percentage').optional().isFloat({ min: 0, max: 100 }),
    body('maintenance_mode').optional().isBoolean(),
    body('starter_features').optional().isArray(),
    body('pro_features').optional().isArray(),
    body('pro_plus_features').optional().isArray()
  ], { locations: ['body'] }),
  validate
];

const uploadGlobalMediaValidator = [
  body('file_name').optional().isString().trim().isLength({ max: 100 }),
  body('category').optional().isString().trim().isLength({ max: 50 }),
  validate
];

module.exports = {
  mongoIdParamValidator,
  cafeIdParamValidator,
  createCafeValidator,
  updateCafeValidator,
  updateSubscriptionValidator,
  rejectSubscriptionRequestValidator,
  updatePlatformSettingsValidator,
  uploadGlobalMediaValidator
};
