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
  clearSystemLogs
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { apiLimiter } = require('../middleware/rateLimiter');
const { createCafeValidator, updateCafeValidator, updateSubscriptionValidator } = require('../validators/adminValidators');

// All routes require superadmin auth
router.use(protect, authorize('superadmin'), apiLimiter);

// Dashboard & Revenue History
router.get('/dashboard', getDashboard);
router.get('/revenue', getRevenueHistory);
router.get('/payments', getAllPayments);

// Cafés
router.route('/cafes')
  .get(getCafes)
  .post(upload.single('logo'), createCafeValidator, createCafe);

router.route('/cafes/:id')
  .get(getCafe)
  .put(upload.single('logo'), updateCafeValidator, updateCafe)
  .delete(deleteCafe);

router.put('/cafes/:id/suspend', suspendCafe);
router.put('/cafes/:id/activate', activateCafe);

// Subscriptions
router.route('/subscriptions')
  .get(getSubscriptions);
router.route('/subscriptions/:id')
  .put(updateSubscriptionValidator, updateSubscription);
router.get('/subscriptions/:cafeId/history', getSubscriptionHistory);

// Subscription Requests
router.get('/subscription-requests', getSubscriptionRequests);
router.put('/subscription-requests/:id/approve', approveSubscriptionRequest);
router.put('/subscription-requests/:id/reject', rejectSubscriptionRequest);

// Platform Settings & Logs
router.route('/settings')
  .get(getSettings)
  .put(updateSettings);

router.get('/logs', getSystemLogs);
router.delete('/logs/clear', clearSystemLogs);

// Global Media
router.route('/media')
  .get(getGlobalMedia)
  .post(upload.single('image'), uploadGlobalMedia);

router.delete('/media/:id', deleteGlobalMedia);

module.exports = router;
