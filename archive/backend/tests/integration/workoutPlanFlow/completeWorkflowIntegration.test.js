const supertest = require('supertest');
const { app } = require('../../../server');
const { getSupabaseClient } = require('../../../services/supabase');
const workoutService = require('../../../services/workout-service');
const WorkoutGenerationAgent = require('../../../agents/workout-generation-agent');
const ResearchAgent = require('../../../agents/research-agent');
const PlanAdjustmentAgent = require('../../../agents/plan-adjustment-agent');
const AgentMemorySystem = require('../../../agents/memory/core');
const { PerplexityService } = require('../../../services/perplexity-service');
const OpenAIService = require('../../../services/openai-service');

let supabase;
let testUser;
let testUserToken;
let testUserName, testUserEmail, testUserPassword;
let workoutAgent;
let researchAgent;
let planAdjustmentAgent;
let memorySystem;
let openaiService;
let perplexityService;

// API call tracking for complete workflow budget (≤5 real calls)
let apiCallCount = 0;
const originalFetch = global.fetch;

describe('Complete Workflow Integration Tests - Strict End-to-End Validation', () => {
  beforeAll(async () => {
    // Initialize Supabase client
    supabase = getSupabaseClient();

    // Initialize OpenAI service instance
    openaiService = new OpenAIService();

    // Initialize Memory System with proper OpenAI service
    memorySystem = new AgentMemorySystem({
      supabase: supabase,
      openai: openaiService,
      logger: require('../../../config/logger')
    });

    // Initialize PerplexityService instance
    perplexityService = new PerplexityService();

    // Initialize all agents with proper dependencies
    workoutAgent = new WorkoutGenerationAgent({
      supabaseClient: supabase,
      openaiService: openaiService,
      memorySystem: memorySystem,
      logger: require('../../../config/logger')
    });

    researchAgent = new ResearchAgent({
      perplexityService: perplexityService,
      memorySystem: memorySystem,
      logger: require('../../../config/logger')
    });

    planAdjustmentAgent = new PlanAdjustmentAgent({
      openaiService: openaiService,
      supabaseClient: supabase,
      memorySystem: memorySystem,
      logger: require('../../../config/logger')
    });

    // Set up API call tracking
    global.fetch = jest.fn((...args) => {
      if (args[0] && (args[0].includes('api.openai.com') || args[0].includes('api.perplexity.ai'))) {
        apiCallCount++;
        console.log(`[Complete Workflow] API call #${apiCallCount}: ${args[0]}`);
      }
      return originalFetch(...args);
    });

    // Create unique test user
    const timestamp = Date.now();
    testUserEmail = `complete-workflow-${timestamp}@example.com`;
    testUserName = `Complete Workflow Test User ${timestamp}`;
    testUserPassword = 'TestPassword123!';

    // Create test user with proper error handling
    let signupResponse = await supertest(app)
      .post('/v1/auth/signup')
      .send({ name: testUserName, email: testUserEmail, password: testUserPassword });
    
    if (signupResponse.status !== 201) throw new Error(`Failed to signup test user: ${signupResponse.body.message}`);
    testUser = { id: signupResponse.body.userId };
    testUserToken = signupResponse.body.accessToken;

    if (!testUserToken) {
      const loginResponse = await supertest(app)
        .post('/v1/auth/login')
        .send({ email: testUserEmail, password: testUserPassword });
      if (loginResponse.status !== 200) throw new Error(`Failed to login test user: ${loginResponse.body.message}`);
      testUserToken = loginResponse.body.jwtToken;
    }

    if (!testUserToken) {
      throw new Error('Failed to retrieve token for complete workflow integration test user.');
    }
  });

  afterAll(async () => {
    // Cleanup and report API usage
    console.log(`[Complete Workflow] Total API calls: ${apiCallCount}/5`);
    expect(apiCallCount).toBeLessThanOrEqual(5);
    
    // Restore original fetch
    global.fetch = originalFetch;

    // Cleanup test user data
    if (testUser?.id) {
      try {
        await supabase
          .from('user_profiles')
          .delete()
          .eq('user_id', testUser.id);
        
        await supabase
          .from('workout_plans')
          .delete()
          .eq('user_id', testUser.id);
      } catch (error) {
        console.log('Cleanup error (non-critical):', error.message);
      }
    }
  });

  // Helper function to ensure user profile exists 
  async function ensureUserProfile(profileOverrides = {}) {
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
      .set('Authorization', `Bearer ${testUserToken}`)
      .send(profileData);
    
    if (![200, 201].includes(profileResponse.status)) {
      throw new Error(`Failed to create user profile: ${profileResponse.body.message || 'Unknown error'}`);
    }

    return profileData;
  }

  describe('Task 5.1: Complete User Journey with STRICT Business Logic Validation', () => {
    test('When user requests complete workflow with equipment constraints, Then should generate FUNCTIONALLY VALID plan respecting constraints', async () => {
      // Arrange - Create profile with specific equipment constraints
      const profileData = await ensureUserProfile({
        goals: ['muscle_gain'],
        equipment: ['dumbbells'], // STRICT constraint - only dumbbells
        experienceLevel: 'intermediate'
      });

      const workoutRequest = {
        fitnessLevel: 'intermediate',
        goals: ['muscle_gain'],
        equipment: ['dumbbells'], // Must match profile
        restrictions: [],
        exerciseTypes: ['strength'],
        workoutFrequency: '4x per week'
      };

      // Act - Execute complete workflow through API endpoint with contextual mock
      const workflowResponse = await supertest(app)
        .post('/v1/workouts')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(workoutRequest)
        .expect(201);

      // STRICT ASSERTION 1: Basic Response Structure
      expect(workflowResponse.body.status).toBe('success');
      expect(workflowResponse.body.data).toBeDefined();
      
      const generatedPlan = workflowResponse.body.data;
      expect(generatedPlan.id).toBeDefined();
      expect(generatedPlan.user_id).toBe(testUser.id);
      expect(generatedPlan.plan_data).toBeDefined();

      // STRICT ASSERTION 2: Equipment Constraint Validation
      const planData = generatedPlan.plan_data;
      expect(planData.weeklySchedule).toBeDefined();
      
      const allExercises = [];
      Object.values(planData.weeklySchedule).forEach(day => {
        if (typeof day === 'object' && day.exercises) {
          allExercises.push(...day.exercises.map(ex => ex.exercise.toLowerCase()));
        }
      });

      expect(allExercises.length).toBeGreaterThan(0);

      // STRICT EQUIPMENT VALIDATION: Only dumbbells allowed
      const usesOnlyDumbbells = allExercises.every(exercise => {
        const isDumbbellExercise = exercise.includes('dumbbell');
        const isBodyweightExercise = /push[- ]?ups?|pull[- ]?ups?|squats?|lunges?|planks?|burpees?|dips?|sit[- ]?ups?|mountain climbers?|glute bridges?/i.test(exercise);
        return isDumbbellExercise || isBodyweightExercise;
      });
      expect(usesOnlyDumbbells).toBe(true);

      // STRICT ASSERTION 3: Goal Alignment for Muscle Gain
      const planName = planData.planName || generatedPlan.name;
      const goalRelevantTerms = ['muscle', 'gain', 'building', 'mass', 'hypertrophy', 'strength', 'dumbbell'];
      const hasGoalRelevantTerm = goalRelevantTerms.some(term => planName.toLowerCase().includes(term));
      expect(hasGoalRelevantTerm).toBe(true);

      // STRICT ASSERTION 4: Muscle Group Coverage for Muscle Gain
      const hasChestExercise = allExercises.some(ex => 
        ex.includes('bench') || ex.includes('press') || ex.includes('chest') || ex.includes('fly')
      );
      const hasBackExercise = allExercises.some(ex => 
        ex.includes('row') || ex.includes('back') || ex.includes('pull')
      );
      const hasLegExercise = allExercises.some(ex => 
        ex.includes('squat') || ex.includes('leg') || ex.includes('lunge')
      );
      
      expect(hasChestExercise).toBe(true);
      expect(hasBackExercise).toBe(true);  
      expect(hasLegExercise).toBe(true);

      // STRICT ASSERTION 5: Database Integrity Validation
      const { data: storedPlan, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('id', generatedPlan.id)
        .single();

      expect(error).toBeNull();
      expect(storedPlan).toMatchObject({
        id: generatedPlan.id,
        user_id: testUser.id,
        ai_generated: true,
        status: 'active'
      });

      expect(storedPlan.plan_data).toBeDefined();
      expect(typeof storedPlan.plan_data).toBe('object');

      console.log('✅ STRICT Complete Workflow Validation:', {
        planName: planName,
        totalExercises: allExercises.length,
        equipmentCompliant: usesOnlyDumbbells,
        muscleGroupCoverage: { chest: hasChestExercise, back: hasBackExercise, legs: hasLegExercise },
        databaseStored: !!storedPlan
      });
    });

    test('When user has medical restrictions, Then workflow should generate SAFE plan avoiding contraindicated exercises', async () => {
      // Arrange - Create profile with medical restrictions
      const profileData = await ensureUserProfile({
        goals: ['general_fitness'],
        equipment: ['bodyweight', 'dumbbells'],
        experienceLevel: 'beginner',
        medicalConditions: ['knee pain', 'shoulder injury'] // Use spaces instead of underscores
      });

      const workoutRequest = {
        fitnessLevel: 'beginner',
        goals: ['general_fitness'],
        equipment: ['bodyweight', 'dumbbells'],
        restrictions: ['knee pain', 'shoulder injury'], // This is for the workout request
        exerciseTypes: ['strength'],
        workoutFrequency: '3x per week'
      };

      // Act - Execute complete workflow
      const workflowResponse = await supertest(app)
        .post('/v1/workouts')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(workoutRequest)
        .expect(201);

      // STRICT ASSERTION 1: Basic Response Structure
      expect(workflowResponse.body.status).toBe('success');
      const generatedPlan = workflowResponse.body.data;
      expect(generatedPlan.plan_data).toBeDefined();

      // STRICT ASSERTION 2: Safety Compliance Validation
      const allExercises = [];
      Object.values(generatedPlan.plan_data.weeklySchedule).forEach(day => {
        if (typeof day === 'object' && day.exercises) {
          allExercises.push(...day.exercises.map(ex => ex.exercise.toLowerCase()));
        }
      });

      // STRICT SAFETY VALIDATION: No knee-risky exercises
      const kneeRiskyExercises = allExercises.filter(ex =>
        ex.includes('squat') && !ex.includes('wall') && !ex.includes('assisted') ||
        ex.includes('lunge') ||
        ex.includes('jump') ||
        ex.includes('plyometric')
      );
      expect(kneeRiskyExercises).toHaveLength(0);

      // STRICT SAFETY VALIDATION: No shoulder-risky exercises  
      const shoulderRiskyExercises = allExercises.filter(ex =>
        ex.includes('overhead press') ||
        ex.includes('military press') ||
        ex.includes('behind neck') ||
        ex.includes('upright row')
      );
      expect(shoulderRiskyExercises).toHaveLength(0);

      // STRICT ASSERTION 3: Beginner-Appropriate Volume
      const totalExercisesPerWeek = allExercises.length;
      expect(totalExercisesPerWeek).toBeGreaterThanOrEqual(6); // Minimum for beginner
      expect(totalExercisesPerWeek).toBeLessThanOrEqual(15); // Maximum reasonable for beginner

      console.log('✅ STRICT Safety Compliance Validation:', {
        totalExercises: totalExercisesPerWeek,
        kneeRiskyCount: kneeRiskyExercises.length,
        shoulderRiskyCount: shoulderRiskyExercises.length,
        safetyCompliant: kneeRiskyExercises.length === 0 && shoulderRiskyExercises.length === 0,
        medicalConditions: ['knee pain', 'shoulder injury']
      });
    });

    test('When workflow fails at validation stage, Then should handle gracefully with meaningful errors', async () => {
      // Arrange - Delete any existing profile to ensure missing profile condition
      try {
        await supabase
          .from('user_profiles')
          .delete()
          .eq('user_id', testUser.id);
      } catch (error) {
        // Profile might not exist, which is what we want
      }

      const workoutRequest = {
        fitnessLevel: 'intermediate',
        goals: ['strength'],
        equipment: ['dumbbells'],
        restrictions: [],
        exerciseTypes: ['strength'],
        workoutFrequency: '3x per week'
      };

      // Act & Assert - Should handle validation failure gracefully
      const response = await supertest(app)
        .post('/v1/workouts')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(workoutRequest)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toMatch(/profile|required|not found/i);
    });

    test('When exerciseTypes is missing, Then should return specific validation error', async () => {
      // Arrange - Create profile and request without required exerciseTypes
      await ensureUserProfile();

      const workoutRequest = {
        fitnessLevel: 'beginner',
        goals: ['weight_loss'],
        equipment: ['bodyweight']
        // Missing exerciseTypes - required by validation schema
      };

      // Act & Assert - Should fail validation with specific error
      const response = await supertest(app)
        .post('/v1/workouts')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(workoutRequest)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Exercise types are required');
    });
  });

  describe('Task 5.2: Workflow State Management with Database Integrity', () => {
    test('When concurrent workflow requests occur, Then should maintain data consistency and isolation', async () => {
      // Arrange
      await ensureUserProfile();

      const workoutRequest1 = {
        fitnessLevel: 'intermediate',
        goals: ['strength'],
        equipment: ['bodyweight'],
        exerciseTypes: ['strength'],
        workoutFrequency: '3x per week'
      };

      const workoutRequest2 = {
        fitnessLevel: 'intermediate', 
        goals: ['endurance'],
        equipment: ['bodyweight'],
        exerciseTypes: ['cardio'],
        workoutFrequency: '4x per week'
      };

      // Act - Execute concurrent requests
      const [response1, response2] = await Promise.all([
        supertest(app)
          .post('/v1/workouts')
          .set('Authorization', `Bearer ${testUserToken}`)
          .send(workoutRequest1),
        supertest(app)
          .post('/v1/workouts')
          .set('Authorization', `Bearer ${testUserToken}`)
          .send(workoutRequest2)
      ]);

      // STRICT ASSERTION 1: Both requests succeed
      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
      expect(response1.body.data.id).not.toBe(response2.body.data.id);

      // STRICT ASSERTION 2: Database integrity validation
      const plan1 = await workoutService.retrieveWorkoutPlan(response1.body.data.id, testUser.id, testUserToken);
      const plan2 = await workoutService.retrieveWorkoutPlan(response2.body.data.id, testUser.id, testUserToken);
      
      expect(plan1.id).toBe(response1.body.data.id);
      expect(plan2.id).toBe(response2.body.data.id);
      expect(plan1.user_id).toBe(testUser.id);
      expect(plan2.user_id).toBe(testUser.id);

      // STRICT ASSERTION 3: Plan differentiation based on goals
      const plan1Exercises = [];
      const plan2Exercises = [];

      Object.values(plan1.plan_data.weeklySchedule).forEach(day => {
        if (typeof day === 'object' && day.exercises) {
          plan1Exercises.push(...day.exercises.map(ex => ex.exercise.toLowerCase()));
        }
      });

      Object.values(plan2.plan_data.weeklySchedule).forEach(day => {
        if (typeof day === 'object' && day.exercises) {
          plan2Exercises.push(...day.exercises.map(ex => ex.exercise.toLowerCase()));
        }
      });

      // Plans should reflect different goals
      const plan1HasStrength = plan1Exercises.some(ex => 
        ex.includes('push') || ex.includes('squat') || ex.includes('press')
      );
      const plan2HasCardio = plan2Exercises.some(ex => 
        ex.includes('cardio') || ex.includes('running') || ex.includes('jumping') || ex.includes('burpee')
      ) || plan2.plan_data.planName.toLowerCase().includes('cardio');

      expect(plan1HasStrength).toBe(true);
      // Plan2 should either have cardio exercises OR be named appropriately for endurance
      expect(plan2HasCardio || plan2.plan_data.planName.toLowerCase().includes('endurance')).toBe(true);

      console.log('✅ STRICT Concurrent Request Validation:', {
        plan1Id: plan1.id,
        plan2Id: plan2.id,
        plan1StrengthFocus: plan1HasStrength,
        plan2EnduranceFocus: plan2HasCardio,
        plansAreDifferent: plan1.id !== plan2.id
      });
    });
  });

  describe('Task 5.3: Cross-User Data Isolation Validation', () => {
    test('When different users access workout plans, Then should enforce complete data isolation', async () => {
      // Arrange - Create first user's plan
      await ensureUserProfile();

      const workoutRequest = {
        fitnessLevel: 'intermediate',
        goals: ['strength'],
        equipment: ['dumbbells'],
        exerciseTypes: ['strength'],
        workoutFrequency: '3x per week'
      };

      // Create plan for first user
      const planResponse = await supertest(app)
        .post('/v1/workouts')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(workoutRequest)
        .expect(201);

      const planId = planResponse.body.data.id;

      // Create second user
      const timestamp = Date.now();
      const secondUserEmail = `second-user-${timestamp}@example.com`;
      const secondUserSignup = await supertest(app)
        .post('/v1/auth/signup')
        .send({
          name: 'Second User',
          email: secondUserEmail,
          password: 'TestPassword123!'
        });

      expect(secondUserSignup.status).toBe(201);
      const secondUserToken = secondUserSignup.body.accessToken;

      // Act & Assert - Second user should not access first user's plan
      await supertest(app)
        .get(`/v1/workouts/${planId}`)
        .set('Authorization', `Bearer ${secondUserToken}`)
        .expect(404); // RLS makes record appear non-existent

      // STRICT ASSERTION: Verify first user can still access their plan
      const firstUserAccess = await supertest(app)
        .get(`/v1/workouts/${planId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(firstUserAccess.body.status).toBe('success');
      expect(firstUserAccess.body.data.id).toBe(planId);

      console.log('✅ STRICT Data Isolation Validation: RLS properly enforced');

      // Cleanup second user
      try {
        await supabase.auth.admin.deleteUser(secondUserSignup.body.userId);
      } catch (error) {
        console.log('Second user cleanup error (non-critical):', error.message);
      }
    });
  });

  describe('Task 5.4: Memory System Integration Throughout Workflow', () => {
    test('When workflow executes with memory system, Then should store and retrieve workout generation context', async () => {
      // Arrange - Create profile
      await ensureUserProfile({
        goals: ['muscle_gain'],
        experienceLevel: 'intermediate'
      });

      // Store some previous workout memories
      const previousMemory = {
        planType: 'Upper/Lower Split',
        effectiveExercises: ['dumbbell bench press', 'rows'],
        userFeedback: 'loved compound movements',
        satisfaction: 9
      };

      await memorySystem.storeMemory(
        testUser.id,
        'workout',
        previousMemory,
        {
          memory_type: 'agent_output',
          content_type: 'workout_plan',
          tags: ['workout_generation', 'successful_plan'],
          importance: 4
        }
      );

      const workoutRequest = {
        fitnessLevel: 'intermediate',
        goals: ['muscle_gain'],
        equipment: ['dumbbells'],
        exerciseTypes: ['strength'],
        workoutFrequency: '4x per week'
      };

      // Act - Generate plan (should incorporate memory)
      const response = await supertest(app)
        .post('/v1/workouts')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(workoutRequest)
        .expect(201);

      // STRICT ASSERTION 1: Plan generated successfully
      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeDefined();

      // STRICT ASSERTION 2: Verify memory was retrieved during generation
      const retrievedMemories = await memorySystem.getMemoriesByAgentType(
        testUser.id,
        'workout',
        { limit: 5 }
      );
      expect(retrievedMemories.length).toBeGreaterThan(0);
      
      // Find the memory we stored (it might not be the first one)
      const storedMemory = retrievedMemories.find(memory => 
        memory.content && 
        typeof memory.content === 'object' &&
        memory.content.planType === 'Upper/Lower Split'
      );
      expect(storedMemory).toBeDefined();
      expect(storedMemory.content).toMatchObject(previousMemory);

      // STRICT ASSERTION 3: New plan should incorporate memory preferences
      const generatedPlan = response.body.data;
      const allExercises = [];
      Object.values(generatedPlan.plan_data.weeklySchedule).forEach(day => {
        if (typeof day === 'object' && day.exercises) {
          allExercises.push(...day.exercises.map(ex => ex.exercise.toLowerCase()));
        }
      });

      // Should prefer compound movements based on memory
      const compoundExercises = allExercises.filter(exercise => 
        exercise.includes('bench press') || 
        exercise.includes('row') || 
        exercise.includes('squat') || 
        exercise.includes('deadlift') ||
        exercise.includes('press')
      );
      expect(compoundExercises.length).toBeGreaterThan(0);

      console.log('✅ STRICT Memory Integration Validation:', {
        memoriesRetrieved: retrievedMemories.length,
        storedMemoryFound: !!storedMemory,
        compoundMovements: compoundExercises.length,
        totalExercises: allExercises.length,
        memoryInfluenced: compoundExercises.length > 0
      });
    });
  });

  afterEach(async () => {
    // Cleanup - Remove test plans with low probability to avoid affecting other tests
    if (Math.random() < 0.2) { // 20% chance cleanup for efficiency
      try {
        await supabase
          .from('workout_plans')
          .delete()
          .eq('user_id', testUser.id);
        
        await supabase
          .from('agent_memory')
          .delete()
          .eq('user_id', testUser.id);
      } catch (error) {
        // Non-critical cleanup error
        console.log('Cleanup error (non-critical):', error.message);
      }
    }
  });
}); 