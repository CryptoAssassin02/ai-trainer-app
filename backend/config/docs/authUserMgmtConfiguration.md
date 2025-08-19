# Authentication & User Management Configuration Documentation

## Overview
Comprehensive configuration layer for authentication and user management, providing environment-specific settings, Supabase client configuration, security parameters, and database connection management for the trAIner app's authentication system.

**Primary Files**: 
- `backend/config/env.js` (189 lines) - Environment variable validation and organization
- `backend/config/index.js` (94 lines) - Configuration module consolidation
- `backend/config/supabase.js` (862 lines) - Supabase environment-specific configuration
- `backend/config/config.js` (46 lines) - Basic server and service configuration
**Last Updated**: Current development phase  

## Configuration Summary

| Configuration Module | Purpose | Environment Aware | Security Level |
|-------------------|---------|-------------------|----------------|
| `env.js` | Environment variable validation and organization | Yes | High |
| `index.js` | Configuration module consolidation and exports | Yes | High |
| `supabase.js` | Supabase client configuration and connection management | Yes | High |
| `config.js` | Basic server and service configuration | Yes | Medium |

## Environment Configuration (`env.js`)

### Environment Variable Schema & Validation

**Purpose**: Validate and organize environment variables using Joi schema validation  
**Security Level**: High - Ensures all required auth variables are present  
**Environment Files**: `.env`, `.env.test`, `.env.production`

```javascript
const envSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string()
      .valid('development', 'production', 'test')
      .default('development'),
    PORT: Joi.number().default(8000),
    
    // Supabase Authentication Configuration
    SUPABASE_URL: Joi.string().required(),
    SUPABASE_PROJECT_REF: Joi.string().required(),
    SUPABASE_ANON_KEY: Joi.string().required(),
    SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
    DATABASE_PASSWORD: Joi.string().required(),
    
    // Security Configuration
    RATE_LIMIT_WINDOW_MS: Joi.number().default(60000), // 1 minute
    RATE_LIMIT_MAX: Joi.number().default(100), // 100 requests per window
    
    // CORS Configuration
    CORS_ORIGIN: Joi.string().default('*'),
    
    // API Documentation Security
    ENABLE_DOCS_IN_PRODUCTION: Joi.string().valid('true', 'false').default('false'),
    API_DOCS_USERNAME: Joi.string().default('admin'),
    API_DOCS_PASSWORD: Joi.string().default('change_me')
  })
  .unknown();
```

### Supabase Authentication Configuration

**Purpose**: Organize Supabase-related authentication variables  
**Connection Types**: Direct, session pooler, transaction pooler  
**SSL Configuration**: Environment-aware SSL settings

```javascript
supabase: {
  // Core Authentication URLs and Keys
  url: env.SUPABASE_URL,
  projectRef: env.SUPABASE_PROJECT_REF,
  anonKey: env.SUPABASE_ANON_KEY,
  serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  databasePassword: env.DATABASE_PASSWORD,
  
  // Database Connection Components
  dbHost: env.DB_HOST,
  dbPort: env.DB_PORT,
  dbName: env.DB_NAME,
  dbUser: env.DB_USER,
  
  // Pooler Connection Components
  poolerHost: env.POOLER_HOST,
  poolerSessionPort: env.POOLER_SESSION_PORT,
  poolerTransactionPort: env.POOLER_TRANSACTION_PORT,
  poolerUser: env.POOLER_USER,
  
  // Pre-configured Connection Strings
  databaseUrl: env.DATABASE_URL,
  databaseUrlServiceRole: env.DATABASE_URL_SERVICE_ROLE,
  databaseUrlPoolerSession: env.DATABASE_URL_POOLER_SESSION,
  databaseUrlPoolerTransaction: env.DATABASE_URL_POOLER_TRANSACTION,
  
  // SSL Configuration
  sslRejectUnauthorized: env.NODE_TLS_REJECT_UNAUTHORIZED === '0' ? false : true,
  sslMode: env.SSL_MODE, // 'require', 'prefer', 'disable'
  
  // Connection Timeout
  connectionTimeout: parseInt(env.CONNECTION_TIMEOUT) || 30000
}
```

### Authentication Security Configuration

**Purpose**: Configure authentication-specific security settings  
**Note**: JWT secrets removed - handled by Supabase  
**Admin Features**: Ownership bypass for admin users

```javascript
auth: {
  // Legacy JWT settings removed (Supabase handles JWT management)
  // jwtSecret: env.JWT_SECRET, // Removed
  // jwtExpiresIn: env.JWT_EXPIRES_IN, // Removed
  // refreshTokenExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN, // Removed
  adminBypassOwnership: true // Config flag for admin ownership bypass
},

security: {
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS, // Default: 60000 (1 minute)
    max: env.RATE_LIMIT_MAX // Default: 100 requests
  }
}
```

### CORS and Documentation Security

**Purpose**: Configure cross-origin and API documentation access  
**Environment Behavior**: Restrictive in production, permissive in development

```javascript
cors: {
  origin: env.CORS_ORIGIN // Default: '*' for development
},

docs: {
  enableInProduction: env.ENABLE_DOCS_IN_PRODUCTION === 'true',
  apiDocsUsername: env.API_DOCS_USERNAME, // Default: 'admin'
  apiDocsPassword: env.API_DOCS_PASSWORD  // Default: 'change_me'
}
```

### Environment Loading Strategy

**Purpose**: Load appropriate environment file based on NODE_ENV  
**File Selection**: Automatic environment-specific file loading

```javascript
const nodeEnv = process.env.NODE_ENV || 'development';
let envFile = '.env';

if (nodeEnv === 'test') {
  envFile = '.env.test';
} else if (nodeEnv === 'production') {
  envFile = '.env.production';
}

const envPath = path.resolve(__dirname, '..', envFile);
dotenv.config({ path: envPath });
```

## Configuration Index (`index.js`)

### Module Consolidation and Error Handling

**Purpose**: Centralize all configuration modules with graceful error handling  
**Critical Modules**: env, logger, supabase (required)  
**Optional Modules**: openai, perplexity (graceful fallback)

```javascript
// Critical configuration loading with error handling
try {
  env = require('./env');
} catch (error) {
  console.error('CRITICAL: Failed to load environment configuration (./env).', error);
  throw new Error(`Failed to load environment configuration: ${error.message}`);
}

try {
  logger = require('../utils/logger');
} catch (error) {
   console.error('CRITICAL: Failed to load logger configuration (../utils/logger).', error);
   // Fallback console logger
   logger = {
       info: (...args) => console.log('INFO:', ...args),
       warn: (...args) => console.warn('WARN:', ...args),
       error: (...args) => console.error('ERROR:', ...args),
       debug: (...args) => console.log('DEBUG:', ...args),
   };
}

try {
  supabase = require('./supabase');
} catch (error) {
  console.error('CRITICAL: Failed to load Supabase configuration (./supabase).', error);
  throw new Error(`Failed to load Supabase configuration: ${error.message}`);
}
```

### Server Configuration with Defaults

**Purpose**: Provide fallback server configuration when config module fails  
**Settings**: Request limits, timeouts, compression, proxy trust

```javascript
const defaultServerConfig = {
  maxRequestBodySize: '50mb',
  requestTimeout: 30000, // 30 seconds
  compressionLevel: 6,
  trustProxy: true
};

// Use config.server if available, otherwise use defaults
const serverConfig = config && config.server ? config.server : defaultServerConfig;
```

### Exported Configuration Structure

**Purpose**: Provide clean interface for accessing all configuration modules

```javascript
module.exports = {
  env,           // Environment variables and validation
  config,        // Basic server configuration
  logger,        // Logging utilities
  supabase,      // Supabase client configuration
  openai,        // OpenAI client configuration (optional)
  perplexity,    // Perplexity client configuration (optional)
  serverConfig   // Determined server configuration
};
```

## Supabase Configuration (`supabase.js`)

### Environment-Specific Configuration

**Purpose**: Provide tailored Supabase settings for development, testing, and production  
**RLS Management**: Environment-appropriate Row Level Security settings  
**Performance**: Optimized settings per environment

#### Development Configuration

```javascript
const developmentConfig = (env) => ({
  // Connection settings
  url: env.supabase.url,
  key: env.supabase.anonKey,
  options: {
    auth: {
      persistSession: false,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-application-name': 'trAIner-backend-dev'
      }
    },
    realtime: {
      timeout: 60000 // Extended timeout for debugging
    }
  },
  
  // RLS settings (disabled for easier development)
  rls: {
    enabled: false,
    bypassForService: true
  },
  
  // Verbose logging for development
  logging: {
    level: 'debug',
    queries: true,
    authOperations: true,
    requestDetails: true
  },
  
  // Performance settings
  performance: {
    cacheProfiles: true,
    queryPageSize: 100
  }
});
```

#### Testing Configuration

```javascript
const testingConfig = () => ({
  // Test-specific connection settings
  url: process.env.SUPABASE_URL || 'https://test-project.supabase.co',
  key: process.env.SUPABASE_ANON_KEY || 'test-anon-key',
  options: {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-application-name': 'trAIner-backend-test'
      }
    }
  },
  
  // RLS settings for testing
  rls: {
    enabled: true,
    bypassForTesting: true
  },
  
  // Test-specific features
  testing: {
    isolatedSchema: 'test_schema',
    disableTriggers: true,
    cleanupAfterTests: true,
    seedTestData: true
  },
  
  // Minimal logging for tests
  logging: {
    level: 'error',
    captureFailed: true
  }
});
```

#### Production Configuration

```javascript
const productionConfig = (env) => ({
  // Production connection settings
  url: env.supabase.url,
  key: env.supabase.anonKey,
  options: {
    auth: {
      persistSession: false,
      autoRefreshToken: true
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-application-name': 'trAIner-backend-prod'
      }
    }
  },
  
  // Strict RLS enforcement
  rls: {
    enabled: true, // MUST be enabled in production
    bypassForService: false
  },
  
  // Minimal logging for performance
  logging: {
    level: 'warn',
    queries: false,
    securityEvents: true
  },
  
  // Production-optimized performance
  performance: {
    cacheProfiles: true,
    cacheTimeout: 300, // 5 minutes
    queryPageSize: 50,
    connectionPool: {
      min: 2,
      max: 10
    }
  }
});
```

### Supabase Client Factory Function

**Purpose**: Create environment-aware Supabase clients with proper configuration  
**Authentication**: Supports service role and JWT token scoping  
**Fallback**: Mock client for testing when needed

```javascript
function createSupabaseClient(env, logger, nodeEnv, useServiceRole = false, jwtToken = null) {
  const effectiveNodeEnv = nodeEnv || process.env.NODE_ENV;
  const shouldUseMock = process.env.USE_MOCK_SUPABASE === 'true';

  // Mock handling for tests
  if (effectiveNodeEnv === 'test' && shouldUseMock) {
    logger.debug('Using mock Supabase client for tests');
    try {
      const mockSupabase = require('../../tests/mocks/supabase');
      return mockSupabase.createMockClient();
    } catch (err) {
      logger.debug('Using fallback mock Supabase client');
      return minimalFallbackMock;
    }
  }

  // Real client configuration
  const configDetails = getEnvironmentConfig(env, logger, effectiveNodeEnv);
  
  let supabaseUrlToUse, supabaseKeyToUse, clientOptionsToUse;
  clientOptionsToUse = configDetails.options || {};

  if (jwtToken) {
    // JWT-scoped client for RLS
    supabaseUrlToUse = configDetails.url;
    supabaseKeyToUse = configDetails.key;
    clientOptionsToUse = {
      ...clientOptionsToUse,
      global: {
        ...(clientOptionsToUse.global || {}),
        headers: {
          ...(clientOptionsToUse.global?.headers || {}),
          Authorization: `Bearer ${jwtToken}`,
        },
      },
    };
    logger.info(`Creating Supabase client WITH JWT. Environment: ${effectiveNodeEnv}`);
  } else if (effectiveNodeEnv === 'test' && !shouldUseMock) {
    // Integration test path
    supabaseUrlToUse = process.env.SUPABASE_URL;
    supabaseKeyToUse = useServiceRole 
        ? process.env.SUPABASE_SERVICE_ROLE_KEY 
        : process.env.SUPABASE_ANON_KEY;
    logger.debug(`Integration Test client. ServiceRole: ${useServiceRole}`);
  } else {
    // Development/Production path
    supabaseUrlToUse = configDetails.url;
    supabaseKeyToUse = useServiceRole && env?.supabase?.serviceRoleKey
        ? env.supabase.serviceRoleKey
        : configDetails.key;
  }

  if (!supabaseUrlToUse || !supabaseKeyToUse) {
    const message = `Supabase URL or Key is MISSING. URL: ${supabaseUrlToUse}, Key Set: ${!!supabaseKeyToUse}`;
    logger.error(message);
    throw new Error(message);
  }
  
  logger.info(`Creating Supabase client. Environment: ${effectiveNodeEnv}, ServiceRole: ${useServiceRole}`);
  return createClient(supabaseUrlToUse, supabaseKeyToUse, clientOptionsToUse);
}
```

### Connection String Management

**Purpose**: Generate PostgreSQL connection strings for different connection types  
**Types**: Direct, session pooler, transaction pooler  
**Security**: Service role key support for privileged operations

```javascript
function createConnectionString(env, logger, nodeEnv, connectionType = 'direct', useServiceRole = false) {
  const effectiveNodeEnv = nodeEnv || process.env.NODE_ENV;

  // Testing environment handling
  if (effectiveNodeEnv === 'test') {
    return process.env.DATABASE_URL || 'postgresql://postgres:password@test-db-host:5432/postgres';
  }

  // Check for pre-configured connection strings
  const connectionTypeKey = connectionType === 'transactionPooler' ? 'transaction' :
                           connectionType === 'sessionPooler' ? 'session' :
                           'direct';

  const preconfiguredString = env?.supabase?.connectionStrings?.[connectionTypeKey];
  if (preconfiguredString) {
    logger?.debug?.(`Using pre-configured connection string for type: ${connectionTypeKey}`);
    return preconfiguredString;
  }

  // Manual construction
  if (!env || !env.supabase) {
      throw new Error('Environment config (env.supabase) is missing for connection string construction.');
  }

  const projectRef = env.supabase.projectRef ||
                    (env.supabase.url ? new URL(env.supabase.url).hostname.split('.')[0] : null);

  if (!projectRef) {
    throw new Error("Could not determine Supabase project reference.");
  }

  const password = useServiceRole ? env.supabase.serviceRoleKey : env.supabase.databasePassword;
  if (!password) {
      throw new Error(`Required password/key not found for connection string construction.`);
  }

  const poolerHost = env.supabase.poolerHost || 'aws-0-us-east-2.pooler.supabase.com';

  // Generate connection string based on type
  switch (connectionType) {
    case 'direct':
      return `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`;

    case 'sessionPooler':
      return `postgresql://postgres.${projectRef}:${password}@${poolerHost}:5432/postgres`;

    case 'transactionPooler':
      return `postgresql://postgres.${projectRef}:${password}@${poolerHost}:6543/postgres`;

    default: 
      logger.error(`Unknown connection type: ${connectionType}`);
      return `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`; 
  }
}
```

### Connection Testing Utilities

**Purpose**: Test database connections and handle DNS resolution issues  
**Error Handling**: Comprehensive error classification and fallback strategies

```javascript
async function testConnection(env, logger, connectionString) {
  if (!connectionString) {
      return { success: false, error: 'Connection string is required.', errorType: 'MISSING_ARGUMENT' };
  }

  try {
    // DNS resolution test
    const connectionUrl = new URL(connectionString);
    const hostname = connectionUrl.hostname;

    try {
      logger.debug(`Resolving hostname: ${hostname}`);
      const addresses = await dns.lookup(hostname, { all: true });

      if (!addresses || addresses.length === 0) {
        return {
          success: false,
          error: `DNS resolution failed for ${hostname}`,
          errorType: 'DNS_RESOLUTION_FAILED'
        };
      }

      logger.debug(`DNS resolved ${hostname} to: ${addresses.map(a => a.address).join(', ')}`);
    } catch (dnsError) {
      return {
        success: false,
        error: `DNS resolution error: ${dnsError.message}`,
        errorType: 'DNS_RESOLUTION_ERROR',
        errorDetails: dnsError
      };
    }

    // Database connection test
    const pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: env?.supabase?.sslRejectUnauthorized !== false
      },
      connectionTimeoutMillis: env?.supabase?.connectionTimeout || 30000
    });

    const client = await pool.connect();
    
    // Test query
    const result = await client.query('SELECT version()');
    client.release();
    await pool.end();

    return {
      success: true,
      version: result.rows[0].version,
      connectionInfo: {
        hostname,
        ssl: env?.supabase?.sslRejectUnauthorized !== false
      }
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      errorType: 'CONNECTION_ERROR',
      errorDetails: error
    };
  }
}
```

### Environment Detection Utilities

**Purpose**: Provide consistent environment detection across the application  
**Functions**: `isDevelopment`, `isTest`, `isProduction`  
**Fallbacks**: Handle cases where env config is unavailable

```javascript
function isDevelopment(env, nodeEnv) {
  const effectiveNodeEnv = nodeEnv || process.env.NODE_ENV;
  return (!env && effectiveNodeEnv === 'development') || (env && env.env === 'development') || false;
}

function isTest(env, nodeEnv) {
  const effectiveNodeEnv = nodeEnv || process.env.NODE_ENV;
  return (!env && effectiveNodeEnv === 'test') || (env && env.env === 'test') || false;
}

function isProduction(env, nodeEnv) {
  const effectiveNodeEnv = nodeEnv || process.env.NODE_ENV;
  return (!env && effectiveNodeEnv === 'production') || (env && env.env === 'production') || false;
}
```

## Basic Configuration (`config.js`)

### Required Environment Variables Validation

**Purpose**: Ensure critical authentication and service variables are present  
**Exit Strategy**: Fail fast if required variables are missing

```javascript
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
  'PERPLEXITY_API_KEY'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}
```

### Simple Configuration Object

**Purpose**: Provide basic server and service configuration  
**Duplication**: Some overlap with env.js for backward compatibility

```javascript
const config = {
  server: {
    isDevelopment: env.isDevelopment,
    isProduction: env.isProduction,
    isTest: env.isTest,
    port: process.env.PORT || 3001,
    maxRequestBodySize: '2mb',
    compressionLevel: 6
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY
  },
  perplexity: {
    apiKey: process.env.PERPLEXITY_API_KEY
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  }
};
```

## Configuration Integration Patterns

### Environment Variable File Structure

```bash
# Development (.env)
NODE_ENV=development
PORT=8000

# Supabase Authentication
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PROJECT_REF=your-project-ref
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_PASSWORD=your-db-password

# Database Connection Components
DB_HOST=db.your-project.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres

# Pooler Configuration
POOLER_HOST=aws-0-us-east-2.pooler.supabase.com
POOLER_SESSION_PORT=5432
POOLER_TRANSACTION_PORT=6543
POOLER_USER=postgres.your-project

# Pre-configured Connection Strings
DATABASE_URL=postgresql://postgres:password@db.project.supabase.co:5432/postgres
DATABASE_URL_SERVICE_ROLE=postgresql://postgres:service-key@db.project.supabase.co:5432/postgres
DATABASE_URL_POOLER_SESSION=postgresql://postgres.project:password@pooler:5432/postgres
DATABASE_URL_POOLER_TRANSACTION=postgresql://postgres.project:password@pooler:6543/postgres

# SSL Configuration
NODE_TLS_REJECT_UNAUTHORIZED=1
SSL_MODE=require

# Security Configuration
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# API Documentation Security
ENABLE_DOCS_IN_PRODUCTION=false
API_DOCS_USERNAME=admin
API_DOCS_PASSWORD=secure_password

# External Services
OPENAI_API_KEY=your-openai-key
PERPLEXITY_API_KEY=your-perplexity-key
```

### Configuration Usage Patterns

#### Basic Configuration Access

```javascript
const { env, logger, supabase } = require('../config');

// Access environment-specific settings
const isProduction = env.isProduction;
const supabaseUrl = env.supabase.url;
const rateLimits = env.security.rateLimit;
```

#### Supabase Client Creation

```javascript
const { createSupabaseClient } = require('../config/supabase');
const { env, logger } = require('../config');

// Create anonymous client
const anonClient = createSupabaseClient(env, logger, process.env.NODE_ENV);

// Create service role client
const adminClient = createSupabaseClient(env, logger, process.env.NODE_ENV, true);

// Create JWT-scoped client
const userClient = createSupabaseClient(env, logger, process.env.NODE_ENV, false, jwtToken);
```

#### Connection String Generation

```javascript
const { createConnectionString } = require('../config/supabase');
const { env, logger } = require('../config');

// Generate different connection types
const directConnection = createConnectionString(env, logger, process.env.NODE_ENV, 'direct');
const poolerConnection = createConnectionString(env, logger, process.env.NODE_ENV, 'sessionPooler');
const serviceConnection = createConnectionString(env, logger, process.env.NODE_ENV, 'direct', true);
```

#### Environment Detection

```javascript
const { isDevelopment, isTest, isProduction } = require('../config/supabase');
const { env } = require('../config');

if (isDevelopment(env, process.env.NODE_ENV)) {
  // Development-specific configuration
} else if (isProduction(env, process.env.NODE_ENV)) {
  // Production-specific configuration
}
```

## Security Considerations

### Environment Variable Protection

- **Never Commit**: Environment files should never be committed to version control
- **Rotation**: Service role keys should be rotated regularly
- **Validation**: All critical variables validated at startup
- **Fallbacks**: Secure defaults where appropriate

### RLS Configuration Security

- **Development**: RLS disabled for ease of development
- **Testing**: RLS enabled with test-specific policies
- **Production**: RLS strictly enforced for all operations

### Connection Security

- **SSL**: Enforced in production environments
- **Timeouts**: Configured to prevent hanging connections
- **Pooling**: Optimized for each environment type

## Performance Optimizations

### Environment-Specific Settings

- **Development**: Extended timeouts, verbose logging, caching enabled
- **Testing**: Minimal logging, fast cleanup, isolated schemas
- **Production**: Optimized pooling, minimal logging, aggressive caching

### Connection Management

- **Singleton Clients**: Reuse Supabase clients across requests
- **Connection Pooling**: Environment-appropriate pool sizes
- **Fallback Strategies**: Mock clients for testing, graceful degradation

### Caching Strategy

- **Profile Caching**: Enabled in development and production
- **Connection String Caching**: Pre-configured strings preferred
- **Configuration Caching**: Validated config cached at startup

## Testing Considerations

### Mock Configuration

- **Mock Detection**: `USE_MOCK_SUPABASE` environment variable
- **Fallback Mocks**: Minimal mocks when specific mocks fail
- **Integration Tests**: Real Supabase connections for integration tests

### Test Environment Isolation

- **Separate Database**: Test-specific connection strings
- **Clean Slate**: Auto-cleanup between test runs
- **Test Data**: Auto-seeding with test fixtures

## Error Handling & Fallbacks

### Configuration Loading Errors

- **Critical Modules**: env, logger, supabase (application exits)
- **Optional Modules**: openai, perplexity (graceful fallback)
- **Fallback Loggers**: Console logger when main logger fails

### Connection Errors

- **DNS Resolution**: Detailed error reporting
- **SSL Issues**: Configurable SSL rejection
- **Timeout Handling**: Environment-appropriate timeouts

### Validation Errors

- **Schema Validation**: Joi schema with descriptive errors
- **Required Variables**: Fail fast for missing critical variables
- **Type Conversion**: Safe parsing with defaults

## Future Enhancements

### Configuration Improvements

- **Dynamic Configuration**: Runtime configuration updates
- **Configuration Validation**: Advanced validation rules
- **Secret Management**: Integration with secret management services

### Security Enhancements

- **Certificate Pinning**: Enhanced SSL certificate validation
- **Connection Encryption**: Additional encryption layers
- **Access Logging**: Comprehensive configuration access logs

### Performance Optimizations

- **Configuration Caching**: Advanced caching strategies
- **Connection Optimization**: Intelligent connection routing
- **Load Balancing**: Multi-region configuration support 