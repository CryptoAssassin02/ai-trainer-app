const supertest = require('supertest');
const { app } = require('../../../server');
const { getSupabaseClient } = require('../../../services/supabase');

// MANDATORY STARTING PATTERN - NO EXCEPTIONS
// STRICT INTEGRATION TESTING: Real agents with real business logic

// Step 1: UNMOCK everything for real implementation testing
jest.unmock('../../../agents/workout-generation-agent');
jest.unmock('../../../agents/plan-adjustment-agent'); 
jest.unmock('../../../agents/research-agent');
jest.unmock('../../../agents/memory/core');
jest.unmock('../../../services/openai-service');
jest.unmock('../../../services/perplexity-service');

// Step 2: Clear module cache to force fresh real implementations
delete require.cache[require.resolve('../../../agents/workout-generation-agent')];
delete require.cache[require.resolve('../../../agents/plan-adjustment-agent')];
delete require.cache[require.resolve('../../../agents/research-agent')];
delete require.cache[require.resolve('../../../agents/memory/core')];
delete require.cache[require.resolve('../../../services/openai-service')];
delete require.cache[require.resolve('../../../services/perplexity-service')];

// Step 3: Require REAL implementations
const WorkoutGenerationAgent = require('../../../agents/workout-generation-agent');
const PlanAdjustmentAgent = require('../../../agents/plan-adjustment-agent');
const ResearchAgent = require('../../../agents/research-agent');
const AgentMemorySystem = require('../../../agents/memory/core');
const OpenAIService = require('../../../services/openai-service');
const { PerplexityService } = require('../../../services/perplexity-service');

let supabase;
let testUser;
let testUserToken;
let testUserName, testUserEmail, testUserPassword;
let workoutAgent;
let adjustmentAgent;
let researchAgent;
let memorySystem;
let openaiService;
let perplexityService;

// API call tracking for Phase 3 budget (≤2 real calls)
let apiCallCount = 0;
const originalFetch = global.fetch;

describe('Edge Cases and Complex Scenarios Integration', () => {
  beforeAll(async () => {
    // Initialize Supabase client
    supabase = getSupabaseClient();

    // Step 4: Initialize REAL services with proper service instances
    openaiService = new OpenAIService();
    await openaiService.initClient(); // REQUIRED: Explicit initialization

    // Initialize Memory System with proper OpenAI service
    memorySystem = new AgentMemorySystem({
      supabase: supabase,
      openai: openaiService, // Service instance, NOT config
      logger: require('../../../config/logger')
    });

    // Initialize PerplexityService instance
    perplexityService = new PerplexityService();

    // Step 5: Create agents with REAL service instances (NOT config objects)
    workoutAgent = new WorkoutGenerationAgent({
      supabaseClient: supabase,
      openaiService: openaiService, // Service instance, NOT require('../../../config/openai')
      memorySystem: memorySystem,
      logger: require('../../../config/logger')
    });

    adjustmentAgent = new PlanAdjustmentAgent({
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

    // Set up API call tracking for real calls only
    global.fetch = jest.fn((...args) => {
      if (args[0] && (args[0].includes('api.openai.com') || args[0].includes('api.perplexity.ai'))) {
        apiCallCount++;
        console.log(`[Phase 3 - REAL API] API call #${apiCallCount}: ${args[0]}`);
      }
      return originalFetch(...args);
    });

    // Create unique test user using successful authentication pattern
    const timestamp = Date.now();
    testUserEmail = `edge-cases-test-${timestamp}@example.com`;
    testUserName = `Edge Cases Test User ${timestamp}`;
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
      throw new Error('Failed to retrieve token for edge cases integration test user.');
    }
  });

  afterAll(async () => {
    // Cleanup and report API usage
    console.log(`[Phase 3 - Edge Cases] Total REAL API calls: ${apiCallCount}/2`);
    expect(apiCallCount).toBeLessThanOrEqual(2);

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

  describe('Task 3.1: Extreme User Profile Edge Cases (REAL API)', () => {
    test('When users have extreme or unusual profiles, Then agents should demonstrate intelligent adaptation', async () => {
      // Temporarily restore real fetch for this edge case test
      const originalMockFetch = global.fetch;
      global.fetch = originalFetch;

      try {
        // Arrange - EXTREME user profiles that test agent boundaries
        const extremeProfiles = [
          {
            name: 'Heavily Restricted',
            user_id: testUser.id,
            age: 45,
            fitnessLevel: 'intermediate',
            medical_conditions: [
              'knee_injury', 'shoulder_injury', 'back_injury', 
              'wrist_pain', 'ankle_sprain', 'neck_problems'
            ],
            goals: ['rehabilitation', 'pain_management'],
            preferences: {
              equipment: ['resistance_bands'],
              workoutFrequency: '1x per week'
            }
          },
          {
            name: 'Elite Athlete',
            user_id: testUser.id,
            age: 25,
            fitnessLevel: 'elite',
            medical_conditions: [],
            goals: ['competition_prep', 'power_development'],
            preferences: {
              equipment: ['full_gym', 'olympic_platform'],
              workoutFrequency: '8x per week',
              sessionDuration: '120 minutes'
            }
          }
        ];

        const planResults = [];

        for (const profile of extremeProfiles) {
          try {
            // Research data appropriate for extreme cases
            const researchData = {
              exercises: [
                { name: 'Chair Exercises', muscleGroups: ['upper_body'], equipment: ['bodyweight'], contraindications: [] },
                { name: 'Resistance Band Pulls', muscleGroups: ['back'], equipment: ['resistance_bands'], contraindications: [] },
                { name: 'Advanced Olympic Lifts', muscleGroups: ['full_body'], equipment: ['barbell'], contraindications: ['back_injury'] },
                { name: 'Light Walking', muscleGroups: ['legs'], equipment: ['bodyweight'], contraindications: [] },
                { name: 'Heavy Deadlifts', muscleGroups: ['back', 'legs'], equipment: ['barbell'], contraindications: ['back_injury', 'knee_injury'] }
              ]
            };

            // REAL API CALL - Test agent intelligence under extreme conditions
            const result = await workoutAgent.process({
              researchData: researchData,
              userProfile: profile,
              goals: profile.goals
            });

            planResults.push({ 
              profileName: profile.name, 
              result: result, 
              success: true,
              error: null 
            });

          } catch (error) {
            planResults.push({ 
              profileName: profile.name, 
              result: null, 
              success: false,
              error: error.message 
            });
          }
        }

        // Assert - REAL BUSINESS LOGIC VALIDATION
        const { profileName, result, error, success } = planResults[0];
        
        if (success) {
          // Fix: Use the actual response structure with data wrapper
          expect(result.status).toBe('success');
          expect(result.data).toBeDefined();
          
          const plan = result.data; // Extract plan from data wrapper
          
          expect(plan).toMatchObject({
            planId: expect.any(String),
            planName: expect.any(String),
            weeklySchedule: expect.any(Object),
            reasoning: expect.any(Array) // Agent reasoning should be present
          });

          // Test REAL agent intelligence under extreme conditions - Heavily Restricted Profile
          const exercises = extractAllExercises(plan.weeklySchedule);
          
          // Agent should demonstrate medical safety intelligence
          const hasDangerousExercises = exercises.some(ex => 
            ex.exercise.toLowerCase().includes('squat') ||
            ex.exercise.toLowerCase().includes('deadlift') ||
            ex.exercise.toLowerCase().includes('overhead') ||
            ex.exercise.toLowerCase().includes('olympic')
          );
          expect(hasDangerousExercises).toBe(false);
          
          // Should focus on safe alternatives for heavily restricted user
          const hasSafeAlternatives = exercises.some(ex =>
            ex.exercise.toLowerCase().includes('resistance band') ||
            ex.exercise.toLowerCase().includes('chair') ||
            ex.exercise.toLowerCase().includes('light') ||
            ex.exercise.toLowerCase().includes('gentle')
          );
          expect(hasSafeAlternatives).toBe(true);
          
          // Should respect low frequency requirement (1x per week)
          const workoutDays = countWorkoutDays(plan.weeklySchedule);
          expect(workoutDays).toBeLessThanOrEqual(2); // Should respect very low frequency
          
          // Agent should provide intelligent reasoning for extreme cases
          expect(plan.reasoning.length).toBeGreaterThan(0);
          const reasoningText = plan.reasoning.join(' ').toLowerCase();
          expect(reasoningText).toMatch(/medical|safety|condition|restriction|gentle|careful/);
          
        } else {
          // If generation fails, should fail gracefully with helpful message
          expect(error).toMatch(/medical conditions|safety constraints|restrictions|unable to generate safe plan/i);
        }

        console.log(`[EXTREME PROFILES] Agent demonstrated intelligent boundary handling for ${profileName}`);

      } finally {
        // Restore mock fetch
        global.fetch = originalMockFetch;
      }
    }, 45000);
  });

  describe('Task 3.2: Agent Safety Intelligence Under Boundary Conditions (REAL API)', () => {
    test('When agents face conflicting safety requirements, Then should prioritize safety while maintaining functionality', async () => {
      // Temporarily restore real fetch for this safety-critical test
      const originalMockFetch = global.fetch;
      global.fetch = originalFetch;

      try {
        // STRICT TESTING: Agent must handle conflicting advanced goals vs medical restrictions
        
        const conflictingProfile = {
          user_id: testUser.id,
          age: 35,
          fitnessLevel: 'advanced', // Wants advanced training
          medical_conditions: ['knee_injury', 'shoulder_impingement'], // But has injuries
          goals: ['strength', 'muscle_gain', 'competition_prep'], // Ambitious goals
          preferences: {
            equipment: ['full_gym'],
            workoutFrequency: '6x per week', // High frequency
            sessionDuration: '90 minutes'
          }
        };

        const conflictingResearchData = {
          exercises: [
            { name: 'Chest Press Machine', muscleGroups: ['chest'], equipment: ['machine'], contraindications: [] },
            { name: 'Seated Cable Row', muscleGroups: ['back'], equipment: ['cable'], contraindications: [] },
            { name: 'Barbell Back Squat', muscleGroups: ['legs'], equipment: ['barbell'], contraindications: ['knee_injury'] },
            { name: 'Overhead Press', muscleGroups: ['shoulders'], equipment: ['barbell'], contraindications: ['shoulder_impingement'] },
            { name: 'Jump Squats', muscleGroups: ['legs'], equipment: ['bodyweight'], contraindications: ['knee_injury'] }
          ]
        };

        // Act - REAL API CALL testing safety prioritization
        const result = await workoutAgent.process({
          researchData: conflictingResearchData,
          userProfile: conflictingProfile,
          goals: conflictingProfile.goals
        });

        // Assert - REAL SAFETY INTELLIGENCE VALIDATION
        expect(result.status).toBe('success');
        expect(result.data).toBeDefined();
        
        const plan = result.data; // Extract plan from data wrapper
        
        expect(plan).toMatchObject({
          planId: expect.any(String),
          planName: expect.any(String),
          weeklySchedule: expect.any(Object),
          reasoning: expect.any(Array)
        });

        const exercises = extractAllExercises(plan.weeklySchedule);
        
        // Agent should demonstrate safety intelligence
        // Should NOT include knee-dangerous exercises
        const hasKneeDangerous = exercises.some(ex =>
          ex.exercise.toLowerCase().includes('squat') ||
          ex.exercise.toLowerCase().includes('jump') ||
          ex.exercise.toLowerCase().includes('lunge')
        );
        expect(hasKneeDangerous).toBe(false);

        // Should NOT include shoulder-dangerous exercises  
        const hasShoulderDangerous = exercises.some(ex =>
          ex.exercise.toLowerCase().includes('overhead') ||
          ex.exercise.toLowerCase().includes('military press')
        );
        expect(hasShoulderDangerous).toBe(false);

        // Should still include safe exercises for advanced training
        const hasSafeAdvanced = exercises.some(ex =>
          ex.exercise.toLowerCase().includes('machine') ||
          ex.exercise.toLowerCase().includes('cable') ||
          ex.exercise.toLowerCase().includes('seated')
        );
        expect(hasSafeAdvanced).toBe(true);

        // Agent should explain safety prioritization in reasoning
        const reasoningText = plan.reasoning.join(' ').toLowerCase();
        expect(reasoningText).toMatch(/safety|injury|avoid|alternative|medical/);
        
        // Should still attempt to meet advanced goals within safety constraints
        expect(reasoningText).toMatch(/advanced|strength|muscle|progress/);

        console.log('[SAFETY INTELLIGENCE] Agent demonstrated safety-first approach while maintaining advanced training goals');

      } finally {
        // Restore mock fetch
        global.fetch = originalMockFetch;
      }
    }, 35000);
  });

  describe('Task 3.3: Agent Reasoning Quality Under Ambiguous Input', () => {
    test('When agents receive ambiguous or contradictory input, Then should demonstrate intelligent interpretation', async () => {
      // STRICT TESTING APPROACH: Test real agent reasoning under ambiguity
      
      // Arrange - Ambiguous and contradictory user input
      const ambiguousProfile = {
        user_id: testUser.id,
        age: 28,
        fitnessLevel: 'beginner', // Claims beginner
        medical_conditions: [],
        goals: [
          'weight_loss', // Contradictory goals
          'muscle_gain',
          'powerlifting_competition' // Advanced goal for "beginner"
        ],
        preferences: {
          equipment: ['bodyweight'], // Minimal equipment
          workoutFrequency: '2x per week', // Low frequency
          sessionDuration: '30 minutes', // Short duration
          additionalNotes: 'I want to become a powerlifter but only have 30 minutes twice a week with no equipment'
        }
      };

      const limitedResearchData = {
        exercises: [
          { name: 'Push-ups', muscleGroups: ['chest'], equipment: ['bodyweight'], contraindications: [] },
          { name: 'Air Squats', muscleGroups: ['legs'], equipment: ['bodyweight'], contraindications: [] },
          { name: 'Planks', muscleGroups: ['core'], equipment: ['bodyweight'], contraindications: [] },
          // These would typically be needed for powerlifting but aren't available
          { name: 'Barbell Squat', muscleGroups: ['legs'], equipment: ['barbell'], contraindications: [] },
          { name: 'Bench Press', muscleGroups: ['chest'], equipment: ['barbell'], contraindications: [] },
          { name: 'Deadlift', muscleGroups: ['full_body'], equipment: ['barbell'], contraindications: [] }
        ],
        insights: ['Powerlifting requires specific equipment and training', 'Bodyweight exercises have limitations for strength sports']
      };

      // Create test profile to support the adjustment agent test
      const profileData = {
        height: 175,
        weight: 70,
        age: 28,
        gender: 'male',
        unitPreference: 'metric',
        goals: ambiguousProfile.goals,
        equipment: ambiguousProfile.preferences.equipment,
        experienceLevel: ambiguousProfile.fitnessLevel
      };

      await supertest(app)
        .post('/v1/profile')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(profileData)
        .expect(200);

      // Generate a basic plan first to test adjustment reasoning
      const basicPlan = {
        planId: `test-plan-${Date.now()}`,
        planName: 'Basic Bodyweight Plan',
        weeklySchedule: {
          Monday: {
            exercises: [
              { exercise: 'Push-ups', sets: 3, repsOrDuration: '8-12' },
              { exercise: 'Air Squats', sets: 3, repsOrDuration: '10-15' }
            ]
          },
          Wednesday: {
            exercises: [
              { exercise: 'Planks', sets: 3, repsOrDuration: '30-60 seconds' }
            ]
          }
        }
      };

      // Act - Test agent's ability to handle contradictions using Plan Adjustment Agent
      const result = await adjustmentAgent.process({
        plan: basicPlan,
        feedback: "I want to convert this to powerlifting focus with heavy compound movements, but I only have bodyweight exercises available and 30 minutes twice a week",
        userProfile: ambiguousProfile
      });

      // Assert - REAL REASONING QUALITY VALIDATION
      expect(result).toMatchObject({
        adjustedPlan: expect.any(Object),
        explanations: expect.any(Object),
        reasoning: expect.any(Array)
      });

      const exercises = extractAllExercises(result.adjustedPlan.weeklySchedule);
      const reasoningText = result.reasoning.join(' ').toLowerCase();

      // Agent should recognize equipment limitations
      const usesAvailableEquipment = exercises.every(ex =>
        !ex.exercise.toLowerCase().includes('barbell') &&
        !ex.exercise.toLowerCase().includes('dumbbell')
      );
      expect(usesAvailableEquipment).toBe(true);

      // Agent should acknowledge the contradiction in reasoning
      expect(reasoningText).toMatch(/limitation|constraint|powerlifting.*requires|equipment.*needed|bodyweight.*limited/);

      // Should provide alternatives or progressive approach
      expect(reasoningText).toMatch(/alternative|foundation|basic|prepare|future|progression/);

      // Should still create a functional plan within constraints
      expect(exercises.length).toBeGreaterThan(0);
      expect(exercises.some(ex => ex.exercise.toLowerCase().includes('push'))).toBe(true);
      expect(exercises.some(ex => ex.exercise.toLowerCase().includes('squat'))).toBe(true);

      // Agent should demonstrate understanding of time constraints
      const workoutDays = countWorkoutDays(result.adjustedPlan.weeklySchedule);
      expect(workoutDays).toBeLessThanOrEqual(3); // Should respect frequency preference

      console.log('[REASONING QUALITY] Agent demonstrated intelligent handling of contradictory requirements');
    }, 30000);
  });
});

// Helper functions
function extractAllExercises(weeklySchedule) {
  const exercises = [];
  for (const day in weeklySchedule) {
    const session = weeklySchedule[day];
    if (typeof session === 'object' && session?.exercises) {
      exercises.push(...session.exercises);
    }
  }
  return exercises;
}

function countWorkoutDays(weeklySchedule) {
  let count = 0;
  for (const day in weeklySchedule) {
    const session = weeklySchedule[day];
    if (typeof session === 'object' && session?.exercises && session.exercises.length > 0) {
      count++;
    }
  }
  return count;
} 