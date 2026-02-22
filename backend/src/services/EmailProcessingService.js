import { query } from '../config/database.js';
// DEMO VERSION: Using mock parser for demonstration
// FOR PRODUCTION: Replace with './AIParsingService.js' and use Pursuit's OpenAI API key
import { parseEmail, validateParsedData } from './MockAIParsingService.js';
import { getUnprocessedEmails, markEmailAsProcessed } from './EmailSyncService.js';

// Process a single email and create an application
export const processEmail = async (email) => {
  try {
    console.log(`Processing email ${email.id}: "${email.subject}"`);

    // Parse email with AI
    const parseResult = await parseEmail({
      subject: email.subject,
      sender_email: email.sender_email,
      body_text: email.body_text,
      body_html: email.body_html,
      received_date: email.received_date
    });

    if (!parseResult.success) {
      await markEmailAsProcessed(email.id, null, parseResult.error);
      return {
        success: false,
        error: parseResult.error
      };
    }

    const parsedData = parseResult.data;

    // Validate parsed data
    const validation = validateParsedData(parsedData);
    if (!validation.valid) {
      const errorMsg = `Validation failed: ${validation.errors.join(', ')}`;
      await markEmailAsProcessed(email.id, null, errorMsg);
      return {
        success: false,
        error: errorMsg
      };
    }

    // Check for duplicate applications (same company + position for this user)
    const duplicateCheck = await query(
      `SELECT id FROM applications
       WHERE user_id = $1
       AND LOWER(company_name) = LOWER($2)
       AND LOWER(position_title) = LOWER($3)
       LIMIT 1`,
      [email.user_id, parsedData.company_name, parsedData.position_title]
    );

    if (duplicateCheck.rows.length > 0) {
      console.log(`Duplicate application found, skipping...`);
      await markEmailAsProcessed(email.id, duplicateCheck.rows[0].id, 'Duplicate application');
      return {
        success: true,
        duplicate: true,
        applicationId: duplicateCheck.rows[0].id
      };
    }

    // Create new application
    const result = await query(
      `INSERT INTO applications (
        user_id, company_name, position_title, job_url, platform,
        status, applied_date, salary_range, location, job_type,
        source, email_message_id, confidence_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        email.user_id,
        parsedData.company_name,
        parsedData.position_title,
        parsedData.job_url,
        parsedData.platform,
        'applied',
        parsedData.applied_date || email.received_date,
        parsedData.salary_range,
        parsedData.location,
        parsedData.job_type,
        'email_auto',
        email.message_id,
        parsedData.confidence_score
      ]
    );

    const application = result.rows[0];
    console.log(`✅ Created application #${application.id}: ${parsedData.company_name} - ${parsedData.position_title}`);

    // Mark email as processed
    await markEmailAsProcessed(email.id, application.id, null);

    return {
      success: true,
      duplicate: false,
      application
    };
  } catch (error) {
    console.error('Error processing email:', error);
    await markEmailAsProcessed(email.id, null, error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Process all unprocessed emails for a user
export const processUnprocessedEmails = async (userId) => {
  try {
    console.log(`Processing unprocessed emails for user ${userId}...`);

    const emails = await getUnprocessedEmails(userId);

    if (emails.length === 0) {
      console.log('No unprocessed emails found');
      return {
        total: 0,
        processed: 0,
        created: 0,
        duplicates: 0,
        errors: 0
      };
    }

    console.log(`Found ${emails.length} unprocessed emails`);

    let created = 0;
    let duplicates = 0;
    let errors = 0;

    // Process emails sequentially to avoid rate limits
    for (const email of emails) {
      const result = await processEmail(email);

      if (result.success) {
        if (result.duplicate) {
          duplicates++;
        } else {
          created++;
        }
      } else {
        errors++;
      }

      // Small delay to avoid hitting OpenAI rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`Email processing complete: ${created} created, ${duplicates} duplicates, ${errors} errors`);

    return {
      total: emails.length,
      processed: emails.length,
      created,
      duplicates,
      errors
    };
  } catch (error) {
    console.error('Error processing emails:', error);
    throw error;
  }
};

export default {
  processEmail,
  processUnprocessedEmails
};
