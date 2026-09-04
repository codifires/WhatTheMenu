const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { Server } = require('socket.io');

dotenv.config();

const Cafe = require('./models/Cafe');
const SubscriptionRequest = require('./models/SubscriptionRequest');
const Subscription = require('./models/Subscription');
const SubscriptionHistory = require('./models/SubscriptionHistory');
const Settings = require('./models/Settings');

const TEST_PORT = 5099;
const API_BASE = `http://localhost:${TEST_PORT}/api`;

async function runTest() {
  let serverInstance;
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    // Setup self-contained test Express app with Socket.io
    const app = express();
    app.use(express.json());

    const server = http.createServer(app);
    const io = new Server(server);
    app.set('io', io);

    // Mount owner routes
    app.use('/api/owner', require('./routes/ownerRoutes'));

    await new Promise((resolve) => {
      serverInstance = server.listen(TEST_PORT, () => {
        console.log(`🚀 Test server running on port ${TEST_PORT}`);
        resolve();
      });
    });

    // 1. Get or create test cafe
    let cafe = await Cafe.findOne();
    if (!cafe) {
      cafe = await Cafe.create({
        name: 'Automated Test Café',
        email: `testcafe_${Date.now()}@example.com`,
        password: 'password123',
        subscription_status: 'starter',
        subscription: { plan_name: 'starter', start_date: new Date(), end_date: new Date() }
      });
    }
    console.log(`☕ Test Cafe: "${cafe.name}" (ID: ${cafe._id})`);

    // Generate JWT token for this cafe owner
    const token = jwt.sign(
      { id: cafe._id, role: 'owner' },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '1h' }
    );

    const authHeaders = {
      headers: { Authorization: `Bearer ${token}` }
    };

    // 2. Test Session Initiation: POST /api/owner/subscription/initiate-session
    console.log('\n1️⃣ [TESTING POST /api/owner/subscription/initiate-session]...');
    const initRes = await axios.post(
      `${API_BASE}/owner/subscription/initiate-session`,
      { plan_name: 'pro_plus' },
      authHeaders
    );

    console.log('   Response Status:', initRes.status);
    console.log('   Response Data:', initRes.data);
    const sessionData = initRes.data.data;
    if (!sessionData.session_id || !sessionData.upi_url) {
      throw new Error('Session ID or UPI URL missing in initiation response');
    }
    if (!sessionData.upi_url.includes(encodeURIComponent(sessionData.session_id))) {
      throw new Error('UPI URL does not contain session_id in tr param');
    }
    console.log('   ✅ Session successfully initiated with dynamic NPCI intent URL!');

    // 3. Test Polling Status (Initial: pending)
    console.log('\n2️⃣ [TESTING GET /api/owner/subscription/check-status/:sessionId]...');
    const statusBefore = await axios.get(`${API_BASE}/owner/subscription/check-status/${sessionData.session_id}`);
    console.log('   Status Before Settlement:', statusBefore.data.data.status);
    if (statusBefore.data.data.status !== 'pending') {
      throw new Error('Initial status should be pending');
    }
    console.log('   ✅ Initial session status is pending as expected!');

    // 4. Test Webhook Settlement: POST /api/owner/subscription/webhook
    console.log('\n3️⃣ [TESTING POST /api/owner/subscription/webhook (Instant Settlement)]...');
    const webhookRes = await axios.post(`${API_BASE}/owner/subscription/webhook`, {
      session_id: sessionData.session_id,
      transaction_id: `NPCI_UTR_${Date.now()}`,
      status: 'SUCCESS',
      amount: sessionData.amount
    });

    console.log('   Webhook Response:', webhookRes.data);
    if (!webhookRes.data.success) {
      throw new Error('Webhook processing returned unsuccessful response');
    }
    console.log('   ✅ Webhook processed and verified successfully!');

    // 5. Test Polling Status After Settlement (Expected: approved)
    console.log('\n4️⃣ [TESTING STATUS AFTER SETTLEMENT]...');
    const statusAfter = await axios.get(`${API_BASE}/owner/subscription/check-status/${sessionData.session_id}`);
    console.log('   Status After Settlement:', statusAfter.data.data.status);
    if (statusAfter.data.data.status !== 'approved') {
      throw new Error('Status after webhook settlement must be approved');
    }
    console.log('   ✅ Session status is now approved!');

    // 6. Verify Database State
    console.log('\n5️⃣ [VERIFYING DATABASE CONSISTENCY & HISTORY LEDGER]...');
    const updatedCafe = await Cafe.findById(cafe._id);
    console.log(`   Cafe subscription_status: ${updatedCafe.subscription_status} (Expected: active)`);
    console.log(`   Cafe plan_name: ${updatedCafe.subscription?.plan_name} (Expected: pro)`);
    console.log(`   Cafe is_active: ${updatedCafe.is_active} (Expected: true)`);
    if (updatedCafe.subscription_status !== 'active') throw new Error('Cafe subscription_status is not active');
    if (updatedCafe.subscription?.plan_name !== 'pro_plus') throw new Error('Cafe plan_name is not pro');

    const subDoc = await Subscription.findOne({ cafe_id: cafe._id });
    console.log(`   Subscription collection sync: plan=${subDoc?.plan_name}, status=${subDoc?.status}`);
    if (!subDoc || subDoc.plan_name !== 'pro_plus' || subDoc.status !== 'active') {
      throw new Error('Subscription collection not synced correctly');
    }

    const historyDoc = await SubscriptionHistory.findOne({ cafe_id: cafe._id }).sort({ created_at: -1 });
    console.log(`   SubscriptionHistory ledger latest record: plan=${historyDoc?.plan_name}, price=₹${historyDoc?.price}`);
    if (!historyDoc || historyDoc.plan_name !== 'pro_plus') {
      throw new Error('SubscriptionHistory record was not created');
    }
    console.log('   ✅ Database, Collections & History Ledger completely verified!');

    // 7. Test Session Cancellation (Owner Aborts)
    console.log('\n6️⃣ [TESTING POST /api/owner/subscription/cancel-session/:sessionId]...');
    const initRes2 = await axios.post(
      `${API_BASE}/owner/subscription/initiate-session`,
      { plan_name: 'pro' },
      authHeaders
    );
    const session2Id = initRes2.data.data.session_id;
    const cancelRes = await axios.post(`${API_BASE}/owner/subscription/cancel-session/${session2Id}`);
    console.log('   Cancel Response:', cancelRes.data);
    const cancelledReq = await SubscriptionRequest.findOne({ session_id: session2Id });
    console.log('   Cancelled Request Status:', cancelledReq?.status);
    if (cancelledReq?.status !== 'cancelled') {
      throw new Error('Cancelled session status should be cancelled');
    }
    console.log('   ✅ Session cancellation verified!');

    console.log('\n========================================================================');
    console.log('🎉 ALL TESTS PASSED: OWNER-TO-ADMIN AUTOMATED UPI SYSTEM VERIFIED 100%!');
    console.log('========================================================================\n');

    if (serverInstance) serverInstance.close();
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed with error:', error.message || error);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
    if (serverInstance) serverInstance.close();
    await mongoose.disconnect();
    process.exit(1);
  }
}

runTest();
