# 🏗️ Architecture Documentation — WhatTheMenu QR Menu SaaS

> **Version:** 1.0.0 | **Last Updated:** October 2026

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [High-Level Architecture Diagram](#3-high-level-architecture-diagram)
4. [Backend Architecture](#4-backend-architecture)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Real-Time Architecture (Socket.io)](#6-real-time-architecture-socketio)
7. [Database Architecture](#7-database-architecture)
8. [File Storage Architecture (Cloudinary)](#8-file-storage-architecture-cloudinary)
9. [Payment Architecture (Razorpay)](#9-payment-architecture-razorpay)
10. [Email Architecture (Nodemailer)](#10-email-architecture-nodemailer)
11. [Background Jobs Architecture](#11-background-jobs-architecture)
12. [Security Architecture](#12-security-architecture)
13. [Project Folder Structure](#13-project-folder-structure)
14. [Data Flow Diagrams](#14-data-flow-diagrams)

---

## 1. System Overview

**WhatTheMenu** is a **multi-tenant QR Menu SaaS Platform** that allows café/restaurant owners to digitize their menus, accept orders, and manage their business — all accessible via a QR code scan by customers.

### System Actors

| Actor | Role | Access Portal |
|-------|------|---------------|
| **Super Admin** | Platform operator — manages all cafés, subscriptions, revenue | `/admin/codifires` |
| **Café Owner** | Manages their own café — menu, orders, settings, subscription | `/owner` |
| **Customer** | Scans QR, browses menu, places order, tracks status | `/:cafeId/menu` |

### Deployment Model

| Component | Platform | URL Pattern |
|-----------|----------|-------------|
| Frontend | Vercel | `https://whatthemenu.vercel.app` |
| Backend API | Render | `https://api.whatthemenu.com` |
| Database | MongoDB Atlas | Cloud-hosted, dual-env |
| Media Storage | Cloudinary | CDN-hosted images |

---

## 2. Technology Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime |
| **Express.js** | ^4.21 | HTTP framework |
| **Mongoose** | ^8.7 | MongoDB ODM |
| **Socket.io** | ^4.8 | Real-time order updates |
| **JWT** | ^9.0 | Stateless authentication |
| **bcryptjs** | ^2.4 | Password hashing |
| **Nodemailer** | ^9.0 | Transactional email delivery |
| **Razorpay SDK** | ^2.9 | Payment processing |
| **Cloudinary SDK** | ^2.10 | Media storage |
| **Multer** | ^1.4 | File upload handling |
| **node-cron** | ^4.6 | Background scheduled jobs |
| **express-rate-limit** | ^8.6 | API rate limiting |
| **express-slow-down** | ^3.1 | Login brute-force protection |
| **compression** | ^1.8 | Gzip response compression |
| **qrcode** | ^1.5 | QR code image generation |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19 | UI framework |
| **Vite** | Latest | Build tool & dev server |
| **React Router** | v7 | Client-side routing |
| **Axios** | Latest | HTTP client |
| **Socket.io-client** | ^4.8 | Real-time connection |
| **react-hot-toast** | Latest | Toast notifications |
| **Vanilla CSS** | — | Styling (custom design system) |

---

## 3. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENTS                                 │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Super Admin │  │  Café Owner  │  │  Customer (QR scan)  │  │
│  │  Browser     │  │  Browser     │  │  Mobile Browser      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
└─────────┼─────────────────┼───────────────────────┼─────────────┘
          │                 │                         │
          └─────────────────┴─────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel)                             │
│               React 19 + Vite SPA                               │
│  /admin/*  |  /owner/*  |  /:cafeId/menu/*  |  /              │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST API calls (HTTPS)
                             │ WebSocket connection (wss://)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND API (Render)                          │
│              Node.js + Express + Socket.io                       │
│                                                                  │
│  ┌───────────┐  ┌───────────┐  ┌──────────┐  ┌─────────────┐  │
│  │  Auth     │  │  Owner    │  │  Admin   │  │  Customer   │  │
│  │  Routes   │  │  Routes   │  │  Routes  │  │  Routes     │  │
│  └───────────┘  └───────────┘  └──────────┘  └─────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Middleware Pipeline                           │  │
│  │  CORS → Compression → RateLimit → Auth JWT → Validator   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Background Jobs (node-cron)                   │  │
│  │  subscriptionCron | orderCleanupCron | reconciliationCron  │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────┬───────────────────┬───────────────────┬────────────────┘
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  MongoDB    │   │   Cloudinary    │   │   Razorpay API  │
│  Atlas      │   │   (CDN Media)   │   │   (Payments)    │
│  (Database) │   └─────────────────┘   └─────────────────┘
└─────────────┘
         │
         ▼
┌─────────────────┐
│  Gmail SMTP     │
│  (Nodemailer)   │
│  Transactional  │
│  Emails         │
└─────────────────┘
```

---

## 4. Backend Architecture

### Entry Point: `server.js`

The server bootstraps in this order:

1. **Load environment variables** (`dotenv.config()`)
2. **Connect to MongoDB** (`connectDB()`)
3. **Initialize Express app** with `trust proxy` for Render/Nginx
4. **Create HTTP server** wrapping Express (for Socket.io)
5. **Initialize Socket.io** on the same HTTP server
6. **Apply middleware:** compression → CORS → Webhook routes (raw body) → JSON parsing
7. **Register all route groups**
8. **Register error handler**
9. **Start background cron jobs** (3 jobs)
10. **Listen on PORT** (default 5000)

### Route Groups

| Prefix | Router File | Auth Required |
|--------|-------------|---------------|
| `/api/auth` | `authRoutes.js` | No (login/register) |
| `/api/owner` | `ownerRoutes.js` | Yes — `role: owner` |
| `/api/admin` | `adminRoutes.js` | Yes — `role: superadmin` |
| `/api/support` | `supportRoutes.js` | Mixed |
| `/api` | `razorpayRoutes.js` | Mixed |
| `/api/menu` | `menuRoutes.js` | No (public) |
| `/api/orders` | `orderRoutes.js` | No (public) |
| `/api/feedback` | `feedbackRoutes.js` | No (public) |
| `/api/settings` | `settingsRoutes.js` | No (public endpoint) |

### Middleware Stack

```
Request
  ↓
compression()          — Gzip all responses
cors()                 — Allow all origins (configured per-request)
express.json()         — Parse JSON body (after webhook routes)
[route matched]
  ↓
rateLimiter            — publicLimiter / authLimiter / apiLimiter
protect()              — Verify JWT, load user from DB
authorize(role)        — Check role matches route requirement
validator              — express-validator field validation
controller             — Business logic
  ↓
errorHandler()         — Centralized error formatting
Response
```

### Controller Layer

| Controller | Responsibility |
|------------|----------------|
| `authController.js` | Register, login, OTP verification, logout, password reset, device session management |
| `ownerController.js` | Dashboard, menu CRUD, order management, QR code, settings, subscription |
| `adminController.js` | Café management, subscriptions, revenue, system logs, media, platform settings |
| `customerController.js` | Public menu fetch, order placement, order tracking |
| `razorpayController.js` | Subscription payments, order payments, webhooks, refunds |
| `supportController.js` | Support ticket CRUD, admin reply |
| `aiController.js` | AI-powered menu description generation |

---

## 5. Frontend Architecture

### Application Structure

```
frontend/src/
├── main.jsx              ← React entry point (BrowserRouter, AuthProvider)
├── App.jsx               ← Route definitions + maintenance mode check
├── index.css             ← Global design system (CSS variables, utilities)
│
├── context/
│   └── AuthContext.jsx   ← Global auth state (user, token, login/logout)
│
├── services/
│   └── api.js            ← Axios instances + all API call functions
│
├── layouts/
│   ├── AdminLayout.jsx   ← Admin sidebar + main wrapper
│   ├── OwnerLayout.jsx   ← Owner sidebar + main wrapper
│   └── CustomerLayout.jsx← Customer-only minimal layout + theme injection
│
├── components/
│   └── ProtectedRoute.jsx← Role-based route guard
│
├── pages/
│   ├── LandingPage.jsx
│   ├── auth/             ← Login, Register, SetPassword, ForgotPassword
│   ├── admin/            ← All admin panel pages
│   ├── owner/            ← All owner dashboard pages
│   └── customer/         ← QR menu, cart, checkout, tracking, feedback
│
└── utils/                ← Helper functions
```

### State Management

**No Redux/Zustand** — uses React Context API only:

- `AuthContext` — global user state, JWT token, login/logout functions
- Local `useState`/`useEffect` — all page-level state management
- Axios interceptors — auto-attach `Authorization: Bearer <token>` header

### Code Splitting Strategy

- **Admin, Owner, Customer pages** — all lazy loaded with `React.lazy()`
- **Auth pages** — synchronous import (entry point, fast load priority)
- **Layouts** — synchronous import (prevents layout shift)

### Mobile & Owner PWA Architecture

- **Unified Single Codebase:** Desktop web and mobile PWA run off the exact same React 19 frontend and Node.js backend — no separate mobile backend required.
- **Responsive Adaptations:** Desktop 256px sidebar switches to Thumb-Zone Bottom Navigation for touch devices, with safe-area notch insets.
- **Kitchen Mode Features:** HTML5 Screen Wake Lock API (`navigator.wakeLock`) prevents screen dimming during kitchen shifts. Instant hardware audio synthesizer alert tones without external audio file loading overhead.
- **Detailed Specification:** See [MOBILE_APP_DOC.md](./MOBILE_APP_DOC.md) for full mobile navigation, offline reconciliation, device limitations, and PWA installation strategies.

---

## 6. Real-Time Architecture (Socket.io)

### Socket Rooms & Authorization Matrix

| Room Name | Access Policy | Authorization Check | Events Emitted |
|-----------|---------------|---------------------|----------------|
| `cafe-{cafeId}` | **Protected (Owner & Admin)** | Verified JWT `user.id === cafeId` or `superadmin` | `new-order`, `order-updated`, `staff-alert`, `subscription-activated` |
| `menu-{cafeId}` | **Public** | Open to customer QR viewers | `menu_item_updated` (live 86-ing/availability toggles) |
| `order-{orderNumber}` | **Validated Guest** | Sanitized order number + verified exists in MongoDB | `order-status-update` |
| `session-{sessionId}` | **Protected** | Verified owner for `cafe-*` payment sessions | `payment-confirmed`, `subscription-activated` |
| `admin-room` | **Protected (Superadmin only)** | Verified JWT `user.role === 'superadmin'` | `new-cafe-registered`, `new-subscription-revenue`, `new-support-ticket` |

### Socket Event Flow (Order Example)

```
Customer places order
        ↓
POST /api/orders (REST)
        ↓
Backend creates Order document
        ↓
io.to('cafe-{cafeId}').emit('new-order', orderData)
        ↓
Owner's browser receives event
        ↓
Order appears on live orders page in real-time
```

### Socket Connection in Frontend

```js
// In owner's OrderManagement.jsx
const socket = io(BACKEND_URL)
socket.emit('join-cafe', cafeId)
socket.on('new-order', (order) => {
  // Add to local state, play notification sound
})
```

---

## 7. Database Architecture

### Database Strategy — Dual Environment

| Environment | Variable | Database Name |
|-------------|----------|---------------|
| `development` / `test` | `MONGO_URI_TEST` | `QR_System` |
| `production` | `MONGO_URI` | `QR_System_prod` |

Selection logic in `backend/config/db.js`:

```js
const uri = (process.env.NODE_ENV === 'production' || process.env.RENDER)
  ? process.env.MONGO_URI
  : process.env.MONGO_URI_TEST;
```

### Collections Overview

| Collection | Model | Purpose |
|------------|-------|---------|
| `admins` | Admin | Super admin user accounts |
| `cafes` | Cafe | Café owner accounts + sessions + theme |
| `categories` | Category | Menu categories per café |
| `menu_items` | MenuItem | Menu items per category |
| `orders` | Order | Customer orders (TTL: 5 days) |
| `order_revenues` | OrderRevenue | Permanent revenue ledger |
| `qrcodes` | QRCode | QR code image + URL per café |
| `feedbacks` | Feedback | Customer ratings and reviews |
| `subscriptions` | Subscription | Active subscription records |
| `subscription_histories` | SubscriptionHistory | Subscription audit trail |
| `subscription_requests` | SubscriptionRequest | Manual upgrade requests |
| `support_tickets` | SupportTicket | Owner support tickets |
| `settings` | Settings | Singleton platform configuration |
| `global_medias` | GlobalMedia | Admin-managed media library |
| `system_logs` | SystemLog | Admin audit/system logs |
| `webhook_logs` | WebhookLog | Razorpay webhook event logs |

---

## 8. File Storage Architecture (Cloudinary)

All media files are stored on **Cloudinary** — no local file storage in production.

### Upload Flow

```
Owner uploads image (menu item / logo)
        ↓
Frontend sends multipart/form-data to backend
        ↓
Multer (multer-storage-cloudinary) intercepts
        ↓
File streamed directly to Cloudinary
        ↓
Cloudinary returns CDN URL
        ↓
URL stored in MongoDB (Cafe.logo / MenuItem.image)
        ↓
Frontend loads image directly from Cloudinary CDN
```

### Cloudinary Folders

| Folder | Content |
|--------|---------|
| `wtm/menus/` | Menu item images |
| `wtm/logos/` | Café logos |
| `wtm/global/` | Admin media library |

---

## 9. Payment Architecture (Razorpay)

### Two Payment Flows

#### A. Subscription Payment (Owner → Platform)

```
Owner selects plan
        ↓
POST /api/owner/razorpay/create-subscription
        ↓
Backend creates Razorpay subscription
        ↓
Frontend opens Razorpay checkout modal
        ↓
Owner pays
        ↓
Razorpay fires webhook → POST /api/webhooks/razorpay/subscription
        ↓
Backend verifies signature, activates subscription
        ↓
Socket.io emits to admin-room
```

#### B. Order Payment (Customer → Café)

```
Customer selects "Razorpay" payment
        ↓
POST /api/orders/create-razorpay-order
        ↓
Backend creates Razorpay order (using café's Razorpay keys)
        ↓
Frontend opens Razorpay checkout
        ↓
Customer pays
        ↓
Razorpay fires webhook → POST /api/webhooks/razorpay/order
        ↓
Backend verifies signature, marks order as paid
        ↓
Socket.io emits payment-confirmed to customer session
```

### Webhook Security

Webhooks arrive **before** `express.json()` middleware — raw body is preserved using:

```js
express.json({
  verify: (req, res, buf) => { req.rawBody = buf.toString(); }
})
```

Razorpay signature verified using HMAC-SHA256 with `RAZORPAY_WEBHOOK_SECRET`.

---

## 10. Email Architecture (Nodemailer)

### Configuration

- **Service:** Gmail via SMTP SSL (port 465)
- **Auth:** Gmail App Password (spaces stripped)
- **Library:** Nodemailer ^9.0

### Email Types

| Email | Trigger | Template |
|-------|---------|---------|
| Welcome / Set Password | Owner registration | `welcomeTemplate` |
| Subscription Expiry Warning | Cron job (3 days before) | `subscriptionExpiryTemplate` |
| Device Logout OTP | Login when device limit reached | `deviceLogoutOtpTemplate` |
| Password Reset | Forgot password flow | Plain text |

### Configuration Code (`backend/utils/sendEmail.js`)

```js
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD.replace(/\s+/g, '') // Strip spaces from App Password
  }
});
```

---

## 11. Background Jobs Architecture

Three cron jobs run server-side using `node-cron`:

### 1. `subscriptionCron.js` — Daily at 10:00 AM

**Purpose:** Detect and handle subscription lifecycle events

```
Every day at 10:00 AM IST:
  1. Find subscriptions expiring in exactly 3 days → Send warning email
  2. Find subscriptions expired today → Mark as expired
  3. Sync Razorpay subscription status with local DB
  4. Activate upcoming_subscription if ready
  5. Apply trial period logic for Starter plan
```

### 2. `orderCleanupCron.js` — Scheduled

**Purpose:** Supplement MongoDB TTL index for completed orders

```
Periodic:
  Find orders older than 5 days → Delete
  (MongoDB TTL index also handles this as backup)
```

### 3. `paymentReconciliationCron.js` — Scheduled

**Purpose:** Reconcile payment status for stuck/pending payments

```
Periodic:
  Find orders with payment_status = 'pending' older than threshold
  Query Razorpay API for actual payment status
  Update local payment_status accordingly
  Emit Socket.io event if payment confirmed
```

---

## 12. Security Architecture

### Authentication

- **JWT tokens** issued on login, expire per `JWT_EXPIRE` (default: 7 days)
- Token stored in `localStorage` on frontend
- Every protected request must include `Authorization: Bearer <token>` header
- Backend verifies token signature + checks user exists in DB

### Device Session Management

- Owner active sessions tracked in `Cafe.active_sessions[]`
- Session limit enforced by subscription plan:
  - Starter: 1 device
  - Pro: 2 devices
  - Pro Plus: 3 devices
- On limit exceeded: OTP sent to owner's email → owner selects which session to remove
- Session validity re-checked on **every** authenticated request in `auth.js`

### Rate Limiting

| Limiter | Window | Max Requests | Applied To |
|---------|--------|-------------|------------|
| `publicLimiter` | 15 min | 100 | Menu, Order, Feedback routes |
| `authLimiter` | 15 min | 10 | Login, Register, OTP routes |
| `apiLimiter` | 15 min | 500 | Owner & Admin API routes |

### Password Security

- Hashed with **bcrypt, salt rounds: 12**
- Password field excluded from queries by default (`select: false`)

---

## 13. Project Folder Structure

```
WhatTheMenu/
├── DOC/                          ← 📚 This documentation
├── backend/
│   ├── config/
│   │   └── db.js                 ← MongoDB connection + dual-env logic
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── ownerController.js
│   │   ├── adminController.js
│   │   ├── customerController.js
│   │   ├── razorpayController.js
│   │   ├── supportController.js
│   │   └── aiController.js
│   ├── jobs/
│   │   ├── subscriptionCron.js
│   │   ├── orderCleanupCron.js
│   │   └── paymentReconciliationCron.js
│   ├── middleware/
│   │   ├── auth.js               ← JWT protect + authorize + session check
│   │   ├── rateLimiter.js        ← Rate limit configs
│   │   ├── upload.js             ← Multer + Cloudinary storage
│   │   ├── errorHandler.js       ← Global error handler
│   │   └── validator.js          ← express-validator runner
│   ├── models/
│   │   ├── Admin.js, Cafe.js, Category.js, MenuItem.js
│   │   ├── Order.js, OrderRevenue.js, Feedback.js
│   │   ├── QRCode.js, Subscription.js, SubscriptionHistory.js
│   │   ├── SubscriptionRequest.js, SupportTicket.js
│   │   ├── Settings.js, GlobalMedia.js, SystemLog.js, WebhookLog.js
│   ├── routes/
│   │   ├── authRoutes.js, ownerRoutes.js, adminRoutes.js
│   │   ├── customerRoutes.js, razorpayRoutes.js
│   │   ├── feedbackRoutes.js, menuRoutes.js, orderRoutes.js
│   │   ├── settingsRoutes.js, supportRoutes.js
│   ├── utils/
│   │   ├── sendEmail.js          ← Nodemailer wrapper
│   │   ├── emailTemplates.js     ← HTML email templates
│   │   └── jwt.js                ← JWT sign/verify helpers
│   ├── validators/
│   │   ├── authValidators.js, ownerValidators.js, adminValidators.js
│   ├── server.js                 ← Application entry point
│   ├── .env                      ← Environment variables (gitignored)
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── index.css
    │   ├── context/AuthContext.jsx
    │   ├── services/api.js
    │   ├── layouts/
    │   ├── components/
    │   ├── pages/
    │   │   ├── LandingPage.jsx
    │   │   ├── auth/
    │   │   ├── admin/
    │   │   ├── owner/
    │   │   └── customer/
    │   └── utils/
    ├── index.html
    └── package.json
```

---

## 14. Data Flow Diagrams

### Owner Registration Flow

```
POST /api/auth/register
        ↓
Validate fields (authValidator)
        ↓
Check email uniqueness
        ↓
Create Cafe document (trial subscription)
        ↓
Generate set-password token
        ↓
Send welcome email with set-password link
        ↓
Return success (201)
```

### Customer Order Flow

```
GET /:cafeId/menu           → Fetch menu (categories + items)
        ↓
Add items to cart           → Local state
        ↓
POST /api/orders            → Create Order (status: new)
        ↓
io.emit('new-order')        → Owner sees it in real-time
        ↓
Owner accepts               → PUT /api/owner/orders/:id/status (accepted)
        ↓
io.emit('order-updated')    → Customer sees status change
        ↓
... (preparing → ready → completed)
        ↓
POST /api/feedback          → Customer submits review
```

---

*This document describes the architecture as implemented in the production codebase.*  
*Update when adding new services, routes, or architectural changes.*
