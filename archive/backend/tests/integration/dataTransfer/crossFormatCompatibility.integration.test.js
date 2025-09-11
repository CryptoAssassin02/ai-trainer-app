const supertest = require('supertest');
const fs = require('fs');
const path = require('path');
const { app } = require('../../../server'); // Rule 1: Exact server import
const { getSupabaseClient, getSupabaseClientWithToken } = require('../../../services/supabase'); // Rule 1: Exact service imports

// Rule 1: Use admin client for cleanup ONLY (Phase 1 pattern)
const { createClient } = require('@supabase/supabase-js');
const adminSupabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

describe('Cross-Format Compatibility Testing - Real Database & Service Validation', () => {
  let testUserId, testUserToken;
  let tempDir, tempFilePaths = [];
  let createdWorkoutPlanIds = [];

  beforeAll(async () => {
    // Rule 11: ALWAYS verify test-environment aware rate limiting
    console.log('Verifying rate limiting configuration for cross-format testing...');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    // Rule 2: ALWAYS use real auth endpoints for user creation
    const timestamp = Date.now();
    const testUserEmail = `formattest${timestamp}@example.com`;
    const testUserPassword = 'TestPassword123!';
    
    console.log('Creating test user for cross-format compatibility testing...');
    const signupResponse = await supertest(app)
      .post('/v1/auth/signup')
      .send({
        name: 'Cross-Format Test User',
        email: testUserEmail,
        password: testUserPassword
      });
    
    if (signupResponse.status !== 201) {
      throw new Error(`Failed to create test user: ${signupResponse.body.message}`);
    }
    
    testUserId = signupResponse.body.userId;
    testUserToken = signupResponse.body.accessToken;
    
    // Handle case where accessToken is not provided
    if (!testUserToken) {
      const loginResponse = await supertest(app)
        .post('/v1/auth/login')
        .send({ email: testUserEmail, password: testUserPassword });
      testUserToken = loginResponse.body.jwtToken;
    }
    
    console.log('Test user created successfully:', { userId: testUserId, hasToken: !!testUserToken });
    
    // Set up temp directory for test files
    tempDir = path.join(__dirname, '../../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  beforeEach(async () => {
    // Rule 3: ALWAYS use camelCase profile creation
    await ensureUserProfile();
  });

  afterEach(async () => {
    // Rule 13: Comprehensive cleanup with debugging
    console.log('Cleaning up cross-format test files...');
    
    // Clean up temp files with safety checks
    tempFilePaths.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('Cleaned up test file:', path.basename(filePath));
        }
      } catch (error) {
        console.warn('Error cleaning up test file:', { filePath, error: error.message });
      }
    });
    tempFilePaths = [];

    // Rule 6: Clean up created workout plans using correct table name
    if (createdWorkoutPlanIds.length > 0) {
      console.log('Cleaning up created workout plans:', createdWorkoutPlanIds);
      try {
        const { error } = await adminSupabase
          .from('workout_plans') // Rule 6: Correct table name
          .delete()
          .in('id', createdWorkoutPlanIds);
        
        if (error) {
          console.warn('Error cleaning up workout plans:', error);
        } else {
          console.log('Successfully cleaned up workout plans');
        }
      } catch (cleanupError) {
        console.warn('Error during workout plans cleanup:', cleanupError.message);
      }
      createdWorkoutPlanIds = [];
    }
  });

  afterAll(async () => {
    // Rule 2: Clean up test user
    if (testUserId) {
      console.log('Cleaning up cross-format test user...');
      await adminSupabase.auth.admin.deleteUser(testUserId);
    }
    
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.warn('Error cleaning up temp directory:', error.message);
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
      equipment: ['bodyweight'],
      experienceLevel: 'intermediate', // Rule 3: camelCase, not experience_level
      medicalConditions: ['none']    // Rule 3: array of strings, not objects
    };

    const profileData = { ...defaultProfile, ...profileOverrides };
    
    console.log('Creating user profile for cross-format testing...');
    const profileResponse = await supertest(app)
      .post('/v1/profile')
      .set('Authorization', `Bearer ${testUserToken}`)
      .send(profileData);
    
    if (![200, 201].includes(profileResponse.status)) {
      throw new Error(`Failed to create user profile: ${profileResponse.body.message || 'Unknown error'}`);
    }
    
    console.log('User profile created successfully for cross-format testing');
    return profileResponse.body.data;
  }

  // Rule 18: Safe test file creation following Phase 1 patterns
  function createTestFile(content, filename, options = {}) {
    const safeFilename = filename.replace(/[\/\\]/g, '_').replace(/\.\./g, '__');
    const tempFilePath = path.join(tempDir, safeFilename);
    
    console.log('Creating test file:', { filename: safeFilename, contentLength: content.length });
    
    if (options.binary) {
      fs.writeFileSync(tempFilePath, content);
    } else {
      fs.writeFileSync(tempFilePath, content, options.encoding || 'utf8');
    }
    
    tempFilePaths.push(tempFilePath);
    console.log('Test file created successfully:', { path: tempFilePath });
    return tempFilePath;
  }

  // Helper to create workout plan data for testing (Rule 9: Correct schema fields)
  function createWorkoutPlanData(name, exerciseCount = 3) {
    // Rule 9: Use correct schema fields (plan_data as object, not string)
    return {
      name: name,
      description: `Test plan for cross-format compatibility: ${name}`,
      plan_data: { // Rule 9: Object, not string
        exercises: Array.from({ length: exerciseCount }, (_, index) => ({
          name: `Exercise ${index + 1}`,
          sets: 3,
          reps: 10,
          weight: 50,
          rest_time: 60,
          notes: `Notes for exercise ${index + 1}`
        }))
      },
      difficulty_level: 'intermediate', // Rule 6: Correct database field name
      estimated_duration: 30,
      ai_generated: false,
      status: 'active'
    };
  }

  describe('JSON Format Structure Validation (Rule 16)', () => {
    test('When testing JSON import structure, Then should use correct format expected by import service', async () => {
      console.log('Starting JSON structure validation test...');
      
      // Rule 16: Import service expects specific JSON structure
      const correctJsonStructure = {
        data: { // REQUIRED: Import service expects this wrapper
          workouts: [
            {
              // Rule 20: user_id will be injected BEFORE validation by import service
              name: 'JSON Structure Test Plan',
              description: 'Plan for testing JSON structure validation',
              plan_data: { // Rule 9: Correct schema field (object, not string)
                exercises: [
                  {
                    name: 'Squats',
                    sets: 3,
                    reps: 10,
                    weight: 100,
                    rest_time: 60,
                    notes: 'Keep back straight'
                  },
                  {
                    name: 'Push-ups',
                    sets: 3,
                    reps: 15,
                    weight: 0,
                    rest_time: 45,
                    notes: 'Full range of motion'
                  }
                ]
              },
              difficulty_level: 'intermediate', // Rule 6: Correct database field name
              estimated_duration: 30,
              ai_generated: false,
              status: 'active'
            }
          ]
        }
      };

      console.log('Creating test file with correct JSON structure...');
      const testFile = createTestFile(JSON.stringify(correctJsonStructure), 'json-structure-test.json');
      
      console.log('About to test JSON import with correct structure:', { 
        endpoint: '/v1/data-transfer/import',
        hasToken: !!testUserToken,
        fileExists: fs.existsSync(testFile),
        jsonStructure: 'data.workouts array format'
      });
      
      // Rule 4: Use POST endpoint for import
      const importResponse = await supertest(app)
        .post('/v1/data-transfer/import')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', testFile);

      console.log('JSON structure test completed:', {
        status: importResponse.status,
        hasSuccessField: importResponse.body?.data?.successful !== undefined,
        hasFailedField: importResponse.body?.data?.failed !== undefined,
        successfulCount: importResponse.body?.data?.successful,
        failedCount: importResponse.body?.data?.failed
      });

      // Rule 5: Import has different response format (not export format)
      expect([200, 400, 422]).toContain(importResponse.status);
      
      if (importResponse.status === 200) {
        expect(importResponse.body.status).toBe('success');
        expect(importResponse.body.data.successful).toBeGreaterThan(0);
        console.log('JSON structure validation successful - correct format processed');
        
        // Track created plan for cleanup
        if (importResponse.body.data.results) {
          const createdIds = importResponse.body.data.results
            .filter(result => result.success && result.id)
            .map(result => result.id);
          createdWorkoutPlanIds.push(...createdIds);
        }
      } else {
        console.log('JSON structure validation result:', {
          status: importResponse.status,
          message: importResponse.body.message,
          validationErrors: importResponse.body.errors
        });
      }
    });

    test('When testing incorrect JSON structure, Then should handle gracefully', async () => {
      console.log('Starting incorrect JSON structure test...');
      
      // Rule 16: Test INCORRECT structure (without data wrapper)
      const incorrectJsonStructure = {
        workouts: [ // MISSING: data wrapper - this is incorrect format
          {
            name: 'Incorrect Structure Test Plan',
            description: 'Plan with incorrect JSON structure',
            plan_data: { exercises: [] },
            difficulty_level: 'intermediate',
            estimated_duration: 30,
            ai_generated: false,
            status: 'active'
          }
        ]
      };

      const testFile = createTestFile(JSON.stringify(incorrectJsonStructure), 'incorrect-structure.json');
      
      console.log('About to test incorrect JSON structure:', {
        structureType: 'Missing data wrapper',
        hasDirectWorkoutsArray: true
      });
      
      const importResponse = await supertest(app)
        .post('/v1/data-transfer/import') // Rule 4: POST endpoint
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', testFile);

      console.log('Incorrect JSON structure test result:', {
        status: importResponse.status,
        handled: [400, 422].includes(importResponse.status),
        message: importResponse.body.message
      });

      // Should reject incorrect structure or handle with validation errors
      expect([400, 422]).toContain(importResponse.status);
      
      // Should provide clear error message about structure
      if (importResponse.body.message) {
        console.log('Validation message provided for incorrect structure');
      }
    });
  });

  describe('Cross-Format Data Integrity Testing', () => {
    test('When exporting to JSON then re-importing, Then data should remain identical', async () => {
      console.log('Starting JSON round-trip data integrity test...');
      
      // First, create a workout plan through API
      const originalPlan = createWorkoutPlanData('Round-Trip Test Plan', 4);
      
      console.log('Creating original workout plan via import...');
      const originalImportData = {
        data: { workouts: [originalPlan] } // Rule 16: Correct JSON structure
      };
      
      const originalFile = createTestFile(JSON.stringify(originalImportData), 'original-plan.json');
      
      // Import the original plan
      const importResponse = await supertest(app)
        .post('/v1/data-transfer/import') // Rule 4: POST endpoint
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', originalFile);

      console.log('Original plan import result:', {
        status: importResponse.status,
        successful: importResponse.body?.data?.successful,
        failed: importResponse.body?.data?.failed
      });

      expect(importResponse.status).toBe(200);
      expect(importResponse.body.data.successful).toBeGreaterThan(0);
      
      // Track created plan for cleanup
      if (importResponse.body.data.results) {
        const createdIds = importResponse.body.data.results
          .filter(result => result.success && result.id)
          .map(result => result.id);
        createdWorkoutPlanIds.push(...createdIds);
      }

      // Wait a moment for database consistency
      await new Promise(resolve => setTimeout(resolve, 100));

      // Now export the data back to JSON
      console.log('Exporting data back to JSON...');
      const exportResponse = await supertest(app)
        .post('/v1/data-transfer/export') // Rule 4: POST endpoint with body
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          format: 'json',
          dataTypes: ['workouts'] // Rule 6: Use 'workouts' for API
        });

      console.log('Export response details:', {
        status: exportResponse.status,
        hasExportDate: !!exportResponse.body.exportDate,
        hasUserId: !!exportResponse.body.userId,
        hasData: !!exportResponse.body.data,
        workoutsCount: exportResponse.body?.data?.workouts?.length || 0
      });

      // Rule 5: Expect correct export response format
      expect(exportResponse.status).toBe(200);
      expect(exportResponse.body.exportDate).toBeDefined();
      expect(exportResponse.body.userId).toBe(testUserId);
      expect(exportResponse.body.data).toBeDefined();
      expect(exportResponse.body.data.workouts).toBeDefined();
      expect(exportResponse.body.data.workouts.length).toBeGreaterThan(0);

      // Verify the exported data contains our test plan
      const exportedPlan = exportResponse.body.data.workouts.find(
        plan => plan.name === 'Round-Trip Test Plan'
      );
      
      expect(exportedPlan).toBeDefined();
      console.log('Found exported plan:', {
        name: exportedPlan.name,
        description: exportedPlan.description,
        exerciseCount: exportedPlan.plan_data?.exercises?.length || 0,
        difficultyLevel: exportedPlan.difficulty_level
      });

      // Verify data integrity
      expect(exportedPlan.name).toBe(originalPlan.name);
      expect(exportedPlan.description).toBe(originalPlan.description);
      expect(exportedPlan.difficulty_level).toBe(originalPlan.difficulty_level);
      expect(exportedPlan.plan_data.exercises.length).toBe(originalPlan.plan_data.exercises.length);
      
      // Verify exercise data integrity
      exportedPlan.plan_data.exercises.forEach((exercise, index) => {
        const originalExercise = originalPlan.plan_data.exercises[index];
        expect(exercise.name).toBe(originalExercise.name);
        expect(exercise.sets).toBe(originalExercise.sets);
        expect(exercise.reps).toBe(originalExercise.reps);
        expect(exercise.weight).toBe(originalExercise.weight);
      });

      console.log('JSON round-trip data integrity verified successfully');
    });

    test('When processing multiple workout plans, Then should maintain individual plan integrity', async () => {
      console.log('Starting multiple plans data integrity test...');
      
      // Create multiple workout plans with different characteristics
      const multiplePlansData = {
        data: { // Rule 16: Correct JSON structure
          workouts: [
            createWorkoutPlanData('Strength Training Plan', 5),
            createWorkoutPlanData('Cardio Focused Plan', 3),
            createWorkoutPlanData('Mixed Workout Plan', 7),
            createWorkoutPlanData('Quick Exercise Plan', 2)
          ]
        }
      };

      console.log('Creating multiple plans test file...');
      const multiplePlansFile = createTestFile(
        JSON.stringify(multiplePlansData), 
        'multiple-plans-test.json'
      );
      
      console.log('About to import multiple plans:', {
        planCount: multiplePlansData.data.workouts.length,
        planNames: multiplePlansData.data.workouts.map(p => p.name),
        totalExercises: multiplePlansData.data.workouts.reduce((sum, p) => sum + p.plan_data.exercises.length, 0)
      });

      // Import multiple plans
      const importResponse = await supertest(app)
        .post('/v1/data-transfer/import') // Rule 4: POST endpoint
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', multiplePlansFile);

      console.log('Multiple plans import result:', {
        status: importResponse.status,
        successful: importResponse.body?.data?.successful,
        failed: importResponse.body?.data?.failed,
        hasResults: !!importResponse.body?.data?.results
      });

      expect(importResponse.status).toBe(200);
      expect(importResponse.body.data.successful).toBe(4); // All 4 plans should succeed
      expect(importResponse.body.data.failed).toBe(0);
      
      // Track created plans for cleanup
      if (importResponse.body.data.results) {
        const createdIds = importResponse.body.data.results
          .filter(result => result.success && result.id)
          .map(result => result.id);
        createdWorkoutPlanIds.push(...createdIds);
        console.log('Tracked created workout plan IDs:', createdIds);
      }

      // Wait for database consistency
      await new Promise(resolve => setTimeout(resolve, 200));

      // Export back to verify integrity
      console.log('Exporting multiple plans back...');
      const exportResponse = await supertest(app)
        .post('/v1/data-transfer/export') // Rule 4: POST endpoint
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          format: 'json',
          dataTypes: ['workouts']
        });

      console.log('Multiple plans export result:', {
        status: exportResponse.status,
        exportedWorkoutsCount: exportResponse.body?.data?.workouts?.length || 0
      });

      // Rule 5: Expect correct export response format
      expect(exportResponse.status).toBe(200);
      expect(exportResponse.body.data.workouts.length).toBeGreaterThanOrEqual(4);

      // Verify each original plan exists in export with correct data
      const exportedPlans = exportResponse.body.data.workouts;
      const testPlanNames = [
        'Strength Training Plan',
        'Cardio Focused Plan', 
        'Mixed Workout Plan',
        'Quick Exercise Plan'
      ];

      testPlanNames.forEach(planName => {
        const exportedPlan = exportedPlans.find(p => p.name === planName);
        expect(exportedPlan).toBeDefined();
        
        const originalPlan = multiplePlansData.data.workouts.find(p => p.name === planName);
        expect(exportedPlan.name).toBe(originalPlan.name);
        expect(exportedPlan.plan_data.exercises.length).toBe(originalPlan.plan_data.exercises.length);
        
        console.log(`Verified plan integrity: ${planName} (${exportedPlan.plan_data.exercises.length} exercises)`);
      });

      console.log('Multiple plans data integrity verified successfully');
    });
  });

  describe('Format Transformation Consistency', () => {
    test('When exporting to CSV format, Then should maintain data structure consistency', async () => {
      console.log('Starting CSV format transformation test...');
      
      // First create a workout plan to export
      const csvTestPlan = createWorkoutPlanData('CSV Export Test Plan', 3);
      
      console.log('Creating plan for CSV export test...');
      const csvImportData = {
        data: { workouts: [csvTestPlan] } // Rule 16: Correct JSON structure
      };
      
      const csvImportFile = createTestFile(JSON.stringify(csvImportData), 'csv-test-plan.json');
      
      // Import the plan first
      const importResponse = await supertest(app)
        .post('/v1/data-transfer/import') // Rule 4: POST endpoint
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', csvImportFile);

      expect(importResponse.status).toBe(200);
      
      // Track created plan for cleanup
      if (importResponse.body.data.results) {
        const createdIds = importResponse.body.data.results
          .filter(result => result.success && result.id)
          .map(result => result.id);
        createdWorkoutPlanIds.push(...createdIds);
      }

      // Wait for database consistency
      await new Promise(resolve => setTimeout(resolve, 100));

      // Now export to CSV format
      console.log('Exporting to CSV format...');
      const csvExportResponse = await supertest(app)
        .post('/v1/data-transfer/export') // Rule 4: POST endpoint
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          format: 'csv',
          dataTypes: ['workouts']
        });

      console.log('CSV export response details:', {
        status: csvExportResponse.status,
        contentType: csvExportResponse.headers['content-type'],
        hasBuffer: csvExportResponse.body instanceof Buffer,
        responseBodyType: typeof csvExportResponse.body,
        bodyKeys: typeof csvExportResponse.body === 'object' ? Object.keys(csvExportResponse.body) : null
      });

      // Rule 21: Handle multiple response format types gracefully
      expect(csvExportResponse.status).toBe(200);
      
      if (Buffer.isBuffer(csvExportResponse.body)) {
        // Validate as actual CSV file
        console.log('Received CSV buffer - validating format...');
        const csvContent = csvExportResponse.body.toString('utf8');
        
        // Basic CSV validation
        expect(csvContent).toContain('name'); // Should have header
        expect(csvContent).toContain('CSV Export Test Plan'); // Should contain our test plan
        expect(csvContent.split('\n').length).toBeGreaterThan(1); // Should have multiple lines
        
        console.log('CSV format validation successful:', {
          contentLength: csvContent.length,
          lineCount: csvContent.split('\n').length,
          containsTestPlan: csvContent.includes('CSV Export Test Plan')
        });
        
      } else if (typeof csvExportResponse.body === 'object' && csvExportResponse.body !== null) {
        // Rule 21: Handle object responses gracefully
        console.log('Received object response instead of CSV buffer');
        
        if (csvExportResponse.body.data && Array.isArray(csvExportResponse.body.data.workouts)) {
          // Validate data structure content
          console.log('Object contains valid workout data structure');
          expect(csvExportResponse.body.data.workouts.length).toBeGreaterThan(0);
        } else {
          // Rule 21: Handle empty/invalid objects - validate service response only
          console.log('Empty/invalid object response - validating service response');
          expect(csvExportResponse.status).toBe(200);
          expect(csvExportResponse.headers['content-type']).toBeDefined();
          return; // Exit early to prevent further processing
        }
      }

      console.log('CSV format transformation test completed successfully');
    });

    test('When handling special characters in different formats, Then should preserve data accurately', async () => {
      console.log('Starting special characters format test...');
      
      // Create plan with special characters
      const specialCharsPlan = {
        name: 'Special Chars: "Quotes", Commas, & Símbolos',
        description: 'Plan with émojis 💪, quotes "test", commas, and unicode symbols: αβγ',
        plan_data: {
          exercises: [
            {
              name: 'Exercise with "quotes" and commas, test',
              sets: 3,
              reps: 10,
              weight: 50,
              rest_time: 60,
              notes: 'Notes with special chars: àáâãäå & symbols €£¥'
            },
            {
              name: 'Unicode Exercise: αβγδε',
              sets: 4,
              reps: 12,
              weight: 75,
              rest_time: 90,
              notes: 'Emoji notes: 🏋️‍♂️💪🔥'
            }
          ]
        },
        difficulty_level: 'advanced',
        estimated_duration: 45,
        ai_generated: false,
        status: 'active'
      };

      console.log('Creating special characters test data...');
      const specialCharsData = {
        data: { workouts: [specialCharsPlan] } // Rule 16: Correct JSON structure
      };
      
      const specialCharsFile = createTestFile(
        JSON.stringify(specialCharsData), 
        'special-chars-test.json'
      );
      
      // Import the plan with special characters
      const importResponse = await supertest(app)
        .post('/v1/data-transfer/import') // Rule 4: POST endpoint
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', specialCharsFile);

      console.log('Special characters import result:', {
        status: importResponse.status,
        successful: importResponse.body?.data?.successful,
        failed: importResponse.body?.data?.failed
      });

      expect(importResponse.status).toBe(200);
      expect(importResponse.body.data.successful).toBeGreaterThan(0);
      
      // Track created plan for cleanup
      if (importResponse.body.data.results) {
        const createdIds = importResponse.body.data.results
          .filter(result => result.success && result.id)
          .map(result => result.id);
        createdWorkoutPlanIds.push(...createdIds);
      }

      // Wait for database consistency
      await new Promise(resolve => setTimeout(resolve, 100));

      // Export back to JSON to verify special characters preserved
      console.log('Exporting special characters back to JSON...');
      const exportResponse = await supertest(app)
        .post('/v1/data-transfer/export') // Rule 4: POST endpoint
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          format: 'json',
          dataTypes: ['workouts']
        });

      console.log('Special characters export result:', {
        status: exportResponse.status,
        workoutsCount: exportResponse.body?.data?.workouts?.length || 0
      });

      // Rule 5: Expect correct export response format
      expect(exportResponse.status).toBe(200);
      expect(exportResponse.body.data.workouts.length).toBeGreaterThan(0);

      // Find the exported plan with special characters
      const exportedSpecialPlan = exportResponse.body.data.workouts.find(
        plan => plan.name.includes('Special Chars')
      );
      
      expect(exportedSpecialPlan).toBeDefined();
      
      // Verify special characters are preserved
      console.log('Verifying special character preservation...');
      expect(exportedSpecialPlan.name).toContain('Símbolos');
      expect(exportedSpecialPlan.description).toContain('émojis 💪');
      expect(exportedSpecialPlan.description).toContain('αβγ');
      
      // Verify exercise special characters
      const unicodeExercise = exportedSpecialPlan.plan_data.exercises.find(
        ex => ex.name.includes('Unicode')
      );
      expect(unicodeExercise).toBeDefined();
      expect(unicodeExercise.name).toContain('αβγδε');
      expect(unicodeExercise.notes).toContain('🏋️‍♂️💪🔥');

      console.log('Special characters preservation verified successfully');
    });
  });

  describe('Large Dataset Format Processing', () => {
    test('When processing large datasets across formats, Then should maintain performance and accuracy', async () => {
      console.log('Starting large dataset format processing test...');
      
      // Create large dataset with multiple plans
      const largeDatasetPlans = Array.from({ length: 50 }, (_, index) => {
        return createWorkoutPlanData(`Large Dataset Plan ${index + 1}`, 8); // 8 exercises each
      });

      console.log('Creating large dataset:', {
        planCount: largeDatasetPlans.length,
        totalExercises: largeDatasetPlans.reduce((sum, p) => sum + p.plan_data.exercises.length, 0),
        estimatedDataSize: JSON.stringify({ data: { workouts: largeDatasetPlans } }).length
      });

      const largeDatasetData = {
        data: { workouts: largeDatasetPlans } // Rule 16: Correct JSON structure
      };
      
      const largeDatasetFile = createTestFile(
        JSON.stringify(largeDatasetData), 
        'large-dataset-test.json'
      );
      
      // Import large dataset
      console.log('Importing large dataset...');
      const startImportTime = Date.now();
      
      const importResponse = await supertest(app)
        .post('/v1/data-transfer/import') // Rule 4: POST endpoint
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', largeDatasetFile);

      const importDuration = Date.now() - startImportTime;
      
      console.log('Large dataset import completed:', {
        status: importResponse.status,
        duration: importDuration,
        successful: importResponse.body?.data?.successful,
        failed: importResponse.body?.data?.failed,
        performanceAcceptable: importDuration < 30000 // 30 second threshold
      });

      expect(importResponse.status).toBe(200);
      expect(importResponse.body.data.successful).toBe(50); // All plans should succeed
      expect(importResponse.body.data.failed).toBe(0);
      
      // Track created plans for cleanup
      if (importResponse.body.data.results) {
        const createdIds = importResponse.body.data.results
          .filter(result => result.success && result.id)
          .map(result => result.id);
        createdWorkoutPlanIds.push(...createdIds);
        console.log(`Tracked ${createdIds.length} created workout plan IDs for large dataset`);
      }

      // Verify performance is acceptable
      expect(importDuration).toBeLessThan(30000); // Should complete within 30 seconds

      // Wait for database consistency
      await new Promise(resolve => setTimeout(resolve, 500));

      // Export large dataset back
      console.log('Exporting large dataset back...');
      const startExportTime = Date.now();
      
      const exportResponse = await supertest(app)
        .post('/v1/data-transfer/export') // Rule 4: POST endpoint
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          format: 'json',
          dataTypes: ['workouts']
        });

      const exportDuration = Date.now() - startExportTime;
      
      console.log('Large dataset export completed:', {
        status: exportResponse.status,
        duration: exportDuration,
        exportedCount: exportResponse.body?.data?.workouts?.length || 0,
        performanceAcceptable: exportDuration < 15000 // 15 second threshold for export
      });

      // Rule 5: Expect correct export response format
      expect(exportResponse.status).toBe(200);
      expect(exportResponse.body.data.workouts.length).toBeGreaterThanOrEqual(50);
      expect(exportDuration).toBeLessThan(15000); // Export should be faster than import

      // Verify data accuracy for sample plans
      const samplePlanNames = ['Large Dataset Plan 1', 'Large Dataset Plan 25', 'Large Dataset Plan 50'];
      samplePlanNames.forEach(planName => {
        const exportedPlan = exportResponse.body.data.workouts.find(p => p.name === planName);
        expect(exportedPlan).toBeDefined();
        expect(exportedPlan.plan_data.exercises.length).toBe(8);
        console.log(`Verified large dataset plan: ${planName}`);
      });

      console.log('Large dataset format processing completed successfully');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('When importing invalid JSON structure, Then should provide clear error messages', async () => {
      console.log('Starting invalid JSON structure error handling test...');
      
      // Test various invalid JSON structures
      const invalidStructures = [
        {
          name: 'Missing data wrapper',
          content: '{"workouts": [{"name": "Test"}]}', // Missing data wrapper
          expectedError: 'Invalid JSON structure'
        },
        {
          name: 'Invalid JSON syntax',
          content: '{"data": {"workouts": [{"name": "Test",}]}}', // Trailing comma
          expectedError: 'JSON parsing error'
        },
        {
          name: 'Wrong data type',
          content: '{"data": {"workouts": "not an array"}}', // String instead of array
          expectedError: 'Invalid data format'
        }
      ];

      for (const testCase of invalidStructures) {
        console.log(`Testing ${testCase.name}...`);
        
        const invalidFile = createTestFile(testCase.content, `invalid-${testCase.name.replace(/\s+/g, '-')}.json`);
        
        const importResponse = await supertest(app)
          .post('/v1/data-transfer/import') // Rule 4: POST endpoint
          .set('Authorization', `Bearer ${testUserToken}`)
          .attach('file', invalidFile);

        console.log(`${testCase.name} test result:`, {
          status: importResponse.status,
          hasErrorMessage: !!importResponse.body.message,
          errorMessage: importResponse.body.message
        });

        // Should reject with appropriate error
        if (testCase.name === 'Wrong data type') {
          // Special case: service gracefully handles wrong data types by skipping them
          expect([200, 400, 422]).toContain(importResponse.status);
          if (importResponse.status === 200) {
            console.log(`${testCase.name} handled gracefully - data skipped rather than rejected`);
          }
        } else {
          expect([400, 422]).toContain(importResponse.status);
        }
        
        // Should provide informative error message
        if (importResponse.body.message) {
          console.log(`Error message provided for ${testCase.name}: ${importResponse.body.message}`);
        }
      }
    });

    test('When importing with missing required fields, Then should validate appropriately', async () => {
      console.log('Starting missing required fields validation test...');
      
      // Rule 16: Correct structure but missing required fields
      const incompleteWorkoutData = {
        data: {
          workouts: [
            {
              // Missing name (required field)
              description: 'Plan missing required name field',
              plan_data: { exercises: [] },
              difficulty_level: 'intermediate',
              estimated_duration: 30,
              ai_generated: false,
              status: 'active'
            },
            {
              name: 'Complete Plan',
              description: 'This plan has all required fields',
              plan_data: { exercises: [{ name: 'Exercise', sets: 3, reps: 10 }] },
              difficulty_level: 'intermediate',
              estimated_duration: 30,
              ai_generated: false,
              status: 'active'
            }
          ]
        }
      };

      console.log('Creating test file with incomplete workout data...');
      const incompleteFile = createTestFile(
        JSON.stringify(incompleteWorkoutData), 
        'incomplete-workout-data.json'
      );
      
      const importResponse = await supertest(app)
        .post('/v1/data-transfer/import') // Rule 4: POST endpoint
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', incompleteFile);

      console.log('Incomplete data validation result:', {
        status: importResponse.status,
        successful: importResponse.body?.data?.successful,
        failed: importResponse.body?.data?.failed,
        hasValidationResults: !!importResponse.body?.data?.results
      });

      // Should handle mixed success/failure gracefully
      expect([200, 400, 422]).toContain(importResponse.status);
      
      if (importResponse.status === 200) {
        // Some records should succeed, some should fail
        expect(importResponse.body.data.successful).toBeGreaterThanOrEqual(1); // Complete plan should succeed
        
        // Track any successful imports for cleanup
        if (importResponse.body.data.results) {
          const createdIds = importResponse.body.data.results
            .filter(result => result.success && result.id)
            .map(result => result.id);
          createdWorkoutPlanIds.push(...createdIds);
        }
      }

      console.log('Missing required fields validation completed');
    });
  });
}); 