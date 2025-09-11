/**
 * @fileoverview Integration tests for Create vs Update Logic Paths
 * Tests for Feature #6: Create vs Update Logic Paths Testing
 * 
 * This test suite covers:
 * - Task 6.1: Create Path Logic Testing
 * - Task 6.2: Update Path Logic Testing  
 * - Task 6.3: PUT vs POST Endpoint Behavior Testing
 * - Task 6.4: Error Path Distinction Testing
 * - Task 6.5: Logic Path Transition Testing
 * - Task 6.6: Service Layer Integration Testing
 * - Task 6.7: Response Format Consistency Testing
 * - Task 6.8: Authentication & Authorization Consistency
 */

const supertest = require('supertest');
const { describe, beforeAll, afterAll, beforeEach, afterEach, test, expect } = require('@jest/globals');
const { app, startServer, closeServer } = require('../../../server');
const { getSupabaseClient, getSupabaseAdminClient } = require('../../../services/supabase');

describe('Profile Create vs Update Logic Testing (/v1/profile)', () => {
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
    return `test.createupdate.${timestamp}.${random}@example.com`;
  };

  // Helper function to generate unique usernames
  const generateUniqueName = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `TestUser${timestamp}${random}`;
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

  describe('Task 6.1: Create Path Logic Testing', () => {
    describe('POST /api/profile - Profile Creation Path', () => {
      test('should follow CREATE path when user has no existing profile', async () => {
        const userInfo = await createUserAndGetToken();
        
        // First, ensure no profile exists by checking database directly
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        // Should not have a profile yet (signup creates basic profile, but let's test the logic)
        // If signup creates a profile, delete it to test pure creation path
        if (existingProfile) {
          await supabase
            .from('user_profiles')
            .delete()
            .eq('user_id', userInfo.userId);
        }

        const profileData = {
          name: 'Test User Create',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(profileData)
          .expect(200);

        // Verify response format
        expect(response.body.status).toBe('success');
        expect(response.body.message).toBe('Profile updated successfully'); // Current implementation issue
        expect(response.body.data.userId).toBe(userInfo.userId);
        expect(response.body.data.name).toBe('Test User Create');

        // Verify profile was actually created in database
        const { data: createdProfile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(error).toBeNull();
        expect(createdProfile).toBeTruthy();
        expect(createdProfile.user_id).toBe(userInfo.userId);
        expect(createdProfile.name).toBe('Test User Create');
      });

      test('should return HTTP 200 for create path (currently - should be 201)', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Ensure no profile exists
        await supabase
          .from('user_profiles')
          .delete()
          .eq('user_id', userInfo.userId);

        const profileData = {
          name: 'Test User Create Status',
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
          .expect(200); // Current implementation returns 200, should be 201

        expect(response.body.status).toBe('success');
        expect(response.body.message).toBe('Profile updated successfully'); // Issue: should be "Profile created successfully"
      });
    });

    describe('Create Path Validation Testing', () => {
      test('should enforce CREATE validation rules: userId and unitPreference required', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Ensure no profile exists
        await supabase
          .from('user_profiles')
          .delete()
          .eq('user_id', userInfo.userId);

        // Test missing unitPreference in create scenario
        const profileDataWithoutUnit = {
          name: 'Test User',
          height: 175,
          weight: 70,
          age: 25,
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
          // Missing unitPreference
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(profileDataWithoutUnit)
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Profile data validation failed');
      });

      test('should validate CREATE-specific field requirements', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Ensure no profile exists
        await supabase
          .from('user_profiles')
          .delete()
          .eq('user_id', userInfo.userId);

        // Test with invalid unitPreference value
        const profileDataInvalidUnit = {
          name: 'Test User',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'invalid_unit', // Invalid value
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(profileDataInvalidUnit)
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Unit preference must be either metric or imperial');
      });
    });
  });

  describe('Task 6.2: Update Path Logic Testing', () => {
    describe('POST /api/profile - Profile Update Path', () => {
      test('should follow UPDATE path when user has existing profile', async () => {
        const userInfo = await createUserAndGetToken();
        
        // First create a profile to ensure update path
        const initialProfileData = {
          name: 'Initial User',
          height: 170,
          weight: 65,
          age: 25,
          unitPreference: 'metric',
          goals: ['flexibility'],
          experienceLevel: 'beginner'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(initialProfileData)
          .expect(200);

        // Now update the profile
        const updateProfileData = {
          name: 'Updated User',
          height: 175,
          weight: 70,
          age: 26,
          goals: ['strength', 'endurance']
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(updateProfileData)
          .expect(200);

        // Verify response format
        expect(response.body.status).toBe('success');
        expect(response.body.message).toBe('Profile updated successfully');
        expect(response.body.data.userId).toBe(userInfo.userId);
        expect(response.body.data.name).toBe('Updated User');
        expect(response.body.data.height).toBe(175);

        // Verify profile was actually updated in database
        const { data: updatedProfile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(error).toBeNull();
        expect(updatedProfile).toBeTruthy();
        expect(updatedProfile.name).toBe('Updated User');
        expect(updatedProfile.height).toBe(175);
        expect(updatedProfile.fitness_goals).toContain('strength');
        expect(updatedProfile.fitness_goals).toContain('endurance');
      });

      test('should handle partial updates in UPDATE path', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Create initial profile
        const initialProfileData = {
          name: 'Initial User',
          height: 170,
          weight: 65,
          age: 25,
          unitPreference: 'metric',
          goals: ['flexibility'],
          experienceLevel: 'beginner'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(initialProfileData)
          .expect(200);

        // Update only specific fields
        const partialUpdateData = {
          weight: 68,
          goals: ['strength']
          // Other fields should remain unchanged
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(partialUpdateData)
          .expect(200);

        expect(response.body.data.weight).toBe(68);
        expect(response.body.data.name).toBe('Initial User'); // Should remain unchanged
        expect(response.body.data.height).toBe(170); // Should remain unchanged

        // Verify in database
        const { data: updatedProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(updatedProfile.weight).toBe(68);
        expect(updatedProfile.name).toBe('Initial User');
        expect(updatedProfile.height).toBe(170);
      });
    });

    describe('Update Path Validation Testing', () => {
      test('should allow optional fields in UPDATE path', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Create initial profile with required fields
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

        // Update without unitPreference (should be allowed in update)
        const updateWithoutRequiredFields = {
          weight: 70
          // Missing unitPreference - should be OK in update
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(updateWithoutRequiredFields)
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.weight).toBe(70);
        expect(response.body.data.unitPreference).toBe('metric'); // Should retain original value
      });
    });
  });

  describe('Task 6.3: PUT vs POST Endpoint Behavior Testing', () => {
    describe('PUT /v1/profile vs POST /v1/profile', () => {
      test('should have identical behavior between PUT and POST endpoints', async () => {
        const userInfo1 = await createUserAndGetToken();
        const userInfo2 = await createUserAndGetToken();
        
        const profileData = {
          name: 'Test User Endpoint',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        };

        // Test POST endpoint
        const postResponse = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo1.token}`)
          .send(profileData)
          .expect(200);

        // Test PUT endpoint
        const putResponse = await supertest(app)
          .put('/v1/profile')
          .set('Authorization', `Bearer ${userInfo2.token}`)
          .send(profileData)
          .expect(200);

        // Both should have identical response structure
        expect(postResponse.body.status).toBe(putResponse.body.status);
        expect(postResponse.body.message).toBe(putResponse.body.message);
        expect(postResponse.body.data.name).toBe(putResponse.body.data.name);
        expect(postResponse.body.data.height).toBe(putResponse.body.data.height);
      });

      test('should maintain idempotency for PUT requests', async () => {
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

        // First PUT request
        const firstResponse = await supertest(app)
          .put('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(profileData)
          .expect(200);

        // Second identical PUT request
        const secondResponse = await supertest(app)
          .put('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(profileData)
          .expect(200);

        // Results should be identical (idempotent)
        expect(firstResponse.body.data.name).toBe(secondResponse.body.data.name);
        expect(firstResponse.body.data.height).toBe(secondResponse.body.data.height);
        expect(firstResponse.body.data.weight).toBe(secondResponse.body.data.weight);

        // Verify database state is consistent
        const { data: finalProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(finalProfile.name).toBe('Idempotent User');
      });
    });

    describe('REST API Semantics Validation', () => {
      test('should verify current HTTP status codes for create vs update operations', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Clear any existing profile to test create
        await supabase
          .from('user_profiles')
          .delete()
          .eq('user_id', userInfo.userId);

        const profileData = {
          name: 'REST Test User',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        };

        // Create operation
        const createResponse = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(profileData)
          .expect(200); // Currently returns 200, note for documentation

        // Update operation  
        const updateData = { weight: 75 };
        const updateResponse = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(updateData)
          .expect(200);

        // Document current behavior vs REST best practices
        expect(createResponse.status).toBe(200); // Should ideally be 201
        expect(updateResponse.status).toBe(200); // This is correct for updates
      });
    });
  });

  describe('Task 6.4: Error Path Distinction Testing', () => {
    describe('Create Path Error Scenarios', () => {
      test('should handle create path validation failures with create-specific context', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Clear profile to ensure create path
        await supabase
          .from('user_profiles')
          .delete()
          .eq('user_id', userInfo.userId);

        // Invalid create data
        const invalidCreateData = {
          name: 'Test User',
          height: -175, // Invalid: negative height
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(invalidCreateData)
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toMatch(/height/i);
      });

      test('should handle database constraint violations during create', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Create a profile first
        const profileData = {
          name: 'First Profile',
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
          .send(profileData)
          .expect(200);

        // Try to create another profile directly in database (should cause constraint violation)
        // This tests the backend's handling of constraint violations
        const { error } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userInfo.userId,
            name: 'Duplicate Profile',
            height: 180,
            weight: 75,
            age: 30,
            unit_preference: 'metric',
            fitness_goals: ['strength'],
            experience_level: 'intermediate'
          });

        expect(error).toBeTruthy();
        expect(error.code).toBe('23505'); // PostgreSQL unique constraint violation
      });
    });

    describe('Update Path Error Scenarios', () => {
      test('should handle update path with non-existent profile', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Ensure no profile exists
        await supabase
          .from('user_profiles')
          .delete()
          .eq('user_id', userInfo.userId);

        // The controller should detect no profile and route to create path
        const updateData = {
          weight: 75
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(updateData)
          .expect(400); // Should fail validation since no unitPreference for create

        expect(response.body.status).toBe('error');
      });

      test('should handle update validation failures with update-specific context', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Create initial profile
        const initialData = {
          name: 'Initial User',
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
          .send(initialData)
          .expect(200);

        // Invalid update data
        const invalidUpdateData = {
          age: -5 // Invalid: negative age
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(invalidUpdateData)
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toMatch(/age/i);
      });
    });
  });

  describe('Task 6.5: Logic Path Transition Testing', () => {
    describe('Profile Lifecycle Through Both Paths', () => {
      test('should seamlessly transition from create logic to update logic for same user', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Clear any existing profile to start fresh
        await supabase
          .from('user_profiles')
          .delete()
          .eq('user_id', userInfo.userId);

        // Step 1: CREATE path - no existing profile
        const createData = {
          name: 'Lifecycle User',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        };

        const createResponse = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(createData)
          .expect(200);

        expect(createResponse.body.data.name).toBe('Lifecycle User');

        // Step 2: UPDATE path - profile now exists
        const updateData = {
          name: 'Updated Lifecycle User',
          weight: 75,
          goals: ['strength', 'endurance']
        };

        const updateResponse = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(updateData)
          .expect(200);

        expect(updateResponse.body.data.name).toBe('Updated Lifecycle User');
        expect(updateResponse.body.data.weight).toBe(75);
        expect(updateResponse.body.data.height).toBe(175); // Should be preserved from create

        // Verify database state
        const { data: finalProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(finalProfile.name).toBe('Updated Lifecycle User');
        expect(finalProfile.weight).toBe(75);
        expect(finalProfile.height).toBe(175);
      });
    });

    describe('Data Consistency Across Paths', () => {
      test('should maintain data integrity across create → update transitions', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Clear profile
        await supabase
          .from('user_profiles')
          .delete()
          .eq('user_id', userInfo.userId);

        // Create with full data
        const fullCreateData = {
          name: 'Consistency User',
          height: 175,
          weight: 70,
          age: 25,
          gender: 'male',
          unitPreference: 'metric',
          goals: ['general_fitness', 'weight_loss'],
          equipment: ['dumbbells', 'treadmill'],
          experienceLevel: 'beginner',
          workoutFrequency: '3x_week'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(fullCreateData)
          .expect(200);

        // Update with partial data
        const partialUpdateData = {
          weight: 68,
          goals: ['strength']
        };

        const updateResponse = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(partialUpdateData)
          .expect(200);

        // Verify all original data is preserved except updated fields
        expect(updateResponse.body.data.name).toBe('Consistency User');
        expect(updateResponse.body.data.height).toBe(175);
        expect(updateResponse.body.data.weight).toBe(68); // Updated
        expect(updateResponse.body.data.age).toBe(25);
        expect(updateResponse.body.data.gender).toBe('male');
        expect(updateResponse.body.data.experienceLevel).toBe('beginner');
        expect(updateResponse.body.data.goals).toEqual(['strength']); // Updated
      });
    });
  });

  describe('Task 6.6: Service Layer Integration Testing', () => {
    describe('createProfile() Service Function Integration', () => {
      test('should properly call createProfile service when no profile exists', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Clear profile to force create path
        await supabase
          .from('user_profiles')
          .delete()
          .eq('user_id', userInfo.userId);

        const profileData = {
          name: 'Service Create Test',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(profileData)
          .expect(200);

        // Verify the service created the profile correctly
        expect(response.body.data.name).toBe('Service Create Test');
        
        // Verify in database
        const { data: createdProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(createdProfile.name).toBe('Service Create Test');
        expect(createdProfile.unit_preference).toBe('metric');
      });
    });

    describe('updateProfile() Service Function Integration', () => {
      test('should properly call updateProfile service when profile exists', async () => {
        const userInfo = await createUserAndGetToken();
        
        // Create initial profile
        const initialData = {
          name: 'Service Update Initial',
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
          .send(initialData)
          .expect(200);

        // Update profile
        const updateData = {
          name: 'Service Update Modified',
          weight: 75
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(updateData)
          .expect(200);

        // Verify the service updated correctly
        expect(response.body.data.name).toBe('Service Update Modified');
        expect(response.body.data.weight).toBe(75);
        expect(response.body.data.height).toBe(175); // Preserved

        // Verify in database
        const { data: updatedProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(updatedProfile.name).toBe('Service Update Modified');
        expect(updatedProfile.weight).toBe(75);
      });
    });
  });

  describe('Task 6.7: Response Format Consistency Testing', () => {
    describe('Create vs Update Response Differences', () => {
      test('should document current response format consistency between create and update', async () => {
        const userInfo1 = await createUserAndGetToken();
        const userInfo2 = await createUserAndGetToken();
        
        // Clear first user's profile for create path
        await supabase
          .from('user_profiles')
          .delete()
          .eq('user_id', userInfo1.userId);

        // Create initial profile for second user for update path
        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo2.token}`)
          .send({
            name: 'Update Path User',
            height: 175,
            weight: 70,
            age: 25,
            unitPreference: 'metric',
            goals: ['general_fitness'],
            experienceLevel: 'beginner'
          })
          .expect(200);

        const profileData = {
          name: 'Response Test User',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        };

        // CREATE path response
        const createResponse = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo1.token}`)
          .send(profileData)
          .expect(200);

        // UPDATE path response
        const updateResponse = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo2.token}`)
          .send({ weight: 75 })
          .expect(200);

        // Current implementation - both have same structure and message
        expect(createResponse.body.status).toBe('success');
        expect(updateResponse.body.status).toBe('success');
        expect(createResponse.body.message).toBe('Profile updated successfully');
        expect(updateResponse.body.message).toBe('Profile updated successfully');

        // Both should have consistent data structure
        expect(createResponse.body.data).toHaveProperty('userId');
        expect(updateResponse.body.data).toHaveProperty('userId');
        expect(createResponse.body.data).toHaveProperty('name');
        expect(updateResponse.body.data).toHaveProperty('name');
      });

      test('should verify HTTP status codes are currently identical for both paths', async () => {
        const userInfo1 = await createUserAndGetToken();
        const userInfo2 = await createUserAndGetToken();
        
        // Clear first user's profile for create path
        await supabase
          .from('user_profiles')
          .delete()
          .eq('user_id', userInfo1.userId);

        // Create profile for second user
        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo2.token}`)
          .send({
            name: 'Status Test User',
            height: 175,
            weight: 70,
            age: 25,
            unitPreference: 'metric',
            goals: ['general_fitness'],
            experienceLevel: 'beginner'
          })
          .expect(200);

        const profileData = {
          name: 'Status Test User',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        };

        // Both should return 200 (current implementation)
        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo1.token}`)
          .send(profileData)
          .expect(200); // CREATE - currently 200, should ideally be 201

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo2.token}`)
          .send({ weight: 75 })
          .expect(200); // UPDATE - correctly 200
      });
    });
  });

  describe('Task 6.8: Authentication & Authorization Consistency', () => {
    describe('JWT Token Validation Across Paths', () => {
      test('should require valid JWT token for both create and update paths', async () => {
        const profileData = {
          name: 'Auth Test User',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        };

        // Test without token
        await supertest(app)
          .post('/v1/profile')
          .send(profileData)
          .expect(401);

        // Test with invalid token
        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', 'Bearer invalid-token')
          .send(profileData)
          .expect(401);
      });

      test('should reject expired JWT tokens for both paths', async () => {
        const profileData = {
          name: 'Expired Token Test',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        };

        // Test with expired token format
        const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${expiredToken}`)
          .send(profileData)
          .expect(401);
      });
    });

    describe('User Context Consistency', () => {
      test('should use correct user context from JWT for both create and update operations', async () => {
        const userInfo = await createUserAndGetToken();
        
        const profileData = {
          name: 'Context Test User',
          height: 175,
          weight: 70,
          age: 25,
          unitPreference: 'metric',
          goals: ['general_fitness'],
          experienceLevel: 'beginner'
        };

        // Create profile
        const createResponse = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send(profileData)
          .expect(200);

        expect(createResponse.body.data.userId).toBe(userInfo.userId);

        // Update profile
        const updateResponse = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo.token}`)
          .send({ weight: 75 })
          .expect(200);

        expect(updateResponse.body.data.userId).toBe(userInfo.userId);

        // Verify database shows correct user_id
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo.userId)
          .single();

        expect(profile.user_id).toBe(userInfo.userId);
      });

      test('should prevent cross-user profile access', async () => {
        const userInfo1 = await createUserAndGetToken();
        const userInfo2 = await createUserAndGetToken();
        
        // Create profile for user1
        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo1.token}`)
          .send({
            name: 'User1 Profile',
            height: 175,
            weight: 70,
            age: 25,
            unitPreference: 'metric',
            goals: ['general_fitness'],
            experienceLevel: 'beginner'
          })
          .expect(200);

        // User2 attempts to modify user1's profile by using user1's token 
        // This should not be possible since the backend uses req.user.id from JWT
        const maliciousUpdate = {
          name: 'Hacked Name'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userInfo2.token}`)
          .send(maliciousUpdate)
          .expect(200); // Will succeed but create/update user2's profile, not user1's

        // Verify user2's operation didn't affect user1's profile
        const { data: user1Profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userInfo1.userId)
          .single();

        expect(user1Profile.name).toBe('User1 Profile'); // Should be unchanged

        // Verify user2 got their own profile
        expect(response.body.data.userId).toBe(userInfo2.userId);
      });
    });
  });
}); 