module.exports = {
  // The root of your source code
  roots: ['<rootDir>'],
  
  // The test environment that will be used for testing
  testEnvironment: 'node',
  
  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // An array of regexp pattern strings that are matched against all test paths
  testPathIgnorePatterns: [
    '/node_modules/'
  ],
  
  // Indicates whether each individual test should be reported during the run
  verbose: true,
  
  // Indicates whether the coverage information should be collected
  collectCoverage: true,
  
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  
  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    'utils/**/*.js',
    'agents/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  
  // An array of regexp pattern strings that are matched against all file paths before executing the test
  coveragePathIgnorePatterns: [
    '/node_modules/'
  ],
  
  // This will be used to configure minimum threshold enforcement for coverage results
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  
  // The test setup file
  setupFilesAfterEnv: ['<rootDir>/tests/setup-tests.js']
}; 