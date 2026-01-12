/**
 * @fileoverview Tests for JWT token generation functions
 */

const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { DatabaseError, ApplicationError, AuthenticationError } = require('../../utils/errors');
const jwtUtils = require('../../utils/jwt');

// Mock dependencies
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn().mockReturnValue({ sub: 'user123' }),
  decode: jest.fn().mockReturnValue({ sub: 'user123', jti: 'mock-jti' })
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid')
}));

// Mock the specific Supabase service for token storage
jest.mock('../../services/supabase-admin', () => ({
  getSupabaseAdmin: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          data: [{ jti: 'mock-jti' }],
          error: null
        })
      }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              data: [{ status: 'active', expires_at: new Date(Date.now() + 86400000) }],
              error: null,
              count: 1
            })
          })
        })
      })
    })
  })
}));

// Mock logging to prevent test output noise
jest.mock('../../config/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('JWT Generation Functions', () => {
  // Setup for tests
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate an access JWT token with correct payload', () => {
      const userId = 'test-user-123';
      const role = 'user';
      
      const token = jwtUtils.generateToken(userId, role);
      
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: userId,
          role,
          type: 'access',
          jti: expect.any(String)
        }),
        expect.any(String),
        expect.objectContaining({
          expiresIn: expect.any(String)
        })
      );
      
      expect(token).toBe('mock-token');
    });
    
    it('should throw ApplicationError if JWT sign fails', () => {
      jwt.sign.mockImplementationOnce(() => {
        throw new Error('JWT sign error');
      });
      
      expect(() => {
        jwtUtils.generateToken('test-user', 'user');
      }).toThrow(ApplicationError);
    });
  });
  
  describe('generateRefreshToken', () => {
    it('should generate a refresh token and store it in the database', async () => {
      const userId = 'test-user-123';
      const role = 'user';
      
      // Mock the storeRefreshToken function
      const storeRefreshTokenMock = jest.fn().mockResolvedValue(true);
      
      // Call the function with our mock
      const token = await jwtUtils.generateRefreshToken(
        userId, 
        role,
        null, 
        null, 
        null, 
        storeRefreshTokenMock
      );
      
      // Check JWT sign was called correctly
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: userId,
          type: 'refresh',
          jti: expect.any(String)
        }),
        expect.any(String),
        expect.objectContaining({
          expiresIn: expect.any(String)
        })
      );
      
      // Verify the token was returned
      expect(token).toBe('mock-token');
      
      // Verify storeRefreshToken was called with correct parameters
      expect(storeRefreshTokenMock).toHaveBeenCalledWith(
        userId,
        'mock-token',
        expect.any(Date),
        null
      );
    });
    
    it('should throw DatabaseError if token storage fails', async () => {
      const userId = 'test-user-123';
      const role = 'user';
      
      // Mock storeRefreshToken to fail
      const storeRefreshTokenMock = jest.fn().mockRejectedValue(
        new DatabaseError('Failed to store refresh token')
      );
      
      // Expect the function to throw a DatabaseError
      await expect(
        jwtUtils.generateRefreshToken(
          userId, 
          role, 
          null, 
          null, 
          null, 
          storeRefreshTokenMock
        )
      ).rejects.toThrow(DatabaseError);
      
      // Verify storeRefreshToken was called
      expect(storeRefreshTokenMock).toHaveBeenCalled();
    });
    
    it('should throw DatabaseError if unexpected error occurs', async () => {
      const userId = 'test-user-123';
      const role = 'user';
      
      // Mock storeRefreshToken to throw a generic error
      const storeRefreshTokenMock = jest.fn().mockRejectedValue(
        new Error('Generic error')
      );
      
      // Expect the function to wrap and throw a DatabaseError
      await expect(
        jwtUtils.generateRefreshToken(
          userId, 
          role, 
          null, 
          null, 
          null, 
          storeRefreshTokenMock
        )
      ).rejects.toThrow(DatabaseError);
      
      // Verify storeRefreshToken was called
      expect(storeRefreshTokenMock).toHaveBeenCalled();
    });
  });
  
  describe('generateTokens', () => {
    it('should generate both access and refresh tokens', async () => {
      const userId = 'test-user-123';
      const role = 'user';
      
      // Mock the internal functions
      const generateTokenMock = jest.fn().mockReturnValue('mock-access-token');
      const generateRefreshTokenMock = jest.fn().mockResolvedValue('mock-refresh-token');
      
      // Call the function with our mocks
      const result = await jwtUtils.generateTokens(
        userId, 
        role,
        {},
        generateTokenMock,
        generateRefreshTokenMock
      );
      
      // Verify the internal functions were called
      expect(generateTokenMock).toHaveBeenCalledWith(userId, role);
      expect(generateRefreshTokenMock).toHaveBeenCalledWith(
        userId, role, undefined, undefined, undefined
      );
      
      // Verify the result structure
      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      });
    });
    
    it('should throw DatabaseError if refresh token generation fails', async () => {
      const userId = 'test-user-123';
      const role = 'user';
      
      // Mock functions with the access token succeeding but refresh token failing
      const generateTokenMock = jest.fn().mockReturnValue('mock-access-token');
      const generateRefreshTokenMock = jest.fn().mockRejectedValue(
        new DatabaseError('Failed to store refresh token')
      );
      
      // Expect the function to throw a DatabaseError
      await expect(
        jwtUtils.generateTokens(
          userId, 
          role,
          {},
          generateTokenMock,
          generateRefreshTokenMock
        )
      ).rejects.toThrow(DatabaseError);
      
      // Verify that generateToken was still called
      expect(generateTokenMock).toHaveBeenCalledWith(userId, role);
    });
    
    it('should wrap and throw DatabaseError for unexpected errors', async () => {
      const userId = 'test-user-123';
      const role = 'user';
      
      // Mock functions with access token succeeding but refresh token throwing a generic error
      const generateTokenMock = jest.fn().mockReturnValue('mock-access-token');
      const generateRefreshTokenMock = jest.fn().mockRejectedValue(
        new Error('Unexpected error')
      );
      
      // Expect the function to wrap and throw a DatabaseError
      await expect(
        jwtUtils.generateTokens(
          userId, 
          role,
          {},
          generateTokenMock,
          generateRefreshTokenMock
        )
      ).rejects.toThrow(DatabaseError);
      
      // Verify that generateToken was still called
      expect(generateTokenMock).toHaveBeenCalledWith(userId, role);
    });
  });
  
  describe('parseExpiry', () => {
    it('should correctly parse seconds', () => {
      expect(jwtUtils.parseExpiry('30s')).toBe(30 * 1000); // 30 seconds in milliseconds
    });
    
    it('should correctly parse minutes', () => {
      expect(jwtUtils.parseExpiry('15m')).toBe(15 * 60 * 1000); // 15 minutes in milliseconds
    });
    
    it('should correctly parse hours', () => {
      expect(jwtUtils.parseExpiry('2h')).toBe(2 * 60 * 60 * 1000); // 2 hours in milliseconds
    });
    
    it('should correctly parse days', () => {
      expect(jwtUtils.parseExpiry('7d')).toBe(7 * 24 * 60 * 60 * 1000); // 7 days in milliseconds
    });
    
    it('should correctly parse weeks', () => {
      expect(jwtUtils.parseExpiry('2w')).toBe(2 * 7 * 24 * 60 * 60 * 1000); // 2 weeks in milliseconds
    });
    
    it('should correctly parse years', () => {
      expect(jwtUtils.parseExpiry('1y')).toBe(365 * 24 * 60 * 60 * 1000); // 1 year in milliseconds (approximation)
    });
    
    it('should return null for invalid format', () => {
      expect(jwtUtils.parseExpiry('invalid')).toBeNull();
    });
    
    it('should return null for non-string input', () => {
      expect(jwtUtils.parseExpiry(123)).toBeNull();
    });
  });
}); 