const mongoose = require('mongoose');

const qrCodeSchema = new mongoose.Schema({
  cafe_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cafe',
    required: true,
    unique: true
  },
  qr_image: {
    type: String,
    required: true
  },
  menu_url: {
    type: String,
    required: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('QRCode', qrCodeSchema);
