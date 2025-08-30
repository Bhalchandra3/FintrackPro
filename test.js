import express from 'express';
import pkg from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import cors from "cors";

dotenv.config();
const { Pool } = pkg;

const app = express();
app.use(express.json());

// Allow all origins (for dev)
app.use(cors());


// Database configuration
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: Number(process.env.DB_PORT),
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET;

// Ensure users table exists
const ensureUsersTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    console.log("Users table ensured.");
  } catch (err) {
    console.error("Error ensuring users table:", err);
  }
};

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('Database connected successfully');
    
    await ensureUsersTable();
    client.release();
  } catch (err) {
    console.error('Database connection error:', err);
  }
};

// Middleware for JWT authentication
const authenticateToken = (req, res, next) => {
  console.log(req);
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }
    req.user = user;
    next();
  });
};

// Helper function to generate standardized responses
const generateResponse = (success, message, data = null, error = null) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString()
  };
  
  if (data) response.data = data;
  if (error) response.error = error;
  
  return response;
};

// Routes

// Health check endpoint
app.get('/health', async (req, res) => {
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

// User registration
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json(generateResponse(
      false, 
      'Name, email, and password are required'
    ));
  }

  try {
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Insert user
    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
      [name, email, hashedPassword]
    );
    
    const user = result.rows[0];
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(201).json(generateResponse(
      true, 
      'User registered successfully', 
      { 
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          created_at: user.created_at
        },
        token 
      }
    ));
    
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json(generateResponse(
        false, 
        'Email already exists'
      ));
    } else {
      res.status(500).json(generateResponse(
        false, 
        'Registration failed', 
        null, 
        error.message
      ));
    }
  }
});

// // User login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json(generateResponse(
      false, 
      'Email and password are required'
    ));
  }

  try {
    // Find user by email
    const result = await pool.query(
      'SELECT id, name, email, password FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json(generateResponse(
        false, 
        'Invalid credentials'
      ));
    }
    
    const user = result.rows[0];
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json(generateResponse(
        false, 
        'Invalid credentials'
      ));
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json(generateResponse(
      true, 
      'Login successful', 
      { 
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        token 
      }
    ));
    
  } catch (error) {
    res.status(500).json(generateResponse(
      false, 
      'Login failed', 
      null, 
      error.message
    ));
  }
});

// // Get all users (protected route)
app.get('/users', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, created_at FROM users ORDER BY created_at DESC'
    );
    
    res.json(generateResponse(
      true, 
      'Users retrieved successfully', 
      { users: result.rows, count: result.rows.length }
    ));
    
  } catch (error) {
    res.status(500).json(generateResponse(
      false, 
      'Failed to retrieve users', 
      null, 
      error.message
    ));
  }
});

// // Get user profile (protected route)
app.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json(generateResponse(
        false, 
        'User not found'
      ));
    }
    
    res.json(generateResponse(
      true, 
      'Profile retrieved successfully', 
      { user: result.rows[0] }
    ));
    
  } catch (error) {
    res.status(500).json(generateResponse(
      false, 
      'Failed to retrieve profile', 
      null, 
      error.message
    ));
  }
});

// // Update user profile (protected route)
app.put('/profile', authenticateToken, async (req, res) => {
  const { name, email } = req.body;
  const userId = req.user.userId;
  
  if (!name && !email) {
    return res.status(400).json(generateResponse(
      false, 
      'At least name or email must be provided'
    ));
  }

  try {
    let query = 'UPDATE users SET ';
    const values = [];
    const updates = [];
    let paramCount = 1;

    if (name) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }
    
    if (email) {
      updates.push(`email = $${paramCount}`);
      values.push(email);
      paramCount++;
    }
    
    query += updates.join(', ');
    query += ` WHERE id = $${paramCount} RETURNING id, name, email, created_at`;
    values.push(userId);
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json(generateResponse(
        false, 
        'User not found'
      ));
    }
    
    res.json(generateResponse(
      true, 
      'Profile updated successfully', 
      { user: result.rows[0] }
    ));
    
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json(generateResponse(
        false, 
        'Email already exists'
      ));
    } else {
      res.status(500).json(generateResponse(
        false, 
        'Failed to update profile', 
        null, 
        error.message
      ));
    }
  }
});

// // Custom query endpoint (protected route)
app.post('/query', authenticateToken, async (req, res) => {
  const { query, params = [] } = req.body;
  
  if (!query) {
    return res.status(400).json(generateResponse(
      false, 
      'SQL query is required'
    ));
  }

  try {
    // Security check - only allow SELECT queries for safety
    if (!query.trim().toLowerCase().startsWith('select')) {
      return res.status(403).json(generateResponse(
        false, 
        'Only SELECT queries are allowed for security reasons'
      ));
    }
    
    const result = await pool.query(query, params);
    
    res.json(generateResponse(
      true, 
      'Query executed successfully', 
      { 
        rows: result.rows, 
        rowCount: result.rowCount,
        fields: result.fields?.map(f => ({ name: f.name, type: f.dataTypeID }))
      }
    ));
    
  } catch (error) {
    res.status(500).json(generateResponse(
      false, 
      'Query execution failed', 
      null, 
      error.message
    ));
  }
});

// // Delete user (protected route)
app.delete('/users/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const requesterId = req.user.userId;
  
  // Users can only delete their own account
  if (parseInt(id) !== requesterId) {
    return res.status(403).json(generateResponse(
      false, 
      'You can only delete your own account'
    ));
  }

  try {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, name, email',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json(generateResponse(
        false, 
        'User not found'
      ));
    }
    
    res.json(generateResponse(
      true, 
      'User deleted successfully', 
      { deletedUser: result.rows[0] }
    ));
    
  } catch (error) {
    res.status(500).json(generateResponse(
      false, 
      'Failed to delete user', 
      null, 
      error.message
    ));
  }
});

// // Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json(generateResponse(
    false, 
    'Internal server error', 
    null, 
    err.message
  ));
});

// // 404 handler
app.use((req, res) => {
  res.status(404).json(generateResponse(
    false, 
    `Route ${req.method} ${req.originalUrl} not found`
  ));
});

// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer().catch(console.error);

export { app, pool };