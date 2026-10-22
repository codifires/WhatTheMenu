const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const Cafe = require('../models/Cafe');
const Order = require('../models/Order');
const OrderRevenue = require('../models/OrderRevenue');
const Feedback = require('../models/Feedback');
const DailyTokenCounter = require('../models/DailyTokenCounter');
const mongoose = require('mongoose');
const crypto = require('crypto');

// In-memory staff alert throttle store (orderNumber -> timestamp)
const staffAlertTimestamps = new Map();

const resolveCafeIdHelper = async (identifier) => {
  if (mongoose.isValidObjectId(identifier)) return identifier;
  const cafe = await Cafe.findOne({ slug: identifier }).select('_id').lean();
  return cafe ? cafe._id : null;
};

// @desc    Get café info and full menu (Optimized with parallel queries + lean)
// @route   GET /api/menu/:cafeId
const getCafeMenu = async (req, res, next) => {
  try {
    const identifier = req.params.cafeId;
    const query = mongoose.isValidObjectId(identifier) 
      ? { _id: identifier } 
      : { slug: identifier };
    const cafe = await Cafe.findOne(query)
      .select('name logo address phone tax_percentage subscription_status razorpay_key_id theme_settings upi_id')
      .lean();

    if (!cafe) {
      return res.status(404).json({ success: false, message: 'Café not found' });
    }

    if (cafe.subscription_status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'This café menu is currently unavailable'
      });
    }

    // Parallel fetch categories and menu items
    const [categories, menuItems] = await Promise.all([
      Category.find({ cafe_id: cafe._id, is_active: true })
        .sort({ sort_order: 1 })
        .select('name sort_order')
        .lean(),
      MenuItem.find({ cafe_id: cafe._id })
        .populate('category_id', 'name')
        .sort({ sort_order: 1 })
        .lean()
    ]);

    // Group items by category in memory
    const menuByCategory = categories.map(cat => ({
      _id: cat._id,
      name: cat.name,
      items: menuItems.filter(
        item => item.category_id && (item.category_id._id || item.category_id).toString() === cat._id.toString()
      )
    }));

    res.json({
      success: true,
      data: {
        cafe: {
          id: cafe._id,
          name: cafe.name,
          logo: cafe.logo,
          address: cafe.address,
          phone: cafe.phone,
          tax_percentage: cafe.tax_percentage || 0,
          upi_id: cafe.upi_id || '',
          razorpay_key_id: cafe.razorpay_key_id || '',
          theme_settings: cafe.theme_settings
        },
        categories: menuByCategory,
        allItems: menuItems
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search menu items (Optimized with lean)
// @route   GET /api/menu/:cafeId/search
const searchMenu = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.json({ success: true, data: [] });
    }

    const resolvedCafeId = await resolveCafeIdHelper(req.params.cafeId);
    if (!resolvedCafeId) {
      return res.status(404).json({ success: false, message: 'Cafe not found' });
    }

    const safeQ = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const items = await MenuItem.find({
      cafe_id: resolvedCafeId,
      $or: [{ name: { $regex: safeQ, $options: 'i' } }, { description: { $regex: safeQ, $options: 'i' } }]
    }).populate('category_id', 'name').lean();

    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

// @desc    Place a new order (Optimized batch item lookup + strict cross-tenant verification)
// @route   POST /api/orders
const placeOrder = async (req, res, next) => {
  try {
    const {
      cafe_id,
      customer_name,
      customer_phone,
      table_number,
      items,
      payment_method,
      payment_transaction_id,
      notes
    } = req.body;

    // Validate café existence, active status, and active subscription
    const cafe = await Cafe.findById(cafe_id).select('subscription_status is_active tax_percentage upi_id name').lean();
    if (!cafe || cafe.subscription_status !== 'active' || cafe.is_active === false) {
      return res.status(400).json({
        success: false,
        message: 'Cannot place order - café is unavailable'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one menu item is required to place an order'
      });
    }

    // Batch fetch menu items in 1 query
    const itemIds = items.map(i => i.menu_item_id);
    const dbMenuItems = await MenuItem.find({ _id: { $in: itemIds } }).lean();
    const itemMap = new Map(dbMenuItems.map(m => [m._id.toString(), m]));

    let total = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = itemMap.get(item.menu_item_id.toString());
      if (!menuItem || !menuItem.availability) {
        return res.status(400).json({
          success: false,
          message: `Item "${item.name || 'Unknown'}" is no longer available`
        });
      }

      // Security: Cross-tenant check — ensure item actually belongs to target cafe
      if (menuItem.cafe_id.toString() !== cafe._id.toString()) {
        return res.status(400).json({
          success: false,
          message: `Unauthorized item: dish does not belong to this café`
        });
      }

      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      total += menuItem.price * qty;
      orderItems.push({
        menu_item_id: menuItem._id,
        name: menuItem.name,
        quantity: qty,
        price: menuItem.price
      });
    }

    const taxAmount = total * ((cafe.tax_percentage || 0) / 100);
    const finalTotal = Math.round((total + taxAmount) * 100) / 100;

    // Generate atomic, concurrency-safe sequential token number
    const tokenNumber = await DailyTokenCounter.getNextToken(cafe._id);

    const cleanName = typeof customer_name === 'string' ? customer_name.trim().substring(0, 50) : 'Guest';
    const cleanPhone = typeof customer_phone === 'string' ? customer_phone.trim().substring(0, 15) : '';
    const cleanTable = typeof table_number === 'string' ? table_number.trim().substring(0, 20) : '';
    const cleanNotes = typeof notes === 'string' ? notes.trim().substring(0, 500) : '';

    const order = await Order.create({
      cafe_id,
      customer_name: cleanName || 'Guest',
      customer_phone: cleanPhone,
      table_number: cleanTable,
      items: orderItems,
      total_amount: finalTotal,
      token_number: tokenNumber,
      payment_provider: 'cash',
      payment_method: 'cash',
      payment_transaction_id: typeof payment_transaction_id === 'string' ? payment_transaction_id.trim() : '',
      payment_status: 'pending',
      notes: cleanNotes
    });

    // Emit real-time notification to café owner
    const io = req.app.get('io');
    if (io) {
      io.to(`cafe-${cafe_id}`).emit('new-order', {
        order: {
          _id: order._id,
          order_number: order.order_number,
          customer_name: order.customer_name,
          table_number: order.table_number,
          total_amount: order.total_amount,
          items: order.items,
          order_status: order.order_status,
          payment_status: order.payment_status,
          token_number: order.token_number,
          created_at: order.created_at
        },
        message: `New Order ${order.token_number || order.order_number}`
      });
    }

    res.status(201).json({
      success: true,
      data: order.toObject ? order.toObject() : order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Track order status (Optimized with lean)
// @route   GET /api/orders/:orderNumber/track
const trackOrder = async (req, res, next) => {
  try {
    const rawOrderNumber = typeof req.params?.orderNumber === 'string' ? req.params.orderNumber.trim() : '';
    const order = await Order.findOne({
      order_number: rawOrderNumber
    }).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: {
        order_number: order.order_number,
        token_number: order.token_number,
        items: order.items,
        total_amount: order.total_amount,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        order_status: order.order_status,
        created_at: order.created_at
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit feedback
// @route   POST /api/feedback
const submitFeedback = async (req, res, next) => {
  try {
    const { order_number, rating, review } = req.body;
    const cleanOrderNumber = typeof order_number === 'string' ? order_number.trim() : '';

    const order = await Order.findOne({ order_number: cleanOrderNumber }).lean();
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const existingFeedback = await Feedback.findOne({ order_id: order._id }).lean();
    if (existingFeedback) {
      return res.status(400).json({
        success: false,
        message: 'Feedback already submitted for this order'
      });
    }

    const feedback = await Feedback.create({
      order_id: order._id,
      cafe_id: order.cafe_id,
      rating: Math.min(5, Math.max(1, parseInt(rating, 10) || 5)),
      review: typeof review === 'string' ? review.trim().substring(0, 500) : '',
      customer_name: order.customer_name || 'Guest'
    });

    res.status(201).json({ success: true, data: feedback });
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger staff alert (Call Waiter / Bill Request with anti-spam throttling)
// @route   POST /api/orders/:orderNumber/alert
const triggerStaffAlert = async (req, res, next) => {
  try {
    const { orderNumber } = req.params;
    const { type } = req.body; // 'waiter' or 'bill'

    if (!type || !['waiter', 'bill'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid alert type. Allowed: waiter, bill' });
    }

    const cleanOrderNum = typeof orderNumber === 'string' ? orderNumber.trim() : '';
    const order = await Order.findOne({ order_number: cleanOrderNum }).lean();
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Rate-limit staff alerts: at most 1 alert every 30 seconds per order
    const now = Date.now();
    const lastAlertTime = staffAlertTimestamps.get(cleanOrderNum);
    if (lastAlertTime && (now - lastAlertTime) < 30 * 1000) {
      const waitSeconds = Math.ceil((30 * 1000 - (now - lastAlertTime)) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds}s before requesting staff assistance again.`,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterSeconds: waitSeconds,
        request_id: req.id
      });
    }
    staffAlertTimestamps.set(cleanOrderNum, now);

    // Housekeeping: clean map if too large
    if (staffAlertTimestamps.size > 2000) {
      const twoHoursAgo = now - 2 * 60 * 60 * 1000;
      for (const [key, timestamp] of staffAlertTimestamps.entries()) {
        if (timestamp < twoHoursAgo) staffAlertTimestamps.delete(key);
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`cafe-${order.cafe_id}`).emit('staff-alert', {
        type,
        order_number: order.order_number,
        table_number: order.table_number,
        customer_name: order.customer_name,
        timestamp: new Date()
      });
    }

    res.json({ success: true, message: `Staff alert sent successfully` });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCafeMenu,
  searchMenu,
  placeOrder,
  trackOrder,
  submitFeedback,
  triggerStaffAlert
};
