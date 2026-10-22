const mongoose = require('mongoose');
const crypto = require('crypto');

const orderItemSchema = new mongoose.Schema({
  menu_item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem'
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    max: 100000
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  cafe_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cafe',
    required: [true, 'Café reference is required'],
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
  customer_phone: {
    type: String,
    default: '',
    trim: true,
    maxlength: 20
  },
  table_number: {
    type: String,
    default: '',
    trim: true,
    maxlength: 20
  },
  items: {
    type: [orderItemSchema],
    validate: [
      {
        validator: function (val) {
          return Array.isArray(val) && val.length > 0 && val.length <= 100;
        },
        message: 'Order must contain between 1 and 100 items'
      }
    ]
  },
  total_amount: {
    type: Number,
    required: true,
    min: 0,
    max: 1000000
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
    default: 'razorpay'
  },
  payment_method_details: {
    type: String,
    default: '',
    trim: true,
    maxlength: 200
  },
  payment_transaction_id: {
    type: String,
    default: '',
    trim: true,
    maxlength: 100,
    index: true
  },
  payment_status: {
    type: String,
    enum: ['pending', 'received', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  order_status: {
    type: String,
    enum: ['new', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'],
    default: 'new',
    index: true
  },
  notes: {
    type: String,
    default: '',
    trim: true,
    maxlength: 500
  },
  razorpay_order_id: {
    type: String,
    default: '',
    trim: true,
    maxlength: 100
  },
  razorpay_payment_id: {
    type: String,
    default: '',
    trim: true,
    maxlength: 100
  },
  razorpay_signature: {
    type: String,
    default: '',
    trim: true,
    maxlength: 256,
    select: false // Protected: never exposed in queries unless explicitly selected
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Generate unique order number with entropy
orderSchema.pre('validate', async function (next) {
  if (this.isNew && !this.order_number) {
    const count = await mongoose.model('Order').countDocuments({ cafe_id: this.cafe_id });
    const prefix = 'ORD';
    const num = String(count + 1).padStart(4, '0');
    const entropy = crypto.randomBytes(3).toString('hex').toUpperCase();
    this.order_number = `${prefix}-${Date.now().toString(36).toUpperCase()}-${num}-${entropy}`;
  }
  next();
});

// Compound indexes for tenant-scoped query performance
orderSchema.index({ cafe_id: 1, created_at: -1 });
orderSchema.index({ cafe_id: 1, order_status: 1, created_at: -1 });
orderSchema.index({ cafe_id: 1, payment_status: 1, created_at: -1 });

// Partial unique indexes for payment identifiers (prevents collision on empty string "")
orderSchema.index(
  { razorpay_order_id: 1 },
  {
    unique: true,
    partialFilterExpression: { razorpay_order_id: { $type: 'string', $gt: '' } }
  }
);
orderSchema.index(
  { razorpay_payment_id: 1 },
  {
    unique: true,
    partialFilterExpression: { razorpay_payment_id: { $type: 'string', $gt: '' } }
  }
);

// Retention policy: Active operational orders are retained for 90 days (7,776,000 seconds)
// Note: Permanent financial & ledger history is preserved indefinitely in OrderRevenue.
orderSchema.index({ created_at: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('Order', orderSchema);
