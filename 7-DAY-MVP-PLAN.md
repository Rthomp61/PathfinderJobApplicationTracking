# 7-Day MVP Implementation Plan
## Pathfinder Email Parsing Integration

**Goal:** Launch auto job tracking via email parsing integrated into existing Pathfinder UI

**Target Launch:** Day 7 (February 26, 2026)

**Critical Constraint:** DO NOT redesign Pathfinder UI—only change how jobs are added

---

## Executive Summary

This plan builds an **email-to-pipeline automation** that:
1. Detects job confirmation emails
2. Extracts structured data with AI
3. Auto-creates job cards in existing Pathfinder tracker
4. Preserves all existing UI/UX

**Tech Stack:**
- Backend: Node.js + Express + PostgreSQL + OpenAI + Cron
- Frontend: React 19 + Vite (existing Pathfinder on Netlify)
- Email: Gmail API OAuth 2.0
- Enrichment: Axios + Cheerio scraper

---

## Day 1: Backend Foundation (Monday)

### Morning: Project Setup & Database
**Goal:** Working backend with database schema

- [ ] **Initialize backend project**
  ```bash
  mkdir pathfinder-email-backend
  cd pathfinder-email-backend
  npm init -y
  npm install express pg dotenv cors jsonwebtoken bcrypt axios cheerio openai node-cron
  npm install -D nodemon
  ```

- [ ] **Set up project structure**
  ```
  /backend
    /src
      /config       # DB, env config
      /models       # Sequelize/Prisma models
      /services     # Email, parsing, scraping
      /routes       # API endpoints
      /middleware   # Auth, validation
      /utils        # Helpers
    /migrations     # DB migrations
    server.js
  ```

- [ ] **Configure PostgreSQL database**
  - Create `pathfinder_db` database
  - Set up connection pooling
  - Create `.env` file with `DATABASE_URL`

### Afternoon: Database Schema
**Goal:** Complete schema for email parsing system

- [ ] **Create `applications` table**
  ```sql
  CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    company_name VARCHAR(255) NOT NULL,
    role_title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'Applied',
    source_url TEXT,
    job_description TEXT,
    location VARCHAR(255),
    salary VARCHAR(100),
    ingestion_source VARCHAR(20) DEFAULT 'email',
    parsing_confidence DECIMAL(3,2),
    raw_email_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
  ```

- [ ] **Create `email_connections` table**
  ```sql
  CREATE TABLE email_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    provider VARCHAR(50) DEFAULT 'gmail',
    access_token TEXT,
    refresh_token TEXT,
    token_expiry TIMESTAMP,
    last_sync TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

- [ ] **Create `raw_emails` table**
  ```sql
  CREATE TABLE raw_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    email_id VARCHAR(255) UNIQUE,
    subject TEXT,
    sender VARCHAR(255),
    body_html TEXT,
    body_text TEXT,
    received_at TIMESTAMP,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

- [ ] **Run migrations and seed test user**

### Evening: Basic API Structure
**Goal:** Express server with auth middleware

- [ ] **Set up Express server**
  - CORS configuration
  - Body parser
  - Error handling middleware
  - Health check endpoint: `GET /health`

- [ ] **Implement JWT authentication**
  - Login endpoint: `POST /auth/login`
  - Token verification middleware
  - User context injection

- [ ] **Create base API routes**
  ```
  GET  /api/applications
  POST /api/applications
  PATCH /api/applications/:id
  PATCH /api/applications/:id/status
  ```

**Day 1 Deliverable:** Backend server running with database schema and auth

---

## Day 2: Gmail OAuth & Email Sync (Tuesday)

### Morning: Gmail API Setup
**Goal:** OAuth flow working end-to-end

- [ ] **Configure Google Cloud Console**
  - Create new project: "Pathfinder Email Parser"
  - Enable Gmail API
  - Create OAuth 2.0 credentials (Web application)
  - Add authorized redirect URI: `http://localhost:3000/auth/gmail/callback`
  - Download credentials JSON

- [ ] **Build OAuth endpoints**
  ```javascript
  GET  /auth/gmail/connect
  GET  /auth/gmail/callback
  POST /auth/gmail/disconnect
  GET  /auth/gmail/status
  ```

- [ ] **Implement OAuth flow**
  - Generate authorization URL with scopes: `gmail.readonly`
  - Handle callback and exchange code for tokens
  - Store encrypted tokens in `email_connections` table
  - Test token refresh mechanism

### Afternoon: Email Fetching Service
**Goal:** Pull emails from Gmail inbox

- [ ] **Create `EmailSyncService`**
  ```javascript
  class EmailSyncService {
    async syncUserEmails(userId)
    async fetchRecentEmails(auth, query)
    async saveRawEmail(emailData)
    async markEmailProcessed(emailId)
  }
  ```

- [ ] **Implement Gmail search query**
  ```javascript
  const query = `
    (from:greenhouse.io OR from:lever.co OR from:workday.com
     OR from:indeed.com OR from:linkedin.com)
    AND (subject:application OR subject:applied OR subject:submitted)
    AND newer_than:30d
  `;
  ```

- [ ] **Fetch and store emails**
  - Get email headers (subject, from, date)
  - Get email body (HTML + plain text)
  - Store in `raw_emails` table
  - Track processed status

### Evening: Cron Job Setup
**Goal:** Automated email polling every 15 minutes

- [ ] **Create cron job**
  ```javascript
  const cron = require('node-cron');

  // Every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    const activeUsers = await getActiveEmailConnections();
    for (const user of activeUsers) {
      await EmailSyncService.syncUserEmails(user.id);
    }
  });
  ```

- [ ] **Add manual sync endpoint**
  ```javascript
  POST /email/sync  // Trigger immediate sync
  ```

- [ ] **Test end-to-end email fetch**

**Day 2 Deliverable:** Gmail emails syncing to database automatically

---

## Day 3: AI Email Parsing (Wednesday)

### Morning: OpenAI Integration
**Goal:** Extract structured job data from emails

- [ ] **Set up OpenAI client**
  ```javascript
  const OpenAI = require('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  ```

- [ ] **Design parsing prompt**
  ```javascript
  const SYSTEM_PROMPT = `
  You are a job application email parser. Extract the following fields from confirmation emails:

  - company_name: The hiring company (not the job board)
  - role_title: Job title or position
  - application_date: When applied (use email timestamp if not in body)
  - job_url: Link to job posting (if present)
  - ats_platform: Greenhouse, Lever, Workday, LinkedIn, Indeed, etc.

  Return valid JSON only. If a field is not found, use null.

  Example output:
  {
    "company_name": "Stripe",
    "role_title": "Software Engineer",
    "application_date": "2026-02-19",
    "job_url": "https://stripe.com/jobs/123",
    "ats_platform": "Greenhouse",
    "confidence": 0.95
  }
  `;
  ```

- [ ] **Create `EmailParsingService`**
  ```javascript
  class EmailParsingService {
    async parseEmail(emailBody, subject, sender)
    async calculateConfidence(parsedData)
    async detectDuplicates(userId, companyName, roleTitle)
  }
  ```

### Afternoon: Parsing Implementation
**Goal:** Convert emails to structured application records

- [ ] **Implement parsing logic**
  - Send email content to OpenAI API
  - Parse JSON response
  - Validate extracted fields
  - Calculate confidence score (0.0-1.0)
  - Handle parsing errors gracefully

- [ ] **Create application from parsed data**
  ```javascript
  async function createApplicationFromEmail(userId, rawEmailId, parsedData) {
    const application = await db.applications.create({
      user_id: userId,
      company_name: parsedData.company_name,
      role_title: parsedData.role_title,
      status: 'Applied',
      source_url: parsedData.job_url,
      ingestion_source: 'email',
      parsing_confidence: parsedData.confidence,
      raw_email_id: rawEmailId,
      created_at: parsedData.application_date || new Date()
    });
    return application;
  }
  ```

- [ ] **Add duplicate detection**
  - Check for existing application with same company + role
  - Within last 30 days
  - Skip if duplicate found

### Evening: Batch Processing
**Goal:** Process all unprocessed emails

- [ ] **Create processing pipeline**
  ```javascript
  async function processUnprocessedEmails() {
    const emails = await db.raw_emails.findAll({
      where: { processed: false }
    });

    for (const email of emails) {
      try {
        const parsed = await EmailParsingService.parseEmail(email);
        await createApplicationFromEmail(email.user_id, email.id, parsed);
        await db.raw_emails.update({ processed: true }, { where: { id: email.id } });
      } catch (error) {
        console.error('Parsing failed:', error);
        // Log error but continue processing
      }
    }
  }
  ```

- [ ] **Test with 20+ sample emails**
  - LinkedIn application confirmations
  - Greenhouse confirmations
  - Lever confirmations
  - Indeed confirmations
  - Measure accuracy rate (target >85%)

**Day 3 Deliverable:** AI parsing emails with >85% accuracy

---

## Day 4: Asynchronous Enrichment (Thursday)

### Morning: Web Scraping Service
**Goal:** Extract additional job details from URLs

- [ ] **Create `JobEnrichmentService`**
  ```javascript
  const axios = require('axios');
  const cheerio = require('cheerio');

  class JobEnrichmentService {
    async enrichApplication(applicationId, jobUrl)
    async scrapeJobPage(url)
    async extractDescription($)
    async extractLocation($)
    async extractSalary($)
  }
  ```

- [ ] **Implement scraping logic**
  - Fetch job page HTML
  - Parse with Cheerio
  - Extract description (meta tags, common selectors)
  - Extract location (structured data, selectors)
  - Extract salary if available

- [ ] **Add platform-specific scrapers**
  - LinkedIn scraper (different selectors)
  - Greenhouse scraper
  - Lever scraper
  - Generic fallback scraper

### Afternoon: Background Job Queue
**Goal:** Non-blocking enrichment processing

- [ ] **Set up simple job queue**
  ```javascript
  const enrichmentQueue = [];

  async function enqueueEnrichment(applicationId, jobUrl) {
    enrichmentQueue.push({ applicationId, jobUrl });
  }

  // Process queue every minute
  setInterval(async () => {
    while (enrichmentQueue.length > 0) {
      const job = enrichmentQueue.shift();
      await JobEnrichmentService.enrichApplication(job.applicationId, job.jobUrl);
    }
  }, 60000);
  ```

- [ ] **Update application after enrichment**
  ```javascript
  async function enrichApplication(applicationId, jobUrl) {
    const scrapedData = await scrapeJobPage(jobUrl);

    await db.applications.update({
      job_description: scrapedData.description,
      location: scrapedData.location,
      salary: scrapedData.salary
    }, { where: { id: applicationId } });
  }
  ```

### Evening: Integration with Parsing
**Goal:** Auto-enrich when URL available

- [ ] **Trigger enrichment after job creation**
  ```javascript
  async function createApplicationFromEmail(userId, rawEmailId, parsedData) {
    const application = await db.applications.create({ ... });

    // Enqueue enrichment if URL present
    if (parsedData.job_url) {
      await enqueueEnrichment(application.id, parsedData.job_url);
    }

    return application;
  }
  ```

- [ ] **Add rate limiting**
  - Max 1 request per second per domain
  - Respect robots.txt
  - Handle 429 errors gracefully

- [ ] **Test enrichment with real URLs**

**Day 4 Deliverable:** Automatic job enrichment from scraped URLs

---

## Day 5: Frontend Integration (Friday)

### Morning: API Client Setup
**Goal:** Connect Pathfinder frontend to new backend

- [ ] **Update Pathfinder API client**
  ```javascript
  // src/api/applications.js
  import axios from 'axios';

  const API_BASE = process.env.VITE_API_URL || 'http://localhost:3001';

  export const applicationsAPI = {
    getAll: () => axios.get(`${API_BASE}/api/applications`),
    create: (data) => axios.post(`${API_BASE}/api/applications`, data),
    update: (id, data) => axios.patch(`${API_BASE}/api/applications/${id}`, data),
    updateStatus: (id, status) => axios.patch(`${API_BASE}/api/applications/${id}/status`, { status }),
    triggerSync: () => axios.post(`${API_BASE}/email/sync`)
  };
  ```

- [ ] **Add email sync API**
  ```javascript
  export const emailAPI = {
    connectGmail: () => window.location.href = `${API_BASE}/auth/gmail/connect`,
    disconnect: () => axios.post(`${API_BASE}/auth/gmail/disconnect`),
    getStatus: () => axios.get(`${API_BASE}/auth/gmail/status`),
    triggerSync: () => axios.post(`${API_BASE}/email/sync`)
  };
  ```

### Afternoon: Dashboard Integration
**Goal:** Show auto-created jobs in existing pipeline

- [ ] **Update dashboard data fetching**
  ```javascript
  // Existing Pathfinder component
  const JobTrackerDashboard = () => {
    const [applications, setApplications] = useState([]);

    useEffect(() => {
      applicationsAPI.getAll().then(res => {
        setApplications(res.data);
      });
    }, []);

    // Existing drag-and-drop logic remains unchanged
    // Existing column rendering remains unchanged
  };
  ```

- [ ] **Add badge for auto-created jobs**
  ```javascript
  const JobCard = ({ job }) => (
    <div className="job-card">
      {job.ingestion_source === 'email' && (
        <span className="badge">Auto-added from email</span>
      )}
      <h3>{job.role_title}</h3>
      <p>{job.company_name}</p>
      {/* Existing card content */}
    </div>
  );
  ```

- [ ] **Test existing pipeline functionality**
  - Drag-and-drop still works
  - Status updates via API
  - Manual add modal still works

### Evening: Email Settings UI
**Goal:** User can connect/disconnect email

- [ ] **Create Settings → Email Integration page**
  ```javascript
  const EmailSettings = () => {
    const [status, setStatus] = useState(null);

    useEffect(() => {
      emailAPI.getStatus().then(res => setStatus(res.data));
    }, []);

    return (
      <div>
        <h2>Email Integration</h2>
        {!status?.connected ? (
          <button onClick={() => emailAPI.connectGmail()}>
            Connect Gmail
          </button>
        ) : (
          <>
            <p>✓ Email sync active</p>
            <p>Last sync: {status.last_sync}</p>
            <button onClick={() => emailAPI.disconnect()}>
              Disconnect
            </button>
          </>
        )}
      </div>
    );
  };
  ```

- [ ] **Add toast notifications**
  ```bash
  npm install sonner
  ```

  ```javascript
  import { toast } from 'sonner';

  // After email sync completes
  toast.success('New job application logged');
  ```

**Day 5 Deliverable:** Pathfinder UI showing auto-created jobs

---

## Day 6: Testing & Polish (Saturday)

### Morning: End-to-End Testing
**Goal:** Complete user journey works flawlessly

- [ ] **Test complete flow**
  1. User connects Gmail via settings
  2. OAuth flow completes successfully
  3. Cron job syncs emails (or trigger manually)
  4. Emails parsed by AI
  5. Jobs appear in "Applied" column
  6. Toast notification shown
  7. User can edit auto-created job
  8. Enrichment adds description/location

- [ ] **Test edge cases**
  - No email connected (show setup prompt)
  - Parsing fails (log error, don't crash)
  - Duplicate job detected (skip creation)
  - Scraper fails (job still created without enrichment)
  - Token expired (prompt reconnect)

### Afternoon: Data Quality Testing
**Goal:** Validate parsing accuracy at scale

- [ ] **Collect 50+ real confirmation emails**
  - 15+ LinkedIn
  - 10+ Greenhouse
  - 10+ Lever
  - 10+ Indeed
  - 5+ Workday

- [ ] **Run batch parsing test**
  ```javascript
  const results = await testParsingAccuracy(testEmails);
  console.log(`Accuracy: ${results.accuracy}%`);
  console.log(`Failures: ${results.failures}`);
  ```

- [ ] **Measure metrics**
  - Company name accuracy: >90%
  - Role title accuracy: >90%
  - Date accuracy: >95%
  - URL extraction: >60%
  - Overall confidence: >0.85

- [ ] **Fix common parsing failures**
  - Improve prompt with examples
  - Add fallback extraction logic
  - Handle edge case email formats

### Evening: UI/UX Polish
**Goal:** Smooth, professional user experience

- [ ] **Loading states**
  - Email sync in progress indicator
  - Skeleton loaders for dashboard
  - Spinner during OAuth flow

- [ ] **Error messages**
  - User-friendly error text
  - Actionable next steps
  - Link to support/docs

- [ ] **Responsive design**
  - Mobile-friendly email settings
  - Dashboard works on tablet
  - Toast notifications positioned correctly

- [ ] **Accessibility**
  - ARIA labels on buttons
  - Keyboard navigation for modals
  - Color contrast compliance

**Day 6 Deliverable:** Polished, tested MVP ready for staging

---

## Day 7: Deployment & Launch (Sunday)

### Morning: Staging Deployment
**Goal:** Backend and frontend live on staging

- [ ] **Deploy backend to Railway/Render**
  ```bash
  # Option 1: Railway
  railway init
  railway up

  # Option 2: Render
  # Connect GitHub repo
  # Set build command: npm install
  # Set start command: npm start
  ```

- [ ] **Configure production database**
  - Create PostgreSQL on Railway/Supabase
  - Run migrations on production DB
  - Set `DATABASE_URL` environment variable

- [ ] **Set environment variables**
  ```
  DATABASE_URL=postgresql://...
  OPENAI_API_KEY=sk-...
  GMAIL_CLIENT_ID=...
  GMAIL_CLIENT_SECRET=...
  JWT_SECRET=...
  FRONTEND_URL=https://pathfinder-staging.netlify.app
  ```

- [ ] **Update OAuth redirect URIs**
  - Add staging URLs to Google Cloud Console
  - Test OAuth flow on staging

- [ ] **Deploy frontend to Netlify**
  ```bash
  # Build with staging API URL
  VITE_API_URL=https://pathfinder-api-staging.railway.app npm run build

  # Deploy via Netlify CLI
  netlify deploy --prod
  ```

### Afternoon: Production Testing
**Goal:** Verify everything works in production

- [ ] **Smoke tests on staging**
  - [ ] Health check endpoint returns 200
  - [ ] User can log in
  - [ ] Email connect flow works
  - [ ] Manual sync triggers successfully
  - [ ] Cron job runs (check logs)
  - [ ] Parsing creates applications
  - [ ] Dashboard displays jobs
  - [ ] Drag-and-drop works
  - [ ] Manual add still works

- [ ] **Performance testing**
  - API response times <500ms
  - Email sync completes <30s for 50 emails
  - Frontend loads <2s

- [ ] **Security review**
  - HTTPS enforced
  - CORS configured correctly
  - Tokens encrypted
  - SQL injection prevention
  - XSS protection

### Evening: Launch & Monitoring
**Goal:** Live with pilot users

- [ ] **Invite 5-10 pilot users**
  - Send onboarding email with instructions
  - "Connect your Gmail to auto-track applications"
  - Link to settings page

- [ ] **Set up monitoring**
  - Error tracking (Sentry or LogRocket)
  - Uptime monitoring (UptimeRobot)
  - Database query logging
  - API usage metrics

- [ ] **Create support documentation**
  - How to connect email (with screenshots)
  - Privacy policy (what data is accessed)
  - Troubleshooting guide
  - FAQ

- [ ] **Monitor initial usage**
  - Check error logs every hour
  - Respond to user feedback immediately
  - Track success metrics:
    - Email connections: target 5+
    - Applications auto-created: target 20+
    - Parsing accuracy: target >85%

**Day 7 Deliverable:** Live production MVP with active users

---

## MVP Scope Checklist (P0 Only)

### Email Sync & Setup
- ✅ User can connect Gmail with OAuth
- ✅ Read-only email permissions
- ✅ User can revoke access
- ✅ System scans job-related emails only

### Automatic Job Creation
- ✅ System detects job confirmation emails
- ✅ AI extracts company name and role title
- ✅ Auto-creates job in "Applied" column
- ✅ User can edit all fields
- ✅ Badge shows "Auto-added from email"

### Dashboard Integration
- ✅ API fetches applications via Axios
- ✅ Jobs appear in existing pipeline
- ✅ Drag-and-drop unchanged
- ✅ Existing UI preserved

### Manual Fallback
- ✅ "+ Add Job" modal still works
- ✅ URL import remains available
- ✅ Manual creation as backup

---

## What's NOT in MVP

- ❌ Outlook/Yahoo email support (Gmail only)
- ❌ Real-time websockets (polling is fine)
- ❌ Application status tracking (interview emails)
- ❌ Browser extension capture
- ❌ ATS API integrations
- ❌ Advanced coach analytics
- ❌ Predictive insights

---

## Risk Mitigation

### Risk: Gmail API quota limits
**Mitigation:**
- Request quota increase from Google
- Implement exponential backoff
- Cache results to reduce API calls
- Batch process emails

### Risk: Low parsing accuracy
**Mitigation:**
- Test with 50+ real emails before launch
- Allow manual corrections
- Show confidence scores
- Improve prompt iteratively

### Risk: Scraper breaks on site changes
**Mitigation:**
- Enrichment is non-blocking (jobs still created)
- Fallback to manual entry
- Multiple scraper strategies per platform
- Monitor scraper success rates

### Risk: OAuth token expires
**Mitigation:**
- Auto-refresh tokens before expiry
- Graceful error handling
- Prompt user to reconnect
- Clear messaging in UI

### Risk: Duplicate applications created
**Mitigation:**
- Check company + role + date before creating
- Fuzzy matching for company names
- User can delete duplicates easily
- Improve detection logic post-launch

---

## Post-Launch Week 1 (Day 8-14)

### Immediate Priorities
1. **Monitor errors** - Fix critical bugs within 24h
2. **User feedback** - Survey pilot users daily
3. **Parsing improvements** - Analyze failed parses, update prompts
4. **Performance optimization** - Tune slow queries, cache aggressively
5. **Documentation** - Improve based on support questions

### Week 1 Goals
- Zero critical bugs
- >85% parsing accuracy maintained
- >70% user retention
- 50+ applications auto-tracked
- Positive user feedback

---

## Daily Time Estimates

| Day | Core Deliverable | Hours |
|-----|------------------|-------|
| Day 1 | Backend + Database + Auth | 8-10h |
| Day 2 | Gmail OAuth + Email Sync | 8-10h |
| Day 3 | AI Parsing Engine | 8-10h |
| Day 4 | Web Scraping Enrichment | 8-10h |
| Day 5 | Frontend Integration | 8-10h |
| Day 6 | Testing + Polish | 8-10h |
| Day 7 | Deployment + Launch | 6-8h |

**Total:** 60-70 hours over 7 days

---

## Tech Stack Summary

### Backend
- Node.js 20+ with Express
- PostgreSQL (applications, emails, connections)
- OpenAI API (email parsing)
- Gmail API (email access)
- Axios + Cheerio (web scraping)
- node-cron (scheduled jobs)
- JWT (authentication)

### Frontend (Existing Pathfinder)
- React 19 + Vite
- Netlify hosting
- Axios (API client)
- Sonner (toast notifications)
- **NO UI REDESIGN** - only new settings page

### Infrastructure
- Railway or Render (backend hosting)
- Netlify (frontend hosting)
- Supabase or Railway PostgreSQL
- Google Cloud (Gmail API)
- OpenAI (parsing)

---

## Success Criteria for Launch

- ✅ 5+ users connect email successfully
- ✅ >85% parsing accuracy on test set
- ✅ Auto-created jobs appear in dashboard
- ✅ Existing Pathfinder UI unchanged
- ✅ Manual add still works as fallback
- ✅ Zero critical bugs in core flows
- ✅ Cron job runs without manual intervention
- ✅ Privacy controls work (connect/disconnect)

---

## Key Product Principles (Guardrails)

1. **Do NOT redesign Pathfinder UI**
   - Dashboard columns stay the same
   - Drag-and-drop unchanged
   - "+ Add Job" modal preserved

2. **Email parsing guarantees minimum viable data**
   - Company + Role always extracted
   - Description/location optional (enriched later)
   - Jobs created even if enrichment fails

3. **Manual fallback always available**
   - "+ Add Job" still works
   - Users can edit auto-created jobs
   - System assists, doesn't replace

4. **Privacy-first approach**
   - Read-only email access
   - User controls connection
   - Clear data usage policy

---

**Remember:** This MVP integrates with existing Pathfinder, it doesn't replace it.

**Motto:** "Parse → Enrich → Confirm. Ship on Day 7."

**Focus:** P0 requirements only. Perfect is the enemy of done.
