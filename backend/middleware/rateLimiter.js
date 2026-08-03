const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// Configuration from env or defaults
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000; // 15 minutes
const PUBLIC_MAX = parseInt(process.env.RATE_LIMIT_PUBLIC_MAX, 10) || 100;
const AUTH_API_MAX = parseInt(process.env.RATE_LIMIT_AUTH_API_MAX, 10) || 500;
const LOGIN_MAX = parseInt(process.env.RATE_LIMIT_LOGIN_MAX, 10) || 10;
const LOGIN_DELAY_AFTER = parseInt(process.env.RATE_LIMIT_LOGIN_DELAY_AFTER, 10) || 3;

// 1. Public endpoints limiter (Moderate)
const publicLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: PUBLIC_MAX,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// 2. API endpoints limiter (Looser, for authenticated users)
const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: AUTH_API_MAX,
  message: {
    success: false,
    message: 'API rate limit exceeded, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 3. Auth routes limiter (Stricter, per-IP and per-account with exponential backoff)

// Key generator for per-account + IP limiting on auth routes
const authKeyGenerator = (req, res) => {
  const ip = rateLimit.ipKeyGenerator(req, res);
  const email = req.body?.email ? req.body.email.toLowerCase() : '';
  return `${ip}_${email}`; // Limits specific IP attacking a specific account
};

// Exponential backoff for auth routes
const authSlowDown = slowDown({
  windowMs: WINDOW_MS,
  delayAfter: LOGIN_DELAY_AFTER, // Allow few attempts before delaying
  delayMs: (hits) => hits * 1000, // Add 1s delay per request above the limit (1s, 2s, 3s, etc.)
  keyGenerator: authKeyGenerator,
});

// Hard lockout for auth routes
const authRateLimit = rateLimit({
  windowMs: WINDOW_MS,
  max: LOGIN_MAX,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: authKeyGenerator,
});

// Combine slow down and hard limit for auth
const authLimiter = [authSlowDown, authRateLimit];

module.exports = {
  publicLimiter,
  apiLimiter,
  authLimiter
};
