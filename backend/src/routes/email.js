import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import {
  getAuthUrl,
  getTokensFromCode,
  getUserEmail,
  refreshAccessToken
} from '../services/GmailService.js';

const router = express.Router();

// OAuth callback doesn't require auth (comes from Google)
// Step 2: OAuth callback - exchange code for tokens
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).send('Authorization code missing');
    }

    // Decode state to get userId
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    const userId = stateData.userId;

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    if (!tokens.refresh_token) {
      return res.status(400).send('No refresh token received. Please revoke access in your Google account and try again.');
    }

    // Get user's email address
    const emailAddress = await getUserEmail(tokens);

    // Calculate token expiry
    const expiryDate = new Date(Date.now() + tokens.expiry_date);

    // Store tokens in database
    await query(
      `INSERT INTO email_connections
       (user_id, email_address, provider, access_token, refresh_token, token_expiry, last_sync)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         email_address = $2,
         access_token = $4,
         refresh_token = $5,
         token_expiry = $6,
         last_sync = NOW(),
         sync_enabled = true`,
      [userId, emailAddress, 'gmail', tokens.access_token, tokens.refresh_token, expiryDate]
    );

    // Show success message (frontend doesn't exist yet)
    res.send(`
      <html>
        <head><title>Gmail Connected</title></head>
        <body style="font-family: Arial; padding: 40px; text-align: center;">
          <h1 style="color: green;">✅ Gmail Connected Successfully!</h1>
          <p>Email: <strong>${emailAddress}</strong></p>
          <p>You can close this window and return to your application.</p>
          <p style="color: #666; margin-top: 40px;">Emails will now sync automatically every 15 minutes.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send(`
      <html>
        <head><title>Connection Error</title></head>
        <body style="font-family: Arial; padding: 40px; text-align: center;">
          <h1 style="color: red;">❌ Connection Failed</h1>
          <p>Error: ${error.message}</p>
          <p>Please try again.</p>
        </body>
      </html>
    `);
  }
});

// All other routes require authentication
router.use(authenticateToken);

// Get email connection status
router.get('/status', async (req, res) => {
  try {
    const result = await query(
      'SELECT email_address, provider, last_sync, sync_enabled FROM email_connections WHERE user_id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.json({ connected: false });
    }

    res.json({
      connected: true,
      connection: result.rows[0]
    });
  } catch (error) {
    console.error('Get email status error:', error);
    res.status(500).json({ error: 'Failed to get email status' });
  }
});

// Step 1: Initiate OAuth flow - redirect user to Google
router.get('/connect', async (req, res) => {
  try {
    // Check if user already has a connection
    const existing = await query(
      'SELECT id FROM email_connections WHERE user_id = $1',
      [req.user.userId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already connected. Disconnect first.' });
    }

    // Generate OAuth URL
    const authUrl = getAuthUrl();

    // Store user_id in session/state for callback (for now, we'll use query param)
    const stateParam = Buffer.from(JSON.stringify({ userId: req.user.userId })).toString('base64');
    const urlWithState = `${authUrl}&state=${stateParam}`;

    res.json({
      authUrl: urlWithState,
      message: 'Redirect user to this URL to authorize Gmail access'
    });
  } catch (error) {
    console.error('Connect error:', error);
    res.status(500).json({ error: 'Failed to initiate Gmail connection' });
  }
});

// Manual sync endpoint
router.post('/sync', async (req, res) => {
  try {
    // Get user's email connection
    const result = await query(
      'SELECT * FROM email_connections WHERE user_id = $1 AND sync_enabled = true',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'No email connection found. Please connect Gmail first.' });
    }

    const connection = result.rows[0];

    // Check if token needs refresh
    let tokens = {
      access_token: connection.access_token,
      refresh_token: connection.refresh_token
    };

    const now = new Date();
    if (new Date(connection.token_expiry) <= now) {
      console.log('Token expired, refreshing...');
      tokens = await refreshAccessToken(connection.refresh_token);

      // Update tokens in database
      await query(
        'UPDATE email_connections SET access_token = $1, token_expiry = $2 WHERE user_id = $3',
        [tokens.access_token, new Date(Date.now() + tokens.expiry_date), req.user.userId]
      );
    }

    // Import EmailSyncService (we'll create this next)
    const { syncEmailsForUser } = await import('../services/EmailSyncService.js');
    const syncResult = await syncEmailsForUser(req.user.userId, tokens);

    res.json({
      message: 'Email sync completed',
      ...syncResult
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Failed to sync emails' });
  }
});

// Get raw emails (for debugging/testing)
router.get('/emails', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, subject, sender_email, sender_name, received_date, processed, processing_error
       FROM raw_emails
       WHERE user_id = $1
       ORDER BY received_date DESC
       LIMIT 50`,
      [req.user.userId]
    );

    res.json({
      emails: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get emails error:', error);
    res.status(500).json({ error: 'Failed to get emails' });
  }
});

// Process unprocessed emails (AI parsing)
router.post('/process', async (req, res) => {
  try {
    const { processUnprocessedEmails } = await import('../services/EmailProcessingService.js');
    const result = await processUnprocessedEmails(req.user.userId);

    res.json({
      message: 'Email processing completed',
      ...result
    });
  } catch (error) {
    console.error('Process emails error:', error);
    res.status(500).json({ error: 'Failed to process emails' });
  }
});

// Disconnect Gmail
router.delete('/disconnect', async (req, res) => {
  try {
    await query('DELETE FROM email_connections WHERE user_id = $1', [req.user.userId]);
    res.json({ message: 'Email disconnected successfully' });
  } catch (error) {
    console.error('Disconnect email error:', error);
    res.status(500).json({ error: 'Failed to disconnect email' });
  }
});

export default router;
