const mongoose = require('mongoose');

const subscriptionRequestSchema = new mongoose.Schema({
  cafe_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cafe',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  session_id: {
    type: String,
    trim: true,
    maxlength: 100,
    index: true
  },
  utr_number: {
    type: String,
    trim: true,
    maxlength: 100,
    default: ''
  },
  payment_method: {
    type: String,
    default: 'upi',
    maxlength: 30
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'failed', 'cancelled'],
    default: 'pending'
  },
  plan_name: {
    type: String,
    default: 'pro_plus',
    maxlength: 30
  },
  notes: {
    type: String,
    default: '',
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

subscriptionRequestSchema.index({ cafe_id: 1, status: 1, created_at: -1 });

module.exports = mongoose.model('SubscriptionRequest', subscriptionRequestSchema);
