const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['info', 'warn', 'error', 'critical', 'security'],
    default: 'error'
  },
  event_type: {
    type: String,
    trim: true
  },
  request_id: {
    type: String,
    trim: true,
    index: true
  },
  method: {
    type: String,
    trim: true
  },
  url: {
    type: String,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  stack: {
    type: String,
  },
  status_code: {
    type: Number,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cafe',
  },
  ip: {
    type: String,
    trim: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
  created_at: {
    type: Date,
    default: Date.now,
    expires: 2592000 // 30-day automatic TTL expiration
  }
});

// Indexes for high-performance log querying and admin dashboard auditing
systemLogSchema.index({ created_at: -1 });
systemLogSchema.index({ level: 1, created_at: -1 });
systemLogSchema.index({ event_type: 1, created_at: -1 });
systemLogSchema.index({ user_id: 1, created_at: -1 });

module.exports = mongoose.model('SystemLog', systemLogSchema);
