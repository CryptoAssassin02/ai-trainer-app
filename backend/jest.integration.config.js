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
    '^.+\\\.js$': 'babel-jest', // Assumes babel.config.js is set up
  },
  // Consider adding 'clearMocks: true' if not already in your global Jest config or setup
}; 