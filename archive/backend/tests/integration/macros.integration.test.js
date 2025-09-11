const supertest = require('supertest');
const { app } = require('../../server');
const { getSupabaseClient } = require('../../services/supabase');

let supabase;
let userAToken, userAId, userAName, userAEmail, userAPassword;
let userBToken, userBId, userBName, userBEmail, userBPassword;

describe('Macros RLS Enforcement (/v1/macros)', () => {
  beforeAll(async () => {
    supabase = getSupabaseClient();

    // Create two test users for RLS testing
    const timestamp = Date.now();
    userAEmail = `testuser${timestamp}a@example.com`; // Changed from userA to testuser
    userBEmail = `testuser${timestamp}b@example.com`; // Changed from userB to testuser
    userAName = 'User A Macros Test';
    userBName = 'User B Macros Test';
    userAPassword = 'Password123!';
    userBPassword = 'Password456!';

    // Signup User A
    const signupAResponse = await supertest(app)
      .post('/v1/auth/signup')
      .send({ name: userAName, email: userAEmail, password: userAPassword });
    if (signupAResponse.status !== 201) throw new Error(`Failed to signup User A for macros test: ${signupAResponse.body.message}`);
    userAId = signupAResponse.body.userId;
    userAToken = signupAResponse.body.accessToken;
    if (!userAToken) {
      const loginAResponse = await supertest(app).post('/v1/auth/login').send({ email: userAEmail, password: userAPassword });
      if (loginAResponse.status !== 200) throw new Error(`Failed to login User A for macros test: ${loginAResponse.body.message}`);
      userAToken = loginAResponse.body.jwtToken;
    }

    // Create User B
    let signupBResponse = await supertest(app)
      .post('/v1/auth/signup')
      .send({ name: userBName, email: userBEmail, password: userBPassword });
    if (signupBResponse.status !== 201) throw new Error(`Failed to signup User B for macros test: ${signupBResponse.body.message}`);
    userBId = signupBResponse.body.userId;
    userBToken = signupBResponse.body.accessToken;
    if (!userBToken) {
      const loginBResponse = await supertest(app).post('/v1/auth/login').send({ email: userBEmail, password: userBPassword });
      if (loginBResponse.status !== 200) throw new Error(`Failed to login User B for macros test: ${loginBResponse.body.message}`);
      userBToken = loginBResponse.body.jwtToken;
    }

    if (!userAToken || !userBToken) {
      throw new Error('Failed to retrieve tokens for RLS macros test users.');
    }
  });

  let macroPlanA1Id, macroPlanB1Id;
  const calculatePayload = {
    weight: 70,
    workoutFrequency: '3x per week',
    progressMetrics: {
      bodyFat: 15,
      measurements: { waist: 30, chest: 40 }
    }
    // API reference includes userId in body, but controller adds it from req.user.id
  };

  describe('POST /v1/macros/calculate (Calculate & Store Macros RLS)', () => {
    it('UserA should be able to calculate and store macros, linked to UserA', async () => {
      const response = await supertest(app)
        .post('/v1/macros/calculate')
        .set('Authorization', `Bearer ${userAToken}`)
        .send(calculatePayload)
        .expect(201);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data.id).toBeDefined();
      macroPlanA1Id = response.body.data.id;
      // The response.body.data should contain the calculated macros directly.
      // The actual storage in `macro_plans` table should have user_id = userAId.
      expect(response.body.data.recommendedDailyCalories).toBeDefined();

      const { data: dbMacroPlan } = await supabase.from('macro_plans').select('id, user_id, daily_calories').eq('id', macroPlanA1Id).single();
      expect(dbMacroPlan).toBeDefined();
      expect(dbMacroPlan.user_id).toBe(userAId);
      expect(dbMacroPlan.daily_calories).toBe(response.body.data.recommendedDailyCalories);
    });

    it('UserB should be able to calculate and store macros, linked to UserB', async () => {
      const response = await supertest(app)
        .post('/v1/macros/calculate')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ ...calculatePayload, weight: 80 }) // Slightly different payload
        .expect(201);
      macroPlanB1Id = response.body.data.id;
      expect(response.body.data.recommendedDailyCalories).toBeDefined();
      const { data: dbMacroPlan } = await supabase.from('macro_plans').select('user_id').eq('id', macroPlanB1Id).single();
      expect(dbMacroPlan.user_id).toBe(userBId);
    });

    it('UserA attempting to calculate/store macros with UserB\'s ID in payload should still link to UserA', async () => {
      const maliciousPayload = {
        ...calculatePayload,
        userId: userBId, // Attempting to target UserB in payload
        weight: 72
      };
      const response = await supertest(app)
        .post('/v1/macros/calculate')
        .set('Authorization', `Bearer ${userAToken}`) // Authenticated as UserA
        .send(maliciousPayload)
        .expect(201);
      
      const createdPlanId = response.body.data.id;
      const { data: dbMacroPlan } = await supabase.from('macro_plans').select('user_id, weight').eq('id', createdPlanId).single();
      expect(dbMacroPlan.user_id).toBe(userAId); // Must be UserA
      // The service uses userData.weight which comes from req.body, so it will be 72
      // The stored plan should reflect the input weight from the payload, even if userId in payload was ignored.
      // The key is that dbMacroPlan.user_id is userAId.
    });
  });

  describe('GET /v1/macros (List Macro Plans RLS)', () => {
    beforeAll(async () => {
      // Ensure plans exist for listing from the POST tests
      if (!macroPlanA1Id) {
        const r = await supertest(app).post('/v1/macros/calculate').set('Authorization', `Bearer ${userAToken}`).send(calculatePayload);
        macroPlanA1Id = r.body.data.id;
      }
      if (!macroPlanB1Id) {
        const r = await supertest(app).post('/v1/macros/calculate').set('Authorization', `Bearer ${userBToken}`).send({ ...calculatePayload, weight: 80 });
        macroPlanB1Id = r.body.data.id;
      }
    });

    it('UserA should only get their own macro plans', async () => {
      const response = await supertest(app)
        .get('/v1/macros')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);
      expect(response.body.status).toBe('success');
      expect(Array.isArray(response.body.data)).toBe(true);
      const planIds = response.body.data.map(p => p.id);
      const planUserIds = response.body.data.map(p => p.user_id);
      expect(planIds).toContain(macroPlanA1Id);
      expect(planIds).not.toContain(macroPlanB1Id);
      planUserIds.forEach(id => expect(id).toBe(userAId));
    });

    it('UserB should only get their own macro plans', async () => {
      const response = await supertest(app)
        .get('/v1/macros')
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(200);
      const planIds = response.body.data.map(p => p.id);
      expect(planIds).toContain(macroPlanB1Id);
      expect(planIds).not.toContain(macroPlanA1Id);
    });
  });

  describe('GET /v1/macros/latest (Get Latest Macro Plan RLS)', () => {
    it('UserA should get their own latest macro plan', async () => {
      if (!macroPlanA1Id) throw new Error('macroPlanA1Id not set for latest test');
      // Create a newer plan for UserA to ensure 'latest' is working
      const newerPayload = { ...calculatePayload, weight: 75 };
      const newerPlanResponse = await supertest(app).post('/v1/macros/calculate').set('Authorization', `Bearer ${userAToken}`).send(newerPayload).expect(201);
      const newerPlanIdA = newerPlanResponse.body.data.id;

      const response = await supertest(app)
        .get('/v1/macros/latest')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.id).toBe(newerPlanIdA); // Should be the ID of the latest plan for UserA
      expect(response.body.data.user_id).toBe(userAId);
    });

    // UserA trying to get UserB's latest is implicitly covered as endpoint is keyed to req.user.id
  });

  describe('PUT /v1/macros/:planId (Update Macro Plan RLS)', () => {
    const updatePayload = { daily_calories: 2200, protein: 160, version: 1 }; // Assuming version is part of payload for optimistic locking

    it('UserA should be able to update their own macro plan (macroPlanA1Id)', async () => {
      if (!macroPlanA1Id) throw new Error('macroPlanA1Id not set for update test');
      // Fetch current version first, or assume 1 if it's a new plan from /calculate
      const currentPlan = (await supabase.from('macro_plans').select('version').eq('id', macroPlanA1Id).single()).data;
      const versionToUpdate = currentPlan ? currentPlan.version : 1;

      const response = await supertest(app)
        .put(`/v1/macros/${macroPlanA1Id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ ...updatePayload, version: versionToUpdate })
        .expect(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Macro plan updated successfully');

      const { data: dbPlan } = await supabase.from('macro_plans').select('daily_calories, protein, version').eq('id', macroPlanA1Id).single();
      expect(dbPlan.daily_calories).toBe(updatePayload.daily_calories);
      expect(dbPlan.protein).toBe(updatePayload.protein);
      expect(dbPlan.version).toBe(versionToUpdate + 1); // Assuming service increments version
    });

    it('UserA should NOT be able to update UserB\'s macro plan (macroPlanB1Id) - expect 404', async () => {
      if (!macroPlanB1Id) throw new Error('macroPlanB1Id not set for update test');
      const currentPlanB = (await supabase.from('macro_plans').select('version').eq('id', macroPlanB1Id).single()).data;
      const versionToTryUpdate = currentPlanB ? currentPlanB.version : 1;

      await supertest(app)
        .put(`/v1/macros/${macroPlanB1Id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ ...updatePayload, version: versionToTryUpdate })
        .expect(404); // Service should not find plan for this user
    });
  });

}); 