/**
 * @fileoverview Integration tests for authentication middleware
 * Tests the core authentication and ownership middleware functions
 */

const supertest = require('supertest');
const express = require('express');
const { authenticate, requireOwnership, optionalAuth } = require('../../../middleware/auth');
const { getSupabaseClient } = require('../../../services/supabase');

// Create test app with middleware routes
const app = express();
app.use(express.json());

// Test routes for different middleware
const testRouter = express.Router();

// Route that requires authentication
testRouter.get('/authenticated-only', authenticate, (req, res) => {
  res.status(200).json({ message: 'Access granted', userId: req.user.id });
});

// Route that uses optional authentication
testRouter.get('/optional-auth', optionalAuth, (req, res) => {
  res.status(200).json({ 
    message: 'Access granted', 
    userId: req.user ? req.user.id : null,
    isAuthenticated: !!req.user
  });
});

// Route that requires ownership (mock resource ownership check)
const mockGetResourceOwnerId = async (req) => {
  // Mock: resource with ID 'user-resource' is owned by the authenticated user
  // resource with ID 'other-resource' is owned by someone else
  if (req.params.resourceId === 'user-resource') {
    return req.user.id;
  } else if (req.params.resourceId === 'other-resource') {
    return 'other-user-id';
  } else {
    return undefined; // Resource doesn't exist
  }
};

testRouter.get('/resource/:resourceId', authenticate, requireOwnership(mockGetResourceOwnerId), (req, res) => {
  res.status(200).json({ message: 'Resource access granted', resourceId: req.params.resourceId });
});

app.use('/test', testRouter);

describe('Authentication Middleware Tests', () => {
  let userAId, userAToken;
  let userBId, userBToken;
  let supabase;

  beforeAll(async () => {
    // Get Supabase client
    supabase = getSupabaseClient();

    // Create real test users using Supabase client directly
    const userAEmail = `user-a-${Date.now()}@example.com`;
    const userAPassword = 'password123';

    const userBEmail = `user-b-${Date.now()}@example.com`;
    const userBPassword = 'password123';

    // Sign up User A
    const { data: userAData, error: userAError } = await supabase.auth.signUp({
      email: userAEmail,
      password: userAPassword,
    });

    if (userAError) {
      throw new Error(`User A signup failed: ${userAError.message}`);
    }

    userAId = userAData.user.id;

    // If session is null (common in local dev), sign in to get token
    if (!userAData.session) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: userAEmail,
        password: userAPassword,
      });

      if (signInError) {
        throw new Error(`User A sign in failed: ${signInError.message}`);
      }

      userAToken = signInData.session.access_token;
    } else {
      userAToken = userAData.session.access_token;
    }

    // Sign up User B
    const { data: userBData, error: userBError } = await supabase.auth.signUp({
      email: userBEmail,
      password: userBPassword,
    });

    if (userBError) {
      throw new Error(`User B signup failed: ${userBError.message}`);
    }

    userBId = userBData.user.id;

    // If session is null (common in local dev), sign in to get token
    if (!userBData.session) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: userBEmail,
        password: userBPassword,
      });

      if (signInError) {
        throw new Error(`User B sign in failed: ${signInError.message}`);
      }

      userBToken = signInData.session.access_token;
    } else {
      userBToken = userBData.session.access_token;
    }

    if (!userAToken || !userBToken) {
      throw new Error('Failed to get valid tokens for test users');
    }
  });

  describe('authenticate Middleware', () => {
    it('should allow access with valid token', async () => {
      const response = await supertest(app)
        .get('/test/authenticated-only')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(response.body.message).toBe('Access granted');
      expect(response.body.userId).toBe(userAId);
    });

    it('should deny access without token (401 Unauthorized)', async () => {
      const response = await supertest(app)
        .get('/test/authenticated-only')
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Authentication required');
    });

    it('should deny access with invalid token (401 Unauthorized)', async () => {
      console.log('Testing invalid token...');
      const response = await supertest(app)
        .get('/test/authenticated-only')
        .set('Authorization', 'Bearer invalid-token');

      console.log('Response status:', response.status);
      console.log('Response body:', response.body);
      
      expect(response.status).toBe(401);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Authentication failed');
    });

    it('should deny access with malformed authorization header (401 Unauthorized)', async () => {
      const response = await supertest(app)
        .get('/test/authenticated-only')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Authentication failed');
    });
  });

  describe('optionalAuth Middleware', () => {
    it('should allow access and set req.user to null if no token is provided', async () => {
      const response = await supertest(app)
        .get('/test/optional-auth')
        .expect(200);

      expect(response.body.message).toBe('Access granted');
      expect(response.body.userId).toBeNull();
      expect(response.body.isAuthenticated).toBe(false);
    });

    it('should allow access and populate req.user if a valid token is provided', async () => {
      const response = await supertest(app)
        .get('/test/optional-auth')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(response.body.message).toBe('Access granted');
      expect(response.body.userId).toBe(userAId);
      expect(response.body.isAuthenticated).toBe(true);
    });

    it('should allow access and set req.user to null if an invalid token is provided', async () => {
      const response = await supertest(app)
        .get('/test/optional-auth')
        .set('Authorization', 'Bearer invalid-token')
        .expect(200);

      expect(response.body.message).toBe('Access granted');
      expect(response.body.userId).toBeNull();
      expect(response.body.isAuthenticated).toBe(false);
    });
  });

  describe('requireOwnership Middleware', () => {
    it('should allow access if the authenticated user owns the resource', async () => {
      const response = await supertest(app)
        .get('/test/resource/user-resource')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(response.body.message).toBe('Resource access granted');
      expect(response.body.resourceId).toBe('user-resource');
    });

    it('should deny access (403 Forbidden) if the authenticated user does not own the resource', async () => {
      const response = await supertest(app)
        .get('/test/resource/other-resource')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Authorization failed');
      expect(response.body.error).toBe('Resource access denied');
    });

    it('should deny access (401) if no token is provided (handled by authenticate)', async () => {
      const response = await supertest(app)
        .get('/test/resource/user-resource')
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Authentication required');
    });

    it('should deny access (403) if resource owner cannot be determined or resource does not exist', async () => {
      const response = await supertest(app)
        .get('/test/resource/nonexistent-resource')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Authorization failed');
      expect(response.body.error).toBe('Resource access denied');
    });
  });
}); 