const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const SubscriptionHistory = require('../models/SubscriptionHistory');
const Cafe = require('../models/Cafe');
const Settings = require('../models/Settings');
const Order = require('../models/Order');
const OrderRevenue = require('../models/OrderRevenue');
const sendEmail = require('../utils/sendEmail');
const { subscriptionExpiryTemplate } = require('../utils/emailTemplates');

const startSubscriptionCron = () => {
  // Run every day at 10:00 AM
  cron.schedule('0 10 * * *', async () => {
    console.log('Running daily subscription expiry check...');
    try {
      const threeDaysFromNowStart = new Date();
      threeDaysFromNowStart.setDate(threeDaysFromNowStart.getDate() + 3);
      threeDaysFromNowStart.setHours(0, 0, 0, 0);

      const threeDaysFromNowEnd = new Date(threeDaysFromNowStart);
      threeDaysFromNowEnd.setHours(23, 59, 59, 999);

      const expiringSubscriptions = await Subscription.find({
        status: 'active',
        end_date: {
          $gte: threeDaysFromNowStart,
          $lte: threeDaysFromNowEnd
        }
      }).populate('cafe_id');

      if (expiringSubscriptions.length === 0) {
        console.log('No subscriptions expiring in 3 days.');
        return;
      }

      console.log(`Found ${expiringSubscriptions.length} subscriptions expiring in 3 days. Sending emails...`);

      for (const sub of expiringSubscriptions) {
        const cafe = sub.cafe_id;
        if (!cafe || !cafe.email) continue;

        const emailOptions = {
          email: cafe.email,
          subject: 'Action Required: Your QRMenu Subscription is Expiring Soon',
          message: `Your subscription is expiring on ${sub.end_date.toLocaleDateString()}. Please renew to continue using the service.`,
          html: subscriptionExpiryTemplate(cafe.name, sub.end_date)
        };

        try {
          await sendEmail(emailOptions);
          console.log(`Sent expiry reminder to ${cafe.email}`);
        } catch (emailErr) {
          console.error(`Failed to send expiry reminder to ${cafe.email}:`, emailErr);
        }
      }

      // --- Upcoming Plan Rollover Logic ---
      console.log('Checking for expired subscriptions to roll over...');
      const now = new Date();
      
      const expiredCafes = await Cafe.find({
        'subscription.status': 'active',
        'subscription.end_date': { $lte: now },
        // Skip cafés with active Razorpay subscriptions — Razorpay handles billing via webhooks
        $or: [
          { razorpay_subscription_id: { $exists: false } },
          { razorpay_subscription_id: '' }
        ]
      });

      let settings = null;
      if (expiredCafes.length > 0) {
        settings = await Settings.findOne();
      }

      for (const cafe of expiredCafes) {
        if (cafe.upcoming_subscription && cafe.upcoming_subscription.plan_name) {
          console.log(`Rolling over upcoming plan for Cafe: ${cafe._id}`);
          const newEndDate = new Date();
          newEndDate.setDate(newEndDate.getDate() + (cafe.upcoming_subscription.duration_days || 30));
          
          cafe.subscription = {
            plan_name: cafe.upcoming_subscription.plan_name,
            start_date: new Date(),
            end_date: newEndDate,
            status: 'active'
          };
          cafe.upcoming_subscription = undefined;
          await cafe.save();
          
          // Sync to Subscription collection for Admin Dashboard
          await Subscription.findOneAndUpdate(
            { cafe_id: cafe._id },
            {
              plan_name: cafe.subscription.plan_name,
              price: cafe.subscription.plan_name === 'pro' ? (settings?.pro_price || 499) : (cafe.subscription.plan_name === 'starter' ? (settings?.starter_price || 299) : (settings?.basic_price || 199)),
              start_date: new Date(),
              end_date: newEndDate,
              status: 'active'
            },
            { upsert: true, new: true }
          );

          // Create permanent history record
          await SubscriptionHistory.create({
            cafe_id: cafe._id,
            plan_name: cafe.subscription.plan_name,
            price: cafe.subscription.plan_name === 'pro' ? (settings?.pro_price || 499) : (cafe.subscription.plan_name === 'starter' ? (settings?.starter_price || 299) : (settings?.basic_price || 199)),
            start_date: new Date(),
            end_date: newEndDate,
            status: 'active'
          });
        } else {
          console.log(`Expiring plan for Cafe: ${cafe._id}`);
          cafe.subscription.status = 'expired';
          cafe.subscription_status = 'expired';
          await cafe.save();
        }
      }

    } catch (error) {
      console.error('Error in daily subscription check:', error);
    }
  });
  console.log('Subscription cron job initialized (Runs daily at 10:00 AM).');

  // ─── Revenue Safety Net ────────────────────────────────────────────────────
  // Runs daily at 2:00 AM. Finds any paid orders that are 4+ days old
  // (approaching the 5-day TTL deletion) and ensures they are saved to the
  // permanent OrderRevenue ledger. Guards against any missed payment callbacks.
  cron.schedule('0 2 * * *', async () => {
    console.log('[Revenue Cron] Running revenue safety net...');
    try {
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

      // Find paid, non-cancelled orders older than 4 days not yet in OrderRevenue
      const existingNumbers = await OrderRevenue.distinct('order_number');
      const missedOrders = await Order.find({
        order_status: { $ne: 'cancelled' },
        payment_status: { $in: ['received', 'completed'] },
        created_at: { $lte: fourDaysAgo },
        order_number: { $nin: existingNumbers }
      }).lean();

      if (missedOrders.length === 0) {
        console.log('[Revenue Cron] No missed revenue records. All good!');
        return;
      }

      console.log(`[Revenue Cron] Found ${missedOrders.length} missed revenue records. Saving...`);
      const ops = missedOrders.map(order => ({
        updateOne: {
          filter: { order_number: order.order_number },
          update: {
            $setOnInsert: {
              cafe_id: order.cafe_id,
              order_number: order.order_number,
              total_amount: order.total_amount,
              payment_method: order.payment_method,
              table_number: order.table_number || '',
              items_count: order.items?.length || 0,
              payment_date: order.updated_at || order.created_at
            }
          },
          upsert: true
        }
      }));

      const result = await OrderRevenue.bulkWrite(ops);
      console.log(`[Revenue Cron] Saved ${result.upsertedCount} missed revenue records.`);
    } catch (err) {
      console.error('[Revenue Cron] Safety net error:', err.message);
    }
  });
  console.log('Revenue safety-net cron initialized (Runs daily at 2:00 AM).');
};

module.exports = startSubscriptionCron;
