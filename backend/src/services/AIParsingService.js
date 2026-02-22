import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// System prompt for parsing job application emails
const SYSTEM_PROMPT = `You are an AI assistant that extracts job application details from confirmation emails.

Extract the following information from the email:
- company_name: The company name
- position_title: The job title/position
- job_url: Direct link to the job posting (if available)
- platform: The platform used (LinkedIn, Greenhouse, Lever, Workday, Indeed, etc.)
- applied_date: The date the application was submitted (YYYY-MM-DD format)
- location: Job location (city, state, or "Remote")
- job_type: full-time, part-time, contract, internship, etc.
- salary_range: Salary range if mentioned

IMPORTANT RULES:
1. Only extract information that is EXPLICITLY stated in the email
2. If a field is not found or unclear, set it to null
3. For company_name: Extract from sender domain or email body (e.g., "no-reply@block.xyz" → "Block")
4. For platform: Identify the ATS/platform (LinkedIn, Greenhouse, Lever, etc.) or set to null
5. For job_url: Only include if a direct link to the job posting exists
6. For applied_date: Use the email received date if application date isn't explicitly mentioned
7. Be conservative - don't guess or infer information not in the email

Respond ONLY with valid JSON matching this schema:
{
  "company_name": string,
  "position_title": string,
  "job_url": string | null,
  "platform": string | null,
  "applied_date": string | null,
  "location": string | null,
  "job_type": string | null,
  "salary_range": string | null,
  "confidence_score": number (0.0 to 1.0)
}

The confidence_score should reflect how certain you are about the extracted data (1.0 = very confident, 0.5 = moderately confident, 0.0 = not confident).`;

// Parse a single email using OpenAI
export const parseEmail = async (emailData) => {
  try {
    const { subject, sender_email, body_text, body_html, received_date } = emailData;

    // Prepare email content for AI
    const emailContent = `
Subject: ${subject}
From: ${sender_email}
Received: ${received_date}

Email Body:
${body_text || body_html?.substring(0, 5000) || 'No content'}
`.trim();

    console.log(`Parsing email: "${subject}"`);

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: emailContent }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Low temperature for consistent extraction
      max_tokens: 500
    });

    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);

    console.log('Parsed data:', parsed);

    return {
      success: true,
      data: parsed
    };
  } catch (error) {
    console.error('Error parsing email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Validate parsed data
export const validateParsedData = (data) => {
  const errors = [];

  if (!data.company_name) {
    errors.push('Missing company_name');
  }

  if (!data.position_title) {
    errors.push('Missing position_title');
  }

  // Check confidence score
  if (typeof data.confidence_score !== 'number' || data.confidence_score < 0 || data.confidence_score > 1) {
    errors.push('Invalid confidence_score');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// Calculate overall confidence
export const calculateConfidence = (data) => {
  let score = 0;
  let total = 0;

  // Required fields (higher weight)
  if (data.company_name) { score += 0.3; total += 0.3; } else { total += 0.3; }
  if (data.position_title) { score += 0.3; total += 0.3; } else { total += 0.3; }

  // Important fields (medium weight)
  if (data.job_url) { score += 0.15; total += 0.15; } else { total += 0.15; }
  if (data.platform) { score += 0.1; total += 0.1; } else { total += 0.1; }

  // Optional fields (lower weight)
  if (data.applied_date) { score += 0.05; total += 0.05; } else { total += 0.05; }
  if (data.location) { score += 0.05; total += 0.05; } else { total += 0.05; }
  if (data.job_type) { score += 0.03; total += 0.03; } else { total += 0.03; }
  if (data.salary_range) { score += 0.02; total += 0.02; } else { total += 0.02; }

  return total > 0 ? score / total : 0;
};

export default {
  parseEmail,
  validateParsedData,
  calculateConfidence
};
