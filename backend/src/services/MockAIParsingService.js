/**
 * MOCK AI PARSING SERVICE - FOR DEMO PURPOSES ONLY
 *
 * This service simulates OpenAI GPT parsing for demonstration without API costs.
 *
 * FOR PRODUCTION:
 * Replace this with AIParsingService.js and use Pursuit's existing OpenAI API key.
 * Pursuit already has an OpenAI account - update .env with their API key:
 * OPENAI_API_KEY=sk-proj-[PURSUIT_API_KEY]
 *
 * Then change the import in EmailProcessingService.js from:
 * import { parseEmail } from './MockAIParsingService.js'
 * to:
 * import { parseEmail } from './AIParsingService.js'
 */

// Mock parser that extracts data from email using pattern matching
export const parseEmail = async (emailData) => {
  try {
    const { subject, sender_email, body_text, received_date } = emailData;

    console.log(`[MOCK] Parsing email: "${subject}"`);

    // Extract company name from sender email or subject
    let company_name = null;
    if (sender_email.includes('@')) {
      const domain = sender_email.split('@')[1];
      // Convert domain to company name (e.g., "block.xyz" -> "Block")
      company_name = domain.split('.')[0];
      company_name = company_name.charAt(0).toUpperCase() + company_name.slice(1);
    }

    // Extract from subject if company name is in there
    if (subject.toLowerCase().includes('success academy')) {
      company_name = 'Success Academy Charter Schools';
    } else if (subject.toLowerCase().includes('block')) {
      company_name = 'Block';
    }

    // Extract position from body text (simplified)
    let position_title = 'Position'; // Default
    const bodyLower = body_text?.toLowerCase() || '';

    // Look for common job title patterns
    if (bodyLower.includes('software engineer')) {
      position_title = 'Software Engineer';
    } else if (bodyLower.includes('teacher')) {
      position_title = 'Teacher';
    } else if (bodyLower.includes('developer')) {
      position_title = 'Developer';
    } else if (bodyLower.includes('analyst')) {
      position_title = 'Analyst';
    } else if (bodyLower.includes('manager')) {
      position_title = 'Manager';
    } else {
      // Extract from subject as fallback
      position_title = 'Application'; // Generic fallback
    }

    // Detect platform
    let platform = null;
    if (sender_email.includes('linkedin')) {
      platform = 'LinkedIn';
    } else if (sender_email.includes('greenhouse')) {
      platform = 'Greenhouse';
    } else if (sender_email.includes('lever')) {
      platform = 'Lever';
    } else if (sender_email.includes('workday')) {
      platform = 'Workday';
    } else if (sender_email.includes('indeed')) {
      platform = 'Indeed';
    }

    // Try to extract job URL from body
    let job_url = null;
    const urlMatch = body_text?.match(/https?:\/\/[^\s<>"]+/i);
    if (urlMatch) {
      job_url = urlMatch[0];
    }

    // Use received date as applied date
    const applied_date = new Date(received_date).toISOString().split('T')[0];

    // Mock confidence score (higher if we found more fields)
    let confidence = 0.5;
    if (company_name) confidence += 0.2;
    if (position_title !== 'Application') confidence += 0.2;
    if (job_url) confidence += 0.1;

    const parsed = {
      company_name,
      position_title,
      job_url,
      platform,
      applied_date,
      location: null, // Not easily extractable without AI
      job_type: null,
      salary_range: null,
      confidence_score: Math.min(confidence, 1.0)
    };

    console.log('[MOCK] Parsed data:', parsed);

    return {
      success: true,
      data: parsed
    };
  } catch (error) {
    console.error('[MOCK] Error parsing email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Same validation as real service
export const validateParsedData = (data) => {
  const errors = [];

  if (!data.company_name) {
    errors.push('Missing company_name');
  }

  if (!data.position_title) {
    errors.push('Missing position_title');
  }

  if (typeof data.confidence_score !== 'number' || data.confidence_score < 0 || data.confidence_score > 1) {
    errors.push('Invalid confidence_score');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// Same confidence calculation as real service
export const calculateConfidence = (data) => {
  let score = 0;
  let total = 0;

  if (data.company_name) { score += 0.3; total += 0.3; } else { total += 0.3; }
  if (data.position_title) { score += 0.3; total += 0.3; } else { total += 0.3; }
  if (data.job_url) { score += 0.15; total += 0.15; } else { total += 0.15; }
  if (data.platform) { score += 0.1; total += 0.1; } else { total += 0.1; }
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
