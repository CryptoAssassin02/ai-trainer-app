/**
 * @fileoverview Environment variables configuration
 * Loads and validates environment variables with appropriate defaults
 */

const dotenv = require('dotenv');
const path = require('path');
const os = require('os');
const Joi = require('joi');

// Load environment variables from appropriate .env file based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';
let envFile = '.env';

if (nodeEnv === 'test') {
  envFile = '.env.test';
} else if (nodeEnv === 'production') {
  envFile = '.env.production';
}

const envPath = path.resolve(__dirname, '..', envFile);
console.log(`[env.js] Loading environment from: ${envPath} (NODE_ENV: ${nodeEnv})`);

dotenv.config({ path: envPath });

// Schema for environment variable validation
const createEnvSchema = (nodeEnv) => {
  const isTest = nodeEnv === 'test';
  
  return Joi.object()
    .keys({
      NODE_ENV: Joi.string()
        .valid('development', 'production', 'test')
        .default('development'),
      PORT: Joi.number().default(8000),
      
      // Supabase
      SUPABASE_URL: Joi.string().required(),
      SUPABASE_PROJECT_REF: isTest || nodeEnv === 'development' 
        ? Joi.string().optional() // Optional for local development
        : Joi.string().required(), // Required for production
      SUPABASE_ANON_KEY: Joi.string().required(),
      SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
      DATABASE_PASSWORD: isTest || nodeEnv === 'development' 
        ? Joi.string().optional() // Optional for local development
        : Joi.string().required(), // Required for production
      
      // Database Connection Components
      DB_HOST: isTest || nodeEnv === 'development' 
        ? Joi.string().optional() // Optional for local development  
        : Joi.string().required(), // Required for production
      DB_PORT: Joi.number().default(isTest ? 54322 : 5432),
      DB_NAME: Joi.string().default('postgres'),
      DB_USER: Joi.string().default('postgres'),
      
      // Pooler Connection Components (simplified for test environment)
      POOLER_HOST: isTest || nodeEnv === 'development'
        ? Joi.string().default('127.0.0.1')
        : Joi.string().required(),
      POOLER_SESSION_PORT: Joi.number().default(isTest ? 54322 : 5432),
      POOLER_TRANSACTION_PORT: Joi.number().default(isTest ? 54322 : 6543),
      POOLER_USER: isTest || nodeEnv === 'development'
        ? Joi.string().default('postgres')
        : Joi.string().required(),
      
      // Connection Strings (simplified for test environment)
      DATABASE_URL: Joi.string().required(),
      DATABASE_URL_SERVICE_ROLE: isTest || nodeEnv === 'development'
        ? Joi.string().default(Joi.ref('DATABASE_URL'))
        : Joi.string().required(),
      DATABASE_URL_POOLER_SESSION: isTest || nodeEnv === 'development'
        ? Joi.string().default(Joi.ref('DATABASE_URL'))
        : Joi.string().required(),
      DATABASE_URL_POOLER_TRANSACTION: isTest || nodeEnv === 'development'
        ? Joi.string().default(Joi.ref('DATABASE_URL'))
        : Joi.string().required(),
    
    // SSL Configuration (disabled for local test environment)
    NODE_TLS_REJECT_UNAUTHORIZED: Joi.string().allow('0', '1').default(isTest ? '0' : '1'),
    SSL_MODE: Joi.string().valid('require', 'prefer', 'disable').default(isTest ? 'disable' : 'require'),
    
    // Migration Configuration
    MIGRATIONS_DIR: Joi.string().default('./backend/supabase/migrations'),
    
    // DNS Testing Fallback
    DB_IP_ADDRESS: Joi.string().allow('').optional(),
    
    // Connection Timeout
    CONNECTION_TIMEOUT: Joi.number().default(30000),
    
    // Auth
    // JWT_SECRET: Joi.string().required().min(32), // Removed - Supabase handles JWT secrets
    // JWT_EXPIRES_IN: Joi.string().default('1h'), // Removed - Supabase handles JWT expiry
    // REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('7d'), // Removed - Supabase handles refresh token expiry
    
    // Security
    RATE_LIMIT_WINDOW_MS: Joi.number().default(60000), // 1 minute
    RATE_LIMIT_MAX: Joi.number().default(100), // 100 requests per window
    
    // External services
    OPENAI_API_KEY: Joi.string().allow(''),
    PERPLEXITY_API_KEY: Joi.string().allow(''),
    
    // CORS
    CORS_ORIGIN: Joi.string().default('*'),
    
    // Documentation Settings
    ENABLE_DOCS_IN_PRODUCTION: Joi.string().valid('true', 'false').default('false'),
    API_DOCS_USERNAME: Joi.string().default('admin'),
    API_DOCS_PASSWORD: Joi.string().default('change_me')
    })
    .unknown();
};

// Create the appropriate schema based on environment
const envSchema = createEnvSchema(nodeEnv);

// Validate environment variables
const { value: env, error } = envSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Environment validation error: ${error.message}`);
}

// Debug log removed
// console.log('[backend/config/env.js] Validated OPENAI_API_KEY:', env.OPENAI_API_KEY ? 'Yes' : 'No');

// Organize environment variables into categories for easier access
module.exports = {
  env: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  
  app: {
    version: '1.0.0',
    nodeEnv: env.NODE_ENV
  },
  
  // Raw environment variables for direct access (maintaining compatibility)
  ENABLE_DOCS_IN_PRODUCTION: env.ENABLE_DOCS_IN_PRODUCTION,
  API_DOCS_USERNAME: env.API_DOCS_USERNAME,
  API_DOCS_PASSWORD: env.API_DOCS_PASSWORD,
  
  supabase: {
    url: env.SUPABASE_URL,
    projectRef: env.SUPABASE_PROJECT_REF,
    anonKey: env.SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    databasePassword: env.DATABASE_PASSWORD,
    
    // Database direct connection components
    dbHost: env.DB_HOST,
    dbPort: env.DB_PORT,
    dbName: env.DB_NAME,
    dbUser: env.DB_USER,
    
    // Pooler connection components
    poolerHost: env.POOLER_HOST,
    poolerSessionPort: env.POOLER_SESSION_PORT,
    poolerTransactionPort: env.POOLER_TRANSACTION_PORT,
    poolerUser: env.POOLER_USER,
    
    // Connection strings
    databaseUrl: env.DATABASE_URL,
    databaseUrlServiceRole: env.DATABASE_URL_SERVICE_ROLE,
    databaseUrlPoolerSession: env.DATABASE_URL_POOLER_SESSION,
    databaseUrlPoolerTransaction: env.DATABASE_URL_POOLER_TRANSACTION,
    
    // SSL configuration
    sslRejectUnauthorized: env.NODE_TLS_REJECT_UNAUTHORIZED === '0' ? false : true,
    sslMode: env.SSL_MODE,
    
    // DNS fallback
    dbIpAddress: env.DB_IP_ADDRESS,
    
    connectionTimeout: parseInt(env.CONNECTION_TIMEOUT) || 30000
  },
  
  migrations: {
    directory: env.MIGRATIONS_DIR
  },
  
  auth: {
    // jwtSecret: env.JWT_SECRET, // Removed
    // jwtExpiresIn: env.JWT_EXPIRES_IN, // Removed
    // refreshTokenExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN, // Removed
    adminBypassOwnership: true // Config flag that allows admins to bypass ownership checks
  },
  
  security: {
    rateLimit: {
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX
    }
  },
  
  externalServices: {
    openai: {
      apiKey: env.OPENAI_API_KEY
    },
    perplexity: {
      apiKey: env.PERPLEXITY_API_KEY
    }
  },
  
  cors: {
    origin: env.CORS_ORIGIN
  },
  
  docs: {
    enableInProduction: env.ENABLE_DOCS_IN_PRODUCTION === 'true',
    apiDocsUsername: env.API_DOCS_USERNAME,
    apiDocsPassword: env.API_DOCS_PASSWORD
  }
}; 