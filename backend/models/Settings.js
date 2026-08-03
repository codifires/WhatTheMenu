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
  admin_upi_id: {
    type: String,
    default: 'yourname@upi'
  },
  starter_price: {
    type: Number,
    default: 299
  },
  pro_price: {
    type: Number,
    default: 499
  },
  tax_rate: {
    type: Number,
    default: 18
  },
  payment_live_mode: {
    type: Boolean,
    default: false
  },
  platform_name: {
    type: String,
    default: 'QRMenu SaaS'
  },
  contact_email: {
    type: String,
    default: 'support@qrmenu.com'
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
      'Up to 50 Menu Items',
      'Email Support'
    ]
  },
  pro_features: {
    type: [String],
    default: [
      'Everything in Starter',
      'Unlimited Menu Items',
      'Advanced Analytics',
      'Priority Support',
      'Custom Domain'
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
