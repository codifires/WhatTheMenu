const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  cafe_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cafe',
    required: true
  },
  ticket_number: {
    type: String,
    required: true,
    unique: true
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 150
  },
  category: {
    type: String,
    enum: ['payment_upi', 'menu_qr', 'live_orders', 'subscription', 'other'],
    default: 'other'
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  priority: {
    type: String,
    enum: ['normal', 'high', 'urgent'],
    default: 'normal'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  admin_reply: {
    type: String,
    default: ''
  },
  resolved_at: {
    type: Date
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Index for quick queries
supportTicketSchema.index({ cafe_id: 1, created_at: -1 });
supportTicketSchema.index({ status: 1, priority: 1, created_at: -1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
