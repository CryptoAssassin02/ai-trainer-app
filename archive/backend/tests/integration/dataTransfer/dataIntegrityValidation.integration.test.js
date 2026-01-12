/**
 * @fileoverview Data Integrity Validation Integration Tests - Phase 2 Test Suite 2
 * Tests comprehensive data validation, schema compliance, and business rule enforcement
 * Following Phase 1 success patterns exactly with all 21 critical rules incorporated
 */

const supertest = require('supertest');
const { app } = require('../../../server'); // Rule 1: Exact server import
const path = require('path');
const fs = require('fs');
const { getSupabaseClient, getSupabaseClientWithToken } = require('../../../services/supabase'); // Rule 1: Exact service imports

// Rule 1: Use admin client for cleanup ONLY (Phase 1 pattern)
const { createClient } = require('@supabase/supabase-js');
const adminSupabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

describe('Data Integrity Validation Tests - Real Database & Service Validation', () => {
  let testUserId, testUserToken;
  let createdWorkoutPlanIds = [];
  let createdWorkoutLogIds = [];
  let tempFilePaths = [];

  const supabase = getSupabaseClient();

  beforeAll(async () => {
    // Rule 11: ALWAYS verify test-environment aware rate limiting
    console.log('🔍 Verifying rate limiting configuration for test environment...');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    // Rule 2: ALWAYS use real auth endpoints for user creation
    const timestamp = Date.now();
    const testUserEmail = `integritytest${timestamp}@example.com`;
    const testUserPassword = 'TestPassword123!';
    
    // Rule 13: Add comprehensive debugging at all levels
    console.log('🔍 Creating test user via real auth endpoint...', { email: testUserEmail });
    
    const signupResponse = await supertest(app)
      .post('/v1/auth/signup')
      .send({
        name: 'Integrity Test User',
        email: testUserEmail,
        password: testUserPassword
      });
    
    console.log('🔍 Signup response:', { status: signupResponse.status, hasUserId: !!signupResponse.body.userId });
    
    if (signupResponse.status !== 201) {
      throw new Error(`Failed to create test user: ${signupResponse.body.message}`);
    }
    
    testUserId = signupResponse.body.userId;
    testUserToken = signupResponse.body.accessToken;
    
    // Handle case where accessToken is not provided
    if (!testUserToken) {
      console.log('🔍 AccessToken not provided in signup, attempting login...');
      
      const loginResponse = await supertest(app)
        .post('/v1/auth/login')
        .send({ email: testUserEmail, password: testUserPassword });
      
      console.log('🔍 Login response:', { status: loginResponse.status, hasToken: !!loginResponse.body.jwtToken });
      
      if (loginResponse.status !== 200) {
        throw new Error(`Failed to login test user: ${loginResponse.body.message}`);
      }
      testUserToken = loginResponse.body.jwtToken;
    }
    
    console.log('✅ Test user created successfully:', { userId: testUserId, hasToken: !!testUserToken });
  });

  afterAll(async () => {
    // Comprehensive cleanup using admin client following Phase 1 pattern
    if (testUserId) {
      try {
        console.log('🧹 Starting comprehensive cleanup...');
        
        // Clean up test workout plans
        if (createdWorkoutPlanIds.length > 0) {
          await adminSupabase.from('workout_plans').delete().in('id', createdWorkoutPlanIds);
          console.log('🧹 Cleaned up workout plans:', createdWorkoutPlanIds.length);
        }
        
        // Clean up test workout logs
        if (createdWorkoutLogIds.length > 0) {
          await adminSupabase.from('workout_logs').delete().in('id', createdWorkoutLogIds);
          console.log('🧹 Cleaned up workout logs:', createdWorkoutLogIds.length);
        }
        
        // Clean up user profile
        await adminSupabase.from('user_profiles').delete().eq('user_id', testUserId);
        console.log('🧹 Cleaned up user profile');
        
        // Rule 18: Clean up test files
        tempFilePaths.forEach(filePath => {
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log('🧹 Cleaned up temp file:', path.basename(filePath));
            }
          } catch (error) {
            console.log('🧹 File cleanup warning:', error.message);
          }
        });
        
      } catch (error) {
        console.log('Cleanup error (non-critical):', error.message);
      }
    }
  });

  // Rule 3: ALWAYS use camelCase field names in profile creation
  async function ensureUserProfile(profileOverrides = {}) {
    const defaultProfile = {
      height: 175,
      weight: 70,
      age: 30,
      gender: 'male',
      unitPreference: 'metric',      // Rule 3: camelCase, not unit_preference
      goals: ['strength'],           // Rule 3: goals, not fitness_goals
      equipment: ['bodyweight'],     // Rule 3: equipment, not equipment_access
      experienceLevel: 'intermediate', // Rule 3: camelCase, not experience_level
      medicalConditions: ['none']    // Rule 3: array of strings, not objects
    };

    const profileData = { ...defaultProfile, ...profileOverrides };
    
    console.log('🔍 Creating user profile with camelCase fields...', Object.keys(profileData));

    const profileResponse = await supertest(app)
      .post('/v1/profile')
      .set('Authorization', `Bearer ${testUserToken}`)
      .send(profileData);
    
    console.log('🔍 Profile creation response:', { status: profileResponse.status, hasData: !!profileResponse.body.data });
    
    if (![200, 201].includes(profileResponse.status)) {
      throw new Error(`Failed to create user profile: ${profileResponse.body.message || 'Unknown error'}`);
    }
    return profileResponse.body.data;
  }

  // Helper function to create test workout plan with correct schema (Rule 6)
  async function createTestWorkoutPlan(overrides = {}) {
    const defaultPlan = {
      name: 'Integrity Validation Test Plan',
      description: 'Plan for data integrity validation testing',
      plan_data: {  // Rule 9: Correct schema field (object, not string)
        exercises: [
          {
            name: 'Data Validation Push-ups',
            sets: 3,
            reps: '10-12',
            notes: 'Schema validation test exercise'
          },
          {
            name: 'Integrity Test Squats',
            sets: 4,
            reps: '15-20',  
            notes: 'Business rule validation exercise'
          }
        ]
      },
      difficulty_level: 'intermediate', // Rule 6: Correct database field name
      estimated_duration: 45,
      ai_generated: false,
      status: 'active',
      ...overrides
    };

    // Use authenticated client for RLS compliance (Rule 7)
    const authenticatedSupabase = getSupabaseClientWithToken(testUserToken);
    
    console.log('🔍 Creating workout plan with correct schema...', { name: defaultPlan.name });
    
    const { data, error } = await authenticatedSupabase
      .from('workout_plans') // Rule 6: Correct table name
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
      console.log('❌ Workout plan creation error:', error);
      throw new Error(`Failed to create workout plan: ${error.message}`);
    }

    createdWorkoutPlanIds.push(data.id);
    console.log('✅ Created workout plan:', { id: data.id, name: data.name });
    return data;
  }

  // Rule 18: ALWAYS sanitize malicious filenames in test helper functions
  function createTestFile(content, filename, mimeType = 'application/json') {
    // CRITICAL: Sanitize filename to prevent filesystem errors
    const safeFilename = filename.replace(/[\/\\]/g, '_').replace(/\.\./g, '__').replace(/[<>:"|?*]/g, '_');
    const tempFilePath = path.join(__dirname, '../../temp', safeFilename);
    
    // Ensure temp directory exists
    const tempDir = path.dirname(tempFilePath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    console.log('🔍 Creating test file:', { originalName: filename, safeName: safeFilename, size: content?.length, contentType: typeof content });
    
    // Handle different content types properly (Rule 21)
    let fileContent;
    if (Buffer.isBuffer(content)) {
      fileContent = content;
    } else if (typeof content === 'string') {
      fileContent = content;
    } else if (typeof content === 'object' && content !== null) {
      fileContent = JSON.stringify(content);
      console.log('⚠️ Converting object content to JSON string for file creation');
    } else {
      console.log('❌ Cannot create file - invalid content type:', typeof content);
      return null;
    }
    
    try {
      fs.writeFileSync(tempFilePath, fileContent);
      tempFilePaths.push(tempFilePath);
      
      console.log('✅ Test file created:', { path: tempFilePath, exists: fs.existsSync(tempFilePath) });
      return tempFilePath;
    } catch (error) {
      console.log('❌ Failed to create test file:', error.message);
      return null;
    }
  }

  describe('Task 1: Schema Validation Excellence - Rule 12 Compliance', () => {
    beforeEach(async () => {
      await ensureUserProfile();
    });

    // Rule 12: ALWAYS use Supabase MCP tools for schema verification BEFORE testing
    test('When validating schema, Then should verify actual database structure first', async () => {
      // MANDATORY: This test validates that we're following Rule 12 pattern
      console.log('🔍 Verifying actual database schema compliance...');
      
      await createTestWorkoutPlan({
        name: 'Schema Validation Test Plan',
        description: 'Validates correct schema field usage'
      });
      
      // Rule 4: Use POST endpoint with body parameters
      console.log('🔍 About to make export request for schema validation...');
      
      const exportResponse = await supertest(app)
        .post('/v1/data-transfer/export')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          format: 'json',
          dataTypes: ['workouts'] // Rule 6: Use 'workouts' for API, 'workout_plans' for database
        });

      console.log('🔍 Export response for schema validation:', { 
        status: exportResponse.status,
        hasExportDate: !!exportResponse.body.exportDate,
        hasUserId: !!exportResponse.body.userId,
        hasData: !!exportResponse.body.data
      });

      // Rule 5: Expect correct response format
      expect(exportResponse.status).toBe(200);
      expect(exportResponse.body.exportDate).toBeDefined();
      expect(exportResponse.body.userId).toBe(testUserId);
      expect(exportResponse.body.data).toBeDefined();
      expect(Array.isArray(exportResponse.body.data.workouts)).toBe(true);
      expect(exportResponse.body.data.workouts.length).toBeGreaterThan(0);

      // Validate exported data contains correct schema fields
      const exportedPlan = exportResponse.body.data.workouts.find(p => p.name === 'Schema Validation Test Plan');
      expect(exportedPlan).toBeDefined();
      expect(exportedPlan.difficulty_level).toBe('intermediate'); // Rule 6: Correct database field name
      expect(typeof exportedPlan.plan_data).toBe('object'); // Rule 9: Correct field type
      expect(Array.isArray(exportedPlan.plan_data.exercises)).toBe(true);

      console.log('✅ Schema Validation Excellence:', {
        exportedPlans: exportResponse.body.data.workouts.length,
        correctDifficultyField: exportedPlan.difficulty_level === 'intermediate',
        correctPlanDataType: typeof exportedPlan.plan_data === 'object',
        hasExercisesArray: Array.isArray(exportedPlan.plan_data.exercises)
      });
    });

    test('When validating field mapping, Then should correctly map API to database fields', async () => {
      // Create profile with API field names and verify database mapping
      const testProfile = await ensureUserProfile({
        unitPreference: 'imperial', // API field
        goals: ['muscle_gain', 'endurance'], // API field
        experienceLevel: 'advanced' // API field
      });

      // Export and verify the field mapping is maintained correctly
      const exportResponse = await supertest(app)
        .post('/v1/data-transfer/export')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          format: 'json',
          dataTypes: ['profiles'] // Test profile field mapping
        });

      console.log('🔍 Field mapping validation response:', { 
        status: exportResponse.status,
        hasProfileData: !!exportResponse.body.data?.profiles
      });

      expect(exportResponse.status).toBe(200);
      expect(exportResponse.body.data.profiles).toBeDefined();
      expect(Array.isArray(exportResponse.body.data.profiles)).toBe(true);

      if (exportResponse.body.data.profiles.length > 0) {
        const exportedProfile = exportResponse.body.data.profiles[0];
        console.log('✅ Field Mapping Validation:', {
          hasUnitPreference: exportedProfile.hasOwnProperty('unit_preference'),
          hasGoals: exportedProfile.hasOwnProperty('fitness_goals'),
          hasExperienceLevel: exportedProfile.hasOwnProperty('experience_level'),
          unitPreferenceValue: exportedProfile.unit_preference,
          goalsValue: exportedProfile.fitness_goals,
          experienceLevelValue: exportedProfile.experience_level
        });

        // Validate that database field names are used in export
        expect(exportedProfile.unit_preference).toBe('imperial');
        expect(exportedProfile.fitness_goals).toEqual(['muscle_gain', 'endurance']);
        expect(exportedProfile.experience_level).toBe('advanced');
      }
    });
  });

  describe('Task 2: Business Rule Validation - Rule 6 Compliance', () => {
    beforeEach(async () => {
      await ensureUserProfile();
    });

    test('When validating business rules, Then should enforce data consistency', async () => {
      // Create workout plan with specific business rules
      const businessRulePlan = await createTestWorkoutPlan({
        name: 'Business Rule Test Plan',
        difficulty_level: 'beginner', // Should be consistent with user experience
        estimated_duration: 30, // Appropriate for beginner
        ai_generated: true,
        status: 'active'
      });

      console.log('🔍 Created business rule test plan:', businessRulePlan.name);

      // Test export consistency
      const exportResponse = await supertest(app)
        .post('/v1/data-transfer/export')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          format: 'json',
          dataTypes: ['workouts']
        });

      expect(exportResponse.status).toBe(200);
      const exportedPlan = exportResponse.body.data.workouts.find(p => p.name === 'Business Rule Test Plan');
      expect(exportedPlan).toBeDefined();

      // Validate business rule consistency
      expect(exportedPlan.difficulty_level).toBe('beginner');
      expect(exportedPlan.estimated_duration).toBe(30);
      expect(exportedPlan.ai_generated).toBe(true);
      expect(exportedPlan.status).toBe('active');

      console.log('✅ Business Rule Validation:', {
        correctDifficulty: exportedPlan.difficulty_level === 'beginner',
        appropriateDuration: exportedPlan.estimated_duration === 30,
        aiGeneratedFlag: exportedPlan.ai_generated === true,
        activeStatus: exportedPlan.status === 'active'
      });
    });

    test('When validating complex data types, Then should handle JSON fields correctly', async () => {
      // Test complex plan_data structure
      const complexPlan = await createTestWorkoutPlan({
        name: 'Complex Data Structure Plan',
        plan_data: {
          exercises: [
            {
              name: 'Complex Exercise 1',
              sets: 3,
              reps: '8-12',
              notes: 'Complex exercise with detailed instructions',
              equipment: ['dumbbells', 'bench'],
              muscle_groups: ['chest', 'triceps']
            },
            {
              name: 'Complex Exercise 2',
              sets: 4,
              reps: '10-15',
              notes: 'Another complex exercise',
              equipment: ['barbell'],
              muscle_groups: ['legs', 'glutes']
            }
          ],
          rest_periods: {
            between_sets: 60,
            between_exercises: 120
          },
          progression: {
            type: 'linear',
            increment: 2.5
          }
        }
      });

      const exportResponse = await supertest(app)
        .post('/v1/data-transfer/export')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          format: 'json',
          dataTypes: ['workouts']
        });

      expect(exportResponse.status).toBe(200);
      const exportedPlan = exportResponse.body.data.workouts.find(p => p.name === 'Complex Data Structure Plan');
      expect(exportedPlan).toBeDefined();

      // Validate complex JSON structure preservation
      expect(typeof exportedPlan.plan_data).toBe('object');
      expect(Array.isArray(exportedPlan.plan_data.exercises)).toBe(true);
      expect(exportedPlan.plan_data.exercises).toHaveLength(2);
      expect(exportedPlan.plan_data.rest_periods).toBeDefined();
      expect(exportedPlan.plan_data.progression).toBeDefined();

      console.log('✅ Complex Data Type Validation:', {
        planDataIsObject: typeof exportedPlan.plan_data === 'object',
        exercisesCount: exportedPlan.plan_data.exercises.length,
        hasRestPeriods: !!exportedPlan.plan_data.rest_periods,
        hasProgression: !!exportedPlan.plan_data.progression,
        exerciseStructure: exportedPlan.plan_data.exercises[0]
      });
    });
  });

  describe('Task 3: Data Transformation Accuracy - Rule 20 Compliance', () => {
    beforeEach(async () => {
      await ensureUserProfile();
    });

    test('When processing import data, Then should inject user_id before validation', async () => {
      // Rule 16: Use correct JSON structure for import
      const importData = {
        data: {
          workouts: [
            {
              // Rule 20: user_id will be injected BEFORE validation by import service
              name: 'Import Validation Test Plan',
              description: 'Tests user_id injection timing',
              plan_data: {
                exercises: [
                  {
                    name: 'Import Test Exercise',
                    sets: 3,
                    reps: '10-12',
                    notes: 'Test exercise for import validation'
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

      const testFile = createTestFile(JSON.stringify(importData), 'import-validation.json');
      expect(testFile).not.toBeNull();

      console.log('🔍 About to test import with user_id injection...');

      const importResponse = await supertest(app)
        .post('/v1/data-transfer/import')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', testFile);

      console.log('🔍 Import response for user_id injection test:', {
        status: importResponse.status,
        hasBody: !!importResponse.body,
        responseKeys: importResponse.body ? Object.keys(importResponse.body) : null
      });

      // Import should succeed because user_id is injected before validation
      expect([200, 201]).toContain(importResponse.status);

      if (importResponse.status === 200 || importResponse.status === 201) {
        expect(importResponse.body.status).toBe('success');
        expect(importResponse.body.data.successful).toBeGreaterThan(0);

        console.log('✅ User ID Injection Validation:', {
          importSuccessful: importResponse.body.status === 'success',
          itemsProcessed: importResponse.body.data.successful,
          validationPassed: true
        });
      }
    });

    test('When validating import structure, Then should handle nested JSON correctly', async () => {
      // Test that nested JSON structures are preserved during import/export cycle
      const nestedData = {
        data: {
          workouts: [
            {
              name: 'Nested Structure Test',
              description: 'Tests nested JSON preservation',
              plan_data: {
                exercises: [
                  {
                    name: 'Nested Exercise',
                    sets: 3,
                    reps: '8-10',
                    advanced_config: {
                      tempo: '2-1-2-1',
                      rest_pause: true,
                      drop_set: {
                        enabled: true,
                        drops: 2,
                        percentage: 20
                      }
                    }
                  }
                ]
              },
              difficulty_level: 'advanced',
              estimated_duration: 45,
              ai_generated: false,
              status: 'active'
            }
          ]
        }
      };

      const testFile = createTestFile(JSON.stringify(nestedData), 'nested-structure.json');
      expect(testFile).not.toBeNull();

      // Import the nested structure
      const importResponse = await supertest(app)
        .post('/v1/data-transfer/import')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', testFile);

      console.log('🔍 Nested structure import response:', {
        status: importResponse.status,
        successful: importResponse.body?.data?.successful
      });

      expect([200, 201]).toContain(importResponse.status);

      // Export and verify structure preservation
      const exportResponse = await supertest(app)
        .post('/v1/data-transfer/export')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          format: 'json',
          dataTypes: ['workouts']
        });

      expect(exportResponse.status).toBe(200);
      const exportedPlan = exportResponse.body.data.workouts.find(p => p.name === 'Nested Structure Test');
      
      if (exportedPlan) {
        expect(exportedPlan.plan_data.exercises[0].advanced_config).toBeDefined();
        expect(exportedPlan.plan_data.exercises[0].advanced_config.drop_set.enabled).toBe(true);

        console.log('✅ Nested JSON Structure Validation:', {
          structurePreserved: !!exportedPlan.plan_data.exercises[0].advanced_config,
          dropSetConfig: exportedPlan.plan_data.exercises[0].advanced_config.drop_set,
          tempoPreserved: exportedPlan.plan_data.exercises[0].advanced_config.tempo === '2-1-2-1'
        });
      }
    });
  });

  describe('Task 4: Referential Integrity - Rule 14 Compliance', () => {
    beforeEach(async () => {
      await ensureUserProfile();
    });

    test('When processing dependent data, Then should maintain foreign key relationships', async () => {
      // Rule 14: Process in dependency order - profiles, workouts, workout_logs
      const plan = await createTestWorkoutPlan({
        name: 'Referential Integrity Test Plan'
      });

      // Create workout log that references the plan
      const authenticatedSupabase = getSupabaseClientWithToken(testUserToken);
      
      const { data: logData, error: logError } = await authenticatedSupabase
        .from('workout_logs')
        .insert({
          user_id: testUserId,
          plan_id: plan.id, // Foreign key reference
          date: '2024-01-15',
          exercises_completed: JSON.stringify([
            {
              exerciseName: 'Test Exercise',
              setsCompleted: [
                { weightUsed: 50, repsCompleted: 10 },
                { weightUsed: 50, repsCompleted: 9 },
                { weightUsed: 50, repsCompleted: 8 }
              ]
            }
          ]),
          feedback: 'Referential integrity test log'
        })
        .select()
        .single();

      if (logError) {
        throw new Error(`Failed to create workout log: ${logError.message}`);
      }

      createdWorkoutLogIds.push(logData.id);
      console.log('✅ Created workout log with foreign key reference');

      // Export and verify referential integrity is maintained
      const exportResponse = await supertest(app)
        .post('/v1/data-transfer/export')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          format: 'json',
          dataTypes: ['workouts', 'workout_logs']
        });

      expect(exportResponse.status).toBe(200);
      expect(exportResponse.body.data.workouts).toBeDefined();
      expect(exportResponse.body.data.workout_logs).toBeDefined();

      const exportedPlan = exportResponse.body.data.workouts.find(p => p.id === plan.id);
      const exportedLog = exportResponse.body.data.workout_logs.find(l => l.plan_id === plan.id);

      expect(exportedPlan).toBeDefined();
      expect(exportedLog).toBeDefined();
      expect(exportedLog.plan_id).toBe(exportedPlan.id);

      console.log('✅ Referential Integrity Validation:', {
        planExported: !!exportedPlan,
        logExported: !!exportedLog,
        foreignKeyPreserved: exportedLog.plan_id === exportedPlan.id,
        planId: exportedPlan.id,
        logPlanId: exportedLog.plan_id
      });
    });
  });

  describe('Task 5: Validation Error Reporting - Rule 13 Compliance', () => {
    beforeEach(async () => {
      await ensureUserProfile();
    });

    test('When encountering validation errors, Then should provide comprehensive debugging', async () => {
      // Rule 13: Add comprehensive debugging at all levels
      console.log('🔍 Testing validation error reporting with invalid data...');

      // Create invalid import data that should trigger validation errors
      const invalidData = {
        data: {
          workouts: [
            {
              // Missing required fields to trigger validation
              name: '', // Invalid empty name
              description: 'Invalid test plan',
              plan_data: 'invalid_json_string', // Should be object, not string
              difficulty_level: 'invalid_difficulty', // Invalid enum value
              estimated_duration: -30, // Invalid negative duration
              status: 'invalid_status' // Invalid status
            }
          ]
        }
      };

      const testFile = createTestFile(JSON.stringify(invalidData), 'invalid-data.json');
      expect(testFile).not.toBeNull();

      console.log('🔍 About to test import with invalid data for error reporting...');

      const importResponse = await supertest(app)
        .post('/v1/data-transfer/import')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', testFile);

      console.log('🔍 Import response for validation error test:', {
        status: importResponse.status,
        hasErrorMessage: !!importResponse.body?.message,
        errorDetails: importResponse.body?.errors || importResponse.body?.data?.failed
      });

      // Should fail with validation errors
      expect([400, 422]).toContain(importResponse.status);

      if (importResponse.body) {
        // Should provide comprehensive error information
        expect(importResponse.body.message || importResponse.body.error).toBeDefined();

        console.log('✅ Validation Error Reporting:', {
          statusCode: importResponse.status,
          hasErrorMessage: !!(importResponse.body.message || importResponse.body.error),
          errorResponse: importResponse.body,
          comprehensiveDebugging: true
        });
      }
    });

    test('When processing malformed JSON, Then should handle gracefully with debugging', async () => {
      // Test malformed JSON handling
      const malformedJson = '{ "data": { "workouts": [ { "name": "test", "incomplete": ';

      const testFile = createTestFile(malformedJson, 'malformed.json');
      expect(testFile).not.toBeNull();

      console.log('🔍 Testing malformed JSON handling...');

      const importResponse = await supertest(app)
        .post('/v1/data-transfer/import')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', testFile);

      console.log('🔍 Malformed JSON response:', {
        status: importResponse.status,
        errorMessage: importResponse.body?.message,
        errorType: importResponse.body?.error
      });

      // Should handle malformed JSON gracefully
      expect([400, 422]).toContain(importResponse.status);
      expect(importResponse.body.message || importResponse.body.error).toBeDefined();

      console.log('✅ Malformed JSON Handling:', {
        gracefulFailure: [400, 422].includes(importResponse.status),
        errorMessageProvided: !!(importResponse.body.message || importResponse.body.error),
        debuggingComplete: true
      });
    });
  });
}); 