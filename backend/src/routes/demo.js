import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// DEMO ONLY - No authentication required
// These endpoints are for the demo app only and should be removed in production

// Helper function to get user ID from email
async function getUserIdFromEmail(email) {
  // First try users table
  let result = await query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length > 0) {
    return result.rows[0].id;
  }

  // Try email_connections table
  result = await query(
    'SELECT user_id FROM email_connections WHERE email_address = $1',
    [email]
  );

  if (result.rows.length > 0) {
    return result.rows[0].user_id;
  }

  return null;
}

// Get all Pursuit students (for dropdown)
router.get('/students', async (req, res) => {
  try {
    const result = await query(
      `SELECT DISTINCT u.id, u.email, ec.email_address,
              COUNT(a.id) as application_count
       FROM users u
       LEFT JOIN email_connections ec ON u.id = ec.user_id
       LEFT JOIN applications a ON u.id = a.user_id
       WHERE u.email LIKE '%pursuit.org' OR ec.email_address LIKE '%pursuit.org'
       GROUP BY u.id, u.email, ec.email_address
       ORDER BY u.id`,
      []
    );

    res.json({
      students: result.rows.map(row => ({
        id: row.id,
        email: row.email_address || row.email,
        applicationCount: parseInt(row.application_count) || 0
      }))
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Failed to get students' });
  }
});

// Get emails for demo (by email parameter)
router.get('/emails', async (req, res) => {
  try {
    const userEmail = req.query.email;
    let userId;

    if (userEmail) {
      userId = await getUserIdFromEmail(userEmail);
      if (!userId) {
        return res.status(404).json({ error: 'Student email not found' });
      }
    } else {
      // Default to user ID 1 if no email provided
      userId = 1;
    }

    const result = await query(
      `SELECT id, subject, sender_email, sender_name, received_date, processed, processing_error, processed_at, created_at
       FROM raw_emails
       WHERE user_id = $1
       ORDER BY received_date DESC
       LIMIT 100`,
      [userId]
    );

    res.json({
      emails: result.rows,
      count: result.rows.length,
      userEmail: userEmail || null
    });
  } catch (error) {
    console.error('Get emails error:', error);
    res.status(500).json({ error: 'Failed to get emails' });
  }
});

// Sync emails for demo
router.post('/emails/sync', async (req, res) => {
  try {
    const userEmail = req.body.email || req.query.email;
    let userId;

    if (userEmail) {
      userId = await getUserIdFromEmail(userEmail);
      if (!userId) {
        return res.status(404).json({ error: 'Student email not found' });
      }
    } else {
      userId = 1; // Default user
    }

    // Get user's email connection
    const connectionResult = await query(
      'SELECT * FROM email_connections WHERE user_id = $1 AND sync_enabled = true',
      [userId]
    );

    if (connectionResult.rows.length === 0) {
      return res.status(400).json({ error: 'No email connection found. Please connect Gmail first.' });
    }

    const connection = connectionResult.rows[0];

    // Check if token needs refresh
    let tokens = {
      access_token: connection.access_token,
      refresh_token: connection.refresh_token
    };

    const { refreshAccessToken } = await import('../services/GmailService.js');
    const now = new Date();
    if (new Date(connection.token_expiry) <= now) {
      console.log('Token expired, refreshing...');
      tokens = await refreshAccessToken(connection.refresh_token);

      // Update tokens in database
      await query(
        'UPDATE email_connections SET access_token = $1, token_expiry = $2 WHERE user_id = $3',
        [tokens.access_token, new Date(Date.now() + tokens.expiry_date), userId]
      );
    }

    // Sync emails
    const { syncEmailsForUser } = await import('../services/EmailSyncService.js');
    const syncResult = await syncEmailsForUser(userId, tokens);

    res.json({
      message: 'Email sync completed',
      ...syncResult
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: error.message || 'Failed to sync emails' });
  }
});

// Parse single email for demo
router.post('/emails/:id/parse', async (req, res) => {
  try {
    const emailId = parseInt(req.params.id);

    // Get the email
    const emailResult = await query(
      'SELECT * FROM raw_emails WHERE id = $1 AND user_id = $2',
      [emailId, DEMO_USER_ID]
    );

    if (emailResult.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const email = emailResult.rows[0];

    // Process the email
    const { processEmail } = await import('../services/EmailProcessingService.js');
    const result = await processEmail(email);

    res.json({
      message: 'Email parsed successfully',
      ...result
    });
  } catch (error) {
    console.error('Parse email error:', error);
    res.status(500).json({ error: error.message || 'Failed to parse email' });
  }
});

// Parse all unprocessed emails for demo
router.post('/emails/parse-all', async (req, res) => {
  try {
    const userEmail = req.body.email || req.query.email;
    let userId;

    if (userEmail) {
      userId = await getUserIdFromEmail(userEmail);
      if (!userId) {
        return res.status(404).json({ error: 'Student email not found' });
      }
    } else {
      userId = 1; // Default user
    }

    const { processUnprocessedEmails } = await import('../services/EmailProcessingService.js');
    const result = await processUnprocessedEmails(userId);

    res.json({
      message: 'Email processing completed',
      ...result
    });
  } catch (error) {
    console.error('Process emails error:', error);
    res.status(500).json({ error: error.message || 'Failed to process emails' });
  }
});

// Get applications for demo
router.get('/applications', async (req, res) => {
  try {
    const userEmail = req.query.email;
    let userId;

    if (userEmail) {
      userId = await getUserIdFromEmail(userEmail);
      if (!userId) {
        return res.status(404).json({ error: 'Student email not found' });
      }
    } else {
      userId = 1; // Default user
    }

    const result = await query(
      `SELECT * FROM applications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      applications: result.rows,
      count: result.rows.length,
      userEmail: userEmail || null
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Failed to get applications' });
  }
});

export default router;
