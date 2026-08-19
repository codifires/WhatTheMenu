const express = require('express');
const router = express.Router();
const {
  placeOrder,
  trackOrder,
  triggerStaffAlert
} = require('../controllers/customerController');
const { placeOrderValidator } = require('../validators/customerValidators');

// Public routes - no auth required
router.post('/', placeOrderValidator, placeOrder);
router.get('/:orderNumber/track', trackOrder);
router.post('/:orderNumber/alert', triggerStaffAlert);

module.exports = router;
