const express = require('express');
const router = express.Router();
const { submitFeedback } = require('../controllers/customerController');
const { feedbackValidator } = require('../validators/customerValidators');
const { aiFeedbackAssist } = require('../controllers/aiController');
const { aiLimiter, feedbackSubmissionLimiter } = require('../middleware/rateLimiter');

// Public routes - protected with rate limiting
router.post('/ai-assist', aiLimiter, aiFeedbackAssist);
router.post('/', feedbackSubmissionLimiter, feedbackValidator, submitFeedback);

module.exports = router;
