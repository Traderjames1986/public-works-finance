import express from 'express';
import { pool } from '../index.js';
import { verifyToken } from '../middleware/auth.js';
import { AppError, handleDbError } from '../utils/errors.js';
import { calculateGrossBill, calculateNetLiability } from '../utils/validation.js';

const router = express.Router();

// Get all bills for contract
router.get('/contract/:contract_id', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT cb.*, c.contract_no, co.contractor_name FROM contractor_bills cb
       JOIN contracts c ON cb.contract_id = c.id
       JOIN contractors co ON c.contractor_id = co.id
       WHERE cb.contract_id = $1 ORDER BY cb.bill_date DESC`,
      [req.params.contract_id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Get all bills for scheme
router.get('/scheme/:scheme_id', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT cb.*, c.contract_no, co.contractor_name, s.scheme_name FROM contractor_bills cb
       JOIN contracts c ON cb.contract_id = c.id
       JOIN contractors co ON c.contractor_id = co.id
       JOIN schemes s ON c.scheme_id = s.id
       WHERE c.scheme_id = $1 ORDER BY cb.bill_date DESC`,
      [req.params.scheme_id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Get bill by id
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT cb.*, c.contract_no, co.contractor_name FROM contractor_bills cb
       JOIN contracts c ON cb.contract_id = c.id
       JOIN contractors co ON c.contractor_id = co.id
       WHERE cb.id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Bill not found', 404, 'NOT_FOUND');
    }
    
    const adjustmentsResult = await pool.query(
      'SELECT * FROM bill_adjustments WHERE contractor_bill_id = $1',
      [req.params.id]
    );
    
    res.json({ ...result.rows[0], adjustments: adjustmentsResult.rows });
  } catch (err) {
    next(err);
  }
});

// Record contractor bill
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { contract_id, bill_date, bill_number, work_done_value, cgst_amount, sgst_amount, igst_amount, labour_cess_amount, adhoc_withheld, csc_temporary_withheld } = req.body;
    
    if (!contract_id || !bill_date || !bill_number || !work_done_value) {
      throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');
    }
    
    // Calculate gross bill and net liability
    const grossBill = calculateGrossBill(work_done_value, cgst_amount, sgst_amount, igst_amount, labour_cess_amount);
    const netLiability = calculateNetLiability(grossBill, adhoc_withheld, csc_temporary_withheld);
    
    const result = await pool.query(
      `INSERT INTO contractor_bills (contract_id, bill_date, bill_number, work_done_value, cgst_amount, sgst_amount, igst_amount, labour_cess_amount, gross_bill_amount, adhoc_withheld, csc_temporary_withheld, net_liability)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [contract_id, bill_date, bill_number, work_done_value, cgst_amount || 0, sgst_amount || 0, igst_amount || 0, labour_cess_amount || 0, grossBill, adhoc_withheld || 0, csc_temporary_withheld || 0, netLiability]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(handleDbError(err));
  }
});

// Update bill
router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const { bill_date, work_done_value, cgst_amount, sgst_amount, igst_amount, labour_cess_amount, adhoc_withheld, csc_temporary_withheld, bill_status } = req.body;
    
    // Get current bill to recalculate
    const currentResult = await pool.query('SELECT * FROM contractor_bills WHERE id = $1', [req.params.id]);
    
    if (currentResult.rows.length === 0) {
      throw new AppError('Bill not found', 404, 'NOT_FOUND');
    }
    
    const current = currentResult.rows[0];
    const newWorkDone = work_done_value !== undefined ? work_done_value : current.work_done_value;
    const newCgst = cgst_amount !== undefined ? cgst_amount : current.cgst_amount;
    const newSgst = sgst_amount !== undefined ? sgst_amount : current.sgst_amount;
    const newIgst = igst_amount !== undefined ? igst_amount : current.igst_amount;
    const newLabourCess = labour_cess_amount !== undefined ? labour_cess_amount : current.labour_cess_amount;
    const newAdhoc = adhoc_withheld !== undefined ? adhoc_withheld : current.adhoc_withheld;
    const newCsc = csc_temporary_withheld !== undefined ? csc_temporary_withheld : current.csc_temporary_withheld;
    
    const grossBill = calculateGrossBill(newWorkDone, newCgst, newSgst, newIgst, newLabourCess);
    const netLiability = calculateNetLiability(grossBill, newAdhoc, newCsc);
    
    const result = await pool.query(
      `UPDATE contractor_bills SET bill_date = COALESCE($1, bill_date),
       work_done_value = COALESCE($2, work_done_value),
       cgst_amount = $3,
       sgst_amount = $4,
       igst_amount = $5,
       labour_cess_amount = $6,
       gross_bill_amount = $7,
       adhoc_withheld = $8,
       csc_temporary_withheld = $9,
       net_liability = $10,
       bill_status = COALESCE($11, bill_status),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $12 RETURNING *`,
      [bill_date, newWorkDone, newCgst, newSgst, newIgst, newLabourCess, grossBill, newAdhoc, newCsc, netLiability, bill_status, req.params.id]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    next(handleDbError(err));
  }
});

// Delete bill
router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM contractor_bills WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Bill not found', 404, 'NOT_FOUND');
    }
    
    res.json({ message: 'Bill deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
