import app from './app.js';
import { PORT } from './src/config/env.js';
import { testConnection } from './src/config/db.js';

const startServer = async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer().catch(console.error);
