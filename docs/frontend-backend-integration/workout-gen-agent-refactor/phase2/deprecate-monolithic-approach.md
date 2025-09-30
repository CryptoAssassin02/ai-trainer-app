### Scope
- After Phase 2 validation, use only the separated/chunked paths:
  - Two schemas: `workout-structure-schema.js`, `workout-mesocycle-schema.js`
  - Two prompt modules: `workout-structure-prompts.js`, `workout-mesocycle-prompts.js`
  - Two agents: `workout-structure-agent.js`, `workout-mesocycle-agent.js`
  - Controller orchestration only (no AI logic), plus SSE route

### Deprecate now (keep as thin wrappers until all imports are migrated)
- backend/utils/chunked-schemas.js
  - Status: Deprecated wrapper that re-exports from `workout-structure-schema.js` and `workout-mesocycle-schema.js`.
  - Remove once all direct imports target the new files.
- backend/utils/workout-prompts-chunked.js
  - Status: Deprecated wrapper that re-exports from `workout-structure-prompts.js` and `workout-mesocycle-prompts.js`.
  - Remove once all direct imports target the new files.
- backend/agents/workout-generation-agent.js
  - Status: Deprecated monolithic generation agent; superseded by the two new agents.
  - Keep only until Phase 2 rollout completes and no references remain.
- backend/agents/index.js
  - Action: Mark export of `WorkoutGenerationAgent` as deprecated; add/retain exports for the two new agents.

### Routes and controllers
- backend/routes/workout.js
  - DEPRECATE: Legacy endpoint
    - POST `/api/v1/workouts/` → `workoutController.generateWorkoutPlan` (monolithic)
    - Mark as deprecated immediately; remove after clients/tests migrate to the chunked flow.
  - KEEP: Chunked endpoints
    - POST `/api/v1/workouts/structure` → `workoutChunkedController.generateWorkoutStructure`
    - POST `/api/v1/workouts/:planId/mesocycles/:mesocycleNumber` → `workoutChunkedController.generateMesocycleDetails`
    - GET  `/api/v1/workouts/:planId/status` → `workoutChunkedController.getGenerationStatus`
  - ADD: SSE endpoint (Phase 2.4)
    - POST `/api/v1/workouts/:planId/generate-progressive` → `workoutChunkedController.generateProgressiveWorkout`
- backend/controllers/workout.js
  - DEPRECATE: `generateWorkoutPlan` (monolithic). Remove after migration.
  - KEEP: `getWorkoutPlans`, `getWorkoutPlan`, `adjustWorkoutPlan`, `deleteWorkoutPlan` (still valid non-generation workflows).
    - Ensure none of these import monolithic prompts/schemas (they should not).
- backend/controllers/workout-chunked.js
  - KEEP. Ensure it only orchestrates (agents own OpenAI + validation).
  - Confirm it no longer imports `../utils/chunked-schemas` or legacy prompts.

### Schemas and prompts
- Replace all imports of:
  - `../utils/chunked-schemas` with:
    - `../utils/workout-structure-schema`
    - `../utils/workout-mesocycle-schema`
  - `../utils/workout-prompts-chunked` with:
    - `../utils/workout-structure-prompts`
    - `../utils/workout-mesocycle-prompts`

### Tests and clients to update
- Replace any usage of POST `/api/v1/workouts/` (monolithic generation) with:
  - POST `/api/v1/workouts/structure` followed by
  - POST `/api/v1/workouts/:planId/mesocycles/:mesocycleNumber`
  - Optionally use POST `/api/v1/workouts/:planId/generate-progressive` once implemented.
- Update imports in any unit/integration tests referencing:
  - `workout-prompts-chunked.js` → new prompt modules
  - `chunked-schemas.js` → new schema modules
  - `WorkoutGenerationAgent` → new two-agent architecture
- Confirm E2E flows listen to SSE events (`structure_generated`, `mesocycle_progress`, `completed`, `error`) where applicable.

### Documentation to mark deprecated and update
- backend/agents/docs/workoutGenerationAgentDocs.md
  - Mark `WorkoutGenerationAgent` deprecated; point to `workout-structure-agent.js` and `workout-mesocycle-agent.js`.
- backend/routes/docs/workoutMgmtRoutes.md
  - Mark POST `/api/v1/workouts/` deprecated; document new chunked endpoints and SSE route.
- Any docs under `docs/openai-considerations/...` and `docs/frontend-backend-integration/...` that reference the monolithic controller or monolithic agent should be updated to reference the separated prompts/schemas/agents.

### Removal checklist (execute after migration validation)
- No references to:
  - `backend/agents/workout-generation-agent.js`
  - `backend/utils/chunked-schemas.js`
  - `backend/utils/workout-prompts-chunked.js`
  - POST `/api/v1/workouts/` route in `backend/routes/workout.js`
  - `WorkoutGenerationAgent` export in `backend/agents/index.js`
- All tests green using chunked paths.
- Telemetry/logs show zero traffic to deprecated POST `/api/v1/workouts/`.

### Grep patterns to verify zero references before deletion
- `generateWorkoutPlan(` (controller and tests)
- `WorkoutGenerationAgent` (all code/tests/docs)
- `require('../utils/chunked-schemas')` or `require('./chunked-schemas')`
- `require('../utils/workout-prompts-chunked')` or `require('./workout-prompts-chunked')`
- `POST /api/v1/workouts\\b` (routes, tests)

### Keep (not deprecated)
- Plan adjustment flow: `backend/controllers/workout.js` → `adjustWorkoutPlan` using `PlanAdjustmentAgent`
- Plan retrieval/list/delete
- Chunked controller: `backend/controllers/workout-chunked.js`
- Workout logging services and routes (used for completion gating)

This deprecation plan makes it explicit what to sunset, what to migrate to, and how we’ll verify no stragglers remain before final deletion.