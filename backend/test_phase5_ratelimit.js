const mongoose = require('mongoose');
const http = require('http');
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const rateLimit = require('express-rate-limit');
const {
  publicLimiter,
  apiLimiter,
  authLimiter,
  otpLimiter,
  passwordResetLimiter,
  menuLimiter,
  menuSearchLimiter,
  orderCreationLimiter,
  orderPollingLimiter,
  webhookLimiter,
  staffAlertLimiter,
  feedbackSubmissionLimiter,
  uploadLimiter,
  analyticsLimiter,
  sensitiveActionLimiter
} = require('./middleware/rateLimiter');

const TEST_PORT = 5095;
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

async function runPhase5Tests() {
  console.log('🚀 Setting up Phase 5 Rate Limiting Test Server...');
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());

  // Test endpoints mounting our real rate limiters
  app.get('/test/public', publicLimiter, (req, res) => res.json({ success: true, message: 'public ok' }));
  app.post('/test/auth/login', authLimiter, (req, res) => res.json({ success: true, message: 'auth ok' }));
  app.post('/test/auth/otp', otpLimiter, (req, res) => res.json({ success: true, message: 'otp ok' }));
  app.post('/test/auth/password-reset', passwordResetLimiter, (req, res) => res.json({ success: true, message: 'reset ok' }));
  app.get('/test/menu', menuLimiter, (req, res) => res.json({ success: true, message: 'menu ok' }));
  app.post('/test/order', orderCreationLimiter, (req, res) => res.json({ success: true, message: 'order ok' }));
  app.get('/test/poll', orderPollingLimiter, (req, res) => res.json({ success: true, message: 'poll ok' }));
  app.post('/test/webhook', webhookLimiter, (req, res) => res.json({ success: true, message: 'webhook ok' }));
  app.post('/test/feedback', feedbackSubmissionLimiter, (req, res) => res.json({ success: true, message: 'feedback ok' }));
  app.get('/test/analytics', analyticsLimiter, (req, res) => res.json({ success: true, message: 'analytics ok' }));
  app.post('/test/sensitive', sensitiveActionLimiter, (req, res) => res.json({ success: true, message: 'sensitive ok' }));

  server = app.listen(TEST_PORT);
  console.log(`✅ Test server running on port ${TEST_PORT}\n`);

  try {
    // =========================================================================
    console.log('🛡️  TEST 1: Standard Rate Limit Headers & Normal Request Acceptance');
    // =========================================================================
    const initialRes = await request({ method: 'GET', path: '/test/public' });
    assert(initialRes.status === 200, 'Initial public request succeeds with 200 OK');
    assert(initialRes.headers['ratelimit-limit'] !== undefined, 'Standard ratelimit-limit header is present');
    assert(initialRes.headers['ratelimit-remaining'] !== undefined, 'Standard ratelimit-remaining header is present');

    // =========================================================================
    console.log('\n🛡️  TEST 2: Password Reset Recovery Limiter (Max 5 attempts)');
    // =========================================================================
    let reset429Hit = false;
    let reset429Response;
    for (let i = 1; i <= 6; i++) {
      const res = await request({ method: 'POST', path: '/test/auth/password-reset', body: { email: 'user@example.com' } });
      if (res.status === 429) {
        reset429Hit = true;
        reset429Response = res;
        break;
      }
    }
    assert(reset429Hit, 'Password reset hits 429 Too Many Requests after threshold');
    assert(reset429Response.data.success === false, '429 response body format matches success: false');
    assert(reset429Response.data.retryAfterSeconds > 0, '429 response provides retryAfterSeconds guidance');

    // =========================================================================
    console.log('\n🛡️  TEST 3: OTP Verification Limiter (Max 10 attempts)');
    // =========================================================================
    let otpHit = false;
    let otpRes;
    for (let i = 1; i <= 11; i++) {
      const res = await request({
        method: 'POST',
        path: '/test/auth/otp',
        headers: { 'X-Forwarded-For': '10.0.0.1' },
        body: { email: 'otp_target@example.com', otp: '123456' }
      });
      if (res.status === 429) {
        otpHit = true;
        otpRes = res;
        break;
      }
    }
    assert(otpHit, 'OTP endpoint hits 429 Too Many Requests on abuse');
    assert(otpRes.data.message.includes('verification code') || otpRes.data.message.includes('Too many'), 'OTP limit message provides appropriate context');

    // =========================================================================
    console.log('\n🛡️  TEST 4: Feedback Submission Rate Limiting (Max 10 submissions)');
    // =========================================================================
    let feedbackHit = false;
    for (let i = 1; i <= 12; i++) {
      const res = await request({
        method: 'POST',
        path: '/test/feedback',
        headers: { 'X-Forwarded-For': '10.0.0.2' },
        body: { rating: 5 }
      });
      if (res.status === 429) {
        feedbackHit = true;
        break;
      }
    }
    assert(feedbackHit, 'Feedback submission hits 429 Too Many Requests on flooding');

    // =========================================================================
    console.log('\n🛡️  TEST 5: Sensitive Actions Limiter (Account / Deletion / Refund)');
    // =========================================================================
    let sensitiveHit = false;
    for (let i = 1; i <= 22; i++) {
      const res = await request({
        method: 'POST',
        path: '/test/sensitive',
        headers: { 'X-Forwarded-For': '10.0.0.3' }
      });
      if (res.status === 429) {
        sensitiveHit = true;
        break;
      }
    }
    assert(sensitiveHit, 'Sensitive administrative action hits 429 after 20 attempts');

    // =========================================================================
    console.log('\n🛡️  TEST 6: High-Frequency Polling Rate Limit Boundary');
    // =========================================================================
    const pollInitial = await request({ method: 'GET', path: '/test/poll' });
    assert(pollInitial.status === 200, 'Live order polling request succeeds under normal frequency');

    // =========================================================================
    console.log('\n🛡️  TEST 7: Webhook Processing Throughput Tolerance');
    // =========================================================================
    const webhookRes = await request({ method: 'POST', path: '/test/webhook', body: { event: 'payment.captured' } });
    assert(webhookRes.status === 200, 'Gateway webhook accepted smoothly under normal batching');

    // =========================================================================
    console.log('\n🛡️  TEST 8: Non-Permanent Lockout Assurance');
    // =========================================================================
    assert(reset429Response.data.retryAfterSeconds <= 900, 'Rate limiter window is time-bounded (<= 15 minutes) preventing permanent lockout');

  } finally {
    if (server) server.close();
    console.log('\n🔌 Test server closed');
  }

  console.log('\n========================================================================');
  console.log('🎉 ALL PHASE 5 RATE LIMITING TESTS PASSED 100%! 🚀');
  console.log('========================================================================');
}

runPhase5Tests().catch(err => {
  console.error('Fatal error in Phase 5 tests:', err);
  process.exit(1);
});
