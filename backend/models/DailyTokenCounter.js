const mongoose = require('mongoose');

const dailyTokenCounterSchema = new mongoose.Schema({
  cafe_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cafe',
    required: true,
    index: true
  },
  date: {
    type: String, // 'YYYY-MM-DD'
    required: true
  },
  seq: {
    type: Number,
    default: 0
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Ensure only 1 counter document exists per café per calendar day
dailyTokenCounterSchema.index({ cafe_id: 1, date: 1 }, { unique: true });

const { getBusinessDateString, getStartOfBusinessDay } = require('../utils/dateTime');

/**
 * Concurrency-safe atomic token generator for restaurant orders.
 * Uses atomic $inc with upsert to prevent token collisions.
 */
dailyTokenCounterSchema.statics.getNextToken = async function (cafeId) {
  const Order = mongoose.model('Order');
  const now = new Date();
  const dateStr = getBusinessDateString(now);

  // Atomic increment with upsert
  const counter = await this.findOneAndUpdate(
    { cafe_id: cafeId, date: dateStr },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // If counter was just inserted (seq === 1), check if existing orders today had higher token numbers
  // This smoothly handles server restarts or preexisting orders created before this counter
  if (counter.seq === 1) {
    const startOfDay = getStartOfBusinessDay(now);

    const existingOrders = await Order.find({
      cafe_id: cafeId,
      created_at: { $gte: startOfDay },
      token_number: { $regex: /^#\d+$/ }
    }).select('token_number').lean();

    let maxExisting = 0;
    for (const o of existingOrders) {
      const num = parseInt(o.token_number.replace('#', ''), 10);
      if (!isNaN(num) && num > maxExisting) {
        maxExisting = num;
      }
    }

    if (maxExisting > 1) {
      // Adjust counter to maxExisting
      const updated = await this.findOneAndUpdate(
        { cafe_id: cafeId, date: dateStr, seq: { $lte: maxExisting } },
        { $set: { seq: maxExisting } },
        { new: true }
      );
      return `#${updated ? updated.seq : maxExisting}`;
    }
  }

  return `#${counter.seq}`;
};

module.exports = mongoose.model('DailyTokenCounter', dailyTokenCounterSchema);
