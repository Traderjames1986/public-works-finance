import express from 'express';
import { pool } from '../index.js';
import { verifyToken } from '../middleware/auth.js';
import { AppError, handleDbError } from '../utils/errors.js';

const router = express.Router();

// Get all fund sources for office
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM fund_sources WHERE office_id = $1 AND is_active = true ORDER BY source_name',
      [req.user.office_id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Get fund source with heads
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const sourceResult = await pool.query(
      'SELECT * FROM fund_sources WHERE id = $1 AND office_id = $2',
      [req.params.id, req.user.office_id]
    );
    
    if (sourceResult.rows.length === 0) {
      throw new AppError('Fund source not found', 404, 'NOT_FOUND');
    }
    
    const headsResult = await pool.query(
      'SELECT * FROM fund_share_heads WHERE fund_source_id = $1 AND is_active = true',
      [req.params.id]
    );
    
    res.json({
      ...sourceResult.rows[0],
      heads: headsResult.rows
    });
  } catch (err) {
    next(err);
  }
});

// Create fund source
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { source_name, source_type } = req.body;
    
    if (!source_name || !source_type) {
      throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');
    }
    
    const result = await pool.query(
      `INSERT INTO fund_sources (office_id, source_name, source_type)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.user.office_id, source_name, source_type]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(handleDbError(err));
  }
});

// Create fund share head
router.post('/:id/heads', verifyToken, async (req, res, next) => {
  try {
    const { head_name } = req.body;
    
    if (!head_name) {
      throw new AppError('Head name is required', 400, 'VALIDATION_ERROR');
    }
    
    // Verify fund source exists
    const sourceCheck = await pool.query(
      'SELECT id FROM fund_sources WHERE id = $1 AND office_id = $2',
      [req.params.id, req.user.office_id]
    );
    
    if (sourceCheck.rows.length === 0) {
      throw new AppError('Fund source not found', 404, 'NOT_FOUND');
    }
    
    const result = await pool.query(
      `INSERT INTO fund_share_heads (office_id, head_name, fund_source_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.user.office_id, head_name, req.params.id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(handleDbError(err));
  }
});

// Update fund source
router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const { source_name, source_type, is_active } = req.body;
    
    const result = await pool.query(
      `UPDATE fund_sources SET source_name = COALESCE($1, source_name),
       source_type = COALESCE($2, source_type),
       is_active = COALESCE($3, is_active)
       WHERE id = $4 AND office_id = $5 RETURNING *`,
      [source_name, source_type, is_active, req.params.id, req.user.office_id]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Fund source not found', 404, 'NOT_FOUND');
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    next(handleDbError(err));
  }
});

// Delete fund source
router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM fund_sources WHERE id = $1 AND office_id = $2 RETURNING id',
      [req.params.id, req.user.office_id]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Fund source not found', 404, 'NOT_FOUND');
    }
    
    res.json({ message: 'Fund source deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
