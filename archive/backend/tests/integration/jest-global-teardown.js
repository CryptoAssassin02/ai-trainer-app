// backend/tests/integration/jest-global-teardown.js
module.exports = async () => {
  console.log('\\nJest GlobalTeardown: Integration test run complete.');
  // No specific actions to stop the database here, as it might be useful to inspect
  // its state after tests, or for subsequent local test runs.
  // The Supabase stack can be stopped manually using `npm run supabase:stop`.
  // CI environments should handle Docker cleanup independently.
}; 