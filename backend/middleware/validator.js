const { validationResult } = require('express-validator');

// Fields whose values should never be reflected in client error responses
const SENSITIVE_FIELDS = new Set([
  'password',
  'new_password',
  'old_password',
  'confirm_password',
  'token',
  'reset_token',
  'otp',
  'login_otp',
  'secret',
  'key_secret',
  'razorpay_key_secret',
  'razorpay_signature',
  'webhook_secret'
]);

// Generic validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorList = errors.array();
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      request_id: req.id,
      message: errorList[0]?.msg || 'Validation Error',
      errors: errorList.map(err => {
        const fieldName = (err.path || err.param || '').toLowerCase();
        const isSensitive = SENSITIVE_FIELDS.has(fieldName) || fieldName.includes('password') || fieldName.includes('secret');
        return {
          field: err.path || err.param,
          message: err.msg,
          value: isSensitive ? '[REDACTED]' : err.value
        };
      })
    });
  }
  next();
};

module.exports = { validate };
