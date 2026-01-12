/**
 * @fileoverview Mock environment configuration for tests
 */

const mockEnv = {
  // Application environment
  env: 'test',
  isDevelopment: false,
  isProduction: false,
  isTest: true,
  port: 8000,
  
  // Supabase settings
  supabase: {
    url: 'https://test-project.supabase.co',
    projectRef: 'test-project-ref',
    anonKey: 'test-anon-key',
    serviceRoleKey: 'test-service-role-key',
    databasePassword: 'test-db-password',
    
    // Database direct connection components
    dbHost: 'test-db-host.supabase.co',
    dbPort: 5432,
    dbName: 'postgres',
    dbUser: 'postgres',
    
    // Pooler connection components
    poolerHost: 'test-pooler-host.supabase.co',
    poolerSessionPort: 5432,
    poolerTransactionPort: 6543,
    poolerUser: 'test-pooler-user',
    
    // Connection strings
    databaseUrl: 'postgresql://postgres:password@test-db-host:5432/postgres',
    databaseUrlServiceRole: 'postgresql://postgres:password@test-db-host:5432/postgres',
    databaseUrlPoolerSession: 'postgresql://postgres:password@test-pooler-host:5432/postgres',
    databaseUrlPoolerTransaction: 'postgresql://postgres:password@test-pooler-host:6543/postgres',
    
    // SSL configuration
    sslRejectUnauthorized: false,
    sslMode: 'disable',
    
    // DNS fallback
    dbIpAddress: '127.0.0.1',
    
    connectionTimeout: 5000
  },
  
  // Migrations
  migrations: {
    directory: './backend/migrations'
  },
  
  // Auth settings
  auth: {
    jwtSecret: 'test-jwt-secret-that-is-at-least-32-characters-long',
    jwtExpiresIn: '1h',
    refreshTokenExpiresIn: '7d',
    refreshSecret: 'test-refresh-token-secret-that-is-at-least-32-chars',
    accessTokenExpiry: '1h',
    refreshTokenExpiry: '7d',
    adminBypassOwnership: true
  },
  
  // Security
  security: {
    rateLimit: {
      windowMs: 60000,
      max: 100
    }
  },
  
  // External services
  externalServices: {
    openai: {
      apiKey: 'test-openai-key'
    },
    perplexity: {
      apiKey: 'test-perplexity-key'
    }
  },
  
  // CORS
  cors: {
    origin: '*'
  }
};

module.exports = mockEnv; 