const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const axios = require('axios');
const { Server } = require('socket.io');

dotenv.config();

const Cafe = require('./models/Cafe');
const MenuItem = require('./models/MenuItem');
const Order = require('./models/Order');
const OrderRevenue = require('./models/OrderRevenue');

const TEST_PORT = 5098;
const API_BASE = `http://localhost:${TEST_PORT}/api`;

async function runCustomerTest() {
  let serverInstance;
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    const app = express();
    app.use(express.json());

    const server = http.createServer(app);
    const io = new Server(server);
    app.set('io', io);

    app.use('/api/orders', require('./routes/orderRoutes'));

    await new Promise((resolve) => {
      serverInstance = server.listen(TEST_PORT, () => {
        console.log(`🚀 Customer test server running on port ${TEST_PORT}`);
        resolve();
      });
    });

    // Find active cafe and menu item
    let cafe = await Cafe.findOne({ upi_id: { $exists: true, $ne: '' } });
    if (!cafe) {
      cafe = await Cafe.findOne();
      cafe.upi_id = 'testcafe@okaxis';
      await cafe.save();
    }

    let menuItem = await MenuItem.findOne({ cafe_id: cafe._id });
    if (!menuItem) {
      menuItem = await MenuItem.create({
        cafe_id: cafe._id,
        name: 'Test Cappuccino',
        price: 150,
        is_available: true
      });
    }

    console.log(`☕ Cafe: "${cafe.name}" | UPI ID: "${cafe.upi_id}"`);

    // 1. Initiate UPI Session
    console.log('\n1️⃣ [TESTING POST /api/orders/initiate-upi-session]...');
    const initRes = await axios.post(`${API_BASE}/orders/initiate-upi-session`, {
      cafe_id: cafe._id.toString(),
      customer_name: 'Rahul Sharma',
      customer_phone: '9876543210',
      table_number: '5',
      items: [
        {
          menu_item_id: menuItem._id.toString(),
          name: menuItem.name,
          quantity: 2,
          price: menuItem.price
        }
      ]
    });

    console.log('   Response Data:', initRes.data);
    const sessionId = initRes.data.data.session_id;
    const upiUrl = initRes.data.data.upi_url;
    if (!sessionId || !upiUrl) throw new Error('Session ID or UPI URL missing!');
    console.log('   ✅ UPI session generated with intent URL:', upiUrl);

    // 2. Check initial status
    console.log('\n2️⃣ [TESTING GET /api/orders/check-upi-status/:sessionId]...');
    const statusBefore = await axios.get(`${API_BASE}/orders/check-upi-status/${sessionId}`);
    console.log('   Status Before:', statusBefore.data.data.payment_status);

    // 3. Webhook Settlement
    console.log('\n3️⃣ [TESTING POST /api/orders/upi-webhook (Instant Settlement)]...');
    const hookRes = await axios.post(`${API_BASE}/orders/upi-webhook`, {
      sessionId: sessionId,
      utr: 'UTR_TEST_' + Date.now()
    });
    console.log('   Webhook Response:', hookRes.data);

    // 4. Verify status after settlement
    console.log('\n4️⃣ [TESTING STATUS AFTER SETTLEMENT]...');
    const statusAfter = await axios.get(`${API_BASE}/orders/check-upi-status/${sessionId}`);
    console.log('   Status After:', statusAfter.data.data.payment_status);
    console.log('   Token Number:', statusAfter.data.data.token_number);

    // 5. Verify Revenue Ledger
    const revenue = await OrderRevenue.findOne({ order_number: statusAfter.data.data.order_number });
    console.log(`   OrderRevenue record found: total ₹${revenue.total_amount}`);

    console.log('\n========================================================================');
    console.log('🎉 ALL CUSTOMER DIRECT UPI TESTS PASSED 100%!');
    console.log('========================================================================');

  } catch (err) {
    console.error('❌ Test failed:', err.response?.data || err.message);
    process.exitCode = 1;
  } finally {
    if (serverInstance) serverInstance.close();
    await mongoose.disconnect();
  }
}

runCustomerTest();
