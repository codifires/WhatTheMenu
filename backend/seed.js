const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('./models/Admin');
const Cafe = require('./models/Cafe');
const Category = require('./models/Category');
const MenuItem = require('./models/MenuItem');
const Subscription = require('./models/Subscription');

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await Admin.deleteMany({});
    console.log('Cleared existing admin data');

    // Create Super Admin
    const admin = await Admin.create({
      name: 'Super Admin',
      email: 'admin@qrmenu.com',
      password: 'admin123',
      role: 'superadmin'
    });
    console.log(`✅ Super Admin created: ${admin.email} / admin123`);

    // Create a demo café
    const cafe = await Cafe.create({
      name: 'Brew & Bite Café',
      email: 'cafe@demo.com',
      password: 'cafe123',
      phone: '9876543210',
      address: '123 MG Road, Bangalore, Karnataka 560001',
      subscription_status: 'active'
    });
    console.log(`✅ Demo Café created: ${cafe.email} / cafe123`);

    // Create subscription for demo café
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    await Subscription.create({
      cafe_id: cafe._id,
      plan_name: 'pro',
      price: 499,
      start_date: startDate,
      end_date: endDate,
      status: 'active'
    });
    console.log('✅ Subscription created for demo café');

    // Create categories
    const categories = await Category.insertMany([
      { cafe_id: cafe._id, name: 'Coffee', sort_order: 1 },
      { cafe_id: cafe._id, name: 'Tea', sort_order: 2 },
      { cafe_id: cafe._id, name: 'Sandwich', sort_order: 3 },
      { cafe_id: cafe._id, name: 'Pizza', sort_order: 4 },
      { cafe_id: cafe._id, name: 'Burger', sort_order: 5 },
      { cafe_id: cafe._id, name: 'Dessert', sort_order: 6 }
    ]);
    console.log(`✅ ${categories.length} categories created`);

    // Create menu items
    const coffeeCategory = categories[0];
    const teaCategory = categories[1];
    const sandwichCategory = categories[2];
    const pizzaCategory = categories[3];
    const burgerCategory = categories[4];
    const dessertCategory = categories[5];

    const menuItems = await MenuItem.insertMany([
      // Coffee
      { cafe_id: cafe._id, category_id: coffeeCategory._id, name: 'Espresso', description: 'Rich and bold single shot espresso', price: 149, is_veg: true },
      { cafe_id: cafe._id, category_id: coffeeCategory._id, name: 'Cappuccino', description: 'Creamy cappuccino with steamed milk foam', price: 199, is_veg: true },
      { cafe_id: cafe._id, category_id: coffeeCategory._id, name: 'Latte', description: 'Smooth latte with velvety steamed milk', price: 219, is_veg: true },
      { cafe_id: cafe._id, category_id: coffeeCategory._id, name: 'Cold Brew', description: 'Slow-steeped cold brew for a smooth finish', price: 249, is_veg: true },
      // Tea
      { cafe_id: cafe._id, category_id: teaCategory._id, name: 'Masala Chai', description: 'Aromatic Indian spiced tea', price: 99, is_veg: true },
      { cafe_id: cafe._id, category_id: teaCategory._id, name: 'Green Tea', description: 'Light and refreshing Japanese green tea', price: 129, is_veg: true },
      { cafe_id: cafe._id, category_id: teaCategory._id, name: 'Iced Tea', description: 'Chilled peach iced tea', price: 149, is_veg: true },
      // Sandwich
      { cafe_id: cafe._id, category_id: sandwichCategory._id, name: 'Grilled Veggie', description: 'Grilled vegetables with pesto in sourdough', price: 199, is_veg: true },
      { cafe_id: cafe._id, category_id: sandwichCategory._id, name: 'Chicken Club', description: 'Triple-decker chicken club with bacon', price: 279, is_veg: false },
      { cafe_id: cafe._id, category_id: sandwichCategory._id, name: 'Paneer Tikka Wrap', description: 'Spiced paneer tikka in a warm tortilla', price: 229, is_veg: true },
      // Pizza
      { cafe_id: cafe._id, category_id: pizzaCategory._id, name: 'Margherita', description: 'Classic pizza with fresh mozzarella and basil', price: 299, is_veg: true },
      { cafe_id: cafe._id, category_id: pizzaCategory._id, name: 'Pepperoni', description: 'Loaded with spicy pepperoni and cheese', price: 399, is_veg: false },
      { cafe_id: cafe._id, category_id: pizzaCategory._id, name: 'Farmhouse', description: 'Fresh veggies on a crispy thin crust', price: 349, is_veg: true },
      // Burger
      { cafe_id: cafe._id, category_id: burgerCategory._id, name: 'Classic Veg Burger', description: 'Crispy veg patty with fresh lettuce', price: 179, is_veg: true },
      { cafe_id: cafe._id, category_id: burgerCategory._id, name: 'Chicken Zinger', description: 'Crunchy chicken fillet burger', price: 249, is_veg: false },
      // Dessert
      { cafe_id: cafe._id, category_id: dessertCategory._id, name: 'Chocolate Brownie', description: 'Warm fudge brownie with vanilla ice cream', price: 199, is_veg: true },
      { cafe_id: cafe._id, category_id: dessertCategory._id, name: 'Cheesecake', description: 'New York style baked cheesecake', price: 249, is_veg: true },
      { cafe_id: cafe._id, category_id: dessertCategory._id, name: 'Gulab Jamun', description: 'Soft and sweet traditional Indian dessert', price: 129, is_veg: true }
    ]);
    console.log(`✅ ${menuItems.length} menu items created`);

    console.log('\n🎉 Database seeded successfully!');
    console.log('================================');
    console.log('Super Admin Login:');
    console.log('  Email: admin@qrmenu.com');
    console.log('  Password: admin123');
    console.log('');
    console.log('Demo Café Owner Login:');
    console.log('  Email: cafe@demo.com');
    console.log('  Password: cafe123');
    console.log('================================');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    process.exit(1);
  }
};

seedData();
