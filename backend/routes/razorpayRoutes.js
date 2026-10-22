const express = require('express');
const router = express.Router();
const {
  createSubscription,
  verifySubscriptionPayment,
  cancelSubscription,
  getSubscriptionInvoices,
  createOrderPayment,
  verifyOrderPayment,
  initiateRefund,
} = require('../controllers/razorpayController');
const { protect, authorize } = require('../middleware/auth');
const {
  apiLimiter,
  sensitiveActionLimiter,
  orderCreationLimiter,
  orderPollingLimiter
} = require('../middleware/rateLimiter');
const {
  createSubscriptionValidator,
  verifySubscriptionValidator,
  initiateRefundValidator,
  createOrderPaymentValidator,
  verifyOrderPaymentValidator
} = require('../validators/razorpayValidators');

// ============ OWNER SUBSCRIPTION ROUTES (Auth required) ============
router.post('/owner/razorpay/create-subscription', protect, authorize('owner'), apiLimiter, createSubscriptionValidator, createSubscription);
router.post('/owner/razorpay/verify-subscription', protect, authorize('owner'), apiLimiter, verifySubscriptionValidator, verifySubscriptionPayment);
router.post('/owner/razorpay/cancel-subscription', protect, authorize('owner'), apiLimiter, cancelSubscription);
router.get('/owner/razorpay/invoices', protect, authorize('owner'), apiLimiter, getSubscriptionInvoices);
router.post('/owner/razorpay/refund/:orderId', protect, authorize('owner'), sensitiveActionLimiter, initiateRefundValidator, initiateRefund);

// ============ CUSTOMER ORDER PAYMENT ROUTES (Public) ============
router.post('/orders/create-razorpay-order', orderCreationLimiter, createOrderPaymentValidator, createOrderPayment);
router.post('/orders/verify-razorpay-payment', orderPollingLimiter, verifyOrderPaymentValidator, verifyOrderPayment);

module.exports = router;
