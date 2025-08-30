import express from 'express';
import { createUser, findUserByEmail, generateToken } from '../services/userServices.js';
import bcrypt from 'bcrypt';
import { generateResponse } from '../utils/response.js';
import { pool } from '../config/db.js';
const router = express.Router();

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json(generateResponse(
      true, 
      'Database connection healthy', 
      { db_time: result.rows[0].now }
    ));
  } catch (error) {
    res.status(500).json(generateResponse(
      false, 
      'Database connection failed', 
      null, 
      error.message
    ));
  }
});

// Register
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json(generateResponse(false, 'Name, email, and password required'));
  }
  try {
    const user = await createUser(name, email, password);
    const token = generateToken(user);
    res.status(201).json(generateResponse(true, 'User registered successfully', { user, token }));
  } catch (error) {
    if (error.code === '23505') {
      res.status(409).json(generateResponse(false, 'Email already exists'));
    } else {
      res.status(500).json(generateResponse(false, 'Registration failed', null, error.message));
    }
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json(generateResponse(false, 'Email and password required'));
  }
  try {
    const user = await findUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json(generateResponse(false, 'Invalid credentials'));
    }
    const token = generateToken(user);
    res.json(generateResponse(true, 'Login successful', { user, token }));
  } catch (error) {
    res.status(500).json(generateResponse(false, 'Login failed', null, error.message));
  }
});

export default router;
