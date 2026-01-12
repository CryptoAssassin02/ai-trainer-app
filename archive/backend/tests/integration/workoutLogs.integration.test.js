const supertest = require('supertest');
const { app } = require('../../server'); 
const { getSupabaseClient } = require('../../services/supabase');

let supabase;
let userAToken, userAId, userAName, userAEmail, userAPassword;
let userBToken, userBId, userBName, userBEmail, userBPassword;
let planA_forLogs_Id, planB_forLogs_Id; // Plan IDs to associate logs with

const planPayload = { // Minimal payload to create plans
  fitnessLevel: 'beginner',
  goals: ['general_fitness'],
  equipment: ['none'], 
  restrictions: ['none'],
  exerciseTypes: ['full_body'],
  workoutFrequency: '2x per week',
};

describe('Workout Logs RLS Enforcement (/v1/workouts/log)', () => {
  beforeAll(async () => {
    supabase = getSupabaseClient();

    // Create two test users for RLS testing
    const timestamp = Date.now();
    userAEmail = `testuser${timestamp}a@example.com`; // Changed from userA to testuser
    userBEmail = `testuser${timestamp}b@example.com`; // Changed from userB to testuser
    userAName = 'User A Log Test';
    userBName = 'User B Log Test';
    userAPassword = 'Password123!';
    userBPassword = 'Password456!';

    // Create User A
    let signupAResponse = await supertest(app)
      .post('/v1/auth/signup')
      .send({ name: userAName, email: userAEmail, password: userAPassword });
    if (signupAResponse.status !== 201) throw new Error(`Failed to signup User A for logs test: ${signupAResponse.body.message}`);
    userAId = signupAResponse.body.userId;
    userAToken = signupAResponse.body.accessToken;
    if (!userAToken) {
      const loginAResponse = await supertest(app).post('/v1/auth/login').send({ email: userAEmail, password: userAPassword });
      if (loginAResponse.status !== 200) throw new Error(`Failed to login User A for logs test: ${loginAResponse.body.message}`);
      userAToken = loginAResponse.body.jwtToken;
    }

    // Create User B
    let signupBResponse = await supertest(app)
      .post('/v1/auth/signup')
      .send({ name: userBName, email: userBEmail, password: userBPassword });
    if (signupBResponse.status !== 201) throw new Error(`Failed to signup User B for logs test: ${signupBResponse.body.message}`);
    userBId = signupBResponse.body.userId;
    userBToken = signupBResponse.body.accessToken;
    if (!userBToken) {
      const loginBResponse = await supertest(app).post('/v1/auth/login').send({ email: userBEmail, password: userBPassword });
      if (loginBResponse.status !== 200) throw new Error(`Failed to login User B for logs test: ${loginBResponse.body.message}`);
      userBToken = loginBResponse.body.jwtToken;
    }

    if (!userAToken || !userBToken) {
      throw new Error('Failed to retrieve tokens for RLS workout log test users.');
    }

    // Create profiles for both users (required for workout generation)
    const profileAData = {
      height: 175,
      weight: 70,
      age: 30,
      gender: 'male',
      unitPreference: 'metric',
      goals: ['general_fitness'],
      equipment: ['none'],
      experienceLevel: 'beginner'
    };

    const profileBData = {
      height: 165,
      weight: 60,
      age: 25,
      gender: 'female',
      unitPreference: 'metric',
      goals: ['general_fitness'],
      equipment: ['none'],
      experienceLevel: 'beginner'
    };

    // Create profile for User A
    const profileAResponse = await supertest(app)
      .post('/v1/profile')
      .set('Authorization', `Bearer ${userAToken}`)
      .send(profileAData);
    if (profileAResponse.status !== 200) throw new Error(`Failed to create profile for User A: ${profileAResponse.body.message}`);

    // Create profile for User B
    const profileBResponse = await supertest(app)
      .post('/v1/profile')
      .set('Authorization', `Bearer ${userBToken}`)
      .send(profileBData);
    if (profileBResponse.status !== 200) throw new Error(`Failed to create profile for User B: ${profileBResponse.body.message}`);

    // Create a workout plan for User A to log against
    const planAResponse = await supertest(app)
      .post('/v1/workouts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send(planPayload);
    if (planAResponse.status !== 201) throw new Error(`Failed to create plan for User A: ${planAResponse.body.message}`);
    planA_forLogs_Id = planAResponse.body.data.id;

    // Create a workout plan for User B to log against
    const planBResponse = await supertest(app)
      .post('/v1/workouts')
      .set('Authorization', `Bearer ${userBToken}`)
      .send(planPayload);
    if (planBResponse.status !== 201) throw new Error(`Failed to create plan for User B: ${planBResponse.body.message}`);
    planB_forLogs_Id = planBResponse.body.data.id;

    if (!planA_forLogs_Id || !planB_forLogs_Id) {
        throw new Error('Failed to create prerequisite workout plans for log tests.');
    }
  });

  let logA1Id, logA2Id, logB1Id; // Store created log IDs
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const createLogPayload = (planId, exerciseName = 'Test Exercise', notes = 'Test notes') => ({
    planId: planId,
    date: today,
    loggedExercises: [
      {
        exerciseName: exerciseName,
        setsCompleted: [
          { weightUsed: 10, repsCompleted: 10 },
          { weightUsed: 10, repsCompleted: 8 }
        ]
      }
    ],
    notes: notes
  });

  describe('POST /v1/workouts/log (Create Log RLS)', () => {
    it('UserA should be able to create a workout log for their own plan', async () => {
      const payload = createLogPayload(planA_forLogs_Id, 'Push-ups for A', 'User A log 1');
      const response = await supertest(app)
        .post('/v1/workouts/log')
        .set('Authorization', `Bearer ${userAToken}`)
        .send(payload)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.id).toBeDefined();
      logA1Id = response.body.data.id;
      expect(response.body.data.user_id).toBe(userAId);
      expect(response.body.data.plan_id).toBe(planA_forLogs_Id);
      expect(response.body.data.notes).toBe('User A log 1');

      // Verify in DB
      const { data: dbLog, error } = await supabase
        .from('workout_logs')
        .select('id, user_id, plan_id, notes')
        .eq('id', logA1Id)
        .single();
      expect(error).toBeNull();
      expect(dbLog).toBeDefined();
      expect(dbLog.user_id).toBe(userAId);
      expect(dbLog.plan_id).toBe(planA_forLogs_Id);
      expect(dbLog.notes).toBe('User A log 1');
    });

    it('UserB should be able to create a workout log for their own plan', async () => {
      const payload = createLogPayload(planB_forLogs_Id, 'Squats for B', 'User B log 1');
      const response = await supertest(app)
        .post('/v1/workouts/log')
        .set('Authorization', `Bearer ${userBToken}`)
        .send(payload)
        .expect(201);
      logB1Id = response.body.data.id;
      expect(response.body.data.user_id).toBe(userBId);
      expect(response.body.data.plan_id).toBe(planB_forLogs_Id);
    });

    it('UserA attempting to create a log for UserB\'s plan should still assign the log to UserA', async () => {
      const payload = createLogPayload(planB_forLogs_Id, 'Bench Press (UserA on UserB plan)', 'User A log for User B plan attempt');
      const response = await supertest(app)
        .post('/v1/workouts/log')
        .set('Authorization', `Bearer ${userAToken}`) // Authenticated as UserA
        .send(payload)
        .expect(201); // The operation might succeed if service doesn't validate plan ownership by user for logging

      expect(response.body.data.user_id).toBe(userAId); // Critical: Log must belong to UserA
      expect(response.body.data.plan_id).toBe(planB_forLogs_Id); // Plan ID might be UserB's
      const createdLogId = response.body.data.id;

      const { data: dbLog } = await supabase.from('workout_logs').select('user_id, plan_id').eq('id', createdLogId).single();
      expect(dbLog.user_id).toBe(userAId);
      // This test highlights that the log is created under UserA, even if plan_id points elsewhere.
      // Tighter validation could be: service checks if planId belongs to req.user.id, if not, throw 403/404.
    });
  });

  describe('GET /v1/workouts/log (List/Search Logs RLS)', () => {
    beforeAll(async () => {
      // Ensure UserA has a second log for their planA for list testing
      if (!logA1Id) {
        const r = await supertest(app).post('/v1/workouts/log').set('Authorization', `Bearer ${userAToken}`).send(createLogPayload(planA_forLogs_Id, 'Pull-ups A', 'User A log 1 (recreated)'));
        logA1Id = r.body.data.id;
      }
      const logA2Payload = createLogPayload(planA_forLogs_Id, 'Lunges A', 'User A log 2');
      const responseA2 = await supertest(app).post('/v1/workouts/log').set('Authorization', `Bearer ${userAToken}`).send(logA2Payload).expect(201);
      logA2Id = responseA2.body.data.id;

      if (!logB1Id) {
        const r = await supertest(app).post('/v1/workouts/log').set('Authorization', `Bearer ${userBToken}`).send(createLogPayload(planB_forLogs_Id, 'Deadlifts B', 'User B log 1 (recreated)'));
        logB1Id = r.body.data.id;
      }
      if (!logA1Id || !logA2Id || !logB1Id) {
        throw new Error('Failed to set up logs for GET /v1/workouts/log RLS tests.');
      }
    });

    it('UserA should only get their own workout logs when listing all', async () => {
      const response = await supertest(app)
        .get('/v1/workouts/log')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);
      expect(response.body.status).toBe('success');
      expect(Array.isArray(response.body.data)).toBe(true);
      const logIds = response.body.data.map(log => log.id);
      const logUserIds = response.body.data.map(log => log.user_id);
      
      expect(logIds).toContain(logA1Id);
      expect(logIds).toContain(logA2Id);
      expect(logIds).not.toContain(logB1Id);
      logUserIds.forEach(id => expect(id).toBe(userAId));
    });

    it('UserB should only get their own workout logs when listing all', async () => {
      const response = await supertest(app)
        .get('/v1/workouts/log')
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(200);
      const logIds = response.body.data.map(log => log.id);
      const logUserIds = response.body.data.map(log => log.user_id);

      expect(logIds).toContain(logB1Id);
      expect(logIds).not.toContain(logA1Id);
      expect(logIds).not.toContain(logA2Id);
      logUserIds.forEach(id => expect(id).toBe(userBId));
    });

    it('UserA listing logs filtered by their own planId (planA_forLogs_Id) should get their logs for that plan', async () => {
      const response = await supertest(app)
        .get(`/v1/workouts/log?planId=${planA_forLogs_Id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);
      expect(response.body.status).toBe('success');
      response.body.data.forEach(log => {
        expect(log.user_id).toBe(userAId);
        expect(log.plan_id).toBe(planA_forLogs_Id);
      });
      // Ensure it contains logA1Id and logA2Id if they belong to this plan
      const fetchedLogIds = response.body.data.map(l => l.id);
      expect(fetchedLogIds).toContain(logA1Id);
      expect(fetchedLogIds).toContain(logA2Id);
    });

    it('UserA attempting to list logs filtered by UserB\'s planId (planB_forLogs_Id) should get an empty array', async () => {
      const response = await supertest(app)
        .get(`/v1/workouts/log?planId=${planB_forLogs_Id}`)
        .set('Authorization', `Bearer ${userAToken}`) // UserA token
        .expect(200);
      expect(response.body.status).toBe('success');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(0); // RLS prevents seeing logs for UserB's plan
    });
  });

  describe('GET /v1/workouts/log/:logId (Read Single Log RLS)', () => {
    it('UserA should be able to get their own specific workout log (logA1Id)', async () => {
      if (!logA1Id) throw new Error('logA1Id not set from previous tests');
      const response = await supertest(app)
        .get(`/v1/workouts/log/${logA1Id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.id).toBe(logA1Id);
      expect(response.body.data.user_id).toBe(userAId);
    });

    it('UserA should NOT be able to get UserB\'s specific workout log (logB1Id) - expect 404', async () => {
      if (!logB1Id) throw new Error('logB1Id not set from previous tests');
      await supertest(app)
        .get(`/v1/workouts/log/${logB1Id}`)
        .set('Authorization', `Bearer ${userAToken}`) // UserA token
        .expect(404); // RLS makes it appear as not found for UserA
    });
  });

  describe('PATCH /v1/workouts/log/:logId (Update Log RLS)', () => {
    const updatePayload = { notes: 'Updated notes for User A log 1 via PATCH' };

    it('UserA should be able to update their own workout log (logA1Id)', async () => {
      if (!logA1Id) throw new Error('logA1Id not set for update test');
      const response = await supertest(app)
        .patch(`/v1/workouts/log/${logA1Id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send(updatePayload)
        .expect(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.id).toBe(logA1Id);
      expect(response.body.data.notes).toBe(updatePayload.notes);

      const { data: dbLog } = await supabase.from('workout_logs').select('notes').eq('id', logA1Id).single();
      expect(dbLog.notes).toBe(updatePayload.notes);
    });

    it('UserA should NOT be able to update UserB\'s workout log (logB1Id) - expect 404', async () => {
      if (!logB1Id) throw new Error('logB1Id not set for update test');
      const originalUserBLogNotes = (await supabase.from('workout_logs').select('notes').eq('id', logB1Id).single()).data.notes;

      await supertest(app)
        .patch(`/v1/workouts/log/${logB1Id}`)
        .set('Authorization', `Bearer ${userAToken}`) // UserA token
        .send({ notes: 'Attempt to overwrite UserB notes' })
        .expect(404);

      const { data: dbLog } = await supabase.from('workout_logs').select('notes').eq('id', logB1Id).single();
      expect(dbLog.notes).toBe(originalUserBLogNotes); // Ensure notes for UserB's log are unchanged
    });
  });

  describe('DELETE /v1/workouts/log/:logId (Delete Log RLS)', () => {
    // Use logA2Id for deletion to avoid conflict if other tests rely on logA1Id
    it('UserA should be able to delete their own workout log (logA2Id)', async () => {
      if (!logA2Id) throw new Error('logA2Id not set for delete test');
      const response = await supertest(app)
        .delete(`/v1/workouts/log/${logA2Id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200); // Controller returns 200 with message
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Workout log deleted successfully.');

      const { data: dbLog } = await supabase.from('workout_logs').select('id').eq('id', logA2Id).maybeSingle();
      expect(dbLog).toBeNull();
    });

    it('UserA should NOT be able to delete UserB\'s workout log (logB1Id) - expect 404', async () => {
      if (!logB1Id) throw new Error('logB1Id not set for delete test');
      await supertest(app)
        .delete(`/v1/workouts/log/${logB1Id}`)
        .set('Authorization', `Bearer ${userAToken}`) // UserA token
        .expect(404);

      const { data: dbLog } = await supabase.from('workout_logs').select('id').eq('id', logB1Id).single();
      expect(dbLog).toBeDefined(); // Ensure UserB's log still exists
    });
  });

  // RLS tests for workout logs will go here

}); 