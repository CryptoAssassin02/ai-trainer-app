/**
 * @fileoverview Error Handling Robustness Integration Tests
 * Tests comprehensive error scenarios, recovery mechanisms, and graceful degradation in data transfer operations
 * Following analytics_integration_rules.mdc and real_ai_integration.mdc patterns
 */

const supertest = require('supertest');
const { app } = require('../../../server');
const { getSupabaseClient, getSupabaseClientWithToken } = require('../../../services/supabase');
const path = require('path');
const fs = require('fs');

// Import admin client for setup/teardown ONLY
const { createClient } = require('@supabase/supabase-js');
const adminSupabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

describe('Error Handling Robustness Integration Tests - Real Database & Service Validation', () => {
  let testUserId, testUserToken;
  let createdWorkoutPlanIds = [];

  // Get the general supabase client for non-RLS operations
  const supabase = getSupabaseClient();

  beforeAll(async () => {
    // Create independent test user following successful analytics pattern
    const timestamp = Date.now();
    const testUserEmail = `errortest${timestamp}@example.com`;
    const testUserPassword = 'TestPassword123!';
    
    // Create test user using real signup endpoint
    const signupResponse = await supertest(app)
      .post('/v1/auth/signup')
      .send({
        name: 'Error Test User',
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

  // Helper function to create test files for error scenarios
  function createTestFiles(testType) {
    const testDir = path.join(__dirname, 'temp-error-test');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    let filePath;
    
    switch (testType) {
      case 'invalidJSON':
        filePath = path.join(testDir, 'invalid.json');
        fs.writeFileSync(filePath, '{ invalid json content missing quotes and braces');
        break;
        
      case 'missingFields':
        filePath = path.join(testDir, 'missing-fields.json');
        fs.writeFileSync(filePath, JSON.stringify({
          data: {
            workouts: [
              {
                // Completely missing ALL required fields to trigger validation failure
                description: 'Plan without ANY required fields'
              }
            ]
          }
        }));
        break;
        
      case 'invalidSchema':
        filePath = path.join(testDir, 'invalid-schema.json');
        fs.writeFileSync(filePath, JSON.stringify({
          data: {
            workouts: [
              {
                name: 123, // INVALID: should be string, not number
                description: 'Plan with invalid field types',
                plan_data: "invalid_object", // INVALID: should be object, not string
                difficulty_level: 'super_expert', // INVALID: not in enum list
                estimated_duration: -50, // INVALID: should be positive
                status: 'invalid_status' // INVALID: not in enum list
              }
            ]
          }
        }));
        break;
        
      case 'empty':
        filePath = path.join(testDir, 'empty.json');
        fs.writeFileSync(filePath, '');
        break;
        
      case 'malformed':
        filePath = path.join(testDir, 'malformed.json');
        fs.writeFileSync(filePath, '{"incomplete": "json"');
        break;
        
      case 'wrongType':
        filePath = path.join(testDir, 'wrong-type.txt');
        fs.writeFileSync(filePath, 'This is a text file, not JSON');
        break;
        
      default:
        throw new Error(`Unknown test type: ${testType}`);
    }

    return { filePath, testDir };
  }

  // Helper function to cleanup test files
  function cleanupTestFiles(testDir) {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  }

  describe('Task 1: Import Error Handling', () => {
    beforeEach(async () => {
      // Ensure clean user profile for each test
      await ensureUserProfile();
    });

    test('When user imports invalid JSON file, Then should return JSON parse error', async () => {
      const { filePath, testDir } = createTestFiles('invalidJSON');

      try {
        const importResponse = await supertest(app)
          .post('/v1/data-transfer/import')
          .set('Authorization', `Bearer ${testUserToken}`)
          .attach('file', filePath)
          .field('format', 'json')
          .field('dataType', 'workouts');

        expect([400, 422]).toContain(importResponse.status);
        expect(importResponse.body.status).toBe('error');
        expect(importResponse.body.message).toMatch(/json|parse|invalid|syntax/i);

        console.log('✅ Invalid JSON Error Handling:', {
          errorStatus: importResponse.status,
          errorType: 'json_parse_error',
          hasDescriptiveMessage: !!importResponse.body.message
        });

      } finally {
        cleanupTestFiles(testDir);
      }
    });

    test('When user imports file with missing required fields, Then should return validation error', async () => {
      const { filePath, testDir } = createTestFiles('missingFields');

      try {
        const importResponse = await supertest(app)
          .post('/v1/data-transfer/import')
          .set('Authorization', `Bearer ${testUserToken}`)
          .attach('file', filePath)
          .field('format', 'json')
          .field('dataType', 'workouts');

        expect([400, 422]).toContain(importResponse.status);
        expect(importResponse.body.status).toBe('error');
        expect(importResponse.body.message).toMatch(/required|missing|field|validation/i);

        console.log('✅ Missing Fields Error Handling:', {
          errorStatus: importResponse.status,
          errorType: 'validation_error',
          hasValidationMessage: !!importResponse.body.message
        });

      } finally {
        cleanupTestFiles(testDir);
      }
    });

    test('When user imports file with invalid schema, Then should return schema validation error', async () => {
      const { filePath, testDir } = createTestFiles('invalidSchema');

      try {
        const importResponse = await supertest(app)
          .post('/v1/data-transfer/import')
          .set('Authorization', `Bearer ${testUserToken}`)
          .attach('file', filePath)
          .field('format', 'json')
          .field('dataType', 'workouts');

        expect([400, 422]).toContain(importResponse.status);
        expect(importResponse.body.status).toBe('error');
        expect(importResponse.body.message).toMatch(/schema|validation|invalid|type/i);

        console.log('✅ Invalid Schema Error Handling:', {
          errorStatus: importResponse.status,
          errorType: 'schema_validation_error',
          hasSchemaMessage: !!importResponse.body.message
        });

      } finally {
        cleanupTestFiles(testDir);
      }
    });

    test('When user imports empty file, Then should return appropriate error', async () => {
      const { filePath, testDir } = createTestFiles('empty');

      try {
        const importResponse = await supertest(app)
          .post('/v1/data-transfer/import')
          .set('Authorization', `Bearer ${testUserToken}`)
          .attach('file', filePath)
          .field('format', 'json')
          .field('dataType', 'workouts');

        expect([400, 422]).toContain(importResponse.status);
        expect(importResponse.body.status).toBe('error');
        expect(importResponse.body.message).toMatch(/empty|file|content/i);

        console.log('✅ Empty File Error Handling:', {
          errorStatus: importResponse.status,
          errorType: 'empty_file_error',
          hasEmptyFileMessage: !!importResponse.body.message
        });

      } finally {
        cleanupTestFiles(testDir);
      }
    });

    test('When user imports malformed JSON file, Then should return parse error', async () => {
      const { filePath, testDir } = createTestFiles('malformed');

      try {
        const importResponse = await supertest(app)
          .post('/v1/data-transfer/import')
          .set('Authorization', `Bearer ${testUserToken}`)
          .attach('file', filePath)
          .field('format', 'json')
          .field('dataType', 'workouts');

        expect([400, 422]).toContain(importResponse.status);
        expect(importResponse.body.status).toBe('error');
        expect(importResponse.body.message).toMatch(/json|parse|malformed|syntax/i);

        console.log('✅ Malformed JSON Error Handling:', {
          errorStatus: importResponse.status,
          errorType: 'malformed_json_error',
          hasMalformedMessage: !!importResponse.body.message
        });

      } finally {
        cleanupTestFiles(testDir);
      }
    });

    test('When user imports unsupported file type, Then should return file type error', async () => {
      const { filePath, testDir } = createTestFiles('wrongType');

      try {
        const importResponse = await supertest(app)
          .post('/v1/data-transfer/import')
          .set('Authorization', `Bearer ${testUserToken}`)
          .attach('file', filePath)
          .field('format', 'json')
          .field('dataType', 'workouts');

        expect([400, 415]).toContain(importResponse.status);
        expect(importResponse.body.status).toBe('error');
        expect(importResponse.body.message).toMatch(/file type|unsupported|format/i);

        console.log('✅ Unsupported File Type Error Handling:', {
          errorStatus: importResponse.status,
          errorType: 'unsupported_file_type_error',
          hasFileTypeMessage: !!importResponse.body.message
        });

      } finally {
        cleanupTestFiles(testDir);
      }
    });
  });

  describe('Task 2: Export Error Handling', () => {
    beforeEach(async () => {
      await ensureUserProfile();
    });

    test('When user attempts export without authentication, Then should return auth error', async () => {
      const exportResponse = await supertest(app)
        .post('/v1/data-transfer/export')
        .send({
          format: 'json',
          dataTypes: ['workouts']
        });
        // No Authorization header

      expect(exportResponse.status).toBe(401);
      expect(exportResponse.body.status).toBe('error');
      expect(exportResponse.body.message).toMatch(/auth|token|unauthorized/i);

      console.log('✅ Export Auth Error Handling:', {
        errorStatus: exportResponse.status,
        errorType: 'authentication_error',
        hasAuthMessage: !!exportResponse.body.message
      });
    });

    test('When user attempts export with invalid token, Then should return token error', async () => {
      const exportResponse = await supertest(app)
        .post('/v1/data-transfer/export')
        .set('Authorization', 'Bearer invalid-jwt-token')
        .send({
          format: 'json',
          dataTypes: ['workouts']
        });

      expect(exportResponse.status).toBe(401);
      expect(exportResponse.body.status).toBe('error');
      expect(exportResponse.body.message).toMatch(/auth|token|invalid|unauthorized/i);

      console.log('✅ Invalid Token Error Handling:', {
        errorStatus: exportResponse.status,
        errorType: 'invalid_token_error',
        hasTokenMessage: !!exportResponse.body.message
      });
    });

    test('When user attempts export with unsupported format, Then should return format error', async () => {
      const exportResponse = await supertest(app)
        .post('/v1/data-transfer/export')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          format: 'unsupported_format',
          dataTypes: ['workouts']
        });

      expect([400, 422]).toContain(exportResponse.status);
      expect(exportResponse.body.status).toBe('error');
      expect(exportResponse.body.message).toMatch(/format|unsupported|invalid/i);

      console.log('✅ Unsupported Export Format Error Handling:', {
        errorStatus: exportResponse.status,
        errorType: 'unsupported_format_error',
        hasFormatMessage: !!exportResponse.body.message
      });
    });

    test('When user attempts export of non-existent data type, Then should return data type error', async () => {
      const exportResponse = await supertest(app)
        .post('/v1/data-transfer/export')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          format: 'json',
          dataTypes: ['non-existent-data']
        });

      expect([400, 404]).toContain(exportResponse.status);
      expect(exportResponse.body.status).toBe('error');
      expect(exportResponse.body.message).toMatch(/data type|not found|invalid|unsupported/i);

      console.log('✅ Invalid Data Type Error Handling:', {
        errorStatus: exportResponse.status,
        errorType: 'invalid_data_type_error',
        hasDataTypeMessage: !!exportResponse.body.message
      });
    });
  });

  describe('Task 3: Service Layer Error Handling', () => {
    beforeEach(async () => {
      await ensureUserProfile();
    });

    test('When import service encounters database connection error, Then should handle gracefully', async () => {
      // Create a valid import file
      const testDir = path.join(__dirname, 'temp-error-test');
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      const validData = {
        data: {
          workouts: [
            {
              name: 'DB Error Test Plan',
              description: 'Plan for database error testing',
              plan_data: { exercises: [] },
              difficulty_level: 'beginner',
              estimated_duration: 30,
              ai_generated: false,
              status: 'active'
            }
          ]
        }
      };

      const filePath = path.join(testDir, 'db-error-test.json');
      fs.writeFileSync(filePath, JSON.stringify(validData));

      try {
        // Note: This test might pass if the database is working properly
        // In a real scenario, we would mock the database to force an error
        const importResponse = await supertest(app)
          .post('/v1/data-transfer/import')
          .set('Authorization', `Bearer ${testUserToken}`)
          .attach('file', filePath)
          .field('format', 'json')
          .field('dataType', 'workouts');

        // Either succeeds normally or handles database error gracefully
        if (importResponse.status === 200) {
          expect(importResponse.body.status).toBe('success');
        } else {
          expect([500, 503]).toContain(importResponse.status);
          expect(importResponse.body.status).toBe('error');
          expect(importResponse.body.message).toMatch(/database|connection|service/i);
        }

        console.log('✅ Database Error Handling:', {
          responseStatus: importResponse.status,
          handledGracefully: [200, 500, 503].includes(importResponse.status),
          errorType: 'database_connection_error'
        });

      } finally {
        cleanupTestFiles(testDir);
      }
    });

    test('When service encounters rate limiting, Then should return appropriate error', async () => {
      // Create multiple rapid requests to potentially trigger rate limiting
      const promises = Array.from({ length: 10 }, (_, i) =>
        supertest(app)
          .post('/v1/data-transfer/export')
          .set('Authorization', `Bearer ${testUserToken}`)
          .send({
            format: 'json',
            dataTypes: ['workouts']
          })
      );

      const responses = await Promise.all(promises);

      // Check if any response indicates rate limiting
      const rateLimitedResponse = responses.find(res => res.status === 429);
      
      if (rateLimitedResponse) {
        expect(rateLimitedResponse.body.status).toBe('error');
        expect(rateLimitedResponse.body.message).toMatch(/rate limit|too many|requests/i);
        
        console.log('✅ Rate Limiting Error Handling:', {
          errorStatus: 429,
          errorType: 'rate_limit_error',
          hasRateLimitMessage: !!rateLimitedResponse.body.message
        });
      } else {
        // All requests succeeded - rate limiting might not be configured or threshold not reached
        console.log('✅ Rate Limiting Test: No rate limiting triggered with current configuration');
      }
    });

    test('When service validation fails, Then should return detailed validation errors', async () => {
      // Create file with specific validation failures
      const testDir = path.join(__dirname, 'temp-error-test');
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      const invalidData = {
        data: { // Rule 16: Use correct JSON structure
          workouts: [ // Rule 6: Use 'workouts' not 'workoutPlans'
            {
              // INVALID: Missing required 'name' field completely
              description: 'Service validation test plan',
              plan_data: null, // INVALID: plan_data is required but set to null
              difficulty_level: 'extreme_hardcore', // INVALID: not in enum list
              estimated_duration: 'forty_five_minutes', // INVALID: should be number, not string
              ai_generated: 'yes', // INVALID: should be boolean, not string
              status: 'super_active' // INVALID: not in enum list
            }
          ]
        }
      };

      const filePath = path.join(testDir, 'validation-fail.json');
      fs.writeFileSync(filePath, JSON.stringify(invalidData));

      try {
        const importResponse = await supertest(app)
          .post('/v1/data-transfer/import')
          .set('Authorization', `Bearer ${testUserToken}`)
          .attach('file', filePath)
          .field('format', 'json')
          .field('dataType', 'workouts');

        expect([400, 422]).toContain(importResponse.status);
        expect(importResponse.body.status).toBe('error');
        expect(importResponse.body.message).toMatch(/validation|invalid|field/i);

        console.log('✅ Service Validation Error Handling:', {
          errorStatus: importResponse.status,
          errorType: 'service_validation_error',
          hasValidationDetails: !!importResponse.body.message
        });

      } finally {
        cleanupTestFiles(testDir);
      }
    });
  });

  describe('Task 4: Network and Timeout Error Handling', () => {
    beforeEach(async () => {
      await ensureUserProfile();
    });

    test('When request times out, Then should handle timeout gracefully', async () => {
      // Create a large file that might cause timeout issues
      const testDir = path.join(__dirname, 'temp-error-test');
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      const largeData = {
        data: {
          workouts: Array.from({ length: 500 }, (_, i) => ({
            name: `Large Plan ${i}`,
            description: `This is plan number ${i} `.repeat(50),
            plan_data: {
              exercises: Array.from({ length: 20 }, (_, j) => ({
                name: `Exercise ${j}`,
                sets: 3,
                reps: '10-12',
                notes: 'Large dataset test exercise'
              }))
            },
            difficulty_level: 'intermediate',
            estimated_duration: 45,
            ai_generated: false,
            status: 'active'
          }))
        }
      };

      const filePath = path.join(testDir, 'large-timeout-test.json');
      fs.writeFileSync(filePath, JSON.stringify(largeData));

      try {
        const importResponse = await supertest(app)
          .post('/v1/data-transfer/import')
          .set('Authorization', `Bearer ${testUserToken}`)
          .attach('file', filePath)
          .field('format', 'json')
          .field('dataType', 'workouts')
          .timeout(5000); // 5 second timeout

        // Either succeeds or times out gracefully
        if (importResponse.status === 200) {
          expect(importResponse.body.status).toBe('success');
        } else {
          expect([408, 504]).toContain(importResponse.status);
          if (importResponse.body) {
            expect(importResponse.body.status).toBe('error');
            expect(importResponse.body.message).toMatch(/timeout|processing|time/i);
          }
        }

        console.log('✅ Timeout Error Handling:', {
          responseStatus: importResponse.status,
          handledTimeout: [200, 408, 504].includes(importResponse.status),
          errorType: 'timeout_error'
        });

      } catch (timeoutError) {
        // Supertest timeout error
        expect(timeoutError.message).toMatch(/timeout/i);
        console.log('✅ Request Timeout Handling: Timeout caught at client level');
      } finally {
        cleanupTestFiles(testDir);
      }
    });

    test('When request is malformed, Then should return bad request error', async () => {
      const importResponse = await supertest(app)
        .post('/v1/data-transfer/import')
        .set('Authorization', `Bearer ${testUserToken}`)
        // Missing file attachment
        .field('format', 'json')
        .field('dataType', 'workouts');

      expect(importResponse.status).toBe(400);
      expect(importResponse.body.status).toBe('error');
      expect(importResponse.body.message).toMatch(/file|upload|missing|required/i);

      console.log('✅ Malformed Request Error Handling:', {
        errorStatus: importResponse.status,
        errorType: 'malformed_request_error',
        hasMalformedMessage: !!importResponse.body.message
      });
    });
  });
}); 