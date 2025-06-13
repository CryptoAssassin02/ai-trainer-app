const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Determine if we're running integration tests
const isIntegrationTest = process.env.RUN_INTEGRATION_TESTS === 'true';

// Add any custom config to be passed to Jest
const customJestConfig = {
  globalSetup: isIntegrationTest ? '<rootDir>/backend/tests/integration/jest-global-setup.js' : undefined,
  // Use different setup files based on whether we're running integration tests
  setupFilesAfterEnv: isIntegrationTest 
    ? ['<rootDir>/jest.integration.setup.js'] 
    : ['<rootDir>/jest.setup.ts', '<rootDir>/jest.polyfills.ts'],
  // testEnvironment: 'jest-environment-jsdom', // REMOVED - Handled by projects
  projects: [
    {
      displayName: 'frontend',
      testEnvironment: 'jest-environment-jsdom',
      testMatch: [
        '**/__tests__/**/*.+(ts|tsx|js)',
        '**/?(*.)+(spec|test).+(ts|tsx|js)',
        '!**/backend/**' // Exclude backend tests
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts', '<rootDir>/jest.polyfills.ts'],
      moduleNameMapper: {
        // Frontend specific mappers
        '^@/lib/supabase/browser$': '<rootDir>/lib/supabase/browser.ts',
        '\\.(css|less|sass|scss)$' : 'identity-obj-proxy',
        '\\.(gif|ttf|eot|svg|png)$' : '<rootDir>/__mocks__/fileMock.js',
        '^lucide-react$': '<rootDir>/__mocks__/lucideMock.js',
        '^@/(.*)$': '<rootDir>/$1',
        '^uuid$': require.resolve('uuid'),
        '^@/components/(.*)$': '<rootDir>/components/$1',
        '^@/lib/(.*)$': '<rootDir>/lib/$1',
        '^@/utils/(.*)$': '<rootDir>/utils/$1',
      },
      transform: {
        '^.+\\.js$': 'babel-jest',
        '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: './tsconfig.json' }],
      },
      transformIgnorePatterns: [
        '/node_modules/(?!(uuid)/).+\\.(js|jsx|mjs|cjs|ts|tsx)$',
        '^.+\\.module\\.(css|sass|scss)$',
      ],
    },
    {
      displayName: 'backend',
      testEnvironment: 'node', // Use node environment for backend tests
      testMatch: [
        '**/backend/tests/**/*.test.js' // Match only backend tests
      ],
      rootDir: '.', 
      setupFilesAfterEnv: ['<rootDir>/backend/tests/setup-tests.js'],
      moduleNameMapper: {
        // No mappings needed here, setup-tests handles mocks
      },
      transform: { // Ensure backend JS/TS files are transformed if needed
          '^.+\\.(js|jsx|ts|tsx)$': 'ts-jest'
      },
      transformIgnorePatterns: [
        '/node_modules/' // Standard node ignore pattern
      ],
      // Add backend-specific coverage collection paths
      collectCoverageFrom: [
        'backend/**/*.{js,ts}',
        '!**/node_modules/**',
        '!backend/tests/**', 
        '!backend/migrations/**',
        '!backend/scripts/**', // Might want to ignore scripts too
        '!backend/migration-tools/**',
        '!backend/diagnostics/**', 
        '!backend/examples/**',
        '!backend/index.js', // Exclude top-level index if it's just an entry point
        '!backend/server.js', // Exclude server entry point
        '!**/*.config.js',
        '!**/*.d.ts'
      ],
    }
  ],
  collectCoverage: true,
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 0, 
    },
  },
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '/e2e/',
  ],
};

module.exports = createJestConfig(customJestConfig); 