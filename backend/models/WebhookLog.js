const mongoose = require('mongoose');

const webhookLogSchema = new mongoose.Schema({
  event_type: {
    type: String,
    required: true,
    index: true
  },
  razorpay_event_id: {
    type: String,
    default: '',
    index: true
  },
  entity_id: {
    type: String,
    default: ''
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
    default: ''
  },
  source: {
    type: String,
    enum: ['subscription', 'order'],
    default: 'subscription'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// TTL: Auto-delete webhook logs after 90 days
webhookLogSchema.index({ created_at: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('WebhookLog', webhookLogSchema);
