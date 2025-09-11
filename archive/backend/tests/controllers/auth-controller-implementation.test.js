/**
 * @fileoverview Implementation tests for the Authentication Controller.
 * Tests the functionality of controllers/auth.js.
 */

// Mock dependencies
jest.mock('../../config/supabase', () => ({
  createSupabaseClient: jest.fn(),
}));
jest.mock('../../config', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));
jest.mock('../../utils/jwt', () => ({
  generateToken: jest.fn(),
  generateRefreshToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
  verifyToken: jest.fn(),
}));

// Use real errors
const { ValidationError, AuthenticationError, ConflictError, InternalError } = require('../../utils/errors');
const authController = require('../../controllers/auth');
const { createSupabaseClient } = require('../../config/supabase');
const jwt = require('../../utils/jwt');
const { logger } = require('../../config');

describe('Auth Controller Implementation Tests', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let mockSupabaseClient;

  // Use fake timers for the whole suite due to rate limiting logic
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    mockReq = {
      body: {},
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      headers: {},
      cookies: {},
      user: null,
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();

    // Mock Supabase client and its methods
    mockSupabaseClient = {
      auth: {
        signUp: jest.fn(),
        signInWithPassword: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(), // Simplified, assuming insert is chained after from
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      single: jest.fn(),
      delete: jest.fn().mockReturnThis(),
    };
    // Ensure 'from' returns the mock client itself to allow chaining
    mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
    // Ensure query modifiers return the mock client itself
    mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.gt.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.insert.mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.delete.mockReturnValue(mockSupabaseClient);


    createSupabaseClient.mockReturnValue(mockSupabaseClient);

    // Reset mocks
    jest.clearAllMocks();
    // No internal state helpers to call anymore
  });

  // Optional: Add afterEach to clear timers if needed between tests
  // afterEach(() => {
  //   jest.clearAllTimers();
  // });

  // --- signup ---
  describe('signup', () => {
    beforeEach(() => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };
    });

    test('Success: Supabase signup succeeds, profile insert succeeds, returns 201', async () => {
      const mockUserId = 'user-uuid-123';
      mockSupabaseClient.auth.signUp.mockResolvedValue({ data: { user: { id: mockUserId } }, error: null });
      // Mock successful profile insert
      mockSupabaseClient.single.mockResolvedValue({ data: { id: mockUserId /* ... other profile data */ }, error: null });
      // Make `insert` itself resolve the single call
      mockSupabaseClient.insert.mockReturnValue({ single: mockSupabaseClient.single });

      await authController.signup(mockReq, mockRes, mockNext);

      expect(createSupabaseClient).toHaveBeenCalledTimes(1);
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' });
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({ id: mockUserId, email: 'test@example.com', name: 'Test User' });
      expect(mockSupabaseClient.single).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', message: 'Account created', userId: mockUserId });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('User registered successfully', { userId: mockUserId });
    });

     test('Success (Profile Exists): Supabase signup ok, profile insert duplicate error, returns 201', async () => {
      const mockUserId = 'user-uuid-123';
      mockSupabaseClient.auth.signUp.mockResolvedValue({ data: { user: { id: mockUserId } }, error: null });
      // Mock duplicate profile insert error
      const duplicateError = { message: 'duplicate key value violates unique constraint', code: '23505' };
      mockSupabaseClient.single.mockResolvedValue({ data: null, error: duplicateError });
       mockSupabaseClient.insert.mockReturnValue({ single: mockSupabaseClient.single });

      await authController.signup(mockReq, mockRes, mockNext);

      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledTimes(1);
      expect(mockSupabaseClient.insert).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', message: 'Account created', userId: mockUserId });
      expect(mockNext).not.toHaveBeenCalled();
      // Logger should not log an error for duplicate profile
      expect(logger.error).not.toHaveBeenCalledWith(expect.stringContaining('Failed to create user profile'), expect.anything());
    });

    test('Success (Profile Error): Supabase signup ok, profile insert generic error, returns 201', async () => {
       const mockUserId = 'user-uuid-123';
      mockSupabaseClient.auth.signUp.mockResolvedValue({ data: { user: { id: mockUserId } }, error: null });
      // Mock generic profile insert error
      const genericProfileError = new Error('DB connection failed');
      mockSupabaseClient.single.mockResolvedValue({ data: null, error: genericProfileError });
      mockSupabaseClient.insert.mockReturnValue({ single: mockSupabaseClient.single });

      await authController.signup(mockReq, mockRes, mockNext);

      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledTimes(1);
      expect(mockSupabaseClient.insert).toHaveBeenCalledTimes(1);
       expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', message: 'Account created', userId: mockUserId });
      expect(mockNext).not.toHaveBeenCalled();
      // Logger SHOULD log this error
      expect(logger.error).toHaveBeenCalledWith('Failed to create user profile', { userId: mockUserId, error: expect.any(Error) });
     });

    test('Validation Error: Missing email, calls next with ValidationError', async () => {
      delete mockReq.body.email;

      await authController.signup(mockReq, mockRes, mockNext);

      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ message: 'Email and password are required' }));
    });

    test('Validation Error: Missing password, calls next with ValidationError', async () => {
      delete mockReq.body.password;

      await authController.signup(mockReq, mockRes, mockNext);

      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ message: 'Email and password are required' }));
    });

    test('Supabase Auth Error (Conflict): throws ConflictError, handled by next', async () => {
      const conflictError = { message: 'User already registered' };
      mockSupabaseClient.auth.signUp.mockResolvedValue({ data: null, error: conflictError });

      await authController.signup(mockReq, mockRes, mockNext);

      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(ConflictError));
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ message: 'Email already registered' }));
      expect(logger.error).toHaveBeenCalledWith('User signup failed', { error: 'User already registered' });
    });

    test('Supabase Auth Error (Generic): throws InternalError, handled by next', async () => {
      const genericAuthError = { message: 'Supabase auth unavailable' };
      mockSupabaseClient.auth.signUp.mockResolvedValue({ data: null, error: genericAuthError });

      await authController.signup(mockReq, mockRes, mockNext);

      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(InternalError));
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ message: 'User registration failed' }));
      expect(logger.error).toHaveBeenCalledWith('User signup failed', { error: 'Supabase auth unavailable' });
    });

  });

  // --- login ---
  describe('login', () => {
    const mockUserId = 'user-login-123';
    const mockAccessToken = 'mock.access.token';
    const mockRefreshToken = 'mock.refresh.token';

    beforeEach(() => {
      mockReq.body = {
        email: 'login@example.com',
        password: 'password123',
        rememberMe: false,
      };
      // Mock successful Supabase sign-in
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: mockUserId } }, error: null });
      // Mock successful JWT generation
      jwt.generateToken.mockReturnValue(mockAccessToken);
      jwt.generateRefreshToken.mockReturnValue(mockRefreshToken);
      // Mock successful refresh token storage
      mockSupabaseClient.insert.mockResolvedValue({ error: null });
      mockSupabaseClient.from.mockReturnValue(mockSupabaseClient); // Ensure chaining
    });

    test('Success (No RememberMe): Supabase signin ok, returns 200 with jwtToken only', async () => {
      await authController.login(mockReq, mockRes, mockNext);

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'login@example.com', password: 'password123' });
      expect(jwt.generateToken).toHaveBeenCalledWith({ id: mockUserId, email: 'login@example.com' }, { subject: mockUserId }); // Email IS passed
      expect(jwt.generateRefreshToken).toHaveBeenCalledWith(mockUserId);
      expect(mockSupabaseClient.from).not.toHaveBeenCalledWith('refresh_tokens'); // Should not try to store
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Login successful',
        userId: mockUserId,
        jwtToken: mockAccessToken,
        refreshToken: undefined,
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('User logged in successfully', { userId: mockUserId });
    });

    test('Success (RememberMe): Supabase signin ok, stores token, returns 200 with tokens', async () => {
      mockReq.body.rememberMe = true;

      await authController.login(mockReq, mockRes, mockNext);

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledTimes(1);
      expect(jwt.generateToken).toHaveBeenCalledTimes(1);
      expect(jwt.generateRefreshToken).toHaveBeenCalledTimes(1);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('refresh_tokens');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        user_id: mockUserId,
        token: mockRefreshToken,
        expires_at: expect.any(Date), // Check that it's a date
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Login successful',
        userId: mockUserId,
        jwtToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('Success (RememberMe, Store Fails): Supabase signin ok, store fails (logged), returns 200 with tokens', async () => {
      mockReq.body.rememberMe = true;
      const storeError = new Error('DB insert failed');
      // Simulate storage failure by rejecting
      mockSupabaseClient.from.mockReturnValue({ insert: jest.fn().mockRejectedValue(storeError) });

      await authController.login(mockReq, mockRes, mockNext);

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledTimes(1);
      expect(jwt.generateToken).toHaveBeenCalledTimes(1);
      expect(jwt.generateRefreshToken).toHaveBeenCalledTimes(1);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('refresh_tokens');
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Login successful',
        userId: mockUserId,
        jwtToken: mockAccessToken,
        refreshToken: mockRefreshToken, // Still returns token
      });
      expect(logger.error).toHaveBeenCalledWith('Failed to store refresh token', { userId: mockUserId, error: storeError });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('Validation Error: Missing email, calls next with ValidationError', async () => {
      delete mockReq.body.email;

      await authController.login(mockReq, mockRes, mockNext);

      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ message: 'Email and password are required' }));
    });

    test('Validation Error: Missing password, calls next with ValidationError', async () => {
      delete mockReq.body.password;

      await authController.login(mockReq, mockRes, mockNext);

      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ message: 'Email and password are required' }));
    });

    test('Supabase Auth Error: signIn fails, increments rate limit, calls next with AuthenticationError', async () => {
      const authError = new Error('Invalid login credentials');
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({ data: null, error: authError });

      await authController.login(mockReq, mockRes, mockNext);

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid credentials' }));
      expect(logger.warn).toHaveBeenCalledWith('Login failed', { email: 'login@example.com', error: 'Invalid login credentials' });
    });

    test('Rate Limit Error: Exceeds attempts, calls next with Error', async () => {
      // Simulate 4 failed attempts
      const authError = new Error('Invalid login credentials');
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({ data: null, error: authError });

      for (let i = 0; i < 4; i++) {
        await authController.login(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenLastCalledWith(expect.any(AuthenticationError));
        mockNext.mockClear();
      }

      // The 5th call should now trigger the rate limit check *before* calling Supabase
      await authController.login(mockReq, mockRes, mockNext);

      // Ensure Supabase was called 4 times (for failed attempts) but not the 5th time
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledTimes(4);
      expect(mockRes.status).not.toHaveBeenCalled();
      // Check that the last call to next was the rate limit error
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error)); // Generic Error thrown internally
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ message: 'Too many login attempts. Please try again later.'}));
      expect(logger.warn).toHaveBeenCalledWith(`Rate limit exceeded for login attempts from IP: ${mockReq.ip}`);
    });

  });

  // --- refreshToken ---
  describe('refreshToken', () => {
    const mockUserId = 'user-refresh-123';
    const mockOldRefreshToken = 'old.refresh.token';
    const mockNewAccessToken = 'new.access.token';

    beforeEach(() => {
      mockReq.body = { refreshToken: mockOldRefreshToken };
      // Mock successful token verification
      jwt.verifyRefreshToken.mockReturnValue(mockUserId);
      // Mock successful DB lookup
      mockSupabaseClient.single.mockResolvedValue({ data: { user_id: mockUserId, token: mockOldRefreshToken }, error: null });
      // Mock successful new token generation
      jwt.generateToken.mockReturnValue(mockNewAccessToken);
    });

    test('Success: Valid token, found in DB, returns 200 with new jwtToken', async () => {
      await authController.refreshToken(mockReq, mockRes, mockNext);

      expect(jwt.verifyRefreshToken).toHaveBeenCalledWith(mockOldRefreshToken);
      expect(createSupabaseClient).toHaveBeenCalledTimes(1);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('refresh_tokens');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('token', mockOldRefreshToken);
      expect(mockSupabaseClient.gt).toHaveBeenCalledWith('expires_at', expect.any(String)); // It compares against an ISO string
      expect(mockSupabaseClient.single).toHaveBeenCalledTimes(1);
      expect(jwt.generateToken).toHaveBeenCalledWith({ id: mockUserId }, { subject: mockUserId });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Token refreshed successfully',
        jwtToken: mockNewAccessToken,
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Token refreshed successfully', { userId: mockUserId });
    });

    test('Validation Error: Missing refreshToken in body, calls next with ValidationError', async () => {
      delete mockReq.body.refreshToken;

      await authController.refreshToken(mockReq, mockRes, mockNext);

      expect(jwt.verifyRefreshToken).not.toHaveBeenCalled();
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ message: 'Refresh token is required' }));
    });

    test('JWT Verification Error: verifyRefreshToken throws error, calls next with AuthenticationError', async () => {
      const verifyError = new Error('Invalid signature');
      jwt.verifyRefreshToken.mockImplementation(() => { throw verifyError; });

      await authController.refreshToken(mockReq, mockRes, mockNext);

      expect(jwt.verifyRefreshToken).toHaveBeenCalledWith(mockOldRefreshToken);
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid or expired refresh token' }));
      expect(logger.warn).toHaveBeenCalledWith('Invalid refresh token', { error: 'Invalid signature' });
    });

    test('DB Error (Not Found): Supabase select returns no data, calls next with AuthenticationError', async () => {
      // Mock DB returning no data
      mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });

      await authController.refreshToken(mockReq, mockRes, mockNext);

      expect(jwt.verifyRefreshToken).toHaveBeenCalledWith(mockOldRefreshToken);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('refresh_tokens');
      expect(mockSupabaseClient.single).toHaveBeenCalledTimes(1);
      expect(jwt.generateToken).not.toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      // As per current code, AuthenticationError is thrown and caught, then passed to next()
      expect(mockNext).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid or expired refresh token' }));
      expect(logger.warn).toHaveBeenCalledWith('Refresh token not found or expired in database', { userId: mockUserId });
    });

    test('DB Error (Generic): Supabase select throws generic error, calls next', async () => {
      const genericDbError = new Error('Generic DB Error');
      // Mock DB throwing a generic error
      mockSupabaseClient.single.mockRejectedValue(genericDbError);

      await authController.refreshToken(mockReq, mockRes, mockNext);

      expect(jwt.verifyRefreshToken).toHaveBeenCalledWith(mockOldRefreshToken);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('refresh_tokens');
      expect(mockSupabaseClient.single).toHaveBeenCalledTimes(1);
      expect(jwt.generateToken).not.toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      // The generic error should be caught and passed to next()
      expect(mockNext).toHaveBeenCalledWith(genericDbError);
      expect(logger.warn).toHaveBeenCalledWith('Error checking refresh token in database', { error: genericDbError.message });
    });

  });

  // --- validateSession ---
  describe('validateSession', () => {
    const mockDecodedToken = { sub: 'user-valid-123' };
    const mockValidToken = 'valid.bearer.token';

    beforeEach(() => {
      mockReq.headers.authorization = `Bearer ${mockValidToken}`;
      // Mock successful token verification
      jwt.verifyToken.mockReturnValue(mockDecodedToken);
    });

    test('Success: Valid Bearer token, verifyToken succeeds, returns 200', async () => {
      await authController.validateSession(mockReq, mockRes, mockNext);

      expect(jwt.verifyToken).toHaveBeenCalledWith(mockValidToken);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', message: 'Token is valid' });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Session validated successfully', { userId: mockDecodedToken.sub });
    });

    test('Auth Error: Missing Authorization header, returns 401', async () => {
      delete mockReq.headers.authorization;

      await authController.validateSession(mockReq, mockRes, mockNext);

      expect(jwt.verifyToken).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'No token provided' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('Auth Error: Header does not start with Bearer , returns 401', async () => {
      mockReq.headers.authorization = `Invalid ${mockValidToken}`;

      await authController.validateSession(mockReq, mockRes, mockNext);

      expect(jwt.verifyToken).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'No token provided' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('JWT Verification Error: verifyToken throws error, returns 401', async () => {
      const verifyError = new Error('Token expired');
      jwt.verifyToken.mockImplementation(() => { throw verifyError; });

      await authController.validateSession(mockReq, mockRes, mockNext);

      expect(jwt.verifyToken).toHaveBeenCalledWith(mockValidToken);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'error', message: 'Invalid or expired token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    // Note: The generic error case is hard to trigger reliably without modifying the controller code,
    // as the try/catch block only wraps the header check and token verification.
    // test('Generic Error: Unexpected error during processing, calls next', async () => { ... });
  });

  // --- logout ---
  describe('logout', () => {
    const mockUserId = 'user-logout-123';
    const mockRefreshToken = 'logout.refresh.token';

    beforeEach(() => {
      // Mock successful DB delete
      // Ensure delete returns the client for chaining .eq
      mockSupabaseClient.delete.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.delete.mockResolvedValue({ error: null }); // Default success
      // Mock verifyRefreshToken to succeed for cookie case
      jwt.verifyRefreshToken.mockReturnValue(mockUserId);
    });

    test('Success (with req.user): Attempts DB delete, returns 200', async () => {
      mockReq.user = { id: mockUserId };

      // Set up mocks for the from().delete().eq() chain for this test
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEq });
      mockSupabaseClient.from.mockReturnValue({ delete: mockDelete });

      await authController.logout(mockReq, mockRes, mockNext);

      expect(createSupabaseClient).toHaveBeenCalledTimes(1);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('refresh_tokens');
      expect(mockDelete).toHaveBeenCalledTimes(1); // Check the delete from the chain
      expect(mockEq).toHaveBeenCalledWith('user_id', mockUserId); // Check the eq from the chain
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', message: 'Logout successful' });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('User logged out', { userId: mockUserId });
    });

    test('Success (with refreshToken cookie): Attempts DB delete, returns 200', async () => {
      mockReq.cookies.refreshToken = mockRefreshToken;
      mockReq.user = null; // Ensure user isn't set

      // Set up mocks for the two delete chains
      const mockEqUserId = jest.fn().mockResolvedValue({ error: null });
      const mockEqToken = jest.fn().mockResolvedValue({ error: null });
      const mockDelete1 = jest.fn().mockReturnValue({ eq: mockEqUserId });
      const mockDelete2 = jest.fn().mockReturnValue({ eq: mockEqToken });

      // Make from() return the different delete mocks sequentially
      mockSupabaseClient.from
        .mockReturnValueOnce({ delete: mockDelete1 })
        .mockReturnValueOnce({ delete: mockDelete2 });

      await authController.logout(mockReq, mockRes, mockNext);

      expect(jwt.verifyRefreshToken).toHaveBeenCalledWith(mockRefreshToken);
      expect(createSupabaseClient).toHaveBeenCalledTimes(1);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('refresh_tokens');
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(2); // Called twice for two deletes
      expect(mockDelete1).toHaveBeenCalledTimes(1);
      expect(mockDelete2).toHaveBeenCalledTimes(1);
      expect(mockEqUserId).toHaveBeenCalledWith('user_id', mockUserId);
      expect(mockEqToken).toHaveBeenCalledWith('token', mockRefreshToken);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', message: 'Logout successful' });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('User logged out', { userId: mockUserId });
    });

    test('Success (with invalid refreshToken cookie): Logs info, returns 200', async () => {
      mockReq.cookies.refreshToken = 'invalid.token';
      mockReq.user = null;
      jwt.verifyRefreshToken.mockImplementation(() => { throw new Error('Invalid'); });

      await authController.logout(mockReq, mockRes, mockNext);

      expect(jwt.verifyRefreshToken).toHaveBeenCalledWith('invalid.token');
      expect(createSupabaseClient).not.toHaveBeenCalled(); // Should not attempt DB delete
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', message: 'Logout successful' });
      expect(mockNext).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Invalid refresh token during logout, continuing anyway');
    });

    test('Success (no user/token): Returns 200 without DB delete', async () => {
      mockReq.user = null;
      delete mockReq.cookies.refreshToken;

      await authController.logout(mockReq, mockRes, mockNext);

      expect(jwt.verifyRefreshToken).not.toHaveBeenCalled();
      expect(createSupabaseClient).not.toHaveBeenCalled();
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', message: 'Logout successful' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('DB Error: Supabase delete fails (logged), returns 200', async () => {
      mockReq.user = { id: mockUserId };
      const dbError = new Error('Connection timeout');

      // Ensure the eq call resulting from the delete chain REJECTS with an error
      const mockEqWithError = jest.fn().mockRejectedValue(dbError);
      const mockDelete = jest.fn().mockReturnValue({ eq: mockEqWithError });
      mockSupabaseClient.from.mockReturnValue({ delete: mockDelete });

      await authController.logout(mockReq, mockRes, mockNext);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('refresh_tokens');
      expect(mockDelete).toHaveBeenCalledTimes(1);
      expect(mockEqWithError).toHaveBeenCalledWith('user_id', mockUserId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ status: 'success', message: 'Logout successful' });
      expect(logger.warn).toHaveBeenCalledWith('Error removing refresh tokens from database', { error: dbError.message });
      expect(mockNext).not.toHaveBeenCalled();
    });

    // Note: Generic error is hard to trigger as most paths return 200.
    // test('Generic Error: Unexpected error during processing, calls next', async () => { ... });
  });

}); 