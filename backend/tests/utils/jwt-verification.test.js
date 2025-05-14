/**
 * @fileoverview Tests for the jwt-verification module
 * This file tests the JWT verification functionality with mocked dependencies
 */

// Set up mocks before importing modules
jest.mock('../../utils/jwt', () => ({
  verifyToken: jest.fn()
}));

jest.mock('../../config/logger', () => ({
  error: jest.fn()
}));

// Import modules after mocks are setup
const jwtUtils = require('../../utils/jwt');
const logger = require('../../config/logger');
const { AuthenticationError, ApplicationError } = require('../../utils/errors');
const { verifyToken } = require('../../utils/jwt-verification');

describe('jwt-verification', () => {
  // Clear mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyToken', () => {
    it('should return decoded token when verification succeeds', () => {
      // Arrange
      const token = 'valid.jwt.token';
      const decoded = { sub: 'user123', exp: Math.floor(Date.now() / 1000) + 3600 };
      jwtUtils.verifyToken.mockReturnValue(decoded);

      // Act
      const result = verifyToken(token);

      // Assert
      expect(jwtUtils.verifyToken).toHaveBeenCalledWith(token);
      expect(result).toEqual(decoded);
    });

    it('should pass through AuthenticationError when token is expired', () => {
      // Arrange
      const token = 'expired.jwt.token';
      const expiredError = new AuthenticationError('Token expired', 'TOKEN_EXPIRED');
      jwtUtils.verifyToken.mockImplementation(() => {
        throw expiredError;
      });

      // Act & Assert
      expect(() => verifyToken(token)).toThrow(expiredError);
      expect(jwtUtils.verifyToken).toHaveBeenCalledWith(token);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should pass through AuthenticationError when signature is invalid', () => {
      // Arrange
      const token = 'invalid.signature.token';
      const signatureError = new AuthenticationError('Invalid signature', 'INVALID_SIGNATURE');
      jwtUtils.verifyToken.mockImplementation(() => {
        throw signatureError;
      });

      // Act & Assert
      expect(() => verifyToken(token)).toThrow(signatureError);
      expect(jwtUtils.verifyToken).toHaveBeenCalledWith(token);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should convert unknown errors to ApplicationError', () => {
      // Arrange
      const token = 'problem.jwt.token';
      const unknownError = new Error('Something unexpected happened');
      jwtUtils.verifyToken.mockImplementation(() => {
        throw unknownError;
      });

      // Act & Assert
      expect(() => verifyToken(token)).toThrow(ApplicationError);
      expect(() => verifyToken(token)).toThrow('An unexpected error occurred during token verification');
      
      expect(jwtUtils.verifyToken).toHaveBeenCalledWith(token);
      expect(logger.error).toHaveBeenCalledWith('Unexpected error during token verification', expect.objectContaining({
        error: unknownError.message,
        stack: expect.any(String)
      }));
    });
  });
}); 