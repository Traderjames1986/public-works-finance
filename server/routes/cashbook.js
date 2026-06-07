import express from 'express';
import { pool } from '../index.js';
import { verifyToken } from '../middleware/auth.js';
import { AppError, handleDbError } from '../utils/errors.js';

const router = express.Router();

// Get cashbook entries with optional filters
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const { start_date, end_date, scheme_id } = req.query;
    
    let query = 'SELECT * FROM cashbook WHERE office_id = $1';
    const params = [req.user.office_id];
    let paramCount = 1;
    
    if (start_date) {
      paramCount++;
      query += ` AND entry_date >= $${paramCount}`;
      params.push(start_date);
    }
    
    if (end_date) {
      paramCount++;
      query += ` AND entry_date <= $${paramCount}`;
      params.push(end_date);
    }
    
    if (scheme_id) {
      paramCount++;
      query += ` AND scheme_id = $${paramCount}`;
      params.push(scheme_id);
    }
    
    query += ' ORDER BY entry_date DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Get cashbook entry by id
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM cashbook WHERE id = $1 AND office_id = $2',
      [req.params.id, req.user.office_id]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Cashbook entry not found', 404, 'NOT_FOUND');
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Create cashbook entry (usually auto-created from payments/transfers)
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { entry_date, entry_type, description, reference_id, reference_type, debit_amount, credit_amount, scheme_id, notes } = req.body;
    
    if (!entry_date || !entry_type || !description) {
      throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');
    }
    
    const result = await pool.query(
      `INSERT INTO cashbook (office_id, entry_date, entry_type, description, reference_id, reference_type, debit_amount, credit_amount, scheme_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [req.user.office_id, entry_date, entry_type, description, reference_id, reference_type, debit_amount || 0, credit_amount || 0, scheme_id, notes]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(handleDbError(err));
  }
});

// Get monthly cashbook closings
router.get('/closings/list', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT cc.*, u.full_name FROM cashbook_closings cc
       LEFT JOIN users u ON cc.closed_by = u.id
       WHERE cc.office_id = $1 ORDER BY cc.closing_month DESC`,
      [req.user.office_id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Create monthly cashbook closing
router.post('/closings', verifyToken, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { closing_month, closing_balance, notes } = req.body;
    
    if (!closing_month || closing_balance === undefined) {
      throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');
    }
    
    await client.query('BEGIN');
    
    // Get opening balance
    const previousMonthResult = await client.query(
      `SELECT closing_balance FROM cashbook_closings
       WHERE office_id = $1 AND closing_month < $2
       ORDER BY closing_month DESC LIMIT 1`,
      [req.user.office_id, closing_month]
    );
    
    const openingBalance = previousMonthResult.rows.length > 0 ? previousMonthResult.rows[0].closing_balance : 0;
    
    // Calculate receipts and payments for the month
    const month = closing_month.substring(0, 7); // YYYY-MM format
    const receiptsResult = await client.query(
      `SELECT COALESCE(SUM(debit_amount), 0) as total FROM cashbook
       WHERE office_id = $1 AND entry_date LIKE $2 || '%'`,
      [req.user.office_id, month]
    );
    
    const paymentsResult = await client.query(
      `SELECT COALESCE(SUM(credit_amount), 0) as total FROM cashbook
       WHERE office_id = $1 AND entry_date LIKE $2 || '%'`,
      [req.user.office_id, month]
    );
    
    const totalReceipts = parseFloat(receiptsResult.rows[0].total);
    const totalPayments = parseFloat(paymentsResult.rows[0].total);
    
    const result = await client.query(
      `INSERT INTO cashbook_closings (office_id, closing_month, opening_balance, closing_balance, total_receipts, total_payments, notes, closed_by, closed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP) RETURNING *`,
      [req.user.office_id, closing_month, openingBalance, closing_balance, totalReceipts, totalPayments, notes, req.user.id]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(handleDbError(err));
  } finally {
    client.release();
  }
});

// Update cashbook entry
router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const { entry_date, description, debit_amount, credit_amount, notes } = req.body;
    
    const result = await pool.query(
      `UPDATE cashbook SET entry_date = COALESCE($1, entry_date),
       description = COALESCE($2, description),
       debit_amount = COALESCE($3, debit_amount),
       credit_amount = COALESCE($4, credit_amount),
       notes = COALESCE($5, notes),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND office_id = $7 RETURNING *`,
      [entry_date, description, debit_amount, credit_amount, notes, req.params.id, req.user.office_id]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Cashbook entry not found', 404, 'NOT_FOUND');
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    next(handleDbError(err));
  }
});

// Delete cashbook entry
router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM cashbook WHERE id = $1 AND office_id = $2 RETURNING id',
      [req.params.id, req.user.office_id]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Cashbook entry not found', 404, 'NOT_FOUND');
    }
    
    res.json({ message: 'Cashbook entry deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
