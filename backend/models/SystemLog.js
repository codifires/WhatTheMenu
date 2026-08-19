const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['info', 'warn', 'error', 'critical'],
    default: 'error'
  },
  method: {
    type: String,
  },
  url: {
    type: String,
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
    ref: 'Cafe', // Usually an owner, could also be a customer depending on route
  },
  created_at: {
    type: Date,
    default: Date.now,
    expires: 2592000 // Automatically delete logs older than 30 days (30 * 24 * 60 * 60 seconds)
  }
});

// Create indexes for faster queries on admin dashboard
systemLogSchema.index({ created_at: -1 });
systemLogSchema.index({ level: 1 });

module.exports = mongoose.model('SystemLog', systemLogSchema);
