import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Generate OAuth URL for user to authorize
export const getAuthUrl = () => {
  const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Request refresh token
    scope: scopes,
    prompt: 'consent' // Force consent screen to get refresh token
  });
};

// Exchange authorization code for tokens
export const getTokensFromCode = async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  } catch (error) {
    console.error('Error getting tokens from code:', error);
    throw new Error('Failed to exchange authorization code for tokens');
  }
};

// Set credentials for API calls
export const setCredentials = (tokens) => {
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
};

// Refresh access token using refresh token
export const refreshAccessToken = async (refreshToken) => {
  try {
    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw new Error('Failed to refresh access token');
  }
};

// Get Gmail API client
export const getGmailClient = (tokens) => {
  const auth = setCredentials(tokens);
  return google.gmail({ version: 'v1', auth });
};

// Fetch user's email address
export const getUserEmail = async (tokens) => {
  try {
    const gmail = getGmailClient(tokens);
    const profile = await gmail.users.getProfile({ userId: 'me' });
    return profile.data.emailAddress;
  } catch (error) {
    console.error('Error getting user email:', error);
    throw new Error('Failed to get user email');
  }
};

// Search for emails with query
export const searchEmails = async (tokens, query, maxResults = 50) => {
  try {
    const gmail = getGmailClient(tokens);

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: maxResults
    });

    return response.data.messages || [];
  } catch (error) {
    console.error('Error searching emails:', error);
    throw new Error('Failed to search emails');
  }
};

// Get full email message by ID
export const getEmailMessage = async (tokens, messageId) => {
  try {
    const gmail = getGmailClient(tokens);

    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    return response.data;
  } catch (error) {
    console.error('Error getting email message:', error);
    throw new Error('Failed to get email message');
  }
};

// Parse email headers
export const parseEmailHeaders = (headers) => {
  const headerMap = {};
  headers.forEach(header => {
    headerMap[header.name.toLowerCase()] = header.value;
  });
  return headerMap;
};

// Decode email body
export const decodeEmailBody = (part) => {
  if (!part.body.data) {
    return '';
  }

  const buff = Buffer.from(part.body.data, 'base64');
  return buff.toString('utf-8');
};

// Extract email body (text and HTML)
export const extractEmailBody = (payload) => {
  let textBody = '';
  let htmlBody = '';

  // Check if message has parts (multipart)
  if (payload.parts) {
    payload.parts.forEach(part => {
      if (part.mimeType === 'text/plain') {
        textBody += decodeEmailBody(part);
      } else if (part.mimeType === 'text/html') {
        htmlBody += decodeEmailBody(part);
      } else if (part.parts) {
        // Nested parts (multipart/alternative)
        part.parts.forEach(subPart => {
          if (subPart.mimeType === 'text/plain') {
            textBody += decodeEmailBody(subPart);
          } else if (subPart.mimeType === 'text/html') {
            htmlBody += decodeEmailBody(subPart);
          }
        });
      }
    });
  } else {
    // Single part message
    if (payload.mimeType === 'text/plain') {
      textBody = decodeEmailBody(payload);
    } else if (payload.mimeType === 'text/html') {
      htmlBody = decodeEmailBody(payload);
    }
  }

  return { textBody, htmlBody };
};

export default {
  getAuthUrl,
  getTokensFromCode,
  setCredentials,
  refreshAccessToken,
  getGmailClient,
  getUserEmail,
  searchEmails,
  getEmailMessage,
  parseEmailHeaders,
  extractEmailBody
};
