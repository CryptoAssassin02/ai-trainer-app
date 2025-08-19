import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import dotenv from 'dotenv';

// Load E2E testing environment variables
dotenv.config({ path: '.env.e2e' });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e', // Directory where tests are located
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    /* Global test timeout */
    actionTimeout: 30000,
    navigationTimeout: 30000,

    /* Store authentication state and other test context */
    storageState: undefined, // Will be set per test as needed

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshots on failure */
    screenshot: 'only-on-failure',

    /* Record video for test failures */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    // Setup project - runs DUAL authentication for both user contexts
    { 
      name: 'setup', 
      testMatch: /.*\.setup\.ts/,
      // Setup runs without any authentication state
      use: { storageState: undefined }
    },

    // Project for testing profile CREATION flows (new users without profiles)
    {
      name: 'profile-creation',
      testMatch: '**/profile-creation.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        // Use NEW USER authentication state (users without complete profiles)
        storageState: 'playwright/.auth/new-user.json',
      },
      // Ensure setup runs before this project
      dependencies: ['setup'],
    },

    // Project for testing profile EDITING flows (existing users with profiles)
    {
      name: 'profile-editing',
      testMatch: '**/profile-editing.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        // Use EXISTING USER authentication state (users with complete profiles)
        storageState: 'playwright/.auth/existing-user.json',
      },
      // Ensure setup runs before this project
      dependencies: ['setup'],
    },

    // PHASE 2: User journeys project - comprehensive authentication flow testing
    {
      name: 'user-journeys',
      testMatch: '**/user-journeys/*.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        // Dynamic auth context per test describe block
        // Each test will specify its own storageState
      },
      // Ensure setup runs before this project
      dependencies: ['setup'],
    },

    // Main test project - uses original authentication for other tests
    {
      name: 'chromium',
      testMatch: '**/!(profile-creation|profile-editing|user-journeys).spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        // Use the original authenticated state for general tests
        storageState: 'playwright/.auth/user.json',
      },
      // Ensure setup runs before this project
      dependencies: ['setup'],
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Global setup for Supabase */
  globalSetup: './e2e/global-setup.ts',

  /* Configure both frontend and backend servers */
  // Temporarily disabled to run servers manually
  // webServer: [
  //   {
  //     command: 'npm run dev',
  //     port: 3000,
  //     timeout: 120 * 1000,
  //     reuseExistingServer: !process.env.CI,
  //   },
  //   {
  //     command: 'cd backend && npm run dev',
  //     port: 8000,
  //     timeout: 120 * 1000,
  //     reuseExistingServer: !process.env.CI,
  //   }
  // ]
}); 