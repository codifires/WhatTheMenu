const mongoose = require('mongoose');
const http = require('http');
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Cafe = require('./models/Cafe');
const Category = require('./models/Category');
const MenuItem = require('./models/MenuItem');
const Order = require('./models/Order');
const Admin = require('./models/Admin');
const SupportTicket = require('./models/SupportTicket');
const { generateToken } = require('./utils/jwt');
const { noSqlSanitizer } = require('./middleware/noSqlSanitizer');
const { errorHandler } = require('./middleware/errorHandler');

// Setup express test app with identical middleware as server.js
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(noSqlSanitizer);

// Register routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/menu', require('./routes/menuRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/owner', require('./routes/ownerRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/support', require('./routes/supportRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api', require('./routes/razorpayRoutes'));

// Global error handler
app.use(errorHandler);

const TEST_PORT = 5096;
let server;

// Helper to make HTTP requests
const request = ({ method, path, headers = {}, body }) => {
  return new Promise((resolve, reject) => {
    const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const reqHeaders = {
      ...headers,
      ...(payload && !headers['Content-Type'] && { 'Content-Type': 'application/json' }),
      ...(payload && { 'Content-Length': Buffer.byteLength(payload) })
    };

    const req = http.request(
      {
        hostname: 'localhost',
        port: TEST_PORT,
        path,
        method,
        headers: reqHeaders
      },
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data, headers: res.headers });
          }
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
};

const assert = (condition, message) => {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✅ PASSED: ${message}`);
};

async function runPhase4Tests() {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB connected');

  server = app.listen(TEST_PORT, () => {
    console.log(`🚀 Validation test server running on port ${TEST_PORT}\n`);
  });

  const uniqueSuffix = Date.now();
  let testCafe, testCategory, testMenuItem, ownerToken, adminToken;

  try {
    // 0. Setup test entities
    testCafe = await Cafe.create({
      name: `Validation Cafe ${uniqueSuffix}`,
      email: `val_cafe_${uniqueSuffix}@example.com`,
      password: 'password123',
      phone: '9876543210',
      address: 'Validation Lane',
      subscription_status: 'active',
      is_active: true,
      tax_percentage: 5
    });
    ownerToken = generateToken(testCafe._id, 'owner');
    testCafe.active_sessions = [{ token: ownerToken, last_active: Date.now() }];
    await testCafe.save({ validateBeforeSave: false });

    let admin = await Admin.findOne({ email: 'admin@qrmenu.com' });
    if (!admin) {
      admin = await Admin.create({
        name: 'Super Admin',
        email: 'admin@qrmenu.com',
        password: 'adminpassword',
        role: 'superadmin'
      });
    }
    adminToken = generateToken(admin._id, 'superadmin');

    testCategory = await Category.create({
      name: `Drinks ${uniqueSuffix}`,
      cafe_id: testCafe._id,
      sort_order: 1
    });

    testMenuItem = await MenuItem.create({
      name: `Coffee ${uniqueSuffix}`,
      cafe_id: testCafe._id,
      category_id: testCategory._id,
      price: 150,
      availability: true
    });

    // =========================================================================
    console.log('🛡️  TEST 1: NoSQL Injection Sanitizer Protection ($ and . stripping)');
    // =========================================================================
    const injectionRes = await request({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        email: { $gt: '' }, // Injected NoSQL query operator
        password: 'password123'
      }
    });
    assert(injectionRes.status === 400, 'Injected NoSQL query object in login rejected with 400');
    assert(injectionRes.data.success === false, 'Validation error returned for invalid email type');

    // =========================================================================
    console.log('\n🛡️  TEST 2: Strict checkExact Field Allowlists (Reject unexpected fields)');
    // =========================================================================
    const orderStatusTamperRes = await request({
      method: 'PUT',
      path: `/api/owner/orders/${new mongoose.Types.ObjectId()}/status`,
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: {
        order_status: 'preparing',
        injected_role: 'admin',      // Unexpected field
        total_amount: 0              // Tamper attempt
      }
    });
    assert(orderStatusTamperRes.status === 400, 'Order status update with unexpected fields rejected with 400');
    assert(orderStatusTamperRes.data.message.includes('Unknown') || orderStatusTamperRes.data.errors.some(e => e.message.includes('unknown') || e.message.includes('Unknown')), 'Error mentions unknown/unexpected field rejection');

    // Check exact on auth register
    const registerTamperRes = await request({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        name: 'Hacker Cafe',
        email: `hacker_${uniqueSuffix}@example.com`,
        password: 'password123',
        phone: '9876543210',
        address: 'Darknet Alley',
        role: 'superadmin',       // Privilege escalation attempt
        is_active: true
      }
    });
    assert(registerTamperRes.status === 400, 'Registration with unexpected fields (role) rejected with 400');

    // =========================================================================
    console.log('\n🛡️  TEST 3: MongoDB ObjectId Parameter Validation');
    // =========================================================================
    const malformedIdRes = await request({
      method: 'DELETE',
      path: '/api/owner/categories/invalid_mongo_id_123',
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    assert(malformedIdRes.status === 400, 'Malformed MongoDB ID parameter rejected with 400');
    assert(malformedIdRes.data.message === 'Valid MongoDB ID required' || malformedIdRes.data.errors?.some(e => e.field === 'id'), 'Clean validation message returned for malformed ID');

    const malformedAdminIdRes = await request({
      method: 'GET',
      path: '/api/admin/cafes/not-an-object-id',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(malformedAdminIdRes.status === 400, 'Admin route with malformed MongoId parameter rejected with 400');

    // =========================================================================
    console.log('\n🛡️  TEST 4: Pricing & Total Amount Truth Enforcement (Never trust client prices)');
    // =========================================================================
    const placeOrderRes = await request({
      method: 'POST',
      path: '/api/orders',
      body: {
        cafe_id: testCafe._id.toString(),
        customer_name: 'Bob',
        items: [
          {
            menu_item_id: testMenuItem._id.toString(),
            quantity: 2,
            price: 1 // Client claims price is ₹1 instead of real ₹150
          }
        ]
      }
    });
    assert(placeOrderRes.status === 201, 'Order placed successfully');
    // Real price: 150 * 2 = 300, plus 5% tax = 315
    assert(placeOrderRes.data.data.total_amount === 315, `Order total is computed from DB truth (₹315), ignoring client-supplied ₹1 (Total: ₹${placeOrderRes.data.data.total_amount})`);

    // =========================================================================
    console.log('\n🛡️  TEST 5: Number Ranges, String Lengths & Array Size Boundaries');
    // =========================================================================
    // Array min 1 item
    const emptyItemsRes = await request({
      method: 'POST',
      path: '/api/orders',
      body: {
        cafe_id: testCafe._id.toString(),
        items: []
      }
    });
    assert(emptyItemsRes.status === 400, 'Empty items array in order rejected with 400');

    // Quantity range boundary (e.g. quantity 0 or > 99)
    const invalidQtyRes = await request({
      method: 'POST',
      path: '/api/orders',
      body: {
        cafe_id: testCafe._id.toString(),
        items: [
          {
            menu_item_id: testMenuItem._id.toString(),
            quantity: 0
          }
        ]
      }
    });
    assert(invalidQtyRes.status === 400, 'Item quantity 0 rejected with 400');

    // Rating range boundary (1..5)
    const invalidRatingRes = await request({
      method: 'POST',
      path: '/api/feedback',
      body: {
        order_number: 'ORD-12345678',
        rating: 10 // Out of bounds
      }
    });
    assert(invalidRatingRes.status === 400, 'Feedback rating out of bounds (10) rejected with 400');

    // =========================================================================
    console.log('\n🛡️  TEST 6: Formatted Values (Email, Phone, UPI ID, URLs)');
    // =========================================================================
    const invalidUpiRes = await request({
      method: 'PUT',
      path: '/api/owner/settings',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: {
        upi_id: 'invalid-upi-without-at'
      }
    });
    assert(invalidUpiRes.status === 400, 'Malformed UPI ID rejected with 400');

    const invalidMenuImageUrlRes = await request({
      method: 'POST',
      path: '/api/owner/menu-items',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: {
        name: 'Espresso',
        price: 90,
        category_id: testCategory._id.toString(),
        image_url: 'javascript:alert(1)' // Malicious non-http URL
      }
    });
    assert(invalidMenuImageUrlRes.status === 400, 'Dangerous non-http image_url rejected with 400');

    // =========================================================================
    console.log('\n🛡️  TEST 7: Enum Values & State Transitions');
    // =========================================================================
    const invalidStatusRes = await request({
      method: 'PUT',
      path: `/api/owner/orders/${new mongoose.Types.ObjectId()}/status`,
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: {
        order_status: 'non_existent_status'
      }
    });
    assert(invalidStatusRes.status === 400, 'Invalid enum order_status rejected with 400');

    const invalidPaymentStatusRes = await request({
      method: 'PUT',
      path: `/api/owner/orders/${new mongoose.Types.ObjectId()}/payment`,
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: {
        payment_status: 'forged_status'
      }
    });
    assert(invalidPaymentStatusRes.status === 400, 'Invalid enum payment_status rejected with 400');

    // =========================================================================
    console.log('\n🛡️  TEST 8: Request Body Size Limit Enforcement (> 1MB returns 413)');
    // =========================================================================
    const hugePayload = JSON.stringify({
      email: 'user@example.com',
      password: 'password123',
      bloat: 'A'.repeat(1.2 * 1024 * 1024) // 1.2MB payload
    });

    const largeBodyRes = await request({
      method: 'POST',
      path: '/api/auth/login',
      body: hugePayload
    });
    assert(largeBodyRes.status === 413, `Payload exceeding 1MB limit rejected with 413 Payload Too Large (Got: ${largeBodyRes.status})`);
    assert(largeBodyRes.data.message.includes('payload too large') || largeBodyRes.data.message.includes('1MB'), 'Error message clearly specifies 1MB payload limitation');

    // =========================================================================
    console.log('\n🛡️  TEST 9: Filtering, Pagination & Date Range Validation');
    // =========================================================================
    const invalidDateQueryRes = await request({
      method: 'GET',
      path: '/api/owner/orders?date=invalid-date-format',
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    assert(invalidDateQueryRes.status === 400, 'Invalid order date query parameter rejected with 400');

    const invalidLimitQueryRes = await request({
      method: 'GET',
      path: '/api/owner/orders?limit=999999', // Exceeds max 100 limit
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    assert(invalidLimitQueryRes.status === 400, 'Pagination limit exceeding maximum 100 rejected with 400');

    // =========================================================================
    console.log('\n🛡️  TEST 10: Razorpay Payment & Subscription Strict Validation');
    // =========================================================================
    const invalidRzpSubRes = await request({
      method: 'POST',
      path: '/api/owner/razorpay/create-subscription',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: {
        plan_name: 'unauthorized_super_plan' // Invalid plan
      }
    });
    assert(invalidRzpSubRes.status === 400, 'Invalid Razorpay subscription plan rejected with 400');

    const invalidRzpVerifyRes = await request({
      method: 'POST',
      path: '/api/orders/verify-razorpay-payment',
      body: {
        razorpay_order_id: 'order_123',
        // Missing payment_id and signature
      }
    });
    assert(invalidRzpVerifyRes.status === 400, 'Incomplete Razorpay verification payload rejected with 400');

    // =========================================================================
    console.log('\n🛡️  TEST 11: Support Ticket Validation');
    // =========================================================================
    const invalidTicketRes = await request({
      method: 'POST',
      path: '/api/support/owner/tickets',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: {
        subject: 'Hi', // Too short (min 3)
        description: 'No' // Too short (min 5)
      }
    });
    assert(invalidTicketRes.status === 400, 'Ticket with fields below min string length rejected with 400');

    // =========================================================================
    console.log('\n🛡️  TEST 12: URL Parameters & Identifier Format Validation');
    // =========================================================================
    const invalidMenuParamRes = await request({
      method: 'GET',
      path: '/api/menu/invalid!@#$slug'
    });
    assert(invalidMenuParamRes.status === 400, 'Menu route with invalid cafeId characters rejected with 400');

    const invalidTrackParamRes = await request({
      method: 'GET',
      path: '/api/orders/order*with*bad*chars/track'
    });
    assert(invalidTrackParamRes.status === 400, 'Order tracking with invalid orderNumber characters rejected with 400');

    // =========================================================================
    console.log('\n🛡️  TEST 13: Category & Menu Item Validation Bounds');
    // =========================================================================
    const shortCategoryRes = await request({
      method: 'POST',
      path: '/api/owner/categories',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: { name: 'A' } // Min length is 2
    });
    assert(shortCategoryRes.status === 400, 'Category name below minimum length 2 rejected with 400');

    const invalidPriceRes = await request({
      method: 'POST',
      path: '/api/owner/menu-items',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: {
        name: 'Free Water',
        price: -5, // Price must be > 0
        category_id: testCategory._id.toString()
      }
    });
    assert(invalidPriceRes.status === 400, 'Negative menu item price rejected with 400');

  } finally {
    console.log('\n🧹 [CLEANUP] Cleaning test entities...');
    if (testCafe) await Cafe.findByIdAndDelete(testCafe._id);
    if (testCategory) await Category.findByIdAndDelete(testCategory._id);
    if (testMenuItem) await MenuItem.findByIdAndDelete(testMenuItem._id);
    await Order.deleteMany({ cafe_id: testCafe?._id });

    if (server) server.close();
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }

  console.log('\n========================================================================');
  console.log('🎉 ALL PHASE 4 VALIDATION SUITE TESTS PASSED 100%! 🚀');
  console.log('========================================================================');
}

runPhase4Tests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
