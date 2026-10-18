# 🗄️ Database Schema Documentation — WhatTheMenu QR Menu SaaS

> **Version:** 1.0.0 | **Last Updated:** October 2026  
> **Database:** MongoDB Atlas | **ODM:** Mongoose 8.7

---

## Table of Contents

1. [Database Strategy](#1-database-strategy)
2. [Collections Overview](#2-collections-overview)
3. [Schema Definitions](#3-schema-definitions)
   - [admins](#31-admins-collection)
   - [cafes](#32-cafes-collection)
   - [categories](#33-categories-collection)
   - [menu_items](#34-menu_items-collection)
   - [orders](#35-orders-collection)
   - [order_revenues](#36-order_revenues-collection)
   - [qrcodes](#37-qrcodes-collection)
   - [feedbacks](#38-feedbacks-collection)
   - [subscriptions](#39-subscriptions-collection)
   - [subscription_histories](#310-subscription_histories-collection)
   - [subscription_requests](#311-subscription_requests-collection)
   - [support_tickets](#312-support_tickets-collection)
   - [settings](#313-settings-collection)
   - [global_medias](#314-global_medias-collection)
   - [system_logs](#315-system_logs-collection)
   - [webhook_logs](#316-webhook_logs-collection)
4. [Relationships Diagram](#4-relationships-diagram)
5. [Indexes](#5-indexes)
6. [TTL Policies](#6-ttl-policies)
7. [Design Notes & Gotchas](#7-design-notes--gotchas)

---

## 1. Database Strategy

### Dual-Environment Architecture

| Environment | Trigger Condition | MongoDB Database |
|-------------|-------------------|-----------------|
| Development | `NODE_ENV !== 'production'` | `QR_System` |
| Production | `NODE_ENV === 'production'` OR `RENDER` env var set | `QR_System_prod` |

Connection logic in `backend/config/db.js`:

```js
const uri = (process.env.NODE_ENV === 'production' || process.env.RENDER)
  ? process.env.MONGO_URI        // Production Atlas cluster
  : process.env.MONGO_URI_TEST;  // Test Atlas cluster
```

### Design Principles

- **Multi-tenant by `cafe_id`** — every owner's data scoped to their `ObjectId`
- **Singleton pattern** for `Settings` — single document keyed by `'platform'`
- **Denormalization** — order items embedded (snapshot at time of order)
- **TTL indexes** — auto-expire orders after 5 days
- **Soft session tracking** — active sessions embedded in `cafes` document

---

## 2. Collections Overview

| Collection Name | Mongoose Model | Description |
|-----------------|----------------|-------------|
| `admins` | `Admin` | Super admin user accounts |
| `cafes` | `Cafe` | Café owner accounts, sessions, subscription info |
| `categories` | `Category` | Menu categories belonging to a café |
| `menu_items` | `MenuItem` | Dishes/drinks per category |
| `orders` | `Order` | Customer orders (auto-deleted after 5 days) |
| `order_revenues` | `OrderRevenue` | Permanent revenue ledger for each café |
| `qrcodes` | `QRCode` | Generated QR code image + menu URL per café |
| `feedbacks` | `Feedback` | Customer ratings and reviews |
| `subscriptions` | `Subscription` | Active/expired subscriptions |
| `subscription_histories` | `SubscriptionHistory` | Full subscription audit trail |
| `subscription_requests` | `SubscriptionRequest` | Manual UPI upgrade requests |
| `support_tickets` | `SupportTicket` | Owner-submitted helpdesk tickets |
| `settings` | `Settings` | Singleton platform configuration document |
| `global_medias` | `GlobalMedia` | Admin-managed shared media library |
| `system_logs` | `SystemLog` | Admin audit logs |
| `webhook_logs` | `WebhookLog` | Razorpay webhook event records |

---

## 3. Schema Definitions

### 3.1 `admins` Collection

**Model file:** `backend/models/Admin.js`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `name` | String | ✅ | — | Trimmed |
| `email` | String | ✅ | — | Unique, lowercase, trimmed |
| `password` | String | ✅ | — | Bcrypt hashed, `select: false` |
| `role` | String (enum) | — | `'superadmin'` | Enum: `['superadmin']` |
| `created_at` | Date | — | auto | Timestamp alias |
| `updated_at` | Date | — | auto | Timestamp alias |

**Instance Methods:**
- `matchPassword(enteredPassword)` — bcrypt compare

---

### 3.2 `cafes` Collection

**Model file:** `backend/models/Cafe.js`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `name` | String | ✅ | — | Trimmed, generates slug on save |
| `slug` | String | — | auto-generated | Unique, lowercase, kebab-case + timestamp suffix |
| `logo` | String | — | `''` | Cloudinary URL |
| `address` | String | — | `''` | Trimmed |
| `phone` | String | — | `''` | Trimmed |
| `email` | String | ✅ | — | Unique, lowercase, trimmed |
| `password` | String | ✅ | — | Min 6 chars, bcrypt hashed, `select: false` |
| `razorpay_key_id` | String | — | `''` | Café's Razorpay key |
| `razorpay_key_secret` | String | — | `''` | `select: false` |
| `razorpay_webhook_secret` | String | — | `''` | `select: false` |
| `razorpay_customer_id` | String | — | `''` | Razorpay customer ID |
| `razorpay_subscription_id` | String | — | `''` | Active Razorpay subscription ID |
| `tax_percentage` | Number | — | `0` | Applied to bills |
| `billing_settings.format` | String (enum) | — | `'standard'` | `['standard', 'minimal', 'detailed']` |
| `billing_settings.tax_number` | String | — | `''` | GST/tax number for bills |
| `billing_settings.thank_you_message` | String | — | `'Thank you for your visit!'` | Shown on bill |
| `theme_settings.active_theme` | String (enum) | — | `'classic'` | `['classic', 'midnight', 'blackgold', 'forest', 'rose']` |
| `theme_settings.unlocked_themes` | [String] | — | `['classic']` | Themes the owner can apply |
| `subscription_status` | String (enum) | — | `'active'` | `['active', 'expired', 'suspended']` |
| `subscription.plan_name` | String (enum) | — | `'starter'` | `['starter', 'pro', 'pro_plus']` |
| `subscription.start_date` | Date | — | `Date.now` | — |
| `subscription.end_date` | Date | — | — | Subscription expiry |
| `subscription.status` | String (enum) | — | `'active'` | — |
| `upcoming_subscription.plan_name` | String (enum) | — | — | `['pro', 'pro_plus']` |
| `upcoming_subscription.duration_days` | Number | — | `30` | — |
| `role` | String | — | `'owner'` | Always `'owner'` |
| `is_active` | Boolean | — | `true` | Admin can suspend |
| `resetPasswordToken` | String | — | — | Hashed token |
| `resetPasswordExpire` | Date | — | — | Token TTL |
| `login_otp` | String | — | — | 6-digit OTP for device limit |
| `login_otp_expire` | Date | — | — | OTP TTL (10 minutes) |
| `pending_logout_sessions` | [String] | — | `[]` | Session tokens to remove after OTP |
| `active_sessions` | [SessionSchema] | — | `[]` | Currently active device sessions |
| `created_at` | Date | — | auto | — |
| `updated_at` | Date | — | auto | — |

**Session Sub-Schema (`active_sessions` items):**

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `token` | String | — | JWT token string |
| `device_info` | String | — | User-agent / device description |
| `last_active` | Date | `Date.now` | Refreshed every 10 min on requests |

**Pre-save Hooks:**
- `name` modified → auto-generate `slug` (kebab-case + base-36 timestamp)
- `password` modified → bcrypt hash (salt rounds: 12)

**Instance Methods:**
- `matchPassword(enteredPassword)` — bcrypt compare
- `getResetPasswordToken()` — generates + stores hashed reset token, returns raw token

---

### 3.3 `categories` Collection

**Model file:** `backend/models/Category.js`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `cafe_id` | ObjectId (ref: Cafe) | ✅ | — | Owner's café |
| `name` | String | ✅ | — | Category name |
| `sort_order` | Number | — | `0` | For manual ordering |
| `created_at` | Date | — | auto | — |
| `updated_at` | Date | — | auto | — |

---

### 3.4 `menu_items` Collection

**Model file:** `backend/models/MenuItem.js`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `cafe_id` | ObjectId (ref: Cafe) | ✅ | — | — |
| `category_id` | ObjectId (ref: Category) | ✅ | — | — |
| `name` | String | ✅ | — | Trimmed |
| `description` | String | — | `''` | Trimmed |
| `price` | Number | ✅ | — | Min: 0 |
| `image` | String | — | `''` | Cloudinary URL |
| `availability` | Boolean | — | `true` | Toggle on/off |
| `is_veg` | Boolean | — | `true` | Veg/Non-veg indicator |
| `sort_order` | Number | — | `0` | For manual ordering |
| `created_at` | Date | — | auto | — |
| `updated_at` | Date | — | auto | — |

**Indexes:**
- `{ cafe_id: 1, category_id: 1 }` — compound index for menu fetches

---

### 3.5 `orders` Collection

**Model file:** `backend/models/Order.js`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `cafe_id` | ObjectId (ref: Cafe) | ✅ | — | — |
| `order_number` | String | ✅ | auto-generated | Format: `ORD-{base36timestamp}-{padded count}` |
| `token_number` | String | — | `''` | Short display token |
| `customer_name` | String | — | `'Guest'` | Trimmed |
| `customer_phone` | String | — | `''` | Trimmed |
| `table_number` | String | — | `''` | Trimmed |
| `items` | [OrderItem] | — | — | Embedded snapshot of ordered items |
| `total_amount` | Number | ✅ | — | Min: 0 |
| `payment_method` | String (enum) | ✅ | — | `['cash', 'online', 'razorpay']` |
| `payment_method_details` | String | — | `''` | Extra details (e.g., UPI ref) |
| `payment_transaction_id` | String | — | `''` | External transaction ID |
| `payment_status` | String (enum) | — | `'pending'` | `['pending', 'received', 'completed', 'failed']` |
| `order_status` | String (enum) | — | `'new'` | `['new', 'accepted', 'preparing', 'ready', 'completed', 'cancelled']` |
| `notes` | String | — | `''` | Customer notes |
| `razorpay_order_id` | String | — | `''` | Razorpay order ID |
| `razorpay_payment_id` | String | — | `''` | Razorpay payment ID |
| `razorpay_signature` | String | — | `''` | Webhook signature |
| `created_at` | Date | — | auto | Used by TTL index |
| `updated_at` | Date | — | auto | — |

**OrderItem Sub-Schema:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `menu_item_id` | ObjectId (ref: MenuItem) | — | Soft reference |
| `name` | String | ✅ | Snapshot of name at order time |
| `quantity` | Number | ✅ | Min: 1 |
| `price` | Number | ✅ | Snapshot of price at order time |

**Pre-validate Hook:**
- On new document: generates unique `order_number` from count + timestamp

**Indexes:**
- `{ cafe_id: 1, order_status: 1 }` — fast live order queries
- `{ created_at: 1 }` with `expireAfterSeconds: 432000` (5 days) — **TTL auto-delete**

---

### 3.6 `order_revenues` Collection

**Model file:** `backend/models/OrderRevenue.js`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `cafe_id` | ObjectId (ref: Cafe) | ✅ | — |
| `order_id` | ObjectId (ref: Order) | ✅ | — |
| `order_number` | String | ✅ | Denormalized for ledger display |
| `amount` | Number | ✅ | Revenue amount |
| `payment_method` | String (enum) | ✅ | `['cash', 'online', 'razorpay']` |
| `recorded_at` | Date | — | auto | Permanent record — no TTL |
| `created_at` | Date | — | auto | — |
| `updated_at` | Date | — | auto | — |

> **Note:** This collection is the **permanent revenue ledger**. Orders are deleted after 5 days, but `order_revenues` records are kept forever.

---

### 3.7 `qrcodes` Collection

**Model file:** `backend/models/QRCode.js`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `cafe_id` | ObjectId (ref: Cafe) | ✅ | Unique — one QR per café |
| `qr_image` | String | ✅ | Base64 or Cloudinary URL of QR image |
| `menu_url` | String | ✅ | `https://whatthemenu.vercel.app/:cafeId/menu` |
| `created_at` | Date | — | auto |
| `updated_at` | Date | — | auto |

---

### 3.8 `feedbacks` Collection

**Model file:** `backend/models/Feedback.js`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `order_id` | ObjectId (ref: Order) | ✅ | — | — |
| `cafe_id` | ObjectId (ref: Cafe) | ✅ | — | — |
| `rating` | Number | ✅ | — | Min: 1, Max: 5 |
| `review` | String | — | `''` | Trimmed |
| `customer_name` | String | — | `'Guest'` | — |
| `created_at` | Date | — | auto | — |
| `updated_at` | Date | — | auto | — |

**Indexes:** `{ cafe_id: 1 }` — for fetching all feedback for a café

---

### 3.9 `subscriptions` Collection

**Model file:** `backend/models/Subscription.js`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `cafe_id` | ObjectId (ref: Cafe) | ✅ | — | — |
| `plan_name` | String (enum) | ✅ | — | `['starter', 'pro', 'pro_plus']` |
| `price` | Number | — | `0` | Price paid |
| `start_date` | Date | ✅ | `Date.now` | — |
| `end_date` | Date | ✅ | — | Expiry |
| `trial_end_date` | Date | — | — | Only for Starter trial |
| `status` | String (enum) | — | `'active'` | `['active', 'expired', 'suspended']` |
| `razorpay_subscription_id` | String | — | `''` | — |
| `razorpay_plan_id` | String | — | `''` | — |
| `razorpay_payment_id` | String | — | `''` | — |
| `billing_cycle` | String (enum) | — | `'monthly'` | `['monthly', 'yearly']` |
| `next_billing_date` | Date | — | — | — |
| `invoice_id` | String | — | `''` | — |
| `created_at` | Date | — | auto | — |
| `updated_at` | Date | — | auto | — |

**Indexes:** `{ cafe_id: 1, status: 1 }`

---

### 3.10 `subscription_histories` Collection

**Model file:** `backend/models/SubscriptionHistory.js`

Tracks every subscription plan change as an immutable audit record.

| Field | Type | Notes |
|-------|------|-------|
| `cafe_id` | ObjectId | — |
| `plan_name` | String | Plan at time of record |
| `action` | String | e.g., `'activated'`, `'expired'`, `'upgraded'` |
| `performed_by` | String | `'system'` or `'admin'` |
| `notes` | String | Optional description |
| `created_at` | Date | auto |

---

### 3.11 `subscription_requests` Collection

**Model file:** `backend/models/SubscriptionRequest.js`

Manual upgrade requests when owner sends UPI payment manually.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `cafe_id` | ObjectId | — | — |
| `plan_name` | String (enum) | — | Requested plan |
| `duration_days` | Number | `30` | — |
| `upi_transaction_id` | String | — | Owner's payment reference |
| `status` | String (enum) | `'pending'` | `['pending', 'approved', 'rejected']` |
| `admin_notes` | String | `''` | Admin rejection/approval notes |
| `created_at` | Date | auto | — |

---

### 3.12 `support_tickets` Collection

**Model file:** `backend/models/SupportTicket.js`

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `cafe_id` | ObjectId | ✅ | — | — |
| `ticket_number` | String | ✅ | auto | Unique ticket identifier |
| `subject` | String | ✅ | — | Max 150 chars |
| `category` | String (enum) | — | `'other'` | `['payment_upi', 'menu_qr', 'live_orders', 'subscription', 'other']` |
| `description` | String | ✅ | — | Max 2000 chars |
| `priority` | String (enum) | — | `'normal'` | `['normal', 'high', 'urgent']` |
| `status` | String (enum) | — | `'open'` | `['open', 'in_progress', 'resolved', 'closed']` |
| `admin_reply` | String | — | `''` | — |
| `resolved_at` | Date | — | — | Set when status → resolved |
| `created_at` | Date | — | auto | — |

**Indexes:**
- `{ cafe_id: 1, created_at: -1 }`
- `{ status: 1, priority: 1, created_at: -1 }`

---

### 3.13 `settings` Collection

**Model file:** `backend/models/Settings.js`

> **Singleton pattern** — only ONE document with `key: 'platform'` exists.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `key` | String | `'platform'` | Unique singleton key |
| `trial_days` | Number | `14` | Free trial length |
| `currency` | String | `'INR'` | Platform currency |
| `starter_price` | Number | `299` | Monthly starter plan price |
| `pro_price` | Number | `499` | Monthly pro plan price |
| `yearly_discount_percentage` | Number | `20` | Yearly billing discount % |
| `tax_rate` | Number | `18` | Platform GST % |
| `payment_live_mode` | Boolean | `false` | Razorpay live vs test mode |
| `platform_name` | String | `'QRMenu SaaS'` | — |
| `contact_email` | String | — | Support email |
| `support_phone` | String | — | — |
| `support_whatsapp` | String | — | WhatsApp number |
| `support_hours` | String | — | — |
| `maintenance_mode` | Boolean | `false` | Blocks all non-admin access |
| `starter_features` | [String] | — | Features list for landing page |
| `pro_features` | [String] | — | Features list for landing page |
| `admin_upi_id` | String | — | Platform's UPI ID for manual payments |

**Static Method:** `Settings.getSettings()` — upserts the singleton, safe to call anywhere.

---

### 3.14 `global_medias` Collection

**Model file:** `backend/models/GlobalMedia.js`

Admin-managed shared media library (can be used by café owners).

| Field | Type | Notes |
|-------|------|-------|
| `url` | String | Cloudinary CDN URL |
| `public_id` | String | Cloudinary public_id (for deletion) |
| `filename` | String | Original filename |
| `uploaded_by` | String | Admin identifier |
| `created_at` | Date | auto |

---

### 3.15 `system_logs` Collection

**Model file:** `backend/models/SystemLog.js`

| Field | Type | Notes |
|-------|------|-------|
| `action` | String | Log action description |
| `performed_by` | String | Admin or system |
| `target` | String | Entity affected |
| `metadata` | Mixed | Extra context (JSON) |
| `created_at` | Date | auto |

---

### 3.16 `webhook_logs` Collection

**Model file:** `backend/models/WebhookLog.js`

| Field | Type | Notes |
|-------|------|-------|
| `event_type` | String | Razorpay event type |
| `payload` | Mixed | Raw webhook payload |
| `signature_valid` | Boolean | Signature verification result |
| `processed` | Boolean | Whether action was taken |
| `error` | String | Error message if processing failed |
| `created_at` | Date | auto |

---

## 4. Relationships Diagram

```
admins ──────────────── (manages platform)

cafes ───────────────── categories ─── menu_items
  │
  ├── qrcodes (1:1)
  ├── orders ──────── order_revenues (ledger copy)
  │      └── feedbacks
  ├── subscriptions (1:many)
  ├── subscription_histories
  ├── subscription_requests
  └── support_tickets

settings (singleton, no relations)
global_medias (platform-wide, no café ref)
system_logs (platform audit)
webhook_logs (Razorpay event log)
```

---

## 5. Indexes

| Collection | Index | Type | Purpose |
|------------|-------|------|---------|
| `cafes` | `email` | Unique | Prevent duplicate accounts |
| `cafes` | `slug` | Unique | URL-friendly identifier |
| `menu_items` | `{ cafe_id, category_id }` | Compound | Fast menu fetches |
| `orders` | `{ cafe_id, order_status }` | Compound | Live order queries |
| `orders` | `created_at` | TTL (432000s) | Auto-delete after 5 days |
| `feedbacks` | `cafe_id` | Single | Café feedback queries |
| `subscriptions` | `{ cafe_id, status }` | Compound | Active subscription lookup |
| `support_tickets` | `{ cafe_id, created_at }` | Compound | Owner's ticket list |
| `support_tickets` | `{ status, priority, created_at }` | Compound | Admin queue sorting |
| `settings` | `key` | Unique | Enforce singleton |
| `qrcodes` | `cafe_id` | Unique | One QR per café |

---

## 6. TTL Policies

| Collection | TTL Field | Duration | Reason |
|------------|-----------|----------|--------|
| `orders` | `created_at` | 5 days (432,000s) | Orders are operational data, not archived |
| `order_revenues` | — | **Forever** | Revenue ledger must never be deleted |

> ⚠️ **Important:** Always write to `order_revenues` when an order is paid. This is the source of truth for revenue reporting after orders expire.

---

## 7. Design Notes & Gotchas

### 1. Embedded Sessions vs. Separate Collection
`active_sessions` are embedded directly in the `cafes` document for performance (no extra DB query per request). This is safe because a café's session count is always small (max 3).

### 2. Password Reset Token Storage
`resetPasswordToken` stores the **hashed** token in the DB. The raw token is emailed to the user. This prevents token theft even if the database is compromised.

### 3. Order Item Denormalization
`items` in Orders are an **embedded snapshot** — not references to `menu_items`. This means if a menu item is later edited or deleted, the order history remains correct.

### 4. Settings Singleton
Never insert more than one `Settings` document. Always use `Settings.getSettings()` — it safely upserts.

### 5. `validateBeforeSave: false`
When updating session `last_active` timestamps in the auth middleware, we use `save({ validateBeforeSave: false })` to avoid triggering full schema validation on every authenticated request.

### 6. Duplicate Fields in Settings.js
The current `Settings.js` model has a **duplicate `starter_price` and `starter_features` field definition**. Mongoose uses the last definition — this should be cleaned up in a future migration.

---

*This document reflects the MongoDB schema as defined in `backend/models/`.*  
*Update when adding new collections, fields, or indexes.*
