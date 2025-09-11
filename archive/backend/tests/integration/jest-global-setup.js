const { execSync } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

module.exports = async () => {
  console.log('\\nJest GlobalSetup: Ensuring local Supabase environment is ready...');

  // Load .env.test to ensure any environment variables needed by Supabase CLI are set
  dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

  // Assumption: The user will run `npm run supabase:start` (or `cd backend && npx supabase start`)
  // manually before starting a test session if the local Supabase stack is not already running.
  // This script will focus on resetting the database.

  try {
    // TEMPORARILY DISABLED: Reset the local Supabase database. This command:
    // 1. Drops the existing local database.
    // 2. Re-creates it.
    // 3. Applies all migrations from `backend/supabase/migrations/`.
    // 4. Runs the `backend/supabase/seed.sql` script.
    console.log('Skipping database reset for now - using existing database state...');
    // execSync('npx supabase db reset --local', {
    //   cwd: path.resolve(__dirname, '../../backend'), // Ensure executed from backend/ directory context
    //   stdio: 'inherit', // Show output from the command
    //   env: { ...process.env }, // Pass current environment, which includes .env.test vars
    // });
    console.log('Using existing local Supabase database state.');
  } catch (error) {
    console.error('FATAL: Failed to reset local Supabase test database during jest-global-setup.js:', error);
    process.exit(1); // Critical failure, exit tests
  }
}; 