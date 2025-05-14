// Polyfill for setImmediate (needed for Winston logger)
global.setImmediate = (callback, ...args) => setTimeout(callback, 0, ...args);

// Integration test setup file
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend/.env file
dotenv.config({ path: path.resolve(__dirname, 'backend/.env') });

// Load additional environment from project root if it exists
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

// Log integration test configuration without revealing sensitive information
console.log('🧪 Integration test setup loaded');
console.log('ℹ️ To run integration tests, use: npm run test:integration');
console.log('ℹ️ Make sure required environment variables are set in backend/.env or .env.local');

// Import the standard Jest setup to ensure we have all the normal mock configuration
require('./jest.setup'); 