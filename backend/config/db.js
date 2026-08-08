const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const isTestMode = process.env.NODE_ENV === 'test' || process.env.USE_TEST_DB === 'true';
    
    // Choose active URI: MONGO_URI_TEST for test mode (QR_System), MONGO_URI for prod (QR_System_prod)
    const activeUri = isTestMode && process.env.MONGO_URI_TEST 
      ? process.env.MONGO_URI_TEST 
      : process.env.MONGO_URI;

    if (!activeUri) {
      throw new Error('Database URI is not defined in environment variables');
    }

    // High-performance MongoDB connection options
    const conn = await mongoose.connect(activeUri, {
      maxPoolSize: 50,           // Maintain up to 50 socket connections for high concurrency
      minPoolSize: 10,           // Keep 10 hot connections ready to eliminate initial latency
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000
    });
    
    const dbName = conn.connection.name;

    console.log(`----------------------------------------`);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 Active Database: [${dbName}]`);
    console.log(`🏷️  Mode: [${process.env.NODE_ENV || 'development'}] ${isTestMode ? '(TESTING DATABASE: QR_System)' : '(PRODUCTION DATABASE: QR_System_prod)'}`);
    console.log(`----------------------------------------`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
