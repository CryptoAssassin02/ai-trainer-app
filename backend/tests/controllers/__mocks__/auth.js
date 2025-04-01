// Mock implementations of auth controller functions for testing
const jwtUtils = require('../../../utils/jwt');

const signup = jest.fn().mockImplementation(async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      throw { message: 'Email and password are required', statusCode: 400 };
    }
    
    // Check the result of the mocked Supabase auth.signUp
    if (req.mockSignUpError) {
      if (req.mockSignUpError.includes('already registered')) {
        return next({ message: 'Email already registered', statusCode: 409 });
      }
      return next(new Error('User registration failed'));
    }
    
    const userId = 'user123';
    
    // Return success response
    return res.status(201).json({
      status: 'success',
      message: 'Account created',
      userId
    });
  } catch (error) {
    next(error);
  }
});

const login = jest.fn().mockImplementation(async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      throw { message: 'Email and password are required', statusCode: 400 };
    }
    
    // Check the result of the mocked Supabase auth.signInWithPassword
    if (req.mockLoginError) {
      return next({ message: 'Invalid credentials', statusCode: 401 });
    }
    
    const userId = 'user123';
    
    // Generate tokens using mocked JWT functions
    const accessToken = jwtUtils.generateToken({ id: userId, email }, { subject: userId });
    const refreshToken = rememberMe ? jwtUtils.generateRefreshToken(userId) : undefined;
    
    // Return success response with tokens
    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      userId,
      jwtToken: accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
});

const refreshToken = jest.fn().mockImplementation(async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw { message: 'Refresh token is required', statusCode: 400 };
    }
    
    // Check the result of the mocked JWT verification
    if (req.mockRefreshError) {
      return next({ message: 'Invalid or expired refresh token', statusCode: 401 });
    }
    
    const userId = 'user123';
    const accessToken = jwtUtils.generateToken({ id: userId }, { subject: userId });
    
    // Return success response with tokens
    return res.status(200).json({
      status: 'success',
      message: 'Token refreshed successfully',
      jwtToken: accessToken
    });
  } catch (error) {
    next(error);
  }
});

const validateSession = jest.fn().mockImplementation(async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'No token provided'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Check the result of the mocked JWT verification
    if (req.mockValidateError) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired token'
      });
    }
    
    return res.status(200).json({
      status: 'success',
      message: 'Token is valid'
    });
  } catch (error) {
    next(error);
  }
});

const logout = jest.fn().mockImplementation(async (req, res, next) => {
  try {
    // Check if there should be an error during token revocation
    if (req.mockLogoutError) {
      return next(new Error('Failed to revoke refresh token'));
    }
    
    // Return success response
    return res.status(200).json({
      status: 'success',
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = {
  signup,
  login,
  refreshToken,
  validateSession,
  logout
}; 