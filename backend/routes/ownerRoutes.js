const express = require('express');
const router = express.Router();
const {
  getDashboard,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
  getOrders,
  updateOrderStatus,
  updatePaymentStatus,
  getRevenueHistory,
  getQRCode,
  regenerateQRCode,
  getFeedback,
  updateSettings,
  submitSubscriptionRequest,
  initiateSubscriptionSession,
  handleSubscriptionWebhook,
  checkSubscriptionStatus,
  cancelSubscriptionSession,
  getGlobalMedia
} = require('../controllers/ownerController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { apiLimiter } = require('../middleware/rateLimiter');
const {
  categoryValidator,
  menuItemValidator,
  settingsValidator,
  orderStatusValidator,
  subscriptionRequestValidator,
  initiateSubscriptionSessionValidator
} = require('../validators/ownerValidators');

// Public webhook & status routes (No auth required for payment webhooks/polling)
router.post('/subscription/webhook', handleSubscriptionWebhook);
router.get('/subscription/check-status/:sessionId', checkSubscriptionStatus);
router.post('/subscription/cancel-session/:sessionId', cancelSubscriptionSession);

// All routes below require owner auth
router.use(protect, authorize('owner'), apiLimiter);

// Dashboard
router.get('/dashboard', getDashboard);

// Revenue History (permanent ledger)
router.get('/revenue', getRevenueHistory);

// Categories
router.route('/categories')
  .get(getCategories)
  .post(categoryValidator, createCategory);

router.route('/categories/:id')
  .put(categoryValidator, updateCategory)
  .delete(deleteCategory);

// Menu Items
router.route('/menu-items')
  .get(getMenuItems)
  .post(upload.single('image'), menuItemValidator, createMenuItem);

router.route('/menu-items/:id')
  .put(upload.single('image'), menuItemValidator, updateMenuItem)
  .delete(deleteMenuItem);

router.put('/menu-items/:id/availability', toggleAvailability);

// Orders
router.get('/orders', getOrders);
router.put('/orders/:id/status', orderStatusValidator, updateOrderStatus);
router.put('/orders/:id/payment', updatePaymentStatus);

// QR Code
router.get('/qr-code', getQRCode);
router.post('/qr-code/regenerate', regenerateQRCode);

// Feedback
router.get('/feedback', getFeedback);

// Settings
router.put('/settings', upload.single('logo'), settingsValidator, updateSettings);

// Subscription Requests & Automated UPI Sessions
router.post('/subscription/initiate-session', initiateSubscriptionSessionValidator, initiateSubscriptionSession);
router.post('/subscription/request', subscriptionRequestValidator, submitSubscriptionRequest);

// Global Media
router.get('/media/global', getGlobalMedia);

module.exports = router;
