# Auth Flow Revision Plan (Post-Initial Refactor)

**Overall Goal:** Ensure all backend services and components correctly interact with the refactored Supabase-centric authentication system, particularly regarding Row Level Security (RLS) and the removal of custom JWT configurations.

---

## Phase 1: Configuration Cleanup

**Goal:** Remove obsolete JWT configurations from environment and application config files.

1.  **File: `backend/config/env.js`**
    *   [x] **Identify Obsolete JWT Variables:** Locate Joi schema definitions and exports for `JWT_SECRET`, `JWT_EXPIRES_IN`, and `REFRESH_TOKEN_EXPIRES_IN`.
    *   [x] **Remove from Joi Schema:** Delete these variables from the `envSchema`.
    *   [x] **Remove from Exports:** Delete these properties from the exported `auth` object within the module.
    *   [x] **Documentation/External Update:** Make a note to recommend removing these variables from all `.env` files (`.env.example`, `.env`, `.env.development`, `.env.test`) to prevent confusion.

2.  **File: `backend/config/config.js`**
    *   [x] **Identify Obsolete JWT Config:** Locate the `jwt` object containing `secret` and `expiresIn`.
    *   [x] **Remove JWT Object:** Delete the entire `jwt` object from the main exported `config`.
    *   [x] **Update Comments:** Review and update any comments in the file that might refer to the old JWT configuration, clarifying that Supabase now manages JWTs.

---

## Phase 2: Service-Level RLS Scoping

**Goal:** Ensure all services accessing user-specific Supabase data use JWT-scoped clients to respect Row Level Security.

1.  **File: `backend/services/supabase.js` (Helper Function)**
    *   [x] **Add `getSupabaseClientWithToken` Helper:**
        *   Implement a new function `getSupabaseClientWithToken(jwtToken)` that takes a JWT string.
        *   This function should call `createSupabaseClient` (from `backend/config/supabase.js`) internally, passing the `jwtToken` to it.
        *   It should throw an error or return an anonymous client (with a warning log) if `jwtToken` is not provided.
        *   Export this new helper function.
    *   [x] **Modify `backend/config/supabase.js` - `createSupabaseClient` Function:**
        *   Update the `createSupabaseClient` function to accept an optional `jwtToken` parameter.
        *   If `jwtToken` is provided, configure the Supabase client instance's global headers to include `Authorization: \`Bearer ${jwtToken}\``. This ensures the client is scoped for RLS.
        *   If `jwtToken` is NOT provided, it should behave as before (creating an admin/anon client based on `useServiceRole`).
    *   [x] **Documentation:** Add JSDoc comments to `getSupabaseClient()` clarifying it returns an anonymous-key client by default, and to `getSupabaseClientWithToken()` explaining its RLS-scoping purpose.

2.  **File: `backend/services/nutrition-service.js`**
    *   [x] **Identify Impacted Functions:** Review all functions that interact with Supabase for user-specific data (e.g., `getNutritionPlanByUserId`, `createOrUpdateNutritionPlan`, `getDietaryPreferences`, `createOrUpdateDietaryPreferences`, `logMeal`, `getMealLogs`).
    *   [x] **Modify Function Signatures:** Update each impacted function to accept `jwtToken` as a parameter.
    *   [x] **Update Supabase Client Instantiation:** Replace calls to the generic `getSupabaseClient()` or direct `createClient()` with calls to the new `getSupabaseClientWithToken(jwtToken)` helper from `services/supabase.js` (or directly use `createClient` with the JWT header pattern if the helper isn't centralized yet).
    *   [x] **Controller Update Prerequisite:** Note that `backend/controllers/nutrition.js` will need to be updated to pass the `jwtToken` to these service methods.

3.  **File: `backend/services/profile-service.js`**
    *   [x] **Identify Impacted Functions:** Review functions like `getProfileByUserId`, `createProfile`, `updateProfile`, `getProfilePreferences`, `updateProfilePreferences`.
    *   [x] **Modify Function Signatures:** Update each to accept `jwtToken`.
    *   [x] **Update Supabase Client Instantiation:** Replace generic client initializations with `getSupabaseClientWithToken(jwtToken)`.
    *   [x] **Controller Update Prerequisite:** Note that `backend/controllers/profile.js` will need to pass the `jwtToken`.

---

## Phase 3: Controller and Agent RLS Scoping

**Goal:** Ensure controllers correctly provide context for RLS to services and agents.

1.  **File: `backend/controllers/nutrition.js`**
    *   [x] **Review Service Calls:** Identify all calls to `nutritionService` methods.
    *   [x] **Pass JWT Token:** Modify these calls to pass the `jwtToken` (extracted from `req.headers.authorization`) to the service methods as per the updated service signatures.
    *   [x] **Agent Instantiation:**
        *   When instantiating `NutritionAgent`, ensure the `supabase` client provided to its constructor is an RLS-scoped client.
        *   Extract `jwtToken` from `req.headers.authorization`.
        *   Create an RLS-scoped Supabase client: `const agentScopedSupabase = getSupabaseClientWithToken(jwtToken);` (assuming helper is ready).
        *   Pass `agentScopedSupabase` to the `NutritionAgent` constructor.

2.  **File: `backend/controllers/profile.js`**
    *   [x] **Review Service Calls:** Identify all calls to `profileService` methods.
    *   [x] **Pass JWT Token:** Modify these calls to pass the `jwtToken` to the service methods.

3.  **File: `backend/agents/nutrition-agent.js` (and other relevant agents)**
    *   [x] **Review Supabase Client Usage:** Confirm that all database operations performed via `this.supabase` will use the client instance passed during construction.
    *   [x] **Verify Constructor Documentation (Recommendation):** Add/update JSDoc for agent constructors to state that the `supabase` client parameter is expected to be RLS-scoped if the agent handles user-specific data. (No code change, but good practice).

---

## Phase 4: Middleware and Routes Review

**Goal:** Verify remaining middleware and routes are compatible with the auth changes.

1.  **File: `backend/middleware/rateLimit.js`**
    *   [x] **Verify `req.user` Usage:** Confirm that `keyGenerator` functions using `req.user?.id` or `req.user?.sub` are consistent with the structure of `req.user` as populated by the refactored `authenticate` middleware (which uses `supabaseUser.id`, `supabaseUser.role`, etc.). `req.user.id` should be the correct field.

2.  **File: `backend/middleware/security.js` - `csrfProtection`**
    *   [x] **Evaluate CSRF Relevance:**
        *   Investigate if the frontend relies on cookie-based sessions for API authentication.
        *   If authentication is purely token-based (Bearer tokens in headers), evaluate if the current double-submit cookie CSRF protection is necessary or effective for the API endpoints.
        *   **Decision Point:** Based on the above, decide whether to keep, modify, or remove/replace CSRF protection for API routes. *No code change in this step; this is for analysis and future decision.*

3.  **File: `backend/middleware/error-middleware.js` (or `errorHandler.js`)**
    *   [x] **Review Error Handling:** Ensure that errors originating from Supabase client (especially auth errors like invalid JWT when `authenticate` calls `supabase.auth.getUser()`) are handled gracefully and result in appropriate HTTP status codes (e.g., 401). The current `authenticate` middleware seems to handle this directly for many cases.
    *   [x] Verify `supabaseErrorHandler` in `errorHandler.js` (if used) correctly interprets any new error structures from Supabase.

4.  **File: `backend/routes/v1/health.js` - `/supabase` Endpoint**
    *   [x] **Clarify Health Check Scope:** Add comments to explain that `getSupabaseClient()` tests anonymous connectivity, while the fallback tests direct DB connectivity (potentially with service role).
    *   [x] **No functional change required** due to auth refactoring itself, as it's for general service health.

5.  **General Controller Review (for token extraction)**
    *   [x] **Standardize Token Passing to Services:** While many controllers extract `userId` from `req.user` and `jwtToken` from headers, consider if `authenticate` middleware could attach the `tokenString` itself to `req.tokenString` after successful validation. This would provide a single, validated source of the token string for controllers to pass to services, reducing redundant parsing of `req.headers.authorization`. (This is an optional enhancement, not a direct fix from the auth refactor).

---

## Phase 5: Additional File Revisions for RLS and Agent Scoping

**Goal:** Ensure all remaining services, controllers, and agents correctly use RLS-scoped Supabase clients where necessary and align with the refactored authentication flow.

1.  **File: `backend/controllers/workout.js`**
    *   **Functions to Revise:** `generateWorkoutPlan`, `adjustWorkoutPlan`
    *   **Plan:**
        *   In both functions, after extracting `jwtToken` (e.g., `const jwtToken = req.headers.authorization?.split(' ')[1];`), create an RLS-scoped Supabase client instance.
            ```javascript
            // const { createClient } = require('@supabase/supabase-js'); // Ensure this is imported
            // const supabaseRLSClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
            //   global: { headers: { Authorization: `Bearer ${jwtToken}` } },
            // });
            // OR if using a centralized helper:
            // const supabaseRLSClient = getSupabaseClientWithToken(jwtToken); 
            ```
        *   When instantiating `WorkoutGenerationAgent` (in `generateWorkoutPlan`) and `PlanAdjustmentAgent` (in `adjustWorkoutPlan`):
            *   Pass the `supabaseRLSClient` to their constructors as the `supabaseClient` argument.
            *   Ensure the `memorySystem` passed to these agents is also initialized with this `supabaseRLSClient` if the agent's memory operations are user-specific. This might look like:
                ```javascript
                // Example for instantiating AgentMemorySystem for an agent
                // const AgentMemorySystem = require('../agents/memory/core'); // Adjust path as needed
                // const userScopedMemorySystem = new AgentMemorySystem({ 
                //     supabase: supabaseRLSClient, 
                //     openai: openaiService, // openaiService needs to be available
                //     logger 
                // });
                //
                // const agent = new WorkoutGenerationAgent({ 
                //     openaiService, 
                //     supabaseClient: supabaseRLSClient,
                //     memorySystem: userScopedMemorySystem, 
                //     logger 
                // });
                ```
        *   **Justification:** Agents performing DB operations (directly or via memory) on user-specific data need an RLS-scoped client.

2.  **File: `backend/services/macro-service.js`**
    *   **Function to Revise:** `calculateMacros`
    *   **Plan:**
        *   The `calculateMacros` function in `macro-service.js` calls `getNutritionAgent()`. This factory function needs to ensure the `NutritionAgent` instance it returns is configured with an RLS-scoped Supabase client.
        *   The `jwtToken` is available in the calling controller (`backend/controllers/macros.js`). This token must be passed to `macroService.calculateMacros`.
        *   `macroService.calculateMacros` must then use this `jwtToken` when obtaining/configuring the `NutritionAgent` (e.g., by passing the token to `getNutritionAgent`, which then uses it to create an RLS-scoped client for the agent).
            ```javascript
            // In macroService.calculateMacros(userInfo, useExternalApi, jwtToken)
            // const nutritionAgent = getNutritionAgent({ jwtToken }); // Hypothetical modification to factory
            // OR if NutritionAgent is instantiated directly here:
            // const supabaseRLSClient = getSupabaseClientWithToken(jwtToken);
            // const nutritionAgent = new NutritionAgent({ openai, supabase: supabaseRLSClient, logger });
            ```
        *   **Justification:** `NutritionAgent` performs user-specific operations and was already refactored to accept an RLS-scoped client. The service calling it must ensure this is provided.

3.  **File: `backend/middleware/security.js`**
    *   **Function to Review:** `csrfProtection`, `setupSecurityMiddleware`
    *   **Plan:**
        *   **Review CSRF Necessity:** Evaluate if the `csrfProtection` middleware is still required for API routes now that they are primarily protected by JWT Bearer tokens. CSRF is mainly a concern for cookie-based session management.
        *   If all state-changing API endpoints rely solely on Bearer tokens and do not use cookies for session authentication, this CSRF middleware might be redundant for those routes.
        *   **Action:** If deemed unnecessary for JWT-protected API routes, consider removing its application from such routes in `setupSecurityMiddleware` or making its application conditional. No immediate code change, but mark for architectural decision.
    *   **Justification:** Align security measures with the actual authentication mechanisms in use.

4.  **File: `backend/services/workout-log-service.js` and `backend/services/workout-service.js`**
    *   **Issue:** Both define a local `getSupabaseClientWithJWT` helper.
    *   **Plan (Code Quality/Consistency):**
        *   Modify these files to import and use the centralized `getSupabaseClientWithToken` function from `backend/services/supabase.js`.
        *   Remove the local `getSupabaseClientWithJWT` helper from these files.
    *   **Justification:** Ensures consistency in how RLS-scoped clients are created and reduces code duplication.

5.  **Agents using `memorySystem` (General Requirement)**
    *   **Files:** All agents inheriting from `BaseAgent` (`NutritionAgent`, `PlanAdjustmentAgent`, `ResearchAgent`, `WorkoutGenerationAgent`).
    *   **Context:** `BaseAgent` uses `this.memorySystem` for memory operations. `AgentMemorySystem` (from `backend/agents/memory/core.js`) is the typical implementation for `memorySystem` and its constructor accepts a `supabase` client.
    *   **Plan:**
        *   This is an overarching principle: When any controller instantiates an agent that will perform user-specific memory operations, the `AgentMemorySystem` instance passed to that agent (or used by its `BaseAgent` parent) *must* be initialized with an RLS-scoped Supabase client (created using the user's JWT).
        *   This was explicitly noted for `WorkoutGenerationAgent` and `PlanAdjustmentAgent` in point 1 (controller revisions). This item serves as a general reminder for any other agent instantiations.
    *   **Justification:** Ensures all user-specific data access through the memory system respects RLS policies.

---

## Phase 6: Testing and Validation

**Goal:** Ensure all changes are thoroughly tested.

1.  [ ] **Update Unit Tests:**
    *   Adjust tests for services (`nutrition-service.js`, `profile-service.js`, `macro-service.js`, `workout-service.js`, `workout-log-service.js`, `check-in-service.js`, `notification-service.js`, `export-service.js`, `import-service.js`) to mock/provide JWTs and RLS-scoped Supabase clients where RLS-dependent logic is tested.
    *   Update tests for controllers (`controllers/nutrition.js`, `controllers/profile.js`, `controllers/workout.js`, `controllers/macros.js`, etc.) to mock `req.headers.authorization` and ensure correct passing of JWTs or RLS-scoped clients to services/agents.
    *   Update tests for agents (`NutritionAgent`, `PlanAdjustmentAgent`, `WorkoutGenerationAgent`, `ResearchAgent`) to ensure they correctly utilize RLS-scoped Supabase clients (either directly or via a memory system) when performing user-specific operations.
    *   Remove or update tests related to obsolete JWT utilities and configurations (e.g., from `backend/utils/jwt.js`).

2.  [ ] **Update Integration Tests:**
    *   Ensure integration tests for all authenticated endpoints correctly simulate passing valid Supabase JWTs.
    *   Test RLS by attempting to access/modify data for `user_A` while authenticated as `user_B`. These attempts should fail as per RLS policies across all relevant services (profiles, workouts, logs, nutrition, macros, etc.).
    *   Test scenarios where JWTs are missing, invalid, or expired for all protected endpoints.
    *   Verify agent behavior with RLS: e.g., an agent operating for `user_A` should not be able to access or modify `user_B`'s data through its Supabase client or memory system.

3.  [ ] **Manual End-to-End Testing:**
    *   Perform manual tests for all critical user flows involving authentication and data access to verify RLS behavior. This includes:
        *   Profile creation, viewing, and updating.
        *   Workout plan generation, viewing, adjustment, and deletion.
        *   Workout logging.
        *   Macro calculation and viewing.
        *   Notification preference updates.
        *   Data export/import.
        *   Check-in recording and viewing.

---

This plan provides a structured approach to revising the remaining parts of the backend impacted by the authentication refactoring. Each step includes a checkbox for tracking progress.
