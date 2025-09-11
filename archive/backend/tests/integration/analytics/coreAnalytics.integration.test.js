const supertest = require('supertest');
const { app } = require('../../../server');
const { getSupabaseClient, getSupabaseClientWithToken } = require('../../../services/supabase');
const analyticsService = require('../../../services/analytics-service');

// Import admin client for setup/teardown
const { createClient } = require('@supabase/supabase-js');
const adminSupabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key-here'
);

// Real integration testing - no mocking of core business logic
// Direct database access and real AI service calls
describe('Core Analytics Integration Tests - REAL Business Logic & Database Validation', () => {
  let testUserId, testUserToken;
  let secondUserId, secondUserToken;
  let createdWorkoutLogIds = [];
  let createdCheckInIds = [];
  let createdMealLogIds = [];

  // Get the general supabase client for non-RLS operations
  const supabase = getSupabaseClient();

  beforeAll(async () => {
    // Create independent test users for this suite
    const timestamp = Date.now();
    const testUserEmail = `analytics${timestamp}@example.com`;
    const testUserPassword = 'TestPassword123!';
    const secondUserEmail = `analytics2${timestamp}@example.com`;
    const secondUserPassword = 'TestPassword123!';
    
    // Create first test user
    const signupResponse = await supertest(app)
      .post('/v1/auth/signup')
      .send({
        name: 'Analytics Test User',
        email: testUserEmail,
        password: testUserPassword
      });
    
    if (signupResponse.status !== 201) {
      throw new Error(`Failed to create test user: ${signupResponse.body.message}`);
    }
    
    testUserId = signupResponse.body.userId;
    testUserToken = signupResponse.body.accessToken;
    
    if (!testUserToken) {
      const loginResponse = await supertest(app)
        .post('/v1/auth/login')
        .send({ email: testUserEmail, password: testUserPassword });
      if (loginResponse.status !== 200) {
        throw new Error(`Failed to login test user: ${loginResponse.body.message}`);
      }
      testUserToken = loginResponse.body.jwtToken;
    }
    
    // Create second test user for RLS validation
    const secondSignupResponse = await supertest(app)
      .post('/v1/auth/signup')
      .send({
        name: 'Analytics Test User 2',
        email: secondUserEmail,
        password: secondUserPassword
      });
    
    secondUserId = secondSignupResponse.body.userId;
    secondUserToken = secondSignupResponse.body.accessToken;
    
    if (!secondUserToken) {
      const secondLoginResponse = await supertest(app)
        .post('/v1/auth/login')
        .send({ email: secondUserEmail, password: secondUserPassword });
      secondUserToken = secondLoginResponse.body.jwtToken;
    }
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUserId) {
      try {
        // Clean up analytics data
        await adminSupabase.from('user_analytics_aggregates').delete().eq('user_id', testUserId);
        // Clean up test workout logs
        if (createdWorkoutLogIds.length > 0) {
          await adminSupabase.from('workout_logs').delete().in('id', createdWorkoutLogIds);
        }
        // Clean up test check-ins
        if (createdCheckInIds.length > 0) {
          await adminSupabase.from('user_check_ins').delete().in('id', createdCheckInIds);
        }
        // Clean up test meal logs
        if (createdMealLogIds.length > 0) {
          await adminSupabase.from('meal_logs').delete().in('id', createdMealLogIds);
        }
        // Clean up user profiles
        await adminSupabase.from('user_profiles').delete().eq('user_id', testUserId);
        await adminSupabase.from('user_profiles').delete().eq('user_id', secondUserId);
      } catch (error) {
        console.log('Cleanup error (non-critical):', error.message);
      }
    }
  });

  // Helper function to create user profile
  async function ensureUserProfile(profileOverrides = {}, userToken = testUserToken) {
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
      .set('Authorization', `Bearer ${userToken}`)
      .send(profileData);
    
    if (![200, 201].includes(profileResponse.status)) {
      throw new Error(`Failed to create user profile: ${profileResponse.body.message || 'Unknown error'}`);
    }

    return profileResponse.body.data;
  }

  // Helper function to create test workout log data
  async function createTestWorkoutLog(userId, userToken, overrides = {}) {
    const defaultWorkoutLog = {
      planId: null, // Can be null for standalone logs
      overall_difficulty: 7,
      energy_level: 8,
      satisfaction: 9,
      feedback: 'Test workout log for analytics',
      exercises_completed: [
        {
          exercise: 'Push-ups',
          sets: [
            { reps: 15, weight: 0 },
            { reps: 12, weight: 0 },
            { reps: 10, weight: 0 }
          ]
        },
        {
          exercise: 'Squats',
          sets: [
            { reps: 20, weight: 0 },
            { reps: 18, weight: 0 },
            { reps: 15, weight: 0 }
          ]
        }
      ],
      ...overrides
    };

    const { data, error } = await supabase
      .from('workout_logs')
      .insert({
        user_id: userId,
        plan_id: defaultWorkoutLog.planId,
        overall_difficulty: defaultWorkoutLog.overall_difficulty,
        energy_level: defaultWorkoutLog.energy_level,
        satisfaction: defaultWorkoutLog.satisfaction,
        feedback: defaultWorkoutLog.feedback,
        exercises_completed: defaultWorkoutLog.exercises_completed,
        date: overrides.date || new Date().toISOString().split('T')[0]
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create workout log: ${error.message}`);
    }

    createdWorkoutLogIds.push(data.id);
    return data;
  }

  // Helper function to create test check-in data
  async function createTestCheckIn(userId, userToken, overrides = {}) {
    const defaultCheckIn = {
      weight: 70,
      body_fat_percentage: 15,
      mood: 'good',
      sleep_quality: 'good',
      energy_level: 7,
      stress_level: 4,
      notes: 'Test check-in for analytics',
      measurements: { waist: 80, chest: 100, arms: 35 },
      ...overrides
    };

    // Use authenticated client for RLS compliance
    const authenticatedSupabase = getSupabaseClientWithToken(userToken);
    const { data, error } = await authenticatedSupabase
      .from('user_check_ins')
      .insert({
        user_id: userId,
        date: overrides.date || new Date().toISOString().split('T')[0],
        weight: defaultCheckIn.weight,
        body_fat_percentage: defaultCheckIn.body_fat_percentage,
        mood: defaultCheckIn.mood,
        sleep_quality: defaultCheckIn.sleep_quality,
        energy_level: defaultCheckIn.energy_level,
        stress_level: defaultCheckIn.stress_level,
        notes: defaultCheckIn.notes,
        measurements: defaultCheckIn.measurements
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create check-in: ${error.message}`);
    }

    createdCheckInIds.push(data.id);
    return data;
  }

  // Helper function to create test meal log data
  async function createTestMealLog(userId, userToken, overrides = {}) {
    const defaultMealLog = {
      meal_type: 'lunch',
      foods: [
        { name: 'Chicken breast', quantity: 200, unit: 'g' },
        { name: 'Rice', quantity: 150, unit: 'g' }
      ],
      macros_consumed: { protein: 45, carbs: 50, fat: 8 },
      calories: 400,
      feedback: 'Good meal for analytics test',
      ...overrides
    };

    // Use authenticated client for RLS compliance
    const authenticatedSupabase = getSupabaseClientWithToken(userToken);
    const { data, error } = await authenticatedSupabase
      .from('meal_logs')
      .insert({
        user_id: userId,
        meal_type: defaultMealLog.meal_type,
        foods: defaultMealLog.foods,
        macros_consumed: defaultMealLog.macros_consumed,
        calories: defaultMealLog.calories,
        feedback: defaultMealLog.feedback,
        logged_at: overrides.logged_at || new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create meal log: ${error.message}`);
    }

    createdMealLogIds.push(data.id);
    return data;
  }

  describe('Task 1: Database Migration and Function Validation', () => {
    test('When analytics tables exist, Then should have proper structure and constraints', async () => {
      // Test analytics table structure
      const { data: tableInfo, error: tableError } = await supabase
        .from('user_analytics_aggregates')
        .select('*')
        .limit(1);

      // Table should exist and be queryable
      expect(tableError).toBeNull();
      expect(Array.isArray(tableInfo)).toBe(true);

      // Test analytics functions exist and are callable
      const { data: functionResult, error: functionError } = await supabase
        .rpc('refresh_user_analytics', { 
          target_user_id: testUserId,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0]
        });

      expect(functionError).toBeNull();

      console.log('✅ Database Migration Validation:', {
        tableExists: tableError === null,
        functionsCallable: functionError === null
      });
    });

    test('When analytics functions are called with valid data, Then should process without errors', async () => {
      // Ensure user profile exists
      await ensureUserProfile();

      // Create test data for analytics processing
      await createTestWorkoutLog(testUserId, testUserToken);
      await createTestCheckIn(testUserId, testUserToken);

      // Test refresh function
      const refreshResult = await analyticsService.refreshUserAnalytics(testUserId, testUserToken, {
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      });

      expect(refreshResult.success).toBe(true);
      expect(refreshResult.userId).toBe(testUserId);

      // Test strength progression function
      const strengthResult = await analyticsService.getStrengthProgression(testUserId, testUserToken);
      expect(strengthResult).toBeDefined();
      expect(strengthResult.userId).toBe(testUserId);

      // Test adherence metrics function
      const adherenceResult = await analyticsService.getAdherenceMetrics(testUserId, testUserToken);
      expect(adherenceResult).toBeDefined();
      expect(adherenceResult.userId).toBe(testUserId);

      console.log('✅ Analytics Functions Validation:', {
        refreshSuccess: refreshResult.success,
        strengthDataRetrieved: !!strengthResult.userId,
        adherenceDataRetrieved: !!adherenceResult.userId
      });
    });
  });

  describe('Task 2: Analytics Service Business Logic Validation', () => {
    beforeEach(async () => {
      // Ensure clean user profile for each test
      await ensureUserProfile({
        weight: 75,
        goals: ['muscle_gain'],
        experienceLevel: 'intermediate'
      });
    });

    test('When retrieving analytics overview with real data, Then should calculate accurate metrics', async () => {
      // Create test data across multiple days
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const dayBefore = new Date(today);
      dayBefore.setDate(dayBefore.getDate() - 2);

      // Create workout logs
      await createTestWorkoutLog(testUserId, testUserToken, {
        date: today.toISOString(),
        overall_difficulty: 8,
        energy_level: 9,
        satisfaction: 8
      });
      
      await createTestWorkoutLog(testUserId, testUserToken, {
        date: yesterday.toISOString(),
        overall_difficulty: 7,
        energy_level: 8,
        satisfaction: 9
      });

      // Create check-ins
      await createTestCheckIn(testUserId, testUserToken, {
        date: today.toISOString().split('T')[0],
        weight: 76,
        mood: 'excellent',
        energy_level: 9
      });

      await createTestCheckIn(testUserId, testUserToken, {
        date: yesterday.toISOString().split('T')[0],
        weight: 75.5,
        mood: 'good',
        energy_level: 8
      });

      // Refresh analytics data for the full date range
      await analyticsService.refreshUserAnalytics(testUserId, testUserToken, {
        startDate: yesterday.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      });

      // Get overview metrics
      const overview = await analyticsService.getOverviewMetrics(testUserId, testUserToken, {
        timeframe: '7 days'
      });

      // Validate business logic
      expect(overview.hasData).toBe(true);
      expect(overview.userId).toBe(testUserId);
      expect(overview.overview.workouts.completed).toBeGreaterThan(0);
      expect(overview.overview.physical.currentWeight).toBeGreaterThan(0);

      // Validate weight progression calculation
      expect(overview.overview.physical.weightChange).toBeCloseTo(0.5, 1); // Should show 0.5kg increase

      console.log('✅ Overview Metrics Validation:', {
        hasData: overview.hasData,
        workoutsCompleted: overview.overview.workouts.completed,
        weightChange: overview.overview.physical.weightChange,
        currentWeight: overview.overview.physical.currentWeight
      });
    });

    test('When retrieving progress trends, Then should show accurate trend calculations', async () => {
      // Create progressive data over multiple weeks
      const dates = [];
      for (let i = 20; i >= 0; i -= 7) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date);
      }

      // Create progressive workout data (increasing difficulty)
      for (let i = 0; i < dates.length; i++) {
        await createTestWorkoutLog(testUserId, testUserToken, {
          date: dates[i].toISOString(),
          overall_difficulty: 6 + i, // Progressive increase
          energy_level: 7 + i,
          satisfaction: 7 + i
        });

        await createTestCheckIn(testUserId, testUserToken, {
          date: dates[i].toISOString().split('T')[0],
          weight: 75 + (i * 0.2), // Progressive weight increase
          energy_level: 6 + i
        });
      }

      // Refresh analytics
      await analyticsService.refreshUserAnalytics(testUserId, testUserToken);

      // Get trends
      const trends = await analyticsService.getProgressTrends(testUserId, testUserToken, {
        timeframe: '30 days',
        groupBy: 'week',
        metrics: ['weight', 'workouts']
      });

      // Validate trend calculations
      expect(trends.hasData).toBe(true);
      expect(trends.trends.weight).toBeDefined();
      expect(trends.trends.workouts).toBeDefined();

      // Should show improving trends
      expect(trends.trends.weight.trend).toBe('improving');
      expect(trends.trends.workouts.difficulty.trend).toBe('improving');

      console.log('✅ Progress Trends Validation:', {
        hasData: trends.hasData,
        weightTrend: trends.trends.weight.trend,
        workoutDifficultyTrend: trends.trends.workouts.difficulty.trend,
        dataPoints: trends.dataPoints
      });
    });

    test('When calculating adherence metrics, Then should provide accurate adherence scores', async () => {
      // Create consistent workout and meal data using recent dates (last 7 days)
      // Since adherence service only supports "days back from today", use recent dates
      const today = new Date();
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i); // Create dates from today backwards

        // Create workout logs for 5 out of 7 days (skip days 2 and 4 counting from 0)
        if (i !== 2 && i !== 4) {
          await createTestWorkoutLog(testUserId, testUserToken, {
            date: date.toISOString()
          });
        }

        // Create meal logs for 6 out of 7 days (skip day 5 counting from 0)
        if (i !== 5) {
          await createTestMealLog(testUserId, testUserToken, {
            logged_at: date.toISOString()
          });
        }
      }

      // Refresh analytics to ensure clean state for adherence calculation
      // Use recent date range to match the test data we just created
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 6); // 7 days total
      
      await analyticsService.refreshUserAnalytics(testUserId, testUserToken, {
        startDate: startDate.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      });

      // Get adherence metrics using timeframe (since startDate/endDate aren't supported)
      const adherence = await analyticsService.getAdherenceMetrics(testUserId, testUserToken, {
        timeframe: '7 days'
      });

      // Validate adherence calculations
      expect(adherence.hasData).toBe(true);
      expect(adherence.adherence.workout_adherence).toBeCloseTo(5/7, 1); // 5 out of 7 days
      expect(adherence.adherence.nutrition_adherence).toBeCloseTo(6/7, 1); // 6 out of 7 days
      expect(adherence.adherence.workout_days).toBe(5);
      expect(adherence.adherence.meal_days).toBe(6);

      console.log('✅ Adherence Metrics Validation:', {
        workoutAdherence: adherence.adherence.workout_adherence,
        nutritionAdherence: adherence.adherence.nutrition_adherence,
        workoutDays: adherence.adherence.workout_days,
        mealDays: adherence.adherence.meal_days
      });
    });
  });

  describe('Task 3: RLS and Security Validation', () => {
    test('When different users access analytics, Then should enforce proper RLS', async () => {
      // Create data for first user
      await ensureUserProfile({}, testUserToken);
      await createTestWorkoutLog(testUserId, testUserToken);
      await createTestCheckIn(testUserId, testUserToken);
      await analyticsService.refreshUserAnalytics(testUserId, testUserToken);

      // Create data for second user
      await ensureUserProfile({}, secondUserToken);
      await createTestWorkoutLog(secondUserId, secondUserToken);
      await createTestCheckIn(secondUserId, secondUserToken);
      await analyticsService.refreshUserAnalytics(secondUserId, secondUserToken);

      // First user should only see their own data
      const firstUserData = await analyticsService.getOverviewMetrics(testUserId, testUserToken);
      expect(firstUserData.userId).toBe(testUserId);

      // Second user should only see their own data
      const secondUserData = await analyticsService.getOverviewMetrics(secondUserId, secondUserToken);
      expect(secondUserData.userId).toBe(secondUserId);

      // Verify data isolation - users should have different data
      expect(firstUserData.userId).not.toBe(secondUserData.userId);

      console.log('✅ RLS Validation:', {
        firstUserCanAccessOwnData: firstUserData.userId === testUserId,
        secondUserCanAccessOwnData: secondUserData.userId === secondUserId,
        dataIsolated: firstUserData.userId !== secondUserData.userId
      });
    });

    test('When unauthorized access attempted, Then should return 401', async () => {
      // Attempt to access analytics without token
      const response = await supertest(app)
        .get('/v1/analytics/overview')
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toMatch(/authentication required/i);

      // Attempt to access with invalid token
      const invalidResponse = await supertest(app)
        .get('/v1/analytics/overview')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(invalidResponse.body.status).toBe('error');

      console.log('✅ Authentication Validation:', {
        noTokenRejected: response.status === 401,
        invalidTokenRejected: invalidResponse.status === 401
      });
    });
  });

  describe('Task 4: API Endpoint Integration Validation', () => {
    beforeEach(async () => {
      await ensureUserProfile();
      await createTestWorkoutLog(testUserId, testUserToken);
      await createTestCheckIn(testUserId, testUserToken);
      await analyticsService.refreshUserAnalytics(testUserId, testUserToken);
    });

    test('When calling analytics overview endpoint, Then should return proper API response', async () => {
      const response = await supertest(app)
        .get('/v1/analytics/overview')
        .set('Authorization', `Bearer ${testUserToken}`)
        .query({ timeframe: '30 days' })
        .expect(200);

      // Validate API response structure
      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.userId).toBe(testUserId);
      expect(response.body.data.overview).toBeDefined();
      expect(response.body.message).toBeDefined();

      console.log('✅ Overview Endpoint Validation:', {
        statusCorrect: response.body.status === 'success',
        dataPresent: !!response.body.data,
        userIdMatches: response.body.data.userId === testUserId
      });
    });

    test('When calling trends endpoint with parameters, Then should validate and process correctly', async () => {
      const response = await supertest(app)
        .get('/v1/analytics/trends')
        .set('Authorization', `Bearer ${testUserToken}`)
        .query({ 
          timeframe: '30 days',
          groupBy: 'week',
          metrics: 'weight,workouts'
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.trends).toBeDefined();
      expect(response.body.data.groupBy).toBe('week');

      // Test parameter validation
      const invalidResponse = await supertest(app)
        .get('/v1/analytics/trends')
        .set('Authorization', `Bearer ${testUserToken}`)
        .query({ groupBy: 'invalid' })
        .expect(400);

      expect(invalidResponse.body.status).toBe('error');

      console.log('✅ Trends Endpoint Validation:', {
        validRequestSuccess: response.status === 200,
        invalidRequestRejected: invalidResponse.status === 400,
        trendsDataPresent: !!response.body.data.trends
      });
    });

    test('When calling refresh endpoint, Then should process and return success', async () => {
      const response = await supertest(app)
        .post('/v1/analytics/refresh')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.operation).toBe('refresh');
      expect(response.body.data.success).toBe(true);

      console.log('✅ Refresh Endpoint Validation:', {
        refreshSuccess: response.body.data.success,
        operationCorrect: response.body.data.operation === 'refresh'
      });
    });

    test('When calling health endpoint, Then should return service status', async () => {
      const response = await supertest(app)
        .get('/v1/analytics/health')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.service).toBe('analytics');
      expect(response.body.data.healthy).toBe(true);

      console.log('✅ Health Endpoint Validation:', {
        serviceHealthy: response.body.data.healthy,
        serviceNameCorrect: response.body.data.service === 'analytics'
      });
    });
  });

  describe('Task 5: Error Handling and Edge Cases', () => {
    test('When no data exists, Then should handle gracefully', async () => {
      // Create user with no activity data
      const timestamp = Date.now();
      const emptyUserEmail = `empty${timestamp}@example.com`;
      
      const emptyUserResponse = await supertest(app)
        .post('/v1/auth/signup')
        .send({
          name: 'Empty User',
          email: emptyUserEmail,
          password: 'TestPassword123!'
        });

      const emptyUserToken = emptyUserResponse.body.accessToken;

      // Get analytics for user with no data
      const overview = await analyticsService.getOverviewMetrics(
        emptyUserResponse.body.userId, 
        emptyUserToken
      );

      expect(overview.hasData).toBe(false);
      expect(overview.overview.workouts.completed).toBe(0);

      console.log('✅ Empty Data Handling:', {
        hasDataFalse: overview.hasData === false,
        zeroWorkouts: overview.overview.workouts.completed === 0
      });
    });

    test('When invalid parameters provided, Then should return validation errors', async () => {
      // Test invalid timeframe
      const invalidTimeframeResponse = await supertest(app)
        .get('/v1/analytics/overview')
        .set('Authorization', `Bearer ${testUserToken}`)
        .query({ timeframe: 'invalid format' })
        .expect(400);

      expect(invalidTimeframeResponse.body.status).toBe('error');

      // Test invalid date range
      const invalidDateResponse = await supertest(app)
        .get('/v1/analytics/daterange')
        .set('Authorization', `Bearer ${testUserToken}`)
        .query({ startDate: '2024-13-01', endDate: '2024-12-01' })
        .expect(400);

      expect(invalidDateResponse.body.status).toBe('error');

      console.log('✅ Error Handling Validation:', {
        invalidTimeframeRejected: invalidTimeframeResponse.status === 400,
        invalidDateRejected: invalidDateResponse.status === 400
      });
    });
  });
});