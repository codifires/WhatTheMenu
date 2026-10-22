const cron = require('node-cron');
const Order = require('../models/Order');
const Cafe = require('../models/Cafe');
const OrderRevenue = require('../models/OrderRevenue');
const DailyTokenCounter = require('../models/DailyTokenCounter');
const Razorpay = require('razorpay');
const logger = require('../utils/logger');

const getRazorpayInstance = (cafe) => {
  if (cafe.razorpay_key_id && cafe.razorpay_key_secret) {
    return new Razorpay({ key_id: cafe.razorpay_key_id, key_secret: cafe.razorpay_key_secret });
  }
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  }
  return null;
};

const initPaymentReconciliationCron = (io) => {
  cron.schedule('* * * * *', async () => {
    try {
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
      const oneMinAgo = new Date(Date.now() - 60 * 1000);
      
      const pendingOrders = await Order.find({
        payment_status: 'pending',
        order_status: { $ne: 'cancelled' },
        payment_provider: 'razorpay',
        razorpay_order_id: { $exists: true, $ne: '' },
        created_at: { $gte: thirtyMinsAgo, $lte: oneMinAgo }
      });

      if (pendingOrders.length === 0) return;

      if (pendingOrders.length > 10) {
        logger.warn(`Elevated payment reconciliation backlog: ${pendingOrders.length} pending orders awaiting settlement`, {
          backlog_count: pendingOrders.length
        });
      }

      for (const order of pendingOrders) {
        try {
          const cafe = await Cafe.findById(order.cafe_id).select('+razorpay_key_secret razorpay_key_id');
          if (!cafe) continue;

          const rzp = getRazorpayInstance(cafe);
          if (!rzp) continue;

          const rzpOrder = await rzp.orders.fetch(order.razorpay_order_id);

          if (rzpOrder && rzpOrder.status === 'paid') {
            order.payment_status = 'received';
            order.payment_provider = 'razorpay';
            order.payment_transaction_id = rzpOrder.id;
            
            let verifiedMethod = 'online';
            try {
              const payments = await rzp.orders.fetchPayments(order.razorpay_order_id);
              if (payments && payments.items && payments.items.length > 0) {
                const successfulPayment = payments.items.find(p => p.status === 'captured');
                if (successfulPayment) {
                  order.payment_transaction_id = successfulPayment.id;
                  if (!order.razorpay_payment_id) {
                    order.razorpay_payment_id = successfulPayment.id;
                  }
                  if (successfulPayment.method) {
                    verifiedMethod = successfulPayment.method;
                  }
                }
              }
            } catch (err) {}

            order.payment_method = verifiedMethod;

            // Assign concurrency-safe atomic sequential token if not already assigned
            if (!order.token_number) {
              order.token_number = await DailyTokenCounter.getNextToken(order.cafe_id);
            }

            if (order.order_status === 'pending') {
              order.order_status = 'new';
            }

            await order.save();

            // Save to permanent revenue ledger idempotently
            try {
              await OrderRevenue.findOneAndUpdate(
                { order_number: order.order_number },
                {
                  $setOnInsert: {
                    cafe_id: order.cafe_id,
                    order_number: order.order_number,
                    token_number: order.token_number,
                    customer_name: order.customer_name,
                    table_number: order.table_number || '',
                    items: order.items?.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })) || [],
                    items_count: order.items?.length || 0,
                    total_amount: order.total_amount,
                    payment_provider: 'razorpay',
                    payment_method: verifiedMethod,
                    payment_method_details: order.payment_transaction_id || 'razorpay',
                    payment_status: 'received',
                    order_created_at: order.created_at,
                    payment_date: new Date()
                  }
                },
                { upsert: true, new: true }
              );
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

              io.to(`order-${order.order_number}`).emit('order-updated', {
                order_number: order.order_number,
                order_status: order.order_status,
                payment_status: order.payment_status,
                token_number: order.token_number
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
