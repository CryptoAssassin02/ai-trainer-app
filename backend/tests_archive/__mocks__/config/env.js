/**
 * @fileoverview Mocked environment configuration for tests
 */

const mockEnv = {
  env: 'test',
  isDevelopment: false,
  isProduction: false,
  isTest: true,
  port: 8000,
  
  supabase: {
    url: 'https://mock-supabase-url.com',
    projectRef: 'mock-project-ref',
    anonKey: 'mock-anon-key',
    serviceRoleKey: 'mock-service-role-key',
    databasePassword: 'mock-password',
    
    // Database direct connection components
    dbHost: 'mock-db-host',
    dbPort: 5432,
    dbName: 'mock-db-name',
    dbUser: 'mock-db-user',
    
    // Pooler connection components
    poolerHost: 'mock-pooler-host',
    poolerSessionPort: 5432,
    poolerTransactionPort: 6543,
    poolerUser: 'mock-pooler-user',
    
    // Connection strings
    databaseUrl: 'postgresql://mock:mock@mock-host:5432/mock-db',
    databaseUrlServiceRole: 'postgresql://mock:mock@mock-host:5432/mock-db',
    databaseUrlPoolerSession: 'postgresql://mock:mock@mock-host:5432/mock-db',
    databaseUrlPoolerTransaction: 'postgresql://mock:mock@mock-host:6543/mock-db',
    
    // SSL configuration
    sslRejectUnauthorized: false,
    sslMode: 'prefer',
    
    // DNS fallback
    dbIpAddress: '',
    
    connectionTimeout: 30000
  },
  
  migrations: {
    directory: './backend/migrations'
  },
  
  auth: {
    jwtSecret: 'mock-jwt-secret-at-least-32-characters-long',
    jwtExpiresIn: '1h',
    refreshTokenExpiresIn: '7d',
    adminBypassOwnership: true,
    enableTokenBlacklisting: true
  },
  
  security: {
    rateLimit: {
      windowMs: 60000,
      max: 100
    }
  },
  
  externalServices: {
    openai: {
      apiKey: 'mock-openai-api-key'
    },
    perplexity: {
      apiKey: 'mock-perplexity-api-key'
    }
  },
  
  cors: {
    origin: '*'
  }
};

module.exports = mockEnv; 