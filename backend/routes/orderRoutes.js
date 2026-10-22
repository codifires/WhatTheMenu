const express = require('express');
const router = express.Router();
const {
  placeOrder,
  trackOrder,
  triggerStaffAlert
} = require('../controllers/customerController');
const {
  placeOrderValidator,
  trackOrderValidator,
  staffAlertValidator
} = require('../validators/customerValidators');
const {
  orderCreationLimiter,
  orderPollingLimiter,
  staffAlertLimiter
} = require('../middleware/rateLimiter');

// Public customer routes (Pay-at-Counter / Cash order placement)
router.post('/', orderCreationLimiter, placeOrderValidator, placeOrder);

// Order tracking & staff alerts
router.get('/:orderNumber/track', orderPollingLimiter, trackOrderValidator, trackOrder);
router.post('/:orderNumber/alert', staffAlertLimiter, staffAlertValidator, triggerStaffAlert);

module.exports = router;
