# trAIner Backend

> AI-powered fitness application backend with agent-based architecture for personalized workout plans, nutrition guidance, and progress tracking.

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running the Server](#running-the-server)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Development Workflow](#development-workflow)
- [Contributing](#contributing)

## Project Overview

The trAIner backend is a comprehensive Node.js application that powers an AI-driven fitness platform. It implements an agent-based architecture where specialized AI agents handle different aspects of fitness planning:

- **Personalized Workout Generation**: AI-powered workout plans based on user goals, equipment, and fitness level
- **Nutrition Planning**: Macro calculations and meal planning tailored to user needs
- **Progress Tracking**: Analytics and insights on workout performance and goal achievement
- **Real-time Adjustments**: Natural language plan modifications through AI agents

### Key Features

- 🤖 Agent-based AI architecture with specialized agents for different domains
- 🔐 Secure authentication via Supabase Auth with JWT tokens
- 📊 Real-time analytics and progress tracking
- 🏋️ Exercise database with 873+ exercises and safety validations
- 📱 Mobile-optimized API endpoints
- 📄 Comprehensive API documentation via Swagger UI
- 🔄 Data import/export functionality (CSV, XLSX, PDF)
- 🚀 Production-ready with Docker support

## Architecture

### Agent-Based System

The backend implements a sophisticated agent-based architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                       API Gateway                            │
│                    (Express Router)                          │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────────────┐
│                    Agent Orchestrator                        │
│              (Coordinates agent interactions)                │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────────────┐
│                        AI Agents                             │
├─────────────────────────────────────────────────────────────┤
│ • Research Agent (Perplexity AI)                            │
│   - Searches exercise research and best practices           │
│                                                             │
│ • Workout Generation Agent (OpenAI GPT-4)                   │
│   - Creates personalized workout plans                      │
│   - Implements ReAct pattern for reasoning                  │
│                                                             │
│ • Plan Adjustment Agent (OpenAI GPT-4)                      │
│   - Modifies plans based on natural language feedback       │
│   - Uses reflection pattern for understanding               │
│                                                             │
│ • Nutrition Agent (OpenAI GPT-4)                           │
│   - Calculates macros and creates meal plans               │
│                                                             │
│ • Analytics Agent (OpenAI GPT-4)                           │
│   - Provides insights and progress analysis                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────────────┐
│                    Data Layer                                │
├─────────────────────────────────────────────────────────────┤
│ • Supabase (PostgreSQL)                                     │
│   - User data, workout plans, logs                         │
│   - Row-level security (RLS)                               │
│                                                             │
│ • Agent Memory System                                       │
│   - Vector storage for personalization                      │
│   - User context and preferences                           │
│                                                             │
│ • Redis (Optional)                                          │
│   - Caching and session management                         │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
backend/
├── agents/           # AI agent implementations
│   ├── base-agent.js
│   ├── research-agent.js
│   ├── workout-generation-agent.js
│   ├── plan-adjustment-agent.js
│   ├── nutrition-agent.js
│   ├── analytics-agent.js
│   └── memory/      # Agent memory system
├── config/          # Configuration management
│   ├── env.js      # Environment variables
│   ├── index.js    # Config aggregator
│   └── logger.js   # Winston logger setup
├── controllers/     # Business logic controllers
├── middleware/      # Express middleware
│   ├── auth.js     # JWT authentication
│   ├── rateLimit.js # Rate limiting
│   └── security.js  # Security headers
├── routes/          # API route definitions
├── services/        # External service integrations
│   ├── openai-service.js
│   ├── perplexity-service.js
│   └── supabase.js
├── utils/           # Utility functions
├── tests/           # Test suites
└── supabase/        # Database migrations
```

## Technology Stack

### Core Technologies

- **Runtime**: Node.js 18+ (LTS)
- **Framework**: Express.js 4.18+
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth (JWT-based)

### AI Services

- **OpenAI API**: GPT-4 for workout generation, adjustments, nutrition, and analytics
- **Perplexity AI**: Exercise research and best practices

### Key Libraries

- **Security**: Helmet, CORS, bcrypt
- **Validation**: Joi for request validation
- **Documentation**: Swagger UI Express
- **Testing**: Jest, Supertest
- **Logging**: Winston
- **File Processing**: ExcelJS, PDFKit, Fast-CSV
- **Rate Limiting**: express-rate-limit

## Prerequisites

Before setting up the backend, ensure you have:

1. **Node.js 18+** installed
   ```bash
   node --version  # Should output v18.x.x or higher
   ```

2. **npm or yarn** package manager

3. **Supabase Account**
   - Sign up at [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and keys

4. **API Keys**
   - OpenAI API key from [platform.openai.com](https://platform.openai.com)
   - Perplexity API key from [perplexity.ai](https://perplexity.ai)

5. **Docker Desktop** (optional, for containerized development)
   - Download from [docker.com](https://docker.com)

## Setup Instructions

### Option 1: Local Development Setup

1. **Clone the repository and navigate to backend**
   ```bash
   git clone <repository-url>
   cd ai-trainer-app/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file from the template below
   touch .env
   # Edit .env with your credentials
   ```

4. **Run database migrations**
   ```bash
   npm run migrate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

### Option 2: Docker Development Setup

1. **Ensure Docker Desktop is running**

2. **Set up environment variables**
   ```bash
   # Create .env file (same as local setup)
   touch .env
   ```

3. **Build and start with Docker**
   ```bash
   npm run docker:build
   npm run docker:up
   ```

4. **View logs in another terminal**
   ```bash
   npm run docker:logs
   ```

**Note**: The Docker container exposes port 3001 by default, while local development uses port 8000. You can access the containerized application at `http://localhost:3001`.

## Environment Configuration

Create a `.env` file in the backend directory with the following variables:

```env
# Node Environment
NODE_ENV=development
PORT=8000

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PROJECT_REF=your-project-ref
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_PASSWORD=your-database-password

# Database Connection Components
DB_HOST=your-db-host.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres

# Pooler Connection Components
POOLER_HOST=your-pooler-host.supabase.co
POOLER_SESSION_PORT=5432
POOLER_TRANSACTION_PORT=6543
POOLER_USER=postgres.your-project-ref

# Connection Strings (get from Supabase dashboard)
DATABASE_URL=postgresql://postgres.your-project-ref:[YOUR-PASSWORD]@your-db-host.supabase.co:5432/postgres
DATABASE_URL_SERVICE_ROLE=postgresql://postgres.your-project-ref:[YOUR-PASSWORD]@your-db-host.supabase.co:5432/postgres
DATABASE_URL_POOLER_SESSION=postgresql://postgres.your-project-ref:[YOUR-PASSWORD]@your-pooler-host.supabase.co:5432/postgres
DATABASE_URL_POOLER_TRANSACTION=postgresql://postgres.your-project-ref:[YOUR-PASSWORD]@your-pooler-host.supabase.co:6543/postgres

# AI Services
OPENAI_API_KEY=sk-your-openai-api-key
PERPLEXITY_API_KEY=pplx-your-perplexity-api-key

# Security
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100

# CORS
CORS_ORIGIN=http://localhost:3000

# API Documentation
ENABLE_DOCS_IN_PRODUCTION=false
API_DOCS_USERNAME=admin
API_DOCS_PASSWORD=change_me_in_production

# Optional
DB_IP_ADDRESS=
CONNECTION_TIMEOUT=30000
```

### Getting Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to **Settings** > **API**
3. Copy:
   - Project URL → `SUPABASE_URL`
   - anon public key → `SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`
4. Navigate to **Settings** > **Database**
5. Copy the connection strings for all DATABASE_URL variables

## Database Setup

### Running Migrations

The backend uses a robust migration system to manage database schema:

```bash
# Run all pending migrations
npm run migrate

# Check migration status
npm run migrate -- --status

# List available migrations
npm run migrate -- --list

# Dry run (preview without applying)
npm run migrate -- --dry-run

# Run specific migration
npm run migrate -- --file 0001_create_user_profiles.sql

# Test database connectivity
npm run migrate -- --connection-test
```

### Database Schema

The database includes the following core tables:

- `user_profiles` - User demographics and preferences
- `workout_plans` - AI-generated workout plans
- `workout_logs` - Completed workout tracking
- `nutrition_plans` - Macro calculations and meal plans
- `meal_logs` - Food intake tracking
- `agent_memory` - AI agent context storage
- `analytics_events` - User activity tracking
- `user_check_ins` - Progress check-ins

All tables implement Row-Level Security (RLS) for data isolation.

## Running the Server

### Development Mode

```bash
# With hot-reloading via nodemon
npm run dev

# Server will start on http://localhost:8000
```

### Production Mode

```bash
# Direct node execution
npm start

# Or with PM2 (recommended)
pm2 start server.js --name trainer-backend
```

### Docker Mode

```bash
# Start container (accessible at http://localhost:3001)
npm run docker:up

# Access container shell
npm run docker:exec

# Stop container
npm run docker:down
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start server in production mode |
| `npm run dev` | Start server with nodemon (hot-reload) |
| `npm test` | Run unit tests with coverage |
| `npm run test:integration` | Run integration tests |
| `npm run migrate` | Run database migrations |
| `npm run docker:build` | Build Docker image |
| `npm run docker:up` | Start Docker container |
| `npm run docker:down` | Stop Docker container |
| `npm run docker:test` | Run tests in Docker |
| `npm run docker:logs` | View container logs |
| `npm run docker:exec` | Access container shell |
| `npm run supabase:start` | Start local Supabase |
| `npm run supabase:stop` | Stop local Supabase |
| `npm run db:reset:local` | Reset local database |

## Testing

### Unit Tests

```bash
# Run all unit tests with coverage
npm test

# Run specific test file
npm test -- agents/workout-generation-agent.test.js

# Run tests in watch mode
npm test -- --watch
```

### Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific integration test suite
NODE_ENV=test jest --config jest.integration.config.js --runInBand tests/integration/workoutPlanFlow
```

### Test Coverage

- Unit test coverage target: 80%
- Integration tests cover all major user flows
- AI agent tests validate response quality
- Security tests check authentication and authorization

## API Documentation

### Accessing Documentation

The API documentation is automatically generated from OpenAPI specification and served via Swagger UI.

#### Development

- URL: `http://localhost:8000/v1/api-docs`
- No authentication required

#### Production

- URL: `https://your-api-domain.com/v1/api-docs`
- Requires JWT authentication
- Enable with `ENABLE_DOCS_IN_PRODUCTION=true`

### Documentation Features

- 🎨 trAIner branded dark theme
- 🔐 JWT authentication integration
- 🧪 Interactive API testing
- 📎 Request/response examples
- 🔗 Deep linking to endpoints
- 📋 Full OpenAPI 3.0 specification

### API Endpoints Overview

#### Authentication
- `POST /v1/auth/signup` - User registration
- `POST /v1/auth/login` - User login
- `POST /v1/auth/logout` - User logout

#### User Management
- `GET /v1/profile` - Get user profile
- `POST /v1/profile` - Create/update profile
- `GET /v1/profile/preferences` - Get preferences
- `PUT /v1/profile/preferences` - Update preferences

#### Workout Management
- `POST /v1/workouts` - Generate AI workout plan
- `GET /v1/workouts` - List user's plans
- `GET /v1/workouts/:planId` - Get specific plan
- `POST /v1/workouts/:planId` - Adjust plan with AI
- `DELETE /v1/workouts/:planId` - Delete plan

#### Progress Tracking
- `POST /v1/workouts/log` - Log completed workout
- `GET /v1/workouts/log` - Get workout logs
- `POST /v1/progress/check-in` - Submit progress check-in
- `GET /v1/progress/check-ins` - Get check-in history

#### Nutrition
- `POST /v1/nutrition/plans` - Generate nutrition plan
- `GET /v1/nutrition/plans` - Get nutrition plans
- `POST /v1/macros/calculate` - Calculate macros

#### Analytics
- `GET /v1/analytics/overview` - Get analytics overview
- `POST /v1/analytics/refresh` - Refresh analytics
- `GET /v1/analytics/ai/insights` - Get AI insights

#### Data Transfer
- `POST /v1/data-transfer/export` - Export user data
- `POST /v1/data-transfer/import` - Import workout data

## Deployment

### Production Deployment Checklist

1. **Environment Variables**
   - Set `NODE_ENV=production`
   - Use strong passwords for database
   - Secure API keys
   - Configure proper CORS origins

2. **Database**
   - Run all migrations
   - Enable RLS policies
   - Set up backups
   - Configure connection pooling

3. **Security**
   - Enable HTTPS only
   - Set secure headers with Helmet
   - Configure rate limiting
   - Disable API docs or secure with auth

4. **Monitoring**
   - Set up error tracking (e.g., Sentry)
   - Configure logging aggregation
   - Set up uptime monitoring
   - Monitor API usage and quotas

### Docker Deployment

```bash
# Build production image
docker build --target prod -t trainer-backend:latest .

# Run production container
docker run -p 8000:8000 --env-file .env.production trainer-backend:latest
```

### Cloud Deployment Options

#### Heroku
```bash
heroku create trainer-backend
heroku config:set NODE_ENV=production
heroku config:set SUPABASE_URL=...
git push heroku main
```

#### AWS/Google Cloud/Azure
- Use container orchestration (ECS, GKE, AKS)
- Configure auto-scaling
- Set up load balancers
- Use managed databases

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port 8000
lsof -i :8000
# Kill the process
kill -9 <PID>
```

#### Database Connection Issues
1. Check environment variables are correct
2. Verify Supabase project is active
3. Test connection: `npm run migrate -- --connection-test`
4. Check SSL settings if in production

#### Migration Failures
1. Check migration logs for errors
2. Verify service role key has permissions
3. Ensure migrations run in correct order
4. Try running with `--diagnostic` flag

#### Docker Issues
1. Ensure Docker Desktop is running
2. Check `.env` file is present
3. Rebuild image: `npm run docker:build -- --no-cache`
4. Check logs: `npm run docker:logs`

#### AI Service Errors
1. Verify API keys are valid
2. Check API quotas/limits
3. Monitor response times
4. Implement retry logic for transient failures

### Debug Commands

```bash
# Test Supabase connection
node -e "const { supabase } = require('./config'); console.log(supabase);"

# Check environment variables
node -e "const { env } = require('./config'); console.log(env);"

# Test specific service
node -e "const { OpenAIService } = require('./services/openai-service'); const svc = new OpenAIService(); svc.testConnection();"
```

## Development Workflow

### Git Workflow

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and test locally
3. Run tests: `npm test && npm run test:integration`
4. Commit with descriptive message
5. Push and create pull request

### Code Style

- Use ESLint configuration
- Follow existing patterns
- Add JSDoc comments for functions
- Keep functions small and focused
- Handle errors gracefully

### Adding New Features

1. **Database Changes**
   - Create migration file
   - Test migration locally
   - Update TypeScript types if needed

2. **API Endpoints**
   - Add route in appropriate file
   - Implement controller logic
   - Add validation schemas
   - Update OpenAPI spec
   - Write tests

3. **AI Agents**
   - Extend base agent class
   - Implement agent logic
   - Add to agent factory
   - Test with real API calls
   - Monitor token usage

## Contributing

### Guidelines

1. **Code Quality**
   - Write clean, readable code
   - Add appropriate comments
   - Follow SOLID principles
   - Maintain test coverage

2. **Testing**
   - Write unit tests for new functions
   - Add integration tests for new endpoints
   - Test error scenarios
   - Validate AI responses

3. **Documentation**
   - Update README for new features
   - Add JSDoc comments
   - Update OpenAPI specification
   - Include migration notes

4. **Security**
   - Never commit secrets
   - Validate all inputs
   - Use parameterized queries
   - Follow OWASP guidelines

### Pull Request Process

1. Ensure all tests pass
2. Update documentation
3. Add migration if needed
4. Request code review
5. Address feedback
6. Merge after approval

---

## Support

For issues or questions:
- Check existing GitHub issues
- Review API documentation
- Consult migration logs
- Contact the development team

---

Built with ❤️ for fitness enthusiasts by the trAIner team
