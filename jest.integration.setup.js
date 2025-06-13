// Polyfill for setImmediate (needed for Winston logger)
global.setImmediate = (callback, ...args) => setTimeout(callback, 0, ...args);

// Integration test setup file
const dotenv = require('dotenv');
const path = require('path');
const { Client } = require('pg');

// Load environment variables from backend/.env.test file specifically for integration tests
// This ensures we are using the test database and other test-specific settings.
dotenv.config({ path: path.resolve(__dirname, 'backend/.env.test'), override: true });

// Fallback to .env.local if backend/.env.test is not sufficient or for other shared dev vars
// but backend/.env.test should take precedence for DB connections etc.
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

// Log integration test configuration without revealing sensitive information
console.log('🧪 Integration test setup loaded (jest.integration.setup.js)');
console.log('ℹ️ Using environment variables from backend/.env.test');

// Import the standard Jest setup to ensure we have all the normal mock configuration
require('./jest.setup');

// Database clearing logic from backend/tests/integration/jest-setup-after-env.js
const dbConfig = {
  connectionString: process.env.SUPABASE_DB_URL, // Ensure this uses the correct var from .env.test
};

const tablesToClear = [
  'agent_memory',
  'meal_logs',
  'workout_logs',
  'analytics_events',
  'user_check_ins',
  'notification_preferences',
  'dietary_preferences',
  'nutrition_plans',
  'workout_plans',
  // 'user_profiles', // profiles are linked to auth.users, cascade should handle. If issues, add back.
  'contraindications',
  'exercises'
  // Note: 'migrations' table (from supabase schema) and auth schema tables are not included here.
  // public.user_profiles is often linked to auth.users via a trigger or direct FK.
  // Truncating auth.users is handled by `supabase db reset` in globalSetup.
  // If user_profiles table is not correctly cleared by cascade from auth.users, add it here.
];

async function clearTestDatabaseTables() {
  if (!process.env.SUPABASE_DB_URL) {
    console.warn('⚠️ SUPABASE_DB_URL not found in environment for jest.integration.setup.js. Skipping table clearing.');
    return;
  }
  const client = new Client(dbConfig);
  try {
    await client.connect();
    // console.log('Clearing test database tables before each integration test...');
    for (const table of tablesToClear) {
      // console.log(`Truncating public."${table}"...`);
      await client.query(`TRUNCATE TABLE public."${table}" RESTART IDENTITY CASCADE`);
    }
    // console.log('Test database tables cleared for integration test.');
  } catch (error) {
    console.error('Error clearing test database tables during jest.integration.setup.js:', error);
    throw error;
  } finally {
    await client.end();
  }
}

beforeEach(async () => {
  // console.log('Running beforeEach in jest.integration.setup.js to clear tables.');
  await clearTestDatabaseTables();
});

console.log('DB clearing (beforeEach) configured in jest.integration.setup.js'); 