const Cafe = require('../models/Cafe');
const Order = require('../models/Order');
const OrderRevenue = require('../models/OrderRevenue');
const Subscription = require('../models/Subscription');
const SubscriptionHistory = require('../models/SubscriptionHistory');
const WebhookLog = require('../models/WebhookLog');
const Settings = require('../models/Settings');
const MenuItem = require('../models/MenuItem');
const {
  getPlatformRazorpay,
  getCafeRazorpay,
  verifyWebhookSignature,
  verifyPaymentSignature,
  verifySubscriptionSignature,
} = require('../utils/razorpay');

// ============================================================
//  FLOW 1: SaaS SUBSCRIPTION BILLING (Café Owner → Platform)
// ============================================================

/**
 * @desc    Create a Razorpay subscription for a café owner
 * @route   POST /api/owner/razorpay/create-subscription
 * @access  Private (Owner)
 */
const createSubscription = async (req, res, next) => {
  try {
    const { plan_name, billing_cycle = 'monthly' } = req.body;
    const cafeId = req.user._id;

    if (!['starter', 'pro'].includes(plan_name)) {
      return res.status(400).json({ success: false, message: 'Invalid plan name. Choose starter or pro.' });
    }
    
    if (!['monthly', 'yearly'].includes(billing_cycle)) {
      return res.status(400).json({ success: false, message: 'Invalid billing cycle. Choose monthly or yearly.' });
    }

    const razorpay = getPlatformRazorpay();

    // Determine plan ID from env
    let planId;
    if (billing_cycle === 'yearly') {
      planId = plan_name === 'pro'
        ? process.env.RAZORPAY_PLAN_ID_PRO_YEARLY
        : process.env.RAZORPAY_PLAN_ID_STARTER_YEARLY;
    } else {
      planId = plan_name === 'pro'
        ? process.env.RAZORPAY_PLAN_ID_PRO_MONTHLY
        : process.env.RAZORPAY_PLAN_ID_STARTER_MONTHLY;
    }

    if (!planId) {
      return res.status(500).json({ success: false, message: `Razorpay plan ID for ${plan_name} (${billing_cycle}) is not configured.` });
    }

    const cafe = await Cafe.findById(cafeId);
    if (!cafe) {
      return res.status(404).json({ success: false, message: 'Café account not found' });
    }

    // Create or fetch Razorpay customer
    let customerId = cafe.razorpay_customer_id;
    if (!customerId) {
      try {
        const customer = await razorpay.customers.create({
          name: cafe.name,
          email: cafe.email,
          contact: cafe.phone || '',
          notes: { cafe_id: cafeId.toString() }
        });
        customerId = customer.id;
        cafe.razorpay_customer_id = customerId;
        await cafe.save({ validateBeforeSave: false });
      } catch (custErr) {
        console.error('Razorpay customer creation failed:', custErr);
        return res.status(500).json({ success: false, message: 'Failed to create Razorpay customer' });
      }
    }

    // Create Razorpay subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_id: customerId,
      total_count: billing_cycle === 'yearly' ? 10 : 120, // Max billing cycles (10 years)
      customer_notify: 1,
      notes: {
        cafe_id: cafeId.toString(),
        plan_name,
        billing_cycle,
        cafe_name: cafe.name
      }
    });

    // Store subscription ID on café
    cafe.razorpay_subscription_id = subscription.id;
    await cafe.save({ validateBeforeSave: false });

    res.status(201).json({
      success: true,
      data: {
        subscription_id: subscription.id,
        razorpay_key_id: process.env.RAZORPAY_KEY_ID,
        plan_name,
        status: subscription.status
      }
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    next(error);
  }
};

/**
 * @desc    Verify subscription payment after Razorpay Checkout success callback
 * @route   POST /api/owner/razorpay/verify-subscription
 * @access  Private (Owner)
 */
const verifySubscriptionPayment = async (req, res, next) => {
  try {
    const { razorpay_subscription_id, razorpay_payment_id, razorpay_signature } = req.body;
    const cafeId = req.user._id;

    if (!razorpay_subscription_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification parameters' });
    }

    // Verify signature
    const isValid = verifySubscriptionSignature(
      razorpay_subscription_id,
      razorpay_payment_id,
      razorpay_signature,
      process.env.RAZORPAY_KEY_SECRET
    );

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Payment signature verification failed' });
    }

    // Fetch subscription details from Razorpay
    const razorpay = getPlatformRazorpay();
    const rzpSub = await razorpay.subscriptions.fetch(razorpay_subscription_id);

    const cafe = await Cafe.findById(cafeId);
    if (!cafe) {
      return res.status(404).json({ success: false, message: 'Café not found' });
    }

    const planName = rzpSub.notes?.plan_name || 'pro';
    const billingCycle = rzpSub.notes?.billing_cycle || 'monthly';
    const settings = await Settings.getSettings();
    
    let price;
    if (billingCycle === 'yearly') {
      const monthlyPrice = planName === 'pro' ? (settings.pro_price || 499) : (planName === 'starter' ? (settings.starter_price || 299) : (settings.basic_price || 199));
      const discount = settings.yearly_discount_percentage || 20;
      price = Math.round(monthlyPrice * 12 * (1 - discount / 100));
    } else {
      price = planName === 'pro' ? (settings.pro_price || 499) : (planName === 'starter' ? (settings.starter_price || 299) : (settings.basic_price || 199));
    }

    // Calculate end date
    const now = new Date();
    const endDate = new Date();
    if (billingCycle === 'yearly') {
      endDate.setDate(endDate.getDate() + 365);
    } else {
      endDate.setDate(endDate.getDate() + 30);
    }

    // Activate café subscription
    cafe.subscription_status = 'active';
    cafe.is_active = true;
    cafe.subscription = {
      plan_name: planName,
      start_date: now,
      end_date: endDate,
      status: 'active'
    };
    cafe.razorpay_subscription_id = razorpay_subscription_id;
    cafe.upcoming_subscription = undefined;
    await cafe.save({ validateBeforeSave: false });

    // Upsert Subscription record
    await Subscription.findOneAndUpdate(
      { cafe_id: cafe._id },
      {
        plan_name: planName,
        price,
        start_date: now,
        end_date: endDate,
        status: 'active',
        razorpay_subscription_id,
        razorpay_payment_id,
        razorpay_plan_id: rzpSub.plan_id || '',
        billing_cycle: billingCycle,
        next_billing_date: endDate
      },
      { upsert: true, new: true }
    );

    // Record in permanent history
    await SubscriptionHistory.create({
      cafe_id: cafe._id,
      plan_name: planName,
      price,
      start_date: now,
      end_date: endDate,
      status: 'active',
      razorpay_payment_id,
      payment_method: 'razorpay'
    });

    // Real-time notifications
    const io = req.app.get('io');
    if (io) {
      io.to(`cafe-${cafe._id}`).emit('subscription-activated', {
        plan_name: planName,
        amount: price,
        payment_method: 'razorpay'
      });
      io.to('admin-room').emit('new-subscription-revenue', {
        cafe_name: cafe.name,
        plan_name: planName,
        amount: price,
        date: new Date(),
        payment_method: 'razorpay'
      });
    }

    res.json({
      success: true,
      message: 'Subscription activated successfully via Razorpay',
      data: { plan_name: planName, end_date: endDate }
    });
  } catch (error) {
    console.error('Verify subscription error:', error);
    next(error);
  }
};

/**
 * @desc    Cancel a Razorpay subscription (at end of current billing cycle)
 * @route   POST /api/owner/razorpay/cancel-subscription
 * @access  Private (Owner)
 */
const cancelSubscription = async (req, res, next) => {
  try {
    const cafe = await Cafe.findById(req.user._id);
    if (!cafe || !cafe.razorpay_subscription_id) {
      return res.status(400).json({ success: false, message: 'No active Razorpay subscription found' });
    }

    const razorpay = getPlatformRazorpay();
    await razorpay.subscriptions.cancel(cafe.razorpay_subscription_id, { cancel_at_cycle_end: 1 });

    res.json({
      success: true,
      message: 'Subscription will be cancelled at the end of the current billing cycle'
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    next(error);
  }
};

/**
 * @desc    Get subscription invoices from Razorpay
 * @route   GET /api/owner/razorpay/invoices
 * @access  Private (Owner)
 */
const getSubscriptionInvoices = async (req, res, next) => {
  try {
    const cafe = await Cafe.findById(req.user._id);
    if (!cafe || !cafe.razorpay_subscription_id) {
      return res.json({ success: true, data: [] });
    }

    const razorpay = getPlatformRazorpay();
    const invoices = await razorpay.invoices.all({
      subscription_id: cafe.razorpay_subscription_id,
      count: 12
    });

    res.json({
      success: true,
      data: (invoices.items || []).map(inv => ({
        id: inv.id,
        amount: (inv.amount || 0) / 100,
        status: inv.status,
        date: inv.date,
        paid_at: inv.paid_at,
        billing_start: inv.billing_start,
        billing_end: inv.billing_end
      }))
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    next(error);
  }
};

/**
 * @desc    Handle Razorpay subscription webhooks
 * @route   POST /api/webhooks/razorpay/subscription
 * @access  Public (Razorpay calls this)
 */
const handleSubscriptionWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody || JSON.stringify(req.body);

    // Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        await WebhookLog.create({
          event_type: 'signature_failed',
          payload: req.body,
          status: 'failed',
          error_message: 'Invalid webhook signature',
          source: 'subscription'
        });
        return res.status(400).json({ success: false, message: 'Invalid signature' });
      }
    }

    const event = req.body;
    const eventType = event.event;
    const eventId = event.account_id + '_' + (event.payload?.subscription?.entity?.id || '') + '_' + eventType;

    // Idempotency: check for duplicate event
    const existingLog = await WebhookLog.findOne({ razorpay_event_id: eventId, status: 'processed' });
    if (existingLog) {
      return res.status(200).json({ success: true, message: 'Duplicate event, already processed' });
    }

    const subscriptionEntity = event.payload?.subscription?.entity;
    const paymentEntity = event.payload?.payment?.entity;

    if (!subscriptionEntity) {
      await WebhookLog.create({
        event_type: eventType || 'unknown',
        razorpay_event_id: eventId,
        payload: event,
        status: 'skipped',
        error_message: 'No subscription entity in payload',
        source: 'subscription'
      });
      return res.status(200).json({ success: true, message: 'No subscription entity' });
    }

    const cafeId = subscriptionEntity.notes?.cafe_id;
    const planName = subscriptionEntity.notes?.plan_name || 'pro';
    const io = req.app?.get?.('io');

    switch (eventType) {
      case 'subscription.activated':
      case 'subscription.charged': {
        if (!cafeId) break;

        const cafe = await Cafe.findById(cafeId);
        if (!cafe) break;

        const settings = await Settings.getSettings();
        const price = planName === 'pro' ? (settings.pro_price || 499) : (planName === 'starter' ? (settings.starter_price || 299) : (settings.basic_price || 199));
        const now = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        cafe.subscription_status = 'active';
        cafe.is_active = true;
        cafe.subscription = {
          plan_name: planName,
          start_date: now,
          end_date: endDate,
          status: 'active'
        };
        cafe.upcoming_subscription = undefined;
        await cafe.save({ validateBeforeSave: false });

        await Subscription.findOneAndUpdate(
          { cafe_id: cafe._id },
          {
            plan_name: planName,
            price,
            start_date: now,
            end_date: endDate,
            status: 'active',
            razorpay_subscription_id: subscriptionEntity.id,
            razorpay_payment_id: paymentEntity?.id || '',
            razorpay_plan_id: subscriptionEntity.plan_id || '',
            billing_cycle: 'monthly',
            next_billing_date: endDate
          },
          { upsert: true, new: true }
        );

        await SubscriptionHistory.create({
          cafe_id: cafe._id,
          plan_name: planName,
          price,
          start_date: now,
          end_date: endDate,
          status: 'active',
          razorpay_payment_id: paymentEntity?.id || '',
          payment_method: 'razorpay'
        });

        if (io) {
          io.to(`cafe-${cafe._id}`).emit('subscription-activated', {
            plan_name: planName, amount: price, payment_method: 'razorpay'
          });
          io.to('admin-room').emit('new-subscription-revenue', {
            cafe_name: cafe.name, plan_name: planName, amount: price, date: now
          });
        }
        break;
      }

      case 'subscription.halted':
      case 'subscription.cancelled': {
        if (!cafeId) break;
        const cafe = await Cafe.findById(cafeId);
        if (!cafe) break;

        // Don't immediately deactivate on cancel (runs till cycle end)
        // But halted means payment failed repeatedly
        if (eventType === 'subscription.halted') {
          cafe.subscription_status = 'suspended';
          if (cafe.subscription) cafe.subscription.status = 'suspended';
          await cafe.save({ validateBeforeSave: false });

          await Subscription.findOneAndUpdate(
            { cafe_id: cafe._id },
            { status: 'suspended' }
          );
        }

        if (io) {
          io.to(`cafe-${cafe._id}`).emit('subscription-status-changed', {
            status: eventType === 'subscription.halted' ? 'suspended' : 'cancelled'
          });
        }
        break;
      }

      default:
        break;
    }

    // Log the webhook event
    await WebhookLog.create({
      event_type: eventType,
      razorpay_event_id: eventId,
      entity_id: subscriptionEntity.id,
      payload: event,
      status: 'processed',
      source: 'subscription'
    });

    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Subscription webhook error:', error);
    try {
      await WebhookLog.create({
        event_type: req.body?.event || 'error',
        payload: req.body,
        status: 'failed',
        error_message: error.message,
        source: 'subscription'
      });
    } catch (_) {}
    res.status(200).json({ success: true, message: 'Webhook received (with errors)' });
  }
};


// ============================================================
//  FLOW 2: CUSTOMER ORDER PAYMENT (Customer → Café Owner)
// ============================================================

/**
 * @desc    Create a Razorpay order using the café owner's Razorpay keys
 * @route   POST /api/orders/create-razorpay-order
 * @access  Public
 */
const createOrderPayment = async (req, res, next) => {
  try {
    const {
      cafe_id,
      customer_name,
      customer_phone,
      table_number,
      items,
      notes
    } = req.body;

    // Validate café
    const cafe = await Cafe.findById(cafe_id)
      .select('+razorpay_key_secret subscription_status razorpay_key_id name tax_percentage upi_id')
      .lean();

    if (!cafe || cafe.subscription_status !== 'active') {
      return res.status(400).json({ success: false, message: 'Cannot place order - café is unavailable' });
    }

    if (!cafe.razorpay_key_id || !cafe.razorpay_key_secret) {
      return res.status(400).json({
        success: false,
        message: 'Café has not configured Razorpay payment gateway. Please contact the café.'
      });
    }

    // Batch fetch and validate menu items
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
    const amountInPaise = Math.round(finalTotal * 100);

    // Create Razorpay order using café owner's keys
    const cafeRazorpay = getCafeRazorpay(cafe.razorpay_key_id, cafe.razorpay_key_secret);

    const rzpOrder = await cafeRazorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `ORD_${Date.now()}`,
      notes: {
        cafe_id: cafe_id,
        customer_name: customer_name || 'Guest',
        table_number: table_number || ''
      }
    });

    // Create pending order in DB
    const order = await Order.create({
      cafe_id,
      customer_name: customer_name || 'Guest',
      customer_phone: customer_phone || '',
      table_number: table_number || '',
      items: orderItems,
      total_amount: finalTotal,
      token_number: '',
      payment_method: 'razorpay',
      payment_status: 'pending',
      razorpay_order_id: rzpOrder.id,
      notes: notes || ''
    });

    res.status(201).json({
      success: true,
      data: {
        order_id: rzpOrder.id,
        order_number: order.order_number,
        razorpay_key_id: cafe.razorpay_key_id,
        amount: amountInPaise,
        currency: 'INR',
        cafe_name: cafe.name,
        total_amount: finalTotal
      }
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    next(error);
  }
};

/**
 * @desc    Verify Razorpay payment after checkout success callback
 * @route   POST /api/orders/verify-razorpay-payment
 * @access  Public
 */
const verifyOrderPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification parameters' });
    }

    // Find the order
    const order = await Order.findOne({ razorpay_order_id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Already processed?
    if (order.payment_status === 'received' || order.payment_status === 'completed') {
      return res.json({ success: true, message: 'Payment already verified', data: order });
    }

    // Fetch café's Razorpay secret for signature verification
    const cafe = await Cafe.findById(order.cafe_id).select('+razorpay_key_secret').lean();
    if (!cafe || !cafe.razorpay_key_secret) {
      return res.status(500).json({ success: false, message: 'Café payment configuration error' });
    }

    // Verify signature
    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      cafe.razorpay_key_secret
    );

    if (!isValid) {
      order.payment_status = 'failed';
      await order.save();
      return res.status(400).json({ success: false, message: 'Payment signature verification failed' });
    }

    // Generate token number
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todaysOrders = await Order.find({
      cafe_id: order.cafe_id,
      created_at: { $gte: startOfDay },
      token_number: { $ne: '' }
    }).select('token_number').lean();

    let maxToken = 0;
    todaysOrders.forEach(o => {
      if (o.token_number) {
        const num = parseInt(o.token_number.replace('#', ''), 10);
        if (!isNaN(num) && num > maxToken) maxToken = num;
      }
    });

    order.payment_status = 'received';
    order.order_status = 'new';
    order.razorpay_payment_id = razorpay_payment_id;
    order.razorpay_signature = razorpay_signature;
    order.token_number = `#${maxToken + 1}`;
    order.payment_transaction_id = razorpay_payment_id;
    await order.save();

    // Save to permanent revenue ledger
    try {
      await OrderRevenue.create({
        order_id: order._id,
        cafe_id: order.cafe_id,
        order_number: order.order_number,
        token_number: order.token_number,
        customer_name: order.customer_name,
        table_number: order.table_number,
        items: order.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
        total_amount: order.total_amount,
        payment_method: 'razorpay',
        payment_transaction_id: razorpay_payment_id,
        payment_status: 'received',
        order_created_at: order.created_at,
        payment_confirmed_at: new Date()
      });
    } catch (revErr) {
      console.warn('Revenue audit note:', revErr.message);
    }

    // Real-time notifications
    const io = req.app.get('io');
    if (io) {
      io.to(`cafe-${order.cafe_id}`).emit('new-order', {
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
        message: `⚡ Razorpay Paid: Token ${order.token_number} Received!`
      });
    }

    res.json({
      success: true,
      message: 'Payment verified and order confirmed',
      data: {
        order_number: order.order_number,
        token_number: order.token_number,
        payment_status: order.payment_status,
        total_amount: order.total_amount
      }
    });
  } catch (error) {
    console.error('Verify order payment error:', error);
    next(error);
  }
};

/**
 * @desc    Handle Razorpay order payment webhooks (backup confirmation path)
 * @route   POST /api/webhooks/razorpay/order
 * @access  Public (Razorpay calls this)
 */
const handleOrderWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody || JSON.stringify(req.body);

    const event = req.body;
    const eventType = event.event;
    const paymentEntity = event.payload?.payment?.entity;

    if (!paymentEntity) {
      return res.status(200).json({ success: true, message: 'No payment entity' });
    }

    const rzpOrderId = paymentEntity.order_id;
    const eventId = (paymentEntity.id || '') + '_' + eventType;

    // Idempotency check
    const existingLog = await WebhookLog.findOne({ razorpay_event_id: eventId, status: 'processed' });
    if (existingLog) {
      return res.status(200).json({ success: true, message: 'Duplicate event' });
    }

    // Try to find the order or cafe to get the cafe-specific webhook secret
    const order = await Order.findOne({ razorpay_order_id: rzpOrderId });
    let cafeWebhookSecret = null;
    let cafeId = order?.cafe_id;

    if (cafeId) {
      const cafe = await Cafe.findById(cafeId).select('+razorpay_webhook_secret');
      if (cafe && cafe.razorpay_webhook_secret) {
        cafeWebhookSecret = cafe.razorpay_webhook_secret;
      }
    }

    // Verify webhook signature
    // If the cafe has set their own webhook secret, we must use it to verify the signature.
    // Otherwise, we fallback to the global webhook secret for backward compatibility or platform-level webhooks.
    const secretToUse = cafeWebhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET;

    if (secretToUse && signature) {
      const isValid = verifyWebhookSignature(rawBody, signature, secretToUse);
      if (!isValid) {
        console.warn(`Order webhook signature mismatch for cafe ${cafeId || 'unknown'}`);
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }
    } else if (signature) {
      console.warn('Webhook received with signature but no webhook secret is configured for verification.');
    }

    if (eventType === 'payment.captured') {
      if (order && order.payment_status !== 'received' && order.payment_status !== 'completed') {
        // Generate token if missing
        if (!order.token_number) {
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          const todaysOrders = await Order.find({
            cafe_id: order.cafe_id,
            created_at: { $gte: startOfDay },
            token_number: { $ne: '' }
          }).select('token_number').lean();

          let maxToken = 0;
          todaysOrders.forEach(o => {
            if (o.token_number) {
              const num = parseInt(o.token_number.replace('#', ''), 10);
              if (!isNaN(num) && num > maxToken) maxToken = num;
            }
          });
          order.token_number = `#${maxToken + 1}`;
        }

        order.payment_status = 'received';
        order.order_status = 'new';
        order.razorpay_payment_id = paymentEntity.id;
        order.payment_transaction_id = paymentEntity.id;
        await order.save();

        // Revenue ledger
        try {
          await OrderRevenue.create({
            order_id: order._id,
            cafe_id: order.cafe_id,
            order_number: order.order_number,
            token_number: order.token_number,
            customer_name: order.customer_name,
            table_number: order.table_number,
            items: order.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
            total_amount: order.total_amount,
            payment_method: 'razorpay',
            payment_transaction_id: paymentEntity.id,
            payment_status: 'received',
            order_created_at: order.created_at,
            payment_confirmed_at: new Date()
          });
        } catch (revErr) {
          console.warn('Revenue audit (webhook):', revErr.message);
        }

        const io = req.app?.get?.('io');
        if (io) {
          io.to(`cafe-${order.cafe_id}`).emit('new-order', {
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
            message: `⚡ Razorpay Paid (Webhook): Token ${order.token_number}`
          });
        }
      }
    } else if (eventType === 'payment.failed') {
      if (order && order.payment_status === 'pending') {
        order.payment_status = 'failed';
        await order.save();
      }
    }

    await WebhookLog.create({
      event_type: eventType,
      razorpay_event_id: eventId,
      entity_id: paymentEntity.id,
      payload: event,
      status: 'processed',
      source: 'order'
    });

    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Order webhook error:', error);
    try {
      await WebhookLog.create({
        event_type: req.body?.event || 'error',
        payload: req.body,
        status: 'failed',
        error_message: error.message,
        source: 'order'
      });
    } catch (_) {}
    res.status(200).json({ success: true, message: 'Webhook received (with errors)' });
  }
};

/**
 * @desc    Initiate refund for a customer order via Razorpay
 * @route   POST /api/owner/razorpay/refund/:orderId
 * @access  Private (Owner)
 */
const initiateRefund = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ _id: orderId, cafe_id: req.user._id });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!order.razorpay_payment_id) {
      return res.status(400).json({ success: false, message: 'This order was not paid via Razorpay' });
    }

    const cafe = await Cafe.findById(req.user._id).select('+razorpay_key_secret');
    if (!cafe || !cafe.razorpay_key_id || !cafe.razorpay_key_secret) {
      return res.status(400).json({ success: false, message: 'Razorpay keys not configured' });
    }

    const cafeRazorpay = getCafeRazorpay(cafe.razorpay_key_id, cafe.razorpay_key_secret);

    const refund = await cafeRazorpay.payments.refund(order.razorpay_payment_id, {
      amount: Math.round(order.total_amount * 100), // Full refund in paise
      notes: {
        order_number: order.order_number,
        reason: req.body.reason || 'Refund initiated by café owner'
      }
    });

    order.payment_status = 'failed'; // Mark as refunded
    order.order_status = 'cancelled';
    await order.save();

    // Remove from revenue ledger
    try {
      await OrderRevenue.deleteOne({ order_number: order.order_number });
    } catch (_) {}

    res.json({
      success: true,
      message: 'Refund initiated successfully',
      data: { refund_id: refund.id, status: refund.status }
    });
  } catch (error) {
    console.error('Refund error:', error);
    next(error);
  }
};

module.exports = {
  createSubscription,
  verifySubscriptionPayment,
  cancelSubscription,
  getSubscriptionInvoices,
  handleSubscriptionWebhook,
  createOrderPayment,
  verifyOrderPayment,
  handleOrderWebhook,
  initiateRefund,
};
