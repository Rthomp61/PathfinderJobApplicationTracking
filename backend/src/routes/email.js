import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
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

// Placeholder for OAuth connect (Day 2)
router.get('/connect', (req, res) => {
  res.status(501).json({
    message: 'Gmail OAuth integration coming in Day 2',
    implemented: false
  });
});

// Placeholder for manual sync (Day 2)
router.post('/sync', (req, res) => {
  res.status(501).json({
    message: 'Email sync coming in Day 2',
    implemented: false
  });
});

// Placeholder for disconnect
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
