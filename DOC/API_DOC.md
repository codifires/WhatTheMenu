# 🔌 API Documentation — WhatTheMenu QR Menu SaaS

> **Version:** 1.0.0 | **Last Updated:** October 2026  
> **Base URL:** `https://api.whatthemenu.com/api`  
> **Authentication:** `Authorization: Bearer <JWT_TOKEN>`

---

## Table of Contents

1. [Authentication Routes](#1-authentication-routes)
2. [Owner Routes](#2-owner-routes)
3. [Admin Routes](#3-admin-routes)
4. [Customer Routes (Public)](#4-customer-routes-public)
5. [Payment Routes (Razorpay)](#5-payment-routes-razorpay)
6. [Webhook Routes](#6-webhook-routes)
7. [Public Settings Route](#7-public-settings-route)
8. [Support Routes](#8-support-routes)
9. [Response Format](#9-response-format)
10. [Error Codes Reference](#10-error-codes-reference)

---

## 1. Authentication Routes

**Base:** `/api/auth`  
**Rate Limit:** `authLimiter` — 10 requests / 15 min

---

### `POST /api/auth/register`

Register a new café owner account.

**Auth Required:** No  
**Body:**

```json
{
  "name": "My Café",
  "email": "owner@mycafe.com",
  "password": "securepassword"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "Registration successful. Check your email to set your password."
}
```

---

### `POST /api/auth/check-availability`

Check if an email is already registered.

**Auth Required:** No  
**Body:** `{ "email": "owner@mycafe.com" }`  
**Response:** `{ "success": true, "available": true }`

---

### `POST /api/auth/login`

Log in as café owner or super admin.

**Auth Required:** No  
**Body:**

```json
{
  "email": "owner@mycafe.com",
  "password": "securepassword"
}
```

**Success Response (200) — Normal Login:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "...", "name": "My Café", "email": "owner@mycafe.com", "role": "owner" }
}
```

**Success Response (200) — Device Limit Reached:**

```json
{
  "success": true,
  "requiresOtp": true,
  "message": "OTP sent to your email. Select devices to log out.",
  "sessions": [
    { "token": "tok123...", "device_info": "Chrome on Windows", "last_active": "2026-10-18T..." }
  ]
}
```

---

### `POST /api/auth/verify-login-otp`

Verify OTP and complete login when device limit is exceeded.

**Auth Required:** No  
**Body:**

```json
{
  "email": "owner@mycafe.com",
  "otp": "123456",
  "selectedTokens": ["tok123..."]
}
```

**Success Response (200):**

```json
{
  "success": true,
  "token": "eyJhbGci...",
  "user": { "id": "...", "name": "My Café", "role": "owner" }
}
```

---

### `POST /api/auth/forgotpassword`

Send password reset email.

**Auth Required:** No  
**Body:** `{ "email": "owner@mycafe.com" }`  
**Response:** `{ "success": true, "message": "Email sent" }`

---

### `POST /api/auth/set-password/:token`

Set a new password using the reset token.

**Auth Required:** No  
**Body:** `{ "password": "newpassword" }`  
**Response:** `{ "success": true, "message": "Password set successfully" }`

---

### `GET /api/auth/me`

Get the currently authenticated user's profile.

**Auth Required:** Yes (any role)  
**Response:**

```json
{
  "success": true,
  "data": { "id": "...", "name": "My Café", "email": "...", "role": "owner", "subscription": {...} }
}
```

---

### `POST /api/auth/logout`

Logout current device session.

**Auth Required:** Yes  
**Response:** `{ "success": true, "message": "Logged out successfully" }`

---

## 2. Owner Routes

**Base:** `/api/owner`  
**Auth Required:** Yes — `role: owner`  
**Rate Limit:** `apiLimiter` — 500 requests / 15 min

---

### Dashboard & Revenue

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/owner/dashboard` | Get dashboard KPIs, recent orders, revenue summary |
| `GET` | `/api/owner/revenue` | Get permanent revenue ledger records |

---

### Categories

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `GET` | `/api/owner/categories` | — | Get all categories for this café |
| `POST` | `/api/owner/categories` | `{ name, sort_order }` | Create new category |
| `PUT` | `/api/owner/categories/:id` | `{ name, sort_order }` | Update category |
| `DELETE` | `/api/owner/categories/:id` | — | Delete category |

---

### Menu Items

| Method | Endpoint | Body / Notes | Description |
|--------|----------|------|-------------|
| `GET` | `/api/owner/menu-items` | — | Get all menu items |
| `POST` | `/api/owner/menu-items` | `multipart/form-data` with `image` field | Create menu item |
| `PUT` | `/api/owner/menu-items/:id` | `multipart/form-data` with optional `image` | Update menu item |
| `DELETE` | `/api/owner/menu-items/:id` | — | Delete menu item |
| `PUT` | `/api/owner/menu-items/:id/availability` | — | Toggle item availability |
| `PUT` | `/api/owner/menu-items/reorder` | `{ items: [{id, sort_order}] }` | Reorder menu items |

**Menu Item Body:**

```json
{
  "category_id": "...",
  "name": "Masala Chai",
  "description": "Freshly brewed spiced tea",
  "price": 30,
  "is_veg": true,
  "availability": true,
  "sort_order": 0
}
```

---

### Orders

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `GET` | `/api/owner/orders` | Query: `?status=new` | Get orders (filter by status) |
| `PUT` | `/api/owner/orders/:id/status` | `{ order_status }` | Update order status |
| `PUT` | `/api/owner/orders/:id/payment` | `{ payment_status }` | Update payment status |

---

### QR Code

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/owner/qr-code` | Get QR code image and menu URL |
| `POST` | `/api/owner/qr-code/regenerate` | Regenerate QR code image |

---

### Feedback

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/owner/feedback` | Get all customer feedback for this café |

---

### Settings

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `PUT` | `/api/owner/settings` | `multipart/form-data` with optional `logo` | Update café settings |
| `PUT` | `/api/owner/settings/theme` | `{ active_theme }` | Update active customer theme |

**Settings Body Fields:**

```json
{
  "name": "My Café",
  "address": "123 MG Road",
  "phone": "+91 9876543210",
  "tax_percentage": 5,
  "billing_settings": {
    "format": "standard",
    "tax_number": "GSTIN123",
    "thank_you_message": "Thank you!"
  },
  "razorpay_key_id": "rzp_live_xxx",
  "razorpay_key_secret": "xxx",
  "razorpay_webhook_secret": "xxx"
}
```

> **Security Note:** `razorpay_key_secret` and `razorpay_webhook_secret` are **write-only configuration fields**. They are stored securely with `select: false` on the server and are **never** returned in GET or PUT responses to the browser. Each café owner can only configure their own credentials via their authenticated session token.

---

### Subscription (Manual UPI Flow)

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `POST` | `/api/owner/subscription/request` | `{ plan_name, duration_days, upi_transaction_id }` | Submit manual upgrade request |
| `POST` | `/api/owner/subscription/initiate` | `{ plan_name, duration_days }` | Initiate UPI session |
| `GET` | `/api/owner/subscription/status` | — | Check current subscription status |
| `POST` | `/api/owner/subscription/cancel` | — | Cancel pending subscription session |

---

### Media

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/owner/media/global` | Get admin's global media library |

---

## 3. Admin Routes

**Base:** `/api/admin`  
**Auth Required:** Yes — `role: superadmin`  
**Rate Limit:** `apiLimiter` — 500 requests / 15 min

---

### Dashboard & Revenue

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/dashboard` | Platform KPIs: total cafés, revenue, subscriptions, tickets |
| `GET` | `/api/admin/revenue` | All cafés combined revenue history |
| `GET` | `/api/admin/payments` | All payment records |

---

### Café Management

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `GET` | `/api/admin/cafes` | — | List all cafés with subscription info |
| `POST` | `/api/admin/cafes` | `multipart/form-data` | Create new café account |
| `GET` | `/api/admin/cafes/:id` | — | Get single café details |
| `PUT` | `/api/admin/cafes/:id` | `multipart/form-data` | Update café details |
| `DELETE` | `/api/admin/cafes/:id` | — | Delete café and all associated data |
| `PUT` | `/api/admin/cafes/:id/suspend` | — | Suspend café (clears sessions) |
| `PUT` | `/api/admin/cafes/:id/activate` | — | Reactivate suspended café |

---

### Subscription Management

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `GET` | `/api/admin/subscriptions` | — | List all subscriptions |
| `PUT` | `/api/admin/subscriptions/:id` | `{ plan_name, start_date, end_date, status }` | Update subscription |
| `GET` | `/api/admin/subscriptions/:cafeId/history` | — | Get subscription history for a café |

---

### Subscription Requests

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `GET` | `/api/admin/subscription-requests` | — | List pending manual upgrade requests |
| `PUT` | `/api/admin/subscription-requests/:id/approve` | `{ notes }` | Approve and activate subscription |
| `PUT` | `/api/admin/subscription-requests/:id/reject` | `{ notes }` | Reject request with reason |

---

### Platform Settings

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `GET` | `/api/admin/settings` | — | Get current platform settings |
| `PUT` | `/api/admin/settings` | All settings fields | Update platform settings |

---

### System Logs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/logs` | Get system audit logs |
| `DELETE` | `/api/admin/logs/clear` | Clear all system logs |

---

### Global Media Library

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `GET` | `/api/admin/media` | — | List all global media items |
| `POST` | `/api/admin/media` | `multipart/form-data` with `image` | Upload to global media |
| `DELETE` | `/api/admin/media/:id` | — | Delete a global media item |

---

## 4. Customer Routes (Public)

**No authentication required.**  
**Rate Limit:** `publicLimiter` — 100 requests / 15 min

---

### Menu

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/menu/:cafeId` | Get full menu (categories + items) for a café |
| `GET` | `/api/menu/:cafeId/search?q=chai` | Search menu items by name |

**Menu Response:**

```json
{
  "success": true,
  "data": {
    "cafe": { "name": "...", "logo": "...", "theme": "classic" },
    "categories": [
      {
        "_id": "...",
        "name": "Beverages",
        "items": [
          { "_id": "...", "name": "Masala Chai", "price": 30, "is_veg": true, "image": "..." }
        ]
      }
    ]
  }
}
```

---

### Orders

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `POST` | `/api/orders` | Order body | Place a new customer order |
| `GET` | `/api/orders/:orderNumber` | — | Track order status by order number |

**Order Request Body:**

```json
{
  "cafe_id": "...",
  "customer_name": "Ravi Kumar",
  "customer_phone": "9876543210",
  "table_number": "T5",
  "items": [
    { "menu_item_id": "...", "name": "Masala Chai", "quantity": 2, "price": 30 }
  ],
  "total_amount": 60,
  "payment_method": "cash",
  "notes": "Extra sugar"
}
```

---

### Feedback

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `POST` | `/api/feedback` | `{ order_id, cafe_id, rating, review, customer_name }` | Submit order feedback |

---

## 5. Payment Routes (Razorpay)

### Owner Subscription Payments

**Auth Required:** Yes — `role: owner`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/owner/razorpay/create-subscription` | Create a Razorpay subscription plan |
| `POST` | `/api/owner/razorpay/verify-subscription` | Verify subscription payment signature |
| `POST` | `/api/owner/razorpay/cancel-subscription` | Cancel active Razorpay subscription |
| `GET` | `/api/owner/razorpay/invoices` | Get subscription invoices |
| `POST` | `/api/owner/razorpay/refund/:orderId` | Initiate refund for a customer order |

### Customer Order Payments

**Auth Required:** No (public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/orders/create-razorpay-order` | Create Razorpay order for customer checkout |
| `POST` | `/api/orders/verify-razorpay-payment` | Verify customer payment signature |

---

## 6. Webhook Routes

Webhook routes are registered **before** `express.json()` middleware to preserve the raw body for signature verification.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/webhooks/razorpay/subscription` | Razorpay subscription events (activated, halted, cancelled) |
| `POST` | `/api/webhooks/razorpay/order` | Razorpay order payment events (captured, failed) |

**Security:** HMAC-SHA256 signature validated using `RAZORPAY_WEBHOOK_SECRET` before processing.

---

## 7. Public Settings Route

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/settings/public` | None | Get public platform config for landing page |
| `GET` | `/api/health` | None | Health check endpoint |

**Settings Public Response:**

```json
{
  "success": true,
  "data": {
    "trial_days": 14,
    "currency": "INR",
    "admin_upi_id": "admin@upi",
    "starter_price": 299,
    "pro_price": 499,
    "yearly_discount_percentage": 20,
    "maintenance_mode": false,
    "starter_features": ["Digital QR Menu", "Basic Analytics", "Up to 50 Menu Items"],
    "pro_features": ["Everything in Starter", "Unlimited Menu Items", "Priority Support"],
    "cafe_count": 42
  }
}
```

---

## 8. Support Routes

**Base:** `/api/support`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/support/tickets` | Owner | Submit new support ticket |
| `GET` | `/api/support/tickets` | Owner | Get own tickets |
| `GET` | `/api/support/tickets/:id` | Owner | Get single ticket |
| `GET` | `/api/support/admin/tickets` | Admin | Get all tickets with filters |
| `PUT` | `/api/support/admin/tickets/:id` | Admin | Reply to ticket and update status |

**Ticket Body:**

```json
{
  "subject": "Menu images not showing",
  "category": "menu_qr",
  "description": "After uploading, images appear broken.",
  "priority": "high"
}
```

---

## 9. Response Format

All API responses follow a standard format:

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response

```json
{
  "success": false,
  "message": "Human-readable error description",
  "errors": [ { "field": "email", "message": "Email is required" } ]
}
```

### Pagination Response (where applicable)

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 85,
    "pages": 5
  }
}
```

---

## 10. Error Codes Reference

| HTTP Status | Meaning | Common Cause |
|-------------|---------|-------------|
| `200` | OK | Successful request |
| `201` | Created | Resource successfully created |
| `400` | Bad Request | Validation error, missing fields |
| `401` | Unauthorized | No token, invalid token, expired session |
| `403` | Forbidden | Role not authorized for this route |
| `404` | Not Found | Resource not found in DB |
| `409` | Conflict | Duplicate resource (e.g., email already exists) |
| `422` | Unprocessable Entity | Invalid data format |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Server Error | Unhandled exception |

### Common 401 Scenarios

| Message | Cause |
|---------|-------|
| `Not authorized - no token provided` | Bearer token missing from header |
| `Not authorized - invalid token` | Token signature mismatch or expired JWT |
| `Device limit reached. You have been logged out.` | Session removed due to device limit enforcement |
| `User not found` | User deleted after token was issued |

---

*This document covers all API endpoints as defined in `backend/routes/`.*  
*Update when adding new routes or changing request/response contracts.*
