## Phase 2.4 Controller Refactoring: Detailed Implementation Plan

### 📊 Current Controller Analysis

The `workout-chunked.js` controller currently contains 543 lines mixing:
- **Business Logic**: OpenAI API calls (lines 89-163, 319-346)
- **State Management**: Database updates with generation states
- **Profile Handling**: Merging and validation logic (lines 45-82)
- **Error Recovery**: Complex error state management (lines 431-467)

### 🎯 Phase 2.4 Implementation Strategy

#### **Core Objective: Pure Orchestration Layer**

Transform the controller into a thin orchestration layer that:
1. Validates requests
2. Instantiates appropriate agents
3. Delegates AI work to agents
4. Manages state transitions
5. Handles progressive streaming

#### **Step 1: Remove Agent Logic (Lines to Extract)**

**From `generateWorkoutStructure` (lines 14-248) & from `generateMesocycleDetails` (lines 254-468):**
- Remove controller imports of OpenAI, prompts, Ajv, & schemas
- Controller should not import `programStructureSchema`, `mesocycleDetailSchema`, or any prompt modules after refactor
- Controller only:
  - validates request,
  - instantiates agents,
  - passes context/options,
  - persists results,
  - returns response.

#### **Step 2: Implement Progressive Response Streaming**

Add Server-Sent Events (SSE) support for real-time updates:

```javascript
// Example event contract
// event: structure_generated | data: { planId, structure }
// event: mesocycle_progress | data: { planId, mesocycleNumber, status: 'generating'|'complete' }
// event: completed | data: { planId }
// event: error | data: { message, details }

router.post('/:planId/generate-progressive', 
  authenticate, 
  planGenerationLimiter,
  validateWorkoutGeneration,
  workoutChunkedController.generateProgressiveWorkout
);
  
  (async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  // 1) Generate structure via agent.safeProcess → stream 'structure_generated'
  // 2) Loop mesocycles sequentially via meso agent → stream 'mesocycle_progress' per mesocycle
  // 3) On success → 'completed' then end
  // 4) On error → 'error' then end
});
```

**Note:** Route should be mounted under the workouts router so final path is `/api/v1/workouts/:planId/generate-progressive`.

#### **Step 3: Refactored Controller Structure**

The new controller will have this clean structure:

**`generateWorkoutStructure` (reduced from 234 to ~80 lines):**
1. Basic request validation
2. Instantiate `WorkoutStructureAgent` with dependencies
3. Call `agent.process()` with user context
4. Save structure to database
5. Return response with next step

```javascript
// when inserting plan
plan_data: {
  structure: structureData,
  userProfile: mergedProfile, // add this snapshot
  aiResponse: { ... },
  generationMethod: 'chunked_structure'
}
```

- Store a normalized `userProfile` snapshot under `plan_data.userProfile` to ensure mesocycle prompts have full context.

**`generateMesocycleDetails` (reduced from 214 to ~100 lines):**
1. Validate plan exists and mesocycle sequence
2. Check completion status via `WorkoutCompletionVerifier`
3. Instantiate `WorkoutMesocycleAgent`
4. Call `agent.process()` with plan context
5. Update database with results
6. Handle progressive response if requested
7. Pass `completionVerifier` and guard via feature flag:
  - `const enforceGate = process.env.ENFORCE_MESOCYCLE_COMPLETION === 'true'`
  - Only instantiate/use `WorkoutCompletionVerifier` when `enforceGate` is true.

**New `generateProgressiveWorkout` function:**
- Orchestrates full progressive generation
- Manages SSE connection
- Coordinates between structure and mesocycle agents
- Streams updates as each phase completes

**Explicit Agent Wiring, RLS Client, and env Flag Pass-Through:**
```javascript
const WorkoutStructureAgent = require('../agents/workout-structure-agent');
const WorkoutMesocycleAgent = require('../agents/workout-mesocycle-agent');
const WorkoutCompletionVerifier = require('../utils/workout-completion-verifier');
const { getSupabaseClientWithToken } = require('../services/supabase');
const OpenAIService = require('../services/openai-service');

async function generateWorkoutStructure(req, res) {
  const jwtToken = req.headers.authorization?.split(' ')[1];
  const supabaseRLS = getSupabaseClientWithToken(jwtToken);
  const openaiService = new OpenAIService();

  const agent = new WorkoutStructureAgent({
    openaiService,
    supabaseClient: supabaseRLS,
    memorySystem: null,
    logger: console
  });

  const useStructured = process.env.USE_STRUCTURED_OUTPUTS !== 'false';
  const result = await agent.safeProcess(context, { useStructuredOutputs: useStructured });
  if (!result.success) {
    const status = result.error?.code === 'VALIDATION_ERROR' ? 400 : (result.error?.statusCode || 500);
    return res.status(status).json({ status: 'error', message: result.error.message, details: result.error.details });
  }

  // persist + respond...
}
```

#### **Step 4: State Management Improvements**

Move from inline state updates to a dedicated state manager:

**New file: `backend/utils/workout-generation-state-manager.js`**
- Use existing `workout_plans` columns: `generation_state`, `mesocycles_generated`, `generation_errors`, `current_mesocycle`, `generation_started_at`, `generation_completed_at`
- Keep atomic updates; do not introduce new columns yet (those are an optional Phase 2.3f migration)

```javascript
class WorkoutGenerationStateManager {
  async transitionState(planId, fromState, toState) {
    // Atomic state transitions with validation
  }
  
  async recordProgress(planId, mesocycleNumber, status) {
    // Track generation progress
  }
  
  async handleError(planId, error, context) {
    // Centralized error state management
  }
}
```

#### **Step 5: Error Handling Simplification**

**Replace custom `withErrorHandling` wrapper with `BaseAgent.safeProcess` throughout:**
- Controllers must call `agent.safeProcess(context, options)` and map `result.error` to HTTP status:
  - Validation -> 400,
  - External service (OpenAI/network) -> 503,
  - Otherwise -> 500.

#### **Step 6: Add New Route**
- Need to add progressive streaming endpoint (below) in `backend/routes/workouts.js` (or existing workouts route file), not inside the controller file.
- Keep existing endpoints (`POST /structure`, `POST /:planId/mesocycles/:num`, `GET /:planId/status`) for backward compatibility.

```javascript
router.post('/:planId/generate-progressive', authenticate, ...)
```

#### **Step 7: Controller Imports Alignment**
After refactor, controllers must not import:
- `../utils/chunked-schemas`, `../utils/workout-structure-schema`, `../utils/workout-mesocycle-schema`, `../utils/workout-*-prompts`, Ajv, OpenAIService (except for injection into agents)
- Only agents reference schemas/prompts and handle Ajv fallback

#### **Step 8: Environment and Feature Flags**
- `USE_STRUCTURED_OUTPUTS` controls agent option `useStructuredOutputs`
- `ENFORCE_MESOCYCLE_COMPLETION` gates verifier enforcement
- SSE route should be resilient to disconnects; if the connection closes, stop downstream work for this request

#### **Step 9: Phase 2.4 (Controller Refactoring - Frontend Implications)**:

**Files to update:**
- `lib/api/services/workout-service.ts` - Add SSE streaming methods
- `components/workout/single-step-workout-form.tsx` - Update status handling for SSE
- `components/workout/multi-step-workout-form.tsx` - Update status handling for SSE
- `components/workout/workout-generation-progress.tsx` - Enhanced progress display
- `hooks/use-workout-generation.ts` (new) - Handle SSE connection management

**Required changes:**
- Replace current polling/status checking with SSE event listeners
- Update progress UI to show real-time streaming updates
- Handle SSE connection lifecycle (open, error, reconnect)
- Progressive rendering of completed mesocycles
- Error recovery for partial generation failures
- Frontend SSE listener must handle event names listed in Step 2 (`structure_generated`, `mesocycle_progress`, `completed`, and `error`) and progessively update UI; fall back to existing polling endpoints when SSE (`EventSource`) unavailable

#### **Step 10: Testing Additions**
- Verify both flows with `USE_STRUCTURED_OUTPUTS=true/false`
- SSE: assert event ordering
  - `structure_generated` -> `mesocycle_progress` (1..N) -> `completed`
- Error path SSE: emit `error` with details and close the stream
- Mesocycle with one Rest day validates against Phase 2.1 union schema E2E

### 🔄 Progressive Response Streaming Implementation

**Key Features:**
1. **Immediate Feedback**: User sees structure within 2-3 seconds
2. **Progress Updates**: Real-time updates as mesocycles generate
3. **Partial Results**: Show completed mesocycles before all finish
4. **Error Recovery**: Continue with completed parts on partial failure

**Implementation Pattern:**
```javascript
// Client initiates progressive generation
// Controller streams updates via SSE
// Each agent completion triggers an update
// Frontend progressively renders results
```

### 📋 Migration Strategy

1. **Keep existing endpoints operational** during transition
2. **Add new progressive endpoint** alongside current ones
3. **Gradually migrate frontend** to use progressive endpoints
4. **Remove old logic** after validation

### ✅ Benefits of Refactored Controller

1. **Separation of Concerns**
   - Controller: 250 lines → 150 lines of pure orchestration
   - Agents: Handle all AI logic independently
   - Utils: Shared business logic centralized

2. **Testability**
   - Mock agents easily for controller tests
   - No OpenAI calls in controller layer
   - Clear boundaries between components

3. **Progressive Enhancement**
   - SSE enables real-time progress updates
   - Partial results available immediately
   - Better perceived performance

4. **Error Recovery**
   - Centralized error handling
   - Graceful degradation with partial results
   - Clear error context for debugging

### 🚨 Critical Implementation Notes

1. **Maintain Backward Compatibility**: Keep existing endpoints working during transition
2. **Database Transaction Management**: Ensure atomic updates when coordinating agents
3. **Connection Management**: Handle SSE connection drops gracefully
4. **Rate Limiting**: Apply to both traditional and progressive endpoints
5. **Memory Management**: Clean up agent instances after use

### 🎯 Success Metrics

- Controller reduced from 543 to ~150 lines
- All OpenAI logic moved to agents
- Zero business logic in controller
- Progressive streaming operational
- Existing API contracts maintained

The refactored controller becomes a true orchestration layer that coordinates agent activities without containing any AI logic itself, achieving the clean separation envisioned in the original architecture plan.