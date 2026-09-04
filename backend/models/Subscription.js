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
    default: 0
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
    default: ''
  },
  razorpay_plan_id: {
    type: String,
    default: ''
  },
  razorpay_payment_id: {
    type: String,
    default: ''
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
    default: ''
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

subscriptionSchema.index({ cafe_id: 1, status: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
