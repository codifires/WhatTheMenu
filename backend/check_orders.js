const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://codifires_db_user:DajPz4l9TbwGFtJU@cluster0.9npi6wn.mongodb.net/QR_System_prod?retryWrites=true&w=majority')
  .then(async () => { 
    const orders = await mongoose.connection.db.collection('orders').find({ payment_status: 'received' }).toArray(); 
    console.log(orders.map(o => ({ id: o.order_number, method: o.payment_method, amount: o.total_amount, status: o.payment_status }))); 
    process.exit(0); 
  });
