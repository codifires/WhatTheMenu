/**
 * Migration Script: migrate_payment_providers.js
 *
 * PHASE 7: Razorpay-only standardization.
 * Backfills payment_provider across Order, OrderRevenue, and SubscriptionHistory collections
 * without deleting historical records or rewriting financial amounts.
 *
 * Usage: node scripts/migrate_payment_providers.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Order = require('../models/Order');
const OrderRevenue = require('../models/OrderRevenue');
const SubscriptionHistory = require('../models/SubscriptionHistory');

async function migrate() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGO_URI_TEST || process.env.MONGODB_URI;
    console.log(`🔌 Connecting to MongoDB...`);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // 1. Migrate Orders
    console.log('\n--- 1. Migrating Orders ---');
    
    // Razorpay orders: have razorpay_order_id, razorpay_payment_id, or payment_method in ['online', 'razorpay']
    const razorpayOrdersRes = await Order.updateMany(
      {
        $or: [
          { razorpay_order_id: { $exists: true, $ne: '' } },
          { razorpay_payment_id: { $exists: true, $ne: '' } },
          { payment_method: { $in: ['online', 'razorpay'] } }
        ],
        payment_provider: { $ne: 'razorpay' }
      },
      {
        $set: { payment_provider: 'razorpay' }
      }
    );
    console.log(`Updated ${razorpayOrdersRes.modifiedCount} orders to payment_provider: 'razorpay'`);

    // Cash orders: payment_method is 'cash' and no razorpay ID
    const cashOrdersRes = await Order.updateMany(
      {
        payment_method: 'cash',
        payment_provider: { $ne: 'cash' },
        $or: [
          { razorpay_order_id: { $in: ['', null] } },
          { razorpay_order_id: { $exists: false } }
        ]
      },
      {
        $set: { payment_provider: 'cash' }
      }
    );
    console.log(`Updated ${cashOrdersRes.modifiedCount} orders to payment_provider: 'cash'`);

    // Any remaining orders without payment_provider default to cash or razorpay
    const fallbackOrdersRes = await Order.updateMany(
      { payment_provider: { $in: [null, ''] } },
      { $set: { payment_provider: 'cash' } }
    );
    console.log(`Updated ${fallbackOrdersRes.modifiedCount} remaining orders to default payment_provider: 'cash'`);

    // 2. Migrate OrderRevenue
    console.log('\n--- 2. Migrating OrderRevenue ---');
    const razorpayRevRes = await OrderRevenue.updateMany(
      {
        payment_method: { $in: ['online', 'razorpay', 'upi', 'card', 'netbanking', 'wallet'] },
        payment_provider: { $ne: 'razorpay' }
      },
      {
        $set: { payment_provider: 'razorpay' }
      }
    );
    console.log(`Updated ${razorpayRevRes.modifiedCount} revenue records to payment_provider: 'razorpay'`);

    const cashRevRes = await OrderRevenue.updateMany(
      {
        payment_method: 'cash',
        payment_provider: { $ne: 'cash' }
      },
      {
        $set: { payment_provider: 'cash' }
      }
    );
    console.log(`Updated ${cashRevRes.modifiedCount} revenue records to payment_provider: 'cash'`);

    // 3. Migrate SubscriptionHistory
    console.log('\n--- 3. Migrating SubscriptionHistory ---');
    const subHistoryRes = await SubscriptionHistory.updateMany(
      { payment_provider: { $in: [null, ''] } },
      { $set: { payment_provider: 'razorpay' } }
    );
    console.log(`Updated ${subHistoryRes.modifiedCount} subscription history records to payment_provider: 'razorpay'`);

    console.log('\n✅ Migration completed successfully!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
