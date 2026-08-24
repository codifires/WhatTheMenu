const mongoose = require('mongoose');

/**
 * OrderRevenue — Permanent revenue ledger.
 *
 * One document is created per paid order and is NEVER deleted.
 * Orders auto-delete after 5 days (TTL), but this collection lives forever,
 * giving owners full revenue history going back years.
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
    unique: true       // One revenue record per order, no duplicates
  },
  total_amount: {
    type: Number,
    required: true,
    min: 0
  },
  payment_method: {
    type: String,
    enum: ['cash', 'upi', 'online'],
    required: true
  },
  payment_method_details: {
    type: String,
    default: ''
  },
  table_number: {
    type: String,
    default: ''
  },
  items_count: {
    type: Number,
    default: 0
  },
  payment_date: {
    type: Date,
    required: true,
    default: Date.now,
    index: true        // Indexed for fast year/month/day queries
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Compound index for efficient per-café date range queries
orderRevenueSchema.index({ cafe_id: 1, payment_date: -1 });

// NOTE: No TTL index here — this collection is permanent forever.

module.exports = mongoose.model('OrderRevenue', orderRevenueSchema);
