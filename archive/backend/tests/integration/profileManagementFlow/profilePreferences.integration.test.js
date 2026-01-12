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
const userAName = 'User A Preferences Test';
const userBPassword = 'Password456!';
const userBName = 'User B Preferences Test';

// Sample preferences data for testing
const validPreferencesData = {
  unitPreference: 'metric',
  goals: ['weight_loss', 'flexibility'],
  equipment: ['dumbbells', 'mat'],
  experienceLevel: 'intermediate',
  workoutFrequency: '3x per week'
};

const alternativePreferencesData = {
  unitPreference: 'imperial',
  goals: ['muscle_gain', 'strength_increase'],
  equipment: ['barbell', 'kettlebell'],
  experienceLevel: 'advanced',
  workoutFrequency: '5x per week'
};

describe('Profile Preferences Endpoints (/v1/profile/preferences)', () => {
  beforeEach(async () => {
    // Generate unique email addresses for each test to avoid conflicts
    const testId = Date.now() + Math.floor(Math.random() * 10000);
    userAEmail = `prefsusera${testId}@example.com`;
    userBEmail = `prefsuserb${testId}@example.com`;
    
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
        throw new Error('Failed to retrieve tokens for preferences test users.');
    }

    // Create basic profiles for both users (required for preferences endpoints)
    const basicProfileData = {
      unitPreference: 'metric',
      height: 170,
      weight: 70,
      age: 25
    };

    await supertest(app)
      .post('/v1/profile')
      .set('Authorization', `Bearer ${userAToken}`)
      .send(basicProfileData)
      .expect(200);

    await supertest(app)
      .post('/v1/profile')
      .set('Authorization', `Bearer ${userBToken}`)
      .send(basicProfileData)
      .expect(200);
  });

  afterAll(async () => {
    // Cleanup performed by jest-global-teardown.js
  });

  describe('Task 1.1: Basic Preferences Endpoint Coverage', () => {
    describe('PUT /v1/profile/preferences - Happy Path', () => {
      it('should successfully update user preferences and return updated data', async () => {
        const response = await supertest(app)
          .put('/v1/profile/preferences')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(validPreferencesData)
          .expect(200);

        // Verify response structure
        expect(response.body.status).toBe('success');
        expect(response.body.message).toBe('Profile preferences updated successfully');
        expect(response.body.data).toMatchObject(validPreferencesData);
        expect(response.body.data.userId).toBe(userAId);

        // Verify database persistence via direct query
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('unit_preference, fitness_goals, equipment, experience_level, workout_frequency, user_id')
          .eq('user_id', userAId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.unit_preference).toBe(validPreferencesData.unitPreference);
        expect(dbProfile.fitness_goals).toEqual(validPreferencesData.goals);
        expect(dbProfile.equipment).toEqual(validPreferencesData.equipment);
        expect(dbProfile.experience_level).toBe(validPreferencesData.experienceLevel);
        expect(dbProfile.workout_frequency).toBe(validPreferencesData.workoutFrequency);
      });
    });

    describe('GET /v1/profile/preferences - Happy Path', () => {
      it('should return only preferences fields for authenticated user', async () => {
        // First create preferences data
        await supertest(app)
          .put('/v1/profile/preferences')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(validPreferencesData)
          .expect(200);

        // Now retrieve preferences
        const response = await supertest(app)
          .get('/v1/profile/preferences')
          .set('Authorization', `Bearer ${userAToken}`)
          .expect(200);

        // Verify response structure contains only preferences fields
        expect(response.body.status).toBe('success');
        expect(response.body.data).toMatchObject(validPreferencesData);
        expect(response.body.data.userId).toBe(userAId);
        
        // Verify it does NOT contain demographic fields (height, weight, age)
        expect(response.body.data.height).toBeUndefined();
        expect(response.body.data.weight).toBeUndefined();
        expect(response.body.data.age).toBeUndefined();
        expect(response.body.data.gender).toBeUndefined();
      });
    });
  });

  describe('Task 1.2: Preferences Validation Testing', () => {
    describe('Required field validation', () => {
      it('should return 400 when empty object is sent', async () => {
        const response = await supertest(app)
          .put('/v1/profile/preferences')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({})
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toContain('At least one preference field is required');
      });
    });

    describe('Unit preference validation', () => {
      it('should return 400 for invalid unit preference values', async () => {
        const response = await supertest(app)
          .put('/v1/profile/preferences')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ unitPreference: 'invalid_unit' })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toContain('Unit preference must be either metric or imperial');
      });

      it('should accept valid metric unit preference', async () => {
        const response = await supertest(app)
          .put('/v1/profile/preferences')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ unitPreference: 'metric' })
          .expect(200);

        expect(response.body.data.unitPreference).toBe('metric');
      });

      it('should accept valid imperial unit preference', async () => {
        const response = await supertest(app)
          .put('/v1/profile/preferences')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ unitPreference: 'imperial' })
          .expect(200);

        expect(response.body.data.unitPreference).toBe('imperial');
      });
    });

    describe('Experience level validation', () => {
      it('should return 400 for invalid experience level values', async () => {
        const response = await supertest(app)
          .put('/v1/profile/preferences')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ experienceLevel: 'expert' })
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toContain('Experience level must be one of: beginner, intermediate, advanced');
      });

      it('should accept valid experience levels', async () => {
        const validLevels = ['beginner', 'intermediate', 'advanced'];
        
        for (const level of validLevels) {
          const response = await supertest(app)
            .put('/v1/profile/preferences')
            .set('Authorization', `Bearer ${userAToken}`)
            .send({ experienceLevel: level })
            .expect(200);

          expect(response.body.data.experienceLevel).toBe(level);
        }
      });
    });

    describe('Array field validation', () => {
      it('should return 400 for invalid goals array with non-string elements', async () => {
        const response = await supertest(app)
          .put('/v1/profile/preferences')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ goals: ['weight_loss', 123, null] })
          .expect(400);

        expect(response.body.status).toBe('error');
      });

      it('should return 400 for invalid equipment array with non-string elements', async () => {
        const response = await supertest(app)
          .put('/v1/profile/preferences')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ equipment: ['dumbbells', true, { invalid: 'object' }] })
          .expect(400);

        expect(response.body.status).toBe('error');
      });

      it('should accept valid string arrays for goals and equipment', async () => {
        const response = await supertest(app)
          .put('/v1/profile/preferences')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ 
            goals: ['weight_loss', 'flexibility'], 
            equipment: ['dumbbells', 'mat'] 
          })
          .expect(200);

        expect(response.body.data.goals).toEqual(['weight_loss', 'flexibility']);
        expect(response.body.data.equipment).toEqual(['dumbbells', 'mat']);
      });
    });
  });

  describe('Task 1.3: Preferences Isolation Testing', () => {
    describe('Preferences vs Full Profile separation', () => {
      it('should only update preferences fields and leave demographics unchanged', async () => {
        // First create a full profile with demographic data
        const fullProfileData = {
          height: 170,
          weight: 65,
          age: 28,
          gender: 'female',
          ...validPreferencesData
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(fullProfileData)
          .expect(200);

        // Now update only preferences
        const newPreferences = {
          unitPreference: 'imperial',
          goals: ['muscle_gain']
        };

        await supertest(app)
          .put('/v1/profile/preferences')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(newPreferences)
          .expect(200);

        // Verify demographics remain unchanged in database
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userAId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.height).toBe(170);
        expect(dbProfile.weight).toBe(65);
        expect(dbProfile.age).toBe(28);
        expect(dbProfile.gender).toBe('female');
        
        // But preferences should be updated
        expect(dbProfile.unit_preference).toBe('imperial');
        expect(dbProfile.fitness_goals).toEqual(['muscle_gain']);
      });
    });

    describe('Multi-user preferences isolation', () => {
      it('should ensure each user gets only their own preferences', async () => {
        // Set preferences for User A
        await supertest(app)
          .put('/v1/profile/preferences')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(validPreferencesData)
          .expect(200);

        // Set different preferences for User B
        await supertest(app)
          .put('/v1/profile/preferences')
          .set('Authorization', `Bearer ${userBToken}`)
          .send(alternativePreferencesData)
          .expect(200);

        // Verify User A gets their own preferences
        const userAResponse = await supertest(app)
          .get('/v1/profile/preferences')
          .set('Authorization', `Bearer ${userAToken}`)
          .expect(200);

        expect(userAResponse.body.data).toMatchObject(validPreferencesData);
        expect(userAResponse.body.data.userId).toBe(userAId);

        // Verify User B gets their own preferences
        const userBResponse = await supertest(app)
          .get('/v1/profile/preferences')
          .set('Authorization', `Bearer ${userBToken}`)
          .expect(200);

        expect(userBResponse.body.data).toMatchObject(alternativePreferencesData);
        expect(userBResponse.body.data.userId).toBe(userBId);

        // Verify preferences are different
        expect(userAResponse.body.data.unitPreference).not.toBe(userBResponse.body.data.unitPreference);
        expect(userAResponse.body.data.goals).not.toEqual(userBResponse.body.data.goals);
      });
    });
  });

  describe('Task 1.4: Edge Cases & Error Scenarios', () => {
    describe('Authentication errors', () => {
      it('should return 401 without JWT token', async () => {
        await supertest(app)
          .get('/v1/profile/preferences')
          .expect(401);

        await supertest(app)
          .put('/v1/profile/preferences')
          .send(validPreferencesData)
          .expect(401);
      });

      it('should return 401 with invalid JWT token', async () => {
        await supertest(app)
          .get('/v1/profile/preferences')
          .set('Authorization', 'Bearer invalid_token_here')
          .expect(401);

        await supertest(app)
          .put('/v1/profile/preferences')
          .set('Authorization', 'Bearer invalid_token_here')
          .send(validPreferencesData)
          .expect(401);
      });
    });

    describe('Malformed request testing', () => {
      it('should return 400 for invalid JSON payload', async () => {
        const response = await supertest(app)
          .put('/v1/profile/preferences')
          .set('Authorization', `Bearer ${userAToken}`)
          .set('Content-Type', 'application/json')
          .send('invalid json')
          .expect(400);

        expect(response.body.status).toBe('error');
      });

      it('should return 400 for incorrect Content-Type header with form data', async () => {
        const response = await supertest(app)
          .put('/v1/profile/preferences')
          .set('Authorization', `Bearer ${userAToken}`)
          .type('form')
          .send('unitPreference=metric')
          .expect(400);

        expect(response.body.status).toBe('error');
      });
    });
  });

  describe('Task 1.5: Data Consistency & Persistence', () => {
    describe('Partial preference updates', () => {
      it('should update only unitPreference and keep other preferences unchanged', async () => {
        // Set initial comprehensive preferences
        await supertest(app)
          .put('/v1/profile/preferences')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(validPreferencesData)
          .expect(200);

        // Update only unitPreference
        const partialUpdate = { unitPreference: 'imperial' };
        
        const response = await supertest(app)
          .put('/v1/profile/preferences')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(partialUpdate)
          .expect(200);

        // Verify only unitPreference changed
        expect(response.body.data.unitPreference).toBe('imperial');
        expect(response.body.data.goals).toEqual(validPreferencesData.goals);
        expect(response.body.data.equipment).toEqual(validPreferencesData.equipment);
        expect(response.body.data.experienceLevel).toBe(validPreferencesData.experienceLevel);
      });

      it('should update only goals and keep other preferences unchanged', async () => {
        // Set initial preferences
        await supertest(app)
          .put('/v1/profile/preferences')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(validPreferencesData)
          .expect(200);

        // Update only goals
        const newGoals = ['endurance', 'core_strength'];
        const partialUpdate = { goals: newGoals };
        
        const response = await supertest(app)
          .put('/v1/profile/preferences')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(partialUpdate)
          .expect(200);

        // Verify only goals changed
        expect(response.body.data.goals).toEqual(newGoals);
        expect(response.body.data.unitPreference).toBe(validPreferencesData.unitPreference);
        expect(response.body.data.equipment).toEqual(validPreferencesData.equipment);
        expect(response.body.data.experienceLevel).toBe(validPreferencesData.experienceLevel);
      });

      it('should update multiple fields simultaneously', async () => {
        // Set initial preferences
        await supertest(app)
          .put('/v1/profile/preferences')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(validPreferencesData)
          .expect(200);

        // Update multiple fields
        const multiUpdate = {
          unitPreference: 'imperial',
          experienceLevel: 'advanced',
          workoutFrequency: 'daily'
        };
        
        const response = await supertest(app)
          .put('/v1/profile/preferences')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(multiUpdate)
          .expect(200);

        // Verify multiple fields changed
        expect(response.body.data.unitPreference).toBe('imperial');
        expect(response.body.data.experienceLevel).toBe('advanced');
        expect(response.body.data.workoutFrequency).toBe('daily');
        
        // Verify unchanged fields remain
        expect(response.body.data.goals).toEqual(validPreferencesData.goals);
        expect(response.body.data.equipment).toEqual(validPreferencesData.equipment);
      });
    });

    describe('Preference data types verification', () => {
      it('should store and retrieve data types correctly (camelCase ↔ snake_case)', async () => {
        await supertest(app)
          .put('/v1/profile/preferences')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(validPreferencesData)
          .expect(200);

        // Verify database storage uses snake_case
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('unit_preference, fitness_goals, equipment, experience_level, workout_frequency, user_id')
          .eq('user_id', userAId)
          .single();
        
        expect(error).toBeNull();
        expect(typeof dbProfile.unit_preference).toBe('string');
        expect(typeof dbProfile.experience_level).toBe('string');
        expect(typeof dbProfile.workout_frequency).toBe('string');
        expect(Array.isArray(dbProfile.fitness_goals)).toBe(true);
        expect(Array.isArray(dbProfile.equipment)).toBe(true);

        // Verify API response uses camelCase
        const apiResponse = await supertest(app)
          .get('/v1/profile/preferences')
          .set('Authorization', `Bearer ${userAToken}`)
          .expect(200);

        expect(apiResponse.body.data.unitPreference).toBeDefined();
        expect(apiResponse.body.data.experienceLevel).toBeDefined();
        expect(apiResponse.body.data.workoutFrequency).toBeDefined();
        expect(Array.isArray(apiResponse.body.data.goals)).toBe(true);
        expect(Array.isArray(apiResponse.body.data.equipment)).toBe(true);
      });
    });
  });
}); 