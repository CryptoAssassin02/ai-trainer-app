const env = require('./env');

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
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Configuration object
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

module.exports = config; 