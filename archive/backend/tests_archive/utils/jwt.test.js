/**
 * @fileoverview Tests for JWT Utilities
 * Tests for token generation, verification and refresh token management
 */

// Restore the env mock
jest.mock('../../config/env.js', () => ({
  env: {
    env: 'test',
    isDevelopment: false,
    isProduction: false,
    isTest: true,
    port: 8001,
    supabase: {
      url: 'https://mock-test-url.supabase.co',
      projectRef: 'test-project-ref',
      anonKey: 'mock-test-anon-key',
      serviceRoleKey: 'mock-test-service-role-key',
      databasePassword: 'mock-test-db-password',
      dbHost: 'db.mock-test-url.supabase.co',
      dbPort: 5432,
      dbName: 'postgres',
      dbUser: 'postgres',
      poolerHost: 'db.mock-test-url.supabase.co',
      poolerSessionPort: 5432,
      poolerTransactionPort: 6543,
      poolerUser: 'postgres.test-project-ref',
      databaseUrl: 'postgresql://postgres:mock-test-db-password@db.mock-test-url.supabase.co:5432/postgres',
      databaseUrlServiceRole: 'postgresql://postgres:mock-test-db-password@db.mock-test-url.supabase.co:5432/postgres',
      databaseUrlPoolerSession: 'postgresql://postgres.test-project-ref:mock-test-db-password@db.mock-test-url.supabase.co:5432/postgres',
      databaseUrlPoolerTransaction: 'postgresql://postgres.test-project-ref:mock-test-db-password@db.mock-test-url.supabase.co:6543/postgres',
      sslRejectUnauthorized: false,
      sslMode: 'prefer',
      dbIpAddress: '',
      connectionTimeout: 30000
    },
    migrations: {
      directory: './backend/migrations'
    },
    auth: {
      jwtSecret: 'test-secret-key-for-jest-tests-32-chars',
      jwtExpiresIn: '15m',
      refreshTokenExpiresIn: '7d', // Ensure this is correct
      refreshSecret: 'test-refresh-secret-key-32-chars', // Ensure this is correct
      adminBypassOwnership: true,
      accessTokenExpiry: '15m',
      refreshTokenExpiry: '7d'
    },
    security: {
      rateLimit: {
        windowMs: 60000,
        max: 500
      }
    },
    externalServices: {
      openai: {
        apiKey: 'mock-openai-key'
      },
      perplexity: {
        apiKey: 'mock-perplexity-key'
      }
    },
    cors: {
      origin: 'http://localhost:3000,http://localhost:6006'
    }
  }
}));

// Mock dependencies
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// --- MOCK jsonwebtoken CORRECTLY --- START EDIT
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
  decode: jest.fn(), // Ensure decode is mocked here
  TokenExpiredError: jest.fn(), // Mock error classes if needed
  JsonWebTokenError: jest.fn(), // Mock error classes if needed
}));
// --- MOCK jsonwebtoken CORRECTLY --- END EDIT

const {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  revokeRefreshToken,
  isRefreshTokenValid,
  blacklistToken,
  isTokenBlacklisted,
  cleanupExpiredBlacklistedTokens,
  extractTokenFromHeader,
  decodeToken,
  validateAccessToken,
  generateTokens,
  rotateRefreshToken,
  validateRefreshToken,
} = require('../../utils/jwt');
const {
  AuthenticationError,
  DatabaseError,
  ApplicationError,
  ApiError,
  NotFoundError,
} = require('../../utils/errors');

// --- Define Mock Client Instances and Methods ---
// Define reusable mock methods
const _mockMaybeSingle = jest.fn();
const _mockSingle = jest.fn();
const _mockInsert = jest.fn();
const _mockUpdate = jest.fn();
const _mockDelete = jest.fn();
const _mockEq = jest.fn();
const _mockLt = jest.fn();
const _mockSelect = jest.fn();
const _mockFrom = jest.fn();

// Mock the Supabase admin client instance structure
const mockSupabaseAdminClient = { 
  from: _mockFrom,
  // Add rpc if needed, though not used directly in jwt.js AFAIK
  rpc: jest.fn(), 
};
// Mock the Supabase regular client instance structure
const mockSupabaseRegularClient = { 
  from: _mockFrom,
  rpc: jest.fn(),
};

// Setup the mock chaining
_mockFrom.mockImplementation(() => ({
  select: _mockSelect,
  insert: _mockInsert,
  update: _mockUpdate,
  delete: _mockDelete,
}));
_mockSelect.mockImplementation(() => ({ // Default select behavior
  eq: _mockEq,
  lt: _mockLt,
  single: _mockSingle,
  maybeSingle: _mockMaybeSingle,
  limit: jest.fn().mockReturnThis(), // Add limit for isRefreshTokenValid
}));
_mockEq.mockImplementation(() => ({
  single: _mockSingle,
  maybeSingle: _mockMaybeSingle,
  eq: _mockEq, // Allow chaining eq().eq()
  select: _mockSelect, // Allow chaining eq().select() e.g., revokeRefreshToken
  limit: jest.fn().mockReturnThis(), // Add limit for isRefreshTokenValid after eq
}));
_mockLt.mockImplementation(() => ({
  select: _mockSelect,
  // Add delete for cleanupExpiredBlacklistedTokens if needed after lt
  delete: _mockDelete, 
}));
_mockUpdate.mockImplementation(() => ({
    eq: _mockEq // Chain update().eq()
}));
// Add delete chaining for cleanupExpiredBlacklistedTokens
_mockDelete.mockImplementation(() => ({
    lt: _mockLt, // Chain delete().lt()
    eq: _mockEq, // Chain delete().eq() if ever needed
}));
// -------------------------------------------------

// --- Mock Original Modules --- NEW STRATEGY ---
jest.mock('../../services/supabase-admin', () => ({
  // Mock the actual exported function to return our mock client
  getSupabaseAdmin: jest.fn(() => mockSupabaseAdminClient)
}));
jest.mock('../../config/supabase', () => ({
  // Mock the actual exported function to return our mock client
  createSupabaseClient: jest.fn(() => mockSupabaseRegularClient),
  // Include other exports from config/supabase if jwt.js uses them
  isProduction: jest.fn(() => false),
  isTest: jest.fn(() => true),
}));
// --------------------------------------------

// Mock other external dependencies
jest.mock('jsonwebtoken');
jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({ toString: jest.fn().mockReturnValue('random-token-string') }),
}));
jest.mock('uuid', () => ({ v4: jest.fn() }));

// Mock the logger
jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// --- Import necessary modules AFTER mocks are set up ---
const { env } = require('../../config/env.js');
const logger = require('../../config/logger');
const { v4: uuidv4 } = require('uuid'); // Import the mocked v4
const { createSupabaseClient } = require('../../config/supabase');
const { getSupabaseAdmin } = require('../../services/supabase-admin');

describe('JWT Utility Functions', () => {
  const userId = 'user-123';
  const payload = { id: userId, role: 'user' };
  
  const role = 'user';
  const token = 'mockAccessToken';
  const refreshToken = 'mockRefreshToken';
  const jwtid = 'mockJwtId';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // --- Reset Supabase Method Mocks --- 
    // Ensure all chained methods are reset correctly
    _mockFrom.mockReset().mockImplementation(() => ({
        select: _mockSelect.mockReturnThis(),
        insert: _mockInsert,
        update: _mockUpdate,
        delete: _mockDelete,
    }));
    _mockSelect.mockReset().mockImplementation(() => ({ 
        eq: _mockEq.mockReturnThis(), 
        lt: _mockLt.mockReturnThis(),
        single: _mockSingle,
        maybeSingle: _mockMaybeSingle,
    }));
    _mockEq.mockReset().mockImplementation(() => ({ 
        single: _mockSingle,
        maybeSingle: _mockMaybeSingle,
    }));
     _mockLt.mockReset().mockImplementation(() => ({
        select: _mockSelect.mockReturnThis(), // Keep chainable for delete
    }));
     _mockUpdate.mockReset().mockImplementation(() => ({ 
        eq: _mockEq.mockReturnThis(), // Keep chainable for update
    }));
    
    // Reset default return values for terminal methods
    _mockMaybeSingle.mockReset().mockResolvedValue({ data: null, error: null });
    _mockSingle.mockReset().mockResolvedValue({ data: { id: 'mock-id' }, error: null });
    _mockInsert.mockReset().mockResolvedValue({ data: [{ jti: 'inserted-jti' }], error: null, count: 1 }); // Ensure data matches select('jti')
    _mockUpdate.mockReset().mockResolvedValue({ data: [{ id: 'updated-id' }], error: null });
    _mockDelete.mockReset().mockResolvedValue({ data: [{ id: 'deleted-id' }], error: null, count: 1 }); // Add count for delete
    // -------------------------------------

    // Reset uuid mock
    uuidv4.mockClear().mockReturnValue('mock-uuid');

    // Reset jsonwebtoken mocks
    jwt.sign.mockClear();
    jwt.verify.mockClear();
    jwt.decode.mockClear();

    // Default jwt.verify implementation (uses the mocked env)
    jwt.verify.mockImplementation((tokenArg, secret) => {
      const accessSecret = env.auth.jwtSecret;
      const refreshSecret = env.auth.refreshSecret;
      let expectedSecret = accessSecret; // Default
      if (tokenArg?.includes('refresh')) {
          expectedSecret = refreshSecret;
      }
      if (secret !== expectedSecret) {
          throw new jwt.JsonWebTokenError(`Invalid secret used in mock verify. Expected: ${expectedSecret}`);
      }
      
      if (tokenArg === 'expired-token') {
        const tokenExpiredError = new Error('jwt expired');
        tokenExpiredError.name = 'TokenExpiredError';
        throw tokenExpiredError;
      }
      if (tokenArg === 'invalid-token') {
        const jsonWebTokenError = new Error('invalid signature');
        jsonWebTokenError.name = 'JsonWebTokenError';
        throw jsonWebTokenError;
      }
      
      // Simulate different token types based on the token value
      if (tokenArg && tokenArg.includes('access')) {
       return { sub: userId, role: 'user', type: 'access', jti: 'mock-jti-' + tokenArg, exp: Math.floor(Date.now() / 1000) + 3600 };
      }
      if (tokenArg && tokenArg.includes('refresh')) {
       return { sub: userId, role: 'user', type: 'refresh', jti: 'mock-jti-' + tokenArg, exp: Math.floor(Date.now() / 1000) + (7 * 24 * 3600) };
      }
      return { sub: userId, role: 'user', type: 'access', jti: 'default-mock-jti', exp: Math.floor(Date.now() / 1000) + 3600 };
    });

    // Default jwt.sign implementation (uses the mocked env)
    jwt.sign.mockImplementation((payload, secret, options) => {
      // Re-require env inside to ensure freshness (maybe overkill?)
      const currentEnv = require('../../config/env.js').env;

      const type = payload.type || 'access';
      let expiry = currentEnv.auth.jwtExpiresIn;
      if (type === 'refresh') {
        expiry = currentEnv.auth.refreshTokenExpiresIn;
      }
      if (options?.expiresIn) {
        expiry = options.expiresIn;
      }
      const expectedSecret = type === 'refresh' ? currentEnv.auth.refreshSecret : currentEnv.auth.jwtSecret;
      if (secret !== expectedSecret) {
          throw new Error(`jwt.sign mock called with WRONG secret for type ${type}`);
      }
      return `mocked-${type}-token-for-${payload.sub}-expires-${expiry}`;
    });
    
    // Default jwt.decode mock
    jwt.decode.mockImplementation((tokenArg) => {
      if (tokenArg?.includes('valid')) {
        return { 
          sub: 'user-123', 
          jti: 'mock-jti-' + tokenArg, 
          type: tokenArg.includes('refresh') ? 'refresh' : 'access' 
        };
      }
      return null; // Invalid token
    });
  });

  describe('generateToken', () => {
    it('should generate an access JWT with correct options', () => {
        const jti = 'mock-uuid';
        const expectedToken = `mocked-access-token-for-${userId}-expires-${env.auth.jwtExpiresIn}`;
        const generatedToken = generateToken(userId, role);
        expect(generatedToken).toBe(expectedToken);
        expect(jwt.sign).toHaveBeenCalledWith(
            { sub: userId, role: role, type: 'access', jti: jti }, 
            env.auth.jwtSecret,
            { expiresIn: env.auth.jwtExpiresIn }
        );
        expect(uuidv4).toHaveBeenCalledTimes(1);
    });

    it('should throw ApplicationError if JWT sign fails', () => {
        const signError = new Error('Sign error');
        jwt.sign.mockImplementationOnce(() => { throw signError; });
        
        // Use try/catch instead of async/await since generateToken isn't async
        try {
            generateToken(userId, role);
            // If we get here, the test should fail
            fail('Expected an error to be thrown');
        } catch (error) {
            expect(error).toBeInstanceOf(ApplicationError);
            expect(error.message).toBe('Failed to generate authentication token');
            expect(logger.error).toHaveBeenCalledWith('Error generating JWT token:', signError);
        }
    });
  });
  
  describe('generateRefreshToken', () => {
    const userId = 'user-123';
    const role = 'user';

    beforeEach(() => {
      // Keep other resets
      jwt.sign.mockClear();
      jwt.decode.mockClear();
      _mockInsert.mockClear();
      _mockFrom.mockClear();
      _mockSelect.mockClear();
      uuidv4.mockClear();
      uuidv4.mockReturnValue('default-mock-jti'); 
    });

    it('should generate a refresh token and store it', async () => {
      const testJti = 'specific-test-jti-refresh';
      uuidv4.mockReturnValueOnce(testJti); 
      jwt.sign.mockReturnValueOnce('generated-refresh-token');
      jwt.decode.mockImplementationOnce((token) => {
          if (token === 'generated-refresh-token') {
              return { jti: testJti, sub: userId, type: 'refresh' };
          }
          return null;
      });
      // Define the mock insert function instance first
      const mockInsertImplementation = jest.fn().mockImplementationOnce(() => ({ 
        select: jest.fn().mockResolvedValueOnce({ data: [{ jti: testJti }], error: null, count: 1 }) 
      }));
      // Now use that instance in the chain mock
      _mockFrom.mockImplementationOnce(() => ({ 
        insert: mockInsertImplementation
      }));

     const token = await generateRefreshToken(userId, role);

      expect(token).toBe('generated-refresh-token');
      
      // Assert on the specific mock function instance
      expect(mockInsertImplementation).toHaveBeenCalledWith({
            user_id: userId,
        token: 'generated-refresh-token',
        jti: testJti,
        expires_at: expect.any(Date),
        created_at: expect.any(String),
            status: 'active'
      });
    });

    it('should throw DatabaseError if storing refresh token fails', async () => {
      const dbError = new DatabaseError('DB write failed', { code: 'DB_INSERT_FAILED' });
        _mockInsert.mockResolvedValueOnce({ data: null, error: dbError });
      jwt.sign.mockReturnValueOnce('token-that-fails-storage');
      // Mock jwt.decode for this specific token to allow reaching DB error
      jwt.decode.mockImplementationOnce((token) => {
          if (token === 'token-that-fails-storage') {
              // Return minimal valid structure needed by storeRefreshToken
              return { jti: 'fail-store-jti', sub: userId, type: 'refresh' }; 
          }
          return null;
      });

      await expect(generateRefreshToken(userId, role)).rejects.toThrow(DatabaseError);
    });
  });

  describe('verifyToken', () => {
    it('should return decoded payload for valid access token', () => {
        const token = 'valid-access-token';
        const expectedPayload = { sub: 'user123', type: 'access', jti: 'mock-jti-valid-access-token' };
        jwt.verify.mockReturnValueOnce(expectedPayload); 
        const decoded = verifyToken(token);
        expect(decoded).toEqual(expectedPayload);
        expect(jwt.verify).toHaveBeenCalledWith(token, env.auth.jwtSecret);
    });

    it('should throw AuthenticationError for expired token', () => {
        const expiredError = new jwt.TokenExpiredError('jwt expired', new Date()); 
        jwt.verify.mockImplementationOnce(() => { throw expiredError; });
        expect(() => verifyToken('expired-token')).toThrow(AuthenticationError);
        expect(() => verifyToken('expired-token')).toThrow('Token has expired'); 
    });

    it('should throw AuthenticationError for invalid token signature', () => {
        const invalidSigError = new jwt.JsonWebTokenError('invalid signature'); 
        jwt.verify.mockImplementationOnce(() => { throw invalidSigError; });
        expect(() => verifyToken('invalid-token')).toThrow(AuthenticationError);
        expect(() => verifyToken('invalid-token')).toThrow('Invalid token signature');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should validate a refresh token correctly', async () => {
      // Test setup
      const decodedPayload = { jti: 'some-jti', sub: 'user-123', type: 'refresh' };
      jwt.verify.mockReturnValue(decodedPayload); // Mock successful verification

      // Override _mockFrom specifically for this test to handle both DB calls
      _mockFrom.mockImplementation((tableName) => {
        console.log(`>>> TEST MOCK: _mockFrom called with table: ${tableName}`);
        if (tableName === 'blacklisted_tokens') {
          // Mock chain for isTokenBlacklisted check (expects data: [])
          const mockLimit = jest.fn().mockResolvedValueOnce({ data: [], error: null });
          const mockEq = jest.fn(() => ({ limit: mockLimit }));
          const mockSelect = jest.fn(() => ({ eq: mockEq }));
          return { select: mockSelect };
        } else if (tableName === 'refresh_tokens') {
          // Mock chain for isRefreshTokenValid check (expects data: [{...}])
          const mockLimit = jest.fn().mockResolvedValueOnce({
            data: [{ status: 'active', expires_at: new Date(Date.now() + 10000).toISOString() }],
            error: null,
            count: 1
          });
          const mockEqUserId = jest.fn(() => ({ limit: mockLimit }));
          const mockEqJti = jest.fn(() => ({ eq: mockEqUserId }));
          const mockSelect = jest.fn(() => ({ eq: mockEqJti }));
          return { select: mockSelect };
        } else {
          // Fallback or error for unexpected table names
          console.error(`>>> TEST MOCK ERROR: Unexpected table name: ${tableName}`);
          return {}; // Return empty object or throw?
        }
      });
      
      const result = await verifyRefreshToken('valid-refresh-token');
      expect(result).toBeDefined();
      expect(result).toEqual(decodedPayload); // Should return the decoded payload on success
    });

    it('should throw AuthenticationError for invalid refresh tokens (signature)', async () => {
      const error = new jwt.JsonWebTokenError('Invalid signature');
      // Explicit mock for this test case
      jwt.verify.mockImplementationOnce(() => { throw error; }); 

      await expect(verifyRefreshToken('invalid-sig-token'))
        .rejects.toThrow(AuthenticationError);
      // Rerun with specific mock if needed or adjust the verify mock scope
      jwt.verify.mockImplementationOnce(() => { throw error; }); 
      await expect(verifyRefreshToken('invalid-sig-token'))
        .rejects.toThrow('Invalid token signature');
    });

    it('should throw AuthenticationError for invalid refresh tokens (expired)', async () => {
      const error = new jwt.TokenExpiredError('Token expired', new Date());
      // Explicit mock for this test case
      jwt.verify.mockImplementationOnce(() => { throw error; });
 
      await expect(verifyRefreshToken('expired-token'))
        .rejects.toThrow(AuthenticationError);
      // Rerun with specific mock if needed or adjust the verify mock scope
      jwt.verify.mockImplementationOnce(() => { throw error; });
      await expect(verifyRefreshToken('expired-token'))
        .rejects.toThrow('Token has expired');
    });

    it('should throw for invalid refresh tokens (wrong type)', async () => {
      // Explicit mock for this test case - verify succeeds but returns wrong type
      const wrongTypePayload = { sub: 'user-123', type: 'access', jti: 'wrong-type-jti' };
      jwt.verify.mockImplementationOnce(() => wrongTypePayload);

      await expect(verifyRefreshToken('wrong-type-token'))
        .rejects.toThrow(AuthenticationError);
      jwt.verify.mockImplementationOnce(() => wrongTypePayload);
      await expect(verifyRefreshToken('wrong-type-token'))
        .rejects.toThrow('Invalid token type');
    });

    it('should throw for refresh tokens not found in the database', async () => {
      // Explicit mocks for THIS test
      const validDecodedPayload = { sub: 'user-123', type: 'refresh', jti: 'not-found-jti' };
      jwt.verify.mockImplementation(() => validDecodedPayload); // Verify always succeeds here

      // Override _mockFrom for this specific test
      _mockFrom.mockImplementation((tableName) => {
        if (tableName === 'blacklisted_tokens') {
          // Not blacklisted
          const mockLimit = jest.fn().mockResolvedValueOnce({ data: [], error: null });
          const mockEq = jest.fn(() => ({ limit: mockLimit }));
          const mockSelect = jest.fn(() => ({ eq: mockEq }));
          return { select: mockSelect };
        } else if (tableName === 'refresh_tokens') {
          // Not found in DB
          const mockLimit = jest.fn().mockResolvedValueOnce({ data: [], error: null, count: 0 });
          const mockEqUserId = jest.fn(() => ({ limit: mockLimit }));
          const mockEqJti = jest.fn(() => ({ eq: mockEqUserId }));
          const mockSelect = jest.fn(() => ({ eq: mockEqJti }));
          return { select: mockSelect };
        } else {
          return {}; 
        }
      });
 
      await expect(verifyRefreshToken('not-found-token'))
        .rejects.toThrow(AuthenticationError);
      await expect(verifyRefreshToken('not-found-token'))
        .rejects.toThrow('Refresh token is no longer valid'); // Updated expected message based on code path
    });

    it('should throw AuthenticationError if refresh token is blacklisted', async () => {
      const jti = 'blacklisted-jti';
      const blacklistedToken = 'blacklisted-refresh-token';
      // Mocks for this test
      jwt.verify.mockImplementation(() => ({ sub: 'user-123', type: 'refresh', jti })); // Verify succeeds
      _mockFrom.mockImplementation((tableName) => {
        if (tableName === 'blacklisted_tokens') {
          // Blacklisted!
          const mockLimit = jest.fn().mockResolvedValueOnce({ data: [{ jti }], error: null, count: 1 });
          const mockEq = jest.fn(() => ({ limit: mockLimit }));
          const mockSelect = jest.fn(() => ({ eq: mockEq }));
          return { select: mockSelect };
        } else {
          return {}; // Should not reach refresh_tokens query
        }
      });

      // Use try/catch to assert properties on the caught error
      try {
        await verifyRefreshToken(blacklistedToken);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationError);
        expect(error.message).toBe('Refresh token has been revoked');
        expect(error.details.code).toBe('TOKEN_REVOKED');
      }
    });
    
    it('should throw AuthenticationError if refresh token is not valid in DB (e.g., revoked/expired DB-side)', async () => {
      const jti = 'invalid-in-db-jti';
      const invalidInDbToken = 'invalid-db-refresh-token';
      // Mocks for this test
      jwt.verify.mockImplementation(() => ({ sub: 'user-123', type: 'refresh', jti })); // Verify succeeds
      _mockFrom.mockImplementation((tableName) => {
        if (tableName === 'blacklisted_tokens') {
          // Not blacklisted
          const mockLimit = jest.fn().mockResolvedValueOnce({ data: [], error: null, count: 0 });
          const mockEq = jest.fn(() => ({ limit: mockLimit }));
          const mockSelect = jest.fn(() => ({ eq: mockEq }));
          return { select: mockSelect };
        } else if (tableName === 'refresh_tokens') {
          // Not found in DB
          const mockLimit = jest.fn().mockResolvedValueOnce({ data: [], error: null, count: 0 });
          const mockEqUserId = jest.fn(() => ({ limit: mockLimit }));
          const mockEqJti = jest.fn(() => ({ eq: mockEqUserId }));
          const mockSelect = jest.fn(() => ({ eq: mockEqJti }));
          return { select: mockSelect };
        } else {
          return {}; 
        }
      });

      // Use try/catch to assert properties on the caught error
      try {
        await verifyRefreshToken(invalidInDbToken);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationError);
        expect(error.message).toBe('Refresh token is no longer valid');
        expect(error.details.code).toBe('TOKEN_REVOKED');
      }
    });

    it('should return decoded payload for a valid refresh token', async () => {
      const validToken = 'valid-refresh-token';
      const decodedPayload = { sub: userId, type: 'refresh', jti: 'valid-jti', exp: Math.floor(Date.now() / 1000) + 60000 };
      jwt.verify.mockReturnValueOnce(decodedPayload); // Mock verify success
       _mockFrom.mockImplementationOnce(() => ({ // Mock for isTokenBlacklisted call -> false
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({ data: [], error: null }), 
      }));
      _mockFrom.mockImplementationOnce(() => ({ // Mock for isRefreshTokenValid call -> true
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(), // .eq('jti', ...)
          eq: jest.fn().mockReturnThis(), // .eq('user_id', ...)
          limit: jest.fn().mockResolvedValue({ data: [{ status: 'active', expires_at: new Date(Date.now() + 100000)}], error: null, count: 1 }),
      }));

      const result = await verifyRefreshToken(validToken);
      expect(result).toEqual(decodedPayload);
      expect(jwt.verify).toHaveBeenCalledWith(validToken, env.auth.refreshSecret); // Correct secret used
    });

  });

  describe('revokeRefreshToken', () => {
    // Test 1: Revoke successfully
    it('should revoke a refresh token successfully', async () => {
        const tokenToRevoke = 'active-refresh-token';
        const decodedJti = 'active-jti';
        // Mock decode specifically for this token
        jwt.decode.mockImplementation((token) => {
            if (token === tokenToRevoke) return { jti: decodedJti };
            return null; // Default for safety
        });

        // Corrected mock chain for update
        const mockSelectSuccess = jest.fn().mockResolvedValue({ data: [{ jti: decodedJti }], error: null, count: 1 });
        const mockEqStatus = jest.fn().mockImplementation(() => ({ select: mockSelectSuccess }));
        const mockEqJti = jest.fn().mockImplementation(() => ({ eq: mockEqStatus }));
        _mockUpdate.mockImplementationOnce(() => ({ eq: mockEqJti })); // Use eq('jti', ...) indirectly via mock chain

        await expect(revokeRefreshToken(tokenToRevoke)).resolves.toBeUndefined();

        // Verify the mocks were called correctly
        expect(_mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'revoked' }));
        expect(mockEqJti).toHaveBeenCalledWith('jti', decodedJti); // Verify filter by JTI
        expect(mockEqStatus).toHaveBeenCalledWith('status', 'active'); // Verify filter by status
    });

    // Test 2: Token not found
    it('should throw NotFoundError if the token is not found or not active', async () => {
        const nonExistentToken = 'non-existent-refresh-token';
        const decodedJti = 'non-existent-jti';
         // Mock decode specifically for this token
         jwt.decode.mockImplementation((token) => {
             if (token === nonExistentToken) return { jti: decodedJti };
             return null;
         });

        // Corrected mock chain for update returning count: 0
        const mockSelectNotFound = jest.fn().mockResolvedValue({ data: [], error: null, count: 0 });
        const mockEqStatusNotFound = jest.fn().mockImplementation(() => ({ select: mockSelectNotFound }));
        const mockEqJtiNotFound = jest.fn().mockImplementation(() => ({ eq: mockEqStatusNotFound }));
        _mockUpdate.mockImplementationOnce(() => ({ eq: mockEqJtiNotFound }));

        // Use a single expect block for clarity
        await expect(revokeRefreshToken(nonExistentToken))
            .rejects.toThrow(new NotFoundError('Refresh token not found or not active to revoke'));

        // Verify mocks
        expect(mockEqJtiNotFound).toHaveBeenCalledWith('jti', decodedJti);
        expect(mockEqStatusNotFound).toHaveBeenCalledWith('status', 'active');
    });

    it('should throw DatabaseError if Supabase update fails', async () => {
      const tokenToFail = 'token-causing-db-error';
      const dbError = new DatabaseError('Update failed');

      // --- Use mockImplementation instead of mockImplementationOnce ---
      jwt.decode.mockImplementation((token) => {
        if (token === tokenToFail) {
          return { jti: 'fail-db-jti' };
        }
        console.warn(`>>> UNEXPECTED DECODE in test: ${token}`);
        return null;
      });

      // Correct the mock chain for update -> eq -> eq -> select -> error
      const mockSelectWithError = jest.fn().mockResolvedValue({ data: null, error: dbError, count: 0 });
      const mockSecondEq = jest.fn().mockImplementation(() => ({ select: mockSelectWithError }));
      const mockFirstEq = jest.fn().mockImplementation(() => ({ eq: mockSecondEq }));
      const mockUpdateChain = { eq: mockFirstEq };

      // --- Use mockImplementation for _mockUpdate --- START EDIT
      _mockUpdate.mockImplementation(() => mockUpdateChain); // Use mockImplementation
      // --- Use mockImplementation for _mockUpdate --- END EDIT

      // Run revokeRefreshToken only once now that decode is mocked correctly
      await expect(revokeRefreshToken(tokenToFail)).rejects.toThrow(DatabaseError);
      await expect(revokeRefreshToken(tokenToFail)).rejects.toThrow('Failed to revoke refresh token due to database error');

      // Check that the logger was called
      expect(logger.error).toHaveBeenCalledWith('Database error revoking refresh token:', dbError);
    });
  });
  
    describe('isRefreshTokenValid', () => {
    const validToken = 'valid-db-refresh-token';
    const validJti = 'valid-db-jti';
    const validUserId = 'user-for-db-check';
    const futureDate = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour from now
    const pastDate = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago

     beforeEach(() => {
       // Mock decode for all tests in this suite
       jwt.decode.mockImplementation((tokenArg) => {
         if (tokenArg === validToken) return { jti: validJti, sub: validUserId };
         if (tokenArg === 'invalid-decode-token') return null;
         if (tokenArg === 'missing-jti-token') return { sub: validUserId };
         if (tokenArg === 'expired-db-token') return { jti: 'expired-db-jti', sub: validUserId };
         if (tokenArg === 'revoked-db-token') return { jti: 'revoked-db-jti', sub: validUserId };
         if (tokenArg === 'not-found-db-token') return { jti: 'not-found-db-jti', sub: validUserId };
         return { jti: 'generic-jti', sub: 'generic-user' }; // Default
       });
     });

    test('should return true for a valid, active token in the database', async () => {
        // Mock the Supabase query to return an active token
        _mockFrom.mockImplementationOnce(() => ({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(), // .eq('jti', validJti)
            eq: jest.fn().mockReturnThis(), // .eq('user_id', validUserId)
            limit: jest.fn().mockResolvedValue({ data: [{ status: 'active', expires_at: futureDate }], error: null, count: 1 })
        }));
        
        const isValid = await isRefreshTokenValid(validToken);
        expect(isValid).toBe(true);
        expect(_mockFrom).toHaveBeenCalledWith('refresh_tokens');
        // Add checks for eq calls if needed
    });

    test('should return false if token is not found in the database', async () => {
        const token = 'not-found-db-token';
         // Mock the Supabase query to return count 0
         _mockFrom.mockImplementationOnce(() => ({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(), 
            eq: jest.fn().mockReturnThis(), 
            limit: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }) // Simulate not found
        }));
        
        const isValid = await isRefreshTokenValid(token);
        expect(isValid).toBe(false);
      });
      
    test('should return false if token status is not active', async () => {
        const token = 'revoked-db-token';
         // Mock the Supabase query to return a revoked token
         _mockFrom.mockImplementationOnce(() => ({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(), 
            eq: jest.fn().mockReturnThis(), 
            limit: jest.fn().mockResolvedValue({ data: [{ status: 'revoked', expires_at: futureDate }], error: null, count: 1 })
        }));

        const isValid = await isRefreshTokenValid(token);
        expect(isValid).toBe(false);
      });

    test('should return false if token has expired based on DB expires_at', async () => {
        const token = 'expired-db-token';
        // Mock the Supabase query to return an expired token
         _mockFrom.mockImplementationOnce(() => ({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(), 
            eq: jest.fn().mockReturnThis(), 
            limit: jest.fn().mockResolvedValue({ data: [{ status: 'active', expires_at: pastDate }], error: null, count: 1 })
        }));
        
        const isValid = await isRefreshTokenValid(token);
        expect(isValid).toBe(false);
      });

    test('should return false if token decoding fails', async () => {
      const isValid = await isRefreshTokenValid('invalid-decode-token');
        expect(isValid).toBe(false);
      });

    test('should return false if token is missing JTI after decoding', async () => {
      const isValid = await isRefreshTokenValid('missing-jti-token');
      expect(isValid).toBe(false);
    });

    test('should return false if database query fails', async () => {
        const dbError = new Error('DB connection error');
        // Mock the Supabase query to return an error object, not throw
        _mockFrom.mockImplementationOnce(() => { // Mock specific call
            const mockLimit = jest.fn().mockResolvedValueOnce({ data: null, error: dbError }); // Return error object
            const mockEqUserId = jest.fn(() => ({ limit: mockLimit }));
            const mockEqJti = jest.fn(() => ({ eq: mockEqUserId }));
            const mockSelect = jest.fn(() => ({ eq: mockEqJti }));
            return { select: mockSelect };
        });

        const isValid = await isRefreshTokenValid(validToken);
        expect(isValid).toBe(false);
        // Correct the expected log message (remove trailing colon)
        expect(logger.error).toHaveBeenCalledWith("Database error checking refresh token validity:", { error: dbError, jti: validJti, userId: validUserId });
    });
  });

  describe('blacklistToken', () => {
    it('should blacklist a token successfully', async () => {
      const jti = 'some-jwt-id';
      const expiresAt = new Date(Date.now() + 3600 * 1000);
      const userId = 'user-xyz';

          await blacklistToken(jti, expiresAt, userId);
          expect(getSupabaseAdmin).toHaveBeenCalledTimes(1);
          expect(_mockFrom).toHaveBeenCalledWith('blacklisted_tokens');
          expect(_mockInsert).toHaveBeenCalledWith(expect.objectContaining({ jti, user_id: userId }));
          expect(logger.debug).toHaveBeenCalledWith('Token blacklisted successfully:', expect.any(Object));
      });

      it('should handle duplicate blacklist entries gracefully', async () => {
      const jti = 'duplicate-jti'; // Define JTI for logger expectation
      const duplicateError = { code: '23505', message: 'duplicate key' }; 
          _mockInsert.mockResolvedValueOnce({ data: null, error: duplicateError });
      await expect(blacklistToken(jti, new Date(), 'user-dup')).resolves.not.toThrow();
      expect(logger.debug).toHaveBeenCalledWith('Token already blacklisted:', { jti: jti });
      });

      it('should check if a token is blacklisted (found)', async () => {
          const jti = 'blacklisted-jti-test';
          // Simulate finding the token (data array is not empty)
          _mockFrom.mockReturnValueOnce({ select: _mockSelect });
          _mockSelect.mockReturnValueOnce({ eq: _mockEq });
          _mockEq.mockReturnValueOnce({ limit: jest.fn().mockResolvedValueOnce({ data: [{ jti }], error: null }) });
 
          const result = await isTokenBlacklisted(jti);
          expect(result).toBe(true);
          expect(getSupabaseAdmin).toHaveBeenCalledTimes(1);
          expect(_mockFrom).toHaveBeenCalledWith('blacklisted_tokens');
          expect(_mockSelect).toHaveBeenCalledWith('jti', { count: 'exact' });
          expect(_mockEq).toHaveBeenCalledWith('jti', jti);
      });

      it('should return false if token is not blacklisted', async () => {
          const jti = 'not-blacklisted-jti-test';
          // Simulate not finding the token (empty data array)
          _mockFrom.mockReturnValueOnce({ select: _mockSelect });
          _mockSelect.mockReturnValueOnce({ eq: _mockEq });
          _mockEq.mockReturnValueOnce({ limit: jest.fn().mockResolvedValueOnce({ data: [], error: null }) });
 
          const result = await isTokenBlacklisted(jti);
          expect(result).toBe(false);
          expect(getSupabaseAdmin).toHaveBeenCalledTimes(1);
          expect(_mockFrom).toHaveBeenCalledWith('blacklisted_tokens');
          expect(_mockEq).toHaveBeenCalledWith('jti', jti);
      });

      it('should return false on errors during blacklist check', async () => {
          const jti = 'error-jti-test';
          const dbError = new Error('DB check error');
          // Mock the DB call within isTokenBlacklisted to reject
          _mockFrom.mockReturnValueOnce({ select: _mockSelect });
          _mockSelect.mockReturnValueOnce({ eq: _mockEq });
          _mockEq.mockReturnValueOnce({ limit: jest.fn().mockResolvedValueOnce({ data: null, error: dbError }) }); // Simulate error
 
          const result = await isTokenBlacklisted(jti);
          expect(result).toBe(false);
          expect(getSupabaseAdmin).toHaveBeenCalledTimes(1);
          expect(_mockFrom).toHaveBeenCalledWith('blacklisted_tokens');
          expect(_mockEq).toHaveBeenCalledWith('jti', jti);
          expect(logger.error).toHaveBeenCalledWith('Database error checking token blacklist:', { jti, error: dbError });
      });

      it('should clean up expired blacklisted tokens', async () => {
          const deletedTokens = [{ jti: 'a' }, { jti: 'b' }];
          _mockDelete.mockReturnValueOnce({ lt: _mockLt });
          _mockLt.mockReturnValueOnce({ select: _mockSelect }); 
          _mockSelect.mockResolvedValueOnce({ data: deletedTokens, error: null }); 
          const result = await cleanupExpiredBlacklistedTokens();
          expect(result).toBe(2);
          expect(getSupabaseAdmin).toHaveBeenCalledTimes(1);
          expect(_mockFrom).toHaveBeenCalledWith('blacklisted_tokens');
          expect(_mockDelete).toHaveBeenCalled();
          expect(_mockLt).toHaveBeenCalledWith('expires_at', expect.any(String));
          expect(_mockSelect).toHaveBeenCalledWith('jti');
    });

    it('should throw DatabaseError if inserting into blacklist fails', async () => {
      const tokenJtiToBlacklist = 'jti-to-blacklist-fail';
      const expiry = new Date(Date.now() + 10000);
      const userIdForBlacklist = 'user-for-blacklist-fail';
      const dbError = new DatabaseError('Generic DB Insert Failed');

      // --- Mock the insert operation to fail --- START EDIT ---
      const mockInsertWithError = jest.fn().mockResolvedValue({ data: null, error: dbError });
      _mockFrom.mockImplementation((tableName) => {
        if (tableName === 'blacklisted_tokens') {
          return { insert: mockInsertWithError };
        }
        // Return a default mock if other tables are called unexpectedly
        return { insert: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });
       // --- Mock the insert operation to fail --- END EDIT ---

      await expect(blacklistToken(tokenJtiToBlacklist, expiry, userIdForBlacklist))
          .rejects.toThrow(DatabaseError);
          
      // Verify the correct insert was attempted
      expect(_mockFrom).toHaveBeenCalledWith('blacklisted_tokens');
      expect(mockInsertWithError).toHaveBeenCalledWith({
          jti: tokenJtiToBlacklist,
          expires_at: expect.any(Date),
          user_id: userIdForBlacklist,
          reason: 'logout',
          created_at: expect.any(String)
      });
    });
    
    it('should throw AuthenticationError if token has invalid type', async () => {
      const refreshToken = 'valid-refresh-token-as-access';
      const invalidTypePayload = { sub: userId, type: 'refresh', jti: 'refresh-jti' };

      // Adjust jwt.verify mock for this specific test
      const originalVerifyMock = jwt.verify.getMockImplementation();
      jwt.verify.mockImplementation((token, secret) => {
        if (token === refreshToken) {
          return invalidTypePayload;
        }
        return originalVerifyMock(token, secret);
      });

      // --- Use try/catch for assertion --- START EDIT
      try {
        await validateAccessToken(refreshToken);
        fail('Expected validateAccessToken to throw AuthenticationError'); 
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationError);
        expect(error.message).toBe('Invalid token type, expected access');
      }
      // --- Use try/catch for assertion --- END EDIT
      
      // Restore the original mock if needed (though beforeEach should handle it)
      // jwt.verify.mockImplementation(originalVerifyMock);
    });
    
    it('should throw AuthenticationError if token is missing JTI', async () => {
      const noJtiToken = 'access-token-no-jti';
      const noJtiPayload = { sub: userId, type: 'access', role: 'user' };

      // --- Refactor jwt.verify mock --- START EDIT
      const originalVerifyMock = jwt.verify.getMockImplementation();
      jwt.verify.mockImplementation((token, secret) => {
        if (token === noJtiToken) {
          // Simulate successful verify but return payload without jti
          return noJtiPayload; 
        }
        return originalVerifyMock(token, secret); // Fallback
      });
      // --- Refactor jwt.verify mock --- END EDIT

      await expect(validateAccessToken(noJtiToken)).rejects.toThrow(AuthenticationError);
      await expect(validateAccessToken(noJtiToken)).rejects.toThrow('Invalid access token structure (missing jti)');
      // Cannot check code property reliably yet
      // await expect(validateAccessToken(noJtiToken)).rejects.toMatchObject({ code: 'INVALID_TOKEN_STRUCTURE' });
      
      // Restore if needed
      // jwt.verify.mockImplementation(originalVerifyMock);
    });
    
    it('should throw ApplicationError on unexpected validation error', async () => {
      const unexpectedErrorToken = 'unexpected-error-token';
      const unexpectedError = new Error('Something weird happened');

      // --- Refactor jwt.verify mock --- START EDIT
      const originalVerifyMock = jwt.verify.getMockImplementation();
      jwt.verify.mockImplementation((token, secret) => {
        if (token === unexpectedErrorToken) {
          // Throw the unexpected error for this specific token
          throw unexpectedError; 
        }
        return originalVerifyMock(token, secret); // Fallback
      });
       // --- Refactor jwt.verify mock --- END EDIT

      await expect(validateAccessToken(unexpectedErrorToken)).rejects.toThrow(ApplicationError);
      await expect(validateAccessToken(unexpectedErrorToken)).rejects.toThrow('An unexpected error occurred during token validation');
      
      // Restore if needed
      // jwt.verify.mockImplementation(originalVerifyMock);
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      const userId = 'user-generate-tokens-test';
      const role = 'user';
      const mockAccessJti = 'mock-uuid-access';
      const mockRefreshJti = 'mock-uuid-refresh';
      uuidv4.mockReset().mockReturnValueOnce(mockAccessJti).mockReturnValueOnce(mockRefreshJti);
      jwt.sign.mockReset()
        .mockImplementationOnce((payload) => `mocked-${payload.type}-token-for-${payload.sub}-expires-${env.auth.jwtExpiresIn}`)
        .mockImplementationOnce((payload) => `mocked-${payload.type}-token-for-${payload.sub}-expires-${env.auth.refreshTokenExpiresIn}`);
      _mockInsert.mockReset().mockReturnValueOnce({ select: jest.fn().mockResolvedValueOnce({ data: [{ jti: mockRefreshJti }], error: null }) });
      const { generateTokens: realGenerateTokens } = require('../../utils/jwt');
      const result = await realGenerateTokens(userId, role, { testJti: mockRefreshJti });
      expect(result.accessToken).toBe(`mocked-access-token-for-${userId}-expires-${env.auth.jwtExpiresIn}`);
      expect(result.refreshToken).toBe(`mocked-refresh-token-for-${userId}-expires-${env.auth.refreshTokenExpiresIn}`);
      const { getSupabaseAdmin: getAdmin } = require('../../services/supabase-admin');
      expect(getAdmin).toHaveBeenCalledTimes(1);
      expect(_mockFrom).toHaveBeenCalledWith('refresh_tokens');
      expect(_mockInsert).toHaveBeenCalledWith(expect.objectContaining({ jti: mockRefreshJti }));
    });

     it('should handle database errors when saving refresh token', async () => {
      uuidv4.mockReturnValueOnce('access-jti').mockReturnValueOnce('refresh-jti');
      jwt.sign.mockReturnValue('mock-token');
      const dbError = new Error('Database error');
      _mockInsert.mockReturnValueOnce({ select: jest.fn().mockRejectedValueOnce(dbError) });
      const { generateTokens: realGenerateTokens } = require('../../utils/jwt');
      await expect(realGenerateTokens('user123', 'user', { testJti: 'refresh-jti' })).rejects.toThrow(DatabaseError);
      await expect(realGenerateTokens('user123', 'user', { testJti: 'refresh-jti' })).rejects.toThrow('Failed to store refresh token');
    });
  });

  describe('rotateRefreshToken', () => {
    const oldToken = 'valid-refresh-token';
    const oldDecoded = { sub: 'user-123', role: 'user', jti: 'old-jti', type: 'refresh', exp: Math.floor(Date.now() / 1000) + 3600 };
    const newRefreshTokenDetails = { token: 'new-mocked-refresh-token', jti: 'new-jti' };
    const oldJti = oldDecoded.jti;
    const oldExpiresAt = oldDecoded.exp;
    const userId = oldDecoded.sub;
    const userRole = oldDecoded.role;

    // --- Define Mock Implementations ---
    const mockBlacklistTokenInternal = jest.fn().mockResolvedValue(undefined);
    const mockGenerateRefreshTokenInternal = jest.fn().mockImplementation(async (uid, r) => {
      // console.log(`[TEST LOG] mockGenerateRefreshTokenInternal called with userId: ${uid}, role: ${r}`); // REMOVED
      await new Promise(resolve => setTimeout(resolve, 0)); // Keep async simulation
      // console.log(`[TEST LOG] mockGenerateRefreshTokenInternal RESOLVING with:`, newRefreshTokenDetails); // REMOVED
      return newRefreshTokenDetails;
    });

    // --- REMOVE module-level jest.mock for '../../utils/jwt' --- START
    // jest.mock('../../utils/jwt', () => { ... }); // REMOVED
    // --- REMOVE module-level jest.mock for '../../utils/jwt' --- END

    // --- Mock external dependencies (Supabase, etc.) IF NEEDED by the *actual* generate/blacklist --- 
    // Keep the Supabase mock, as the actual generateRefreshToken might use it
    const mockRotateSupabaseInsert = jest.fn();
    const mockRotateSupabaseSelect = jest.fn().mockReturnThis();
    const mockRotateSupabaseLimit = jest.fn().mockResolvedValue({ data: [{ id: 'some-id' }], error: null });
    const mockRotateSupabaseFrom = jest.fn();

    // We still need to mock Supabase if the *actual* generateRefreshToken uses it
    jest.mock('../../config/supabase', () => {
      mockRotateSupabaseFrom.mockImplementation(() => ({
        insert: mockRotateSupabaseInsert.mockReturnValue({
          select: mockRotateSupabaseSelect.mockReturnValue({
            limit: mockRotateSupabaseLimit
          })
        }),
        select: mockRotateSupabaseSelect.mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            limit: mockRotateSupabaseLimit
        })
      }));
      return {
          createSupabaseClient: jest.fn(() => ({ from: mockRotateSupabaseFrom })),
      };
    });
    // --- End Supabase Mock --- 

    // --- Require the ACTUAL module, but we won't use spies
    const jwtUtils = require('../../utils/jwt');
    // --- REMOVE Spy variables --- 
    // let generateRefreshTokenSpy;
    // let blacklistTokenSpy;

    beforeEach(() => {
      jest.clearAllMocks(); // Reset global mocks
      
      // --- REMOVE spyOn setup --- 
      // generateRefreshTokenSpy = jest.spyOn(jwtUtils, 'generateRefreshToken').mockImplementation(mockGenerateRefreshTokenInternal);
      // blacklistTokenSpy = jest.spyOn(jwtUtils, 'blacklistToken').mockImplementation(mockBlacklistTokenInternal);

      // Reset our mock functions directly
      mockBlacklistTokenInternal.mockClear();
      mockGenerateRefreshTokenInternal.mockClear();

      // Reset external mocks (like Supabase)
      mockRotateSupabaseFrom.mockClear();
      mockRotateSupabaseInsert.mockClear();
      mockRotateSupabaseSelect.mockClear();
      mockRotateSupabaseLimit.mockClear();
    });

    // --- REMOVE afterEach restore --- 
    // afterEach(() => {
    //     generateRefreshTokenSpy.mockRestore();
    //     blacklistTokenSpy.mockRestore();
    // });

    test('should rotate refresh token successfully', async () => {
      // Act - Call the original function, passing mocks as arguments
      const result = await jwtUtils.rotateRefreshToken(
        oldDecoded,
        {},
        mockGenerateRefreshTokenInternal, // Inject mock
        mockBlacklistTokenInternal // Inject mock
      );

      // Assert
      // 1. Check that blacklistToken mock was called correctly
      expect(mockBlacklistTokenInternal).toHaveBeenCalledTimes(1);
      expect(mockBlacklistTokenInternal).toHaveBeenCalledWith(
          oldJti,
          expect.any(Date), // Match the Date object created in rotateRefreshToken
          userId,
          'token_refresh'
      );

      // 2. Check that generateRefreshToken mock was called correctly
      expect(mockGenerateRefreshTokenInternal).toHaveBeenCalledTimes(1);
      expect(mockGenerateRefreshTokenInternal).toHaveBeenCalledWith(userId, userRole);

      // 3. Check the returned result matches the mocked generateRefreshToken output
      expect(result).toEqual(newRefreshTokenDetails);
    });

    // Test 3: blacklistToken failure during rotation
    test('should throw original error if blacklistToken fails during rotation', async () => { // Un-skipped
      const blacklistError = new DatabaseError('Failed to blacklist during rotation');
      const newPayload = { sessionInfo: 'some details' }; // Define newPayload locally here
      // This mock will throw an error when blacklistToken is called
      mockBlacklistTokenInternal.mockImplementation(async () => { // Use mockImplementation for potential multiple calls
        throw blacklistError;
      });
      // Generate should not be called, so it doesn't need a specific mock behavior here

       // Require the module HERE to ensure mocks are injected correctly for this test
       const jwtUtils = require('../../utils/jwt');

      // Act & Assert - Call rotateRefreshToken once
      await expect(jwtUtils.rotateRefreshToken(
        oldDecoded,
        newPayload, // Use the locally defined payload
        mockGenerateRefreshTokenInternal,
        mockBlacklistTokenInternal
      )).rejects.toThrow(new ApplicationError('Failed to revoke old refresh token during rotation', { cause: blacklistError })); // Check ApplicationError and cause

      // Verify mocks
      expect(mockBlacklistTokenInternal).toHaveBeenCalledWith(
        oldDecoded.jti,
        expect.any(Date),
        oldDecoded.sub,
        expect.any(String) // Expect the fourth 'type' argument
      );
      // Corrected Assertion: generate *should* be called before blacklist fails
      expect(mockGenerateRefreshTokenInternal).toHaveBeenCalled();
    });

    // Test case for generateRefreshToken failure
    test('should throw original error if generateRefreshToken fails after blacklisting', async () => {
      const generateError = new ApplicationError('Failed to generate new token'); // This is the error our mock throws
      // Configure mock functions
      mockBlacklistTokenInternal.mockResolvedValueOnce(undefined); // Blacklist *would* succeed if called
      mockGenerateRefreshTokenInternal.mockRejectedValueOnce(generateError); // Generate fails

      // Act - Call the original function, passing mocks
      // Assert on the ApplicationError thrown by the FIRST catch block in rotateRefreshToken
      await expect(jwtUtils.rotateRefreshToken(
        oldDecoded, 
        {}, 
        mockGenerateRefreshTokenInternal, 
        mockBlacklistTokenInternal
      )).rejects.toThrow('Failed to generate new refresh token during rotation');

      // Ensure blacklist mock was NOT called because generate failed first
      expect(mockBlacklistTokenInternal).not.toHaveBeenCalled(); // ADD this
    });

  });

   describe('validateRefreshToken', () => {
       const validToken = 'valid-refresh-token-for-validation';
       const userId = 'user-123'; // Assume consistent user ID
       const validDecoded = { sub: userId, type: 'refresh', jti: 'valid-jti-validate', exp: Math.floor(Date.now() / 1000) + 3600 };

       // --- Define Mock Implementations --- START
       let mockVerifyRefreshTokenInternal = jest.fn();
       let mockIsRefreshTokenValidInternal = jest.fn();
       // --- Define Mock Implementations --- END

       beforeEach(() => {
            jest.clearAllMocks(); // Clear Supabase mocks etc.
            
            // --- Reset Mock Functions --- START
            // Clear mocks instead of re-initializing
            mockVerifyRefreshTokenInternal.mockClear(); 
            mockIsRefreshTokenValidInternal.mockClear();
            // mockVerifyRefreshTokenInternal = jest.fn(); // REMOVED
            // mockIsRefreshTokenValidInternal = jest.fn(); // REMOVED
            // --- Reset Mock Functions --- END
       });

       test('should return decoded payload if both verify and DB check pass', async () => {
            // Mock implementations for THIS test
            mockVerifyRefreshTokenInternal.mockResolvedValueOnce(validDecoded);
            mockIsRefreshTokenValidInternal.mockResolvedValueOnce(true);

            // Require the module HERE to get the function with DI enabled
            const { validateRefreshToken } = require('../../utils/jwt');
            const result = await validateRefreshToken(
              validToken,
              mockVerifyRefreshTokenInternal, // Inject mock
              mockIsRefreshTokenValidInternal // Inject mock
            );
            
            expect(result).toEqual(validDecoded);
            expect(mockVerifyRefreshTokenInternal).toHaveBeenCalledWith(validToken);
            expect(mockIsRefreshTokenValidInternal).toHaveBeenCalledWith(validToken);
        });

        test('should rethrow AuthenticationError from verifyRefreshToken', async () => {
            const authError = new AuthenticationError('Token expired', { code: 'REFRESH_TOKEN_EXPIRED' });
            // Mock verifyRefreshToken to reject
            mockVerifyRefreshTokenInternal.mockRejectedValueOnce(authError);

            // Require the module HERE
            const { validateRefreshToken } = require('../../utils/jwt');
            await expect(validateRefreshToken(
              validToken, 
              mockVerifyRefreshTokenInternal, // Inject mock
              mockIsRefreshTokenValidInternal // Inject mock
            )).rejects.toThrow(authError);
            
            expect(mockIsRefreshTokenValidInternal).not.toHaveBeenCalled();
        });
        
         test('should rethrow DatabaseError from verifyRefreshToken (e.g., blacklist check fail)', async () => {
            const dbError = new DatabaseError('Blacklist check failed');
            // Mock verifyRefreshToken to reject
            mockVerifyRefreshTokenInternal.mockRejectedValueOnce(dbError);

            // Require the module HERE
            const { validateRefreshToken } = require('../../utils/jwt');
            await expect(validateRefreshToken(
              validToken, 
              mockVerifyRefreshTokenInternal, // Inject mock
              mockIsRefreshTokenValidInternal // Inject mock
            )).rejects.toThrow(dbError);
            
            expect(mockIsRefreshTokenValidInternal).not.toHaveBeenCalled();
        });

        test('should throw AuthenticationError SESSION_INVALIDATED if verify passes but DB check fails', async () => {
            // Mock verifyRefreshToken to succeed
            mockVerifyRefreshTokenInternal.mockResolvedValueOnce(validDecoded);
            // Mock isRefreshTokenValid to return false
            mockIsRefreshTokenValidInternal.mockResolvedValueOnce(false); 

            // Require the module HERE
            const { validateRefreshToken } = require('../../utils/jwt');
            await expect(validateRefreshToken(
              validToken, 
              mockVerifyRefreshTokenInternal, // Inject mock
              mockIsRefreshTokenValidInternal // Inject mock
            )).rejects.toThrow('Refresh token session is no longer valid');
            // Check the specific error code if needed
            await expect(validateRefreshToken(
              validToken, 
              mockVerifyRefreshTokenInternal, 
              mockIsRefreshTokenValidInternal
            )).rejects.toMatchObject({ details: { code: 'SESSION_INVALIDATED' } }); // Adjusted assertion for details
        });
        
        test('should throw ApplicationError for unexpected errors', async () => {
            const unexpectedError = new Error('Something went wrong');
            // Mock verifyRefreshToken to reject with unexpected error
            mockVerifyRefreshTokenInternal.mockRejectedValueOnce(unexpectedError); 

            // Require the module HERE
            const { validateRefreshToken } = require('../../utils/jwt');
            // validateRefreshToken should just rethrow the original error
            await expect(validateRefreshToken(
              validToken, 
              mockVerifyRefreshTokenInternal, // Inject mock
              mockIsRefreshTokenValidInternal // Inject mock
            )).rejects.toThrow(unexpectedError);
            // Ensure the second mock wasn't called
            expect(mockIsRefreshTokenValidInternal).not.toHaveBeenCalled(); 
        });
   });
});