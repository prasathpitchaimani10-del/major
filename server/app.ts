import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import apiRouter from './routes/index';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

export const createApp = () => {
  const app = express();

  // Security headers configured for compatibility with Vite assets
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS configured with CLIENT_URL environment variable for Render deployment
  const allowedOrigin = process.env.CLIENT_URL || '*';
  app.use(
    cors({
      origin: allowedOrigin === '*' ? true : [allowedOrigin, 'http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Rate limit authentication endpoints against brute-force abuse
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 150,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many authentication attempts from this IP, please try again later.',
      errors: ['Rate limit exceeded'],
    },
  });

  app.use('/api/auth', authLimiter);

  // Mount REST API routes
  app.use('/api', apiRouter);

  // Centralized error handler for API requests
  app.use(errorHandler);

  return app;
};

export default createApp;
