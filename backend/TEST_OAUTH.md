# Testing Gmail OAuth Integration

## Prerequisites

You need to be logged in to test the OAuth flow. First, login or use your existing token from earlier.

## Step 1: Get Your Auth Token

If you don't have it already, login again:

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@pathfinder.com","password":"demo123"}'
```

Copy the `token` from the response.

## Step 2: Get Gmail OAuth URL

Replace `YOUR_TOKEN` with your actual JWT token:

```bash
curl http://localhost:3001/api/email/connect \
  -H "Authorization: Bearer YOUR_TOKEN"
```

You'll get a response like:
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?access_type=offline...",
  "message": "Redirect user to this URL to authorize Gmail access"
}
```

## Step 3: Authorize Gmail Access

1. **Copy the `authUrl`** from the response
2. **Paste it in your browser**
3. **Sign in with your Pursuit email** (@pursuit.org)
4. **Click "Allow"** to grant Gmail read permissions
5. **You'll be redirected** to `http://localhost:5173/settings?gmail=connected`

(The frontend doesn't exist yet, but the backend will have stored your tokens!)

## Step 4: Verify Connection

Check your email connection status:

```bash
curl http://localhost:3001/api/email/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Should return:
```json
{
  "connected": true,
  "connection": {
    "email_address": "your@pursuit.org",
    "provider": "gmail",
    "last_sync": "2024-02-20...",
    "sync_enabled": true
  }
}
```

## Step 5: Manually Sync Emails

Trigger an immediate email sync:

```bash
curl -X POST http://localhost:3001/api/email/sync \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "message": "Email sync completed",
  "emailsFetched": 15,
  "emailsStored": 12,
  "emailsSkipped": 3
}
```

## Step 6: Check Raw Emails

You can query the database to see fetched emails:

```sql
SELECT id, subject, sender_email, received_date, processed
FROM raw_emails
WHERE user_id = 1
ORDER BY received_date DESC
LIMIT 10;
```

Or create an API endpoint to view them (coming in Day 3 with parsing).

## Automatic Sync

Once connected, the cron job will automatically sync emails every 15 minutes!

## Troubleshooting

### "No refresh token received"
- Google sometimes doesn't return a refresh token if you've already authorized
- **Fix:** Go to https://myaccount.google.com/permissions
- Remove "Pathfinder Email Parser" access
- Try the OAuth flow again

### "Token expired"
- The sync endpoint automatically refreshes expired tokens
- Manual sync will update the access token

### "No email connection found"
- Make sure you completed Step 3 (OAuth authorization)
- Check the email_connections table in your database
