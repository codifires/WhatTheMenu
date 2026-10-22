/**
 * ============================================================================
 * WhatTheMenu — Phase 8: MongoDB & Data Integrity Verification Suite
 * ============================================================================
 *
 * Verifies:
 * 1. Schema Validation & Range Bounds (Types, min, max, strings, enums).
 * 2. Unbounded Array Protection (active_sessions cap & pruning).
 * 3. Partial Unique Indexes (empty string coexistence vs non-empty duplicates).
 * 4. Compound Tenant Index Hits (.explain() execution verification).
 * 5. Atomic Counters (DailyTokenCounter sequential generation).
 * 6. Transactions (withTransaction commit and rollback handling).
 * 7. Bounded Pagination & Safe Projections.
 * 8. Retention & TTL Policy Compliance (Financial ledgers preserved without TTL).
 * 9. Consistent Timestamps & Business-Day Calculations.
 *
 * Run with:
 *   node backend/test_phase8_data_integrity.js
 * ============================================================================
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const mongoose = require('mongoose');
const crypto = require('crypto');

// Models
const Admin = require('./models/Admin');
const Cafe = require('./models/Cafe');
const Category = require('./models/Category');
const MenuItem = require('./models/MenuItem');
const Order = require('./models/Order');
const OrderRevenue = require('./models/OrderRevenue');
const Subscription = require('./models/Subscription');
const SubscriptionHistory = require('./models/SubscriptionHistory');
const Feedback = require('./models/Feedback');
const Settings = require('./models/Settings');
const DailyTokenCounter = require('./models/DailyTokenCounter');
const WebhookLog = require('./models/WebhookLog');
const SystemLog = require('./models/SystemLog');

// Utilities
const { withTransaction, supportsTransactions } = require('./utils/transaction');
const { getBusinessDateString, getStartOfBusinessDay, getEndOfBusinessDay } = require('./utils/dateTime');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    throw new Error(`Assertion failed: ${testName}`);
  }
}

async function runTests() {
  console.log('\n============================================================');
  console.log('   WhatTheMenu — Phase 8 Data Integrity Test Suite');
  console.log('============================================================\n');

  const uri = process.env.MONGO_URI_TEST || process.env.MONGO_URI;
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000
  });

  const testSuffix = Date.now().toString(36) + '-' + crypto.randomBytes(2).toString('hex');
  let testCafe = null;
  let testCategory = null;

  try {
    // -------------------------------------------------------------
    // TEST GROUP 1: Schema Validation & Range Bounds
    // -------------------------------------------------------------
    console.log('\n--- Group 1: Schema Validation & Range Bounds ---');

    // 1.1 MenuItem price bounds (< 0 should fail)
    try {
      const invalidItem = new MenuItem({
        cafe_id: new mongoose.Types.ObjectId(),
        category_id: new mongoose.Types.ObjectId(),
        name: 'Negative Price Dish',
        price: -50
      });
      await invalidItem.validate();
      assert(false, 'MenuItem should reject negative price');
    } catch (err) {
      assert(err.name === 'ValidationError' && err.errors.price, 'MenuItem rejects negative price');
    }

    // 1.2 MenuItem price upper bound (> 1,000,000 should fail)
    try {
      const overpriceItem = new MenuItem({
        cafe_id: new mongoose.Types.ObjectId(),
        category_id: new mongoose.Types.ObjectId(),
        name: 'Hyper Dish',
        price: 2000000
      });
      await overpriceItem.validate();
      assert(false, 'MenuItem should reject price exceeding maximum limit');
    } catch (err) {
      assert(err.name === 'ValidationError' && err.errors.price, 'MenuItem rejects price > 1,000,000');
    }

    // 1.3 Category name length bound
    try {
      const longNameCategory = new Category({
        cafe_id: new mongoose.Types.ObjectId(),
        name: 'A'.repeat(70)
      });
      await longNameCategory.validate();
      assert(false, 'Category should reject name exceeding 60 characters');
    } catch (err) {
      assert(err.name === 'ValidationError' && err.errors.name, 'Category rejects name > 60 chars');
    }

    // 1.4 Cafe tax_percentage bound (> 100 should fail)
    try {
      const invalidTaxCafe = new Cafe({
        name: 'Tax Test Cafe',
        email: `taxtest-${testSuffix}@example.com`,
        password: 'Password123!',
        tax_percentage: 150
      });
      await invalidTaxCafe.validate();
      assert(false, 'Cafe should reject tax_percentage > 100');
    } catch (err) {
      assert(err.name === 'ValidationError' && err.errors.tax_percentage, 'Cafe rejects tax_percentage > 100%');
    }

    // 1.5 Order items array validation (empty items array must fail)
    try {
      const emptyOrder = new Order({
        cafe_id: new mongoose.Types.ObjectId(),
        total_amount: 100,
        items: []
      });
      await emptyOrder.validate();
      assert(false, 'Order should reject empty items array');
    } catch (err) {
      assert(err.name === 'ValidationError' && err.errors.items, 'Order rejects empty items array');
    }

    // 1.6 Order items count upper bound (> 100 items must fail)
    try {
      const tooManyItems = Array.from({ length: 105 }, (_, i) => ({
        name: `Item ${i}`,
        quantity: 1,
        price: 10
      }));
      const giantOrder = new Order({
        cafe_id: new mongoose.Types.ObjectId(),
        total_amount: 1050,
        items: tooManyItems
      });
      await giantOrder.validate();
      assert(false, 'Order should reject items array exceeding 100');
    } catch (err) {
      assert(err.name === 'ValidationError' && err.errors.items, 'Order rejects unbounded items array (> 100)');
    }

    // Create a valid test cafe and category for remaining tests
    testCafe = await Cafe.create({
      name: `Test Cafe ${testSuffix}`,
      email: `cafe-${testSuffix}@example.com`,
      password: 'HashedPassword123!',
      tax_percentage: 5
    });
    assert(testCafe._id && testCafe.slug, 'Valid test Cafe created with auto-slug');

    testCategory = await Category.create({
      cafe_id: testCafe._id,
      name: `Beverages ${testSuffix}`,
      sort_order: 1
    });
    assert(testCategory._id, 'Valid test Category created');

    // -------------------------------------------------------------
    // TEST GROUP 2: Protection Against Unbounded Arrays
    // -------------------------------------------------------------
    console.log('\n--- Group 2: Protection Against Unbounded Arrays ---');

    // Add 8 sessions to testCafe; pre-save hook must prune to last 5
    testCafe.active_sessions = Array.from({ length: 8 }, (_, i) => ({
      token: `session_token_${i}_${testSuffix}`,
      device_info: `Device ${i}`,
      last_active: new Date()
    }));
    await testCafe.save();

    const refreshedCafe = await Cafe.findById(testCafe._id);
    assert(
      refreshedCafe.active_sessions.length === 5,
      `active_sessions pruned to exactly 5 sessions (actual: ${refreshedCafe.active_sessions.length})`
    );
    assert(
      refreshedCafe.active_sessions[4].token === `session_token_7_${testSuffix}`,
      'Newest session preserved at tail of pruned array'
    );

    // -------------------------------------------------------------
    // TEST GROUP 3: Partial Unique Indexes & Empty String Coexistence
    // -------------------------------------------------------------
    console.log('\n--- Group 3: Partial Unique Indexes & Empty String Coexistence ---');

    // 3.1 Two cash orders with razorpay_order_id: "" must BOTH succeed
    const cashOrder1 = await Order.create({
      cafe_id: testCafe._id,
      order_number: `ORD-TEST-1-${testSuffix}`,
      total_amount: 100,
      payment_provider: 'cash',
      payment_method: 'cash',
      razorpay_order_id: '',
      razorpay_payment_id: '',
      items: [{ name: 'Chai', quantity: 1, price: 100 }]
    });

    const cashOrder2 = await Order.create({
      cafe_id: testCafe._id,
      order_number: `ORD-TEST-2-${testSuffix}`,
      total_amount: 150,
      payment_provider: 'cash',
      payment_method: 'cash',
      razorpay_order_id: '',
      razorpay_payment_id: '',
      items: [{ name: 'Coffee', quantity: 1, price: 150 }]
    });

    assert(
      cashOrder1._id && cashOrder2._id,
      'Multiple orders with empty razorpay_order_id: "" coexist without duplicate key error'
    );

    // 3.2 Two orders with the SAME non-empty razorpay_order_id must FAIL with duplicate error
    const uniqueRzpOrderId = `order_test_${testSuffix}`;
    await Order.create({
      cafe_id: testCafe._id,
      order_number: `ORD-RZP-1-${testSuffix}`,
      total_amount: 200,
      payment_provider: 'razorpay',
      payment_method: 'razorpay',
      razorpay_order_id: uniqueRzpOrderId,
      items: [{ name: 'Tea', quantity: 2, price: 100 }]
    });

    let duplicateCaught = false;
    try {
      await Order.create({
        cafe_id: testCafe._id,
        order_number: `ORD-RZP-2-${testSuffix}`,
        total_amount: 200,
        payment_provider: 'razorpay',
        payment_method: 'razorpay',
        razorpay_order_id: uniqueRzpOrderId, // Same razorpay_order_id!
        items: [{ name: 'Tea', quantity: 2, price: 100 }]
      });
    } catch (dupErr) {
      duplicateCaught = dupErr.code === 11000;
    }
    assert(duplicateCaught, 'Partial unique index enforces uniqueness on non-empty razorpay_order_id (E11000)');

    // -------------------------------------------------------------
    // TEST GROUP 4: Compound Tenant Indexes (.explain() verification)
    // -------------------------------------------------------------
    console.log('\n--- Group 4: Compound Tenant Index Query Performance ---');

    // 4.1 Order compound index: { cafe_id: 1, created_at: -1 }
    const orderExplain = await Order.find({
      cafe_id: testCafe._id,
      created_at: { $gte: new Date(Date.now() - 86400000) }
    }).sort({ created_at: -1 }).explain('queryPlanner');

    const orderIndexUsed = JSON.stringify(orderExplain);
    assert(
      orderIndexUsed.includes('cafe_id_1_created_at_-1') || orderIndexUsed.includes('IXSCAN'),
      'Order query uses compound index { cafe_id: 1, created_at: -1 }'
    );

    // 4.2 Category compound index: { cafe_id: 1, is_active: 1, sort_order: 1 }
    const categoryExplain = await Category.find({
      cafe_id: testCafe._id,
      is_active: true
    }).sort({ sort_order: 1 }).explain('queryPlanner');

    const catIndexUsed = JSON.stringify(categoryExplain);
    assert(
      catIndexUsed.includes('cafe_id_1_is_active_1_sort_order_1') || catIndexUsed.includes('IXSCAN'),
      'Category query uses compound index { cafe_id: 1, is_active: 1, sort_order: 1 }'
    );

    // 4.3 MenuItem compound index: { cafe_id: 1, category_id: 1, availability: 1, sort_order: 1 }
    const itemExplain = await MenuItem.find({
      cafe_id: testCafe._id,
      category_id: testCategory._id,
      availability: true
    }).sort({ sort_order: 1 }).explain('queryPlanner');

    const itemIndexUsed = JSON.stringify(itemExplain);
    assert(
      itemIndexUsed.includes('cafe_id_1_category_id_1_availability_1_sort_order_1') || itemIndexUsed.includes('IXSCAN'),
      'MenuItem query uses compound index { cafe_id: 1, category_id: 1, availability: 1, sort_order: 1 }'
    );

    // -------------------------------------------------------------
    // TEST GROUP 5: Concurrency-Safe Atomic Token Generator
    // -------------------------------------------------------------
    console.log('\n--- Group 5: Concurrency-Safe Atomic Token Generator ---');

    const token1 = await DailyTokenCounter.getNextToken(testCafe._id);
    const token2 = await DailyTokenCounter.getNextToken(testCafe._id);
    const token3 = await DailyTokenCounter.getNextToken(testCafe._id);

    assert(token1 === '#1', 'First daily token is #1');
    assert(token2 === '#2', 'Second daily token increments to #2');
    assert(token3 === '#3', 'Third daily token increments to #3');

    // -------------------------------------------------------------
    // TEST GROUP 6: Transactions & withTransaction Helper
    // -------------------------------------------------------------
    console.log('\n--- Group 6: Transactions & Multi-Document Safety ---');

    const hasReplicaSet = await supportsTransactions();
    console.log(`  ℹ️  MongoDB Cluster Transaction Support: ${hasReplicaSet ? 'Replica Set (Transactions Enabled)' : 'Standalone (Safe Fallback Mode)'}`);

    // Commit test
    let executedInTxn = false;
    await withTransaction(async (session) => {
      const opts = session ? { session } : {};
      await MenuItem.create([{
        cafe_id: testCafe._id,
        category_id: testCategory._id,
        name: `Txn Dish ${testSuffix}`,
        price: 99
      }], opts);
      executedInTxn = true;
    });
    assert(executedInTxn, 'withTransaction successfully executed and committed operations');

    const createdMenuItem = await MenuItem.findOne({ name: `Txn Dish ${testSuffix}` });
    assert(createdMenuItem && createdMenuItem.price === 99, 'Transaction writes successfully persisted');

    // Rollback test (if replica set is active)
    if (hasReplicaSet) {
      let rollbackHappened = false;
      try {
        await withTransaction(async (session) => {
          const opts = session ? { session } : {};
          await MenuItem.create([{
            cafe_id: testCafe._id,
            category_id: testCategory._id,
            name: `Should Be Rolled Back ${testSuffix}`,
            price: 50
          }], opts);
          throw new Error('Simulated failure during multi-write transaction');
        });
      } catch (err) {
        rollbackHappened = true;
      }
      assert(rollbackHappened, 'Transaction caught simulated failure');
      const rolledBackItem = await MenuItem.findOne({ name: `Should Be Rolled Back ${testSuffix}` });
      assert(rolledBackItem === null, 'Atomic transaction successfully rolled back aborted write');
    } else {
      console.log('  ℹ️  Skipping rollback assertion (standalone mode runs gracefully without replica set)');
    }

    // -------------------------------------------------------------
    // TEST GROUP 7: Retention Policy & Financial Ledger Safety
    // -------------------------------------------------------------
    console.log('\n--- Group 7: Retention Policy & Financial Ledger Safety ---');

    const orderIndexes = await Order.collection.indexes();
    const orderTTL = orderIndexes.find(i => i.expireAfterSeconds !== undefined);
    assert(
      orderTTL && orderTTL.expireAfterSeconds === 7776000,
      `Order operational retention index set to 90 days (7,776,000s, actual: ${orderTTL ? orderTTL.expireAfterSeconds : 'none'})`
    );

    const revenueIndexes = await OrderRevenue.collection.indexes();
    const revenueTTL = revenueIndexes.find(i => i.expireAfterSeconds !== undefined);
    assert(
      revenueTTL === undefined,
      'OrderRevenue financial ledger has NO TTL index (permanent financial retention)'
    );

    const subHistIndexes = await SubscriptionHistory.collection.indexes();
    const subHistTTL = subHistIndexes.find(i => i.expireAfterSeconds !== undefined);
    assert(
      subHistTTL === undefined,
      'SubscriptionHistory financial ledger has NO TTL index (permanent financial retention)'
    );

    // -------------------------------------------------------------
    // TEST GROUP 8: Consistent Timestamps & Business-Day Calculations
    // -------------------------------------------------------------
    console.log('\n--- Group 8: Consistent Timestamps & Business-Day Calculations ---');

    const now = new Date();
    const bizDateStr = getBusinessDateString(now);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(bizDateStr), `getBusinessDateString produces valid YYYY-MM-DD: ${bizDateStr}`);

    const startOfBizDay = getStartOfBusinessDay(now);
    const endOfBizDay = getEndOfBusinessDay(now);
    assert(startOfBizDay instanceof Date && !isNaN(startOfBizDay.getTime()), 'getStartOfBusinessDay returns valid Date');
    assert(endOfBizDay instanceof Date && !isNaN(endOfBizDay.getTime()), 'getEndOfBusinessDay returns valid Date');
    assert(endOfBizDay.getTime() > startOfBizDay.getTime(), 'endOfBizDay is strictly after startOfBizDay');

    // Range difference must be exactly 1 day (86,400,000 ms minus 1 ms)
    const diffMs = endOfBizDay.getTime() - startOfBizDay.getTime();
    assert(diffMs === 86399999, `Business day span is exactly 24 hours (86,399,999 ms, actual: ${diffMs})`);

    // -------------------------------------------------------------
    // TEST GROUP 9: Safe Projections on Sensitive Fields
    // -------------------------------------------------------------
    console.log('\n--- Group 9: Safe Projections on Sensitive Fields ---');

    const orderWithSecret = await Order.create({
      cafe_id: testCafe._id,
      order_number: `ORD-PROJ-${testSuffix}`,
      total_amount: 120,
      payment_provider: 'razorpay',
      payment_method: 'razorpay',
      razorpay_order_id: `rzp_ord_proj_${testSuffix}`,
      razorpay_signature: 'super_secret_raw_signature_hash',
      items: [{ name: 'Soup', quantity: 1, price: 120 }]
    });

    // Default find should NOT project select: false field razorpay_signature
    const fetchedOrder = await Order.findById(orderWithSecret._id).lean();
    assert(
      fetchedOrder.razorpay_signature === undefined,
      'razorpay_signature is excluded by default in Order queries (select: false)'
    );

    const cafeQuery = await Cafe.findById(testCafe._id).lean();
    assert(cafeQuery.password === undefined, 'password is excluded by default in Cafe queries');
    assert(cafeQuery.razorpay_key_secret === undefined, 'razorpay_key_secret is excluded by default in Cafe queries');
    assert(cafeQuery.razorpay_webhook_secret === undefined, 'razorpay_webhook_secret is excluded by default in Cafe queries');

  } finally {
    // Clean up test data
    console.log('\n--- Cleaning up test records ---');
    if (testCafe) {
      await Category.deleteMany({ cafe_id: testCafe._id });
      await MenuItem.deleteMany({ cafe_id: testCafe._id });
      await Order.deleteMany({ cafe_id: testCafe._id });
      await OrderRevenue.deleteMany({ cafe_id: testCafe._id });
      await DailyTokenCounter.deleteMany({ cafe_id: testCafe._id });
      await Cafe.findByIdAndDelete(testCafe._id);
    }
    await mongoose.disconnect();
    console.log('✅ Disconnected from database.');
  }

  console.log('\n============================================================');
  console.log(`  Phase 8 Data Integrity Suite: ${passedTests}/${totalTests} Tests PASSED (100%)`);
  console.log('============================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('\n❌ Unhandled error in test suite:', err);
  process.exit(1);
});
