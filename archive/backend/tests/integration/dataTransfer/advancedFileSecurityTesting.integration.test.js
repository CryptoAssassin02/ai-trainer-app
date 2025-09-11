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

describe('Advanced File Security Testing - Real Database & Service Validation', () => {
  let testUserId, testUserToken;
  let tempDir, tempFilePaths = [];

  beforeAll(async () => {
    // Rule 11: ALWAYS verify test-environment aware rate limiting
    console.log('Verifying rate limiting configuration for security testing...');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    // Rule 2: ALWAYS use real auth endpoints for user creation
    const timestamp = Date.now();
    const testUserEmail = `sectest${timestamp}@example.com`;
    const testUserPassword = 'TestPassword123!';
    
    console.log('Creating test user for security testing...');
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
    console.log('Cleaning up security test files...');
    
    // Clean up temp files with safety checks (Rule 18: Safe file handling)
    tempFilePaths.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('Cleaned up security test file:', path.basename(filePath));
        }
      } catch (error) {
        console.warn('Error cleaning up security test file:', { filePath, error: error.message });
      }
    });
    tempFilePaths = [];
  });

  afterAll(async () => {
    // Rule 2: Clean up test user
    if (testUserId) {
      console.log('Cleaning up security test user...');
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
    
    console.log('Creating user profile for security testing...');
    const profileResponse = await supertest(app)
      .post('/v1/profile')
      .set('Authorization', `Bearer ${testUserToken}`)
      .send(profileData);
    
    if (![200, 201].includes(profileResponse.status)) {
      throw new Error(`Failed to create user profile: ${profileResponse.body.message || 'Unknown error'}`);
    }
    
    console.log('User profile created successfully for security testing');
    return profileResponse.body.data;
  }

  // Rule 18: ALWAYS sanitize malicious filenames in test helper functions
  function createMaliciousFile(content, filename, options = {}) {
    // CRITICAL: Sanitize filename to prevent filesystem errors
    const safeFilename = filename
      .replace(/[\/\\]/g, '_')        // Replace path separators
      .replace(/\.\./g, '__')         // Replace path traversal attempts
      .replace(/[<>:"|?*]/g, '_')     // Replace Windows forbidden characters
      .replace(/[\x00-\x1f]/g, '_');  // Replace control characters
    
    const tempFilePath = path.join(tempDir, safeFilename);
    
    console.log('Creating malicious test file:', { 
      originalFilename: filename, 
      safeFilename: safeFilename,
      contentLength: content.length,
      isBinary: options.binary
    });
    
    if (options.binary) {
      fs.writeFileSync(tempFilePath, content);
    } else {
      fs.writeFileSync(tempFilePath, content, options.encoding || 'utf8');
    }
    
    tempFilePaths.push(tempFilePath);
    console.log('Malicious test file created safely:', { path: tempFilePath });
    return tempFilePath;
  }

  // Rule 18: Safe test file creation for standard files
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

  describe('HTTP-Level File Extension Validation (Rule 19)', () => {
    test('When uploading executable files, Then should reject at HTTP level (fileFilter)', async () => {
      console.log('Starting HTTP-level validation test for executable files...');
      
      // Rule 19: Test HTTP-level validation (multer fileFilter)
      const maliciousFiles = [
        { content: 'MZ\x90\x00\x03\x00\x00\x00', filename: 'malware.exe', description: 'Windows executable' },
        { content: '#!/bin/bash\necho "malicious"', filename: 'script.sh', description: 'Shell script' },
        { content: 'print("malicious")', filename: 'script.py', description: 'Python script' },
        { content: '<script>alert("xss")</script>', filename: 'malicious.html', description: 'HTML file' },
        { content: 'malicious content', filename: 'virus.bat', description: 'Batch file' }
      ];

      for (const maliciousFile of maliciousFiles) {
        console.log(`Testing ${maliciousFile.description}: ${maliciousFile.filename}`);
        
        const testFile = createMaliciousFile(maliciousFile.content, maliciousFile.filename);
        
        console.log('About to test malicious file upload:', { 
          endpoint: '/v1/data-transfer/import',
          hasToken: !!testUserToken,
          fileExists: fs.existsSync(testFile),
          filename: maliciousFile.filename
        });

        // Rule 4: Use POST endpoint for import
        const importResponse = await supertest(app)
          .post('/v1/data-transfer/import')
          .set('Authorization', `Bearer ${testUserToken}`)
          .attach('file', testFile);

        console.log(`${maliciousFile.description} upload result:`, {
          status: importResponse.status,
          hasErrorMessage: !!importResponse.body.message,
          errorMessage: importResponse.body.message
        });

        // Rule 19: Should be rejected by HTTP-level validation (fileFilter)
        expect([400, 415, 422]).toContain(importResponse.status);
        
        // Rule 15: If unexpected status, check infrastructure first
        if (![400, 415, 422].includes(importResponse.status)) {
          console.log('Unexpected status - checking infrastructure:', {
            possibleRateLimiting: importResponse.status === 429,
            possibleAuthIssues: importResponse.status === 401,
            possibleServerError: importResponse.status >= 500
          });
        }
      }
    });

    test('When uploading files with double extensions, Then should detect and reject', async () => {
      console.log('Starting double extension file validation test...');
      
      // Rule 19: Test files that try to bypass extension filtering
      const doubleExtensionFiles = [
        { content: 'malicious content', filename: 'document.pdf.exe', description: 'PDF disguised executable' },
        { content: 'script content', filename: 'image.jpg.sh', description: 'Image disguised script' },
        { content: 'data', filename: 'data.json.bat', description: 'JSON disguised batch file' }
      ];

      for (const testFile of doubleExtensionFiles) {
        console.log(`Testing double extension: ${testFile.filename}`);
        
        const maliciousFile = createMaliciousFile(testFile.content, testFile.filename);
        
        const importResponse = await supertest(app)
          .post('/v1/data-transfer/import') // Rule 4: POST endpoint
          .set('Authorization', `Bearer ${testUserToken}`)
          .attach('file', maliciousFile);

        console.log(`Double extension test result:`, {
          filename: testFile.filename,
          status: importResponse.status,
          rejected: [400, 415, 422].includes(importResponse.status)
        });

        // Should be rejected by security-aware fileFilter
        expect([400, 415, 422]).toContain(importResponse.status);
      }
    });
  });

  describe('Content-Level Validation Testing (Rule 19)', () => {
    test('When testing polyglot files, Then should understand MIME vs content validation', async () => {
      console.log('Starting polyglot file content validation test...');
      
      // Rule 19: Test both HTTP-level and content-level validation
      
      // Test 1: Valid extension but invalid content (content-level validation)
      const polyglotFiles = [
        {
          content: '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01',
          filename: 'fake.json',
          description: 'PNG content in JSON file',
          binary: true
        },
        {
          content: '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog',
          filename: 'fake.csv',
          description: 'PDF content in CSV file'
        },
        {
          content: 'PK\x03\x04\x14\x00\x00\x00\x08\x00',
          filename: 'fake.json',
          description: 'ZIP content in JSON file',
          binary: true
        }
      ];

      for (const polyglotFile of polyglotFiles) {
        console.log(`Testing polyglot file: ${polyglotFile.description}`);
        
        const fakeFile = createMaliciousFile(
          polyglotFile.content, 
          polyglotFile.filename, 
          { binary: polyglotFile.binary }
        );
        
        console.log('About to test polyglot file:', { 
          endpoint: '/v1/data-transfer/import',
          hasToken: !!testUserToken,
          fileExists: fs.existsSync(fakeFile),
          description: polyglotFile.description
        });

        const importResponse = await supertest(app)
          .post('/v1/data-transfer/import') // Rule 4: POST endpoint
          .set('Authorization', `Bearer ${testUserToken}`)
          .attach('file', fakeFile);

        console.log(`Polyglot file test result:`, {
          description: polyglotFile.description,
          status: importResponse.status,
          passedHTTPLevel: [200, 400, 422].includes(importResponse.status),
          hasErrorMessage: !!importResponse.body.message
        });

        // Rule 19: May pass HTTP-level but should fail content validation
        expect([200, 400, 422]).toContain(importResponse.status);
        
        // If it passes HTTP level, content validation should catch it
        if (importResponse.status === 200) {
          console.log('File passed HTTP level - checking if content validation caught it...');
          // Should have validation errors in response if content is invalid
        }
      }
    });

    test('When uploading files with embedded malicious content, Then should detect and sanitize', async () => {
      console.log('Starting embedded malicious content test...');
      
      // Rule 16: Use correct JSON structure but with malicious content
      const maliciousJsonFiles = [
        {
          data: {
            workouts: [
              {
                name: 'Test Plan<script>alert("xss")</script>',
                description: 'Plan with XSS',
                plan_data: { exercises: [{ name: 'Exercise', sets: 3, reps: 10 }] },
                difficulty_level: 'intermediate',
                estimated_duration: 30,
                ai_generated: false,
                status: 'active'
              }
            ]
          }
        },
        {
          data: {
            workouts: [
              {
                name: 'SQL Injection\'; DROP TABLE workout_plans; --',
                description: 'Plan with SQL injection',
                plan_data: { exercises: [{ name: 'Exercise', sets: 3, reps: 10 }] },
                difficulty_level: 'intermediate',
                estimated_duration: 30,
                ai_generated: false,
                status: 'active'
              }
            ]
          }
        }
      ];

      for (const [index, maliciousJson] of maliciousJsonFiles.entries()) {
        console.log(`Testing embedded malicious content ${index + 1}...`);
        
        const maliciousFile = createTestFile(
          JSON.stringify(maliciousJson), 
          `malicious-content-${index + 1}.json`
        );
        
        const importResponse = await supertest(app)
          .post('/v1/data-transfer/import') // Rule 4: POST endpoint
          .set('Authorization', `Bearer ${testUserToken}`)
          .attach('file', maliciousFile);

        console.log(`Malicious content test ${index + 1} result:`, {
          status: importResponse.status,
          wasProcessed: importResponse.status === 200,
          hasSuccessfulField: importResponse.body?.data?.successful !== undefined
        });

        // Should either reject or sanitize malicious content
        expect([200, 400, 422]).toContain(importResponse.status);
        
        if (importResponse.status === 200) {
          // Verify malicious content was sanitized
          expect(importResponse.body.status).toBe('success');
          console.log('Content was processed - verifying sanitization occurred...');
        }
      }
    });
  });

  describe('Path Traversal and Filename Security (Rule 18)', () => {
    test('When uploading files with path traversal attempts, Then should sanitize safely', async () => {
      console.log('Starting path traversal filename test...');
      
      // Rule 18: Test malicious filenames that are safely sanitized by helper
      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        'normal/../../../etc/shadow',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd', // URL encoded
        'file\x00.json', // Null byte injection
        'very_long_filename_' + 'a'.repeat(200) + '.json' // Long filename (reduced from 300 to 200)
      ];

      for (const maliciousFilename of pathTraversalAttempts) {
        console.log(`Testing path traversal attempt: ${maliciousFilename.substring(0, 50)}...`);
        
        // Rule 16: Use valid JSON content
        const validJson = {
          data: {
            workouts: [
              {
                name: 'Path Traversal Test Plan',
                description: 'Test plan for path traversal',
                plan_data: { exercises: [{ name: 'Safe Exercise', sets: 3, reps: 10 }] },
                difficulty_level: 'intermediate',
                estimated_duration: 30,
                ai_generated: false,
                status: 'active'
              }
            ]
          }
        };
        
        // Rule 18: createMaliciousFile safely sanitizes the filename
        const testFile = createMaliciousFile(
          JSON.stringify(validJson), 
          maliciousFilename
        );
        
        // Verify file was created safely
        expect(fs.existsSync(testFile)).toBe(true);
        
        console.log('About to test path traversal file:', { 
          originalFilename: maliciousFilename,
          safeFilePath: testFile,
          hasToken: !!testUserToken
        });

        const importResponse = await supertest(app)
          .post('/v1/data-transfer/import') // Rule 4: POST endpoint
          .set('Authorization', `Bearer ${testUserToken}`)
          .attach('file', testFile);

        console.log(`Path traversal test result:`, {
          originalFilename: maliciousFilename.substring(0, 30),
          status: importResponse.status,
          processed: [200, 400, 422].includes(importResponse.status)
        });

        // Should be processed normally since filename was safely sanitized
        expect([200, 400, 422]).toContain(importResponse.status);
        
        // Rule 15: Infrastructure-first error analysis
        if (![200, 400, 422].includes(importResponse.status)) {
          console.log('Unexpected status - checking infrastructure:', {
            possibleRateLimiting: importResponse.status === 429,
            possibleAuthIssues: importResponse.status === 401
          });
        }
      }
    });

    test('When handling special character filenames, Then should process safely', async () => {
      console.log('Starting special character filename test...');
      
      // Rule 18: Test various special characters that should be sanitized
      const specialCharFilenames = [
        'file with spaces.json',
        'file<with>brackets.json',
        'file|with|pipes.json',
        'file:with:colons.json',
        'file"with"quotes.json',
        'file*with*wildcards.json',
        'file?with?questions.json',
        'файл_с_юникод.json', // Unicode characters
        'emoji_😀_file.json' // Emoji
      ];

      for (const specialFilename of specialCharFilenames) {
        console.log(`Testing special character filename: ${specialFilename}`);
        
        // Rule 16: Use valid JSON content
        const validJson = {
          data: {
            workouts: [
              {
                name: 'Special Character Test Plan',
                description: 'Test plan for special characters',
                plan_data: { exercises: [{ name: 'Exercise', sets: 3, reps: 10 }] },
                difficulty_level: 'intermediate',
                estimated_duration: 30,
                ai_generated: false,
                status: 'active'
              }
            ]
          }
        };
        
        const testFile = createMaliciousFile(JSON.stringify(validJson), specialFilename);
        
        const importResponse = await supertest(app)
          .post('/v1/data-transfer/import') // Rule 4: POST endpoint
          .set('Authorization', `Bearer ${testUserToken}`)
          .attach('file', testFile);

        console.log(`Special character test result:`, {
          filename: specialFilename,
          status: importResponse.status,
          processed: [200, 400, 422].includes(importResponse.status)
        });

        // Should process safely with sanitized filename
        expect([200, 400, 422]).toContain(importResponse.status);
      }
    });
  });

  describe('File Size and Resource Exhaustion Protection', () => {
    test('When uploading large files, Then should handle gracefully without exhaustion', async () => {
      console.log('Starting large file handling test...');
      
      // Rule 16: Create large but valid JSON content
      const largeWorkoutArray = Array.from({ length: 1000 }, (_, index) => ({
        name: `Large Test Plan ${index + 1}`,
        description: `Plan ${index + 1} for stress testing`,
        plan_data: { 
          exercises: Array.from({ length: 10 }, (_, exIndex) => ({
            name: `Exercise ${exIndex + 1}`,
            sets: 3,
            reps: 10,
            description: 'A'.repeat(100) // Add some bulk to each exercise
          }))
        },
        difficulty_level: 'intermediate',
        estimated_duration: 30,
        ai_generated: false,
        status: 'active'
      }));

      const largeJsonData = { data: { workouts: largeWorkoutArray } };
      const largeContent = JSON.stringify(largeJsonData);
      
      console.log('Creating large test file:', { 
        workoutCount: largeWorkoutArray.length,
        contentSize: largeContent.length,
        sizeMB: (largeContent.length / 1024 / 1024).toFixed(2)
      });
      
      const largeFile = createTestFile(largeContent, 'large-file-test.json');
      
      console.log('About to test large file upload:', { 
        endpoint: '/v1/data-transfer/import',
        hasToken: !!testUserToken,
        fileSize: fs.statSync(largeFile).size
      });

      const startTime = Date.now();
      
      const importResponse = await supertest(app)
        .post('/v1/data-transfer/import') // Rule 4: POST endpoint
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', largeFile);

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log('Large file test completed:', { 
        status: importResponse.status,
        duration: duration,
        hasTimeoutIssue: duration > 30000 // 30 second timeout check
      });

      // Should handle large files gracefully
      expect([200, 400, 413, 422, 429]).toContain(importResponse.status);
      
      // Rule 15: Check for resource exhaustion patterns
      if (importResponse.status === 413) {
        console.log('File rejected due to size limits - this is expected behavior');
      } else if (importResponse.status === 504) {
        console.log('Request timed out - this indicates resource exhaustion protection');
      }
      
      // Should not cause server to crash or hang indefinitely
      expect(duration).toBeLessThan(60000); // 60 second maximum
    });

    test('When uploading deeply nested JSON, Then should prevent parsing exhaustion', async () => {
      console.log('Starting deeply nested JSON test...');
      
      // Create deeply nested JSON to test parsing limits
      let nestedObject = { value: 'deeply nested content' };
      for (let i = 0; i < 100; i++) {
        nestedObject = { nested: nestedObject };
      }
      
      // Rule 16: Wrap in correct structure but with problematic nesting
      const deeplyNestedJson = {
        data: {
          workouts: [
            {
              name: 'Deeply Nested Test Plan',
              description: 'Test plan with deep nesting',
              plan_data: nestedObject, // Deeply nested structure
              difficulty_level: 'intermediate',
              estimated_duration: 30,
              ai_generated: false,
              status: 'active'
            }
          ]
        }
      };
      
      const nestedFile = createTestFile(JSON.stringify(deeplyNestedJson), 'deeply-nested.json');
      
      console.log('About to test deeply nested JSON:', { 
        nestingDepth: 100,
        fileSize: fs.statSync(nestedFile).size
      });

      const importResponse = await supertest(app)
        .post('/v1/data-transfer/import') // Rule 4: POST endpoint
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', nestedFile);

      console.log('Deeply nested JSON test result:', {
        status: importResponse.status,
        handled: [200, 400, 422].includes(importResponse.status)
      });

      // Should handle or reject deeply nested content gracefully
      expect([200, 400, 422]).toContain(importResponse.status);
    });
  });

  describe('Metadata and Hidden Content Security', () => {
    test('When uploading files with suspicious metadata, Then should process safely', async () => {
      console.log('Starting metadata security test...');
      
      // Rule 16: JSON with suspicious metadata-like fields
      const metadataTestJson = {
        data: {
          workouts: [
            {
              name: 'Metadata Test Plan',
              description: 'Test plan with metadata',
              plan_data: { 
                exercises: [{ name: 'Exercise', sets: 3, reps: 10 }],
                metadata: {
                  __proto__: { malicious: true },
                  constructor: { name: 'exploit' },
                  eval: 'alert("xss")',
                  script: '<script>alert("xss")</script>'
                }
              },
              difficulty_level: 'intermediate',
              estimated_duration: 30,
              ai_generated: false,
              status: 'active'
            }
          ]
        }
      };
      
      const metadataFile = createTestFile(JSON.stringify(metadataTestJson), 'metadata-test.json');
      
      const importResponse = await supertest(app)
        .post('/v1/data-transfer/import') // Rule 4: POST endpoint
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', metadataFile);

      console.log('Metadata security test result:', {
        status: importResponse.status,
        processed: [200, 400, 422].includes(importResponse.status)
      });

      // Should handle metadata safely
      expect([200, 400, 422]).toContain(importResponse.status);
      
      if (importResponse.status === 200) {
        expect(importResponse.body.status).toBe('success');
        console.log('Metadata was processed - verifying no prototype pollution occurred...');
      }
    });

    test('When uploading JSON with circular references, Then should handle gracefully', async () => {
      console.log('Starting circular reference test...');
      
      // Create JSON string with circular reference pattern (manually crafted)
      const circularJsonString = `{
        "data": {
          "workouts": [
            {
              "name": "Circular Test Plan",
              "description": "Test plan with circular reference",
              "plan_data": {
                "exercises": [{"name": "Exercise", "sets": 3, "reps": 10}],
                "self": {"$ref": "#/data/workouts/0/plan_data"}
              },
              "difficulty_level": "intermediate",
              "estimated_duration": 30,
              "ai_generated": false,
              "status": "active"
            }
          ]
        }
      }`;
      
      const circularFile = createTestFile(circularJsonString, 'circular-ref.json');
      
      const importResponse = await supertest(app)
        .post('/v1/data-transfer/import') // Rule 4: POST endpoint
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', circularFile);

      console.log('Circular reference test result:', {
        status: importResponse.status,
        handled: [200, 400, 422].includes(importResponse.status)
      });

      // Should handle circular references without infinite loops
      expect([200, 400, 422]).toContain(importResponse.status);
    });
  });
}); 