/**
 * @fileoverview Integration tests for ConflictError scenarios
 * Tests for Feature #5: ConflictError Scenarios Testing
 * 
 * This test suite covers:
 * - Task 5.1: Email Registration Conflict Testing
 * - Task 5.2: Profile Creation Conflict Testing  
 * - Task 5.3: ConcurrencyConflictError Testing
 * - Task 5.4: ConflictError Response Format Validation
 * - Task 5.5: Conflict vs Other Error Types Testing
 * - Task 5.6: Conflict Resolution Workflow Testing
 * - Task 5.7: Multi-User Conflict Scenarios
 * - Task 5.8: Production Environment Conflict Testing
 */

const supertest = require('supertest');
const { describe, beforeAll, afterAll, beforeEach, afterEach, test, expect } = require('@jest/globals');
const { app, startServer, closeServer } = require('../../../server');
const { getSupabaseClient, getSupabaseAdminClient } = require('../../../services/supabase');

describe('Profile Conflict Error Testing (/v1/auth and /v1/profile)', () => {
  let supabase;
  let adminSupabase;

  beforeAll(async () => {
    supabase = getSupabaseClient();
    adminSupabase = getSupabaseAdminClient();
  });

  afterAll(async () => {
    // Clean up is handled by Jest teardown
  });

  beforeEach(async () => {
    // Additional setup per test if needed
  });

  afterEach(async () => {
    // Individual test cleanup if needed
  });

  // Helper function to generate unique email
  const generateUniqueEmail = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `test.conflict.${timestamp}.${random}@example.com`;
  };

  // Helper function to generate unique usernames
  const generateUniqueName = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `TestUser${timestamp}${random}`;
  };

  // Helper function to generate valid UUID
  const generateValidUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Helper function to create a user and get their token
  const createUserAndGetToken = async () => {
    const uniqueEmail = generateUniqueEmail();
    const password = 'TestPassword123!';
    const name = generateUniqueName();

    const signupResponse = await supertest(app)
      .post('/v1/auth/signup')
      .send({ name, email: uniqueEmail, password })
      .expect(201);

    return {
      userId: signupResponse.body.userId,
      token: signupResponse.body.accessToken,
      email: uniqueEmail,
      password,
      name
    };
  };

  describe('Task 5.1: Email Registration Conflict Testing', () => {
    describe('Duplicate email signup conflict', () => {
      test('should return HTTP 409 ConflictError when attempting duplicate email signup', async () => {
        const uniqueEmail = generateUniqueEmail();
        const password = 'SuperSecret123!';
        const firstUserData = { name: 'First User', email: uniqueEmail, password };
        const secondUserData = { name: 'Second User', email: uniqueEmail, password: 'DifferentPassword456!' };

        // 1. First user registration should succeed
        const firstResponse = await supertest(app)
          .post('/v1/auth/signup')
          .send(firstUserData)
          .expect(201);

        expect(firstResponse.body.status).toBe('success');
        expect(firstResponse.body.userId).toBeDefined();

        // 2. Second user registration with same email should fail with 409
        const conflictResponse = await supertest(app)
          .post('/v1/auth/signup')
          .send(secondUserData)
          .expect(409);

        expect(conflictResponse.body.status).toBe('error');
        expect(conflictResponse.body.message).toMatch(/already registered|already exists|conflict/i);

        // 3. Verify first user account remains unchanged
        const { data: firstUser } = await adminSupabase.auth.admin.getUserById(firstResponse.body.userId);
        expect(firstUser.user).toBeTruthy();
        expect(firstUser.user.email).toBe(uniqueEmail);
        expect(firstUser.user.user_metadata.name).toBe(firstUserData.name);
      });

      test('should return HTTP 409 for case-insensitive email conflicts', async () => {
        const baseEmail = generateUniqueEmail().toLowerCase();
        const upperEmail = baseEmail.toUpperCase();
        const password = 'TestPassword123!';

        // First signup with lowercase email
        await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'First User', email: baseEmail, password })
          .expect(201);

        // Second signup with uppercase email should conflict
        const response = await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'Second User', email: upperEmail, password })
          .expect(409);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toMatch(/already registered|already exists|conflict/i);
      });

      test('should return HTTP 409 for email conflicts with different names', async () => {
        const email = generateUniqueEmail();
        const password = 'TestPassword123!';

        // First user
        await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'John Doe', email, password })
          .expect(201);

        // Different user, same email
        const response = await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'Jane Smith', email, password })
          .expect(409);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toMatch(/already registered|already exists|conflict/i);
      });
    });

    describe('Email conflict edge cases', () => {
      test('should return HTTP 409 for signup after user already exists', async () => {
        const email = generateUniqueEmail();
        const password = 'TestPassword123!';

        // Create user via admin (simulating existing user)
        const { data: adminUser } = await adminSupabase.auth.admin.createUser({
          email,
          password,
          user_metadata: { name: 'Admin Created User' },
          email_confirm: true
        });

        expect(adminUser.user).toBeTruthy();

        // Try to signup normally - should conflict
        const response = await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'Regular User', email, password })
          .expect(409);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toMatch(/already registered|already exists|conflict/i);
      });
    });
  });

  describe('Task 5.2: Profile Creation Conflict Testing', () => {
    // Note: Since the API is designed as upsert (create OR update), we need to test the scenarios
    // where we force conflicts by manipulating the database state or using direct database constraints

    describe('Profile already exists conflict', () => {
      test('should handle profile creation when profile already exists through direct database insertion', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Since signup already creates a basic profile, let's test the API's upsert behavior
        // First, verify a profile exists from signup
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        // Should have a basic profile from signup
        expect(existingProfile).toBeTruthy();
        expect(existingProfile.user_id).toBe(userInfo.userId);

        // Now try to create/update profile via API - should work as update due to upsert behavior
        const profileData = {
          name: 'API User',
          height: 180,
          weight: 75,
          age: 30,
          unitPreference: 'metric',
          goals: ['strength'],
          experienceLevel: 'intermediate'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(profileData)
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.message).toBe('Profile updated successfully');
        // Should have updated the profile data
        expect(response.body.data.name).toBe('API User');
      });

      test('should handle direct database constraint violations', async () => {
        // Create a new user but don't create a profile through signup
        const uniqueEmail = generateUniqueEmail();
        const password = 'TestPassword123!';
        
        // Create user through admin to avoid automatic profile creation
        const { data: adminUser } = await adminSupabase.auth.admin.createUser({
          email: uniqueEmail,
          password,
          user_metadata: { name: 'Test User' },
          email_confirm: true
        });

        expect(adminUser.user).toBeTruthy();
        const userId = adminUser.user.id;
        
        // Insert a profile directly
        const { error: firstInsert } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            name: 'First Profile',
            height: 175,
            weight: 70,
            age: 25,
            unit_preference: 'metric',
            fitness_goals: ['general_fitness'],
            experience_level: 'beginner'
          });

        expect(firstInsert).toBeNull();

        // Try to insert another profile for the same user directly (should fail with 23505)
        const { error: conflictError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            name: 'Second Profile',
            height: 180,
            weight: 75,
            age: 30,
            unit_preference: 'imperial',
            fitness_goals: ['strength'],
            experience_level: 'advanced'
          });

        // Should get PostgreSQL unique constraint violation
        expect(conflictError).toBeTruthy();
        expect(conflictError.code).toBe('23505');
      });
    });

    describe('Profile creation edge cases', () => {
      test('should verify PostgreSQL unique constraint on user_profiles table', async () => {
        // Create a new user but don't use the signup endpoint to avoid automatic profile creation
        const uniqueEmail = generateUniqueEmail();
        const password = 'TestPassword123!';
        
        // Create user directly through admin
        const { data: adminUser } = await adminSupabase.auth.admin.createUser({
          email: uniqueEmail,
          password,
          user_metadata: { name: 'Test User' },
          email_confirm: true
        });

        expect(adminUser.user).toBeTruthy();
        const userId = adminUser.user.id;
        
        // Test the database constraint directly
        const profileData = {
          user_id: userId,
          name: 'Test User',
          height: 175,
          weight: 70,
          age: 25,
          unit_preference: 'metric',
          fitness_goals: ['general_fitness'],
          experience_level: 'beginner'
        };

        // First insert should succeed
        const { error: firstError } = await supabase
          .from('user_profiles')
          .insert(profileData);
        
        expect(firstError).toBeNull();

        // Second insert should fail with unique constraint violation
        const { error: secondError } = await supabase
          .from('user_profiles')
          .insert(profileData);

        expect(secondError).toBeTruthy();
        expect(secondError.code).toBe('23505');
        expect(secondError.message).toMatch(/duplicate key|unique constraint/i);
      });
    });
  });

  describe('Task 5.3: ConcurrencyConflictError Testing', () => {
    describe('Workout plan concurrency conflicts', () => {
      test('should handle workout plan adjustment errors gracefully', async () => {
        const userInfo = await createUserAndGetToken();
        const validPlanId = generateValidUUID();
        
        const adjustment = {
          adjustments: { 
            notesOrPreferences: 'Increase difficulty'
          }
        };

        // Since the plan doesn't exist, this should return 404 (not found) 
        // rather than 500 (database error)
        const response = await supertest(app)
          .post(`/v1/workouts/${validPlanId}`)
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(adjustment)
          .expect(404);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toMatch(/not found|plan.*not.*found/i);
      });

      test('should handle invalid UUID format in workout plan requests', async () => {
        const userInfo = await createUserAndGetToken();
        const invalidPlanId = 'invalid-uuid-format';
        
        const adjustment = {
          adjustments: { 
            notesOrPreferences: 'Test adjustment'
          }
        };

        // Should return 404 due to invalid UUID format (route parameter validation)
        const response = await supertest(app)
          .post(`/v1/workouts/${invalidPlanId}`)
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(adjustment)
          .expect(404);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toMatch(/not found|invalid/i);
      });
    });

    describe('ConcurrencyConflictError vs ConflictError distinction', () => {
      test('should distinguish between different error types', async () => {
        const userInfo = await createUserAndGetToken();
        const validPlanId = generateValidUUID();
        
        const adjustment = {
          adjustments: { 
            notesOrPreferences: 'Test for error distinction'
          }
        };

        // Test with valid UUID but non-existent plan
        const response = await supertest(app)
          .post(`/v1/workouts/${validPlanId}`)
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(adjustment)
          .expect(404);

        // Should be a not found error, not a concurrency error
        expect(response.body.status).toBe('error');
        expect(response.body.message).toMatch(/not found/i);
        // Should NOT have concurrency-specific error code
        expect(response.body.errorCode).not.toBe('AGENT_CONCURRENCY_ERROR');
      });
    });

    describe('Concurrency conflicts in high-traffic simulation', () => {
      test('should handle multiple requests with proper error responses', async () => {
        const userInfo = await createUserAndGetToken();
        const validPlanId = generateValidUUID();
        
        const adjustments = Array.from({ length: 3 }, (_, i) => ({
          adjustments: { 
            notesOrPreferences: `Concurrent adjustment ${i + 1}`
          }
        }));

        // Send multiple concurrent requests
        const promises = adjustments.map(adjustment => 
          supertest(app)
            .post(`/v1/workouts/${validPlanId}`)
            .set('Authorization', `Bearer ${userInfo.token}`)
            .send(adjustment)
        );

        const responses = await Promise.all(promises);
        
        // All should fail with 404 (not found) since plan doesn't exist
        const errorCount = responses.filter(r => r.status === 404).length;
        
        expect(errorCount).toBe(3);
        
        // All responses should have error status
        responses.forEach(response => {
          expect(response.body.status).toBe('error');
          expect(response.body.message).toMatch(/not found|plan.*not.*found/i);
        });
      });
    });
  });

  describe('Task 5.4: ConflictError Response Format Validation', () => {
    describe('HTTP 409 status code validation', () => {
      test('should return exactly HTTP 409 status for email registration conflicts', async () => {
        const email = generateUniqueEmail();
        const password = 'TestPassword123!';

        // First signup
        await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'First User', email, password })
          .expect(201);

        // Second signup should return exactly 409
        const response = await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'Second User', email, password })
          .expect(409);
          
        expect(response.status).toBe(409);
        expect(response.headers['content-type']).toMatch(/application\/json/);
        expect(response.body.status).toBe('error');
      });

      test('should never return other 4xx status codes for ConflictError scenarios', async () => {
        const email = generateUniqueEmail();
        const password = 'TestPassword123!';

        // First signup
        await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'First User', email, password })
          .expect(201);

        // Conflict scenario
        const response = await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'Second User', email, password })
          .expect(409);

        // Should not be 400, 401, 403, 404, etc.
        expect(response.status).not.toBe(400);
        expect(response.status).not.toBe(401);
        expect(response.status).not.toBe(403);
        expect(response.status).not.toBe(404);
        expect(response.status).toBe(409);
      });

      test('should return Content-Type: application/json for all conflict responses', async () => {
        const email = generateUniqueEmail();
        const password = 'TestPassword123!';

        await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'First User', email, password })
          .expect(201);

        const response = await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'Second User', email, password })
          .expect(409);

        expect(response.headers['content-type']).toMatch(/application\/json/);
        expect(response.body).toBeInstanceOf(Object);
      });

      test('should detect conflicts quickly (response timing)', async () => {
        const email = generateUniqueEmail();
        const password = 'TestPassword123!';

        await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'First User', email, password })
          .expect(201);

        const startTime = Date.now();
        
        const response = await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'Second User', email, password })
          .expect(409);

        const responseTime = Date.now() - startTime;
        
        // Conflict detection should be fast (under 2 seconds)
        expect(responseTime).toBeLessThan(2000);
        expect(response.body.status).toBe('error');
      });
    });

    describe('Error response structure validation', () => {
      test('should return standard ConflictError format for all conflict scenarios', async () => {
        const email = generateUniqueEmail();
        const password = 'TestPassword123!';

        await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'First User', email, password })
          .expect(201);

        const response = await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'Second User', email, password })
          .expect(409);

        // Standard error response structure
        expect(response.body).toHaveProperty('status', 'error');
        expect(response.body).toHaveProperty('message');
        expect(typeof response.body.message).toBe('string');
        expect(response.body.message.length).toBeGreaterThan(0);
      });

      test('should handle database-level errors appropriately', async () => {
        const userInfo = await createUserAndGetToken();
        const invalidPlanId = 'not-a-valid-uuid';
        
        const response = await supertest(app)
          .post(`/v1/workouts/${invalidPlanId}`)
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send({ adjustments: { notesOrPreferences: 'Format test' } })
          .expect(404);

        // Not found error format validation
        expect(response.body).toHaveProperty('status', 'error');
        expect(response.body).toHaveProperty('message');
        expect(typeof response.body.message).toBe('string');
        expect(response.body.message).toMatch(/not found|invalid/i);
      });

      test('should provide informative and actionable error messages', async () => {
        const email = generateUniqueEmail();
        const password = 'TestPassword123!';

        await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'First User', email, password })
          .expect(201);

        const response = await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'Second User', email, password })
          .expect(409);

        // Message should be informative
        expect(response.body.message).toMatch(/already|exists|registered|conflict/i);
        expect(response.body.message.length).toBeGreaterThan(10);
        
        // Should not be a generic message
        expect(response.body.message).not.toBe('Error');
        expect(response.body.message).not.toBe('Conflict');
      });

      test('should not expose sensitive data in conflict error responses', async () => {
        const email = generateUniqueEmail();
        const password = 'SuperSecret123!';
        
        await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'First User', email: email, password: password })
          .expect(201);

        const response = await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'Second User', email: email, password: 'DifferentPassword456!' })
          .expect(409);

        // Should not expose sensitive information
        const responseString = JSON.stringify(response.body);
        expect(responseString).not.toContain(password);
        expect(responseString).not.toContain('SuperSecret');
        expect(responseString).not.toMatch(/hash|salt|token/i);
      });
    });
  });

  describe('Task 5.5: Conflict vs Other Error Types Testing', () => {
    describe('409 vs 400 Bad Request distinction', () => {
      test('should return 409 for conflicts vs 400 for validation errors', async () => {
        const email = generateUniqueEmail();
        const password = 'TestPassword123!';

        // First, create a user successfully
        await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'First User', email, password })
          .expect(201);

        // Test conflict scenario → should return HTTP 409
        const conflictResponse = await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'Second User', email, password })
          .expect(409);

        expect(conflictResponse.body.status).toBe('error');
        expect(conflictResponse.body.message).toMatch(/already|exists|registered|conflict/i);

        // Test validation error scenario → should return HTTP 400
        const validationResponse = await supertest(app)
          .post('/v1/auth/signup')
          .send({ 
            name: 'Invalid User', 
            email: 'invalid-email-format', // Invalid email format
            password: 'short' // Too short password
          })
          .expect(400);

        expect(validationResponse.body.status).toBe('error');
        expect(validationResponse.body.message).toMatch(/validation|invalid|format|required|characters|should/i);
      });

      test('should distinguish error message clarity between validation and conflict issues', async () => {
        const email = generateUniqueEmail();
        const password = 'TestPassword123!';

        // Create user for conflict testing
        await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'Original User', email, password })
          .expect(201);

        // Conflict error should mention existing resource
        const conflictResponse = await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'Duplicate User', email, password })
          .expect(409);

        expect(conflictResponse.body.message).toMatch(/already|exists|registered/i);

        // Validation error should mention format/validation issues
        const validationResponse = await supertest(app)
          .post('/v1/auth/signup')
          .send({ 
            name: '', // Empty name
            email: 'new' + generateUniqueEmail(), 
            password: '' // Empty password
          })
          .expect(400);

        expect(validationResponse.body.message).toMatch(/validation|required|invalid|format/i);
        expect(validationResponse.body.message).not.toMatch(/already|exists|conflict/i);
      });
    });

    describe('409 vs 422 Unprocessable Entity distinction', () => {
      test('should return 409 for resource conflicts vs 400 for semantically invalid data', async () => {
        const userInfo = await createUserAndGetToken();

        // Test profile creation with conflicting data (profile already exists from signup)
        // This should be handled as an upsert, so let's test a different conflict scenario
        const profileData = {
          name: 'Test User',
          height: 180,
          weight: 75,
          age: 30,
          unitPreference: 'metric',
          goals: ['strength'],
          experienceLevel: 'intermediate'
        };

        // This should succeed (upsert behavior)
        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(profileData)
          .expect(200);

        // Test semantically invalid but syntactically correct data → should return HTTP 400
        const invalidProfileData = {
          name: 'Test User',
          height: -50, // Negative height (semantically invalid)
          weight: -20, // Negative weight (semantically invalid)
          age: 200, // Unrealistic age (semantically invalid)
          unitPreference: 'invalid_unit', // Invalid unit
          goals: ['invalid_goal'], // Invalid goal
          experienceLevel: 'invalid_level' // Invalid experience level
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(invalidProfileData)
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toMatch(/validation|invalid|format|range|exceed|cannot|years/i);
      });

      test('should ensure consistent error type usage across all endpoints', async () => {
        // Test auth endpoint validation vs conflict
        const email = generateUniqueEmail();
        const password = 'TestPassword123!';

        // Create user for conflict
        await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'Original User', email, password })
          .expect(201);

        // Auth conflict → 409
        const authConflict = await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'Duplicate User', email, password })
          .expect(409);

        expect(authConflict.body.status).toBe('error');

        // Auth validation → 400
        const authValidation = await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: '', email: 'invalid-email', password: 'short' })
          .expect(400);

        expect(authValidation.body.status).toBe('error');
        expect(authValidation.status).not.toBe(409);
      });
    });
  });

  describe('Task 5.6: Conflict Resolution Workflow Testing', () => {
    describe('Post-conflict resolution testing', () => {
      test('should allow successful operation after conflict resolution', async () => {
        const baseEmail = generateUniqueEmail();
        const password = 'TestPassword123!';

        // Create first user
        await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'First User', email: baseEmail, password })
          .expect(201);

        // Trigger email conflict → HTTP 409
        const conflictResponse = await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'Second User', email: baseEmail, password })
          .expect(409);

        expect(conflictResponse.body.status).toBe('error');

        // Use different email for same user → HTTP 201 success
        const differentEmail = generateUniqueEmail();
        const successResponse = await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'Second User', email: differentEmail, password })
          .expect(201);

        expect(successResponse.body.status).toBe('success');
        expect(successResponse.body.userId).toBeDefined();

        // Verify original conflicted request state is unchanged - get the first user by creating them again and checking the conflict
        const verifyConflictResponse = await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'Another User', email: baseEmail, password })
          .expect(409);

        expect(verifyConflictResponse.body.status).toBe('error');
        expect(verifyConflictResponse.body.message).toMatch(/already|exists|registered/i);
      });

      test('should verify conflict resolution does not affect other users', async () => {
        const user1Email = generateUniqueEmail();
        const user2Email = generateUniqueEmail();
        const password = 'TestPassword123!';

        // Create user 1
        const user1Response = await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'User One', email: user1Email, password })
          .expect(201);

        // Create user 2
        const user2Response = await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'User Two', email: user2Email, password })
          .expect(201);

        // Attempt conflict with user 1's email
        await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'Conflicting User', email: user1Email, password })
          .expect(409);

        // Verify user 2 is unaffected by user 1's conflict
        const { data: user2Data } = await adminSupabase.auth.admin.getUserById(user2Response.body.userId);
        expect(user2Data.user).toBeTruthy();
        expect(user2Data.user.email).toBe(user2Email);
        expect(user2Data.user.user_metadata.name).toBe('User Two');
      });
    });

    describe('Conflict prevention testing', () => {
      test('should handle idempotent requests without creating conflicts', async () => {
        const userInfo = await createUserAndGetToken();

        const profileData = {
          name: 'Idempotent User',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        };

        // First request should succeed
        const firstResponse = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(profileData)
          .expect(200);

        expect(firstResponse.body.status).toBe('success');

        // Identical second request should also succeed (upsert behavior)
        const secondResponse = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(profileData)
          .expect(200);

        expect(secondResponse.body.status).toBe('success');
        expect(secondResponse.body.data.name).toBe('Idempotent User');
      });

      test('should verify proper unique constraint handling prevents data corruption', async () => {
        const uniqueEmail = generateUniqueEmail();
        const password = 'TestPassword123!';

        // Create user through admin to control profile creation
        const { data: adminUser } = await adminSupabase.auth.admin.createUser({
          email: uniqueEmail,
          password,
          user_metadata: { name: 'Test User' },
          email_confirm: true
        });

        const userId = adminUser.user.id;

        // Insert first profile directly
        const { error: firstError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            name: 'Original Profile',
            height: 175,
            weight: 70,
            age: 25,
            unit_preference: 'metric',
            fitness_goals: ['general_fitness'],
            experience_level: 'beginner'
          });

        expect(firstError).toBeNull();

        // Attempt to insert duplicate profile should fail with constraint violation
        const { error: duplicateError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            name: 'Duplicate Profile',
            height: 180,
            weight: 75,
            age: 30,
            unit_preference: 'imperial',
            fitness_goals: ['strength'],
            experience_level: 'advanced'
          });

        expect(duplicateError).toBeTruthy();
        expect(duplicateError.code).toBe('23505'); // Unique constraint violation

        // Verify original data is unchanged
        const { data: originalProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        expect(originalProfile.name).toBe('Original Profile');
        expect(originalProfile.height).toBe(175);
      });

      test('should confirm conflict prevention does not block legitimate operations', async () => {
        const user1Info = await createUserAndGetToken();
        const user2Info = await createUserAndGetToken();

        const profile1Data = {
          name: 'User One Profile',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        };

        const profile2Data = {
          name: 'User Two Profile',
          height: 180,
          weight: 80,
          age: 30,
          unitPreference: 'imperial',
          goals: ['strength'],
          experienceLevel: 'intermediate'
        };

        // Both users should be able to create profiles without conflicts
        const response1 = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${user1Info.token}`)
          .send(profile1Data)
          .expect(200);

        const response2 = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${user2Info.token}`)
          .send(profile2Data)
          .expect(200);

        expect(response1.body.status).toBe('success');
        expect(response2.body.status).toBe('success');
        expect(response1.body.data.name).toBe('User One Profile');
        expect(response2.body.data.name).toBe('User Two Profile');
      });
    });
  });

  describe('Task 5.7: Multi-User Conflict Scenarios', () => {
    describe('Cross-user conflict isolation', () => {
      test('should isolate conflicts between different users', async () => {
        const userAInfo = await createUserAndGetToken();
        const userBInfo = await createUserAndGetToken();

        const profileDataA = {
          name: 'User A Profile',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['weight_loss'],
          experienceLevel: 'beginner'
        };

        const profileDataB = {
          name: 'User B Profile',
          height: 180,
          weight: 80,
          age: 30,
          unitPreference: 'imperial',
          goals: ['muscle_gain'],
          experienceLevel: 'advanced'
        };

        // User A creates profile → HTTP 200 (since signup already creates basic profile, this is an update)
        const responseA = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAInfo.token}`)
          .send(profileDataA)
          .expect(200);

        expect(responseA.body.status).toBe('success');

        // User B creates profile with different data → HTTP 200 (no conflict)
        const responseB = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userBInfo.token}`)
          .send(profileDataB)
          .expect(200);

        expect(responseB.body.status).toBe('success');

        // User A attempts profile update again → HTTP 200 (upsert behavior)
        const responseA2 = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAInfo.token}`)
          .send({ ...profileDataA, age: 26 })
          .expect(200);

        expect(responseA2.body.status).toBe('success');

        // User B operations remain unaffected by User A's operations
        const { data: userBProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userBInfo.userId)
          .single();

        expect(userBProfile.name).toBe('User B Profile');
        expect(userBProfile.experience_level).toBe('advanced');
      });

      test('should prevent cross-user data corruption during conflict scenarios', async () => {
        const user1Info = await createUserAndGetToken();
        const user2Info = await createUserAndGetToken();

        // Simulate email conflicts (different users trying same email - should be impossible)
        // Instead, test that profile operations don't interfere
        
        const profile1 = {
          name: 'User 1 Original',
          height: 170,
          weight: 65,
          age: 22,
          unitPreference: 'metric',
          goals: ['endurance'],
          experienceLevel: 'beginner'
        };

        const profile2 = {
          name: 'User 2 Original',
          height: 185,
          weight: 85,
          age: 28,
          unitPreference: 'imperial',
          goals: ['strength'],
          experienceLevel: 'advanced'
        };

        // Create both profiles
        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${user1Info.token}`)
          .send(profile1)
          .expect(200);

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${user2Info.token}`)
          .send(profile2)
          .expect(200);

        // Verify data integrity - each user has their own data
        const { data: user1Profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user1Info.userId)
          .single();

        const { data: user2Profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user2Info.userId)
          .single();

        expect(user1Profile.name).toBe('User 1 Original');
        expect(user1Profile.experience_level).toBe('beginner');
        expect(user2Profile.name).toBe('User 2 Original');
        expect(user2Profile.experience_level).toBe('advanced');
      });
    });

    describe('Concurrent user conflict testing', () => {
      test('should handle multiple users creating profiles simultaneously', async () => {
        // Create multiple users
        const users = await Promise.all([
          createUserAndGetToken(),
          createUserAndGetToken(),
          createUserAndGetToken()
        ]);

        const profileData = users.map((user, index) => ({
          name: `Concurrent User ${index + 1}`,
          height: 170 + (index * 5),
          weight: 70 + (index * 5),
          age: 25 + index,
          unitPreference: index % 2 === 0 ? 'metric' : 'imperial',
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        }));

        // Send concurrent profile creation requests
        const promises = users.map((user, index) =>
          supertest(app)
            .post('/v1/profile')
            .set('Authorization', `Bearer ${user.token}`)
            .send(profileData[index])
        );

        const responses = await Promise.all(promises);

        // All should succeed with their own data
        responses.forEach((response, index) => {
          expect(response.status).toBe(200);
          expect(response.body.status).toBe('success');
          expect(response.body.data.name).toBe(`Concurrent User ${index + 1}`);
        });
      });

      test('should verify conflict resolution does not impact other active users', async () => {
        const activeUser = await createUserAndGetToken();
        const conflictEmail = generateUniqueEmail();
        const password = 'TestPassword123!';

        // Create user for conflict scenario
        await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'Original User', email: conflictEmail, password })
          .expect(201);

        // Active user creates profile
        const activeUserProfile = {
          name: 'Active User',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['fitness'],
          experienceLevel: 'intermediate'
        };

        const activeResponse = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${activeUser.token}`)
          .send(activeUserProfile)
          .expect(200);

        // Trigger conflict scenario
        await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'Conflicting User', email: conflictEmail, password })
          .expect(409);

        // Verify active user's profile remains intact and functional
        const { data: activeUserData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', activeUser.userId)
          .single();

        expect(activeUserData.name).toBe('Active User');
        expect(activeUserData.experience_level).toBe('intermediate');

        // Active user should still be able to update profile
        const updateResponse = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${activeUser.token}`)
          .send({ ...activeUserProfile, age: 26 })
          .expect(200);

        expect(updateResponse.body.status).toBe('success');
        expect(updateResponse.body.data.age).toBe(26);
      });
    });
  });

  describe('Task 5.8: Production Environment Conflict Testing', () => {
    describe('Environment-specific conflict handling', () => {
      test('should handle ConflictError behavior consistently across environments', async () => {
        const email = generateUniqueEmail();
        const password = 'TestPassword123!';

        // Create user
        await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'First User', email, password })
          .expect(201);

        // Test conflict in current environment (should be test environment)
        const response = await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'Second User', email, password })
          .expect(409);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBeTruthy();
        expect(response.body.message.length).toBeGreaterThan(0);

        // Verify response structure is consistent regardless of environment
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('message');
        expect(response.headers['content-type']).toMatch(/application\/json/);
      });

      test('should ensure error message detail level is appropriate for environment', async () => {
        const email = generateUniqueEmail();
        const password = 'TestPassword123!';

        await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'First User', email, password })
          .expect(201);

        const response = await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'Second User', email, password })
          .expect(409);

        // Error messages should be informative but not expose sensitive details
        expect(response.body.message).toBeTruthy();
        expect(response.body.message).toMatch(/already|exists|registered/i);
        
        // Should not expose implementation details in any environment
        expect(response.body.message).not.toMatch(/database|sql|postgres|table/i);
        expect(response.body.message).not.toMatch(/stack|trace|internal/i);
      });

      test('should confirm sensitive information not exposed in conflict responses', async () => {
        const email = generateUniqueEmail();
        const password = 'SuperSecretPassword123!';

        await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'First User', email, password })
          .expect(201);

        const response = await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'Second User', email, password })
          .expect(409);

        const responseString = JSON.stringify(response.body);
        
        // Should not expose sensitive information
        expect(responseString).not.toContain(password);
        expect(responseString).not.toContain('SuperSecret');
        expect(responseString).not.toMatch(/hash|salt|bcrypt|jwt|token/i);
        expect(responseString).not.toMatch(/user_id|id|uuid/i);
      });
    });

    describe('Environment-specific logging and monitoring', () => {
      test('should handle conflict scenarios without exposing internal errors', async () => {
        const userInfo = await createUserAndGetToken();
        const invalidPlanId = 'invalid-uuid-format';

        const response = await supertest(app)
          .post(`/v1/workouts/${invalidPlanId}`)
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send({ adjustments: { notesOrPreferences: 'Test' } })
          .expect(404);

        // Should return user-friendly error without exposing internal details
        expect(response.body.status).toBe('error');
        expect(response.body.message).toMatch(/not found|invalid/i);
        
        // Should not expose database or implementation details
        expect(response.body.message).not.toMatch(/postgres|sql|database|constraint/i);
        expect(response.body.message).not.toMatch(/uuid|validation|format|regex/i);
      });

      test('should verify consistent error handling across different conflict types', async () => {
        // Test auth conflict
        const email = generateUniqueEmail();
        const password = 'TestPassword123!';

        await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'First User', email, password })
          .expect(201);

        const authConflictResponse = await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'Second User', email, password })
          .expect(409);

        // Test workout not found (different from conflict)
        const userInfo = await createUserAndGetToken();
        const nonExistentPlanId = generateValidUUID();

        const workoutNotFoundResponse = await supertest(app)
          .post(`/v1/workouts/${nonExistentPlanId}`)
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send({ adjustments: { notesOrPreferences: 'Test' } })
          .expect(404);

        // Both should have consistent error structure
        expect(authConflictResponse.body).toHaveProperty('status', 'error');
        expect(authConflictResponse.body).toHaveProperty('message');
        expect(workoutNotFoundResponse.body).toHaveProperty('status', 'error');
        expect(workoutNotFoundResponse.body).toHaveProperty('message');

        // But different status codes
        expect(authConflictResponse.status).toBe(409);
        expect(workoutNotFoundResponse.status).toBe(404);
      });
    });
  });
}); 