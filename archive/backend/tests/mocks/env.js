/**
 * Mock environment configuration for tests
 */

module.exports = {
  // JWT config
  jwt: {
    secret: 'test-jwt-secret',
    expiresIn: '1h',
    algorithm: 'HS256',
    refreshExpiresIn: '7d',
    useTokenRotation: true,
  },
  
  // Supabase config
  supabase: {
    url: 'https://mock-supabase-url.com',
    anonKey: 'mock-anon-key',
    serviceRoleKey: 'mock-service-role-key',
    profilesTable: 'user_profiles',
  },
  
  // Auth config
  auth: {
    tokenBlacklistTable: 'token_blacklist',
    maxLoginAttempts: 5,
    loginLockoutTime: 15, // minutes
    useTokenRotation: true,
  },
  
  // Server config
  server: {
    port: 3000,
    corsOrigins: ['http://localhost:3000'],
  },
  
  // Profile config
  profile: {
    maxRetryAttempts: 3,
  },
  
  // OpenAI config
  openai: {
    apiKey: 'mock-openai-key',
    model: 'gpt-4',
    maxTokens: 1000,
  },
  
  // Perplexity config
  perplexity: {
    apiKey: 'mock-perplexity-key',
    model: 'pplx-7b-online',
  },
  
  // Log levels
  logLevel: 'debug',
}; 