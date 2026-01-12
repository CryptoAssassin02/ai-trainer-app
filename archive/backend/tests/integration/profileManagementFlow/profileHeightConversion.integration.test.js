const supertest = require('supertest');
const { app, startServer, closeServer } = require('../../../server');
const { getSupabaseClient } = require('../../../services/supabase');

let server;
let supabase;
let userToken;
let userId;
let userEmail;

const userName = 'Imperial Height Test User';
const userPassword = 'Password123!';

describe('Imperial Height Object Format & Unit Conversion Integration Tests (/v1/profile)', () => {
  beforeEach(async () => {
    // Generate unique email for each test to avoid conflicts
    const testId = Date.now() + Math.floor(Math.random() * 10000);
    userEmail = `imperialheight${testId}@example.com`;
    
    supabase = getSupabaseClient();

    // Create a fresh user for each test
    const signupResponse = await supertest(app)
      .post('/v1/auth/signup')
      .send({ name: userName, email: userEmail, password: userPassword })
      .expect(201);
    
    userId = signupResponse.body.userId;
    userToken = signupResponse.body.accessToken;

    if (!userToken) {
        const loginResponse = await supertest(app)
            .post('/v1/auth/login')
            .send({ email: userEmail, password: userPassword })
            .expect(200);
        userToken = loginResponse.body.jwtToken;
    }

    if (!userToken) {
        throw new Error('Failed to retrieve token for imperial height test user.');
    }
  });

  describe('Task 2.1: Imperial Height Input Format Testing', () => {
    describe('Valid imperial height object submission', () => {
      it('should accept height format {feet: 5, inches: 11} without errors', async () => {
        const profileData = {
          height: { feet: 5, inches: 11 },
          weight: 150,
          age: 28,
          gender: 'male',
          unitPreference: 'imperial',
          goals: ['muscle_gain'],
          equipment: ['dumbbells'],
          experienceLevel: 'intermediate'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(profileData)
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.message).toBe('Profile updated successfully');
        expect(response.body.data.userId).toBe(userId);
        expect(response.body.data.height).toEqual({ feet: 5, inches: 11 });
      });

      it('should accept height format {feet: 6, inches: 0} (exactly 6 feet)', async () => {
        const profileData = {
          height: { feet: 6, inches: 0 },
          weight: 180,
          age: 30,
          gender: 'male',
          unitPreference: 'imperial',
          goals: ['strength_increase'],
          equipment: ['barbell'],
          experienceLevel: 'advanced'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(profileData)
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.height).toEqual({ feet: 6, inches: 0 });
      });

      it('should accept height format {feet: 5, inches: 6} (5 feet 6 inches)', async () => {
        const profileData = {
          height: { feet: 5, inches: 6 },
          weight: 130,
          age: 25,
          gender: 'female',
          unitPreference: 'imperial',
          goals: ['weight_loss'],
          equipment: ['mat'],
          experienceLevel: 'beginner'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(profileData)
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.height).toEqual({ feet: 5, inches: 6 });
      });
    });

    describe('Imperial height conversion accuracy', () => {
      it('should store {feet: 6, inches: 0} as 72 inches (182.9 cm) in database', async () => {
        const profileData = {
          height: { feet: 6, inches: 0 },
          weight: 180,
          age: 30,
          gender: 'male',
          unitPreference: 'imperial'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(profileData)
          .expect(200);

        // Verify conversion in database (should be stored as cm)
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('height')
          .eq('user_id', userId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.height).toBeCloseTo(182.9, 1); // 6'0" = 182.9 cm
      });

      it('should store {feet: 5, inches: 6} as 66 inches (167.6 cm) in database', async () => {
        const profileData = {
          height: { feet: 5, inches: 6 },
          weight: 130,
          age: 25,
          gender: 'female',
          unitPreference: 'imperial'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(profileData)
          .expect(200);

        // Verify conversion in database (should be stored as cm)
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('height')
          .eq('user_id', userId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.height).toBeCloseTo(167.6, 1); // 5'6" = 167.6 cm
      });

      it('should store {feet: 5, inches: 11} as 71 inches (180.3 cm) in database', async () => {
        const profileData = {
          height: { feet: 5, inches: 11 },
          weight: 160,
          age: 28,
          gender: 'male',
          unitPreference: 'imperial'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(profileData)
          .expect(200);

        // Verify conversion in database (should be stored as cm)
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('height')
          .eq('user_id', userId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.height).toBeCloseTo(180.3, 1); // 5'11" = 180.3 cm
      });
    });
  });

  describe('Task 2.2: Imperial Height Validation Testing', () => {
    describe('Invalid feet values', () => {
      it('should reject negative feet: {feet: -1, inches: 6} with HTTP 400', async () => {
        const profileData = {
          height: { feet: -1, inches: 6 },
          weight: 150,
          age: 28,
          gender: 'male',
          unitPreference: 'imperial'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(profileData)
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toContain('Feet cannot be negative');
      });

      it('should reject non-integer feet: {feet: 5.5, inches: 6} with HTTP 400', async () => {
        const profileData = {
          height: { feet: 5.5, inches: 6 },
          weight: 150,
          age: 28,
          gender: 'male',
          unitPreference: 'imperial'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(profileData)
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toContain('Feet must be a whole number');
      });

      it('should reject missing feet: {inches: 6} with HTTP 400', async () => {
        const profileData = {
          height: { inches: 6 },
          weight: 150,
          age: 28,
          gender: 'male',
          unitPreference: 'imperial'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(profileData)
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toContain('Feet is required');
      });
    });

    describe('Invalid inches values', () => {
      it('should reject negative inches: {feet: 5, inches: -1} with HTTP 400', async () => {
        const profileData = {
          height: { feet: 5, inches: -1 },
          weight: 150,
          age: 28,
          gender: 'male',
          unitPreference: 'imperial'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(profileData)
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toContain('Inches cannot be negative');
      });

      it('should reject inches >= 12: {feet: 5, inches: 12} with HTTP 400', async () => {
        const profileData = {
          height: { feet: 5, inches: 12 },
          weight: 150,
          age: 28,
          gender: 'male',
          unitPreference: 'imperial'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(profileData)
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toContain('Inches must be less than 12');
      });

      it('should reject non-integer inches: {feet: 5, inches: 6.5} with HTTP 400', async () => {
        const profileData = {
          height: { feet: 5, inches: 6.5 },
          weight: 150,
          age: 28,
          gender: 'male',
          unitPreference: 'imperial'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(profileData)
          .expect(400);

        expect(response.body.status).toBe('error');
        // Note: Depending on validation implementation, this might be caught by Joi or custom validation
      });

      it('should reject missing inches: {feet: 5} with HTTP 400', async () => {
        const profileData = {
          height: { feet: 5 },
          weight: 150,
          age: 28,
          gender: 'male',
          unitPreference: 'imperial'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(profileData)
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toContain('Inches is required');
      });
    });

    describe('Malformed height object', () => {
      it('should reject extra properties: {feet: 5, inches: 6, cm: 170} with HTTP 400', async () => {
        const profileData = {
          height: { feet: 5, inches: 6, cm: 170 },
          weight: 150,
          age: 28,
          gender: 'male',
          unitPreference: 'imperial'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(profileData)
          .expect(400);

        expect(response.body.status).toBe('error');
        // The exact error message depends on validation implementation
      });

      it('should reject empty object: {} with HTTP 400', async () => {
        const profileData = {
          height: {},
          weight: 150,
          age: 28,
          gender: 'male',
          unitPreference: 'imperial'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(profileData)
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toContain('does not match any of the allowed types');
      });

      it('should reject wrong data types: {feet: "5", inches: "6"} with HTTP 400', async () => {
        const profileData = {
          height: { feet: "5", inches: "6" },
          weight: 150,
          age: 28,
          gender: 'male',
          unitPreference: 'imperial'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(profileData)
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toContain('does not match any of the allowed types');
      });
    });
  });

  describe('Task 2.3: Unit System Integration Testing', () => {
    describe('Metric vs Imperial distinction', () => {
      it('should accept unitPreference: "metric" with height as number', async () => {
        const profileData = {
          height: 175, // centimeters
          weight: 70,
          age: 28,
          gender: 'male',
          unitPreference: 'metric',
          goals: ['weight_loss'],
          equipment: ['dumbbells'],
          experienceLevel: 'intermediate'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(profileData)
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.height).toBe(175);
        expect(response.body.data.unitPreference).toBe('metric');
      });

      it('should accept unitPreference: "imperial" with height as object', async () => {
        const profileData = {
          height: { feet: 5, inches: 9 },
          weight: 154, // pounds
          age: 28,
          gender: 'male',
          unitPreference: 'imperial',
          goals: ['muscle_gain'],
          equipment: ['barbell'],
          experienceLevel: 'intermediate'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(profileData)
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.height).toEqual({ feet: 5, inches: 9 });
        expect(response.body.data.unitPreference).toBe('imperial');
      });
    });

    describe('Round-trip conversion testing', () => {
      it('should maintain consistency: submit imperial → store → retrieve → display', async () => {
        const originalHeight = { feet: 5, inches: 10 };
        const profileData = {
          height: originalHeight,
          weight: 165,
          age: 30,
          gender: 'male',
          unitPreference: 'imperial'
        };

        // Submit imperial height
        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(profileData)
          .expect(200);

        // Retrieve profile and verify round-trip consistency
        const getResponse = await supertest(app)
          .get('/v1/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(getResponse.body.status).toBe('success');
        expect(getResponse.body.data.height).toEqual(originalHeight);
        expect(getResponse.body.data.unitPreference).toBe('imperial');

        // Verify storage conversion in database (should be stored as cm)
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('height')
          .eq('user_id', userId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.height).toBeCloseTo(177.8, 1); // 5'10" = 177.8 cm
      });
    });
  });

  describe('Task 2.4: Mixed Unit Scenarios', () => {
    describe('Unit preference vs height format mismatches', () => {
      it('should handle unitPreference: "metric" with height as number correctly', async () => {
        const profileData = {
          height: 170, // cm - correct format for metric
          weight: 70,
          age: 28,
          gender: 'male',
          unitPreference: 'metric'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(profileData)
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.height).toBe(170);
      });

      it('should handle unitPreference: "imperial" with height as object correctly', async () => {
        const profileData = {
          height: { feet: 5, inches: 8 }, // correct format for imperial
          weight: 150,
          age: 28,
          gender: 'female',
          unitPreference: 'imperial'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(profileData)
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.height).toEqual({ feet: 5, inches: 8 });
      });
    });
  });

  describe('Task 2.5: Conversion Boundary Testing', () => {
    describe('Extreme valid values', () => {
      it('should handle minimum height: {feet: 0, inches: 1} (1 inch total)', async () => {
        const profileData = {
          height: { feet: 0, inches: 1 },
          weight: 50,
          age: 18,
          gender: 'other',
          unitPreference: 'imperial'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(profileData)
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.height).toEqual({ feet: 0, inches: 1 });

        // Verify conversion: 1 inch = 2.54 cm
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('height')
          .eq('user_id', userId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.height).toBeCloseTo(2.5, 1);
      });

      it('should handle maximum reasonable height: {feet: 8, inches: 11} (107 inches total)', async () => {
        const profileData = {
          height: { feet: 8, inches: 11 },
          weight: 300,
          age: 25,
          gender: 'male',
          unitPreference: 'imperial'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(profileData)
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.height).toEqual({ feet: 8, inches: 11 });

        // Verify conversion: 107 inches = 271.8 cm
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('height')
          .eq('user_id', userId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.height).toBeCloseTo(271.8, 1);
      });
    });

    describe('Precision testing', () => {
      it('should maintain precision in feet→inches conversion for {feet: 7, inches: 3}', async () => {
        const profileData = {
          height: { feet: 7, inches: 3 },
          weight: 220,
          age: 32,
          gender: 'male',
          unitPreference: 'imperial'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(profileData)
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.height).toEqual({ feet: 7, inches: 3 });

        // Manual calculation: 7*12 + 3 = 87 inches = 220.98 cm
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('height')
          .eq('user_id', userId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.height).toBeCloseTo(220.98, 1);
      });

      it('should verify no precision loss in conversion for {feet: 6, inches: 4}', async () => {
        const profileData = {
          height: { feet: 6, inches: 4 },
          weight: 185,
          age: 29,
          gender: 'male',
          unitPreference: 'imperial'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send(profileData)
          .expect(200);

        // Manual calculation: 6*12 + 4 = 76 inches = 193.04 cm
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('height')
          .eq('user_id', userId)
          .single();
        
        expect(error).toBeNull();
        const expectedCm = (6 * 12 + 4) * 2.54; // 193.04
        expect(dbProfile.height).toBeCloseTo(expectedCm, 1);
      });
    });
  });

  describe('Database State Validation', () => {
    it('should verify that all imperial heights are stored as centimeters in database', async () => {
      const testCases = [
        { feet: 5, inches: 0, expectedCm: 152.4 },
        { feet: 5, inches: 6, expectedCm: 167.6 },
        { feet: 6, inches: 0, expectedCm: 182.9 },
        { feet: 6, inches: 6, expectedCm: 198.1 }
      ];

      for (const testCase of testCases) {
        // Create a new user for each test case
        const testId = Date.now() + Math.floor(Math.random() * 10000);
        const testEmail = `dbtest${testId}@example.com`;
        
        const signupResponse = await supertest(app)
          .post('/v1/auth/signup')
          .send({ name: 'DB Test User', email: testEmail, password: userPassword })
          .expect(201);
        
        const testUserId = signupResponse.body.userId;
        const testUserToken = signupResponse.body.accessToken || 
          (await supertest(app)
            .post('/v1/auth/login')
            .send({ email: testEmail, password: userPassword })
            .expect(200)).body.jwtToken;

        // Create profile with imperial height
        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${testUserToken}`)
          .send({
            height: { feet: testCase.feet, inches: testCase.inches },
            weight: 150,
            age: 28,
            gender: 'male',
            unitPreference: 'imperial'
          })
          .expect(200);

        // Verify database storage
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('height')
          .eq('user_id', testUserId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.height).toBeCloseTo(testCase.expectedCm, 1);
      }
    });
  });
}); 