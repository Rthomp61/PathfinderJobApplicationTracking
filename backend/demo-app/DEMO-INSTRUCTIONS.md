# Pathfinder Email Parser - Demo Instructions

## How to Use the Demo App

### Setup (One-time)
1. **Start the backend:**
   ```bash
   cd backend
   npm start
   ```
   Backend runs on: `http://localhost:3001`

2. **Open the demo app:**
   - Double-click `demo-app/index.html`
   - Or run: `open demo-app/index.html`

### Demo Flow

#### Step 1: Enter a Pursuit Student Email
At the top of the page, you'll see:
```
Enter Pursuit Student Email: [____________] [Load Student Data]
```

Type any Pursuit student email, for example:
- `raythompson@pursuit.org`
- `student@pursuit.org`

Then click "Load Student Data" or press Enter.

#### Step 2: View Dashboard
The dashboard will show:
- 📧 **Emails Synced** - Total emails from Gmail
- ✨ **AI Parsed** - Emails processed by AI
- 📝 **Applications** - Job applications created
- ⚡ **Success Rate** - Parsing accuracy

#### Step 3: Parse Emails (Email Parser Demo Tab)
Click the "Email Parser Demo" tab and:

1. **Sync Gmail Emails** - Pull new emails from the student's Gmail
2. **Parse Next Email** - Watch AI analyze one email in real-time
3. **Parse All Unprocessed** - Batch process all emails

You'll see live parsing results with:
- Company name
- Position
- Job type
- Location
- Application date
- Job URL

#### Step 4: View Applications (Applications Tab)
Click the "Applications" tab to see all job applications for the selected student.

Each card shows:
- Company & Position
- Status (Applied, Interviewing, Offer, Rejected)
- Application date
- Job type & location
- Link to job posting

### Demo Different Students

Simply enter a different email address and click "Load Student Data":
- Switch to `jane@pursuit.org`
- View John's applications: `john@pursuit.org`
- Each student has their own unique job tracking!

### Features to Highlight

1. **Multi-tenant** - Each student sees only their data
2. **Real-time parsing** - Watch AI extract job details
3. **Automatic tracking** - Applications created from emails
4. **Gmail integration** - Syncs emails every 15 minutes
5. **Beautiful UI** - Matches Pathfinder dashboard design

### Troubleshooting

**"Network error":**
- Make sure backend is running: `cd backend && npm start`
- Backend should be on port 3001

**"Student not found":**
- The email doesn't exist in the database yet
- Only students who have connected their Gmail will appear

**No emails showing:**
- Click "Sync Gmail Emails" first
- Make sure the student has connected their Gmail account

### Current Demo Data

To see which students are in the database, you can check:
```bash
# In backend directory
psql $DATABASE_URL -c "SELECT email, gmail_email FROM users;"
```

## Production Integration (Future)

This demo app is **presentation-only**. For production:
1. Get OpenAI API key from Pursuit
2. Integrate into main Pathfinder React app
3. Add proper authentication
4. Deploy with Pathfinder backend
5. Remove demo routes from `backend/src/routes/demo.js`
