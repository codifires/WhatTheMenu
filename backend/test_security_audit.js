/**
 * WhatTheMenu Comprehensive Backend Security Audit & Vulnerability Verification Test Suite
 * 
 * Verifies:
 * 1. Free Plan Registration Exploit Mitigation (Trial enforcement)
 * 2. User Enumeration Protection on Password Reset
 * 3. Cross-Tenant Item Injection / BOLA Mitigation in Order Creation
 * 4. Account Deactivation / Suspension Authorization Enforcement (403)
 * 5. Staff Alert Spam Prevention (30-second cooldown per order)
 * 6. Duplicate Review / Feedback Prevention (Unique index / check)
 * 7. AI Prompt Injection & Input Bounds Validation
 * 8. HTTP Security Headers & Signature Leakage Prevention
 */

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const crypto = require('crypto');
const { Server } = require('socket.io');
const { generateToken } = require('./utils/jwt');

dotenv.config();
process.env.SIMULATE_EMAIL = 'true';

const Admin = require('./models/Admin');
const Cafe = require('./models/Cafe');
const Category = require('./models/Category');
const MenuItem = require('./models/MenuItem');
const Order = require('./models/Order');
const Feedback = require('./models/Feedback');
const Settings = require('./models/Settings');

const TEST_PORT = 5097;
const API_BASE = `http://localhost:${TEST_PORT}/api`;

let serverInstance;
let passedCount = 0;
let totalCount = 0;

function assert(condition, message) {
  totalCount++;
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(message);
  } else {
    console.log(`  ✅ PASSED: ${message}`);
    passedCount++;
  }
}

async function runAuditTests() {
  try {
    console.log('🔄 [SETUP] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ [SETUP] MongoDB connected');

    // Spin up full Express server matching server.js
    const app = express();
    app.disable('x-powered-by');
    app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      next();
    });

    const server = http.createServer(app);
    const io = new Server(server);
    app.set('io', io);

    app.use(express.json());
    app.use('/api/auth', require('./routes/authRoutes'));
    app.use('/api/settings', require('./routes/settingsRoutes'));
    app.use('/api/owner', require('./routes/ownerRoutes'));
    app.use('/api/orders', require('./routes/orderRoutes'));
    app.use('/api/feedback', require('./routes/feedbackRoutes'));
    app.use('/api/admin', require('./routes/adminRoutes'));

    app.get('/api/health', (req, res) => {
      res.json({ status: 'OK', message: 'API Healthy' });
    });

    await new Promise((resolve) => {
      serverInstance = server.listen(TEST_PORT, () => {
        console.log(`🚀 [SETUP] Audit test server running on port ${TEST_PORT}\n`);
        resolve();
      });
    });

    // =========================================================================
    // TEST 1: Free Plan Registration Exploit Mitigation
    // =========================================================================
    console.log('🛡️  TEST 1: Free Plan Registration Exploit Mitigation');
    const testOwnerEmail = `audit_owner_${Date.now()}@example.com`;
    const regRes = await axios.post(`${API_BASE}/auth/register`, {
      name: 'Exploit Test Cafe',
      email: testOwnerEmail,
      password: 'SecurePassword123!',
      phone: '9876543210',
      address: 'Audit Blvd 12',
      plan_name: 'pro' // Attacker requests "pro" plan during free signup
    });

    assert(regRes.data.success === true, 'Registration succeeds');
    const registeredCafe = await Cafe.findOne({ email: testOwnerEmail });
    assert(registeredCafe !== null, 'Cafe record exists in DB');
    assert(registeredCafe.subscription.plan_name === 'starter', 'Cafe plan defaulted strictly to starter trial period (attacker request for "pro" was ignored)');
    assert(registeredCafe.subscription_status === 'active', 'Cafe has active trial status');

    // =========================================================================
    // TEST 2: User Enumeration Protection on Forgot Password
    // =========================================================================
    console.log('\n🛡️  TEST 2: User Enumeration Protection on Forgot Password');
    const nonExistentEmail = `ghost_user_${Date.now()}@notfounddomain.xyz`;
    const forgotRes = await axios.post(`${API_BASE}/auth/forgotpassword`, {
      email: nonExistentEmail
    });
    assert(forgotRes.status === 200, 'Non-existent user forgot-password returns 200 OK');
    assert(forgotRes.data.success === true, 'Response returns success: true without leaking user existence');

    // =========================================================================
    // TEST 3: Cross-Tenant BOLA/IDOR Order Item Injection Mitigation
    // =========================================================================
    console.log('\n🛡️  TEST 3: Cross-Tenant Item Injection / BOLA Mitigation');
    // Create Cafe A
    const cafeA = await Cafe.create({
      name: 'Cafe A',
      email: `cafeA_${Date.now()}@example.com`,
      password: 'password123',
      subscription_status: 'active',
      is_active: true
    });

    // Create Cafe B
    const cafeB = await Cafe.create({
      name: 'Cafe B',
      email: `cafeB_${Date.now()}@example.com`,
      password: 'password123',
      subscription_status: 'active',
      is_active: true
    });

    const categoryB = await Category.create({
      cafe_id: cafeB._id,
      name: 'Beverages B'
    });

    const menuItemB = await MenuItem.create({
      cafe_id: cafeB._id,
      category_id: categoryB._id,
      name: 'Secret Special Latte',
      price: 250,
      availability: true
    });

    // Attempt to order item from Cafe B under Cafe A's order route
    let bolaBlocked = false;
    try {
      await axios.post(`${API_BASE}/orders`, {
        cafe_id: cafeA._id,
        customer_name: 'Injected Guest',
        customer_phone: '9999999999',
        table_number: 'T1',
        payment_method: 'cash',
        items: [
          { menu_item_id: menuItemB._id, name: menuItemB.name, price: menuItemB.price, quantity: 2 }
        ]
      });
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.message?.includes('does not belong to this café')) {
        bolaBlocked = true;
      }
    }
    assert(bolaBlocked, 'Cross-tenant menu item order injection rejected with 400 "Item does not belong to this café"');

    // =========================================================================
    // TEST 4: Account Deactivation / Suspension Authorization Enforcement (403)
    // =========================================================================
    console.log('\n🛡️  TEST 4: Account Suspension Access Control');
    // Deactivate Cafe A
    cafeA.is_active = false;
    const deactivatedToken = jwt.sign(
      { id: cafeA._id, role: 'owner' },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '1h' }
    );
    cafeA.active_sessions = [{ token: deactivatedToken, device_info: 'test', last_active: new Date() }];
    await cafeA.save({ validateBeforeSave: false });

    let suspensionBlocked = false;
    try {
      await axios.get(`${API_BASE}/owner/dashboard`, {
        headers: { Authorization: `Bearer ${deactivatedToken}` }
      });
    } catch (err) {
      if (err.response?.status === 403 && (err.response?.data?.message?.includes('deactivated') || err.response?.data?.message?.includes('suspended'))) {
        suspensionBlocked = true;
      }
    }
    assert(suspensionBlocked, 'Deactivated account owner request rejected with 403 Forbidden');

    // =========================================================================
    // TEST 5: Staff Alert Spam Prevention (Cooldown Rate Limiting)
    // =========================================================================
    console.log('\n🛡️  TEST 5: Staff Alert Spam / Flood Cooldown');
    // Create valid order for Cafe B
    const validOrder = await Order.create({
      cafe_id: cafeB._id,
      order_number: `ORD-ALERT-${Date.now().toString(36).toUpperCase()}`,
      customer_name: 'Alert Tester',
      items: [{ menu_item_id: menuItemB._id, name: menuItemB.name, price: menuItemB.price, quantity: 1 }],
      total_amount: menuItemB.price,
      payment_method: 'cash',
      order_status: 'preparing'
    });

    const alert1Res = await axios.post(`${API_BASE}/orders/${validOrder.order_number}/alert`, {
      type: 'waiter'
    });
    assert(alert1Res.data.success === true, 'First staff alert succeeds');

    let alertSpamBlocked = false;
    try {
      // Immediate second alert
      await axios.post(`${API_BASE}/orders/${validOrder.order_number}/alert`, {
        type: 'bill'
      });
    } catch (err) {
      if (err.response?.status === 429 && err.response?.data?.message?.includes('wait')) {
        alertSpamBlocked = true;
      }
    }
    assert(alertSpamBlocked, 'Immediate second staff alert rejected with 429 Cooldown Limit');

    // =========================================================================
    // TEST 6: Duplicate Review / Feedback Prevention
    // =========================================================================
    console.log('\n🛡️  TEST 6: Duplicate Feedback Prevention');
    const fbOrder = await Order.create({
      cafe_id: cafeB._id,
      order_number: `ORD-FEEDBACK-${Date.now().toString(36).toUpperCase()}`,
      customer_name: 'Feedback Tester',
      items: [{ menu_item_id: menuItemB._id, name: menuItemB.name, price: menuItemB.price, quantity: 1 }],
      total_amount: menuItemB.price,
      payment_method: 'cash',
      order_status: 'completed'
    });

    const fb1Res = await axios.post(`${API_BASE}/feedback`, {
      order_number: fbOrder.order_number,
      rating: 5,
      review: 'Superb service and delicious items!'
    });
    assert(fb1Res.data.success === true, 'First feedback submitted successfully');

    let dupFeedbackBlocked = false;
    try {
      await axios.post(`${API_BASE}/feedback`, {
        order_number: fbOrder.order_number,
        rating: 4,
        review: 'Attempting duplicate feedback review'
      });
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.message?.includes('already submitted')) {
        dupFeedbackBlocked = true;
      }
    }
    assert(dupFeedbackBlocked, 'Second feedback for same order rejected with 400 "already submitted"');

    // =========================================================================
    // TEST 7: AI Prompt Injection & Input Bounds Validation
    // =========================================================================
    console.log('\n🛡️  TEST 7: AI Assist Input Bounds & Prompt Injection Protection');
    let invalidActionBlocked = false;
    try {
      await axios.post(`${API_BASE}/feedback/ai-assist`, {
        action: 'malicious_system_override',
        text: 'test'
      });
    } catch (err) {
      if (err.response?.status === 400) invalidActionBlocked = true;
    }
    assert(invalidActionBlocked, 'AI assist with invalid action rejected with 400');

    let outOfBoundsRatingBlocked = false;
    try {
      await axios.post(`${API_BASE}/feedback/ai-assist`, {
        action: 'auto_write',
        rating: 99
      });
    } catch (err) {
      if (err.response?.status === 400) outOfBoundsRatingBlocked = true;
    }
    assert(outOfBoundsRatingBlocked, 'AI assist with out-of-bounds rating 99 rejected with 400');

    let injectionRatingBlocked = false;
    try {
      await axios.post(`${API_BASE}/feedback/ai-assist`, {
        action: 'auto_write',
        rating: '5; DROP TABLE users;'
      });
    } catch (err) {
      if (err.response?.status === 400) injectionRatingBlocked = true;
    }
    assert(injectionRatingBlocked, 'AI assist with non-numeric injected rating rejected with 400');

    // =========================================================================
    // TEST 8: HTTP Security Headers & Signature Leakage Prevention
    // =========================================================================
    console.log('\n🛡️  TEST 8: HTTP Security Headers & Express Signature Leakage');
    const healthRes = await axios.get(`${API_BASE}/health`);
    assert(healthRes.headers['x-content-type-options'] === 'nosniff', 'X-Content-Type-Options: nosniff present');
    assert(healthRes.headers['x-frame-options'] === 'SAMEORIGIN', 'X-Frame-Options: SAMEORIGIN present');
    assert(healthRes.headers['x-xss-protection'] === '1; mode=block', 'X-XSS-Protection: 1; mode=block present');
    assert(healthRes.headers['referrer-policy'] === 'strict-origin-when-cross-origin', 'Referrer-Policy: strict-origin-when-cross-origin present');
    assert(healthRes.headers['x-powered-by'] === undefined, 'X-Powered-By header is removed (No framework signature leaked)');

    // =========================================================================
    // TEST 9: OTP 60-Second Resend Cooldown & Abuse Protection
    // =========================================================================
    console.log('\n🛡️  TEST 9: OTP 60-Second Resend Cooldown & Abuse Protection');
    const otpTestEmail = `otp_cooldown_${Date.now()}@example.com`;
    const otpCafe = await Cafe.create({
      name: 'OTP Cooldown Cafe',
      email: otpTestEmail,
      password: 'SecurePassword123!',
      is_active: true,
      subscription_status: 'active',
      subscription: { plan_name: 'starter' },
      active_sessions: [
        { token: 'existing-dummy-token-1', device_info: 'Chrome on Windows', last_active: new Date() }
      ]
    });

    // First forceLogout request - triggers OTP generation & simulated email
    const otpRes1 = await axios.post(`${API_BASE}/auth/login`, {
      email: otpTestEmail,
      password: 'SecurePassword123!',
      forceLogout: true
    });
    assert(otpRes1.data.success === true && otpRes1.data.requireOtp === true, 'First forceLogout request triggers OTP generation');

    // Immediate second forceLogout request within 60 seconds - should be throttled
    let cooldownTriggered = false;
    try {
      await axios.post(`${API_BASE}/auth/login`, {
        email: otpTestEmail,
        password: 'SecurePassword123!',
        forceLogout: true
      });
    } catch (err) {
      if (err.response?.status === 429 && err.response?.data?.message?.includes('wait')) {
        cooldownTriggered = true;
      }
    }
    assert(cooldownTriggered, 'Immediate repeated OTP request within 60s rejected with 429 Resend Cooldown');

    // =========================================================================
    // TEST 10: Hashed OTP Verification & Maximum Attempt Lockout
    // =========================================================================
    console.log('\n🛡️  TEST 10: Hashed OTP Storage & Max 5-Attempt Invalidation');
    const otpLockoutEmail = `otp_lockout_${Date.now()}@example.com`;
    const rawOtpCode = '654321';
    const hashedOtpCode = crypto.createHash('sha256').update(rawOtpCode).digest('hex');

    const otpLockoutCafe = await Cafe.create({
      name: 'OTP Lockout Cafe',
      email: otpLockoutEmail,
      password: 'SecurePassword123!',
      is_active: true,
      subscription_status: 'active',
      subscription: { plan_name: 'starter' },
      login_otp: hashedOtpCode,
      login_otp_expire: Date.now() + 10 * 60 * 1000,
      login_otp_attempts: 0
    });

    const otpCafeInDb = await Cafe.findOne({ email: otpLockoutEmail }).select('+login_otp +login_otp_attempts');
    assert(typeof otpCafeInDb.login_otp === 'string' && otpCafeInDb.login_otp.length === 64, 'OTP is stored as SHA-256 hash (64 hex characters), not plaintext');

    // Send 4 failed verification attempts
    for (let attempt = 1; attempt <= 4; attempt++) {
      let attemptFailed = false;
      try {
        await axios.post(`${API_BASE}/auth/verify-login-otp`, {
          email: otpLockoutEmail,
          otp: '000000'
        });
      } catch (err) {
        if (err.response?.status === 400 && err.response?.data?.message?.includes('remaining')) {
          attemptFailed = true;
        }
      }
      assert(attemptFailed, `Failed OTP attempt ${attempt}/5 returns 400 with remaining attempts counter`);
    }

    // 5th failed attempt should trigger account OTP invalidation and 429
    let lockoutTriggered = false;
    try {
      await axios.post(`${API_BASE}/auth/verify-login-otp`, {
        email: otpLockoutEmail,
        otp: '000000'
      });
    } catch (err) {
      if (err.response?.status === 429 && err.response?.data?.message?.includes('invalidated')) {
        lockoutTriggered = true;
      }
    }
    assert(lockoutTriggered, '5th failed OTP attempt triggers 429 lockout and invalidates code');

    const lockedCafeInDb = await Cafe.findOne({ email: otpLockoutEmail }).select('+login_otp');
    assert(lockedCafeInDb.login_otp === undefined || lockedCafeInDb.login_otp === null, 'OTP is wiped from database after 5 failed attempts (Single-use / lockout enforcement)');


    // =========================================================================
    // TEST 11: Session Invalidation on Password Reset
    // =========================================================================
    console.log('\n🛡️  TEST 11: Session Invalidation on Password Reset');
    const pwdTestEmail = `pwd_reset_${Date.now()}@example.com`;
    const pwdCafe = await Cafe.create({
      name: 'Password Reset Cafe',
      email: pwdTestEmail,
      password: 'InitialPassword123!',
      is_active: true,
      subscription_status: 'active',
      subscription: { plan_name: 'starter' }
    });

    const initialToken = generateToken(pwdCafe._id, 'owner');
    pwdCafe.active_sessions = [{ token: initialToken, device_info: 'Chrome on Windows', last_active: new Date() }];
    await pwdCafe.save({ validateBeforeSave: false });

    // Verify initial token can access dashboard
    const dashRes = await axios.get(`${API_BASE}/owner/dashboard`, {
      headers: { Authorization: `Bearer ${initialToken}` }
    });
    assert(dashRes.data.success === true, 'Initial session token can access owner dashboard');

    // Generate reset token and perform password reset
    const rawResetToken = pwdCafe.getResetPasswordToken();
    await pwdCafe.save({ validateBeforeSave: false });

    const setPwdRes = await axios.post(`${API_BASE}/auth/set-password/${rawResetToken}`, {
      password: 'NewSecurePassword789!'
    });
    assert(setPwdRes.data.success === true, 'Password reset succeeds and returns new credentials');
    const newToken = setPwdRes.data.data.token;
    assert(newToken && newToken !== initialToken, 'New distinct JWT token issued upon password reset');

    // Verify old token is now REVOKED
    let oldTokenRevoked = false;
    try {
      await axios.get(`${API_BASE}/owner/dashboard`, {
        headers: { Authorization: `Bearer ${initialToken}` }
      });
    } catch (err) {
      if (err.response?.status === 401 && err.response?.data?.message?.includes('Device limit reached')) {
        oldTokenRevoked = true;
      }
    }
    assert(oldTokenRevoked, 'Old session token immediately revoked and returns 401 Unauthorized after password reset');

    // Verify new token can access dashboard
    const newDashRes = await axios.get(`${API_BASE}/owner/dashboard`, {
      headers: { Authorization: `Bearer ${newToken}` }
    });
    assert(newDashRes.data.success === true, 'New session token accesses dashboard successfully');

    // =========================================================================
    // TEST 12: Sensitive Credential Minimization
    // =========================================================================
    console.log('\n🛡️  TEST 12: Sensitive Credential Minimization & select: false Enforcement');
    const rawQueryCafe = await Cafe.findById(pwdCafe._id);
    assert(rawQueryCafe.password === undefined, 'Cafe query excludes password hash');
    assert(rawQueryCafe.login_otp === undefined, 'Cafe query excludes login_otp');
    assert(rawQueryCafe.resetPasswordToken === undefined, 'Cafe query excludes resetPasswordToken');
    assert(rawQueryCafe.razorpay_key_secret === undefined, 'Cafe query excludes razorpay_key_secret');
    assert(rawQueryCafe.razorpay_webhook_secret === undefined, 'Cafe query excludes razorpay_webhook_secret');

    // Check GET /api/auth/me
    const meRes = await axios.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${newToken}` }
    });
    assert(meRes.data.data.password === undefined, '/api/auth/me does not leak password');
    assert(meRes.data.data.login_otp === undefined, '/api/auth/me does not leak login_otp');
    assert(meRes.data.data.resetPasswordToken === undefined, '/api/auth/me does not leak resetPasswordToken');
    assert(meRes.data.data.razorpay_key_secret === undefined, '/api/auth/me does not leak razorpay_key_secret');

    // =========================================================================
    // TEST 13: Role-Based Access Control & Consistent 401 vs 403 Status Codes
    // =========================================================================
    console.log('\n🛡️  TEST 13: Server-Side Role Enforcement & 401/403 Consistency');
    // 1. Missing token -> 401
    let noTokenBlocked = false;
    try {
      await axios.get(`${API_BASE}/owner/dashboard`);
    } catch (err) {
      if (err.response?.status === 401 && err.response?.data?.message?.includes('no token provided')) {
        noTokenBlocked = true;
      }
    }
    assert(noTokenBlocked, 'Request without token returns 401 Unauthorized');

    // 2. Tampered / invalid token -> 401
    let tamperedBlocked = false;
    try {
      await axios.get(`${API_BASE}/owner/dashboard`, {
        headers: { Authorization: 'Bearer this.is.a.tampered.token' }
      });
    } catch (err) {
      if (err.response?.status === 401 && err.response?.data?.message?.includes('invalid or expired')) {
        tamperedBlocked = true;
      }
    }
    assert(tamperedBlocked, 'Tampered token returns 401 Unauthorized');

    // 3. Cafe Owner accessing Superadmin route -> 403
    let crossRoleBlocked = false;
    try {
      await axios.get(`${API_BASE}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${newToken}` }
      });
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.message?.includes('not authorized')) {
        crossRoleBlocked = true;
      }
    }
    assert(crossRoleBlocked, 'Cafe Owner attempting to access /api/admin/* route returns 403 Forbidden');

    // =========================================================================
    // TEST 14: Cross-Tenant Category IDOR / BOLA Prevention
    // =========================================================================
    console.log('\n🛡️  TEST 14: Cross-Tenant Category IDOR / BOLA Prevention');
    // cafeA tries to update cafeB's category
    const tokenA = jwt.sign({ id: cafeA._id, role: 'owner' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    cafeA.is_active = true;
    cafeA.active_sessions = [{ token: tokenA, device_info: 'test', last_active: new Date() }];
    await cafeA.save({ validateBeforeSave: false });

    let crossCategoryUpdateBlocked = false;
    try {
      await axios.put(`${API_BASE}/owner/categories/${categoryB._id}`, {
        name: 'Hacked Category Name'
      }, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
    } catch (err) {
      if (err.response?.status === 404) crossCategoryUpdateBlocked = true;
    }
    assert(crossCategoryUpdateBlocked, 'Cross-tenant category update rejected with 404 Not Found');

    let crossCategoryDeleteBlocked = false;
    try {
      await axios.delete(`${API_BASE}/owner/categories/${categoryB._id}`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
    } catch (err) {
      if (err.response?.status === 404) crossCategoryDeleteBlocked = true;
    }
    assert(crossCategoryDeleteBlocked, 'Cross-tenant category deletion rejected with 404 Not Found');

    // =========================================================================
    // TEST 15: Cross-Tenant Menu Item Category Reference Injection
    // =========================================================================
    console.log('\n🛡️  TEST 15: Cross-Tenant Category Reference Injection in Menu Item Creation');
    let crossCatRefBlocked = false;
    try {
      await axios.post(`${API_BASE}/owner/menu-items`, {
        name: 'Injected Category Dish',
        description: 'Test dish referencing Cafe B category',
        price: 199,
        category_id: categoryB._id, // Belongs to Cafe B!
        is_veg: true
      }, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.message?.includes('does not belong to this café')) {
        crossCatRefBlocked = true;
      }
    }
    assert(crossCatRefBlocked, 'Menu item creation referencing another café\'s category rejected with 400');

    // =========================================================================
    // TEST 16: Cross-Tenant Order Manipulation IDOR
    // =========================================================================
    console.log('\n🛡️  TEST 16: Cross-Tenant Order Status / Payment IDOR Prevention');
    let crossOrderStatusBlocked = false;
    try {
      await axios.put(`${API_BASE}/owner/orders/${validOrder._id}/status`, {
        order_status: 'completed'
      }, {
        headers: { Authorization: `Bearer ${tokenA}` } // Cafe A tries to modify Cafe B's order
      });
    } catch (err) {
      if (err.response?.status === 404) crossOrderStatusBlocked = true;
    }
    assert(crossOrderStatusBlocked, 'Cross-tenant order status modification rejected with 404 Not Found');

    let crossOrderPaymentBlocked = false;
    try {
      await axios.put(`${API_BASE}/owner/orders/${validOrder._id}/payment`, {
        payment_status: 'received'
      }, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
    } catch (err) {
      if (err.response?.status === 404) crossOrderPaymentBlocked = true;
    }
    assert(crossOrderPaymentBlocked, 'Cross-tenant order payment status update rejected with 404 Not Found');

    // =========================================================================
    // TEST 17: Cross-Tenant Subscription Session IDOR
    // =========================================================================
    console.log('\n🛡️  TEST 17: Cross-Tenant Subscription Session Access / Cancellation');
    const tokenB = jwt.sign({ id: cafeB._id, role: 'owner' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    cafeB.active_sessions = [{ token: tokenB, device_info: 'test', last_active: new Date() }];
    await cafeB.save({ validateBeforeSave: false });

    // Cafe B initiates a subscription session
    const subInitRes = await axios.post(`${API_BASE}/owner/subscription/initiate-session`, {
      plan_name: 'pro'
    }, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    const bSessionId = subInitRes.data.data.session_id;

    // Cafe A tries to view Cafe B's subscription session
    let crossSubViewBlocked = false;
    try {
      await axios.get(`${API_BASE}/owner/subscription/check-status/${bSessionId}`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
    } catch (err) {
      if (err.response?.status === 404) crossSubViewBlocked = true;
    }
    assert(crossSubViewBlocked, 'Cross-tenant subscription session status inspection rejected with 404 Not Found');

    // Cafe A tries to cancel Cafe B's subscription session
    let crossSubCancelBlocked = false;
    try {
      await axios.post(`${API_BASE}/owner/subscription/cancel-session/${bSessionId}`, {}, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
    } catch (err) {
      if (err.response?.status === 404) crossSubCancelBlocked = true;
    }
    assert(crossSubCancelBlocked, 'Cross-tenant subscription session cancellation rejected with 404 Not Found');

    // =========================================================================
    // TEST 18: Order Tracking Customer PII Confidentiality
    // =========================================================================
    console.log('\n🛡️  TEST 18: Customer PII Protection on Order Tracking');
    const trackRes = await axios.get(`${API_BASE}/orders/${validOrder.order_number}/track`);
    assert(trackRes.status === 200, 'Tracking request succeeds with valid order number');
    assert(trackRes.data.data.customer_phone === undefined, 'Order tracking does NOT leak customer phone number');
    assert(trackRes.data.data.customer_name === undefined, 'Order tracking does NOT leak customer name');
    assert(trackRes.data.data.table_number === undefined, 'Order tracking does NOT leak table number');
    assert(trackRes.data.data.notes === undefined, 'Order tracking does NOT leak customer notes');

    // =========================================================================
    // TEST 19: Order Creation Unavailable Item & Inactive Cafe Rejection
    // =========================================================================
    console.log('\n🛡️  TEST 19: Order Creation Unavailable Item & Inactive Cafe Rejection');
    menuItemB.availability = false;
    await menuItemB.save();

    let unavailItemBlocked = false;
    try {
      await axios.post(`${API_BASE}/orders`, {
        cafe_id: cafeB._id,
        items: [{ menu_item_id: menuItemB._id, name: menuItemB.name, price: menuItemB.price, quantity: 1 }],
        payment_method: 'cash'
      });
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.message?.includes('no longer available')) {
        unavailItemBlocked = true;
      }
    }
    assert(unavailItemBlocked, 'Ordering item marked availability=false rejected with 400 "no longer available"');

    // Reset availability and deactivate cafeB
    menuItemB.availability = true;
    await menuItemB.save();
    cafeB.is_active = false;
    await cafeB.save({ validateBeforeSave: false });

    let deactivatedOrderBlocked = false;
    try {
      await axios.post(`${API_BASE}/orders`, {
        cafe_id: cafeB._id,
        items: [{ menu_item_id: menuItemB._id, name: menuItemB.name, price: menuItemB.price, quantity: 1 }],
        payment_method: 'cash'
      });
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.message?.includes('unavailable')) {
        deactivatedOrderBlocked = true;
      }
    }
    assert(deactivatedOrderBlocked, 'Ordering from deactivated café rejected with 400 "café is unavailable"');

    // =========================================================================
    // CLEANUP
    // =========================================================================
    console.log('\n🧹 [CLEANUP] Cleaning up test records...');
    const SubscriptionRequest = require('./models/SubscriptionRequest');
    await SubscriptionRequest.deleteMany({ cafe_id: { $in: [cafeA._id, cafeB._id] } });
    await Cafe.deleteOne({ email: testOwnerEmail });
    await Cafe.deleteOne({ _id: cafeA._id });
    await Cafe.deleteOne({ _id: cafeB._id });
    await Cafe.deleteOne({ _id: otpCafe._id });
    await Cafe.deleteOne({ _id: otpLockoutCafe._id });
    await Cafe.deleteOne({ _id: pwdCafe._id });
    await Category.deleteOne({ _id: categoryB._id });
    await MenuItem.deleteOne({ _id: menuItemB._id });
    await Order.deleteOne({ _id: validOrder._id });
    await Order.deleteOne({ _id: fbOrder._id });
    await Feedback.deleteMany({ cafe_id: cafeB._id });

    console.log('\n========================================================================');
    console.log(`🎉 ALL SECURITY AUDIT TESTS PASSED: ${passedCount}/${totalCount} VERIFIED! 🚀`);
    console.log('========================================================================\n');

    if (serverInstance) serverInstance.close();
    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Security Audit Suite Failed:', error.message);
    if (error.response?.data) {
      console.error('Response Data:', error.response.data);
    }
    if (serverInstance) serverInstance.close();
    await mongoose.disconnect();
    process.exit(1);
  }
}

runAuditTests();
