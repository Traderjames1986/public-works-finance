import express from 'express';
import { pool } from '../index.js';
import { verifyToken } from '../middleware/auth.js';
import { AppError, handleDbError } from '../utils/errors.js';

const router = express.Router();

// Get all transfers for scheme
router.get('/scheme/:scheme_id', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ft.*, fr.release_no FROM fund_transfers ft
       LEFT JOIN fund_releases fr ON ft.fund_release_id = fr.id
       WHERE ft.scheme_id = $1 ORDER BY ft.transfer_date DESC`,
      [req.params.scheme_id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Get transfer by id
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ft.*, fr.release_no FROM fund_transfers ft
       LEFT JOIN fund_releases fr ON ft.fund_release_id = fr.id
       WHERE ft.id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Transfer not found', 404, 'NOT_FOUND');
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Record fund transfer
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { scheme_id, transfer_date, from_account, to_account, transfer_amount, fund_release_id, transfer_mode, notes } = req.body;
    
    if (!scheme_id || !transfer_date || !transfer_amount) {
      throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');
    }
    
    const result = await pool.query(
      `INSERT INTO fund_transfers (scheme_id, transfer_date, from_account, to_account, transfer_amount, fund_release_id, transfer_mode, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [scheme_id, transfer_date, from_account, to_account, transfer_amount, fund_release_id, transfer_mode, notes]
    );
    
    // Create cashbook entry
    await pool.query(
      `INSERT INTO cashbook (office_id, entry_date, entry_type, description, reference_id, reference_type, credit_amount, scheme_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [req.user.office_id, transfer_date, 'TRANSFER', `Transfer to ${to_account}`, result.rows[0].id, 'transfer', transfer_amount, scheme_id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(handleDbError(err));
  }
});

// Update transfer
router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const { transfer_date, from_account, to_account, transfer_amount, transfer_mode, notes } = req.body;
    
    const result = await pool.query(
      `UPDATE fund_transfers SET transfer_date = COALESCE($1, transfer_date),
       from_account = COALESCE($2, from_account),
       to_account = COALESCE($3, to_account),
       transfer_amount = COALESCE($4, transfer_amount),
       transfer_mode = COALESCE($5, transfer_mode),
       notes = COALESCE($6, notes),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING *`,
      [transfer_date, from_account, to_account, transfer_amount, transfer_mode, notes, req.params.id]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Transfer not found', 404, 'NOT_FOUND');
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    next(handleDbError(err));
  }
});

// Delete transfer
router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM fund_transfers WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Transfer not found', 404, 'NOT_FOUND');
    }
    
    res.json({ message: 'Transfer deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
