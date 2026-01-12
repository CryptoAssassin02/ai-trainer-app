/**
 * @fileoverview Tests for JWT token management functions
 */

const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('uuid');
jest.mock('../../config/logger');
jest.mock('../../services/supabase-admin');
jest.mock('../../config/supabase');
jest.mock('../../config/env.js', () => ({
  env: {
    auth: {
      jwtSecret: 'test-secret-key-for-jest-tests-32-chars',
      refreshSecret: 'test-refresh-secret-key-32-chars',
      jwtExpiresIn: '15m',
      refreshTokenExpiresIn: '7d'
    }
  }
}));

// Import after mocks are set up
const {
  blacklistToken,
  revokeRefreshToken,
  rotateRefreshToken,
  cleanupExpiredBlacklistedTokens
} = require('../../utils/jwt');
const {
  AuthenticationError,
  DatabaseError,
  ApplicationError,
  NotFoundError
} = require('../../utils/errors');
const logger = require('../../config/logger');
const { getSupabaseAdmin } = require('../../services/supabase-admin');
const { env } = require('../../config/env.js');

// Add this near the top of the file before the tests
const jwtUtils = require('../../utils/jwt');

describe('JWT Management Functions', () => {
  const userId = 'test-user-123';
  const role = 'user';
  const mockJti = 'mock-jti-123';
  const mockRefreshToken = 'mock-refresh-token';
  
  // Mock more realistic Supabase client structure
  const mockSupabaseAdmin = {
    from: jest.fn()
  };

  // Mock chaining structure
  const mockSelect = jest.fn();
  const mockInsert = jest.fn();
  const mockUpdate = jest.fn();
  const mockDelete = jest.fn();
  const mockEq = jest.fn();
  const mockLt = jest.fn();
  const mockLimit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock for uuidv4
    uuidv4.mockReturnValue(mockJti);
    
    // Setup mockSupabaseAdmin
    getSupabaseAdmin.mockReturnValue(mockSupabaseAdmin);

    // Mock Supabase chaining methods
    mockSupabaseAdmin.from.mockImplementation(() => {
      return {
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete
      };
    });

    mockSelect.mockImplementation(() => {
      return {
        eq: mockEq,
        limit: mockLimit
      };
    });

    // Fix the mockEq to properly handle chaining
    mockEq.mockImplementation(() => {
      return {
        eq: mockEq,
        limit: mockLimit,
        select: mockSelect
      };
    });

    mockInsert.mockImplementation(() => {
      return {
        select: mockSelect
      };
    });

    mockUpdate.mockImplementation(() => {
      return {
        eq: mockEq,
        select: mockSelect
      };
    });

    mockDelete.mockImplementation(() => {
      return {
        lt: mockLt
      };
    });

    mockLt.mockImplementation(() => {
      return {
        select: mockSelect
      };
    });

    // JWT decode mock
    jwt.decode.mockImplementation((token) => {
      if (token === 'invalid-token' || token === null || token === undefined) {
        return null;
      }
      
      if (token.includes('refresh')) {
        return { sub: userId, type: 'refresh', jti: mockJti, exp: Math.floor(Date.now() / 1000) + 3600 };
      }
      
      return { sub: userId, type: 'access', jti: mockJti, exp: Math.floor(Date.now() / 1000) + 3600 };
    });
  });

  describe('blacklistToken', () => {
    it('should blacklist a token successfully', async () => {
      const expiresAt = new Date(Date.now() + 3600000);
      
      // Mock the insert operation
      mockInsert.mockReturnValue({ error: null });
      
      await blacklistToken(mockJti, expiresAt, userId);
      
      expect(getSupabaseAdmin).toHaveBeenCalled();
      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('blacklisted_tokens');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        jti: mockJti,
        user_id: userId,
        expires_at: expiresAt,
        reason: 'logout',
        created_at: expect.any(String)
      }));
      
      expect(logger.debug).toHaveBeenCalledWith(
        'Token blacklisted successfully:',
        expect.objectContaining({ jti: mockJti, reason: 'logout' })
      );
    });
    
    it('should allow specifying a reason for blacklisting', async () => {
      const expiresAt = new Date(Date.now() + 3600000);
      const reason = 'token_refresh';
      
      // Mock the insert operation
      mockInsert.mockReturnValue({ error: null });
      
      await blacklistToken(mockJti, expiresAt, userId, reason);
      
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        reason: reason
      }));
      
      expect(logger.debug).toHaveBeenCalledWith(
        'Token blacklisted successfully:',
        expect.objectContaining({ jti: mockJti, reason: reason })
      );
    });
    
    it('should handle duplicate blacklist entries gracefully', async () => {
      const expiresAt = new Date(Date.now() + 3600000);
      
      // Mock the insert operation with duplicate error
      mockInsert.mockReturnValue({ error: { code: '23505', message: 'duplicate key value violates unique constraint' } });
      
      await blacklistToken(mockJti, expiresAt, userId);
      
      expect(logger.debug).toHaveBeenCalledWith(
        'Token already blacklisted:',
        expect.objectContaining({ jti: mockJti })
      );
    });
    
    it('should throw DatabaseError if blacklisting fails with non-duplicate error', async () => {
      const expiresAt = new Date(Date.now() + 3600000);
      
      // Mock the insert operation with error
      mockInsert.mockReturnValue({ error: { code: 'OTHER_ERROR', message: 'Database error' } });
      
      await expect(blacklistToken(mockJti, expiresAt, userId)).rejects.toThrow(DatabaseError);
      expect(logger.error).toHaveBeenCalledWith(
        'Error blacklisting token (insert failed):',
        expect.any(Object)
      );
    });
    
    it('should throw DatabaseError for unexpected errors', async () => {
      const expiresAt = new Date(Date.now() + 3600000);
      
      // Mock the insert operation to throw error
      mockInsert.mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      
      await expect(blacklistToken(mockJti, expiresAt, userId)).rejects.toThrow(DatabaseError);
      expect(logger.error).toHaveBeenCalledWith(
        'Error blacklisting token:',
        expect.any(Error)
      );
    });
  });
  
  describe('revokeRefreshToken', () => {
    it('should revoke a valid refresh token', async () => {
      const token = 'valid-refresh-token';
      
      // Fix mock update operation chain
      const mockSelectResult = {
        data: [{ jti: mockJti }],
        error: null,
        count: 1
      };
      
      // Setup proper chaining
      mockSelect.mockResolvedValue(mockSelectResult);
      mockUpdate.mockReturnValue({ eq: mockEq });
      
      // First eq call returns another object with eq method
      const firstEqResult = { eq: jest.fn(), select: mockSelect };
      mockEq.mockReturnValueOnce(firstEqResult);
      
      // Second eq call returns object with select method
      firstEqResult.eq.mockReturnValueOnce({ select: mockSelect });
      
      await revokeRefreshToken(token);
      
      expect(jwt.decode).toHaveBeenCalledWith(token);
      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('refresh_tokens');
      expect(mockUpdate).toHaveBeenCalledWith({
        status: 'revoked',
        revoked_at: expect.any(String)
      });
      expect(mockEq).toHaveBeenCalledWith('jti', mockJti);
      expect(firstEqResult.eq).toHaveBeenCalledWith('status', 'active');
      expect(logger.info).toHaveBeenCalledWith(
        `Successfully revoked refresh token with JTI: ${mockJti}`
      );
    });
    
    it('should throw AuthenticationError if no token provided', async () => {
      await expect(revokeRefreshToken()).rejects.toThrow(AuthenticationError);
      await expect(revokeRefreshToken(null)).rejects.toThrow(AuthenticationError);
      await expect(revokeRefreshToken('')).rejects.toThrow(AuthenticationError);
      expect(logger.error).not.toHaveBeenCalled();
    });
    
    it('should throw AuthenticationError if token decode fails', async () => {
      // Setup token that will fail decode
      await expect(revokeRefreshToken('invalid-token')).rejects.toThrow(AuthenticationError);
      expect(logger.error).toHaveBeenCalled();
    });
    
    it('should throw DatabaseError if database operation fails', async () => {
      const token = 'valid-refresh-token';
      
      // Fix mock update operation chain with error
      const mockSelectResult = {
        data: null,
        error: { message: 'Database error' },
        count: null
      };
      
      // Setup proper chaining
      mockSelect.mockResolvedValue(mockSelectResult);
      mockUpdate.mockReturnValue({ eq: mockEq });
      
      // First eq call returns another object with eq method
      const firstEqResult = { eq: jest.fn(), select: mockSelect };
      mockEq.mockReturnValueOnce(firstEqResult);
      
      // Second eq call returns object with select method
      firstEqResult.eq.mockReturnValueOnce({ select: mockSelect });
      
      await expect(revokeRefreshToken(token)).rejects.toThrow(DatabaseError);
      expect(logger.error).toHaveBeenCalledWith(
        'Database error revoking refresh token:',
        expect.any(Object)
      );
    });
    
    it('should throw NotFoundError if token not found or not active', async () => {
      const token = 'valid-refresh-token';
      
      // Fix mock update operation with no affected rows
      const mockSelectResult = {
        data: [],
        error: null,
        count: 0
      };
      
      // Setup proper chaining
      mockSelect.mockResolvedValue(mockSelectResult);
      mockUpdate.mockReturnValue({ eq: mockEq });
      
      // First eq call returns another object with eq method
      const firstEqResult = { eq: jest.fn(), select: mockSelect };
      mockEq.mockReturnValueOnce(firstEqResult);
      
      // Second eq call returns object with select method
      firstEqResult.eq.mockReturnValueOnce({ select: mockSelect });
      
      await expect(revokeRefreshToken(token)).rejects.toThrow(NotFoundError);
      expect(logger.warn).toHaveBeenCalledWith(
        'Attempted to revoke a refresh token that was not found or not active',
        expect.any(Object)
      );
    });
  });
  
  describe('rotateRefreshToken', () => {
    const decodedOldToken = { 
      sub: userId, 
      jti: 'old-jti',
      type: 'refresh',
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    
    // Create mock implementations for dependency injection
    const mockGenerateRefreshToken = jest.fn();
    const mockBlacklistToken = jest.fn();
    
    beforeEach(() => {
      mockGenerateRefreshToken.mockReset();
      mockBlacklistToken.mockReset();
      
      // Default successful implementations
      mockGenerateRefreshToken.mockResolvedValue('new-refresh-token');
      mockBlacklistToken.mockResolvedValue(undefined);
    });
    
    it('should generate new token and blacklist old token', async () => {
      const newToken = await rotateRefreshToken(
        decodedOldToken,
        {},
        mockGenerateRefreshToken,
        mockBlacklistToken
      );
      
      expect(newToken).toBe('new-refresh-token');
      expect(mockGenerateRefreshToken).toHaveBeenCalledWith(userId, undefined);
      expect(mockBlacklistToken).toHaveBeenCalledWith(
        decodedOldToken.jti,
        expect.any(Date),
        decodedOldToken.sub,
        'token_refresh'
      );
      expect(logger.debug).toHaveBeenCalled();
    });
    
    it('should throw ApplicationError if new token generation fails', async () => {
      const generationError = new Error('Token generation failed');
      mockGenerateRefreshToken.mockRejectedValue(generationError);
      
      await expect(
        rotateRefreshToken(decodedOldToken, {}, mockGenerateRefreshToken, mockBlacklistToken)
      ).rejects.toThrow(ApplicationError);
      
      expect(mockGenerateRefreshToken).toHaveBeenCalledWith(userId, undefined);
      expect(mockBlacklistToken).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });
    
    it('should throw ApplicationError if blacklisting old token fails', async () => {
      const blacklistError = new Error('Blacklist failed');
      mockBlacklistToken.mockRejectedValue(blacklistError);
      
      await expect(
        rotateRefreshToken(decodedOldToken, {}, mockGenerateRefreshToken, mockBlacklistToken)
      ).rejects.toThrow(ApplicationError);
      
      expect(mockGenerateRefreshToken).toHaveBeenCalledWith(userId, undefined);
      expect(mockBlacklistToken).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
    });
    
    it('should throw ApplicationError for invalid token input', async () => {
      const invalidToken = { sub: userId }; // Missing required fields
      
      await expect(
        rotateRefreshToken(invalidToken, {}, mockGenerateRefreshToken, mockBlacklistToken)
      ).rejects.toThrow(ApplicationError);
      
      expect(mockGenerateRefreshToken).not.toHaveBeenCalled();
      expect(mockBlacklistToken).not.toHaveBeenCalled();
    });
    
    it('should respect role from input token', async () => {
      const tokenWithRole = { 
        sub: userId, 
        jti: 'old-jti',
        type: 'refresh',
        role: 'admin',
        exp: Math.floor(Date.now() / 1000) + 3600
      };
      
      await rotateRefreshToken(
        tokenWithRole,
        {},
        mockGenerateRefreshToken,
        mockBlacklistToken
      );
      
      expect(mockGenerateRefreshToken).toHaveBeenCalledWith(userId, 'admin');
    });
  });
  
  describe('cleanupExpiredBlacklistedTokens', () => {
    it('should delete expired blacklisted tokens', async () => {
      // Mock the delete operation
      mockDelete.mockReturnValue({ lt: mockLt });
      mockLt.mockReturnValue({ select: mockSelect });
      
      // Update mock to return data array with 5 items
      const mockData = [
        { jti: 'expired-jti-1' },
        { jti: 'expired-jti-2' },
        { jti: 'expired-jti-3' },
        { jti: 'expired-jti-4' },
        { jti: 'expired-jti-5' }
      ];
      
      mockSelect.mockResolvedValue({
        data: mockData,
        error: null,
        count: 5
      });
      
      process.env.NODE_ENV = 'development'; // Ensure not in test mode
      
      const result = await cleanupExpiredBlacklistedTokens();
      
      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('blacklisted_tokens');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockLt).toHaveBeenCalledWith('expires_at', expect.any(String));
      expect(result).toBe(5);
      expect(logger.info).toHaveBeenCalledWith('Cleaned up 5 expired blacklisted tokens');
    });
    
    it('should handle test environment', async () => {
      // Set environment to test
      process.env.NODE_ENV = 'test';
      global.JEST_WORKER_ID = 1;
      
      // Mock delete operations for tests
      mockDelete.mockReturnValue({ lt: mockLt });
      mockLt.mockReturnValue({ select: mockSelect });
      mockSelect.mockResolvedValue({
        data: [{ jti: 'expired-jti-1' }, { jti: 'expired-jti-2' }],
        error: null
      });
      
      const result = await cleanupExpiredBlacklistedTokens();
      
      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('blacklisted_tokens');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockLt).toHaveBeenCalledWith('expires_at', expect.any(String));
      expect(result).toBe(2); // Should be 2 for tests
      
      delete global.JEST_WORKER_ID;
    });
    
    it('should throw DatabaseError if deletion fails', async () => {
      // Mock the delete operation with error
      mockDelete.mockReturnValue({ lt: mockLt });
      mockLt.mockReturnValue({ select: mockSelect });
      
      // Update mock to return error
      mockSelect.mockResolvedValue({
        data: null,
        error: { message: 'Database error during deletion' },
        count: null
      });
      
      process.env.NODE_ENV = 'development'; // Ensure not in test mode
      
      await expect(cleanupExpiredBlacklistedTokens()).rejects.toThrow(DatabaseError);
      expect(logger.error).toHaveBeenCalledWith(
        'Error cleaning up expired blacklisted tokens:',
        expect.any(Object)
      );
    });
    
    it('should handle no tokens to clean up', async () => {
      // Mock the delete operation with no deletions
      mockDelete.mockReturnValue({ lt: mockLt });
      mockLt.mockReturnValue({ select: mockSelect });
      
      // Update mock to return empty data array
      mockSelect.mockResolvedValue({
        data: [],
        error: null,
        count: 0
      });
      
      process.env.NODE_ENV = 'development'; // Ensure not in test mode
      
      const result = await cleanupExpiredBlacklistedTokens();
      
      expect(result).toBe(0);
      expect(logger.info).toHaveBeenCalledWith('Cleaned up 0 expired blacklisted tokens');
    });
    
    it('should throw DatabaseError for unexpected errors', async () => {
      // Mock the delete operation to throw error
      mockDelete.mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      
      process.env.NODE_ENV = 'development'; // Ensure not in test mode
      
      await expect(cleanupExpiredBlacklistedTokens()).rejects.toThrow(DatabaseError);
      expect(logger.error).toHaveBeenCalledWith(
        'Unexpected error during blacklisted token cleanup:',
        expect.any(Error)
      );
    });
  });
}); 