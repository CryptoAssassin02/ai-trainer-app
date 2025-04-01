/**
 * @fileoverview Authentication Routes
 * Handles user authentication endpoints according to API Reference Document
 */

const express = require('express');
const router = express.Router();
const { validate, userSchemas } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { authLimiters } = require('../middleware/rateLimit');
const authController = require('../controllers/auth');

// POST /v1/auth/signup - Create a new user account
router.post(
  '/signup',
  authLimiters.signup,
  validate(userSchemas.register),
  authController.signup
);

// POST /v1/auth/login - Authenticate user and get tokens
router.post(
  '/login',
  authLimiters.login,
  validate(userSchemas.login),
  authController.login
);

// POST /v1/auth/refresh - Refresh access token
router.post(
  '/refresh',
  authLimiters.refresh,
  validate(userSchemas.refresh),
  authController.refreshToken
);

// GET /v1/auth/session - Validate current session
router.get(
  '/session',
  authenticate,
  authController.validateSession
);

// POST /v1/auth/logout - Logout user and invalidate tokens
router.post(
  '/logout',
  authenticate,
  authController.logout
);

module.exports = router; 