const express = require('express');
const router = express.Router();
const {
  getDashboard,
  createCafe,
  getCafes,
  getCafe,
  updateCafe,
  suspendCafe,
  activateCafe,
  deleteCafe,
  getSubscriptions,
  updateSubscription,
  getSubscriptionRequests,
  approveSubscriptionRequest,
  rejectSubscriptionRequest,
  getSettings,
  updateSettings,
  uploadGlobalMedia,
  getGlobalMedia,
  deleteGlobalMedia,
  getSubscriptionHistory,
  getRevenueHistory,
  getAllPayments,
  getSystemLogs,
  clearSystemLogs,
  getPaymentMonitoring
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  apiLimiter,
  uploadLimiter,
  analyticsLimiter,
  sensitiveActionLimiter
} = require('../middleware/rateLimiter');
const {
  mongoIdParamValidator,
  cafeIdParamValidator,
  createCafeValidator,
  updateCafeValidator,
  updateSubscriptionValidator,
  rejectSubscriptionRequestValidator,
  updatePlatformSettingsValidator,
  uploadGlobalMediaValidator
} = require('../validators/adminValidators');

// All routes require superadmin auth
router.use(protect, authorize('superadmin'), apiLimiter);

// Dashboard & Revenue History (Analytics rate limited)
router.get('/dashboard', getDashboard);
router.get('/revenue', analyticsLimiter, getRevenueHistory);
router.get('/payments', analyticsLimiter, getAllPayments);

// Cafés
router.route('/cafes')
  .get(getCafes)
  .post(uploadLimiter, upload.single('logo'), createCafeValidator, createCafe);

router.route('/cafes/:id')
  .get(mongoIdParamValidator, getCafe)
  .put(uploadLimiter, upload.single('logo'), updateCafeValidator, updateCafe)
  .delete(sensitiveActionLimiter, mongoIdParamValidator, deleteCafe);

router.put('/cafes/:id/suspend', sensitiveActionLimiter, mongoIdParamValidator, suspendCafe);
router.put('/cafes/:id/activate', sensitiveActionLimiter, mongoIdParamValidator, activateCafe);

// Subscriptions
router.route('/subscriptions')
  .get(getSubscriptions);
router.route('/subscriptions/:id')
  .put(updateSubscriptionValidator, updateSubscription);
router.get('/subscriptions/:cafeId/history', cafeIdParamValidator, getSubscriptionHistory);

// Subscription Requests
router.get('/subscription-requests', getSubscriptionRequests);
router.put('/subscription-requests/:id/approve', mongoIdParamValidator, approveSubscriptionRequest);
router.put('/subscription-requests/:id/reject', rejectSubscriptionRequestValidator, rejectSubscriptionRequest);

// Platform Settings & Logs
router.route('/settings')
  .get(getSettings)
  .put(updatePlatformSettingsValidator, updateSettings);

router.get('/logs', getSystemLogs);
router.delete('/logs/clear', sensitiveActionLimiter, clearSystemLogs);
router.get('/monitoring/payment-health', analyticsLimiter, getPaymentMonitoring);

// Global Media
router.route('/media')
  .get(getGlobalMedia)
  .post(uploadLimiter, upload.single('image'), uploadGlobalMediaValidator, uploadGlobalMedia);

router.delete('/media/:id', mongoIdParamValidator, deleteGlobalMedia);

module.exports = router;
