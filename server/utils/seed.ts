import dotenv from 'dotenv';
import { connectDatabase, getDbMode } from '../config/database';
import { dbStore } from '../models/store';
import {
  UserModel,
  CategoryModel,
  ProductModel,
  CouponModel,
  OrderModel,
  ReviewModel,
  QuestionModel,
} from '../models/schemas';

dotenv.config();

async function runSeed() {
  console.log('Starting Krono & Co. Database Seed...');
  await connectDatabase();

  if (getDbMode() === 'mongodb-atlas') {
    console.log('Seeding live MongoDB Atlas collections...');
    await Promise.all([
      UserModel.deleteMany({}),
      CategoryModel.deleteMany({}),
      ProductModel.deleteMany({}),
      CouponModel.deleteMany({}),
      OrderModel.deleteMany({}),
      ReviewModel.deleteMany({}),
      QuestionModel.deleteMany({}),
    ]);

    await UserModel.insertMany(dbStore.users);
    await CategoryModel.insertMany(dbStore.categories);
    await ProductModel.insertMany(dbStore.products);
    await CouponModel.insertMany(dbStore.coupons);
    await OrderModel.insertMany(dbStore.orders);
    await ReviewModel.insertMany(dbStore.reviews);
    await QuestionModel.insertMany(dbStore.questions);
    console.log('MongoDB Atlas seed completed successfully.');
  } else {
    console.log('Seed verified in local persistence store:');
    console.log(`- Users: ${dbStore.users.length} (Admin: admin@krono.co / Admin@123, Customer: aarav@example.com / Customer@123)`);
    console.log(`- Categories: ${dbStore.categories.length}`);
    console.log(`- Products: ${dbStore.products.length}`);
    console.log(`- Coupons: ${dbStore.coupons.length}`);
    console.log(`- Historical Orders: ${dbStore.orders.length}`);
  }
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
