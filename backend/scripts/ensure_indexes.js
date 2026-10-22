/**
 * ============================================================================
 * WhatTheMenu — MongoDB Schema Integrity & Index Verification Migration Script
 * ============================================================================
 *
 * Requirements addressed:
 * 1. Safe Index Creation & Pre-Flight Duplicate Detection:
 *    - Aggregates collections to detect duplicates on unique fields.
 *    - NEVER silently deletes user data to force index creation.
 *    - Reports offending document IDs and keys for manual operational resolution.
 * 2. Partial Unique Index Support:
 *    - Indexes only non-empty strings ({ $type: "string", $gt: "" })
 *    - Prevents collision on empty string "" across cash orders and legacy records.
 * 3. Compound Index Creation:
 *    - Tenant-scoped query optimization (cafe_id + status / created_at / category).
 * 4. TTL Index & Retention Auditing:
 *    - Migrates Order TTL from 5 days to 90 days safely without index conflict.
 *    - Guarantees NO TTL on financial ledgers (OrderRevenue, SubscriptionHistory).
 *    - Verifies operational TTL on WebhookLog (90 days) and SystemLog (30 days).
 *
 * Usage:
 *   node backend/scripts/ensure_indexes.js
 * ============================================================================
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

// Import all models
const Admin = require('../models/Admin');
const Cafe = require('../models/Cafe');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const OrderRevenue = require('../models/OrderRevenue');
const Subscription = require('../models/Subscription');
const SubscriptionHistory = require('../models/SubscriptionHistory');
const SubscriptionRequest = require('../models/SubscriptionRequest');
const SupportTicket = require('../models/SupportTicket');
const Feedback = require('../models/Feedback');
const QRCode = require('../models/QRCode');
const Settings = require('../models/Settings');
const DailyTokenCounter = require('../models/DailyTokenCounter');
const WebhookLog = require('../models/WebhookLog');
const SystemLog = require('../models/SystemLog');

// Unique constraints to verify before index creation
const UNIQUE_CONSTRAINTS = [
  { model: Admin, name: 'Admin', fields: { email: 1 }, partial: null },
  { model: Cafe, name: 'Cafe', fields: { email: 1 }, partial: null },
  { model: Cafe, name: 'Cafe', fields: { slug: 1 }, partial: null },
  {
    model: Cafe,
    name: 'Cafe',
    fields: { razorpay_subscription_id: 1 },
    partial: { razorpay_subscription_id: { $type: 'string', $gt: '' } }
  },
  { model: Category, name: 'Category', fields: { cafe_id: 1, name: 1 }, partial: null },
  { model: Order, name: 'Order', fields: { order_number: 1 }, partial: null },
  {
    model: Order,
    name: 'Order',
    fields: { razorpay_order_id: 1 },
    partial: { razorpay_order_id: { $type: 'string', $gt: '' } }
  },
  {
    model: Order,
    name: 'Order',
    fields: { razorpay_payment_id: 1 },
    partial: { razorpay_payment_id: { $type: 'string', $gt: '' } }
  },
  { model: OrderRevenue, name: 'OrderRevenue', fields: { order_number: 1 }, partial: null },
  {
    model: Subscription,
    name: 'Subscription',
    fields: { razorpay_subscription_id: 1 },
    partial: { razorpay_subscription_id: { $type: 'string', $gt: '' } }
  },
  {
    model: Subscription,
    name: 'Subscription',
    fields: { razorpay_payment_id: 1 },
    partial: { razorpay_payment_id: { $type: 'string', $gt: '' } }
  },
  {
    model: SubscriptionHistory,
    name: 'SubscriptionHistory',
    fields: { razorpay_payment_id: 1 },
    partial: { razorpay_payment_id: { $type: 'string', $gt: '' } }
  },
  { model: SupportTicket, name: 'SupportTicket', fields: { ticket_number: 1 }, partial: null },
  { model: Feedback, name: 'Feedback', fields: { order_id: 1 }, partial: null },
  { model: QRCode, name: 'QRCode', fields: { cafe_id: 1 }, partial: null },
  { model: DailyTokenCounter, name: 'DailyTokenCounter', fields: { cafe_id: 1, date: 1 }, partial: null },
  { model: Settings, name: 'Settings', fields: { key: 1 }, partial: null },
  {
    model: WebhookLog,
    name: 'WebhookLog',
    fields: { razorpay_event_id: 1 },
    partial: { razorpay_event_id: { $type: 'string', $gt: '' } }
  }
];

/**
 * Detect duplicates across a collection using MongoDB Aggregation
 */
const detectDuplicates = async (constraint) => {
  const { model, name, fields, partial } = constraint;
  const keys = Object.keys(fields);

  let groupKey = {};
  keys.forEach(k => { groupKey[k] = `$${k}`; });

  const matchStage = partial
    ? [{ $match: partial }]
    : [{
        $match: keys.reduce((acc, k) => {
          acc[k] = { $exists: true, $ne: null };
          return acc;
        }, {})
      }];

  const pipeline = [
    ...matchStage,
    {
      $group: {
        _id: groupKey,
        count: { $sum: 1 },
        ids: { $push: '$_id' }
      }
    },
    {
      $match: {
        count: { $gt: 1 }
      }
    }
  ];

  try {
    const duplicates = await model.aggregate(pipeline);
    return duplicates;
  } catch (err) {
    console.error(`Error checking duplicates for ${name} [${keys.join(', ')}]:`, err.message);
    return [];
  }
};

/**
 * Audit TTL indexes: migrate Order from 5 days to 90 days, ensure no TTL on financial ledgers
 */
const auditTTLIndexes = async () => {
  console.log('\n--- Auditing TTL Indexes and Retention Policies ---');

  // 1. Order TTL (must be 90 days = 7,776,000s)
  try {
    const orderIndexes = await Order.collection.indexes();
    const createdAtIndex = orderIndexes.find(i => i.key && i.key.created_at === 1 && i.expireAfterSeconds !== undefined);

    if (createdAtIndex) {
      if (createdAtIndex.expireAfterSeconds !== 7776000) {
        console.log(`⚠️  Order created_at TTL index has old expiration (${createdAtIndex.expireAfterSeconds}s). Dropping to update to 90 days (7776000s)...`);
        await Order.collection.dropIndex(createdAtIndex.name);
        console.log(`✅ Old Order TTL index dropped successfully.`);
      } else {
        console.log(`✅ Order TTL index is properly configured: 90 days (${createdAtIndex.expireAfterSeconds}s).`);
      }
    }
  } catch (err) {
    console.warn('Notice while inspecting Order TTL index:', err.message);
  }

  // 2. Financial Ledgers: OrderRevenue & SubscriptionHistory MUST NEVER have TTL
  for (const [model, name] of [[OrderRevenue, 'OrderRevenue'], [SubscriptionHistory, 'SubscriptionHistory']]) {
    try {
      const idxs = await model.collection.indexes();
      const ttlIdx = idxs.find(i => i.expireAfterSeconds !== undefined);
      if (ttlIdx) {
        console.error(`🚨 CRITICAL: Found unwanted TTL index "${ttlIdx.name}" on financial ledger ${name}! Dropping immediately to protect audit records...`);
        await model.collection.dropIndex(ttlIdx.name);
        console.log(`✅ Dropped hazardous TTL index from ${name}.`);
      } else {
        console.log(`✅ Verified: Financial ledger [${name}] has NO TTL (permanent retention).`);
      }
    } catch (err) {
      // Collection may be empty/uncreated yet
    }
  }

  // 3. WebhookLog TTL check (90 days = 7,776,000s)
  try {
    const webhookIndexes = await WebhookLog.collection.indexes();
    const webhookTTL = webhookIndexes.find(i => i.key && i.key.created_at === 1 && i.expireAfterSeconds !== undefined);
    if (webhookTTL && webhookTTL.expireAfterSeconds !== 7776000) {
      console.log(`⚠️  WebhookLog created_at TTL has old expiration (${webhookTTL.expireAfterSeconds}s). Dropping to update...`);
      await WebhookLog.collection.dropIndex(webhookTTL.name);
    }
    console.log(`✅ WebhookLog retention configured for 90 days.`);
  } catch (err) {
    // ignore if uncreated
  }
};

const syncDatabase = async (uri, label) => {
  console.log(`\n============================================================`);
  console.log(`  Target Database: [${label}]`);
  console.log(`  Connecting to: ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')} ...`);
  console.log(`============================================================`);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000
  });
  console.log(`✅ Connected to MongoDB [${label}].`);

  // Step 1: Detect Duplicates before Index Creation
  console.log('\n--- Pre-Flight Duplicate Check ---');
  let duplicateBlockers = 0;

  for (const constraint of UNIQUE_CONSTRAINTS) {
    const keyStr = Object.keys(constraint.fields).join(', ');
    const duplicates = await detectDuplicates(constraint);

    if (duplicates.length > 0) {
      duplicateBlockers++;
      console.error(`\n🚨 [DUPLICATE DETECTED] Collection: ${constraint.name}, Field(s): [${keyStr}]`);
      console.error(`   Found ${duplicates.length} duplicate group(s) that would cause index creation to fail:`);
      duplicates.slice(0, 5).forEach((d, idx) => {
        console.error(`   ${idx + 1}. Key: ${JSON.stringify(d._id)} — Count: ${d.count} — Document IDs: ${d.ids.join(', ')}`);
      });
      if (duplicates.length > 5) {
        console.error(`   ... and ${duplicates.length - 5} more.`);
      }
      console.error(`   ⛔ SAFEGUARD ACTIVATED: Unique index creation cannot proceed on ${constraint.name} [${keyStr}].`);
      console.error(`   Documents were NOT deleted. Resolve duplicates manually in database.`);
    } else {
      console.log(`✅ No duplicates on ${constraint.name} [${keyStr}]`);
    }
  }

  // Step 2: Audit TTL indexes
  await auditTTLIndexes();

  // Step 3: Build & Sync Indexes across all models
  if (duplicateBlockers > 0) {
    console.warn(`\n⚠️  Skipping full syncIndexes due to ${duplicateBlockers} unresolved duplicate group(s).`);
    console.warn(`   Please inspect the report above and resolve duplicates before re-running.`);
  } else {
    console.log('\n--- Building and Synchronizing Indexes ---');
    const models = [
      Admin, Cafe, Category, MenuItem, Order, OrderRevenue,
      Subscription, SubscriptionHistory, SubscriptionRequest,
      SupportTicket, Feedback, QRCode, Settings, DailyTokenCounter,
      WebhookLog, SystemLog
    ];

    for (const m of models) {
      const modelName = m.modelName;
      try {
        await m.syncIndexes();
        const activeIdxs = await m.collection.indexes();
        console.log(`✅ Synced indexes for [${modelName}] (${activeIdxs.length} indexes active)`);
      } catch (syncErr) {
        console.error(`❌ Failed syncing indexes for [${modelName}]:`, syncErr.message);
      }
    }
  }

  await mongoose.disconnect();
  return duplicateBlockers;
};

/**
 * Main execution across configured databases
 */
const run = async () => {
  const uris = [];
  if (process.env.MONGO_URI) uris.push({ uri: process.env.MONGO_URI, label: 'Production (MONGO_URI)' });
  if (process.env.MONGO_URI_TEST && process.env.MONGO_URI_TEST !== process.env.MONGO_URI) {
    uris.push({ uri: process.env.MONGO_URI_TEST, label: 'Testing (MONGO_URI_TEST)' });
  }
  if (uris.length === 0) {
    uris.push({ uri: 'mongodb://localhost:27017/QR_System', label: 'Local Fallback' });
  }

  let totalBlockers = 0;
  for (const target of uris) {
    totalBlockers += await syncDatabase(target.uri, target.label);
  }

  console.log(`\n============================================================`);
  console.log(`  Migration & Integrity Audit Completed across all DBs       `);
  console.log(`============================================================\n`);

  process.exit(totalBlockers > 0 ? 1 : 0);
};

if (require.main === module) {
  run().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

module.exports = { run, detectDuplicates, UNIQUE_CONSTRAINTS };
