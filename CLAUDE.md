# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

trAIner is an AI-powered fitness application that generates personalized workout plans and macro goals using an agent-based architecture. The app integrates OpenAI API and Perplexity AI to provide research-backed, personalized fitness recommendations with visible reasoning steps.

## Common Commands

### Development Environment
```bash
# Frontend development
npm run dev                    # Start Next.js development server
npm run build                  # Build for production
npm run start                  # Start production server
npm run lint                   # Run ESLint
npm run test                   # Run Jest tests
npm run test:watch             # Run tests in watch mode
npm run test:coverage          # Run tests with coverage report

# Backend development
npm run backend:start          # Start backend development server
npm run backend:test           # Run backend tests

# End-to-end testing
npm run e2e:setup              # Setup E2E testing environment
npm run e2e                    # Run Playwright E2E tests
npm run e2e:teardown           # Teardown E2E environment

# Integration testing
npm run test:integration       # Run integration tests
npm run test:backend-coverage  # Backend coverage with 80% threshold

# Health checks and validation
npm run health-check           # Validate environment setup
npm run openapi:validate       # Validate OpenAPI specification
```

### Backend-Specific Commands
```bash
cd backend
npm run dev                    # Start Node.js server with nodemon
npm run test                   # Run backend Jest tests
npm run migrate                # Run database migrations
npm run supabase:start         # Start local Supabase instance
npm run supabase:stop          # Stop local Supabase instance
npm run db:reset:local         # Reset local database
```

### Testing Commands
```bash
# Run specific test types
npm run test:env               # Run tests with specific environment
npm run test:security          # Run security tests
npm run test:vitest            # Run Vitest tests (alternative test runner)

# Single test execution
npm test -- --testPathPattern=specific-test-file
cd backend && npm test -- --testPathPattern=specific-backend-test
```

## Architecture Overview

### Frontend Architecture
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with custom dark theme (near-black backgrounds #121212, electric blue accents #3E9EFF)
- **UI Components**: Radix UI with shadcn/ui
- **State Management**: React Context API with React Query for server state
- **Authentication**: Supabase Auth with protected routes
- **Agent Visualization**: Custom components display AI reasoning steps and decision processes

### Backend Architecture
- **Runtime**: Node.js with Express
- **Database**: Supabase (PostgreSQL with vector storage capabilities)
- **AI Integration**: Agent-based architecture with specialized components:
  - **Research Agent**: Perplexity AI for exercise research
  - **Workout Generation Agent**: OpenAI API for plan creation
  - **Plan Adjustment Agent**: OpenAI API for modifications with reflection
  - **Nutrition Agent**: OpenAI API for macro calculations
  - **Agent Memory System**: Vector storage for user context and personalization

### Agent-Based Architecture Patterns
- **ReAct Pattern**: Step-by-step reasoning in workout generation
- **Reflection Pattern**: Understanding user feedback for intelligent adjustments
- **Memory Integration**: Supabase vector storage for context retrieval
- **Standardized API Interfaces**: Consistent communication across AI services

## Key Directories and Files

### Frontend Structure
```
app/                    # Next.js App Router pages
├── (dashboard)/       # Protected dashboard routes
├── auth/             # Authentication pages
├── api/              # API routes
components/           # React components
├── ai/               # AI reasoning visualization
├── profile/          # User profile forms and management
├── workout/          # Workout plan display and editing
├── ui/               # Reusable UI components
hooks/                # Custom React hooks
lib/                  # Utility functions and configurations
├── api/              # API client and React Query setup
├── supabase/         # Supabase client configuration
utils/                # Helper functions and AI integration
```

### Backend Structure
```
backend/
├── agents/           # AI agent implementations
│   ├── memory/       # Agent memory system
│   ├── adjustment-logic/ # Plan adjustment logic
├── controllers/      # Route controllers
├── routes/           # API endpoints
├── services/         # Business logic services
├── middleware/       # Authentication, validation, rate limiting
├── utils/            # Helper functions and prompts
├── supabase/         # Database migrations and schemas
└── tests/            # Comprehensive test suites
```

## Database Schema

### Key Tables
- **users**: Authentication via Supabase Auth
- **profiles**: User demographics, preferences, goals (JSONB for flexibility)
- **workout_plans**: Generated plans with AI reasoning and research insights
- **workout_logs**: User exercise tracking and progress
- **agent_memory**: Vector embeddings for AI personalization
- **analytics_events**: Usage tracking (with user consent)

### Important Notes
- RLS (Row Level Security) enabled in production, disabled in development
- Vector storage used for agent memory and context retrieval
- JSONB fields for flexible data structures (preferences, exercises, etc.)

## Environment Configuration

### Frontend (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_key (for client-side features)
```

### Backend (.env)
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
OPENAI_API_KEY=your_openai_key
PERPLEXITY_API_KEY=your_perplexity_key
NODE_ENV=development|production
```

## Testing Strategy

### Test Types and Coverage
- **Unit Tests**: Jest for individual components and functions
- **Integration Tests**: Full workflow testing with real database
- **Agent Testing**: Custom frameworks for AI output validation
- **E2E Tests**: Playwright for complete user journeys
- **Security Tests**: Authentication and data protection validation

### Coverage Requirements
- Backend: 80% statement, 70% branch, 80% functions, 80% lines
- Frontend: Comprehensive component and hook testing
- Agent Systems: Quality metrics and consistency validation

## Development Guidelines

### Code Style and Patterns
- **TypeScript**: Strongly typed throughout the application
- **Error Handling**: Comprehensive error boundaries and API error handling
- **Security**: No secrets in code, proper sanitization, rate limiting
- **AI Integration**: All AI calls go through standardized service layers
- **Agent Patterns**: Implement ReAct and Reflection patterns consistently

### Key Conventions
- Use existing Radix UI components rather than creating custom ones
- Follow the established agent architecture patterns for AI features
- Implement proper loading states and error handling for all AI operations
- Store agent reasoning and decision steps for user transparency
- Use the established API client patterns for consistent error handling

### Important Implementation Notes
- **Agent Memory**: Always check user context before generating plans
- **Unit Preferences**: Support both imperial and metric measurements
- **Mobile Optimization**: Mobile-first responsive design approach
- **Performance**: Lazy loading for heavy components, background processing for AI
- **Accessibility**: Full keyboard navigation and screen reader support

## API Documentation

Interactive OpenAPI documentation available at `/docs` endpoint in backend. The specification is maintained in `docs/openapi.yaml` and includes all endpoints, schemas, and response formats.

## Troubleshooting

### Common Issues
1. **Supabase Connection**: Check environment variables and RLS policies
2. **AI Service Failures**: Implement retry logic with exponential backoff
3. **Agent Memory**: Ensure vector embeddings are properly stored and retrieved
4. **Build Failures**: Check Node.js version compatibility (18+)
5. **Test Failures**: Verify mock services are properly configured

### Development vs Production
- Development: RLS disabled, detailed logging, mock AI responses available
- Production: RLS enabled, minimal logging, real AI service integration
- Use environment-specific configurations for database and AI services

This architecture supports the app's core mission of providing personalized, AI-driven fitness guidance while maintaining security, performance, and user trust through transparent AI reasoning.