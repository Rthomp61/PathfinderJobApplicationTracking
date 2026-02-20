# Backend Setup Guide

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database

## Option 1: Local PostgreSQL

### Install PostgreSQL (macOS)
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Create Database
```bash
createdb pathfinder_db
```

### Update `.env` file
```env
DATABASE_URL=postgresql://your_username@localhost:5432/pathfinder_db
```

## Option 2: Supabase (Free Cloud Database)

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Get your connection string from Settings > Database
4. Update `.env` file with the connection string

## Setup Steps

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Update `DATABASE_URL` with your PostgreSQL connection string
   - Keep other values as defaults for now (we'll update them in Day 2-3)

3. **Run database migrations**
   ```bash
   npm run migrate
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Test the server**
   - Open http://localhost:3001/health
   - You should see: `{"status":"healthy","timestamp":"...","database":"connected"}`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Applications
- `GET /api/applications` - Get all applications
- `GET /api/applications/:id` - Get single application
- `POST /api/applications` - Create application
- `PATCH /api/applications/:id` - Update application
- `DELETE /api/applications/:id` - Delete application

### Email (Coming in Day 2)
- `GET /api/email/status` - Check Gmail connection status
- `GET /api/email/connect` - Start OAuth flow
- `POST /api/email/sync` - Manually sync emails
- `DELETE /api/email/disconnect` - Disconnect Gmail

## Testing with curl

### Register a user
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Create an application (use token from login)
```bash
curl -X POST http://localhost:3001/api/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "company_name": "Google",
    "position_title": "Software Engineer",
    "job_url": "https://careers.google.com/jobs/123",
    "status": "applied"
  }'
```

## Troubleshooting

### Database connection errors
- Verify PostgreSQL is running: `brew services list`
- Check connection string in `.env`
- Test connection: `psql -d pathfinder_db`

### Port already in use
- Change `PORT` in `.env` to a different port (e.g., 3002)

### Module not found errors
- Run `npm install` again
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
