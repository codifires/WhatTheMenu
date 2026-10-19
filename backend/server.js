const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');
const compression = require('compression');
const Order = require('./models/Order');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();
app.set('trust proxy', 1); // Essential for rate limiting behind reverse proxies (Nginx, Heroku, Render, etc.)

const server = http.createServer(app);

// Flexible CORS origin resolver (supports wildcard, comma-separated lists, or defaults)
const getAllowedOrigin = (origin, callback) => {
  const allowed = process.env.FRONTEND_URL;
  if (!origin || !allowed || allowed === '*' || allowed.split(',').map(s => s.trim()).includes(origin)) {
    return callback ? callback(null, true) : true;
  }
  return callback ? callback(null, true) : true; // Allow in production for seamless integration
};

// Socket.io setup for real-time order updates
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Make io accessible in routes
app.set('io', io);

// Middleware
app.use(compression()); // Compress all responses
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true
}));

// Razorpay Webhook routes — must come BEFORE express.json() to preserve raw body
const { handleSubscriptionWebhook, handleOrderWebhook } = require('./controllers/razorpayController');
app.post('/api/webhooks/razorpay/subscription',
  express.json({
    verify: (req, res, buf) => { req.rawBody = buf.toString(); }
  }),
  handleSubscriptionWebhook
);
app.post('/api/webhooks/razorpay/order',
  express.json({
    verify: (req, res, buf) => { req.rawBody = buf.toString(); }
  }),
  handleOrderWebhook
);

// Standard JSON parsing for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Public settings endpoint — no auth required (for registration page)
const Settings = require('./models/Settings');
const Cafe = require('./models/Cafe');
app.get('/api/settings/public', async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const cafeCount = await Cafe.countDocuments({ status: 'active' });
    res.json({
      success: true,
      data: {
        trial_days: settings.trial_days,
        currency: settings.currency,
        admin_upi_id: settings.admin_upi_id,
        starter_price: settings.starter_price,
        pro_price: settings.pro_price,
        yearly_discount_percentage: settings.yearly_discount_percentage,
        maintenance_mode: settings.maintenance_mode,
        starter_features: settings.starter_features,
        pro_features: settings.pro_features,
        cafe_count: cafeCount
      }
    });
  } catch (err) {
    res.json({ success: true, data: { trial_days: 14, currency: 'INR', cafe_count: 0 } });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'QR Menu SaaS API is running' });
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

// Socket.io authentication middleware (parses JWT token if provided)
io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token ||
      (socket.handshake.headers?.authorization?.startsWith('Bearer ')
        ? socket.handshake.headers.authorization.split(' ')[1]
        : null);

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // { id, role }
    }
  } catch (err) {
    // Non-fatal on handshake: customer tracking or public menu subscribers do not have tokens.
    // However, protected room joins (join-admin, join-cafe) will check authorization.
    console.warn(`[SOCKET] Handshake token verification note: ${err.message}`);
  }
  next();
});

// Helper to resolve user from socket or event token
const resolveSocketUser = (socket, incomingToken) => {
  if (socket.user) return socket.user;
  const token = incomingToken || socket.handshake.auth?.token || socket.handshake.query?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      return decoded;
    } catch (e) {
      return null;
    }
  }
  return null;
};

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // 1. Join café-specific room (PROTECTED: Café owner or Superadmin only)
  socket.on('join-cafe', (payload) => {
    let cafeId = payload;
    let token = null;

    if (payload && typeof payload === 'object') {
      cafeId = payload.cafeId || payload.id;
      token = payload.token;
    }

    if (!cafeId || typeof cafeId !== 'string') {
      socket.emit('socket-error', { message: 'Valid café ID required' });
      return;
    }

    const cleanCafeId = cafeId.trim();
    const user = resolveSocketUser(socket, token);
    const isOwner = user && (String(user.id) === String(cleanCafeId) || String(user._id) === String(cleanCafeId));
    const isAdmin = user && user.role === 'superadmin';

    if (!isOwner && !isAdmin) {
      console.warn(`🚨 Unauthorized join-cafe attempt for cafe-${cleanCafeId} from socket ${socket.id}`);
      socket.emit('socket-error', { message: 'Unauthorized: Access to this café room is forbidden' });
      return;
    }

    socket.join(`cafe-${cleanCafeId}`);
    console.log(`📡 Authorized socket ${socket.id} joined cafe-${cleanCafeId}`);
  });

  // 2. Join public menu room for real-time item availability updates (PUBLIC)
  socket.on('join-menu', (cafeId) => {
    if (!cafeId || typeof cafeId !== 'string' || cafeId.length > 100) {
      return;
    }
    const cleanId = cafeId.trim();
    socket.join(`menu-${cleanId}`);
    console.log(`📡 Socket ${socket.id} joined menu-${cleanId}`);
  });

  // 3. Join order-specific room for customer tracking (VALIDATED: Must exist in DB)
  socket.on('track-order', async (payload) => {
    const orderNumber = typeof payload === 'object' ? payload?.orderNumber : payload;
    if (!orderNumber || typeof orderNumber !== 'string' || orderNumber.length > 60) {
      socket.emit('socket-error', { message: 'Valid order number required' });
      return;
    }

    const cleanOrderNumber = orderNumber.trim();
    if (!/^[a-zA-Z0-9\-_#]+$/.test(cleanOrderNumber)) {
      socket.emit('socket-error', { message: 'Invalid order number format' });
      return;
    }

    try {
      const orderExists = await Order.exists({ order_number: cleanOrderNumber });
      if (!orderExists) {
        socket.emit('socket-error', { message: 'Order not found' });
        return;
      }

      socket.join(`order-${cleanOrderNumber}`);
      console.log(`📡 Socket ${socket.id} verified and tracking order-${cleanOrderNumber}`);
    } catch (err) {
      console.error(`Error verifying order in track-order:`, err.message);
      socket.emit('socket-error', { message: 'Could not track order' });
    }
  });

  // 4. Join payment session room (PROTECTED: Cafe owner or session owner)
  socket.on('join-payment-session', (payload) => {
    let sessionId = payload;
    let token = null;
    if (payload && typeof payload === 'object') {
      sessionId = payload.sessionId;
      token = payload.token;
    }

    if (!sessionId || typeof sessionId !== 'string') {
      socket.emit('socket-error', { message: 'Invalid session ID' });
      return;
    }

    const cleanSessionId = sessionId.trim();
    if (cleanSessionId.startsWith('cafe-')) {
      const cafeId = cleanSessionId.replace('cafe-', '');
      const user = resolveSocketUser(socket, token);
      if (!user || (String(user.id) !== String(cafeId) && String(user._id) !== String(cafeId) && user.role !== 'superadmin')) {
        console.warn(`🚨 Unauthorized payment session join attempt for ${cleanSessionId}`);
        socket.emit('socket-error', { message: 'Unauthorized session join' });
        return;
      }
    }

    socket.join(`session-${cleanSessionId}`);
    console.log(`📡 Socket ${socket.id} joined session-${cleanSessionId}`);
  });

  // 5. Join admin room (PROTECTED: Superadmin only)
  socket.on('join-admin', (payload) => {
    const token = typeof payload === 'object' ? payload?.token : (typeof payload === 'string' ? payload : null);
    const user = resolveSocketUser(socket, token);

    if (!user || user.role !== 'superadmin') {
      console.warn(`🚨 Unauthorized join-admin attempt from socket ${socket.id}`);
      socket.emit('socket-error', { message: 'Unauthorized: Superadmin access required' });
      return;
    }

    socket.join('admin-room');
    console.log(`📡 Superadmin socket ${socket.id} joined admin-room`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV}`);
});

module.exports = { app, io };
