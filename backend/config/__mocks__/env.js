/**
 * @fileoverview Mock environment configuration for testing
 */

module.exports = {
  env: 'test',
  isDevelopment: false,
  isProduction: false,
  isTest: true,
  port: 3000,
  
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
    
    sslRejectUnauthorized: false,
    sslMode: 'disable',
    connectionTimeout: 30000
  },
  
  auth: {
    jwtSecret: 'test-jwt-secret-that-is-at-least-32-characters-long',
    jwtExpiresIn: '1h',
    refreshTokenExpiresIn: '7d',
    adminBypassOwnership: true
  },
  
  security: {
    rateLimit: {
      windowMs: 60000,
      max: 100
    }
  },
  
  externalServices: {
    openai: {
      apiKey: 'test-openai-key'
    },
    perplexity: {
      apiKey: 'test-perplexity-key'
    }
  },
  
  cors: {
    origin: '*'
  }
}; 