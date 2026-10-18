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

## 3. Color Palette

### Primary Brand Colors (Violet/Purple)

| Token | Hex | Usage |
|-------|-----|-------|
| `--primary-400` | `#a78bfa` | Light hover states |
| `--primary-500` | `#8b5cf6` | **Primary brand color** — CTAs, active states |
| `--primary-600` | `#7c3aed` | Button backgrounds |
| `--primary-700` | `#6d28d9` | Pressed states |

### Dark Background Scale

| Token | Hex | Usage |
|-------|-----|-------|
| `--dark-950` | `#0A0A0F` | Page background (darkest) |
| `--dark-900` | `#111117` | Card backgrounds |
| `--dark-800` | `#1C1C27` | Input backgrounds, sidebar |
| `--dark-700` | `#252535` | Borders, dividers |
| `--dark-400` | `#6B7280` | Placeholder text |
| `--dark-300` | `#9CA3AF` | Secondary text |
| `--dark-100` | `#F3F4F6` | Primary text on dark |

### Semantic / Status Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Success Green | `#10B981` | Paid orders, active status |
| Warning Amber | `#F59E0B` | Pending payment, warnings |
| Danger Red | `#EF4444` | Errors, cancel actions |
| Info Blue | `#3B82F6` | Info badges, new orders |

### Gradient System

```css
/* Primary gradient — buttons, logo, key accents */
.gradient-primary {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
}

/* Glow effect on hover */
.glow-primary {
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
}
```

---

## 4. Typography

### Font Stack

| Font | Weight | Role |
|------|--------|------|
| `Inter` | 400, 500, 600, 700 | Primary body font — all UI text |
| `Space Grotesk` | 600, 700 | Display font — headings, logo, dashboard numbers |

Both fonts are loaded from **Google Fonts** via `index.html`.

### Type Scale

| Class | Size | Usage |
|-------|------|-------|
| `.text-xs` | 12px | Timestamps, badges |
| `.text-sm` | 14px | Labels, input help text |
| `.text-base` | 16px | Body text, descriptions |
| `.text-lg` | 18px | Subheadings |
| `.text-xl` | 20px | Section titles |
| `.text-2xl` | 24px | Card titles, dashboard stats |
| `.text-3xl` | 30px | Page headers |
| `.text-4xl+` | 36px+ | Hero text, large metrics |

### Font Usage Rules

- **Numbers & Metrics:** Always use `font-display` (Space Grotesk) — gives a premium data dashboard feel
- **Body copy:** `font-sans` (Inter)
- **Avoid system fonts** — always load Google Fonts

---

## 5. Spacing & Layout Grid

### Base Unit: 4px

All spacing is based on a **4px grid**.

| Token | px | Usage |
|-------|----|-------|
| `gap-1` | 4px | Icon-text gaps |
| `gap-2` | 8px | Tight element spacing |
| `gap-4` | 16px | Card padding |
| `gap-6` | 24px | Section spacing |
| `gap-8` | 32px | Large section breaks |

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
| Landing Page | `/` | Hero section, pricing cards, feature showcase, CTA buttons |
| Owner Login | `/owner/login` | Email/password form, OTP modal for device limit, device selection list |
| Owner Register | `/owner/register` | Multi-field form: café name, email, password |
| Admin Login | `/admin/codifires` | Minimal form, hidden URL, admin branding |
| Owner Dashboard | `/owner` | KPI cards, recent orders table, revenue summary |
| Menu Management | `/owner/menu` | Category sidebar, item grid, drag-to-reorder |
| QR Code Page | `/owner/qr-code` | Large QR display, download button, menu URL |
| Customer Menu | `/:cafeId/menu` | Category tabs, item grid with theme colors |
| Customer Cart | `/:cafeId/menu/cart` | Item list with qty controls, total summary |
| Customer Checkout | `/:cafeId/menu/checkout` | Form + payment method selector (cash/online/razorpay) |
| Order Tracking | `/:cafeId/menu/orders` | Status stepper, real-time Socket.io updates |
| Customer Feedback | `/:cafeId/menu/feedback` | Star rating + review text form |
| Admin Dashboard | `/admin` | Platform KPIs, subscription request alerts |
| Maintenance Page | `/maintenance` | Full-screen branded message (admin-only bypass) |

---

*This document covers the WhatTheMenu design system as implemented in the production codebase.*  
*Update this document when adding new themes, components, or design tokens.*
