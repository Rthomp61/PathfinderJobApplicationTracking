import cron from 'node-cron';
import { query } from '../config/database.js';
import { syncEmailsForUser } from './EmailSyncService.js';
import { refreshAccessToken } from './GmailService.js';

// Auto-sync emails for all connected users every 15 minutes
export const startEmailSyncCron = () => {
  // Run every 15 minutes: */15 * * * *
  // For testing, you can use */2 * * * * (every 2 minutes)
  const cronSchedule = '*/15 * * * *';

  console.log(`📅 Starting email sync cron job (${cronSchedule})`);

  cron.schedule(cronSchedule, async () => {
    try {
      console.log('🔄 Running scheduled email sync...');

      // Get all users with active email connections
      const result = await query(
        'SELECT user_id, access_token, refresh_token, token_expiry FROM email_connections WHERE sync_enabled = true'
      );

      if (result.rows.length === 0) {
        console.log('No active email connections found');
        return;
      }

      console.log(`Found ${result.rows.length} active connections`);

      // Sync emails for each user
      for (const connection of result.rows) {
        try {
          let tokens = {
            access_token: connection.access_token,
            refresh_token: connection.refresh_token
          };

          // Check if token needs refresh
          const now = new Date();
          if (new Date(connection.token_expiry) <= now) {
            console.log(`Refreshing token for user ${connection.user_id}...`);
            tokens = await refreshAccessToken(connection.refresh_token);

            // Update tokens in database
            await query(
              'UPDATE email_connections SET access_token = $1, token_expiry = $2 WHERE user_id = $3',
              [tokens.access_token, new Date(Date.now() + tokens.expiry_date), connection.user_id]
            );
          }

          // Sync emails
          const syncResult = await syncEmailsForUser(connection.user_id, tokens);
          console.log(`✅ Synced for user ${connection.user_id}:`, syncResult);
        } catch (error) {
          console.error(`❌ Error syncing for user ${connection.user_id}:`, error.message);
        }
      }

      console.log('✨ Scheduled email sync complete');
    } catch (error) {
      console.error('❌ Cron job error:', error);
    }
  });

  console.log('✅ Email sync cron job started');
};

export default {
  startEmailSyncCron
};
