# 🎨 Design Documentation — WhatTheMenu QR Menu SaaS

> **Version:** 1.0.0 | **Last Updated:** October 2026 | **Platform:** Web (React 19 + Vite)

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Design System Overview](#2-design-system-overview)
3. [Color Palette](#3-color-palette)
4. [Typography](#4-typography)
5. [Spacing & Layout Grid](#5-spacing--layout-grid)
6. [Component Library](#6-component-library)
7. [Theme System](#7-theme-system)
8. [Customer Portal Design](#8-customer-portal-design)
9. [Owner Dashboard Design](#9-owner-dashboard-design)
10. [Admin Panel Design](#10-admin-panel-design)
11. [Responsive Design](#11-responsive-design)
12. [Animation & Motion](#12-animation--motion)
13. [Accessibility](#13-accessibility)
14. [Page-by-Page UI Reference](#14-page-by-page-ui-reference)

---

## 1. Design Philosophy

WhatTheMenu follows a **dark-first, premium SaaS aesthetic** inspired by modern fintech and restaurant POS tools.

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Dark First** | Default dark mode (`#0A0A0F` background) — reduces eye strain in kitchen/low-light environments |
| **Clarity Over Decoration** | Every UI element serves a function. No decorative clutter |
| **Instant Feedback** | Toast notifications, loading spinners, and status colors on every action |
| **Mobile-First** | Customer portal is optimized for phones (primary use case via QR scan) |
| **Role-Aware UI** | Distinct visual identities for Admin, Owner, and Customer portals |

---

## 2. Design System Overview

The design system is defined in `frontend/src/index.css` using CSS custom properties (variables).

```
frontend/src/
├── index.css          ← Global design tokens & utility classes
├── App.jsx            ← Root routing & layout selection
├── layouts/
│   ├── AdminLayout.jsx
│   ├── OwnerLayout.jsx
│   └── CustomerLayout.jsx
└── components/        ← Reusable UI components
```

---

---

## 3. Color Palette

### Primary Brand Colors (Professional Indigo / Violet)

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary-400` | `#818cf8` | Subtle accents, active indicators |
| `--color-primary-500` | `#6366f1` | Vibrant primary highlight |
| `--color-primary-600` / `--brand-primary` | `#4f46e5` | **Primary brand CTA** — Buttons, active highlights, key links |
| `--color-primary-700` / `--brand-hover` | `#4338ca` | Hover & pressed states |
| `--brand-subtle` | `rgba(79, 70, 229, 0.08)` | Active background tint |

### Dashboard Surfaces (Consistent Dark Sidebar + Balanced Surfaces)

| Surface | Dark Mode | Light Mode | Description |
|---------|-----------|------------|-------------|
| Sidebar | `#0f172a` | `#0f172a` | Permanent dark sidebar for contrast and focus |
| Main Page Shell | `#0b0f19` | `#f8fafc` | Main content canvas |
| Cards & Panels | `#131b2e` | `#ffffff` | Content cards, data widgets |
| Inputs & Selects | `#162035` | `#ffffff` | Form controls |
| Elevated Modals | `#1e293b` | `#ffffff` | Modals, flyouts, dropdowns |

### Customer Portal Surfaces (Clean, Food-Focused & Welcoming)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-main` | `#fafaf9` / `#fcfbfa` | Clean, welcoming porcelain background |
| `--bg-card` | `#ffffff` | Crisp white food cards |
| `--text-primary` | `#1c1917` | High-contrast rich charcoal text |
| `--text-secondary` | `#57534e` | Warm stone secondary text |
| `--accent-primary` | `#ea580c` / `#d97706` | Appetizing warm food accent / CTA |

### Semantic & Order-Status Colors

| Role | Color | Hex | Status Token |
|------|-------|-----|--------------|
| **Success** | Emerald | `#10b981` | Paid orders, completed status (`--status-completed-*`) |
| **Warning** | Amber | `#f59e0b` | Pending payments, preparing status (`--status-preparing-*`) |
| **Danger / Error** | Red | `#ef4444` | Cancelled orders, destructive actions (`--status-cancelled-*`) |
| **Info / New** | Blue | `#3b82f6` | New orders, info notices (`--status-new-*`) |
| **Accepted** | Violet | `#8b5cf6` | Accepted kitchen orders (`--status-accepted-*`) |
| **Ready** | Teal | `#0d9488` | Food ready for pickup / delivery (`--status-ready-*`) |

---

## 4. Typography

### Font Stack

| Font | Weights | Role |
|------|---------|------|
| `Inter` | 300, 400, 500, 600, 700, 800 | Primary font — All UI text, body, labels, tables |
| `Outfit` | 600, 700, 800, 900 | Display font — Page titles, section headings, numbers & prices |

### Typographic Hierarchy

| Role | Class | Size & Weight | Line Height | Usage |
|------|-------|---------------|-------------|-------|
| **Page Title** | `.page-title` | 26px–30px, 800 | 1.25 | Main page headers (`<h1>`) |
| **Section Title** | `.section-title` | 20px–22px, 700 | 1.30 | Major card/section titles (`<h2>`) |
| **Card Title** | `.card-title` | 15px–16px, 600 | 1.40 | Component headings (`<h3>`) |
| **Body Text** | `.body-text` | 14px, 400/500 | 1.50 | Descriptions, table contents |
| **Small / Label** | `.label-text` | 12px, 600 | 1.40 | Form labels, badges, metadata |
| **Prices** | `.price-text` | 16px–18px, 700–800 | 1.20 | Menu prices (tabular numbers) |

---

## 5. Spacing & Layout Grid

### Strict Spacing Scale: 4, 8, 12, 16, 20, 24, 32, 48px

| Token | Value | Standard Usage |
|-------|-------|----------------|
| `--space-1` | `4px` | Micro gaps, status dot spacing |
| `--space-2` | `8px` | Icon-text spacing, button horizontal gaps |
| `--space-3` | `12px` | Compact list items, small card padding |
| `--space-4` | `16px` | Standard mobile card padding, grid gaps |
| `--space-5` | `20px` | Medium section gaps, modal header spacing |
| `--space-6` | `24px` | Standard desktop card padding, page title margins |
| `--space-8` | `32px` | Section separators, dashboard widget gaps |
| `--space-12` | `48px` | Major page breaks |

### Component Standardization

- **Button Heights:** Standard `44px` (`--btn-h`), Small `36px` (`--btn-h-sm`), Large `48px` (`--btn-h-lg`).
- **Input Heights:** Standard `44px` (`--input-h`).
- **Border Radii:** Small `8px` (`--radius-sm`), Medium `12px` (`--radius-md`), Large `16px` (`--radius-lg`), Extra Large `20px` (`--radius-xl`), Pill `9999px` (`--radius-full`).
- **Card Padding:** `24px` desktop / `16px` mobile.

### Layout Structure

```
Admin / Owner Portal:
┌──────────────────────────────────────────────┐
│  Sidebar (240px fixed)  │  Main Content Area  │
│                         │  (flex-1, scrollable)│
└──────────────────────────────────────────────┘

Customer Portal:
┌──────────────────────────────────────────────┐
│  Full-width, single-column, max-width 480px  │
│  Centered, mobile-first                      │
└──────────────────────────────────────────────┘
```

---

## 6. Component Library

### Buttons

```css
/* Primary CTA */
.btn-primary {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  color: white; border-radius: 12px; padding: 10px 20px;
  font-weight: 600; transition: transform 0.2s, box-shadow 0.2s;
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 25px rgba(139,92,246,0.4); }

/* Ghost / Outline */
.btn-ghost { border: 1px solid #252535; background: transparent; color: #9CA3AF; border-radius: 12px; }

/* Danger */
.btn-danger { background: rgba(239,68,68,0.15); color: #EF4444; border: 1px solid rgba(239,68,68,0.3); }
```

### Cards

```css
.card { background: #111117; border: 1px solid #252535; border-radius: 16px; padding: 24px; }
.card-hover:hover { border-color: #8b5cf6; transform: translateY(-2px); box-shadow: 0 12px 40px rgba(139,92,246,0.15); }
```

### Input Fields

```css
.input { background: #1C1C27; border: 1px solid #252535; border-radius: 10px; color: #F3F4F6; padding: 10px 14px; }
.input:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139,92,246,0.1); }
```

### Status Badges — Order Status

| Status | Color Style |
|--------|-------------|
| `new` | Blue badge |
| `accepted` | Purple badge |
| `preparing` | Orange/amber badge |
| `ready` | Green badge |
| `completed` | Gray badge |
| `cancelled` | Red badge |

### Toast Notifications

Uses `react-hot-toast` with custom dark styling:

| Type | Style |
|------|-------|
| Success | Green left border, dark background |
| Error | Red left border, dark background |
| Loading | Spinning indicator |

---

## 7. Theme System

Café owners can unlock and apply visual themes to their **customer-facing menu portal**. Themes affect colors, card styles, and accent colors only in the customer view.

### Available Themes

| Theme Key | Name | Primary Color | Background | Mood |
|-----------|------|---------------|------------|------|
| `classic` | Classic Dark | `#8b5cf6` Violet | `#0A0A0F` | Default premium dark |
| `midnight` | Midnight Blue | `#3B82F6` Blue | `#0A0A14` | Cool, modern |
| `blackgold` | Black & Gold | `#F59E0B` Gold | `#0A0800` | Luxury restaurant |
| `forest` | Forest Green | `#10B981` Emerald | `#020F06` | Organic, eco-café |
| `rose` | Rose Pink | `#EC4899` Pink | `#0F0209` | Café/bakery feminine |

### Theme Unlock Rules

- `classic` — Always unlocked (default for all plans)
- Other themes — Unlocked per subscription plan or admin grant
- Stored in `Cafe.theme_settings.unlocked_themes[]` array
- Active theme stored in `Cafe.theme_settings.active_theme`

### Theme Application

Themes are CSS-class driven on the customer portal root container:

```jsx
// In CustomerLayout.jsx
<div className={`theme-${activeTheme}`}>
  {/* Customer menu content inherits theme tokens */}
</div>
```

---

## 8. Customer Portal Design

### Design Goals

- **Scan-to-browse in < 2 seconds** — Lazy loaded, no auth required
- **Mobile-first** — Designed for 375px–430px screen width
- **One-thumb navigation** — All key actions reachable with thumb

### Customer Journey Flow

```
QR Scan → /:cafeId/menu
    ↓
Browse Categories & Items
    ↓
Add to Cart → /:cafeId/menu/cart
    ↓
Checkout → /:cafeId/menu/checkout
    (Cash / Online / Razorpay)
    ↓
Order Tracking → /:cafeId/menu/orders
    ↓
Leave Feedback → /:cafeId/menu/feedback
```

### Key UI Patterns

| Element | Design Decision |
|---------|-----------------|
| Category tabs | Horizontal scrollable pill tabs |
| Menu items | Card grid with image, name, price, veg indicator |
| Veg indicator | Green dot (veg) / Red dot (non-veg) per FSSAI standard |
| Add to cart | `+` / `-` quantity control inline on card |
| Cart | Sticky bottom bar showing item count + total |
| Checkout | Clean form: name, phone, table number, payment method |
| Order tracking | Real-time status stepper via Socket.io |

---

## 9. Owner Dashboard Design

### Design Goals

- **Data-rich but not cluttered** — owners need at-a-glance metrics
- **Sidebar navigation** — persistent left nav, collapsible on mobile
- **Real-time feel** — Socket.io connected for live order notifications

### Owner Sidebar Navigation

| Section | Icon | Route |
|---------|------|-------|
| Dashboard | 📊 | `/owner` |
| Live Orders | 🔔 | `/owner/orders` |
| Completed Orders | ✅ | `/owner/completed-orders` |
| Payments | 💳 | `/owner/payments` |
| Revenue | 📈 | `/owner/revenue` |
| Menu Management | 🍽️ | `/owner/menu` |
| QR Code | 📱 | `/owner/qr-code` |
| Feedback | ⭐ | `/owner/feedback` |
| Subscription | 💎 | `/owner/subscription` |
| Support | 🎫 | `/owner/support` |
| Settings | ⚙️ | `/owner/settings` |

### Dashboard KPI Cards Layout

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Today's     │  │  Active      │  │  Total Items │  │  Avg Rating  │
│  Revenue     │  │  Orders      │  │  in Menu     │  │              │
│  ₹12,450     │  │  8 pending   │  │  47 items    │  │  ⭐ 4.3/5    │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

---

## 10. Admin Panel Design

### Design Goals

- **Complete platform control** — manage all cafés, subscriptions, revenue
- **Audit-ready** — system logs, subscription history fully visible
- **Alert-driven** — pending subscription requests surfaced prominently

### Admin Sidebar Navigation

| Section | Route |
|---------|-------|
| Dashboard | `/admin` |
| Café Management | `/admin/cafes` |
| Subscriptions | `/admin/subscriptions` |
| Revenue | `/admin/revenue` |
| Payments | `/admin/payments` |
| Media Library | `/admin/media` |
| Plan Services | `/admin/services` |
| Support Tickets | `/admin/support` |
| System Logs | `/admin/logs` |
| Platform Settings | `/admin/settings` |

### Admin Login Security Design

- Hidden URL: `/admin/codifires` — not linked from any public page
- Separate visual identity from owner login
- No "Register" link visible on admin login page

---

## 11. Responsive Design

### Breakpoints

| Name | Width | Target |
|------|-------|--------|
| Mobile | < 640px | Customer portal primary |
| Tablet | 640px–1024px | Owner dashboard secondary |
| Desktop | > 1024px | Owner & Admin primary |

### Responsive Behavior

- **Customer portal:** Always single-column, full-width, max-width 480px centered
- **Owner sidebar:** Collapsible hamburger menu below 1024px
- **Admin panel:** Sidebar hidden on mobile, accessible via overlay menu
- **Data tables:** Horizontal scroll on mobile, full width on desktop

---

## 12. Animation & Motion

### Implemented Animations

| Animation | Duration | Usage |
|-----------|----------|-------|
| `animate-spin` | 1s loop | Loading spinners |
| `animate-pulse-glow` | 2s loop | Logo pulse, skeleton loading |
| Button hover lift | 200ms | `translateY(-1px)` on hover |
| Card hover lift | 200ms | `translateY(-2px)` on hover |
| Modal open/close | 150ms | Opacity fade |
| Sidebar slide | 300ms | Mobile sidebar overlay |

---

## 13. Accessibility

### Implemented Practices

- All interactive elements have `aria-label` or visible label
- Focus-visible ring: `ring-2 ring-primary-500` on keyboard focus
- Semantic HTML: `<nav>`, `<main>`, `<header>`, `<section>`, `<button>`
- Loading states communicated via spinners and disabled states
- Toast notifications use `role="status"` (via react-hot-toast)

---

## 14. Page-by-Page UI Reference

| Page | Route | Key UI Elements |
|------|-------|-----------------|
| Landing Page | `/` | Hero section, interactive live preview mockups, pricing cards, feature showcase, FAQ accordion |
| Owner Login | `/owner/login` | Email/password form, Lucide icons, multi-device session inspector, OTP security challenge |
| Owner Register | `/owner/register` | 3-stage onboarding wizard (Account → Café Details → Plan Selection), plan cards, slug checker |
| Password Recovery | `/forgot-password`, `/set-password/:token` | Password visibility toggles, strength validation feedback, email dispatch confirmation |
| Admin Login | `/admin/codifires` | Restricted portal branding, purple/violet accents, shield verification badge |
| Owner Dashboard | `/owner` | 4 executive KPI cards, real-time orders table, quick actions, audio alert volume audition |
| Order Management | `/owner/orders` | Real-time KDS kitchen order system, audio triggers, order status progression, thermal printing |
| Completed Orders | `/owner/completed-orders` | Executive KPIs, date presets (All Time, Today, Yesterday, Custom), card vs table view, receipt print |
| Menu Management | `/owner/menu` | Category filter pills with dish counters, drag-and-drop reordering, instant 86 item toggle, photo modal |
| Table QR Code Generator | `/owner/qr-code` | General vs Table-specific QR, Canvas high-res PNG generator, acrylic tabletop standee preview |
| Owner Payments | `/owner/payments` | Financial reconciliation ledger, KPI metrics, UTR copy action, payment status toggle |
| Owner Revenue Analytics | `/owner/revenue` | Daily/Monthly/Yearly modes, day picker pills with revenue dots, peak revenue card, breakdown ledger |
| Customer Reviews | `/owner/feedback` | Rating breakdown widget with star distributions (1..5 stars), average rating hero, review cards |
| Café Settings | `/owner/settings` | Profile, brand assets, customer menu theme previewer (5 themes), Razorpay keys, hardware sound audition |
| Subscription Plans | `/owner/subscription` | Monthly/yearly cycle toggle with discount pill, active plan status card, 3-tier SaaS cards, Razorpay trigger |
| Help & Support | `/owner/support` | Direct WhatsApp chat, phone and email helpline, tabbed ticket desk with status badges, accordion FAQs |
| Customer Menu | `/:cafeId/menu` | Category tabs, dish cards with Lucide icon fallback, one-handed add/increment/decrement, table pill |
| Customer Search | `/:cafeId/menu/search` | Live instant dish search, dietary filters (All, Veg, Non-Veg), Lucide empty/helper states |
| Customer Cart | `/:cafeId/menu/cart` | Dine-in table badge, cooking notes, quantity steppers, safe bottom padding, empty cart prompt |
| Customer Checkout | `/:cafeId/menu/checkout` | Order review receipt, cash vs Razorpay payment methods, customer contact and table validation |
| Order Tracking | `/:cafeId/menu/orders` | Real-time status progression stepper, Call Waiter & Request Bill buttons, itemized receipt breakdown |
| Customer Feedback | `/:cafeId/menu/feedback` | Star rating selector, AI-assisted review helper, review feedback submission |
| Super Admin Dashboard | `/admin` | 5 platform KPI cards, tenant activations list, platform health telemetry, urgent ticket desk |
| Café Tenant Management | `/admin/cafes` | Tenant directory table, live debounce search, Add/Edit modal, suspension toggle, preview link |
| Subscription Desk | `/admin/subscriptions` | SaaS plan tier overview, offline UPI verification queue with UTR copy and Approve/Reject buttons |
| Admin Payments Ledger | `/admin/payments` | Global payment transaction ledger, UTR copy action, status badges, pagination controls |
| Plan Services Config | `/admin/services` | 3-column perk editor for Starter, Pro, and Pro Plus plans with inline add/edit/delete and bulk save |
| Global Media Library | `/admin/media` | Global stock food photography library, category pills, upload modal with file picker, delete action |
| Support Ticket Desk | `/admin/support` | Multi-status filter tabs, search input, ticket directory table, and admin reply modal |
| System Logs & Telemetry | `/admin/logs` | Telemetry viewer with severity badges (info, warn, error, critical), expandable stack trace accordion |
| Platform Revenue Tracker | `/admin/revenue` | Platform SaaS subscription MRR tracker styled in Super Admin dark obsidian theme with renewal volume counts |
| Platform Settings | `/admin/settings` | Tabbed platform configuration (General, Billing & Plans, Security & Access), schedule picker, cache purge |
| Contact Us | `/contact-us` | Brand hero with Lucide icons (Mail, Phone, MessageSquare, Clock), operating schedule card |
| Legal Policies | `/terms`, `/privacy-policy`, `/refund-policy` | Brand headers, back to home buttons, Lucide contact icons, consistent typography and dark shell |
| Maintenance Page | `/maintenance` | Full-screen branded message with Super Admin bypass login |

---

*This document covers the complete WhatTheMenu design system and screen architecture as implemented in the production codebase.*
