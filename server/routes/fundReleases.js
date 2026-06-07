import express from 'express';
import { pool } from '../index.js';
import { verifyToken } from '../middleware/auth.js';
import { AppError, handleDbError } from '../utils/errors.js';

const router = express.Router();

// Get all fund releases for scheme
router.get('/scheme/:scheme_id', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT fr.*, fs.source_name FROM fund_releases fr
       JOIN fund_sources fs ON fr.fund_source_id = fs.id
       WHERE fr.scheme_id = $1 ORDER BY fr.release_date DESC`,
      [req.params.scheme_id]
    );
    
    // Get share breakdown for each release
    const releasesWithBreakdown = await Promise.all(
      result.rows.map(async (release) => {
        const breakdownResult = await pool.query(
          `SELECT fsb.*, fsh.head_name FROM fund_share_breakdown fsb
           JOIN fund_share_heads fsh ON fsb.fund_share_head_id = fsh.id
           WHERE fsb.fund_release_id = $1`,
          [release.id]
        );
        return { ...release, share_breakdown: breakdownResult.rows };
      })
    );
    
    res.json(releasesWithBreakdown);
  } catch (err) {
    next(err);
  }
});

// Get fund release by id
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT fr.*, fs.source_name FROM fund_releases fr
       JOIN fund_sources fs ON fr.fund_source_id = fs.id
       WHERE fr.id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Fund release not found', 404, 'NOT_FOUND');
    }
    
    const breakdownResult = await pool.query(
      `SELECT fsb.*, fsh.head_name FROM fund_share_breakdown fsb
       JOIN fund_share_heads fsh ON fsb.fund_share_head_id = fsh.id
       WHERE fsb.fund_release_id = $1`,
      [req.params.id]
    );
    
    res.json({ ...result.rows[0], share_breakdown: breakdownResult.rows });
  } catch (err) {
    next(err);
  }
});

// Record fund release with share breakdown
router.post('/', verifyToken, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { scheme_id, release_date, release_amount, fund_source_id, release_no, notes, share_breakdown } = req.body;
    
    if (!scheme_id || !release_date || !release_amount || !fund_source_id) {
      throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');
    }
    
    // Verify sum of shares equals release amount
    const totalShares = share_breakdown.reduce((sum, sb) => sum + parseFloat(sb.share_amount), 0);
    if (Math.abs(totalShares - parseFloat(release_amount)) > 0.01) {
      throw new AppError('Sum of shares must equal release amount', 400, 'INVALID_SHARE_SUM');
    }
    
    await client.query('BEGIN');
    
    const releaseResult = await client.query(
      `INSERT INTO fund_releases (scheme_id, release_date, release_amount, fund_source_id, release_no, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [scheme_id, release_date, release_amount, fund_source_id, release_no, notes]
    );
    
    const releaseId = releaseResult.rows[0].id;
    
    // Insert share breakdown
    for (const sb of share_breakdown) {
      await client.query(
        `INSERT INTO fund_share_breakdown (fund_release_id, fund_share_head_id, share_amount)
         VALUES ($1, $2, $3)`,
        [releaseId, sb.fund_share_head_id, sb.share_amount]
      );
    }
    
    // Create cashbook entry
    await client.query(
      `INSERT INTO cashbook (office_id, entry_date, entry_type, description, reference_id, reference_type, debit_amount, scheme_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [req.user.office_id, release_date, 'RECEIPT', `Fund Release - ${release_no}`, releaseId, 'fund_release', release_amount, scheme_id]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json(releaseResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(handleDbError(err));
  } finally {
    client.release();
  }
});

// Update fund release
router.put('/:id', verifyToken, async (req, res, next) => {
  try {
    const { release_date, release_no, notes } = req.body;
    
    const result = await pool.query(
      `UPDATE fund_releases SET release_date = COALESCE($1, release_date),
       release_no = COALESCE($2, release_no),
       notes = COALESCE($3, notes),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [release_date, release_no, notes, req.params.id]
    );
    
    if (result.rows.length === 0) {
      throw new AppError('Fund release not found', 404, 'NOT_FOUND');
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    next(handleDbError(err));
  }
});

export default router;
