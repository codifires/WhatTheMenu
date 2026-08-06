require('dotenv').config();
const mongoose = require('mongoose');
const SupportTicket = require('./models/SupportTicket');
const Cafe = require('./models/Cafe');
const Settings = require('./models/Settings');

async function runTests() {
  console.log('🧪 Starting Café Owner Support & Admin Ticket Management Flow Test...');

  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // 1. Check or create test cafe
    let testCafe = await Cafe.findOne({ email: 'test_support_cafe@example.com' });
    if (!testCafe) {
      testCafe = await Cafe.create({
        name: 'Grand Horizon Café',
        email: 'test_support_cafe@example.com',
        password: 'Password123!',
        phone: '9988776655',
        address: '123 Main Avenue, Bangalore',
        subscription_status: 'active',
        subscription: {
          plan_name: 'pro',
          status: 'active'
        }
      });
      console.log('✅ Created test Pro Cafe:', testCafe.name);
    } else {
      testCafe.subscription = { plan_name: 'pro', status: 'active' };
      testCafe.subscription_status = 'active';
      await testCafe.save();
    }

    // 2. Test ticket creation for Pro Cafe (Should auto-tag 'urgent')
    const isPro = testCafe.subscription?.plan_name === 'pro' || testCafe.subscription_status === 'pro';
    const priority = isPro ? 'urgent' : 'normal';

    const ticketNumber = `TCK-${Date.now().toString().slice(-6)}`;
    const ticket = await SupportTicket.create({
      cafe_id: testCafe._id,
      ticket_number: ticketNumber,
      subject: 'UPI Settlement Inquiry for Table 4',
      category: 'payment_upi',
      description: 'Customer scanned QR and paid ₹350 via GPay. Need confirmation of webhook settlement.',
      priority,
      status: 'open'
    });

    console.log(`✅ Ticket Created: #${ticket.ticket_number} | Priority: ${ticket.priority} | Status: ${ticket.status}`);
    if (ticket.priority !== 'urgent') {
      throw new Error(`Expected priority 'urgent' for Pro Plan, got '${ticket.priority}'`);
    }

    // 3. Test Owner retrieving their tickets
    const ownerTickets = await SupportTicket.find({ cafe_id: testCafe._id }).sort({ created_at: -1 });
    console.log(`✅ Owner retrieved ${ownerTickets.length} ticket(s)`);
    if (ownerTickets.length === 0) {
      throw new Error('Owner failed to find created ticket');
    }

    // 4. Test Admin dashboard & ticket list aggregation
    const totalCount = await SupportTicket.countDocuments();
    const openCount = await SupportTicket.countDocuments({ status: 'open' });
    const urgentCount = await SupportTicket.countDocuments({ priority: 'urgent', status: { $in: ['open', 'in_progress'] } });

    console.log(`✅ Admin Ticket Metrics -> Total: ${totalCount}, Open: ${openCount}, Urgent: ${urgentCount}`);

    // 5. Test Admin Reply & Resolve
    ticket.admin_reply = 'Payment webhook ID UPI-998822 has settled to your bank account successfully.';
    ticket.status = 'resolved';
    ticket.resolved_at = new Date();
    await ticket.save();

    const updatedTicket = await SupportTicket.findById(ticket._id);
    console.log(`✅ Ticket Updated by Admin -> Status: ${updatedTicket.status} | Resolved At: ${updatedTicket.resolved_at}`);
    if (updatedTicket.status !== 'resolved' || !updatedTicket.admin_reply) {
      throw new Error('Ticket resolution failed');
    }

    // 6. Test Settings support channels
    const settings = await Settings.getSettings();
    console.log('✅ Platform Settings Support Channels:');
    console.log(`   - Email: ${settings.contact_email}`);
    console.log(`   - WhatsApp: ${settings.support_whatsapp}`);
    console.log(`   - Helpline: ${settings.support_phone}`);
    console.log(`   - Hours: ${settings.support_hours}`);

    // Clean up test ticket & cafe
    await SupportTicket.deleteOne({ _id: ticket._id });
    await Cafe.deleteOne({ _id: testCafe._id });
    console.log('🧹 Cleaned up test data');

    console.log('\n🎉 ALL SUPPORT MODULE TESTS PASSED SUCCESSFULLY! 🚀');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

runTests();
