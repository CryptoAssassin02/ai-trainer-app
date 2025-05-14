import {
  AgentMemorySystem,
  ResearchAgent,
  WorkoutGenerationAgent,
  PlanAdjustmentAgent,
  NutritionAgent,
  createWorkoutAgent,
  AgentInputType,
  AgentResultType
} from '@/utils/ai/workout-generation';
import { UserProfile } from '@/lib/profile-context'; // Assuming this path

// Mock dependencies used by the agents
jest.mock('@/utils/ai/openai', () => ({
  generateCompletion: jest.fn(),
}));

// Mock node-fetch globally or specifically where needed
const mockFetch = jest.fn();
// If fetch is used globally, mock it like this:
// jest.mock('node-fetch', () => mockFetch);
// If it's expected to be injected or part of a class, adjust mocking accordingly.
// For PerplexityAPI, let's assume it uses global fetch for now.
// We will mock its internal behavior within the ResearchAgent tests.

describe('utils/ai/workout-generation', () => {

  describe('AgentMemorySystem', () => {
    let memorySystem: AgentMemorySystem;
    const userId = 'user-123';

    beforeEach(() => {
      memorySystem = new AgentMemorySystem(userId);
    });

    it('should initialize with a user ID', () => {
      expect((memorySystem as any).userId).toBe(userId);
      expect(memorySystem.getAgentHistory('anyAgent')).toEqual([]);
      expect(memorySystem.getUserPreferences()).toEqual({});
    });

    it('should store and retrieve agent results', () => {
      const result1: AgentResultType = { success: true, data: { plan: 'A' }, reasoning: 'R1', messages: [] };
      const result2: AgentResultType = { success: true, data: { plan: 'B' }, reasoning: 'R2', messages: [] };

      memorySystem.storeResult('agentX', result1);
      memorySystem.storeResult('agentX', result2);
      memorySystem.storeResult('agentY', result1);

      expect(memorySystem.getAgentHistory('agentX')).toEqual([result1, result2]);
      expect(memorySystem.getLatestResult('agentX')).toEqual(result2);
      expect(memorySystem.getAgentHistory('agentY')).toEqual([result1]);
      expect(memorySystem.getLatestResult('agentY')).toEqual(result1);
    });

    it('should return null when getting latest result for an agent with no history', () => {
      expect(memorySystem.getLatestResult('nonExistentAgent')).toBeNull();
    });

    it('should store and retrieve user preferences', () => {
      const prefs1 = { theme: 'dark', level: 'intermediate' };
      const prefs2 = { level: 'advanced', equipment: ['barbell'] };

      memorySystem.storeUserPreferences(prefs1);
      expect(memorySystem.getUserPreferences()).toEqual(prefs1);

      memorySystem.storeUserPreferences(prefs2); // Should merge/overwrite
      expect(memorySystem.getUserPreferences()).toEqual({ ...prefs1, ...prefs2 });
    });

    it('should reset the agent history', () => {
      const result: AgentResultType = { success: true, data: {}, reasoning: '', messages: [] };
      memorySystem.storeResult('agentX', result);
      expect(memorySystem.getAgentHistory('agentX').length).toBe(1);

      memorySystem.reset();
      expect(memorySystem.getAgentHistory('agentX')).toEqual([]);
      expect(memorySystem.getLatestResult('agentX')).toBeNull();
      // Preferences are not reset by the current implementation, confirm if this is intended.
      // expect(memorySystem.getUserPreferences()).toEqual({});
    });
  });

  describe('createWorkoutAgent', () => {
    it('should return a ResearchAgent instance for type "research"', () => {
      const agent = createWorkoutAgent('research');
      expect(agent).toBeInstanceOf(ResearchAgent);
      expect(agent.name).toBe('ResearchAgent');
    });

    it('should return a WorkoutGenerationAgent instance for type "generation"', () => {
      const agent = createWorkoutAgent('generation');
      expect(agent).toBeInstanceOf(WorkoutGenerationAgent);
      expect(agent.name).toBe('WorkoutGenerationAgent');
    });

    it('should return a PlanAdjustmentAgent instance for type "adjustment"', () => {
      const agent = createWorkoutAgent('adjustment');
      expect(agent).toBeInstanceOf(PlanAdjustmentAgent);
      expect(agent.name).toBe('PlanAdjustmentAgent');
    });

    it('should return a NutritionAgent instance for type "nutrition"', () => {
      const agent = createWorkoutAgent('nutrition');
      expect(agent).toBeInstanceOf(NutritionAgent);
      expect(agent.name).toBe('NutritionAgent');
    });

    it('should throw an error for an unknown agent type', () => {
      expect(() => createWorkoutAgent('unknownType')).toThrow(
        'Unknown agent type: unknownType'
      );
    });

     it('should throw an error for an empty agent type', () => {
      expect(() => createWorkoutAgent('')).toThrow(
        'Unknown agent type: '
      );
    });
  });

  // --- Agent Class Tests ---

  describe('ResearchAgent', () => {
    let researchAgent: ResearchAgent;
    let mockGenerateCompletion: jest.Mock;
    let mockFetch: jest.Mock;

    // Define mockProfile - use 'as any' to bypass strict type checking for the mock
    const mockProfile = {
      userId: 'test-user',
      name: 'Test User',
      email: 'test@example.com',
      experienceLevel: 'intermediate',
      goals: ['strength', 'muscle_gain'], // Include expected fields
      preferences: { equipment: ['dumbbells', 'bench'] }, // Include expected fields
      age: 30,
      medicalConditions: 'none',
      // Use undefined for optional fields based on previous attempts
      height: undefined,
      weight: undefined,
      gender: undefined,
      targetWeight: undefined,
      activityLevel: undefined,
      workoutFrequency: undefined,
      workoutDuration: undefined,
      preferredWorkoutTypes: [],
      // Add any other potentially missing fields as undefined
      // subscriptionStatus: undefined,
    } as any; // <-- Type assertion here

    const mockInput: AgentInputType = {
      profile: mockProfile, // Now accepts the asserted type
      goals: mockProfile.goals || [],
      preferences: mockProfile.preferences || {},
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockFetch = jest.fn(); // Reinitialize mockFetch
      global.fetch = mockFetch; // Set the global fetch mock

      researchAgent = new ResearchAgent();
      mockGenerateCompletion = require('@/utils/ai/openai').generateCompletion as jest.Mock;
    });

    it('should process input, build query, call fetch (for Perplexity), and return structured results', async () => {
      const mockApiResponse = { // Simulate successful API response structure
        ok: true,
        json: jest.fn().mockResolvedValue({ choices: [{ message: { content: `Profile analysis: Intermediate user...` } }] }),
      };
      mockFetch.mockResolvedValue(mockApiResponse as any); // Mock fetch success

      const result = await researchAgent.process(mockInput);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      // Check fetch URL and body if needed (more complex)
      // expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('api.perplexity.ai'), expect.anything());

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('profile_analysis');
      expect(result.data).toHaveProperty('goal_identification');
      expect(result.data).toHaveProperty('training_recommendations');
      expect(result.data).toHaveProperty('exercise_selection');
      expect(result.data).toHaveProperty('progression_model');
      expect(result.reasoning).toContain('## Profile Analysis');
      expect(result.messages).toHaveLength(2);
      expect(result.messages[1].content).toContain('I\'ve completed my research');
    });

    it('should handle Perplexity fetch error and use OpenAI fallback', async () => {
      const fetchError = new Error('Perplexity API fetch error: 500');
      mockFetch.mockRejectedValue(fetchError); // Mock fetch failure

      const fallbackResponse = '{\"profile_analysis\": \"Fallback used.\"}';
      mockGenerateCompletion.mockResolvedValue(fallbackResponse);

      const result = await researchAgent.process(mockInput);

      expect(mockFetch).toHaveBeenCalledTimes(1); // Fetch is called once (and fails)
      expect(mockGenerateCompletion).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.data.profile_analysis).toContain('Fallback used.');
      expect(result.reasoning).toContain('## Profile Analysis');
    });

    it('should return error result if both Perplexity fetch and OpenAI fallback fail', async () => {
      const fetchError = new Error('Perplexity API fetch error: 500');
      const fallbackError = new Error('OpenAI fallback failed');
      mockFetch.mockRejectedValue(fetchError); // Mock fetch failure
      mockGenerateCompletion.mockRejectedValue(fallbackError);

      const result = await researchAgent.process(mockInput);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockGenerateCompletion).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(false);
      expect(result.reasoning).toContain('Research failed due to technical issues');
      expect(result.error).toContain('Research failed with both Perplexity and OpenAI');
    });
  });

  describe('WorkoutGenerationAgent', () => {
    let workoutAgent: WorkoutGenerationAgent;
    let mockGenerateCompletion: jest.Mock;

    const mockProfile = { userId: 'gen-user-1', name: 'Gen User' } as any;
    const mockResearchData = {
      researchSummary: 'Bodyweight exercises suitable',
      relevantExercises: [{ name: 'Push-up' }, { name: 'Squat' }],
    };
    // Add the expected previous message to the input for this agent's test
    const mockInput: AgentInputType = {
      profile: mockProfile,
      goals: ['strength'],
      preferences: { preferredWorkoutTypes: ['bodyweight'], equipment: [] },
      previousResults: mockResearchData,
      messages: [{ role: "assistant", content: "Research complete." }]
    };
    const mockPlanJsonString = JSON.stringify({
      title: 'Beginner Weight Loss Plan',
      schedule: [
        { day: 'Monday', exercises: [{ name: 'Squats', sets: 3, reps: 12 }] },
        { day: 'Wednesday', exercises: [{ name: 'Push-ups', sets: 3, reps: 'AMRAP' }] },
        { day: 'Friday', exercises: [{ name: 'Lunges', sets: 3, reps: 10 }] }
      ],
      reasoning: 'Plan based on beginner level and weight loss goal.',
      sessions: 3,
      duration: '4 weeks',
      level: 'beginner',
      tags: ['weight loss', 'beginner', 'bodyweight']
    });

    beforeEach(() => {
      jest.clearAllMocks();
      workoutAgent = new WorkoutGenerationAgent();
      mockGenerateCompletion = jest.requireMock('@/utils/ai/openai').generateCompletion;
    });

    it('should process input, build prompt, call generateCompletion, and return parsed plan', async () => {
      mockGenerateCompletion.mockResolvedValue(mockPlanJsonString);

      const result = await workoutAgent.process(mockInput);

      expect(mockGenerateCompletion).toHaveBeenCalledTimes(1);
      const generateCompletionCallArgs = mockGenerateCompletion.mock.calls[0][0];

      // Check prompt includes key info
      expect(generateCompletionCallArgs.chat[0].content).toContain(
        'You are a fitness program design agent'
      );
      expect(generateCompletionCallArgs.chat[0].content).toContain(
        'RETURN A STRUCTURED JSON OBJECT'
      );
      // Check for details from the mock input for THIS agent
      expect(generateCompletionCallArgs.chat[0].content).toContain('"userId": "gen-user-1"');
      expect(generateCompletionCallArgs.chat[0].content).toContain('strength'); // Goal from mockInput
      expect(generateCompletionCallArgs.chat[0].content).toContain('bodyweight'); // Preference from mockInput
      expect(generateCompletionCallArgs.chat[0].content).toContain(
        'Bodyweight exercises suitable' // From research data
      );

      // Check previous messages are included - Expect the message from ResearchAgent
      expect(generateCompletionCallArgs.chat.slice(1)).toEqual([{ role: "assistant", content: "Research complete." }]);

      expect(generateCompletionCallArgs.model).toBeDefined();
      expect(generateCompletionCallArgs.responseFormatType).toEqual({ type: 'json_object' });

      expect(result.success).toBe(true);
      expect(result.data.title).toBe('Beginner Weight Loss Plan');
      expect(result.data.schedule).toHaveLength(3);
      expect(result.reasoning).toContain('Plan based on beginner level and weight loss goal.');
      expect(result.messages).toEqual([ 
        ...generateCompletionCallArgs.chat,
        expect.objectContaining({ role: 'assistant' }) 
      ]);
    });

    it('should handle generateCompletion failure', async () => {
      const error = new Error('OpenAI API failed');
      mockGenerateCompletion.mockRejectedValue(error);

      const result = await workoutAgent.process(mockInput);

      expect(mockGenerateCompletion).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(false);
      expect(result.data).toEqual({});
      expect(result.reasoning).toContain('Workout plan generation failed');
      expect(result.error).toBe('OpenAI API failed');
    });

    it('should handle invalid JSON response from generateCompletion', async () => {
      const invalidJsonString = 'This is not JSON{';
      mockGenerateCompletion.mockResolvedValue(invalidJsonString);

      const result = await workoutAgent.process(mockInput);

      expect(mockGenerateCompletion).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(false);
      expect(result.data).toEqual({});
      expect(result.reasoning).toContain('Workout plan generation failed');
      expect(result.error).toContain('Invalid workout plan format');
    });

    it('should handle JSON response missing expected plan structure', async () => {
      const incompletePlanJsonString = JSON.stringify({ name: 'Missing Structure Plan' }); // Missing 'schedule'
      mockGenerateCompletion.mockResolvedValue(incompletePlanJsonString);

      const result = await workoutAgent.process(mockInput);

      expect(mockGenerateCompletion).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(false);
      expect(result.data).toEqual({}); // Should be empty as parsing/validation fails
      expect(result.reasoning).toContain('Workout plan generation failed');
      expect(result.error).toMatch(/Cannot read properties of undefined|Invalid workout plan structure/);
    });

    // Add tests for edge cases in prompt building if necessary
  });

  describe('PlanAdjustmentAgent', () => {
    let adjustmentAgent: PlanAdjustmentAgent;
    let mockGenerateCompletion: jest.Mock;

    const mockProfile = { userId: 'adj-user-1', name: 'Adj User' } as any;

    const mockOriginalPlan = {
      planId: 'plan-abc',
      planName: 'Original Strength Plan',
      schedule: [
        { day: 'Monday', exercises: [{ name: 'Bench Press', sets: 3, reps: 8 }] }
      ],
      reasoning: 'Original reasoning.',
      data: {}
    };

    const mockFeedback = 'Replace Bench Press with Dumbbell Press and add more cardio.';

    const mockInput: AgentInputType = {
      profile: mockProfile,
      goals: ['strength', 'cardio'],
      preferences: {},
      planId: mockOriginalPlan.planId,
      previousResults: { data: mockOriginalPlan },
      feedback: mockFeedback,
      messages: [{ role: 'user', content: mockFeedback }],
    };

    const mockAdjustedPlanJsonString = JSON.stringify({
      planName: 'Adjusted Strength & Cardio Plan',
      schedule: [
        { day: 'Monday', exercises: [{ name: 'Dumbbell Press', sets: 3, reps: 10 }] },
        { day: 'Tuesday', exercises: [{ name: 'Running', duration: '30min' }] }, // Added cardio
      ],
      reasoning: 'Adjusted plan based on feedback: Replaced Bench Press, added cardio.'
    });

    beforeEach(() => {
      jest.clearAllMocks(); // Reset mocks before each PlanAdjustmentAgent test
      adjustmentAgent = new PlanAdjustmentAgent();
      mockGenerateCompletion = require('@/utils/ai/openai').generateCompletion as jest.Mock;
    });

    it('should process feedback, build prompt, call generateCompletion, and return adjusted plan', async () => {
      mockGenerateCompletion.mockResolvedValue(mockAdjustedPlanJsonString);

      const result = await adjustmentAgent.process(mockInput);

      expect(mockGenerateCompletion).toHaveBeenCalledTimes(1);
      const generateCompletionCallArgs = mockGenerateCompletion.mock.calls[0][0];

      // Check system prompt content
      expect(generateCompletionCallArgs.chat[0].role).toBe('system');
      expect(generateCompletionCallArgs.chat[0].content).toContain('You are a fitness plan adjustment specialist.');
      expect(generateCompletionCallArgs.chat[0].content).toContain('## ORIGINAL PLAN');
      expect(generateCompletionCallArgs.chat[0].content).toContain(JSON.stringify(mockOriginalPlan, null, 2));
      expect(generateCompletionCallArgs.chat[0].content).toContain('## USER FEEDBACK');
      expect(generateCompletionCallArgs.chat[0].content).toContain(mockFeedback);
      expect(generateCompletionCallArgs.chat[0].content).toContain('JSON OBJECT');

      // Check previous messages are included
      expect(generateCompletionCallArgs.chat.slice(1)).toEqual(mockInput.messages);

      expect(generateCompletionCallArgs.model).toBeDefined();
      expect(generateCompletionCallArgs.responseFormatType).toEqual({ type: 'json_object' });

      expect(result.success).toBe(true);
      expect(result.data.planName).toBe('Adjusted Strength & Cardio Plan');
      expect(result.data.schedule).toHaveLength(2);
      expect(result.data.schedule[1].exercises[0].name).toBe('Running');
      expect(result.reasoning).toBe(
        `## Plan Adjustment Reasoning\n\n### User Feedback\n${mockFeedback}\n\n`
      );
      expect(result.messages).toEqual([ 
        ...generateCompletionCallArgs.chat,
        expect.objectContaining({ role: 'assistant' }) 
      ]);
    });

    it('should handle generateCompletion failure', async () => {
      const error = new Error('OpenAI API adjustment failed');
      mockGenerateCompletion.mockRejectedValue(error);

      const result = await adjustmentAgent.process(mockInput);

      expect(mockGenerateCompletion).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(false);
      expect(result.data).toEqual({});
      expect(result.reasoning).toContain('Plan adjustment failed');
      expect(result.error).toBe('OpenAI API adjustment failed');
    });

    it('should handle invalid JSON response from generateCompletion', async () => {
      const invalidJsonString = 'Not a valid JSON response{';
      mockGenerateCompletion.mockResolvedValue(invalidJsonString);

      const result = await adjustmentAgent.process(mockInput);

      expect(mockGenerateCompletion).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(false);
      expect(result.data).toEqual({});
      expect(result.reasoning).toContain('Plan adjustment failed');
      expect(result.error).toContain('Unexpected token');
    });

    it('should handle JSON response missing expected adjusted plan structure', async () => {
      const incompletePlanJsonString = JSON.stringify({ planName: 'Incomplete Plan' }); // Missing schedule
      mockGenerateCompletion.mockResolvedValue(incompletePlanJsonString);

      const result = await adjustmentAgent.process(mockInput);

      expect(mockGenerateCompletion).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(false);
      expect(result.data).toEqual({});
      expect(result.reasoning).toContain('Invalid adjusted workout plan structure');
      expect(result.error).toContain('Invalid adjusted workout plan structure');
    });

    // Add tests for edge cases like missing original plan or empty feedback
  });

  describe('NutritionAgent', () => {
    let nutritionAgent: NutritionAgent;
    let mockGenerateCompletion: jest.Mock;

    // Define mockProfile with relevant fields for nutrition
    const mockProfile = {
      userId: 'nutri-user-1',
      name: 'Nutri User',
      age: 35,
      weight: 75, // Assuming kg for calculation
      height: 180, // Assuming cm for calculation
      gender: 'male',
      activityLevel: 'moderately_active', // Example activity level
      goals: ['muscle_gain'],
      preferences: { diet: 'balanced' },
      // Add other UserProfile fields as undefined
      email: undefined,
      experienceLevel: undefined,
      medicalConditions: undefined,
      targetWeight: undefined,
      workoutFrequency: undefined,
      workoutDuration: undefined,
      preferredWorkoutTypes: [],
    } as any;

    const mockInput: AgentInputType = {
      profile: mockProfile,
      goals: mockProfile.goals || [],
      preferences: mockProfile.preferences || {},
      messages: [], // Start with empty messages for nutrition
    };

    // Example mock response from generateCompletion for nutrition
    const mockNutritionJsonResponse = JSON.stringify({
      recommendedDailyCalories: 2800,
      recommendedMacros: {
        protein: 180, // grams
        carbs: 300,   // grams
        fat: 93       // grams
      },
      reasoning: "Macro calculation based on user's profile (male, 35yo, 75kg, 180cm, moderately active) aiming for muscle gain. Balanced diet preference considered."
    });

    beforeEach(() => {
      jest.clearAllMocks(); // Reset mocks before each NutritionAgent test
      nutritionAgent = new NutritionAgent();
      mockGenerateCompletion = require('@/utils/ai/openai').generateCompletion as jest.Mock;
    });

    it('should process input, calculate energy, build prompt, call generateCompletion, and return nutrition advice', async () => {
      mockGenerateCompletion.mockResolvedValue(mockNutritionJsonResponse);

      const result = await nutritionAgent.process(mockInput);

      expect(mockGenerateCompletion).toHaveBeenCalledTimes(1);
      const generateCompletionCallArgs = mockGenerateCompletion.mock.calls[0][0];

      // Check system prompt content
      expect(generateCompletionCallArgs.chat[0].role).toBe('system');
      expect(generateCompletionCallArgs.chat[0].content).toContain('You are a nutrition specialist');
      expect(generateCompletionCallArgs.chat[0].content).toContain('RETURN A STRUCTURED JSON OBJECT');
      // Check for details from the updated mock input
      expect(generateCompletionCallArgs.chat[0].content).toContain('"userId": "nutri-user-1"');
      expect(generateCompletionCallArgs.chat[0].content).toContain('muscle_gain'); // Check for goal from updated mockInput
      expect(generateCompletionCallArgs.chat[0].content).toContain('balanced'); // Check for preference
      expect(generateCompletionCallArgs.chat[0].content).toContain('"age": 35');
      expect(generateCompletionCallArgs.chat[0].content).toContain('"weight": 75');
      expect(generateCompletionCallArgs.chat[0].content).toContain('"height": 180');
      expect(generateCompletionCallArgs.chat[0].content).toContain('"gender": "male"');
      expect(generateCompletionCallArgs.chat[0].content).toContain('"activityLevel": "moderately_active"');
      // Use stringContaining for goals to avoid whitespace issues
      expect(generateCompletionCallArgs.chat[0].content).toEqual(expect.stringContaining('"goals": ['));
      // Check if calculated BMR/TDEE are mentioned (agent calculates these internally)
      expect(generateCompletionCallArgs.chat[0].content).toMatch(/Estimated BMR: \d+/);
      expect(generateCompletionCallArgs.chat[0].content).toMatch(/Estimated TDEE: \d+/);

      expect(generateCompletionCallArgs.model).toBeDefined();
      expect(generateCompletionCallArgs.responseFormatType).toEqual({ type: 'json_object' });

      expect(result.success).toBe(true);
      expect(result.data.recommendedDailyCalories).toBe(2800);
      expect(result.data.recommendedMacros.protein).toBe(180);
      expect(result.reasoning).toContain(
        "Macro calculation based on user's profile"
      );
      expect(result.messages).toHaveLength(2);
    });

     it('should handle missing optional profile fields gracefully in prompt building', async () => {
      const minimalProfile = { userId: 'min-user', age: 25, weight: 60, height: 165 } as any;
      const minimalInput = { ...mockInput, profile: minimalProfile, goals: ['maintenance'] };
      mockGenerateCompletion.mockResolvedValue(mockNutritionJsonResponse); // Use same response for simplicity

      await nutritionAgent.process(minimalInput);

      expect(mockGenerateCompletion).toHaveBeenCalledTimes(1);
      const prompt = mockGenerateCompletion.mock.calls[0][0].chat[0].content;
      // Check if profile details are included in JSON format
      expect(prompt).toContain('"age": 25');
      expect(prompt).toContain('"weight": 60');
      expect(prompt).toContain('"height": 165');
      expect(prompt).not.toContain('"gender"'); // Check the key isn't present
      expect(prompt).not.toContain('"activityLevel"');
    });

    it('should handle generateCompletion failure', async () => {
      const error = new Error('OpenAI Nutrition API failed');
      mockGenerateCompletion.mockRejectedValue(error);

      const result = await nutritionAgent.process(mockInput);

      expect(mockGenerateCompletion).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(false);
      expect(result.data).toEqual({});
      expect(result.reasoning).toContain('Nutrition calculation failed');
      expect(result.error).toBe('OpenAI Nutrition API failed');
    });

    it('should handle invalid JSON response from generateCompletion', async () => {
      const invalidJson = 'This is definitely not JSON{';
      mockGenerateCompletion.mockResolvedValue(invalidJson);

      const result = await nutritionAgent.process(mockInput);

      expect(mockGenerateCompletion).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(false);
      expect(result.data).toEqual({});
      expect(result.reasoning).toContain('Nutrition calculation failed');
      expect(result.error).toContain('Unexpected token');
    });

     it('should handle JSON response missing expected nutrition structure', async () => {
      const incompleteJson = JSON.stringify({ macros: { protein: 150 } });
      mockGenerateCompletion.mockResolvedValue(incompleteJson);

      const result = await nutritionAgent.process(mockInput);

      expect(mockGenerateCompletion).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(false);
      expect(result.data).toEqual({}); // Parsing/validation fails
      expect(result.reasoning).toContain('Nutrition calculation failed');
      expect(result.error).toContain('Invalid nutrition plan structure');
    });

    // Add tests specifically for calculateEstimatedEnergy if possible/needed
    // Or verify its output through the prompt content as done above.
  });

}); 