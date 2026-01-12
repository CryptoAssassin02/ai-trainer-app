const supertest = require('supertest');
const { app, startServer, closeServer } = require('../../../server');
const { getSupabaseClient } = require('../../../services/supabase');

let server;
let supabase;
let userAToken;
let userAId;
let userBToken;
let userBId;

const userAEmail = `usera${Math.floor(Date.now()/100000)}@example.com`;
const userAPassword = 'Password123!';
const userAName = 'User A Profile Test';

const userBEmail = `userb${Math.floor(Date.now()/100000)}@example.com`;
const userBPassword = 'Password456!';
const userBName = 'User B Profile Test';

// Define profile data at the top level so it's accessible in all test blocks
const userAProfileData = {
  height: 170, // Simple number for metric
  weight: 65,
  age: 28,
  gender: 'female',
  unitPreference: 'metric',
  goals: ['flexibility', 'stress_relief'],
  equipment: ['mat'],
  experienceLevel: 'beginner'
};

const userBProfileData = {
  height: 185,
  weight: 85,
  age: 32,
  gender: 'male',
  unitPreference: 'metric',
  goals: ['muscle_gain', 'strength_increase'],
  equipment: ['barbell', 'dumbbells'],
  experienceLevel: 'intermediate'
};

// Define a port for the test server to listen on, different from dev if possible
// This might not be necessary if server is already started globally for integration tests.
// For now, assuming server is started by jest-global-setup or the main describe block in auth.integration.test.js
// If running tests in parallel or isolation, each suite might need its own server start/stop.
// Let's assume the server started in jest-global-setup is available.
// const TEST_PORT = process.env.TEST_PORT || 3002; // Different port for profile tests if needed

describe('Profile RLS Enforcement (/v1/profile)', () => {
  beforeAll(async () => {
    // If the server isn't started globally, start it:
    // server = await startServer(TEST_PORT); 
    // For now, assuming server is already up from a global setup.
    // If not, this test suite will fail to connect.
    // A better approach is to ensure the main test runner (e.g. jest.config.js) handles server lifecycle.
    // For now, we will use the app directly as it's typically imported.

    supabase = getSupabaseClient();

    // Create User A
    const signupAResponse = await supertest(app)
      .post('/v1/auth/signup')
      .send({ name: userAName, email: userAEmail, password: userAPassword })
      .expect(201);
    userAId = signupAResponse.body.userId;
    userAToken = signupAResponse.body.accessToken; // Assuming signup returns token if email confirmation is off

    if (!userAToken) { // Fallback to login if signup doesn't return token
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

    if (!userBToken) { // Fallback to login
        const loginBResponse = await supertest(app)
            .post('/v1/auth/login')
            .send({ email: userBEmail, password: userBPassword })
            .expect(200);
        userBToken = loginBResponse.body.jwtToken;
    }

    // Ensure tokens were actually retrieved
    if (!userAToken || !userBToken) {
        throw new Error('Failed to retrieve tokens for RLS test users.');
    }
  });

  afterAll(async () => {
    // If server was started in this suite's beforeAll:
    // await closeServer(server);
    // Cleanup users if necessary, though jest-global-setup should handle DB reset.
  });

  describe('POST /v1/profile (Create/Update Profile RLS)', () => {
    it('UserA should be able to create/update their own profile', async () => {
      const response = await supertest(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${userAToken}`)
        .send(userAProfileData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.data.userId).toBe(userAId); // Profile references user via userId
      expect(response.body.data.age).toBe(userAProfileData.age);
      expect(response.body.data.weight).toBe(userAProfileData.weight);

      // Verify in DB using correct table name
      const { data: dbProfile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userAId) // Query by user_id, not id
        .single();
      
      expect(error).toBeNull();
      expect(dbProfile).toBeDefined();
      expect(dbProfile.user_id).toBe(userAId);
      expect(dbProfile.age).toBe(userAProfileData.age);
      expect(dbProfile.height).toBe(userAProfileData.height);
      expect(dbProfile.unit_preference).toBe('metric');
    });

    it('UserA should not be able to update UserB\'s profile by passing UserB\'s ID (or any other ID) in the payload', async () => {
      // User A attempts to update profile data, but specifies UserB's ID in the payload.
      // The backend should ignore the userId in the payload and use req.user.id from the token.
      // Therefore, User A's profile should be updated with this new data, not User B's.
      const maliciousPayloadForUserA = {
        userId: userBId, // Attempting to target UserB (this should be ignored by backend)
        height: 175, // New data for UserA
        weight: 68, 
        age: 29,
        gender: 'female',
        unitPreference: 'imperial',
        goals: ['core_strength'],
        equipment: [],
        experienceLevel: 'intermediate'
      };

      const response = await supertest(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${userAToken}`) // Authenticated as UserA
        .send(maliciousPayloadForUserA)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.data.userId).toBe(userAId); // Should be UserA's ID
      expect(response.body.data.age).toBe(maliciousPayloadForUserA.age); // UserA's age updated

      // Verify UserA's profile in DB was updated
      const { data: userADbProfile, error: userAError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userAId)
        .single();
      expect(userAError).toBeNull();
      expect(userADbProfile.age).toBe(maliciousPayloadForUserA.age);
      expect(userADbProfile.unit_preference).toBe('imperial');

      // Verify UserB's profile in DB was NOT changed by UserA's malicious attempt
      // First, ensure UserB has an initial profile to check against.
      // If UserB doesn't have a profile yet, create one for them.
      let { data: userBDbProfile, error: userBError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userBId)
        .single();

      if (userBError && userBError.code === 'PGRST116') { // Profile not found, create it for UserB
        await supertest(app)
          .post('/v1/profile')
          .set('Authorization', `Bearer ${userBToken}`)
          .send(userBProfileData)
          .expect(200);
        
        // Re-fetch UserB's profile
        const refetchB = await supabase.from('user_profiles').select('*').eq('user_id', userBId).single();
        userBDbProfile = refetchB.data;
        userBError = refetchB.error;
      }
      expect(userBError).toBeNull();
      expect(userBDbProfile).toBeDefined();
      // Check that UserB's original data (or default if just created) is still intact
      // For this test, it means UserB's age should NOT be maliciousPayloadForUserA.age
      expect(userBDbProfile.age).not.toBe(maliciousPayloadForUserA.age);
      if (userBDbProfile.age) { // If UserB had an age set (e.g. from userBProfileData)
        expect(userBDbProfile.age).toBe(userBProfileData.age); // Ensure it's their original age
      }
    });
  });

  describe('GET /v1/profile (Read Profile RLS)', () => {
    // Ensure User A and User B have profiles created from the POST tests or create them here if not guaranteed.
    // For simplicity, assuming profiles were created in the POST describe block tests.
    // If these tests run in isolation or before POST tests, profiles should be explicitly created here.

    it('UserA should be able to get their own profile', async () => {
      // First ensure UserA has a profile by creating one
      await supertest(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${userAToken}`)
        .send(userAProfileData)
        .expect(200);

      // Now get the profile
      const response = await supertest(app)
        .get('/v1/profile')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.userId).toBe(userAId);
      // Compare with userAProfileData or the last updated state of UserA's profile
      // For this test, checking ID and that some data exists is sufficient to prove access.
      expect(response.body.data.age).toBeDefined(); // Or a specific value if known from previous step
    });

    it('UserB should be able to get their own profile', async () => {
      // First ensure UserB has a profile by creating one
      await supertest(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${userBToken}`)
        .send(userBProfileData)
        .expect(200);

      // Now get the profile
      const response = await supertest(app)
        .get('/v1/profile')
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.userId).toBe(userBId);
      expect(response.body.data.age).toBeDefined(); 
    });

    // No direct test for UserA trying to get UserB's profile via GET /v1/profile,
    // because the endpoint itself is designed to only serve the authenticated user's profile.
    // The RLS is enforced by the backend logic using req.user.id.
    // The admin-only route GET /v1/profile/:userId is for specific user profile access by admins.
  });

  // RLS tests for GET /v1/profile will go here (or confirm if /v1/auth/me covers this)

}); 