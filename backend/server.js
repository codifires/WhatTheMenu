const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');
const compression = require('compression');
const mongoose = require('mongoose');
const Order = require('./models/Order');
const Cafe = require('./models/Cafe');
const Admin = require('./models/Admin');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();
app.disable('x-powered-by'); // Prevent Express signature leakage
// Configure Express proxy trust strictly to prevent client-controlled forwarding header spoofing
if (process.env.TRUST_PROXY === 'false' || process.env.TRUST_PROXY === '0') {
  app.set('trust proxy', false);
} else if (process.env.TRUST_PROXY && !isNaN(Number(process.env.TRUST_PROXY))) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY));
} else if (process.env.TRUST_PROXY) {
  const proxySetting = process.env.TRUST_PROXY.includes(',')
    ? process.env.TRUST_PROXY.split(',').map(s => s.trim())
    : process.env.TRUST_PROXY;
  app.set('trust proxy', proxySetting);
} else {
  // Default to 1 trusted reverse-proxy hop (standard for Docker / Heroku / Render / Nginx)
  app.set('trust proxy', 1);
}

// Request ID correlation and response metric tracing
const { requestIdMiddleware } = require('./middleware/requestId');
const logger = require('./utils/logger');
app.use(requestIdMiddleware);

// HTTPS Enforcement in Production
app.use((req, res, next) => {
  if (
    process.env.NODE_ENV === 'production' &&
    req.headers['x-forwarded-proto'] &&
    req.headers['x-forwarded-proto'] !== 'https'
  ) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// Comprehensive Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self "https://api.razorpay.com" "https://checkout.razorpay.com")');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  if (process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

const server = http.createServer(app);

// Configured Origin Allowlist for approved frontend applications
const buildAllowedOrigins = () => {
  const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  ];

  const configured = [
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
    ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : [])
  ]
    .map(o => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const set = new Set(defaultOrigins);
  for (const origin of configured) {
    if (origin !== '*') {
      set.add(origin);
    }
  }
  return set;
};

const allowedOriginsSet = buildAllowedOrigins();

// Explicit CORS origin validator (shared between Express and Socket.IO)
const corsOriginChecker = (origin, callback) => {
  // Allow non-browser requests (e.g. mobile native apps, curl, Razorpay server-to-server webhooks)
  if (!origin) {
    return callback(null, true);
  }

  const cleanOrigin = origin.trim().replace(/\/$/, '');

  if (allowedOriginsSet.has(cleanOrigin)) {
    return callback(null, true);
  }

  // Reject untrusted browser origins with explicit CORS error
  const corsError = new Error(`CORS blocked: Origin '${origin}' is not authorized.`);
  corsError.statusCode = 403;
  return callback(corsError, false);
};

// Socket.io setup for real-time updates
const io = new Server(server, {
  cors: {
    origin: corsOriginChecker,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Make io accessible in routes
app.set('io', io);

// Middleware
app.use(compression()); // Compress all responses
app.use(cors({
  origin: corsOriginChecker,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Razorpay Webhook routes — must come BEFORE express.json() to preserve raw body
const { handleSubscriptionWebhook, handleOrderWebhook } = require('./controllers/razorpayController');
const { webhookLimiter } = require('./middleware/rateLimiter');
app.post('/api/webhooks/razorpay/subscription',
  webhookLimiter,
  express.json({
    verify: (req, res, buf) => { req.rawBody = buf.toString(); }
  }),
  handleSubscriptionWebhook
);
app.post('/api/webhooks/razorpay/order',
  webhookLimiter,
  express.json({
    verify: (req, res, buf) => { req.rawBody = buf.toString(); }
  }),
  handleOrderWebhook
);

// Standard JSON parsing with strict payload limits (1MB max to prevent payload DOS)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Global NoSQL injection protection middleware
const { noSqlSanitizer } = require('./middleware/noSqlSanitizer');
app.use(noSqlSanitizer);

// Static files for uploads are no longer needed locally as we use Cloudinary

const { publicLimiter } = require('./middleware/rateLimiter');

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/owner', require('./routes/ownerRoutes'));
app.use('/api/support', require('./routes/supportRoutes'));

// Razorpay API routes (subscription + order payments)
app.use('/api', require('./routes/razorpayRoutes'));

// Public routes with rate limiting
app.use('/api/menu', publicLimiter, require('./routes/menuRoutes'));
app.use('/api/orders', publicLimiter, require('./routes/orderRoutes'));
app.use('/api/feedback', publicLimiter, require('./routes/feedbackRoutes'));

const { errorHandler } = require('./middleware/errorHandler');

// Health and Readiness Probes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'QR Menu SaaS API is running' });
});

app.get('/api/health/live', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health/ready', (req, res) => {
  const dbState = mongoose.connection.readyState;
  // 1 = connected, 2 = connecting, 0 = disconnected, 3 = disconnecting
  if (dbState === 1) {
    return res.status(200).json({
      status: 'UP',
      database: 'CONNECTED',
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  }

  return res.status(503).json({
    status: 'DOWN',
    database: 'DISCONNECTED',
    timestamp: new Date().toISOString()
  });
});

// Centralized error handling middleware
app.use(errorHandler);

// Initialize Background Cron Jobs
const startSubscriptionCron = require('./jobs/subscriptionCron');
startSubscriptionCron();

const initOrderCleanupCron = require('./jobs/orderCleanupCron');
initOrderCleanupCron();

const initPaymentReconciliationCron = require('./jobs/paymentReconciliationCron');
initPaymentReconciliationCron(io);

// In-memory sliding window rate-limiter for sensitive socket events
const socketRateLimits = new Map();

const checkSocketRateLimit = (socket, eventName, limit = 20, windowMs = 60000) => {
  const now = Date.now();
  if (!socketRateLimits.has(socket.id)) {
    socketRateLimits.set(socket.id, {});
  }
  const clientLimits = socketRateLimits.get(socket.id);
  if (!clientLimits[eventName] || now > clientLimits[eventName].resetTime) {
    clientLimits[eventName] = { count: 1, resetTime: now + windowMs };
    return true;
  }
  clientLimits[eventName].count += 1;
  if (clientLimits[eventName].count > limit) {
    return false;
  }
  return true;
};

// Socket.io authentication middleware (authenticates token and verifies DB role & membership)
io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization?.startsWith('Bearer ')
        ? socket.handshake.headers.authorization.split(' ')[1]
        : null) ||
      socket.handshake.query?.token;

    // Public / Anonymous visitors (e.g., customers on public menu or tracking page)
    if (!token) {
      socket.user = null;
      return next();
    }

    // Verify token cryptographic signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id || !decoded.role) {
      return next(new Error('Authentication failed: Malformed token payload'));
    }

    // Check account status and active session in database
    if (decoded.role === 'superadmin') {
      const admin = await Admin.findById(decoded.id).select('_id email role');
      if (!admin) {
        return next(new Error('Authentication failed: Admin account does not exist'));
      }
      socket.user = Object.freeze({
        id: String(admin._id),
        role: 'superadmin',
        email: admin.email,
        exp: decoded.exp
      });
    } else if (decoded.role === 'owner') {
      const cafe = await Cafe.findById(decoded.id).select('_id is_active active_sessions name');
      if (!cafe) {
        return next(new Error('Authentication failed: Café account does not exist'));
      }
      if (cafe.is_active === false) {
        return next(new Error('Authentication failed: Account has been suspended'));
      }
      // Check session validity against active_sessions (revocation on logout / reset / device limit)
      if (cafe.active_sessions && !cafe.active_sessions.some(s => s.token === token)) {
        return next(new Error('Authentication failed: Session has been revoked or logged out'));
      }
      socket.user = Object.freeze({
        id: String(cafe._id),
        role: 'owner',
        name: cafe.name,
        cafeId: String(cafe._id),
        exp: decoded.exp
      });
    } else {
      return next(new Error('Authentication failed: Unsupported role'));
    }

    return next();
  } catch (err) {
    // If a token was provided but failed verification (expired or forged), block connection
    console.warn(`[SOCKET] Authentication rejection on socket ${socket.id}: ${err.message}`);
    return next(new Error(`Authentication failed: ${err.message}`));
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id} (user: ${socket.user ? socket.user.role + ':' + socket.user.id : 'anonymous'})`);

  // If authenticated user token will expire, schedule automatic disconnect
  let expiryTimer = null;
  if (socket.user && socket.user.exp) {
    const timeToExpiry = (socket.user.exp * 1000) - Date.now();
    if (timeToExpiry <= 0) {
      socket.emit('socket-error', { code: 'TOKEN_EXPIRED', message: 'Token has already expired' });
      socket.disconnect(true);
      return;
    }
    expiryTimer = setTimeout(() => {
      if (socket.connected) {
        socket.emit('socket-error', { code: 'TOKEN_EXPIRED', message: 'Session token expired. Disconnecting.' });
        socket.disconnect(true);
      }
    }, timeToExpiry);
  }

  // Helper to enforce rate limiting on socket events
  const enforceRateLimit = (eventName, limit, windowMs = 60000) => {
    if (!checkSocketRateLimit(socket, eventName, limit, windowMs)) {
      socket.emit('socket-error', {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests for ${eventName}. Please try again later.`
      });
      return false;
    }
    return true;
  };

  // 1. Join café-specific room (PROTECTED: Verified Café owner or Superadmin only)
  socket.on('join-cafe', (payload) => {
    if (!enforceRateLimit('join-cafe', 10)) return;

    let cafeId = payload;
    if (payload && typeof payload === 'object') {
      cafeId = payload.cafeId || payload.id;
    }

    if (!cafeId || typeof cafeId !== 'string') {
      socket.emit('socket-error', { code: 'INVALID_PAYLOAD', message: 'Valid café ID required' });
      return;
    }

    const cleanCafeId = cafeId.trim();
    if (!/^[a-fA-F0-9]{24}$/.test(cleanCafeId)) {
      socket.emit('socket-error', { code: 'INVALID_FORMAT', message: 'Invalid café ID format' });
      return;
    }

    // Require handshake authentication
    if (!socket.user) {
      socket.emit('socket-error', { code: 'UNAUTHORIZED', message: 'Authentication required to join café room' });
      return;
    }

    const isOwner = socket.user.role === 'owner' && socket.user.id === cleanCafeId;
    const isAdmin = socket.user.role === 'superadmin';

    if (!isOwner && !isAdmin) {
      console.warn(`🚨 Unauthorized join-cafe attempt for cafe-${cleanCafeId} from user ${socket.user.id}`);
      socket.emit('socket-error', { code: 'FORBIDDEN', message: 'Forbidden: Access to another café room is forbidden' });
      return;
    }

    socket.join(`cafe-${cleanCafeId}`);
    console.log(`📡 Authorized socket ${socket.id} (user: ${socket.user.id}) joined cafe-${cleanCafeId}`);
  });

  // 2. Join public menu room for real-time item availability updates (PUBLIC)
  socket.on('join-menu', async (payload) => {
    if (!enforceRateLimit('join-menu', 20)) return;

    const cafeId = typeof payload === 'object' ? (payload?.cafeId || payload?.id) : payload;
    if (!cafeId || typeof cafeId !== 'string' || cafeId.length > 64) {
      socket.emit('socket-error', { code: 'INVALID_PAYLOAD', message: 'Valid café identifier required' });
      return;
    }

    const cleanId = cafeId.trim();
    if (!/^[a-zA-Z0-9\-_]{3,64}$/.test(cleanId)) {
      socket.emit('socket-error', { code: 'INVALID_FORMAT', message: 'Invalid café identifier format' });
      return;
    }

    try {
      const cafeExists = await Cafe.exists(
        mongoose.isValidObjectId(cleanId) ? { _id: cleanId } : { slug: cleanId.toLowerCase() }
      );
      if (!cafeExists) {
        socket.emit('socket-error', { code: 'NOT_FOUND', message: 'Café not found for menu room' });
        return;
      }
      socket.join(`menu-${cleanId}`);
    } catch (err) {
      socket.emit('socket-error', { code: 'INTERNAL_ERROR', message: 'Could not join menu room' });
    }
  });

  // 3. Join order-specific room for customer tracking (VALIDATED: Must exist in DB)
  socket.on('track-order', async (payload) => {
    if (!enforceRateLimit('track-order', 20)) return; // Prevents brute-force order enumeration

    const orderNumber = typeof payload === 'object' ? payload?.orderNumber : payload;
    if (!orderNumber || typeof orderNumber !== 'string' || orderNumber.length > 50) {
      socket.emit('socket-error', { code: 'INVALID_PAYLOAD', message: 'Valid order number required' });
      return;
    }

    const cleanOrderNumber = orderNumber.trim();
    if (!/^[a-zA-Z0-9\-_#]{3,50}$/.test(cleanOrderNumber)) {
      socket.emit('socket-error', { code: 'INVALID_FORMAT', message: 'Invalid order number format' });
      return;
    }

    try {
      const order = await Order.findOne({ order_number: cleanOrderNumber }).select('_id cafe_id order_number');
      if (!order) {
        socket.emit('socket-error', { code: 'NOT_FOUND', message: 'Order not found' });
        return;
      }

      // If client is authenticated as an owner of a DIFFERENT café, reject cross-tenant tracking
      if (socket.user && socket.user.role === 'owner' && String(order.cafe_id) !== String(socket.user.id)) {
        socket.emit('socket-error', { code: 'FORBIDDEN', message: 'Forbidden: Order belongs to another café' });
        return;
      }

      socket.join(`order-${cleanOrderNumber}`);
    } catch (err) {
      console.error(`Error verifying order in track-order:`, err.message);
      socket.emit('socket-error', { code: 'INTERNAL_ERROR', message: 'Could not track order' });
    }
  });

  // 4. Join payment session room (PROTECTED: Cafe owner or authorized payment session)
  socket.on('join-payment-session', async (payload) => {
    if (!enforceRateLimit('join-payment-session', 15)) return;

    let sessionId = payload;
    if (payload && typeof payload === 'object') {
      sessionId = payload.sessionId;
    }

    if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 64) {
      socket.emit('socket-error', { code: 'INVALID_PAYLOAD', message: 'Invalid payment session ID' });
      return;
    }

    const cleanSessionId = sessionId.trim();
    if (!/^(cafe-[a-fA-F0-9]{24}|order-[a-zA-Z0-9\-_#]{3,50}|sess_[a-zA-Z0-9\-_]{8,64})$/.test(cleanSessionId)) {
      socket.emit('socket-error', { code: 'INVALID_FORMAT', message: 'Invalid session identifier format' });
      return;
    }

    if (cleanSessionId.startsWith('cafe-')) {
      const targetCafeId = cleanSessionId.replace('cafe-', '');
      if (!socket.user) {
        socket.emit('socket-error', { code: 'UNAUTHORIZED', message: 'Authentication required for café payment session' });
        return;
      }
      const isOwner = socket.user.role === 'owner' && socket.user.id === targetCafeId;
      const isAdmin = socket.user.role === 'superadmin';
      if (!isOwner && !isAdmin) {
        socket.emit('socket-error', { code: 'FORBIDDEN', message: 'Forbidden: Cannot access another café payment session' });
        return;
      }
    } else if (cleanSessionId.startsWith('order-')) {
      const targetOrderNumber = cleanSessionId.replace('order-', '');
      const order = await Order.findOne({ order_number: targetOrderNumber }).select('_id cafe_id');
      if (!order) {
        socket.emit('socket-error', { code: 'NOT_FOUND', message: 'Order session not found' });
        return;
      }
      if (socket.user && socket.user.role === 'owner' && String(order.cafe_id) !== String(socket.user.id)) {
        socket.emit('socket-error', { code: 'FORBIDDEN', message: 'Forbidden: Payment session belongs to another café' });
        return;
      }
    }

    socket.join(`session-${cleanSessionId}`);
  });

  // 5. Join admin room (PROTECTED: Superadmin only)
  socket.on('join-admin', () => {
    if (!enforceRateLimit('join-admin', 5)) return;

    if (!socket.user || socket.user.role !== 'superadmin') {
      console.warn(`🚨 Unauthorized join-admin attempt from socket ${socket.id}`);
      socket.emit('socket-error', { code: 'FORBIDDEN', message: 'Unauthorized: Superadmin access required' });
      return;
    }

    socket.join('admin-room');
    console.log(`📡 Superadmin socket ${socket.id} joined admin-room`);
  });

  socket.on('disconnect', () => {
    if (expiryTimer) clearTimeout(expiryTimer);
    socketRateLimits.delete(socket.id);
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`, { port: PORT, env: process.env.NODE_ENV });
  });
}

// Global Process Safety Net: Unhandled Promise Rejections
process.on('unhandledRejection', (reason) => {
  logger.critical('Unhandled Promise Rejection detected in Node process', {
    stack: reason instanceof Error ? reason.stack : String(reason)
  });
});

// Global Process Safety Net: Uncaught Exceptions
process.on('uncaughtException', (error) => {
  logger.critical(`Uncaught Exception detected: ${error.message}`, {
    stack: error.stack
  });
  // In production, exit cleanly to allow orchestrator (K8s / PM2 / Docker) to restart fresh instance
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Graceful Shutdown Handler
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close(false);
        logger.info('MongoDB connection closed.');
      }
      process.exit(0);
    } catch (err) {
      logger.error('Error during database connection termination:', { stack: err.stack });
      process.exit(1);
    }
  });

  // Force shutdown if connections do not close within 10 seconds
  setTimeout(() => {
    logger.critical('Forced shutdown: connections did not close within timeout window.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = { app, io, server };
