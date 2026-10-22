const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
let ioClient;
try {
  ioClient = require('socket.io-client');
} catch (e) {
  ioClient = require('../frontend/node_modules/socket.io-client');
}
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

// Ensure test DB is used
const MONGO_URI = process.env.MONGO_URI_TEST || process.env.MONGO_URI;

async function runPhase6Tests() {
  console.log('====================================================');
  console.log('🚀 STARTING PHASE 6 — SOCKET.IO SECURITY AUDIT TEST');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
    }
  }

  // Import application, io, and server
  const { app, io, server } = require('./server');

  // Wait for MongoDB to connect via server.js connectDB()
  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve) => mongoose.connection.once('open', resolve));
  }
  console.log('Connected to MongoDB database.\n');

  // Load models
  const Cafe = require('./models/Cafe');
  const Admin = require('./models/Admin');
  const Order = require('./models/Order');

  // Setup test entities
  const testCafeIdA = new mongoose.Types.ObjectId();
  const testCafeIdB = new mongoose.Types.ObjectId();
  const testAdminId = new mongoose.Types.ObjectId();
  const testSuspendedCafeId = new mongoose.Types.ObjectId();

  const secret = process.env.JWT_SECRET || 'testsecret1234567890123456789012';

  const validTokenA = jwt.sign({ id: testCafeIdA.toString(), role: 'owner' }, secret, { expiresIn: '1h' });
  const validTokenB = jwt.sign({ id: testCafeIdB.toString(), role: 'owner' }, secret, { expiresIn: '1h' });
  const adminToken = jwt.sign({ id: testAdminId.toString(), role: 'superadmin' }, secret, { expiresIn: '1h' });
  const suspendedToken = jwt.sign({ id: testSuspendedCafeId.toString(), role: 'owner' }, secret, { expiresIn: '1h' });
  const revokedSessionToken = jwt.sign({ id: testCafeIdA.toString(), role: 'owner', jti: 'different_revoked_session' }, secret, { expiresIn: '1h' });

  // Cleanup old test data
  await Cafe.deleteMany({ email: { $in: ['socket_test_a@test.com', 'socket_test_b@test.com', 'socket_test_susp@test.com'] } });
  await Admin.deleteMany({ email: 'socket_admin@test.com' });
  await Order.deleteMany({ order_number: { $in: ['SOCK-ORD-001', 'SOCK-ORD-002'] } });

  // Create test records
  const cafeA = await Cafe.create({
    _id: testCafeIdA,
    name: 'Socket Cafe A',
    email: 'socket_test_a@test.com',
    password: 'password123',
    slug: 'socket-cafe-a',
    is_active: true,
    active_sessions: [{ token: validTokenA, device_info: 'test-device', last_active: new Date() }]
  });

  const cafeB = await Cafe.create({
    _id: testCafeIdB,
    name: 'Socket Cafe B',
    email: 'socket_test_b@test.com',
    password: 'password123',
    slug: 'socket-cafe-b',
    is_active: true,
    active_sessions: [{ token: validTokenB, device_info: 'test-device', last_active: new Date() }]
  });

  await Cafe.create({
    _id: testSuspendedCafeId,
    name: 'Suspended Cafe',
    email: 'socket_test_susp@test.com',
    password: 'password123',
    slug: 'socket-cafe-susp',
    is_active: false,
    active_sessions: [{ token: suspendedToken, device_info: 'test-device', last_active: new Date() }]
  });

  await Admin.create({
    _id: testAdminId,
    name: 'Socket Admin',
    email: 'socket_admin@test.com',
    password: 'adminpassword123',
    role: 'superadmin'
  });

  const orderA = await Order.create({
    cafe_id: testCafeIdA,
    order_number: 'SOCK-ORD-001',
    customer_name: 'Socket Customer A',
    customer_phone: '9876543210',
    total_amount: 250,
    payment_method: 'cash',
    items: [{ name: 'Espresso', quantity: 1, price: 250 }]
  });

  const orderB = await Order.create({
    cafe_id: testCafeIdB,
    order_number: 'SOCK-ORD-002',
    customer_name: 'Socket Customer B',
    customer_phone: '9876543211',
    total_amount: 350,
    payment_method: 'cash',
    items: [{ name: 'Latte', quantity: 1, price: 350 }]
  });

  // Launch the server instance on TEST_PORT
  const TEST_PORT = 5055;
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  const serverUrl = `http://localhost:${TEST_PORT}`;
  console.log(`Test Socket.IO Server running on port ${TEST_PORT}\n`);

  function createClient(options = {}) {
    return ioClient(serverUrl, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
      timeout: 3000,
      ...options
    });
  }

  try {
    // ====================================================
    // TEST 1: Anonymous Connection (Allowed for public menu/tracking)
    // ====================================================
    console.log('--- TEST 1: Anonymous Connection & Public Limits ---');
    const anonSocket = createClient();
    await new Promise((resolve, reject) => {
      anonSocket.on('connect', resolve);
      anonSocket.on('connect_error', reject);
    });
    assert(anonSocket.connected, 'Anonymous client connects successfully for public features');

    // Anonymous client attempts to join admin-room -> FORBIDDEN
    const anonAdminErr = await new Promise((resolve) => {
      anonSocket.on('socket-error', resolve);
      anonSocket.emit('join-admin');
    });
    assert(anonAdminErr && anonAdminErr.code === 'FORBIDDEN', 'Anonymous client cannot join admin-room (rejected with FORBIDDEN)');

    // Anonymous client attempts to join cafe room -> UNAUTHORIZED
    const anonCafeErr = await new Promise((resolve) => {
      anonSocket.on('socket-error', resolve);
      anonSocket.emit('join-cafe', testCafeIdA.toString());
    });
    assert(anonCafeErr && anonCafeErr.code === 'UNAUTHORIZED', 'Anonymous client cannot join cafe room (rejected with UNAUTHORIZED)');

    anonSocket.disconnect();

    // ====================================================
    // TEST 2: Handshake Authentication Failure (Invalid Token)
    // ====================================================
    console.log('\n--- TEST 2: Handshake Authentication Rejection ---');
    const badTokenSocket = createClient({ auth: { token: 'invalid.forged.token' } });
    const connErr = await new Promise((resolve) => {
      badTokenSocket.on('connect_error', resolve);
      badTokenSocket.on('connect', () => resolve(null));
    });
    assert(connErr !== null && connErr.message.includes('Authentication failed'), 'Invalid handshake token immediately rejected on connection');
    badTokenSocket.disconnect();

    // ====================================================
    // TEST 3: Suspended Account Connection Rejection
    // ====================================================
    console.log('\n--- TEST 3: Suspended Account & Revoked Session ---');
    const suspSocket = createClient({ auth: { token: suspendedToken } });
    const suspErr = await new Promise((resolve) => {
      suspSocket.on('connect_error', resolve);
      suspSocket.on('connect', () => resolve(null));
    });
    assert(suspErr !== null && suspErr.message.includes('suspended'), 'Suspended cafe account rejected during socket handshake');
    suspSocket.disconnect();

    // Revoked Session (token not present in active_sessions)
    const revokedSocket = createClient({ auth: { token: revokedSessionToken } });
    const revokedErr = await new Promise((resolve) => {
      revokedSocket.on('connect_error', resolve);
      revokedSocket.on('connect', () => resolve(null));
    });
    assert(revokedErr !== null && revokedErr.message.includes('revoked'), 'Revoked session token rejected during socket handshake');
    revokedSocket.disconnect();

    // ====================================================
    // TEST 4: Valid Cafe Owner Authentication & Tenant Isolation
    // ====================================================
    console.log('\n--- TEST 4: Cafe Owner Authentication & Cross-Tenant Isolation ---');
    const ownerASocket = createClient({ auth: { token: validTokenA } });
    await new Promise((resolve, reject) => {
      ownerASocket.on('connect', resolve);
      ownerASocket.on('connect_error', reject);
    });
    assert(ownerASocket.connected, 'Authenticated cafe owner connects successfully');

    // Owner A joins their own cafe room
    let ownerAJoinedOwn = true;
    ownerASocket.once('socket-error', () => { ownerAJoinedOwn = false; });
    ownerASocket.emit('join-cafe', testCafeIdA.toString());
    await new Promise((r) => setTimeout(r, 100));
    assert(ownerAJoinedOwn, 'Cafe Owner A successfully joins their own cafe room');

    // Owner A attempts to join Cafe B room -> FORBIDDEN
    const crossCafeErr = await new Promise((resolve) => {
      ownerASocket.once('socket-error', resolve);
      ownerASocket.emit('join-cafe', testCafeIdB.toString());
    });
    assert(crossCafeErr && crossCafeErr.code === 'FORBIDDEN', 'Cafe Owner A blocked from joining Cafe B room (Cross-Tenant Isolation enforced)');

    // Owner A attempts to elevate identity via payload token -> IGNORED and blocked
    const identitySwapErr = await new Promise((resolve) => {
      ownerASocket.once('socket-error', resolve);
      ownerASocket.emit('join-cafe', { cafeId: testCafeIdB.toString(), token: validTokenB });
    });
    assert(identitySwapErr && identitySwapErr.code === 'FORBIDDEN', 'Event payload cannot override immutable handshake socket identity');

    // Owner A attempts to join admin-room -> FORBIDDEN
    const ownerAdminErr = await new Promise((resolve) => {
      ownerASocket.once('socket-error', resolve);
      ownerASocket.emit('join-admin');
    });
    assert(ownerAdminErr && ownerAdminErr.code === 'FORBIDDEN', 'Cafe Owner blocked from joining admin-room');

    ownerASocket.disconnect();

    // ====================================================
    // TEST 5: Superadmin Authorization
    // ====================================================
    console.log('\n--- TEST 5: Superadmin Authorization ---');
    const adminSocket = createClient({ auth: { token: adminToken } });
    await new Promise((resolve, reject) => {
      adminSocket.on('connect', resolve);
      adminSocket.on('connect_error', reject);
    });
    assert(adminSocket.connected, 'Superadmin connects successfully');

    let adminJoinedAdminRoom = true;
    adminSocket.once('socket-error', () => { adminJoinedAdminRoom = false; });
    adminSocket.emit('join-admin');
    await new Promise((r) => setTimeout(r, 100));
    assert(adminJoinedAdminRoom, 'Superadmin authorized to join admin-room');

    let adminJoinedCafe = true;
    adminSocket.once('socket-error', () => { adminJoinedCafe = false; });
    adminSocket.emit('join-cafe', testCafeIdA.toString());
    await new Promise((r) => setTimeout(r, 100));
    assert(adminJoinedCafe, 'Superadmin authorized to join any cafe room for support');

    adminSocket.disconnect();

    // ====================================================
    // TEST 6: Order Tracking Verification & Cross-Tenant Protection
    // ====================================================
    console.log('\n--- TEST 6: Order Tracking Verification ---');
    const trackingSocket = createClient();
    await new Promise((resolve) => trackingSocket.on('connect', resolve));

    // Non-existent order tracking -> NOT_FOUND
    const nonExistErr = await new Promise((resolve) => {
      trackingSocket.once('socket-error', resolve);
      trackingSocket.emit('track-order', 'NON-EXISTENT-ORDER');
    });
    assert(nonExistErr && nonExistErr.code === 'NOT_FOUND', 'Tracking non-existent order returns NOT_FOUND error');

    // Invalid format order number -> INVALID_FORMAT
    const malformedErr = await new Promise((resolve) => {
      trackingSocket.once('socket-error', resolve);
      trackingSocket.emit('track-order', 'INVALID ORDER WITH SPACES!');
    });
    assert(malformedErr && malformedErr.code === 'INVALID_FORMAT', 'Tracking malformed order identifier rejected with INVALID_FORMAT');

    // Valid order tracking -> succeeds
    let orderTrackSuccess = true;
    trackingSocket.once('socket-error', () => { orderTrackSuccess = false; });
    trackingSocket.emit('track-order', orderA.order_number);
    await new Promise((r) => setTimeout(r, 100));
    assert(orderTrackSuccess, 'Valid order tracking verified in DB and room joined');

    trackingSocket.disconnect();

    // Owner A tracking Owner B's order -> FORBIDDEN
    const ownerASocket2 = createClient({ auth: { token: validTokenA } });
    await new Promise((resolve) => ownerASocket2.on('connect', resolve));
    const crossOrderErr = await new Promise((resolve) => {
      ownerASocket2.once('socket-error', resolve);
      ownerASocket2.emit('track-order', orderB.order_number);
    });
    assert(crossOrderErr && crossOrderErr.code === 'FORBIDDEN', 'Owner A barred from tracking Cafe B order (Cross-Tenant order protection)');
    ownerASocket2.disconnect();

    // ====================================================
    // TEST 7: Rate Limiting on Sensitive Socket Events
    // ====================================================
    console.log('\n--- TEST 7: Socket Event Rate Limiting ---');
    const floodSocket = createClient();
    await new Promise((resolve) => floodSocket.on('connect', resolve));

    let rateLimitHit = false;
    floodSocket.on('socket-error', (err) => {
      if (err.code === 'RATE_LIMIT_EXCEEDED') {
        rateLimitHit = true;
      }
    });

    // Send 25 track-order requests rapidly (limit is 20)
    for (let i = 0; i < 25; i++) {
      floodSocket.emit('track-order', `ORDER-TEST-${i}`);
    }
    await new Promise((r) => setTimeout(r, 300));
    assert(rateLimitHit, 'Rapid socket event flooding triggered RATE_LIMIT_EXCEEDED');
    floodSocket.disconnect();

    // ====================================================
    // TEST 8: Explicit Origin Allowlist & CORS Enforcement
    // ====================================================
    console.log('\n--- TEST 8: CORS Origin Allowlist Enforcement ---');
    // Test approved origin
    try {
      const allowedRes = await axios.get(`${serverUrl}/api/health`, {
        headers: { Origin: 'http://localhost:5173' }
      });
      assert(
        allowedRes.headers['access-control-allow-origin'] === 'http://localhost:5173',
        'Approved origin (http://localhost:5173) receives valid Access-Control-Allow-Origin header'
      );
    } catch (e) {
      assert(false, `Approved origin request failed: ${e.message}`);
    }

    // Test unauthorized origin
    try {
      await axios.get(`${serverUrl}/api/health`, {
        headers: { Origin: 'http://malicious-phishing-site.com' }
      });
      assert(false, 'Unauthorized origin should have been blocked by CORS');
    } catch (corsErr) {
      assert(
        corsErr.response && corsErr.response.status === 403,
        'Unauthorized origin (http://malicious-phishing-site.com) blocked with 403 Forbidden'
      );
    }

    // Test direct server-to-server request without Origin header (allowed)
    try {
      const noOriginRes = await axios.get(`${serverUrl}/api/health`);
      assert(noOriginRes.status === 200, 'Direct server-to-server request without Origin header succeeds');
    } catch (e) {
      assert(false, `Direct request failed: ${e.message}`);
    }

  } finally {
    // Cleanup
    await Cafe.deleteMany({ email: { $in: ['socket_test_a@test.com', 'socket_test_b@test.com', 'socket_test_susp@test.com'] } });
    await Admin.deleteMany({ email: 'socket_admin@test.com' });
    await Order.deleteMany({ order_number: { $in: ['SOCK-ORD-001', 'SOCK-ORD-002'] } });
    server.close();
    await mongoose.disconnect();
  }

  console.log('\n====================================================');
  console.log(`PHASE 6 TEST RESULTS: ${passed} / ${total} PASSED`);
  console.log('====================================================');
  if (passed === total) {
    console.log('🎉 ALL PHASE 6 SOCKET.IO SECURITY CONTROLS VERIFIED!');
  } else {
    console.error('⚠️ SOME TESTS FAILED.');
    process.exit(1);
  }
}

runPhase6Tests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
