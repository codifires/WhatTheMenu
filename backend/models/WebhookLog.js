const mongoose = require('mongoose');

const webhookLogSchema = new mongoose.Schema({
  event_type: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    index: true
  },
  razorpay_event_id: {
    type: String,
    default: '',
    trim: true,
    maxlength: 100
  },
  entity_id: {
    type: String,
    default: '',
    trim: true,
    maxlength: 100
  },
  payload: {
    type: Object,
    default: {}
  },
  status: {
    type: String,
    enum: ['processed', 'duplicate', 'failed', 'skipped'],
    default: 'processed'
  },
  error_message: {
    type: String,
    default: '',
    trim: true,
    maxlength: 1000
  },
  source: {
    type: String,
    enum: ['subscription', 'order'],
    default: 'subscription'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Compound index for event queries
webhookLogSchema.index({ event_type: 1, created_at: -1 });

// Partial unique index for razorpay_event_id (ensures idempotency without null collisions)
webhookLogSchema.index(
  { razorpay_event_id: 1 },
  {
    unique: true,
    partialFilterExpression: { razorpay_event_id: { $type: 'string', $gt: '' } }
  }
);

// TTL: Auto-delete webhook operational logs after 90 days (7,776,000 seconds)
webhookLogSchema.index({ created_at: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('WebhookLog', webhookLogSchema);
