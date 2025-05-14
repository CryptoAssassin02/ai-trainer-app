/**
 * @fileoverview Environment variables configuration
 * Loads and validates environment variables with appropriate defaults
 */

const dotenv = require('dotenv');
const path = require('path');
const os = require('os');
const Joi = require('joi');

// Load environment variables from .env file
// REMOVE THIS LINE - Let Next.js handle .env loading
dotenv.config({ path: path.resolve(__dirname, '../.env') }); // Use relative path
// Or use absolute path for certainty:
// dotenv.config({ path: '/Users/dylanloberg/ai-trainer-app/backend/.env' });

// Schema for environment variable validation
const envSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string()
      .valid('development', 'production', 'test')
      .default('development'),
    PORT: Joi.number().default(8000),
    
    // Supabase
    SUPABASE_URL: Joi.string().required(),
    SUPABASE_PROJECT_REF: Joi.string().required(),
    SUPABASE_ANON_KEY: Joi.string().required(),
    SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
    DATABASE_PASSWORD: Joi.string().required(),
    
    // Database Connection Components
    DB_HOST: Joi.string().required(),
    DB_PORT: Joi.number().default(5432),
    DB_NAME: Joi.string().default('postgres'),
    DB_USER: Joi.string().default('postgres'),
    
    // Pooler Connection Components
    POOLER_HOST: Joi.string().required(),
    POOLER_SESSION_PORT: Joi.number().default(5432),
    POOLER_TRANSACTION_PORT: Joi.number().default(6543),
    POOLER_USER: Joi.string().required(),
    
    // Connection Strings
    DATABASE_URL: Joi.string().required(),
    DATABASE_URL_SERVICE_ROLE: Joi.string().required(),
    DATABASE_URL_POOLER_SESSION: Joi.string().required(),
    DATABASE_URL_POOLER_TRANSACTION: Joi.string().required(),
    
    // SSL Configuration
    NODE_TLS_REJECT_UNAUTHORIZED: Joi.string().allow('0', '1').default('1'),
    SSL_MODE: Joi.string().valid('require', 'prefer', 'disable').default('require'),
    
    // Migration Configuration
    MIGRATIONS_DIR: Joi.string().default('./backend/migrations'),
    
    // DNS Testing Fallback
    DB_IP_ADDRESS: Joi.string().allow('').optional(),
    
    // Connection Timeout
    CONNECTION_TIMEOUT: Joi.number().default(30000),
    
    // Auth
    JWT_SECRET: Joi.string().required().min(32),
    JWT_EXPIRES_IN: Joi.string().default('1h'),
    REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('7d'),
    
    // Security
    RATE_LIMIT_WINDOW_MS: Joi.number().default(60000), // 1 minute
    RATE_LIMIT_MAX: Joi.number().default(100), // 100 requests per window
    
    // External services
    OPENAI_API_KEY: Joi.string().allow(''),
    PERPLEXITY_API_KEY: Joi.string().allow(''),
    
    // CORS
    CORS_ORIGIN: Joi.string().default('*')
  })
  .unknown();

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
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    refreshTokenExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
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
  }
}; 