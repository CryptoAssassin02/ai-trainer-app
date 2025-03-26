# trAIner Backend

This directory contains the backend implementation for the trAIner AI Fitness App.

## Tech Stack

- Node.js
- Supabase (Authentication & Database)
- OpenAI API (Workout Generation & Plan Adjustment)
- Perplexity AI (Exercise Research)

## Directory Structure

```
backend/
├── config/         # Configuration files
├── routes/         # API route handlers
├── controllers/    # Business logic
├── services/      # External service integrations
├── middleware/    # Custom middleware
└── utils/         # Utility functions
```

## Agent Architecture

The backend implements an agent-based architecture with the following components:

- Research Agent (Perplexity AI)
- Workout Generation Agent (OpenAI)
- Plan Adjustment Agent (OpenAI)
- Nutrition Agent (OpenAI)

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Fill in required API keys and configuration

3. Start the development server:
   ```bash
   npm run dev
   ```

## API Documentation

For detailed API documentation, refer to the API Reference Document in the project root.

## Testing

Run tests using:
```bash
npm test
```

## Security

- All endpoints require authentication via Supabase Auth
- Sensitive data is encrypted at rest
- API keys are securely stored in environment variables
