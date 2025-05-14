// backend/tests/mocks/bcrypt.js

// Export Jest mock functions for bcrypt methods
module.exports = {
  compare: jest.fn().mockResolvedValue(true), // Default to match
  hash: jest.fn().mockResolvedValue('$2b$10$mockhashedpasswordstringlong'),
}; 