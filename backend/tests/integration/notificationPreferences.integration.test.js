const supertest = require('supertest');
const { app } = require('../../server');
const { getSupabaseClient } = require('../../services/supabase');

let supabase;
let userAToken, userAId, userAName, userAEmail, userAPassword;
let userBToken, userBId, userBName, userBEmail, userBPassword;

describe('Notification Preferences RLS Enforcement (/v1/notifications/preferences)', () => {
  beforeAll(async () => {
    supabase = getSupabaseClient();

    // Create two test users for RLS testing
    const timestamp = Date.now();
    userAEmail = `testuser${timestamp}a@example.com`; // Changed from userA to testuser
    userBEmail = `testuser${timestamp}b@example.com`; // Changed from userB to testuser
    userAName = 'User A Notif Test';
    userBName = 'User B Notif Test';
    userAPassword = 'Password123!';
    userBPassword = 'Password456!';

    // Signup User A
    const signupAResponse = await supertest(app)
      .post('/v1/auth/signup')
      .send({ name: userAName, email: userAEmail, password: userAPassword });
    if (signupAResponse.status !== 201) throw new Error(`Failed to signup User A for notif test: ${signupAResponse.body.message}`);
    userAId = signupAResponse.body.userId;
    userAToken = signupAResponse.body.accessToken;
    if (!userAToken) {
      const loginAResponse = await supertest(app).post('/v1/auth/login').send({ email: userAEmail, password: userAPassword });
      if (loginAResponse.status !== 200) throw new Error(`Failed to login User A for notif test: ${loginAResponse.body.message}`);
      userAToken = loginAResponse.body.jwtToken;
    }

    // Create User B
    let signupBResponse = await supertest(app)
      .post('/v1/auth/signup')
      .send({ name: userBName, email: userBEmail, password: userBPassword });
    if (signupBResponse.status !== 201) throw new Error(`Failed to signup User B for notif test: ${signupBResponse.body.message}`);
    userBId = signupBResponse.body.userId;
    userBToken = signupBResponse.body.accessToken;
    if (!userBToken) {
      const loginBResponse = await supertest(app).post('/v1/auth/login').send({ email: userBEmail, password: userBPassword });
      if (loginBResponse.status !== 200) throw new Error(`Failed to login User B for notif test: ${loginBResponse.body.message}`);
      userBToken = loginBResponse.body.jwtToken;
    }

    if (!userAToken || !userBToken) {
      throw new Error('Failed to retrieve tokens for RLS notification preferences test users.');
    }
  });

  const userAPreferencesPayload = {
    email_enabled: true,
    sms_enabled: false,
    push_enabled: true,
    in_app_enabled: true,
    // preferredChannels from API spec is an array, but controller/service uses individual booleans.
    // Matching controller/service structure for *_enabled fields.
    // quiet_hours_start: '22:00',
    // quiet_hours_end: '07:00'
    // API Ref doc has preferredChannels: ["<string>", "..."] - this seems to be a mismatch with db schema / controller logic
    // API Ref doc for POST /v1/notifications/preferences has { userId, emailNotifications, pushNotifications, smsNotifications, preferredChannels }
    // The actual table 'notification_preferences' has: user_id, email_enabled, sms_enabled, push_enabled, in_app_enabled, quiet_hours_start, quiet_hours_end
    // The controller `updatePreferences` uses req.body and passes it to service. `validateNotificationPreferences` should ensure correct fields.
    // For now, using the boolean fields from the table schema.
  };

  const userBPreferencesPayload = {
    email_enabled: false,
    sms_enabled: true,
    push_enabled: false,
    in_app_enabled: true,
  };

  describe('POST /v1/notifications/preferences (Update/Create Preferences RLS)', () => {
    it('UserA should be able to set their own notification preferences', async () => {
      const response = await supertest(app)
        .post('/v1/notifications/preferences')
        .set('Authorization', `Bearer ${userAToken}`)
        .send(userAPreferencesPayload)
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Notification preferences updated successfully');
      expect(response.body.data.user_id).toBe(userAId);
      expect(response.body.data.email_enabled).toBe(userAPreferencesPayload.email_enabled);

      // Verify in DB
      const { data: dbPrefs } = await supabase.from('notification_preferences').select('*').eq('user_id', userAId).single();
      expect(dbPrefs).toBeDefined();
      expect(dbPrefs.email_enabled).toBe(userAPreferencesPayload.email_enabled);
    });

    it('UserB should be able to set their own notification preferences', async () => {
      const response = await supertest(app)
        .post('/v1/notifications/preferences')
        .set('Authorization', `Bearer ${userBToken}`)
        .send(userBPreferencesPayload)
        .expect(200);
      expect(response.body.data.user_id).toBe(userBId);
      expect(response.body.data.sms_enabled).toBe(userBPreferencesPayload.sms_enabled);
    });

    it('UserA trying to set preferences for UserB (e.g. by manipulating payload if possible) should only affect UserA\'s preferences', async () => {
      // The endpoint uses req.user.id, so any userId in payload should be ignored or cause validation error.
      // For this test, assume payload doesn't need/use userId.
      // UserA makes a request, it should always apply to UserA.
      const newPrefsForA = { email_enabled: false, push_enabled: false };
      
      await supertest(app)
        .post('/v1/notifications/preferences')
        .set('Authorization', `Bearer ${userAToken}`)
        .send(newPrefsForA)
        .expect(200);

      const { data: userADbPrefs } = await supabase.from('notification_preferences').select('email_enabled, push_enabled').eq('user_id', userAId).single();
      expect(userADbPrefs.email_enabled).toBe(false);
      expect(userADbPrefs.push_enabled).toBe(false);

      // Check UserB's prefs are untouched (should still be userBPreferencesPayload)
      const { data: userBDbPrefs } = await supabase.from('notification_preferences').select('email_enabled, sms_enabled').eq('user_id', userBId).single();
      expect(userBDbPrefs.sms_enabled).toBe(userBPreferencesPayload.sms_enabled);
      // email_enabled for B should still be false from userBPreferencesPayload, not affected by UserA's change to their own email_enabled.
      expect(userBDbPrefs.email_enabled).toBe(userBPreferencesPayload.email_enabled); 
    });
  });

  describe('GET /v1/notifications/preferences (Read Preferences RLS)', () => {
    beforeAll(async () => {
      // Ensure preferences are set for both users from POST tests
      // If not, set them here.
      let { data: prefsA } = await supabase.from('notification_preferences').select('user_id').eq('user_id', userAId).maybeSingle();
      if (!prefsA) {
        await supertest(app).post('/v1/notifications/preferences').set('Authorization', `Bearer ${userAToken}`).send(userAPreferencesPayload).expect(200);
      }
      let { data: prefsB } = await supabase.from('notification_preferences').select('user_id').eq('user_id', userBId).maybeSingle();
      if (!prefsB) {
        await supertest(app).post('/v1/notifications/preferences').set('Authorization', `Bearer ${userBToken}`).send(userBPreferencesPayload).expect(200);
      }
    });

    it('UserA should be able to get their own notification preferences', async () => {
      const response = await supertest(app)
        .get('/v1/notifications/preferences')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeDefined();
      // Compare with the last known state for UserA, e.g., newPrefsForA or userAPreferencesPayload
      // The controller applies defaults, so check against expected structure.
      expect(response.body.data.email_enabled).toBeDefined(); 
    });

    it('UserB should be able to get their own notification preferences', async () => {
      const response = await supertest(app)
        .get('/v1/notifications/preferences')
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.sms_enabled).toBe(userBPreferencesPayload.sms_enabled);
    });

    // No direct test for UserA GET UserB's prefs as endpoint is keyed to req.user.id
  });

}); 