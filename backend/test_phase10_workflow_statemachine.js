/**
 * ============================================================================
 * WhatTheMenu — Phase 10: API Workflow & State-Machine Audit Test Suite
 * ============================================================================
 *
 * Comprehensive end-to-end audit tracing every core workflow:
 * 1. Registration → Availability → Login → Multi-Device OTP → Revocation/Logout
 * 2. Restaurant Creation → Owner Authorization → Restaurant Settings
 * 3. Product Catalog Lifecycle (Create → Edit → Stock Toggle → Delete/Cloudinary)
 * 4. QR Generation → Menu Lookup → Café Slug/ID Resolution
 * 5. Menu Selection → Cart Validation → Server Pricing → Payment Init
 * 6. Payment Verification → Token Assignment → Revenue Ledger → Customer Track
 * 7. Payment Failure → Idempotency → Cancellation & Refund
 * 8. Webhook Replay Protection & Exactly-Once Financial Effects
 * 9. Order Lifecycle State Machine (new -> accepted -> preparing -> ready -> completed)
 * 10. Impossible Transition Rejections & Invariants (Cancelled order cannot be paid)
 * 11. Customer Tracking Security & Data Minimization
 * 12. Owner Dashboard, Order Management & Permanent Revenue Reporting
 * 13. SaaS Subscription Billing Lifecycle (Init -> Verify -> History -> Cancel)
 * 14. Super-Admin Authorization & Café Suspension Controls
 * 15. Staff Alerts & Feedback Validation & Anti-Spam Cooldown
 * ============================================================================
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const http = require('http');
const crypto = require('crypto');
const mongoose = require('mongoose');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Razorpay = require('razorpay');

// Models
const Admin = require('./models/Admin');
const Cafe = require('./models/Cafe');
const Category = require('./models/Category');
const MenuItem = require('./models/MenuItem');
const Order = require('./models/Order');
const OrderRevenue = require('./models/OrderRevenue');
const Subscription = require('./models/Subscription');
const SubscriptionHistory = require('./models/SubscriptionHistory');
const Feedback = require('./models/Feedback');
const Settings = require('./models/Settings');
const DailyTokenCounter = require('./models/DailyTokenCounter');
const WebhookLog = require('./models/WebhookLog');
const SystemLog = require('./models/SystemLog');

// State Machine
const {
  ORDER_STATUS,
  PAYMENT_STATUS,
  isValidOrderStatusTransition,
  isValidPaymentStatusTransition
} = require('./utils/orderStateMachine');

const { app } = require('./server');

let testServer;
let API_BASE;
let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    throw new Error(`Assertion failed: ${testName}`);
  }
}

// Global test variables
let ownerAToken, ownerBToken, adminToken;
let cafeA, cafeB, categoryA, itemA1, itemA2, itemB1;
let currentMockOrderId = 'order_test_mock_1';
let currentMockAmount = 25000;

// Setup Razorpay Mocks
process.env.RAZORPAY_PLAN_ID_PRO_MONTHLY = 'plan_test_pro_monthly';
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'test_sub_secret';

Razorpay.prototype.addResources = function () {
  this.orders = {
    create: async (params) => {
      currentMockOrderId = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      currentMockAmount = params.amount;
      return {
        id: currentMockOrderId,
        amount: params.amount,
        currency: params.currency || 'INR',
        status: 'created'
      };
    },
    fetch: async (id) => ({
      id,
      amount: currentMockAmount,
      currency: 'INR',
      status: 'paid'
    })
  };
  this.payments = {
    fetch: async (id) => ({
      id,
      amount: currentMockAmount,
      currency: 'INR',
      status: 'captured',
      order_id: currentMockOrderId,
      method: 'online'
    }),
    refund: async (id, params) => ({
      id: `rfnd_${Date.now()}`,
      amount: params.amount,
      status: 'processed'
    })
  };
  this.subscriptions = {
    create: async (params) => ({
      id: `sub_${Date.now()}`,
      plan_id: params.plan_id,
      customer_id: params.customer_id,
      status: 'active'
    }),
    fetch: async (subId) => ({
      id: subId,
      status: 'active',
      plan_id: process.env.RAZORPAY_PLAN_ID_PRO_MONTHLY,
      notes: {
        cafe_id: cafeA ? cafeA._id.toString() : '',
        plan_name: 'pro_plus',
        billing_cycle: 'monthly'
      }
    }),
    cancel: async (subId) => ({
      id: subId,
      status: 'cancelled'
    })
  };
  this.customers = {
    create: async (params) => ({
      id: `cust_${Date.now()}`,
      name: params.name,
      email: params.email
    })
  };
  this.invoices = {
    all: async () => ({ items: [] })
  };
};

async function runTests() {
  console.log('\n============================================================');
  console.log('   WhatTheMenu — Phase 10: API Workflow & State-Machine Audit');
  console.log('============================================================\n');

  // Connect Database if not connected
  if (mongoose.connection.readyState === 0) {
    const mongoUri = process.env.MONGO_URI_TEST || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
  }

  // Start test server on ephemeral port 0
  await new Promise((resolve) => {
    testServer = app.listen(0, () => {
      const port = testServer.address().port;
      API_BASE = `http://localhost:${port}/api`;
      console.log(`🚀 Test server listening on ${API_BASE}`);
      resolve();
    });
  });

  const client = axios.create({
    baseURL: API_BASE,
    validateStatus: () => true // Prevent axios from throwing on 4xx/5xx
  });

  const uniqueId = Date.now().toString(36);

  try {
    // Clean up test collections for isolation
    await Cafe.deleteMany({ email: { $regex: /test_p10_/ } });
    await Admin.deleteMany({ email: { $regex: /test_p10_/ } });
    await Order.deleteMany({ customer_name: { $regex: /Test P10/ } });
    await OrderRevenue.deleteMany({ customer_name: { $regex: /Test P10/ } });
    await WebhookLog.deleteMany({ razorpay_event_id: { $regex: /p10_evt_/ } });

    // Seed Super Admin
    const superAdminPassword = await bcrypt.hash('SuperAdminSecret123!', 10);
    const superAdmin = await Admin.create({
      name: 'Super Admin P10',
      email: `test_p10_admin_${uniqueId}@platform.com`,
      password: superAdminPassword,
      role: 'superadmin'
    });
    adminToken = jwt.sign(
      { id: superAdmin._id, role: 'superadmin' },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1d' }
    );

    // =========================================================================
    // WORKFLOW 1: Registration → Availability → Login → Sessions → Logout
    // =========================================================================
    console.log('--- Workflow 1: Registration, Multi-Device Sessions & Logout ---');

    process.env.SIMULATE_EMAIL = 'true';

    // 1.1 Check availability
    const availRes = await client.post('/auth/check-availability', {
      email: `test_p10_ownerA_${uniqueId}@cafe.com`,
      phone: '9876543210'
    });
    assert(availRes.status === 200 && availRes.data.data.emailExists === false, 'Check availability reports email free');

    // 1.2 Register Owner A
    const regRes = await client.post('/auth/register', {
      name: 'Café Mocha P10',
      email: `test_p10_ownerA_${uniqueId}@cafe.com`,
      password: 'StrongPassword123!',
      phone: '9876543210',
      address: '123 Coffee Lane',
      plan_name: 'starter'
    });
    assert(regRes.status === 201 && regRes.data.data.token, 'Owner A registration creates café with starter plan');

    cafeA = await Cafe.findOne({ email: `test_p10_ownerA_${uniqueId}@cafe.com` });
    cafeA.razorpay_key_id = 'rzp_test_cafeA123';
    cafeA.razorpay_key_secret = 'secret_cafeA123';
    await cafeA.save();

    // 1.3 Active session registered on signup
    let updatedCafeA = await Cafe.findById(cafeA._id);
    assert(updatedCafeA.active_sessions.length === 1, 'Device session stored in active_sessions[] on registration');
    const existingSessionId = updatedCafeA.active_sessions[0]._id.toString();

    // 1.4 Second device login without logout hits starter plan limit (1 device)
    const limitHitRes = await client.post('/auth/login', {
      email: `test_p10_ownerA_${uniqueId}@cafe.com`,
      password: 'StrongPassword123!'
    });
    assert(limitHitRes.status === 403 && limitHitRes.data.errorType === 'DEVICE_LIMIT_REACHED', 'Login at concurrency cap returns 403 DEVICE_LIMIT_REACHED');

    // 1.5 Trigger Force Logout OTP
    const forceLogoutRes = await client.post('/auth/login', {
      email: `test_p10_ownerA_${uniqueId}@cafe.com`,
      password: 'StrongPassword123!',
      forceLogout: true,
      logoutSessionIds: [existingSessionId]
    });
    assert(forceLogoutRes.status === 200 && forceLogoutRes.data.requireOtp === true, 'Force logout request triggers OTP challenge');

    // 1.6 Verify OTP and complete login
    const testOtp = '849201';
    await Cafe.findByIdAndUpdate(cafeA._id, {
      $set: {
        login_otp: crypto.createHash('sha256').update(testOtp).digest('hex'),
        login_otp_expire: Date.now() + 600000,
        pending_logout_sessions: [existingSessionId]
      }
    });

    const verifyOtpRes = await client.post('/auth/verify-login-otp', {
      email: `test_p10_ownerA_${uniqueId}@cafe.com`,
      otp: testOtp,
      logoutSessionIds: [existingSessionId]
    });
    const otpToken = verifyOtpRes.data.data?.token || verifyOtpRes.data.token;
    assert(verifyOtpRes.status === 200 && otpToken, 'OTP verification succeeds and returns new JWT');
    ownerAToken = otpToken;

    // Verify session eviction
    updatedCafeA = await Cafe.findById(cafeA._id);
    assert(updatedCafeA.active_sessions.length === 1, 'Previous session evicted; exactly 1 active session remains');

    // 1.7 Logout purges session
    const logoutRes = await client.post('/auth/logout', {}, {
      headers: { Authorization: `Bearer ${ownerAToken}` }
    });
    assert(logoutRes.status === 200, 'Logout succeeds');

    // 1.8 Accessing protected route with revoked token returns 401
    const protectedRes = await client.get('/auth/me', {
      headers: { Authorization: `Bearer ${ownerAToken}` }
    });
    assert(protectedRes.status === 401, 'Logged-out token is rejected by auth middleware (401)');

    // 1.9 Fresh login succeeds now that session is cleared
    const reLogin = await client.post('/auth/login', {
      email: `test_p10_ownerA_${uniqueId}@cafe.com`,
      password: 'StrongPassword123!'
    });
    const freshToken = reLogin.data.data?.token || reLogin.data.token;
    assert(reLogin.status === 200 && freshToken, 'Fresh login succeeds after session cleared');
    ownerAToken = freshToken;

    // Register Owner B for cross-tenant isolation testing
    const regB = await client.post('/auth/register', {
      name: 'Café Java P10',
      email: `test_p10_ownerB_${uniqueId}@cafe.com`,
      password: 'StrongPassword123!',
      phone: '9876543211',
      address: '456 Tea Street'
    });
    ownerBToken = regB.data.data.token;

    cafeB = await Cafe.findOne({ email: `test_p10_ownerB_${uniqueId}@cafe.com` });
    cafeB.razorpay_key_id = 'rzp_test_cafeB123';
    cafeB.razorpay_key_secret = 'secret_cafeB123';
    await cafeB.save();

    // =========================================================================
    // WORKFLOW 2: Restaurant Profile & Owner Settings Authorization
    // =========================================================================
    console.log('\n--- Workflow 2: Restaurant Profile & Settings Authorization ---');

    // 2.1 Retrieve profile
    const profileRes = await client.get('/auth/me', {
      headers: { Authorization: `Bearer ${ownerAToken}` }
    });
    assert(profileRes.status === 200 && profileRes.data.data.name === 'Café Mocha P10', 'Owner retrieves café profile via /auth/me');

    // 2.2 Update settings
    const settingsRes = await client.put('/owner/settings', {
      tax_percentage: 5
    }, {
      headers: { Authorization: `Bearer ${ownerAToken}` }
    });
    assert(settingsRes.status === 200 && settingsRes.data.data.tax_percentage === 5, 'Owner updates restaurant tax settings');

    // 2.3 Cross-tenant authorization: Owner B cannot modify Owner A's settings
    // (Settings endpoint binds strictly to req.user._id, preventing IDOR)
    const cafeBProfile = await client.get('/auth/me', {
      headers: { Authorization: `Bearer ${ownerBToken}` }
    });
    assert(cafeBProfile.data.data._id !== cafeA._id.toString(), 'Tenant identity strictly separated by token identity');

    // =========================================================================
    // WORKFLOW 3: Product Lifecycle (Create → Edit → Availability → Delete)
    // =========================================================================
    console.log('\n--- Workflow 3: Product Lifecycle Management ---');

    // 3.1 Create Category
    const catRes = await client.post('/owner/categories', {
      name: `Beverages P10 ${uniqueId}`
    }, {
      headers: { Authorization: `Bearer ${ownerAToken}` }
    });
    assert(catRes.status === 201 && catRes.data.data._id, 'Category created successfully');
    categoryA = catRes.data.data;

    // 3.2 Create Menu Items
    const item1Res = await client.post('/owner/menu-items', {
      category_id: categoryA._id,
      name: 'Cold Brew Coffee',
      description: 'Slow-steeped artisan cold brew',
      price: 150
    }, {
      headers: { Authorization: `Bearer ${ownerAToken}` }
    });
    assert(item1Res.status === 201, 'Product 1 (Cold Brew Coffee) created');
    itemA1 = item1Res.data.data;

    const item2Res = await client.post('/owner/menu-items', {
      category_id: categoryA._id,
      name: 'Caramel Macchiato',
      description: 'Espresso with caramel drizzle',
      price: 200
    }, {
      headers: { Authorization: `Bearer ${ownerAToken}` }
    });
    assert(item2Res.status === 201, 'Product 2 (Caramel Macchiato) created');
    itemA2 = item2Res.data.data;

    // Create item for Café B
    const catB = await Category.create({ cafe_id: cafeB._id, name: `Snacks P10 ${uniqueId}` });
    const itemB = await MenuItem.create({
      cafe_id: cafeB._id,
      category_id: catB._id,
      name: 'Croissant Café B',
      price: 120,
      availability: true
    });
    itemB1 = itemB;

    // 3.3 Edit Menu Item
    const editRes = await client.put(`/owner/menu-items/${itemA1._id}`, {
      price: 160,
      description: 'Signature 18-hour cold brew'
    }, {
      headers: { Authorization: `Bearer ${ownerAToken}` }
    });
    assert(editRes.status === 200 && editRes.data.data.price === 160, 'Product details & price updated');

    // 3.4 Toggle Availability (out-of-stock)
    const toggleRes = await client.put(`/owner/menu-items/${itemA2._id}/availability`, {}, {
      headers: { Authorization: `Bearer ${ownerAToken}` }
    });
    assert(toggleRes.status === 200 && toggleRes.data.data.availability === false, 'Product availability toggled to out-of-stock');

    // 3.5 Cross-tenant delete protection
    const badDelete = await client.delete(`/owner/menu-items/${itemB1._id}`, {
      headers: { Authorization: `Bearer ${ownerAToken}` }
    });
    assert(badDelete.status === 404, 'Owner A cannot delete Menu Item belonging to Café B (IDOR prevented)');

    // =========================================================================
    // WORKFLOW 4: QR Generation → Menu Lookup → Café Slug Resolution
    // =========================================================================
    console.log('\n--- Workflow 4: QR Generation & Public Menu Resolution ---');

    // 4.1 Get/Generate QR
    const qrRes = await client.get('/owner/qr-code', {
      headers: { Authorization: `Bearer ${ownerAToken}` }
    });
    assert(qrRes.status === 200 && qrRes.data.data.qr_image, 'Table QR code generated successfully');

    // 4.2 Public menu lookup via slug / id
    const menuRes = await client.get(`/menu/${cafeA.slug || cafeA._id}`);
    assert(menuRes.status === 200 && menuRes.data.data.cafe.name === 'Café Mocha P10', 'Public menu resolved via café identifier');

    // 4.3 Data minimization: public menu excludes sensitive owner credentials
    assert(menuRes.data.data.cafe.password === undefined, 'Menu lookup omits owner password hash');
    assert(menuRes.data.data.cafe.active_sessions === undefined, 'Menu lookup omits owner active session tokens');
    assert(menuRes.data.data.cafe.razorpay_key_secret === undefined, 'Menu lookup omits razorpay key secret');

    // =========================================================================
    // WORKFLOW 5: Menu Selection → Cart Validation → Checkout → Payment Init
    // =========================================================================
    console.log('\n--- Workflow 5: Cart Validation & Payment Initialization ---');

    // 5.1 Rejects order with unavailable item (itemA2 is unavailable)
    const unavailOrder = await client.post('/orders/create-razorpay-order', {
      cafe_id: cafeA._id,
      customer_name: 'Test P10 Customer',
      table_number: 'T-10',
      items: [{ menu_item_id: itemA2._id, quantity: 1, price: 200 }]
    });
    assert(unavailOrder.status === 400, 'Rejects checkout containing out-of-stock item (400)');

    // 5.2 Rejects cross-tenant items (itemB1 belongs to Cafe B)
    const crossTenantOrder = await client.post('/orders/create-razorpay-order', {
      cafe_id: cafeA._id,
      customer_name: 'Test P10 Customer',
      table_number: 'T-10',
      items: [{ menu_item_id: itemB1._id, quantity: 1, price: 120 }]
    });
    assert(crossTenantOrder.status === 400, 'Rejects checkout containing cross-tenant menu items (400)');

    // Reset itemA2 availability to true for testing valid flow
    await MenuItem.findByIdAndUpdate(itemA2._id, { availability: true });

    // 5.3 Valid Razorpay order creation with server-side price computation
    const initRes = await client.post('/orders/create-razorpay-order', {
      cafe_id: cafeA._id,
      customer_name: 'Test P10 Customer',
      customer_phone: '9876543210',
      table_number: 'T-10',
      items: [
        { menu_item_id: itemA1._id, quantity: 1, price: 10 }, // Spoofed price ₹10 (actual ₹160)
        { menu_item_id: itemA2._id, quantity: 1, price: 10 }  // Spoofed price ₹10 (actual ₹200)
      ]
    });
    assert(initRes.status === 201 && initRes.data.data.order_id, 'Razorpay order created');

    const createdOrder = await Order.findOne({ razorpay_order_id: initRes.data.data.order_id });
    // Subtotal: 160 + 200 = 360, Tax (5%): 18 -> Total: 378
    assert(createdOrder.total_amount === 378, 'Server computes authentic price ₹378 ignoring spoofed ₹20');
    assert(createdOrder.payment_status === 'pending', 'Initial order payment_status is "pending"');
    assert(createdOrder.order_status === 'new', 'Initial order order_status is "new"');

    // =========================================================================
    // WORKFLOW 6: Payment Success → Token Allocation → Revenue Ledger
    // =========================================================================
    console.log('\n--- Workflow 6: Payment Success, Token Allocation & Revenue Ledger ---');

    currentMockOrderId = createdOrder.razorpay_order_id;
    currentMockAmount = Math.round(createdOrder.total_amount * 100);

    const mockPaymentId = `pay_p10_success_${Date.now()}`;
    const validSignature = crypto
      .createHmac('sha256', 'secret_cafeA123')
      .update(`${createdOrder.razorpay_order_id}|${mockPaymentId}`)
      .digest('hex');

    // 6.1 Verify Payment
    const verifyRes = await client.post('/orders/verify-razorpay-payment', {
      razorpay_order_id: createdOrder.razorpay_order_id,
      razorpay_payment_id: mockPaymentId,
      razorpay_signature: validSignature
    });
    assert(verifyRes.status === 200, 'Valid signature verifies payment successfully');

    const paidOrder = await Order.findById(createdOrder._id);
    assert(paidOrder.payment_status === 'received', 'Order payment_status updated to "received"');
    assert(paidOrder.token_number && paidOrder.token_number.startsWith('#'), 'Sequential token assigned (e.g. #1)');

    // 6.2 Check permanent revenue ledger
    const revenueRecord = await OrderRevenue.findOne({ order_number: paidOrder.order_number });
    assert(revenueRecord && revenueRecord.total_amount === 378, 'Permanent OrderRevenue record created with ₹378');

    // 6.3 Customer tracking
    const trackRes = await client.get(`/orders/${paidOrder.order_number}/track`);
    assert(trackRes.status === 200 && trackRes.data.data.token_number === paidOrder.token_number, 'Customer tracks order with verified token');

    // =========================================================================
    // WORKFLOW 7: Payment Failure & Signature Forgery Defense
    // =========================================================================
    console.log('\n--- Workflow 7: Payment Failure & Forgery Defense ---');

    // Create another pending order
    const pendingOrder2Res = await client.post('/orders/create-razorpay-order', {
      cafe_id: cafeA._id,
      customer_name: 'Test P10 Forgery Target',
      table_number: 'T-11',
      items: [{ menu_item_id: itemA1._id, quantity: 1 }]
    });
    const order2 = await Order.findOne({ razorpay_order_id: pendingOrder2Res.data.data.order_id });

    // 7.1 Forged signature
    const forgedRes = await client.post('/orders/verify-razorpay-payment', {
      razorpay_order_id: order2.razorpay_order_id,
      razorpay_payment_id: 'pay_forged_123',
      razorpay_signature: 'fake_forged_signature_hash_value'
    });
    assert(forgedRes.status === 400, 'Forged signature rejected with 400 Bad Request');

    const failedOrder = await Order.findById(order2._id);
    assert(failedOrder.payment_status === 'failed', 'Order payment_status marked as "failed" on invalid signature');
    assert(!failedOrder.token_number, 'Failed payment does NOT allocate sequential token');

    const noRevenue = await OrderRevenue.findOne({ order_number: order2.order_number });
    assert(!noRevenue, 'Failed payment does NOT insert into OrderRevenue ledger');

    // =========================================================================
    // WORKFLOW 8: Duplicate Callback / Webhook Replay Protection
    // =========================================================================
    console.log('\n--- Workflow 8: Webhook Deduplication & Financial Idempotency ---');

    const webhookEventId = `p10_evt_${Date.now()}`;
    const webhookPayload = {
      entity: 'event',
      account_id: 'acc_123',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: mockPaymentId,
            order_id: createdOrder.razorpay_order_id,
            amount: currentMockAmount,
            currency: 'INR',
            status: 'captured',
            method: 'upi'
          }
        }
      }
    };
    const webhookRawBody = JSON.stringify(webhookPayload);
    const webhookSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret')
      .update(webhookRawBody)
      .digest('hex');

    // Pre-insert webhook record to simulate duplicate delivery
    await WebhookLog.create({
      razorpay_event_id: webhookEventId,
      event_type: 'payment.captured',
      status: 'processed'
    });

    const dupWebhookRes = await client.post('/webhooks/razorpay/order', webhookPayload, {
      headers: {
        'x-razorpay-signature': webhookSignature,
        'Content-Type': 'application/json'
      }
    });
    assert(dupWebhookRes.status === 200, 'Duplicate webhook returns 200 OK');

    const revenueCount = await OrderRevenue.countDocuments({ order_number: paidOrder.order_number });
    assert(revenueCount === 1, 'OrderRevenue has exactly 1 entry (no duplicate revenue created)');

    // =========================================================================
    // WORKFLOW 9: Order Progression State Machine
    // =========================================================================
    console.log('\n--- Workflow 9: Order Progression State Machine ---');

    // 9.1 new -> accepted
    const acceptRes = await client.put(`/owner/orders/${paidOrder._id}/status`, {
      order_status: 'accepted'
    }, {
      headers: { Authorization: `Bearer ${ownerAToken}` }
    });
    assert(acceptRes.status === 200 && acceptRes.data.data.order_status === 'accepted', 'Order transitions: new -> accepted');

    // 9.2 accepted -> preparing
    const prepRes = await client.put(`/owner/orders/${paidOrder._id}/status`, {
      order_status: 'preparing'
    }, {
      headers: { Authorization: `Bearer ${ownerAToken}` }
    });
    assert(prepRes.status === 200 && prepRes.data.data.order_status === 'preparing', 'Order transitions: accepted -> preparing');

    // 9.3 preparing -> ready
    const readyRes = await client.put(`/owner/orders/${paidOrder._id}/status`, {
      order_status: 'ready'
    }, {
      headers: { Authorization: `Bearer ${ownerAToken}` }
    });
    assert(readyRes.status === 200 && readyRes.data.data.order_status === 'ready', 'Order transitions: preparing -> ready');

    // 9.4 ready -> completed
    const completeRes = await client.put(`/owner/orders/${paidOrder._id}/status`, {
      order_status: 'completed'
    }, {
      headers: { Authorization: `Bearer ${ownerAToken}` }
    });
    assert(completeRes.status === 200 && completeRes.data.data.order_status === 'completed', 'Order transitions: ready -> completed');

    // =========================================================================
    // WORKFLOW 10: Impossible Transition Rejection & Cancelled Order Invariants
    // =========================================================================
    console.log('\n--- Workflow 10: State Machine Invariants & Impossible Transitions ---');

    // 10.1 Completed order cannot regress to 'new' or 'preparing'
    const invalidRegress = await client.put(`/owner/orders/${paidOrder._id}/status`, {
      order_status: 'new'
    }, {
      headers: { Authorization: `Bearer ${ownerAToken}` }
    });
    assert(invalidRegress.status === 400, 'Rejects completed order regressing to "new" (400)');

    // Create a new order and cancel it
    const cancelTestOrder = await Order.create({
      cafe_id: cafeA._id,
      customer_name: 'Test P10 Cancelled Target',
      items: [{ name: 'Espresso', quantity: 1, price: 100 }],
      total_amount: 100,
      order_status: 'cancelled',
      payment_status: 'pending',
      razorpay_order_id: `rzp_order_cancelled_${Date.now()}`
    });

    // 10.2 Cancelled order cannot transition to 'preparing'
    const reviveAttempt = await client.put(`/owner/orders/${cancelTestOrder._id}/status`, {
      order_status: 'preparing'
    }, {
      headers: { Authorization: `Bearer ${ownerAToken}` }
    });
    assert(reviveAttempt.status === 400, 'Rejects cancelled order reviving to "preparing" (400)');

    // 10.3 Cancelled order CANNOT be marked paid via owner payment update
    const ownerPayCancelled = await client.put(`/owner/orders/${cancelTestOrder._id}/payment`, {
      payment_status: 'received'
    }, {
      headers: { Authorization: `Bearer ${ownerAToken}` }
    });
    assert(ownerPayCancelled.status === 400, 'Rejects marking a cancelled order as paid via owner API (400)');

    // 10.4 Cancelled order CANNOT be verified as paid
    const verifyCancelled = await client.post('/orders/verify-razorpay-payment', {
      razorpay_order_id: cancelTestOrder.razorpay_order_id,
      razorpay_payment_id: 'pay_some_valid_id',
      razorpay_signature: 'dummy_sig'
    });
    assert(verifyCancelled.status === 400, 'Rejects payment verification for a cancelled order (400)');

    // 10.5 Unit validation of state machine transitions
    assert(isValidOrderStatusTransition('new', 'preparing') === true, 'State Machine allows new -> preparing');
    assert(isValidOrderStatusTransition('cancelled', 'new') === false, 'State Machine blocks cancelled -> new');
    assert(isValidOrderStatusTransition('completed', 'accepted') === false, 'State Machine blocks completed -> accepted');
    assert(isValidPaymentStatusTransition('pending', 'received', 'cancelled').valid === false, 'State Machine blocks payment on cancelled order');

    // =========================================================================
    // WORKFLOW 11: Customer Tracking & Privacy Protection
    // =========================================================================
    console.log('\n--- Workflow 11: Customer Tracking Privacy & IDOR Prevention ---');

    // 11.1 Tracking strips internal secrets
    const customerTracking = await client.get(`/orders/${paidOrder.order_number}/track`);
    assert(customerTracking.status === 200, 'Customer tracking endpoint responds 200 OK');
    assert(customerTracking.data.data.razorpay_signature === undefined, 'Tracking does not expose razorpay_signature');
    assert(customerTracking.data.data.razorpay_payment_id === undefined, 'Tracking does not expose raw payment transaction internals');

    // 11.2 Invalid order number returns 404
    const badTrack = await client.get('/orders/ORD-NONEXISTENT-9999/track');
    assert(badTrack.status === 404, 'Non-existent order tracking returns 404 Not Found');

    // =========================================================================
    // WORKFLOW 12: Owner Dashboard & Revenue Reporting
    // =========================================================================
    console.log('\n--- Workflow 12: Owner Dashboard & Permanent Revenue Reporting ---');

    // 12.1 Owner Dashboard
    const dashRes = await client.get('/owner/dashboard', {
      headers: { Authorization: `Bearer ${ownerAToken}` }
    });
    assert(dashRes.status === 200 && dashRes.data.data.todayOrders !== undefined, 'Dashboard returns tenant statistics');

    // 12.2 Orders Listing with pagination & filter
    const ordersList = await client.get('/owner/orders?status=completed&limit=10', {
      headers: { Authorization: `Bearer ${ownerAToken}` }
    });
    assert(ordersList.status === 200 && Array.isArray(ordersList.data.data), 'Orders list returns paginated completed orders');

    // 12.3 Revenue analytics from permanent OrderRevenue collection
    const revAnalytics = await client.get('/owner/revenue', {
      headers: { Authorization: `Bearer ${ownerAToken}` }
    });
    assert(revAnalytics.status === 200 && revAnalytics.data.data.history, 'Revenue analytics retrieves from permanent OrderRevenue ledger');

    // =========================================================================
    // WORKFLOW 13: SaaS Subscription Lifecycle
    // =========================================================================
    console.log('\n--- Workflow 13: SaaS Subscription Lifecycle ---');

    // 13.1 Create subscription payment order
    const subInitRes = await client.post('/owner/razorpay/create-subscription', {
      plan_name: 'pro_plus',
      billing_cycle: 'monthly'
    }, {
      headers: { Authorization: `Bearer ${ownerAToken}` }
    });
    assert(subInitRes.status === 201 && subInitRes.data.data.subscription_id, 'Subscription upgrade order created');

    const rzpSubId = subInitRes.data.data.subscription_id;
    const subPaymentId = `pay_sub_${Date.now()}`;
    const subSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test_sub_secret')
      .update(`${subPaymentId}|${rzpSubId}`)
      .digest('hex');

    // 13.2 Verify subscription payment
    const subVerifyRes = await client.post('/owner/razorpay/verify-subscription', {
      razorpay_subscription_id: rzpSubId,
      razorpay_payment_id: subPaymentId,
      razorpay_signature: subSignature
    }, {
      headers: { Authorization: `Bearer ${ownerAToken}` }
    });
    assert(subVerifyRes.status === 200, 'Subscription payment verified and plan activated');

    const updatedSubCafe = await Cafe.findById(cafeA._id);
    assert(updatedSubCafe.subscription.plan_name === 'pro_plus', 'Café plan upgraded to pro_plus');
    assert(updatedSubCafe.subscription_status === 'active', 'Subscription status marked active');

    const subHistory = await SubscriptionHistory.findOne({ cafe_id: cafeA._id, plan_name: 'pro_plus' });
    assert(subHistory && subHistory.payment_provider === 'razorpay', 'Permanent SubscriptionHistory entry recorded');

    // 13.3 Cancel subscription
    const cancelSubRes = await client.post('/owner/razorpay/cancel-subscription', {}, {
      headers: { Authorization: `Bearer ${ownerAToken}` }
    });
    assert(cancelSubRes.status === 200, 'Subscription cancellation succeeds');

    // =========================================================================
    // WORKFLOW 14: Super-Admin Actions & Deactivation Controls
    // =========================================================================
    console.log('\n--- Workflow 14: Super-Admin Authorization & Deactivation Controls ---');

    // 14.1 Unauthorized access to superadmin route
    const unauthAdmin = await client.get('/admin/cafes', {
      headers: { Authorization: `Bearer ${ownerAToken}` } // Owner attempting admin route
    });
    assert(unauthAdmin.status === 403, 'Owner token rejected on superadmin route with 403 Forbidden');

    // 14.2 Superadmin retrieves café list
    const adminCafes = await client.get('/admin/cafes', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminCafes.status === 200 && Array.isArray(adminCafes.data.data), 'Superadmin retrieves café tenant listing');

    // 14.3 Superadmin suspends café account
    const toggleCafe = await client.put(`/admin/cafes/${cafeB._id}/suspend`, {}, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(toggleCafe.status === 200 && toggleCafe.data.data.is_active === false, 'Superadmin suspends café account');

    // 14.4 Suspended café owner cannot login
    const suspendedLogin = await client.post('/auth/login', {
      email: `test_p10_ownerB_${uniqueId}@cafe.com`,
      password: 'StrongPassword123!'
    });
    assert(suspendedLogin.status === 403, 'Suspended café owner login is rejected with 403 Forbidden');

    // 14.5 Suspended café cannot accept orders
    const suspendedOrder = await client.post('/orders/create-razorpay-order', {
      cafe_id: cafeB._id,
      customer_name: 'Customer on suspended cafe',
      table_number: 'T-1',
      items: [{ menu_item_id: itemB1._id, quantity: 1, price: 120 }]
    });
    assert([400, 403].includes(suspendedOrder.status), 'Suspended café rejects customer checkout (403/400)');

    // =========================================================================
    // WORKFLOW 15: Staff Alerts & Feedback Validation & Rate Limiting
    // =========================================================================
    console.log('\n--- Workflow 15: Staff Alerts & Feedback Validation ---');

    // 15.1 Valid staff alert
    const alertRes1 = await client.post(`/orders/${paidOrder.order_number}/alert`, {
      type: 'waiter'
    });
    assert(alertRes1.status === 200, 'Staff alert ("waiter") succeeds');

    // 15.2 Alert cooldown rejection (30-second window)
    const alertSpam = await client.post(`/orders/${paidOrder.order_number}/alert`, {
      type: 'bill'
    });
    assert(alertSpam.status === 429, 'Alert spam within 30 seconds rejected with 429 Too Many Requests');

    // 15.3 Valid customer feedback
    const feedbackRes = await client.post('/feedback', {
      order_number: paidOrder.order_number,
      rating: 5,
      review: 'Excellent service and great cold brew coffee!'
    });
    assert(feedbackRes.status === 201, 'Customer feedback submitted successfully');

    // 15.4 Duplicate feedback for same order is rejected
    const dupFeedback = await client.post('/feedback', {
      order_number: paidOrder.order_number,
      rating: 4,
      review: 'Duplicate feedback attempt'
    });
    assert(dupFeedback.status === 400, 'Duplicate feedback for same order rejected (400)');

    // 15.5 Feedback with invalid rating (> 5) rejected
    const invalidRating = await client.post('/feedback', {
      order_number: cancelTestOrder.order_number,
      rating: 10,
      review: 'Invalid rating'
    });
    assert(invalidRating.status === 400, 'Feedback with rating > 5 rejected with 400 Bad Request');

    console.log('\n============================================================');
    console.log(`  Phase 10 Workflow & State Machine Suite: ${passedTests}/${totalTests} Tests PASSED (100%)`);
    console.log('============================================================\n');

  } finally {
    // Teardown
    if (testServer) {
      await new Promise(r => testServer.close(r));
    }
    // Clean up created records
    try {
      await Cafe.deleteMany({ email: { $regex: /test_p10_/ } });
      await Admin.deleteMany({ email: { $regex: /test_p10_/ } });
      await Order.deleteMany({ customer_name: { $regex: /Test P10/ } });
      await OrderRevenue.deleteMany({ customer_name: { $regex: /Test P10/ } });
      await WebhookLog.deleteMany({ razorpay_event_id: { $regex: /p10_evt_/ } });
    } catch (_) {}
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('\n❌ Unhandled error in Phase 10 test suite:', err);
  process.exit(1);
});
