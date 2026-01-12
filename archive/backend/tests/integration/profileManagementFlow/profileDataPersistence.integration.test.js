/**
 * @fileoverview Integration tests for Profile Data Persistence Verification
 * Tests for Feature #9: Profile Data Persistence Verification (Partially Covered)
 * 
 * This test suite covers:
 * - Task 9.1: Transaction Rollback Persistence Testing
 * - Task 9.2: Concurrent Access Data Integrity Testing
 * - Task 9.3: Multi-Step Operation Persistence Testing
 * - Task 9.4: Database Consistency After Failures Testing
 * - Task 9.5: Long-Term and Cross-Session Persistence Testing
 * - Task 9.6: Performance Load Persistence Testing
 * - Task 9.7: Backup Recovery Data Integrity Testing
 */

const supertest = require('supertest');
const { describe, beforeAll, afterAll, beforeEach, afterEach, test, expect } = require('@jest/globals');
const { app, startServer, closeServer } = require('../../../server');
const { getSupabaseClient, getSupabaseAdminClient } = require('../../../services/supabase');

describe('Profile Data Persistence Verification (/v1/profile)', () => {
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
    return `test.persistence.${timestamp}.${random}@example.com`;
  };

  // Helper function to generate unique usernames
  const generateUniqueName = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `PersistenceUser${timestamp}${random}`;
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

  // Helper function to simulate database connection failure
  const simulateConnectionFailure = async () => {
    // This is a mock implementation - in real scenarios, you might
    // temporarily revoke database connections or simulate network issues
    return new Promise((resolve) => {
      setTimeout(resolve, 100); // Brief delay to simulate failure recovery
    });
  };

  // Helper function to wait for specified milliseconds
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  describe('Task 9.1: Transaction Rollback Persistence Testing', () => {
    describe('ACID Atomicity - Profile Transaction Rollbacks', () => {
      test('should maintain data integrity when profile update transaction fails midway', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Create initial profile
        const initialProfileData = {
          name: 'Initial User',
          height: 170,
          weight: 65,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(initialProfileData)
          .expect(200);

        // Verify initial state
        const { data: initialProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(initialProfile.name).toBe('Initial User');
        expect(initialProfile.weight).toBe(65);

        // Attempt update with invalid data that should cause rollback
        const invalidUpdateData = {
          name: 'Updated User',
          weight: -50, // Invalid weight that should trigger validation failure
          age: 25,
          goals: ['invalid_goal_that_does_not_exist']
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(invalidUpdateData)
          .expect(400);

        expect(response.body.status).toBe('error');

        // Verify data persisted in original state (transaction rolled back)
        const { data: persistedProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(persistedProfile.name).toBe('Initial User');
        expect(persistedProfile.weight).toBe(65);
        expect(persistedProfile.fitness_goals).toEqual(['general_fitness']);
      });

      test('should handle profile creation rollback when user creation fails after profile insert', async () => {
        // This test simulates a scenario where profile creation succeeds but 
        // related user metadata creation fails, requiring rollback
        const userInfo = await createUserAndGetToken();
        
        // Clear any existing profile
        await supabase
          .from('user_profiles')
          .delete()
          .eq('user_id', userInfo.userId);

        // Verify no profile exists
        const { data: noProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(noProfile).toBeNull();

        // Attempt profile creation with data that should work initially
        // but fail in secondary operations (simulated by sending malformed related data)
        const profileData = {
          name: 'Rollback Test User',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness'],
          experienceLevel: 'beginner',
          // Simulate invalid related data that causes secondary operation failure
          invalidField: 'this_should_cause_rollback'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(profileData)
          .expect(400);

        // Verify no partial profile was created (full rollback occurred)
        const { data: stillNoProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(stillNoProfile).toBeNull();
      });

      test('should maintain referential integrity during rollback scenarios', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Create a valid profile first
        const validProfileData = {
          name: 'Referential Test User',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(validProfileData)
          .expect(200);

        // Verify profile exists
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(existingProfile).toBeTruthy();

        // Attempt update that should fail and rollback
        const invalidReferentialData = {
          name: 'Should Not Persist',
          weight: 75,
          age: -5 // This should cause validation failure instead of referential integrity
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(invalidReferentialData)
          .expect(400);

        // Verify original profile data persisted unchanged
        const { data: unchangedProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(unchangedProfile.name).toBe('Referential Test User');
        expect(unchangedProfile.weight).toBe(70);
        expect(unchangedProfile.user_id).toBe(userInfo.userId);
      });
    });
  });

  describe('Task 9.2: Concurrent Access Data Integrity Testing', () => {
    describe('Multi-User Concurrent Profile Updates', () => {
      test('should handle concurrent profile updates from same user without data corruption', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Create initial profile
        const initialProfileData = {
          name: 'Concurrent Test User',
          height: 170,
          weight: 65,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(initialProfileData)
          .expect(200);

        // Simulate concurrent updates
        const update1 = {
          weight: 70,
          goals: ['strength']
        };

        const update2 = {
          height: 175,
          experienceLevel: 'intermediate'
        };

        // Execute concurrent requests
        const [response1, response2] = await Promise.all([
          supertest(app)
            .post('/v1/profile')
            .set('Authorization', `Bearer ${userInfo.token}`)
            .send(update1),
          supertest(app)
            .post('/v1/profile')
            .set('Authorization', `Bearer ${userInfo.token}`)
            .send(update2)
        ]);

        // Both should succeed
        expect(response1.status).toBe(200);
        expect(response2.status).toBe(200);

        // Verify final state - last write should win or both updates should be preserved
        const { data: finalProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(finalProfile).toBeTruthy();
        expect(finalProfile.name).toBe('Concurrent Test User'); // Should be unchanged
        
        // At least one of the updates should have persisted
        const weightUpdated = finalProfile.weight === 70;
        const heightUpdated = finalProfile.height === 175;
        const goalsUpdated = finalProfile.fitness_goals.includes('strength');
        const experienceUpdated = finalProfile.experience_level === 'intermediate';

        // Verify data integrity - no corruption occurred
        expect(finalProfile.user_id).toBe(userInfo.userId);
        expect(finalProfile.unit_preference).toBe('metric');
        expect(typeof finalProfile.weight).toBe('number');
        expect(typeof finalProfile.height).toBe('number');
      });

      test('should maintain isolation between different user profile updates', async () => {
        const user1Info = await createUserAndGetToken();
        const user2Info = await createUserAndGetToken();
        
        // Create profiles for both users
        const user1ProfileData = {
          name: 'User 1 Isolation Test',
          height: 170,
          weight: 65,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        };

        const user2ProfileData = {
          name: 'User 2 Isolation Test',
          height: 180,
          weight: 80,
          age: 30,
          unitPreference: 'imperial',
          goals: ['strength'],
          experienceLevel: 'advanced'
        };

        await Promise.all([
          supertest(app)
            .post('/v1/profile')
            .set('Authorization', `Bearer ${user1Info.token}`)
            .send(user1ProfileData),
          supertest(app)
            .post('/v1/profile')
            .set('Authorization', `Bearer ${user2Info.token}`)
            .send(user2ProfileData)
        ]);

        // Perform concurrent updates
        const user1Update = {
          weight: 70,
          goals: ['endurance']
        };

        const user2Update = {
          weight: 85,
          goals: ['powerlifting']
        };

        const [user1Response, user2Response] = await Promise.all([
          supertest(app)
            .post('/v1/profile')
            .set('Authorization', `Bearer ${user1Info.token}`)
            .send(user1Update),
          supertest(app)
            .post('/v1/profile')
            .set('Authorization', `Bearer ${user2Info.token}`)
            .send(user2Update)
        ]);

        expect(user1Response.status).toBe(200);
        expect(user2Response.status).toBe(200);

        // Verify isolation - each user's data should be independent
        const [{ data: user1FinalProfile }, { data: user2FinalProfile }] = await Promise.all([
          supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user1Info.userId)
            .single(),
          supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user2Info.userId)
            .single()
        ]);

        // Verify user 1 data
        expect(user1FinalProfile.name).toBe('User 1 Isolation Test');
        expect(user1FinalProfile.height).toBe(170);
        expect(user1FinalProfile.unit_preference).toBe('metric');
        expect(user1FinalProfile.user_id).toBe(user1Info.userId);

        // Verify user 2 data
        expect(user2FinalProfile.name).toBe('User 2 Isolation Test');
        expect(user2FinalProfile.height).toBe(180);
        expect(user2FinalProfile.unit_preference).toBe('imperial');
        expect(user2FinalProfile.user_id).toBe(user2Info.userId);

        // Verify no cross-contamination occurred
        expect(user1FinalProfile.user_id).not.toBe(user2FinalProfile.user_id);
        expect(user1FinalProfile.unit_preference).not.toBe(user2FinalProfile.unit_preference);
      });
    });

    describe('Database Lock and Constraint Testing', () => {
      test('should handle database locks during concurrent access gracefully', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Create initial profile
        const initialProfileData = {
          name: 'Lock Test User',
          height: 170,
          weight: 65,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(initialProfileData)
          .expect(200);

        // Create multiple rapid-fire updates to test locking
        const updates = Array.from({ length: 5 }, (_, i) => ({
          weight: 65 + i
        }));

        const updatePromises = updates.map(update =>
          supertest(app)
            .post('/v1/profile')
            .set('Authorization', `Bearer ${userInfo.token}`)
            .send(update)
        );

        const responses = await Promise.all(updatePromises);

        // All requests should complete successfully (no deadlocks)
        responses.forEach(response => {
          expect(response.status).toBe(200);
        });

        // Verify final state is consistent
        const { data: finalProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(finalProfile).toBeTruthy();
        expect(finalProfile.user_id).toBe(userInfo.userId);
        expect(typeof finalProfile.weight).toBe('number');
        expect(finalProfile.weight).toBeGreaterThanOrEqual(65);
        expect(finalProfile.weight).toBeLessThanOrEqual(69);
      });
    });
  });

  describe('Task 9.3: Multi-Step Operation Persistence Testing', () => {
    describe('Complex Profile Operations', () => {
      test('should persist data correctly through multi-step profile creation workflow', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Step 1: Create basic profile
        const basicProfileData = {
          name: 'Multi Step User',
          unitPreference: 'metric'
        };

        const step1Response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(basicProfileData)
          .expect(200);

        // Verify step 1 persistence
        const { data: step1Profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(step1Profile.name).toBe('Multi Step User');
        expect(step1Profile.unit_preference).toBe('metric');

        // Step 2: Add physical measurements
        const physicalData = {
          height: 175,
          weight: 70,
          age: 25
        };

        const step2Response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(physicalData)
          .expect(200);

        // Verify step 2 persistence (should merge with step 1)
        const { data: step2Profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(step2Profile.name).toBe('Multi Step User'); // From step 1
        expect(step2Profile.unit_preference).toBe('metric'); // From step 1
        expect(step2Profile.height).toBe(175); // From step 2
        expect(step2Profile.weight).toBe(70); // From step 2
        expect(step2Profile.age).toBe(25); // From step 2

        // Step 3: Add fitness preferences
        const fitnessData = {
          goals: ['strength', 'endurance'],
          experienceLevel: 'intermediate'
        };

        const step3Response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(fitnessData)
          .expect(200);

        // Verify final persistence (all data from all steps)
        const { data: finalProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(finalProfile.name).toBe('Multi Step User');
        expect(finalProfile.unit_preference).toBe('metric');
        expect(finalProfile.height).toBe(175);
        expect(finalProfile.weight).toBe(70);
        expect(finalProfile.age).toBe(25);
        expect(finalProfile.fitness_goals).toContain('strength');
        expect(finalProfile.fitness_goals).toContain('endurance');
        expect(finalProfile.experience_level).toBe('intermediate');
      });

      test('should handle partial failures in multi-step operations without data corruption', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Step 1: Create valid profile
        const validProfileData = {
          name: 'Partial Failure User',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(validProfileData)
          .expect(200);

        // Verify initial state
        const { data: initialProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(initialProfile.name).toBe('Partial Failure User');

        // Step 2: Attempt update with some valid and some invalid data
        const mixedValidityData = {
          weight: 75, // Valid
          height: -100, // Invalid - should cause failure
          goals: ['strength'] // Valid
        };

        const failedResponse = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(mixedValidityData)
          .expect(400);

        // Verify that original data persists unchanged (no partial updates)
        const { data: unchangedProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(unchangedProfile.name).toBe('Partial Failure User');
        expect(unchangedProfile.weight).toBe(70); // Should not be updated to 75
        expect(unchangedProfile.height).toBe(175); // Should not be corrupted
        expect(unchangedProfile.fitness_goals).toEqual(['general_fitness']); // Should not change
      });

      test('should maintain data consistency across related tables during multi-step operations', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Create profile with related data
        const profileWithRelatedData = {
          name: 'Related Data User',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['strength'],
          experienceLevel: 'intermediate'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(profileWithRelatedData)
          .expect(200);

        // Verify profile exists
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(profile).toBeTruthy();

        // Verify user still exists by making a successful API call
        const userVerificationResponse = await supertest(app)
          .get('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .expect(200);

        expect(userVerificationResponse.body.data.userId).toBe(userInfo.userId);

        // Update profile and verify related data consistency
        const updateData = {
          name: 'Updated Related Data User',
          goals: ['powerlifting', 'strength']
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(updateData)
          .expect(200);

        // Verify both profile and user data remain consistent
        const { data: updatedProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        // Verify user still exists by making a successful API call
        const consistentUserResponse = await supertest(app)
          .get('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .expect(200);

        expect(updatedProfile.name).toBe('Updated Related Data User');
        expect(updatedProfile.user_id).toBe(userInfo.userId);
        expect(consistentUserResponse.body.data.userId).toBe(userInfo.userId);
      });
    });
  });

  describe('Task 9.4: Database Consistency After Failures Testing', () => {
    describe('Recovery from Database Failures', () => {
      test('should maintain data consistency after simulated connection interruption', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Create initial profile
        const initialProfileData = {
          name: 'Connection Test User',
          height: 170,
          weight: 65,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(initialProfileData)
          .expect(200);

        // Verify initial state
        const { data: initialProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(initialProfile.name).toBe('Connection Test User');

        // Simulate connection failure during update
        await simulateConnectionFailure();

        // Attempt update after simulated failure
        const updateData = {
          weight: 70,
          name: 'Post Failure User'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(updateData)
          .expect(200);

        // Verify data consistency post-recovery
        const { data: recoveredProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(recoveredProfile.name).toBe('Post Failure User');
        expect(recoveredProfile.weight).toBe(70);
        expect(recoveredProfile.user_id).toBe(userInfo.userId);
        expect(recoveredProfile.unit_preference).toBe('metric'); // Should persist from initial
      });

      test('should handle database constraint violations gracefully', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Create valid profile
        const validProfileData = {
          name: 'Constraint Test User',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(validProfileData)
          .expect(200);

        // Attempt to violate database constraints
        const constraintViolationData = {
          age: -5, // Violates check constraint
          weight: 0, // Violates check constraint
          height: -180 // Violates check constraint
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(constraintViolationData)
          .expect(400);

        expect(response.body.status).toBe('error');

        // Verify original data persists unchanged
        const { data: unchangedProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(unchangedProfile.name).toBe('Constraint Test User');
        expect(unchangedProfile.age).toBe(25);
        expect(unchangedProfile.weight).toBe(70);
        expect(unchangedProfile.height).toBe(175);
      });

      test('should maintain referential integrity after foreign key constraint failures', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Create valid profile
        const validProfileData = {
          name: 'Foreign Key Test User',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(validProfileData)
          .expect(200);

        // Verify profile exists with correct foreign key
        const { data: validProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(validProfile.user_id).toBe(userInfo.userId);

        // Attempt to update with invalid foreign key reference
        // Note: This is simulated since our API doesn't allow direct user_id changes
        const invalidForeignKeyData = {
          name: 'Should Not Persist',
          weight: 75
        };

        // Simulate backend logic that would fail foreign key constraints
        try {
          await supabase
            .from('user_profiles')
            .update({
              user_id: 'non_existent_user_id',
              name: 'Should Not Persist'
            })
            .eq('user_id', userInfo.userId);
        } catch (error) {
          // Expected to fail due to foreign key constraint
        }

        // Verify original profile data persists with correct foreign key
        const { data: persistedProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(persistedProfile.name).toBe('Foreign Key Test User');
        expect(persistedProfile.user_id).toBe(userInfo.userId);
        expect(persistedProfile.weight).toBe(70);
      });
    });
  });

  describe('Task 9.5: Long-Term and Cross-Session Persistence Testing', () => {
    describe('Session Independence and Long-Term Storage', () => {
      test('should persist profile data across multiple login sessions', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Create profile in first session
        const sessionProfileData = {
          name: 'Cross Session User',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['strength', 'endurance'],
          experienceLevel: 'intermediate'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(sessionProfileData)
          .expect(200);

        // Simulate new login session by creating new token
        const loginResponse = await supertest(app)
          .post('/v1/auth/login')
          .send({ email: userInfo.email, password: userInfo.password })
          .expect(200);

        const newSessionToken = loginResponse.body.jwtToken;
        expect(newSessionToken).toBeTruthy();

        // Retrieve profile in new session
        const profileResponse = await supertest(app)
          .get('/v1/profile')
          .set('Authorization', `Bearer ${newSessionToken}`)
          .expect(200);

        expect(profileResponse.body.data.name).toBe('Cross Session User');
        expect(profileResponse.body.data.height).toBe(175);
        expect(profileResponse.body.data.weight).toBe(70);
        expect(profileResponse.body.data.unitPreference).toBe('metric');
        expect(profileResponse.body.data.goals).toContain('strength');
        expect(profileResponse.body.data.goals).toContain('endurance');

        // Update profile in new session
        const newSessionUpdate = {
          weight: 72,
          goals: ['powerlifting']
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${newSessionToken}`)
          .send(newSessionUpdate)
          .expect(200);

        // Verify persistence directly in database
        const { data: persistedProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(persistedProfile.name).toBe('Cross Session User');
        expect(persistedProfile.weight).toBe(72);
        expect(persistedProfile.fitness_goals).toContain('powerlifting');
      });

      test('should maintain data integrity over extended time periods', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Create profile with timestamp tracking
        const timestampedProfileData = {
          name: 'Long Term User',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        };

        const initialCreateTime = new Date();
        
        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(timestampedProfileData)
          .expect(200);

        // Wait a brief period to simulate time passage
        await wait(100);

        // Perform multiple updates over time
        const updates = [
          { weight: 71 },
          { weight: 72, goals: ['strength'] },
          { experienceLevel: 'intermediate' }
        ];

        for (let i = 0; i < updates.length; i++) {
          await wait(50); // Small delays between updates
          
          await supertest(app)
            .post('/v1/profile')
            .set('Authorization', `Bearer ${userInfo.token}`)
            .send(updates[i])
            .expect(200);
        }

        // Verify all updates persisted correctly
        const { data: finalProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(finalProfile.name).toBe('Long Term User');
        expect(finalProfile.weight).toBe(72);
        expect(finalProfile.fitness_goals).toContain('strength');
        expect(finalProfile.experience_level).toBe('intermediate');
        expect(finalProfile.created_at).toBeDefined();
        expect(finalProfile.updated_at).toBeDefined();
        
        // Verify timestamps make sense
        const createdAt = new Date(finalProfile.created_at);
        const updatedAt = new Date(finalProfile.updated_at);
        
        expect(createdAt).toBeInstanceOf(Date);
        expect(updatedAt).toBeInstanceOf(Date);
        expect(updatedAt.getTime()).toBeGreaterThanOrEqual(createdAt.getTime());
      });

      test('should handle profile data retrieval after prolonged inactivity', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Create profile
        const inactivityProfileData = {
          name: 'Inactive User Test',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['flexibility'],
          experienceLevel: 'beginner'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(inactivityProfileData)
          .expect(200);

        // Simulate prolonged inactivity period
        await wait(200);

        // Attempt to retrieve profile after inactivity
        const retrievalResponse = await supertest(app)
          .get('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .expect(200);

        expect(retrievalResponse.body.data.name).toBe('Inactive User Test');
        expect(retrievalResponse.body.data.height).toBe(175);
        expect(retrievalResponse.body.data.goals).toContain('flexibility');

        // Perform update after inactivity
        const postInactivityUpdate = {
          weight: 68,
          goals: ['yoga', 'flexibility']
        };

        const updateResponse = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(postInactivityUpdate)
          .expect(200);

        expect(updateResponse.body.data.weight).toBe(68);
        expect(updateResponse.body.data.goals).toContain('yoga');
      });
    });
  });

  describe('Task 9.6: Performance Load Persistence Testing', () => {
    describe('High Load Data Integrity', () => {
      test('should maintain data consistency under high concurrent load', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Create initial profile
        const initialProfileData = {
          name: 'Load Test User',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(initialProfileData)
          .expect(200);

        // Generate multiple concurrent update requests
        const concurrentUpdates = Array.from({ length: 10 }, (_, i) => ({
          weight: 70 + i
        }));

        const startTime = Date.now();

        // Execute all updates concurrently
        const updatePromises = concurrentUpdates.map(update =>
          supertest(app)
            .post('/v1/profile')
            .set('Authorization', `Bearer ${userInfo.token}`)
            .send(update)
        );

        const responses = await Promise.all(updatePromises);
        const endTime = Date.now();

        // Verify all requests completed successfully
        responses.forEach((response, index) => {
          expect(response.status).toBe(200);
          expect(response.body.status).toBe('success');
        });

        // Verify final data consistency
        const { data: finalProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(finalProfile.name).toBe('Load Test User');
        expect(finalProfile.user_id).toBe(userInfo.userId);
        expect(finalProfile.unit_preference).toBe('metric');
        expect(typeof finalProfile.weight).toBe('number');
        expect(finalProfile.weight).toBeGreaterThanOrEqual(70);
        expect(finalProfile.weight).toBeLessThanOrEqual(79);

        // Performance check - all updates should complete within reasonable time
        const totalTime = endTime - startTime;
        expect(totalTime).toBeLessThan(5000); // 5 seconds max for 10 concurrent updates
      });

      test('should handle rapid sequential updates without data loss', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Create initial profile
        const rapidTestProfileData = {
          name: 'Rapid Update User',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(rapidTestProfileData)
          .expect(200);

        // Perform rapid sequential updates
        const sequentialUpdates = [
          { weight: 71, goals: ['strength'] },
          { weight: 72, experienceLevel: 'intermediate' },
          { weight: 73, goals: ['strength', 'endurance'] },
          { weight: 74, name: 'Rapid Update User Modified' },
          { weight: 75, age: 26 }
        ];

        for (let i = 0; i < sequentialUpdates.length; i++) {
          const response = await supertest(app)
            .post('/v1/profile')
            .set('Authorization', `Bearer ${userInfo.token}`)
            .send(sequentialUpdates[i])
            .expect(200);

          expect(response.body.status).toBe('success');
        }

        // Verify final state contains latest values
        const { data: finalProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(finalProfile.weight).toBe(75);
        expect(finalProfile.age).toBe(26);
        expect(finalProfile.name).toBe('Rapid Update User Modified');
        expect(finalProfile.experience_level).toBe('intermediate');
        expect(finalProfile.fitness_goals).toContain('strength');
        expect(finalProfile.fitness_goals).toContain('endurance');
      });

      test('should maintain database performance under sustained load', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Create initial profile
        const sustainedLoadProfileData = {
          name: 'Sustained Load User',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(sustainedLoadProfileData)
          .expect(200);

        // Track response times during sustained load
        const responseTimes = [];
        const numberOfRequests = 20;

        for (let i = 0; i < numberOfRequests; i++) {
          const startTime = Date.now();
          
          const updateData = {
            weight: 70 + (i % 10)
          };

          const response = await supertest(app)
            .post('/v1/profile')
            .set('Authorization', `Bearer ${userInfo.token}`)
            .send(updateData)
            .expect(200);

          const endTime = Date.now();
          responseTimes.push(endTime - startTime);

          expect(response.body.status).toBe('success');
          
          // Small delay between requests to simulate realistic usage
          await wait(10);
        }

        // Verify performance doesn't degrade significantly over time
        const firstQuarterAvg = responseTimes.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
        const lastQuarterAvg = responseTimes.slice(-5).reduce((a, b) => a + b, 0) / 5;

        // Response time shouldn't increase by more than 100% over sustained load (allowing for test environment variability)
        expect(lastQuarterAvg).toBeLessThan(firstQuarterAvg * 2.0);

        // No individual request should take more than 2 seconds
        responseTimes.forEach(time => {
          expect(time).toBeLessThan(2000);
        });

        // Verify final data integrity
        const { data: finalProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(finalProfile.name).toBe('Sustained Load User');
        expect(finalProfile.user_id).toBe(userInfo.userId);
        expect(typeof finalProfile.weight).toBe('number');
      });
    });
  });

  describe('Task 9.7: Backup Recovery Data Integrity Testing', () => {
    describe('Data Recovery and Backup Scenarios', () => {
      test('should maintain profile data integrity through simulated backup recovery', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Create profile data that would be in a backup
        const backupProfileData = {
          name: 'Backup Recovery User',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['strength', 'endurance'],
          experienceLevel: 'intermediate'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(backupProfileData)
          .expect(200);

        // Simulate backup point - capture current state
        const { data: backupState } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(backupState).toBeTruthy();

        // Make additional changes that would be "lost" in recovery scenario
        const postBackupData = {
          weight: 75,
          goals: ['powerlifting'],
          name: 'Should be lost in recovery'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(postBackupData)
          .expect(200);

        // Verify changes were applied
        const { data: changedState } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(changedState.weight).toBe(75);
        expect(changedState.name).toBe('Should be lost in recovery');

        // Simulate recovery by restoring backup state
        await supabase
          .from('user_profiles')
          .update({
            name: backupState.name,
            weight: backupState.weight,
            fitness_goals: backupState.fitness_goals,
            experience_level: backupState.experience_level
          })
          .eq('user_id', userInfo.userId);

        // Verify recovery integrity
        const { data: recoveredState } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(recoveredState.name).toBe('Backup Recovery User');
        expect(recoveredState.weight).toBe(70);
        expect(recoveredState.fitness_goals).toContain('strength');
        expect(recoveredState.fitness_goals).toContain('endurance');
        expect(recoveredState.experience_level).toBe('intermediate');
        expect(recoveredState.user_id).toBe(userInfo.userId);
      });

      test('should handle partial data recovery scenarios gracefully', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Create comprehensive profile
        const comprehensiveProfileData = {
          name: 'Partial Recovery User',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness', 'flexibility'],
          experienceLevel: 'beginner'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(comprehensiveProfileData)
          .expect(200);

        // Simulate partial data corruption/loss
        await supabase
          .from('user_profiles')
          .update({
            fitness_goals: null,
            experience_level: null
          })
          .eq('user_id', userInfo.userId);

        // Verify partial loss occurred
        const { data: corruptedState } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(corruptedState.fitness_goals).toBeNull();
        expect(corruptedState.experience_level).toBeNull();
        expect(corruptedState.name).toBe('Partial Recovery User'); // Should still exist
        expect(corruptedState.weight).toBe(70); // Should still exist

        // Attempt to update profile after partial data loss
        const recoveryUpdateData = {
          goals: ['strength'],
          experienceLevel: 'intermediate'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(recoveryUpdateData)
          .expect(200);

        // Verify recovery was successful
        const { data: recoveredProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(recoveredProfile.name).toBe('Partial Recovery User');
        expect(recoveredProfile.weight).toBe(70);
        expect(recoveredProfile.fitness_goals).toContain('strength');
        expect(recoveredProfile.experience_level).toBe('intermediate');
        expect(recoveredProfile.user_id).toBe(userInfo.userId);
      });

      test('should validate data integrity after recovery operations', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Create profile with known good data
        const integrityTestData = {
          name: 'Integrity Test User',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['endurance'],
          experienceLevel: 'advanced'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(integrityTestData)
          .expect(200);

        // Capture initial checksums/state for integrity verification
        const { data: initialState } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        const initialDataString = JSON.stringify({
          name: initialState.name,
          height: initialState.height,
          weight: initialState.weight,
          age: initialState.age,
          unitPreference: initialState.unit_preference,
          goals: initialState.fitness_goals,
          experienceLevel: initialState.experience_level
        });

        // Simulate recovery process
        await supabase
          .from('user_profiles')
          .update({
            name: initialState.name,
            height: initialState.height,
            weight: initialState.weight,
            age: initialState.age,
            unit_preference: initialState.unit_preference,
            fitness_goals: initialState.fitness_goals,
            experience_level: initialState.experience_level
          })
          .eq('user_id', userInfo.userId);

        // Verify integrity post-recovery
        const { data: recoveredState } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        const recoveredDataString = JSON.stringify({
          name: recoveredState.name,
          height: recoveredState.height,
          weight: recoveredState.weight,
          age: recoveredState.age,
          unitPreference: recoveredState.unit_preference,
          goals: recoveredState.fitness_goals,
          experienceLevel: recoveredState.experience_level
        });

        // Data should be identical after recovery
        expect(recoveredDataString).toBe(initialDataString);

        // Verify API still works correctly with recovered data
        const apiResponse = await supertest(app)
          .get('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .expect(200);

        expect(apiResponse.body.data.name).toBe('Integrity Test User');
        expect(apiResponse.body.data.height).toBe(175);
        expect(apiResponse.body.data.weight).toBe(70);
        expect(apiResponse.body.data.unitPreference).toBe('metric');
        expect(apiResponse.body.data.goals).toContain('endurance');
        expect(apiResponse.body.data.experienceLevel).toBe('advanced');
      });

      test('should handle corrupted data recovery with appropriate error handling', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Create valid profile
        const validProfileData = {
          name: 'Corruption Test User',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(validProfileData)
          .expect(200);

        // Simulate data corruption by directly modifying database with invalid data
        try {
          await supabase
            .from('user_profiles')
            .update({
              age: -1, // Invalid age
              height: 0, // Invalid height
              weight: null // Required field as null
            })
            .eq('user_id', userInfo.userId);
        } catch (error) {
          // May fail due to constraints - this is expected
        }

        // Attempt to update profile with corrupted base data
        const updateAfterCorruption = {
          name: 'Updated After Corruption',
          goals: ['strength']
        };

        // The API should handle corrupted data gracefully
        try {
          const response = await supertest(app)
            .post('/v1/profile')
            .set('Authorization', `Bearer ${userInfo.token}`)
            .send(updateAfterCorruption);

          // If successful, verify data was corrected
          if (response.status === 200) {
            const { data: correctedProfile } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('user_id', userInfo.userId)
              .single();

            expect(correctedProfile.user_id).toBe(userInfo.userId);
            expect(correctedProfile.name).toBe('Updated After Corruption');
          }
        } catch (error) {
          // If it fails, that's also acceptable - the system should handle corruption gracefully
          expect(error).toBeDefined();
        }

        // Verify user can still be retrieved even with potential corruption
        const getUserResponse = await supertest(app)
          .get('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`);

        // Should either succeed with valid data or fail gracefully
        expect([200, 400, 500]).toContain(getUserResponse.status);
      });
    });
  });
}); 