const express = require('express');
const router = express.Router();
const {
  placeOrder,
  trackOrder,
  initiateUpiSession,
  handleUpiWebhook,
  checkUpiStatus,
  cancelUpiSession
} = require('../controllers/customerController');
const { placeOrderValidator, initiateUpiValidator } = require('../validators/customerValidators');

// Public routes - no auth required
router.post('/initiate-upi-session', initiateUpiValidator, initiateUpiSession);
router.post('/upi-webhook', handleUpiWebhook);
router.get('/check-upi-status/:sessionId', checkUpiStatus);
router.post('/cancel-upi-session/:sessionId', cancelUpiSession);
router.post('/', placeOrderValidator, placeOrder);
router.get('/:orderNumber/track', trackOrder);

module.exports = router;
