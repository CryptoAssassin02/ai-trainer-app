// Set essential ENV variables directly for tests BEFORE anything else loads
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://mock-test-url.supabase.co';
process.env.SUPABASE_ANON_KEY = 'mock-test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-test-service-role-key';
// Add any other REQUIRED env vars needed by config/env.js Joi schema
process.env.SUPABASE_PROJECT_REF = 'test-project-ref';
process.env.DATABASE_PASSWORD = 'mock-test-db-password';
process.env.DB_HOST = 'db.mock-test-url.supabase.co';
process.env.DB_PORT = '5432';
process.env.POOLER_HOST = 'db.mock-test-url.supabase.co';
process.env.POOLER_USER = 'postgres.test-project-ref';
process.env.DATABASE_URL = 'postgresql://postgres:mock-test-db-password@db.mock-test-url.supabase.co:5432/postgres';
process.env.DATABASE_URL_SERVICE_ROLE = 'postgresql://postgres:mock-test-db-password@db.mock-test-url.supabase.co:5432/postgres';
process.env.DATABASE_URL_POOLER_SESSION = 'postgresql://postgres.test-project-ref:mock-test-db-password@db.mock-test-url.supabase.co:5432/postgres';
process.env.DATABASE_URL_POOLER_TRANSACTION = 'postgresql://postgres.test-project-ref:mock-test-db-password@db.mock-test-url.supabase.co:6543/postgres';
process.env.JWT_SECRET = 'mock-test-jwt-secret-needs-32-chars-or-more';
process.env.JWT_EXPIRES_IN = '15m';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
process.env.REFRESH_SECRET = 'test-refresh-secret-key-32-chars';
// Ensure required API keys are set (can be mock values)
process.env.OPENAI_API_KEY = 'mock-openai-key';
process.env.PERPLEXITY_API_KEY = 'mock-perplexity-key';

// REMOVED dotenv loading
// require('dotenv').config({ path: __dirname + '/../.env.test' });

// REMOVED explicit config mocks

/**
 * @fileoverview Global setup for backend tests
 * Ensures consistent setup across all backend test suites
 */

// Commented out server require
// const { server } = require('../index'); 

// Clear all mocks before each test to prevent state leakage
beforeEach(() => {
  jest.clearAllMocks();
});

// Optionally, add global setup/teardown logic if needed
afterAll(async () => {
  // Close server if it exists and has a close method
  // Need a way to access the server instance if started by tests
  // if (global.server && typeof global.server.close === 'function') {
  //   await new Promise(resolve => global.server.close(resolve));
  //   console.log('Test server closed');
  // }
});

// You can set up other global mocks or test helpers here

// REMOVE existing setup code if it conflicts or is now handled by .env.test
// // Test setup file
// // Set up necessary environment variables for testing
// process.env.NODE_ENV = 'test';
// process.env.JWT_SECRET = 'test-secret-key-for-jest-tests-32-chars';
// process.env.SUPABASE_URL = 'http://localhost:54321'; // Use Supabase CLI local URL
// process.env.SUPABASE_ANON_KEY = 'your-local-anon-key'; // Use Supabase CLI local key
// process.env.SUPABASE_SERVICE_ROLE_KEY = 'your-local-service-role-key'; // Use Supabase CLI local key
// process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:54322/postgres'; // Use direct DB connection for tests

// // Mock console methods to prevent excessive logging during tests
// // You can adjust the mock implementation as needed
// // global.console = {
// //   ...console,
// //   log: jest.fn(),
// //   info: jest.fn(),
// //   warn: jest.fn(),
// //   error: jest.fn(),
// // };

// REMOVED the duplicate assignments below this line
// // Mock Supabase environment variables
// process.env.SUPABASE_URL = 'https://test-project.supabase.co';
// process.env.SUPABASE_KEY = 'test-anon-key';
// process.env.SUPABASE_PROJECT_REF = 'test-project-ref';
// process.env.SUPABASE_ANON_KEY = 'test-anon-key';
// process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
// process.env.DATABASE_PASSWORD = 'test-db-password';
// 
// // Database connection components
// process.env.DB_HOST = 'test-db-host.supabase.co';
// process.env.DB_PORT = '5432';
// process.env.DB_NAME = 'postgres';
// process.env.DB_USER = 'postgres';
// 
// // Pooler connection components
// process.env.POOLER_HOST = 'test-pooler-host.supabase.co';
// process.env.POOLER_SESSION_PORT = '5432';
// process.env.POOLER_TRANSACTION_PORT = '6543';
// process.env.POOLER_USER = 'test-pooler-user';
// 
// // Connection strings
// process.env.DATABASE_URL = 'postgresql://postgres:password@test-db-host:5432/postgres';
// process.env.DATABASE_URL_SERVICE_ROLE = 'postgresql://postgres:password@test-db-host:5432/postgres';
// process.env.DATABASE_URL_POOLER_SESSION = 'postgresql://postgres:password@test-pooler-host:5432/postgres';
// process.env.DATABASE_URL_POOLER_TRANSACTION = 'postgresql://postgres:password@test-pooler-host:6543/postgres';
// 
// // Auth
// process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';
// process.env.JWT_EXPIRES_IN = '1h';
// process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
// 
// // External services
// process.env.OPENAI_API_KEY = 'test-openai-key';
// process.env.PERPLEXITY_API_KEY = 'test-perplexity-key'; 