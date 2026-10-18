# ✨ Features Documentation — WhatTheMenu QR Menu SaaS

> **Version:** 1.0.0 | **Last Updated:** October 2026

---

## Table of Contents

1. [Feature Summary by Role](#1-feature-summary-by-role)
2. [Customer Features](#2-customer-features)
3. [Café Owner Features](#3-café-owner-features)
4. [Super Admin Features](#4-super-admin-features)
5. [Platform Features](#5-platform-features)
6. [Feature-to-File Mapping](#6-feature-to-file-mapping)
7. [Features by Subscription Plan](#7-features-by-subscription-plan)
8. [Planned / Future Features](#8-planned--future-features)

---

## 1. Feature Summary by Role

### Customer Portal

| Feature | Status | Notes |
|---------|--------|-------|
| QR Code Scan → Menu Browse | ✅ Live | No login required |
| Category-based navigation | ✅ Live | Horizontal scrollable tabs |
| Item search | ✅ Live | `/search?q=` query |
| Veg / Non-veg filter indicator | ✅ Live | Green/Red dot per FSSAI standard |
| Add to cart / quantity control | ✅ Live | Local state management |
| Order placement (Cash) | ✅ Live | Simple form submit |
| Order placement (Online/UPI) | ✅ Live | Manual confirmation by owner |
| Order placement (Razorpay) | ✅ Live | Inline payment modal |
| Real-time order tracking | ✅ Live | Socket.io live status updates |
| Customer feedback / rating | ✅ Live | 1–5 star + review text |
| Table number input | ✅ Live | On checkout form |
| Café theme support | ✅ Live | 5 themes via CSS class |

### Café Owner Portal

| Feature | Status | Notes |
|---------|--------|-------|
| Owner registration & login | ✅ Live | Email + password |
| Set / Reset password | ✅ Live | Token via email |
| Device limitation (OTP) | ✅ Live | Plan-based session limit |
| Dashboard with KPIs | ✅ Live | Revenue, orders, items, feedback |
| Menu category management | ✅ Live | Create, edit, delete, reorder |
| Menu item management | ✅ Live | CRUD + image upload + availability toggle |
| Item reordering | ✅ Live | Drag-based sort_order update |
| Live order management | ✅ Live | Real-time via Socket.io |
| Order status management | ✅ Live | 6-state flow |
| Payment status management | ✅ Live | Manual and webhook-driven |
| Completed orders view | ✅ Live | Historical completed orders |
| Revenue history | ✅ Live | Permanent ledger records |
| QR Code generation | ✅ Live | `qrcode` library |
| QR Code download | ✅ Live | Owner can download and print |
| Customer feedback view | ✅ Live | Ratings and reviews per order |
| Subscription management | ✅ Live | View, upgrade, Razorpay |
| Support ticket submission | ✅ Live | 5 categories, 3 priority levels |
| Café settings update | ✅ Live | Logo, address, billing, tax |
| Customer theme selection | ✅ Live | Apply unlocked themes |
| Razorpay payment integration | ✅ Live | Customer orders + subscription billing |
| Refund initiation | ✅ Live | Razorpay refund API |
| Global media access | ✅ Live | Browse admin-uploaded images |

### Super Admin Portal

| Feature | Status | Notes |
|---------|--------|-------|
| Admin login (hidden URL) | ✅ Live | `/admin/codifires` |
| Platform dashboard | ✅ Live | All-platform KPIs |
| Café list & management | ✅ Live | Create, edit, suspend, delete |
| Subscription management | ✅ Live | Override any subscription |
| Manual subscription requests | ✅ Live | Approve/reject UPI payments |
| Revenue history | ✅ Live | All cafés combined + per café |
| Payment records | ✅ Live | All transaction records |
| Global media library | ✅ Live | Upload/delete shared images |
| Plan services management | ✅ Live | Edit feature lists per plan |
| Support ticket management | ✅ Live | View + reply to all tickets |
| System logs | ✅ Live | Audit trail |
| Platform settings | ✅ Live | Trial days, prices, maintenance mode |
| Maintenance mode toggle | ✅ Live | Redirects all non-admin users |

---

## 2. Customer Features

### 2.1 QR Code Scan & Menu Browse

**How it works:**
1. Customer scans a printed QR code
2. Browser opens: `https://whatthemenu.vercel.app/:cafeId/menu`
3. Menu loads instantly — no login, no app install required
4. Category tabs displayed for navigation
5. Items shown with image, name, price, and veg indicator

**Key files:**
- `frontend/src/pages/customer/CustomerMenu.jsx`
- `backend/routes/menuRoutes.js`
- `backend/controllers/customerController.js`

---

### 2.2 Cart & Checkout

**Cart Features:**
- Add/remove items with `+/-` buttons
- Sticky bottom bar shows cart total
- Cart state stored in browser local state

**Checkout Form Fields:**
- Customer name (optional, defaults to "Guest")
- Phone number (optional)
- Table number (optional)
- Special notes
- Payment method selection: Cash / Online / Razorpay

**Key files:**
- `frontend/src/pages/customer/Cart.jsx`
- `frontend/src/pages/customer/Checkout.jsx`

---

### 2.3 Real-Time Order Tracking

**How it works:**
1. After order placement, customer gets an `order_number`
2. Browser connects to Socket.io, joins `order-{orderNumber}` room
3. Owner updates status → event emitted → customer sees live update
4. Status stepper shows: New → Accepted → Preparing → Ready → Completed

**Key files:**
- `frontend/src/pages/customer/OrderTracking.jsx`
- `backend/server.js` (Socket.io setup)

---

### 2.4 Customer Feedback

**Flow:**
1. After order completion, customer is prompted to leave feedback
2. 1–5 star rating + optional review text
3. Feedback linked to `order_id` and `cafe_id`

**Key files:**
- `frontend/src/pages/customer/CustomerFeedback.jsx`
- `backend/routes/feedbackRoutes.js`

---

## 3. Café Owner Features

### 3.1 Authentication & Device Limit

**Registration:** Owner registers → receives set-password email → sets password

**Login:** Email + password → if device limit reached → OTP sent → device selection modal → complete login

**Device Limit by Plan:**
- Starter: 1 device
- Pro: 2 devices
- Pro Plus: 3 devices

**Key files:**
- `frontend/src/pages/auth/OwnerLogin.jsx`
- `frontend/src/pages/auth/OwnerRegister.jsx`
- `backend/controllers/authController.js`
- `backend/middleware/auth.js`

---

### 3.2 Owner Dashboard

**KPI Cards:**
- Today's revenue
- Active orders count
- Total menu items
- Average customer rating

**Quick Views:**
- Recent orders summary
- Latest feedback

**Key files:**
- `frontend/src/pages/owner/OwnerDashboard.jsx`
- `backend/controllers/ownerController.js` → `getDashboard()`

---

### 3.3 Menu Management

**Category Management:**
- Create, edit, delete categories
- Reorder via sort_order

**Item Management:**
- Create items with name, description, price, image, veg flag
- Edit existing items
- Toggle availability (show/hide without deleting)
- Drag-to-reorder items within a category
- Upload images (stored on Cloudinary)

**Key files:**
- `frontend/src/pages/owner/MenuManagement.jsx`
- `backend/controllers/ownerController.js` → item/category functions
- `backend/middleware/upload.js` (Multer + Cloudinary)

---

### 3.4 Order Management (Live Orders)

**Real-time feed of incoming orders:**
- Socket.io room: `cafe-{cafeId}`
- New orders appear instantly without page refresh
- Owner can accept, update status through lifecycle
- Payment status can be marked received/completed manually

**Key files:**
- `frontend/src/pages/owner/OrderManagement.jsx`
- `frontend/src/pages/owner/CompletedOrders.jsx`
- `backend/controllers/ownerController.js` → `updateOrderStatus()`, `updatePaymentStatus()`

---

### 3.5 QR Code

**Features:**
- View generated QR code
- Download QR as PNG (for printing)
- Regenerate QR (replaces old image)
- See the menu URL encoded in QR

**Key files:**
- `frontend/src/pages/owner/QRCodePage.jsx`
- `backend/controllers/ownerController.js` → `getQRCode()`, `regenerateQRCode()`

---

### 3.6 Revenue Management

**Features:**
- Permanent revenue ledger (not affected by order TTL)
- Filter by date range
- Export summary

**Key files:**
- `frontend/src/pages/owner/RevenueManagement.jsx`
- `backend/models/OrderRevenue.js`

---

### 3.7 Café Settings

**Editable Settings:**
- Café name, address, phone
- Logo upload (Cloudinary)
- Tax percentage for billing
- Billing format (standard/minimal/detailed)
- Tax/GST number
- Thank you message
- Razorpay API credentials (for customer payments)

**Key files:**
- `frontend/src/pages/owner/OwnerSettings.jsx`
- `backend/controllers/ownerController.js` → `updateSettings()`

---

### 3.8 Subscription Management

**Features:**
- View current plan and expiry date
- Upgrade via Razorpay (automated) or manual UPI request
- Submit manual UPI payment reference for admin approval
- View billing history

**Key files:**
- `frontend/src/pages/owner/OwnerSubscription.jsx`
- `backend/controllers/razorpayController.js`
- `backend/controllers/ownerController.js`

---

### 3.9 Support System

**Features:**
- Create support tickets with category and priority
- Track ticket status (open → in_progress → resolved → closed)
- View admin reply

**Key files:**
- `frontend/src/pages/owner/OwnerSupport.jsx`
- `backend/controllers/supportController.js`

---

### 3.10 Theme Customization

**Features:**
- View unlocked themes
- Apply a theme to customer-facing portal
- Preview theme color scheme

**Key files:**
- `frontend/src/pages/owner/OwnerSettings.jsx` (theme section)
- `backend/controllers/ownerController.js` → `updateThemeSettings()`

---

## 4. Super Admin Features

### 4.1 Platform Dashboard

**Metrics shown:**
- Total cafés (active/suspended)
- Total platform revenue
- Active subscriptions
- Open support tickets
- Pending subscription requests (alert)

---

### 4.2 Café Management

**Full CRUD:**
- Create café directly (bypasses self-registration)
- Edit any café's details
- Suspend café (locks all sessions)
- Reactivate suspended café
- Delete café and all data

---

### 4.3 Subscription Management

**Manual overrides:**
- Set exact plan, start date, end date for any café
- Override subscription status
- View full subscription history

**Request Management:**
- View pending UPI payment requests
- Approve → activates subscription
- Reject → with admin notes sent to owner

---

### 4.4 Revenue & Payments

- View all cafés' revenue in a unified view
- Filter by café, date range, payment method
- View all Razorpay payment transaction records

---

### 4.5 Global Media Library

- Upload images to a shared library
- Café owners can browse and use these images for menu items
- Admin can delete images from the library

---

### 4.6 Platform Settings

**Configurable:**
- Trial days count
- Pricing (Starter, Pro plans)
- Yearly discount percentage
- Tax rate
- Contact/support information
- Payment live mode (test ↔ live)
- Maintenance mode toggle
- Platform name
- Admin UPI ID for manual payments
- Feature lists for landing page

---

### 4.7 System Logs & Audit

- View timestamped log of all admin actions
- Filter by date/action type
- Clear logs (with confirmation)

---

## 5. Platform Features

### 5.1 Real-Time System (Socket.io)

| Room | Participants | Events |
|------|-------------|--------|
| `cafe-{id}` | Owner browser | `new-order`, `order-updated` |
| `order-{number}` | Customer browser | `order-status-changed` |
| `session-{id}` | Customer (payment) | `payment-confirmed`, `payment-failed` |
| `admin-room` | Admin browser | `new-subscription-request`, `revenue-update` |

---

### 5.2 Background Cron Jobs

| Job | Schedule | Function |
|-----|----------|---------|
| `subscriptionCron` | Daily 10:00 AM | Expire subscriptions, send warnings, activate pending |
| `orderCleanupCron` | Periodic | Supplement TTL for order cleanup |
| `paymentReconciliationCron` | Periodic | Reconcile stuck Razorpay payment statuses |

---

### 5.3 Email Notifications

| Trigger | Recipient | Email Type |
|---------|-----------|-----------|
| Registration | Owner | Welcome + set password link |
| Forgot password | Owner | Password reset link |
| Subscription expiry (3 days) | Owner | Expiry warning |
| Device limit exceeded | Owner | OTP code |

---

### 5.4 Maintenance Mode

- Toggleable by admin
- Redirects all non-admin users to `/maintenance` page
- Admin continues to have full access
- Customer menus and owner dashboards inaccessible during maintenance

---

## 6. Feature-to-File Mapping

| Feature | Backend File(s) | Frontend File(s) |
|---------|-----------------|------------------|
| Device Limitation + OTP | `authController.js`, `auth.js`, `Cafe.js` | `OwnerLogin.jsx` |
| Menu Browse | `customerController.js`, `menuRoutes.js` | `CustomerMenu.jsx` |
| Cart & Checkout | `customerController.js`, `orderRoutes.js` | `Cart.jsx`, `Checkout.jsx` |
| Order Tracking | `server.js` (Socket.io), `orderRoutes.js` | `OrderTracking.jsx` |
| Live Orders (Owner) | `ownerController.js`, `server.js` | `OrderManagement.jsx` |
| Menu Management | `ownerController.js`, `upload.js` | `MenuManagement.jsx` |
| QR Code | `ownerController.js` | `QRCodePage.jsx` |
| Subscription (Razorpay) | `razorpayController.js` | `OwnerSubscription.jsx` |
| Subscription (Manual UPI) | `ownerController.js` | `OwnerSubscription.jsx` |
| Support Tickets | `supportController.js` | `OwnerSupport.jsx`, `SupportTicketManagement.jsx` |
| Admin Café Management | `adminController.js` | `CafeManagement.jsx` |
| Platform Settings | `adminController.js`, `Settings.js` | `AdminSettings.jsx` |
| Maintenance Mode | `Settings.js` | `App.jsx`, `Maintenance.jsx` |
| Email OTP | `sendEmail.js`, `emailTemplates.js` | — |
| Revenue Ledger | `OrderRevenue.js`, `ownerController.js` | `RevenueManagement.jsx` |

---

## 7. Features by Subscription Plan

| Feature | Starter | Pro | Pro Plus |
|---------|---------|-----|---------|
| Digital QR Menu | ✅ | ✅ | ✅ |
| Basic Analytics | ✅ | ✅ | ✅ |
| Up to 50 Menu Items | ✅ | ✅ | ✅ |
| Unlimited Menu Items | ❌ | ✅ | ✅ |
| Advanced Analytics | ❌ | ✅ | ✅ |
| Priority Support | ❌ | ✅ | ✅ |
| Custom Domain | ❌ | ✅ | ✅ |
| Device Sessions | 1 | 2 | 3 |
| Classic Theme | ✅ | ✅ | ✅ |
| Additional Themes | ❌ | ✅ | All |
| Razorpay Order Payments | ✅ | ✅ | ✅ |

---

## 8. Planned / Future Features

| Feature | Priority | Notes |
|---------|----------|-------|
| WhatsApp order notifications | High | Send order confirmation to customer's WhatsApp |
| AI menu description generation | Medium | `aiController.js` exists, needs frontend integration |
| Customer loyalty program | Medium | Points per order |
| Multi-language menu | Medium | i18n for regional languages |
| Table management / booking | Low | Advance reservation system |
| Kitchen display system (KDS) | Low | Separate screen for kitchen |
| Inventory tracking | Low | Stock count per menu item |
| Analytics dashboard (Charts) | High | Visual revenue + order trend charts |
| Push notifications (PWA) | Medium | Alert owner for new orders without page open |
| CSV/Excel export | Medium | Revenue and order data export |

---

*This document catalogues all features as built in the current production codebase.*  
*Mark "Planned" features as ✅ Live when shipped.*
