import express from 'express';
import { pool } from '../index.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Get summary for single scheme
router.get('/scheme-summary/:scheme_id', verifyToken, async (req, res, next) => {
  try {
    // Total fund received
    const fundReceivedResult = await pool.query(
      `SELECT COALESCE(SUM(release_amount), 0) as total FROM fund_releases WHERE scheme_id = $1`,
      [req.params.scheme_id]
    );
    
    // Total transferred
    const transferredResult = await pool.query(
      `SELECT COALESCE(SUM(transfer_amount), 0) as total FROM fund_transfers WHERE scheme_id = $1`,
      [req.params.scheme_id]
    );
    
    // Total bills
    const billsResult = await pool.query(
      `SELECT COALESCE(SUM(net_liability), 0) as total FROM contractor_bills cb
       JOIN contracts c ON cb.contract_id = c.id
       WHERE c.scheme_id = $1`,
      [req.params.scheme_id]
    );
    
    // Total payments
    const paymentsResult = await pool.query(
      `SELECT COALESCE(SUM(p.payment_amount), 0) as total FROM payments p
       JOIN contractor_bills cb ON p.contractor_bill_id = cb.id
       JOIN contracts c ON cb.contract_id = c.id
       WHERE c.scheme_id = $1`,
      [req.params.scheme_id]
    );
    
    const fundReceived = parseFloat(fundReceivedResult.rows[0].total);
    const transferred = parseFloat(transferredResult.rows[0].total);
    const bills = parseFloat(billsResult.rows[0].total);
    const payments = parseFloat(paymentsResult.rows[0].total);
    
    res.json({
      scheme_id: req.params.scheme_id,
      fund_received: fundReceived,
      fund_transferred: transferred,
      balance_in_hand: fundReceived - transferred,
      total_bills: bills,
      total_payments: payments,
      pending_payment: bills - payments
    });
  } catch (err) {
    next(err);
  }
});

// Get consolidated summary for all schemes
router.get('/consolidated-summary', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
        COALESCE(SUM(fr.release_amount), 0) as total_fund_received,
        COALESCE(SUM(ft.transfer_amount), 0) as total_transferred,
        COALESCE(SUM(cb.net_liability), 0) as total_bills,
        COALESCE(SUM(p.payment_amount), 0) as total_payments
       FROM schemes s
       LEFT JOIN fund_releases fr ON s.id = fr.scheme_id
       LEFT JOIN fund_transfers ft ON s.id = ft.scheme_id
       LEFT JOIN contracts c ON s.id = c.scheme_id
       LEFT JOIN contractor_bills cb ON c.id = cb.contract_id
       LEFT JOIN payments p ON cb.id = p.contractor_bill_id
       WHERE s.office_id = $1`,
      [req.user.office_id]
    );
    
    const row = result.rows[0];
    const fundReceived = parseFloat(row.total_fund_received);
    const transferred = parseFloat(row.total_transferred);
    const bills = parseFloat(row.total_bills);
    const payments = parseFloat(row.total_payments);
    
    res.json({
      total_fund_received: fundReceived,
      total_transferred: transferred,
      balance_in_hand: fundReceived - transferred,
      total_bills: bills,
      total_payments: payments,
      pending_payment: bills - payments
    });
  } catch (err) {
    next(err);
  }
});

// Get fund flow for scheme
router.get('/fund-flow/:scheme_id', verifyToken, async (req, res, next) => {
  try {
    const fundReleases = await pool.query(
      `SELECT fr.*, fs.source_name FROM fund_releases fr
       JOIN fund_sources fs ON fr.fund_source_id = fs.id
       WHERE fr.scheme_id = $1 ORDER BY fr.release_date DESC`,
      [req.params.scheme_id]
    );
    
    const transfers = await pool.query(
      `SELECT * FROM fund_transfers WHERE scheme_id = $1 ORDER BY transfer_date DESC`,
      [req.params.scheme_id]
    );
    
    const payments = await pool.query(
      `SELECT p.*, c.contract_no, co.contractor_name, fs.source_name FROM payments p
       JOIN contractor_bills cb ON p.contractor_bill_id = cb.id
       JOIN contracts c ON cb.contract_id = c.id
       JOIN contractors co ON c.contractor_id = co.id
       LEFT JOIN fund_sources fs ON p.fund_source_id = fs.id
       WHERE c.scheme_id = $1 ORDER BY p.payment_date DESC`,
      [req.params.scheme_id]
    );
    
    res.json({
      fund_releases: fundReleases.rows,
      transfers: transfers.rows,
      payments: payments.rows
    });
  } catch (err) {
    next(err);
  }
});

// Get payment analysis
router.get('/payment-analysis/:scheme_id', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
        p.id,
        c.contract_no,
        co.contractor_name,
        p.payment_date,
        p.payment_amount,
        fs.source_name,
        fsh.head_name,
        COALESCE(SUM(sd.deduction_amount), 0) as total_deductions
       FROM payments p
       JOIN contractor_bills cb ON p.contractor_bill_id = cb.id
       JOIN contracts c ON cb.contract_id = c.id
       JOIN contractors co ON c.contractor_id = co.id
       LEFT JOIN fund_sources fs ON p.fund_source_id = fs.id
       LEFT JOIN fund_share_heads fsh ON p.fund_share_head_id = fsh.id
       LEFT JOIN statutory_deductions sd ON p.id = sd.payment_id
       WHERE c.scheme_id = $1
       GROUP BY p.id, c.contract_no, co.contractor_name, p.payment_date, p.payment_amount, fs.source_name, fsh.head_name
       ORDER BY p.payment_date DESC`,
      [req.params.scheme_id]
    );
    
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

export default router;
