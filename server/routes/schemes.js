import express from 'express';
import { pool } from '../index.js';
import { verifyToken } from '../middleware/auth.js';
import { AppError, handleDbError } from '../utils/errors.js';

const router = express.Router();

// Get all schemes for office
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM schemes WHERE office_id = $1 ORDER BY created_at DESC',
      [req.user.office_id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Get scheme details with components and contracts
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const schemeResult = await pool.query(
      'SELECT * FROM schemes WHERE id = $1 AND office_id = $2',
      [req.params.id, req.user.office_id]
    );
    
    if (schemeResult.rows.length === 0) {
      throw new AppError('Scheme not found', 404, 'NOT_FOUND');
    }
    
    const scheme = schemeResult.rows[0];
    
    const componentsResult = await pool.query(
      'SELECT * FROM components WHERE scheme_id = $1 ORDER BY created_at',
      [req.params.id]
    );
    
    const contractsResult = await pool.query(
      `SELECT c.*, co.contractor_name FROM contracts c
       JOIN contractors co ON c.contractor_id = co.id
       WHERE c.scheme_id = $1 ORDER BY c.created_at`,
      [req.params.id]
    );
    
    res.json({
      ...scheme,
      components: componentsResult.rows,
      contracts: contractsResult.rows
    });
  } catch (err) {
    next(err);
  }
});

// Create scheme
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { scheme_name, scheme_code, description, loan_no } = req.body;
    
    if (!scheme_name) {
      throw new AppError('Scheme name is required', 400, 'VALIDATION_ERROR');
    }
    
    const result = await pool.query(
      `INSERT INTO schemes (scheme_name, scheme_code, description, loan_no, office_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [scheme_name, scheme_code || null, description, loan_no || null, req.user.office_id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(handleDbError(err));
  }
});

// Update scheme
router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const { scheme_name, scheme_code, description, loan_no, status } = req.body;
    
    const result = await pool.query(
      `UPDATE schemes SET scheme_name = COALESCE($1, scheme_name),
       scheme_code = COALESCE($2, scheme_code),
       description = COALESCE($3, description),
       loan_no = COALESCE($4, loan_no),
       status = COALESCE($5, status),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND office_id = $7 RETURNING *`,
      [scheme_name, scheme_code, description, loan_no, status, req.params.id, req.user.office_id]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Scheme not found', 404, 'NOT_FOUND');
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    next(handleDbError(err));
  }
});

// Delete scheme
router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM schemes WHERE id = $1 AND office_id = $2 RETURNING id',
      [req.params.id, req.user.office_id]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Scheme not found', 404, 'NOT_FOUND');
    }
    
    res.json({ message: 'Scheme deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// Add component to scheme
router.post('/:scheme_id/components', verifyToken, async (req, res, next) => {
  try {
    const { component_name, description, budget_amount } = req.body;
    
    if (!component_name) {
      throw new AppError('Component name is required', 400, 'VALIDATION_ERROR');
    }
    
    // Verify scheme exists and belongs to office
    const schemeCheck = await pool.query(
      'SELECT id FROM schemes WHERE id = $1 AND office_id = $2',
      [req.params.scheme_id, req.user.office_id]
    );
    
    if (schemeCheck.rows.length === 0) {
      throw new AppError('Scheme not found', 404, 'NOT_FOUND');
    }
    
    const result = await pool.query(
      `INSERT INTO components (scheme_id, component_name, description, budget_amount)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.scheme_id, component_name, description, budget_amount]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(handleDbError(err));
  }
});

export default router;
