const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menu_item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem'
  },
  name: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  }
});

const orderSchema = new mongoose.Schema({
  cafe_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cafe',
    required: true
  },
  order_number: {
    type: String,
    required: true,
    unique: true
  },
  token_number: {
    type: String,
    default: ''
  },
  customer_name: {
    type: String,
    default: 'Guest',
    trim: true
  },
  customer_phone: {
    type: String,
    default: '',
    trim: true
  },
  table_number: {
    type: String,
    default: '',
    trim: true
  },
  items: [orderItemSchema],
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
  payment_transaction_id: {
    type: String,
    default: ''
  },
  payment_status: {
    type: String,
    enum: ['pending', 'received', 'completed', 'failed'],
    default: 'pending'
  },
  order_status: {
    type: String,
    enum: ['new', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'],
    default: 'new'
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Generate unique order number
orderSchema.pre('validate', async function(next) {
  if (this.isNew) {
    const count = await mongoose.model('Order').countDocuments({ cafe_id: this.cafe_id });
    const prefix = 'ORD';
    const num = String(count + 1).padStart(4, '0');
    this.order_number = `${prefix}-${Date.now().toString(36).toUpperCase()}-${num}`;
  }
  next();
});

orderSchema.index({ cafe_id: 1, order_status: 1 });
// TTL Index: Delete documents 5 days (432000 seconds) after created_at
orderSchema.index({ created_at: 1 }, { expireAfterSeconds: 432000 });

module.exports = mongoose.model('Order', orderSchema);
