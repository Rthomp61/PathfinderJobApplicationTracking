import pool from './src/config/database.js';

const reset = async () => {
  try {
    const result = await pool.query(
      'UPDATE raw_emails SET processed = false, processing_error = null, processed_at = null, parsed_application_id = null WHERE user_id = 1'
    );
    console.log(`✅ Reset ${result.rowCount} emails to unprocessed`);
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
};

reset();
