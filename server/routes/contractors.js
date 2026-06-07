import express from 'express';
import { pool } from '../index.js';
import { verifyToken } from '../middleware/auth.js';
import { AppError, handleDbError } from '../utils/errors.js';

const router = express.Router();

// Get all contractors
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM contractors ORDER BY contractor_name'
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Get contractor by id
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM contractors WHERE id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Contractor not found', 404, 'NOT_FOUND');
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Create contractor
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { contractor_name, contact_person, email, phone, address, pan_no } = req.body;
    
    if (!contractor_name) {
      throw new AppError('Contractor name is required', 400, 'VALIDATION_ERROR');
    }
    
    const result = await pool.query(
      `INSERT INTO contractors (contractor_name, contact_person, email, phone, address, pan_no)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [contractor_name, contact_person, email, phone, address, pan_no]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(handleDbError(err));
  }
});

// Update contractor
router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const { contractor_name, contact_person, email, phone, address, pan_no } = req.body;
    
    const result = await pool.query(
      `UPDATE contractors SET contractor_name = COALESCE($1, contractor_name),
       contact_person = COALESCE($2, contact_person),
       email = COALESCE($3, email),
       phone = COALESCE($4, phone),
       address = COALESCE($5, address),
       pan_no = COALESCE($6, pan_no),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING *`,
      [contractor_name, contact_person, email, phone, address, pan_no, req.params.id]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Contractor not found', 404, 'NOT_FOUND');
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    next(handleDbError(err));
  }
});

// Delete contractor
router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM contractors WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Contractor not found', 404, 'NOT_FOUND');
    }
    
    res.json({ message: 'Contractor deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
