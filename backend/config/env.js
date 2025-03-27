/**
 * @fileoverview Environment variables configuration
 * Loads and validates environment variables with appropriate defaults
 */

const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Schema for environment variable validation
const envSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string()
      .valid('development', 'production', 'test')
      .default('development'),
    PORT: Joi.number().default(8000),
    
    // Supabase
    SUPABASE_URL: Joi.string().required(),
    SUPABASE_ANON_KEY: Joi.string().required(),
    SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
    
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

// Organize environment variables into categories for easier access
module.exports = {
  env: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  
  supabase: {
    url: env.SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY
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