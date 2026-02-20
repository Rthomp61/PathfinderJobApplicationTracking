import pool from './database.js';

const runMigrations = async () => {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting database migrations...');

    // Begin transaction
    await client.query('BEGIN');

    // Create users table (for authentication)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Users table created');

    // Create applications table (job applications)
    await client.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

        -- Core job details
        company_name VARCHAR(255) NOT NULL,
        position_title VARCHAR(255) NOT NULL,
        job_url TEXT,
        platform VARCHAR(100),

        -- Application details
        status VARCHAR(50) DEFAULT 'applied',
        applied_date DATE,
        salary_range VARCHAR(100),
        location VARCHAR(255),
        job_type VARCHAR(50),

        -- Tracking
        source VARCHAR(50) DEFAULT 'manual',
        email_message_id VARCHAR(255),
        confidence_score DECIMAL(3,2),

        -- Rich data from scraping
        job_description TEXT,
        company_description TEXT,
        requirements TEXT[],
        benefits TEXT[],

        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        -- Indexes for common queries
        CONSTRAINT unique_email_application UNIQUE(user_id, email_message_id)
      );
    `);
    console.log('✅ Applications table created');

    // Create email_connections table (OAuth tokens)
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_connections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        email_address VARCHAR(255) NOT NULL,
        provider VARCHAR(50) DEFAULT 'gmail',

        -- OAuth tokens
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        token_expiry TIMESTAMP,

        -- Sync status
        last_sync TIMESTAMP,
        sync_enabled BOOLEAN DEFAULT true,

        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Email connections table created');

    // Create raw_emails table (store unparsed emails)
    await client.query(`
      CREATE TABLE IF NOT EXISTS raw_emails (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        message_id VARCHAR(255) UNIQUE NOT NULL,

        -- Email metadata
        sender_email VARCHAR(255),
        sender_name VARCHAR(255),
        subject TEXT,
        received_date TIMESTAMP,

        -- Email content
        body_text TEXT,
        body_html TEXT,

        -- Processing status
        processed BOOLEAN DEFAULT false,
        processing_error TEXT,
        parsed_application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,

        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP
      );
    `);
    console.log('✅ Raw emails table created');

    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
      CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
      CREATE INDEX IF NOT EXISTS idx_applications_source ON applications(source);
      CREATE INDEX IF NOT EXISTS idx_raw_emails_user_id ON raw_emails(user_id);
      CREATE INDEX IF NOT EXISTS idx_raw_emails_processed ON raw_emails(processed);
      CREATE INDEX IF NOT EXISTS idx_raw_emails_message_id ON raw_emails(message_id);
    `);
    console.log('✅ Database indexes created');

    // Create updated_at trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Add triggers for updated_at
    await client.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
      CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_email_connections_updated_at ON email_connections;
      CREATE TRIGGER update_email_connections_updated_at BEFORE UPDATE ON email_connections
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('✅ Database triggers created');

    // Commit transaction
    await client.query('COMMIT');

    console.log('✨ All migrations completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

// Run migrations
runMigrations().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
