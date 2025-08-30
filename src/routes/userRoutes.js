import express from 'express';
import { pool } from '../config/db.js';
import { authenticateToken } from '../middlerware/auth.js';
import { generateResponse } from '../utils/response.js';

const router = express.Router();

// Get all users
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, created_at FROM users ORDER BY created_at DESC');
    res.json(generateResponse(true, 'Users retrieved successfully', { users: result.rows }));
  } catch (error) {
    res.status(500).json(generateResponse(false, 'Failed to retrieve users', null, error.message));
  }
});

// Get profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, created_at FROM users WHERE id = $1', [req.user.userId]);
    if (result.rows.length === 0) return res.status(404).json(generateResponse(false, 'User not found'));
    res.json(generateResponse(true, 'Profile retrieved successfully', { user: result.rows[0] }));
  } catch (error) {
    res.status(500).json(generateResponse(false, 'Failed to retrieve profile', null, error.message));
  }
});

export default router;
