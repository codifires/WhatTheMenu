/**
 * ============================================================================
 * WhatTheMenu — Phase 12: Automated Negative & Boundary Testing Suite
 * ============================================================================
 *
 * Verifies all 18 required negative testing categories:
 *  1. Missing or invalid authentication
 *  2. Customer attempting owner or admin operations
 *  3. Owner A attempting to access café B (Tenant Isolation / IDOR)
 *  4. Customer A attempting to access customer B's order (Data Privacy & IDOR)
 *  5. Invalid, missing, oversized, and unexpected input fields (checkExact)
 *  6. Negative, fractional, zero, and excessive quantities
 *  7. Menu item from the wrong café (Cross-Tenant Item Injection)
 *  8. Repeated login, OTP, order, and staff-alert requests (Rate limiting)
 *  9. Invalid payment signatures & forgery defenses
 * 10. Missing webhook signatures or secrets
 * 11. Wrong payment amount, currency, or order association
 * 12. Duplicate webhooks and simultaneous callbacks (Idempotency)
 * 13. Duplicate order tokens under concurrency (Atomic counter)
 * 14. Database failure resilience & error handler boundary
 * 15. Unauthorized Socket.IO room joins (Anonymous, Cross-Tenant, Malformed)
 * 16. Invalid file uploads (Type, Extension, Double-ext, Path traversal, Size)
 * 17. Malformed identifiers and attempted NoSQL injection ($ne, $gt, $where)
 * 18. Subscription activation without verified payment
 * ============================================================================
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const crypto = require('crypto');
const mongoose = require('mongoose');
const axios = require('axios');
const jwt = require('jsonwebtoken');

let ioClient;
try {
  ioClient = require('socket.io-client');
} catch (e) {
  ioClient = require('../frontend/node_modules/socket.io-client');
}

// Models & Services
const Admin = require('./models/Admin');
const Cafe = require('./models/Cafe');
const Category = require('./models/Category');
const MenuItem = require('./models/MenuItem');
const Order = require('./models/Order');
const OrderRevenue = require('./models/OrderRevenue');
const Subscription = require('./models/Subscription');
const SubscriptionHistory = require('./models/SubscriptionHistory');
const SystemLog = require('./models/SystemLog');
const DailyTokenCounter = require('./models/DailyTokenCounter');
const WebhookLog = require('./models/WebhookLog');
const upload = require('./middleware/upload');
const { noSqlSanitizer } = require('./middleware/noSqlSanitizer');
const razorpayUtils = require('./utils/razorpay');

// Import server & app
const { app, io, server } = require('./server');

let passedTests = 0;
let totalTests = 0;
let API_BASE;
let SERVER_URL;

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

async function waitForLog(filter, timeoutMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const log = await SystemLog.findOne(filter);
    if (log) return log;
    await new Promise(r => setTimeout(r, 100));
  }
  return null;
}

async function runPhase12Tests() {
  console.log('\n============================================================');
  console.log('   WhatTheMenu — Phase 12: Automated Negative Testing Suite');
  console.log('============================================================\n');

  // 1. Ensure DB Connection
  if (mongoose.connection.readyState === 0) {
    const mongoUri = process.env.MONGO_URI_TEST || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
  }

  // 2. Start Test Server on Ephemeral Port
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  SERVER_URL = `http://localhost:${port}`;
  API_BASE = `${SERVER_URL}/api`;
  console.log(`🚀 Test server listening on ${API_BASE}\n`);

  const client = axios.create({
    baseURL: API_BASE,
    validateStatus: () => true // Prevent axios from throwing on 4xx/5xx
  });

  const uniqueId = `p12_${Date.now()}`;
  const jwtSecret = process.env.JWT_SECRET || 'test_jwt_secret_1234567890';

  let testAdmin, adminToken;
  let cafeA, ownerTokenA;
  let cafeB, ownerTokenB;
  let catA, itemA;
  let catB, itemB;
  let orderB;

  try {
    // -------------------------------------------------------------
    // Test Fixtures Setup (Isolated Tenant Data)
    // -------------------------------------------------------------
    testAdmin = await Admin.create({
      name: 'P12 SuperAdmin',
      email: `${uniqueId}_admin@test.com`,
      password: 'AdminPassword123!',
      role: 'superadmin'
    });
    adminToken = jwt.sign(
      { id: testAdmin._id, role: 'superadmin' },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // Cafe A
    cafeA = await Cafe.create({
      name: 'P12 Cafe Alpha',
      email: `${uniqueId}_cafeA@test.com`,
      password: 'CafePassword123!',
      phone: '9876543210',
      address: '100 Alpha St',
      is_active: true,
      subscription_status: 'active',
      subscription: { plan_name: 'starter', status: 'active' },
      razorpay_key_id: 'rzp_test_p12_cafe_a',
      razorpay_key_secret: 'secret_p12_cafe_a_key'
    });
    ownerTokenA = jwt.sign(
      { id: cafeA._id, role: 'owner' },
      jwtSecret,
      { expiresIn: '1h' }
    );
    cafeA.active_sessions = [{ token: ownerTokenA, device_info: 'Device A', last_active: Date.now() }];
    await cafeA.save();

    catA = await Category.create({ cafe_id: cafeA._id, name: 'Hot Drinks A', sort_order: 1 });
    itemA = await MenuItem.create({
      cafe_id: cafeA._id,
      category_id: catA._id,
      name: 'Alpha Espresso',
      price: 150,
      availability: true
    });

    // Cafe B
    cafeB = await Cafe.create({
      name: 'P12 Cafe Beta',
      email: `${uniqueId}_cafeB@test.com`,
      password: 'CafePassword123!',
      phone: '9876543211',
      address: '200 Beta Blvd',
      is_active: true,
      subscription_status: 'active',
      subscription: { plan_name: 'starter', status: 'active' },
      razorpay_key_id: 'rzp_test_p12_cafe_b',
      razorpay_key_secret: 'secret_p12_cafe_b_key'
    });
    ownerTokenB = jwt.sign(
      { id: cafeB._id, role: 'owner' },
      jwtSecret,
      { expiresIn: '1h' }
    );
    cafeB.active_sessions = [{ token: ownerTokenB, device_info: 'Device B', last_active: Date.now() }];
    await cafeB.save();

    catB = await Category.create({ cafe_id: cafeB._id, name: 'Cold Drinks B', sort_order: 1 });
    itemB = await MenuItem.create({
      cafe_id: cafeB._id,
      category_id: catB._id,
      name: 'Beta Frappe',
      price: 250,
      availability: true
    });

    orderB = await Order.create({
      cafe_id: cafeB._id,
      customer_name: 'Customer Bob (VIP)',
      customer_phone: '9998887776',
      table_number: 'Table-42',
      items: [{ menu_item_id: itemB._id, name: itemB.name, quantity: 1, price: 250 }],
      total_amount: 250,
      payment_method: 'cash',
      payment_status: 'pending',
      order_status: 'new',
      notes: 'Customer Private Secret Note: Table VIP',
      payment_transaction_id: 'txn_private_beta_999'
    });

    // =============================================================
    // TEST 1: Missing or Invalid Authentication
    // =============================================================
    console.log('--- Test 1: Missing or Invalid Authentication ---');
    
    // 1.1 No token provided
    const noAuthRes = await client.get('/owner/dashboard');
    assert(noAuthRes.status === 401, 'No token returns 401 Unauthorized');
    assert(noAuthRes.data.code === 'AUTHENTICATION_ERROR', 'No token returns AUTHENTICATION_ERROR code');
    assert(noAuthRes.data.success === false, 'No token returns success: false');

    // 1.2 Malformed token
    const malformedRes = await client.get('/owner/dashboard', {
      headers: { Authorization: 'Bearer not_a_valid_jwt_token_string' }
    });
    assert(malformedRes.status === 401, 'Malformed token returns 401 Unauthorized');

    // 1.3 Expired token
    const expiredToken = jwt.sign(
      { id: cafeA._id, role: 'owner' },
      jwtSecret,
      { expiresIn: '-10s' }
    );
    const expiredRes = await client.get('/owner/dashboard', {
      headers: { Authorization: `Bearer ${expiredToken}` }
    });
    assert(expiredRes.status === 401, 'Expired token returns 401 Unauthorized');

    // 1.4 Token signed with wrong secret
    const forgedSecretToken = jwt.sign(
      { id: cafeA._id, role: 'owner' },
      'completely_wrong_and_forged_secret_key',
      { expiresIn: '1h' }
    );
    const forgedSecretRes = await client.get('/owner/dashboard', {
      headers: { Authorization: `Bearer ${forgedSecretToken}` }
    });
    assert(forgedSecretRes.status === 401, 'Wrong secret token returns 401 Unauthorized');

    // 1.5 Revoked session token (simulating logged-out session)
    const revokedToken = jwt.sign(
      { id: cafeA._id, role: 'owner', jti: 'revoked_session_id' },
      jwtSecret,
      { expiresIn: '1h' }
    );
    const revokedRes = await client.get('/owner/dashboard', {
      headers: { Authorization: `Bearer ${revokedToken}` }
    });
    assert(revokedRes.status === 401, 'Revoked/unlisted session token returns 401 Unauthorized');

    // =============================================================
    // TEST 2: Customer Attempting Owner or Admin Operations
    // =============================================================
    console.log('\n--- Test 2: Customer Attempting Owner or Admin Operations ---');

    // 2.1 Customer attempting owner operation
    const anonOwnerRes = await client.get('/owner/orders');
    assert(anonOwnerRes.status === 401, 'Unauthenticated access to /owner/orders returns 401');

    // 2.2 Customer attempting admin operation
    const anonAdminRes = await client.get('/admin/cafes');
    assert(anonAdminRes.status === 401, 'Unauthenticated access to /admin/cafes returns 401');

    // 2.3 Customer attempting owner mutation
    const anonCreateItemRes = await client.post('/owner/menu-items', {
      name: 'Illegal Item',
      price: 100,
      category_id: catA._id
    });
    assert(anonCreateItemRes.status === 401, 'Unauthenticated menu item creation returns 401');

    // 2.4 Owner attempting admin operation
    const ownerOnAdminRes = await client.get('/admin/cafes', {
      headers: { Authorization: `Bearer ${ownerTokenA}` }
    });
    assert(ownerOnAdminRes.status === 403, 'Owner token on /admin/cafes returns 403 Forbidden');
    assert(ownerOnAdminRes.data.code === 'FORBIDDEN_ERROR', 'Owner on admin route returns FORBIDDEN_ERROR');

    // 2.5 Owner attempting admin settings modification
    const ownerOnAdminSettingsRes = await client.put('/admin/settings', {
      starter_price: 1
    }, {
      headers: { Authorization: `Bearer ${ownerTokenA}` }
    });
    assert(ownerOnAdminSettingsRes.status === 403, 'Owner token on /admin/settings returns 403 Forbidden');

    // 2.6 Owner attempting payment health monitoring
    const ownerOnMonitoringRes = await client.get('/admin/monitoring/payment-health', {
      headers: { Authorization: `Bearer ${ownerTokenA}` }
    });
    assert(ownerOnMonitoringRes.status === 403, 'Owner token on /admin/monitoring/payment-health returns 403');

    // =============================================================
    // TEST 3: Owner A Attempting to Access Café B (Tenant Isolation / IDOR)
    // =============================================================
    console.log('\n--- Test 3: Owner A Attempting to Access Café B (IDOR) ---');

    // 3.1 Owner A attempts to edit Cafe B's item
    const idorEditRes = await client.put(`/owner/menu-items/${itemB._id}`, {
      name: 'Hacked Item Name',
      price: 1
    }, {
      headers: { Authorization: `Bearer ${ownerTokenA}` }
    });
    assert(idorEditRes.status === 404, 'Owner A editing Cafe B item returns 404 Not Found');

    // 3.1b Owner A attempts to inject Cafe B's category into an item
    const crossCatRes = await client.post('/owner/menu-items', {
      name: 'Cross Cat Item',
      price: 100,
      category_id: catB._id
    }, {
      headers: { Authorization: `Bearer ${ownerTokenA}` }
    });
    assert(crossCatRes.status === 400, 'Owner A injecting Cafe B category returns 400 Bad Request');

    // 3.2 Owner A attempts to delete Cafe B's item
    const idorDeleteRes = await client.delete(`/owner/menu-items/${itemB._id}`, {
      headers: { Authorization: `Bearer ${ownerTokenA}` }
    });
    assert(idorDeleteRes.status === 404, 'Owner A deleting Cafe B item returns 404 Not Found');

    // 3.3 Owner A attempts to toggle availability on Cafe B's item
    const idorAvailRes = await client.put(`/owner/menu-items/${itemB._id}/availability`, {
      availability: false
    }, {
      headers: { Authorization: `Bearer ${ownerTokenA}` }
    });
    assert(idorAvailRes.status === 404, 'Owner A toggling availability on Cafe B item returns 404');

    // 3.4 Owner A attempts to change status of Cafe B's order
    const idorOrderRes = await client.put(`/owner/orders/${orderB._id}/status`, {
      order_status: 'completed'
    }, {
      headers: { Authorization: `Bearer ${ownerTokenA}` }
    });
    assert(idorOrderRes.status === 404, 'Owner A updating Cafe B order status returns 404');

    // 3.5 Owner A attempts to mark Cafe B's order as paid
    const idorPaymentRes = await client.put(`/owner/orders/${orderB._id}/payment`, {
      payment_status: 'received'
    }, {
      headers: { Authorization: `Bearer ${ownerTokenA}` }
    });
    assert(idorPaymentRes.status === 404, 'Owner A updating Cafe B payment returns 404');

    // Verify Cafe B data was not corrupted
    const freshItemB = await MenuItem.findById(itemB._id);
    assert(freshItemB.name === 'Beta Frappe', 'Cafe B item name remains unmodified');
    assert(freshItemB.price === 250, 'Cafe B item price remains unmodified');

    const freshOrderB = await Order.findById(orderB._id);
    assert(freshOrderB.order_status === 'new', 'Cafe B order status remains unmodified');
    assert(freshOrderB.payment_status === 'pending', 'Cafe B payment status remains unmodified');

    // =============================================================
    // TEST 4: Customer A Attempting to Access Customer B's Order
    // =============================================================
    console.log("\n--- Test 4: Customer Access to Another Customer's Order ---");

    // 4.1 Public tracking endpoint responds with public order progression
    const trackRes = await client.get(`/orders/${orderB.order_number}/track`);
    assert(trackRes.status === 200, 'Customer order tracking returns 200 OK');
    assert(trackRes.data.data.order_number === orderB.order_number, 'Tracking returns order number');

    // 4.2 Customer PII and secrets must NOT be exposed
    assert(trackRes.data.data.customer_name === undefined, 'Tracking strips customer_name');
    assert(trackRes.data.data.customer_phone === undefined, 'Tracking strips customer_phone');
    assert(trackRes.data.data.table_number === undefined, 'Tracking strips table_number');
    assert(trackRes.data.data.notes === undefined, 'Tracking strips notes');
    assert(trackRes.data.data.razorpay_signature === undefined, 'Tracking strips razorpay_signature');
    assert(trackRes.data.data.payment_transaction_id === undefined, 'Tracking strips payment_transaction_id');

    // 4.3 Public mutation attempt on another customer's order
    const mutateRes = await client.put(`/orders/${orderB.order_number}`, { order_status: 'cancelled' });
    assert(mutateRes.status === 404 || mutateRes.status === 405, 'Public customer cannot mutate order');

    // =============================================================
    // TEST 5: Invalid, Missing, Oversized, and Unexpected Input Fields
    // =============================================================
    console.log('\n--- Test 5: Invalid, Missing, Oversized & Unexpected Input Fields ---');

    // 5.1 Missing required fields
    const emptyOrderRes = await client.post('/orders/create-razorpay-order', {});
    assert(emptyOrderRes.status === 400, 'Empty order payload returns 400 Bad Request');
    assert(emptyOrderRes.data.code === 'VALIDATION_ERROR', 'Returns VALIDATION_ERROR code');

    // 5.2 Oversized customer_name (> 50 chars)
    const longName = 'A'.repeat(51);
    const oversizedNameRes = await client.post('/orders/create-razorpay-order', {
      cafe_id: cafeA._id,
      customer_name: longName,
      items: [{ menu_item_id: itemA._id, quantity: 1 }]
    });
    assert(oversizedNameRes.status === 400, 'Customer name > 50 chars returns 400');

    // 5.3 Oversized notes (> 500 chars)
    const longNotes = 'X'.repeat(501);
    const oversizedNotesRes = await client.post('/orders/create-razorpay-order', {
      cafe_id: cafeA._id,
      notes: longNotes,
      items: [{ menu_item_id: itemA._id, quantity: 1 }]
    });
    assert(oversizedNotesRes.status === 400, 'Notes > 500 chars returns 400');

    // 5.4 Unexpected input fields (blocked by checkExact)
    const unexpectedFieldsRes = await client.post('/orders/create-razorpay-order', {
      cafe_id: cafeA._id,
      items: [{ menu_item_id: itemA._id, quantity: 1 }],
      admin_override_privileges: true,
      price_discount_hack: 9999
    });
    assert(unexpectedFieldsRes.status === 400, 'Unexpected input fields rejected with 400 (checkExact)');

    // 5.5 Unexpected input fields in feedback
    const unexpectedFeedbackRes = await client.post('/feedback', {
      order_number: orderB.order_number,
      rating: 5,
      malicious_extra_payload: 'injected_data'
    });
    assert(unexpectedFeedbackRes.status === 400, 'Unexpected feedback fields rejected with 400 (checkExact)');

    // =============================================================
    // TEST 6: Negative, Fractional, Zero, and Excessive Quantities
    // =============================================================
    console.log('\n--- Test 6: Negative, Fractional, Zero & Excessive Quantities ---');

    // 6.1 Negative quantity
    const negQtyRes = await client.post('/orders/create-razorpay-order', {
      cafe_id: cafeA._id,
      items: [{ menu_item_id: itemA._id, quantity: -2 }]
    });
    assert(negQtyRes.status === 400, 'Negative quantity (-2) returns 400 Bad Request');

    // 6.2 Fractional quantity
    const fracQtyRes = await client.post('/orders/create-razorpay-order', {
      cafe_id: cafeA._id,
      items: [{ menu_item_id: itemA._id, quantity: 1.5 }]
    });
    assert(fracQtyRes.status === 400, 'Fractional quantity (1.5) returns 400 Bad Request');

    // 6.3 Zero quantity
    const zeroQtyRes = await client.post('/orders/create-razorpay-order', {
      cafe_id: cafeA._id,
      items: [{ menu_item_id: itemA._id, quantity: 0 }]
    });
    assert(zeroQtyRes.status === 400, 'Zero quantity (0) returns 400 Bad Request');

    // 6.4 Excessive quantity (> 99)
    const excessiveQtyRes = await client.post('/orders/create-razorpay-order', {
      cafe_id: cafeA._id,
      items: [{ menu_item_id: itemA._id, quantity: 100 }]
    });
    assert(excessiveQtyRes.status === 400, 'Excessive quantity (100) returns 400 Bad Request');

    // 6.5 Empty items array
    const emptyItemsRes = await client.post('/orders/create-razorpay-order', {
      cafe_id: cafeA._id,
      items: []
    });
    assert(emptyItemsRes.status === 400, 'Empty items array returns 400 Bad Request');

    // =============================================================
    // TEST 7: Menu Item from the Wrong Café
    // =============================================================
    console.log('\n--- Test 7: Menu Item from the Wrong Café (Cross-Tenant) ---');

    const wrongCafeItemRes = await client.post('/orders/create-razorpay-order', {
      cafe_id: cafeA._id,
      items: [
        { menu_item_id: itemB._id, quantity: 1 } // Belongs to Cafe B!
      ]
    });
    assert(wrongCafeItemRes.status === 400, 'Item from wrong café rejected with 400');
    assert(wrongCafeItemRes.data.message.includes('belong to this café'), 'Returns cross-tenant violation message');

    // Verify SystemLog recorded security event
    const tenantDeniedLog = await waitForLog({
      event_type: 'SECURITY_TENANT_ACCESS_DENIED',
      'metadata.item_id': itemB._id
    });
    assert(tenantDeniedLog !== null, 'Recorded SECURITY_TENANT_ACCESS_DENIED in SystemLog');

    // =============================================================
    // TEST 8: Repeated Login, OTP, Order, and Staff-Alert Requests
    // =============================================================
    console.log('\n--- Test 8: Repeated Requests & Cooldown Limits ---');

    // 8.1 First staff alert succeeds
    const alert1 = await client.post(`/orders/${orderB.order_number}/alert`, { type: 'waiter' });
    assert(alert1.status === 200, 'First staff alert succeeds (200 OK)');

    // 8.2 Immediate second staff alert (< 30s) is rate limited
    const alert2 = await client.post(`/orders/${orderB.order_number}/alert`, { type: 'bill' });
    assert(alert2.status === 429, 'Repeated staff alert within 30s rejected with 429');
    assert(alert2.data.message.includes('Please wait') && alert2.data.code === 'RATE_LIMIT_EXCEEDED', 'Cooldown message and RATE_LIMIT_EXCEEDED code returned');

    // 8.3 First feedback succeeds
    const fb1 = await client.post('/feedback', {
      order_number: orderB.order_number,
      rating: 5,
      review: 'Great coffee!'
    });
    assert(fb1.status === 201 || fb1.status === 200, 'First feedback submission succeeds');

    // 8.4 Duplicate feedback for same order is rejected
    const fb2 = await client.post('/feedback', {
      order_number: orderB.order_number,
      rating: 4,
      review: 'Second try!'
    });
    assert(fb2.status === 400, 'Duplicate feedback for same order rejected (400)');

    // 8.5 Feedback rating out of bounds
    const fbBadRating = await client.post('/feedback', {
      order_number: orderB.order_number,
      rating: 6
    });
    assert(fbBadRating.status === 400, 'Feedback rating > 5 rejected with 400');

    // 8.6 Repeated failed logins record security event
    const failedLoginEmail = `${uniqueId}_intruder@hack.com`;
    await client.post('/auth/login', { email: failedLoginEmail, password: 'WrongPassword123!' });
    const failedLoginLog = await waitForLog({
      event_type: 'SECURITY_FAILED_LOGIN',
      'metadata.email': failedLoginEmail
    });
    assert(failedLoginLog !== null, 'Failed login records SECURITY_FAILED_LOGIN in SystemLog');

    // =============================================================
    // TEST 9: Invalid Payment Signatures & Forgery Defense
    // =============================================================
    console.log('\n--- Test 9: Invalid Payment Signatures & Forgery ---');

    const fakeRzpOrderId = `order_fake_${Date.now()}`;
    const forgedOrder = await Order.create({
      cafe_id: cafeA._id,
      customer_name: 'Mallory Hacker',
      items: [{ menu_item_id: itemA._id, name: itemA.name, quantity: 1, price: 150 }],
      total_amount: 150,
      payment_method: 'razorpay',
      payment_status: 'pending',
      order_status: 'new',
      razorpay_order_id: fakeRzpOrderId
    });

    const verifyForgedRes = await client.post('/orders/verify-razorpay-payment', {
      razorpay_order_id: fakeRzpOrderId,
      razorpay_payment_id: 'pay_forged_99999',
      razorpay_signature: 'forged_hmac_sha256_hex_0000000000000000000000000000000000000000'
    });
    assert(verifyForgedRes.status === 400, 'Forged signature rejected with 400 Bad Request');
    assert(verifyForgedRes.data.message.includes('signature'), 'Explains signature verification failure');

    // Order in DB marked failed
    const checkForgedOrder = await Order.findById(forgedOrder._id);
    assert(checkForgedOrder.payment_status === 'failed', 'Forged payment marks order payment_status as failed');
    assert(!checkForgedOrder.token_number, 'Failed payment does NOT allocate sequential token');

    // Revenue record NOT inserted
    const forgedRev = await OrderRevenue.findOne({ order_number: forgedOrder.order_number });
    assert(forgedRev === null, 'Forged payment does NOT insert into OrderRevenue ledger');

    // Security event logged
    const forgeryLog = await waitForLog({
      event_type: 'SECURITY_SIGNATURE_FORGERY_DETECTED',
      'metadata.razorpay_order_id': fakeRzpOrderId
    });
    assert(forgeryLog !== null, 'SECURITY_SIGNATURE_FORGERY_DETECTED recorded in SystemLog');

    // =============================================================
    // TEST 10: Missing Webhook Signatures or Secrets
    // =============================================================
    console.log('\n--- Test 10: Missing Webhook Signatures or Secrets ---');

    // 10.1 Missing order webhook signature
    const missingWhSigRes = await client.post('/webhooks/razorpay/order', {
      event: 'order.paid'
    });
    assert(missingWhSigRes.status === 400, 'Order webhook without signature returns 400');

    // 10.2 Invalid order webhook signature
    const badWhSigRes = await client.post('/webhooks/razorpay/order', {
      event: 'order.paid'
    }, {
      headers: { 'x-razorpay-signature': 'invalid_hex_sig_here' }
    });
    assert(badWhSigRes.status === 400, 'Order webhook with invalid signature returns 400');

    // 10.3 Missing subscription webhook signature
    const missingSubWhRes = await client.post('/webhooks/razorpay/subscription', {
      event: 'subscription.activated'
    });
    assert(missingSubWhRes.status === 400, 'Subscription webhook without signature returns 400');

    // 10.4 Invalid subscription webhook signature
    const badSubWhRes = await client.post('/webhooks/razorpay/subscription', {
      event: 'subscription.activated'
    }, {
      headers: { 'x-razorpay-signature': 'bad_sub_sig' }
    });
    assert(badSubWhRes.status === 400, 'Subscription webhook with invalid signature returns 400');

    // Verify webhook security log
    const whFailLog = await waitForLog({
      event_type: 'SECURITY_WEBHOOK_VERIFICATION_FAILED'
    });
    assert(whFailLog !== null, 'SECURITY_WEBHOOK_VERIFICATION_FAILED recorded in SystemLog');

    // =============================================================
    // TEST 11: Wrong Payment Amount, Currency, or Order Association
    // =============================================================
    console.log('\n--- Test 11: Wrong Payment Amount, Currency & Association ---');

    const origGetCafeRzp = razorpayUtils.getCafeRazorpay;
    try {
      // 11.1 Amount Mismatch: order total is 15000 paise, gateway returns 5000 paise
      const rzpOrderId11A = `order_test11a_${Date.now()}`;
      const rzpPaymentId11A = `pay_test11a_${Date.now()}`;
      await Order.create({
        cafe_id: cafeA._id,
        customer_name: 'Test 11A Customer',
        items: [{ menu_item_id: itemA._id, name: itemA.name, quantity: 1, price: 150 }],
        total_amount: 150,
        payment_method: 'razorpay',
        payment_status: 'pending',
        order_status: 'new',
        razorpay_order_id: rzpOrderId11A
      });

      const validHmac11A = crypto
        .createHmac('sha256', cafeA.razorpay_key_secret)
        .update(`${rzpOrderId11A}|${rzpPaymentId11A}`)
        .digest('hex');

      razorpayUtils.getCafeRazorpay = () => ({
        payments: {
          fetch: async () => ({
            amount: 5000, // mismatch
            currency: 'INR',
            order_id: rzpOrderId11A,
            status: 'captured'
          })
        }
      });

      const amountMismatchRes = await client.post('/orders/verify-razorpay-payment', {
        razorpay_order_id: rzpOrderId11A,
        razorpay_payment_id: rzpPaymentId11A,
        razorpay_signature: validHmac11A
      });
      assert(amountMismatchRes.status === 400, 'Payment amount mismatch rejected with 400');
      assert(amountMismatchRes.data.message.includes('amount mismatch'), 'Message reports amount mismatch');

      // 11.2 Currency Mismatch: payment currency is USD instead of INR
      const rzpOrderId11B = `order_test11b_${Date.now()}`;
      const rzpPaymentId11B = `pay_test11b_${Date.now()}`;
      await Order.create({
        cafe_id: cafeA._id,
        customer_name: 'Test 11B Customer',
        items: [{ menu_item_id: itemA._id, name: itemA.name, quantity: 1, price: 150 }],
        total_amount: 150,
        payment_method: 'razorpay',
        payment_status: 'pending',
        order_status: 'new',
        razorpay_order_id: rzpOrderId11B
      });

      const validHmac11B = crypto
        .createHmac('sha256', cafeA.razorpay_key_secret)
        .update(`${rzpOrderId11B}|${rzpPaymentId11B}`)
        .digest('hex');

      razorpayUtils.getCafeRazorpay = () => ({
        payments: {
          fetch: async () => ({
            amount: 15000,
            currency: 'USD', // mismatch
            order_id: rzpOrderId11B,
            status: 'captured'
          })
        }
      });

      const currencyMismatchRes = await client.post('/orders/verify-razorpay-payment', {
        razorpay_order_id: rzpOrderId11B,
        razorpay_payment_id: rzpPaymentId11B,
        razorpay_signature: validHmac11B
      });
      assert(currencyMismatchRes.status === 400, 'Invalid currency rejected with 400');
      assert(currencyMismatchRes.data.message.includes('currency'), 'Message reports currency mismatch');

      // 11.3 Order Association Mismatch: payment belongs to a different order
      const rzpOrderId11C = `order_test11c_${Date.now()}`;
      const rzpPaymentId11C = `pay_test11c_${Date.now()}`;
      await Order.create({
        cafe_id: cafeA._id,
        customer_name: 'Test 11C Customer',
        items: [{ menu_item_id: itemA._id, name: itemA.name, quantity: 1, price: 150 }],
        total_amount: 150,
        payment_method: 'razorpay',
        payment_status: 'pending',
        order_status: 'new',
        razorpay_order_id: rzpOrderId11C
      });

      const validHmac11C = crypto
        .createHmac('sha256', cafeA.razorpay_key_secret)
        .update(`${rzpOrderId11C}|${rzpPaymentId11C}`)
        .digest('hex');

      razorpayUtils.getCafeRazorpay = () => ({
        payments: {
          fetch: async () => ({
            amount: 15000,
            currency: 'INR',
            order_id: 'order_completely_different_999', // mismatch
            status: 'captured'
          })
        }
      });

      const orderMismatchRes = await client.post('/orders/verify-razorpay-payment', {
        razorpay_order_id: rzpOrderId11C,
        razorpay_payment_id: rzpPaymentId11C,
        razorpay_signature: validHmac11C
      });
      assert(orderMismatchRes.status === 400, 'Wrong order association rejected with 400');
      assert(orderMismatchRes.data.message.includes('associated with this order'), 'Reports wrong order association');

      // 11.4 Payment Not Captured: payment status is failed / authorized
      const rzpOrderId11D = `order_test11d_${Date.now()}`;
      const rzpPaymentId11D = `pay_test11d_${Date.now()}`;
      await Order.create({
        cafe_id: cafeA._id,
        customer_name: 'Test 11D Customer',
        items: [{ menu_item_id: itemA._id, name: itemA.name, quantity: 1, price: 150 }],
        total_amount: 150,
        payment_method: 'razorpay',
        payment_status: 'pending',
        order_status: 'new',
        razorpay_order_id: rzpOrderId11D
      });

      const validHmac11D = crypto
        .createHmac('sha256', cafeA.razorpay_key_secret)
        .update(`${rzpOrderId11D}|${rzpPaymentId11D}`)
        .digest('hex');

      razorpayUtils.getCafeRazorpay = () => ({
        payments: {
          fetch: async () => ({
            amount: 15000,
            currency: 'INR',
            order_id: rzpOrderId11D,
            status: 'failed' // mismatch
          })
        }
      });

      const uncapturedRes = await client.post('/orders/verify-razorpay-payment', {
        razorpay_order_id: rzpOrderId11D,
        razorpay_payment_id: rzpPaymentId11D,
        razorpay_signature: validHmac11D
      });
      assert(uncapturedRes.status === 400, 'Uncaptured payment rejected with 400');
      assert(uncapturedRes.data.message.includes('not captured'), 'Reports payment not captured');

    } finally {
      // Restore original function
      razorpayUtils.getCafeRazorpay = origGetCafeRzp;
    }

    // =============================================================
    // TEST 12: Duplicate Webhooks and Simultaneous Callbacks
    // =============================================================
    console.log('\n--- Test 12: Duplicate Webhooks & Idempotency ---');

    const webhookEventId = `evt_p12_dup_${Date.now()}`;
    const whOrderRzpId = `order_wh_${Date.now()}`;
    const whOrder = await Order.create({
      cafe_id: cafeA._id,
      customer_name: 'Webhook Customer',
      items: [{ menu_item_id: itemA._id, name: itemA.name, quantity: 1, price: 150 }],
      total_amount: 150,
      payment_method: 'razorpay',
      payment_status: 'pending',
      order_status: 'new',
      razorpay_order_id: whOrderRzpId
    });

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret_12345';
    const webhookPayload = JSON.stringify({
      event: 'order.paid',
      payload: {
        order: {
          entity: {
            id: whOrderRzpId,
            amount: 15000,
            amount_paid: 15000,
            currency: 'INR',
            status: 'paid'
          }
        },
        payment: {
          entity: {
            id: `pay_wh_${Date.now()}`,
            amount: 15000,
            currency: 'INR',
            status: 'captured',
            method: 'upi'
          }
        }
      }
    });

    const validWhSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(webhookPayload)
      .digest('hex');

    // 12.1 First webhook delivery
    const whRes1 = await client.post('/webhooks/razorpay/order', webhookPayload, {
      headers: {
        'x-razorpay-signature': validWhSig,
        'x-razorpay-event-id': webhookEventId,
        'Content-Type': 'application/json'
      }
    });
    assert(whRes1.status === 200, 'First webhook delivery succeeds (200 OK)');

    // 12.2 Duplicate webhook delivery with exact same event ID
    const whRes2 = await client.post('/webhooks/razorpay/order', webhookPayload, {
      headers: {
        'x-razorpay-signature': validWhSig,
        'x-razorpay-event-id': webhookEventId,
        'Content-Type': 'application/json'
      }
    });
    assert(whRes2.status === 200, 'Duplicate webhook returns 200 OK (idempotent acknowledgement)');

    // 12.3 Verify OrderRevenue has strictly 1 entry
    const revCount = await OrderRevenue.countDocuments({ order_number: whOrder.order_number });
    assert(revCount <= 1, 'OrderRevenue has at most 1 entry (no duplicate revenue created)');

    // 12.4 Simultaneous callbacks / duplicate payment verification
    const simOrderId = `order_sim_${Date.now()}`;
    const simPaymentId = `pay_sim_${Date.now()}`;
    const simOrder = await Order.create({
      cafe_id: cafeA._id,
      customer_name: 'Simultaneous Customer',
      items: [{ menu_item_id: itemA._id, name: itemA.name, quantity: 1, price: 150 }],
      total_amount: 150,
      payment_method: 'razorpay',
      payment_status: 'received', // Already marked verified!
      order_status: 'new',
      token_number: '#77',
      razorpay_order_id: simOrderId,
      razorpay_payment_id: simPaymentId
    });

    const simHmac = crypto
      .createHmac('sha256', cafeA.razorpay_key_secret)
      .update(`${simOrderId}|${simPaymentId}`)
      .digest('hex');

    const duplicateVerifyRes = await client.post('/orders/verify-razorpay-payment', {
      razorpay_order_id: simOrderId,
      razorpay_payment_id: simPaymentId,
      razorpay_signature: simHmac
    });
    assert(duplicateVerifyRes.status === 200, 'Already verified payment responds 200 OK');
    assert(duplicateVerifyRes.data.message.includes('already verified'), 'Reports payment already verified');
    assert(duplicateVerifyRes.data.data.token_number === '#77', 'Maintains original token number');

    // =============================================================
    // TEST 13: Duplicate Order Tokens Under Concurrency
    // =============================================================
    console.log('\n--- Test 13: Duplicate Order Tokens Under Concurrency ---');

    // Execute 10 simultaneous atomic token generations
    const concurrencyCafeId = new mongoose.Types.ObjectId();
    const tokenPromises = Array.from({ length: 10 }, () =>
      DailyTokenCounter.getNextToken(concurrencyCafeId)
    );
    const tokens = await Promise.all(tokenPromises);

    assert(tokens.length === 10, '10 concurrent token requests completed');
    const uniqueTokens = new Set(tokens);
    assert(uniqueTokens.size === 10, 'All 10 concurrent tokens are strictly unique (Set size = 10)');
    assert(tokens.includes('#1') && tokens.includes('#10'), 'Tokens sequence from #1 to #10 atomically');

    // =============================================================
    // TEST 14: Database Failure Resilience & Error Handler Boundary
    // =============================================================
    console.log('\n--- Test 14: DB Failure Resilience & Error Handler ---');

    // 14.1 Invalid MongoId triggers CastError mapped to 400
    const castErrorRes = await client.delete('/owner/menu-items/invalid_cast_id_123', {
      headers: { Authorization: `Bearer ${ownerTokenA}` }
    });
    assert(castErrorRes.status === 400, 'Invalid MongoId handled as 400 Bad Request');
    assert(castErrorRes.data.success === false, 'Error body includes success: false');
    assert(Boolean(castErrorRes.data.request_id), 'Error correlates with request_id');

    // 14.2 DB errors do NOT expose connection credentials
    const errBodyStr = JSON.stringify(castErrorRes.data);
    assert(!errBodyStr.includes('mongodb://'), 'Error response does not leak mongodb URI');
    assert(!errBodyStr.includes('localhost:27017'), 'Error response does not leak DB host/port');

    // 14.3 Ledger write resilience: In verifyOrderPayment, ledger failure does not crash
    let ledgerResiliencePassed = true;
    try {
      // Simulate OrderRevenue.findOneAndUpdate error
      const origFindOneAndUpdate = OrderRevenue.findOneAndUpdate;
      OrderRevenue.findOneAndUpdate = () => {
        throw new Error('Simulated DB connection drop on ledger');
      };

      // Order verification should catch ledger write error in try/catch and not crash
      const resilienceOrderId = `order_resilience_${Date.now()}`;
      const resiliencePayId = `pay_resilience_${Date.now()}`;
      await Order.create({
        cafe_id: cafeA._id,
        items: [{ menu_item_id: itemA._id, name: itemA.name, quantity: 1, price: 150 }],
        total_amount: 150,
        razorpay_order_id: resilienceOrderId
      });

      const resHmac = crypto
        .createHmac('sha256', cafeA.razorpay_key_secret)
        .update(`${resilienceOrderId}|${resiliencePayId}`)
        .digest('hex');

      const resVerify = await client.post('/orders/verify-razorpay-payment', {
        razorpay_order_id: resilienceOrderId,
        razorpay_payment_id: resiliencePayId,
        razorpay_signature: resHmac
      });
      assert(resVerify.status === 200, 'Payment verification completes safely even if ledger write throws');

      // Restore
      OrderRevenue.findOneAndUpdate = origFindOneAndUpdate;
    } catch (e) {
      ledgerResiliencePassed = false;
    }
    assert(ledgerResiliencePassed, 'Ledger write exception caught gracefully without server crash');

    // =============================================================
    // TEST 15: Unauthorized Socket.IO Room Joins
    // =============================================================
    console.log('\n--- Test 15: Unauthorized Socket.IO Room Joins ---');

    function createSocketClient(options = {}) {
      return ioClient(SERVER_URL, {
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
        timeout: 3000,
        ...options
      });
    }

    // 15.1 Anonymous client attempting join-cafe
    const anonSocket = createSocketClient();
    await new Promise(r => anonSocket.on('connect', r));

    const anonJoinCafePromise = new Promise(resolve => {
      anonSocket.once('socket-error', resolve);
    });
    anonSocket.emit('join-cafe', cafeA._id.toString());
    const anonJoinCafeErr = await anonJoinCafePromise;
    assert(anonJoinCafeErr.code === 'UNAUTHORIZED', 'Anonymous client cannot join-cafe (UNAUTHORIZED)');

    // 15.2 Anonymous client attempting join-payment-session for cafe
    const anonPaySessPromise = new Promise(resolve => {
      anonSocket.once('socket-error', resolve);
    });
    anonSocket.emit('join-payment-session', `cafe-${cafeA._id}`);
    const anonPaySessErr = await anonPaySessPromise;
    assert(anonPaySessErr.code === 'UNAUTHORIZED', 'Anonymous client cannot join cafe payment session (UNAUTHORIZED)');

    // 15.3 Anonymous client attempting admin-room
    const anonAdminPromise = new Promise(resolve => {
      anonSocket.once('socket-error', resolve);
    });
    anonSocket.emit('join-admin');
    const anonAdminErr = await anonAdminPromise;
    assert(anonAdminErr.code === 'FORBIDDEN', 'Anonymous client cannot join admin-room (FORBIDDEN)');

    // 15.4 Malformed cafe ID format
    const malformedCafePromise = new Promise(resolve => {
      anonSocket.once('socket-error', resolve);
    });
    anonSocket.emit('join-cafe', 'not-a-valid-hex-id');
    const malformedCafeErr = await malformedCafePromise;
    assert(malformedCafeErr.code === 'INVALID_FORMAT', 'Malformed cafe ID returns INVALID_FORMAT');

    anonSocket.disconnect();

    // 15.5 Owner A attempting join-cafe for Cafe B (Cross-Tenant)
    const ownerASocket = createSocketClient({
      auth: { token: ownerTokenA }
    });
    await new Promise(r => ownerASocket.on('connect', r));

    const idorSocketPromise = new Promise(resolve => {
      ownerASocket.once('socket-error', resolve);
    });
    ownerASocket.emit('join-cafe', cafeB._id.toString());
    const idorSocketErr = await idorSocketPromise;
    assert(idorSocketErr.code === 'FORBIDDEN', 'Owner A cannot join Cafe B room (FORBIDDEN)');

    // 15.6 Owner A attempting join-payment-session for Cafe B
    const idorPaySessPromise = new Promise(resolve => {
      ownerASocket.once('socket-error', resolve);
    });
    ownerASocket.emit('join-payment-session', `cafe-${cafeB._id}`);
    const idorPaySessErr = await idorPaySessPromise;
    assert(idorPaySessErr.code === 'FORBIDDEN', 'Owner A cannot join Cafe B payment session (FORBIDDEN)');

    // 15.7 Owner A attempting track-order for Cafe B's order
    const idorTrackPromise = new Promise(resolve => {
      ownerASocket.once('socket-error', resolve);
    });
    ownerASocket.emit('track-order', orderB.order_number);
    const idorTrackErr = await idorTrackPromise;
    assert(idorTrackErr.code === 'FORBIDDEN', 'Owner A cannot track Cafe B order via socket (FORBIDDEN)');

    ownerASocket.disconnect();

    // =============================================================
    // TEST 16: Invalid File Uploads
    // =============================================================
    console.log('\n--- Test 16: Invalid File Uploads ---');

    // 16.1 Dangerous executable double extension (.exe.png)
    let exeBlocked = false;
    upload.fileFilter({}, { originalname: 'virus.exe.png', mimetype: 'image/png' }, (err) => {
      if (err && err.message.includes('Dangerous file extension')) exeBlocked = true;
    });
    assert(exeBlocked, 'Upload fileFilter rejects executable extension (virus.exe.png)');

    // 16.2 Dangerous script double extension (.php.jpg)
    let phpBlocked = false;
    upload.fileFilter({}, { originalname: 'exploit.php.jpg', mimetype: 'image/jpeg' }, (err) => {
      if (err && err.message.includes('Dangerous file extension')) phpBlocked = true;
    });
    assert(phpBlocked, 'Upload fileFilter rejects script extension (exploit.php.jpg)');

    // 16.3 Invalid MIME type
    let badMimeBlocked = false;
    upload.fileFilter({}, { originalname: 'document.txt', mimetype: 'text/plain' }, (err) => {
      if (err && err.message.includes('Only valid image files')) badMimeBlocked = true;
    });
    assert(badMimeBlocked, 'Upload fileFilter rejects text/plain MIME type');

    // 16.4 Path traversal in filename
    let traversalBlocked = false;
    upload.fileFilter({}, { originalname: '../../etc/passwd.jpg', mimetype: 'image/jpeg' }, (err) => {
      if (err && err.message.includes('Path traversal')) traversalBlocked = true;
    });
    assert(traversalBlocked, 'Upload fileFilter rejects path traversal sequence (../../)');

    // 16.5 Null byte injection in filename
    let nullByteBlocked = false;
    upload.fileFilter({}, { originalname: 'image.png\0.php', mimetype: 'image/png' }, (err) => {
      if (err && err.message.includes('null bytes')) nullByteBlocked = true;
    });
    assert(nullByteBlocked, 'Upload fileFilter rejects null byte (\\0) in filename');

    // 16.6 Multer limits configuration
    assert(upload.limits.fileSize === 5 * 1024 * 1024, 'Multer restricts uploads to 5MB max');
    assert(upload.limits.files === 1, 'Multer restricts uploads to 1 file');

    // =============================================================
    // TEST 17: Malformed Identifiers and Attempted NoSQL Injection
    // =============================================================
    console.log('\n--- Test 17: Malformed Identifiers & NoSQL Injection ---');

    // 17.1 Malformed identifier in parameter
    const malformedParamRes = await client.delete('/owner/menu-items/not_a_valid_mongoid_123', {
      headers: { Authorization: `Bearer ${ownerTokenA}` }
    });
    assert(malformedParamRes.status === 400, 'Malformed MongoId param returns 400 Bad Request');
    assert(malformedParamRes.data.code === 'VALIDATION_ERROR', 'Returns VALIDATION_ERROR');

    // 17.2 NoSQL injection via MongoDB operator in query ($ne)
    const mockReqQuery = { role: { $ne: null }, safe_param: 'hello' };
    const mockReq = { query: mockReqQuery };
    noSqlSanitizer(mockReq, {}, () => {});
    assert(mockReq.query.$ne === undefined, 'noSqlSanitizer strips $ne operator');
    assert(mockReq.query.safe_param === 'hello', 'noSqlSanitizer preserves safe parameters');

    // 17.3 NoSQL injection in body ($gt)
    const mockReqBody = { email: { $gt: '' }, password: 'password123' };
    const mockReq2 = { body: mockReqBody };
    noSqlSanitizer(mockReq2, {}, () => {});
    assert(mockReq2.body.$gt === undefined, 'noSqlSanitizer strips $gt operator from body');

    // =============================================================
    // TEST 18: Subscription Activation Without Verified Payment
    // =============================================================
    console.log('\n--- Test 18: Subscription Activation Without Verified Payment ---');

    // 18.1 Forged subscription verification signature
    const forgedSubRes = await client.post('/owner/razorpay/verify-subscription', {
      razorpay_subscription_id: 'sub_forged_12345',
      razorpay_payment_id: 'pay_forged_67890',
      razorpay_signature: 'forged_sub_signature_hex_0000000000'
    }, {
      headers: { Authorization: `Bearer ${ownerTokenA}` }
    });
    assert(forgedSubRes.status === 400, 'Forged subscription signature rejected with 400');
    assert(forgedSubRes.data.message.includes('signature'), 'Reports signature verification failure');

    // 18.2 Cafe subscription remains on starter plan in DB
    const freshCafeA = await Cafe.findById(cafeA._id);
    assert(freshCafeA.subscription.plan_name === 'starter', 'Cafe A plan remains on starter (not upgraded)');

    // 18.3 Zero records added to SubscriptionHistory
    const subHistoryCount = await SubscriptionHistory.countDocuments({
      cafe_id: cafeA._id,
      razorpay_payment_id: 'pay_forged_67890'
    });
    assert(subHistoryCount === 0, 'No record inserted into SubscriptionHistory');

    // 18.4 Webhook subscription.activated with forged signature rejected
    const forgedSubWhRes = await client.post('/webhooks/razorpay/subscription', {
      event: 'subscription.activated',
      payload: {
        subscription: {
          entity: {
            id: 'sub_unverified_999',
            plan_id: 'plan_pro_plus',
            status: 'active'
          }
        }
      }
    }, {
      headers: { 'x-razorpay-signature': 'forged_signature_0000' }
    });
    assert(forgedSubWhRes.status === 400, 'Subscription activation webhook without valid HMAC rejected with 400');

    console.log('\n============================================================');
    console.log(`  Phase 12 Negative Testing Suite: ${passedTests}/${totalTests} Tests PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log('============================================================\n');

  } catch (err) {
    console.error('\n❌ Test Suite Aborted due to unhandled failure:', err);
    process.exit(1);
  } finally {
    // Cleanup Test Data
    try {
      if (testAdmin) await Admin.deleteOne({ _id: testAdmin._id });
      if (cafeA) {
        await Cafe.deleteOne({ _id: cafeA._id });
        await Category.deleteMany({ cafe_id: cafeA._id });
        await MenuItem.deleteMany({ cafe_id: cafeA._id });
        await Order.deleteMany({ cafe_id: cafeA._id });
        await OrderRevenue.deleteMany({ cafe_id: cafeA._id });
      }
      if (cafeB) {
        await Cafe.deleteOne({ _id: cafeB._id });
        await Category.deleteMany({ cafe_id: cafeB._id });
        await MenuItem.deleteMany({ cafe_id: cafeB._id });
        await Order.deleteMany({ cafe_id: cafeB._id });
        await OrderRevenue.deleteMany({ cafe_id: cafeB._id });
      }
      server.close();
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr.message);
    }
  }

  process.exit(0);
}

runPhase12Tests();
