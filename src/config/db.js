import pkg from 'pg';
import { DB_CONFIG } from './env.js';

const { Pool } = pkg;
export const pool = new Pool(DB_CONFIG);

export const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected');
    client.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
};
