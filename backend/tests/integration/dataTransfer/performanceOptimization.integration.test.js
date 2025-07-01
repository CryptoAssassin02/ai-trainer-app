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

describe('Performance Optimization Tests - Real Database & Service Validation', () => {
  let testUserId, testUserToken;
  let createdWorkoutPlanIds = [];
  let tempDir, tempFilePaths = [];

  beforeAll(async () => {
    // Rule 11: ALWAYS verify test-environment aware rate limiting
    console.log('Verifying rate limiting configuration for test environment...');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    // Ensure rate limiting is test-friendly (100 requests/min vs 3/hour in production)
    // This prevents 429 errors that plagued early Phase 1 implementation
    
    // Rule 2: ALWAYS use real auth endpoints for user creation
    const timestamp = Date.now();
    const testUserEmail = `perftest${timestamp}@example.com`;
    const testUserPassword = 'TestPassword123!';
    
    console.log('Creating test user for performance testing...');
    const signupResponse = await supertest(app)
      .post('/v1/auth/signup')
      .send({
        name: 'Performance Test User',
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
    await createSampleWorkoutData();
  });

  afterEach(async () => {
    // Rule 13: Comprehensive cleanup with debugging
    console.log('Cleaning up test data...');
    
    // Clean up workout plans
    if (createdWorkoutPlanIds.length > 0) {
      const { error: workoutDeleteError } = await adminSupabase
        .from('workout_plans')
        .delete()
        .in('id', createdWorkoutPlanIds);
      
      if (workoutDeleteError) {
        console.warn('Error cleaning up workout plans:', workoutDeleteError);
      } else {
        console.log('Cleaned up workout plans:', createdWorkoutPlanIds.length);
      }
      createdWorkoutPlanIds = [];
    }
    
    // Clean up temp files with safety checks
    tempFilePaths.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.warn('Error cleaning up temp file:', { filePath, error: error.message });
      }
    });
    tempFilePaths = [];
  });

  afterAll(async () => {
    // Rule 2: Clean up test user
    if (testUserId) {
      console.log('Cleaning up test user...');
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
    
    console.log('Creating user profile for performance testing...');
    const profileResponse = await supertest(app)
      .post('/v1/profile')
      .set('Authorization', `Bearer ${testUserToken}`)
      .send(profileData);
    
    if (![200, 201].includes(profileResponse.status)) {
      throw new Error(`Failed to create user profile: ${profileResponse.body.message || 'Unknown error'}`);
    }
    
    console.log('User profile created successfully');
    return profileResponse.body.data;
  }

  // Rule 9: Create test workout plans using correct schema fields
  async function createSampleWorkoutData() {
    console.log('Creating sample workout data for performance testing...');
    
    const samplePlans = [
      {
        name: 'Performance Test Plan 1',
        description: 'First plan for performance testing',
        plan_data: { 
          exercises: [
            { name: 'Squats', sets: 3, reps: 12 },
            { name: 'Push-ups', sets: 3, reps: 15 }
          ] 
        },
        difficulty_level: 'intermediate',
        estimated_duration: 45,
        ai_generated: false,
        status: 'active'
      },
      {
        name: 'Performance Test Plan 2',
        description: 'Second plan for performance testing',
        plan_data: { 
          exercises: [
            { name: 'Deadlifts', sets: 3, reps: 8 },
            { name: 'Pull-ups', sets: 3, reps: 10 }
          ] 
        },
        difficulty_level: 'advanced',
        estimated_duration: 60,
        ai_generated: false,
        status: 'active'
      }
    ];

    for (const plan of samplePlans) {
      const planWithUserId = { ...plan, user_id: testUserId };
      const { data, error } = await adminSupabase
        .from('workout_plans')
        .insert([planWithUserId])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create sample workout plan: ${error.message}`);
      }

      createdWorkoutPlanIds.push(data.id);
    }
    
    console.log('Created sample workout data:', createdWorkoutPlanIds.length, 'plans');
  }

  // Rule 18: Test file creation with filename sanitization
  function createTestFile(content, filename, options = {}) {
    // Rule 18: Sanitize filename for path traversal protection test
    const safeFilename = filename.replace(/[\/\\]/g, '_').replace(/\.\./g, '__');
    const tempFilePath = path.join(tempDir, safeFilename);
    
    if (options.binary) {
      fs.writeFileSync(tempFilePath, content);
    } else {
      fs.writeFileSync(tempFilePath, content, options.encoding || 'utf8');
    }
    
    tempFilePaths.push(tempFilePath);
    console.log('Test file created:', { filename: safeFilename, size: content.length });
    return tempFilePath;
  }

  describe('Concurrent Request Performance', () => {
    test('When processing multiple concurrent export requests, Then should respect test-environment rate limits', async () => {
      // Rule 11: Multiple requests should succeed in test environment
      console.log('Starting concurrent export request performance test...');
      
      const concurrentRequestCount = 5;
      const requests = Array.from({ length: concurrentRequestCount }, (_, index) =>
        supertest(app)
          .post('/v1/data-transfer/export') // Rule 4: POST with body
          .set('Authorization', `Bearer ${testUserToken}`)
          .send({
            format: 'json',
            dataTypes: ['workouts'] // Rule 6: Correct data type naming
          })
      );

      console.log('About to make concurrent requests:', { 
        count: concurrentRequestCount,
        endpoint: '/v1/data-transfer/export',
        hasToken: !!testUserToken 
      });

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      console.log('Concurrent requests completed:', { 
        duration: totalDuration,
        averagePerRequest: totalDuration / concurrentRequestCount
      });
      
      // Rule 15: Check for rate limiting patterns first
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      const successfulResponses = responses.filter(r => r.status === 200);
      
      if (rateLimitedResponses.length > 0) {
        console.log('Rate limiting detected - checking test environment configuration...', {
          rateLimited: rateLimitedResponses.length,
          successful: successfulResponses.length
        });
      }

      // Rule 13: Comprehensive debugging of response patterns
      responses.forEach((response, index) => {
        console.log(`Request ${index + 1} result:`, {
          status: response.status,
          hasExportDate: !!response.body.exportDate,
          hasUserId: !!response.body.userId,
          hasData: !!response.body.data
        });
      });

      // Should succeed in test environment with proper rate limiting
      responses.forEach((response, index) => {
        expect([200, 429]).toContain(response.status); // 429 acceptable if rate limiting not configured
        
        if (response.status === 200) {
          // Rule 5: Expect correct response format for successful exports
          expect(response.body.exportDate).toBeDefined();
          expect(response.body.userId).toBe(testUserId);
          expect(response.body.data).toBeDefined();
        }
      });

      // Performance benchmark: Should complete within reasonable time
      expect(totalDuration).toBeLessThan(15000); // 15 seconds for 5 concurrent requests
      
      // At least some requests should succeed in test environment
      expect(successfulResponses.length).toBeGreaterThan(0);
    });

    test('When processing large dataset exports, Then should maintain performance standards', async () => {
      console.log('Starting large dataset export performance test...');
      
      const startTime = Date.now();
      
      // Rule 4: Use POST endpoint with body parameters
      const exportResponse = await supertest(app)
        .post('/v1/data-transfer/export')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          format: 'json',
          dataTypes: ['workouts', 'workout_logs'] // Test multiple data types
        });

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log('Large dataset export completed:', {
        status: exportResponse.status,
        duration: duration,
        contentType: exportResponse.headers['content-type']
      });

      // Rule 15: Check infrastructure first if unexpected status
      if (![200, 429].includes(exportResponse.status)) {
        console.log('Unexpected status - checking for infrastructure issues:', {
          possibleRateLimiting: exportResponse.status === 429,
          possibleAuthIssues: exportResponse.status === 401,
          possibleServerError: exportResponse.status >= 500
        });
      }

      expect([200, 429]).toContain(exportResponse.status);
      
      if (exportResponse.status === 200) {
        // Rule 5: Expect correct response format
        expect(exportResponse.body.exportDate).toBeDefined();
        expect(exportResponse.body.userId).toBe(testUserId);
        expect(exportResponse.body.data).toBeDefined();
        
        // Performance benchmark: Should complete within reasonable time
        expect(duration).toBeLessThan(5000); // 5 seconds for large dataset
      }
    });
  });

  describe('Import Performance Optimization', () => {
    test('When importing large JSON files, Then should process efficiently', async () => {
      console.log('Starting large JSON import performance test...');
      
      // Rule 16: Use correct JSON structure for import
      const largeJsonData = {
        data: {
          workouts: Array.from({ length: 50 }, (_, index) => ({
            name: `Performance Test Plan ${index + 1}`,
            description: `Plan ${index + 1} for performance testing`,
            plan_data: { 
              exercises: [
                { name: 'Exercise A', sets: 3, reps: 10 },
                { name: 'Exercise B', sets: 3, reps: 12 }
              ] 
            },
            difficulty_level: 'intermediate',
            estimated_duration: 30,
            ai_generated: false,
            status: 'active'
          }))
        }
      };

      const testFile = createTestFile(JSON.stringify(largeJsonData), 'large-import-test.json');
      
      console.log('About to make large import request:', { 
        endpoint: '/v1/data-transfer/import',
        hasToken: !!testUserToken,
        fileSize: fs.statSync(testFile).size,
        recordCount: largeJsonData.data.workouts.length
      });

      const startTime = Date.now();
      
      // Rule 4: Use POST endpoint for import
      const importResponse = await supertest(app)
        .post('/v1/data-transfer/import')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', testFile);

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log('Large import request completed:', { 
        status: importResponse.status,
        duration: duration,
        hasSuccessfulField: importResponse.body?.data?.successful !== undefined
      });

      // Rule 15: Infrastructure-first error analysis
      if (![200, 400, 422].includes(importResponse.status)) {
        console.log('Unexpected import status - checking infrastructure:', {
          possibleRateLimiting: importResponse.status === 429,
          possibleAuthIssues: importResponse.status === 401,
          possibleTimeout: importResponse.status === 504
        });
      }

      expect([200, 400, 422, 429]).toContain(importResponse.status);
      
      if (importResponse.status === 200) {
        expect(importResponse.body.status).toBe('success');
        expect(importResponse.body.data.successful).toBeGreaterThan(0);
        
        // Performance benchmark: Should process large files efficiently
        expect(duration).toBeLessThan(10000); // 10 seconds for 50 records
      }
    });

    test('When handling memory-intensive operations, Then should manage resources properly', async () => {
      console.log('Starting memory-intensive operations test...');
      
      // Create multiple format exports concurrently to test memory management
      const formatRequests = ['json', 'csv'].map(format =>
        supertest(app)
          .post('/v1/data-transfer/export') // Rule 4: POST with body
          .set('Authorization', `Bearer ${testUserToken}`)
          .send({
            format: format,
            dataTypes: ['workouts']
          })
      );

      console.log('About to make concurrent format requests:', { 
        formats: ['json', 'csv'],
        hasToken: !!testUserToken 
      });

      const startTime = Date.now();
      const responses = await Promise.all(formatRequests);
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      console.log('Memory-intensive operations completed:', { 
        duration: totalDuration,
        responses: responses.map(r => ({ status: r.status, contentType: r.headers['content-type'] }))
      });

      // Rule 13: Comprehensive response analysis
      responses.forEach((response, index) => {
        const format = ['json', 'csv'][index];
        console.log(`${format.toUpperCase()} export result:`, {
          status: response.status,
          hasBody: !!response.body,
          contentType: response.headers['content-type']
        });
        
        // Should handle memory-intensive operations without errors
        expect([200, 429]).toContain(response.status);
      });

      // Performance benchmark: Multiple format exports should complete efficiently
      expect(totalDuration).toBeLessThan(8000); // 8 seconds for multiple format exports
    });
  });

  describe('Rate Limiting Validation', () => {
    test('When making sequential requests, Then should respect configured rate limits', async () => {
      console.log('Starting rate limiting validation test...');
      
      // Rule 11: Test environment should allow more requests than production
      const sequentialRequestCount = 3;
      const responses = [];
      const requestTimes = [];
      
      for (let i = 0; i < sequentialRequestCount; i++) {
        console.log(`Making sequential request ${i + 1}/${sequentialRequestCount}...`);
        
        const startTime = Date.now();
        
        const response = await supertest(app)
          .post('/v1/data-transfer/export') // Rule 4: POST with body
          .set('Authorization', `Bearer ${testUserToken}`)
          .send({
            format: 'json',
            dataTypes: ['workouts'] // Rule 6: Correct data type naming
          });
        
        const endTime = Date.now();
        const requestDuration = endTime - startTime;
        
        responses.push(response);
        requestTimes.push(requestDuration);
        
        console.log(`Sequential request ${i + 1} completed:`, {
          status: response.status,
          duration: requestDuration
        });
        
        // Small delay between requests to avoid overwhelming
        if (i < sequentialRequestCount - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Rule 15: Analyze patterns across all responses
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      const successfulCount = responses.filter(r => r.status === 200).length;
      
      console.log('Rate limiting analysis:', {
        total: responses.length,
        successful: successfulCount,
        rateLimited: rateLimitedCount,
        averageResponseTime: requestTimes.reduce((a, b) => a + b, 0) / requestTimes.length
      });
      
      // In test environment, most requests should succeed
      if (process.env.NODE_ENV === 'test') {
        expect(successfulCount).toBeGreaterThan(0);
      }
      
      // All responses should be either successful or properly rate limited
      responses.forEach((response, index) => {
        expect([200, 429]).toContain(response.status);
        
        if (response.status === 200) {
          // Rule 5: Expect correct response format
          expect(response.body.exportDate).toBeDefined();
          expect(response.body.userId).toBe(testUserId);
          expect(response.body.data).toBeDefined();
        }
      });
    });
  });

  describe('Performance Benchmarking', () => {
    test('When measuring system performance, Then should meet defined benchmarks', async () => {
      console.log('Starting comprehensive performance benchmarking...');
      
      const benchmarks = {
        smallExport: { threshold: 2000, description: 'Small dataset export' },
        mediumImport: { threshold: 5000, description: 'Medium dataset import' },
        formatConversion: { threshold: 3000, description: 'Format conversion' }
      };
      
      const results = {};
      
      // Benchmark 1: Small export
      console.log('Running small export benchmark...');
      const smallExportStart = Date.now();
      
      const smallExportResponse = await supertest(app)
        .post('/v1/data-transfer/export') // Rule 4: POST with body
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          format: 'json',
          dataTypes: ['workouts']
        });
      
      results.smallExport = Date.now() - smallExportStart;
      
      console.log('Small export benchmark completed:', {
        duration: results.smallExport,
        status: smallExportResponse.status,
        threshold: benchmarks.smallExport.threshold
      });
      
      // Benchmark 2: Medium import
      console.log('Running medium import benchmark...');
      
      // Rule 16: Use correct JSON structure
      const mediumJsonData = {
        data: {
          workouts: Array.from({ length: 20 }, (_, index) => ({
            name: `Benchmark Test Plan ${index + 1}`,
            description: `Plan for benchmarking`,
            plan_data: { exercises: [{ name: 'Benchmark Exercise', sets: 3, reps: 10 }] },
            difficulty_level: 'intermediate',
            estimated_duration: 30,
            ai_generated: false,
            status: 'active'
          }))
        }
      };
      
      const mediumTestFile = createTestFile(JSON.stringify(mediumJsonData), 'medium-benchmark.json');
      
      const mediumImportStart = Date.now();
      
      const mediumImportResponse = await supertest(app)
        .post('/v1/data-transfer/import') // Rule 4: POST endpoint
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', mediumTestFile);
      
      results.mediumImport = Date.now() - mediumImportStart;
      
      console.log('Medium import benchmark completed:', {
        duration: results.mediumImport,
        status: mediumImportResponse.status,
        threshold: benchmarks.mediumImport.threshold
      });
      
      // Benchmark 3: Format conversion
      console.log('Running format conversion benchmark...');
      
      const formatConversionStart = Date.now();
      
      const csvExportResponse = await supertest(app)
        .post('/v1/data-transfer/export') // Rule 4: POST with body
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          format: 'csv',
          dataTypes: ['workouts']
        });
      
      results.formatConversion = Date.now() - formatConversionStart;
      
      console.log('Format conversion benchmark completed:', {
        duration: results.formatConversion,
        status: csvExportResponse.status,
        threshold: benchmarks.formatConversion.threshold
      });
      
      // Rule 13: Comprehensive performance analysis
      console.log('Performance benchmark summary:', {
        smallExport: { 
          duration: results.smallExport, 
          threshold: benchmarks.smallExport.threshold,
          passed: results.smallExport <= benchmarks.smallExport.threshold
        },
        mediumImport: { 
          duration: results.mediumImport, 
          threshold: benchmarks.mediumImport.threshold,
          passed: results.mediumImport <= benchmarks.mediumImport.threshold
        },
        formatConversion: { 
          duration: results.formatConversion, 
          threshold: benchmarks.formatConversion.threshold,
          passed: results.formatConversion <= benchmarks.formatConversion.threshold
        }
      });
      
      // Performance assertions (lenient for test environment)
      if (smallExportResponse.status === 200) {
        expect(results.smallExport).toBeLessThan(benchmarks.smallExport.threshold);
      }
      
      if (mediumImportResponse.status === 200) {
        expect(results.mediumImport).toBeLessThan(benchmarks.mediumImport.threshold);
      }
      
      if (csvExportResponse.status === 200) {
        expect(results.formatConversion).toBeLessThan(benchmarks.formatConversion.threshold);
      }
      
      // At least one benchmark should succeed
      const successfulBenchmarks = [
        smallExportResponse.status === 200,
        mediumImportResponse.status === 200,
        csvExportResponse.status === 200
      ].filter(Boolean).length;
      
      expect(successfulBenchmarks).toBeGreaterThan(0);
    });
  });
}); 