const mongoose = require('mongoose');

const globalMediaSchema = new mongoose.Schema({
  image_url: {
    type: String,
    required: true
  },
  file_name: {
    type: String
  },
  category: {
    type: String,
    default: 'General'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('GlobalMedia', globalMediaSchema);
