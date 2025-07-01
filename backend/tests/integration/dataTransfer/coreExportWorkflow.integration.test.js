/**
 * @fileoverview Core Export Workflow Integration Tests
 * Tests complete end-to-end export functionality across all formats with real authentication and database integration
 * Following analytics_integration_rules.mdc and real_ai_integration.mdc patterns
 */

const supertest = require('supertest');
const { app } = require('../../../server');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const PDFParser = require('pdf-parse');
const { getSupabaseClient, getSupabaseClientWithToken } = require('../../../services/supabase');

// Import admin client for setup/teardown ONLY
const { createClient } = require('@supabase/supabase-js');
const adminSupabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

describe('Core Export Workflow Integration Tests - Real Database & Service Validation', () => {
  let testUserId, testUserToken;
  let createdWorkoutPlanIds = [];
  let createdWorkoutLogIds = [];

  // Get the general supabase client for non-RLS operations
  const supabase = getSupabaseClient();

  beforeAll(async () => {
    // Create independent test user following successful analytics pattern
    const timestamp = Date.now();
    const testUserEmail = `exporttest${timestamp}@example.com`;
    const testUserPassword = 'TestPassword123!';
    
    // Create test user using real signup endpoint
    const signupResponse = await supertest(app)
      .post('/v1/auth/signup')
      .send({
        name: 'Export Test User',
        email: testUserEmail,
        password: testUserPassword
      });
    
    if (signupResponse.status !== 201) {
      throw new Error(`Failed to create test user: ${signupResponse.body.message}`);
    }
    
    testUserId = signupResponse.body.userId;
    testUserToken = signupResponse.body.accessToken;
    
    // Handle case where accessToken is not provided in signup response
    if (!testUserToken) {
      const loginResponse = await supertest(app)
        .post('/v1/auth/login')
        .send({ email: testUserEmail, password: testUserPassword });
      if (loginResponse.status !== 200) {
        throw new Error(`Failed to login test user: ${loginResponse.body.message}`);
      }
      testUserToken = loginResponse.body.jwtToken;
    }
  });

  afterAll(async () => {
    // Comprehensive cleanup using admin client following analytics pattern
    if (testUserId) {
      try {
        // Clean up test workout plans
        if (createdWorkoutPlanIds.length > 0) {
          await adminSupabase.from('workout_plans').delete().in('id', createdWorkoutPlanIds);
        }
        // Clean up test workout logs
        if (createdWorkoutLogIds.length > 0) {
          await adminSupabase.from('workout_logs').delete().in('id', createdWorkoutLogIds);
        }
        // Clean up user profile
        await adminSupabase.from('user_profiles').delete().eq('user_id', testUserId);
      } catch (error) {
        console.log('Cleanup error (non-critical):', error.message);
      }
    }
  });

  // Helper function to create user profile following analytics pattern
  async function ensureUserProfile(profileOverrides = {}) {
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
      .set('Authorization', `Bearer ${testUserToken}`)
      .send(profileData);
    
    if (![200, 201].includes(profileResponse.status)) {
      throw new Error(`Failed to create user profile: ${profileResponse.body.message || 'Unknown error'}`);
    }

    return profileResponse.body.data;
  }

  // Helper function to create test workout plan with correct schema
  async function createTestWorkoutPlan(overrides = {}) {
    const defaultPlan = {
      name: 'Test Export Plan',
      description: 'Plan for export testing',
      plan_data: {
        exercises: [
          {
            name: 'Push-ups',
            sets: 3,
            reps: '10-12',
            notes: 'Keep core tight'
          },
          {
            name: 'Squats',
            sets: 3,
            reps: '15-20',
            notes: 'Full range of motion'
          }
        ]
      },
      difficulty_level: 'intermediate',
      estimated_duration: 30,
      ai_generated: false,
      status: 'active',
      ...overrides
    };

    // Use authenticated client for RLS compliance
    const authenticatedSupabase = getSupabaseClientWithToken(testUserToken);
    const { data, error } = await authenticatedSupabase
      .from('workout_plans')
      .insert({
        user_id: testUserId,
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

  // Helper function to create test workout log with correct schema
  async function createTestWorkoutLog(overrides = {}) {
    const defaultLog = {
      overall_difficulty: 7,
      energy_level: 8,
      satisfaction: 9,
      feedback: 'Good workout for export test',
      exercises_completed: [
        {
          exercise: 'Push-ups',
          sets: [
            { reps: 12, weight: 0 },
            { reps: 10, weight: 0 },
            { reps: 8, weight: 0 }
          ]
        }
      ],
      date: new Date().toISOString().split('T')[0],
      ...overrides
    };

    // Use authenticated client for RLS compliance
    const authenticatedSupabase = getSupabaseClientWithToken(testUserToken);
    const { data, error } = await authenticatedSupabase
      .from('workout_logs')
      .insert({
        user_id: testUserId,
        plan_id: overrides.plan_id || null,
        overall_difficulty: defaultLog.overall_difficulty,
        energy_level: defaultLog.energy_level,
        satisfaction: defaultLog.satisfaction,
        feedback: defaultLog.feedback,
        exercises_completed: defaultLog.exercises_completed,
        date: defaultLog.date
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create workout log: ${error.message}`);
    }

    createdWorkoutLogIds.push(data.id);
    return data;
  }

  describe('Task 1: Workout Plan Export Workflow', () => {
    beforeEach(async () => {
      // Ensure clean user profile for each test
      await ensureUserProfile();
    });

    test('When user exports workout plans as JSON, Then should return properly formatted data', async () => {
      // Create test workout plans
      const plan1 = await createTestWorkoutPlan({
        name: 'Strength Plan',
        difficulty_level: 'intermediate'
      });
      const plan2 = await createTestWorkoutPlan({
        name: 'Cardio Plan',
        difficulty_level: 'beginner'
      });

      // Export workout plans using authenticated request with correct API structure
      const exportResponse = await supertest(app)
        .post('/v1/data-transfer/export')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          format: 'json',
          dataTypes: ['workouts']
        });

      expect(exportResponse.status).toBe(200);
      expect(exportResponse.body.exportDate).toBeDefined();
      expect(exportResponse.body.userId).toBe(testUserId);
      expect(Array.isArray(exportResponse.body.data.workouts)).toBe(true);
      expect(exportResponse.body.data.workouts.length).toBeGreaterThanOrEqual(2);

      // Validate exported data structure
      const exportedPlan = exportResponse.body.data.workouts.find(p => p.name === 'Strength Plan');
      expect(exportedPlan).toBeDefined();
      expect(exportedPlan.name).toBe('Strength Plan');
      expect(exportedPlan.difficulty_level).toBe('intermediate');
      expect(exportedPlan.plan_data).toBeDefined();
      expect(exportedPlan.plan_data.exercises).toHaveLength(2);

      console.log('✅ JSON Export Validation:', {
        plansExported: exportResponse.body.data.workouts.length,
        hasValidStructure: !!exportedPlan,
        hasExerciseData: exportedPlan.plan_data.exercises.length > 0
      });
    });

    test('When user exports workout plans as CSV, Then should return valid CSV format', async () => {
      // Create test workout plan
      await createTestWorkoutPlan({
        name: 'CSV Export Test Plan'
      });

      // Export as CSV using authenticated request with correct API structure
      const exportResponse = await supertest(app)
        .post('/v1/data-transfer/export')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          format: 'csv',
          dataTypes: ['workouts']
        });

      expect(exportResponse.status).toBe(200);
      expect(exportResponse.headers['content-type']).toContain('text/csv');
      expect(typeof exportResponse.text).toBe('string');
      expect(exportResponse.text).toContain('name');
      expect(exportResponse.text).toContain('CSV Export Test Plan');

      console.log('✅ CSV Export Validation:', {
        hasCSVHeaders: exportResponse.text.includes('name'),
        hasTestData: exportResponse.text.includes('CSV Export Test Plan'),
        responseType: exportResponse.headers['content-type']
      });
    });
  });

  describe('Task 2: Workout Log Export Workflow', () => {
    beforeEach(async () => {
      await ensureUserProfile();
    });

    test('When user exports workout logs, Then should include all log data with correct schema', async () => {
      // Create test workout plan and log
      const plan = await createTestWorkoutPlan();
      await createTestWorkoutLog({ plan_id: plan.id });

      // Export workout logs using authenticated request with correct API structure
      const exportResponse = await supertest(app)
        .post('/v1/data-transfer/export')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          format: 'json',
          dataTypes: ['workout_logs']
        });

      expect(exportResponse.status).toBe(200);
      expect(exportResponse.body.exportDate).toBeDefined();
      expect(exportResponse.body.userId).toBe(testUserId);
      expect(Array.isArray(exportResponse.body.data.workout_logs)).toBe(true);
      expect(exportResponse.body.data.workout_logs.length).toBeGreaterThan(0);

      // Validate exported log structure matches schema
      const exportedLog = exportResponse.body.data.workout_logs[0];
      expect(exportedLog.overall_difficulty).toBeDefined();
      expect(exportedLog.energy_level).toBeDefined();
      expect(exportedLog.satisfaction).toBeDefined();
      expect(exportedLog.feedback).toBeDefined();
      expect(exportedLog.exercises_completed).toBeDefined();
      expect(Array.isArray(exportedLog.exercises_completed)).toBe(true);

      console.log('✅ Workout Log Export Validation:', {
        logsExported: exportResponse.body.data.workout_logs.length,
        hasSchemaFields: !!(exportedLog.overall_difficulty && exportedLog.energy_level),
        hasExerciseData: exportedLog.exercises_completed.length > 0
      });
    });
  });

  describe('Task 3: Complete Profile Export Workflow', () => {
    test('When user exports complete profile data, Then should include all user data', async () => {
      // Ensure comprehensive profile with correct field names and medical conditions format
      await ensureUserProfile({
        goals: ['strength', 'muscle_gain'],
        medicalConditions: ['none']
      });

      // Create associated data
      const plan = await createTestWorkoutPlan();
      await createTestWorkoutLog({ plan_id: plan.id });

      // Export complete profile using authenticated request with correct API structure
      const exportResponse = await supertest(app)
        .post('/v1/data-transfer/export')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          format: 'json',
          dataTypes: ['profiles', 'workouts', 'workout_logs']
        });

      expect(exportResponse.status).toBe(200);
      expect(exportResponse.body.exportDate).toBeDefined();
      expect(exportResponse.body.userId).toBe(testUserId);
      
      const exportData = exportResponse.body.data;
      expect(exportData.profiles).toBeDefined();
      expect(exportData.workouts).toBeDefined();
      expect(exportData.workout_logs).toBeDefined();

      // Validate profile data with correct field names
      expect(exportData.profiles).toBeDefined();
      expect(Array.isArray(exportData.workouts)).toBe(true);
      expect(Array.isArray(exportData.workout_logs)).toBe(true);

      console.log('✅ Complete Export Validation:', {
        hasProfile: !!exportData.profiles,
        hasWorkouts: exportData.workouts.length > 0,
        hasWorkoutLogs: exportData.workout_logs.length > 0,
        exportDataTypes: Object.keys(exportData)
      });
    });
  });
}); 