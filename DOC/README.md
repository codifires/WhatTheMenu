# 📚 WhatTheMenu — Project Documentation

> QR Menu SaaS Platform | Multi-tenant | React 19 + Node.js + MongoDB

---

## Documentation Index

| # | Document | Description |
|---|----------|-------------|
| 1 | [DESIGN_DOC.md](./DESIGN_DOC.md) | UI/UX design system, color palette, typography, themes, component patterns, animations |
| 2 | [ARCHITECTURE_DOC.md](./ARCHITECTURE_DOC.md) | System architecture, tech stack, data flow, Socket.io, cron jobs, folder structure |
| 3 | [DATABASE_SCHEMA_DOC.md](./DATABASE_SCHEMA_DOC.md) | All 16 MongoDB collections, field definitions, indexes, TTL policies, relationships |
| 4 | [RULES_DOC.md](./RULES_DOC.md) | Business rules — subscription tiers, device limits, order flow, payment rules, permissions |
| 5 | [API_DOC.md](./API_DOC.md) | All REST API endpoints for Auth, Owner, Admin, Customer, Payments |
| 6 | [FEATURES_DOC.md](./FEATURES_DOC.md) | Full feature list per role, feature-to-file mapping, planned features |
| 7 | [SECURITY_DOC.md](./SECURITY_DOC.md) | JWT, bcrypt, OTP, rate limiting, webhook verification, CORS, known gaps |
| 8 | [DEPLOYMENT_DOC.md](./DEPLOYMENT_DOC.md) | Vercel, Render, MongoDB Atlas, Cloudinary, Gmail SMTP, Razorpay setup |
| 9 | [MOBILE_APP_DOC.md](./MOBILE_APP_DOC.md) | Mobile app & PWA strategy, responsive layout, notifications, offline sync, device sessions |

---

## Quick Reference

### Tech Stack

```
Frontend:  React 19 + Vite + Vanilla CSS
Backend:   Node.js + Express + Socket.io
Database:  MongoDB Atlas (Mongoose 8.7)
Payments:  Razorpay
Media:     Cloudinary
Email:     Nodemailer (Gmail SMTP, port 465)
Hosting:   Vercel (frontend) + Render (backend)
```

### User Roles

| Role | Login URL | Access |
|------|-----------|--------|
| Super Admin | `/admin/codifires` | Full platform management |
| Café Owner | `/owner/login` | Own café management |
| Customer | `/:cafeId/menu` | Menu + ordering (no login) |

### Key Modules

| Module | Files |
|--------|-------|
| Device Limitation + OTP | `authController.js`, `auth.js`, `OwnerLogin.jsx` |
| Real-time Orders | `server.js` (Socket.io), `OrderManagement.jsx` |
| Subscription Billing | `razorpayController.js`, `subscriptionCron.js` |
| Email Delivery | `sendEmail.js`, `emailTemplates.js` |
| Menu System | `ownerController.js`, `menuRoutes.js`, `MenuManagement.jsx` |

---

*Generated: October 2026*
