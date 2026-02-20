import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all applications for the authenticated user
router.get('/', async (req, res) => {
  try {
    const { status, source } = req.query;

    let queryText = 'SELECT * FROM applications WHERE user_id = $1';
    const params = [req.user.userId];

    // Add filters if provided
    if (status) {
      params.push(status);
      queryText += ` AND status = $${params.length}`;
    }

    if (source) {
      params.push(source);
      queryText += ` AND source = $${params.length}`;
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, params);

    res.json({
      applications: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get single application by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM applications WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ application: result.rows[0] });
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// Create new application (manual)
router.post('/', async (req, res) => {
  try {
    const {
      company_name,
      position_title,
      job_url,
      platform,
      status = 'applied',
      applied_date,
      salary_range,
      location,
      job_type
    } = req.body;

    if (!company_name || !position_title) {
      return res.status(400).json({ error: 'Company name and position title required' });
    }

    const result = await query(
      `INSERT INTO applications (
        user_id, company_name, position_title, job_url, platform,
        status, applied_date, salary_range, location, job_type, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'manual')
      RETURNING *`,
      [
        req.user.userId,
        company_name,
        position_title,
        job_url,
        platform,
        status,
        applied_date,
        salary_range,
        location,
        job_type
      ]
    );

    res.status(201).json({
      message: 'Application created successfully',
      application: result.rows[0]
    });
  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({ error: 'Failed to create application' });
  }
});

// Update application
router.patch('/:id', async (req, res) => {
  try {
    const allowedFields = [
      'company_name',
      'position_title',
      'job_url',
      'platform',
      'status',
      'applied_date',
      'salary_range',
      'location',
      'job_type',
      'job_description',
      'company_description',
      'requirements',
      'benefits'
    ];

    const updates = [];
    const values = [];
    let paramCount = 1;

    // Build dynamic UPDATE query
    for (const [key, value] of Object.entries(req.body)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(req.params.id, req.user.userId);

    const result = await query(
      `UPDATE applications
       SET ${updates.join(', ')}
       WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({
      message: 'Application updated successfully',
      application: result.rows[0]
    });
  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// Delete application
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM applications WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

export default router;
