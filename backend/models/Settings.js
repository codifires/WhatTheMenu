const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // Singleton key — there is only ONE settings document
  key: {
    type: String,
    default: 'platform',
    unique: true
  },
  trial_days: {
    type: Number,
    default: 14,
    min: 1,
    max: 365
  },
  currency: {
    type: String,
    default: 'INR'
  },
  starter_price: {
    type: Number,
    default: 199,
    min: [0, 'Starter price cannot be negative']
  },
  pro_price: {
    type: Number,
    default: 299,
    min: [0, 'Pro price cannot be negative']
  },
  pro_plus_price: {
    type: Number,
    default: 499,
    min: [0, 'Pro plus price cannot be negative']
  },
  yearly_discount_percentage: {
    type: Number,
    default: 20,
    min: [0, 'Discount percentage cannot be negative'],
    max: [100, 'Discount percentage cannot exceed 100%']
  },
  tax_rate: {
    type: Number,
    default: 18,
    min: [0, 'Tax rate cannot be negative'],
    max: [100, 'Tax rate cannot exceed 100%']
  },
  payment_live_mode: {
    type: Boolean,
    default: false
  },
  platform_name: {
    type: String,
    default: 'QRMenu SaaS',
    trim: true,
    maxlength: 100
  },
  contact_email: {
    type: String,
    default: 'support@qrmenu.com',
    trim: true,
    maxlength: 120
  },
  support_phone: {
    type: String,
    default: '+91 98765 43210',
    trim: true,
    maxlength: 30
  },
  support_whatsapp: {
    type: String,
    default: '919876543210',
    trim: true,
    maxlength: 30
  },
  support_hours: {
    type: String,
    default: 'Mon - Sun, 9:00 AM - 10:00 PM IST',
    trim: true,
    maxlength: 100
  },
  maintenance_mode: {
    type: Boolean,
    default: false
  },
  starter_features: {
    type: [String],
    default: [
      'Digital QR Menu',
      'Basic Analytics',
      'Up to 25 Menu Items',
      'Table QR Ordering'
    ]
  },
  pro_features: {
    type: [String],
    default: [
      'Everything in Starter',
      'Up to 100 Menu Items',
      'Advanced Sales Analytics',
      'Online Payment Settlements',
      'Standard Support'
    ]
  },
  pro_plus_features: {
    type: [String],
    default: [
      'Everything in Pro',
      'Unlimited Menu Items',
      'Razorpay Automated Gateway',
      'Dedicated Priority Support',
      'Multi-Device Management (3 Devices)',
      'Custom Branding & All Themes'
    ]
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Helper to always get/upsert the single settings document
settingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne({ key: 'platform' });
  if (!settings) {
    settings = await this.create({ key: 'platform' });
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
