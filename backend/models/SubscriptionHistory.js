const mongoose = require('mongoose');

const subscriptionHistorySchema = new mongoose.Schema({
  cafe_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cafe',
    required: true
  },
  plan_name: {
    type: String,
    required: true,
    enum: ['starter', 'pro', 'pro_plus']
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  start_date: {
    type: Date,
    required: true
  },
  end_date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled'],
    default: 'active'
  },
  razorpay_payment_id: {
    type: String,
    default: '',
    trim: true,
    maxlength: 100
  },
  razorpay_invoice_id: {
    type: String,
    default: '',
    trim: true,
    maxlength: 100
  },
  payment_provider: {
    type: String,
    default: 'razorpay',
    trim: true,
    maxlength: 30
  },
  payment_method: {
    type: String,
    default: 'razorpay',
    trim: true,
    maxlength: 30
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound index for tenant-scoped billing history queries
subscriptionHistorySchema.index({ cafe_id: 1, created_at: -1 });

// Partial unique index for payment identifier (prevents empty string collisions)
subscriptionHistorySchema.index(
  { razorpay_payment_id: 1 },
  {
    unique: true,
    partialFilterExpression: { razorpay_payment_id: { $type: 'string', $gt: '' } }
  }
);

// NOTE: DO NOT ADD TTL TO THIS MODEL. Financial records and receipts must be preserved permanently.

module.exports = mongoose.model('SubscriptionHistory', subscriptionHistorySchema);
