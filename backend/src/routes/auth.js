const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql, getPool } = require('../config/db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const BCRYPT_SALT_ROUNDS = 12; // Maximum security hashing

// POST /api/auth/register - Register new customer with bcrypt hashed password
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email address, and password are all required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long for security.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const pool = await getPool();

    // Check if user already exists
    const existing = await pool.request()
      .input('email', sql.NVarChar(150), normalizedEmail)
      .query('SELECT user_id FROM dbo.Users WHERE email = @email');

    if (existing.recordset.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists. Please sign in.'
      });
    }

    // Hash password with bcrypt (12 rounds)
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Insert new user into SQL Server
    const insertResult = await pool.request()
      .input('fullName', sql.NVarChar(100), fullName.trim())
      .input('email', sql.NVarChar(150), normalizedEmail)
      .input('hash', sql.NVarChar(255), passwordHash)
      .input('role', sql.NVarChar(20), 'customer')
      .query(`
        INSERT INTO dbo.Users (full_name, email, password_hash, role)
        OUTPUT INSERTED.user_id, INSERTED.full_name, INSERTED.email, INSERTED.role, INSERTED.created_at
        VALUES (@fullName, @email, @hash, @role);
      `);

    const newUser = insertResult.recordset[0];

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: newUser.user_id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully with cryptographic password protection.',
      user: {
        userId: newUser.user_id,
        fullName: newUser.full_name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.created_at
      },
      token
    });

  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to complete registration due to database server error.'
    });
  }
});

// POST /api/auth/login - Verify credentials against bcrypt hash & issue JWT
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Both email and password are required to authenticate.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const pool = await getPool();

    // Query user record from SQL Server
    const result = await pool.request()
      .input('email', sql.NVarChar(150), normalizedEmail)
      .query('SELECT user_id, full_name, email, password_hash, role, created_at FROM dbo.Users WHERE email = @email');

    if (result.recordset.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.'
      });
    }

    const user = result.recordset[0];

    // Compare supplied password with stored bcrypt hash
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.'
      });
    }

    // Generate secure JWT token
    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      message: 'Authentication successful.',
      user: {
        userId: user.user_id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        createdAt: user.created_at
      },
      token
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while authenticating user.'
    });
  }
});

// GET /api/auth/me - Retrieve authenticated user session details from SQL Server
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('userId', sql.Int, req.user.user_id)
      .query('SELECT user_id, full_name, email, role, created_at FROM dbo.Users WHERE user_id = @userId');

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User account not found in database.'
      });
    }

    const user = result.recordset[0];
    return res.json({
      success: true,
      user: {
        userId: user.user_id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        createdAt: user.created_at
      }
    });

  } catch (err) {
    console.error('Fetch me error:', err);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving user profile from database.'
    });
  }
});

module.exports = router;
