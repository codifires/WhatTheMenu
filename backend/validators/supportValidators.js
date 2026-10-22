const { body, param, checkExact } = require('express-validator');
const { validate } = require('../middleware/validator');

const createTicketValidator = [
  checkExact([
    body('subject').isString().trim().isLength({ min: 3, max: 150 }).withMessage('Subject must be between 3 and 150 characters'),
    body('category').optional().isIn(['payment_upi', 'menu_qr', 'live_orders', 'subscription', 'other']).withMessage('Invalid category'),
    body('description').isString().trim().isLength({ min: 5, max: 2000 }).withMessage('Description must be between 5 and 2000 characters')
  ], { locations: ['body'] }),
  validate
];

const updateTicketValidator = [
  param('id').isMongoId().withMessage('Valid ticket ID required'),
  checkExact([
    body('status').optional().isIn(['open', 'in_progress', 'resolved', 'closed']).withMessage('Invalid status'),
    body('admin_reply').optional().isString().trim().isLength({ max: 2000 }).withMessage('Admin reply cannot exceed 2000 characters')
  ], { locations: ['body'] }),
  validate
];

module.exports = {
  createTicketValidator,
  updateTicketValidator
};
