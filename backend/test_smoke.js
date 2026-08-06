/**
 * CI Smoke & Sanity Test Suite
 * Validates syntax, model integrity, route loaders, and dependency resolutions.
 * Designed to execute in headless CI matrix environments without requiring an external DB.
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Running QR Menu SaaS Backend Smoke & CI Sanity Tests...\n');

let failed = false;

function testStep(name, fn) {
  try {
    process.stdout.write(`  ⏳ Testing: ${name}... `);
    fn();
    console.log('✅ PASSED');
  } catch (err) {
    console.log('❌ FAILED');
    console.error(`     Error: ${err.message}`);
    failed = true;
  }
}

// 1. Validate Mongoose Models
testStep('Mongoose Models Schema Loading', () => {
  const models = [
    'Admin',
    'Cafe',
    'Category',
    'Feedback',
    'GlobalMedia',
    'MenuItem',
    'Order',
    'OrderRevenue',
    'QRCode',
    'Settings',
    'Subscription',
    'SubscriptionHistory',
    'SubscriptionRequest',
    'SupportTicket'
  ];

  models.forEach((m) => {
    const mod = require(`./models/${m}`);
    if (!mod) throw new Error(`Model ${m} failed to export`);
  });
});

// 2. Validate Route Modules
testStep('Express Route Declarations', () => {
  const routes = [
    'adminRoutes',
    'authRoutes',
    'feedbackRoutes',
    'menuRoutes',
    'orderRoutes',
    'ownerRoutes',
    'supportRoutes'
  ];

  routes.forEach((r) => {
    const mod = require(`./routes/${r}`);
    if (!mod) throw new Error(`Route ${r} failed to export`);
  });
});

// 3. Validate Controllers
testStep('Controller Handlers Resolution', () => {
  const controllers = [
    'adminController',
    'authController',
    'customerController',
    'ownerController',
    'supportController'
  ];

  controllers.forEach((c) => {
    const mod = require(`./controllers/${c}`);
    if (!mod || typeof mod !== 'object') throw new Error(`Controller ${c} invalid export`);
  });
});

// 4. Validate Utilities & Middleware
testStep('Utilities & Middleware Integration', () => {
  require('./middleware/auth');
  require('./middleware/errorHandler');
  require('./middleware/rateLimiter');
  require('./middleware/validator');
  require('./utils/jwt');
  require('./utils/qrcode');
  require('./utils/sendEmail');
  require('./utils/emailTemplates');
});

// 5. Environment Template Check
testStep('.env.example Completeness', () => {
  const envExamplePath = path.join(__dirname, '.env.example');
  if (!fs.existsSync(envExamplePath)) {
    throw new Error('.env.example does not exist in backend root');
  }
  const content = fs.readFileSync(envExamplePath, 'utf8');
  const requiredKeys = ['PORT', 'MONGO_URI', 'JWT_SECRET'];
  requiredKeys.forEach((key) => {
    if (!content.includes(key)) {
      throw new Error(`Missing ${key} in .env.example`);
    }
  });
});

console.log('\n----------------------------------------');
if (failed) {
  console.error('❌ CI Smoke Tests FAILED! Please fix errors above.');
  process.exit(1);
} else {
  console.log('🎉 All Backend CI Smoke Tests PASSED successfully!');
  process.exit(0);
}
