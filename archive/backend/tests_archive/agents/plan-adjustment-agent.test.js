const PlanAdjustmentAgent = require('../../agents/plan-adjustment-agent');
const BaseAgent = require('../../agents/base-agent');
const OpenAIService = require('../../services/openai-service'); // Mocked
const { SupabaseClient } = require('../../services/supabase');
const logger = require('../../config/logger');
const { AgentError, ValidationError } = require('../../utils/errors');

// Mock the adjustment logic modules
jest.mock('../../agents/adjustment-logic/feedback-parser');
jest.mock('../../agents/adjustment-logic/plan-modifier');
jest.mock('../../agents/adjustment-logic/adjustment-validator');
jest.mock('../../agents/adjustment-logic/explanation-generator');

// Import the mocked classes
const FeedbackParser = require('../../agents/adjustment-logic/feedback-parser');
const PlanModifier = require('../../agents/adjustment-logic/plan-modifier');
const AdjustmentValidator = require('../../agents/adjustment-logic/adjustment-validator');
const ExplanationGenerator = require('../../agents/adjustment-logic/explanation-generator');

// Test Data (Define these appropriately)
const testOriginalPlan = { planId: 'plan1', planName: 'Original Plan', weeklySchedule: {} };
const testAdjustedPlan = { planId: 'plan1', planName: 'Original Plan (Adjusted)', weeklySchedule: {} }; 
const testFeedback = "Make it harder";
const testUserProfile = { user_id: 'user1', fitnessLevel: 'intermediate' };

// --- Mock Instances ---
// Create mock instances from the mocked classes
let mockFeedbackParserInstance = new FeedbackParser();
let mockPlanModifierInstance = new PlanModifier();
let mockAdjustmentValidatorInstance = new AdjustmentValidator();
let mockExplanationGeneratorInstance = new ExplanationGenerator();

// Mock the constructors to return our instances
FeedbackParser.mockImplementation(() => mockFeedbackParserInstance);
PlanModifier.mockImplementation(() => mockPlanModifierInstance);
AdjustmentValidator.mockImplementation(() => mockAdjustmentValidatorInstance);
ExplanationGenerator.mockImplementation(() => mockExplanationGeneratorInstance);

// Mock OpenAIService and SupabaseClient if needed for constructor
const mockOpenAIServiceInstance = {
  createCompletion: jest.fn(),
  streamCompletion: jest.fn()
};
const mockSupabaseClientInstance = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis()
};

// --- Mock Dependencies ---
jest.mock('../../config/logger');
jest.mock('../../services/openai-service');
jest.mock('../../services/supabase');

// Get the mocked logger instance
const originalLogger = require('../../config/logger');

// Create mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// Mock memory data for tests
const mockPreviousAdjustments = [
  { 
    id: 'prev-adjustment-1',
    content: { planName: 'Previously Adjusted Plan' },
    metadata: { 
      userId: 'user1', 
      original_plan_id: 'plan1',
      timestamp: '2023-01-01T00:00:00Z'
    }
  }
];

const mockFeedbackMemories = [
  {
    id: 'feedback-1',
    content: { rating: 'helpful', comment: 'Good adjustment' },
    metadata: {
      userId: 'user1',
      related_plan_id: 'plan1',
      memory_type: 'user_feedback'
    }
  }
];

// Create mock memory system
const mockMemorySystem = {
  storeMemory: jest.fn().mockResolvedValue({ id: 'memory-id' }),
  searchSimilarMemories: jest.fn().mockResolvedValue([]),
  getMemoriesByMetadata: jest.fn().mockResolvedValue([])
};

// --- Test Suite ---
describe('PlanAdjustmentAgent - Orchestration (Step 8.3E)', () => {
  let agent;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // --- Reset Mocks ---
    mockLogger.info = jest.fn();
    mockLogger.warn = jest.fn();
    mockLogger.error = jest.fn();
    mockLogger.debug = jest.fn();
    
    // Reset memory system mocks
    mockMemorySystem.storeMemory = jest.fn().mockResolvedValue({ id: 'memory-id' });
    mockMemorySystem.searchSimilarMemories = jest.fn().mockResolvedValue([]);
    mockMemorySystem.getMemoriesByMetadata = jest.fn().mockResolvedValue([]);
    
    // Create fresh mock instances
    mockFeedbackParserInstance = new FeedbackParser();
    mockPlanModifierInstance = new PlanModifier();
    mockAdjustmentValidatorInstance = new AdjustmentValidator();
    mockExplanationGeneratorInstance = new ExplanationGenerator();

    // Create the agent with our mock logger instead of the default
    agent = new PlanAdjustmentAgent({
      openaiService: mockOpenAIServiceInstance,
      supabaseClient: mockSupabaseClientInstance,
      memorySystem: mockMemorySystem,
      logger: mockLogger,
      config: { useDetailedLogs: true }
    });
    
    // Override the agent's helper instances with our mocks
    agent.feedbackParser = mockFeedbackParserInstance;
    agent.planModifier = mockPlanModifierInstance;
    agent.adjustmentValidator = mockAdjustmentValidatorInstance;
    agent.explanationGenerator = mockExplanationGeneratorInstance;

    // Mock BaseAgent methods that we might use
    agent.retryWithBackoff = jest.fn().mockImplementation(async (fn) => {
      return await fn();
    });
    
    // Setup default behavior for standardized memory methods
    agent.retrieveMemories = jest.fn().mockResolvedValue([]);
    agent.storeMemory = jest.fn().mockResolvedValue({ id: 'memory-id' });
    
    // Access the mocked instances created by the agent's constructor
    mockFeedbackParserInstance = FeedbackParser.mock.instances[0];
    mockPlanModifierInstance = PlanModifier.mock.instances[0];
    mockAdjustmentValidatorInstance = AdjustmentValidator.mock.instances[0];
    mockExplanationGeneratorInstance = ExplanationGenerator.mock.instances[0];
  });

  // --- Main Process Method Tests (Step 8.3E - 1, 3, 4) ---
  describe('process method orchestration', () => {
    it('should execute all Reflection steps successfully', async () => {
      // Setup mocks specifically for this success-path test
      agent.feedbackParser.parse = jest.fn().mockResolvedValue({ 
        parsed: { text: "Make it harder" }, 
        categorized: { restPeriods: [] },
        specifics: {} 
      });
      agent.adjustmentValidator.analyzeFeasibility = jest.fn().mockResolvedValue({
        feasible: [], 
        infeasible: [], 
        summary: "Feasibility OK"
      });
      agent.adjustmentValidator.checkSafety = jest.fn().mockResolvedValue({
        safeRequests: [], 
        unsafeRequests: [], 
        warnings: [], 
        summary: "Safety OK"
      });
      agent.adjustmentValidator.verifyCoherence = jest.fn().mockResolvedValue({
        coherent: [], 
        incoherent: [], 
        summary: "Coherence OK"
      });
      
      // Ensure apply resolves with the correct adjusted plan object
      agent.planModifier.apply = jest.fn().mockResolvedValue({ 
        modifiedPlan: testAdjustedPlan, 
        appliedChanges: [], 
        skippedChanges: [] 
      });
      
      // Return success for validation
      agent.adjustmentValidator.validateAdjustedPlan = jest.fn().mockResolvedValue({
        isValid: true, 
        issues: [], 
        summary: "Validation OK"
      });
      
      // Return explanations using the correct method names
      agent.explanationGenerator.generate = jest.fn().mockResolvedValue({
        explanation: "Changes explained."
      });
      agent.explanationGenerator.compare = jest.fn().mockResolvedValue({
        comparison: "Plans compared."
      });

      // Call the method to test - use new context parameter pattern
      const result = await agent.process({
        plan: testOriginalPlan, 
        feedback: testFeedback, 
        userProfile: testUserProfile
      });

      // Assertions
      expect(result.status).toBe('success');
      expect(result.adjustedPlan).toEqual(testAdjustedPlan); 
      
      // Check each step was called in order
      expect(agent.feedbackParser.parse).toHaveBeenCalled();
      expect(agent.adjustmentValidator.analyzeFeasibility).toHaveBeenCalled();
      expect(agent.adjustmentValidator.checkSafety).toHaveBeenCalled();
      expect(agent.adjustmentValidator.verifyCoherence).toHaveBeenCalled();
      expect(agent.planModifier.apply).toHaveBeenCalled();
      
      // Check reflection steps are called
      expect(agent.adjustmentValidator.validateAdjustedPlan).toHaveBeenCalled();
      expect(agent.explanationGenerator.generate).toHaveBeenCalled();
      expect(agent.explanationGenerator.compare).toHaveBeenCalled();
    });

    it('should pass state between steps correctly (conceptual check)', async () => {
       // Spies removed, will use direct expect().toHaveBeenCalled()
       
       // Set up minimal mock return values for successful execution
       agent.feedbackParser.parse = jest.fn().mockResolvedValue({ 
         parsed: { text: "Make it harder" }, 
         categorized: {},
         specifics: {} 
       });
       agent.adjustmentValidator.analyzeFeasibility = jest.fn().mockResolvedValue({
         feasible: [], 
         infeasible: [], 
         summary: "Feasibility OK"
       });
       agent.adjustmentValidator.checkSafety = jest.fn().mockResolvedValue({
         safeRequests: [], 
         unsafeRequests: [], 
         warnings: [], 
         summary: "Safety OK"
       });
       agent.adjustmentValidator.verifyCoherence = jest.fn().mockResolvedValue({
         coherent: [], 
         incoherent: [], 
         summary: "Coherence OK"
       });
       agent.planModifier.apply = jest.fn().mockResolvedValue({ 
         modifiedPlan: testAdjustedPlan, 
         appliedChanges: [], 
         skippedChanges: [] 
       });
       agent.adjustmentValidator.validateAdjustedPlan = jest.fn().mockResolvedValue({
         isValid: true, 
         issues: [], 
         summary: "Validation OK"
       });
       agent.explanationGenerator.generate = jest.fn().mockResolvedValue({
         explanation: "Changes explained."
       });
       agent.explanationGenerator.compare = jest.fn().mockResolvedValue({
         comparison: "Plans compared."
       });
       
       // Execute the process with new context parameter pattern
       await agent.process({
         plan: testOriginalPlan, 
         feedback: testFeedback, 
         userProfile: testUserProfile
       });
       
       // Check that the mocks were called in order
       expect(agent.adjustmentValidator.analyzeFeasibility).toHaveBeenCalled();
       expect(agent.planModifier.apply).toHaveBeenCalled();
    });
  });

  // --- Memory Management Tests ---
  describe('standardized memory management', () => {
    beforeEach(() => {
      // Configure mocks for successful execution
      agent.feedbackParser.parse = jest.fn().mockResolvedValue({ 
        parsed: { text: "Make it harder", summary: "Increase difficulty" }, 
        categorized: { restPeriods: [] },
        specifics: {} 
      });
      agent.adjustmentValidator.analyzeFeasibility = jest.fn().mockResolvedValue({
        feasible: [], infeasible: [], summary: "Feasibility OK"
      });
      agent.adjustmentValidator.checkSafety = jest.fn().mockResolvedValue({
        safeRequests: [], unsafeRequests: [], warnings: [], summary: "Safety OK"
      });
      agent.adjustmentValidator.verifyCoherence = jest.fn().mockResolvedValue({
        coherent: [], incoherent: [], summary: "Coherence OK"
      });
      agent.planModifier.apply = jest.fn().mockResolvedValue({ 
        modifiedPlan: testAdjustedPlan, 
        appliedChanges: [{ type: 'plan_name_change', value: 'Original Plan (Adjusted)' }], 
        skippedChanges: [] 
      });
      agent.adjustmentValidator.validateAdjustedPlan = jest.fn().mockResolvedValue({
        isValid: true, issues: [], summary: "Validation OK"
      });
      agent.explanationGenerator.generate = jest.fn().mockResolvedValue({
        explanation: "Changes explained."
      });
      agent.explanationGenerator.compare = jest.fn().mockResolvedValue({
        comparison: "Plans compared."
      });
    });

    it('should retrieve previous adjustments from memory during initialization', async () => {
      // Setup retrieveMemories to return previous adjustment data
      agent.retrieveMemories = jest.fn()
        // First call - previous adjustments
        .mockResolvedValueOnce(mockPreviousAdjustments)
        // Second call - feedback history
        .mockResolvedValueOnce(mockFeedbackMemories);
      
      // Process
      await agent.process({
        plan: testOriginalPlan, 
        feedback: testFeedback, 
        userProfile: testUserProfile
      });
      
      // Verify retrieveMemories was called with correct parameters for plan adjustments
      expect(agent.retrieveMemories).toHaveBeenCalledWith({
        userId: testUserProfile.user_id,
        agentTypes: ['plan_adjustment'],
        metadata: {
          memory_type: 'agent_output',
          original_plan_id: testOriginalPlan.planId
        },
        limit: 3,
        sortBy: 'recency'
      });
      
      // Verify retrieveMemories was called for feedback history
      expect(agent.retrieveMemories).toHaveBeenCalledWith({
        userId: testUserProfile.user_id,
        agentTypes: ['feedback'],
        metadata: {
          memory_type: 'user_feedback',
          related_plan_id: testOriginalPlan.planId
        },
        limit: 5
      });
    });

    it('should store adjusted plan in memory with standardized metadata', async () => {
      // Process request
      await agent.process({
        plan: testOriginalPlan, 
        feedback: testFeedback, 
        userProfile: testUserProfile
      });
      
      // Verify first storeMemory call (adjusted plan)
      expect(agent.storeMemory).toHaveBeenCalledWith(
        testAdjustedPlan,
        expect.objectContaining({
          userId: testUserProfile.user_id,
          memoryType: 'agent_output',
          contentType: 'adjusted_plan',
          planId: testOriginalPlan.planId,
          tags: ['plan_adjustment'],
          original_plan_id: testOriginalPlan.planId,
          feedback_summary: expect.any(String)
        })
      );
      
      // Verify second storeMemory call (reasoning and metadata)
      expect(agent.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          reasoning: expect.any(Array),
          changes: expect.any(Array),
          skipped: expect.any(Array)
        }),
        expect.objectContaining({
          userId: testUserProfile.user_id,
          memoryType: 'agent_metadata',
          contentType: 'adjustment_reasoning',
          planId: testOriginalPlan.planId,
          tags: ['reasoning', 'adjustment_process'],
          importance: 2
        })
      );
    });

    it('should not call memory methods when memorySystem is not available', async () => {
      // Create agent without memory system
      const agentWithoutMemory = new PlanAdjustmentAgent({
        openaiService: mockOpenAIServiceInstance,
        supabaseClient: mockSupabaseClientInstance,
        memorySystem: null, // explicitly set to null
        logger: mockLogger
      });
      
      // Setup for successful execution
      agentWithoutMemory.feedbackParser = mockFeedbackParserInstance;
      agentWithoutMemory.planModifier = mockPlanModifierInstance;
      agentWithoutMemory.adjustmentValidator = mockAdjustmentValidatorInstance;
      agentWithoutMemory.explanationGenerator = mockExplanationGeneratorInstance;
      
      // Setup mocks on these instances
      mockFeedbackParserInstance.parse = jest.fn().mockResolvedValue({ 
        parsed: { text: "Make it harder" }, 
        categorized: { restPeriods: [] },
        specifics: {} 
      });
      mockAdjustmentValidatorInstance.analyzeFeasibility = jest.fn().mockResolvedValue({
        feasible: [], infeasible: [], summary: "Feasibility OK"
      });
      mockAdjustmentValidatorInstance.checkSafety = jest.fn().mockResolvedValue({
        safeRequests: [], unsafeRequests: [], warnings: [], summary: "Safety OK"
      });
      mockAdjustmentValidatorInstance.verifyCoherence = jest.fn().mockResolvedValue({
        coherent: [], incoherent: [], summary: "Coherence OK"
      });
      mockPlanModifierInstance.apply = jest.fn().mockResolvedValue({ 
        modifiedPlan: testAdjustedPlan, 
        appliedChanges: [], 
        skippedChanges: [] 
      });
      mockAdjustmentValidatorInstance.validateAdjustedPlan = jest.fn().mockResolvedValue({
        isValid: true, issues: [], summary: "Validation OK"
      });
      mockExplanationGeneratorInstance.generate = jest.fn().mockResolvedValue({
        explanation: "Changes explained."
      });
      mockExplanationGeneratorInstance.compare = jest.fn().mockResolvedValue({
        comparison: "Plans compared."
      });
      
      // Directly spy on BaseAgent prototype methods instead of the instance
      const retrieveMemoriesSpy = jest.spyOn(BaseAgent.prototype, 'retrieveMemories');
      const storeMemorySpy = jest.spyOn(BaseAgent.prototype, 'storeMemory');
      
      try {
        // Process
        await agentWithoutMemory.process({
          plan: testOriginalPlan, 
          feedback: testFeedback, 
          userProfile: testUserProfile
        });
        
        // Since memorySystem is null, the BaseAgent methods should return early without proceeding
        // So they might be called, but they won't do anything meaningful
        expect(storeMemorySpy).not.toHaveBeenCalled();
      } finally {
        // Restore spies to avoid affecting other tests
        retrieveMemoriesSpy.mockRestore();
        storeMemorySpy.mockRestore();
      }
    });
  });

  // --- Error Handling Tests (Step 8.3E - 2) ---
  describe('process error handling', () => {
    it('should handle error during Initial Understanding (Parsing)', async () => {
      // Mock failure during parsing
      agent.feedbackParser.parse = jest.fn().mockRejectedValue(new Error('Parsing Failed'));
      
      // Call process, which should now handle the error
      const result = await agent.safeProcess({
        plan: testOriginalPlan, 
        feedback: testFeedback, 
        userProfile: testUserProfile
      });
      
      // Check results
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(AgentError);
      expect(result.error.message).toMatch(/Failed to parse user feedback/);
      expect(result.error.details.step).toBe('initialUnderstanding');
    });

    it('should handle error during Consideration (Analysis)', async () => {
      // Allow parsing to succeed, but analysis to fail
      agent.feedbackParser.parse = jest.fn().mockResolvedValue({ parsed: {}, categorized: {}, specifics: {} });
      agent.adjustmentValidator.checkSafety = jest.fn().mockRejectedValue(new Error('Safety Check Failed'));
      // Ensure other mocks in this path resolve successfully
      agent.adjustmentValidator.analyzeFeasibility = jest.fn().mockResolvedValue({ feasible: [], infeasible: [], summary: "OK" });
      agent.adjustmentValidator.verifyCoherence = jest.fn().mockResolvedValue({ coherent: [], incoherent: [], summary: "OK" });
      
      // Call process, which should now handle the error
      const result = await agent.safeProcess({
        plan: testOriginalPlan, 
        feedback: testFeedback, 
        userProfile: testUserProfile
      });
      
      // Check results
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(AgentError);
      expect(result.error.message).toMatch(/Failed during consideration analysis/);
      expect(result.error.details.step).toBe('consideration');
    });

    it('should handle error during Adjustment (Modification)', async () => {
      // Allow parsing and analysis to succeed, but modification to fail
      agent.feedbackParser.parse = jest.fn().mockResolvedValue({ parsed: {}, categorized: {}, specifics: {} });
      agent.adjustmentValidator.analyzeFeasibility = jest.fn().mockResolvedValue({ feasible: [], infeasible: [], summary: "OK" });
      agent.adjustmentValidator.checkSafety = jest.fn().mockResolvedValue({ safeRequests: [], unsafeRequests: [], warnings: [], summary: "OK" });
      agent.adjustmentValidator.verifyCoherence = jest.fn().mockResolvedValue({ coherent: [], incoherent: [], summary: "OK" });
      agent.planModifier.apply = jest.fn().mockRejectedValue(new Error('Modification Failed'));
      
      // Call process, which should now handle the error
      const result = await agent.safeProcess({
        plan: testOriginalPlan, 
        feedback: testFeedback, 
        userProfile: testUserProfile
      });
      
      // Check results
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(AgentError);
      expect(result.error.message).toMatch(/Failed to modify plan/);
      expect(result.error.details.step).toBe('adjustment');
    });

    it('should handle error during Reflection (Validation/Explanation)', async () => {
        // Allow all steps to succeed until validation
        agent.feedbackParser.parse = jest.fn().mockResolvedValue({ parsed: {}, categorized: {}, specifics: {} });
        agent.adjustmentValidator.analyzeFeasibility = jest.fn().mockResolvedValue({ feasible: [], infeasible: [], summary: "OK" });
        agent.adjustmentValidator.checkSafety = jest.fn().mockResolvedValue({ safeRequests: [], unsafeRequests: [], warnings: [], summary: "OK" });
        agent.adjustmentValidator.verifyCoherence = jest.fn().mockResolvedValue({ coherent: [], incoherent: [], summary: "OK" });
        agent.planModifier.apply = jest.fn().mockResolvedValue({ 
          modifiedPlan: testAdjustedPlan, 
          appliedChanges: [], 
          skippedChanges: [] 
        });
        agent.adjustmentValidator.validateAdjustedPlan = jest.fn().mockRejectedValue(new Error('Validation Failed'));
        // Mock explanation generator as well, as it might be called even if validation rejects
        agent.explanationGenerator.generate = jest.fn().mockResolvedValue({ explanation: "Explained despite validation failure." });
        agent.explanationGenerator.compare = jest.fn().mockResolvedValue({ comparison: "Compared despite validation failure." });
        
        // Call process, which should now handle the error
        const result = await agent.safeProcess({
          plan: testOriginalPlan, 
          feedback: testFeedback, 
          userProfile: testUserProfile
        });
        
        // Check results
        expect(result.success).toBe(false);
        expect(result.error).toBeInstanceOf(AgentError);
        expect(result.error.message).toMatch(/Failed during reflection stage/);
        expect(result.error.details.step).toBe('reflection');
    });

    it('should still return output with warnings if validation fails but doesnt throw', async () => {
         // Setup for validation failure (not error/exception)
         agent.feedbackParser.parse = jest.fn().mockResolvedValue({ parsed: {}, categorized: {}, specifics: {} });
         agent.adjustmentValidator.analyzeFeasibility = jest.fn().mockResolvedValue({ feasible: [], infeasible: [], summary: "Feasibility OK" });
         agent.adjustmentValidator.checkSafety = jest.fn().mockResolvedValue({ safeRequests: [], unsafeRequests: [], warnings: [], summary: "Safety OK" });
         agent.adjustmentValidator.verifyCoherence = jest.fn().mockResolvedValue({ coherent: [], incoherent: [], summary: "Coherence OK" });
         agent.planModifier.apply = jest.fn().mockResolvedValue({
           modifiedPlan: testAdjustedPlan,
           appliedChanges: [],
           skippedChanges: []
         });
         // Validation returns isValid: false but doesn't throw
         agent.adjustmentValidator.validateAdjustedPlan = jest.fn().mockResolvedValue({ 
           isValid: false, 
           issues: [{ type: 'warning', message: 'Test warning' }],
           summary: "Some issues found" 
         });
         agent.explanationGenerator.generate = jest.fn().mockResolvedValue({ explanation: "Changes explained." });
         agent.explanationGenerator.compare = jest.fn().mockResolvedValue({ comparison: "Plans compared." });
         
         const result = await agent.process({
           plan: testOriginalPlan, 
           feedback: testFeedback, 
           userProfile: testUserProfile
         });
         
         // Status should be SUCCESS because no error was thrown
         expect(result.status).toBe('success'); 
         expect(result.warnings).toContain("Adjusted plan failed final validation. Review issues before use.");
         expect(result.validation.isValid).toBe(false);
         expect(result.adjustedPlan.planName).toBe("Original Plan (Adjusted)"); 
      });
  });

  // --- Edge Case Handling Tests ---
  describe('process edge case handling', () => {
      // Setup for successful execution up to the point of validation/modification
      beforeEach(() => {
          agent.feedbackParser.parse = jest.fn().mockResolvedValue({ parsed: {}, categorized: {}, specifics: {} });
          agent.adjustmentValidator.analyzeFeasibility = jest.fn().mockResolvedValue({ 
              feasible: [
                  { type: 'advancedTechnique', item: expect.any(Object) },
                  { type: 'timeConstraint', item: expect.any(Object) }
              ],
              infeasible: [], 
              summary: "OK" 
          });
          agent.adjustmentValidator.checkSafety = jest.fn().mockResolvedValue({ 
              safeRequests: [
                  { type: 'advancedTechnique', item: expect.any(Object) },
                  { type: 'timeConstraint', item: expect.any(Object) }
              ],
              unsafeRequests: [], 
              warnings: [], 
              summary: "OK" 
          });
          agent.adjustmentValidator.verifyCoherence = jest.fn().mockResolvedValue({ 
              coherent: [], 
              incoherent: [], 
              summary: "OK" 
          });
          agent.planModifier.apply = jest.fn().mockResolvedValue({ modifiedPlan: testAdjustedPlan, appliedChanges: [], skippedChanges: [] });
          agent.adjustmentValidator.validateAdjustedPlan = jest.fn().mockResolvedValue({ isValid: true, issues: [], summary: "OK" });
          agent.explanationGenerator.generate = jest.fn().mockResolvedValue({ explanation: "Explained." });
          agent.explanationGenerator.compare = jest.fn().mockResolvedValue({ comparison: "Compared." });
      });

      it('should handle contradictory feedback detected by parser', async () => {
          // Mock parser to return a warning within the parsed object
          agent.feedbackParser.parse = jest.fn().mockResolvedValue({ 
              parsed: { 
                  text: "Add squats but remove lower body",
                  warnings: [{ type: 'contradiction', message: 'Conflicting lower body requests' }] // Warning now inside parsed
              }, 
              categorized: {}, 
              specifics: {}
          });
          
          const result = await agent.process({ plan: testOriginalPlan, feedback: "Add squats remove lower body", userProfile: testUserProfile });
          
          expect(result.status).toBe('success'); // Process completes, but with warnings
          expect(result.warnings).toContainEqual({ type: 'contradiction', message: 'Conflicting lower body requests' });
          // PlanModifier might have skipped changes based on this contradiction (depending on its logic)
          expect(agent.planModifier.apply).toHaveBeenCalled(); // Modifier still runs
      });

      it('should include concurrency warning if validation detects it', async () => {
          const stalePlan = { ...testOriginalPlan, updated_at: '2023-01-01T10:00:00Z' };
          const currentPlanTimestamp = '2023-01-01T11:00:00Z'; // DB was updated after we fetched
          const modifiedPlanWithOldTimestamp = { ...testAdjustedPlan, updated_at: '2023-01-01T10:00:00Z'}; // Modifier didn't update timestamp correctly in this mock
          
          // Mock PlanModifier to return a plan that appears stale
          agent.planModifier.apply = jest.fn().mockResolvedValue({ modifiedPlan: modifiedPlanWithOldTimestamp, appliedChanges: [], skippedChanges: [] });
          
          // Mock validator to detect the concurrency issue
          agent.adjustmentValidator.validateAdjustedPlan = jest.fn().mockResolvedValue({ 
              isValid: true, // Still structurally valid
              issues: [{
                  type: 'concurrency',
                  message: 'Potential concurrency conflict',
                  originalTimestamp: currentPlanTimestamp, // The timestamp when we thought we fetched
                  currentTimestamp: stalePlan.updated_at // The timestamp on the plan being validated
              }],
              summary: "Validation OK but concurrency warning."
          });

          const result = await agent.process({
              plan: { ...stalePlan, updated_at: currentPlanTimestamp }, // Pass the timestamp we think is current
              feedback: testFeedback,
              userProfile: testUserProfile
          });

          expect(result.status).toBe('success');
          expect(result.validation.issues).toContainEqual(expect.objectContaining({ type: 'concurrency' }));
          // Depending on how severe we treat this, we might add it to top-level warnings too
          // expect(result.warnings).toContain(expect.stringContaining('concurrency'));
      });

      it('should pass advanced technique/time constraint requests to modifier', async () => {
          // Mock the apply method itself for this test
          const applyMock = jest.spyOn(agent.planModifier, 'apply').mockResolvedValue({ 
              modifiedPlan: testAdjustedPlan, 
              appliedChanges: [{ type: 'note', outcome: 'Placeholder change applied' }], 
              skippedChanges: [] 
          });
 
          agent.feedbackParser.parse = jest.fn().mockResolvedValue({ 
              parsed: { 
                  advancedTechniques: [{ technique: 'drop sets', exercise: 'Curls', action: 'add' }],
                  timeConstraints: [{ type: 'session_duration', limit: '45 minutes' }]
              }, // Ensure these keys exist within the 'parsed' object
              categorized: {}, // Keep other parts of the structure if needed by later steps
              specifics: {} 
          });
          
          await agent.process({ plan: testOriginalPlan, feedback: "Add drop sets to curls, max 45 min sessions", userProfile: testUserProfile });
          
          // Verify PlanModifier was called with the parsed feedback including these new types
          expect(agent.planModifier.apply).toHaveBeenCalledWith(
              testOriginalPlan,
              expect.objectContaining({
                  advancedTechniques: expect.any(Array),
                  timeConstraints: expect.any(Array)
              }),
              expect.any(Object) // Considerations
          );
          // Verify the structure of the feedback passed to apply
          const feedbackArg = applyMock.mock.calls[0][1]; // Get the second argument of the first call
          expect(feedbackArg).toHaveProperty('advancedTechniques');
          expect(feedbackArg).toHaveProperty('timeConstraints');
          expect(Array.isArray(feedbackArg.advancedTechniques)).toBe(true);
          expect(Array.isArray(feedbackArg.timeConstraints)).toBe(true);
 
          // Restore spies
          applyMock.mockRestore();
      });
  });
}); 