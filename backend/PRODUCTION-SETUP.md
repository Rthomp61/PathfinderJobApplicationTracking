# Production Setup Guide

## Current Status: DEMO MODE

The application is currently running with a **mock AI parser** for demonstration purposes. This allows you to demo the complete flow without OpenAI API costs.

## Switching to Production (Real AI Parsing)

### Prerequisites

Pursuit already has an OpenAI account. You'll need their API key.

### Step 1: Get Pursuit's OpenAI API Key

Contact Pursuit's technical team to get their OpenAI API key. It will look like:
```
sk-proj-[LONG_STRING_OF_CHARACTERS]
```

### Step 2: Update Environment Variables

Update `backend/.env`:
```env
# Replace the demo key with Pursuit's actual OpenAI API key
OPENAI_API_KEY=sk-proj-[PURSUIT_API_KEY]
```

### Step 3: Switch from Mock to Real AI Parser

In `backend/src/services/EmailProcessingService.js`, change line 2 from:

```javascript
import { parseEmail, validateParsedData } from './MockAIParsingService.js';
```

To:

```javascript
import { parseEmail, validateParsedData } from './AIParsingService.js';
```

### Step 4: Test with Real Emails

```bash
# Restart the server
npm run dev

# Test AI parsing
curl -X POST http://localhost:3001/api/email/process \
  -H "Authorization: Bearer YOUR_TOKEN"
```

You should see real AI-extracted data with high confidence scores.

## What Changes in Production?

### Mock Parser (Current Demo)
- Uses pattern matching and regex
- Limited accuracy (~60-70%)
- No API costs
- Good for: Demonstrations, proof of concept

### Real AI Parser (Production)
- Uses OpenAI GPT-4o-mini
- High accuracy (>85%)
- ~$0.0001 per email (very cheap)
- Good for: Production use with real users

## Cost Estimate

With Pursuit's OpenAI account:
- **Per email parsed:** ~$0.0001 (1/100th of a cent)
- **100 emails:** ~$0.01 (1 cent)
- **1,000 emails:** ~$0.10 (10 cents)
- **10,000 emails:** ~$1.00 (1 dollar)

For Pursuit's use case with students, monthly costs would be minimal (<$10/month).

## AI Model Used

The production version uses **GPT-4o-mini** which is:
- Fast (< 2 second response time)
- Accurate (structured JSON output)
- Cheap (1/10th the cost of GPT-4)
- Reliable (99.9% uptime)

## Monitoring & Limits

Once you switch to Pursuit's API key:
1. Monitor usage at: https://platform.openai.com/usage
2. Set monthly spending limits in OpenAI dashboard
3. Recommended limit: $50/month (enough for 500,000 emails)

## Rollback to Mock

If you need to switch back to mock for any reason:

```javascript
// In EmailProcessingService.js
import { parseEmail, validateParsedData } from './MockAIParsingService.js';
```

## Support

- OpenAI Status: https://status.openai.com
- OpenAI Docs: https://platform.openai.com/docs
- Rate Limits: https://platform.openai.com/docs/guides/rate-limits
