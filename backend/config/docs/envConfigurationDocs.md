# Environment Configuration Documentation

## Overview

The environment configuration module handles loading, validation, and organization of all environment variables required for the application. It implements Joi-based validation with environment-specific defaults, automatic type conversion, and structured configuration export for easy access across the application.

**Location**: `backend/config/env.js`  
**Dependencies**: `dotenv`, `joi`, `path`, `os`  
**Type**: Environment variable management and validation

## Environment File Loading

### File Selection Logic
```javascript
// Environment-specific .env file loading
const nodeEnv = process.env.NODE_ENV || 'development';
let envFile = '.env';

if (nodeEnv === 'test') {
  envFile = '.env.test';
} else if (nodeEnv === 'production') {
  envFile = '.env.production';
}
```

**File Priority**:
- **Development**: `.env`
- **Test**: `.env.test`
- **Production**: `.env.production`

### Loading Process
1. Determines NODE_ENV (defaults to 'development')
2. Selects appropriate .env file
3. Loads variables using dotenv.config()
4. Validates all variables against Joi schema
5. Exports organized configuration object

## Environment Variables

### Core Application Variables

#### NODE_ENV
```bash
NODE_ENV=development|production|test
```
- **Description**: Application environment
- **Default**: `development`
- **Validation**: Must be one of: development, production, test
- **Impact**: Controls logging, security settings, error handling

#### PORT
```bash
PORT=8000
```
- **Description**: Server port number
- **Default**: `8000`
- **Validation**: Must be a number
- **Usage**: Express server binding

### Supabase Configuration

#### Core Supabase Variables
```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PROJECT_REF=your-project-ref
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_PASSWORD=your-database-password
```

#### Database Connection Components
```bash
# Direct database connection
DB_HOST=db.your-project.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres

# Pooler connection (for connection pooling)
POOLER_HOST=pooler.your-project.supabase.co
POOLER_SESSION_PORT=5432
POOLER_TRANSACTION_PORT=6543
POOLER_USER=postgres.your-project
```

#### Connection Strings
```bash
# Complete connection URLs
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres
DATABASE_URL_SERVICE_ROLE=postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres
DATABASE_URL_POOLER_SESSION=postgresql://postgres.your-project:[PASSWORD]@pooler.your-project.supabase.co:5432/postgres
DATABASE_URL_POOLER_TRANSACTION=postgresql://postgres.your-project:[PASSWORD]@pooler.your-project.supabase.co:6543/postgres
```

#### SSL and Connection Configuration
```bash
# SSL settings
NODE_TLS_REJECT_UNAUTHORIZED=1
SSL_MODE=require

# Connection timeout
CONNECTION_TIMEOUT=30000

# DNS fallback (for connection issues)
DB_IP_ADDRESS=
```

### External Service APIs

#### OpenAI Configuration
```bash
OPENAI_API_KEY=sk-your-openai-api-key
```
- **Description**: OpenAI API key for AI agent operations
- **Required**: No (allows empty for development)
- **Usage**: Workout generation, plan adjustment, nutrition planning

#### Perplexity AI Configuration
```bash
PERPLEXITY_API_KEY=pplx-your-perplexity-api-key
```
- **Description**: Perplexity AI API key for research operations
- **Required**: No (allows empty for development)
- **Usage**: Exercise research, fitness insights

### Security Configuration

#### Rate Limiting
```bash
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```
- **RATE_LIMIT_WINDOW_MS**: Time window in milliseconds (default: 60000 = 1 minute)
- **RATE_LIMIT_MAX**: Maximum requests per window (default: 100)

#### CORS Settings
```bash
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
```
- **Description**: Allowed CORS origins (comma-separated for multiple)
- **Default**: `*` (allow all origins)
- **Production**: Should be specific domain list

### Migration Configuration

#### Migration Directory
```bash
MIGRATIONS_DIR=./backend/supabase/migrations
```
- **Description**: Directory path for database migrations
- **Default**: `./backend/supabase/migrations`
- **Usage**: Database schema updates

### Documentation Configuration

#### API Documentation Settings
```bash
ENABLE_DOCS_IN_PRODUCTION=false
API_DOCS_USERNAME=admin
API_DOCS_PASSWORD=change_me
```
- **ENABLE_DOCS_IN_PRODUCTION**: Whether to serve API docs in production (default: false)
- **API_DOCS_USERNAME**: Basic auth username for API documentation
- **API_DOCS_PASSWORD**: Basic auth password for API documentation

## Configuration Object Structure

### Exported Configuration

```javascript
module.exports = {
  // Environment flags
  env: string,                    // NODE_ENV value
  isDevelopment: boolean,         // NODE_ENV === 'development'
  isProduction: boolean,          // NODE_ENV === 'production'
  isTest: boolean,               // NODE_ENV === 'test'
  port: number,                  // Server port
  
  // Raw variables (for compatibility)
  ENABLE_DOCS_IN_PRODUCTION: string,
  API_DOCS_USERNAME: string,
  API_DOCS_PASSWORD: string,
  
  // Organized by service
  supabase: {
    url: string,
    projectRef: string,
    anonKey: string,
    serviceRoleKey: string,
    databasePassword: string,
    
    // Database connection components
    dbHost: string,
    dbPort: number,
    dbName: string,
    dbUser: string,
    
    // Pooler connection components
    poolerHost: string,
    poolerSessionPort: number,
    poolerTransactionPort: number,
    poolerUser: string,
    
    // Connection strings
    databaseUrl: string,
    databaseUrlServiceRole: string,
    databaseUrlPoolerSession: string,
    databaseUrlPoolerTransaction: string,
    
    // SSL and connection settings
    sslRejectUnauthorized: boolean,
    sslMode: string,
    dbIpAddress: string,
    connectionTimeout: number
  },
  
  migrations: {
    directory: string
  },
  
  auth: {
    adminBypassOwnership: boolean
  },
  
  security: {
    rateLimit: {
      windowMs: number,
      max: number
    }
  },
  
  externalServices: {
    openai: {
      apiKey: string
    },
    perplexity: {
      apiKey: string
    }
  },
  
  cors: {
    origin: string
  },
  
  docs: {
    enableInProduction: boolean,
    apiDocsUsername: string,
    apiDocsPassword: string
  }
};
```

## Validation Rules

### Required Variables
- `SUPABASE_URL`: Must be valid URL
- `SUPABASE_PROJECT_REF`: Required string
- `SUPABASE_ANON_KEY`: Required string
- `SUPABASE_SERVICE_ROLE_KEY`: Required string
- `DATABASE_PASSWORD`: Required string
- `DB_HOST`: Required database host
- `POOLER_HOST`: Required pooler host
- `POOLER_USER`: Required pooler user
- `DATABASE_URL`: Required connection string
- `DATABASE_URL_SERVICE_ROLE`: Required service role connection string
- `DATABASE_URL_POOLER_SESSION`: Required session pooler connection string
- `DATABASE_URL_POOLER_TRANSACTION`: Required transaction pooler connection string

### Optional Variables with Defaults
- `NODE_ENV`: Defaults to 'development'
- `PORT`: Defaults to 8000
- `DB_PORT`: Defaults to 5432
- `DB_NAME`: Defaults to 'postgres'
- `DB_USER`: Defaults to 'postgres'
- `POOLER_SESSION_PORT`: Defaults to 5432
- `POOLER_TRANSACTION_PORT`: Defaults to 6543
- `NODE_TLS_REJECT_UNAUTHORIZED`: Defaults to '1'
- `SSL_MODE`: Defaults to 'require'
- `MIGRATIONS_DIR`: Defaults to './backend/supabase/migrations'
- `CONNECTION_TIMEOUT`: Defaults to 30000
- `RATE_LIMIT_WINDOW_MS`: Defaults to 60000
- `RATE_LIMIT_MAX`: Defaults to 100
- `CORS_ORIGIN`: Defaults to '*'
- `ENABLE_DOCS_IN_PRODUCTION`: Defaults to 'false'
- `API_DOCS_USERNAME`: Defaults to 'admin'
- `API_DOCS_PASSWORD`: Defaults to 'change_me'

### Type Validation
```javascript
const envSchema = Joi.object().keys({
  NODE_ENV: Joi.string().valid('development', 'production', 'test'),
  PORT: Joi.number(),
  SUPABASE_URL: Joi.string().required(),
  // ... full schema validation
});
```

## Usage Patterns

### Direct Import
```javascript
const env = require('../config/env');

// Access environment flags
if (env.isDevelopment) {
  console.log('Running in development mode');
}

// Access service configuration
const supabaseClient = createClient(env.supabase.url, env.supabase.anonKey);
```

### Via Config Index
```javascript
const { env } = require('../config');

// Same access patterns
const apiKey = env.externalServices.openai.apiKey;
```

### Service Configuration
```javascript
// Used in service initialization
class OpenAIService {
  constructor() {
    this.apiKey = env.externalServices.openai.apiKey;
  }
}

// Used in database connections
const dbConfig = {
  connectionString: env.supabase.databaseUrl,
  ssl: {
    rejectUnauthorized: env.supabase.sslRejectUnauthorized
  }
};
```

## Environment-Specific Behavior

### Development Environment
- **Logging**: Debug level enabled
- **CORS**: Often allows all origins (`*`)
- **SSL**: May be disabled for local development
- **Rate Limiting**: More permissive limits
- **Documentation**: Always enabled

### Test Environment
- **File**: Uses `.env.test`
- **Logging**: Minimal/silent logging
- **Database**: May use separate test database
- **External APIs**: Often mocked or disabled
- **Rate Limiting**: Disabled or very high limits

### Production Environment
- **File**: Uses `.env.production`
- **Logging**: Info level only
- **CORS**: Strict origin validation
- **SSL**: Always required
- **Rate Limiting**: Strict enforcement
- **Documentation**: Disabled by default
- **Secrets**: All required variables must be present

## Used By

### Services
- **OpenAI Service**: Uses `externalServices.openai.apiKey`
- **Perplexity Service**: Uses `externalServices.perplexity.apiKey`
- **Supabase Services**: Uses all `supabase.*` configuration
- **Auth Service**: Uses `auth.*` settings
- **Analytics Service**: Uses environment flags for behavior
- **Notification Service**: Uses rate limiting configuration
- **All Services**: Use logger configuration and environment flags

### Middleware
- **Security Middleware**: Uses `cors.origin`, `security.rateLimit`
- **Auth Middleware**: Uses `supabase` configuration
- **Rate Limiting Middleware**: Uses `security.rateLimit`
- **Error Middleware**: Uses environment flags for error handling

### Controllers
- **All Controllers**: Use environment flags for conditional behavior
- **Analytics Controller**: Uses external service configuration
- **Documentation Controller**: Uses `docs.*` configuration

### Routes
- **All Routes**: Use rate limiting configuration
- **API Routes**: Use CORS configuration
- **Documentation Routes**: Use documentation configuration

## Security Considerations

### Sensitive Variables
These variables contain secrets and should be protected:
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_PASSWORD`
- `OPENAI_API_KEY`
- `PERPLEXITY_API_KEY`
- `API_DOCS_PASSWORD`
- All `DATABASE_URL*` connection strings

### Environment Isolation
- **Development**: Can use placeholder/demo API keys
- **Test**: Should use test-specific credentials
- **Production**: Must use real, secure credentials

### Validation Benefits
- **Early Error Detection**: Fails fast on missing required variables
- **Type Safety**: Ensures proper data types
- **Documentation**: Joi schema serves as variable documentation
- **Defaults**: Provides sensible defaults for optional variables

## Error Handling

### Validation Failures
```javascript
if (error) {
  throw new Error(`Environment validation error: ${error.message}`);
}
```

### Missing Required Variables
- Application fails to start with clear error message
- Joi validation provides specific field names that are missing
- No fallback behavior for critical variables

### Development vs Production
- **Development**: More permissive, warnings for missing optional variables
- **Production**: Strict validation, fails on any missing required variable

## Integration Considerations

### Frontend Configuration
- Environment flags affect API behavior that frontend must handle
- CORS configuration directly impacts frontend requests
- Rate limiting affects frontend request patterns

### Dynamic vs Static Configuration
- **Static**: All configuration loaded at startup
- **No Runtime Changes**: Requires application restart for config changes
- **Immutable**: Configuration object is frozen after validation

### Container Deployment
- All environment variables must be provided to container
- Connection strings must account for container networking
- Secrets should be injected via secure container orchestration

## Best Practices

### Variable Naming
- Use SCREAMING_SNAKE_CASE for environment variables
- Group related variables with common prefixes
- Keep names descriptive but concise

### Security
- Never commit .env files with real credentials
- Use different credentials for each environment
- Regularly rotate API keys and database passwords
- Use secure secret management in production

### Documentation
- Document all variables in this file
- Include example values (non-sensitive)
- Explain impact of each variable on system behavior
- Keep Joi schema as single source of truth