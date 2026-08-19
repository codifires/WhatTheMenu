const Cafe = require('../models/Cafe');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const Subscription = require('../models/Subscription');
const SubscriptionHistory = require('../models/SubscriptionHistory');
const Feedback = require('../models/Feedback');
const QRCode = require('../models/QRCode');
const SubscriptionRequest = require('../models/SubscriptionRequest');
const Settings = require('../models/Settings');
const GlobalMedia = require('../models/GlobalMedia');
const SupportTicket = require('../models/SupportTicket');
const SystemLog = require('../models/SystemLog');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const { welcomeTemplate, emailChangeOldTemplate, emailChangeNewTemplate } = require('../utils/emailTemplates');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Parallel fetch all admin metrics in 1 shot
    const [
      totalCafes,
      activePlans,
      expiredPlans,
      suspendedCafes,
      monthlyRevenue,
      monthlyCashCollected,
      revenueHistory,
      dailyRevenueHistory,
      recentCafes,
      pendingRequests,
      openTickets,
      urgentTickets,
      recentTickets
    ] = await Promise.all([
      Cafe.countDocuments(),
      Subscription.countDocuments({ status: 'active' }),
      Subscription.countDocuments({ status: 'expired' }),
      Cafe.countDocuments({ subscription_status: 'suspended' }),
      Subscription.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$price' } } }
      ]),
      SubscriptionHistory.aggregate([
        { $match: { created_at: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$price' } } }
      ]),
      SubscriptionHistory.aggregate([
        { $match: { created_at: { $gte: sixMonthsAgo } } },
        { $group: { _id: { year: { $year: "$created_at" }, month: { $month: "$created_at" } }, total: { $sum: "$price" } } },
        { $sort: { "_id.year": -1, "_id.month": -1 } }
      ]),
      SubscriptionHistory.aggregate([
        { $match: { created_at: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { year: { $year: "$created_at" }, month: { $month: "$created_at" }, day: { $dayOfMonth: "$created_at" } }, total: { $sum: "$price" } } },
        { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } }
      ]),
      Cafe.find().sort({ created_at: -1 }).limit(5).select('name email subscription_status created_at').lean(),
      SubscriptionRequest.countDocuments({ status: 'pending' }),
      SupportTicket.countDocuments({ status: 'open' }),
      SupportTicket.countDocuments({ priority: 'urgent', status: { $in: ['open', 'in_progress'] } }),
      SupportTicket.find().populate('cafe_id', 'name email').sort({ created_at: -1 }).limit(5).lean()
    ]);

    res.json({
      success: true,
      data: {
        totalCafes,
        activePlans,
        expiredPlans,
        suspendedCafes,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        monthlyCashCollected: monthlyCashCollected[0]?.total || 0,
        revenueHistory,
        dailyRevenueHistory,
        recentCafes,
        pendingRequests,
        openTickets,
        urgentTickets,
        recentTickets
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new cafe
// @route   POST /api/admin/cafes
const createCafe = async (req, res, next) => {
  try {
    const { name, email, phone, address, plan_name } = req.body;

    // Check if cafe exists
    const cafeExists = await Cafe.findOne({ email });
    if (cafeExists) {
      return res.status(400).json({
        success: false,
        message: 'Café with this email already exists'
      });
    }

    // Generate a secure temporary password (owner will never know this)
    const tempPassword = crypto.randomBytes(20).toString('hex');

    // Create cafe
    const cafe = await Cafe.create({
      name,
      email,
      password: tempPassword,
      phone,
      address,
      logo: req.file ? req.file.path : ''
    });

    // Determine subscription details based on plan
    let subscriptionData;

    if (plan_name === 'free' || !plan_name) {
      const settings = await Settings.getSettings();
      const trialDays = settings.trial_days || 14;
      const trialEnd = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

      subscriptionData = {
        cafe_id: cafe._id,
        plan_name: 'free',
        price: 0,
        status: 'active',
        start_date: Date.now(),
        end_date: trialEnd,
        trial_end_date: trialEnd
      };
    } else {
      const selectedPlan = plan_name === 'pro' ? 'pro' : 'starter';
      const settings = await Settings.getSettings();
      const planPrice = selectedPlan === 'pro' ? (settings.pro_price || 499) : (settings.starter_price || 299);
      subscriptionData = {
        cafe_id: cafe._id,
        plan_name: selectedPlan,
        price: planPrice,
        status: 'active',
        start_date: Date.now(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      };
    }

    await Subscription.create(subscriptionData);

    // Generate Set Password Token
    const resetToken = crypto.randomBytes(32).toString('hex');
    cafe.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    cafe.resetPasswordExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await cafe.save();

    // Create reset url
    const resetUrl = `${req.protocol}://${req.get('host').replace('5000', '3000')}/set-password/${resetToken}`;

    const message = `Welcome to QR Menu SaaS!\n\nYour café account has been officially created.\nYour temporary password is: ${tempPassword}\n\nPlease set your new password using this link: ${resetUrl}`;
    
    const html = welcomeTemplate(resetUrl, cafe.name, tempPassword);

    try {
      await sendEmail({
        email: cafe.email,
        subject: 'Welcome to QR Menu SaaS - Set Your Password',
        message,
        html
      });
    } catch (err) {
      console.error(err);
      cafe.resetPasswordToken = undefined;
      cafe.resetPasswordExpire = undefined;
      await cafe.save();
      // We don't fail the creation, but we warn the admin
      return res.status(201).json({
        success: true,
        message: 'Café created successfully, but email could not be sent. Check terminal for token.',
        data: cafe,
        resetToken // Sending in response just in case admin needs it during dev
      });
    }

    res.status(201).json({
      success: true,
      data: cafe,
      message: 'Café created and welcome email sent!'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all cafes (paginated)
// @route   GET /api/admin/cafes
const getCafes = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    const query = search
      ? { name: { $regex: search, $options: 'i' } }
      : {};

    const total = await Cafe.countDocuments(query);
    const cafes = await Cafe.find(query)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-password');

    // Get subscription info for each cafe
    const cafesWithSubs = await Promise.all(
      cafes.map(async (cafe) => {
        const subscription = await Subscription.findOne({ cafe_id: cafe._id })
          .sort({ created_at: -1 });
        return {
          ...cafe.toObject(),
          subscription
        };
      })
    );

    res.json({
      success: true,
      data: cafesWithSubs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single café
// @route   GET /api/admin/cafes/:id
const getCafe = async (req, res, next) => {
  try {
    const cafe = await Cafe.findById(req.params.id).select('-password');
    if (!cafe) {
      return res.status(404).json({ success: false, message: 'Café not found' });
    }

    const subscription = await Subscription.findOne({ cafe_id: cafe._id })
      .sort({ created_at: -1 });

    const orderCount = await Order.countDocuments({ cafe_id: cafe._id });
    const menuItemCount = await MenuItem.countDocuments({ cafe_id: cafe._id });

    res.json({
      success: true,
      data: {
        ...cafe.toObject(),
        subscription,
        orderCount,
        menuItemCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update café
// @route   PUT /api/admin/cafes/:id
const updateCafe = async (req, res, next) => {
  try {
    const { name, phone, address, email } = req.body;
    const updateData = {};
    let oldEmail = null;
    let newEmail = null;

    // Fetch the existing cafe to check for email changes
    const existingCafe = await Cafe.findById(req.params.id);
    if (!existingCafe) {
      return res.status(404).json({ success: false, message: 'Café not found' });
    }

    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;
    
    // Check if email is changing
    if (email && email !== existingCafe.email) {
      updateData.email = email;
      oldEmail = existingCafe.email;
      newEmail = email;
    }

    if (req.file) updateData.logo = req.file.path;

    const cafe = await Cafe.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    // Send email change notifications if the email was changed
    if (oldEmail && newEmail) {
      // Send to OLD email
      try {
        await sendEmail({
          email: oldEmail,
          subject: 'Security Alert: Your Email Address was Changed',
          message: `Your email address for ${cafe.name} has been changed to ${newEmail}. If you did not authorize this, contact support.`,
          html: emailChangeOldTemplate(cafe.name, newEmail)
        });
      } catch (err) {
        console.error('Failed to send email change alert to old email:', err);
      }

      // Send to NEW email
      try {
        await sendEmail({
          email: newEmail,
          subject: 'Welcome! Your Email Address was Updated',
          message: `Your email address has been updated. This is now the official contact for ${cafe.name}.`,
          html: emailChangeNewTemplate(cafe.name)
        });
      } catch (err) {
        console.error('Failed to send email change alert to new email:', err);
      }
    }

    res.json({ success: true, data: cafe });
  } catch (error) {
    next(error);
  }
};

// @desc    Suspend café
// @route   PUT /api/admin/cafes/:id/suspend
const suspendCafe = async (req, res, next) => {
  try {
    const cafe = await Cafe.findByIdAndUpdate(
      req.params.id,
      {
        subscription_status: 'suspended',
        is_active: false
      },
      { new: true }
    ).select('-password');

    if (!cafe) {
      return res.status(404).json({ success: false, message: 'Café not found' });
    }

    // Also suspend subscription
    await Subscription.updateMany(
      { cafe_id: cafe._id, status: 'active' },
      { status: 'suspended' }
    );

    // Emit socket event to log out owner
    const io = req.app.get('io');
    if (io) {
      io.to(`cafe-${cafe._id}`).emit('account-suspended', {
        message: 'Your account was suspended by the admin. Please contact support at support@qrmenu.com or 1-800-QR-MENU.'
      });
    }

    res.json({ success: true, data: cafe, message: 'Café suspended successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Activate café
// @route   PUT /api/admin/cafes/:id/activate
const activateCafe = async (req, res, next) => {
  try {
    const cafe = await Cafe.findByIdAndUpdate(
      req.params.id,
      {
        subscription_status: 'active',
        is_active: true
      },
      { new: true }
    ).select('-password');

    if (!cafe) {
      return res.status(404).json({ success: false, message: 'Café not found' });
    }

    res.json({ success: true, data: cafe, message: 'Café activated successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete café and all related data
// @route   DELETE /api/admin/cafes/:id
const deleteCafe = async (req, res, next) => {
  try {
    const cafe = await Cafe.findById(req.params.id);
    if (!cafe) {
      return res.status(404).json({ success: false, message: 'Café not found' });
    }

    // Delete all related data
    await Category.deleteMany({ cafe_id: cafe._id });
    await MenuItem.deleteMany({ cafe_id: cafe._id });
    await Order.deleteMany({ cafe_id: cafe._id });
    await Feedback.deleteMany({ cafe_id: cafe._id });
    await Subscription.deleteMany({ cafe_id: cafe._id });
    await QRCode.deleteMany({ cafe_id: cafe._id });
    await Cafe.findByIdAndDelete(cafe._id);

    res.json({ success: true, message: 'Café and all related data deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all subscriptions
// @route   GET /api/admin/subscriptions
const getSubscriptions = async (req, res, next) => {
  try {
    const subscriptions = await Subscription.find()
      .populate('cafe_id', 'name email')
      .sort({ created_at: -1 });

    res.json({ success: true, data: subscriptions });
  } catch (error) {
    next(error);
  }
};

// @desc    Update subscription
// @route   PUT /api/admin/subscriptions/:id
const updateSubscription = async (req, res, next) => {
  try {
    const { plan_name, status, end_date } = req.body;
    const updateData = {};

    if (plan_name) {
      updateData.plan_name = plan_name;
      updateData.price = plan_name === 'pro' ? 499 : 299;
    }
    if (status) updateData.status = status;
    if (end_date) updateData.end_date = end_date;

    const subscription = await Subscription.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('cafe_id', 'name email');

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    // Update cafe subscription status
    if (status) {
      await Cafe.findByIdAndUpdate(subscription.cafe_id._id, {
        subscription_status: status,
        is_active: status === 'active'
      });

      if (status === 'suspended') {
        const io = req.app.get('io');
        if (io) {
          io.to(`cafe-${subscription.cafe_id._id}`).emit('account-suspended', {
            message: 'Your account was suspended by the admin. Please contact support at support@qrmenu.com or 1-800-QR-MENU.'
          });
        }
      }
    }

    res.json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all subscription requests
// @route   GET /api/admin/subscription-requests
const getSubscriptionRequests = async (req, res, next) => {
  try {
    const requests = await SubscriptionRequest.find()
      .populate('cafe_id', 'name email')
      .sort({ created_at: -1 });

    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve subscription request
// @route   PUT /api/admin/subscription-requests/:id/approve
const approveSubscriptionRequest = async (req, res, next) => {
  try {
    const request = await SubscriptionRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Request is not pending' });
    }

    request.status = 'approved';
    await request.save();

    const cafe = await Cafe.findById(request.cafe_id);
    const now = new Date();

    if (cafe.subscription?.end_date && new Date(cafe.subscription.end_date) > now && cafe.subscription.status === 'active') {
      cafe.upcoming_subscription = {
        plan_name: request.plan_name,
        duration_days: 30
      };
      await cafe.save({ validateBeforeSave: false });
    } else {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30); // 30 day subscription

      cafe.subscription_status = 'active';
      cafe.is_active = true;
      cafe.subscription = {
        plan_name: request.plan_name,
        start_date: new Date(),
        end_date: endDate,
        status: 'active'
      };
      cafe.upcoming_subscription = undefined;
      await cafe.save({ validateBeforeSave: false });

      // Update or create active subscription
      await Subscription.findOneAndUpdate(
        { cafe_id: request.cafe_id },
        {
          plan_name: request.plan_name,
          price: request.amount,
          start_date: new Date(),
          end_date: endDate,
          status: 'active'
        },
        { upsert: true, new: true }
      );

      // Create permanent history record
      await SubscriptionHistory.create({
        cafe_id: request.cafe_id,
        plan_name: request.plan_name,
        price: request.amount,
        start_date: new Date(),
        end_date: endDate,
        status: 'active'
      });
    }

    res.json({ success: true, data: request, message: 'Subscription approved' });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject subscription request
// @route   PUT /api/admin/subscription-requests/:id/reject
const rejectSubscriptionRequest = async (req, res, next) => {
  try {
    const request = await SubscriptionRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    request.status = 'rejected';
    await request.save();

    res.json({ success: true, data: request, message: 'Subscription rejected' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get platform settings
// @route   GET /api/admin/settings
const getSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

// @desc    Update platform settings
// @route   PUT /api/admin/settings
const updateSettings = async (req, res, next) => {
  try {
    const { trial_days, currency, tax_rate, payment_live_mode, platform_name, contact_email, support_phone, support_whatsapp, support_hours, starter_price, pro_price, yearly_discount_percentage, maintenance_mode, starter_features, pro_features } = req.body;
    const settings = await Settings.getSettings();

    if (trial_days !== undefined) settings.trial_days = Number(trial_days);
    if (currency) settings.currency = currency;
    if (tax_rate !== undefined) settings.tax_rate = Number(tax_rate);
    if (payment_live_mode !== undefined) settings.payment_live_mode = payment_live_mode;
    if (platform_name) settings.platform_name = platform_name;
    if (contact_email) settings.contact_email = contact_email;
    if (support_phone) settings.support_phone = support_phone;
    if (support_whatsapp) settings.support_whatsapp = support_whatsapp;
    if (support_hours) settings.support_hours = support_hours;
    if (starter_price !== undefined) settings.starter_price = Number(starter_price);
    if (pro_price !== undefined) settings.pro_price = Number(pro_price);
    if (yearly_discount_percentage !== undefined) settings.yearly_discount_percentage = Number(yearly_discount_percentage);
    if (maintenance_mode !== undefined) settings.maintenance_mode = maintenance_mode;
    if (starter_features !== undefined) settings.starter_features = starter_features;
    if (pro_features !== undefined) settings.pro_features = pro_features;

    await settings.save();

    // Broadcast setting changes to all connected clients
    const io = req.app.get('io');
    if (io) {
      io.emit('settings-updated');
    }

    res.json({ success: true, data: settings, message: 'Settings saved successfully' });
  } catch (error) {
    next(error);
  }
};

// ============ GLOBAL MEDIA ============

// @desc    Upload global media image
// @route   POST /api/admin/media
const uploadGlobalMedia = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image file' });
    }
    
    const media = await GlobalMedia.create({
      image_url: req.file.path,
      file_name: req.body.file_name || req.file.originalname,
      category: req.body.category || 'General'
    });

    res.status(201).json({ success: true, data: media });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all global media
// @route   GET /api/admin/media
const getGlobalMedia = async (req, res, next) => {
  try {
    const media = await GlobalMedia.find().sort({ created_at: -1 });
    res.json({ success: true, data: media });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete global media
// @route   DELETE /api/admin/media/:id
const deleteGlobalMedia = async (req, res, next) => {
  try {
    const media = await GlobalMedia.findByIdAndDelete(req.params.id);
    if (!media) {
      return res.status(404).json({ success: false, message: 'Media not found' });
    }
    res.json({ success: true, message: 'Media deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get subscription history for a cafe
// @route   GET /api/admin/subscriptions/:cafeId/history
const getSubscriptionHistory = async (req, res, next) => {
  try {
    const history = await SubscriptionHistory.find({ cafe_id: req.params.cafeId })
      .sort({ created_at: -1 });
    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

// @desc    Get platform revenue history with year/month/day drill-down
// @route   GET /api/admin/revenue?view=yearly|monthly|daily&year=2026&month=7
const getRevenueHistory = async (req, res, next) => {
  try {
    const { view = 'monthly', year, month } = req.query;

    let matchStage = {};

    if (view === 'monthly' && year) {
      const startOfYear = new Date(Number(year), 0, 1);
      const endOfYear   = new Date(Number(year), 11, 31, 23, 59, 59, 999);
      matchStage.created_at = { $gte: startOfYear, $lte: endOfYear };
    } else if (view === 'daily' && year && month) {
      const startOfMonth = new Date(Number(year), Number(month) - 1, 1);
      const endOfMonth   = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
      matchStage.created_at = { $gte: startOfMonth, $lte: endOfMonth };
    } else if (view === 'yearly') {
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 4);
      fiveYearsAgo.setMonth(0); fiveYearsAgo.setDate(1); fiveYearsAgo.setHours(0, 0, 0, 0);
      matchStage.created_at = { $gte: fiveYearsAgo };
    }

    let groupId;
    let sortStage;
    if (view === 'yearly') {
      groupId = { year: { $year: '$created_at' } };
      sortStage = { '_id.year': -1 };
    } else if (view === 'daily') {
      groupId = {
        year:  { $year:  '$created_at' },
        month: { $month: '$created_at' },
        day:   { $dayOfMonth: '$created_at' }
      };
      sortStage = { '_id.year': -1, '_id.month': -1, '_id.day': -1 };
    } else {
      groupId = {
        year:  { $year:  '$created_at' },
        month: { $month: '$created_at' }
      };
      sortStage = { '_id.year': -1, '_id.month': -1 };
    }

    const history = await SubscriptionHistory.aggregate([
      { $match: matchStage },
      { $group: { _id: groupId, total: { $sum: '$price' }, count: { $sum: 1 } } },
      { $sort: sortStage }
    ]);

    const availableYearsAgg = await SubscriptionHistory.aggregate([
      { $group: { _id: { year: { $year: '$created_at' } } } },
      { $sort: { '_id.year': -1 } }
    ]);

    const availableYearsList = availableYearsAgg.map(y => y._id.year).filter(Boolean);
    const currentYear = new Date().getFullYear();
    if (!availableYearsList.includes(currentYear)) {
      availableYearsList.unshift(currentYear);
    }

    res.json({
      success: true,
      data: {
        view,
        year: year ? Number(year) : null,
        month: month ? Number(month) : null,
        history,
        availableYears: availableYearsList
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all subscription payments across all cafes
// @route   GET /api/admin/payments
const getAllPayments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    
    const total = await SubscriptionHistory.countDocuments();
    const payments = await SubscriptionHistory.find()
      .populate('cafe_id', 'name email phone')
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
      
    res.json({
      success: true,
      data: payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get system error logs
// @route   GET /api/admin/logs
const getSystemLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const total = await SystemLog.countDocuments();
    const logs = await SystemLog.find()
      .populate('user_id', 'name email')
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear system error logs
// @route   DELETE /api/admin/logs/clear
const clearSystemLogs = async (req, res, next) => {
  try {
    await SystemLog.deleteMany({});
    res.json({ success: true, message: 'All system logs cleared' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
  getGlobalMedia,
  uploadGlobalMedia,
  deleteGlobalMedia,
  getSubscriptionHistory,
  getRevenueHistory,
  getAllPayments,
  getSystemLogs,
  clearSystemLogs
};
