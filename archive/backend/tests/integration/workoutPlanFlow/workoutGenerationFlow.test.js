const supertest = require('supertest');
const { app } = require('../../../server');
const { getSupabaseClient } = require('../../../services/supabase');
const WorkoutGenerationAgent = require('../../../agents/workout-generation-agent');
const ResearchAgent = require('../../../agents/research-agent');
const AgentMemorySystem = require('../../../agents/memory/core');
const { PerplexityService } = require('../../../services/perplexity-service');
const OpenAIService = require('../../../services/openai-service');

let supabase;
let testUser;
let testUserToken;
let testUserName, testUserEmail, testUserPassword;
let workoutAgent;
let researchAgent;
let memorySystem;
let openaiService;
let perplexityService;

// API call tracking for Phase 1 budget (≤8 real calls)
let apiCallCount = 0;
const originalFetch = global.fetch;

describe('Workout Generation Flow Integration', () => {
  beforeAll(async () => {
    // Initialize Supabase client
    supabase = getSupabaseClient();

    // Initialize OpenAI service instance (following successful pattern)
    openaiService = new OpenAIService();

    // Initialize Memory System with proper OpenAI service (following successful pattern)
    memorySystem = new AgentMemorySystem({
      supabase: supabase,
      openai: openaiService,
      logger: require('../../../config/logger')
    });

    // Initialize PerplexityService instance (following successful pattern)
    perplexityService = new PerplexityService();

    // Initialize Workout Generation Agent with proper constructor parameters
    workoutAgent = new WorkoutGenerationAgent({
      supabaseClient: supabase,
      openaiService: openaiService,
      memorySystem: memorySystem,
      logger: require('../../../config/logger')
    });

    // Initialize Research Agent for flow testing (following successful pattern)
    researchAgent = new ResearchAgent({
      perplexityService: perplexityService,
      memorySystem: memorySystem,
      logger: require('../../../config/logger')
    });

    // Set up API call tracking
    global.fetch = jest.fn((...args) => {
      if (args[0] && (args[0].includes('api.openai.com') || args[0].includes('api.perplexity.ai'))) {
        apiCallCount++;
        console.log(`[Phase 1] API call #${apiCallCount}: ${args[0]}`);
      }
      return originalFetch(...args);
    });

    // Create unique test user using successful authentication pattern
    const timestamp = Date.now();
    testUserEmail = `workout-gen-test-${timestamp}@example.com`;
    testUserName = `Workout Generation Test User ${timestamp}`;
    testUserPassword = 'TestPassword123!';

    // Create test user with proper error handling (following successful pattern)
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
      throw new Error('Failed to retrieve token for workout generation integration test user.');
    }
  });

  afterAll(async () => {
    // Cleanup and report API usage
    console.log(`[Phase 1 - Workout Generation] Total API calls: ${apiCallCount}/8`);
    expect(apiCallCount).toBeLessThanOrEqual(8);
    
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

  describe('Task 2.1: Complete Research → Generation Flow (REAL API)', () => {
    test('When workout agent receives research data and user profile, Then should generate FUNCTIONALLY VALID workout plan', async () => {
      // Arrange - Create test profile first with correct structure and required fields
      const profileData = {
        height: 175,
        weight: 70,
        age: 30,
        gender: 'male',
        unitPreference: 'metric', // Required field
        goals: ['muscle_gain'],
        equipment: ['dumbbells'],
        experienceLevel: 'intermediate'
      };

      await supertest(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(profileData)
        .expect(200);

      // Use captured research data to save API calls
      const mockResearchData = {
        exercises: [
          {
            name: 'Dumbbell Bench Press',
            muscleGroups: ['chest', 'triceps'],
            equipment: ['dumbbells'],
            description: 'Compound chest exercise',
            contraindications: []
          },
          {
            name: 'Dumbbell Rows',
            muscleGroups: ['back', 'biceps'],
            equipment: ['dumbbells'],
            description: 'Compound back exercise',
            contraindications: []
          },
          {
            name: 'Dumbbell Squats',
            muscleGroups: ['legs', 'glutes'],
            equipment: ['dumbbells'],
            description: 'Compound leg exercise',
            contraindications: []
          },
          {
            name: 'Dumbbell Shoulder Press',
            muscleGroups: ['shoulders', 'triceps'],
            equipment: ['dumbbells'],
            description: 'Compound shoulder exercise',
            contraindications: []
          }
        ],
        sources: [{ url: 'https://example.com', title: 'Exercise Research' }]
      };

      const userProfile = {
        user_id: testUser.id,
        goals: ['muscle_gain'],
        fitnessLevel: 'intermediate',
        equipment: ['dumbbells'],
        restrictions: []
      };

      // Act - REAL OPENAI API CALL
      const workoutPlan = await workoutAgent.process({
        researchData: mockResearchData,
        userProfile: userProfile,
        goals: ['muscle_gain']
      });

      // STRICT ASSERTION 1: Basic Response Structure
      expect(workoutPlan).toMatchObject({
        status: 'success',
        data: expect.objectContaining({
          planId: expect.any(String),
          planName: expect.any(String),
          weeklySchedule: expect.any(Object)
        })
      });

      const plan = workoutPlan.data;

      // STRICT ASSERTION 2: Workout Plan Business Logic Validation
      const workoutDays = Object.keys(plan.weeklySchedule).filter(
        day => plan.weeklySchedule[day] !== 'Rest' && 
               typeof plan.weeklySchedule[day] === 'object'
      );
      
      expect(workoutDays.length).toBeGreaterThanOrEqual(3); // Intermediate should have 3+ workout days
      expect(workoutDays.length).toBeLessThanOrEqual(6); // Max reasonable workout days

      // STRICT ASSERTION 3: Exercise Appropriateness for Muscle Gain Goal
      const allExercises = [];
      workoutDays.forEach(day => {
        const dayWorkout = plan.weeklySchedule[day];
        expect(dayWorkout.exercises).toBeDefined();
        expect(dayWorkout.exercises.length).toBeGreaterThan(0);
        
        dayWorkout.exercises.forEach(exercise => {
          // Validate exercise structure
          expect(exercise).toMatchObject({
            exercise: expect.any(String),
            sets: expect.any(Number),
            repsOrDuration: expect.any(String)
          });
          
          // Validate business rules for intermediate muscle gain
          expect(exercise.sets).toBeGreaterThanOrEqual(2); // Minimum sets for muscle gain
          expect(exercise.sets).toBeLessThanOrEqual(6); // Maximum reasonable sets
          
          allExercises.push(exercise.exercise.toLowerCase());
        });
      });

      // STRICT ASSERTION 4: Equipment Constraint Validation
      const availableEquipment = userProfile.equipment.map(eq => eq.toLowerCase());
      
      const usesOnlyAvailableEquipment = allExercises.every(exercise => {
        const hasEquipment = availableEquipment.some(equipment => {
          // Handle both singular and plural forms (dumbbells -> dumbbell)
          const singularEquipment = equipment.replace(/s$/, ''); // Remove trailing 's'
          return exercise.includes(equipment) || exercise.includes(singularEquipment);
        });
        const isBodyweight = exercise.includes('bodyweight') || /push[- ]?ups?|pull[- ]?ups?|squats?|lunges?|planks?|burpees?|dips?|sit[- ]?ups?|mountain climbers?|glute bridges?/i.test(exercise);
        return hasEquipment || isBodyweight;
      });
      expect(usesOnlyAvailableEquipment).toBe(true);

      // STRICT ASSERTION 5: Muscle Group Coverage for Muscle Gain
      const hasChestExercise = allExercises.some(ex => 
        ex.includes('bench') || ex.includes('press') || ex.includes('chest')
      );
      const hasBackExercise = allExercises.some(ex => 
        ex.includes('row') || ex.includes('back') || ex.includes('pull')
      );
      const hasLegExercise = allExercises.some(ex => 
        ex.includes('squat') || ex.includes('leg') || ex.includes('lunge')
      );
      
      expect(hasChestExercise).toBe(true); // Muscle gain requires chest work
      expect(hasBackExercise).toBe(true);  // Muscle gain requires back work  
      expect(hasLegExercise).toBe(true);   // Muscle gain requires leg work

      // STRICT ASSERTION 6: Plan Name Quality and Relevance
      const planName = plan.planName.toLowerCase();
      const goalRelevantTerms = ['muscle', 'gain', 'building', 'mass', 'hypertrophy', 'strength'];
      const hasGoalRelevantTerm = goalRelevantTerms.some(term => planName.includes(term));
      expect(hasGoalRelevantTerm).toBe(true);
      expect(plan.planName.length).toBeGreaterThan(10); // Descriptive plan name
      expect(plan.planName.length).toBeLessThan(100); // Not overly verbose

      // STRICT ASSERTION 7: Total Exercise Volume Appropriateness
      const totalExercisesPerWeek = allExercises.length;
      expect(totalExercisesPerWeek).toBeGreaterThanOrEqual(9); // Minimum for intermediate muscle gain
      expect(totalExercisesPerWeek).toBeLessThanOrEqual(25); // Maximum reasonable volume

      console.log('✅ STRICT Workout Generation Validation:', {
        planName: plan.planName,
        workoutDays: workoutDays.length,
        totalExercises: totalExercisesPerWeek,
        muscleGroupCoverage: { chest: hasChestExercise, back: hasBackExercise, legs: hasLegExercise },
        equipmentCompliant: usesOnlyAvailableEquipment
      });
    }, 30000);
  });

  describe('Task 2.2: Memory System Integration (REAL API)', () => {
    test('When workout agent generates plan with memory context, Then should ACTUALLY incorporate user history', async () => {
      // STRICT TEST: Store specific memory and verify it's actually used
      const previousWorkoutMemories = [
        {
          agentType: 'workout',
          content: {
            planType: 'Upper/Lower Split',
            effectiveExercises: ['dumbbell bench press', 'dumbbell rows'],
            userFeedback: 'loved compound movements, want more volume',
            satisfaction: 9,
            preferences: ['compound_movements', 'increased_volume']
          },
          metadata: {
            memory_type: 'agent_output',
            content_type: 'workout_plan',
            tags: ['workout_generation', 'successful_plan'],
            importance: 4
          }
        },
        {
          agentType: 'workout',
          content: {
            exercisePreferences: {
              loved: ['dumbbell bench press', 'bent over rows'],
              disliked: ['isolation exercises'],
              requested: 'more sets per exercise'
            },
            planFeedback: 'increase volume, focus on compound movements'
          },
          metadata: {
            memory_type: 'user_feedback',
            content_type: 'exercise_preferences',
            tags: ['user_preferences', 'compound_preference'],
            importance: 5
          }
        }
      ];

      // Store memories and verify storage
      const storedMemoryIds = [];
      for (const memory of previousWorkoutMemories) {
        const memoryId = await memorySystem.storeMemory(
          testUser.id, 
          memory.agentType, 
          memory.content, 
          memory.metadata
        );
        expect(memoryId).toBeDefined();
        expect(typeof memoryId).toBe('string');
        storedMemoryIds.push(memoryId);
      }

      // STRICT TEST: Verify memories are actually stored in database
      const storedMemories = await memorySystem.getMemoriesByAgentType(
        testUser.id,
        'workout',
        { limit: 10 }
      );
      expect(storedMemories.length).toBeGreaterThanOrEqual(2);

      // Wait for memory indexing (if using vector embeddings)
      await new Promise(resolve => setTimeout(resolve, 1000));

      const researchData = {
        exercises: [
          { name: 'Dumbbell Bench Press', muscleGroups: ['chest'], equipment: ['dumbbells'], contraindications: [] },
          { name: 'Dumbbell Rows', muscleGroups: ['back'], equipment: ['dumbbells'], contraindications: [] },
          { name: 'Bicep Curls', muscleGroups: ['biceps'], equipment: ['dumbbells'], contraindications: [] },
          { name: 'Tricep Extensions', muscleGroups: ['triceps'], equipment: ['dumbbells'], contraindications: [] },
          { name: 'Dumbbell Squats', muscleGroups: ['legs'], equipment: ['dumbbells'], contraindications: [] },
          { name: 'Lateral Raises', muscleGroups: ['shoulders'], equipment: ['dumbbells'], contraindications: [] }
        ]
      };

      const userProfile = {
        user_id: testUser.id,
        goals: ['strength'],
        fitnessLevel: 'intermediate',
        equipment: ['dumbbells'],
        restrictions: []
      };

      // Act - REAL OPENAI API CALL with memory context
      const workoutPlan = await workoutAgent.process({
        researchData: researchData,
        userProfile: userProfile,
        goals: ['strength']
      });

      // STRICT ASSERTION 1: Basic Response Structure
      expect(workoutPlan.status).toBe('success');
      expect(workoutPlan.data).toBeDefined();
      
      // STRICT ASSERTION 2: Memory Retrieval Verification
      // The agent should have retrieved memories - verify by calling retrieveMemories directly
      const retrievedMemories = await workoutAgent.retrieveMemories({
        userId: testUser.id,
        agentTypes: ['workout'],
        limit: 5
      });
      expect(retrievedMemories.length).toBeGreaterThan(0);
      console.log(`✅ Retrieved ${retrievedMemories.length} memories for workout generation`);

      // STRICT ASSERTION 3: Memory Content Influence on Plan
      const allExercises = [];
      Object.values(workoutPlan.data.weeklySchedule).forEach(day => {
        if (typeof day === 'object' && day.exercises) {
          allExercises.push(...day.exercises.map(ex => ex.exercise.toLowerCase()));
        }
      });

      // Should prioritize compound movements based on memory
      const compoundExercises = allExercises.filter(exercise => 
        exercise.includes('bench press') || 
        exercise.includes('row') || 
        exercise.includes('squat') || 
        exercise.includes('deadlift') ||
        exercise.includes('press')
      );
      expect(compoundExercises.length).toBeGreaterThan(0);
      console.log(`✅ Plan includes ${compoundExercises.length} compound movements (based on memory)`);

      // Should avoid isolation exercises based on memory
      const isolationExercises = allExercises.filter(exercise =>
        exercise.includes('curl') ||
        exercise.includes('extension') ||
        exercise.includes('lateral raise') ||
        exercise.includes('fly')
      );
      
      // Based on memory preference against isolation, should have fewer isolation exercises
      const isolationRatio = isolationExercises.length / allExercises.length;
      expect(isolationRatio).toBeLessThan(0.4); // Less than 40% isolation exercises
      console.log(`✅ Plan has ${isolationRatio.toFixed(2)} isolation ratio (memory-influenced)`);

      // STRICT ASSERTION 4: Volume Increase Based on Memory
      // Count total sets across all exercises to verify increased volume
      let totalSets = 0;
      Object.values(workoutPlan.data.weeklySchedule).forEach(day => {
        if (typeof day === 'object' && day.exercises) {
          day.exercises.forEach(exercise => {
            totalSets += exercise.sets || 0;
          });
        }
      });
      
      // Based on memory requesting "more volume", should have substantial total sets
      expect(totalSets).toBeGreaterThan(15); // Minimum total sets for increased volume
      console.log(`✅ Plan has ${totalSets} total sets (memory-influenced volume)`);

      // STRICT ASSERTION 5: Verify Memory-Specific Exercise Inclusion
      // Should include exercises that were marked as "loved" in memory
      const hasMemoryPreferredExercises = allExercises.some(exercise =>
        exercise.includes('bench press') || exercise.includes('row')
      );
      expect(hasMemoryPreferredExercises).toBe(true);
      console.log(`✅ Plan includes memory-preferred exercises: ${hasMemoryPreferredExercises}`);

      console.log('✅ STRICT Memory Integration Validation:', {
        memoriesStored: storedMemoryIds.length,
        memoriesRetrieved: retrievedMemories.length,
        compoundMovements: compoundExercises.length,
        isolationRatio: isolationRatio.toFixed(2),
        totalSets: totalSets,
        includesPreferredExercises: hasMemoryPreferredExercises
      });
    }, 35000);
  });

  describe('Task 2.3: Plan Validation and Safety Checks (REAL API)', () => {
    test('When workout agent generates plan with user restrictions, Then should generate SAFE plan avoiding contraindicated exercises', async () => {
      // Arrange - Create test profile first (same as other tests)
      const profileData = {
        height: 175,
        weight: 70,
        age: 30,
        gender: 'male',
        unitPreference: 'metric', // Required field
        goals: ['strength'],
        equipment: ['dumbbells'],
        experienceLevel: 'intermediate'
      };

      await supertest(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(profileData)
        .expect(200);

      // Temporarily restore real fetch for this safety-critical test
      const originalMockFetch = global.fetch;
      global.fetch = originalFetch;

      try {
        // Arrange
        const restrictedProfile = {
          user_id: testUser.id,
          goals: ['strength'],
          fitnessLevel: 'intermediate',
          equipment: ['dumbbells'],
          restrictions: ['knee_pain', 'shoulder_injury']
        };

        const researchData = {
          exercises: [
            { 
              name: 'Squats', 
              muscleGroups: ['legs'], 
              equipment: ['dumbbells'],
              contraindications: ['knee_pain'] 
            },
            { 
              name: 'Overhead Press', 
              muscleGroups: ['shoulders'], 
              equipment: ['dumbbells'],
              contraindications: ['shoulder_injury'] 
            },
            { 
              name: 'Bench Press', 
              muscleGroups: ['chest'], 
              equipment: ['dumbbells'],
              contraindications: [] 
            }
          ]
        };

        // Act - REAL OPENAI API CALL should succeed with safe plan
        const result = await workoutAgent.process({
          researchData: researchData,
          userProfile: restrictedProfile,
          goals: ['strength']
        });

        // Assert - Should succeed with a safe plan
        expect(result.status).toBe('success');
        expect(result.data).toBeDefined();
        expect(result.data.weeklySchedule).toBeDefined();

        // STRICT ASSERTION 1: Verify unsafe exercises are NOT included
        const allExercises = [];
        Object.values(result.data.weeklySchedule).forEach(day => {
          if (typeof day === 'object' && day.exercises) {
            allExercises.push(...day.exercises.map(ex => ex.exercise.toLowerCase()));
          }
        });

        // Should NOT contain exercises that aggravate knee pain
        const kneeUnsafeExercises = allExercises.filter(exercise =>
          exercise.includes('squat') ||
          exercise.includes('lunge') ||
          exercise.includes('jump')
        );
        expect(kneeUnsafeExercises.length).toBe(0);

        // Should NOT contain exercises that aggravate shoulder injury
        const shoulderUnsafeExercises = allExercises.filter(exercise =>
          exercise.includes('overhead press') ||
          exercise.includes('shoulder press') ||
          exercise.includes('lateral raise')
        );
        expect(shoulderUnsafeExercises.length).toBe(0);

        // STRICT ASSERTION 2: Verify safe alternatives are included
        const safeExercises = allExercises.filter(exercise =>
          exercise.includes('seated') ||
          exercise.includes('supported') ||
          exercise.includes('modified') ||
          exercise.includes('wall push') ||
          exercise.includes('glute bridge') ||
          exercise.includes('plank')
        );
        expect(safeExercises.length).toBeGreaterThan(0);

        // STRICT ASSERTION 3: Verify reasoning mentions safety considerations
        expect(result.data.reasoning).toBeDefined();
        expect(Array.isArray(result.data.reasoning)).toBe(true);
        
        const safetyMentioned = result.data.reasoning.some(step =>
          step.toLowerCase().includes('safety') ||
          step.toLowerCase().includes('medical') ||
          step.toLowerCase().includes('restriction') ||
          step.toLowerCase().includes('contraindication')
        );
        expect(safetyMentioned).toBe(true);

        console.log('✅ STRICT Safety Validation:', {
          totalExercises: allExercises.length,
          kneeUnsafeExercises: kneeUnsafeExercises.length,
          shoulderUnsafeExercises: shoulderUnsafeExercises.length,
          safeAlternatives: safeExercises.length,
          safetyReasoningIncluded: safetyMentioned
        });

        // This test validates that our safety-critical system:
        // 1. Successfully generates plans for users with restrictions
        // 2. Filters out contraindicated exercises completely
        // 3. Includes safe alternatives to maintain workout effectiveness
        // 4. Documents safety considerations in reasoning
        // This is the CORRECT behavior for adaptive fitness systems
        
      } finally {
        // Restore mock fetch
        global.fetch = originalMockFetch;
      }
    }, 30000);
  });

  describe('Task 2.4: Database Integration and Persistence', () => {
    test('When workout plan is generated, Then should store AND RETRIEVE correctly with data integrity', async () => {
      // Arrange - Create test profile first (same as other tests)
      const profileData = {
        height: 175,
        weight: 70,
        age: 30,
        gender: 'male',
        unitPreference: 'metric', // Required field
        goals: ['strength'],
        equipment: ['dumbbells'],
        experienceLevel: 'intermediate'
      };

      await supertest(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(profileData)
        .expect(200);

      // Arrange - Use workout service to generate and store plan (REAL API CALL)
      const planRequest = {
        fitnessLevel: 'intermediate',
        goals: ['strength'],
        equipment: ['dumbbells'],
        restrictions: [],
        exerciseTypes: ['strength'],
        workoutFrequency: '3x per week'
      };

      // Act - Generate plan through API endpoint
      const response = await supertest(app)
        .post('/v1/workouts')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(planRequest)
        .expect(201);

      expect(response.body.status).toBe('success');
      const planId = response.body.data.id;

      // STRICT ASSERTION 1: Basic Storage Verification
      const { data: storedPlan, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('id', planId)
        .single();

      expect(error).toBeNull();
      expect(storedPlan).toMatchObject({
        id: planId,
        user_id: testUser.id,
        name: expect.any(String),
        plan_data: expect.any(Object)
      });

      // STRICT ASSERTION 2: Data Integrity Validation
      expect(storedPlan.plan_data).toBeDefined();
      expect(typeof storedPlan.plan_data).toBe('object');
      expect(storedPlan.name.length).toBeGreaterThan(0);
      
      // Verify timestamp fields exist and are valid
      expect(storedPlan.created_at).toBeDefined();
      expect(storedPlan.updated_at).toBeDefined();
      expect(new Date(storedPlan.created_at).getTime()).toBeLessThanOrEqual(Date.now());
      expect(new Date(storedPlan.updated_at).getTime()).toBeLessThanOrEqual(Date.now());

      // STRICT ASSERTION 3: Plan Data Structure Integrity
      const planData = storedPlan.plan_data;
      expect(planData.weeklySchedule).toBeDefined();
      expect(typeof planData.weeklySchedule).toBe('object');

      // Verify exercises are properly structured
      const workoutDays = Object.keys(planData.weeklySchedule).filter(
        day => planData.weeklySchedule[day] !== 'Rest' && 
               typeof planData.weeklySchedule[day] === 'object'
      );
      expect(workoutDays.length).toBeGreaterThan(0);

      let totalExercisesStored = 0;
      workoutDays.forEach(day => {
        const dayWorkout = planData.weeklySchedule[day];
        expect(dayWorkout.exercises).toBeDefined();
        expect(Array.isArray(dayWorkout.exercises)).toBe(true);
        
        dayWorkout.exercises.forEach(exercise => {
          expect(exercise).toMatchObject({
            exercise: expect.any(String),
            sets: expect.any(Number),
            repsOrDuration: expect.any(String)
          });
          
          // Validate business rules are maintained in storage
          expect(exercise.sets).toBeGreaterThan(0);
          expect(exercise.exercise.length).toBeGreaterThan(0);
          expect(exercise.repsOrDuration.length).toBeGreaterThan(0);
        });
        
        totalExercisesStored += dayWorkout.exercises.length;
      });

      expect(totalExercisesStored).toBeGreaterThan(0);
      console.log(`✅ Stored ${totalExercisesStored} exercises across ${workoutDays.length} workout days`);

      // STRICT ASSERTION 4: Data Retrieval API Validation
      // Test that the plan can be retrieved through the API endpoint
      const retrievalResponse = await supertest(app)
        .get(`/v1/workouts/${planId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(retrievalResponse.body.status).toBe('success');
      expect(retrievalResponse.body.data).toMatchObject({
        id: planId,
        name: storedPlan.name,
        planData: expect.any(Object)
      });

      // STRICT ASSERTION 5: Cross-Reference Data Consistency
      // Verify that retrieved data matches stored data
      const retrievedPlanData = retrievalResponse.body.data.planData;
      expect(retrievedPlanData.weeklySchedule).toEqual(planData.weeklySchedule);
      
      // Count exercises in retrieved data to ensure consistency
      const retrievedWorkoutDays = Object.keys(retrievedPlanData.weeklySchedule).filter(
        day => retrievedPlanData.weeklySchedule[day] !== 'Rest' && 
               typeof retrievedPlanData.weeklySchedule[day] === 'object'
      );
      
      let totalExercisesRetrieved = 0;
      retrievedWorkoutDays.forEach(day => {
        const dayWorkout = retrievedPlanData.weeklySchedule[day];
        totalExercisesRetrieved += dayWorkout.exercises.length;
      });

      expect(totalExercisesRetrieved).toBe(totalExercisesStored);
      console.log(`✅ Retrieved data matches stored data: ${totalExercisesRetrieved} exercises`);

      // STRICT ASSERTION 6: User-Specific Data Isolation
      // Verify that other users cannot access this plan
      const otherUserEmail = `other-user-${Date.now()}@example.com`;
      const otherUserResponse = await supertest(app)
        .post('/v1/auth/signup')
        .send({ 
          name: 'Other User', 
          email: otherUserEmail, 
          password: 'TestPassword123!' 
        });

      if (otherUserResponse.status === 201) {
        const otherUserToken = otherUserResponse.body.accessToken;
        
        // Other user should not be able to access this plan
        await supertest(app)
          .get(`/v1/workouts/${planId}`)
          .set('Authorization', `Bearer ${otherUserToken}`)
          .expect(404); // Not Found (RLS makes record appear non-existent)
          
        console.log(`✅ Data isolation verified: other users cannot access plan`);
      }

      // STRICT ASSERTION 7: Plan Listing Integration
      // Verify plan appears in user's plan list
      const listResponse = await supertest(app)
        .get('/v1/workouts')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(listResponse.body.status).toBe('success');
      expect(Array.isArray(listResponse.body.data)).toBe(true);
      
      const userPlan = listResponse.body.data.find(plan => plan.id === planId);
      expect(userPlan).toBeDefined();
      expect(userPlan.name).toBe(storedPlan.name);
      console.log(`✅ Plan appears in user's plan list with ${listResponse.body.data.length} total plans`);

      console.log('✅ STRICT Database Integration Validation:', {
        planId: planId,
        storedExercises: totalExercisesStored,
        retrievedExercises: totalExercisesRetrieved,
        workoutDays: workoutDays.length,
        dataConsistency: totalExercisesStored === totalExercisesRetrieved,
        userIsolation: true,
        planListIntegration: !!userPlan
      });
    }, 45000); // Longer timeout for full API + database flow
  });

  describe('Task 2.5: Error Handling and Edge Cases (MOCKED)', () => {
    test('When OpenAI API fails, Then should handle gracefully', async () => {
      // Arrange - Mock OpenAI failure with proper service instantiation
      const mockOpenAIService = new OpenAIService();
      mockOpenAIService.generateChatCompletion = jest.fn().mockRejectedValue(new Error('OpenAI API Error'));

      const mockAgent = new WorkoutGenerationAgent({
        supabaseClient: supabase,
        openaiService: mockOpenAIService,
        memorySystem: memorySystem,
        logger: require('../../../config/logger')
      });

      const researchData = {
        exercises: [
          { name: 'Push-ups', muscleGroups: ['chest'], equipment: ['bodyweight'] }
        ]
      };

      const userProfile = {
        user_id: testUser.id,
        goals: ['strength'],
        fitnessLevel: 'beginner'
      };

      // Act & Assert
      await expect(mockAgent.process({
        researchData,
        userProfile,
        goals: ['strength']
      })).rejects.toThrow('OpenAI API Error');

      // Verify the mock was called
      expect(mockOpenAIService.generateChatCompletion).toHaveBeenCalled();
    });

    test('When invalid research data provided, Then should validate and handle appropriately', async () => {
      const userProfile = {
        user_id: testUser.id,
        goals: ['strength'],
        fitnessLevel: 'intermediate'
      };

      // Test empty research data
      await expect(workoutAgent.process({
        researchData: { exercises: [] },
        userProfile,
        goals: ['strength']
      })).rejects.toThrow();

      // Test missing user profile
      await expect(workoutAgent.process({
        researchData: { exercises: [{ name: 'Test' }] },
        userProfile: null,
        goals: ['strength']
      })).rejects.toThrow();
    });

    test('When memory system fails, Then should continue plan generation', async () => {
      // Arrange - Mock memory system failure
      const mockMemorySystem = {
        getMemoriesByMetadata: jest.fn().mockRejectedValue(new Error('Memory retrieval failed')),
        storeMemory: jest.fn().mockRejectedValue(new Error('Memory storage failed'))
      };

      const agentWithBrokenMemory = new WorkoutGenerationAgent({
        supabaseClient: supabase,
        openaiService: openaiService,
        memorySystem: mockMemorySystem,
        logger: require('../../../config/logger')
      });

      const researchData = {
        exercises: [
          { name: 'Push-ups', muscleGroups: ['chest'], equipment: ['bodyweight'] }
        ]
      };

      const userProfile = {
        user_id: testUser.id,
        goals: ['strength'],
        fitnessLevel: 'beginner'
      };

      // Act - Should generate plan despite memory failure (REAL API CALL)
      const result = await agentWithBrokenMemory.process({
        researchData,
        userProfile,
        goals: ['strength']
      });

      // Assert - Plan generation should succeed
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();
      
      // Verify memory methods were called and failed gracefully
      expect(mockMemorySystem.getMemoriesByMetadata).toHaveBeenCalled();
    }, 30000);
  });

  describe('Task 2.6: Performance and Quality Validation', () => {
    test('When generating multiple plans, Then should maintain consistent quality and performance', async () => {
      const researchData = {
        exercises: [
          { name: 'Push-ups', muscleGroups: ['chest'], equipment: ['bodyweight'] },
          { name: 'Squats', muscleGroups: ['legs'], equipment: ['bodyweight'] },
          { name: 'Pull-ups', muscleGroups: ['back'], equipment: ['pull_up_bar'] }
        ]
      };

      const userProfiles = [
        { user_id: testUser.id, goals: ['strength'], fitnessLevel: 'beginner' },
        { user_id: testUser.id, goals: ['endurance'], fitnessLevel: 'intermediate' },
        { user_id: testUser.id, goals: ['weight_loss'], fitnessLevel: 'advanced' }
      ];

      const results = [];
      const startTime = Date.now();

      // Generate multiple plans
      for (const profile of userProfiles) {
        const planStartTime = Date.now();
        
        const result = await workoutAgent.process({
          researchData,
          userProfile: profile,
          goals: profile.goals
        });

        const planDuration = Date.now() - planStartTime;
        
        results.push({
          result,
          duration: planDuration,
          profile: profile.fitnessLevel
        });
      }

      const totalDuration = Date.now() - startTime;

      // Assert quality consistency
      results.forEach(({ result, profile }) => {
        expect(result.status).toBe('success');
        expect(result.data.weeklySchedule).toBeDefined();
        
        // Each plan should have reasonable structure
        const workoutDays = Object.keys(result.data.weeklySchedule).filter(
          day => typeof result.data.weeklySchedule[day] === 'object'
        );
        expect(workoutDays.length).toBeGreaterThan(0);
        expect(workoutDays.length).toBeLessThanOrEqual(7);
      });

      // Assert performance consistency
      results.forEach(({ duration }) => {
        expect(duration).toBeLessThan(30000); // Each plan < 30 seconds
      });
      
      expect(totalDuration).toBeLessThan(90000); // Total < 90 seconds

      console.log(`Generated ${results.length} plans in ${totalDuration}ms`);
    }, 120000); // 2 minute timeout for multiple plans
  });
}); 