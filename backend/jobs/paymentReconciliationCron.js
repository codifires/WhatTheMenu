const cron = require('node-cron');
const Order = require('../models/Order');
const Cafe = require('../models/Cafe');
const OrderRevenue = require('../models/OrderRevenue');
const Razorpay = require('razorpay');

const getCafeRazorpay = (key_id, key_secret) => {
  return new Razorpay({ key_id, key_secret });
};

const initPaymentReconciliationCron = (io) => {
  cron.schedule('* * * * *', async () => {
    try {
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
      const oneMinAgo = new Date(Date.now() - 60 * 1000);
      
      const pendingOrders = await Order.find({
        payment_status: 'pending',
        payment_method: 'razorpay',
        razorpay_order_id: { $exists: true, $ne: '' },
        created_at: { $gte: thirtyMinsAgo, $lte: oneMinAgo }
      });

      if (pendingOrders.length === 0) return;

      for (const order of pendingOrders) {
        try {
          const cafe = await Cafe.findById(order.cafe_id).select('+razorpay_key_secret');
          if (!cafe || !cafe.razorpay_key_id || !cafe.razorpay_key_secret) continue;

          const rzp = getCafeRazorpay(cafe.razorpay_key_id, cafe.razorpay_key_secret);
          const rzpOrder = await rzp.orders.fetch(order.razorpay_order_id);

          if (rzpOrder && rzpOrder.status === 'paid') {
            order.payment_status = 'received';
            order.payment_transaction_id = rzpOrder.id;
            
            try {
              const payments = await rzp.orders.fetchPayments(order.razorpay_order_id);
              if (payments && payments.items && payments.items.length > 0) {
                const successfulPayment = payments.items.find(p => p.status === 'captured');
                if (successfulPayment) {
                  order.payment_transaction_id = successfulPayment.id;
                }
              }
            } catch (err) {}

            await order.save();

            try {
              const existingRev = await OrderRevenue.findOne({ order_id: order._id });
              if (!existingRev) {
                await OrderRevenue.create({
                  order_id: order._id,
                  cafe_id: order.cafe_id,
                  order_number: order.order_number,
                  token_number: order.token_number,
                  customer_name: order.customer_name,
                  table_number: order.table_number,
                  items: order.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
                  total_amount: order.total_amount,
                  payment_method: 'razorpay',
                  payment_transaction_id: order.payment_transaction_id,
                  payment_status: 'received',
                  order_created_at: order.created_at,
                  payment_confirmed_at: new Date()
                });
              }
            } catch (revErr) {}

            if (io) {
              io.to(`cafe-${order.cafe_id}`).emit('new-order', {
                order: {
                  _id: order._id,
                  order_number: order.order_number,
                  customer_name: order.customer_name,
                  table_number: order.table_number,
                  total_amount: order.total_amount,
                  items: order.items,
                  order_status: order.order_status,
                  payment_status: order.payment_status,
                  token_number: order.token_number,
                  created_at: order.created_at
                },
                message: `✅ Auto-Recovered Order: Token ${order.token_number}`
              });
            }
          } else if (rzpOrder && (rzpOrder.status === 'attempted' || rzpOrder.status === 'created')) {
             const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
             if (order.created_at < fifteenMinsAgo) {
                 order.payment_status = 'failed';
                 await order.save();
             }
          }
        } catch (err) {}
      }
    } catch (error) {}
  });

  console.log('Payment reconciliation cron initialized (Runs every 1 minute).');
};

module.exports = initPaymentReconciliationCron;
