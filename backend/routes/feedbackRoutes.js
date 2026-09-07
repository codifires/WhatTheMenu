const express = require('express');
const router = express.Router();
const { submitFeedback } = require('../controllers/customerController');
const { feedbackValidator } = require('../validators/customerValidators');
const { aiFeedbackAssist } = require('../controllers/aiController');

// Public route - no auth required
router.post('/ai-assist', aiFeedbackAssist);
router.post('/', feedbackValidator, submitFeedback);

module.exports = router;
