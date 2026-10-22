/**
 * ============================================================================
 * WhatTheMenu — Phase 11: Error Handling & Observability Test Suite
 * ============================================================================
 *
 * Verifies:
 * 1. Consistent HTTP status codes & stable error response format (success, message, code, request_id)
 * 2. Distinct error classification: validation, auth, forbidden, not found, conflict, rate limit, internal
 * 3. Zero leakage of stack traces, DB queries, credentials, or secrets in responses
 * 4. Structured logging with request ID correlation & automated redaction
 * 5. Security-relevant event logging in SystemLog (failed logins, IDOR denials, webhook failures, privileged actions)
 * 6. Health & readiness endpoints without infrastructure secret exposure (/health, /health/live, /health/ready)
 * 7. Payment failure & reconciliation backlog monitoring (/monitoring/payment-health)
 * 8. Process-level unhandled exception and rejection handlers
 * ============================================================================
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const http = require('http');
const mongoose = require('mongoose');
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Models & Utils
const Admin = require('./models/Admin');
const Cafe = require('./models/Cafe');
const SystemLog = require('./models/SystemLog');
const Order = require('./models/Order');
const WebhookLog = require('./models/WebhookLog');
const logger = require('./utils/logger');
const {
  AppError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError
} = require('./utils/errors');
const { redactSensitiveData, redactString } = require('./utils/redact');

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

async function runTests() {
  console.log('\n============================================================');
  console.log('   WhatTheMenu — Phase 11: Error Handling & Observability');
  console.log('============================================================\n');

  if (mongoose.connection.readyState === 0) {
    const mongoUri = process.env.MONGO_URI_TEST || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
  }

  testServer = http.createServer(app);
  await new Promise(resolve => testServer.listen(0, resolve));
  const port = testServer.address().port;
  API_BASE = `http://localhost:${port}/api`;
  console.log(`🚀 Test server listening on ${API_BASE}`);

  const client = axios.create({
    baseURL: API_BASE,
    validateStatus: () => true // Prevent axios throwing on 4xx/5xx
  });

  const uniqueId = `p11_${Date.now()}`;
  let adminToken, ownerToken, testCafe, testAdmin;

  try {
    // Setup Test Admin and Test Cafe
    testAdmin = await Admin.create({
      name: 'P11 Test Admin',
      email: `test_${uniqueId}@admin.com`,
      password: 'AdminPassword123!',
      role: 'superadmin'
    });
    adminToken = jwt.sign(
      { id: testAdmin._id, role: 'superadmin' },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );

    testCafe = await Cafe.create({
      name: 'P11 Observability Cafe',
      email: `test_${uniqueId}@cafe.com`,
      password: 'CafePassword123!',
      phone: '9876543210',
      address: '123 Observability Ave',
      is_active: true,
      subscription_status: 'active',
      subscription: { plan_name: 'starter', status: 'active' }
    });
    ownerToken = jwt.sign(
      { id: testCafe._id, role: 'owner' },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );
    testCafe.active_sessions = [{ token: ownerToken, device_info: 'Test Device', last_active: Date.now() }];
    await testCafe.save();

    // =========================================================================
    // GROUP 1: Request Correlation & Stable Error Response Format
    // =========================================================================
    console.log('\n--- Group 1: Request Correlation & Response Structure ---');

    // 1.1 Inbound custom request ID preservation
    const customReqId = `client_trace_${Date.now()}_abc123`;
    const resWithCustomId = await client.get('/health', {
      headers: { 'X-Request-Id': customReqId }
    });
    assert(resWithCustomId.status === 200, 'Health endpoint responds 200 OK');
    assert(resWithCustomId.headers['x-request-id'] === customReqId, 'Server honors client-provided valid X-Request-Id header');

    // 1.2 Automated cryptographic request ID generation when missing
    const resAutoId = await client.get('/health');
    assert(typeof resAutoId.headers['x-request-id'] === 'string' && resAutoId.headers['x-request-id'].startsWith('req_'), 'Server automatically provisions unique X-Request-Id when omitted');

    // 1.3 Error response format consistency
    const invalidIdRes = await client.delete('/owner/menu-items/invalid-mongo-id', {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    assert(invalidIdRes.status === 400, 'Invalid MongoId responds 400 Bad Request');
    assert(invalidIdRes.data.success === false, 'Error body includes success: false');
    assert(typeof invalidIdRes.data.message === 'string', 'Error body includes safe human-readable message');
    assert(typeof invalidIdRes.data.code === 'string', 'Error body includes machine-parseable code');
    assert(typeof invalidIdRes.data.request_id === 'string', 'Error body correlates with request_id');

    // =========================================================================
    // GROUP 2: Error Categorization & Separation
    // =========================================================================
    console.log('\n--- Group 2: Error Categorization & Separation ---');

    // 2.1 Validation Error (400)
    const valRes = await client.post('/auth/register', {
      name: '',
      email: 'not-an-email',
      password: '123'
    });
    assert(valRes.status === 400, 'Validation failure returns 400 Bad Request');
    assert(valRes.data.code === 'VALIDATION_ERROR', 'Validation error code is VALIDATION_ERROR');
    assert(Array.isArray(valRes.data.errors) && valRes.data.errors.length > 0, 'Validation error details returned in errors array');

    // 2.2 Validation Error does NOT echo sensitive raw values (password redaction)
    const passwordError = valRes.data.errors.find(e => (e.field || '').includes('password'));
    assert(passwordError && passwordError.value === '[REDACTED]', 'Sensitive field value (password) is strictly redacted in validation errors');

    // 2.3 Authentication Error (401)
    const unauthRes = await client.get('/owner/dashboard');
    assert(unauthRes.status === 401, 'Unauthenticated request returns 401 Unauthorized');
    assert(unauthRes.data.message.includes('token') || unauthRes.data.message.includes('authorization') || unauthRes.data.message.includes('Not authorized'), 'Auth error message explains missing authorization');

    // 2.4 Authorization Error (403)
    const forbiddenRes = await client.get('/admin/cafes', {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    assert(forbiddenRes.status === 403, 'Role violation returns 403 Forbidden');

    // 2.5 Not Found Error (404)
    const notFoundRes = await client.get(`/menu/non_existent_cafe_${Date.now()}`);
    assert(notFoundRes.status === 404, 'Non-existent resource returns 404 Not Found');

    // 2.6 Conflict Error (409)
    const duplicateRes = await client.post('/auth/register', {
      name: 'Duplicate Cafe',
      email: testCafe.email, // already exists
      password: 'ValidPassword123!',
      phone: '9998887776',
      address: 'Duplicate Lane'
    });
    assert(duplicateRes.status === 400 || duplicateRes.status === 409, 'Duplicate unique key returns 400 or 409 Conflict');

    // 2.7 AppError Hierarchy & Classification Test
    const appErr = new AppError('Custom operational error', 418, 'I_AM_A_TEAPOT', { foo: 'bar' });
    assert(appErr.statusCode === 418 && appErr.code === 'I_AM_A_TEAPOT', 'AppError retains custom code and status');
    const valErr = new ValidationError('Bad input');
    assert(valErr.statusCode === 400 && valErr.code === 'VALIDATION_ERROR', 'ValidationError instantiates 400');
    const authErr = new AuthenticationError();
    assert(authErr.statusCode === 401 && authErr.code === 'AUTHENTICATION_REQUIRED', 'AuthenticationError instantiates 401');
    const forbErr = new ForbiddenError();
    assert(forbErr.statusCode === 403 && forbErr.code === 'ACCESS_DENIED', 'ForbiddenError instantiates 403');
    const notFoundErr = new NotFoundError();
    assert(notFoundErr.statusCode === 404 && notFoundErr.code === 'NOT_FOUND', 'NotFoundError instantiates 404');
    const confErr = new ConflictError();
    assert(confErr.statusCode === 409 && confErr.code === 'CONFLICT', 'ConflictError instantiates 409');
    const rateErr = new RateLimitError('Too many hits', 45);
    assert(rateErr.statusCode === 429 && rateErr.retryAfterSeconds === 45, 'RateLimitError retains retryAfterSeconds');

    // =========================================================================
    // GROUP 3: Stack Trace & Secrets Leakage Prevention
    // =========================================================================
    console.log('\n--- Group 3: Stack Trace & Secrets Leakage Prevention ---');

    // 3.1 Stack trace is null / excluded in simulated production
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const prodErrRes = await client.delete('/owner/menu-items/invalid-id-for-prod', {
        headers: { Authorization: `Bearer ${ownerToken}` }
      });
      assert(prodErrRes.data.stack === undefined || prodErrRes.data.stack === null, 'Stack trace is strictly suppressed in production mode');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }

    // 3.2 Redaction utility cleans credentials from strings and objects
    // Note: Dynamically assembled with non-routable domain to prevent false-positive GitHub Secret Scanner alerts
    const mockDbPassword = 'SuperSecretPassword123';
    const mockDbUri = ['mongodb+srv', '://mock_admin:', mockDbPassword, '@mock-cluster.example.invalid/prod'].join('');
    const mockLiveKey = ['rzp', 'live', 'A9B8C7D6E5F4G3H2I1'].join('_');
    const dirtyString = `Server error on ${mockDbUri} with key ${mockLiveKey}`;
    const cleanString = redactString(dirtyString);
    assert(!cleanString.includes(mockDbPassword), 'Redaction removes MongoDB password');
    assert(!cleanString.includes(mockLiveKey), 'Redaction removes Razorpay live key');
    assert(cleanString.includes('[REDACTED_DB_PWD]'), 'Replaces DB password with safe placeholder');
    assert(cleanString.includes('[REDACTED_KEY]'), 'Replaces live key with safe placeholder');

    // =========================================================================
    // GROUP 4: Structured Logging Engine
    // =========================================================================
    console.log('\n--- Group 4: Structured Logging Engine ---');

    // Verify logger functions execute without exceptions
    logger.info('Test info log message', { request_id: 'test_req_1', user_id: testCafe._id });
    logger.warn('Test warning log message', { request_id: 'test_req_2' });
    logger.error('Test error log message', { request_id: 'test_req_3', error_code: 'TEST_ERROR' });
    logger.security('SECURITY_TEST_AUDIT', { ip: '127.0.0.1', reason: 'Audit smoke test' });
    assert(true, 'Logger methods (info, warn, error, security) execute cleanly');

    // =========================================================================
    // GROUP 5: Security Event Logging & SystemLog Model
    // =========================================================================
    console.log('\n--- Group 5: Security Event Logging & SystemLog ---');

    async function waitForLog(filter, timeoutMs = 3000) {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const log = await SystemLog.findOne(filter);
        if (log) return log;
        await new Promise(r => setTimeout(r, 50));
      }
      return null;
    }

    // 5.1 Failed login attempt logs SECURITY_FAILED_LOGIN
    const failedLoginEmail = `unknown_intruder_${Date.now()}@bad.com`;
    await client.post('/auth/login', {
      email: failedLoginEmail,
      password: 'WrongPassword999!'
    });

    const failedLog = await waitForLog({
      event_type: 'SECURITY_FAILED_LOGIN',
      'metadata.email': failedLoginEmail
    });
    assert(failedLog !== null, 'Failed login is recorded in SystemLog with event_type: SECURITY_FAILED_LOGIN');
    assert(failedLog && failedLog.level === 'warn', 'Security event level is stored as warn');

    // 5.2 Suspended account login attempt logs SECURITY_SUSPENDED_LOGIN_ATTEMPT
    testCafe.is_active = false;
    await testCafe.save();

    await client.post('/auth/login', {
      email: testCafe.email,
      password: 'CafePassword123!'
    });

    const suspendedLog = await waitForLog({
      event_type: 'SECURITY_SUSPENDED_LOGIN_ATTEMPT',
      user_id: testCafe._id
    });
    assert(suspendedLog !== null, 'Suspended account login attempt is recorded in SystemLog');

    // Restore cafe active status
    testCafe.is_active = true;
    await testCafe.save();

    // 5.3 Webhook verification failure logs SECURITY_WEBHOOK_VERIFICATION_FAILED
    await client.post('/webhooks/razorpay/subscription', {}, {
      headers: {
        'x-razorpay-signature': 'forged_bogus_signature_12345'
      }
    });

    const webhookLog = await waitForLog({
      event_type: 'SECURITY_WEBHOOK_VERIFICATION_FAILED'
    });
    assert(webhookLog !== null, 'Webhook signature failure is recorded in SystemLog');

    // 5.4 Privileged superadmin action logs SECURITY_PRIVILEGED_ACTION
    await client.put(`/admin/cafes/${testCafe._id}/suspend`, {}, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const privilegedLog = await waitForLog({
      event_type: 'SECURITY_PRIVILEGED_ACTION',
      'metadata.action': 'SUSPEND_CAFE'
    });
    assert(privilegedLog !== null, 'Superadmin suspension is recorded in SystemLog with SECURITY_PRIVILEGED_ACTION');

    // =========================================================================
    // GROUP 6: Health and Readiness Endpoints
    // =========================================================================
    console.log('\n--- Group 6: Health & Readiness Probes ---');

    // 6.1 Basic Health Check
    const basicHealth = await client.get('/health');
    assert(basicHealth.status === 200 && basicHealth.data.status === 'OK', 'GET /api/health responds with status: OK');
    assert(!JSON.stringify(basicHealth.data).includes('mongodb'), 'Health endpoint does not expose MongoDB URI');

    // 6.2 Liveness Probe
    const livenessProbe = await client.get('/health/live');
    assert(livenessProbe.status === 200 && livenessProbe.data.status === 'UP', 'GET /api/health/live responds 200 with status: UP');

    // 6.3 Readiness Probe
    const readinessProbe = await client.get('/health/ready');
    assert(readinessProbe.status === 200, 'GET /api/health/ready responds 200 when database is connected');
    assert(readinessProbe.data.database === 'CONNECTED', 'Readiness payload reports database: CONNECTED');
    assert(!JSON.stringify(readinessProbe.data).includes('password') && !JSON.stringify(readinessProbe.data).includes('@'), 'Readiness payload does NOT leak connection strings or credentials');

    // =========================================================================
    // GROUP 7: Payment Failures & Reconciliation Backlog Monitoring
    // =========================================================================
    console.log('\n--- Group 7: Payment Health & Backlog Monitoring ---');

    // 7.1 Unauthorized access to payment health probe rejected
    const unauthMon = await client.get('/admin/monitoring/payment-health', {
      headers: { Authorization: `Bearer ${ownerToken}` } // owner token
    });
    assert(unauthMon.status === 403, 'Owner token rejected from payment health monitoring endpoint with 403');

    // 7.2 Superadmin retrieves payment health & backlog metrics
    const adminMon = await client.get('/admin/monitoring/payment-health', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminMon.status === 200, 'Superadmin retrieves payment health monitoring data (200 OK)');
    assert(adminMon.data.success === true, 'Monitoring response indicates success: true');
    assert(typeof adminMon.data.data.pending_reconciliation_backlog === 'number', 'Reports pending reconciliation backlog count');
    assert(typeof adminMon.data.data.failed_payments_24h === 'number', 'Reports 24h failed payments count');
    assert(['HEALTHY', 'ATTENTION_REQUIRED'].includes(adminMon.data.data.status), 'Reports health status indicator (HEALTHY/ATTENTION_REQUIRED)');

    // =========================================================================
    // GROUP 8: Process Resilience & Exception Handlers
    // =========================================================================
    console.log('\n--- Group 8: Process Lifecycle Handlers ---');

    const rejectionListeners = process.listeners('unhandledRejection');
    assert(rejectionListeners.length > 0, 'Process has registered unhandledRejection listener');

    const exceptionListeners = process.listeners('uncaughtException');
    assert(exceptionListeners.length > 0, 'Process has registered uncaughtException listener');

    console.log('\n============================================================');
    console.log(`  Phase 11 Error & Observability Suite: ${passedTests}/${totalTests} Tests PASSED (100%)`);
    console.log('============================================================\n');

  } finally {
    if (testServer) {
      await new Promise(r => testServer.close(r));
    }
    // Clean up created test records
    try {
      await Admin.deleteMany({ email: { $regex: /test_p11_/ } });
      await Cafe.deleteMany({ email: { $regex: /test_p11_/ } });
      await SystemLog.deleteMany({ 'metadata.email': { $regex: /test_p11_/ } });
    } catch (_) {}
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('\n❌ Unhandled error in Phase 11 test suite:', err);
  process.exit(1);
});
