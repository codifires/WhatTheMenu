const cron = require('node-cron');
const Order = require('../models/Order');

const initOrderCleanupCron = () => {
  // Run daily at 3:00 AM
  cron.schedule('0 3 * * *', async () => {
    try {
      console.log('[CRON] Starting 15-day order cleanup job...');
      
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      
      const result = await Order.deleteMany({
        order_status: { $in: ['completed', 'cancelled', 'failed'] },
        created_at: { $lt: fifteenDaysAgo }
      });
      
      if (result.deletedCount > 0) {
        console.log(`[CRON] Successfully deleted ${result.deletedCount} old completed/cancelled orders.`);
      } else {
        console.log('[CRON] No old orders found to delete.');
      }
    } catch (error) {
      console.error('[CRON] Error during order cleanup job:', error);
    }
  });

  console.log('Order cleanup cron initialized (Runs daily at 3:00 AM).');
};

module.exports = initOrderCleanupCron;
