# 📱 Mobile & PWA Strategy — WhatTheMenu Owner App

> **Version:** 1.0.0 | **Last Updated:** October 2026  
> **Target Audience:** Café Owners, Kitchen Staff, Mobile Engineering, System Architects

---

## Table of Contents

1. [Strategy Overview & Architectural Philosophy](#1-strategy-overview--architectural-philosophy)
2. [Shared Backend & Unified API Architecture](#2-shared-backend--unified-api-architecture)
3. [Owner Mobile Navigation & Responsive Screens](#3-owner-mobile-navigation--responsive-screens)
4. [New-Order Notification Strategy & Device Limitations](#4-new-order-notification-strategy--device-limitations)
5. [Offline Handling, Heartbeats & Resilient Reconnection](#5-offline-handling-heartbeats--resilient-reconnection)
6. [Device Registration & Plan-Based Session Enforcement](#6-device-registration--plan-based-session-enforcement)
7. [PWA Installation, Service Worker & Deployment Strategy](#7-pwa-installation-service-worker--deployment-strategy)
8. [Summary & Implementation Roadmap](#8-summary--implementation-roadmap)

---

## 1. Strategy Overview & Architectural Philosophy

WhatTheMenu employs a **Single-Codebase, Dual-Form-Factor PWA Strategy**. Rather than maintaining disparate native codebases (iOS Swift and Android Kotlin) with a redundant mobile backend, the owner experience is delivered as an **Installable Progressive Web App (PWA)** that runs directly off the shared React 19 frontend and Node.js backend.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       WHATTHEMENU APPLICATION ECOSYSTEM                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
┌──────────────────┐         ┌──────────────────┐          ┌──────────────────┐
│  CUSTOMER WEB    │         │  OWNER PWA / APP │          │   ADMIN PORTAL   │
│ (QR Scan Mobile) │         │ (Phone / Tablet) │          │  (Desktop Only)  │
│  /:cafeId/menu   │         │      /owner      │          │ /admin/codifires │
└──────────────────┘         └──────────────────┘          └──────────────────┘
         │                             │                             │
         └─────────────────────────────┼─────────────────────────────┘
                                       │ HTTPS / WSS
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SHARED UNIFIED NODE.JS BACKEND (Render)                  │
│       • REST API (Express)                 • Real-Time Engine (Socket.IO)   │
│       • JWT Authentication                 • Centralized Error Handler      │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MONGODB ATLAS DATABASE CLUSTER                       │
│     • Cafes (Sessions/Limits)   • Orders (TTL)    • OrderRevenue (Ledger)   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Strategic Benefits for Café Operations

| Capability | PWA Mobile Strategy | Traditional Native Apps |
|------------|---------------------|-------------------------|
| **Deployment Agility** | Instant update on `git push` to Vercel | App Store review delays (24–72 hours) |
| **Platform Commissions** | 0% app store fees | 15–30% in-app purchase tax |
| **Hardware Compatibility** | Any Android, iOS, iPad, POS tablet, or ChromeOS | Requires maintaining separate SDKs |
| **Storage Footprint** | Under 3 MB cached shell | 50–150 MB binary download |
| **Backend Complexity** | **One single REST + Socket.io backend** | Multiple platform API adaptors |

---

## 2. Shared Backend & Unified API Architecture

The mobile owner app requires **no secondary backend**. Both the desktop browser dashboard and the mobile PWA communicate with the exact same backend endpoints and follow identical business rules:

```
Mobile PWA / Tablet          Desktop Browser
         │                          │
         ▼                          ▼
  ┌────────────────────────────────────────┐
  │      X-Client-Platform: web-pwa        │
  │      Authorization: Bearer <JWT>       │
  └──────────────────┬─────────────────────┘
                     │
                     ▼
  ┌────────────────────────────────────────┐
  │          /api/auth/login               │  Identical credential validation &
  │          /api/auth/verify-login-otp    │  device limit checks across all
  │          /api/owner/orders             │  form factors.
  │          /api/owner/menu               │
  └──────────────────┬─────────────────────┘
                     │
                     ▼
  ┌────────────────────────────────────────┐
  │        Socket.io / WSS Engine          │  Room: cafe-{cafeId}
  │     (Handshake Token Authentication)   │  Authorized for owner session
  └────────────────────────────────────────┘
```

### Protocol Standardization

1. **HTTP Headers:** Mobile PWA requests send `Authorization: Bearer <token>` populated from local client storage via the Axios request interceptor in `api.js`.
2. **WebSocket Auth:** The mobile socket connection provides `{ auth: { token } }` during handshake. The server verifies the token and binds the connection to `cafe-${user.id}`.
3. **Session Consistency:** A session created on a mobile device participates in the same `active_sessions[]` array in MongoDB as desktop sessions, respecting the café's plan limits.

---

## 3. Owner Mobile Navigation & Responsive Screens

In a busy kitchen or dining floor, owners and kitchen managers need immediate access to order statuses with minimal tapping. The mobile UI adapts dynamically from the desktop layout into an app-native shell.

```
┌───────────────────────────────────────────────────────────────────────────┐
│                    DESKTOP VS MOBILE NAVIGATION PATTERN                   │
└───────────────────────────────────────────────────────────────────────────┘
   DESKTOP (>= 1024px)                     MOBILE PWA (< 1024px)
 ┌──────┬──────────────────────┐         ┌─────────────────────────┐
 │ LOGO │ Top Bar [Alerts][Bell]│         │ ☰ My Café    🔔 [Store] │ ← Top Bar
 ├──────┼──────────────────────┤         ├─────────────────────────┤
 │ Oper.│                      │         │                         │
 │ Live │                      │         │    KITCHEN ORDERS       │
 │ Menu │    Order Cards       │         │    #104 • Table 4       │
 │ Rev. │    & Analytics       │         │    [ACCEPT] [READY]     │
 │ QR   │                      │         │                         │
 │ Sett.│                      │         │                         │
 └──────┴──────────────────────┘         ├─────────────────────────┤
                                         │ 🛎️ Live │ 📜 Hist │ ⚙️ More│ ← Bottom Bar
                                         └─────────────────────────┘
```

### 3.1 Mobile Bottom Tab Navigation

While desktop uses the 256px sticky sidebar (`OwnerLayout.jsx`), mobile devices transition to a **Thumb-Zone Bottom Navigation Bar** fixed to the bottom of the viewport:

| Tab | Route | Icon | Operational Purpose |
|-----|-------|------|---------------------|
| **Live Orders** | `/owner/orders` | 🛍️ | Primary kitchen view; live cards with one-tap status advancement |
| **History** | `/owner/completed-orders` | 📜 | Daily order log, customer details, receipts |
| **Menu Toggle** | `/owner/menu` | 🍽️ | Quick 86-ing (marking dishes out-of-stock instantly) |
| **Revenue** | `/owner/revenue` | 💰 | Today's revenue, cash vs online breakdown |
| **More / Settings** | `/owner/settings` | ⚙️ | Sound volume, QR code preview, subscription, support |

### 3.2 Viewport & Safe-Area Constraints

To feel like a native app on modern bezel-less devices (iPhone with Dynamic Island, modern Android cutouts), the mobile stylesheet enforces:

```css
/* Mobile Safe Area Insets for PWA */
.owner-mobile-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(60px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--bg-sidebar);
  border-top: 1px solid var(--border-medium);
  backdrop-filter: blur(20px);
  z-index: 250;
  display: flex;
  justify-content: space-around;
  align-items: center;
}

/* Prevent accidental pull-to-refresh & double-tap zoom on kitchen counters */
html, body {
  overscroll-behavior-y: contain;
  touch-action: manipulation;
  -webkit-user-select: none;
  user-select: none;
}
```

### 3.3 Kitchen Mode & Screen Wake-Lock API

Kitchen staff cannot wash hands or touch screens just to wake a dimmed display while grilling or brewing. The mobile app integrates the **HTML5 Screen Wake Lock API**:

```javascript
// Activates when owner enters /owner/orders
let wakeLock = null;

const requestWakeLock = async () => {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('💡 Kitchen Screen Wake Lock active — display will not sleep');
    }
  } catch (err) {
    console.warn('Wake Lock error:', err.message);
  }
};

// Auto-reacquire when returning to tab
document.addEventListener('visibilitychange', () => {
  if (wakeLock !== null && document.visibilityState === 'visible') {
    requestWakeLock();
  }
});
```

---

## 4. New-Order Notification Strategy & Device Limitations

Fast kitchen turnaround requires reliable sound and visual alerts when an order arrives.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DUAL-CHANNEL ORDER NOTIFICATION ENGINE                   │
└─────────────────────────────────────────────────────────────────────────────┘

 [Customer Checkout] ──► [Server POST /api/orders]
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
    Channel 1: FOREGROUND                 Channel 2: BACKGROUND
    (App Open on Tablet/Phone)            (Phone in Pocket / Screen Off)
            │                                     │
    Socket.IO 'new-order'                 Web Push via VAPID / Service Worker
            │                                     │
    ┌───────┴────────┐                    ┌───────┴────────┐
    ▼                ▼                    ▼                ▼
Audio Synthesizer   Toast Banner         OS Notification   Haptic Pattern
(Dual Chime Tone)   (Green Pulse)        "New Order #104"  [200ms,100,200ms]
```

### 4.1 Hardware Audio Alert System

Audio chimes are synthesized directly in the browser via the **Web Audio API** in `hardwareAlerts.js`. This eliminates external audio file network lag and ensures zero-latency playback:

- **New Order Alert:** Two-tone chime (587.33 Hz [D5] $\rightarrow$ 880 Hz [A5]) on a `triangle` oscillator with high-shelf gain boost.
- **Waiter Request Alert:** Three-tone chime (659.25 Hz [E5] $\rightarrow$ 783.99 Hz [G5] $\rightarrow$ 1046.50 Hz [C6]).
- **Bill Request Alert:** Pleasant cash-register style double beep (880 Hz $\rightarrow$ 1318.51 Hz).

### 4.2 Browser & Device Limitations Matrix

Mobile operating systems enforce strict resource constraints to preserve battery. Understanding these limitations is critical for real-world restaurant reliability:

| OS / Browser | Limitation | Impact on Owner App | System Mitigation |
|--------------|------------|---------------------|-------------------|
| **iOS Safari (Tab)** | Suspends WebSockets within 30s of screen lock or switching apps | Socket alerts do not chime when phone is locked in pocket | Instruct owner to **Add to Home Screen (PWA)** + enable Web Push API (iOS 16.4+) |
| **iOS Safari (Audio)** | Autoplay policy blocks audio before user's first screen tap | First order might be silent if staff hasn't touched the device | First touch anywhere on screen unlocks `AudioContext.resume()`; visual alert pulse triggers simultaneously |
| **Android Chrome** | High-performance background Web Push via FCM; WebSockets sleep after ~3 min of lock | Push notifications wake device; WebSockets reconnect on screen on | Standard Service Worker Web Push notification with sound & vibration pattern |
| **OEM Battery Savers** (MIUI, OneUI) | Aggressive OS killers terminate background tasks | Background notifications can be delayed by 2–5 minutes | Provide in-app prompt guiding owner to set battery optimization to "Unrestricted" |

---

## 5. Offline Handling, Heartbeats & Resilient Reconnection

Café Wi-Fi networks frequently drop due to kitchen interference, microwave ovens, or ISP dropouts. The owner app must gracefully handle disconnections without dropping orders.

```
          ┌──────────────────────────────────────────────┐
          │               NORMAL ONLINE STATE            │
          │         Socket.IO Connected (Heartbeat)      │
          └──────────────────────┬───────────────────────┘
                                 │
                   Network drops or Wi-Fi blip
                                 │
                                 ▼
          ┌──────────────────────────────────────────────┐
          │             OFFLINE / RECONNECTING           │
          │  • Persistent top banner: "Reconnecting..."  │
          │  • Socket.io exponential backoff (1s-5s)     │
          │  • Visual warning on Live Orders counter     │
          └──────────────────────┬───────────────────────┘
                                 │
                     Wi-Fi restores / Cell data
                                 │
                                 ▼
          ┌──────────────────────────────────────────────┐
          │             AUTO-RECONCILIATION              │
          │  1. Socket reconnects + rejoins cafe room    │
          │  2. Trigger GET /api/owner/orders?status=all │
          │  3. Diff order array against memory          │
          │  4. Play catch-up chime for missed orders    │
          │  5. Dismiss banner                           │
          └──────────────────────────────────────────────┘
```

### 5.1 Reconnection & Sync Implementation

```javascript
// Auto-Reconciliation on Reconnection (OrderManagement.jsx)
useEffect(() => {
  const token = localStorage.getItem('token');
  const socket = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000
  });

  socket.on('connect', () => {
    setIsOffline(false);
    socket.emit('join-cafe', user?.id);
    
    // CRITICAL: Fetch missed orders during disconnect window
    fetchLatestOrders();
  });

  socket.on('disconnect', (reason) => {
    setIsOffline(true);
    console.warn('⚡ Socket disconnected:', reason);
  });

  return () => socket.disconnect();
}, [user?.id]);
```

---

## 6. Device Registration & Plan-Based Session Enforcement

WhatTheMenu monetizes multi-device access through subscription tiers:
- **Starter Plan (₹299/mo):** 1 concurrent device (e.g. Owner phone or counter PC)
- **Pro Plan (₹499/mo):** 2 concurrent devices (e.g. Counter PC + Kitchen tablet)
- **Pro Plus Plan (₹899/mo):** 3 concurrent devices (e.g. Counter PC + Kitchen tablet + Owner mobile)

### 6.1 Device Registration Flow

```
1. Owner opens PWA on mobile device
2. Submits login credentials (email + password)
3. Backend parses User-Agent:
   - Example: "Chrome on Android (PWA)" or "Safari on iPhone"
4. Evaluates active_sessions.length vs plan limit:
   ├── IF under limit:
   │   Generates JWT, pushes { token, device_info, last_active } to active_sessions[]
   │   Returns 200 OK + JWT
   │
   └── IF limit reached:
       Returns 403 Forbidden { errorType: 'DEVICE_LIMIT_REACHED', sessions, limit }
```

### 6.2 Mobile Device Conflict Resolution (OTP Modal)

When an owner opens the app on a new device while their limit is reached:

```
┌────────────────────────────────────────────────────────┐
│            🔒 Device Limit Reached (2/2)               │
├────────────────────────────────────────────────────────┤
│ You have reached the maximum allowed devices for your  │
│ Pro Plan. Select device(s) to log out:                 │
│                                                        │
│  [✓] Chrome on Windows (Active 5m ago)                 │
│  [ ] Chrome on Android Tablet (Active 2d ago)          │
│                                                        │
│  [ Send Verification OTP to cafe@gmail.com ]           │
└────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│             📧 Enter 6-Digit Verification Code         │
├────────────────────────────────────────────────────────┤
│ A security code has been sent to your email.           │
│                                                        │
│       [ 8 ] [ 4 ] [ 1 ] [ 9 ] [ 2 ] [ 0 ]              │
│                                                        │
│              [ Verify & Log In Device ]                │
└────────────────────────────────────────────────────────┘
```

1. Server generates a cryptographically secure OTP (`crypto.randomInt`).
2. Server stores target session IDs in `pending_logout_sessions`.
3. Upon OTP verification, targeted sessions are pruned, and the new mobile device is registered.
4. Old devices are revoked on their next API call via the `protect` middleware.

---

## 7. PWA Installation, Service Worker & Deployment Strategy

### 7.1 Web App Manifest (`public/manifest.json`)

To enable Android and iOS "Add to Home Screen" installation with full-screen standalone mode:

```json
{
  "name": "WhatTheMenu - Kitchen & Owner Portal",
  "short_name": "WhatTheMenu",
  "description": "Real-time kitchen order management and digital QR menu portal",
  "start_url": "/owner/orders",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#020617",
  "theme_color": "#06b6d4",
  "icons": [
    {
      "src": "/logo.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/logo.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["business", "food", "productivity"],
  "shortcuts": [
    {
      "name": "Live Kitchen",
      "url": "/owner/orders",
      "icons": [{ "src": "/logo.png", "sizes": "96x96" }]
    },
    {
      "name": "Order History",
      "url": "/owner/completed-orders",
      "icons": [{ "src": "/logo.png", "sizes": "96x96" }]
    }
  ]
}
```

### 7.2 Service Worker Strategy

```javascript
// public/sw.js
const CACHE_NAME = 'wtm-owner-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/logo.png',
  '/favicon.svg'
];

// Install: Cache essential shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: Prune stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: Stale-While-Revalidate for app assets; Network-Only for /api/
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache API routes or Socket.IO traffic
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});
```

### 7.3 In-App Install Prompt Banner

Mobile browsers suppress default install prompts. The app implements a native-style in-app prompt:

1. **Android / Chrome:** Listens for `beforeinstallprompt`, prevents default mini-infobar, and displays a prominent card: *"Install Kitchen Tablet App for zero-delay order chime"*. Tapping button invokes `deferredPrompt.prompt()`.
2. **iOS Safari:** Since iOS doesn't support `beforeinstallprompt`, detect iOS standalone mode via `navigator.standalone`. If `false`, display a non-intrusive bottom sheet showing:  
   *"To install: Tap the Share button ⎋ at bottom of Safari, then choose 'Add to Home Screen' ⊞"*.

---

## 8. Summary & Implementation Roadmap

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MOBILE & PWA CAPABILITY CHECKLIST                      │
├──────────────────────────────────┬─────────────────┬────────────────────────┤
│ Feature                          │ Architectural Status │ Priority           │
├──────────────────────────────────┼─────────────────┼────────────────────────┤
│ Unified Shared Backend (Node/DB) │ ✅ Production     │ Active                 │
│ Responsive Screen Adaptation     │ ✅ Production     │ Active                 │
│ Screen Wake Lock (Kitchen Mode)  │ ✅ Implemented    │ Active                 │
│ Hardware Audio Synthesizer       │ ✅ Production     │ Active                 │
│ Socket.io Room Authorization     │ ✅ Hardened       │ Active                 │
│ Device Session Limit & OTP       │ ✅ Hardened       │ Active                 │
│ Auto-Reconciliation on Reconnect │ ✅ Implemented    │ Active                 │
│ Web App Manifest & App Icons     │ 📋 Config Ready   │ Phase 1 Rollout        │
│ Service Worker Shell Caching     │ 📋 Script Ready   │ Phase 1 Rollout        │
│ Background WebPush (VAPID / FCM) │ 📋 Planned        │ Phase 2 Rollout        │
└──────────────────────────────────┴─────────────────┴────────────────────────┘
```

By leveraging this unified PWA strategy, WhatTheMenu delivers a seamless, zero-latency mobile experience for café owners and kitchen operators on any phone or tablet — without managing separate mobile backends, handling dual-codebase bugs, or paying app store taxes.

---

*This document is part of the official WhatTheMenu architectural documentation.*  
*Cross-reference with [ARCHITECTURE_DOC.md](./ARCHITECTURE_DOC.md), [SECURITY_DOC.md](./SECURITY_DOC.md), and [API_DOC.md](./API_DOC.md).*
