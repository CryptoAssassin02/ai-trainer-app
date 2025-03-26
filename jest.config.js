const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  modulePaths: ['<rootDir>'],
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you when using `next/jest`)
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'contexts/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'utils/**/*.{js,jsx,ts,tsx}',
    '!**/node_modules/**',
    '!**/.storybook/**',
    '!**/cypress/**',
    '!**/coverage/**',
  ],
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  // Temporarily disable coverage thresholds
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  // Temporarily exclude test-utils from test matching
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/utils/'
  ],
  // Handle ESM modules
  transformIgnorePatterns: [
    '/node_modules/(?!(lucide-react|date-fns|@date-fns|recharts|d3-*|internmap|msw))'
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig); 