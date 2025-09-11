# Phase 2 Integration Testing Rules
## Critical Success Patterns from Agent Memory System Integration

### 1. USER CREATION AND AUTHENTICATION PATTERNS

#### ✅ ALWAYS USE APPLICATION APIs
```javascript
// ✅ CORRECT: Use application signup API
const signupResponse = await supertest(app)
  .post('/v1/auth/signup')
  .send({ 
    name: testName, 
    email: uniqueEmail, 
    password: testPassword 
  });

// ❌ NEVER: Use Supabase admin methods directly
// await supabase.auth.admin.createUser() // CAUSES "User not allowed" errors
```

#### ✅ REFERENCE WORKING PATTERNS
- **Primary Reference**: `backend/tests/integration/macros.integration.test.js`
- Shows proven user creation, profile setup, and cleanup patterns
- Copy the exact authentication flow from working tests

#### ✅ USER CLEANUP STRATEGY
```javascript
afterEach(async () => {
  // Probabilistic cleanup to avoid affecting other tests
  if (Math.random() < 0.2) {
    await supabase.from('agent_memory').delete().eq('user_id', testUser.id);
  }
  
  // Always clean up test user
  if (testUser?.id) {
    await supabase.from('profiles').delete().eq('id', testUser.id);
    await supabase.auth.admin.deleteUser(testUser.id);
  }
});
```

### 2. PROFILE FIELD VALIDATION RULES

#### ✅ VERIFY FIELDS AGAINST VALIDATION SCHEMA
- **Critical File**: `backend/middleware/validation.js`
- **Line Reference**: Lines 508-620 for profile schema
- ALWAYS check actual validation schema before writing test payloads

#### ✅ CORRECT PROFILE FIELDS (Phase 2 Verified)
```javascript
// ✅ CORRECT profile payload structure
const profilePayload = {
  goals: ['strength', 'muscle_gain'],           // Array of strings
  experienceLevel: 'intermediate',              // NOT 'fitnessLevel'
  equipment: ['dumbbells', 'barbell'],          // Top-level, NOT nested in preferences
  exercisePreferences: ['strength']             // NOT 'exerciseTypes'
};

// ❌ COMMON MISTAKES TO AVOID
// fitnessLevel: 'intermediate'                 // Wrong field name
// preferences: { exerciseTypes: [...] }        // Nested structure not accepted
// exerciseTypes: [...]                         // Wrong field name
```

### 3. AGENT TYPE VALIDATION RULES

#### ✅ VERIFY AGENT TYPES AGAINST VALIDATORS
- **Critical File**: `backend/agents/memory/validators.js`
- **Valid Types**: `['nutrition', 'workout', 'research', 'adjustment', 'system']`

```javascript
// ✅ CORRECT agent types
await memorySystem.storeAgentResult(userId, 'workout', content);        // NOT 'workout_generation'
await memorySystem.storeAgentResult(userId, 'adjustment', content);     // NOT 'plan_adjustment'

// ❌ INVALID agent types that cause validation errors
// 'workout_generation'  // Invalid
// 'plan_adjustment'     // Invalid
```

### 4. SERVICE INSTANTIATION PATTERNS

#### ✅ PROPER SERVICE SETUP
```javascript
// ✅ CORRECT: Service instantiation in beforeAll
beforeAll(async () => {
  supabase = getSupabaseClient();
  
  // Create service instance, not import class
  openaiService = new OpenAIService();          // NOT just require()
  
  // Pass proper dependencies to AgentMemorySystem
  memorySystem = new AgentMemorySystem({
    supabase: supabase,                         // Service instance
    openai: openaiService,                      // Service instance, NOT config
    logger: logger,
    config: {
      embeddingModel: 'text-embedding-ada-002',
      maxResults: 10,
      similarityThreshold: 0.6
    }
  });
});
```

#### ✅ OPENAI SERVICE METHOD CALLS
```javascript
// ✅ CORRECT: Use service methods
const summary = await openai.generateChatCompletion([...], {...});

// ❌ WRONG: Direct API access
// await openai.chat.completions.create(...)    // Service doesn't expose this
```

### 5. DATA TRANSFORMATION CONSISTENCY

#### ✅ ENSURE CONTENT PARSING ALIGNMENT
- **Issue**: Memory content stored as JSON strings but not parsed back to objects
- **Solution**: Added `parseMemoryContent` helper in retrieval functions
- **Rule**: Always verify data transformation consistency between storage and retrieval

```javascript
// ✅ CORRECT: Content should be parsed back to objects
expect(workoutMemories[0].content).toMatchObject(workoutGenerationResult);

// Memory system should handle JSON parsing transparently
// If content is stored as JSON string, retrieval should parse it back to object
```

### 6. DATABASE SCHEMA FIELD VERIFICATION

#### ✅ VERIFY RPC FUNCTION DEFINITIONS
- **Critical File**: `backend/supabase/migrations/0014_create_agent_memory_functions.sql`
- **Rule**: Check actual RPC function return fields, don't assume

```javascript
// ✅ CORRECT: Use actual field names from RPC function
expect(memory.similarity).toBeGreaterThan(0.6);           // RPC returns 'similarity'

// ❌ WRONG: Assuming field names
// expect(memory.similarity_score).toBeGreaterThan(0.6);   // Field doesn't exist
```

### 7. MEMORY CONSOLIDATION LOGIC RULES

#### ✅ PROPER COUNT CALCULATIONS
```javascript
// ✅ CORRECT: Calculate consolidation to respect maxMemories limit
// Final count = (originalCount - consolidatedMemories + 1 summary) should equal maxMemories
// Therefore: consolidatedMemories = originalCount - maxMemories + 1

const memoriesToConsolidateCount = originalCount - maxMemories + 1;
const consolidateCount = Math.min(memoriesToConsolidateCount, maxToConsolidate);
```

#### ✅ VARIABLE NAMING CONSISTENCY
```javascript
// ✅ CORRECT: Use distinct variable names
let memoriesToConsolidate = [];                          // Array
const memoriesToConsolidateCount = calculation;          // Number

// ❌ WRONG: Reusing same variable name with different types causes const assignment errors
```

### 8. TEST STRUCTURE BEST PRACTICES

#### ✅ PROGRESSIVE TEST COMPLEXITY
```javascript
// Order tests from simple to complex:
// 1. Basic storage/retrieval (no external APIs)
// 2. Semantic search (1 real API call)
// 3. Complex operations (consolidation)
// 4. Performance benchmarks
```

#### ✅ API BUDGET MANAGEMENT
- **Budget**: ≤3 real OpenAI API calls for Phase 2
- **Strategy**: Use 1 call for semantic search, mock others
- **Tracking**: Document each real API call in test comments

#### ✅ ERROR DEBUGGING APPROACH
1. **One Error at a Time**: Fix errors systematically, don't try to fix multiple issues simultaneously
2. **Check Source Files**: Always verify field names, method signatures, and validation rules in source code
3. **Use Working Patterns**: Reference existing working integration tests for proven patterns
4. **Targeted Fixes**: Make precise fixes based on error messages, don't guess

### 9. CRITICAL FILE REFERENCES

#### ✅ ESSENTIAL FILES TO CHECK BEFORE IMPLEMENTATION
```bash
# User creation patterns
backend/tests/integration/macros.integration.test.js

# Profile field validation
backend/middleware/validation.js (lines 508-620)

# Agent type validation  
backend/agents/memory/validators.js

# Database schema and RPC functions
backend/supabase/migrations/0014_create_agent_memory_functions.sql

# Service method signatures
backend/services/openai-service.js
```

### 10. PERFORMANCE AND TESTING STANDARDS

#### ✅ PERFORMANCE BENCHMARKS
```javascript
// Storage operations: <5 seconds
// Retrieval operations: <2 seconds
// Always test performance with realistic data sizes
```

#### ✅ TEST DATA QUALITY
```javascript
// Use realistic test data that matches actual use cases
const workoutGenerationResult = {
  planType: 'Upper/Lower Split',          // Realistic plan type
  focusAreas: ['chest', 'back'],          // Realistic focus areas
  userFeedback: 'liked compound movements' // Realistic feedback
};
```

### 11. COMMON ANTI-PATTERNS TO AVOID

#### ❌ DIRECT DATABASE MANIPULATION FOR USER CREATION
- Always use application APIs for user creation
- Supabase admin methods cause permission errors in test environment

#### ❌ ASSUMING FIELD NAMES
- Always verify field names against validation schemas and database functions
- Don't assume camelCase vs snake_case conventions

#### ❌ SERVICE CONFIGURATION CONFUSION
- Don't pass config objects where service instances are expected
- Always instantiate services properly

#### ❌ INCOMPLETE ERROR HANDLING
- Don't ignore validation error messages
- Always read the full error message for debugging clues

#### ❌ VARIABLE SCOPE CONFLICTS
- Use descriptive, unique variable names
- Avoid reusing variable names with different types in same scope

### PHASE 2 SUCCESS METRICS
- ✅ 4/4 tests passing (100% success rate)
- ✅ 1 real OpenAI API call (within ≤3 budget)
- ✅ All operations <5 seconds (performance requirement)
- ✅ End-to-end memory operations functional
- ✅ Semantic search with real embeddings working
- ✅ Memory consolidation optimizing storage correctly

---

## CRITICAL LESSONS FROM ADJUSTMENT LOGIC INTEGRATION TESTING

### 12. AI SERVICE MOCK INTELLIGENCE PATTERNS

#### ✅ CONTEXT-AWARE MOCK DETECTION
**Critical Issue Resolved**: Jest mocks were hardcoded to always return workout plans instead of appropriate responses for different AI operations.

**Root Cause**: Integration test mock in `backend/tests/integration/jest-setup-after-env.js` had no logic to differentiate between workout generation vs feedback parsing.

**Solution Pattern**:
```javascript
// ✅ CORRECT: Intelligent mock that detects operation type
generateChatCompletion: jest.fn().mockImplementation((messages, options) => {
  // Check if this is a feedback parsing request by examining system prompt
  const systemMessage = messages.find(msg => msg.role === 'system');
  
  const isParsingFeedback = systemMessage && systemMessage.content && (
    systemMessage.content.includes('parse user feedback') ||
    systemMessage.content.includes('extract structured information') ||
    systemMessage.content.includes('painConcerns') ||
    systemMessage.content.includes('substitutions')
  );

  if (isParsingFeedback) {
    // Return appropriate feedback parsing response
    return Promise.resolve(JSON.stringify({
      substitutions: [
        { from: "squats", to: "upper body exercises", reason: "knee pain" }
      ],
      painConcerns: [
        { area: "knee", exercise: "squats", severity: "mentioned" }
      ],
      intensityAdjustments: [],
      restPeriodChanges: []
    }));
  } else {
    // Return workout plan response
    return Promise.resolve(JSON.stringify(mockWorkoutPlan));
  }
})
```

#### ✅ MOCK ARCHITECTURE COORDINATION
**Critical Issue**: Multiple mock layers not coordinating properly.

**Files Involved**:
- `backend/services/__mocks__/openai-service.js` (unit test mocks)
- `backend/tests/integration/jest-setup-after-env.js` (integration test mocks)

**Rule**: Integration test mocks override unit test mocks. Always implement intelligent logic in the integration test setup file.

### 13. OPENAI SERVICE INTEGRATION RULES

#### ✅ CORRECT METHOD SIGNATURES
**Critical Issue Resolved**: Backend agents were calling wrong OpenAI service methods.

**Backend Implementation Bugs Found**:
```javascript
// ❌ WRONG: What agents were calling
this.openaiService.createChatCompletion({...})    // Method doesn't exist

// ✅ CORRECT: What OpenAI service actually provides
this.openaiService.generateChatCompletion(messages, options)
```

**Files Fixed**:
- `backend/agents/adjustment-logic/feedback-parser.js`
- `backend/agents/adjustment-logic/explanation-generator.js`

#### ✅ PROPER SERVICE INITIALIZATION IN TESTS
```javascript
// ✅ CORRECT: Explicit service initialization
beforeAll(async () => {
  openaiService = new OpenAIService();
  await openaiService.initClient(); // CRITICAL: Explicit initialization
  
  // Pass initialized service to agents
  feedbackParser = new FeedbackParser(openaiService);
  explanationGenerator = new ExplanationGenerator(openaiService);
});
```

#### ✅ SERVICE DEPENDENCY VALIDATION
```javascript
// ✅ CORRECT: Validate service is properly passed
constructor(openaiService, config = {}, loggerInstance = logger) {
  if (!openaiService) {
    throw new Error('[FeedbackParser] OpenAIService instance is required.');
  }
  this.openaiService = openaiService;
}
```

### 14. BACKEND IMPLEMENTATION VALIDATION RULES

#### ✅ INTEGRATION TESTS REVEAL REAL BUGS
**Key Insight**: Integration tests discovered actual backend implementation bugs that unit tests missed.

**Backend Bugs Discovered**:
1. **Method Name Mismatches**: Agents calling non-existent OpenAI methods
2. **Service Interface Misunderstanding**: Wrong parameter structures
3. **Error Handling Gaps**: Services failing silently

**Testing Strategy**:
```javascript
// ✅ CORRECT: Test real business logic, not just structure
test('When OpenAI processes real user feedback, Then adjustments are accurate and contextual', async () => {
  // Test actual feedback processing logic
  const adjustedPlan = await planAdjustmentAgent.adjustPlan(originalPlan, userFeedback);
  
  // Validate business logic outcomes
  expect(adjustedPlan.appliedChanges).toEqual(expect.arrayContaining([
    expect.stringMatching(/squat|back|replace/i)
  ]));
  
  // Verify safety compliance
  const hasBackSquat = mondayExercises.some(ex => 
    ex.exercise.toLowerCase().includes('back squat')
  );
  expect(hasBackSquat).toBe(false); // Should remove problematic exercise
});
```

### 15. AGENT COMPONENT TESTING PATTERNS

#### ✅ COMPONENT INTERDEPENDENCY TESTING
```javascript
// ✅ CORRECT: Test complete agent pipeline
test('When user provides complex feedback, Then should process through entire adjustment pipeline', async () => {
  // Step 1: Parse feedback
  const parsedFeedback = await feedbackParser.parse(userFeedback);
  
  // Step 2: Validate adjustments  
  const validationResults = await adjustmentValidator.analyzeFeasibility(plan, parsedFeedback);
  
  // Step 3: Apply modifications
  const modificationResults = await planModifier.apply(plan, parsedFeedback, validationResults);
  
  // Step 4: Generate explanation
  const explanation = await explanationGenerator.generate(modificationResults, parsedFeedback);
  
  // Assert complete pipeline success
  expect(explanation).toHaveProperty('summary');
  expect(modificationResults.appliedChanges.length).toBeGreaterThan(0);
});
```

#### ✅ AGENT INITIALIZATION DEPENDENCY PATTERN
```javascript
// ✅ CORRECT: Initialize all agent dependencies properly
beforeAll(async () => {
  // Initialize base services
  supabase = getSupabaseClient();
  openaiService = new OpenAIService();
  await openaiService.initClient();
  
  // Initialize agents with proper dependencies
  adjustmentValidator = new AdjustmentValidator(supabase);           // Database-dependent
  planModifier = new PlanModifier(supabase);                        // Database-dependent
  feedbackParser = new FeedbackParser(openaiService);               // AI-dependent
  explanationGenerator = new ExplanationGenerator(openaiService);   // AI-dependent
});
```

### 16. MOCK VS REAL API STRATEGY RULES

#### ✅ INTEGRATION TEST MOCK STRATEGY
**When to Use Mocks in Integration Tests**:
- ✅ Use intelligent mocks for AI services to test business logic without API costs
- ✅ Mock responses should be realistic and match actual service response structures
- ✅ Mock different scenarios (success, error, edge cases)

**When NOT to Mock**:
- ❌ Don't mock database operations (use real test database)
- ❌ Don't mock internal service communications
- ❌ Don't use overly simplified mocks that hide implementation bugs

#### ✅ MOCK QUALITY VALIDATION
```javascript
// ✅ CORRECT: Validate mock responses match real service structure
const mockResponse = {
  substitutions: [...],      // Must match FeedbackParser expected structure
  painConcerns: [...],       // Must match actual OpenAI response format
  intensityAdjustments: [...] // Must include all required fields
};

// Test should work with both mock and real responses
expect(parsedFeedback).toMatchObject({
  substitutions: expect.arrayContaining([...]),
  painConcerns: expect.arrayContaining([...])
});
```

### 17. ERROR DEBUGGING METHODOLOGY

#### ✅ SYSTEMATIC DEBUGGING APPROACH (Proven in This Chat)
1. **Identify Root Cause**: Look beyond surface error messages
   - "OpenAI returning workout plan" → Mock detection logic issue
   - "Method not found" → Service interface mismatch

2. **Fix One Layer at a Time**:
   - Fix service method names first
   - Then fix mock intelligence
   - Finally validate business logic

3. **Use Console Debugging Strategically**:
   ```javascript
   // ✅ CORRECT: Strategic debugging
   console.log('[TEST] OpenAI service created:', typeof openaiService);
   console.log('[FeedbackParser] DEBUG - About to call OpenAI service');
   console.log('[MOCK] System message content preview:', systemMessage?.content?.substring(0, 100));
   ```

#### ✅ CRITICAL FILE INVESTIGATION ORDER
When debugging AI integration issues:
1. **Check service method signatures**: `backend/services/openai-service.js`
2. **Check agent implementations**: `backend/agents/adjustment-logic/*.js`
3. **Check mock configurations**: `backend/tests/integration/jest-setup-after-env.js`
4. **Check environment variables**: `.env.test` configuration

### 18. PERFORMANCE AND QUALITY STANDARDS FOR AI AGENTS

#### ✅ AI AGENT PERFORMANCE BENCHMARKS
```javascript
// Performance standards for AI agent operations
const performanceStandards = {
  feedbackParsing: 5000,      // 5 seconds max
  planModification: 3000,     // 3 seconds max  
  explanationGeneration: 4000, // 4 seconds max
  validation: 2000            // 2 seconds max
};

// Always test performance
const startTime = Date.now();
const result = await agentOperation();
const duration = Date.now() - startTime;
expect(duration).toBeLessThan(performanceStandards.operationType);
```

#### ✅ AI RESPONSE QUALITY VALIDATION
```javascript
// ✅ CORRECT: Validate AI response quality, not just structure
expect(adjustedPlan.reasoning).toMatch(/back.*pain|safer|alternative/i); // Should address user concern
expect(hasBackSquat).toBe(false); // Should remove problematic exercise
expect(upperBodyExercises.length).toBeGreaterThan(0); // Should fulfill request
```

### INTEGRATION TESTING SUCCESS PATTERN SUMMARY

**✅ Proven Pattern for AI Agent Integration Testing**:
1. Use intelligent context-aware mocks
2. Validate real business logic outcomes
3. Test complete agent pipelines
4. Fix backend implementation bugs revealed by tests
5. Maintain performance standards
6. Use systematic debugging methodology

**❌ Common Pitfalls to Avoid**:
- Hardcoded mocks that hide implementation bugs
- Testing only data structure, not business logic
- Ignoring service method signature mismatches  
- Skipping explicit service initialization
- Assuming mock responses without validation
