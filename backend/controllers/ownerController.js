const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const OrderRevenue = require('../models/OrderRevenue');
const Feedback = require('../models/Feedback');
const crypto = require('crypto');
const axios = require('axios');
const Cafe = require('../models/Cafe');
const QRCodeModel = require('../models/QRCode');
const GlobalMedia = require('../models/GlobalMedia');
const Subscription = require('../models/Subscription');
const SubscriptionHistory = require('../models/SubscriptionHistory');
const SubscriptionRequest = require('../models/SubscriptionRequest');
const Settings = require('../models/Settings');
const { generateQRCode } = require('../utils/qrcode');

// ============ DASHBOARD ============

// @desc    Get owner dashboard stats
// @route   GET /api/owner/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const cafeId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = await Order.countDocuments({
      cafe_id: cafeId,
      created_at: { $gte: today }
    });

    const pendingOrders = await Order.countDocuments({
      cafe_id: cafeId,
      order_status: { $in: ['new', 'accepted', 'preparing'] }
    });

    const completedToday = await Order.countDocuments({
      cafe_id: cafeId,
      order_status: 'completed',
      created_at: { $gte: today }
    });

    const revenueResult = await Order.aggregate([
      {
        $match: {
          cafe_id: cafeId,
          created_at: { $gte: today },
          payment_status: { $in: ['received', 'completed'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total_amount' }
        }
      }
    ]);

    const totalMenuItems = await MenuItem.countDocuments({ cafe_id: cafeId });
    const totalCategories = await Category.countDocuments({ cafe_id: cafeId });

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyRevenueHistory = await Order.aggregate([
      {
        $match: {
          cafe_id: cafeId,
          created_at: { $gte: sixMonthsAgo },
          payment_status: { $in: ['received', 'completed'] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$created_at" },
            month: { $month: "$created_at" }
          },
          total: { $sum: "$total_amount" }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } }
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const dailyRevenueHistory = await Order.aggregate([
      {
        $match: {
          cafe_id: cafeId,
          created_at: { $gte: thirtyDaysAgo },
          payment_status: { $in: ['received', 'completed'] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$created_at" },
            month: { $month: "$created_at" },
            day: { $dayOfMonth: "$created_at" }
          },
          total: { $sum: "$total_amount" }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } }
    ]);

    // Recent orders
    const recentOrders = await Order.find({ cafe_id: cafeId })
      .sort({ created_at: -1 })
      .limit(5);

    // Average rating
    const ratingResult = await Feedback.aggregate([
      { $match: { cafe_id: cafeId } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);

    // Active subscription
    const activeSub = await Subscription.findOne({ cafe_id: cafeId, status: 'active' });
    let subscriptionData = null;
    if (activeSub) {
      const now = new Date();
      const end = new Date(activeSub.end_date);
      const diffTime = end - now;
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      subscriptionData = {
        plan_name: activeSub.plan_name,
        end_date: activeSub.end_date,
        daysLeft: daysLeft > 0 ? daysLeft : 0
      };
    }

    res.json({
      success: true,
      data: {
        todayOrders,
        pendingOrders,
        completedToday,
        todayRevenue: revenueResult[0]?.total || 0,
        totalMenuItems,
        totalCategories,
        recentOrders,
        averageRating: ratingResult[0]?.avg?.toFixed(1) || '0.0',
        totalReviews: ratingResult[0]?.count || 0,
        subscription: subscriptionData,
        monthlyRevenueHistory,
        dailyRevenueHistory
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============ CATEGORIES ============

// @desc    Get all categories for the café
// @route   GET /api/owner/categories
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ cafe_id: req.user._id })
      .sort({ sort_order: 1 });

    // Get item count per category
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const itemCount = await MenuItem.countDocuments({ category_id: cat._id });
        return { ...cat.toObject(), itemCount };
      })
    );

    res.json({ success: true, data: categoriesWithCount });
  } catch (error) {
    next(error);
  }
};

// @desc    Create category
// @route   POST /api/owner/categories
const createCategory = async (req, res, next) => {
  try {
    const { name, sort_order } = req.body;

    const existingCategory = await Category.findOne({ 
      cafe_id: req.user._id, 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });
    if (existingCategory) {
      return res.status(400).json({ success: false, message: 'Category with this name already exists' });
    }

    const category = await Category.create({
      cafe_id: req.user._id,
      name,
      sort_order: sort_order || 0
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }
    next(error);
  }
};

// @desc    Update category
// @route   PUT /api/owner/categories/:id
const updateCategory = async (req, res, next) => {
  try {
    if (req.body.name) {
      const existingCategory = await Category.findOne({ 
        cafe_id: req.user._id, 
        name: { $regex: new RegExp(`^${req.body.name}$`, 'i') },
        _id: { $ne: req.params.id }
      });
      if (existingCategory) {
        return res.status(400).json({ success: false, message: 'Category with this name already exists' });
      }
    }

    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, cafe_id: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete category
// @route   DELETE /api/owner/categories/:id
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findOneAndDelete({
      _id: req.params.id,
      cafe_id: req.user._id
    });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Delete all items in this category
    await MenuItem.deleteMany({ category_id: category._id });

    res.json({ success: true, message: 'Category and its items deleted' });
  } catch (error) {
    next(error);
  }
};

// ============ MENU ITEMS ============

// @desc    Get all menu items for the café
// @route   GET /api/owner/menu-items
const getMenuItems = async (req, res, next) => {
  try {
    const { category } = req.query;
    const query = { cafe_id: req.user._id };

    if (category) query.category_id = category;

    const items = await MenuItem.find(query)
      .populate('category_id', 'name')
      .sort({ created_at: -1 });

    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

// @desc    Create menu item
// @route   POST /api/owner/menu-items
const createMenuItem = async (req, res, next) => {
  try {
    const { name, description, price, category_id, is_veg, image_url } = req.body;

    const categoryCount = await Category.countDocuments({ cafe_id: req.user._id });
    if (categoryCount === 0) {
      return res.status(400).json({ success: false, message: 'Please first create a category, then create the item.' });
    }

    const existingItem = await MenuItem.findOne({ 
      cafe_id: req.user._id, 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });
    if (existingItem) {
      return res.status(400).json({ success: false, message: 'Menu item with this name already exists' });
    }

    const item = await MenuItem.create({
      cafe_id: req.user._id,
      category_id,
      name,
      description,
      price,
      is_veg: is_veg !== undefined ? is_veg : true,
      image: req.file ? req.file.path : (image_url || '')
    });

    const populated = await MenuItem.findById(item._id).populate('category_id', 'name');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Update menu item
// @route   PUT /api/owner/menu-items/:id
const updateMenuItem = async (req, res, next) => {
  try {
    if (req.body.name) {
      const existingItem = await MenuItem.findOne({ 
        cafe_id: req.user._id, 
        name: { $regex: new RegExp(`^${req.body.name}$`, 'i') },
        _id: { $ne: req.params.id }
      });
      if (existingItem) {
        return res.status(400).json({ success: false, message: 'Menu item with this name already exists' });
      }
    }

    const updateData = { ...req.body };
    if (req.file) {
      updateData.image = req.file.path;
    } else if (req.body.image_url !== undefined) {
      updateData.image = req.body.image_url;
    }

    const item = await MenuItem.findOneAndUpdate(
      { _id: req.params.id, cafe_id: req.user._id },
      updateData,
      { new: true, runValidators: true }
    ).populate('category_id', 'name');

    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete menu item
// @route   DELETE /api/owner/menu-items/:id
const deleteMenuItem = async (req, res, next) => {
  try {
    const item = await MenuItem.findOneAndDelete({
      _id: req.params.id,
      cafe_id: req.user._id
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    res.json({ success: true, message: 'Menu item deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle item availability
// @route   PUT /api/owner/menu-items/:id/availability
const toggleAvailability = async (req, res, next) => {
  try {
    const item = await MenuItem.findOne({
      _id: req.params.id,
      cafe_id: req.user._id
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    item.availability = !item.availability;
    await item.save();

    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

// ============ ORDERS ============

// @desc    Get all orders for the café
// @route   GET /api/owner/orders
const getOrders = async (req, res, next) => {
  try {
    const { status, date, page = 1, limit = 20 } = req.query;
    const query = { cafe_id: req.user._id };

    if (status) query.order_status = status;

    if (date === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query.created_at = { $gte: today };
    }

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort({ created_at: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status
// @route   PUT /api/owner/orders/:id/status
const updateOrderStatus = async (req, res, next) => {
  try {
    const { order_status } = req.body;
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, cafe_id: req.user._id },
      { order_status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // If order is cancelled, ensure it is completely removed from the revenue ledger
    if (order_status === 'cancelled') {
      try {
        await OrderRevenue.deleteOne({ order_number: order.order_number });
      } catch (revDelErr) {
        console.error('OrderRevenue delete failed (order cancelled):', revDelErr.message);
      }
    }

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`order-${order.order_number}`).emit('order-status-update', {
        order_number: order.order_number,
        status: order.order_status
      });
      io.to(`cafe-${req.user._id}`).emit('order-updated', order);
    }

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Update payment status
// @route   PUT /api/owner/orders/:id/payment
const updatePaymentStatus = async (req, res, next) => {
  try {
    const { payment_status = 'received' } = req.body;
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, cafe_id: req.user._id },
      { payment_status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Save to permanent revenue ledger only if payment is received and order is NOT cancelled
    if (payment_status === 'received' && order.order_status !== 'cancelled') {
      try {
        await OrderRevenue.findOneAndUpdate(
          { order_number: order.order_number },
          {
            cafe_id: order.cafe_id,
            order_number: order.order_number,
            total_amount: order.total_amount,
            payment_method: order.payment_method,
            table_number: order.table_number || '',
            items_count: order.items?.length || 0,
            payment_date: new Date()
          },
          { upsert: true, new: true }
        );
      } catch (revErr) {
        console.error('OrderRevenue save failed (payment):', revErr.message);
      }
    } else {
      // If payment is not received or order is cancelled, remove from revenue ledger
      try {
        await OrderRevenue.deleteOne({ order_number: order.order_number });
      } catch (revDelErr) {
        console.error('OrderRevenue delete failed (non-received payment):', revDelErr.message);
      }
    }

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// ============ REVENUE HISTORY ============

// @desc    Get revenue history with year/month/day drill-down
// @route   GET /api/owner/revenue?view=yearly|monthly|daily&year=2026&month=7
const getRevenueHistory = async (req, res, next) => {
  try {
    const cafeId = req.user._id;
    const { view = 'monthly', year, month } = req.query;

    let matchStage = { cafe_id: cafeId };

    if (view === 'monthly' && year) {
      // Specific year: group by month
      const startOfYear = new Date(Number(year), 0, 1);
      const endOfYear   = new Date(Number(year), 11, 31, 23, 59, 59, 999);
      matchStage.payment_date = { $gte: startOfYear, $lte: endOfYear };
    } else if (view === 'daily' && year && month) {
      // Specific month in a year: group by day
      const startOfMonth = new Date(Number(year), Number(month) - 1, 1);
      const endOfMonth   = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
      matchStage.payment_date = { $gte: startOfMonth, $lte: endOfMonth };
    } else if (view === 'yearly') {
      // Last 5 years: group by year
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 4);
      fiveYearsAgo.setMonth(0); fiveYearsAgo.setDate(1); fiveYearsAgo.setHours(0, 0, 0, 0);
      matchStage.payment_date = { $gte: fiveYearsAgo };
    }

    let groupId;
    let sortStage;
    if (view === 'yearly') {
      groupId = { year: { $year: '$payment_date' } };
      sortStage = { '_id.year': -1 };
    } else if (view === 'daily') {
      groupId = {
        year:  { $year:  '$payment_date' },
        month: { $month: '$payment_date' },
        day:   { $dayOfMonth: '$payment_date' }
      };
      sortStage = { '_id.year': -1, '_id.month': -1, '_id.day': -1 };
    } else {
      // monthly (default)
      groupId = {
        year:  { $year:  '$payment_date' },
        month: { $month: '$payment_date' }
      };
      sortStage = { '_id.year': -1, '_id.month': -1 };
    }

    const history = await OrderRevenue.aggregate([
      { $match: matchStage },
      { $group: { _id: groupId, total: { $sum: '$total_amount' }, orders: { $sum: 1 } } },
      { $sort: sortStage }
    ]);

    // Available years (for year picker dropdown)
    const availableYearsAgg = await OrderRevenue.aggregate([
      { $match: { cafe_id: cafeId } },
      { $group: { _id: { year: { $year: '$payment_date' } } } },
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

// ============ QR CODE ============

// Helper to determine the actual frontend domain for QR menu URLs
const resolveFrontendUrl = (req) => {
  let fe = process.env.FRONTEND_URL;
  if (!fe || fe === '*' || fe.includes('*')) {
    fe = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : 'http://localhost:3000');
  }
  return fe.replace(/\/$/, '');
};

// @desc    Get or generate QR code
// @route   GET /api/owner/qr-code
const getQRCode = async (req, res, next) => {
  try {
    const cafeId = req.user._id;
    let qrData = await QRCodeModel.findOne({ cafe_id: cafeId });
    const baseFe = resolveFrontendUrl(req);
    const expectedMenuUrl = `${baseFe}/menu/${cafeId}`;

    // Auto-heal any invalid legacy URLs (e.g. starting with '*' or missing http)
    if (!qrData || !qrData.menu_url || qrData.menu_url.startsWith('*') || !qrData.menu_url.startsWith('http')) {
      const qrImage = await generateQRCode(expectedMenuUrl);

      qrData = await QRCodeModel.findOneAndUpdate(
        { cafe_id: cafeId },
        { qr_image: qrImage, menu_url: expectedMenuUrl },
        { new: true, upsert: true }
      );
    }

    res.json({ success: true, data: qrData });
  } catch (error) {
    next(error);
  }
};

// @desc    Regenerate QR code
// @route   POST /api/owner/qr-code/regenerate
const regenerateQRCode = async (req, res, next) => {
  try {
    const cafeId = req.user._id;
    const baseFe = resolveFrontendUrl(req);
    const menuUrl = `${baseFe}/menu/${cafeId}`;
    const qrImage = await generateQRCode(menuUrl);

    const qrData = await QRCodeModel.findOneAndUpdate(
      { cafe_id: cafeId },
      { qr_image: qrImage, menu_url: menuUrl },
      { new: true, upsert: true }
    );

    res.json({ success: true, data: qrData });
  } catch (error) {
    next(error);
  }
};

// ============ FEEDBACK ============

// @desc    Get all feedback for the café
// @route   GET /api/owner/feedback
const getFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.find({ cafe_id: req.user._id })
      .populate('order_id', 'order_number')
      .sort({ created_at: -1 });

    res.json({ success: true, data: feedback });
  } catch (error) {
    next(error);
  }
};

// ============ SETTINGS ============

// @desc    Update café settings
// @route   PUT /api/owner/settings
const updateSettings = async (req, res, next) => {
  try {
    const { name, phone, address, upi_id, tax_percentage } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (upi_id !== undefined) updateData.upi_id = upi_id;
    if (tax_percentage !== undefined) updateData.tax_percentage = tax_percentage;
    if (req.file) {
      updateData.logo = req.file.path;
    }

    const cafe = await Cafe.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).select('-password');

    res.json({ success: true, data: cafe });
  } catch (error) {
    next(error);
  }
};

// @desc    Initiate Automated Real-Time UPI Subscription Payment Session
// @route   POST /api/owner/subscription/initiate-session
const initiateSubscriptionSession = async (req, res, next) => {
  try {
    const { plan_name } = req.body;
    const cafeId = req.user._id;

    if (!['starter', 'pro'].includes(plan_name)) {
      return res.status(400).json({ success: false, message: 'Invalid subscription plan' });
    }

    const settings = await Settings.getSettings();
    const adminUpiId = settings.admin_upi_id || 'superadmin@okaxis';
    const platformName = settings.platform_name || 'QRMenu SaaS';
    const amount = plan_name === 'pro' ? (settings.pro_price || 499) : (settings.starter_price || 299);

    const cafe = await Cafe.findById(cafeId);
    if (!cafe) {
      return res.status(404).json({ success: false, message: 'Café account not found' });
    }

    // Unique session ID for UPI transaction reference (tr)
    const sessionId = `SUB_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Update existing pending request or create new
    let subRequest = await SubscriptionRequest.findOne({
      cafe_id: cafeId,
      status: 'pending'
    });

    if (subRequest) {
      subRequest.session_id = sessionId;
      subRequest.utr_number = sessionId;
      subRequest.amount = amount;
      subRequest.plan_name = plan_name;
      subRequest.status = 'pending';
      await subRequest.save();
    } else {
      subRequest = await SubscriptionRequest.create({
        cafe_id: cafeId,
        session_id: sessionId,
        utr_number: sessionId,
        amount,
        plan_name,
        payment_method: 'upi',
        status: 'pending'
      });
    }

    const planDisplay = plan_name === 'pro' ? 'Pro Plan' : 'Starter Plan';
    const upiString = `upi://pay?pa=${encodeURIComponent(adminUpiId.trim())}&pn=${encodeURIComponent(platformName.trim())}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Upgrade ${planDisplay} - ${cafe.name}`)}&tr=${sessionId}`;

    res.status(201).json({
      success: true,
      data: {
        session_id: sessionId,
        plan_name,
        plan_display: planDisplay,
        amount,
        upi_url: upiString,
        admin_upi_id: adminUpiId,
        platform_name: platformName
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Handle incoming automated UPI subscription payment webhook / settlement callback
// @route   POST /api/owner/subscription/webhook
const handleSubscriptionWebhook = async (req, res, next) => {
  try {
    const { session_id, transaction_id, status = 'SUCCESS', amount } = req.body;
    const trId = session_id || req.body.tr || req.body.merchantTransactionId || req.body.payment_transaction_id;

    if (!trId) {
      return res.status(400).json({ success: false, message: 'Session / Transaction ID required' });
    }

    const subRequest = await SubscriptionRequest.findOne({
      $or: [
        { session_id: trId },
        { utr_number: trId },
        { utr_number: { $regex: new RegExp(`^${trId}`) } }
      ]
    });

    if (!subRequest) {
      return res.status(404).json({ success: false, message: 'Subscription request not found for session' });
    }

    const io = req.app.get('io');

    if (status === 'SUCCESS' || status === 'received' || status === 'COMPLETED') {
      if (subRequest.status === 'approved') {
        return res.status(200).json({ success: true, message: 'Subscription already processed', data: subRequest });
      }

      subRequest.status = 'approved';
      if (transaction_id && transaction_id !== trId) {
        subRequest.utr_number = `${trId}#${transaction_id}`;
      }
      await subRequest.save();

      const cafe = await Cafe.findById(subRequest.cafe_id);
      const now = new Date();

      if (cafe.subscription?.end_date && new Date(cafe.subscription.end_date) > now && cafe.subscription.status === 'active') {
        // Current active plan still has time: queue upcoming plan
        cafe.upcoming_subscription = {
          plan_name: subRequest.plan_name,
          duration_days: 30
        };
      } else {
        // Activate plan immediately for 30 days
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        cafe.subscription_status = 'active';
        cafe.is_active = true;
        cafe.subscription = {
          plan_name: subRequest.plan_name,
          start_date: new Date(),
          end_date: endDate,
          status: 'active'
        };
        cafe.upcoming_subscription = undefined;

        // Upsert Subscription record for Admin sync
        await Subscription.findOneAndUpdate(
          { cafe_id: cafe._id },
          {
            plan_name: subRequest.plan_name,
            price: subRequest.amount,
            start_date: new Date(),
            end_date: endDate,
            status: 'active'
          },
          { upsert: true, new: true }
        );

        // Record in permanent SubscriptionHistory ledger
        await SubscriptionHistory.create({
          cafe_id: cafe._id,
          plan_name: subRequest.plan_name,
          price: subRequest.amount,
          start_date: new Date(),
          end_date: endDate,
          status: 'active'
        });
      }

      await cafe.save({ validateBeforeSave: false });

      // Real-time notifications
      if (io) {
        // 1. Notify Owner session & cafe room
        io.to(`session-${trId}`).emit('subscription-activated', {
          session_id: trId,
          plan_name: subRequest.plan_name,
          amount: subRequest.amount,
          cafe_id: cafe._id
        });
        io.to(`cafe-${cafe._id}`).emit('subscription-activated', {
          session_id: trId,
          plan_name: subRequest.plan_name,
          amount: subRequest.amount
        });

        // 2. Notify Superadmin dashboard
        io.to('admin-room').emit('new-subscription-revenue', {
          cafe_name: cafe.name,
          plan_name: subRequest.plan_name,
          amount: subRequest.amount,
          date: new Date()
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Subscription payment detected & activated successfully',
        data: subRequest
      });
    } else {
      subRequest.status = 'failed';
      await subRequest.save();

      if (io) {
        io.to(`session-${trId}`).emit('subscription-failed', {
          message: 'Subscription payment was not completed'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Subscription payment marked as failed',
        data: subRequest
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Check status of UPI subscription session (Polling fallback)
// @route   GET /api/owner/subscription/check-status/:sessionId
const checkSubscriptionStatus = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const subRequest = await SubscriptionRequest.findOne({
      $or: [
        { session_id: sessionId },
        { utr_number: sessionId },
        { utr_number: { $regex: new RegExp(`^${sessionId}`) } }
      ]
    });

    if (!subRequest) {
      return res.status(404).json({ success: false, message: 'Subscription session not found' });
    }

    res.json({
      success: true,
      data: {
        status: subRequest.status,
        plan_name: subRequest.plan_name,
        amount: subRequest.amount,
        created_at: subRequest.created_at
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel UPI Subscription Session when owner closes modal
// @route   POST /api/owner/subscription/cancel-session/:sessionId
const cancelSubscriptionSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const subRequest = await SubscriptionRequest.findOne({
      $or: [
        { session_id: sessionId },
        { utr_number: sessionId },
        { utr_number: { $regex: new RegExp(`^${sessionId}`) } }
      ],
      status: 'pending'
    });

    if (subRequest) {
      subRequest.status = 'cancelled';
      await subRequest.save();
    }

    res.json({ success: true, message: 'Subscription session cancelled' });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit subscription upgrade request (Legacy direct NPCI UPI with manual UTR number)
// @route   POST /api/owner/subscription/request
const submitSubscriptionRequest = async (req, res, next) => {
  try {
    const { amount, plan_name, utr_number } = req.body;
    
    if (!utr_number || !utr_number.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please enter the 12-digit UPI UTR / Reference number from your payment app'
      });
    }

    // Check if there is already a pending request for this cafe
    const existingPending = await SubscriptionRequest.findOne({
      cafe_id: req.user._id,
      status: 'pending'
    });

    if (existingPending) {
      existingPending.amount = amount;
      existingPending.plan_name = plan_name;
      existingPending.utr_number = utr_number.trim();
      await existingPending.save();

      return res.status(200).json({
        success: true,
        message: 'Subscription request updated successfully. Admin will review and activate shortly!',
        data: existingPending
      });
    }

    const request = await SubscriptionRequest.create({
      cafe_id: req.user._id,
      utr_number: utr_number.trim(),
      amount,
      plan_name,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Subscription upgrade request submitted successfully! Admin will verify and activate your plan.',
      data: request
    });
  } catch (error) {
    next(error);
  }
};

// ============ MEDIA ============

// @desc    Get all global media
// @route   GET /api/owner/media/global
const getGlobalMedia = async (req, res, next) => {
  try {
    const media = await GlobalMedia.find().sort({ created_at: -1 });
    res.json({ success: true, data: media });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
