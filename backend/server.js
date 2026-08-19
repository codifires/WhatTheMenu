const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const compression = require('compression');

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

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Join café-specific room for order updates
  socket.on('join-cafe', (cafeId) => {
    socket.join(`cafe-${cafeId}`);
    console.log(`📡 Socket ${socket.id} joined cafe-${cafeId}`);
  });

  // Join order-specific room for customer tracking
  socket.on('track-order', (orderNumber) => {
    socket.join(`order-${orderNumber}`);
    console.log(`📡 Socket ${socket.id} tracking order-${orderNumber}`);
  });

  // Join payment session room for automatic UPI payment confirmation
  socket.on('join-payment-session', (sessionId) => {
    socket.join(`session-${sessionId}`);
    console.log(`📡 Socket ${socket.id} joined session-${sessionId}`);
  });

  // Join admin room for real-time subscription revenue and request updates
  socket.on('join-admin', () => {
    socket.join('admin-room');
    console.log(`📡 Socket ${socket.id} joined admin-room`);
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
