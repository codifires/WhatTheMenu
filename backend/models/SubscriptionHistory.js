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
    required: true
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
    default: ''
  },
  razorpay_invoice_id: {
    type: String,
    default: ''
  },
  payment_method: {
    type: String,
    default: 'razorpay'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SubscriptionHistory', subscriptionHistorySchema);
