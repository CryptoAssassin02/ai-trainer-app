/**
 * @fileoverview Authentication Routes
 * Handles user authentication endpoints
 */

const express = require('express');
const router = express.Router();
const { validate, schemas } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const authController = require('../controllers/auth.controller');

// Register a new user
router.post(
  '/register',
  validate(schemas.user.register),
  authController.register
);

// Login user
router.post(
  '/login',
  validate(schemas.user.login),
  authController.login
);

// Logout user (revoke refresh token)
router.post(
  '/logout',
  authenticate,
  authController.logout
);

// Refresh access token
router.post(
  '/refresh-token',
  authController.refreshToken
);

// Get current user profile
router.get(
  '/me',
  authenticate,
  authController.getCurrentUser
);

// Update user password
router.put(
  '/password',
  authenticate,
  validate(schemas.user.updateProfile),
  authController.updatePassword
);

module.exports = router; 