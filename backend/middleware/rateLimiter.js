const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// Shared rate limit store loader (Redis if available, in-memory by default)
let sharedStore;
if (process.env.REDIS_URL || process.env.REDIS_HOST) {
  try {
    const { RedisStore } = require('rate-limit-redis');
    const { createClient } = require('redis');
    const redisClient = createClient({
      url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`
    });
    redisClient.connect().catch(err => console.warn('Redis rate limiter connect warning:', err.message));
    sharedStore = new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args)
    });
    console.log('📦 Redis rate-limit store initialized successfully');
  } catch (_) {
    // Optional Redis package fallback
  }
}

// Helper to construct uniform 429 response handler with retry guidance
const createRateLimitHandler = (defaultMessage, windowMs) => (req, res, next, options) => {
  const retryAfterSecs = Math.ceil((options.windowMs || windowMs) / 1000);
  const message = typeof options.message === 'object' && options.message.message
    ? options.message.message
    : (typeof options.message === 'string' ? options.message : defaultMessage);

  res.status(429).json({
    success: false,
    message,
    retryAfterSeconds: retryAfterSecs
  });
};

// ============================================================================
// CONFIGURABLE RATE LIMIT WINDOWS & THRESHOLDS (Environment Variables with Defaults)
// ============================================================================
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000; // 15 mins
const PUBLIC_MAX = parseInt(process.env.RATE_LIMIT_PUBLIC_MAX, 10) || 100;
const AUTH_API_MAX = parseInt(process.env.RATE_LIMIT_AUTH_API_MAX, 10) || 500;
const LOGIN_MAX = parseInt(process.env.RATE_LIMIT_LOGIN_MAX, 10) || 10;
const LOGIN_DELAY_AFTER = parseInt(process.env.RATE_LIMIT_LOGIN_DELAY_AFTER, 10) || 3;

// 1. General Public Limiter (settings, health, public landing)
const publicLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: PUBLIC_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many requests from this IP, please try again later.', WINDOW_MS),
  ...(sharedStore && { store: sharedStore })
});

// 2. Authenticated API Limiter (Standard owner & admin CRUD operations)
const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: AUTH_API_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('API rate limit exceeded, please try again later.', WINDOW_MS),
  ...(sharedStore && { store: sharedStore })
});

// 3. Authentication Rate Limiting (Credential stuffing & brute force protection)
const authIpLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: parseInt(process.env.RATE_LIMIT_AUTH_IP_MAX, 10) || 30, // 30 attempts per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many authentication attempts from this network. Please try again after 15 minutes.', WINDOW_MS),
  ...(sharedStore && { store: sharedStore })
});

// Key generator for account + IP scoped limiting
const authKeyGenerator = (req, res) => {
  const ip = (typeof rateLimit.ipKeyGenerator === 'function')
    ? rateLimit.ipKeyGenerator(req, res)
    : (req.ip || 'unknown-ip');
  const email = (typeof req.body?.email === 'string') ? req.body.email.trim().toLowerCase() : '';
  return `${ip}_${email}`;
};

const authSlowDown = slowDown({
  windowMs: WINDOW_MS,
  delayAfter: LOGIN_DELAY_AFTER,
  delayMs: (hits) => hits * 1000,
  keyGenerator: authKeyGenerator,
});

const authAccountRateLimit = rateLimit({
  windowMs: WINDOW_MS,
  max: LOGIN_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: authKeyGenerator,
  handler: createRateLimitHandler('Too many attempts for this account. Please try again after 15 minutes.', WINDOW_MS),
  ...(sharedStore && { store: sharedStore })
});

const authLimiter = [authIpLimiter, authSlowDown, authAccountRateLimit];

// 4. OTP Limiter (Verification code attempts)
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_OTP_MAX, 10) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: authKeyGenerator,
  handler: createRateLimitHandler('Too many verification code attempts. Please wait 15 minutes before trying again.', 15 * 60 * 1000),
  ...(sharedStore && { store: sharedStore })
});

// 5. Password Reset Limiter (Forgot password request and recovery tokens)
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_PASSWORD_RESET_MAX, 10) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many password reset requests. Please wait 15 minutes before requesting again.', 15 * 60 * 1000),
  ...(sharedStore && { store: sharedStore })
});

// 6. Public Menu Limiter (Patron menu browsing)
const menuLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MENU_MAX, 10) || 150, // 150 reqs/min per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many menu requests. Please slow down.', 60 * 1000),
  ...(sharedStore && { store: sharedStore })
});

// 7. Menu Search Limiter (Regex database search)
const menuSearchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_SEARCH_MAX, 10) || 60, // 60 searches/min per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many search requests. Please slow down.', 60 * 1000),
  ...(sharedStore && { store: sharedStore })
});

// 8. Order Creation Limiter (Prevents order spam / table flooding)
const orderCreationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: parseInt(process.env.RATE_LIMIT_ORDER_CREATION_MAX, 10) || 20, // 20 orders per 10 mins
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Order creation limit reached. Please wait before placing more orders.', 10 * 60 * 1000),
  ...(sharedStore && { store: sharedStore })
});

// 9. Order Polling Limiter (Live order tracking & UPI status checks)
const orderPollingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_ORDER_POLL_MAX, 10) || 120, // 2 requests per second
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Status polling frequency too high. Please slow down.', 60 * 1000),
  ...(sharedStore && { store: sharedStore })
});

// 10. Webhook Processing Limiter (External gateway incoming notifications)
const webhookLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: parseInt(process.env.RATE_LIMIT_WEBHOOK_MAX, 10) || 300, // 300 webhooks per 5 mins
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Webhook rate limit exceeded.', 5 * 60 * 1000),
  ...(sharedStore && { store: sharedStore })
});

// 11. Staff Alert Limiter (Call Waiter / Bill Request spam prevention)
const staffAlertLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: parseInt(process.env.RATE_LIMIT_STAFF_ALERT_MAX, 10) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Staff alert rate limit exceeded. Please wait before alerting staff again.', 5 * 60 * 1000),
  ...(sharedStore && { store: sharedStore })
});

// 12. Feedback Submission Limiter (Review flood protection)
const feedbackSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_FEEDBACK_MAX, 10) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many feedback submissions. Please try again later.', 15 * 60 * 1000),
  ...(sharedStore && { store: sharedStore })
});

// 13. File Upload Limiter (Protects Cloudinary bandwidth & server memory)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX, 10) || 30, // 30 uploads per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('File upload limit exceeded. Please wait before uploading more files.', 15 * 60 * 1000),
  ...(sharedStore && { store: sharedStore })
});

// 14. Expensive Analytics Limiter (Heavy database aggregation queries)
const analyticsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: parseInt(process.env.RATE_LIMIT_ANALYTICS_MAX, 10) || 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Analytics query limit exceeded. Please slow down your requests.', 5 * 60 * 1000),
  ...(sharedStore && { store: sharedStore })
});

// 15. Sensitive Actions Limiter (Account suspension, deletion, refunds, log clear)
const sensitiveActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_SENSITIVE_MAX, 10) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Too many sensitive operations requested. Please wait before trying again.', 15 * 60 * 1000),
  ...(sharedStore && { store: sharedStore })
});

// 16. AI Assistance Limiter (Protects OpenRouter token quota)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AI_MAX, 10) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('AI assistance rate limit exceeded. Please write your feedback manually or try again later.', 15 * 60 * 1000),
  ...(sharedStore && { store: sharedStore })
});

module.exports = {
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
  sensitiveActionLimiter,
  aiLimiter
};
