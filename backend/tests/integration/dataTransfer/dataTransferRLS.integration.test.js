/**
 * @fileoverview Data Transfer RLS Integration Tests
 * Tests row-level security enforcement for data transfer operations, ensuring user isolation
 * Following analytics_integration_rules.mdc and real_ai_integration.mdc patterns
 */

const supertest = require('supertest');
const { app } = require('../../../server');
const { getSupabaseClient, getSupabaseClientWithToken } = require('../../../services/supabase');
const fs = require('fs');
const path = require('path');

// Import admin client for setup/teardown ONLY
const { createClient } = require('@supabase/supabase-js');
const adminSupabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

describe('Data Transfer RLS Integration Tests - Real Database & Service Validation', () => {
  let testUser1Id, testUser1Token;
  let testUser2Id, testUser2Token;
  let createdWorkoutPlanIds = [];

  // Get the general supabase client for non-RLS operations
  const supabase = getSupabaseClient();

  beforeAll(async () => {
    // Create first test user following successful analytics pattern
    const timestamp = Date.now();
    const testUser1Email = `rlstest1${timestamp}@example.com`;
    const testUser1Password = 'TestPassword123!';
    
    const signupResponse1 = await supertest(app)
      .post('/v1/auth/signup')
      .send({
        name: 'RLS Test User 1',
        email: testUser1Email,
        password: testUser1Password
      });
    
    if (signupResponse1.status !== 201) {
      throw new Error(`Failed to create test user 1: ${signupResponse1.body.message}`);
    }
    
    testUser1Id = signupResponse1.body.userId;
    testUser1Token = signupResponse1.body.accessToken;
    
    if (!testUser1Token) {
      const loginResponse1 = await supertest(app)
        .post('/v1/auth/login')
        .send({ email: testUser1Email, password: testUser1Password });
      if (loginResponse1.status !== 200) {
        throw new Error(`Failed to login test user 1: ${loginResponse1.body.message}`);
      }
      testUser1Token = loginResponse1.body.jwtToken;
    }

    // Create second test user for RLS validation
    const testUser2Email = `rlstest2${timestamp}@example.com`;
    const testUser2Password = 'TestPassword123!';
    
    const signupResponse2 = await supertest(app)
      .post('/v1/auth/signup')
      .send({
        name: 'RLS Test User 2',
        email: testUser2Email,
        password: testUser2Password
      });
    
    testUser2Id = signupResponse2.body.userId;
    testUser2Token = signupResponse2.body.accessToken;
    
    if (!testUser2Token) {
      const loginResponse2 = await supertest(app)
        .post('/v1/auth/login')
        .send({ email: testUser2Email, password: testUser2Password });
      testUser2Token = loginResponse2.body.jwtToken;
    }
  });

  afterAll(async () => {
    // Comprehensive cleanup using admin client following analytics pattern
    if (testUser1Id || testUser2Id) {
      try {
        // Clean up test workout plans
        if (createdWorkoutPlanIds.length > 0) {
          await adminSupabase.from('workout_plans').delete().in('id', createdWorkoutPlanIds);
        }
        // Clean up user profiles
        if (testUser1Id) {
          await adminSupabase.from('user_profiles').delete().eq('user_id', testUser1Id);
        }
        if (testUser2Id) {
          await adminSupabase.from('user_profiles').delete().eq('user_id', testUser2Id);
        }
      } catch (error) {
        console.log('Cleanup error (non-critical):', error.message);
      }
    }
  });

  // Helper function to create user profile following analytics pattern
  async function ensureUserProfile(userId, userToken, profileOverrides = {}) {
    const defaultProfile = {
      height: 175,
      weight: 70,
      age: 30,
      gender: 'male',
      unitPreference: 'metric',
      goals: ['strength'],
      equipment: ['bodyweight'],
      experienceLevel: 'intermediate'
    };

    const profileData = { ...defaultProfile, ...profileOverrides };

    const profileResponse = await supertest(app)
      .post('/v1/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send(profileData);
    
    if (![200, 201].includes(profileResponse.status)) {
      throw new Error(`Failed to create user profile: ${profileResponse.body.message || 'Unknown error'}`);
    }

    return profileResponse.body.data;
  }

  // Helper function to create test workout plan with correct schema
  async function createTestWorkoutPlan(userId, userToken, planOverrides = {}) {
    const defaultPlan = {
      name: 'RLS Test Plan',
      description: 'Plan for RLS testing',
      plan_data: {
        exercises: [
          {
            name: 'Push-ups',
            sets: 3,
            reps: '10-12',
            notes: 'Keep core tight'
          }
        ]
      },
      difficulty_level: 'intermediate',
      estimated_duration: 30,
      ai_generated: false,
      status: 'active',
      ...planOverrides
    };

    // Use authenticated client for RLS compliance
    const authenticatedSupabase = getSupabaseClientWithToken(userToken);
    const { data, error } = await authenticatedSupabase
      .from('workout_plans')
      .insert({
        user_id: userId,
        name: defaultPlan.name,
        description: defaultPlan.description,
        plan_data: defaultPlan.plan_data,
        difficulty_level: defaultPlan.difficulty_level,
        estimated_duration: defaultPlan.estimated_duration,
        ai_generated: defaultPlan.ai_generated,
        status: defaultPlan.status
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create workout plan: ${error.message}`);
    }

    createdWorkoutPlanIds.push(data.id);
    return data;
  }

  describe('Task 1: Export RLS Validation', () => {
    beforeEach(async () => {
      // Ensure clean user profiles for both users
      await ensureUserProfile(testUser1Id, testUser1Token, {
        goals: ['strength'],
        experienceLevel: 'intermediate'
      });
      await ensureUserProfile(testUser2Id, testUser2Token, {
        goals: ['cardio'],
        experienceLevel: 'beginner'
      });
    });

    test('When user exports workout plans, Then should only export their own data', async () => {
      // Create workout plans for both users
      const user1Plan = await createTestWorkoutPlan(testUser1Id, testUser1Token, {
        name: 'User 1 Plan',
        difficulty_level: 'intermediate'
      });
      const user2Plan = await createTestWorkoutPlan(testUser2Id, testUser2Token, {
        name: 'User 2 Plan',
        difficulty_level: 'beginner'
      });

      // Export workout plans using user 1's token (Rule 4: POST with body parameters)
      const exportResponse = await supertest(app)
        .post('/v1/data-transfer/export')
        .set('Authorization', `Bearer ${testUser1Token}`)
        .send({
          format: 'json',
          dataTypes: ['workouts'] // Rule 6: Use 'workouts' not 'workoutPlans'
        });

      expect(exportResponse.status).toBe(200);
      // Rule 5: Expect correct response format {exportDate, userId, data}
      expect(exportResponse.body.exportDate).toBeDefined();
      expect(exportResponse.body.userId).toBe(testUser1Id);
      expect(exportResponse.body.data).toBeDefined();
      
      const exportedPlans = exportResponse.body.data.workouts; // workouts, not workoutPlans
      expect(Array.isArray(exportedPlans)).toBe(true);

      // Should only contain user 1's plans
      const user1Plans = exportedPlans.filter(plan => plan.name === 'User 1 Plan');
      const user2Plans = exportedPlans.filter(plan => plan.name === 'User 2 Plan');

      expect(user1Plans.length).toBe(1);
      expect(user2Plans.length).toBe(0);

      // Verify RLS isolation
      expect(user1Plans[0].user_id).toBe(testUser1Id);

      console.log('✅ Export RLS Validation:', {
        user1PlansExported: user1Plans.length,
        user2PlansExported: user2Plans.length,
        rlsIsolationWorking: user2Plans.length === 0
      });
    });

    test('When user exports complete profile data, Then should only include their own data', async () => {
      // Create test data for both users
      await createTestWorkoutPlan(testUser1Id, testUser1Token, {
        name: 'User 1 Complete Plan'
      });
      await createTestWorkoutPlan(testUser2Id, testUser2Token, {
        name: 'User 2 Complete Plan'
      });

      // Export complete data using user 1's token (Rule 4: POST with body parameters)
      const exportResponse = await supertest(app)
        .post('/v1/data-transfer/export')
        .set('Authorization', `Bearer ${testUser1Token}`)
        .send({
          format: 'json',
          dataTypes: ['profiles', 'workouts'] // Rule 6: Use correct data types
        });

      expect(exportResponse.status).toBe(200);
      // Rule 5: Expect correct response format {exportDate, userId, data}
      expect(exportResponse.body.exportDate).toBeDefined();
      expect(exportResponse.body.userId).toBe(testUser1Id);
      expect(exportResponse.body.data).toBeDefined();
      
      const exportData = exportResponse.body.data;
      expect(exportData.profiles).toBeDefined();
      expect(exportData.workouts).toBeDefined(); // workouts, not workoutPlans

      // Verify profile belongs to user 1
      expect(exportData.profiles[0].user_id).toBe(testUser1Id);
      expect(exportData.profiles[0].fitness_goals).toContain('strength'); // database field name

      // Verify workout plans belong to user 1
      const workoutPlans = exportData.workouts; // workouts, not workoutPlans
      expect(workoutPlans.every(plan => plan.user_id === testUser1Id)).toBe(true);
      expect(workoutPlans.find(plan => plan.name === 'User 1 Complete Plan')).toBeDefined();
      expect(workoutPlans.find(plan => plan.name === 'User 2 Complete Plan')).toBeUndefined();

      console.log('✅ Complete Export RLS Validation:', {
        profileUserId: exportData.profiles[0].user_id,
        workoutPlansCount: workoutPlans.length,
        allPlansOwnedByUser1: workoutPlans.every(plan => plan.user_id === testUser1Id)
      });
    });

    test('When user attempts to export with invalid token, Then should return auth error', async () => {
      const exportResponse = await supertest(app)
        .post('/v1/data-transfer/export') // Rule 4: POST not GET
        .set('Authorization', 'Bearer invalid-token')
        .send({
          format: 'json',
          dataTypes: ['workouts'] // Rule 6: Use correct data types
        });

      expect(exportResponse.status).toBe(401);
      expect(exportResponse.body.status).toBe('error');
      expect(exportResponse.body.message).toMatch(/auth|token|unauthorized/i);

      console.log('✅ Invalid Token Export Validation:', {
        errorStatus: exportResponse.status,
        hasAuthError: !!exportResponse.body.message
      });
    });
  });

  describe('Task 2: Import RLS Validation', () => {
    beforeEach(async () => {
      await ensureUserProfile(testUser1Id, testUser1Token);
      await ensureUserProfile(testUser2Id, testUser2Token);
    });

    test('When user imports workout plans, Then should only import to their own account', async () => {
      // Create test import data (Rule 16: Use correct JSON structure)
      const importData = {
        data: { // Rule 16: Import service expects { "data": { ... } } structure
          workouts: [ // Rule 6: Use 'workouts' not 'workoutPlans'
            {
              name: 'Imported Plan for User 1',
              description: 'Should be imported to user 1',
              plan_data: {
                exercises: [
                  {
                    name: 'Squats',
                    sets: 3,
                    reps: '10-12',
                    notes: 'Test exercise'
                  }
                ]
              },
              difficulty_level: 'intermediate',
              estimated_duration: 30,
              ai_generated: false,
              status: 'active'
            }
          ]
        }
      };

      // Create temporary import file
      const testDir = path.join(__dirname, 'temp-rls-test');
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      const importFilePath = path.join(testDir, 'rls-import-test.json');
      fs.writeFileSync(importFilePath, JSON.stringify(importData));

      try {
        // Import using user 1's token
        const importResponse = await supertest(app)
          .post('/v1/data-transfer/import')
          .set('Authorization', `Bearer ${testUser1Token}`)
          .attach('file', importFilePath)
          .field('format', 'json')
          .field('dataType', 'workouts'); // Rule 6: Use 'workouts' not 'workoutPlans'

        expect(importResponse.status).toBe(200);
        expect(importResponse.body.status).toBe('success');
        expect(importResponse.body.data.successful).toBeGreaterThan(0); // Fix: use actual response format

        // Verify plan was imported to user 1's account
        const authenticatedSupabase1 = getSupabaseClientWithToken(testUser1Token);
        const { data: user1Plans, error: user1Error } = await authenticatedSupabase1
          .from('workout_plans')
          .select('*')
          .eq('user_id', testUser1Id)
          .eq('name', 'Imported Plan for User 1');

        expect(user1Error).toBeNull();
        expect(user1Plans).toHaveLength(1);
        expect(user1Plans[0].user_id).toBe(testUser1Id);

        // Verify plan was NOT imported to user 2's account
        const authenticatedSupabase2 = getSupabaseClientWithToken(testUser2Token);
        const { data: user2Plans, error: user2Error } = await authenticatedSupabase2
          .from('workout_plans')
          .select('*')
          .eq('user_id', testUser2Id)
          .eq('name', 'Imported Plan for User 1');

        expect(user2Error).toBeNull();
        expect(user2Plans).toHaveLength(0);

        // Track for cleanup
        createdWorkoutPlanIds.push(user1Plans[0].id);

        console.log('✅ Import RLS Validation:', {
          importedToUser1: user1Plans.length,
          importedToUser2: user2Plans.length,
          rlsIsolationWorking: user2Plans.length === 0
        });

      } finally {
        // Clean up test files
        if (fs.existsSync(testDir)) {
          fs.rmSync(testDir, { recursive: true, force: true });
        }
      }
    });

    test('When user attempts import with invalid token, Then should return auth error', async () => {
      // Create minimal test file (Rule 16: Use correct JSON structure)
      const testDir = path.join(__dirname, 'temp-rls-test');
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      const importFilePath = path.join(testDir, 'auth-test.json');
      fs.writeFileSync(importFilePath, JSON.stringify({ data: { workouts: [] } })); // Rule 16: Correct structure

      try {
        const importResponse = await supertest(app)
          .post('/v1/data-transfer/import')
          .set('Authorization', 'Bearer invalid-token')
          .attach('file', importFilePath)
          .field('format', 'json')
          .field('dataType', 'workouts'); // Rule 6: Use 'workouts' not 'workoutPlans'

        expect(importResponse.status).toBe(401);
        expect(importResponse.body.status).toBe('error');
        expect(importResponse.body.message).toMatch(/auth|token|unauthorized/i);

        console.log('✅ Invalid Token Import Validation:', {
          errorStatus: importResponse.status,
          hasAuthError: !!importResponse.body.message
        });

      } finally {
        if (fs.existsSync(testDir)) {
          fs.rmSync(testDir, { recursive: true, force: true });
        }
      }
    });
  });

  describe('Task 3: Cross-User Data Access Prevention', () => {
    beforeEach(async () => {
      await ensureUserProfile(testUser1Id, testUser1Token);
      await ensureUserProfile(testUser2Id, testUser2Token);
    });

    test('When user attempts to access another users export URL, Then should return only their own data', async () => {
      // Create distinct data for both users
      await createTestWorkoutPlan(testUser1Id, testUser1Token, {
        name: 'User 1 Private Plan',
        description: 'Should not be visible to user 2'
      });
      await createTestWorkoutPlan(testUser2Id, testUser2Token, {
        name: 'User 2 Private Plan',
        description: 'Should not be visible to user 1'
      });

      // User 1 tries to export - should only see their own data (Rule 4: POST with body parameters)
      const user1ExportResponse = await supertest(app)
        .post('/v1/data-transfer/export')
        .set('Authorization', `Bearer ${testUser1Token}`)
        .send({
          format: 'json',
          dataTypes: ['workouts'] // Rule 6: Use 'workouts' not 'workoutPlans'
        });

      expect(user1ExportResponse.status).toBe(200);
      // Rule 5: Expect correct response format {exportDate, userId, data}
      expect(user1ExportResponse.body.exportDate).toBeDefined();
      expect(user1ExportResponse.body.userId).toBe(testUser1Id);
      expect(user1ExportResponse.body.data).toBeDefined();
      
      const user1Plans = user1ExportResponse.body.data.workouts; // workouts, not workoutPlans
      
      // Should contain user 1's plan but not user 2's
      expect(user1Plans.find(plan => plan.name === 'User 1 Private Plan')).toBeDefined();
      expect(user1Plans.find(plan => plan.name === 'User 2 Private Plan')).toBeUndefined();

      // User 2 tries to export - should only see their own data (Rule 4: POST with body parameters)
      const user2ExportResponse = await supertest(app)
        .post('/v1/data-transfer/export')
        .set('Authorization', `Bearer ${testUser2Token}`)
        .send({
          format: 'json',
          dataTypes: ['workouts'] // Rule 6: Use 'workouts' not 'workoutPlans'
        });

      expect(user2ExportResponse.status).toBe(200);
      // Rule 5: Expect correct response format {exportDate, userId, data}
      expect(user2ExportResponse.body.exportDate).toBeDefined();
      expect(user2ExportResponse.body.userId).toBe(testUser2Id);
      expect(user2ExportResponse.body.data).toBeDefined();
      
      const user2Plans = user2ExportResponse.body.data.workouts; // workouts, not workoutPlans
      
      // Should contain user 2's plan but not user 1's
      expect(user2Plans.find(plan => plan.name === 'User 2 Private Plan')).toBeDefined();
      expect(user2Plans.find(plan => plan.name === 'User 1 Private Plan')).toBeUndefined();

      console.log('✅ Cross-User Data Access Prevention:', {
        user1CanSeeOwnPlan: !!user1Plans.find(plan => plan.name === 'User 1 Private Plan'),
        user1CannotSeeUser2Plan: !user1Plans.find(plan => plan.name === 'User 2 Private Plan'),
        user2CanSeeOwnPlan: !!user2Plans.find(plan => plan.name === 'User 2 Private Plan'),
        user2CannotSeeUser1Plan: !user2Plans.find(plan => plan.name === 'User 1 Private Plan')
      });
    });

    test('When service enforces RLS policies, Then database operations should respect user boundaries', async () => {
      // Test direct database access through authenticated clients
      const authenticatedSupabase1 = getSupabaseClientWithToken(testUser1Token);
      const authenticatedSupabase2 = getSupabaseClientWithToken(testUser2Token);

      // Create plan for user 1
      const { data: user1Plan, error: user1CreateError } = await authenticatedSupabase1
        .from('workout_plans')
        .insert({
          user_id: testUser1Id,
          name: 'User 1 RLS Test Plan',
          description: 'Testing RLS at database level',
          plan_data: { exercises: [] },
          difficulty_level: 'beginner',
          estimated_duration: 30,
          ai_generated: false,
          status: 'active'
        })
        .select()
        .single();

      expect(user1CreateError).toBeNull();
      expect(user1Plan.user_id).toBe(testUser1Id);
      createdWorkoutPlanIds.push(user1Plan.id);

      // User 2 tries to read user 1's plan - should not be able to see it
      const { data: user2AttemptToRead, error: user2ReadError } = await authenticatedSupabase2
        .from('workout_plans')
        .select('*')
        .eq('id', user1Plan.id);

      // RLS should prevent user 2 from seeing user 1's plan
      expect(user2AttemptToRead).toHaveLength(0);

      // User 2 tries to update user 1's plan - should fail
      const { data: user2AttemptToUpdate, error: user2UpdateError } = await authenticatedSupabase2
        .from('workout_plans')
        .update({ name: 'Attempted Unauthorized Update' })
        .eq('id', user1Plan.id)
        .select();

      // RLS should prevent unauthorized update
      expect(user2AttemptToUpdate).toHaveLength(0);

      console.log('✅ Database RLS Policy Validation:', {
        user1PlanCreated: !!user1Plan,
        user2CannotReadUser1Plan: user2AttemptToRead.length === 0,
        user2CannotUpdateUser1Plan: user2AttemptToUpdate.length === 0,
        rlsPoliciesEnforced: true
      });
    });
  });
}); 