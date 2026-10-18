# 🔒 Security Documentation — WhatTheMenu QR Menu SaaS

> **Version:** 1.0.0 | **Last Updated:** October 2026

---

## Table of Contents

1. [Security Overview](#1-security-overview)
2. [Authentication Security](#2-authentication-security)
3. [Authorization & Role-Based Access Control](#3-authorization--role-based-access-control)
4. [Device Session Management](#4-device-session-management)
5. [Password Security](#5-password-security)
6. [JWT Token Security](#6-jwt-token-security)
7. [OTP Security](#7-otp-security)
8. [Rate Limiting & Brute Force Protection](#8-rate-limiting--brute-force-protection)
9. [Razorpay Webhook Security](#9-razorpay-webhook-security)
10. [Input Validation & Sanitization](#10-input-validation--sanitization)
11. [CORS Policy](#11-cors-policy)
12. [Media Upload Security (Cloudinary)](#12-media-upload-security-cloudinary)
13. [Database Security](#13-database-security)
14. [Environment Variable Management](#14-environment-variable-management)
15. [Admin Portal Security](#15-admin-portal-security)
16. [Known Security Notes & Recommendations](#16-known-security-notes--recommendations)

---

## 1. Security Overview

WhatTheMenu is a multi-tenant SaaS platform with three distinct user types. Security is implemented in layers:

| Layer | Technology | Protects |
|-------|------------|---------|
| Transport | HTTPS (TLS) | All data in transit |
| Authentication | JWT + bcrypt | Identity verification |
| Authorization | Role-based middleware | Route-level access control |
| Session | `active_sessions[]` in DB | Device limit enforcement |
| Rate Limiting | express-rate-limit | Brute force & DoS protection |
| Webhook | HMAC-SHA256 | Razorpay event authenticity |
| Input | express-validator | SQL/NoSQL injection, XSS |
| Secrets | Environment variables | API keys and credentials |

---

## 2. Authentication Security

### Login Flow

```
1. User submits email + password
2. Rate limit check (authLimiter — max 10/15min)
3. Find user in DB (Cafe or Admin by email)
4. Check is_active === true (suspended users blocked)
5. bcrypt.compare(password, hashed_password)
6. On success: generate JWT, add session to active_sessions[]
7. Return token to client
```

### Token Storage

- JWT stored in `localStorage` on the frontend
- Every API request sends: `Authorization: Bearer <token>` header
- Backend never uses cookies — no CSRF risk from cookies

### Session Invalidation

Sessions are invalidated when:
- Explicit logout (`POST /api/auth/logout`)
- OTP-verified device logout
- Admin suspends the café account
- Token removed from `active_sessions[]` for any reason

After invalidation, the old JWT will fail validation on every subsequent request because the `protect()` middleware checks that the token exists in `active_sessions[]`.

---

## 3. Authorization & Role-Based Access Control

### Middleware Chain

```js
// backend/middleware/auth.js
const protect = async (req, res, next) => {
  // 1. Extract Bearer token from header
  // 2. Verify JWT signature and expiry
  // 3. Load user from DB (Admin or Cafe based on role in token)
  // 4. For owners: check token exists in active_sessions[]
  // 5. Throttle last_active timestamp refresh
  // 6. Attach req.user and proceed
};

const authorize = (...roles) => {
  return (req, res, next) => {
    // Check req.user.role is in allowed roles list
    // If not: return 403 Forbidden
  };
};
```

### Route Protection

| Route Group | Middleware Applied |
|-------------|-------------------|
| `/api/owner/*` | `protect` + `authorize('owner')` |
| `/api/admin/*` | `protect` + `authorize('superadmin')` |
| `/api/auth/me` | `protect` |
| `/api/auth/logout` | `protect` |
| `/api/menu/*` | `publicLimiter` only |
| `/api/orders/*` | `publicLimiter` only |
| `/api/feedback/*` | `publicLimiter` only |

### Cross-Tenant Data Isolation

All owner-facing queries are scoped by `cafe_id`:

```js
// Every query in ownerController.js uses:
const cafe_id = req.user._id;

// Example:
const items = await MenuItem.find({ cafe_id });
const orders = await Order.find({ cafe_id });
const feedback = await Feedback.find({ cafe_id });
```

Owners **cannot** query other cafés' data — this is enforced at the query level, not just UI level.

---

## 4. Device Session Management

### How Sessions Are Tracked

Each owner's `Cafe` document contains `active_sessions[]` — an array of:

```json
{
  "token": "eyJhbGci...",
  "device_info": "Chrome 120 on Windows 11",
  "last_active": "2026-10-18T08:30:00Z"
}
```

### Session Limit Enforcement (Per Request)

```js
// In protect() middleware, for every authenticated owner request:
const isValid = req.user.active_sessions.some(s => s.token === token);
if (!isValid) {
  return res.status(401).json({
    message: 'Device limit reached. You have been logged out.'
  });
}
```

This means:
- A removed session token becomes **immediately invalid** — no grace period
- Even if someone has the JWT, if it's not in `active_sessions[]`, access is denied
- This provides **near-real-time session revocation** without server-side token blacklisting

### Session Staleness & Cleanup

- `last_active` refreshed at most once every 10 minutes (throttled)
- Admin can clear all sessions by suspending/activating a café
- Old sessions can be pruned by the owner via OTP logout flow
- Expired subscriptions may trigger session management warnings

---

## 5. Password Security

### Hashing

```js
// bcrypt with salt rounds: 12
const salt = await bcrypt.genSalt(12);
this.password = await bcrypt.hash(this.password, salt);
```

**Salt rounds: 12** — this makes each bcrypt hash ~250ms to compute, making brute force attacks computationally expensive.

### Password Field Protection

```js
// In Cafe schema:
password: {
  type: String,
  required: true,
  select: false  // Never returned in queries by default
}
```

The password hash is excluded from all database results unless explicitly selected with `.select('+password')`.

### Password Reset Security

1. `crypto.randomBytes(20)` generates a cryptographically secure random token
2. Token is **SHA-256 hashed** before storage in DB
3. Only the **raw token** is sent via email — DB stores the hash
4. Even if the DB is compromised, the reset token cannot be reused without the email
5. Reset tokens expire in **10 minutes**

---

## 6. JWT Token Security

### Configuration

```js
// backend/utils/jwt.js
jwt.sign(
  { id: user._id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRE || '7d' }
)
```

### Security Properties

| Property | Value | Security Implication |
|----------|-------|---------------------|
| Algorithm | HS256 | Symmetric signing (same secret for sign + verify) |
| Expiry | 7 days | Long-lived for UX, but bounded |
| Payload | `{ id, role }` only | Minimal data in token |
| Storage | `localStorage` | XSS risk (see recommendations) |

### Token Verification

```js
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

If verification fails (wrong secret, expired, tampered) → 401 Unauthorized.

---

## 7. OTP Security

### Generation

```js
// 6-digit OTP
const otp = Math.floor(100000 + Math.random() * 900000).toString();
```

> **Note:** `Math.random()` is not cryptographically secure. For production hardening, consider using `crypto.randomInt(100000, 999999)`.

### Storage & Expiry

```js
cafe.login_otp = otp;
cafe.login_otp_expire = Date.now() + 10 * 60 * 1000; // 10 minutes
```

### Verification

```js
if (cafe.login_otp !== otp || Date.now() > cafe.login_otp_expire) {
  return res.status(400).json({ message: 'Invalid or expired OTP' });
}
// On success: clear OTP fields
cafe.login_otp = undefined;
cafe.login_otp_expire = undefined;
```

### OTP Transmission

- Sent via Gmail SMTP (Nodemailer)
- Uses `deviceLogoutOtpTemplate` — branded HTML email with prominent OTP display
- OTP is valid for exactly 10 minutes

---

## 8. Rate Limiting & Brute Force Protection

### Rate Limiters

```js
// backend/middleware/rateLimiter.js

// Public routes (menu, orders, feedback)
publicLimiter: {
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100
}

// Auth routes (login, register, OTP)
authLimiter: {
  windowMs: 15 * 60 * 1000,
  max: 10
}

// Protected API routes (owner, admin)
apiLimiter: {
  windowMs: 15 * 60 * 1000,
  max: 500
}
```

### Progressive Slowdown

Applied to login route using `express-slow-down`:

```js
// After 3 failed attempts, each subsequent attempt is delayed by 1 second
slowDown: {
  delayAfter: RATE_LIMIT_LOGIN_DELAY_AFTER,  // default: 3
  delayMs: 1000
}
```

### Rate Limit Headers

Clients receive:
- `X-RateLimit-Limit` — max requests
- `X-RateLimit-Remaining` — remaining requests in window
- `Retry-After` — seconds until window resets (on 429)

### Proxy Trust

```js
app.set('trust proxy', 1);
```

Required for accurate IP-based rate limiting when behind Render/Nginx reverse proxy. Without this, all requests appear to come from the same IP.

---

## 9. Razorpay Webhook Security

Webhooks are the most security-sensitive endpoints — they trigger subscription activations and payment confirmations.

### Raw Body Preservation

```js
// server.js — registered BEFORE express.json()
app.post('/api/webhooks/razorpay/subscription',
  express.json({
    verify: (req, res, buf) => { req.rawBody = buf.toString(); }
  }),
  handleSubscriptionWebhook
);
```

This captures the raw request body before JSON parsing — required for HMAC signature verification.

### Signature Verification

```js
// In razorpayController.js
const crypto = require('crypto');
const expectedSignature = crypto
  .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
  .update(req.rawBody)
  .digest('hex');

if (req.headers['x-razorpay-signature'] !== expectedSignature) {
  return res.status(400).json({ message: 'Invalid webhook signature' });
}
```

Any webhook with a mismatched signature is **rejected immediately** — preventing spoofed payment confirmations.

---

## 10. Input Validation & Sanitization

### Library: `express-validator`

Validators are defined in `backend/validators/` and applied to routes:

```js
// Example: authValidators.js
body('email').isEmail().normalizeEmail()
body('password').isLength({ min: 6 })
body('name').trim().notEmpty()
```

### Custom Validate Middleware

```js
// backend/middleware/validator.js
const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};
```

### NoSQL Injection Prevention

Mongoose sanitizes all queries — object values are cast to the expected type. Passing `{ $gt: '' }` as an email will fail Mongoose's type validation.

---

## 11. CORS Policy

### Current Configuration

```js
// server.js
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true
}));
```

> **Note:** CORS is currently set to allow all origins (`callback(null, true)`). While this simplifies development and deployment, for production hardening it's recommended to whitelist only `FRONTEND_URL`.

### Recommended Production CORS

```js
origin: (origin, callback) => {
  const allowed = process.env.FRONTEND_URL.split(',').map(s => s.trim());
  if (!origin || allowed.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
}
```

---

## 12. Media Upload Security (Cloudinary)

### Upload Restrictions

```js
// backend/middleware/upload.js (Multer)
limits: {
  fileSize: 5 * 1024 * 1024  // 5MB max
}
fileFilter: (req, file, cb) => {
  // Only allow image MIME types
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
}
```

### Cloudinary Security

- Files uploaded using Cloudinary API key + secret (server-side only)
- API credentials never exposed to frontend
- `CLOUDINARY_API_SECRET` stored in environment variables, not in code
- Cloudinary provides CDN delivery with optional access controls

---

## 13. Database Security

### MongoDB Atlas Security

- IP whitelist configured in Atlas (restrict to Render's IP range in production)
- Credentials stored in `MONGO_URI` environment variable — not in code
- Separate databases for test and production environments

### Sensitive Field Protection

Fields marked `select: false` are never returned in queries unless explicitly requested:

| Model | Protected Fields |
|-------|----------------|
| `Cafe` | `password`, `razorpay_key_secret`, `razorpay_webhook_secret` |
| `Admin` | `password` |

### Data Isolation

All multi-tenant queries include `cafe_id` filter — a café owner cannot accidentally or maliciously access another café's data through the API.

---

## 14. Environment Variable Management

### Required Variables (Production)

| Variable | Purpose | Security Level |
|----------|---------|---------------|
| `JWT_SECRET` | JWT signing key | 🔴 Critical |
| `MONGO_URI` | Production DB connection | 🔴 Critical |
| `SMTP_PASSWORD` | Gmail App Password | 🔴 Critical |
| `CLOUDINARY_API_SECRET` | Media upload | 🔴 Critical |
| `RAZORPAY_KEY_SECRET` | Platform payments | 🔴 Critical |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook verification | 🔴 Critical |
| `MONGO_URI_TEST` | Test DB connection | 🟡 Sensitive |
| `SMTP_EMAIL` | Email sender | 🟡 Sensitive |
| `CLOUDINARY_API_KEY` | Media upload | 🟡 Sensitive |

### Security Rules

1. `.env` file is in `.gitignore` — **never committed to source control**
2. `.env.example` file exists with placeholder values — safe to commit
3. Production secrets managed via Render's environment variables dashboard
4. No secrets hardcoded in any source file
5. Gmail App Password: spaces stripped before use (`replace(/\s+/g, '')`)

---

## 15. Admin Portal Security

### Hidden URL

The admin portal is accessible only at `/admin/codifires` — this URL is:
- Not linked from any public page
- Not documented in public-facing content
- Not in any `<meta>` or sitemap

### Admin Authentication

Same JWT mechanism as owner, but:
- Role `superadmin` stored in token
- `Admin` model queried (not `Cafe`)
- No device limit (admin is trusted)
- No OTP flow

### Admin Login URL

The URL `/admin/codifires` is intentionally obscured. Any redirect to `/admin` from unknown roles shows the login page — not an error that reveals the admin portal exists.

---

## 16. Known Security Notes & Recommendations

### ⚠️ Current Gaps & Recommendations

| Issue | Severity | Recommendation |
|-------|----------|----------------|
| `Math.random()` for OTP generation | Medium | Replace with `crypto.randomInt(100000, 999999)` |
| JWT in `localStorage` (XSS risk) | Medium | Consider `httpOnly` cookies with CSRF protection |
| CORS allows all origins | Low-Medium | Restrict to `FRONTEND_URL` in production |
| No refresh token mechanism | Low | Add refresh token for better UX on expiry |
| OTP not hashed before storage | Low | Hash OTP before storing in DB |
| No account lockout after N failed logins | Medium | Add lockout after 10 consecutive failures |
| Duplicate fields in Settings.js | Low | Clean up duplicate schema definitions |

### ✅ Security Strengths

- Password hashing with bcrypt (salt 12) — industry standard
- HMAC-SHA256 webhook verification — prevents spoofed payments
- Per-request session token validation — near-real-time revocation
- Input validation on all user-facing routes
- Field-level `select: false` for sensitive data
- Tenant data isolation enforced at query level
- Rate limiting on all route groups
- Separate production/test databases

---

*This document reflects the security implementation as of October 2026.*  
*Security audit and penetration testing recommended before any major user growth.*
