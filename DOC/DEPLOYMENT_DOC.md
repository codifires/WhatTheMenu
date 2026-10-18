# 🚀 Deployment Documentation — WhatTheMenu QR Menu SaaS

> **Version:** 1.0.0 | **Last Updated:** October 2026

---

## Table of Contents

1. [Deployment Overview](#1-deployment-overview)
2. [Service Architecture](#2-service-architecture)
3. [Frontend Deployment (Vercel)](#3-frontend-deployment-vercel)
4. [Backend Deployment (Render)](#4-backend-deployment-render)
5. [Database Setup (MongoDB Atlas)](#5-database-setup-mongodb-atlas)
6. [Cloudinary Setup](#6-cloudinary-setup)
7. [Gmail SMTP Setup](#7-gmail-smtp-setup)
8. [Razorpay Setup](#8-razorpay-setup)
9. [Environment Variables Reference](#9-environment-variables-reference)
10. [Docker Setup (Optional)](#10-docker-setup-optional)
11. [Local Development Setup](#11-local-development-setup)
12. [Production Checklist](#12-production-checklist)
13. [Common Deployment Issues](#13-common-deployment-issues)

---

## 1. Deployment Overview

WhatTheMenu uses a **split deployment** model:

| Component | Platform | URL |
|-----------|----------|-----|
| Frontend (React SPA) | **Vercel** | `https://whatthemenu.vercel.app` |
| Backend API (Node.js) | **Render** | `https://api.whatthemenu.com` |
| Database | **MongoDB Atlas** | Cloud hosted |
| Media Storage | **Cloudinary** | CDN delivery |
| Email | **Gmail SMTP** | Via Nodemailer |
| Payments | **Razorpay** | Payment gateway |

---

## 2. Service Architecture

```
[Browser]
    │
    ├── HTTPS → [Vercel] (React SPA, static files, CDN)
    │               │
    │               └── REST API / WebSocket calls
    │
    └── → [Render] (Node.js + Express + Socket.io)
                │
                ├── [MongoDB Atlas] (database)
                ├── [Cloudinary] (media CDN)
                ├── [Gmail SMTP] (email delivery)
                └── [Razorpay API] (payments)
```

---

## 3. Frontend Deployment (Vercel)

### Prerequisites

- Vercel account connected to GitHub repo
- Node.js 18+

### Deployment Steps

1. **Connect Repository:**
   - Go to [vercel.com](https://vercel.com)
   - Import GitHub repository: `codifires/WhatTheMenu`
   - Set **Root Directory** to `frontend/`

2. **Build Configuration:**

   | Setting | Value |
   |---------|-------|
   | Framework Preset | Vite |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |
   | Install Command | `npm install` |

3. **Environment Variables (Frontend):**

   | Variable | Value |
   |----------|-------|
   | `VITE_API_URL` | `https://api.whatthemenu.com/api` |
   | `VITE_SOCKET_URL` | `https://api.whatthemenu.com` |
   | `VITE_RAZORPAY_KEY_ID` | Your Razorpay public key |

4. **Deploy:** Every push to `main` branch triggers automatic deployment.

### SPA Routing (Vercel Config)

Create `frontend/public/vercel.json` to handle client-side routing:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Or add to `vercel.json` at project root:

```json
{
  "routes": [
    { "src": "/[^.]+", "dest": "/", "status": 200 }
  ]
}
```

---

## 4. Backend Deployment (Render)

### Prerequisites

- Render account
- GitHub repo connected

### Deployment Steps

1. **Create Web Service:**
   - Go to [render.com](https://render.com)
   - New → Web Service
   - Connect GitHub repo
   - Set **Root Directory** to `backend/`

2. **Build & Start Configuration:**

   | Setting | Value |
   |---------|-------|
   | Environment | Node |
   | Build Command | `npm install` |
   | Start Command | `npm start` (runs `node server.js`) |
   | Node Version | 18 (or Latest) |

3. **Environment Variables:**  
   Add all variables from the [Environment Variables Reference](#9-environment-variables-reference) section in the Render dashboard under "Environment".

4. **Health Check:**
   - Health check endpoint: `/api/health`
   - Returns: `{ "status": "OK", "message": "QR Menu SaaS API is running" }`

5. **Important:** Render sets the `RENDER` environment variable automatically — this triggers the production database selection logic.

### Render Networking Notes

- Render blocks **port 587** (SMTP STARTTLS) on outbound connections
- **Solution:** Use port **465** (SSL) for Gmail SMTP — set `SMTP_PORT=465`
- WebSocket (Socket.io) connections work on Render — it supports long-lived connections
- `app.set('trust proxy', 1)` is required for accurate IP-based rate limiting

### Auto-Deploy

Render auto-deploys on every push to the connected branch (`main`).

---

## 5. Database Setup (MongoDB Atlas)

### Create Atlas Cluster

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create Organization → Create Project
3. Build Database → Choose **M0 Free Tier** (development) or **M10+** (production)
4. Select region closest to Render deployment region

### Create Databases

Create **two databases** in the same cluster:

| Database | Purpose | Config Variable |
|----------|---------|-----------------|
| `QR_System` | Development / Testing | `MONGO_URI_TEST` |
| `QR_System_prod` | Production | `MONGO_URI` |

### Connection String Format

```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
```

### Network Access

1. Go to **Network Access** in Atlas sidebar
2. Add IP Address:
   - For development: `0.0.0.0/0` (allow all — not for production)
   - For production: Add Render's outbound IP addresses

### Database User

1. Go to **Database Access**
2. Add New Database User
3. Assign `readWrite` role on the specific database
4. Use username + password in connection string

---

## 6. Cloudinary Setup

### Create Account

1. Go to [cloudinary.com](https://cloudinary.com)
2. Create free account
3. Go to Dashboard → copy Cloud Name, API Key, API Secret

### Environment Variables

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Folder Structure (Auto-created)

```
your-cloud/
├── wtm/
│   ├── menus/     ← Menu item images
│   ├── logos/     ← Café logos
│   └── global/    ← Admin media library
```

### Upload Preset (Optional)

For direct browser uploads (not currently used), create an unsigned upload preset in Cloudinary settings.

---

## 7. Gmail SMTP Setup

The platform sends transactional emails via Gmail. **Gmail App Password** must be used — not the account password.

### Setup Steps

1. Go to your Google Account → Security
2. Enable **2-Step Verification** (required for App Passwords)
3. Go to Security → **App Passwords**
4. Select app: "Mail", device: "Other (Custom)" → name it "WhatTheMenu"
5. Copy the generated 16-character App Password

### Critical: Space Handling

Google displays App Passwords with spaces (e.g., `vgyh raes ujdu fiak`). These spaces **must be removed** before using in SMTP config.

The backend auto-strips spaces:
```js
pass: process.env.SMTP_PASSWORD.replace(/\s+/g, '')
```

But it's best practice to store the password **without spaces** in the `.env` file.

### Environment Variables

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_EMAIL=youraddress@gmail.com
SMTP_PASSWORD=vgyhraesujdufiak
FROM_EMAIL=youraddress@gmail.com
FROM_NAME=WhatTheMenu Platform
```

### Port 465 vs 587

| Port | Protocol | Status on Render |
|------|----------|-----------------|
| 587 | STARTTLS | ❌ Blocked by Render |
| 465 | SSL | ✅ Works on Render |

**Always use port 465 in production.**

### Nodemailer Configuration

```js
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD.replace(/\s+/g, '')
  }
});
```

---

## 8. Razorpay Setup

### Create Razorpay Account

1. Go to [razorpay.com](https://razorpay.com)
2. Create business account and complete KYC

### Platform Keys (for Subscriptions)

Used for owner subscription billing:

1. Go to Razorpay Dashboard → Settings → API Keys
2. Generate API Key
3. Copy Key ID and Key Secret

```env
# Platform Razorpay (for subscription billing)
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
```

### Webhook Setup

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Add Webhook URL: `https://api.whatthemenu.com/api/webhooks/razorpay/subscription`
3. Add second Webhook: `https://api.whatthemenu.com/api/webhooks/razorpay/order`
4. Select events:
   - `subscription.activated`
   - `subscription.halted`
   - `subscription.cancelled`
   - `payment.captured`
   - `payment.failed`
5. Copy the webhook secret

```env
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### Café-Level Keys (Customer Order Payments)

Each café owner sets up their own Razorpay account and enters their keys in café settings:

- `razorpay_key_id` — Public key (used in frontend checkout modal)
- `razorpay_key_secret` — Secret key (used server-side for order creation)
- `razorpay_webhook_secret` — For verifying customer payment webhooks

### Test vs Live Mode

Controlled by `Settings.payment_live_mode`:
- `false` (default) → Test mode (use `rzp_test_*` keys)
- `true` → Live mode (use `rzp_live_*` keys)

---

## 9. Environment Variables Reference

### Backend `.env` — Complete Reference

```env
# ═══════════════════════════════════════
# SERVER CONFIGURATION
# ═══════════════════════════════════════
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://whatthemenu.vercel.app

# ═══════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════
# Test/Development DB
MONGO_URI_TEST=mongodb+srv://<user>:<pass>@cluster.mongodb.net/QR_System?retryWrites=true&w=majority

# Production DB
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/QR_System_prod?retryWrites=true&w=majority

# ═══════════════════════════════════════
# AUTHENTICATION
# ═══════════════════════════════════════
JWT_SECRET=your_super_long_random_secret_string_here
JWT_EXPIRE=7d

# ═══════════════════════════════════════
# SUPER ADMIN
# ═══════════════════════════════════════
SUPER_ADMIN_UPI_ID=admin@upi

# ═══════════════════════════════════════
# RATE LIMITING
# ═══════════════════════════════════════
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_PUBLIC_MAX=100
RATE_LIMIT_AUTH_API_MAX=500
RATE_LIMIT_LOGIN_MAX=10
RATE_LIMIT_LOGIN_DELAY_AFTER=3

# ═══════════════════════════════════════
# CLOUDINARY (Media Storage)
# ═══════════════════════════════════════
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ═══════════════════════════════════════
# SMTP EMAIL (Gmail)
# ═══════════════════════════════════════
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_EMAIL=youraddress@gmail.com
SMTP_PASSWORD=vgyhraesujdufiak
FROM_EMAIL=youraddress@gmail.com
FROM_NAME=WhatTheMenu Platform

# ═══════════════════════════════════════
# RAZORPAY (Platform Subscription Payments)
# ═══════════════════════════════════════
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### Frontend `.env` (Vite)

```env
VITE_API_URL=https://api.whatthemenu.com/api
VITE_SOCKET_URL=https://api.whatthemenu.com
VITE_RAZORPAY_KEY_ID=rzp_live_xxxxx
```

---

## 10. Docker Setup (Optional)

The repository includes a `docker-compose.yml` and `Dockerfile` for containerized deployment.

### Files

| File | Location | Purpose |
|------|----------|---------|
| `Dockerfile` | `backend/Dockerfile` | Backend container image |
| `docker-compose.yml` | Root | Multi-service orchestration |

### `backend/Dockerfile`

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

### Start with Docker Compose

```bash
# Build and start
docker-compose up --build

# Stop
docker-compose down
```

### Docker Environment

Pass environment variables via `.env` file or `docker-compose.yml` `environment:` section.

---

## 11. Local Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- Git

### Setup Steps

```bash
# 1. Clone repository
git clone https://github.com/codifires/WhatTheMenu.git
cd WhatTheMenu

# 2. Backend setup
cd backend
cp .env.example .env
# Fill in all values in .env
npm install
npm run dev        # Starts on port 5000 with nodemon

# 3. Frontend setup (separate terminal)
cd ../frontend
npm install
npm run dev        # Starts on port 5173 (Vite default)
```

### Development URLs

| Service | URL |
|---------|-----|
| Frontend | `http://localhost:5173` |
| Backend API | `http://localhost:5000/api` |
| Health check | `http://localhost:5000/api/health` |

### Test Database

For local development, set `NODE_ENV=development` (or leave unset) — backend uses `MONGO_URI_TEST` automatically.

### Using Test DB Script

```bash
# Use test DB explicitly
npm run dev:test
```

---

## 12. Production Checklist

Before going live, verify each item:

### Backend

- [ ] `NODE_ENV=production` set on Render
- [ ] `MONGO_URI` points to production Atlas database
- [ ] `SMTP_PORT=465` for Gmail (not 587)
- [ ] `SMTP_PASSWORD` has spaces removed
- [ ] `JWT_SECRET` is a long random string (not "secret")
- [ ] `RAZORPAY_KEY_ID` uses live key (`rzp_live_*`, not `rzp_test_*`)
- [ ] `Settings.payment_live_mode` is `true` in DB
- [ ] Razorpay webhooks configured and pointing to Render URL
- [ ] MongoDB Atlas network access whitelisted for Render IPs
- [ ] Cloudinary credentials valid

### Frontend

- [ ] `VITE_API_URL` points to Render backend URL
- [ ] `VITE_RAZORPAY_KEY_ID` uses live public key
- [ ] SPA routing configured in `vercel.json`

### Platform

- [ ] Admin account created (seed script or direct Atlas)
- [ ] Default `Settings` document created in production DB
- [ ] Health check endpoint returning 200
- [ ] CORS: frontend URL accepted by backend

---

## 13. Common Deployment Issues

### ❌ Email not sending (OTP / Welcome email)

**Cause:** Port 587 blocked on Render, OR Gmail App Password has spaces  
**Fix:**
```env
SMTP_PORT=465
SMTP_PASSWORD=vgyhraesujdufiak  # No spaces
```

---

### ❌ "Cannot connect to MongoDB" on Render

**Cause:** MongoDB Atlas IP whitelist blocking Render's IP  
**Fix:** Add `0.0.0.0/0` to Atlas Network Access (or find Render's specific IPs)

---

### ❌ 404 on page refresh (Frontend)

**Cause:** Vercel doesn't know to serve `index.html` for all routes  
**Fix:** Add `vercel.json` with SPA rewrite rule (see Section 3)

---

### ❌ Socket.io connection failing

**Cause:** Frontend `VITE_SOCKET_URL` incorrect or WebSocket protocol issue  
**Fix:** Ensure it matches the full Render URL without `/api` suffix

---

### ❌ Razorpay webhook signature mismatch

**Cause:** `RAZORPAY_WEBHOOK_SECRET` doesn't match what's set in Razorpay dashboard  
**Fix:** Copy the exact secret from Razorpay dashboard → Settings → Webhooks → click the webhook

---

### ❌ "Trust proxy" rate limit issues

**Cause:** All requests appear to come from one IP on Render  
**Fix:** Ensure `app.set('trust proxy', 1)` is in `server.js` (it is — verify it's not removed)

---

### ❌ Images not showing in production

**Cause:** Cloudinary credentials wrong or upload middleware not configured  
**Fix:** Check all three `CLOUDINARY_*` variables are correct in Render's environment

---

*This document covers the complete deployment configuration for WhatTheMenu.*  
*Update when changing hosting providers, adding new third-party services, or modifying environment variables.*
