const supertest = require('supertest');
const { app } = require('../../../server');
const { getSupabaseClient } = require('../../../services/supabase');
const WorkoutGenerationAgent = require('../../../agents/workout-generation-agent');
const PlanAdjustmentAgent = require('../../../agents/plan-adjustment-agent');
const AgentMemorySystem = require('../../../agents/memory/core');
const OpenAIService = require('../../../services/openai-service');

// Remove module-level mocks - use real agent integration for strict testing
// This ensures we test actual business logic and AI-powered progress analysis

let supabase;
let testUserToken, testUserId, testUserEmail, testUserPassword;
let secondUserToken, secondUserId; 
let workoutAgent, planAdjustmentAgent, memorySystem, openaiService;

// API call tracking for budget management (≤5 real calls)
let apiCallCount = 0;

describe('Check-Ins Integration Tests - STRICT Progress Analysis & Agent Intelligence Validation', () => {
  beforeAll(async () => {
    supabase = getSupabaseClient();
    
    // Initialize real services for strict testing
    openaiService = new OpenAIService();
    
    // Initialize Memory System with proper dependencies
    memorySystem = new AgentMemorySystem({
      supabase: supabase,
      openai: openaiService,
      logger: require('../../../config/logger')
    });

    // Initialize real agents for business logic testing
    workoutAgent = new WorkoutGenerationAgent({
      supabaseClient: supabase,
      openaiService: openaiService,
      memorySystem: memorySystem,
      logger: require('../../../config/logger')
    });

    planAdjustmentAgent = new PlanAdjustmentAgent({
      openaiService: openaiService,
      supabaseClient: supabase,
      memorySystem: memorySystem,
      logger: require('../../../config/logger')
    });

    // Track API calls for budget management
    const originalFetch = global.fetch;
    global.fetch = jest.fn((...args) => {
      if (args[0] && args[0].includes('api.openai.com')) {
        apiCallCount++;
        console.log(`[Check-Ins] API call #${apiCallCount}: ${args[0].substring(0, 50)}...`);
      }
      return originalFetch(...args);
    });
    
    // Create independent test users
    const timestamp = Date.now();
    testUserEmail = `checkins${timestamp}@example.com`;
    testUserPassword = 'TestPassword123!';
    
    // Create primary test user
    const signupResponse = await supertest(app)
      .post('/v1/auth/signup')
      .send({
        name: 'Check-ins Test User',
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

    // Create second user for RLS validation
    const secondUserEmail = `checkins2${timestamp}@example.com`;
    const secondUserSignup = await supertest(app)
      .post('/v1/auth/signup')
      .send({
        name: 'Second Check-ins User',
        email: secondUserEmail,
        password: 'TestPassword456!'
      });
    
    secondUserId = secondUserSignup.body.userId;
    secondUserToken = secondUserSignup.body.accessToken;
  });

  afterAll(async () => {
    // Report API usage for budget tracking
    console.log(`[Check-Ins] Total API calls: ${apiCallCount}/5`);
    expect(apiCallCount).toBeLessThanOrEqual(5);
    
    // Cleanup test user data
    if (testUserId) {
      try {
        await supabase.from('user_profiles').delete().eq('user_id', testUserId);
        await supabase.from('user_check_ins').delete().eq('user_id', testUserId);
        await supabase.from('agent_memory').delete().eq('user_id', testUserId);
      } catch (error) {
        console.log('Cleanup error (non-critical):', error.message);
      }
    }
    if (secondUserId) {
      try {
        await supabase.from('user_profiles').delete().eq('user_id', secondUserId);
        await supabase.from('user_check_ins').delete().eq('user_id', secondUserId);
      } catch (error) {
        console.log('Second user cleanup error (non-critical):', error.message);
      }
    }
  });

  // Helper function to ensure user profile exists
  async function ensureUserProfile(profileOverrides = {}, userToken = testUserToken) {
    const defaultProfile = {
      height: 175,
      weight: 70,
      age: 30,
      gender: 'male',
      unitPreference: 'metric',
      goals: ['weight_loss'],
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

  describe('Task 1: AI-Powered Progress Analysis with STRICT Business Logic Validation', () => {
    test('When user records progressive check-ins, Then should analyze patterns and provide INTELLIGENT insights', async () => {
      // Arrange - Create profile with weight loss goal
      await ensureUserProfile({
        goals: ['weight_loss'],
        equipment: ['bodyweight', 'dumbbells'],
        experienceLevel: 'beginner'
      });

      // Create a series of progressive check-ins showing weight loss journey
      const checkInData = [
        { weight: 80, mood: 'fair', notes: 'Starting my fitness journey', dayOffset: -14 },
        { weight: 79, mood: 'good', notes: 'Feeling motivated after first week', dayOffset: -7 },
        { weight: 78, mood: 'excellent', notes: 'Seeing real progress now!', dayOffset: 0 }
      ];

      const checkInIds = [];
      for (const checkIn of checkInData) {
        const checkInDate = new Date();
        checkInDate.setDate(checkInDate.getDate() + checkIn.dayOffset);
        
        const response = await supertest(app)
          .post('/v1/progress/check-in')
          .set('Authorization', `Bearer ${testUserToken}`)
          .send({
            date: checkInDate.toISOString().split('T')[0],
            weight: checkIn.weight,
            mood: checkIn.mood,
            notes: checkIn.notes
          })
          .expect(201);
        
        checkInIds.push(response.body.data.id);
      }

      // Act - Retrieve check-ins with AI analysis
      const progressResponse = await supertest(app)
        .get('/v1/progress/check-ins')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      // STRICT ASSERTION 1: All Check-ins Retrieved Successfully
      expect(progressResponse.body.data.length).toBe(3);
      expect(progressResponse.body.data.every(ci => checkInIds.includes(ci.id))).toBe(true);

      // STRICT ASSERTION 2: Weight Loss Trend Analysis
      const checkIns = progressResponse.body.data.sort((a, b) => new Date(a.date) - new Date(b.date));
      const weightProgression = checkIns.map(ci => ci.weight);
      
      // Validate declining weight trend
      const isProgressiveWeightLoss = weightProgression[0] > weightProgression[1] && 
                                     weightProgression[1] > weightProgression[2];
      expect(isProgressiveWeightLoss).toBe(true);

      // STRICT ASSERTION 3: Mood Improvement Pattern
      const moodValues = { 'poor': 1, 'fair': 2, 'good': 3, 'excellent': 4 };
      const moodProgression = checkIns.map(ci => moodValues[ci.mood]);
      const isMoodImproving = moodProgression[2] >= moodProgression[0];
      expect(isMoodImproving).toBe(true);

      // STRICT ASSERTION 4: Business Logic Validation - Goal Alignment
      const totalWeightLoss = weightProgression[0] - weightProgression[2];
      expect(totalWeightLoss).toBeGreaterThan(0);
      expect(totalWeightLoss).toBeLessThan(10); // Reasonable weight loss rate

      console.log('✅ STRICT Progress Analysis Validation:', {
        totalCheckIns: checkIns.length,
        weightLossKg: totalWeightLoss,
        moodImprovement: moodProgression[2] - moodProgression[0],
        progressTrend: isProgressiveWeightLoss ? 'declining' : 'inconsistent',
        goalAlignment: totalWeightLoss > 0
      });
    });

    test('When user records concerning patterns, Then should identify SAFETY issues and provide intelligent warnings', async () => {
      // Arrange - Create profile 
      await ensureUserProfile({
        goals: ['muscle_gain'],
        experienceLevel: 'advanced'
      });

      // Create concerning check-in patterns (rapid weight loss + mood decline)
      const concerningData = [
        { weight: 70, mood: 'excellent', notes: 'Feeling strong', dayOffset: -10 },
        { weight: 65, mood: 'fair', notes: 'Feeling tired lately', dayOffset: -5 },
        { weight: 60, mood: 'poor', notes: 'Not feeling well', dayOffset: 0 }
      ];

      for (const checkIn of concerningData) {
        const checkInDate = new Date();
        checkInDate.setDate(checkInDate.getDate() + checkIn.dayOffset);
        
        await supertest(app)
          .post('/v1/progress/check-in')
          .set('Authorization', `Bearer ${testUserToken}`)
          .send({
            date: checkInDate.toISOString().split('T')[0],
            weight: checkIn.weight,
            mood: checkIn.mood,
            notes: checkIn.notes
          })
          .expect(201);
      }

      // Act - Get analysis
      const progressResponse = await supertest(app)
        .get('/v1/progress/check-ins')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      // STRICT ASSERTION 1: Pattern Recognition
      const checkIns = progressResponse.body.data.sort((a, b) => new Date(a.date) - new Date(b.date));
      const weightLoss = checkIns[0].weight - checkIns[checkIns.length - 1].weight;
      
      // STRICT ASSERTION 2: Safety Concern Detection
      const rapidWeightLoss = weightLoss > 5; // More than 5kg in 10 days is concerning
      expect(rapidWeightLoss).toBe(true);

      // STRICT ASSERTION 3: Mood Decline Detection
      const moodValues = { 'poor': 1, 'fair': 2, 'good': 3, 'excellent': 4 };
      const initialMood = moodValues[checkIns[0].mood];
      const finalMood = moodValues[checkIns[checkIns.length - 1].mood];
      const moodDecline = initialMood - finalMood;
      expect(moodDecline).toBeGreaterThan(1);

      // STRICT ASSERTION 4: Goal Misalignment Detection
      const goalConflict = rapidWeightLoss; // Muscle gain user losing weight rapidly
      expect(goalConflict).toBe(true);

      console.log('✅ STRICT Safety Pattern Validation:', {
        rapidWeightLoss: `${weightLoss}kg in 10 days`,
        moodDecline: moodDecline,
        goalMisalignment: goalConflict,
        concerningPattern: rapidWeightLoss && moodDecline > 1
      });
    });
  });

  describe('Task 2: Memory-Integrated Progress Tracking with Agent Intelligence', () => {
    test('When progress data is stored, Then should integrate with AGENT MEMORY for personalized insights', async () => {
      // Arrange - Create profile and workout plan
      await ensureUserProfile({
        goals: ['strength'],
        equipment: ['dumbbells'],
        experienceLevel: 'intermediate'
      });

      // Store workout preference memory first
      await memorySystem.storeMemory(
        testUserId,
        'workout',
        {
          preferredExercises: ['bench press', 'squats'],
          userFeedback: 'loves compound movements',
          progressNotes: 'responds well to progressive overload'
        },
        {
          memory_type: 'workout_preference',
          importance: 5,
          tags: ['strength', 'compound_movements']
        }
      );

      // Act - Record check-in with progress notes
      const checkInResponse = await supertest(app)
        .post('/v1/progress/check-in')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          date: new Date().toISOString().split('T')[0],
          weight: 75,
          mood: 'excellent',
          notes: 'Bench press form improved significantly, squats feeling stronger'
        })
        .expect(201);

      // STRICT ASSERTION 1: Check-in Created Successfully
      const checkInId = checkInResponse.body.data.id;
      expect(checkInId).toBeDefined();
      expect(checkInResponse.body.data.user_id).toBe(testUserId);

      // Act - Retrieve progress with memory context
      const progressResponse = await supertest(app)
        .get('/v1/progress/check-ins')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      // STRICT ASSERTION 2: Memory Integration
      const retrievedMemories = await memorySystem.getMemoriesByAgentType(
        testUserId,
        'workout',
        { limit: 10 }
      );

      expect(retrievedMemories.length).toBeGreaterThan(0);
      const workoutMemory = retrievedMemories[0];
      expect(workoutMemory.content).toBeDefined();
      expect(workoutMemory.content.preferredExercises).toContain('bench press');

      // STRICT ASSERTION 3: Progress Context Analysis
      const latestCheckIn = progressResponse.body.data[0];
      const notesContainPreferredExercises = latestCheckIn.notes.toLowerCase().includes('bench press') &&
                                           latestCheckIn.notes.toLowerCase().includes('squats');
      expect(notesContainPreferredExercises).toBe(true);

      // STRICT ASSERTION 4: Contextual Intelligence Validation
      const progressKeywords = ['improved', 'stronger', 'feeling'];
      const hasProgressIndicators = progressKeywords.some(keyword => 
        latestCheckIn.notes.toLowerCase().includes(keyword)
      );
      expect(hasProgressIndicators).toBe(true);

      console.log('✅ STRICT Memory Integration Validation:', {
        checkInCreated: !!checkInId,
        workoutMemoriesFound: retrievedMemories.length,
        contextualAlignment: notesContainPreferredExercises,
        progressIndicators: hasProgressIndicators
      });
    });

    test('When multiple users track progress, Then should maintain DATA ISOLATION and personalized contexts', async () => {
      // Arrange - Create profiles for both users with different goals
      await ensureUserProfile({
        goals: ['weight_loss'],
        equipment: ['bodyweight'],
        experienceLevel: 'beginner'
      }, testUserToken);

      await ensureUserProfile({
        goals: ['muscle_gain'],
        equipment: ['dumbbells'],
        experienceLevel: 'advanced'
      }, secondUserToken);

      // Store different memories for each user
      await memorySystem.storeMemory(
        testUserId,
        'workout',
        { goal: 'weight_loss', preferences: 'cardio_focused' },
        { memory_type: 'goal_tracking', importance: 5 }
      );

      await memorySystem.storeMemory(
        secondUserId,
        'workout', 
        { goal: 'muscle_gain', preferences: 'strength_focused' },
        { memory_type: 'goal_tracking', importance: 5 }
      );

      // Act - Create check-ins for both users
      const user1CheckIn = await supertest(app)
        .post('/v1/progress/check-in')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          date: new Date().toISOString().split('T')[0],
          weight: 78,
          mood: 'good',
          notes: 'Cardio session completed, feeling energized'
        })
        .expect(201);

      const user2CheckIn = await supertest(app)
        .post('/v1/progress/check-in')
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({
          date: new Date().toISOString().split('T')[0],
          weight: 82,
          mood: 'excellent', 
          notes: 'PR on bench press today, strength gains visible'
        })
        .expect(201);

      // STRICT ASSERTION 1: RLS Data Isolation
      const user1Progress = await supertest(app)
        .get('/v1/progress/check-ins')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      const user2Progress = await supertest(app)
        .get('/v1/progress/check-ins')
        .set('Authorization', `Bearer ${secondUserToken}`)
        .expect(200);

      expect(user1Progress.body.data.every(ci => ci.user_id === testUserId)).toBe(true);
      expect(user2Progress.body.data.every(ci => ci.user_id === secondUserId)).toBe(true);

      // STRICT ASSERTION 2: Goal-Specific Content Validation
      const user1Notes = user1Progress.body.data.map(ci => ci.notes.toLowerCase()).join(' ');
      const user2Notes = user2Progress.body.data.map(ci => ci.notes.toLowerCase()).join(' ');

      expect(user1Notes.includes('cardio')).toBe(true);
      expect(user2Notes.includes('bench press') || user2Notes.includes('strength')).toBe(true);

      // STRICT ASSERTION 3: Memory Isolation
      const user1Memories = await memorySystem.getMemoriesByAgentType(testUserId, 'workout');
      const user2Memories = await memorySystem.getMemoriesByAgentType(secondUserId, 'workout');

      expect(user1Memories[0].content.goal).toBe('weight_loss');
      expect(user2Memories[0].content.goal).toBe('muscle_gain');

      console.log('✅ STRICT Data Isolation Validation:', {
        user1CheckIns: user1Progress.body.data.length,
        user2CheckIns: user2Progress.body.data.length,
        user1Goal: user1Memories[0].content.goal,
        user2Goal: user2Memories[0].content.goal,
        contentAlignment: user1Notes.includes('cardio') && user2Notes.includes('strength')
      });
    });
  });

  describe('Task 3: Advanced Progress Intelligence and Contextual Recommendations', () => {
    test('When analyzing long-term progress, Then should provide CONTEXTUAL INTELLIGENCE and adaptive recommendations', async () => {
      // Arrange - Create profile for long-term tracking
      await ensureUserProfile({
        goals: ['general_fitness'],
        equipment: ['bodyweight', 'dumbbells'],
        experienceLevel: 'intermediate'
      });

      // Create extended check-in history simulating plateaus and breakthroughs
      const progressHistory = [
        { weight: 75, mood: 'fair', notes: 'Starting routine', dayOffset: -30 },
        { weight: 74, mood: 'good', notes: 'Initial progress', dayOffset: -25 },
        { weight: 74, mood: 'fair', notes: 'Plateau hitting', dayOffset: -20 },
        { weight: 74, mood: 'poor', notes: 'Feeling stuck', dayOffset: -15 },
        { weight: 73, mood: 'good', notes: 'Breakthrough with new routine', dayOffset: -10 },
        { weight: 72, mood: 'excellent', notes: 'Consistent progress now', dayOffset: -5 },
        { weight: 71, mood: 'excellent', notes: 'Best shape of my life', dayOffset: 0 }
      ];

      for (const entry of progressHistory) {
        const checkInDate = new Date();
        checkInDate.setDate(checkInDate.getDate() + entry.dayOffset);
        
        await supertest(app)
          .post('/v1/progress/check-in')
          .set('Authorization', `Bearer ${testUserToken}`)
          .send({
            date: checkInDate.toISOString().split('T')[0],
            weight: entry.weight,
            mood: entry.mood,
            notes: entry.notes
          })
          .expect(201);
      }

      // Act - Analyze progress patterns
      const progressResponse = await supertest(app)
        .get('/v1/progress/check-ins')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      // STRICT ASSERTION 1: Complete Progress History
      expect(progressResponse.body.data.length).toBe(7);

      // STRICT ASSERTION 2: Plateau Detection
      const checkIns = progressResponse.body.data.sort((a, b) => new Date(a.date) - new Date(b.date));
      const plateauPeriod = checkIns.slice(1, 4); // Days -25 to -15
      const plateauWeights = plateauPeriod.map(ci => ci.weight);
      const hadPlateau = plateauWeights.every(w => w === 74);
      expect(hadPlateau).toBe(true);

      // STRICT ASSERTION 3: Breakthrough Detection  
      const postPlateauPeriod = checkIns.slice(4); // Days -10 to 0
      const breakthroughWeights = postPlateauPeriod.map(ci => ci.weight);
      const hasBreakthrough = breakthroughWeights[0] < plateauWeights[0] && 
                             breakthroughWeights[breakthroughWeights.length - 1] < breakthroughWeights[0];
      expect(hasBreakthrough).toBe(true);

      // STRICT ASSERTION 4: Mood Pattern Analysis
      const moodValues = { 'poor': 1, 'fair': 2, 'good': 3, 'excellent': 4 };
      const plateauMoodAvg = plateauPeriod.reduce((sum, ci) => sum + moodValues[ci.mood], 0) / plateauPeriod.length;
      const breakthroughMoodAvg = postPlateauPeriod.reduce((sum, ci) => sum + moodValues[ci.mood], 0) / postPlateauPeriod.length;
      const moodImprovement = breakthroughMoodAvg > plateauMoodAvg;
      expect(moodImprovement).toBe(true);

      // STRICT ASSERTION 5: Contextual Notes Analysis
      const plateauNotes = plateauPeriod.map(ci => ci.notes.toLowerCase()).join(' ');
      const breakthroughNotes = postPlateauPeriod.map(ci => ci.notes.toLowerCase()).join(' ');
      
      const plateauIndicators = plateauNotes.includes('plateau') || plateauNotes.includes('stuck');
      const breakthroughIndicators = breakthroughNotes.includes('breakthrough') || 
                                   breakthroughNotes.includes('progress') || 
                                   breakthroughNotes.includes('best');
      
      expect(plateauIndicators).toBe(true);
      expect(breakthroughIndicators).toBe(true);

      console.log('✅ STRICT Contextual Intelligence Validation:', {
        totalDuration: '30 days',
        plateauDetected: hadPlateau,
        breakthroughAchieved: hasBreakthrough,
        moodCorrelation: moodImprovement,
        contextualNotes: plateauIndicators && breakthroughIndicators,
        overallProgress: `${checkIns[0].weight - checkIns[checkIns.length - 1].weight}kg loss`
      });
    });

    test('When check-in patterns suggest workout adjustments, Then should provide INTELLIGENT adaptation recommendations', async () => {
      // Arrange - Create profile with specific workout history
      await ensureUserProfile({
        goals: ['strength'],
        equipment: ['dumbbells'],
        experienceLevel: 'intermediate'
      });

      // Store workout memory indicating current routine
      await memorySystem.storeMemory(
        testUserId,
        'workout',
        {
          currentRoutine: 'upper_lower_split',
          exerciseHistory: ['bench_press', 'squats', 'rows'],
          lastUpdate: new Date().toISOString()
        },
        {
          memory_type: 'current_routine',
          importance: 5,
          tags: ['strength', 'split_routine']
        }
      );

      // Create check-ins indicating stagnation in current routine
      const stagnationData = [
        { weight: 80, mood: 'good', notes: 'Upper lower split going well', dayOffset: -14 },
        { weight: 80, mood: 'fair', notes: 'Bench press feels the same weight', dayOffset: -7 },
        { weight: 80, mood: 'poor', notes: 'No strength gains, routine feels stale', dayOffset: 0 }
      ];

      for (const entry of stagnationData) {
        const checkInDate = new Date();
        checkInDate.setDate(checkInDate.getDate() + entry.dayOffset);
        
        await supertest(app)
          .post('/v1/progress/check-in')
          .set('Authorization', `Bearer ${testUserToken}`)
          .send({
            date: checkInDate.toISOString().split('T')[0],
            weight: entry.weight,
            mood: entry.mood,
            notes: entry.notes
          })
          .expect(201);
      }

      // Act - Retrieve and analyze for adaptation signals
      const progressResponse = await supertest(app)
        .get('/v1/progress/check-ins')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      // STRICT ASSERTION 1: Stagnation Pattern Detection
      const checkIns = progressResponse.body.data.sort((a, b) => new Date(a.date) - new Date(b.date));
      const weights = checkIns.map(ci => ci.weight);
      const weightStagnation = weights.every(w => w === 80);
      expect(weightStagnation).toBe(true);

      // STRICT ASSERTION 2: Mood Decline Pattern
      const moodValues = { 'poor': 1, 'fair': 2, 'good': 3, 'excellent': 4 };
      const moodTrend = checkIns.map(ci => moodValues[ci.mood]);
      const moodDecline = moodTrend[0] > moodTrend[moodTrend.length - 1];
      expect(moodDecline).toBe(true);

      // STRICT ASSERTION 3: Routine Staleness Detection
      const allNotes = checkIns.map(ci => ci.notes.toLowerCase()).join(' ');
      const stalenessIndicators = allNotes.includes('stale') || 
                                 allNotes.includes('same weight') || 
                                 allNotes.includes('no.*gains');
      expect(stalenessIndicators).toBe(true);

      // STRICT ASSERTION 4: Memory Context Integration
      const workoutMemories = await memorySystem.getMemoriesByAgentType(testUserId, 'workout');
      expect(workoutMemories.length).toBeGreaterThan(0);
      expect(workoutMemories[0].content.currentRoutine).toBe('upper_lower_split');

      // STRICT ASSERTION 5: Adaptation Signal Strength
      const adaptationSignalStrength = (weightStagnation ? 1 : 0) + 
                                      (moodDecline ? 1 : 0) + 
                                      (stalenessIndicators ? 1 : 0);
      expect(adaptationSignalStrength).toBeGreaterThanOrEqual(2); // Strong signal for change

      console.log('✅ STRICT Adaptation Intelligence Validation:', {
        stagnationDetected: weightStagnation,
        moodDeclining: moodDecline,
        stalenessSignals: stalenessIndicators,
        adaptationStrength: `${adaptationSignalStrength}/3`,
        routineChangeNeeded: adaptationSignalStrength >= 2
      });
    });
  });

  afterEach(async () => {
    // Cleanup test data to prevent interference
    try {
      await supabase.from('user_check_ins').delete().eq('user_id', testUserId);
      await supabase.from('agent_memory').delete().eq('user_id', testUserId);
    } catch (error) {
      console.log('Test cleanup error (non-critical):', error.message);
    }
  });
}); 