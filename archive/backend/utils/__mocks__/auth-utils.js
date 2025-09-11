/**
 * Mock for auth-utils
 */

// Create Jest mock functions
const verifyToken = jest.fn().mockImplementation((token) => {
  // Mock successful verification
  return { sub: 'test-user-id' };
});

const extractTokenFromHeader = jest.fn().mockImplementation((authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Invalid Authorization header');
  }
  return authHeader.split(' ')[1];
});

module.exports = {
  verifyToken,
  extractTokenFromHeader
}; 