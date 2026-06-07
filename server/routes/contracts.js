import express from 'express';
import { pool } from '../index.js';
import { verifyToken } from '../middleware/auth.js';
import { AppError, handleDbError } from '../utils/errors.js';

const router = express.Router();

// Get all contracts for scheme
router.get('/scheme/:scheme_id', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT c.*, co.contractor_name FROM contracts c
       JOIN contractors co ON c.contractor_id = co.id
       WHERE c.scheme_id = $1 ORDER BY c.created_at DESC`,
      [req.params.scheme_id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Get contract by id
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT c.*, co.contractor_name FROM contracts c
       JOIN contractors co ON c.contractor_id = co.id
       WHERE c.id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Contract not found', 404, 'NOT_FOUND');
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Create contract
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { contract_no, scheme_id, component_id, sub_component_id, contractor_id, contract_value, start_date, end_date } = req.body;
    
    if (!contract_no || !scheme_id || !component_id || !contractor_id) {
      throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');
    }
    
    const result = await pool.query(
      `INSERT INTO contracts (contract_no, scheme_id, component_id, sub_component_id, contractor_id, contract_value, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [contract_no, scheme_id, component_id, sub_component_id, contractor_id, contract_value, start_date, end_date]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(handleDbError(err));
  }
});

// Update contract
router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const { contract_value, start_date, end_date, status } = req.body;
    
    const result = await pool.query(
      `UPDATE contracts SET contract_value = COALESCE($1, contract_value),
       start_date = COALESCE($2, start_date),
       end_date = COALESCE($3, end_date),
       status = COALESCE($4, status),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [contract_value, start_date, end_date, status, req.params.id]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Contract not found', 404, 'NOT_FOUND');
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    next(handleDbError(err));
  }
});

// Delete contract
router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM contracts WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Contract not found', 404, 'NOT_FOUND');
    }
    
    res.json({ message: 'Contract deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
