require('dotenv').config();
const mongoose = require('mongoose');
const Subscription = require('./models/Subscription');
const SubscriptionHistory = require('./models/SubscriptionHistory');
const Cafe = require('./models/Cafe');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const oneYearFromNow = new Date();
  oneYearFromNow.setDate(oneYearFromNow.getDate() + 300);

  const fixSubs = await Subscription.find({ end_date: { $gte: oneYearFromNow } });
  for (const sub of fixSubs) {
    const fixedEndDate = new Date(sub.start_date);
    fixedEndDate.setDate(fixedEndDate.getDate() + 30);
    sub.end_date = fixedEndDate;
    await sub.save();
    
    const history = await SubscriptionHistory.findOne({ cafe_id: sub.cafe_id, start_date: sub.start_date });
    if (history) {
      history.end_date = fixedEndDate;
      await history.save();
    }
    
    const cafe = await Cafe.findById(sub.cafe_id);
    if (cafe && cafe.subscription && new Date(cafe.subscription.end_date) >= oneYearFromNow) {
      cafe.subscription.end_date = fixedEndDate;
      await cafe.save();
    }
  }
  console.log('Fixed records!');
  process.exit(0);
});
