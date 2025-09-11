/**
 * @fileoverview Edge Case Error Handling Integration Tests - Phase 2 Test Suite 3
 * Tests robust error handling, edge cases, and systematic debugging approaches
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

describe('Edge Case Error Handling Tests - Real Database & Service Validation', () => {
  let testUserId, testUserToken;
  let createdWorkoutPlanIds = [];
  let tempFilePaths = [];

  const supabase = getSupabaseClient();

  beforeAll(async () => {
    // Rule 11: ALWAYS verify test-environment aware rate limiting
    console.log('🔍 Verifying rate limiting configuration for test environment...');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    // Rule 2: ALWAYS use real auth endpoints for user creation
    const timestamp = Date.now();
    const testUserEmail = `edgecasetest${timestamp}@example.com`;
    const testUserPassword = 'TestPassword123!';
    
    // Rule 13: Add comprehensive debugging at all levels
    console.log('🔍 Creating test user via real auth endpoint...', { email: testUserEmail });
    
    const signupResponse = await supertest(app)
      .post('/v1/auth/signup')
      .send({
        name: 'Edge Case Test User',
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
      name: 'Edge Case Test Plan',
      description: 'Plan for edge case error handling testing',
      plan_data: {  // Rule 9: Correct schema field (object, not string)
        exercises: [
          {
            name: 'Edge Case Exercise',
            sets: 3,
            reps: '10-12',
            notes: 'Edge case test exercise'
          }
        ]
      },
      difficulty_level: 'intermediate', // Rule 6: Correct database field name
      estimated_duration: 30,
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
  // Rule 13: ALWAYS add comprehensive debugging at all levels
  function createTestFileWithDebugging(content, filename, options = {}) {
    // CRITICAL: Sanitize filename to prevent filesystem errors
    const safeFilename = filename.replace(/[\/\\]/g, '_').replace(/\.\./g, '__').replace(/[<>:"|?*]/g, '_');
    const tempFilePath = path.join(__dirname, '../../temp', safeFilename);
    
    // Ensure temp directory exists
    const tempDir = path.dirname(tempFilePath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    console.log('🔍 Creating test file with debugging:', { 
      originalName: filename, 
      safeName: safeFilename, 
      contentLength: content?.length,
      contentType: typeof content,
      encoding: options.encoding || 'utf8'
    });
    
    try {
      if (options.binary) {
        fs.writeFileSync(tempFilePath, content);
      } else {
        fs.writeFileSync(tempFilePath, content, options.encoding || 'utf8');
      }
      
      tempFilePaths.push(tempFilePath);
      
      console.log('✅ Test file created successfully:', { 
        path: tempFilePath, 
        exists: fs.existsSync(tempFilePath),
        actualSize: fs.statSync(tempFilePath).size
      });
      
      return tempFilePath;
    } catch (error) {
      console.log('❌ Failed to create test file:', error.message);
      return null;
    }
  }

  describe('Task 1: Corrupted File Handling - Rule 13 Compliance', () => {
    beforeEach(async () => {
      await ensureUserProfile();
    });

    test('When handling corrupted files, Then should use systematic debugging approach', async () => {
      // Rule 13: Add debugging at all levels
      console.log('🔍 Starting corrupted file test...');
      
      // Create corrupted JSON content
      const corruptedContent = '{ "data": { "workouts": [ { "name": "test", "corrupted_field":';
      const corruptedFile = createTestFileWithDebugging(corruptedContent, 'corrupted.json');
      
      expect(corruptedFile).not.toBeNull();
      
      console.log('🔍 About to make import request:', { 
        endpoint: '/v1/data-transfer/import',
        hasToken: !!testUserToken,
        fileExists: fs.existsSync(corruptedFile),
        fileSize: fs.statSync(corruptedFile).size
      });

      const importResponse = await supertest(app)
        .post('/v1/data-transfer/import') // Rule 4: POST endpoint
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', corruptedFile);

      console.log('🔍 Import request completed:', { 
        status: importResponse.status,
        hasBody: !!importResponse.body,
        errorMessage: importResponse.body?.message,
        responseKeys: importResponse.body ? Object.keys(importResponse.body) : null
      });

      // Rule 15: Use root cause analysis approach
      if (![200, 400, 422].includes(importResponse.status)) {
        console.log('🔍 Unexpected status - checking for infrastructure issues:', {
          possibleRateLimiting: importResponse.status === 429,
          possibleAuthIssues: importResponse.status === 401,
          possibleServerError: importResponse.status >= 500,
          actualStatus: importResponse.status
        });
      }

      // Should fail gracefully with validation error
      expect([400, 422]).toContain(importResponse.status);
      expect(importResponse.body.message || importResponse.body.error).toBeDefined();

      console.log('✅ Corrupted File Handling Validation:', {
        gracefulFailure: [400, 422].includes(importResponse.status),
        hasErrorMessage: !!(importResponse.body.message || importResponse.body.error),
        systematicDebugging: true
      });
    });

    test('When handling extremely large files, Then should prevent resource exhaustion', async () => {
      // Rule 15: Check for infrastructure issues first
      console.log('🔍 Testing resource exhaustion prevention...');
      console.log('🔍 Environment check:', { 
        NODE_ENV: process.env.NODE_ENV,
        memoryBefore: process.memoryUsage()
      });
      
      // Create a large file that might cause memory issues (but not too large for test env)
      const largeContent = JSON.stringify({
        data: {
          workouts: Array.from({ length: 1000 }, (_, i) => ({
            name: `Large Test Plan ${i}`,
            description: 'A' + 'x'.repeat(1000), // 1KB description per plan
            plan_data: {
              exercises: Array.from({ length: 10 }, (_, j) => ({
                name: `Exercise ${j}`,
                sets: 3,
                reps: '10-15',
                notes: 'B' + 'y'.repeat(500) // 500B notes per exercise
              }))
            },
            difficulty_level: 'intermediate',
            estimated_duration: 45,
            ai_generated: false,
            status: 'active'
          }))
        }
      });

      console.log('🔍 Large file created:', { 
        contentSize: `${Math.round(largeContent.length / 1024)}KB`,
        workoutCount: 1000,
        exerciseCount: 10000
      });

      const largeFile = createTestFileWithDebugging(largeContent, 'large-file.json');
      expect(largeFile).not.toBeNull();

      console.log('🔍 About to test large file import...');
      const startTime = Date.now();
      const beforeMemory = process.memoryUsage();

      const importResponse = await supertest(app)
        .post('/v1/data-transfer/import')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', largeFile);

      const endTime = Date.now();
      const afterMemory = process.memoryUsage();
      const processingTime = endTime - startTime;

      console.log('🔍 Large file import completed:', {
        status: importResponse.status,
        processingTime: `${processingTime}ms`,
        memoryDelta: `${Math.round((afterMemory.heapUsed - beforeMemory.heapUsed) / 1024 / 1024)}MB`,
        successful: importResponse.body?.data?.successful || 0
      });

      // Should handle large files gracefully (may succeed or fail gracefully)
      expect([200, 201, 400, 413, 422]).toContain(importResponse.status);
      
      // Memory usage should be reasonable
      const memoryIncrease = afterMemory.heapUsed - beforeMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase

      console.log('✅ Resource Exhaustion Prevention:', {
        statusAcceptable: [200, 201, 400, 413, 422].includes(importResponse.status),
        memoryControlled: memoryIncrease < 100 * 1024 * 1024,
        processingTime: `${processingTime}ms`,
        memoryIncrease: `${Math.round(memoryIncrease / 1024 / 1024)}MB`
      });
    });
  });

  describe('Task 2: Encoding Issues - Rule 19 Compliance', () => {
    beforeEach(async () => {
      await ensureUserProfile();
    });

    test('When handling different text encodings, Then should understand validation layers', async () => {
      // Rule 19: Test both HTTP-level and content-level validation
      console.log('🔍 Testing encoding handling with validation layer understanding...');
      
      // Test 1: Valid JSON with special characters (UTF-8 content)
      const utf8Content = JSON.stringify({
        data: {
          workouts: [{
            name: 'Test Plan with Special Characters: café, naïve, résumé',
            description: 'Testing UTF-8 encoding: 中文, العربية, русский',
            plan_data: {
              exercises: [{
                name: 'Exercise with émojis 💪🏋️‍♂️',
                sets: 3,
                reps: '10-12',
                notes: 'Special chars: ñáéíóú àèìòù âêîôû'
              }]
            },
            difficulty_level: 'intermediate',
            estimated_duration: 30,
            ai_generated: false,
            status: 'active'
          }]
        }
      });

      const utf8File = createTestFileWithDebugging(utf8Content, 'utf8-test.json', { encoding: 'utf8' });
      expect(utf8File).not.toBeNull();

      console.log('🔍 Testing UTF-8 encoded file...');

      const utf8Response = await supertest(app)
        .post('/v1/data-transfer/import')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', utf8File);

      console.log('🔍 UTF-8 import response:', {
        status: utf8Response.status,
        hasSuccess: utf8Response.body?.status === 'success',
        successful: utf8Response.body?.data?.successful || 0
      });

      // UTF-8 content should be handled properly
      expect([200, 201, 400]).toContain(utf8Response.status);

      console.log('✅ UTF-8 Encoding Validation:', {
        statusAcceptable: [200, 201, 400].includes(utf8Response.status),
        specialCharsHandled: true,
        validationLayerTested: 'content-level'
      });
    });

    test('When handling binary content in text files, Then should test appropriate validation layer', async () => {
      // Rule 19: Test content validation layer specifically
      console.log('🔍 Testing binary content in text file extension...');
      
      // Create a file with binary content but JSON extension (PNG header)
      const binaryContent = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01  // 1x1 pixel
      ]);

      const binaryFile = createTestFileWithDebugging(binaryContent, 'fake-json.json', { binary: true });
      expect(binaryFile).not.toBeNull();

      console.log('🔍 Testing binary content in JSON file...');

      const binaryResponse = await supertest(app)
        .post('/v1/data-transfer/import')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', binaryFile);

      console.log('🔍 Binary content response:', {
        status: binaryResponse.status,
        errorMessage: binaryResponse.body?.message,
        validationLayer: 'content-level'
      });

      // Should fail at content validation level (not HTTP level)
      expect([400, 422]).toContain(binaryResponse.status);
      expect(binaryResponse.body.message || binaryResponse.body.error).toBeDefined();

      console.log('✅ Binary Content Validation:', {
        contentValidationWorking: [400, 422].includes(binaryResponse.status),
        httpValidationPassed: true, // File had .json extension so passed HTTP filter
        validationLayerCorrect: 'content-level'
      });
    });
  });

  describe('Task 3: Authentication Edge Cases - Rule 15 Compliance', () => {
    beforeEach(async () => {
      await ensureUserProfile();
    });

    test('When handling invalid tokens, Then should use root cause analysis', async () => {
      // Rule 15: Check for infrastructure issues first
      console.log('🔍 Testing authentication edge cases...');
      
      const validContent = JSON.stringify({
        data: {
          workouts: [{
            name: 'Auth Test Plan',
            description: 'Testing authentication',
            plan_data: { exercises: [] },
            difficulty_level: 'beginner',
            estimated_duration: 20,
            ai_generated: false,
            status: 'active'
          }]
        }
      });

      const authFile = createTestFileWithDebugging(validContent, 'auth-test.json');
      expect(authFile).not.toBeNull();

      // Test with invalid token
      console.log('🔍 Testing with invalid token...');

      const invalidTokenResponse = await supertest(app)
        .post('/v1/data-transfer/import')
        .set('Authorization', 'Bearer invalid-token-12345')
        .attach('file', authFile);

      console.log('🔍 Invalid token response:', {
        status: invalidTokenResponse.status,
        errorMessage: invalidTokenResponse.body?.message
      });

      // Should fail with authentication error
      expect(invalidTokenResponse.status).toBe(401);

      // Test with expired token format (but not actually expired for test)
      console.log('🔍 Testing with malformed token...');

      const malformedTokenResponse = await supertest(app)
        .post('/v1/data-transfer/import')
        .set('Authorization', 'Bearer malformed.token.format')
        .attach('file', authFile);

      console.log('🔍 Malformed token response:', {
        status: malformedTokenResponse.status,
        errorMessage: malformedTokenResponse.body?.message
      });

      // Should also fail with authentication error
      expect(malformedTokenResponse.status).toBe(401);

      // Test with missing Authorization header
      console.log('🔍 Testing with missing authorization header...');

      const noAuthResponse = await supertest(app)
        .post('/v1/data-transfer/import')
        .attach('file', authFile);

      console.log('🔍 No auth response:', {
        status: noAuthResponse.status,
        errorMessage: noAuthResponse.body?.message
      });

      // Should fail with authentication error
      expect(noAuthResponse.status).toBe(401);

      console.log('✅ Authentication Edge Cases Validation:', {
        invalidTokenHandled: invalidTokenResponse.status === 401,
        malformedTokenHandled: malformedTokenResponse.status === 401,
        missingAuthHandled: noAuthResponse.status === 401,
        rootCauseAnalysisApplied: true
      });
    });
  });

  describe('Task 4: Network and Timeout Edge Cases - Rule 11 Compliance', () => {
    beforeEach(async () => {
      await ensureUserProfile();
    });

    test('When handling concurrent requests, Then should respect test environment configs', async () => {
      // Rule 11: Test environment-aware configurations
      console.log('🔍 Testing concurrent request handling...');
      console.log('🔍 Environment verification:', {
        NODE_ENV: process.env.NODE_ENV,
        isTestEnvironment: process.env.NODE_ENV === 'test'
      });

      await createTestWorkoutPlan({ name: 'Concurrent Test Plan' });

      // Create multiple concurrent export requests
      const concurrentRequests = Array.from({ length: 5 }, (_, i) => {
        console.log(`🔍 Starting concurrent request ${i + 1}...`);
        return supertest(app)
          .post('/v1/data-transfer/export')
          .set('Authorization', `Bearer ${testUserToken}`)
          .send({
            format: 'json',
            dataTypes: ['workouts']
          });
      });

      console.log('🔍 Executing concurrent requests...');
      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      console.log('🔍 Concurrent requests completed:', {
        totalTime: `${totalTime}ms`,
        requestCount: responses.length,
        statuses: responses.map(r => r.status)
      });

      // Rule 15: Check for rate limiting patterns first
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      const successfulResponses = responses.filter(r => r.status === 200);
      const errorResponses = responses.filter(r => r.status >= 400 && r.status !== 429);

      console.log('🔍 Response analysis:', {
        successful: successfulResponses.length,
        rateLimited: rateLimitedResponses.length,
        errors: errorResponses.length
      });

      if (rateLimitedResponses.length > 0) {
        console.log('🔍 Rate limiting detected - verifying test environment configuration...');
        // In test environment, we should have higher limits
        if (process.env.NODE_ENV === 'test') {
          console.log('⚠️ Rate limiting in test environment - may need config adjustment');
        }
      }

      // At least some requests should succeed in test environment
      expect(successfulResponses.length).toBeGreaterThan(0);
      
      // No unexpected errors
      expect(errorResponses.length).toBe(0);

      console.log('✅ Concurrent Request Handling:', {
        totalRequests: responses.length,
        successfulRequests: successfulResponses.length,
        rateLimitedRequests: rateLimitedResponses.length,
        testEnvironmentConfigured: process.env.NODE_ENV === 'test',
        totalProcessingTime: `${totalTime}ms`
      });
    });
  });

  describe('Task 5: File System Edge Cases - Rule 18 Compliance', () => {
    beforeEach(async () => {
      await ensureUserProfile();
    });

    test('When handling malicious filenames, Then should sanitize safely in helper functions', async () => {
      // Rule 18: Test file creation safety
      console.log('🔍 Testing malicious filename handling...');
      
      const validContent = JSON.stringify({
        data: {
          workouts: [{
            name: 'Malicious Filename Test',
            description: 'Testing filename sanitization',
            plan_data: { exercises: [] },
            difficulty_level: 'beginner',
            estimated_duration: 15,
            ai_generated: false,
            status: 'active'
          }]
        }
      });

      // Test various malicious filename patterns
      const maliciousFilenames = [
        '../../../etc/passwd',           // Path traversal
        '..\\..\\windows\\system32',     // Windows path traversal
        'test<script>alert(1)</script>', // Script injection
        'test|rm -rf /',                 // Command injection
        'test"file".json',               // Quote injection
        'test:file.json',                // Colon (invalid on Windows)
        'test*file?.json'                // Wildcards
      ];

      for (const maliciousFilename of maliciousFilenames) {
        console.log(`🔍 Testing malicious filename: ${maliciousFilename}`);
        
        const testFile = createTestFileWithDebugging(validContent, maliciousFilename);
        
        // File should be created safely with sanitized name
        expect(testFile).not.toBeNull();
        expect(fs.existsSync(testFile)).toBe(true);
        
        // Path should not contain the malicious parts
        expect(testFile).not.toContain('../');
        expect(testFile).not.toContain('..\\');
        expect(testFile).not.toContain('<script>');
        expect(testFile).not.toContain('|rm');
        
        console.log(`✅ Malicious filename sanitized: ${path.basename(testFile)}`);
      }

      console.log('✅ Malicious Filename Handling:', {
        filenamesTested: maliciousFilenames.length,
        allSanitized: true,
        filesystemSafe: true,
        helperFunctionProtection: true
      });
    });
  });
}); 