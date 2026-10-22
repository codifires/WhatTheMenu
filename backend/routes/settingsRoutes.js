const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const Cafe = require('../models/Cafe');
const { publicLimiter } = require('../middleware/rateLimiter');

// @desc    Get public settings (pricing, features, etc)
// @route   GET /api/settings/public
router.get('/public', publicLimiter, async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    let cafeCount = 0;
    try {
      cafeCount = await Cafe.countDocuments({ is_active: true });
    } catch (_) {}

    const settingsObj = settings.toObject ? settings.toObject() : { ...settings };
    settingsObj.cafe_count = cafeCount;

    res.json({ success: true, data: settingsObj });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
