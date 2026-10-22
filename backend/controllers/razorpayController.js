const mongoose = require('mongoose');
const Cafe = require('../models/Cafe');
const Order = require('../models/Order');
const OrderRevenue = require('../models/OrderRevenue');
const Subscription = require('../models/Subscription');
const SubscriptionHistory = require('../models/SubscriptionHistory');
const WebhookLog = require('../models/WebhookLog');
const Settings = require('../models/Settings');
const MenuItem = require('../models/MenuItem');
const DailyTokenCounter = require('../models/DailyTokenCounter');
const razorpayUtils = require('../utils/razorpay');
const {
  getPlatformRazorpay,
  getCafeRazorpay,
  verifyWebhookSignature,
  verifyPaymentSignature,
  verifySubscriptionSignature,
} = razorpayUtils;
const logger = require('../utils/logger');

// Helper to resolve the appropriate Razorpay instance and secret for an order
const resolveOrderRazorpay = (cafe) => {
  if (cafe.razorpay_key_id && cafe.razorpay_key_secret) {
    return {
      instance: razorpayUtils.getCafeRazorpay(cafe.razorpay_key_id, cafe.razorpay_key_secret),
      keyId: cafe.razorpay_key_id,
      keySecret: cafe.razorpay_key_secret,
      isPlatform: false
    };
  }
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    return {
      instance: razorpayUtils.getPlatformRazorpay(),
      keyId: process.env.RAZORPAY_KEY_ID,
      keySecret: process.env.RAZORPAY_KEY_SECRET,
      isPlatform: true
    };
  }
  return null;
};

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

    if (!['pro', 'pro_plus'].includes(plan_name)) {
      return res.status(400).json({ success: false, message: 'Invalid plan name. Choose pro or pro_plus.' });
    }
    
    if (!['monthly', 'yearly'].includes(billing_cycle)) {
      return res.status(400).json({ success: false, message: 'Invalid billing cycle. Choose monthly or yearly.' });
    }

    const cafe = await Cafe.findById(cafeId);
    if (!cafe) {
      return res.status(404).json({ success: false, message: 'Café account not found' });
    }

    const razorpay = getPlatformRazorpay();

    // Determine plan ID from env
    let planId;
    if (billing_cycle === 'yearly') {
      planId = plan_name === 'pro_plus'
        ? process.env.RAZORPAY_PLAN_ID_PRO_YEARLY
        : process.env.RAZORPAY_PLAN_ID_STARTER_YEARLY;
    } else {
      planId = plan_name === 'pro_plus'
        ? process.env.RAZORPAY_PLAN_ID_PRO_MONTHLY
        : process.env.RAZORPAY_PLAN_ID_STARTER_MONTHLY;
    }

    if (!planId) {
      return res.status(500).json({
        success: false,
        message: `Razorpay plan ID for ${plan_name} (${billing_cycle}) is not configured on the server.`
      });
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
        console.error('Razorpay customer creation failed:', custErr.message);
        return res.status(500).json({ success: false, message: 'Failed to create Razorpay customer record' });
      }
    }

    // Create Razorpay subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_id: customerId,
      total_count: billing_cycle === 'yearly' ? 10 : 120, // Max cycles (10 years)
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

    // 1. Verify signature using Razorpay official procedure
    const isValid = verifySubscriptionSignature(
      razorpay_subscription_id,
      razorpay_payment_id,
      razorpay_signature,
      process.env.RAZORPAY_KEY_SECRET
    );

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Payment signature verification failed' });
    }

    // 2. Fetch subscription and payment details from Razorpay to verify state
    const razorpay = getPlatformRazorpay();
    let rzpSub;
    try {
      rzpSub = await razorpay.subscriptions.fetch(razorpay_subscription_id);
    } catch (subErr) {
      return res.status(400).json({ success: false, message: 'Could not fetch subscription details from Razorpay' });
    }

    // Validate that subscription belongs to the authenticated café
    if (rzpSub.notes?.cafe_id && rzpSub.notes.cafe_id !== cafeId.toString()) {
      return res.status(403).json({ success: false, message: 'Subscription does not belong to this café' });
    }

    // Verify payment from Razorpay API
    let verifiedPaymentMethod = 'razorpay';
    try {
      const rzpPayment = await razorpay.payments.fetch(razorpay_payment_id);
      if (rzpPayment) {
        if (rzpPayment.status !== 'captured' && rzpPayment.status !== 'authorized') {
          return res.status(400).json({
            success: false,
            message: `Payment is not confirmed (status: ${rzpPayment.status})`
          });
        }
        if (rzpPayment.currency !== 'INR') {
          return res.status(400).json({ success: false, message: 'Invalid payment currency' });
        }
        verifiedPaymentMethod = rzpPayment.method || 'razorpay';
      }
    } catch (pmtErr) {
      console.warn('Could not fetch payment record from Razorpay:', pmtErr.message);
    }

    const cafe = await Cafe.findById(cafeId);
    if (!cafe) {
      return res.status(404).json({ success: false, message: 'Café not found' });
    }

    const planName = rzpSub.notes?.plan_name || 'pro_plus';
    const billingCycle = rzpSub.notes?.billing_cycle || 'monthly';
    const settings = await Settings.getSettings();
    
    let price;
    if (billingCycle === 'yearly') {
      const monthlyPrice = planName === 'pro_plus' ? (settings.pro_price || 499) : (planName === 'pro' ? (settings.starter_price || 299) : (settings.basic_price || 199));
      const discount = settings.yearly_discount_percentage || 20;
      price = Math.round(monthlyPrice * 12 * (1 - discount / 100));
    } else {
      price = planName === 'pro_plus' ? (settings.pro_price || 499) : (planName === 'pro' ? (settings.starter_price || 299) : (settings.basic_price || 199));
    }

    // Calculate end date with fair rollover for early renewals
    const now = new Date();
    const currentEnd = cafe.subscription?.end_date ? new Date(cafe.subscription.end_date) : null;
    const baseDate = (currentEnd && currentEnd > now && cafe.subscription?.plan_name === planName)
      ? new Date(currentEnd)
      : new Date(now);
    const daysToAdd = billingCycle === 'yearly' ? 365 : 30;
    baseDate.setDate(baseDate.getDate() + daysToAdd);
    const endDate = baseDate;

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

    // Record in permanent history idempotently
    await SubscriptionHistory.findOneAndUpdate(
      { razorpay_payment_id },
      {
        $setOnInsert: {
          cafe_id: cafe._id,
          plan_name: planName,
          price,
          start_date: now,
          end_date: endDate,
          status: 'active',
          razorpay_payment_id,
          payment_provider: 'razorpay',
          payment_method: verifiedPaymentMethod
        }
      },
      { upsert: true, new: true }
    );

    // Real-time notifications
    const io = req.app.get('io');
    if (io) {
      io.to(`cafe-${cafe._id}`).emit('subscription-activated', {
        plan_name: planName,
        amount: price,
        payment_method: verifiedPaymentMethod
      });
      io.to('admin-room').emit('new-subscription-revenue', {
        cafe_name: cafe.name,
        plan_name: planName,
        amount: price,
        date: new Date(),
        payment_method: verifiedPaymentMethod
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

    await Subscription.findOneAndUpdate(
      { cafe_id: cafe._id },
      { status: 'cancelled' }
    );

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
const handleSubscriptionWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody || JSON.stringify(req.body);

    if (!signature) {
      return res.status(400).json({ success: false, message: 'Missing webhook signature' });
    }

    // Verify webhook signature against platform secret
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET is not configured on server');
      return res.status(500).json({ success: false, message: 'Webhook secret is not configured' });
    }

    const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      logger.security('SECURITY_WEBHOOK_VERIFICATION_FAILED', { source: 'subscription', ip: req.ip, request_id: req.id });
      await WebhookLog.create({
        event_type: 'signature_failed',
        payload: { error: 'Invalid signature' },
        status: 'failed',
        error_message: 'Invalid webhook signature',
        source: 'subscription'
      });
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = req.body;
    const eventType = event.event;
    const eventId = req.headers['x-razorpay-event-id'] || event.id || (
      (event.account_id || '') + '_' + (event.payload?.subscription?.entity?.id || '') + '_' + eventType + '_' + (event.created_at || '')
    );

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
        payload: { eventType },
        status: 'skipped',
        error_message: 'No subscription entity in payload',
        source: 'subscription'
      });
      return res.status(200).json({ success: true, message: 'No subscription entity' });
    }

    const cafeId = subscriptionEntity.notes?.cafe_id;
    const planName = subscriptionEntity.notes?.plan_name || 'pro_plus';
    const io = req.app?.get?.('io');

    switch (eventType) {
      case 'subscription.activated':
      case 'subscription.charged': {
        if (!cafeId) break;

        const cafe = await Cafe.findById(cafeId);
        if (!cafe) break;

        const settings = await Settings.getSettings();
        const billingCycle = subscriptionEntity.notes?.billing_cycle || 'monthly';
        let price;
        if (billingCycle === 'yearly') {
          const monthlyPrice = planName === 'pro_plus' ? (settings.pro_price || 499) : (planName === 'pro' ? (settings.starter_price || 299) : (settings.basic_price || 199));
          const discount = settings.yearly_discount_percentage || 20;
          price = Math.round(monthlyPrice * 12 * (1 - discount / 100));
        } else {
          price = planName === 'pro_plus' ? (settings.pro_price || 499) : (planName === 'pro' ? (settings.starter_price || 299) : (settings.basic_price || 199));
        }

        const now = new Date();
        const currentEnd = cafe.subscription?.end_date ? new Date(cafe.subscription.end_date) : null;
        const baseDate = (currentEnd && currentEnd > now && cafe.subscription?.plan_name === planName)
          ? new Date(currentEnd)
          : new Date(now);
        const daysToAdd = billingCycle === 'yearly' ? 365 : 30;
        baseDate.setDate(baseDate.getDate() + daysToAdd);
        const endDate = baseDate;

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
            billing_cycle: billingCycle,
            next_billing_date: endDate
          },
          { upsert: true, new: true }
        );

        const verifiedMethod = paymentEntity?.method || 'razorpay';
        if (paymentEntity?.id) {
          await SubscriptionHistory.findOneAndUpdate(
            { razorpay_payment_id: paymentEntity.id },
            {
              $setOnInsert: {
                cafe_id: cafe._id,
                plan_name: planName,
                price,
                start_date: now,
                end_date: endDate,
                status: 'active',
                razorpay_payment_id: paymentEntity.id,
                payment_provider: 'razorpay',
                payment_method: verifiedMethod
              }
            },
            { upsert: true, new: true }
          );
        }

        if (io) {
          io.to(`cafe-${cafe._id}`).emit('subscription-activated', {
            plan_name: planName, amount: price, payment_method: verifiedMethod
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

    // Persist verified webhook event log
    await WebhookLog.findOneAndUpdate(
      { razorpay_event_id: eventId },
      {
        $setOnInsert: {
          event_type: eventType,
          razorpay_event_id: eventId,
          entity_id: subscriptionEntity.id,
          status: 'processed',
          source: 'subscription'
        }
      },
      { upsert: true }
    );

    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Subscription webhook error:', error.message);
    res.status(200).json({ success: true, message: 'Webhook received' });
  }
};


// ============================================================
//  FLOW 2: CUSTOMER ORDER PAYMENT (Customer → Café Owner)
// ============================================================

/**
 * @desc    Create a Razorpay order for customer checkout
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

    // Validate café existence, active status, and active subscription
    const query = mongoose.Types.ObjectId.isValid(cafe_id) ? { _id: cafe_id } : { slug: cafe_id };
    const cafe = await Cafe.findOne(query)
      .select('+razorpay_key_secret subscription_status is_active razorpay_key_id name tax_percentage')
      .lean();

    if (!cafe) {
      return res.status(404).json({ success: false, message: 'Café not found' });
    }
    
    if (cafe.subscription_status !== 'active' || cafe.is_active === false) {
      return res.status(403).json({ 
        success: false, 
        message: 'Café subscription has expired or account is deactivated. Online ordering is unavailable.' 
      });
    }

    // Resolve Razorpay gateway (café custom credentials or platform default)
    const gateway = resolveOrderRazorpay(cafe);
    if (!gateway) {
      return res.status(400).json({
        success: false,
        message: 'Café has not configured Razorpay payment gateway. Please choose Pay at Counter.'
      });
    }

    // Batch fetch and strictly validate menu items against target café
    const itemIds = items.map(i => i.menu_item_id);
    const dbMenuItems = await MenuItem.find({ _id: { $in: itemIds } }).lean();
    const itemMap = new Map(dbMenuItems.map(m => [m._id.toString(), m]));

    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = itemMap.get(item.menu_item_id.toString());
      if (!menuItem || !menuItem.availability) {
        return res.status(400).json({
          success: false,
          message: `Item "${item.name || 'Selected item'}" is currently unavailable`
        });
      }
      if (menuItem.cafe_id.toString() !== cafe._id.toString()) {
        logger.security('SECURITY_TENANT_ACCESS_DENIED', {
          reason: 'Cross-tenant item checkout violation',
          target_cafe_id: cafe._id,
          item_cafe_id: menuItem.cafe_id,
          item_id: menuItem._id,
          ip: req.ip,
          request_id: req.id
        });
        return res.status(400).json({
          success: false,
          message: 'Cross-tenant violation: item does not belong to this café'
        });
      }
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      subtotal += menuItem.price * qty;
      orderItems.push({
        menu_item_id: menuItem._id,
        name: menuItem.name,
        quantity: qty,
        price: menuItem.price
      });
    }

    // Calculate taxes and totals strictly on backend (ignore any client prices)
    const taxAmount = subtotal * ((cafe.tax_percentage || 0) / 100);
    const finalTotal = Math.round((subtotal + taxAmount) * 100) / 100;
    const amountInPaise = Math.round(finalTotal * 100);

    if (amountInPaise <= 0) {
      return res.status(400).json({ success: false, message: 'Order total must be greater than zero' });
    }

    // Create Razorpay order
    const rzpOrder = await gateway.instance.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `ORD_${Date.now()}`,
      notes: {
        cafe_id: cafe._id.toString(),
        customer_name: customer_name || 'Guest',
        table_number: table_number || ''
      }
    });

    // Create pending internal order
    const order = await Order.create({
      cafe_id: cafe._id,
      customer_name: (customer_name || 'Guest').trim().substring(0, 50),
      customer_phone: (customer_phone || '').trim().substring(0, 15),
      table_number: (table_number || '').trim().substring(0, 20),
      items: orderItems,
      total_amount: finalTotal,
      token_number: '', // Assigned upon payment verification
      payment_provider: 'razorpay',
      payment_method: 'razorpay',
      payment_status: 'pending',
      order_status: 'new',
      razorpay_order_id: rzpOrder.id,
      notes: (notes || '').trim().substring(0, 500)
    });

    res.status(201).json({
      success: true,
      data: {
        order_id: rzpOrder.id,
        order_number: order.order_number,
        razorpay_key_id: gateway.keyId,
        amount: amountInPaise,
        currency: 'INR',
        cafe_name: cafe.name,
        total_amount: finalTotal
      }
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    if (error.statusCode === 401 || error.error?.code === 'BAD_REQUEST_ERROR') {
      return res.status(400).json({
        success: false,
        message: 'Payment gateway configuration error. Please contact restaurant staff.'
      });
    }
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

    // 1. Find internal order
    const order = await Order.findOne({ razorpay_order_id });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // 2. Idempotency: If already verified, return confirmed order immediately
    if (order.payment_status === 'received' || order.payment_status === 'completed') {
      return res.json({
        success: true,
        message: 'Payment already verified',
        data: {
          order_number: order.order_number,
          token_number: order.token_number,
          payment_status: order.payment_status,
          total_amount: order.total_amount
        }
      });
    }

    // 2.1 State Machine Check: Cannot verify payment for a cancelled order
    if (order.order_status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot verify payment for a cancelled order'
      });
    }

    // 3. Resolve gateway credentials
    const cafe = await Cafe.findById(order.cafe_id).select('+razorpay_key_secret razorpay_key_id').lean();
    if (!cafe) {
      return res.status(404).json({ success: false, message: 'Café account not found' });
    }

    const gateway = resolveOrderRazorpay(cafe);
    if (!gateway) {
      return res.status(500).json({ success: false, message: 'Café payment credentials are not configured' });
    }

    // 4. Verify HMAC SHA-256 signature
    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      gateway.keySecret
    );

    if (!isValid) {
      logger.security('SECURITY_SIGNATURE_FORGERY_DETECTED', {
        order_id: order._id,
        razorpay_order_id,
        razorpay_payment_id,
        ip: req.ip,
        request_id: req.id
      });
      order.payment_status = 'failed';
      await order.save();
      return res.status(400).json({ success: false, message: 'Payment signature verification failed' });
    }

    // 5. Verify payment status from trusted Razorpay data
    let verifiedPaymentMethod = 'online';
    try {
      const payment = await gateway.instance.payments.fetch(razorpay_payment_id);
      if (payment) {
        // Amount and currency check
        const expectedPaise = Math.round(order.total_amount * 100);
        if (payment.amount !== expectedPaise) {
          order.payment_status = 'failed';
          await order.save();
          return res.status(400).json({ success: false, message: 'Payment amount mismatch' });
        }
        if (payment.currency !== 'INR') {
          order.payment_status = 'failed';
          await order.save();
          return res.status(400).json({ success: false, message: 'Invalid payment currency' });
        }
        if (payment.order_id !== razorpay_order_id) {
          order.payment_status = 'failed';
          await order.save();
          return res.status(400).json({ success: false, message: 'Payment is not associated with this order' });
        }
        if (payment.status !== 'captured' && payment.status !== 'authorized') {
          order.payment_status = 'failed';
          await order.save();
          return res.status(400).json({
            success: false,
            message: `Payment was not captured (status: ${payment.status})`
          });
        }
        verifiedPaymentMethod = payment.method || 'online';
      }
    } catch (fetchErr) {
      console.warn('Could not fetch payment from Razorpay API:', fetchErr.message);
    }

    // 6. Generate atomic, concurrency-safe token number
    let tokenNumber = order.token_number;
    if (!tokenNumber) {
      tokenNumber = await DailyTokenCounter.getNextToken(order.cafe_id);
    }

    // 7. Update internal order state
    order.payment_status = 'received';
    order.order_status = 'new';
    order.payment_provider = 'razorpay';
    order.payment_method = verifiedPaymentMethod;
    order.razorpay_payment_id = razorpay_payment_id;
    order.razorpay_signature = razorpay_signature;
    order.token_number = tokenNumber;
    order.payment_transaction_id = razorpay_payment_id;
    await order.save();

    // 8. Save to permanent revenue ledger idempotently
    try {
      await OrderRevenue.findOneAndUpdate(
        { order_number: order.order_number },
        {
          $setOnInsert: {
            cafe_id: order.cafe_id,
            order_number: order.order_number,
            token_number: order.token_number,
            customer_name: order.customer_name,
            table_number: order.table_number,
            items: order.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
            items_count: order.items.length,
            total_amount: order.total_amount,
            payment_provider: 'razorpay',
            payment_method: verifiedPaymentMethod,
            payment_method_details: razorpay_payment_id,
            payment_status: 'received',
            order_created_at: order.created_at,
            payment_date: new Date()
          }
        },
        { upsert: true, new: true }
      );
    } catch (revErr) {
      console.warn('Revenue audit note:', revErr.message);
    }

    // 9. Real-time notifications
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

      io.to(`order-${order.order_number}`).emit('order-updated', {
        order_number: order.order_number,
        order_status: order.order_status,
        payment_status: order.payment_status,
        token_number: order.token_number
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
 * @desc    Handle Razorpay order payment webhooks
 * @route   POST /api/webhooks/razorpay/order
 * @access  Public (Razorpay calls this)
 */
const handleOrderWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody || JSON.stringify(req.body);

    if (!signature) {
      return res.status(400).json({ success: false, message: 'Missing webhook signature' });
    }

    const event = req.body;
    const eventType = event.event;
    const paymentEntity = event.payload?.payment?.entity;
    const refundEntity = event.payload?.refund?.entity;
    const rzpOrderId = paymentEntity?.order_id || refundEntity?.order_id;

    // Resolve café webhook secret if order is known
    let cafeWebhookSecret = null;
    if (rzpOrderId) {
      const order = await Order.findOne({ razorpay_order_id: rzpOrderId });
      if (order?.cafe_id) {
        const cafe = await Cafe.findById(order.cafe_id).select('+razorpay_webhook_secret');
        if (cafe?.razorpay_webhook_secret) {
          cafeWebhookSecret = cafe.razorpay_webhook_secret;
        }
      }
    }

    // Verify webhook signature (café secret first, platform secret fallback)
    let isSignatureValid = false;
    if (cafeWebhookSecret) {
      isSignatureValid = verifyWebhookSignature(rawBody, signature, cafeWebhookSecret);
    }
    if (!isSignatureValid && process.env.RAZORPAY_WEBHOOK_SECRET) {
      isSignatureValid = verifyWebhookSignature(rawBody, signature, process.env.RAZORPAY_WEBHOOK_SECRET);
    }

    if (!isSignatureValid) {
      logger.security('SECURITY_WEBHOOK_VERIFICATION_FAILED', { source: 'order', ip: req.ip, request_id: req.id });
      await WebhookLog.create({
        event_type: 'signature_failed',
        payload: { error: 'Invalid webhook signature' },
        status: 'failed',
        error_message: 'Invalid webhook signature',
        source: 'order'
      });
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    if (!paymentEntity && !refundEntity) {
      return res.status(200).json({ success: true, message: 'No payment or refund entity in payload' });
    }

    const eventId = req.headers['x-razorpay-event-id'] || event.id || (
      (paymentEntity?.id || refundEntity?.id || '') + '_' + eventType + '_' + (event.created_at || '')
    );

    // Idempotency check
    const existingLog = await WebhookLog.findOne({ razorpay_event_id: eventId, status: 'processed' });
    if (existingLog) {
      return res.status(200).json({ success: true, message: 'Duplicate event' });
    }

    const order = rzpOrderId ? await Order.findOne({ razorpay_order_id: rzpOrderId }) : null;

    // Supported event types: payment.captured, order.paid, payment.failed, refund.processed
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      if (order && order.payment_status !== 'received' && order.payment_status !== 'completed') {
        // State Machine Check: Cancelled orders cannot be revived or marked as paid
        if (order.order_status === 'cancelled') {
          console.warn(`[WEBHOOK] Ignored payment event for cancelled order ${order.order_number}`);
          await WebhookLog.create({
            razorpay_event_id: eventId,
            event_type: eventType,
            status: 'processed',
            raw_payload: event
          });
          return res.status(200).json({ success: true, message: 'Order is cancelled; acknowledged without state transition' });
        }

        // Concurrency-safe atomic token assignment
        if (!order.token_number) {
          order.token_number = await DailyTokenCounter.getNextToken(order.cafe_id);
        }

        const verifiedMethod = paymentEntity?.method || 'online';
        order.payment_status = 'received';
        order.order_status = 'new';
        order.payment_provider = 'razorpay';
        order.payment_method = verifiedMethod;
        order.razorpay_payment_id = paymentEntity?.id || order.razorpay_payment_id;
        order.payment_transaction_id = paymentEntity?.id || order.razorpay_payment_id;
        await order.save();

        // Revenue ledger idempotency
        try {
          await OrderRevenue.findOneAndUpdate(
            { order_number: order.order_number },
            {
              $setOnInsert: {
                cafe_id: order.cafe_id,
                order_number: order.order_number,
                token_number: order.token_number,
                customer_name: order.customer_name,
                table_number: order.table_number,
                items: order.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
                items_count: order.items.length,
                total_amount: order.total_amount,
                payment_provider: 'razorpay',
                payment_method: verifiedMethod,
                payment_method_details: paymentEntity?.id || order.razorpay_payment_id,
                payment_status: 'received',
                order_created_at: order.created_at,
                payment_date: new Date()
              }
            },
            { upsert: true, new: true }
          );
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

          io.to(`order-${order.order_number}`).emit('order-updated', {
            order_number: order.order_number,
            order_status: order.order_status,
            payment_status: order.payment_status,
            token_number: order.token_number
          });
        }
      }
    } else if (eventType === 'payment.failed') {
      if (order && order.payment_status === 'pending') {
        order.payment_status = 'failed';
        await order.save();
      }
    } else if (eventType === 'refund.processed') {
      if (order) {
        order.payment_status = 'failed';
        order.order_status = 'cancelled';
        order.payment_method_details = `Refunded: ${refundEntity?.id || 'Razorpay'}`;
        await order.save();

        try {
          await OrderRevenue.deleteOne({ order_number: order.order_number });
        } catch (_) {}
      }
    }

    // Persist verified event log
    await WebhookLog.findOneAndUpdate(
      { razorpay_event_id: eventId },
      {
        $setOnInsert: {
          event_type: eventType,
          razorpay_event_id: eventId,
          entity_id: paymentEntity?.id || refundEntity?.id || '',
          status: 'processed',
          source: 'order'
        }
      },
      { upsert: true }
    );

    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Order webhook error:', error.message);
    res.status(200).json({ success: true, message: 'Webhook received' });
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

    if (order.order_status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'This order has already been cancelled / refunded' });
    }

    const cafe = await Cafe.findById(req.user._id).select('+razorpay_key_secret razorpay_key_id');
    const gateway = resolveOrderRazorpay(cafe);

    if (!gateway) {
      return res.status(400).json({ success: false, message: 'Razorpay payment gateway keys are not configured' });
    }

    const refund = await gateway.instance.payments.refund(order.razorpay_payment_id, {
      amount: Math.round(order.total_amount * 100), // Full refund in paise
      notes: {
        order_number: order.order_number,
        reason: req.body.reason || 'Refund initiated by café owner'
      }
    });

    order.payment_status = 'failed';
    order.order_status = 'cancelled';
    order.payment_method_details = `Refunded: ${refund.id || 'Processed'}`;
    await order.save();

    // Remove from permanent revenue ledger
    try {
      await OrderRevenue.deleteOne({ order_number: order.order_number });
    } catch (_) {}

    const io = req.app.get('io');
    if (io) {
      io.to(`cafe-${req.user._id}`).emit('order-updated', {
        order_number: order.order_number,
        order_status: 'cancelled',
        payment_status: 'failed'
      });
      io.to(`order-${order.order_number}`).emit('order-updated', {
        order_number: order.order_number,
        order_status: 'cancelled',
        payment_status: 'failed'
      });
    }

    res.json({
      success: true,
      message: 'Refund initiated successfully via Razorpay',
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
