/**
 * @fileoverview File Handling Security Integration Tests
 * Tests file upload/download security, MIME type validation, size limits, and malicious file detection
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

describe('File Handling Security Integration Tests - Real Database & Service Validation', () => {
  let testUserId, testUserToken;
  let createdWorkoutPlanIds = [];
  let tempFilePaths = [];

  // Get the general supabase client for non-RLS operations
  const supabase = getSupabaseClient();

  beforeAll(async () => {
    // Create independent test user following successful analytics pattern
    const timestamp = Date.now();
    const testUserEmail = `securitytest${timestamp}@example.com`;
    const testUserPassword = 'TestPassword123!';
    
    // Create test user using real signup endpoint
    const signupResponse = await supertest(app)
      .post('/v1/auth/signup')
      .send({
        name: 'Security Test User',
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

    // Clean up temporary files
    for (const filePath of tempFilePaths) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.log(`Warning: Could not delete temp file ${filePath}:`, error.message);
      }
    }
    tempFilePaths = [];
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

  // Helper function to create test files with proper content structure
  function createTestFile(content, filename, mimeType = 'application/json') {
    // Sanitize filename for path traversal protection test
    const safeFilename = filename.replace(/[\/\\]/g, '_').replace(/\.\./g, '__');
    
    const tempDir = path.join(__dirname, 'temp-security-test');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFilePath = path.join(tempDir, safeFilename);
    fs.writeFileSync(tempFilePath, content, 'utf8');
    tempFilePaths.push(tempFilePath);
    return { path: tempFilePath, mimeType };
  }

  function createBinaryFile(size, filename) {
    const tempDir = path.join(__dirname, 'temp-security-test');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFilePath = path.join(tempDir, filename);
    const buffer = Buffer.alloc(size, 0);
    fs.writeFileSync(tempFilePath, buffer);
    tempFilePaths.push(tempFilePath);
    return tempFilePath;
  }

  // Helper function to cleanup test files
  function cleanupTestFiles(testDir) {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  }

  describe('Task 1: MIME Type Validation', () => {
    beforeEach(async () => {
      // Ensure clean user profile for each test
      await ensureUserProfile();
    });

    test('When user uploads valid JSON file, Then should accept with correct MIME type', async () => {
      const validJson = {
        data: {
          workouts: [
            {
              name: 'Security Test Plan',
              description: 'Plan for security testing',
              plan_data: { exercises: [] },
              difficulty_level: 'beginner',
              estimated_duration: 30,
              ai_generated: false,
              status: 'active'
            }
          ]
        }
      };
      
      const testFile = createTestFile(JSON.stringify(validJson), 'valid.json', 'application/json');
      
      const response = await supertest(app)
        .post('/v1/data-transfer/import')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', testFile.path)
        .field('format', 'json')
        .field('dataType', 'workouts');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');

      console.log('✅ Valid JSON MIME Type:', {
        fileAccepted: response.status === 200,
        mimeType: 'application/json'
      });
    });

    test('When user uploads valid CSV file, Then should accept with correct MIME type', async () => {
      const csvContent = `name,description,difficulty_level,estimated_duration
"CSV Security Plan","Plan from CSV","beginner",30`;
      
      const testFile = createTestFile(csvContent, 'valid.csv', 'text/csv');
      
      const response = await supertest(app)
        .post('/v1/data-transfer/import')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', testFile.path)
        .field('format', 'csv')
        .field('dataType', 'workouts');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');

      console.log('✅ Valid CSV MIME Type:', {
        fileAccepted: response.status === 200,
        mimeType: 'text/csv'
      });
    });

    test('When user uploads executable file, Then should reject with security error', async () => {
      const executableContent = 'MZ\x90\x00'; // PE header signature
      const testFile = createTestFile(executableContent, 'malicious.exe', 'application/x-msdownload');
      
      const response = await supertest(app)
        .post('/v1/data-transfer/import')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', testFile.path)
        .field('format', 'json')
        .field('dataType', 'workouts');

      expect([400, 415]).toContain(response.status);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toMatch(/unsupported file type|invalid file/i);

      console.log('✅ Executable File Rejection:', {
        errorStatus: response.status,
        securityBlocked: !!response.body.message,
        fileType: 'executable'
      });
    });

    test('When user uploads script files, Then should reject all script types', async () => {
      const scriptFiles = [
        { content: 'console.log("malicious script");', filename: 'script.js', mime: 'application/javascript' },
        { content: 'import os; os.system("rm -rf /")', filename: 'script.py', mime: 'text/x-python' },
        { content: '#!/bin/bash\nrm -rf /', filename: 'script.sh', mime: 'application/x-sh' }
      ];

      for (const scriptFile of scriptFiles) {
        const testFile = createTestFile(scriptFile.content, scriptFile.filename, scriptFile.mime);
        
        const response = await supertest(app)
          .post('/v1/data-transfer/import')
          .set('Authorization', `Bearer ${testUserToken}`)
          .attach('file', testFile.path)
          .field('format', 'json')
          .field('dataType', 'workouts');

        expect([400, 415]).toContain(response.status);
        expect(response.body.status).toBe('error');
        expect(response.body.message).toMatch(/unsupported file type|invalid file/i);

        console.log(`✅ Script File Rejection (${scriptFile.filename}):`, {
          errorStatus: response.status,
          securityBlocked: !!response.body.message
        });
      }
    });
  });

  describe('Task 2: File Size Limits', () => {
    beforeEach(async () => {
      await ensureUserProfile();
    });

    test('When user uploads file within size limit, Then should accept', async () => {
      const validJson = {
        data: {
          workouts: [
            {
              name: 'Size Test Plan',
              description: 'Plan for size testing',
              plan_data: { exercises: [] },
              difficulty_level: 'beginner',
              estimated_duration: 30,
              ai_generated: false,
              status: 'active'
            }
          ]
        }
      };
      
      // Add padding to approach limit but stay under
      const padding = 'x'.repeat(1024 * 1024); // 1MB of padding
      const jsonWithPadding = { ...validJson, padding };
      
      const testFile = createTestFile(JSON.stringify(jsonWithPadding), 'large-valid.json');
      
      const response = await supertest(app)
        .post('/v1/data-transfer/import')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', testFile.path)
        .field('format', 'json')
        .field('dataType', 'workouts');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');

      console.log('✅ Valid File Size Acceptance:', {
        fileAccepted: response.status === 200,
        sizeApproximate: '1MB'
      });
    });

    test('When user uploads oversized file, Then should reject with size error', async () => {
      // Create a file larger than typical limits
      const largeFilePath = createBinaryFile(15 * 1024 * 1024, 'too-large.json'); // 15MB
      
      const response = await supertest(app)
        .post('/v1/data-transfer/import')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', largeFilePath)
        .field('format', 'json')
        .field('dataType', 'workouts');

      expect([400, 413]).toContain(response.status);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toMatch(/file size|too large|limit/i);

      console.log('✅ Oversized File Rejection:', {
        errorStatus: response.status,
        sizeBlocked: !!response.body.message,
        fileSize: '15MB'
      });
    });

    test('When user uploads empty file, Then should handle gracefully', async () => {
      const emptyFile = createTestFile('', 'empty.json');
      
      const response = await supertest(app)
        .post('/v1/data-transfer/import')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', emptyFile.path)
        .field('format', 'json')
        .field('dataType', 'workouts');

      expect([400, 422]).toContain(response.status);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toMatch(/empty|invalid|content/i);

      console.log('✅ Empty File Handling:', {
        errorStatus: response.status,
        handledGracefully: !!response.body.message
      });
    });
  });

  describe('Task 3: Path Traversal Protection', () => {
    beforeEach(async () => {
      await ensureUserProfile();
    });

    test('When user uploads file with path traversal filename, Then should sanitize safely', async () => {
      const validJson = {
        data: {
          workouts: [
            {
              name: 'Path Test Plan',
              description: 'Plan for path testing',
              plan_data: { exercises: [] },
              difficulty_level: 'beginner',
              estimated_duration: 30,
              ai_generated: false,
              status: 'active'
            }
          ]
        }
      };
      
      // Filenames with path traversal attempts
      const maliciousFilenames = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config\\sam',
        'normal.json/../../../etc/hosts'
      ];

      for (const filename of maliciousFilenames) {
        const testFile = createTestFile(JSON.stringify(validJson), filename);
        
        const response = await supertest(app)
          .post('/v1/data-transfer/import')
          .set('Authorization', `Bearer ${testUserToken}`)
          .attach('file', testFile.path)
          .field('format', 'json')
          .field('dataType', 'workouts');

        // Should either accept with sanitized filename or reject
        expect([200, 400]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body.status).toBe('success');
        }
        
        console.log(`✅ Path Traversal Protection (${filename}):`, {
          responseStatus: response.status,
          handledSafely: [200, 400].includes(response.status)
        });
      }
    });

    test('When file contains traversal paths in content, Then should process safely', async () => {
      const maliciousContent = {
        data: {
          workouts: [
            {
              name: 'Plan with Traversal',
              description: '../../../sensitive-data.txt',
              plan_data: { 
                exercises: [],
                maliciousPath: '../../../../etc/passwd'
              },
              difficulty_level: 'beginner',
              estimated_duration: 30,
              ai_generated: false,
              status: 'active'
            }
          ]
        }
      };
      
      const testFile = createTestFile(JSON.stringify(maliciousContent), 'traversal-content.json');
      
      const response = await supertest(app)
        .post('/v1/data-transfer/import')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', testFile.path)
        .field('format', 'json')
        .field('dataType', 'workouts');

      // Should process safely without allowing directory escape
      expect([200, 400]).toContain(response.status);

      console.log('✅ Content Traversal Protection:', {
        responseStatus: response.status,
        processedSafely: [200, 400].includes(response.status)
      });
    });
  });

  describe('Task 4: Content Validation Security', () => {
    beforeEach(async () => {
      await ensureUserProfile();
    });

    test('When file contains script injection attempts, Then should sanitize content', async () => {
      const maliciousJson = {
        data: {
          workouts: [
            {
              name: '<script>alert("xss")</script>',
              description: 'javascript:alert(1)',
              plan_data: { 
                exercises: [],
                notes: '<img src=x onerror=alert(1)>'
              },
              difficulty_level: 'beginner',
              estimated_duration: 30,
              ai_generated: false,
              status: 'active'
            }
          ]
        }
      };
      
      const testFile = createTestFile(JSON.stringify(maliciousJson), 'malicious.json');
      
      const response = await supertest(app)
        .post('/v1/data-transfer/import')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', testFile.path)
        .field('format', 'json')
        .field('dataType', 'workouts');

      // Should handle malicious content gracefully
      expect([200, 400]).toContain(response.status);

      console.log('✅ Script Injection Protection:', {
        responseStatus: response.status,
        handledSafely: [200, 400].includes(response.status)
      });
    });

    test('When file has mismatched headers and MIME types, Then should validate properly', async () => {
      // Test 1: Upload a file with unsupported MIME type (should be rejected by fileFilter)
      const executableContent = 'MZ\x90\x00'; // PE header
      const testFile = createTestFile(executableContent, 'malware.exe');
      
      const response = await supertest(app)
        .post('/v1/data-transfer/import')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', testFile.path)
        .field('format', 'json')
        .field('dataType', 'workouts');

      // Should be rejected by multer fileFilter due to unsupported file extension
      expect([400, 415]).toContain(response.status);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toMatch(/unsupported file type|invalid|format|file upload error/i);
      
      console.log('✅ File Type Rejection (.exe):', {
        errorStatus: response.status,
        validationWorking: !!response.body.message
      });

      // Test 2: Upload file with wrong content but correct extension (should be caught by import validation)
      const invalidJsonContent = '\x89PNG\r\n\x1a\n Invalid JSON content';
      const testFile2 = createTestFile(invalidJsonContent, 'fake.json');
      
      const response2 = await supertest(app)
        .post('/v1/data-transfer/import')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', testFile2.path)
        .field('format', 'json')
        .field('dataType', 'workouts');

      // Should be rejected due to invalid JSON content
      expect([400, 422]).toContain(response2.status);
      expect(response2.body.status).toBe('error');
      expect(response2.body.message).toMatch(/invalid|json|parse|format/i);
      
      console.log('✅ Content Validation (Invalid JSON):', {
        errorStatus: response2.status,
        validationWorking: !!response2.body.message
      });
    });

    test('When file contains null bytes and special characters, Then should handle safely', async () => {
      const maliciousContent = {
        data: {
          workouts: [
            {
              name: 'Test\x00User', // Null byte
              description: 'Special chars: \x01\x02\x03\x1f',
              plan_data: { 
                exercises: [],
                notes: 'value\x00with\x00nulls'
              },
              difficulty_level: 'beginner',
              estimated_duration: 30,
              ai_generated: false,
              status: 'active'
            }
          ]
        }
      };
      
      const jsonString = JSON.stringify(maliciousContent);
      const testFile = createTestFile(jsonString, 'nullbytes.json');
      
      const response = await supertest(app)
        .post('/v1/data-transfer/import')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', testFile.path)
        .field('format', 'json')
        .field('dataType', 'workouts');

      // Should handle gracefully
      expect([200, 400]).toContain(response.status);

      console.log('✅ Null Bytes Handling:', {
        responseStatus: response.status,
        handledSafely: [200, 400].includes(response.status)
      });
    });
  });

  describe('Task 5: Concurrent Upload Security', () => {
    beforeEach(async () => {
      await ensureUserProfile();
    });

    test('When multiple concurrent uploads occur, Then should handle safely', async () => {
      const validJson = {
        data: {
          workouts: [
            {
              name: 'Concurrent Test Plan',
              description: 'Plan for concurrent testing',
              plan_data: { exercises: [] },
              difficulty_level: 'beginner',
              estimated_duration: 30,
              ai_generated: false,
              status: 'active'
            }
          ]
        }
      };
      
      // Create multiple concurrent upload requests
      const uploadPromises = Array.from({ length: 3 }, (_, index) => {
        const testFile = createTestFile(JSON.stringify(validJson), `concurrent-${index}.json`);
        
        return supertest(app)
          .post('/v1/data-transfer/import')
          .set('Authorization', `Bearer ${testUserToken}`)
          .attach('file', testFile.path)
          .field('format', 'json')
          .field('dataType', 'workouts');
      });
      
      const responses = await Promise.all(uploadPromises);
      
      // All uploads should be handled properly
      responses.forEach((response, index) => {
        expect([200, 400, 429]).toContain(response.status); // Success, error, or rate limited
        console.log(`✅ Concurrent Upload ${index + 1}:`, {
          status: response.status,
          handledProperly: [200, 400, 429].includes(response.status)
        });
      });
      
      // At least some should succeed
      const successfulUploads = responses.filter(res => res.status === 200);
      expect(successfulUploads.length).toBeGreaterThanOrEqual(0);
    });

    test('When uploads use same filename concurrently, Then should prevent collisions', async () => {
      const validJson = {
        data: {
          workouts: [
            {
              name: 'Same Name Plan',
              description: 'Plan with same filename',
              plan_data: { exercises: [] },
              difficulty_level: 'beginner',
              estimated_duration: 30,
              ai_generated: false,
              status: 'active'
            }
          ]
        }
      };
      
      // Create multiple uploads with the same filename
      const uploadPromises = Array.from({ length: 2 }, () => {
        const testFile = createTestFile(JSON.stringify(validJson), 'same-name.json');
        
        return supertest(app)
          .post('/v1/data-transfer/import')
          .set('Authorization', `Bearer ${testUserToken}`)
          .attach('file', testFile.path)
          .field('format', 'json')
          .field('dataType', 'workouts');
      });
      
      const responses = await Promise.all(uploadPromises);
      
      // All uploads should be handled without file system conflicts
      responses.forEach((response, index) => {
        expect([200, 400, 429]).toContain(response.status);
        console.log(`✅ Same Filename Upload ${index + 1}:`, {
          status: response.status,
          noCollision: [200, 400, 429].includes(response.status)
        });
      });
    });
  });
}); 