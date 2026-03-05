/**
 * Seed script — creates default admin user and sample coupons.
 * Run: node scripts/seed.js   (or: npm run seed inside the container)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const Coupon = require('../models/Coupon');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/coupon_marketplace';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB for seeding');

  // 1. Create default admin (skip if exists)
  const existingAdmin = await Admin.findOne({ username: process.env.ADMIN_DEFAULT_USERNAME || 'admin' });
  if (!existingAdmin) {
    await Admin.create({
      username: process.env.ADMIN_DEFAULT_USERNAME || 'admin',
      password_hash: process.env.ADMIN_DEFAULT_PASSWORD || 'admin123'
    });
    console.log('Default admin created (username: admin)');
  } else {
    console.log('Default admin already exists, skipping');
  }

  // 2. Create sample coupons (skip if any exist)
  const couponCount = await Coupon.countDocuments();
  if (couponCount === 0) {
    const sampleCoupons = [
      {
        name: 'Amazon $50 Gift Card',
        description: 'Redeemable on amazon.com for $50',
        image_url: 'https://via.placeholder.com/300x200?text=Amazon+$50',
        cost_price: 40,
        margin_percentage: 25,
        value_type: 'STRING',
        value: 'AMZ-50-ABCD-1234'
      },
      {
        name: 'Netflix 1-Month Subscription',
        description: 'One month of Netflix Standard plan',
        image_url: 'https://via.placeholder.com/300x200?text=Netflix+1Mo',
        cost_price: 12,
        margin_percentage: 30,
        value_type: 'STRING',
        value: 'NFLX-1MO-EFGH-5678'
      },
      {
        name: 'Spotify 3-Month Premium',
        description: 'Three months of Spotify Premium',
        image_url: 'https://via.placeholder.com/300x200?text=Spotify+3Mo',
        cost_price: 25,
        margin_percentage: 20,
        value_type: 'STRING',
        value: 'SPTFY-3MO-IJKL-9012'
      }
    ];

    await Coupon.insertMany(sampleCoupons);
    console.log(`${sampleCoupons.length} sample coupons created`);
  } else {
    console.log(`${couponCount} coupons already exist, skipping`);
  }

  await mongoose.disconnect();
  console.log('Seed complete');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
