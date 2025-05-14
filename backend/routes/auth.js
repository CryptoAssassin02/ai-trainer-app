/**
 * @fileoverview Authentication Routes
 * Handles signup, login, and authentication
 */

const express = require('express');
const { authLimiters } = require('../middleware/rateLimit');
const { auth } = require('../middleware');
const authController = require('../controllers/auth.controller');
const { sanitizeUserInput } = require('../utils/sanitization');

const router = express.Router();

/**
 * @route POST /auth/signup
 * @desc Register a new user
 * @access Public
 */
router.post('/signup', 
  // Apply rate limiting to prevent brute force attacks
  authLimiters.signup,
  
  // Sanitize user input
  (req, res, next) => {
    req.body = sanitizeUserInput(req.body);
    next();
  },
  
  // Handle signup
  authController.register
);

/**
 * @route POST /auth/login
 * @desc Authenticate user and get token
 * @access Public
 */
router.post('/login', 
  // Apply rate limiting to prevent brute force attacks
  authLimiters.login,
  
  // Sanitize user input
  (req, res, next) => {
    req.body = sanitizeUserInput(req.body);
    next();
  },
  
  // Handle login
  authController.login
);

/**
 * @route POST /auth/refresh
 * @desc Refresh access token using refresh token
 * @access Public
 */
router.post('/refresh',
  // Apply rate limiting to prevent token grinding
  authLimiters.refresh,
  
  // Handle token refresh
  auth.refreshToken
);

/**
 * @route POST /auth/logout
 * @desc Logout user and invalidate token
 * @access Private
 */
router.post('/logout',
  // Authenticate user
  auth.authenticate,
  
  // Handle logout
  auth.logout
);

/**
 * @route GET /auth/me
 * @desc Get current user's profile
 * @access Private
 */
router.get('/me',
  // Authenticate user
  auth.authenticate,
  
  // Handle profile retrieval
  authController.getCurrentUser
);

/* COMMENT OUT - Controller function missing
/**
 * @route POST /auth/password-reset
 * @desc Request password reset email
 * @access Public
 */
/*
router.post('/password-reset',
  // Apply rate limiting to prevent abuse
  authLimiters.passwordReset,
  
  // Sanitize user input
  (req, res, next) => {
    req.body = sanitizeUserInput(req.body);
    next();
  },
  
  // Handle password reset request
  authController.requestPasswordReset
);
*/

/* COMMENT OUT - Controller function missing
/**
 * @route POST /auth/password-reset/:token
 * @desc Reset password using token
 * @access Public
 */
/*
router.post('/password-reset/:token',
  // Apply rate limiting to prevent brute force attacks
  authLimiters.passwordReset,
  
  // Sanitize user input
  (req, res, next) => {
    req.body = sanitizeUserInput(req.body);
    next();
  },
  
  // Handle password reset
  authController.resetPassword
);
*/

module.exports = router; 