const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const cafeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Café name is required'],
    trim: true,
    maxlength: 100
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 120
  },
  logo: {
    type: String,
    default: '',
    maxlength: 500
  },
  address: {
    type: String,
    default: '',
    trim: true,
    maxlength: 500
  },
  phone: {
    type: String,
    default: '',
    trim: true,
    maxlength: 25
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 120
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    maxlength: 128,
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
    default: 0,
    min: [0, 'Tax percentage cannot be negative'],
    max: [100, 'Tax percentage cannot exceed 100%']
  },
  billing_settings: {
    format: { type: String, enum: ['standard', 'minimal', 'detailed'], default: 'standard' },
    tax_number: { type: String, default: '', trim: true, maxlength: 50 },
    thank_you_message: { type: String, default: 'Thank you for your visit!', trim: true, maxlength: 200 }
  },
  theme_settings: {
    active_theme: {
      type: String,
      enum: ['classic', 'midnight', 'blackgold', 'forest', 'rose'],
      default: 'classic'
    },
    unlocked_themes: {
      type: [String],
      default: ['classic']
    }
  },
  subscription_status: {
    type: String,
    enum: ['active', 'expired', 'suspended'],
    default: 'active'
  },
  subscription: {
    plan_name: { type: String, enum: ['starter', 'pro', 'pro_plus'], default: 'starter' },
    start_date: { type: Date, default: Date.now },
    end_date: { type: Date },
    status: { type: String, enum: ['active', 'expired', 'suspended'], default: 'active' }
  },
  upcoming_subscription: {
    plan_name: { type: String, enum: ['pro', 'pro_plus'] },
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
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpire: { type: Date, select: false },
  login_otp: { type: String, select: false },
  login_otp_expire: { type: Date, select: false },
  login_otp_attempts: {
    type: Number,
    default: 0,
    select: false
  },
  login_otp_last_sent: { type: Date, select: false },
  pending_logout_sessions: { type: [String], select: false },
  active_sessions: [{
    token: { type: String, maxlength: 500 },
    device_info: { type: String, maxlength: 200, default: '' },
    last_active: { type: Date, default: Date.now }
  }]
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'cafes'
});

// Compound indexes for tenant-scoped query performance
cafeSchema.index({ slug: 1, is_active: 1 });
cafeSchema.index({ is_active: 1, subscription_status: 1 });
cafeSchema.index({ is_active: 1, created_at: -1 });
cafeSchema.index({ 'active_sessions.token': 1 });

// Partial unique index for subscription identifier (prevents empty string collisions)
cafeSchema.index(
  { razorpay_subscription_id: 1 },
  {
    unique: true,
    partialFilterExpression: { razorpay_subscription_id: { $type: 'string', $gt: '' } }
  }
);

// Generate slug, hash password, and prune unbounded active_sessions
cafeSchema.pre('save', async function (next) {
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
  // Protection against unbounded arrays: keep maximum 5 active sessions
  if (this.active_sessions && this.active_sessions.length > 5) {
    this.active_sessions = this.active_sessions.slice(-5);
  }
  next();
});

cafeSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password token
cafeSchema.methods.getResetPasswordToken = function () {
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
