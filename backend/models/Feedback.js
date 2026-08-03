const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  cafe_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cafe',
    required: true
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: 1,
    max: 5
  },
  review: {
    type: String,
    default: '',
    trim: true
  },
  customer_name: {
    type: String,
    default: 'Guest'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

feedbackSchema.index({ cafe_id: 1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
