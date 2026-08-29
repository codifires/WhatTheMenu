const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => { 
    const orders = await mongoose.connection.db.collection('orders').find({ payment_status: 'received' }).toArray(); 
    console.log(orders.map(o => ({ id: o.order_number, method: o.payment_method, amount: o.total_amount, status: o.payment_status }))); 
    process.exit(0); 
  })
  .catch(err => {
    console.error("Database connection failed:", err);
    process.exit(1);
  });
