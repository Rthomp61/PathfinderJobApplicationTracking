import { query } from '../config/database.js';
import {
  searchEmails,
  getEmailMessage,
  parseEmailHeaders,
  extractEmailBody
} from './GmailService.js';

// Search query for job application confirmation emails
const JOB_EMAIL_QUERY = `
  (from:jobs@linkedin.com OR from:noreply@linkedin.com OR
   from:greenhouse.io OR from:lever.co OR from:workday.com OR
   from:indeed.com OR from:glassdoor.com OR
   subject:"application received" OR subject:"application confirmation" OR
   subject:"thank you for applying" OR subject:"application submitted")
  newer_than:30d
`.replace(/\s+/g, ' ').trim();

// Sync emails for a user
export const syncEmailsForUser = async (userId, tokens) => {
  try {
    console.log(`Starting email sync for user ${userId}...`);

    // Search for job confirmation emails
    const messages = await searchEmails(tokens, JOB_EMAIL_QUERY, 50);

    if (!messages || messages.length === 0) {
      console.log('No new job confirmation emails found');
      return {
        emailsFetched: 0,
        emailsStored: 0,
        emailsSkipped: 0
      };
    }

    console.log(`Found ${messages.length} potential job emails`);

    let stored = 0;
    let skipped = 0;

    // Process each email
    for (const message of messages) {
      try {
        // Check if email already exists
        const existing = await query(
          'SELECT id FROM raw_emails WHERE message_id = $1',
          [message.id]
        );

        if (existing.rows.length > 0) {
          skipped++;
          continue;
        }

        // Fetch full email message
        const fullMessage = await getEmailMessage(tokens, message.id);

        // Parse headers
        const headers = parseEmailHeaders(fullMessage.payload.headers);

        // Extract body
        const { textBody, htmlBody } = extractEmailBody(fullMessage.payload);

        // Parse date
        const receivedDate = new Date(parseInt(fullMessage.internalDate));

        // Store email in database
        await query(
          `INSERT INTO raw_emails
           (user_id, message_id, sender_email, sender_name, subject, received_date, body_text, body_html)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            userId,
            message.id,
            headers.from?.match(/<(.+?)>/)?.[1] || headers.from || 'unknown',
            headers.from?.match(/^(.+?)\s*</)?.[1] || headers.from || 'unknown',
            headers.subject || '(No subject)',
            receivedDate,
            textBody,
            htmlBody
          ]
        );

        stored++;
        console.log(`Stored email: ${headers.subject}`);
      } catch (error) {
        console.error(`Error processing email ${message.id}:`, error);
        skipped++;
      }
    }

    // Update last sync time
    await query(
      'UPDATE email_connections SET last_sync = NOW() WHERE user_id = $1',
      [userId]
    );

    console.log(`Email sync complete: ${stored} stored, ${skipped} skipped`);

    return {
      emailsFetched: messages.length,
      emailsStored: stored,
      emailsSkipped: skipped
    };
  } catch (error) {
    console.error('Email sync error:', error);
    throw error;
  }
};

// Get unprocessed emails for a user
export const getUnprocessedEmails = async (userId) => {
  try {
    const result = await query(
      'SELECT * FROM raw_emails WHERE user_id = $1 AND processed = false ORDER BY received_date DESC',
      [userId]
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting unprocessed emails:', error);
    throw error;
  }
};

// Mark email as processed
export const markEmailAsProcessed = async (emailId, applicationId = null, error = null) => {
  try {
    await query(
      `UPDATE raw_emails
       SET processed = true,
           processed_at = NOW(),
           parsed_application_id = $2,
           processing_error = $3
       WHERE id = $1`,
      [emailId, applicationId, error]
    );
  } catch (error) {
    console.error('Error marking email as processed:', error);
    throw error;
  }
};

export default {
  syncEmailsForUser,
  getUnprocessedEmails,
  markEmailAsProcessed
};
