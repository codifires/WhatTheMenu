/**
 * PHASE 7 TEST SUITE — Razorpay-Only Payment Integration and Security
 *
 * Validates:
 * 1. Customer Order Payment Initialization (server pricing, tenant isolation, availability)
 * 2. Customer Order Payment Verification (HMAC SHA-256 signature, captured state, amount match)
 * 3. Payment Verification Idempotency & Financial Integrity (no duplicate revenue, no duplicate tokens)
 * 4. Concurrency-Safe Daily Token Allocation (DailyTokenCounter)
 * 5. Order Webhook Security (raw body verification, signature validation, duplicate event idempotency)
 * 6. Order Refund Processing (owner authorization, duplicate refund prevention, revenue adjustment)
 * 7. Subscription Lifecycle (creation, signature verification, activation, cancellation, webhooks)
 * 8. Razorpay-Only Enforcement & Rejection of Legacy UPI Endpoints (404 on obsolete routes)
 */

const http = require('http');
const crypto = require('crypto');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const Razorpay = require('razorpay');

dotenv.config();

const Cafe = require('./models/Cafe');
const Order = require('./models/Order');
const OrderRevenue = require('./models/OrderRevenue');
const Subscription = require('./models/Subscription');
const SubscriptionHistory = require('./models/SubscriptionHistory');
const WebhookLog = require('./models/WebhookLog');
const MenuItem = require('./models/MenuItem');
const Category = require('./models/Category');
const DailyTokenCounter = require('./models/DailyTokenCounter');
const Settings = require('./models/Settings');

const { server, app } = require('./server');

const TEST_PORT = 5098;
const API_BASE = `http://localhost:${TEST_PORT}/api`;

let testServer;
let cafeA, cafeB;
let ownerAToken, ownerBToken;
let itemA1, itemA2, itemB1;

// Mock tracking variables for Razorpay responses
let mockCurrentOrderId = 'rzp_order_test_123';
let mockCurrentAmount = 25000;
let mockCurrentCafeId = '';

// Setup Razorpay Prototype Mocks for deterministic offline testing
const setupRazorpayMocks = () => {
  Razorpay.prototype.addResources = function () {
    this.orders = {
      create: async (params) => {
        mockCurrentOrderId = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        mockCurrentAmount = params.amount;
        return {
          id: mockCurrentOrderId,
          amount: params.amount,
          currency: params.currency || 'INR',
          receipt: params.receipt,
          status: 'created'
        };
      },
      fetch: async (orderId) => ({
        id: orderId,
        amount: mockCurrentAmount,
        currency: 'INR',
        status: 'paid'
      }),
      fetchPayments: async (orderId) => ({
        items: [{
          id: `pay_${Date.now()}`,
          order_id: orderId,
          amount: mockCurrentAmount,
          currency: 'INR',
          status: 'captured',
          method: 'card'
        }]
      })
    };

    this.payments = {
      fetch: async (paymentId) => ({
        id: paymentId,
        order_id: mockCurrentOrderId,
        amount: mockCurrentAmount,
        currency: 'INR',
        status: 'captured',
        method: 'card'
      }),
      refund: async (paymentId, params) => ({
        id: `rfnd_${Date.now()}`,
        payment_id: paymentId,
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
        plan_id: process.env.RAZORPAY_PLAN_ID_PRO_MONTHLY || 'plan_mock_pro_monthly',
        notes: {
          cafe_id: mockCurrentCafeId,
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
};

const generateSignature = (orderId, paymentId, secret) => {
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
};

const generateSubSignature = (paymentId, subscriptionId, secret) => {
  return crypto.createHmac('sha256', secret).update(`${paymentId}|${subscriptionId}`).digest('hex');
};

const generateWebhookSignature = (body, secret) => {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  return crypto.createHmac('sha256', secret).update(raw).digest('hex');
};

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 RUNNING PHASE 7: RAZORPAY-ONLY PAYMENT SECURITY TEST SUITE');
  console.log('===============================================================');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  };

  try {
    setupRazorpayMocks();

    const mongoUri = process.env.MONGO_URI || process.env.MONGO_URI_TEST;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Start test server
    await new Promise((resolve) => {
      testServer = server.listen(TEST_PORT, () => {
        console.log(`🚀 Test server listening on http://localhost:${TEST_PORT}`);
        resolve();
      });
    });

    // 0. Clean and prepare test cafes and items
    const suffix = Date.now();
    cafeA = await Cafe.create({
      name: `Phase7 Cafe A ${suffix}`,
      email: `p7_cafe_a_${suffix}@test.com`,
      password: 'password123',
      subscription_status: 'active',
      is_active: true,
      tax_percentage: 5,
      razorpay_key_id: 'rzp_test_cafe_a_key',
      razorpay_key_secret: 'cafe_a_secret_123456789012345678',
      razorpay_webhook_secret: 'cafe_a_webhook_sec_1234567890'
    });

    cafeB = await Cafe.create({
      name: `Phase7 Cafe B ${suffix}`,
      email: `p7_cafe_b_${suffix}@test.com`,
      password: 'password123',
      subscription_status: 'active',
      is_active: true,
      tax_percentage: 0,
      razorpay_key_id: 'rzp_test_cafe_b_key',
      razorpay_key_secret: 'cafe_b_secret_123456789012345678',
      razorpay_webhook_secret: 'cafe_b_webhook_sec_1234567890'
    });

    ownerAToken = jwt.sign({ id: cafeA._id, role: 'owner' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    ownerBToken = jwt.sign({ id: cafeB._id, role: 'owner' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    cafeA.active_sessions = [{ token: ownerAToken, device_info: 'test-device' }];
    await cafeA.save({ validateBeforeSave: false });

    cafeB.active_sessions = [{ token: ownerBToken, device_info: 'test-device' }];
    await cafeB.save({ validateBeforeSave: false });

    const catA = await Category.create({ name: 'Burgers', cafe_id: cafeA._id, sort_order: 1 });
    const catB = await Category.create({ name: 'Pizzas', cafe_id: cafeB._id, sort_order: 1 });

    itemA1 = await MenuItem.create({
      name: 'Classic Burger',
      price: 150,
      cafe_id: cafeA._id,
      category_id: catA._id,
      availability: true
    });

    itemA2 = await MenuItem.create({
      name: 'Cheese Burger',
      price: 200,
      cafe_id: cafeA._id,
      category_id: catA._id,
      availability: false // unavailable
    });

    itemB1 = await MenuItem.create({
      name: 'Margherita Pizza',
      price: 300,
      cafe_id: cafeB._id,
      category_id: catB._id,
      availability: true
    });

    console.log('\n--- MODULE 1: CUSTOMER ORDER PAYMENT INITIALIZATION ---');

    // 1.1 Backend Price Calculation & Razorpay Order Creation
    const createRes = await axios.post(`${API_BASE}/orders/create-razorpay-order`, {
      cafe_id: cafeA._id.toString(),
      customer_name: 'Alice',
      customer_phone: '9876543210',
      table_number: 'T-1',
      items: [
        { menu_item_id: itemA1._id.toString(), quantity: 2, price: 99999 } // Client tries to spoof price
      ]
    });

    assert(createRes.status === 201 && createRes.data.success, '1.1 Razorpay order created successfully');
    // Expected: 150 * 2 = 300; 5% tax = 15; final total = 315; amount in paise = 31500
    assert(createRes.data.data.total_amount === 315, '1.2 Total amount calculated server-side ignoring client spoofed price (₹315)');
    assert(createRes.data.data.amount === 31500, '1.3 Razorpay amount in paise calculated correctly (31500 paise)');
    assert(createRes.data.data.razorpay_key_id === cafeA.razorpay_key_id, '1.4 Uses café custom Razorpay key');

    const createdOrder = await Order.findOne({ razorpay_order_id: createRes.data.data.order_id });
    assert(createdOrder && createdOrder.payment_provider === 'razorpay' && createdOrder.payment_status === 'pending',
      '1.5 Internal Order created with payment_provider: razorpay and payment_status: pending');

    // 1.2 Reject unavailable item
    try {
      await axios.post(`${API_BASE}/orders/create-razorpay-order`, {
        cafe_id: cafeA._id.toString(),
        items: [{ menu_item_id: itemA2._id.toString(), quantity: 1 }]
      });
      assert(false, '1.6 Rejection of unavailable item');
    } catch (err) {
      assert(err.response?.status === 400, '1.6 Rejection of unavailable item returns 400 Bad Request');
    }

    // 1.3 Reject cross-tenant item
    try {
      await axios.post(`${API_BASE}/orders/create-razorpay-order`, {
        cafe_id: cafeA._id.toString(),
        items: [{ menu_item_id: itemB1._id.toString(), quantity: 1 }] // Belongs to cafe B
      });
      assert(false, '1.7 Rejection of cross-tenant item');
    } catch (err) {
      assert(err.response?.status === 400, '1.7 Rejection of cross-tenant item returns 400');
    }

    console.log('\n--- MODULE 2: PAYMENT VERIFICATION & SECURITY ---');

    const rzpOrderId = createRes.data.data.order_id;
    const rzpPaymentId = `pay_${Date.now()}`;
    mockCurrentOrderId = rzpOrderId;
    mockCurrentAmount = 31500; // Matches expected 31500 paise

    // 2.1 Rejection of forged signature
    try {
      await axios.post(`${API_BASE}/orders/verify-razorpay-payment`, {
        razorpay_order_id: rzpOrderId,
        razorpay_payment_id: rzpPaymentId,
        razorpay_signature: 'forged_invalid_signature_hex_1234567890'
      });
      assert(false, '2.1 Rejection of forged signature');
    } catch (err) {
      assert(err.response?.status === 400, '2.1 Forged Razorpay signature rejected with 400 Bad Request');
      const failedOrder = await Order.findOne({ razorpay_order_id: rzpOrderId });
      assert(failedOrder.payment_status === 'failed', '2.2 Order payment_status set to failed on signature forgery');
    }

    // Reset order to pending for valid verification
    await Order.updateOne({ razorpay_order_id: rzpOrderId }, { payment_status: 'pending' });

    // 2.2 Successful signature verification
    const validSignature = generateSignature(rzpOrderId, rzpPaymentId, cafeA.razorpay_key_secret);
    const verifyRes = await axios.post(`${API_BASE}/orders/verify-razorpay-payment`, {
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: rzpPaymentId,
      razorpay_signature: validSignature
    });

    assert(verifyRes.status === 200 && verifyRes.data.success, '2.3 Valid payment verification succeeds');
    assert(verifyRes.data.data.payment_status === 'received', '2.4 Order payment_status updated to received');
    assert(verifyRes.data.data.token_number.startsWith('#'), '2.5 Order assigned sequential token number');

    const verifiedOrder = await Order.findOne({ razorpay_order_id: rzpOrderId });
    assert(verifiedOrder.payment_provider === 'razorpay', '2.6 Order payment_provider is razorpay');
    assert(verifiedOrder.payment_method === 'card', '2.7 Verified payment_method stored from trusted provider data (card)');

    // 2.3 OrderRevenue recording
    const revRecord = await OrderRevenue.findOne({ order_number: verifiedOrder.order_number });
    assert(revRecord && revRecord.total_amount === 315 && revRecord.payment_provider === 'razorpay',
      '2.8 Permanent OrderRevenue recorded with payment_provider: razorpay and ₹315');

    console.log('\n--- MODULE 3: FINANCIAL INTEGRITY & IDEMPOTENCY ---');

    // 3.1 Idempotent verification call
    const dupVerifyRes = await axios.post(`${API_BASE}/orders/verify-razorpay-payment`, {
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: rzpPaymentId,
      razorpay_signature: validSignature
    });

    assert(dupVerifyRes.status === 200 && dupVerifyRes.data.message === 'Payment already verified',
      '3.1 Duplicate payment verification returns immediate success');
    assert(dupVerifyRes.data.data.token_number === verifiedOrder.token_number,
      '3.2 Duplicate verification does NOT re-increment token number');

    const revCount = await OrderRevenue.countDocuments({ order_number: verifiedOrder.order_number });
    assert(revCount === 1, '3.3 OrderRevenue recorded exactly once, no duplicate revenue records created');

    console.log('\n--- MODULE 4: CONCURRENCY-SAFE TOKEN NUMBER GENERATION ---');

    // 4.1 Test DailyTokenCounter directly
    const token1 = await DailyTokenCounter.getNextToken(cafeB._id);
    const token2 = await DailyTokenCounter.getNextToken(cafeB._id);
    const token3 = await DailyTokenCounter.getNextToken(cafeB._id);

    assert(token1 === '#1', '4.1 First daily token starts at #1');
    assert(token2 === '#2', '4.2 Second daily token increments to #2');
    assert(token3 === '#3', '4.3 Third daily token increments to #3');

    console.log('\n--- MODULE 5: RAZORPAY WEBHOOK SECURITY ---');

    // 5.1 Rejection of webhook with missing signature
    try {
      await axios.post(`${API_BASE}/webhooks/razorpay/order`, {
        event: 'payment.captured'
      });
      assert(false, '5.1 Missing webhook signature rejected');
    } catch (err) {
      assert(err.response?.status === 400, '5.1 Missing webhook signature rejected with 400 Bad Request');
    }

    // 5.2 Rejection of invalid webhook signature
    try {
      await axios.post(
        `${API_BASE}/webhooks/razorpay/order`,
        { event: 'payment.captured' },
        { headers: { 'x-razorpay-signature': 'invalid_signature_hex' } }
      );
      assert(false, '5.2 Invalid webhook signature rejected');
    } catch (err) {
      assert(err.response?.status === 400, '5.2 Invalid webhook signature rejected with 400 Bad Request');
    }

    // 5.3 Valid order payment webhook processing
    // Create new order to test webhook fulfillment
    const newOrder = await Order.create({
      cafe_id: cafeA._id,
      customer_name: 'Bob',
      items: [{ menu_item_id: itemA1._id, name: 'Burger', quantity: 1, price: 150 }],
      total_amount: 157.5,
      payment_provider: 'razorpay',
      payment_method: 'razorpay',
      payment_status: 'pending',
      razorpay_order_id: `rzp_ord_hook_${Date.now()}`
    });

    const webhookPaymentId = `pay_hook_${Date.now()}`;
    const webhookPayload = {
      entity: 'event',
      account_id: 'acc_test_123',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: webhookPaymentId,
            order_id: newOrder.razorpay_order_id,
            amount: 15750,
            currency: 'INR',
            status: 'captured',
            method: 'upi'
          }
        }
      },
      created_at: Math.floor(Date.now() / 1000)
    };

    const webhookRawBody = JSON.stringify(webhookPayload);
    const validWebhookSig = generateWebhookSignature(webhookRawBody, cafeA.razorpay_webhook_secret);

    const hookRes = await axios.post(
      `${API_BASE}/webhooks/razorpay/order`,
      webhookPayload,
      {
        headers: {
          'x-razorpay-signature': validWebhookSig,
          'Content-Type': 'application/json'
        }
      }
    );

    assert(hookRes.status === 200 && hookRes.data.success, '5.3 Valid order payment webhook processed successfully');

    const hookVerifiedOrder = await Order.findById(newOrder._id);
    assert(hookVerifiedOrder.payment_status === 'received', '5.4 Webhook successfully sets order payment_status to received');
    assert(hookVerifiedOrder.payment_provider === 'razorpay', '5.5 Webhook sets payment_provider to razorpay');
    assert(hookVerifiedOrder.payment_method === 'upi', '5.6 Webhook stores verified payment_method (upi) from Razorpay entity');

    // 5.4 Duplicate webhook delivery idempotency
    const dupHookRes = await axios.post(
      `${API_BASE}/webhooks/razorpay/order`,
      webhookPayload,
      {
        headers: {
          'x-razorpay-signature': validWebhookSig,
          'Content-Type': 'application/json'
        }
      }
    );

    assert(dupHookRes.status === 200 && dupHookRes.data.message === 'Duplicate event',
      '5.7 Duplicate webhook delivery detected and acknowledged with 200 OK without re-processing');

    console.log('\n--- MODULE 6: REFUND AUTHORIZATION & SECURITY ---');

    // 6.1 Owner A refunds their own verified order
    const refundRes = await axios.post(
      `${API_BASE}/owner/razorpay/refund/${verifiedOrder._id}`,
      { reason: 'Customer requested cancellation' },
      { headers: { Authorization: `Bearer ${ownerAToken}` } }
    );

    assert(refundRes.status === 200 && refundRes.data.success, '6.1 Owner refund initiated successfully');

    const refundedOrder = await Order.findById(verifiedOrder._id);
    assert(refundedOrder.order_status === 'cancelled' && refundedOrder.payment_status === 'failed',
      '6.2 Order marked as cancelled and payment_status failed on refund');

    const revAfterRefund = await OrderRevenue.findOne({ order_number: verifiedOrder.order_number });
    assert(!revAfterRefund, '6.3 OrderRevenue record safely removed / adjusted after refund');

    // 6.2 Duplicate refund rejected
    try {
      await axios.post(
        `${API_BASE}/owner/razorpay/refund/${verifiedOrder._id}`,
        { reason: 'Duplicate refund attempt' },
        { headers: { Authorization: `Bearer ${ownerAToken}` } }
      );
      assert(false, '6.4 Duplicate refund rejection');
    } catch (err) {
      assert(err.response?.status === 400, '6.4 Duplicate refund rejected with 400 Bad Request');
    }

    // 6.3 Cross-tenant refund attempt (Owner B tries to refund Owner A's order)
    try {
      await axios.post(
        `${API_BASE}/owner/razorpay/refund/${newOrder._id}`,
        { reason: 'Unauthorized refund' },
        { headers: { Authorization: `Bearer ${ownerBToken}` } }
      );
      assert(false, '6.5 Cross-tenant refund rejection');
    } catch (err) {
      assert(err.response?.status === 404, '6.5 Cross-tenant refund rejected with 404 (IDOR prevention)');
    }

    console.log('\n--- MODULE 7: SAAS SUBSCRIPTION BILLING ---');

    // 7.1 Create subscription
    const subCreateRes = await axios.post(
      `${API_BASE}/owner/razorpay/create-subscription`,
      { plan_name: 'pro_plus', billing_cycle: 'monthly' },
      { headers: { Authorization: `Bearer ${ownerAToken}` } }
    );

    assert(subCreateRes.status === 201 && subCreateRes.data.success, '7.1 Razorpay subscription created successfully');
    const rzpSubId = subCreateRes.data.data.subscription_id;

    // 7.2 Subscription payment verification
    const rzpSubPayId = `pay_sub_${Date.now()}`;
    const validSubSig = generateSubSignature(rzpSubPayId, rzpSubId, process.env.RAZORPAY_KEY_SECRET);

    const subVerifyRes = await axios.post(
      `${API_BASE}/owner/razorpay/verify-subscription`,
      {
        razorpay_subscription_id: rzpSubId,
        razorpay_payment_id: rzpSubPayId,
        razorpay_signature: validSubSig
      },
      { headers: { Authorization: `Bearer ${ownerAToken}` } }
    );

    assert(subVerifyRes.status === 200 && subVerifyRes.data.success, '7.2 Subscription payment verified successfully');

    const updatedCafeA = await Cafe.findById(cafeA._id);
    assert(updatedCafeA.subscription_status === 'active' && updatedCafeA.subscription?.plan_name === 'pro_plus',
      '7.3 Cafe subscription activated with plan pro_plus');

    const subHistory = await SubscriptionHistory.findOne({ razorpay_payment_id: rzpSubPayId });
    assert(subHistory && subHistory.payment_provider === 'razorpay',
      '7.4 SubscriptionHistory record created with payment_provider: razorpay');

    // 7.3 Subscription cancellation
    const cancelRes = await axios.post(
      `${API_BASE}/owner/razorpay/cancel-subscription`,
      {},
      { headers: { Authorization: `Bearer ${ownerAToken}` } }
    );

    assert(cancelRes.status === 200 && cancelRes.data.success, '7.5 Subscription cancellation succeeds');

    console.log('\n--- MODULE 8: RAZORPAY-ONLY ENFORCEMENT (REJECTION OF LEGACY UPI ROUTES) ---');

    const legacyEndpoints = [
      { method: 'post', url: `${API_BASE}/orders/initiate-upi-session`, data: {} },
      { method: 'get', url: `${API_BASE}/orders/check-upi-status/sess_123` },
      { method: 'post', url: `${API_BASE}/orders/upi-webhook`, data: {} },
      { method: 'post', url: `${API_BASE}/owner/subscription/request`, data: {}, auth: ownerAToken },
      { method: 'post', url: `${API_BASE}/owner/subscription/initiate-session`, data: {}, auth: ownerAToken },
      { method: 'post', url: `${API_BASE}/owner/subscription/webhook`, data: {}, auth: ownerAToken }
    ];

    let all404 = true;
    for (const ep of legacyEndpoints) {
      try {
        const headers = ep.auth ? { Authorization: `Bearer ${ep.auth}` } : {};
        if (ep.method === 'post') {
          await axios.post(ep.url, ep.data, { headers });
        } else {
          await axios.get(ep.url, { headers });
        }
        all404 = false;
        console.error(`  ❌ Legacy endpoint ${ep.url} still exists!`);
      } catch (err) {
        if (err.response?.status !== 404) {
          all404 = false;
          console.error(`  ❌ Legacy endpoint ${ep.url} returned status ${err.response?.status} instead of 404`);
        }
      }
    }

    assert(all404, '8.1 All legacy UPI customer and subscription endpoints return 404 Not Found');

    console.log('\n===============================================================');
    console.log(`📊 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================');

    // Cleanup
    await Cafe.deleteMany({ _id: { $in: [cafeA._id, cafeB._id] } });
    await MenuItem.deleteMany({ _id: { $in: [itemA1._id, itemA2._id, itemB1._id] } });
    await Category.deleteMany({ _id: { $in: [catA._id, catB._id] } });
    await Order.deleteMany({ cafe_id: { $in: [cafeA._id, cafeB._id] } });
    await OrderRevenue.deleteMany({ cafe_id: { $in: [cafeA._id, cafeB._id] } });
    await SubscriptionHistory.deleteMany({ cafe_id: { $in: [cafeA._id, cafeB._id] } });
    await Subscription.deleteMany({ cafe_id: { $in: [cafeA._id, cafeB._id] } });
    await WebhookLog.deleteMany({ 'payload.account_id': 'acc_test_123' });
    await DailyTokenCounter.deleteMany({ cafe_id: { $in: [cafeA._id, cafeB._id] } });

    if (testServer) testServer.close();
    await mongoose.disconnect();

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('💥 Test suite crashed with error:', err);
    if (testServer) testServer.close();
    await mongoose.disconnect();
    process.exit(1);
  }
}

runTests();
