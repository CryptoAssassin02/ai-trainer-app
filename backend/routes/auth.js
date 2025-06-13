/**
 * @fileoverview Authentication Routes
 * Handles signup, login, and authentication
 */

const express = require('express');
const { authLimiters } = require('../middleware/rateLimit');
const { authenticate } = require('../middleware/auth.js');
const authController = require('../controllers/auth.js');
const { sanitizeUserInput } = require('../utils/sanitization');

const router = express.Router();

// Helper function to conditionally apply rate limiting (skip in test environment)
const conditionalRateLimit = (limiter) => {
  return (req, res, next) => {
    if (process.env.NODE_ENV === 'test') {
      // Skip rate limiting in test environment
      return next();
    }
    return limiter(req, res, next);
  };
};

/**
 * @route POST /v1/auth/signup
 * @desc Register a new user
 * @access Public
 */
router.post('/signup', 
  // Apply rate limiting to prevent brute force attacks (skip in test)
  conditionalRateLimit(authLimiters.signup),
  
  // Sanitize user input
  (req, res, next) => {
    req.body = sanitizeUserInput(req.body);
    next();
  },
  
  // Handle signup
  authController.signup
);

/**
 * @route POST /v1/auth/login
 * @desc Authenticate user and get token
 * @access Public
 */
router.post('/login', 
  // Apply rate limiting to prevent brute force attacks (skip in test)
  conditionalRateLimit(authLimiters.login),
  
  // Sanitize user input
  (req, res, next) => {
    req.body = sanitizeUserInput(req.body);
    next();
  },
  
  // Handle login
  authController.login
);

/**
 * @route POST /v1/auth/refresh
 * @desc Refresh access token using refresh token
 * @access Public
 */
router.post('/refresh',
  // Apply rate limiting to prevent token grinding (skip in test)
  conditionalRateLimit(authLimiters.refresh),
  
  // Handle token refresh
  authController.refreshToken
);

/**
 * @route POST /v1/auth/logout
 * @desc Logout user and invalidate token
 * @access Private
 */
router.post('/logout',
  // Authenticate user
  authenticate,
  
  // Handle logout
  authController.logout
);

/**
 * @route GET /v1/auth/me
 * @desc Get current user's profile
 * @access Private
 */
router.get('/me',
  // Authenticate user
  authenticate,
  
  // Handle profile retrieval
  authController.getCurrentUser
);

/**
 * @route GET /v1/auth/validate-session
 * @desc Validate the current session token
 * @access Private
 */
router.get('/validate-session',
  // Authenticate user
  authenticate,
  
  // Handle session validation
  authController.validateSession
);

/**
 * @route POST /v1/auth/update-password
 * @desc Update authenticated user's password
 * @access Private
 */
router.post('/update-password',
  // Authenticate user
  authenticate,
  
  // Handle password update
  authController.updatePassword
);

/**
 * @route POST /v1/auth/password-reset
 * @desc Request password reset email
 * @access Public
 */
router.post('/password-reset',
  // Apply rate limiting to prevent abuse (skip in test)
  conditionalRateLimit(authLimiters.passwordReset),
  
  // Sanitize user input
  (req, res, next) => {
    req.body = sanitizeUserInput(req.body);
    next();
  },
  
  // Handle password reset request
  authController.requestPasswordReset
);

/**
 * @route POST /v1/auth/reset-password
 * @desc Reset password using token
 * @access Public
 */
router.post('/reset-password',
  // Apply rate limiting to prevent brute force attacks (skip in test)
  conditionalRateLimit(authLimiters.passwordReset),
  
  // Sanitize user input
  (req, res, next) => {
    req.body = sanitizeUserInput(req.body);
    next();
  },
  
  // Handle password reset
  authController.resetPassword
);

/**
 * @route POST /v1/auth/resend-verification
 * @desc Resend email verification for unverified users
 * @access Public
 */
router.post('/resend-verification',
  // Apply rate limiting to prevent abuse (skip in test)
  conditionalRateLimit(authLimiters.passwordReset), // Reuse password reset limiter (3/hour)
  
  // Sanitize user input
  (req, res, next) => {
    req.body = sanitizeUserInput(req.body);
    next();
  },
  
  // Handle email verification resend
  authController.resendEmailVerification
);

/**
 * @route POST /v1/auth/verify-email
 * @desc Verify email using verification token
 * @access Public
 */
router.post('/verify-email',
  // Apply rate limiting to prevent brute force attacks (skip in test)
  conditionalRateLimit(authLimiters.login), // Reuse login limiter (5/15min)
  
  // Sanitize user input
  (req, res, next) => {
    req.body = sanitizeUserInput(req.body);
    next();
  },
  
  // Handle email verification
  authController.verifyEmail
);

/**
 * @route GET /v1/auth/email-verification-status
 * @desc Check email verification status for current user
 * @access Private
 */
router.get('/email-verification-status',
  // Authenticate user
  authenticate,
  
  // Handle verification status check
  authController.checkEmailVerificationStatus
);

module.exports = router; 