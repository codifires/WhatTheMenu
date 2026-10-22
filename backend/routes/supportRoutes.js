const express = require('express');
const router = express.Router();
const {
  createTicket,
  getMyTickets,
  getSupportInfo,
  getAllTickets,
  replyAndResolveTicket
} = require('../controllers/supportController');
const { protect, authorize } = require('../middleware/auth');
const { apiLimiter, feedbackSubmissionLimiter } = require('../middleware/rateLimiter');
const { createTicketValidator, updateTicketValidator } = require('../validators/supportValidators');

// ================= OWNER SUPPORT ROUTES =================
router.post('/owner/tickets', protect, authorize('owner'), feedbackSubmissionLimiter, createTicketValidator, createTicket);
router.get('/owner/tickets', protect, authorize('owner'), apiLimiter, getMyTickets);
router.get('/owner/info', protect, authorize('owner'), apiLimiter, getSupportInfo);

// ================= ADMIN SUPPORT ROUTES =================
router.get('/admin/tickets', protect, authorize('superadmin'), apiLimiter, getAllTickets);
router.put('/admin/tickets/:id', protect, authorize('superadmin'), apiLimiter, updateTicketValidator, replyAndResolveTicket);

module.exports = router;
