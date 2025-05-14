// backend/tests/__mocks__/config/env.integration.js

// Mock environment variables specifically for integration tests
// Use dummy values or values pointing to a local/test Supabase instance if needed

module.exports = {
  env: 'test', // Explicitly set environment
  isDevelopment: false,
  isProduction: false,
  isTest: true,
  port: 8001, // Different port for testing?
  
  supabase: {
    url: process.env.SUPABASE_URL || 'http://localhost:54321', // Use env var or fallback to local Supabase URL
    projectRef: process.env.SUPABASE_PROJECT_REF || 'test-project',
    anonKey: process.env.SUPABASE_ANON_KEY || 'test-anon-key', 
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key',
    databasePassword: process.env.DATABASE_PASSWORD || 'test-db-password',
    
    dbHost: process.env.DB_HOST || 'localhost',
    dbPort: process.env.DB_PORT || 54321,
    dbName: process.env.DB_NAME || 'postgres',
    dbUser: process.env.DB_USER || 'postgres',
    
    poolerHost: process.env.POOLER_HOST || 'localhost',
    poolerSessionPort: process.env.POOLER_SESSION_PORT || 6543,
    poolerTransactionPort: process.env.POOLER_TRANSACTION_PORT || 6543,
    poolerUser: process.env.POOLER_USER || 'postgres',
    
    databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:test-db-password@localhost:54321/postgres',
    databaseUrlServiceRole: process.env.DATABASE_URL_SERVICE_ROLE || 'postgresql://postgres:test-service-role-key@localhost:54321/postgres',
    databaseUrlPoolerSession: process.env.DATABASE_URL_POOLER_SESSION || 'postgresql://postgres:test-db-password@localhost:6543/postgres?pgbouncer=true',
    databaseUrlPoolerTransaction: process.env.DATABASE_URL_POOLER_TRANSACTION || 'postgresql://postgres:test-db-password@localhost:6543/postgres?pgbouncer=true',
    
    sslRejectUnauthorized: false, // Typically false for local testing
    sslMode: 'prefer', // Typically prefer for local testing
    
    dbIpAddress: process.env.DB_IP_ADDRESS || undefined,
    connectionTimeout: parseInt(process.env.CONNECTION_TIMEOUT) || 5000 // Shorter timeout for tests
  },
  
  migrations: {
    directory: './backend/migrations'
  },
  
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'test-super-secret-jwt-key-with-at-least-32-chars',
    jwtExpiresIn: '15m',
    refreshTokenExpiresIn: '1d',
    adminBypassOwnership: true
  },
  
  security: {
    rateLimit: {
      windowMs: 60000,
      max: 500 // Allow more requests during testing
    }
  },
  
  externalServices: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || 'test-openai-key'
    },
    perplexity: {
      apiKey: process.env.PERPLEXITY_API_KEY || 'test-perplexity-key'
    }
  },
  
  cors: {
    origin: '*' // Allow all for testing, or specific test origins
  }
}; 