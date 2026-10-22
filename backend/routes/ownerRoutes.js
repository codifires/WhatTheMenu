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
  reorderMenuItems,
  toggleAvailability,
  getOrders,
  updateOrderStatus,
  updatePaymentStatus,
  getRevenueHistory,
  getQRCode,
  regenerateQRCode,
  getFeedback,
  updateSettings,
  updateThemeSettings,
  getGlobalMedia
} = require('../controllers/ownerController');
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
  categoryValidator,
  updateCategoryValidator,
  menuItemValidator,
  updateMenuItemValidator,
  reorderMenuItemsValidator,
  toggleAvailabilityValidator,
  getOrdersValidator,
  orderStatusValidator,
  updatePaymentStatusValidator,
  getRevenueValidator,
  settingsValidator,
  themeSettingsValidator
} = require('../validators/ownerValidators');

// All routes below require owner auth
router.use(protect, authorize('owner'), apiLimiter);

// Dashboard
router.get('/dashboard', getDashboard);

// Revenue History (permanent ledger - heavy aggregation)
router.get('/revenue', analyticsLimiter, getRevenueValidator, getRevenueHistory);

// Categories
router.route('/categories')
  .get(getCategories)
  .post(categoryValidator, createCategory);

router.route('/categories/:id')
  .put(updateCategoryValidator, updateCategory)
  .delete(mongoIdParamValidator, deleteCategory);

// Menu Items
router.put('/menu-items/reorder', reorderMenuItemsValidator, reorderMenuItems);

router.route('/menu-items')
  .get(getMenuItems)
  .post(uploadLimiter, upload.single('image'), menuItemValidator, createMenuItem);

router.route('/menu-items/:id')
  .put(uploadLimiter, upload.single('image'), updateMenuItemValidator, updateMenuItem)
  .delete(mongoIdParamValidator, deleteMenuItem);

router.put('/menu-items/:id/availability', toggleAvailabilityValidator, toggleAvailability);

// Orders
router.get('/orders', getOrdersValidator, getOrders);
router.put('/orders/:id/status', orderStatusValidator, updateOrderStatus);
router.put('/orders/:id/payment', updatePaymentStatusValidator, updatePaymentStatus);

// QR Code
router.get('/qr-code', getQRCode);
router.post('/qr-code/regenerate', sensitiveActionLimiter, regenerateQRCode);

// Feedback
router.get('/feedback', getFeedback);

// Settings
router.put('/settings', uploadLimiter, upload.single('logo'), settingsValidator, updateSettings);
router.put('/settings/theme', themeSettingsValidator, updateThemeSettings);

// Global Media
router.get('/media/global', getGlobalMedia);

module.exports = router;
