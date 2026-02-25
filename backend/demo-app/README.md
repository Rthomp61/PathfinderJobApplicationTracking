# Pathfinder Email Parser - Demo App

A beautiful demo interface to showcase the AI-powered email parser in action.

## Quick Start

1. **Start the backend** (if not already running):
   ```bash
   cd backend
   npm start
   ```

2. **Open the demo app**:
   ```bash
   cd demo-app
   open index.html
   ```

   Or simply double-click `index.html` to open in your browser.

## Features

### Dashboard Tab
- Real-time statistics (emails synced, AI parsed, applications created)
- Success rate tracking
- Recent activity feed
- Auto-refresh every 30 seconds

### Email Parser Demo Tab
- **Sync Gmail Emails** - Pull new emails from your Gmail
- **Parse Next Email** - Watch AI parse a single email in real-time
- **Parse All Unprocessed** - Batch process all emails
- Live parsing results with full job details

### Applications Tab
- View all tracked job applications
- Filter by status (Applied, Interviewing, Offer, Rejected)
- Company, position, location, and job URLs
- Application dates and metadata

## Demo Flow

1. **First Time Setup**:
   - Click "Sync Gmail Emails" to pull emails from your connected Gmail account
   - Wait for confirmation message

2. **Parse Emails**:
   - Click "Parse Next Email" to see AI analyze one email
   - Watch the parsing result appear with extracted job details
   - Click "Parse All Unprocessed" to batch process remaining emails

3. **View Applications**:
   - Switch to "Applications" tab to see all tracked jobs
   - Filter by status using the dropdown

## API Endpoints Used

- `GET /api/emails` - Fetch all synced emails
- `POST /api/emails/sync` - Sync new emails from Gmail
- `POST /api/emails/:id/parse` - Parse single email
- `POST /api/emails/parse-all` - Parse all unprocessed emails
- `GET /api/applications` - Fetch all applications

## Design

The demo app matches the Pathfinder dashboard design:
- Clean, modern interface
- Blue primary color (#2563eb)
- Card-based layout
- Responsive design
- Smooth animations

## Requirements

- Backend server running on `http://localhost:3000`
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for Gmail sync

## Troubleshooting

**"Network error" messages:**
- Make sure the backend is running on port 3000
- Check that you're authenticated (visit http://localhost:3000/auth/google)

**"No unprocessed emails":**
- Click "Sync Gmail Emails" first to pull new emails

**No applications showing:**
- Parse some emails first using "Parse Next Email" or "Parse All"
