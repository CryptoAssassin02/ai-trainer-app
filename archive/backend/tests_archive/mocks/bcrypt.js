/**
 * @fileoverview Mock implementation of bcrypt for testing
 */

const bcryptMock = {
  compare: jest.fn().mockImplementation((plaintext, hash) => {
    return Promise.resolve(true); // Default to successful comparison
  }),
  hash: jest.fn().mockImplementation((plaintext, saltRounds) => {
    return Promise.resolve('hashedpassword123'); // Return a mock hash
  }),
  genSalt: jest.fn().mockImplementation((saltRounds) => {
    return Promise.resolve('mocksalt123'); // Return a mock salt
  })
};

// Set default mock implementations
bcryptMock.compare.mockResolvedValue(true);

module.exports = bcryptMock; 