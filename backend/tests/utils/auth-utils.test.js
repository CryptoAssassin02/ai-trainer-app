const jwt = require('jsonwebtoken');
const { logger } = require('../../config'); // Assuming logger is exported from config
const { verifyToken, extractTokenFromHeader } = require('../../utils/auth-utils');

// Mock the dependencies
jest.mock('jsonwebtoken');
jest.mock('../../config', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(), // Add other methods if needed by other utils
    info: jest.fn(),
    debug: jest.fn(),
  },
  // Mock env if necessary, or set process.env directly in tests
  env: {}
}));

// Define a default JWT secret for tests if not set in process.env
const DEFAULT_FALLBACK_SECRET = 'default-secret-for-tests'; // Use the actual fallback

describe('Utility: auth-utils', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Ensure JWT_SECRET is undefined before tests that rely on the fallback
    delete process.env.JWT_SECRET;
  });

  describe('verifyToken()', () => {
    const mockToken = 'valid.token.string';
    const mockPayload = { userId: '123', iat: Date.now() / 1000 };

    it('should return the decoded payload for a valid token using default secret', () => {
      jwt.verify.mockReturnValue(mockPayload);
      const decoded = verifyToken(mockToken);
      expect(decoded).toEqual(mockPayload);
      // Expect the call with the default secret from the util function
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, DEFAULT_FALLBACK_SECRET);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should throw "Token has expired" error for an expired token using default secret', () => {
      const expiredError = new Error('jwt expired');
      expiredError.name = 'TokenExpiredError';
      jwt.verify.mockImplementation(() => {
        throw expiredError;
      });

      expect(() => verifyToken(mockToken)).toThrow('Token has expired');
      // Expect the call with the default secret from the util function
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, DEFAULT_FALLBACK_SECRET);
      expect(logger.warn).toHaveBeenCalledWith('JWT verification failed:', 'jwt expired');
    });

    it('should throw "Invalid token" error for any other verification error using default secret', () => {
      const genericError = new Error('Invalid signature');
      jwt.verify.mockImplementation(() => {
        throw genericError;
      });

      expect(() => verifyToken(mockToken)).toThrow('Invalid token');
      // Expect the call with the default secret from the util function
      expect(jwt.verify).toHaveBeenCalledWith(mockToken, DEFAULT_FALLBACK_SECRET);
      expect(logger.warn).toHaveBeenCalledWith('JWT verification failed:', 'Invalid signature');
    });

    it('should use process.env.JWT_SECRET if available', () => {
      const specificSecret = 'env-secret-shhh';
      process.env.JWT_SECRET = specificSecret; // Set the env var for this test
      jwt.verify.mockReturnValue(mockPayload);

      verifyToken(mockToken);

      expect(jwt.verify).toHaveBeenCalledWith(mockToken, specificSecret);

      // Clean up happens in beforeEach
    });

  });

  describe('extractTokenFromHeader()', () => {
    it('should extract the token correctly from a valid Authorization header', () => {
      const token = 'my.jwt.token';
      const header = `Bearer ${token}`;
      expect(extractTokenFromHeader(header)).toBe(token);
    });

    it('should throw an error if the Authorization header is missing', () => {
      expect(() => extractTokenFromHeader(null)).toThrow('Invalid Authorization header');
      expect(() => extractTokenFromHeader(undefined)).toThrow('Invalid Authorization header');
    });

    it('should throw an error if the Authorization header does not start with "Bearer "', () => {
      const header = 'Token my.jwt.token';
      expect(() => extractTokenFromHeader(header)).toThrow('Invalid Authorization header');
    });

    it('should throw an error if the Authorization header is just "Bearer "', () => {
      const header = 'Bearer ';
      expect(() => extractTokenFromHeader(header)).toThrow('Invalid Authorization header');
    });

    it('should throw an error if the Authorization header is just "Bearer" (no space)', () => {
        const header = 'Bearer';
        expect(() => extractTokenFromHeader(header)).toThrow('Invalid Authorization header');
    });
  });
}); 