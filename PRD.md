# PRODUCT REQUIREMENTS DOCUMENT

**Product:** Pathfinder Auto Job Application Tracking (Email Parsing Integration)
**Platform:** Pathfinder (React 19 + Vite on Netlify)
**Backend:** Node.js + Express + PostgreSQL + OpenAI + Cron
**Owner:** Brandon & Ray
**Date:** February 19, 2026

---

## 1. Product Overview

Pathfinder currently requires users to manually log job applications through a modal that relies on URL scraping to extract job details. This process is unreliable and frequently fails, forcing users to manually copy and paste job information, creating friction, incomplete records, and low tracker engagement.

The proposed solution introduces an **Email Parsing System** that automatically detects job confirmation emails, extracts structured job data, enriches missing information, and creates application entries directly in the existing Pathfinder job pipeline tracker.

**This preserves the current dashboard experience while eliminating manual data entry as the primary workflow.**

---

## 2. Problem Statement

Builders apply to jobs across platforms such as LinkedIn, Greenhouse, Lever, and Workday, but Pathfinder depends on manual job entry through a URL import modal that inconsistently scrapes job data. When scraping fails, users must manually fill out multiple fields including company, role, description, and contacts.

This repetitive administrative process reduces tracker adoption, creates incomplete datasets, and limits coach visibility into real job search activity. Additionally, confirmation emails already contain reliable signals that are currently unused, resulting in redundant manual logging of static application information.

---

## 3. Product Opportunity

Enable automatic job application tracking by converting confirmation emails into structured application records that populate directly inside the existing Pathfinder job pipeline. By leveraging passive email signals and asynchronous enrichment, Pathfinder can deliver a zero-friction tracking experience while maintaining data accuracy and improving coaching insights at scale.

---

## 4. Key UX Principle (Critical)

### The existing Pathfinder Job Tracker UI:
- Header → Job Tracker Dashboard
- **Columns:** Prospects, Applied, Interview, Offer, Accepted, Rejected, Withdrawn
- Drag-and-drop pipeline
- "+ Add Job" modal

### **WILL NOT be redesigned.**

The new system **ONLY** changes how job entries are created (intake automation), not how they are displayed or managed.

---

## 5. Current User Flow (Broken State)

1. User clicks **Job Tracker** in header
2. Dashboard loads pipeline columns
3. User clicks **"+ Add Job"**
4. Modal opens
5. User pastes job URL
6. Scraper inconsistently extracts data
7. User manually fills:
   - Company name
   - Role title
   - Description
   - Location
   - Contact info
8. User clicks "Add Application"

### Pain Points:
- ❌ Scraper failure rate is high
- ❌ Manual copying required
- ❌ Incomplete tracking
- ❌ High friction

---

## 6. Proposed Solution: Parse → Enrich → Confirm (Core Strategy)

### Overview
The system will not rely on emails to contain all job data. Instead, it will follow a **three-stage intelligent data capture model**.

### Stage 1: Parse (Primary Automation Layer) [P0]
When a confirmation email is detected:
- System extracts **high-confidence fields**:
  - Company name
  - Role title
  - Date applied (email timestamp)
  - Source URL (if present)
  - ATS platform (Greenhouse, Lever, etc.)
- A job card is **automatically created** in Pathfinder under the **Applied** column
- Card includes badge: **"Auto-added from email"**
- **This guarantees a usable record even if enrichment fails.**

### Stage 2: Enrich (Asynchronous Data Completion) [P1]
If a job URL is available:
- Backend scraper (Axios + Cheerio) runs asynchronously
- System attempts to populate:
  - Job description
  - Location
  - Salary (if listed)
  - Source type
- Existing scraper is reused but **moved to backend and non-blocking**
- **This removes scraper dependency from the modal workflow.**

### Stage 3: Confirm (User Review & Correction) [P1]
After auto-creation:
- Toast notification: **"New job application logged"**
- User can click to open pre-filled edit modal
- User can:
  - Correct fields
  - Add referral/contact info
  - Update missing details
- Low-confidence parses are flagged as **"Needs Review"**

---

## 7. System Architecture (Aligned With Existing Stack)

### Backend (Node + Express)
- Email Sync Service (OAuth inbox read)
- AI Parsing Service (OpenAI SDK)
- Enrichment Scraper (Axios + Cheerio)
- PostgreSQL (Job Application Table)
- Cron Jobs (email polling)
- JWT Authentication (user mapping)

### Frontend (Pathfinder – Netlify)
- React 19 + Vite
- Axios API integration
- Existing pipeline dashboard
- Existing modal (fallback + edit mode)
- Sonner/SweetAlert2 for notifications

---

## 8. Data Capture Reality (Important Product Constraint)

### High-Confidence Data from Emails
✅ Company name
✅ Role title
✅ Date applied
✅ Confirmation status
✅ ATS vendor

### Inconsistent Data
⚠️ Job URL (sometimes)
⚠️ Location (sometimes)

### Rarely Available
❌ Salary
❌ Full job description
❌ Recruiter contact info
❌ Internal referral details

### Therefore:
**📌 Email parsing guarantees minimum viable job cards, not complete records.**

---

## 9. Functional Requirements (By User Journey)

### User Journey 1: Email Sync & Setup
**Context:** Enables zero-friction tracking without changing user behavior.

- **[P0]** User can connect email account with read-only permissions
- **[P0]** System only scans job-related emails
- **[P0]** User can revoke access anytime
- **[P1]** User can see last sync timestamp
- **[P2]** User can customize tracking preferences

---

### User Journey 2: Automatic Job Creation (Core)

- **[P0]** System detects job confirmation emails
- **[P0]** System extracts company and role title
- **[P0]** System auto-creates job entry in Pathfinder
- **[P0]** New job defaults to "Applied" column
- **[P0]** User can edit all auto-filled fields
- **[P1]** System shows parsing confidence level
- **[P1]** Duplicate job detection logic implemented

---

### User Journey 3: Dashboard Integration (Pathfinder UI)

- **[P0]** Dashboard fetches applications via API (Axios)
- **[P0]** Auto-created jobs appear in existing pipeline columns
- **[P0]** Drag-and-drop functionality remains unchanged
- **[P1]** "Auto-added from email" badge on cards
- **[P1]** Last sync indicator displayed
- **[P2]** Real-time websocket updates (future)

---

### User Journey 4: Manual Fallback (Modal)

- **[P0]** User can still manually add job applications
- **[P0]** URL import remains as secondary fallback
- **[P1]** Modal pre-fills when auto-created job is edited
- **[P2]** Smart suggestions for missing fields

---

## 10. Database Requirements (New Fields)

### `applications` table must include:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID/INT | Primary key |
| `user_id` | UUID/INT | Foreign key to users |
| `company_name` | VARCHAR | Company name |
| `role_title` | VARCHAR | Job title |
| `status` | ENUM | Pipeline column (Prospects, Applied, Interview, etc.) |
| `source_url` | TEXT | Job posting URL |
| `job_description` | TEXT | Full job description |
| `location` | VARCHAR | Job location |
| `salary` | VARCHAR | Salary range |
| `ingestion_source` | ENUM | email / manual / url |
| `parsing_confidence` | FLOAT | 0.0 - 1.0 confidence score |
| `raw_email_id` | UUID/INT | Foreign key to raw emails |
| `created_at` | TIMESTAMP | Record creation time |

---

## 11. API Requirements (Frontend ↔ Backend)

### Required Endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/applications` | Fetch all applications for user |
| `POST` | `/applications` | Create application manually |
| `PATCH` | `/applications/:id` | Update application fields |
| `PATCH` | `/applications/:id/status` | Move to different pipeline column |
| `POST` | `/email/sync` | Trigger email sync |
| `GET` | `/email/sync-status` | Get last sync status |

---

## 12. Non-Goals (MVP Scope Control)

- ❌ Not replacing LinkedIn/Indeed job platforms
- ❌ Not auto-applying to jobs
- ❌ Not requiring users to change their email
- ❌ Not full ATS API integrations (Phase 2)
- ❌ Not redesigning the Pathfinder dashboard UI

---

## 13. Success Metrics

| Metric | Target |
|--------|--------|
| **Reduction in manual job entry** | 80% |
| **Parsing accuracy for core fields** | 90% |
| **Email sync adoption rate** | 70% |
| **Job Tracker WAU** | Increased |
| **Application record completeness** | Increased |

---

## 14. MVP Scope (Realistic Build Using Your Stack)

### ✅ Included:
- Email parsing engine
- Auto job creation
- Parse → Enrich → Confirm pipeline
- Pathfinder dashboard integration
- Editable job records

### ❌ Excluded (Later Phases):
- Browser extension capture
- ATS direct integrations
- Predictive coaching insights
- Advanced analytics dashboards

---

## 15. Key Product Insight (Strategic)

**This system does NOT replace your existing tracker.**

It transforms Pathfinder from:
- **Manual job logging tool**

into:
- **Passive, intelligent job tracking system**

using signals users already generate (confirmation emails) with minimal behavioral change.

---

## Appendix

### Technical Dependencies
- Gmail API / Outlook Graph API
- OpenAI API (GPT-4 for parsing)
- Axios + Cheerio (web scraping)
- PostgreSQL database
- Node.js cron scheduler

### Privacy & Security
- Read-only email access
- OAuth 2.0 authentication
- Encrypted token storage
- User can revoke access anytime
- No email content stored permanently

### Future Enhancements (Post-MVP)
- Outlook/Yahoo email support
- Chrome extension for direct job board capture
- ATS API integrations (Greenhouse, Lever, Workday)
- AI coaching recommendations
- Application response tracking
- Interview scheduling detection

---

**Last Updated:** February 19, 2026
