const SupportTicket = require('../models/SupportTicket');
const Cafe = require('../models/Cafe');
const Settings = require('../models/Settings');
const sendEmail = require('../utils/sendEmail');

// Curated FAQs for quick self-service
const DEFAULT_FAQS = [
  {
    q: 'How do I configure my UPI ID to receive direct payments?',
    a: 'Go to Owner Settings > Payment Settings. Enter your active UPI VPA (e.g., cafe@okhdfcbank or 9876543210@ybl) and click Save. All customer orders paid via UPI will settle instantly to your bank account with 0% gateway commission.'
  },
  {
    q: 'How do I download and print high-resolution Table QR Codes?',
    a: 'Navigate to QR Code in your sidebar. Select your desired table number or download the master QR. Click "Download High-Res QR" or "Print Standee" to place on dining tables.'
  },
  {
    q: 'Why didn’t I hear the audio chime when a new order arrived?',
    a: 'Modern browsers block automatic audio until you interact with the page. Ensure your browser tab is unmuted, click anywhere on the Live Orders screen once after logging in, and keep the tab open.'
  },
  {
    q: 'How does upgrading to the Pro Plan work?',
    a: 'Go to Subscription in your sidebar and select "Upgrade to Pro". A dynamic UPI payment QR will appear. Scan and pay via GPay, PhonePe, or Paytm, and your Pro features will activate immediately within seconds.'
  },
  {
    q: 'How do I temporarily mark an item as out of stock?',
    a: 'Go to Menu Management, find the item, and toggle the availability switch to "Unavailable". It will instantly disappear from your customer menu in real time.'
  }
];

// @desc    Create a new support ticket (Café Owner)
// @route   POST /api/support/owner/tickets
const createTicket = async (req, res, next) => {
  try {
    const { subject, category, description } = req.body;
    const cafeId = req.user._id;

    const cafe = await Cafe.findById(cafeId);
    if (!cafe) {
      return res.status(404).json({ success: false, message: 'Café account not found' });
    }

    // Auto-detect priority: Pro plan gets urgent fast-track
    const isPro = cafe.subscription?.plan_name === 'pro' || cafe.subscription_status === 'pro';
    const priority = isPro ? 'urgent' : 'normal';

    // Generate unique sequential ticket number
    const count = await SupportTicket.countDocuments();
    const ticketNumber = `TCK-${String(count + 1).padStart(4, '0')}-${Date.now().toString().slice(-4)}`;

    const ticket = await SupportTicket.create({
      cafe_id: cafeId,
      ticket_number: ticketNumber,
      subject,
      category: category || 'other',
      description,
      priority,
      status: 'open'
    });

    // Notify Admin via email in background
    try {
      const settings = await Settings.getSettings();
      if (settings.contact_email) {
        await sendEmail({
          email: settings.contact_email,
          subject: `[${priority.toUpperCase()} SUPPORT] New Ticket #${ticketNumber} from ${cafe.name}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; padding: 20px; background: #0f172a; color: #f8fafc; border-radius: 12px;">
              <h2 style="color: #38bdf8; margin-top: 0;">New Support Ticket Created</h2>
              <p><strong>Café:</strong> ${cafe.name} (${cafe.email})</p>
              <p><strong>Plan:</strong> ${isPro ? '💎 Pro Plan (Priority SLA)' : 'Starter / Free'}</p>
              <p><strong>Ticket ID:</strong> ${ticketNumber}</p>
              <p><strong>Category:</strong> ${category}</p>
              <p><strong>Subject:</strong> ${subject}</p>
              <div style="padding: 14px; background: #1e293b; border-left: 4px solid #38bdf8; border-radius: 6px; margin: 16px 0;">
                <p style="margin: 0; white-space: pre-wrap;">${description}</p>
              </div>
              <p style="color: #94a3b8; font-size: 13px;">Manage this ticket in the Admin Dashboard > Support Tickets.</p>
            </div>
          `
        });
      }
    } catch (mailErr) {
      console.warn('Could not send admin support notification email:', mailErr.message);
    }

    // Real-time notification to Admin Portal
    try {
      const io = req.app.get('io');
      if (io) {
        io.to('admin-room').emit('new-support-ticket', {
          id: ticket._id,
          ticket_number: ticketNumber,
          subject,
          category: category || 'other',
          priority,
          cafe_name: cafe.name,
          created_at: ticket.createdAt
        });
      }
    } catch (sockErr) {
      console.warn('Socket notification error on support ticket:', sockErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Support ticket submitted successfully. Our team will review it shortly.',
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all tickets for the authenticated café
// @route   GET /api/support/owner/tickets
const getMyTickets = async (req, res, next) => {
  try {
    const tickets = await SupportTicket.find({ cafe_id: req.user._id }).sort({ created_at: -1 });
    res.status(200).json({
      success: true,
      data: tickets
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get platform support channels & FAQs (Owner)
// @route   GET /api/support/owner/info
const getSupportInfo = async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    const cafe = await Cafe.findById(req.user._id).select('name email phone subscription subscription_status');
    const isPro = cafe?.subscription?.plan_name === 'pro' || cafe?.subscription_status === 'pro';

    res.status(200).json({
      success: true,
      data: {
        platform_name: settings.platform_name || 'QRMenu SaaS',
        contact_email: settings.contact_email || 'support@qrmenu.com',
        support_phone: settings.support_phone || '+91 98765 43210',
        support_whatsapp: settings.support_whatsapp || '919876543210',
        support_hours: settings.support_hours || 'Mon - Sun, 9:00 AM - 10:00 PM IST',
        is_pro: isPro,
        sla: isPro ? '⚡ Priority Fast-Track Support (< 1 Hour Response)' : 'Standard Email Support (< 24 Hour Response)',
        cafe_info: {
          name: cafe?.name,
          email: cafe?.email,
          phone: cafe?.phone
        },
        faqs: DEFAULT_FAQS
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all support tickets across all cafés (Admin)
// @route   GET /api/support/admin/tickets
const getAllTickets = async (req, res, next) => {
  try {
    const { status, priority, category } = req.query;
    const filter = {};

    if (status && status !== 'all') filter.status = status;
    if (priority && priority !== 'all') filter.priority = priority;
    if (category && category !== 'all') filter.category = category;

    const tickets = await SupportTicket.find(filter)
      .populate('cafe_id', 'name email phone subscription_status subscription')
      .sort({ created_at: -1 });

    const totalCount = await SupportTicket.countDocuments();
    const openCount = await SupportTicket.countDocuments({ status: 'open' });
    const inProgressCount = await SupportTicket.countDocuments({ status: 'in_progress' });
    const urgentCount = await SupportTicket.countDocuments({ priority: 'urgent', status: { $in: ['open', 'in_progress'] } });
    const resolvedCount = await SupportTicket.countDocuments({ status: 'resolved' });

    res.status(200).json({
      success: true,
      counts: {
        total: totalCount,
        open: openCount,
        in_progress: inProgressCount,
        urgent: urgentCount,
        resolved: resolvedCount
      },
      data: tickets
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reply to & update ticket status (Admin)
// @route   PUT /api/support/admin/tickets/:id
const replyAndResolveTicket = async (req, res, next) => {
  try {
    const { status, admin_reply } = req.body;
    const ticket = await SupportTicket.findById(req.params.id).populate('cafe_id', 'name email');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Support ticket not found' });
    }

    if (status) ticket.status = status;
    if (admin_reply !== undefined) ticket.admin_reply = admin_reply;
    if (status === 'resolved' || status === 'closed') {
      ticket.resolved_at = new Date();
    }

    await ticket.save();

    // Real-time notification to Café Owner Portal
    try {
      const io = req.app.get('io');
      if (io && ticket.cafe_id) {
        const cafeId = ticket.cafe_id._id ? String(ticket.cafe_id._id) : String(ticket.cafe_id);
        io.to(`cafe-${cafeId}`).emit('support-ticket-updated', {
          id: ticket._id,
          _id: ticket._id,
          ticket_number: ticket.ticket_number,
          subject: ticket.subject,
          status: ticket.status,
          admin_reply: ticket.admin_reply,
          updated_at: new Date()
        });
      }
    } catch (sockErr) {
      console.warn('Socket notification error on support ticket reply:', sockErr.message);
    }

    // Send email update to Café Owner
    if (ticket.cafe_id?.email && admin_reply) {
      try {
        const settings = await Settings.getSettings();
        await sendEmail({
          email: ticket.cafe_id.email,
          subject: `Update on Ticket #${ticket.ticket_number}: ${ticket.subject}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; padding: 20px; background: #0f172a; color: #f8fafc; border-radius: 12px;">
              <h2 style="color: #38bdf8; margin-top: 0;">${settings.platform_name || 'QRMenu'} Support Update</h2>
              <p>Hello <strong>${ticket.cafe_id.name}</strong>,</p>
              <p>There is an update regarding your support ticket <strong>#${ticket.ticket_number}</strong> (${ticket.subject}).</p>
              <div style="padding: 14px; background: #1e293b; border-left: 4px solid #10b981; border-radius: 6px; margin: 16px 0;">
                <p style="margin: 0 0 6px; font-weight: bold; color: #10b981;">Response from Support Team:</p>
                <p style="margin: 0; white-space: pre-wrap;">${admin_reply}</p>
              </div>
              <p><strong>Status:</strong> <span style="text-transform: capitalize; color: #38bdf8;">${ticket.status}</span></p>
              <p style="color: #94a3b8; font-size: 13px;">You can view and reply from your Café Owner Dashboard under Help & Support.</p>
            </div>
          `
        });
      } catch (mailErr) {
        console.warn('Could not send owner ticket update email:', mailErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Support ticket updated successfully',
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTicket,
  getMyTickets,
  getSupportInfo,
  getAllTickets,
  replyAndResolveTicket
};
