# Integration Testing Infrastructure Implementation Plan

This plan outlines the steps to set up a robust integration testing infrastructure for the backend, utilizing a local Supabase stack managed by the Supabase CLI and Jest for test execution.

## Phase 1: Local Supabase Test Environment & Supabase CLI Integration

1.  [x] **Install/Update Supabase CLI:**
    *   [x] Ensure the Supabase CLI is installed in your development environment. If not, install it (e.g., `npm install supabase --save-dev` or via a global package manager like `brew`).
    *   [x] Reference: [Supabase CLI Getting Started](https://supabase.com/docs/guides/local-development/cli/getting-started)

2.  [x] **Initialize Supabase Project in Backend Directory:**
    *   [x] Navigate to the `backend/` directory in your terminal.
    *   [x] Run the command: `npx supabase init`.
    *   [x] This will create a `backend/supabase/` directory. This directory will contain a `config.toml` file and a `migrations/` subdirectory.

3.  [x] **Consolidate Database Migrations:**
    *   [x] Move all existing SQL migration files from your current `backend/migrations/` directory into the newly created `backend/supabase/migrations/` directory.
    *   [x] Verify that the filenames within `backend/supabase/migrations/` adhere to the `YYYYMMDDHHMMSS_descriptive_name.sql` naming convention.
    *   [x] Delete the old (now empty) `backend/migrations/` directory.

4.  [x] **Configure JWT Secret for Local Supabase Auth:**
    *   [x] Open the `backend/supabase/config.toml` file.
    *   [x] Under the `[auth]` section, specify the JWT secret. If the section or key doesn't exist, add it:
        ```toml
        [auth]
        # ... other auth settings
        jwt_secret = "your-chosen-strong-and-unique-test-secret-for-local-supabase"
        # ...
        ```
    *   [x] **Important:** Choose a strong, unique secret and make a secure note of this exact string. This secret must match the `JWT_SECRET` environment variable used by your application's token verification logic during tests.

5.  [x] **Start the Local Supabase Stack:**
    *   [x] From the `backend/` directory, run the command: `npx supabase start`.
    *   [x] On the first run, this will download the necessary Docker images and then start all local Supabase services (PostgreSQL, GoTrue for Auth, PostgREST, Storage, etc.).
    *   [x] Carefully note the output from this command. It will display crucial information for your local stack, including:
        *   [x] API URL (e.g., `http://localhost:54321`)
        *   [x] DB URL (e.g., `postgresql://postgres:postgres@localhost:54322/postgres`)
        *   [x] Studio URL
        *   [x] `anon key`
        *   [x] `service_role key`

6.  [x] **Create and Configure Test Environment File (`backend/.env.test`):**
    *   [x] Create a new file named `.env.test` in the `backend/` directory.
    *   [x] Populate it with the following variables, substituting the placeholder values with the actual credentials and URLs provided by the `npx supabase start` command and your chosen JWT secret:
        ```env
        NODE_ENV=test

        # Values from 'npx supabase start' output for your LOCAL DOCKER SUPABASE instance
        SUPABASE_URL=http://localhost:54321 # Replace with your local API URL
        SUPABASE_ANON_KEY=your_local_anon_key_from_supabase_start # Replace
        SUPABASE_SERVICE_ROLE_KEY=your_local_service_role_key_from_supabase_start # Replace
        DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres # Replace with your local DB URL

        # This JWT_SECRET MUST EXACTLY MATCH the 'jwt_secret' in backend/supabase/config.toml
        JWT_SECRET=your-chosen-strong-and-unique-test-secret-for-local-supabase # Replace

        # Add mock API keys or specific settings for other external services if they are
        # called during integration tests and should not use real credentials/production modes.
        PERPLEXITY_API_KEY=MOCK_PERPLEXITY_KEY_FOR_INTEGRATION_TESTS
        OPENAI_API_KEY=MOCK_OPENAI_KEY_FOR_INTEGRATION_TESTS
        # Add any other application-specific environment variables required for testing
        ```
    *   [x] Ensure `backend/.env.test` is added to your project's `.gitignore` file to prevent committing local credentials.

7.  [x] **Create Initial Database Seed File (`backend/supabase/seed.sql`):**
    *   [x] Create a file named `seed.sql` inside the `backend/supabase/` directory.
    *   [x] This SQL script will be automatically executed by `npx supabase db reset` after migrations are applied.
    *   [x] Use this file to populate your database with baseline reference data that is common across many tests (e.g., lookup table values, default settings).
    *   [x] **Note:** Avoid seeding the `users` table or other tables directly managed by Supabase Auth here, as it can lead to inconsistencies. Test user creation should ideally happen via API calls during the tests themselves or via specific seeding helper functions that use the Auth API.
    *   [x] Example content for `backend/supabase/seed.sql`:
        ```sql
        -- backend/supabase/seed.sql
        -- Example: Seeding a 'exercise_types' reference table
        -- INSERT INTO public.exercise_types (name) VALUES
        --   ('Cardio'),
        --   ('Strength'),
        --   ('Flexibility');

        -- Add INSERT statements for any other non-user, non-auth-managed reference data.
        -- If you have data like `contraindications.json`, convert it to SQL INSERTs here
        -- if there's a corresponding table.
        INSERT INTO public.contraindications (name) VALUES ('Knee Injury'), ('Shoulder Pain');
        ```

## [x] Phase 2: Jest Configuration for Integration Tests

1.  [x] **Create Integration Test Directory:**
    *   [x] Create a new directory: `backend/tests/integration/`.

2.  [x] **Create Jest Integration Test Configuration File (`backend/jest.integration.config.js`):**
    *   [x] Create the file with the following content:
        ```javascript
        // backend/jest.integration.config.js
        module.exports = {
          rootDir: '.', // Sets the root directory to 'backend/'
          testEnvironment: 'node',
          verbose: true,
          testMatch: ['<rootDir>/tests/integration/**/*.test.js'], // Pattern for finding test files
          globalSetup: '<rootDir>/tests/integration/jest-global-setup.js',
          globalTeardown: '<rootDir>/tests/integration/jest-global-teardown.js',
          setupFilesAfterEnv: ['<rootDir>/tests/integration/jest-setup-after-env.js'], // Runs after test framework is installed
          testTimeout: 30000, // 30 seconds timeout for tests (can be adjusted)
          collectCoverage: true,
          coverageDirectory: '<rootDir>/coverage/integration', // Output directory for coverage reports
          coverageProvider: 'v8', // or 'babel'
          // If your project uses Babel (common for ES6+ features in Node.js)
          transform: {
            '^.+\\.js$': 'babel-jest', // Assumes babel.config.js is set up
          },
          // Consider adding 'clearMocks: true' if not already in your global Jest config or setup
        };
        ```

3.  [x] **Add Scripts to `backend/package.json`:**
    *   [x] Open your `backend/package.json` file.
    *   [x] Add or update the `scripts` section to include commands for running integration tests and managing the local Supabase environment:
        ```json
        {
          "name": "trainer-backend",
          // ... other package.json content ...
          "scripts": {
            "start": "node server.js",
            "dev": "nodemon server.js",
            "test": "jest --coverage", // Your existing general test script
            "test:integration": "NODE_ENV=test jest --config backend/jest.integration.config.js --runInBand",
            "migrate": "node ./scripts/runMigrations.js", // Your existing migration script
            "supabase:start": "cd backend && npx supabase start",
            "supabase:stop": "cd backend && npx supabase stop",
            "db:reset:local": "cd backend && npx supabase db reset --local"
            // ... other scripts ...
          }
          // ... rest of package.json ...
        }
        ```
    *   [x] The `--runInBand` flag for `test:integration` makes Jest run test files serially, which is often safer for integration tests that modify a shared database state.

## [x] Phase 3: Test Database Lifecycle Management Scripts (Jest Global Hooks)

1.  [x] **Create Global Setup Script (`backend/tests/integration/jest-global-setup.js`):**
    *   [x] This script runs once before all integration tests. Its primary role is to ensure the test database is ready and migrated.
    *   [x] Content:
        ```javascript
        // backend/tests/integration/jest-global-setup.js
        const { execSync } = require('child_process');
        const path = require('path');
        const dotenv = require('dotenv');

        module.exports = async () => {
          console.log('\\nJest GlobalSetup: Ensuring local Supabase environment is ready and database is reset...');

          // Load .env.test to ensure any environment variables needed by Supabase CLI are set
          dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

          // Assumption: The user will run `npm run supabase:start` (or `cd backend && npx supabase start`)
          // manually before starting a test session if the local Supabase stack is not already running.
          // This script will focus on resetting the database.

          try {
            // Reset the local Supabase database. This command:
            // 1. Drops the existing local database.
            // 2. Re-creates it.
            // 3. Applies all migrations from `backend/supabase/migrations/`.
            // 4. Runs the `backend/supabase/seed.sql` script.
            console.log('Resetting local Supabase test database (applying migrations and seed.sql)...');
            execSync('npx supabase db reset --local', {
              cwd: path.resolve(__dirname, '../../'), // Ensure executed from backend/ directory context
              stdio: 'inherit', // Show output from the command
              env: { ...process.env }, // Pass current environment, which includes .env.test vars
            });
            console.log('Local Supabase test database reset and seeded successfully.');
          } catch (error) {
            console.error('FATAL: Failed to reset local Supabase test database during jest-global-setup.js:', error);
            process.exit(1); // Critical failure, exit tests
          }
        };
        ```

2.  [x] **Create Global Teardown Script (`backend/tests/integration/jest-global-teardown.js`):**
    *   [x] This script runs once after all integration tests have completed.
    *   [x] Content:
        ```javascript
        // backend/tests/integration/jest-global-teardown.js
        module.exports = async () => {
          console.log('\\nJest GlobalTeardown: Integration test run complete.');
          // No specific actions to stop the database here, as it might be useful to inspect
          // its state after tests, or for subsequent local test runs.
          // The Supabase stack can be stopped manually using `npm run supabase:stop`.
          // CI environments should handle Docker cleanup independently.
        };
        ```

3.  [x] **Create Setup Script (After Environment) (`backend/tests/integration/jest-setup-after-env.js`):**
    *   [x] This script runs before each test *file* in the integration suite (after the test framework is set up).
    *   [x] Its main role is to clean the database tables to ensure test isolation.
    *   [x] Content:
        ```javascript
        // backend/tests/integration/jest-setup-after-env.js
        const { Client } = require('pg'); // Using 'pg' as per project dependencies
        const path = require('path');
        const dotenv = require('dotenv');

        // Explicitly load .env.test variables for this setup file
        dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

        const dbConfig = {
          connectionString: process.env.DATABASE_URL, // From .env.test
          // Add SSL or other connection options if required by your local Supabase setup
        };

        // Define the order for truncating tables to respect foreign key constraints.
        // List tables that are "children" or have foreign keys pointing to others first.
        // This order is critical and specific to your database schema.
        const tablesToClear = [
          // Example order (adjust to your actual schema dependencies):
          'logged_exercises',         // Depends on workout_logs, exercises
          'workout_progress_checkins',// Depends on user_profiles
          'agent_memory',             // Depends on users
          'analytics_events',         // Depends on users
          'notifications',            // Depends on users
          'workout_plan_exercises',   // Depends on workout_plans, exercises
          'workout_logs',             // Depends on workout_plans, users
          'workout_plans',            // Depends on user_profiles
          'user_profiles',            // Depends on users
          'users'                     // Base table
          // Ensure this list is comprehensive and correctly ordered for your schema.
        ];

        async function clearTestDatabaseTables() {
          const client = new Client(dbConfig);
          try {
            await client.connect();
            console.log('Clearing test database tables before test file execution...');
            // Truncate tables in reverse order of typical dependency (child first, then parent)
            // or the order defined in tablesToClear if it's already set for deletion.
            for (const table of tablesToClear) { // Assuming tablesToClear is already in deletion order
              // console.log(`Truncating public."${table}"...`);
              await client.query(`TRUNCATE TABLE public."${table}" RESTART IDENTITY CASCADE`);
            }
            // console.log('Test database tables cleared.');
          } catch (error) {
            console.error('Error clearing test database tables:', error);
            // Depending on severity, you might want to throw error to halt tests
            throw error;
          } finally {
            await client.end();
          }
        }

        // Run before each test file (or each test if moved from here)
        // Using beforeAll at the top of each test file can also work and might be slightly more performant
        // than running this for every single test case via beforeEach in this global file.
        // For now, let's assume clearing happens before each test suite (file).
        // To run before each test *within* a file, you'd use `beforeEach(async () => { ... });` here.
        // To run once per test file, this file (setupFilesAfterEnv) is suitable, or a beforeAll in test files.

        // We will clear tables before each test for maximum isolation.
        beforeEach(async () => {
          await clearTestDatabaseTables();
        });

        // Optional: Add any global Jest matchers or other setup here.
        ```

## [x] Phase 4: Core Test Helper Utilities (`backend/tests/helpers/`)

1.  [x] **Create Authentication Helper (`backend/tests/helpers/integration-auth-helpers.js`):**
    *   [x] This helper will manage user creation (via API) and token acquisition for tests.
    *   [x] Content:
        ```javascript
        // backend/tests/helpers/integration-auth-helpers.js
        const supertest = require('supertest');
        // const app = require('../../server').app; // Import your Express app instance

        /**
         * Creates a test user via API signup and then logs them in to get a JWT.
         * Ensures each call uses a unique email to avoid conflicts.
         * @param {object} app - The Express app instance.
         * @param {object} [userData] - Optional user data (name, email, password).
         * @returns {Promise<string>} The JWT token.
         */
        async function getTestUserToken(app, userData = {}) {
          const uniqueEmail = userData.email || `testuser_${Date.now()}@example.com`;
          const password = userData.password || 'PasswordForTest123!';
          const name = userData.name || 'Test User';

          // 1. Sign up the user (Supabase Auth via your API endpoint)
          try {
            await supertest(app)
              .post('/v1/auth/signup')
              .send({ name, email: uniqueEmail, password })
              .expect(200); // Or 201, adjust to your API's success code for signup
          } catch (signupError) {
            // If signup fails (e.g. user already exists, though uniqueEmail should prevent this),
            // we might still try to login if the error indicates that.
            // For now, let's assume signup is for a new user.
            console.error(`Signup failed for ${uniqueEmail}:`, signupError.response ? signupError.response.body : signupError);
            throw signupError;
          }


          // 2. Log in the user to get the token
          const loginResponse = await supertest(app)
            .post('/v1/auth/login')
            .send({ email: uniqueEmail, password })
            .expect(200);

          if (!loginResponse.body.jwtToken) {
            throw new Error('Login did not return a jwtToken.');
          }
          return loginResponse.body.jwtToken;
        }

        module.exports = { getTestUserToken };
        ```

2.  [x] **Create API Request Helper (`backend/tests/helpers/api-request-helpers.js`):**
    *   [x] Provides a convenient way to make authenticated requests with Supertest.
    *   [x] Content:
        ```javascript
        // backend/tests/helpers/api-request-helpers.js
        const supertest = require('supertest');

        /**
         * Returns a Supertest agent with the Authorization header pre-set if a token is provided.
         * @param {object} app - The Express app instance.
         * @param {string} [token] - Optional JWT token.
         * @returns {supertest.SuperTest<supertest.Test>} A Supertest agent.
         */
        function apiRequest(app, token) {
          const agent = supertest(app); // Create a new agent for each request helper call
          if (token) {
            // For supertest, you set headers per request, not on the agent globally for all subsequent.
            // So, this helper might be better structured to return the app, and tests chain .set()
            // Or, more commonly, tests call supertest(app).get(...).set('Authorization', ...)
            // Let's adjust to make it clear.
            // This function could simply be a reminder or not used if tests call supertest directly.
            // A more useful helper would be one that performs an action AND sets the token.
          }
          return agent; // Returns the basic supertest agent on app.
        }

        // A more practical helper for authenticated GET, POST, etc.
        function authenticatedGet(app, route, token) {
          return supertest(app).get(route).set('Authorization', `Bearer ${token}`);
        }
        function authenticatedPost(app, route, token) {
          return supertest(app).post(route).set('Authorization', `Bearer ${token}`);
        }
        // Add PUT, DELETE etc. as needed

        module.exports = { apiRequest, authenticatedGet, authenticatedPost /* ... */ };
        ```
    *Self-correction: `supertest` agent behavior with headers is per-request. Provided more practical helper examples.*

3.  [x] **Create Seed Data Helpers (`backend/tests/helpers/seed-data-helpers.js` - Iterative Development):**
    *   [x] This file will grow as you write tests. It will contain functions to create specific data setups needed for particular test scenarios, primarily using your API.
    *   [x] Initial structure:
        ```javascript
        // backend/tests/helpers/seed-data-helpers.js
        // const { authenticatedPost, authenticatedGet } = require('./api-request-helpers');
        // const app = require('../../server').app; // Your Express app

        /**
         * Example: Seeds a user profile via API.
         * @param {string} token - The JWT token for an authenticated user.
         * @param {object} profileData - The profile data to submit.
         * @returns {Promise<object>} The created/updated profile from the API response.
         */
        async function seedUserProfileViaApi(app, token, profileData) {
          // const response = await authenticatedPost(app, '/v1/profile', token)
          //   .send(profileData)
          //   .expect(200); // Or appropriate success code
          // return response.body.updatedProfile;
          throw new Error('seedUserProfileViaApi not yet implemented');
        }

        // Add other specific seed functions as your tests require them:
        // async function seedWorkoutPlanForUser(app, userToken, planData) { ... }
        // async function seedWorkoutLog(app, userToken, logData) { ... }

        module.exports = { seedUserProfileViaApi /*, ... */ };
        ```

## Phase 5: Writing and Running Integration Tests

1.  **Develop Integration Tests:**
    *   Create test files within `backend/tests/integration/` (e.g., `auth.test.js`, `profile.test.js`, `workouts.test.js`).
    *   Import the Express `app` from `backend/server.js`.
    *   Use `supertest` for making HTTP requests to your API endpoints.
    *   Utilize the helper functions from `backend/tests/helpers/` for authentication and data seeding.
    *   Write assertions to verify API responses (status codes, body content) and database state changes (by potentially querying the test DB directly if necessary, though API response verification is primary).
    *   Start with the example `auth.test.js` provided in the previous planning stage.

2.  **Running Tests:**
    *   Ensure the local Supabase stack is running: `cd backend && npx supabase start` (or `npm run supabase:start`).
    *   Run the integration tests: `npm run test:integration` (from the project root, or `cd backend && npm run test:integration`).

This plan provides a step-by-step guide. Remember to implement and test each phase incrementally. For example, get Phase 1 working (local Supabase stack), then Phase 2 (Jest config), then verify Phase 3 (DB lifecycle scripts are correctly resetting/clearing the DB), before heavily investing in Phase 4 helpers and Phase 5 tests.
