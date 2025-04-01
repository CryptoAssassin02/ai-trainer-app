/**
 * @fileoverview Mock environment configuration for tests
 */

const mockEnv = {
  // Auth settings
  auth: {
    jwtSecret: 'test-jwt-secret',
    jwtExpiresIn: '15m',
    refreshTokenExpiresIn: '7d'
  },
  
  // Database settings
  database: {
    host: 'localhost',
    port: 5432,
    user: 'test-user',
    password: 'test-password',
    name: 'test-db'
  },
  
  // Server settings
  server: {
    port: 5000,
    environment: 'test'
  },
  
  // Supabase settings
  supabase: {
    url: 'https://test-project.supabase.co',
    key: 'test-supabase-key',
    serviceRoleKey: 'test-service-role-key'
  }
};

module.exports = mockEnv; 