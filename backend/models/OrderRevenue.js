const mongoose = require('mongoose');

const orderRevenueItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

/**
 * OrderRevenue — Permanent financial revenue ledger.
 *
 * One immutable document is created per completed/received order.
 * This collection has NO TTL index and is NEVER deleted or pruned,
 * ensuring complete legal, tax, and accounting compliance for restaurants.
 */
const orderRevenueSchema = new mongoose.Schema({
  cafe_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cafe',
    required: true,
    index: true
  },
  order_number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 64
  },
  token_number: {
    type: String,
    default: '',
    trim: true,
    maxlength: 20
  },
  customer_name: {
    type: String,
    default: 'Guest',
    trim: true,
    maxlength: 50
  },
  table_number: {
    type: String,
    default: '',
    trim: true,
    maxlength: 20
  },
  items: [orderRevenueItemSchema],
  items_count: {
    type: Number,
    default: 0,
    min: 0
  },
  total_amount: {
    type: Number,
    required: true,
    min: 0
  },
  payment_provider: {
    type: String,
    enum: ['razorpay', 'cash'],
    default: 'razorpay',
    index: true
  },
  payment_method: {
    type: String,
    enum: ['cash', 'online', 'razorpay', 'upi', 'card', 'netbanking', 'wallet', 'emi'],
    required: true
  },
  payment_method_details: {
    type: String,
    default: '',
    trim: true,
    maxlength: 200
  },
  payment_status: {
    type: String,
    enum: ['received', 'completed'],
    default: 'received'
  },
  order_created_at: {
    type: Date,
    default: Date.now
  },
  payment_date: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Compound indexes for high-frequency revenue reporting and analytics
orderRevenueSchema.index({ cafe_id: 1, payment_date: -1 });
orderRevenueSchema.index({ cafe_id: 1, payment_provider: 1, payment_date: -1 });

// NOTE: DO NOT ADD TTL TO THIS MODEL. This collection is permanent for financial audits.

module.exports = mongoose.model('OrderRevenue', orderRevenueSchema);
