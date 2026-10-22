const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  cafe_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cafe',
    required: [true, 'Café ID is required']
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category ID is required']
  },
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    minlength: 1,
    maxlength: 100
  },
  description: {
    type: String,
    default: '',
    trim: true,
    maxlength: 500
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    max: [1000000, 'Price exceeds maximum allowed']
  },
  image: {
    type: String,
    default: '',
    maxlength: 500
  },
  availability: {
    type: Boolean,
    default: true
  },
  is_veg: {
    type: Boolean,
    default: true
  },
  sort_order: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Compound indexes for tenant-scoped catalog browsing, category filtering, and ordering
menuItemSchema.index({ cafe_id: 1, category_id: 1, availability: 1, sort_order: 1 });
menuItemSchema.index({ cafe_id: 1, availability: 1 });
menuItemSchema.index({ cafe_id: 1, sort_order: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);
