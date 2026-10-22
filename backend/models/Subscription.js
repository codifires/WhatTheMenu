const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  cafe_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cafe',
    required: true
  },
  plan_name: {
    type: String,
    enum: ['starter', 'pro', 'pro_plus'],
    required: [true, 'Plan name is required']
  },
  price: {
    type: Number,
    default: 0,
    min: [0, 'Subscription price cannot be negative']
  },
  start_date: {
    type: Date,
    required: true,
    default: Date.now
  },
  end_date: {
    type: Date,
    required: true
  },
  trial_end_date: {
    type: Date // Only set for 'starter' trial plan
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'suspended'],
    default: 'active'
  },
  razorpay_subscription_id: {
    type: String,
    default: '',
    trim: true,
    maxlength: 100
  },
  razorpay_plan_id: {
    type: String,
    default: '',
    trim: true,
    maxlength: 100
  },
  razorpay_payment_id: {
    type: String,
    default: '',
    trim: true,
    maxlength: 100
  },
  billing_cycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  },
  next_billing_date: {
    type: Date
  },
  invoice_id: {
    type: String,
    default: '',
    trim: true,
    maxlength: 100
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes for tenant subscription queries and expiration checks
subscriptionSchema.index({ cafe_id: 1, status: 1 });
subscriptionSchema.index({ status: 1, end_date: 1 });

// Partial unique indexes for payment identifiers
subscriptionSchema.index(
  { razorpay_subscription_id: 1 },
  {
    unique: true,
    partialFilterExpression: { razorpay_subscription_id: { $type: 'string', $gt: '' } }
  }
);
subscriptionSchema.index(
  { razorpay_payment_id: 1 },
  {
    unique: true,
    partialFilterExpression: { razorpay_payment_id: { $type: 'string', $gt: '' } }
  }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
