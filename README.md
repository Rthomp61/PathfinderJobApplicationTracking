# Pathfinder Auto Job Application Tracking

> Transform passive email signals into automatic job application tracking—zero friction, maximum visibility.

---

## Overview

Pathfinder's email parsing integration automatically converts job confirmation emails into structured application records that populate directly into your existing job pipeline tracker.

**What Changes:** How jobs are added to your tracker
**What Stays:** Your entire existing dashboard, pipeline, and workflow

---

## The Problem

Current workflow is broken:
1. Apply to job on LinkedIn/Indeed/Greenhouse
2. Manually open Pathfinder
3. Click "+ Add Job"
4. Paste URL (scraper often fails)
5. Manually fill company, role, description, location
6. Repeat 50+ times per job search

**Result:** Incomplete tracking, low adoption, limited coach visibility

---

## The Solution: Parse → Enrich → Confirm

### Stage 1: Parse (Automatic)
- Email confirmation detected
- AI extracts: company, role, date, URL
- Job card auto-created in "Applied" column
- Badge: "Auto-added from email"

### Stage 2: Enrich (Asynchronous)
- Backend scraper runs if URL available
- Adds: description, location, salary
- Non-blocking, happens in background

### Stage 3: Confirm (Optional)
- Toast notification: "New job logged"
- User can edit/correct if needed
- Manual modal still available as fallback

---

## Key Features

### For Job Seekers
✅ **Zero-friction tracking** - Apply once, auto-logged
✅ **Email-based** - Works with existing job search behavior
✅ **Smart extraction** - AI pulls company, role, date automatically
✅ **Always editable** - Correct or enhance any field
✅ **Privacy-first** - Read-only email access, revoke anytime

### For Coaches
✅ **Real-time visibility** - See applications as they happen
✅ **Complete data** - More applications tracked accurately
✅ **Activity monitoring** - Identify low-activity builders
✅ **Trend analysis** - Aggregate insights across cohorts

---

## Technical Architecture

### Backend Stack
```
Node.js + Express
PostgreSQL (application data)
OpenAI API (email parsing)
Axios + Cheerio (web scraping)
Cron Jobs (email polling)
JWT Authentication
```

### Frontend Stack
```
React 19 + Vite
Netlify hosting
Axios (API integration)
Existing Pathfinder UI (unchanged)
Sonner/SweetAlert2 (notifications)
```

### Email Processing
```
Gmail API OAuth 2.0
Read-only inbox access
Cron-based polling
AI-powered extraction
Duplicate detection
```

---

## System Flow

```
1. User applies to job → Confirmation email sent
2. Cron job polls inbox → Detects job-related email
3. AI parser extracts → Company, role, date, URL
4. Auto-create in DB → Status: "Applied"
5. Frontend fetches → Displays in pipeline
6. [Optional] Scraper enriches → Description, location
7. [Optional] User edits → Corrects/enhances fields
```

---

## Database Schema

### `applications` Table

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to users |
| `company_name` | VARCHAR | Extracted company name |
| `role_title` | VARCHAR | Job title |
| `status` | ENUM | Pipeline column |
| `source_url` | TEXT | Job posting URL |
| `job_description` | TEXT | Full description (enriched) |
| `location` | VARCHAR | Job location (enriched) |
| `salary` | VARCHAR | Salary range (enriched) |
| `ingestion_source` | ENUM | email / manual / url |
| `parsing_confidence` | FLOAT | 0.0-1.0 AI confidence |
| `raw_email_id` | UUID | Link to raw email |
| `created_at` | TIMESTAMP | Creation time |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/applications` | Fetch user's applications |
| `POST` | `/applications` | Create manual application |
| `PATCH` | `/applications/:id` | Update application |
| `PATCH` | `/applications/:id/status` | Move pipeline column |
| `POST` | `/email/sync` | Trigger email sync |
| `GET` | `/email/sync-status` | Check last sync |

---

## What's Parsed from Emails

### High-Confidence (90%+ accuracy)
✅ Company name
✅ Role title
✅ Date applied
✅ ATS platform (Greenhouse, Lever, etc.)

### Sometimes Available
⚠️ Job URL (60-70%)
⚠️ Location (40-50%)

### Rarely in Emails
❌ Full job description
❌ Salary information
❌ Recruiter contact
❌ Referral details

**Note:** Enrichment stage fills gaps when URL available

---

## Success Metrics

| Goal | Target |
|------|--------|
| Manual entry reduction | 80% |
| Parsing accuracy | 90%+ |
| Email sync adoption | 70% |
| Weekly active users | Increase |
| Data completeness | Increase |

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Gmail API credentials
- OpenAI API key

### Installation
```bash
# Clone repository
git clone <repo-url>
cd pathfinder-email-parser

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Set up environment variables
cp .env.example .env
# Add: DATABASE_URL, OPENAI_API_KEY, GMAIL_CLIENT_ID, etc.

# Run database migrations
npm run migrate

# Start backend
cd backend
npm run dev

# Start frontend
cd frontend
npm run dev
```

### Configuration
```bash
# .env file
DATABASE_URL=postgresql://user:pass@localhost:5432/pathfinder
OPENAI_API_KEY=sk-...
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
JWT_SECRET=...
CRON_SCHEDULE=*/15 * * * *  # Every 15 minutes
```

---

## User Journeys

### 1. Email Setup (One-Time)
1. Navigate to Settings → Email Integration
2. Click "Connect Gmail"
3. OAuth consent screen appears
4. Grant read-only access
5. See confirmation: "Email sync active"

### 2. Automatic Tracking (Daily Use)
1. Apply to job on LinkedIn
2. Receive confirmation email
3. Cron job detects email (within 15 min)
4. AI extracts job data
5. Job appears in "Applied" column
6. Toast: "New application logged"

### 3. Manual Fallback (When Needed)
1. Click "+ Add Job"
2. Paste URL or fill manually
3. Same modal as before
4. Application created

### 4. Editing Auto-Created Jobs
1. Click job card in pipeline
2. Modal opens with pre-filled data
3. Edit any field
4. Save changes

---

## Privacy & Security

### Email Access
- **Read-only** permissions
- OAuth 2.0 authentication
- Tokens encrypted at rest
- Revoke access anytime

### Data Handling
- Only job-related emails processed
- No personal emails stored
- Raw emails purged after 30 days
- Parsed data retained indefinitely (user-owned)

### Compliance
- GDPR-compliant data handling
- User data export available
- Right to deletion honored
- Transparent privacy policy

---

## Roadmap

### MVP (Week 1-2)
- ✅ Gmail OAuth integration
- ✅ Email parsing engine
- ✅ Auto job creation
- ✅ Pathfinder UI integration
- ✅ Manual edit capability

### Phase 2 (Month 2)
- [ ] Outlook/Yahoo support
- [ ] Enhanced enrichment scraper
- [ ] Duplicate detection improvements
- [ ] Parsing confidence UI

### Phase 3 (Month 3+)
- [ ] Chrome extension capture
- [ ] ATS API integrations
- [ ] Application status tracking
- [ ] Interview detection
- [ ] Coach analytics dashboard

---

## Non-Goals (Scope Control)

**This MVP does NOT:**
- ❌ Replace job boards (LinkedIn, Indeed)
- ❌ Auto-apply to jobs
- ❌ Redesign Pathfinder UI
- ❌ Integrate with ATS APIs (Phase 2)
- ❌ Provide AI coaching (Phase 3)

---

## Contributing

### Development Workflow
1. Create feature branch
2. Write tests
3. Implement feature
4. Submit PR with description
5. Code review + approval
6. Merge to main

### Testing
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Integration tests
npm run test:integration
```

---

## Tech Stack Details

### Email Processing
- **Gmail API** - OAuth inbox access
- **Cron** - Scheduled polling (every 15 min)
- **OpenAI GPT-4** - Email content parsing
- **Confidence scoring** - 0.0-1.0 accuracy metric

### Web Scraping
- **Axios** - HTTP requests
- **Cheerio** - HTML parsing
- **Rate limiting** - Respectful scraping
- **Fallback logic** - Graceful failures

### Storage
- **PostgreSQL** - Relational data
- **Connection pooling** - Performance optimization
- **Migrations** - Schema version control
- **Backups** - Daily automated

---

## Troubleshooting

### Email sync not working
- Check OAuth token expiration
- Verify Gmail API quota
- Review cron job logs
- Test email detection regex

### Low parsing accuracy
- Review AI prompt engineering
- Check email format variations
- Add training examples
- Adjust confidence thresholds

### Scraper failures
- Verify URL accessibility
- Check rate limiting
- Update selectors for site changes
- Fallback to manual entry

---

## Support

**Questions?** Open an issue in GitHub
**Bugs?** Submit detailed bug report
**Features?** Discuss in Discussions tab

---

## Team

**Product Owners:** Brandon & Ray
**Target Users:** Pursuit Builders + Coaches

---

## License

*To be determined*

---

## Documentation

- [PRD.md](PRD.md) - Full Product Requirements
- [7-DAY-MVP-PLAN.md](7-DAY-MVP-PLAN.md) - Implementation Timeline
- API Docs - *Coming soon*
- User Guide - *Coming soon*

---

**Last Updated:** February 19, 2026

**Status:** 🚧 In Development
