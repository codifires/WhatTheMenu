const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');

// @desc    Get public settings (pricing, features, etc)
// @route   GET /api/settings/public
router.get('/public', async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
