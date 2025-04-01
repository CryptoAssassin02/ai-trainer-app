const winston = require('winston');
const env = require('./env');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Add console transport in development
if (!env.server.isProduction) {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
  'OPENAI_API_KEY',
  'PERPLEXITY_API_KEY'
];

// Validate environment variables
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Configuration object
const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3001,
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '1d'
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

module.exports = { config, logger }; 