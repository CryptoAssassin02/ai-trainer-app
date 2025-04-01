# Supabase API Setup Guide

This document explains how to properly set up your Supabase API credentials for different environments in the trAIner application.

## Security Notice

⚠️ **IMPORTANT**: Never commit your actual Supabase credentials to the Git repository. The `.env` files containing real credentials should always be ignored in Git.

## Development Environment Setup

### Backend Configuration

1. Navigate to your Supabase project dashboard
2. Go to Project Settings → API
3. Copy the following values:
   - Project URL
   - `anon` public key
   - `service_role` key (this has admin privileges, handle with care)

4. Open `backend/.env` and update the following variables:
   ```
   SUPABASE_URL=https://your-dev-project-id.supabase.co
   SUPABASE_ANON_KEY=your-actual-dev-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-actual-dev-service-key
   ```

### Frontend Configuration

1. Open `.env` in the project root and update the following variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-dev-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-dev-anon-key
   ```

## Production Environment Setup

For production, you should set environment variables in your deployment platform (e.g., Vercel, Netlify, etc.) rather than using .env files.

### Backend Production Variables

Set the following environment variables in your backend deployment platform:

```
NODE_ENV=production
SUPABASE_URL=https://your-prod-project-id.supabase.co
SUPABASE_ANON_KEY=your-prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-key
```

### Frontend Production Variables

Set the following environment variables in your frontend deployment platform:

```
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-prod-anon-key
```

## Row Level Security (RLS)

Remember that RLS behavior depends on the environment:

- **Development**: RLS is disabled for easier development
- **Production**: RLS is strictly enabled to protect user data

The application automatically handles these differences based on the `NODE_ENV` value.

## Testing Environment

For testing purposes, you can:

1. Use a separate Supabase project dedicated to testing
2. Use the development project with test-specific data
3. For CI/CD pipelines, set the appropriate testing credentials as environment variables

## Important Files

- `.env.example` - Template for required environment variables
- `.env` - Local development environment variables (not committed)
- `.env.production` - Reference for production variables (not committed)
- `backend/.env` - Backend-specific environment variables (not committed)
- `backend/.env.production` - Reference for backend production variables (not committed)

## Checking Configuration

To verify your configuration is working correctly:

1. For frontend: Run the development server and check authentication functions
2. For backend: Use the test endpoint to verify Supabase connection

```bash
# Frontend test (development server must be running)
curl http://localhost:3000/api/supabase-check

# Backend test
curl http://localhost:3001/api/v1/supabase-health
``` 