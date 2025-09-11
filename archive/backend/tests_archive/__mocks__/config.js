// Mock configuration for testing environment

// Mock the Supabase configuration
const supabaseConfig = {
  url: 'https://mock-supabase-url.supabase.co',
  anonKey: 'mock-supabase-key',
  serviceRoleKey: 'mock-service-role-key',
  projectRef: 'mock-project-ref'
};

// Mock JWT configuration
const jwtConfig = {
  accessTokenSecret: 'mock-access-token-secret',
  refreshTokenSecret: 'mock-refresh-token-secret',
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d'
};

// Mock other config values
const port = 3000;
const nodeEnv = 'test';
const loggingEnabled = false;

// Add proper supabase property structure
const supabase = {
  url: 'https://test-project.supabase.co',
  projectRef: 'test-project-ref',
  anonKey: 'test-anon-key',
  serviceRoleKey: 'test-service-role-key',
  databasePassword: 'test-db-password'
};

module.exports = {
  supabaseConfig,
  jwtConfig,
  port,
  nodeEnv,
  loggingEnabled,
  supabase
}; 