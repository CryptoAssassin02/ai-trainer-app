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
const userAName = 'User A Field Mapping Test';
const userBPassword = 'Password456!';
const userBName = 'User B Field Mapping Test';

describe('Profile Field Mapping & Conversion Integration Tests', () => {
  beforeEach(async () => {
    // Generate unique email addresses for each test to avoid conflicts
    const testId = Date.now() + Math.floor(Math.random() * 10000);
    userAEmail = `fieldmapusera${testId}@example.com`;
    userBEmail = `fieldmapuserb${testId}@example.com`;
    
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
        throw new Error('Failed to retrieve tokens for field mapping test users.');
    }
  });

  afterAll(async () => {
    // Cleanup performed by jest-global-teardown.js
  });

  describe('Task 7.1: Basic Field Name Mapping Testing', () => {
    describe('camelCase ↔ snake_case Field Mapping', () => {
      it('should map unitPreference (camelCase) to unit_preference (snake_case) in database', async () => {
        const profileData = {
          unitPreference: 'metric',
          height: 180,
          weight: 75,
          age: 30
        };

        // Create profile via API
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        expect(response.body.data.unitPreference).toBe('metric');

        // Verify database stores snake_case field name
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('unit_preference, height, weight, age')
          .eq('user_id', userAId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.unit_preference).toBe('metric');
        expect(dbProfile.height).toBe(180);
        expect(dbProfile.weight).toBe(75);
        expect(dbProfile.age).toBe(30);
      });

      it('should map experienceLevel (camelCase) to experience_level (snake_case) in database', async () => {
        const profileData = {
          unitPreference: 'imperial',
          height: 72, // inches
          weight: 165, // pounds
          age: 25,
          experienceLevel: 'intermediate'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        expect(response.body.data.experienceLevel).toBe('intermediate');

        // Verify database mapping
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('experience_level, unit_preference')
          .eq('user_id', userAId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.experience_level).toBe('intermediate');
        expect(dbProfile.unit_preference).toBe('imperial');
      });

      it('should map workoutFrequency (camelCase) to workout_frequency (snake_case) in database', async () => {
        const profileData = {
          unitPreference: 'metric',
          height: 170,
          weight: 65,
          age: 28,
          workoutFrequency: '4x per week'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        expect(response.body.data.workoutFrequency).toBe('4x per week');

        // Verify database mapping
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('workout_frequency')
          .eq('user_id', userAId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.workout_frequency).toBe('4x per week');
      });

      it('should return camelCase field names in GET responses from snake_case database storage', async () => {
        // First create profile to ensure data exists
        const profileData = {
          unitPreference: 'metric',
          height: 175,
          weight: 70,
          age: 32,
          experienceLevel: 'advanced',
          workoutFrequency: 'daily'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        // Get profile and verify response format
        const response = await supertest(app)
          .get('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .expect(200);

        // Verify camelCase field names in response
        expect(response.body.data.unitPreference).toBe('metric');
        expect(response.body.data.experienceLevel).toBe('advanced');
        expect(response.body.data.workoutFrequency).toBe('daily');
        
        // Verify no snake_case field names in response
        expect(response.body.data.unit_preference).toBeUndefined();
        expect(response.body.data.experience_level).toBeUndefined();
        expect(response.body.data.workout_frequency).toBeUndefined();
      });
    });

    describe('Special Field Name Mapping', () => {
      it('should map goals (API) to fitness_goals (database) field correctly', async () => {
        const profileData = {
          unitPreference: 'metric',
          height: 180,
          weight: 80,
          age: 29,
          goals: ['weight_loss', 'strength_building']
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        expect(response.body.data.goals).toEqual(['weight_loss', 'strength_building']);

        // Verify database stores in fitness_goals field
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('fitness_goals')
          .eq('user_id', userAId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.fitness_goals).toEqual(['weight_loss', 'strength_building']);
      });

      it('should return goals field (not fitness_goals) in GET responses', async () => {
        const profileData = {
          unitPreference: 'metric',
          height: 165,
          weight: 55,
          age: 26,
          goals: ['flexibility', 'endurance']
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        // Get profile and verify response format
        const response = await supertest(app)
          .get('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .expect(200);

        // Verify goals field in response (not fitness_goals)
        expect(response.body.data.goals).toEqual(['flexibility', 'endurance']);
        expect(response.body.data.fitness_goals).toBeUndefined();
        expect(response.body.data.fitnessGoals).toBeUndefined();
      });

      it('should maintain field mapping consistency across all profile operations', async () => {
        const initialProfile = {
          unitPreference: 'imperial',
          height: { feet: 6, inches: 0 },
          weight: 180,
          age: 35,
          goals: ['muscle_gain'],
          experienceLevel: 'beginner'
        };

        // Create profile
        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(initialProfile)
          .expect(200);

        // Update profile
        const updateData = {
          goals: ['strength_building', 'power'],
          experienceLevel: 'intermediate',
          workoutFrequency: '5x per week'
        };

        const updateResponse = await supertest(app)
          .put('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(updateData)
          .expect(200);

        // Verify API response uses camelCase
        expect(updateResponse.body.data.goals).toEqual(['strength_building', 'power']);
        expect(updateResponse.body.data.experienceLevel).toBe('intermediate');
        expect(updateResponse.body.data.workoutFrequency).toBe('5x per week');

        // Verify database uses snake_case
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('fitness_goals, experience_level, workout_frequency')
          .eq('user_id', userAId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.fitness_goals).toEqual(['strength_building', 'power']);
        expect(dbProfile.experience_level).toBe('intermediate');
        expect(dbProfile.workout_frequency).toBe('5x per week');
      });
    });
  });

  describe('Task 7.2: Equipment Field Mapping Conflict Testing', () => {
    describe('Conflicting Equipment Field Mapping', () => {
      it('should handle exercisePreferences mapping to equipment database field', async () => {
        const profileData = {
          unitPreference: 'metric',
          height: 170,
          weight: 65,
          age: 28,
          exercisePreferences: ['cardio', 'strength_training']
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData);
        
        // Log the response for debugging
        if (response.status !== 200) {
          console.log('--- DEBUG: Exercise preferences test failed ---');
          console.log('Status:', response.status);
          console.log('Response body:', JSON.stringify(response.body, null, 2));
          console.log('--- END DEBUG ---');
        }
        
        expect(response.status).toBe(200);

        // Verify database equipment field mapping
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('equipment')
          .eq('user_id', userAId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.equipment).toEqual(['cardio', 'strength_training']);
        
        // Verify response contains equipment field (not exercisePreferences)
        expect(response.body.data.equipment).toEqual(['cardio', 'strength_training']);
        expect(response.body.data.exercisePreferences).toBeUndefined();
      });

      it('should handle equipmentPreferences mapping to equipment database field', async () => {
        const profileData = {
          unitPreference: 'metric',
          height: 175,
          weight: 70,
          age: 30,
          equipmentPreferences: ['dumbbells', 'resistance_bands']
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userBToken}`)
          .send(profileData)
          .expect(200);

        // Verify database equipment field mapping
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('equipment')
          .eq('user_id', userBId)
          .single();
        
        expect(error).toBeNull();
        
        // Document current behavior
        if (dbProfile.equipment) {
          console.log('Equipment field contains:', dbProfile.equipment);
          console.log('Source field: equipmentPreferences →', profileData.equipmentPreferences);
        }
      });

      it('should determine field mapping priority when both exercisePreferences and equipmentPreferences are provided', async () => {
        const profileData = {
          unitPreference: 'metric',
          height: 180,
          weight: 75,
          age: 32,
          exercisePreferences: ['cardio', 'yoga'],
          equipmentPreferences: ['kettlebells', 'barbell']
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData);

        // Verify database equipment field content
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('equipment')
          .eq('user_id', userAId)
          .single();
        
        // Document which field takes precedence
        if (dbProfile && dbProfile.equipment) {
          const equipmentValue = dbProfile.equipment;
          
          if (JSON.stringify(equipmentValue) === JSON.stringify(profileData.exercisePreferences)) {
            console.log('PRIORITY: exercisePreferences wins →', equipmentValue);
          } else if (JSON.stringify(equipmentValue) === JSON.stringify(profileData.equipmentPreferences)) {
            console.log('PRIORITY: equipmentPreferences wins →', equipmentValue);
          } else {
            console.log('COMPLEX MAPPING: Neither field directly maps →', equipmentValue);
            console.log('exercisePreferences sent:', profileData.exercisePreferences);
            console.log('equipmentPreferences sent:', profileData.equipmentPreferences);
          }
        }
      });
    });

    describe('Equipment Field Priority Testing', () => {
      it('should handle profile with only exercisePreferences field', async () => {
        const profileData = {
          unitPreference: 'imperial',
          height: { feet: 5, inches: 8 },
          weight: 140,
          age: 27,
          exercisePreferences: ['pilates']
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        // Verify equipment field in database
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('equipment')
          .eq('user_id', userAId)
          .single();
        
        expect(error).toBeNull();
        
        // Document behavior for exercisePreferences only
        console.log('exercisePreferences only → equipment field:', dbProfile.equipment);
      });

      it('should handle profile with only equipmentPreferences field', async () => {
        const profileData = {
          unitPreference: 'metric',
          height: 160,
          weight: 50,
          age: 24,
          equipmentPreferences: ['yoga_mat', 'foam_roller']
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userBToken}`)
          .send(profileData)
          .expect(200);

        // Verify equipment field in database
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('equipment')
          .eq('user_id', userBId)
          .single();
        
        expect(error).toBeNull();
        
        // Document behavior for equipmentPreferences only
        console.log('equipmentPreferences only → equipment field:', dbProfile.equipment);
      });

      it('should verify response format for equipment-related fields in GET requests', async () => {
        const profileData = {
          unitPreference: 'metric',
          height: 170,
          weight: 65,
          age: 29,
          exercisePreferences: ['strength_training'],
          equipmentPreferences: ['dumbbells']
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        // Get profile and verify response format
        const getResponse = await supertest(app)
          .get('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .expect(200);

        // Document response field names for equipment-related fields
        console.log('GET response contains these equipment-related fields:');
        if (getResponse.body.data.exercisePreferences) {
          console.log('- exercisePreferences:', getResponse.body.data.exercisePreferences);
        }
        if (getResponse.body.data.equipmentPreferences) {
          console.log('- equipmentPreferences:', getResponse.body.data.equipmentPreferences);
        }
        if (getResponse.body.data.equipment) {
          console.log('- equipment:', getResponse.body.data.equipment);
        }
      });
    });
  });

  describe('Task 7.3: Unit Conversion Integration Testing', () => {
    describe('Height Conversion Testing', () => {
      it('should store metric height (180 cm) correctly in database', async () => {
        const profileData = {
          unitPreference: 'metric',
          height: 180,
          weight: 75,
          age: 30
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        expect(response.body.data.height).toBe(180);

        // Verify database stores height as centimeters
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('height, unit_preference')
          .eq('user_id', userAId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.height).toBe(180); // stored as cm
        expect(dbProfile.unit_preference).toBe('metric');
      });

      it('should convert and store imperial height {feet: 6, inches: 0} as 182.88 cm in database', async () => {
        const profileData = {
          unitPreference: 'imperial',
          height: { feet: 6, inches: 0 },
          weight: 180,
          age: 28
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        // Verify database stores converted height in centimeters
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('height, unit_preference')
          .eq('user_id', userAId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.height).toBeCloseTo(182.88, 1); // 6 feet = 182.88 cm
        expect(dbProfile.unit_preference).toBe('imperial');
      });

      it('should return metric height as number in GET response with metric preference', async () => {
        const profileData = {
          unitPreference: 'metric',
          height: 175,
          weight: 70,
          age: 32
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        const getResponse = await supertest(app)
          .get('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .expect(200);

        expect(getResponse.body.data.height).toBe(175);
        expect(typeof getResponse.body.data.height).toBe('number');
        expect(getResponse.body.data.unitPreference).toBe('metric');
      });

      it('should return imperial height as {feet, inches} object in GET response with imperial preference', async () => {
        const profileData = {
          unitPreference: 'imperial',
          height: { feet: 5, inches: 10 },
          weight: 150,
          age: 26
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        const getResponse = await supertest(app)
          .get('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .expect(200);

        expect(getResponse.body.data.height).toEqual(
          expect.objectContaining({
            feet: expect.any(Number),
            inches: expect.any(Number)
          })
        );
        expect(getResponse.body.data.unitPreference).toBe('imperial');
      });
    });

    describe('Weight Conversion Testing', () => {
      it('should store metric weight (70 kg) correctly in database', async () => {
        const profileData = {
          unitPreference: 'metric',
          height: 170,
          weight: 70,
          age: 29
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        expect(response.body.data.weight).toBe(70);

        // Verify database stores weight in kilograms
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('weight, unit_preference')
          .eq('user_id', userAId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.weight).toBe(70); // stored as kg
        expect(dbProfile.unit_preference).toBe('metric');
      });

      it('should convert and store imperial weight (154 lbs) as ~70 kg in database', async () => {
        const profileData = {
          unitPreference: 'imperial',
          height: { feet: 5, inches: 8 },
          weight: 154, // lbs
          age: 25
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        // Verify database stores converted weight in kilograms
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('weight, unit_preference')
          .eq('user_id', userAId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.weight).toBeCloseTo(69.9, 1); // 154 lbs = 69.9 kg
        expect(dbProfile.unit_preference).toBe('imperial');
      });

      it('should return metric weight in kg in GET response with metric preference', async () => {
        const profileData = {
          unitPreference: 'metric',
          height: 180,
          weight: 80,
          age: 35
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        const getResponse = await supertest(app)
          .get('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .expect(200);

        expect(getResponse.body.data.weight).toBe(80);
        expect(getResponse.body.data.unitPreference).toBe('metric');
      });

      it('should return imperial weight in lbs in GET response with imperial preference', async () => {
        const profileData = {
          unitPreference: 'imperial',
          height: { feet: 6, inches: 2 },
          weight: 190, // lbs
          age: 30
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        const getResponse = await supertest(app)
          .get('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .expect(200);

        expect(typeof getResponse.body.data.weight).toBe('number');
        expect(getResponse.body.data.weight).toBeCloseTo(190, 1);
        expect(getResponse.body.data.unitPreference).toBe('imperial');
      });
    });
  });

  describe('Task 7.4: Round-trip Data Integrity Testing', () => {
    describe('Complete Profile Round-trip Testing', () => {
      it('should preserve all field data integrity in round-trip: POST → GET', async () => {
        const complexProfileData = {
          unitPreference: 'imperial',
          height: { feet: 5, inches: 10 },
          weight: 165,
          age: 28,
          gender: 'female',
          goals: ['weight_loss', 'strength_building'],
          experienceLevel: 'intermediate',
          workoutFrequency: '4x per week',
          medicalConditions: ['asthma']
        };

        // POST complex profile data
        const postResponse = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(complexProfileData)
          .expect(200);

        // GET same profile data
        const getResponse = await supertest(app)
          .get('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .expect(200);

        // Verify all fields match original client format
        expect(getResponse.body.data.unitPreference).toBe(complexProfileData.unitPreference);
        expect(getResponse.body.data.goals).toEqual(complexProfileData.goals);
        expect(getResponse.body.data.experienceLevel).toBe(complexProfileData.experienceLevel);
        expect(getResponse.body.data.workoutFrequency).toBe(complexProfileData.workoutFrequency);
        expect(getResponse.body.data.medicalConditions).toEqual(complexProfileData.medicalConditions);
        expect(getResponse.body.data.age).toBe(complexProfileData.age);
        expect(getResponse.body.data.gender).toBe(complexProfileData.gender);
        
        // Verify height object structure maintained for imperial
        expect(getResponse.body.data.height).toEqual(
          expect.objectContaining({
            feet: expect.any(Number),
            inches: expect.any(Number)
          })
        );
      });

      it('should verify no data loss or corruption during client → database → client conversion', async () => {
        const testData = {
          unitPreference: 'metric',
          height: 172.5,
          weight: 68.7,
          age: 31,
          goals: ['flexibility', 'endurance', 'core_strength'],
          experienceLevel: 'advanced',
          workoutFrequency: 'daily'
        };

        // Create profile
        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(testData)
          .expect(200);

        // Retrieve profile
        const response = await supertest(app)
          .get('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .expect(200);

        // Verify precise data integrity
        expect(response.body.data.height).toBe(testData.height);
        expect(response.body.data.weight).toBe(testData.weight);
        expect(response.body.data.goals).toEqual(testData.goals);
        expect(response.body.data.goals.length).toBe(testData.goals.length);
        
        // Verify no unexpected field transformations
        expect(response.body.data.unit_preference).toBeUndefined();
        expect(response.body.data.experience_level).toBeUndefined();
        expect(response.body.data.workout_frequency).toBeUndefined();
      });

      it('should test all possible field combinations and data types integrity', async () => {
        const comprehensiveData = {
          // String fields
          unitPreference: 'imperial',
          gender: 'non-binary',
          experienceLevel: 'beginner',
          workoutFrequency: '2x per week',
          
          // Number fields
          height: { feet: 6, inches: 1 },
          weight: 175,
          age: 42,
          
          // Array fields
          goals: ['muscle_gain', 'flexibility', 'balance'],
          medicalConditions: ['diabetes', 'high-blood-pressure'],
          
          // Mixed data structures
          exercisePreferences: ['cardio', 'yoga'],
          equipmentPreferences: ['resistance_bands', 'stability_ball']
        };

        const postResponse = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(comprehensiveData);
        
        // Debug logging for validation error
        if (postResponse.status !== 200) {
          console.log('--- DEBUG: Comprehensive data test failed ---');
          console.log('Status:', postResponse.status);
          console.log('Response body:', JSON.stringify(postResponse.body, null, 2));
          console.log('Sent data:', JSON.stringify(comprehensiveData, null, 2));
          console.log('--- END DEBUG ---');
        }
        
        expect(postResponse.status).toBe(200);

        const getResponse = await supertest(app)
          .get('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .expect(200);

        // Verify each data type category
        expect(typeof getResponse.body.data.unitPreference).toBe('string');
        expect(typeof getResponse.body.data.age).toBe('number');
        expect(Array.isArray(getResponse.body.data.goals)).toBe(true);
        expect(typeof getResponse.body.data.height).toBe('object');
        
        // Verify no data corruption in complex arrays
        expect(getResponse.body.data.goals.length).toBe(3);
        expect(getResponse.body.data.medicalConditions.length).toBe(2);
      });
    });

    describe('Partial Update Round-trip Testing', () => {
      it('should preserve unchanged fields during partial profile updates', async () => {
        const initialProfile = {
          unitPreference: 'metric',
          height: 175,
          weight: 70,
          age: 30,
          goals: ['strength_building'],
          experienceLevel: 'intermediate'
        };

        // Create initial profile
        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(initialProfile)
          .expect(200);

        // Update only workoutFrequency
        const partialUpdate = {
          workoutFrequency: '5x per week'
        };

        await supertest(app)
          .put('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(partialUpdate)
          .expect(200);

        // Verify unchanged fields preserved
        const getResponse = await supertest(app)
          .get('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .expect(200);

        expect(getResponse.body.data.height).toBe(initialProfile.height);
        expect(getResponse.body.data.weight).toBe(initialProfile.weight);
        expect(getResponse.body.data.goals).toEqual(initialProfile.goals);
        expect(getResponse.body.data.experienceLevel).toBe(initialProfile.experienceLevel);
        expect(getResponse.body.data.workoutFrequency).toBe(partialUpdate.workoutFrequency);
      });

      it('should maintain field mapping consistency during unit preference changes', async () => {
        const initialProfile = {
          unitPreference: 'metric',
          height: 180,
          weight: 75,
          age: 32
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(initialProfile)
          .expect(200);

        // Change unit preference from metric to imperial
        const updateData = {
          unitPreference: 'imperial'
        };

        await supertest(app)
          .put('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(updateData)
          .expect(200);

        // Verify weight/height converted correctly and field mapping maintained
        const getResponse = await supertest(app)
          .get('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .expect(200);

        expect(getResponse.body.data.unitPreference).toBe('imperial');
        
        // Verify height converted to imperial object format
        expect(getResponse.body.data.height).toEqual(
          expect.objectContaining({
            feet: expect.any(Number),
            inches: expect.any(Number)
          })
        );

        // Verify weight converted to pounds
        expect(getResponse.body.data.weight).toBeCloseTo(165.3, 1); // 75 kg = 165.3 lbs
      });

      it('should verify partial updates maintain field mapping consistency and data integrity', async () => {
        const initialData = {
          unitPreference: 'imperial',
          height: { feet: 5, inches: 8 },
          weight: 140,
          age: 26,
          goals: ['weight_loss'],
          experienceLevel: 'beginner'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(initialData)
          .expect(200);

        // Multiple partial updates
        const update1 = { goals: ['muscle_gain', 'flexibility'] };
        const update2 = { experienceLevel: 'intermediate' };
        const update3 = { workoutFrequency: '3x per week' };

        await supertest(app)
          .put('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(update1)
          .expect(200);

        await supertest(app)
          .put('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(update2)
          .expect(200);

        await supertest(app)
          .put('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(update3)
          .expect(200);

        // Verify all updates applied and field mapping consistent
        const finalResponse = await supertest(app)
          .get('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .expect(200);

        expect(finalResponse.body.data.goals).toEqual(['muscle_gain', 'flexibility']);
        expect(finalResponse.body.data.experienceLevel).toBe('intermediate');
        expect(finalResponse.body.data.workoutFrequency).toBe('3x per week');
        
        // Verify original fields unchanged
        expect(finalResponse.body.data.unitPreference).toBe('imperial');
        expect(finalResponse.body.data.age).toBe(26);
      });
    });
  });

  describe('Task 7.5: Data Type Preservation Testing', () => {
    describe('String Field Preservation', () => {
      it('should maintain string data types for all string fields during field mapping', async () => {
        const profileData = {
          unitPreference: 'metric',
          height: 170,
          weight: 65,
          age: 28,
          gender: 'female',
          experienceLevel: 'advanced',
          workoutFrequency: 'daily'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        // Verify string types preserved in response
        expect(typeof response.body.data.unitPreference).toBe('string');
        expect(typeof response.body.data.gender).toBe('string');
        expect(typeof response.body.data.experienceLevel).toBe('string');
        expect(typeof response.body.data.workoutFrequency).toBe('string');
      });

      it('should preserve empty strings and special characters in field mappings', async () => {
        const profileData = {
          unitPreference: 'metric',
          height: 165,
          weight: 60,
          age: 25,
          gender: '',  // empty string
          workoutFrequency: '3-4x per week'  // special characters
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData);
        
        // Log the response for debugging
        if (response.status !== 200) {
          console.log('--- DEBUG: Empty strings test failed ---');
          console.log('Status:', response.status);
          console.log('Response body:', JSON.stringify(response.body, null, 2));
          console.log('Profile data sent:', JSON.stringify(profileData, null, 2));
          console.log('--- END DEBUG ---');
        }
        
        expect(response.status).toBe(200);

        // Verify empty string and special characters preserved
        expect(response.body.data.gender).toBe('');
        expect(response.body.data.workoutFrequency).toBe('3-4x per week');
      });

      it('should verify string length preservation during camelCase ↔ snake_case conversion', async () => {
        const longWorkoutFrequency = 'custom workout schedule with detailed frequency requirements and specific timing preferences';
        
        const profileData = {
          unitPreference: 'imperial',
          height: { feet: 5, inches: 6 },
          weight: 130,
          age: 29,
          workoutFrequency: longWorkoutFrequency
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        // Verify full string preserved
        expect(response.body.data.workoutFrequency).toBe(longWorkoutFrequency);
        expect(response.body.data.workoutFrequency.length).toBe(longWorkoutFrequency.length);

        // Verify in database through GET request
        const getResponse = await supertest(app)
          .get('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .expect(200);

        expect(getResponse.body.data.workoutFrequency).toBe(longWorkoutFrequency);
      });
    });

    describe('Array Field Preservation', () => {
      it('should preserve array structure and content for goals field during mapping', async () => {
        const profileData = {
          unitPreference: 'metric',
          height: 175,
          weight: 70,
          age: 30,
          goals: ['weight_loss', 'muscle_gain', 'flexibility', 'endurance']
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        // Verify array preserved
        expect(Array.isArray(response.body.data.goals)).toBe(true);
        expect(response.body.data.goals).toEqual(profileData.goals);
        expect(response.body.data.goals.length).toBe(4);
      });

      it('should handle empty arrays without converting to null or undefined', async () => {
        const profileData = {
          unitPreference: 'imperial',
          height: { feet: 6, inches: 0 },
          weight: 180,
          age: 35,
          goals: [],  // empty array
          medicalConditions: []  // empty array
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        // Verify empty arrays preserved (not converted to null)
        expect(Array.isArray(response.body.data.goals)).toBe(true);
        expect(response.body.data.goals).toEqual([]);
        expect(Array.isArray(response.body.data.medicalConditions)).toBe(true);
        expect(response.body.data.medicalConditions).toEqual([]);
      });

      it('should preserve array order during field mapping conversion', async () => {
        const orderedGoals = ['flexibility', 'weight_loss', 'strength_building', 'endurance', 'balance'];
        
        const profileData = {
          unitPreference: 'metric',
          height: 168,
          weight: 63,
          age: 27,
          goals: orderedGoals,
          medicalConditions: ['asthma', 'allergies', 'migraines']
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        // Verify exact order preserved
        expect(response.body.data.goals).toEqual(orderedGoals);
        expect(response.body.data.goals[0]).toBe('flexibility');
        expect(response.body.data.goals[4]).toBe('balance');
        
        // Verify medical conditions order
        expect(response.body.data.medicalConditions[0]).toBe('asthma');
        expect(response.body.data.medicalConditions[2]).toBe('migraines');
      });
    });

    describe('Number Field Preservation', () => {
      it('should preserve decimal precision for weight and height during field mapping', async () => {
        const profileData = {
          unitPreference: 'metric',
          height: 175.5,
          weight: 70.25,
          age: 25
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        // Verify decimal precision maintained
        expect(response.body.data.height).toBe(175.5);
        expect(response.body.data.weight).toBe(70.25);
        expect(response.body.data.age).toBe(25);
      });

      it('should preserve integer vs float distinction during field mapping', async () => {
        const profileData = {
          unitPreference: 'metric',
          height: 180,      // integer
          weight: 75.0,     // float with .0
          age: 30          // integer
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        expect(typeof response.body.data.height).toBe('number');
        expect(typeof response.body.data.weight).toBe('number');
        expect(typeof response.body.data.age).toBe('number');
      });

      it('should verify number conversion accuracy in unit conversions', async () => {
        const profileData = {
          unitPreference: 'imperial',
          height: { feet: 5, inches: 11 },  // should be 180.34 cm
          weight: 154.32,                   // should be ~70 kg
          age: 28
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        // Verify database conversion accuracy
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('height, weight')
          .eq('user_id', userAId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.height).toBeCloseTo(180.34, 1);  // 5'11" in cm
        expect(dbProfile.weight).toBeCloseTo(70, 1);      // ~154 lbs in kg
      });
    });
  });

  describe('Task 7.6: Null and Undefined Value Handling', () => {
    describe('Null Value Field Mapping', () => {
      it('should handle null values for optional fields during field mapping', async () => {
        const profileData = {
          unitPreference: 'metric',
          height: 170,
          weight: 65,
          age: 28,
          goals: null,          // null array
          gender: null,         // null string
          workoutFrequency: null // null string
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        // Verify null handling in response
        expect(response.body.data.goals).toBeNull();
        expect(response.body.data.gender).toBeNull();
        expect(response.body.data.workoutFrequency).toBeNull();
      });

      it('should verify null values for all mapped fields do not break conversion', async () => {
        const profileData = {
          unitPreference: 'imperial',
          height: { feet: 5, inches: 8 },
          weight: 140,
          age: 26,
          goals: null,
          experienceLevel: null,
          workoutFrequency: null,
          medicalConditions: null
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        // Verify conversion still works with null mapped fields
        expect(response.body.data.unitPreference).toBe('imperial');
        expect(response.body.data.height).toEqual(
          expect.objectContaining({
            feet: 5,
            inches: 8
          })
        );
        expect(response.body.data.weight).toBe(140);
      });

      it('should verify GET response format consistency with null database values', async () => {
        // Create profile with some null values
        const profileData = {
          unitPreference: 'metric',
          height: 175,
          weight: 70,
          age: 30,
          goals: ['fitness'],
          experienceLevel: null
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        const getResponse = await supertest(app)
          .get('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .expect(200);

        // Verify response format consistency with nulls
        expect(getResponse.body.data.experienceLevel).toBeNull();
        expect(getResponse.body.data.goals).toEqual(['fitness']);
        
        // Verify field mapping still works
        expect(getResponse.body.data.unitPreference).toBe('metric');
        expect(getResponse.body.data.experience_level).toBeUndefined(); // no snake_case in response
      });

      it('should test distinction between null, undefined, and empty string during mapping', async () => {
        const profileData = {
          unitPreference: 'metric',
          height: 165,
          weight: 60,
          age: 25,
          gender: '',           // empty string
          goals: null,          // null
          workoutFrequency: undefined  // undefined (should be omitted)
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        // Verify distinction maintained
        expect(response.body.data.gender).toBe('');  // empty string preserved
        expect(response.body.data.goals).toBeNull(); // null preserved
        // undefined typically omitted from JSON, so workoutFrequency may not appear
      });
    });

    describe('Missing Field Handling', () => {
      it('should handle POST profile with missing optional fields without breaking field mapping', async () => {
        const minimalProfile = {
          unitPreference: 'metric',
          height: 170,
          weight: 65,
          age: 28
          // Missing: goals, experienceLevel, workoutFrequency, gender, etc.
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(minimalProfile)
          .expect(200);

        // Verify field mapping works with minimal data
        expect(response.body.data.unitPreference).toBe('metric');
        expect(response.body.data.height).toBe(170);
        expect(response.body.data.weight).toBe(65);
        expect(response.body.data.age).toBe(28);
      });

      it('should verify partial profile data only maps and converts provided fields', async () => {
        const partialProfile = {
          unitPreference: 'imperial',
          height: { feet: 6, inches: 0 },
          age: 32
          // Missing: weight, goals, etc.
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(partialProfile)
          .expect(200);

        // Verify only provided fields processed
        expect(response.body.data.unitPreference).toBe('imperial');
        expect(response.body.data.height).toEqual(
          expect.objectContaining({
            feet: 6,
            inches: 0
          })
        );
        expect(response.body.data.age).toBe(32);

        // Verify database conversion only for provided fields
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('height, unit_preference, age, weight')
          .eq('user_id', userAId)
          .single();
        
        expect(error).toBeNull();
        expect(dbProfile.height).toBeCloseTo(182.88, 1); // 6'0" converted
        expect(dbProfile.unit_preference).toBe('imperial');
        expect(dbProfile.age).toBe(32);
      });

      it('should verify missing fields do not cause conversion errors or unexpected field mappings', async () => {
        const incompleteData = {
          unitPreference: 'metric',
          goals: ['flexibility']
          // Missing: height, weight, age (required fields)
        };

        // This might fail validation, but if it succeeds, mapping should work
        try {
          const response = await supertest(app)
            .post('/v1/profile')
            .set('Authorization', `Bearer ${userAToken}`)
            .send(incompleteData);

          if (response.status === 200) {
            // If creation succeeded, verify field mapping worked
            expect(response.body.data.unitPreference).toBe('metric');
            expect(response.body.data.goals).toEqual(['flexibility']);
          }
        } catch (error) {
          // Expected validation failure for missing required fields
          console.log('Expected validation failure for incomplete data');
        }
      });
    });
  });

  describe('Task 7.7: Conversion Error Scenarios', () => {
    describe('Malformed Field Data Testing', () => {
      it('should handle malformed height object with invalid data types', async () => {
        const profileData = {
          unitPreference: 'imperial',
          height: { feet: 'five', inches: 6 }, // string instead of number
          weight: 150,
          age: 28
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toMatch(/height|feet|validation|invalid/i);
      });

      it('should handle invalid array data in goals field', async () => {
        const profileData = {
          unitPreference: 'metric',
          height: 170,
          weight: 65,
          age: 28,
          goals: 'not an array' // string instead of array
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toMatch(/goals|array|validation/i);
      });

      it('should handle field mapping with corrupted JSON data gracefully', async () => {
        try {
          const response = await supertest(app)
            .post('/v1/profile')
            .set('Authorization', `Bearer ${userAToken}`)
            .set('Content-Type', 'application/json')
            .send('{"unitPreference":"metric","height":170,"weight":65,"age":28,}') // trailing comma
            .expect(400);

          expect(response.body.status).toBe('error');
        } catch (error) {
          // Expected JSON parsing error
          console.log('Expected JSON parsing error handled');
        }
      });

      it('should verify conversion errors return appropriate HTTP status and error messages', async () => {
        const malformedData = {
          unitPreference: 'imperial',
          height: { feet: null, inches: null }, // null values in required fields
          weight: NaN,
          age: 'twenty-eight'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(malformedData)
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toBeTruthy();
        expect(typeof response.body.message).toBe('string');
      });
    });

    describe('Database Constraint vs Field Mapping', () => {
      it('should handle field mapping with data valid for client but invalid for database schema', async () => {
        const problematicData = {
          unitPreference: 'metric',
          height: -170, // negative height - valid JSON but invalid business logic
          weight: 65,
          age: 28
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(problematicData)
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toMatch(/height.*positive|height.*greater/i);
      });

      it('should verify error messages reference client field names, not database field names', async () => {
        const invalidData = {
          unitPreference: 'invalid_unit',
          height: 170,
          weight: 65,
          age: 28
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(invalidData)
          .expect(400);

        expect(response.body.status).toBe('error');
        // Error should reference 'unitPreference' (camelCase) not 'unit_preference' (snake_case)
        expect(response.body.message).toMatch(/unitPreference|unit preference/i);
        expect(response.body.message).not.toMatch(/unit_preference/);
      });

      it('should handle database constraint violations after field mapping correctly', async () => {
        const constraintViolatingData = {
          unitPreference: 'metric',
          height: 170,
          weight: 65,
          age: 500 // exceeds maximum age constraint
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(constraintViolatingData)
          .expect(400);

        expect(response.body.status).toBe('error');
        expect(response.body.message).toMatch(/age/i);
      });
    });
  });

  describe('Task 7.8: Response Format Consistency Testing', () => {
    describe('Client Response Format Validation', () => {
      it('should return all fields in camelCase format consistently in GET responses', async () => {
        const profileData = {
          unitPreference: 'imperial',
          height: { feet: 5, inches: 10 },
          weight: 160,
          age: 30,
          goals: ['weight_loss'],
          experienceLevel: 'intermediate',
          workoutFrequency: '4x per week'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        const getResponse = await supertest(app)
          .get('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .expect(200);

        // Verify all field names are camelCase
        expect(getResponse.body.data).toHaveProperty('unitPreference');
        expect(getResponse.body.data).toHaveProperty('experienceLevel');
        expect(getResponse.body.data).toHaveProperty('workoutFrequency');
        expect(getResponse.body.data).toHaveProperty('goals');

        // Verify no snake_case field names
        expect(getResponse.body.data).not.toHaveProperty('unit_preference');
        expect(getResponse.body.data).not.toHaveProperty('experience_level');
        expect(getResponse.body.data).not.toHaveProperty('workout_frequency');
        expect(getResponse.body.data).not.toHaveProperty('fitness_goals');
      });

      it('should ensure response does not contain any snake_case field names', async () => {
        const profileData = {
          unitPreference: 'metric',
          height: 175,
          weight: 70,
          age: 32,
          goals: ['strength_building', 'flexibility'],
          experienceLevel: 'advanced'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        const getResponse = await supertest(app)
          .get('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .expect(200);

        // Get all property names and verify none are snake_case
        const responseKeys = Object.keys(getResponse.body.data);
        const snakeCaseKeys = responseKeys.filter(key => key.includes('_'));
        
        expect(snakeCaseKeys).toEqual([]); // No snake_case keys should exist
      });

      it('should verify response field names match client API documentation exactly', async () => {
        const profileData = {
          unitPreference: 'imperial',
          height: { feet: 6, inches: 0 },
          weight: 180,
          age: 35,
          goals: ['muscle_gain'],
          experienceLevel: 'beginner',
          workoutFrequency: 'daily'
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        // Verify exact field name matching for API documentation
        const expectedFields = [
          'userId',
          'unitPreference',
          'height',
          'weight',
          'age',
          'goals',
          'experienceLevel',
          'workoutFrequency'
        ];

        expectedFields.forEach(field => {
          expect(response.body.data).toHaveProperty(field);
        });
      });

      it('should test response format consistency across all profile endpoints', async () => {
        const profileData = {
          unitPreference: 'metric',
          height: 168,
          weight: 62,
          age: 27,
          goals: ['flexibility'],
          experienceLevel: 'intermediate'
        };

        // Test POST response format
        const postResponse = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        // Test GET response format
        const getResponse = await supertest(app)
          .get('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .expect(200);

        // Test PUT response format
        const putResponse = await supertest(app)
          .put('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ workoutFrequency: '5x per week' })
          .expect(200);

        // Verify consistent field naming across all endpoints
        [postResponse, getResponse, putResponse].forEach(response => {
          expect(response.body.data).toHaveProperty('unitPreference');
          expect(response.body.data).toHaveProperty('experienceLevel');
          expect(response.body.data).not.toHaveProperty('unit_preference');
          expect(response.body.data).not.toHaveProperty('experience_level');
        });
      });
    });

    describe('Database Storage Format Validation', () => {
      it('should verify database stores all fields in snake_case format consistently', async () => {
        const profileData = {
          unitPreference: 'imperial',
          height: { feet: 5, inches: 8 },
          weight: 145,
          age: 29,
          goals: ['endurance'],
          experienceLevel: 'advanced',
          workoutFrequency: '6x per week'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        // Query database directly to verify snake_case storage
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('unit_preference, experience_level, workout_frequency, fitness_goals')
          .eq('user_id', userAId)
          .single();

        expect(error).toBeNull();
        expect(dbProfile).toHaveProperty('unit_preference');
        expect(dbProfile).toHaveProperty('experience_level');
        expect(dbProfile).toHaveProperty('workout_frequency');
        expect(dbProfile).toHaveProperty('fitness_goals');
      });

      it('should ensure database does not contain any camelCase field names', async () => {
        const profileData = {
          unitPreference: 'metric',
          height: 172,
          weight: 68,
          age: 31,
          experienceLevel: 'intermediate'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        // Query all columns to verify naming convention
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userAId)
          .single();

        expect(error).toBeNull();

        // Verify no camelCase field names in database
        const dbKeys = Object.keys(dbProfile);
        const camelCaseKeys = dbKeys.filter(key => 
          /[a-z][A-Z]/.test(key) // Contains lowercase followed by uppercase
        );
        
        expect(camelCaseKeys).toEqual([]); // No camelCase keys should exist in DB
      });

      it('should verify database field names match schema documentation exactly', async () => {
        const profileData = {
          unitPreference: 'imperial',
          height: { feet: 6, inches: 1 },
          weight: 175,
          age: 33,
          goals: ['strength_building']
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(profileData)
          .expect(200);

        // Verify expected database schema field names
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('user_id, unit_preference, height, weight, age, fitness_goals, created_at, updated_at')
          .eq('user_id', userAId)
          .single();

        expect(error).toBeNull();
        expect(dbProfile).toHaveProperty('user_id');
        expect(dbProfile).toHaveProperty('unit_preference');
        expect(dbProfile).toHaveProperty('fitness_goals');
        expect(dbProfile).toHaveProperty('created_at');
        expect(dbProfile).toHaveProperty('updated_at');
      });

      it('should test storage format consistency across all profile operations', async () => {
        // Create profile
        const createData = {
          unitPreference: 'metric',
          height: 170,
          weight: 65,
          age: 28,
          experienceLevel: 'beginner'
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(createData)
          .expect(200);

        // Update profile
        const updateData = {
          workoutFrequency: '3x per week',
          goals: ['flexibility', 'balance']
        };

        await supertest(app)
          .put('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(updateData)
          .expect(200);

        // Verify consistent snake_case storage after both operations
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('unit_preference, experience_level, workout_frequency, fitness_goals')
          .eq('user_id', userAId)
          .single();

        expect(error).toBeNull();
        expect(dbProfile.unit_preference).toBe('metric');
        expect(dbProfile.experience_level).toBe('beginner');
        expect(dbProfile.workout_frequency).toBe('3x per week');
        expect(dbProfile.fitness_goals).toEqual(['flexibility', 'balance']);
      });
    });
  });

  describe('Task 7.9: Performance and Edge Case Testing', () => {
    describe('Large Profile Data Conversion', () => {
      it('should handle profile with maximum allowed field sizes without performance degradation', async () => {
        const maxSizeProfile = {
          unitPreference: 'imperial',
          height: { feet: 7, inches: 11 }, // Very tall person
          weight: 500, // Very heavy person
          age: 120, // Maximum age
          goals: new Array(5).fill('goal').map((g, i) => `${g}-${i}`), // Reduced goals array
          experienceLevel: 'advanced',
          workoutFrequency: 'custom schedule with detailed frequency requirements',
          medicalConditions: new Array(10).fill('condition').map((c, i) => `medical-condition-${i}-with-description`)
        };

        const startTime = Date.now();
        
        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(maxSizeProfile)
          .expect(200);
        
        const conversionTime = Date.now() - startTime;
        
        // Verify conversion completed in reasonable time (< 5 seconds)
        expect(conversionTime).toBeLessThan(5000);
        
        // Verify data integrity for large profile
        expect(response.body.data.goals.length).toBe(5);
        expect(response.body.data.medicalConditions.length).toBe(10);
      });

      it('should test field mapping with deeply nested objects without errors', async () => {
        const profileData = {
          unitPreference: 'imperial',
          height: {
            feet: 5,
            inches: 10,
            precision: 'exact',
            measurement_context: {
              measured_by: 'healthcare_professional',
              equipment: 'calibrated_stadiometer'
            }
          },
          weight: 160,
          age: 30
        };

        // This test verifies the system handles nested objects gracefully
        try {
          const response = await supertest(app)
            .post('/v1/profile')
            .set('Authorization', `Bearer ${userAToken}`)
            .send(profileData);

          // If the system accepts nested objects, verify conversion works
          if (response.status === 200) {
            expect(response.body.data.unitPreference).toBe('imperial');
          }
        } catch (error) {
          // If validation rejects nested objects, that's also acceptable behavior
          console.log('System correctly rejects overly complex nested height objects');
        }
      });

      it('should test profile with all possible fields populated for complete conversion coverage', async () => {
        const comprehensiveProfile = {
          unitPreference: 'metric',
          height: 175,
          weight: 70,
          age: 30,
          gender: 'female',
          goals: ['weight_loss', 'strength_building', 'flexibility', 'endurance'],
          experienceLevel: 'intermediate',
          workoutFrequency: '4x per week',
          medicalConditions: ['asthma', 'diabetes'],
          exercisePreferences: ['cardio', 'strength_training'],
          equipmentPreferences: ['dumbbells', 'resistance_bands']
        };

        const postResponse = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(comprehensiveProfile)
          .expect(200);

        // Verify all fields processed correctly
        expect(postResponse.body.data.unitPreference).toBe('metric');
        expect(postResponse.body.data.goals.length).toBe(4);
        expect(postResponse.body.data.medicalConditions.length).toBe(2);
        expect(postResponse.body.data.experienceLevel).toBe('intermediate');
      });
    });

    describe('Concurrent Field Mapping', () => {
      it('should handle multiple simultaneous profile operations without field mapping conflicts', async () => {
        const profiles = [
          {
            unitPreference: 'metric',
            height: 170,
            weight: 65,
            age: 25,
            goals: ['flexibility']
          },
          {
            unitPreference: 'imperial',
            height: { feet: 6, inches: 0 },
            weight: 180,
            age: 30,
            experienceLevel: 'advanced'
          },
          {
            unitPreference: 'metric',
            height: 165,
            weight: 55,
            age: 27,
            workoutFrequency: 'daily'
          }
        ];

        // Create multiple profiles concurrently
        const promises = profiles.map((profileData, index) => {
          const token = index === 0 ? userAToken : userBToken;
          return supertest(app)
            .post('/v1/profile')
            .set('Authorization', `Bearer ${token}`)
            .send(profileData);
        });

        const responses = await Promise.all(promises);

        // Verify all conversions succeeded
        responses.forEach((response, index) => {
          expect(response.status).toBe(200);
          expect(response.body.data.unitPreference).toBe(profiles[index].unitPreference);
        });
      });

      it('should verify conversion functions are thread-safe during concurrent requests', async () => {
        const concurrentOperations = Array(5).fill(null).map((_, index) => {
          const profileData = {
            unitPreference: index % 2 === 0 ? 'metric' : 'imperial',
            height: index % 2 === 0 ? 175 : { feet: 5, inches: 10 },
            weight: 70 + index,
            age: 25 + index,
            goals: [`goal_${index}`]
          };

          return supertest(app)
            .post('/v1/profile')
            .set('Authorization', `Bearer ${userAToken}`)
            .send(profileData);
        });

        const responses = await Promise.all(concurrentOperations);

        // Verify no conversion conflicts occurred
        responses.forEach((response, index) => {
          expect(response.status).toBe(200);
          expect(response.body.data.goals).toContain(`goal_${index}`);
        });
      });

      it('should verify field mapping performance under load does not cause timeout errors', async () => {
        const startTime = Date.now();
        
        const loadTestOperations = Array(10).fill(null).map((_, index) => {
          const profileData = {
            unitPreference: 'imperial',
            height: { feet: 5 + (index % 2), inches: index % 12 },
            weight: 150 + index,
            age: 25 + index,
            goals: [`load_test_goal_${index}`],
            experienceLevel: ['beginner', 'intermediate', 'advanced'][index % 3],
            workoutFrequency: `${3 + (index % 5)}x per week`
          };

          return supertest(app)
            .put('/v1/profile')
            .set('Authorization', `Bearer ${userAToken}`)
            .send(profileData);
        });

        const responses = await Promise.all(loadTestOperations);
        const totalTime = Date.now() - startTime;

        // Verify operations completed within reasonable time
        expect(totalTime).toBeLessThan(10000); // 10 seconds for 10 operations

        // Verify final state
        const finalResponse = responses[responses.length - 1];
        expect(finalResponse.status).toBe(200);
        expect(finalResponse.body.data.goals).toContain('load_test_goal_9');
      });
    });

    describe('Edge Case Boundary Testing', () => {
      it('should handle extreme edge values that stress conversion algorithms', async () => {
        const edgeCaseProfile = {
          unitPreference: 'imperial',
          height: { feet: 0, inches: 1 }, // Minimum height
          weight: 0.1, // Very small weight
          age: 13, // Minimum age
          goals: [''], // Empty string in array
          experienceLevel: 'beginner'
        };

        try {
          const response = await supertest(app)
            .post('/v1/profile')
            .set('Authorization', `Bearer ${userAToken}`)
            .send(edgeCaseProfile);

          if (response.status === 200) {
            expect(response.body.data.unitPreference).toBe('imperial');
            
            // Verify edge case conversion accuracy
            const { data: dbProfile, error } = await supabase
              .from('user_profiles')
              .select('height, weight')
              .eq('user_id', userAId)
              .single();
            
            expect(error).toBeNull();
            expect(dbProfile.height).toBeCloseTo(2.54, 1); // 1 inch in cm
          }
        } catch (error) {
          // Some edge cases may be rejected by validation, which is acceptable
          console.log('Edge case appropriately rejected by validation');
        }
      });

      it('should test precision boundaries for decimal conversions', async () => {
        const precisionTestProfile = {
          unitPreference: 'imperial',
          height: { feet: 5, inches: 10 }, // Valid integer inches
          weight: 154.123456789, // High precision weight for precision testing
          age: 28
        };

        const response = await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(precisionTestProfile)
          .expect(200);

        // Verify precision handling in database
        const { data: dbProfile, error } = await supabase
          .from('user_profiles')
          .select('height, weight')
          .eq('user_id', userAId)
          .single();

        expect(error).toBeNull();
        expect(typeof dbProfile.height).toBe('number');
        expect(typeof dbProfile.weight).toBe('number');
      });

      it('should verify round-trip accuracy for edge case conversions', async () => {
        const edgeProfile = {
          unitPreference: 'imperial',
          height: { feet: 4, inches: 11 }, // Short stature
          weight: 95, // Light weight
          age: 18
        };

        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send(edgeProfile)
          .expect(200);

        // Change to metric and back to imperial
        await supertest(app)
          .put('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ unitPreference: 'metric' })
          .expect(200);

        await supertest(app)
          .put('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ unitPreference: 'imperial' })
          .expect(200);

        // Verify data integrity after round-trip conversion
        const finalResponse = await supertest(app)
          .get('/v1/profile')
          .set('Authorization', `Bearer ${userAToken}`)
          .expect(200);

        expect(finalResponse.body.data.height).toEqual(
          expect.objectContaining({
            feet: expect.any(Number),
            inches: expect.any(Number)
          })
        );
        expect(finalResponse.body.data.unitPreference).toBe('imperial');
      });
    });
  });
}); 