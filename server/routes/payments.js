import express from 'express';
import { pool } from '../index.js';
import { verifyToken } from '../middleware/auth.js';
import { AppError, handleDbError } from '../utils/errors.js';

const router = express.Router();

// Get all payments for bill
router.get('/bill/:bill_id', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT p.*, fs.source_name, fsh.head_name FROM payments p
       LEFT JOIN fund_sources fs ON p.fund_source_id = fs.id
       LEFT JOIN fund_share_heads fsh ON p.fund_share_head_id = fsh.id
       WHERE p.contractor_bill_id = $1 ORDER BY p.payment_date DESC`,
      [req.params.bill_id]
    );
    
    // Get deductions for each payment
    const paymentsWithDeductions = await Promise.all(
      result.rows.map(async (payment) => {
        const deductionsResult = await pool.query(
          'SELECT * FROM statutory_deductions WHERE payment_id = $1',
          [payment.id]
        );
        return { ...payment, deductions: deductionsResult.rows };
      })
    );
    
    res.json(paymentsWithDeductions);
  } catch (err) {
    next(err);
  }
});

// Get all payments for scheme
router.get('/scheme/:scheme_id', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.contract_no, co.contractor_name, fs.source_name, fsh.head_name FROM payments p
       JOIN contractor_bills cb ON p.contractor_bill_id = cb.id
       JOIN contracts c ON cb.contract_id = c.id
       JOIN contractors co ON c.contractor_id = co.id
       LEFT JOIN fund_sources fs ON p.fund_source_id = fs.id
       LEFT JOIN fund_share_heads fsh ON p.fund_share_head_id = fsh.id
       WHERE c.scheme_id = $1 ORDER BY p.payment_date DESC`,
      [req.params.scheme_id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Get payment by id
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT p.*, fs.source_name, fsh.head_name FROM payments p
       LEFT JOIN fund_sources fs ON p.fund_source_id = fs.id
       LEFT JOIN fund_share_heads fsh ON p.fund_share_head_id = fsh.id
       WHERE p.id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Payment not found', 404, 'NOT_FOUND');
    }
    
    const deductionsResult = await pool.query(
      'SELECT * FROM statutory_deductions WHERE payment_id = $1',
      [req.params.id]
    );
    
    res.json({ ...result.rows[0], deductions: deductionsResult.rows });
  } catch (err) {
    next(err);
  }
});

// Record payment with statutory deductions
router.post('/', verifyToken, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { contractor_bill_id, payment_date, payment_amount, payment_reference_no, payment_mode, fund_source_id, fund_share_head_id, is_installment, installment_no, total_installments, notes, statutory_deductions } = req.body;
    
    if (!contractor_bill_id || !payment_date || !payment_amount) {
      throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');
    }
    
    await client.query('BEGIN');
    
    const paymentResult = await client.query(
      `INSERT INTO payments (contractor_bill_id, payment_date, payment_amount, payment_reference_no, payment_mode, fund_source_id, fund_share_head_id, is_installment, installment_no, total_installments, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [contractor_bill_id, payment_date, payment_amount, payment_reference_no, payment_mode, fund_source_id, fund_share_head_id, is_installment || false, installment_no, total_installments, notes]
    );
    
    const paymentId = paymentResult.rows[0].id;
    
    // Insert statutory deductions
    if (statutory_deductions && statutory_deductions.length > 0) {
      for (const deduction of statutory_deductions) {
        await client.query(
          `INSERT INTO statutory_deductions (payment_id, deduction_type, deduction_amount, deduction_rate, reason)
           VALUES ($1, $2, $3, $4, $5)`,
          [paymentId, deduction.deduction_type, deduction.deduction_amount, deduction.deduction_rate, deduction.reason]
        );
      }
    }
    
    // Get bill and contract info for cashbook
    const billResult = await client.query(
      `SELECT cb.contract_id, c.scheme_id FROM contractor_bills cb
       JOIN contracts c ON cb.contract_id = c.id
       WHERE cb.id = $1`,
      [contractor_bill_id]
    );
    
    // Create cashbook entry
    await client.query(
      `INSERT INTO cashbook (office_id, entry_date, entry_type, description, reference_id, reference_type, credit_amount, scheme_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [req.user.office_id, payment_date, 'PAYMENT', `Payment - ${payment_reference_no || 'N/A'}`, paymentId, 'payment', payment_amount, billResult.rows[0].scheme_id]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json(paymentResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(handleDbError(err));
  } finally {
    client.release();
  }
});

// Update payment
router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const { payment_date, payment_amount, payment_reference_no, payment_mode, fund_source_id, fund_share_head_id, notes } = req.body;
    
    const result = await pool.query(
      `UPDATE payments SET payment_date = COALESCE($1, payment_date),
       payment_amount = COALESCE($2, payment_amount),
       payment_reference_no = COALESCE($3, payment_reference_no),
       payment_mode = COALESCE($4, payment_mode),
       fund_source_id = COALESCE($5, fund_source_id),
       fund_share_head_id = COALESCE($6, fund_share_head_id),
       notes = COALESCE($7, notes),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 RETURNING *`,
      [payment_date, payment_amount, payment_reference_no, payment_mode, fund_source_id, fund_share_head_id, notes, req.params.id]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Payment not found', 404, 'NOT_FOUND');
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    next(handleDbError(err));
  }
});

// Delete payment
router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM payments WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Payment not found', 404, 'NOT_FOUND');
    }
    
    res.json({ message: 'Payment deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
