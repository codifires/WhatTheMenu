const mongoose = require('mongoose');

const uri = 'mongodb+srv://codifires_db_user:DajPz4l9TbwGFtJU@cluster0.9npi6wn.mongodb.net/QR_System_prod?retryWrites=true&w=majority';

async function recoverRevenue() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to LIVE Production Database...');

    const db = mongoose.connection.db;
    const ordersCol = db.collection('orders');
    const revenueCol = db.collection('orderrevenues');

    // Find orders that are received or completed, but have 'razorpay_order_id'
    // Basically, any order that was paid online, recently.
    const paidOrders = await ordersCol.find({
      payment_status: { $in: ['received', 'completed'] },
      payment_method: 'razorpay'
    }).toArray();

    console.log(`Found ${paidOrders.length} online paid orders.`);

    let recoveredCount = 0;

    for (const order of paidOrders) {
      // Check if it exists in orderrevenues by order_number
      const existing = await revenueCol.findOne({ order_number: order.order_number });

      if (!existing) {
        // Recover it!
        const revenueRecord = {
          cafe_id: order.cafe_id,
          order_number: order.order_number,
          total_amount: order.total_amount,
          payment_method: 'online', // Correct Enum mapping
          payment_method_details: 'razorpay',
          table_number: order.table_number || '',
          items_count: order.items?.length || 0,
          payment_date: order.created_at || new Date(),
          created_at: new Date(),
          updated_at: new Date()
        };

        await revenueCol.insertOne(revenueRecord);
        console.log(`Recovered missing revenue for Order: ${order.order_number}`);
        recoveredCount++;
      }
    }

    console.log(`Migration Complete. Recovered ${recoveredCount} records.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

recoverRevenue();
