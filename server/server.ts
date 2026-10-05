import dotenv from 'dotenv';
import { createApp } from './app';
import { connectDatabase } from './config/database';

dotenv.config();

async function startBackendService() {
  await connectDatabase();

  const app = createApp();
  const PORT = Number(process.env.PORT) || 10000;

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Krono & Co. API Service listening on http://0.0.0.0:${PORT}`);
  });
}

startBackendService();
