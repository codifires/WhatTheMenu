const mongoose = require('mongoose');

const subscriptionRequestSchema = new mongoose.Schema({
  cafe_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cafe',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  session_id: {
    type: String,
    trim: true,
    index: true
  },
  utr_number: {
    type: String,
    trim: true,
    default: ''
  },
  payment_method: {
    type: String,
    default: 'upi'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'failed', 'cancelled'],
    default: 'pending'
  },
  plan_name: {
    type: String,
    default: 'pro'
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

subscriptionRequestSchema.index({ cafe_id: 1, status: 1 });

module.exports = mongoose.model('SubscriptionRequest', subscriptionRequestSchema);
