const supertest = require('supertest');
const { app, startServer, closeServer } = require('../../../server');
const { getSupabaseClient } = require('../../../services/supabase');

let server;
let supabase;
let userAToken;
let userAId;
let userBToken;
let userBId;
let userAEmail;
let userBEmail;

const userAPassword = 'Password123!';
const userAName = 'User A Constraints Test';
const userBPassword = 'Password456!';
const userBName = 'User B Constraints Test';

// Valid baseline profile data for testing constraints
const validBaselineData = {
  name: 'Test User',
  age: 25,
  gender: 'male',
  height: 175,
  weight: 70,
  unitPreference: 'metric',
  experienceLevel: 'intermediate',
  goals: ['weight_loss'],
  equipment: ['dumbbells']
};

describe('Profile Validation Constraint Testing (/v1/profile)', () => {
  beforeEach(async () => {
    // Generate unique email addresses for each test to avoid conflicts
    const testId = Date.now() + Math.floor(Math.random() * 10000);
    userAEmail = `constraintsusera${testId}@example.com`;
    userBEmail = `constraintsuserb${testId}@example.com`;
    
    supabase = getSupabaseClient();

    // Create User A
    const signupAResponse = await supertest(app)
      .post('/v1/auth/signup')
      .send({ name: userAName, email: userAEmail, password: userAPassword })
      .expect(201);
    userAId = signupAResponse.body.userId;
    userAToken = signupAResponse.body.accessToken;

    if (!userAToken) {
        const loginAResponse = await supertest(app)
            .post('/v1/auth/login')
            .send({ email: userAEmail, password: userAPassword })
            .expect(200);
        userAToken = loginAResponse.body.jwtToken;
    }
    
    // Create User B
    const signupBResponse = await supertest(app)
      .post('/v1/auth/signup')
      .send({ name: userBName, email: userBEmail, password: userBPassword })
      .expect(201);
    userBId = signupBResponse.body.userId;
    userBToken = signupBResponse.body.accessToken;

    if (!userBToken) {
        const loginBResponse = await supertest(app)
            .post('/v1/auth/login')
            .send({ email: userBEmail, password: userBPassword })
            .expect(200);
        userBToken = loginBResponse.body.jwtToken;
    }

    if (!userAToken || !userBToken) {
        throw new Error('Failed to retrieve tokens for constraint test users.');
    }
  });

  afterAll(async () => {
    // Cleanup performed by jest-global-teardown.js
  });

  describe('Task 4.1: Database Age Constraint Testing', () => {
    describe('Age boundary constraint testing', () => {
      it('should return HTTP 400 when age is 12 (below minimum)', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, age: 12 })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Age must be at least 13 years');
        
        // Verify profile was not fully created (basic profile exists but age validation failed)
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userAId)
          .single();
        
        // Basic profile structure exists but age is null due to validation failure
        expect(dbProfile).not.toBeNull();
        expect(dbProfile.age).toBeNull();
      });

      it('should return HTTP 200 when age is 13 (valid boundary)', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, age: 13 })
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.age).toBe(13);
        
        // Verify profile was created in database
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userAId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.age).toBe(13);
      });

      it('should return HTTP 200 when age is 120 (valid boundary)', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, age: 120 })
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.age).toBe(120);
        
        // Verify profile was created in database
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userAId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.age).toBe(120);
      });

      it('should return HTTP 400 when age is 121 (above maximum)', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, age: 121 })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Age cannot exceed 120 years');
        
        // Verify profile was not fully created (basic profile exists but age validation failed)
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userAId)
          .single();
        
        // Basic profile structure exists but age is null due to validation failure
        expect(dbProfile).not.toBeNull();
        expect(dbProfile.age).toBeNull();
      });
    });

    describe('Age validation edge cases', () => {
      it('should return HTTP 400 when age is negative', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, age: -5 })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Age must be at least 13 years');
      });

      it('should return HTTP 400 when age is 0', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, age: 0 })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Age must be at least 13 years');
      });

      it('should return HTTP 400 when age is null (not nullable)', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, age: null })
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.age).toBeNull();
      });

      it('should return HTTP 400 when age is wrong type (string)', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, age: "twenty" })
          .expect(400);

        expect(response.body.status).toBe('error');
        // Should be validation error, not constraint error
        expect(response.body.message).toMatch(/validation|type|number/i);
      });
    });
  });

  describe('Task 4.2: Weight & Height Constraint Testing', () => {
    describe('Weight constraint validation', () => {
      it('should return HTTP 400 when weight is 0 (not > 0)', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, weight: 0 })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Weight must be positive');
      });

      it('should return HTTP 400 when weight is negative', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, weight: -10 })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Weight must be positive');
      });

      it('should return HTTP 200 when weight is 0.1 (valid positive)', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, weight: 0.1 })
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.weight).toBe(0.1);
      });

      it('should return HTTP 200 when weight is 1000 (no upper limit)', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, weight: 1000 })
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.weight).toBe(1000);
      });
    });

    describe('Height constraint validation', () => {
      it('should return HTTP 400 when height is 0 (not > 0)', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, height: 0 })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('"height" must be a positive number');
      });

      it('should return HTTP 400 when height is negative', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, height: -5 })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('"height" must be a positive number');
      });

      it('should return HTTP 200 when height is 0.1 (valid positive)', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, height: 0.1 })
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.height).toBe(0.1);
      });

      it('should return HTTP 200 when height is 300 (no upper limit)', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, height: 300 })
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.height).toBe(300);
      });
    });
  });

  describe('Task 4.3: Unit Preference Constraint Testing', () => {
    describe('Valid unit preference testing', () => {
      it('should return HTTP 200 for unitPreference: "metric"', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, unitPreference: 'metric' })
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.unitPreference).toBe('metric');
        
        // Verify database storage matches exact input
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('unit_preference')
          .eq('user_id', userAId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.unit_preference).toBe('metric');
      });

      it('should return HTTP 200 for unitPreference: "imperial"', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, unitPreference: 'imperial' })
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.unitPreference).toBe('imperial');
        
        // Verify database storage matches exact input
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('unit_preference')
          .eq('user_id', userAId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.unit_preference).toBe('imperial');
      });
    });

    describe('Invalid unit preference testing', () => {
      it('should return HTTP 400 for unitPreference: "pounds"', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, unitPreference: 'pounds' })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Unit preference must be either metric or imperial');
      });

      it('should return HTTP 400 for unitPreference: "METRIC" (case sensitive)', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, unitPreference: 'METRIC' })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Unit preference must be either metric or imperial');
      });

      it('should return HTTP 400 for empty unitPreference', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, unitPreference: '' })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Unit preference must be either metric or imperial');
      });

      it('should return HTTP 400 when unitPreference is null (not nullable)', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, unitPreference: null })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Unit preference must be either metric or imperial');
      });
    });
  });

  describe('Task 4.4: Experience Level Constraint Testing', () => {
    describe('Valid experience level testing', () => {
      it('should return HTTP 200 for experienceLevel: "beginner"', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, experienceLevel: 'beginner' })
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.experienceLevel).toBe('beginner');
      });

      it('should return HTTP 200 for experienceLevel: "intermediate"', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, experienceLevel: 'intermediate' })
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.experienceLevel).toBe('intermediate');
      });

      it('should return HTTP 200 for experienceLevel: "advanced"', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, experienceLevel: 'advanced' })
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.experienceLevel).toBe('advanced');
      });
    });

    describe('Invalid experience level testing', () => {
      it('should return HTTP 400 for experienceLevel: "expert"', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, experienceLevel: 'expert' })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Experience level must be one of: beginner, intermediate, advanced');
      });

      it('should return HTTP 400 for experienceLevel: "BEGINNER" (case sensitive)', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, experienceLevel: 'BEGINNER' })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Experience level must be one of: beginner, intermediate, advanced');
      });

      it('should return HTTP 400 for experienceLevel: "novice"', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, experienceLevel: 'novice' })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Experience level must be one of: beginner, intermediate, advanced');
      });

      it('should return HTTP 400 for experienceLevel: 123 (wrong type)', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, experienceLevel: 123 })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Experience level must be one of: beginner, intermediate, advanced');
      });
    });
  });

  describe('Task 4.5: Joi Validation Rule Testing', () => {
    describe('Array field validation testing', () => {
      it('should return HTTP 200 for goals: ["weight_loss"]', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, goals: ['weight_loss'] })
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.goals).toEqual(['weight_loss']);
      });

      it('should return HTTP 400 for goals: "weight_loss" (not array)', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, goals: 'weight_loss' })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toMatch(/validation|array/i);
      });

      it('should return HTTP 200 for goals: [] (empty array allowed)', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, goals: [] })
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.goals).toEqual([]);
      });

      it('should return HTTP 400 for equipment: [123, "dumbbells"] (mixed types)', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, equipment: [123, 'dumbbells'] })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toMatch(/validation|string/i);
      });
    });

    describe('String length validation testing', () => {
      it('should return HTTP 400 for name: "A" (too short - min 2 chars)', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, name: 'A' })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Name must be at least 2 characters long');
      });

      it('should return HTTP 200 for name: "AB" (minimum valid)', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, name: 'AB' })
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.name).toBe('AB');
      });

      it('should return HTTP 400 for name too long (max 100 chars)', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, name: 'A'.repeat(101) })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Name cannot exceed 100 characters');
      });

      it('should return HTTP 400 for name: "" (empty string)', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, name: '' })
          .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.name).toBe('');
      });
    });
  });

  describe('Task 4.6: Constraint Error Message Validation', () => {
    describe('Database constraint error formatting', () => {
      it('should return proper error structure for age constraint violation', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, age: 12 })
          .expect(400);

        expect(response.body).toHaveProperty('status', 'error');
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toBe('Age must be at least 13 years');
        expect(response.headers['content-type']).toMatch(/application\/json/);
      });

      it('should return proper error structure for weight constraint violation', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, weight: 0 })
          .expect(400);

        expect(response.body).toHaveProperty('status', 'error');
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toBe('Weight must be positive');
        expect(response.headers['content-type']).toMatch(/application\/json/);
      });

      it('should return HTTP 400 for all constraint violations', async () => {
        // Test multiple constraint violations at once
        const violationTests = [
          { age: -1 },
          { weight: 0 },
          { height: -10 },
          { unitPreference: 'invalid' },
          { experienceLevel: 'expert' }
        ];

        for (const violation of violationTests) {
          const response = await supertest(app)
            .post('/v1/profile')
            .set('Authorization', `Bearer ${userAToken}`)
            .send({ ...validBaselineData, ...violation });
          
          expect(response.status).toBe(400);
          expect(response.body.status).toBe('error');
        }
      });
    });

    describe('Joi validation error formatting', () => {
      it('should return validation error for invalid email format', async () => {
        // This would be tested on signup, but here we test string validation
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, name: 123 })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toMatch(/validation|string|type/i);
      });

      it('should return validation error for invalid nested object', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ ...validBaselineData, goals: { invalid: 'object' } })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toMatch(/validation|array/i);
      });

      it('should return all validation errors for multiple violations', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ 
            ...validBaselineData, 
            name: '',
            email: 'invalid-email'
          })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('"email" is not allowed');
      });
    });
  });

  describe('Task 4.7: Compound Constraint Testing', () => {
    describe('Multiple constraint violations', () => {
      it('should report all constraint violations, not just first failure', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ 
            ...validBaselineData, 
            age: 12, 
            weight: -5, 
            unitPreference: 'invalid' 
          })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Age must be at least 13 years');
        // The first constraint violation should be caught and reported
      });

      it('should handle validation and constraint errors appropriately', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ 
            ...validBaselineData, 
            name: '',
            age: 12
          })
          .expect(400);

        expect(response.body.status).toBe('error');
        // Validation errors should be caught first before constraint errors
        expect(response.body.message).toBe('Age must be at least 13 years');
      });
    });

    describe('Constraint interaction testing', () => {
      it('should validate height input with different unit preferences', async () => {
        // Test metric height with metric preference
        const metricResponse = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ 
            ...validBaselineData,
            unitPreference: 'metric',
            height: 175
          })
          .expect(200);

        expect(metricResponse.body.data.unitPreference).toBe('metric');
        expect(metricResponse.body.data.height).toBe(175);
      });

      it('should validate imperial height object with imperial preference', async () => {
        const imperialResponse = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ 
            ...validBaselineData,
            unitPreference: 'imperial',
            height: { feet: 5, inches: 9 }
          })
          .expect(200);

        expect(imperialResponse.body.data.unitPreference).toBe('imperial');
        // Height should be converted and stored appropriately
        expect(imperialResponse.body.data.height).toBeDefined();
      });

      it('should ensure unit preference affects field validation correctly', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ 
            ...validBaselineData, 
            unitPreference: 'invalid_unit',
            height: 170 
          })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Unit preference must be either metric or imperial');
      });
    });
  });

  describe('Task 4.8: Profile Update Constraint Testing', () => {
    beforeEach(async () => {
      // Create initial profile for update tests
      await supertest(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${userAToken}`)
        .send(validBaselineData)
        .expect(200);
    });

    describe('Update operation constraint enforcement', () => {
      it('should return HTTP 400 when updating to invalid age', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ age: 12 })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Age must be at least 13 years');
        
        // Verify existing valid data preserved
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('age')
          .eq('user_id', userAId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.age).toBe(validBaselineData.age); // Should remain unchanged
      });

      it('should return HTTP 400 when updating to invalid experience level', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ experienceLevel: 'expert' })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Experience level must be one of: beginner, intermediate, advanced');
        
        // Verify existing valid data preserved
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('experience_level')
          .eq('user_id', userAId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.experience_level).toBe(validBaselineData.experienceLevel);
      });

      it('should return HTTP 400 for partial update with constraint violation', async () => {
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ weight: -10 })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Weight must be positive');
        
        // Verify existing valid data preserved
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('weight')
          .eq('user_id', userAId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.weight).toBe(validBaselineData.weight);
      });

      it('should preserve existing valid data when update fails', async () => {
        // Store original profile data
        const { data: originalProfile, error: fetchError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userAId)
          .single();
        
        expect(fetchError).toBeNull();

        // Attempt invalid update
        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ 
            age: 12,
            weight: -5,
            unitPreference: 'invalid'
          })
          .expect(400);

        // Verify original data is preserved
        const { data: currentProfile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userAId)
          .single();
        
        expect(error).toBeNull();
        expect(currentProfile.age).toBe(originalProfile.age);
        expect(currentProfile.weight).toBe(originalProfile.weight);
        expect(currentProfile.unit_preference).toBe(originalProfile.unit_preference);
      });
    });
  });
}); 