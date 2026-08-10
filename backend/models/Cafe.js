const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const cafeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Café name is required'],
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  logo: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: '',
    trim: true
  },
  phone: {
    type: String,
    default: '',
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },

  razorpay_key_id: {
    type: String,
    default: ''
  },
  razorpay_key_secret: {
    type: String,
    default: '',
    select: false
  },
  razorpay_webhook_secret: {
    type: String,
    default: '',
    select: false
  },
  razorpay_customer_id: {
    type: String,
    default: ''
  },
  razorpay_subscription_id: {
    type: String,
    default: ''
  },
  tax_percentage: {
    type: Number,
    default: 0
  },
  subscription_status: {
    type: String,
    enum: ['active', 'expired', 'suspended'],
    default: 'active'
  },
  subscription: {
    plan_name: { type: String, enum: ['free', 'starter', 'pro'], default: 'free' },
    start_date: { type: Date, default: Date.now },
    end_date: { type: Date },
    status: { type: String, enum: ['active', 'expired', 'suspended'], default: 'active' }
  },
  upcoming_subscription: {
    plan_name: { type: String, enum: ['starter', 'pro'] },
    duration_days: { type: Number, default: 30 }
  },
  role: {
    type: String,
    default: 'owner',
    enum: ['owner']
  },
  is_active: {
    type: Boolean,
    default: true
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'cafes'
});

// Generate slug from name
cafeSchema.pre('save', async function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
  }
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

cafeSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password token
cafeSchema.methods.getResetPasswordToken = function() {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire (10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model('Cafe', cafeSchema);
