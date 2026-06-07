import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../index.js';
import { verifyToken } from '../middleware/auth.js';
import { validateEmail } from '../utils/validation.js';
import { AppError, handleDbError } from '../utils/errors.js';

const router = express.Router();

// Register
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password, full_name, role, office_id } = req.body;
    
    if (!username || !email || !password || !full_name || !role || !office_id) {
      throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');
    }
    
    if (!validateEmail(email)) {
      throw new AppError('Invalid email format', 400, 'INVALID_EMAIL');
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, full_name, role, office_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, full_name, role, office_id',
      [username, email, hashedPassword, full_name, role, office_id]
    );
    
    res.status(201).json({ message: 'User registered successfully', user: result.rows[0] });
  } catch (err) {
    next(handleDbError(err));
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      throw new AppError('Email and password required', 400, 'VALIDATION_ERROR');
    }
    
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }
    
    const user = result.rows[0];
    
    if (!user.is_active) {
      throw new AppError('Account is inactive', 401, 'ACCOUNT_INACTIVE');
    }
    
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, office_id: user.office_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
    
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, role: user.role, office_id: user.office_id } });
  } catch (err) {
    next(err);
  }
});

// Get current user
router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT id, username, email, full_name, role, office_id FROM users WHERE id = $1', [req.user.id]);
    
    if (result.rows.length === 0) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
