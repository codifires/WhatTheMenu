const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  cafe_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cafe',
    required: true
  },
  plan_name: {
    type: String,
    enum: ['free', 'starter', 'pro'],
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
    type: Date // Only set for 'free' trial plan
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'suspended'],
    default: 'active'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

subscriptionSchema.index({ cafe_id: 1, status: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
