import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Track database connection mode across the backend
let isMongoConnected = false;

export const getDbMode = (): 'mongodb-atlas' | 'persistence-engine' => {
  return isMongoConnected && mongoose.connection.readyState === 1
    ? 'mongodb-atlas'
    : 'persistence-engine';
};

export const connectDatabase = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes('<username>') || uri.trim() === '') {
    isMongoConnected = false;
    return;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000,
    });
    isMongoConnected = true;
    console.log('Connected to MongoDB Atlas cluster successfully.');
  } catch (error) {
    console.warn('MongoDB Atlas unreachable in current environment; falling back to local persistence engine.');
    isMongoConnected = false;
  }
};
