const express = require('express');
const router = express.Router();
const { submitFeedback } = require('../controllers/customerController');
const { feedbackValidator } = require('../validators/customerValidators');

// Public route - no auth required
router.post('/', feedbackValidator, submitFeedback);

module.exports = router;
