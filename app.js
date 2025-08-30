import express from 'express';
import cors from 'cors';
import authRoutes from './src/routes/authRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import { errorHandler, notFoundHandler } from './src/middlerware/errorhandler.js';

const app = express();

app.use(express.json());
app.use(cors());

// Routes
app.use(authRoutes);
app.use(userRoutes);

// Error handling
app.use(errorHandler);
app.use(notFoundHandler);

export default app;
