const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  cafe_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cafe',
    required: [true, 'Café ID is required']
  },
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    minlength: 1,
    maxlength: 60
  },
  sort_order: {
    type: Number,
    default: 0,
    min: 0
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Compound index for uniqueness within a café
categorySchema.index({ cafe_id: 1, name: 1 }, { unique: true });

// Compound index for tenant-scoped active menu category retrieval and ordering
categorySchema.index({ cafe_id: 1, is_active: 1, sort_order: 1 });

module.exports = mongoose.model('Category', categorySchema);
