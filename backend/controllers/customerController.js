const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const Cafe = require('../models/Cafe');
const Order = require('../models/Order');
const OrderRevenue = require('../models/OrderRevenue');
const Feedback = require('../models/Feedback');

// @desc    Get café info and full menu (Optimized with parallel queries + lean)
// @route   GET /api/menu/:cafeId
const getCafeMenu = async (req, res, next) => {
  try {
    const cafe = await Cafe.findById(req.params.cafeId)
      .select('name logo address phone tax_percentage subscription_status razorpay_key_id')
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
          razorpay_key_id: cafe.razorpay_key_id || ''
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
    if (!q) {
      return res.json({ success: true, data: [] });
    }

    const items = await MenuItem.find({
      cafe_id: req.params.cafeId,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ]
    }).populate('category_id', 'name').lean();

    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

// @desc    Place a new order (Optimized batch item lookup)
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

    // Validate café
    const cafe = await Cafe.findById(cafe_id).select('subscription_status tax_percentage upi_id name').lean();
    if (!cafe || cafe.subscription_status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot place order - café is unavailable'
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
      total += menuItem.price * item.quantity;
      orderItems.push({
        menu_item_id: menuItem._id,
        name: menuItem.name,
        quantity: item.quantity,
        price: menuItem.price
      });
    }

    const taxAmount = total * ((cafe.tax_percentage || 0) / 100);
    const finalTotal = Math.round((total + taxAmount) * 100) / 100;

    // Generate sequential token number
    let tokenNumber = '';
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todaysOrders = await Order.find({ 
      cafe_id, 
      created_at: { $gte: startOfDay },
      token_number: { $ne: '' } 
    }).select('token_number').lean();

    let maxToken = 0;
    todaysOrders.forEach(o => {
      if (o.token_number) {
        const num = parseInt(o.token_number.replace('#', ''), 10);
        if (!isNaN(num) && num > maxToken) {
          maxToken = num;
        }
      }
    });
    tokenNumber = `#${maxToken + 1}`;

    const order = await Order.create({
      cafe_id,
      customer_name: customer_name || 'Guest',
      customer_phone: customer_phone || '',
      table_number: table_number || '',
      items: orderItems,
      total_amount: finalTotal,
      token_number: tokenNumber,
      payment_method: 'upi',
      payment_transaction_id: payment_transaction_id || '',
      payment_status: 'pending',
      notes: notes || ''
    });

    // Build standard NPCI Direct UPI Deep-Link
    let upiString = '';
    if (cafe.upi_id) {
      const cleanCafeName = (cafe.name || 'Cafe').replace(/&/g, 'and').replace(/[^a-zA-Z0-9\s-]/g, '').trim().substring(0, 25);
      const cleanNote = `Order ${tokenNumber} ${cleanCafeName}`.trim().substring(0, 30);
      upiString = `upi://pay?pa=${encodeURIComponent(cafe.upi_id.trim())}&pn=${encodeURIComponent(cleanCafeName)}&am=${finalTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent(cleanNote)}&tr=ORD_${order.order_number}`;
    }

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
      data: {
        ...order.toObject(),
        upi_string: upiString,
        cafe_upi_id: cafe.upi_id || ''
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Track order status (Optimized with lean)
// @route   GET /api/orders/:orderNumber/track
const trackOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({
      order_number: req.params.orderNumber
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

    const order = await Order.findOne({ order_number }).lean();
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
      rating,
      review: review || '',
      customer_name: order.customer_name || 'Guest'
    });

    res.status(201).json({ success: true, data: feedback });
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger staff alert (Call Waiter / Bill Request)
// @route   POST /api/orders/:orderNumber/alert
const triggerStaffAlert = async (req, res, next) => {
  try {
    const { orderNumber } = req.params;
    const { type } = req.body; // 'waiter' or 'bill'

    const order = await Order.findOne({ order_number: orderNumber }).lean();
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
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

    res.json({ success: true, message: `Alert sent successfully` });
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
