# 📋 Business Rules Documentation — WhatTheMenu QR Menu SaaS

> **Version:** 1.0.0 | **Last Updated:** October 2026

---

## Table of Contents

1. [User Roles & Permissions](#1-user-roles--permissions)
2. [Subscription Plans & Tier Rules](#2-subscription-plans--tier-rules)
3. [Device Limitation Rules](#3-device-limitation-rules)
4. [Authentication Rules](#4-authentication-rules)
5. [Menu Management Rules](#5-menu-management-rules)
6. [Order Flow Rules](#6-order-flow-rules)
7. [Payment Rules](#7-payment-rules)
8. [Feedback Rules](#8-feedback-rules)
9. [Support Ticket Rules](#9-support-ticket-rules)
10. [Admin Operational Rules](#10-admin-operational-rules)
11. [Maintenance Mode Rules](#11-maintenance-mode-rules)
12. [Email Notification Rules](#12-email-notification-rules)
13. [Rate Limiting Rules](#13-rate-limiting-rules)
14. [Data Retention Rules](#14-data-retention-rules)
15. [QR Code Rules](#15-qr-code-rules)
16. [Theme Rules](#16-theme-rules)

---

## 1. User Roles & Permissions

### Role Hierarchy

```
Super Admin (superadmin)
    └── Full platform access, no restrictions
Café Owner (owner)
    └── Scoped to their own café data only
Customer (no account)
    └── Public access to a specific café's menu
```

### Permission Matrix

| Action | Super Admin | Café Owner | Customer |
|--------|-------------|------------|----------|
| Manage all cafés | ✅ | ❌ | ❌ |
| Manage own café settings | ❌ | ✅ | ❌ |
| View all platform revenue | ✅ | ❌ | ❌ |
| View own café revenue | ❌ | ✅ | ❌ |
| Manage subscriptions | ✅ | View only | ❌ |
| Create/edit menu items | ❌ | ✅ | ❌ |
| Browse menu | N/A | N/A | ✅ |
| Place orders | N/A | N/A | ✅ |
| Manage orders | ❌ | ✅ | View own |
| Access admin panel | ✅ | ❌ | ❌ |
| Platform settings | ✅ | ❌ | ❌ |
| Upload global media | ✅ | ❌ | ❌ |
| View/use global media | ✅ | ✅ | ❌ |
| Submit support tickets | ❌ | ✅ | ❌ |
| Reply to support tickets | ✅ | ❌ | ❌ |
| Enable maintenance mode | ✅ | ❌ | ❌ |

---

## 2. Subscription Plans & Tier Rules

### Plan Tiers

| Feature | Starter (Free Trial) | Pro | Pro Plus |
|---------|---------------------|-----|---------|
| **Price** | Free (trial) / ₹299/mo | ₹499/mo | Higher |
| **Device Limit** | 1 | 2 | 3 |
| **Menu Items** | Up to 50 | Unlimited | Unlimited |
| **Analytics** | Basic | Advanced | Advanced |
| **Support** | Email | Priority | Priority |
| **Custom Domain** | ❌ | ✅ | ✅ |
| **Themes** | classic only | + additional | All themes |
| **Trial Days** | 14 days | — | — |

> Note: Exact feature lists are managed dynamically via the `Settings` model (`starter_features[]`, `pro_features[]`).

### Subscription Status Rules

| Status | Meaning | System Behavior |
|--------|---------|-----------------|
| `active` | Subscription is current | Full access |
| `expired` | End date passed | Restricted access (read-only or locked) |
| `suspended` | Admin suspended | Portal access blocked |

### Trial Plan Rules

1. New owner registrations start on **Starter plan** with a **14-day free trial** (configurable via `Settings.trial_days`)
2. Trial countdown starts from registration date
3. Cron job checks daily and marks trial as expired when `trial_end_date` is reached
4. Owner must upgrade to Pro/Pro Plus for continued full access after trial

### Subscription Upgrade Rules

**Path A — Razorpay (Automated):**
1. Owner initiates upgrade via `/owner/subscription`
2. Backend creates Razorpay subscription
3. Owner pays via Razorpay modal
4. Webhook fires → backend activates new plan

**Path B — Manual UPI (Admin Approval):**
1. Owner submits `SubscriptionRequest` with UPI transaction ID
2. Admin reviews and approves/rejects in admin panel
3. On approval: admin updates subscription via `/api/admin/subscriptions/:id`

### Yearly Billing Rule

- Yearly billing grants `Settings.yearly_discount_percentage` (default 20%) discount
- `billing_cycle: 'yearly'` stored on the Subscription document
- `duration_days` adjusted accordingly (365 days instead of 30)

---

## 3. Device Limitation Rules

### Core Rule

An owner's account can only be logged in on a **limited number of devices simultaneously**, based on their subscription plan.

| Plan | Max Active Sessions |
|------|-------------------|
| Starter | 1 device |
| Pro | 2 devices |
| Pro Plus | 3 devices |

### Session Lifecycle

1. **Login** → JWT token issued, `active_sessions[]` entry added to `Cafe` document
2. **Request** → Every authenticated request validates token exists in `active_sessions[]`
3. **`last_active`** → Refreshed at most once every 10 minutes (throttled to reduce DB writes)
4. **Logout** → Session entry removed from `active_sessions[]`
5. **OTP removal** → On verified OTP, `pending_logout_sessions[]` tokens removed from `active_sessions[]`

### Over-Limit Login Flow

When a new login attempt exceeds the device limit:

```
1. Login request received
2. active_sessions.length >= plan_limit → Device limit reached
3. Generate 6-digit OTP (crypto.randomInt or Math.random)
4. Store OTP (hashed) + expiry (10 min) in cafe.login_otp, login_otp_expire
5. Store targeted session tokens in cafe.pending_logout_sessions[]
6. Send OTP to café owner's email (deviceLogoutOtpTemplate)
7. Return 200 with:
   { requiresOtp: true, message: 'OTP sent', sessions: [{token, device_info, last_active}] }
8. Frontend shows device selection modal:
   - Owner selects which device(s) to log out
   - Submits OTP + selectedTokens[]
9. Backend verifies OTP, removes selected sessions from active_sessions
10. New session added, login completes
```

### Session Validation Per Request

```
Every request to a protected route:
1. Extract JWT from Authorization header
2. Verify JWT signature and expiry
3. Load Cafe document from DB
4. Check: active_sessions.some(s => s.token === token)
   → Found: proceed (+ throttled last_active refresh)
   → Not found: return 401 "Device limit reached. You have been logged out."
```

### Logout Rules

- **Single device logout:** Removes only the current session token
- **OTP-verified logout:** Removes selected pending session tokens
- **Admin suspend:** Clears ALL `active_sessions[]` for the café

---

## 4. Authentication Rules

### Registration Rules

1. Email must be unique across all café accounts
2. Password minimum length: 6 characters
3. On registration, a **set-password link** is emailed (token expires in 10 minutes)
4. Owner cannot login until password is set via the set-password link
5. Café `name` auto-generates a URL `slug` (kebab-case + base-36 timestamp suffix)

### Login Rules

1. Email + password required
2. `is_active` must be `true` — suspended cafés cannot log in
3. `subscription_status` checked — expired accounts may have restricted access
4. Rate limited: max 10 attempts per 15-minute window
5. Slowdown applied: after 3 failed attempts, response delayed progressively

### Password Reset Rules

1. `/api/auth/forgotpassword` sends a reset link to the registered email
2. Reset token is valid for **10 minutes**
3. Token is stored **hashed** in `resetPasswordToken` field
4. On use: token cleared, password updated, bcrypt hash applied

### JWT Rules

- JWT signed with `JWT_SECRET` (env variable)
- Expiry: `JWT_EXPIRE` (default `7d`)
- No refresh token — on expiry, user must log in again
- Token included in every protected request as `Authorization: Bearer <token>`

---

## 5. Menu Management Rules

### Category Rules

1. Categories belong to exactly one café (`cafe_id`)
2. Categories can be reordered via `sort_order`
3. Deleting a category with items should also handle associated menu items

### Menu Item Rules

1. Menu items must belong to a category within the same café
2. Price cannot be negative
3. Each item has:
   - `is_veg: true/false` — shown as green/red indicator to customers
   - `availability: true/false` — hide item from customer menu without deleting
4. Images uploaded to Cloudinary automatically
5. Items can be drag-reordered (`sort_order` field updated via `PUT /owner/menu-items/reorder`)

### Availability Toggle Rule

- `PUT /api/owner/menu-items/:id/availability` toggles the `availability` boolean
- Customers only see items where `availability === true`
- This is the preferred way to "hide" seasonal items

---

## 6. Order Flow Rules

### Order Status State Machine

```
new → accepted → preparing → ready → completed
                                  ↘ cancelled (from any active state)
```

| Transition | Who Can Do It |
|-----------|---------------|
| `new → accepted` | Café Owner |
| `accepted → preparing` | Café Owner |
| `preparing → ready` | Café Owner |
| `ready → completed` | Café Owner |
| `any → cancelled` | Café Owner |

### Order Creation Rules

1. Customer submits name, phone, table number, items, payment method
2. Order number auto-generated: `ORD-{base36-timestamp}-{padded-count}`
3. Token number generated (short display token for kitchen)
4. Order items stored as a **snapshot** — price changes don't affect existing orders
5. Socket.io event fires to café room on creation

### Payment Status Rules

| Status | Meaning |
|--------|---------|
| `pending` | Order placed, payment not confirmed |
| `received` | Cash or online payment received by staff |
| `completed` | Fully settled |
| `failed` | Razorpay payment failed |

### Revenue Ledger Rule

- When an order's payment status moves to `received` or `completed`, an `OrderRevenue` record must be created
- This record is **permanent** — never deleted, even when the Order document expires after 5 days

---

## 7. Payment Rules

### Customer Payment Methods

| Method | Flow |
|--------|------|
| `cash` | Order placed, payment_status = pending; owner marks received manually |
| `online` | Owner receives bank/UPI payment offline, marks received manually |
| `razorpay` | Customer pays via Razorpay modal; webhook auto-confirms |

### Subscription Payment Rules

1. Razorpay subscription created using **platform's** Razorpay keys
2. Owner pays subscription invoice
3. Webhook validates signature before processing
4. Live vs Test mode controlled by `Settings.payment_live_mode`

### Razorpay Refund Rules

1. Only café owners can initiate refunds for their customers
2. Refund via `POST /api/owner/razorpay/refund/:orderId`
3. Razorpay processes refund asynchronously

### Webhook Security Rules

1. Raw request body preserved before JSON parsing
2. HMAC-SHA256 signature verified against `RAZORPAY_WEBHOOK_SECRET`
3. Invalid signatures → request rejected with 400
4. All webhook events logged to `webhook_logs` collection

---

## 8. Feedback Rules

1. Feedback is linked to a specific `order_id` and `cafe_id`
2. Rating must be between **1 and 5**
3. One feedback per order (enforced by UI, not DB unique constraint)
4. No authentication required — any customer who knows the order can submit
5. Feedback is visible to the café owner on their Feedback page
6. Feedback is visible to admin on the café's profile

---

## 9. Support Ticket Rules

1. Only café owners can create support tickets
2. Ticket number auto-generated (unique)
3. Categories: `payment_upi`, `menu_qr`, `live_orders`, `subscription`, `other`
4. Priority levels: `normal`, `high`, `urgent`
5. Status flow: `open → in_progress → resolved → closed`
6. Only admin can reply (`admin_reply` field) and update status
7. `resolved_at` timestamp set when status changes to `resolved`

---

## 10. Admin Operational Rules

### Café Management Rules

1. Admin can create café accounts directly (bypasses email verification flow)
2. Admin can suspend a café → sets `is_active: false`, clears all `active_sessions`
3. Admin can activate a suspended café → sets `is_active: true`
4. Admin can delete a café → removes café + associated data
5. Admin can update any café's details (name, email, subscription)

### Subscription Management Rules

1. Admin can manually set a café's subscription plan, start/end dates
2. Admin can approve or reject `SubscriptionRequest` documents
3. On approval: `Subscription` document created or updated, `SubscriptionHistory` record added
4. All subscription changes logged to `SystemLog`

### Revenue Rules

1. Admin can view **all cafés'** revenue (aggregated and per-café)
2. Revenue comes from `OrderRevenue` collection (permanent ledger)
3. Admin cannot modify revenue records — they are append-only

### System Log Rules

1. Admin actions automatically generate `SystemLog` entries
2. Admin can view logs filtered by date/action
3. Admin can clear logs (destructive action, logged before clearing)

---

## 11. Maintenance Mode Rules

1. Only Super Admin can toggle `Settings.maintenance_mode`
2. When `true`:
   - All non-admin users are redirected to `/maintenance` page
   - Customer menus are inaccessible
   - Owner dashboard is inaccessible
   - Admin login at `/admin/codifires` remains accessible
3. Maintenance mode check happens in `App.jsx` on every page load/route change
4. Super Admin users are exempt from the redirect

---

## 12. Email Notification Rules

### Triggers

| Event | Email Sent To | Template |
|-------|--------------|---------|
| Owner registration | New owner | Welcome + set-password link |
| Forgot password | Registered owner | Reset password link |
| Subscription expiring (3 days out) | Café owner | Expiry warning email |
| Device limit reached on login | Café owner | OTP code for device logout |

### OTP Email Rules

1. OTP is **6 digits**, randomly generated
2. Valid for **10 minutes**
3. Stored hashed/plain in `cafe.login_otp`, expiry in `cafe.login_otp_expire`
4. Email sent to café's registered email address
5. Max one OTP active at a time — new login attempt overwrites previous OTP

---

## 13. Rate Limiting Rules

| Limiter | Applied To | Window | Max Requests | Behavior on Exceed |
|---------|------------|--------|--------------|--------------------|
| `publicLimiter` | Menu, Orders, Feedback | 15 min | 100 | 429 Too Many Requests |
| `authLimiter` | Login, Register, OTP | 15 min | 10 | 429 Too Many Requests |
| `apiLimiter` | Owner & Admin API | 15 min | 500 | 429 Too Many Requests |
| Slowdown | Login attempts after 3 | Per request | — | Progressive delay |

Rate limit headers returned to client:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `Retry-After`

---

## 14. Data Retention Rules

| Data | Retention Policy | Reason |
|------|-----------------|--------|
| Orders | **5 days** (TTL index) | Operational data, not archived |
| Order Revenue | **Forever** | Financial ledger, immutable |
| Subscriptions | **Forever** | Billing records |
| Subscription History | **Forever** | Audit trail |
| Feedback | Until café deleted | Owner insights |
| Support Tickets | Until admin clears | Helpdesk records |
| System Logs | Until admin clears | Audit trail |
| Webhook Logs | Until admin clears | Payment audit |
| OTP tokens | Auto-expired (10 min) | Security hygiene |
| Reset tokens | Auto-expired (10 min) | Security hygiene |

---

## 15. QR Code Rules

1. Each café gets **exactly one** QR code (`cafe_id` is unique in `qrcodes`)
2. QR code encodes the URL: `https://[FRONTEND_URL]/:cafeId/menu`
3. Owner can **regenerate** their QR code (new image, same URL unless slug changes)
4. QR code is generated on the backend using the `qrcode` npm library
5. QR image stored as base64 or Cloudinary URL

---

## 16. Theme Rules

1. All café owners start with `classic` theme (always unlocked)
2. Additional themes (`midnight`, `blackgold`, `forest`, `rose`) must be unlocked before use
3. Themes are unlocked by subscription plan or direct admin grant
4. `theme_settings.unlocked_themes[]` stores which themes are available
5. `theme_settings.active_theme` stores the currently applied theme
6. Themes only affect the **customer-facing portal** — owner dashboard always uses the default dark theme
7. Admin can see but not override a café's theme

---

*This document defines the business rules as implemented in the production system.*  
*All rule changes must be reflected in both this document and the corresponding code.*
