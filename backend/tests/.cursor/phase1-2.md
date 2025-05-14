# Test Coverage Improvement Tracking

This document serves as a working checklist to track our progress in improving test coverage based on our coverage improvement plan.

## Current Coverage Metrics

- [ ] **Statements**: 37.72% → 38.93% → 40.57% → 54.21% → 55.38% → 58.97% → 63.72%
- [ ] **Branches**: 30.55% → 32.1% → 34.28% → 41.29% → 41.38% → 44.62% → 47.9%
- [ ] **Functions**: 41.14% → 41.95% → 45.14% → 54.62% → 59.1% → 61.26% → 65.18%
- [ ] **Lines**: 38.19% → 39.46% → 41.36% → 58.49% → 55.65% → 59.08% → 64.1%

Last updated: April 29, 2025

## Phase 1: Critical Security Components (Week 1)

### JWT Utils
- [x] Test token generation
- [x] Test token validation
- [x] Test token refresh
- [x] Test token blacklisting
- [x] Sufficient coverage
  | Statements |  Branches  |  Functions  |     Lines    |
  | :--------: |  :------:  |  :-------:  |     :---:    |
  | [x] 86.52% | [ ] 61.83% | [x] 88.67%  |  [x] 87.80%  |

### Sanitization Utils
- [x] Test input validation
- [x] Test XSS protection
- [x] Test SQL injection protection
- [x] Sufficient coverage
  | Statements |  Branches  |  Functions  |     Lines    |
  | :--------: |  :------:  |  :-------:  |     :---:    |
  | [x] 96.24% | [x] 84.09% | [x] 93.75%  |  [x] 95.88%  |

### Error Handling Utils
- [x] Test error classes
- [x] Test error formatting
- [x] Test error categorization
- [x] Sufficient coverage
  |  Statements |  Branches  |  Functions  |     Lines    |
  |  :--------: |  :------:  |  :-------:  |     :---:    |
  | [x] 100.00% | [x] 98.59% | [x] 100.00% | [x] 100.00%  |

### Security Middleware
- [x] Test authentication middleware
- [x] Test authorization middleware
- [x] Test CSRF protection
- [x] Test rate limiting
- [x] Sufficient coverage
  | Statements |  Branches  |  Functions  |     Lines    |
  | :--------: |  :------:  |  :-------:  |     :---:    |
  | [x] 93.20% | [x] 88.39% | [x] 94.11% |  [x] 91.72%  |

### Rate Limit Middleware
- [x] Test createRateLimiter
- [x] Test createAuthLimiter
- [x] Test createApiLimiter
- [x] Test createWorkoutGenLimiter
- [x] Test createAiOperationLimiter
- [x] Test authLimiters
- [x] Test apiLimiters
- [x] Sufficient coverage
  | Statements |  Branches  |  Functions  |     Lines    |
  | :--------: |  :------:  |  :-------:  |     :---:    |
  | [x] 100%   | [x] 90.62% | [x] 100%   |  [x] 100%    |

### Auth Middleware
- [x] Test requireRole 
- [x] Test requireAdmin
- [x] Test requireOwnership
- [x] Test optionalAuth
- [x] Sufficient coverage (Auth.js now has excellent coverage)
  | Statements |  Branches  |  Functions  |     Lines    |
  | :--------: |  :------:  |  :-------:  |     :---:    |
  | [x] 99.61% | [x] 91.91% | [x] 100%   |  [x] 99.53%  |

## Phase 2: High-Usage Components (Week 2)

### Controllers (Target: 80% Statements/Functions, 70% Branches)
*   **`macros.js`** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock `macroService` methods (`calculateMacros`, `storeMacros`, `retrieveMacros`, `retrieveLatestMacros`, `updateMacroPlan`).
    *   Mock `logger`.
    *   Mock Express `req` (with `user.id`, `headers.authorization`, `body`, `query`, `params`) and `res` (with `status`, `json`, `send`).
    *   Mock Error classes (`BadRequestError`, `NotFoundError`, `DatabaseError`).
    *   [x] `calculateMacros`: 
        *   [x] Success: Service returns macros, controller calls `storeMacros`, returns 201 with correct data.
        *   [ ] Auth Error: Simulate missing `req.user` or `req.headers.authorization` (depends on auth middleware, test controller assuming auth passes).
        *   [x] Service Error (BadRequest): `calculateMacros` throws `BadRequestError`, returns 400.
        *   [x] Service Error (Generic): `calculateMacros` throws generic error, returns 500.
        *   [x] Service Error (Store): `storeMacros` throws error after `calculateMacros` succeeds, returns 500.
    *   [x] `storeMacros`: 
        *   [x] Success: Service stores macros, returns 201 with `planId`.
        *   [ ] Auth Error: Simulate missing `req.user` or `req.headers.authorization`.
        *   [x] Service Error (BadRequest): `storeMacros` throws `BadRequestError`, returns 400.
        *   [x] Service Error (Database): `storeMacros` throws `DatabaseError`, returns 500.
        *   [x] Service Error (Generic): `storeMacros` throws generic error, returns 500.
    *   [x] `getMacros`: 
        *   [x] Success: Service returns data and pagination, returns 200.
        *   [x] Success (Pagination): Test different `page`/`pageSize` query params.
        *   [x] Success (Filters): Test `startDate`, `endDate`, `status` query params.
        *   [ ] Auth Error: Simulate missing `req.user` or `req.headers.authorization`.
        *   [x] Service Error (NotFound): `retrieveMacros` throws `NotFoundError`, returns 404.
        *   [x] Service Error (Database): `retrieveMacros` throws `DatabaseError`, returns 500.
        *   [x] Service Error (Generic): `retrieveMacros` throws generic error, returns 500.
    *   [x] `getLatestMacros`: 
        *   [x] Success: Service returns latest macros, returns 200.
        *   [ ] Auth Error: Simulate missing `req.user` or `req.headers.authorization`.
        *   [x] Service Error (NotFound): `retrieveLatestMacros` throws `NotFoundError`, returns 404.
        *   [x] Service Error (Database): `retrieveLatestMacros` throws `DatabaseError`, returns 500.
        *   [x] Service Error (Generic): `retrieveLatestMacros` throws generic error, returns 500.
    *   [x] `updateMacros`: 
        *   [x] Success: Service updates plan, returns 200.
        *   [ ] Auth Error: Simulate missing `req.user` or `req.headers.authorization`.
        *   [ ] Missing Param: Simulate missing `req.params.planId`. (Typically handled by router setup, verify if controller needs check).
        *   [x] Service Error (NotFound): `updateMacroPlan` throws `NotFoundError`, returns 404.
        *   [x] Service Error (BadRequest): `updateMacroPlan` throws `BadRequestError`, returns 400.
        *   [x] Service Error (Database): `updateMacroPlan` throws `DatabaseError`, returns 500.
        *   [x] Service Error (Generic): `updateMacroPlan` throws generic error, returns 500.
*   **`check-in.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock `checkInService` methods (`storeCheckIn`, `retrieveCheckIns`, `retrieveCheckIn`, `computeMetrics`).
    *   Mock `logger`.
    *   Mock Express `req` (with `user.id`, `headers.authorization`, `body`, `query`, `params`) and `res` (with `status`, `json`).
    *   Mock Error classes (`BadRequestError`, `NotFoundError`, `DatabaseError`).
    *   [x] `recordCheckIn`:
        *   [x] Success: Service stores check-in, returns 201 with data.
        *   [ ] Auth Error: Simulate missing `req.user` or `req.headers.authorization` (controller assumes auth passes).
        *   [x] Service Error (BadRequest): `storeCheckIn` throws `BadRequestError`, returns 400.
        *   [x] Service Error (Database): `storeCheckIn` throws `DatabaseError`, returns 500.
        *   [x] Service Error (Generic): `storeCheckIn` throws generic error, returns 500.
    *   [x] `getCheckIns`:
        *   [x] Success: Service returns data and pagination, returns 200.
        *   [x] Success (Filters): Test `startDate`, `endDate` query params.
        *   [x] Success (Pagination): Test `limit`, `offset` query params.
        *   [ ] Auth Error: Simulate missing `req.user` or `req.headers.authorization`.
        *   [x] Service Error (BadRequest): `retrieveCheckIns` throws `BadRequestError`, returns 400.
        *   [x] Service Error (Generic): `retrieveCheckIns` throws generic error, returns 500.
    *   [x] `getCheckIn`:
        *   [x] Success: Service returns check-in data, returns 200.
        *   [x] Missing Param: `req.params.checkInId` is missing/undefined, returns 400.
        *   [ ] Auth Error: Simulate missing `req.user` or `req.headers.authorization`.
        *   [x] Service Error (BadRequest): `retrieveCheckIn` throws `BadRequestError`, returns 400.
        *   [x] Service Error (NotFound): `retrieveCheckIn` throws `NotFoundError`, returns 404.
        *   [x] Service Error (Generic): `retrieveCheckIn` throws generic error, returns 500.
    *   [x] `calculateMetrics`:
        *   [x] Success: Service computes metrics, returns 200 with data.
        *   [ ] Auth Error: Simulate missing `req.user` or `req.headers.authorization`.
        *   [x] Service Error (BadRequest): `computeMetrics` throws `BadRequestError`, returns 400.
        *   [x] Service Error (Generic): `computeMetrics` throws generic error, returns 500.
*   **`workout.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock `workoutService` methods (`storeWorkoutPlan`, `retrieveWorkoutPlans`, `retrieveWorkoutPlan`, `updateWorkoutPlan`, `removeWorkoutPlan`).
    *   Mock `WorkoutGenerationAgent.process`.
    *   Mock `PlanAdjustmentAgent.process`.
    *   Mock `logger`.
    *   Mock Express `req` (with `user.id`, `headers.authorization`, `body`, `query`, `params`) and `res` (with `status`, `json`, `send`).
    *   Mock Error classes (`NotFoundError`, `DatabaseError`, `ApplicationError`).
    *   [x] `generateWorkoutPlan`:
        *   [x] Success: Agent generates plan, service stores it, returns 201 with saved plan.
        *   [x] Auth Error: Missing `userId`, returns 401.
        *   [x] Auth Error: Missing `jwtToken`, returns 401.
        *   [x] Agent Error: `WorkoutGenerationAgent.process` returns null/falsy, throws `ApplicationError`, returns 500.
        *   [x] Agent Error: `WorkoutGenerationAgent.process` throws error, returns 500.
        *   [x] Service Error: `storeWorkoutPlan` throws error, returns 500.
    *   [x] `getWorkoutPlans`:
        *   [x] Success: Service returns plans, returns 200 with data.
        *   [x] Success (Filters): Test with various `req.query` filters (assuming middleware validation).
        *   [x] Auth Error: Missing `userId`, returns 401.
        *   [x] Auth Error: Missing `jwtToken`, returns 401.
        *   [x] Service Error (Database): `retrieveWorkoutPlans` throws `DatabaseError`, returns 500.
        *   [x] Service Error (Generic): `retrieveWorkoutPlans` throws generic error, returns 500.
    *   [x] `getWorkoutPlan`:
        *   [x] Success: Service returns plan, returns 200 with data.
        *   [x] Auth Error: Missing `userId`, returns 401.
        *   [x] Auth Error: Missing `jwtToken`, returns 401.
        *   [x] Missing Param: `req.params.planId` is missing, returns 400.
        *   [x] Service Error (NotFound): `retrieveWorkoutPlan` throws `NotFoundError`, returns 404.
        *   [x] Service Error (Database): `retrieveWorkoutPlan` throws `DatabaseError`, returns 500.
        *   [x] Service Error (Generic): `retrieveWorkoutPlan` throws generic error, returns 500.
    *   [x] `adjustWorkoutPlan`:
        *   [x] Success: Service retrieves plan, agent adjusts it, service updates it, returns 200 with updated plan.
        *   [x] Auth Error: Missing `userId`, returns 401.
        *   [x] Auth Error: Missing `jwtToken`, returns 401.
        *   [x] Missing Param: `req.params.planId` is missing, returns 400.
        *   [x] Service Error (Retrieve NotFound): `retrieveWorkoutPlan` throws `NotFoundError`, returns 404.
        *   [x] Agent Error: `PlanAdjustmentAgent.process` returns null/falsy, throws `ApplicationError`, returns 500.
        *   [x] Agent Error: `PlanAdjustmentAgent.process` throws error, returns 500.
        *   [x] Service Error (Update Database): `updateWorkoutPlan` throws `DatabaseError`, returns 500.
        *   [x] Service Error (Update Generic): `updateWorkoutPlan` throws generic error, returns 500.
    *   [x] `deleteWorkoutPlan`:
        *   [x] Success: Service deletes plan, returns 204.
        *   [x] Auth Error: Missing `userId`, returns 401.
        *   [x] Auth Error: Missing `jwtToken`, returns 401.
        *   [x] Missing Param: `req.params.planId` is missing, returns 400.
        *   [x] Service Error (NotFound): `removeWorkoutPlan` throws `NotFoundError`, returns 404.
        *   [x] Service Error (Database): `removeWorkoutPlan` throws `DatabaseError`, returns 500.
        *   [x] Service Error (Generic): `removeWorkoutPlan` throws generic error, returns 500.
*   **`workout-log.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock `workoutLogService` methods (`storeWorkoutLog`, `retrieveWorkoutLogs`, `retrieveWorkoutLog`, `updateWorkoutLog`, `deleteWorkoutLog`).
    *   Mock `logger`.
    *   Mock Express `req` (with `user.id`, `headers.authorization`, `body`, `query`, `params`) and `res` (with `status`, `json`).
    *   Mock Error classes (`NotFoundError`, `DatabaseError`).
    *   [x] `createWorkoutLog`:
        *   [x] Success: Service stores log, returns 201 with saved log data.
        *   [x] Auth Error: Missing `userId`, returns 401.
        *   [x] Auth Error: Missing `jwtToken`, returns 401.
        *   [x] Service Error (Database): `storeWorkoutLog` throws `DatabaseError`, returns 500.
        *   [x] Service Error (Generic): `storeWorkoutLog` throws generic error, returns 500.
    *   [x] `getWorkoutLogs`:
        *   [x] Success: Service returns logs, returns 200 with data.
        *   [x] Success (Filters): Test with various `req.query` filters (assuming middleware validation).
        *   [x] Auth Error: Missing `userId`, returns 401.
        *   [x] Auth Error: Missing `jwtToken`, returns 401.
        *   [x] Service Error (Database): `retrieveWorkoutLogs` throws `DatabaseError`, returns 500.
        *   [x] Service Error (Generic): `retrieveWorkoutLogs` throws generic error, returns 500.
    *   [x] `getWorkoutLog`:
        *   [x] Success: Service returns log, returns 200 with data.
        *   [x] Auth Error: Missing `userId`, returns 401.
        *   [x] Auth Error: Missing `jwtToken`, returns 401.
        *   [x] Missing Param: `req.params.logId` is missing, returns 400.
        *   [x] Service Error (NotFound): `retrieveWorkoutLog` throws `NotFoundError`, returns 404.
        *   [x] Service Error (Database): `retrieveWorkoutLog` throws `DatabaseError`, returns 500.
        *   [x] Service Error (Generic): `retrieveWorkoutLog` throws generic error, returns 500.
    *   [x] `updateWorkoutLog`:
        *   [x] Success: Service updates log, returns 200 with updated data.
        *   [x] Auth Error: Missing `userId`, returns 401.
        *   [x] Auth Error: Missing `jwtToken`, returns 401.
        *   [x] Missing Param: `req.params.logId` is missing, returns 400.
        *   [x] Service Error (NotFound): `updateWorkoutLog` throws `NotFoundError`, returns 404.
        *   [x] Service Error (Database): `updateWorkoutLog` throws `DatabaseError`, returns 500.
        *   [x] Service Error (Generic): `updateWorkoutLog` throws generic error, returns 500.
    *   [x] `deleteWorkoutLog`:
        *   [x] Success: Service deletes log, returns 200.
        *   [x] Auth Error: Missing `userId`, returns 401.
        *   [x] Auth Error: Missing `jwtToken`, returns 401.
        *   [x] Missing Param: `req.params.logId` is missing, returns 400.
        *   [x] Service Error (NotFound): `deleteWorkoutLog` throws `NotFoundError`, returns 404.
        *   [x] Service Error (Database): `deleteWorkoutLog` throws `DatabaseError`, returns 500.
        *   [x] Service Error (Generic): `deleteWorkoutLog` throws generic error, returns 500.
*   **`nutrition.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock `nutritionService` methods (`createOrUpdateNutritionPlan`, `getNutritionPlanByUserId`, `getDietaryPreferences`, `createOrUpdateDietaryPreferences`, `logMeal`, `getMealLogs`).
    *   Mock `NutritionAgent.process`.
    *   Mock `logger`.
    *   Mock Express `req` (with `user.id`, `body`, `query`, `params`) and `res` (with `status`, `json`) and `next` function.
    *   Mock Error classes (`ValidationError`, `NotFoundError`).
    *   [x] `calculateMacros`:
        *   [x] Success: Agent processes, service saves, returns 200 with saved plan.
        *   [x] Auth Error: Missing `req.user.id`, returns 400.
        *   [x] Validation Error: Missing `req.body.goals`, returns 400.
        *   [x] Validation Error: Empty `req.body.goals` array, returns 400.
        *   [x] Validation Error: Missing `req.body.activityLevel`, returns 400.
        *   [x] Agent Error: `nutritionAgent.process` throws `ValidationError`, returns 400.
        *   [x] Agent Error: `nutritionAgent.process` throws `NotFoundError`, returns 404.
        *   [x] Agent Error: `nutritionAgent.process` throws generic error, calls `next`.
        *   [x] Service Error: `createOrUpdateNutritionPlan` throws `ValidationError`, returns 400.
        *   [x] Service Error: `createOrUpdateNutritionPlan` throws generic error, calls `next`.
    *   [x] `getNutritionPlan`:
        *   [x] Success: Service returns plan, returns 200 with data.
        *   [x] Success (from params): `req.params.userId` used when `req.user` is missing.
        *   [x] Auth/Param Error: Missing both `req.user.id` and `req.params.userId`, returns 400.
        *   [x] Service Error (NotFound): `getNutritionPlanByUserId` throws `NotFoundError`, returns 404.
        *   [x] Service Error (Generic): `getNutritionPlanByUserId` throws generic error, calls `next`.
    *   [x] `getDietaryPreferences`:
        *   [x] Success: Service returns preferences, returns 200 with data.
        *   [x] Auth Error: Missing `req.user.id`, returns 400.
        *   [x] Service Error (NotFound): `getDietaryPreferences` throws `NotFoundError`, returns 404.
        *   [x] Service Error (Generic): `getDietaryPreferences` throws generic error, calls `next`.
    *   [x] `updateDietaryPreferences`:
        *   [x] Success: Service updates preferences, returns 200 with updated data.
        *   [x] Auth Error: Missing `req.user.id`, returns 400.
        *   [x] Service Error (Validation): `createOrUpdateDietaryPreferences` throws `ValidationError`, returns 400.
        *   [x] Service Error (Generic): `createOrUpdateDietaryPreferences` throws generic error, calls `next`.
    *   [x] `logMeal`:
        *   [x] Success: Service logs meal, returns 201 with created log data.
        *   [x] Auth Error: Missing `req.user.id`, returns 400.
        *   [x] Service Error (Validation): `logMeal` throws `ValidationError`, returns 400.
        *   [x] Service Error (Generic): `logMeal` throws generic error, calls `next`.
    *   [x] `getMealLogs`:
        *   [x] Success: Service returns logs, returns 200 with data.
        *   [x] Success (Filters): Test with `startDate`, `endDate` in `req.query`.
        *   [x] Auth Error: Missing `req.user.id`, returns 400.
        *   [x] Service Error (Validation): `getMealLogs` throws `ValidationError`, returns 400.
        *   [x] Service Error (Generic): `getMealLogs` throws generic error, calls `next`.
*   **`auth.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock `createSupabaseClient` and its returned client methods (`auth.signUp`, `auth.signInWithPassword`, `from(...).insert`, `from(...).select`, `from(...).delete`).
    *   Mock `logger`.
    *   Mock `jwt` utils (`generateToken`, `generateRefreshToken`, `verifyRefreshToken`, `verifyToken`).
    *   Mock Express `req` (with `body`, `ip`, `connection.remoteAddress`, `headers.authorization`, `cookies.refreshToken`, `user`) and `res` (with `status`, `json`) and `next` function.
    *   Mock Error classes (`ValidationError`, `AuthenticationError`, `ConflictError`, `InternalError`).
    *   Utilize internal test helpers (`__test__clearLoginAttempts`, `__test__getLoginAttempts`) for rate limiting tests.
    *   [ ] `Rate Limiting Logic` (Internal):
        *   [ ] Test `checkLoginRateLimit`: First attempt, subsequent attempts below limit, reaching limit, exceeding limit (throws error), reset after window.
        *   [ ] Test `incrementLoginAttempts`: Increments count correctly, triggers `clearLoginAttempts` at max.
        *   [ ] Test `clearLoginAttempts`: Deletes entry after timeout (requires `jest.useFakeTimers`).
    *   [x] `signup`:
        *   [x] Success: Supabase signup succeeds, profile insert succeeds, returns 201 with userId.
        *   [x] Success (Profile Exists): Supabase signup succeeds, profile insert returns duplicate error (ignored), returns 201.
        *   [x] Success (Profile Error): Supabase signup succeeds, profile insert throws non-duplicate error (logged), returns 201.
        *   [x] Validation Error: Missing `email`, throws `ValidationError`, handled by `next`.
        *   [x] Validation Error: Missing `password`, throws `ValidationError`, handled by `next`.
        *   [x] Supabase Auth Error (Conflict): `auth.signUp` returns 'already registered' error, throws `ConflictError`, handled by `next`.
        *   [x] Supabase Auth Error (Generic): `auth.signUp` returns other error, throws `InternalError`, handled by `next`.
    *   [x] `login`:
        *   [x] Success (No RememberMe): Supabase signin succeeds, `rememberMe` is false, returns 200 with `jwtToken` only.
        *   [x] Success (RememberMe): Supabase signin succeeds, `rememberMe` is true, attempts to store refresh token, returns 200 with `jwtToken` and `refreshToken`.
        *   [x] Success (RememberMe, Store Fails): Supabase signin succeeds, `rememberMe` is true, refresh token store fails (logged), returns 200 with tokens.
        *   [x] Validation Error: Missing `email`, throws `ValidationError`, handled by `next`.
        *   [x] Validation Error: Missing `password`, throws `ValidationError`, handled by `next`.
        *   [x] Supabase Auth Error: `auth.signInWithPassword` fails, increments rate limit, throws `AuthenticationError`, handled by `next`.
        *   [x] Rate Limit Error: Exceed max login attempts, `checkLoginRateLimit` throws error, handled by `next`.
    *   [x] `refreshToken`:
        *   [x] Success: Valid refresh token provided, verified by JWT, found in DB, returns 200 with new `jwtToken`.
        *   [x] Validation Error: Missing `refreshToken` in body, throws `ValidationError`, handled by `next`.
        *   [x] JWT Verification Error: `verifyRefreshToken` throws error, throws `AuthenticationError`, handled by `next`.
        *   [x] DB Error (Not Found): Supabase select returns error or no data, throws `AuthenticationError`, handled by `next`.
        *   [x] DB Error (Generic): Supabase select throws other DB error, handled by `next`.
    *   [x] `validateSession`:
        *   [x] Success: Valid 'Bearer' token in header, `verifyToken` succeeds, returns 200.
        *   [x] Auth Error: Missing `Authorization` header, returns 401.
        *   [x] Auth Error: Header does not start with 'Bearer ', returns 401.
        *   [x] JWT Verification Error: `verifyToken` throws error, returns 401.
        *   [ ] Generic Error: Unexpected error during processing, calls `next`.
    *   [x] `logout`:
        *   [x] Success (with req.user): Attempts DB delete, returns 200.
        *   [x] Success (with refreshToken cookie): Attempts DB delete, returns 200.
        *   [x] Success (with invalid refreshToken cookie): Logs info, returns 200.
        *   [x] Success (no user/token): Returns 200 without DB delete.
        *   [x] DB Error: Supabase delete fails (logged), returns 200.
        *   [ ] Generic Error: Unexpected error during processing, calls `next`.
*   **`data-transfer.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock `exportService` methods (`exportJSON`, `exportCSV`, `exportXLSX`, `exportPDF`).
    *   Mock `importService` methods (`importJSON`, `importCSV`, `importXLSX`).
    *   Mock `logger`.
    *   Mock `fs` methods (`readFileSync`, `unlinkSync`, `createReadStream`, `existsSync`).
    *   Mock Node.js `stream.Readable` for export stream testing (including emitting 'error').
    *   Mock Express `req` (with `user.id`, `headers.authorization`, `body`, `file` object) and `res` (with `status`, `json`, `setHeader`, `pipe`, `end`, `headersSent` flag) and `next` function.
    *   Mock Error classes (`ValidationError`, `DatabaseError`).
    *   [x] `exportData`:
        *   [x] Auth Error: Missing `userId`, returns 401.
        *   [x] Auth Error: Missing `jwtToken`, returns 401.
        *   [x] Validation Error: Missing `format`, returns 400.
        *   [x] Validation Error: Missing `dataTypes`, returns 400.
        *   [x] Validation Error: Empty `dataTypes` array, returns 400.
        *   [x] Validation Error: Invalid `dataTypes` provided, returns 400.
        *   [x] Success (JSON): Service returns data, sets headers, returns 200 with JSON.
        *   [x] Success (CSV): Service returns stream, sets headers, pipes stream to res.
        *   [x] Success (XLSX): Service returns stream, sets headers, pipes stream to res.
        *   [x] Success (PDF): Service returns stream, sets headers, pipes stream to res.
        *   [x] Unsupported Format: Invalid `format`, returns 400.
        *   [x] Stream Error: Service returns stream, stream emits 'error', logs error, ends response (if headers sent) or returns 500 (if headers not sent).
        *   [x] Service Error (JSON): `exportJSON` throws `ValidationError`/`DatabaseError`/Generic error, returns appropriate status (400/500).
        *   [x] Service Error (Streamed): Service method (e.g., `exportCSV`) throws error before returning stream, returns appropriate status (400/500).
    *   [x] `importData`:
        *   [x] Auth Error: Missing `userId`, returns 401.
        *   [x] Auth Error: Missing `jwtToken`, returns 401.
        *   [x] Validation Error: No `req.file` uploaded, returns 400.
        *   [x] Success (JSON): Reads file, parses JSON, service processes, cleans up file, returns 200 with results.
        *   [x] Success (CSV): Creates stream, service processes, cleans up file, returns 200 with results.
        *   [x] Success (XLSX): Service processes (using path), returns 200 with results (service handles cleanup).
        *   [x] Invalid JSON Format: `JSON.parse` fails, cleans up file, returns 400.
        *   [x] Unsupported File Type: Invalid `mimetype`, cleans up file, returns 400.
        *   [x] Service Error (JSON): `importJSON` throws `ValidationError`/`DatabaseError`/Generic error, cleans up file, returns appropriate status (400/500).
        *   [x] Service Error (CSV): `importCSV` throws error, cleans up file (if exists), returns appropriate status (400/500).
        *   [x] Service Error (XLSX): `importXLSX` throws error, returns appropriate status (400/500).
        *   [x] File Cleanup Error: `fs.unlinkSync` throws error during cleanup (logged, does not affect response).
*   [x] **Overall Controller Coverage**
  | Statements |  Branches  |  Functions  |     Lines    |
  | :--------: |  :------:  |  :-------:  |     :---:    |
  | [ ] 92.53% | [ ] 87.78% | [ ] 88.42%  |  [ ] 92.95%  |

*   **Successful Test Methods (Controllers):** Mocking direct dependencies (services, agents, utils like logger, errors) using `jest.mock()`. Creating mock Express `req`/`res`/`next` objects in `beforeEach` and customizing per test. Asserting `res.status().json()`/`res.send()`/`next()` calls accurately. Simulating various service layer or agent promise outcomes (resolve/reject with specific errors) to test controller logic and error mapping. Assuming successful middleware execution (e.g., auth) by providing necessary mock `req` properties (like `req.user`, `req.headers.authorization`). Using real error classes (by *not* mocking `utils/errors`) proved crucial for correct `instanceof` checks and `error.message` propagation. Mocking dependencies required by mocked modules (e.g., mocking `OpenAIService` and `getSupabaseClient` because the mocked `NutritionAgent` constructor needs them) is necessary even if the controller doesn't call them directly. Carefully mocking chained method calls (e.g., `supabase.from().delete().eq()`) by ensuring each step returns the next mocked object/function is essential. Using `jest.useFakeTimers()` at the suite level can resolve open handle warnings from internal `setTimeout` calls. Testing internal logic like rate limiting implicitly via the public interface (e.g., multiple failed logins) is a viable alternative to exporting internal helpers. **For streaming endpoints (like data export), mocking the service to return a mock `Readable` stream and asserting `res.setHeader` and `stream.pipe(res)` calls works well. Simulating stream errors via `mockStream.emit('error', ...)` combined with `process.nextTick` effectively tests error handlers. Mocking `req.file` and relevant `fs` methods (`readFileSync`, `createReadStream`, `unlinkSync`, `existsSync`) is necessary for testing file upload/import controllers.**
*   **Unsuccessful Test Methods (Controllers):** Encountered scoping issues when creating multiple describe blocks with shared mock objects (e.g., mockReq, mockRes) - fixed by recreating mock objects within each describe block or ensuring proper cleanup. Mocking the `utils/errors` module caused issues with `instanceof` checks and error property propagation; using real errors resolved this. Incorrectly asserting constructor calls for module-level instances within function-specific tests. Initial attempts at mocking chained calls by mocking only the final method sometimes failed; mocking the return value of each step in the chain proved more reliable. **Incorrectly asserting `next()` was called when the controller handles the error by sending a response (e.g., `res.status().json()`). Incorrectly asserting file cleanup (`fs.unlinkSync`) occurs in specific error paths where the code logic bypasses it (e.g., JSON parse error before cleanup call).**

### Services (Target: 80% Statements/Functions, 70% Branches)

#### Contract Tests
*   **`profile-service.js`**
    *   [x] `getProfileByUserId`: Found (200), Not Found (404), DB Error
    *   [x] `createProfile`: Success (201), Validation Error, DB Error
    *   [x] `updateProfile`: Success (200), Not Found (404), Validation Error, Conflict Error (retries), DB Error
    *   [x] `getProfilePreferences`: Found (200), Not Found (404), DB Error
    *   [x] `updateProfilePreferences`: Success (200), Not Found (404), Validation Error, DB Error
    *   [x] Helper functions (`validateProfileData`, `validatePreferenceData`, `prepareProfileDataForStorage`, `convertProfileUnitsForResponse`)
*   **`workout-service.js**
    *   [x] `storeWorkoutPlan`: Success, DB Error
    *   [x] `retrieveWorkoutPlans`: Success (with/without filters), DB Error
    *   [x] `retrieveWorkoutPlan`: Found, Not Found, DB Error
    *   [x] `updateWorkoutPlan`: Success, Not Found, Conflict Error (retries), DB Error (transaction)
    *   [x] `removeWorkoutPlan`: Success, Not Found, DB Error
    *   [x] `executeTransaction`: Success (commit), Failure (rollback)
*   **`openai-service.js**
    *   [x] `initClient`: Success, Failure (missing key)
    *   [x] `generateChatCompletion`: Success (text), Success (tool calls), API Error (retryable, non-retryable, max retries), Invalid Response
    *   [x] `generateEmbedding`: Success (single/array), API Error (retryable, non-retryable, max retries), Invalid Response
    *   [x] Retry logic (`#calculateDelay`, `#delay`)
*   **`perplexity-service.js**
    *   [ ] Implementation test suite planned after contract tests (SKIP FOR NOW)
*   **`nutrition-service.js** (90.67% Stmts / 80.63% Br / 98.11% Fn / 90.27% Ln)
    *   [x] Mock Supabase client (`getSupabaseClient`) and its methods (`from`, `select`, `eq`, `single`, `upsert`, `insert`, `gte`, `lte`, `order`).
    *   [x] Mock `logger`.
    *   [ ] Mock internal validation/helper functions initially, then test them directly.
    *   [x] Test `getNutritionPlanByUserId`: Success (found), Not Found (PGRST116), Not Found (no data), DB error, Other error.
    *   [x] Test `createOrUpdateNutritionPlan`: Success (create/update), Validation error, DB error (upsert), Other error.
    *   [x] Test `getDietaryPreferences`: Success (found), Not Found (PGRST116), Not Found (no data), DB error, Other error.
    *   [x] Test `createOrUpdateDietaryPreferences`: Success (create/update), Validation error, DB error (upsert), Other error.
    *   [x] Test `logMeal`: Success, Validation error, DB error (insert), Other error.
    *   [x] Test `getMealLogs`: Success (no dates), Success (start date), Success (end date), Success (both dates), Validation error (dates), DB error, Other error.
    *   [-] Test `validateNutritionPlanData`: Valid data, Invalid data (missing fields, wrong types). (Skipped - tested implicitly)
    *   [-] Test `validateDietaryPreferences`: Valid data, Invalid data. (Skipped - tested implicitly)
    *   [-] Test `validateMealLogData`: Valid data, Invalid data (missing fields, bad date). (Skipped - tested implicitly)
    *   [-] Test `isValidDateFormat`: Valid dates, Invalid dates/formats. (Skipped - tested implicitly)
    *   [-] Test `isValidISODate`: Valid dates, Invalid dates/formats. (Skipped - tested implicitly)
    *   [-] Test `prepareNutritionPlanForStorage`: Correct mapping. (Skipped - tested implicitly)
    *   [-] Test `prepareDietaryPreferencesForStorage`: Correct mapping. (Skipped - tested implicitly)
    *   [-] Test `prepareMealLogForStorage`: Correct mapping. (Skipped - tested implicitly)
    *   [x] Test `formatNutritionPlanResponse`: Correct mapping. (Skipped - tested implicitly)
    *   [x] Test `formatDietaryPreferencesResponse`: Correct mapping. (Skipped - tested implicitly)
    *   [x] Test `formatMealLogResponse`: Correct mapping. (Skipped - tested implicitly)
    *   [x] Test error handling (throwing `NotFoundError`, `ValidationError`, `InternalError`). (Tested via main functions)
*   **`macro-service.js** (99.65% Stmts / 86.82% Br / 96% Fn / 100% Ln)
    *   [x] Mock Supabase client (`getSupabaseClientWithJWT`, `createClient`) for profile/macro data operations.
    *   [x] Mock `getNutritionAgent` from `../agents` and its `calculateMacroTargets` method.
    *   [x] Mock `logger`.
    *   [x] Test `calculateMacros`: 
        *   [x] Success via Nutrition Agent (retry logic if applicable).
        *   [x] Fallback to formula on Agent API error.
        *   [x] Success via formula (male/female, different goals/activity levels).
        *   [x] Error during calculation.
    *   [x] Test `storeMacros`: 
        *   [x] Success.
        *   [x] DB error on insert.
        *   [x] Unexpected error.
    *   [x] Test `retrieveMacros`: 
        *   [x] Success (no filters, with filters - date, status).
        *   [x] Pagination logic.
        *   [x] DB error.
        *   [x] Unexpected error.
    *   [x] Test `retrieveLatestMacros`: 
        *   [x] Success (found).
        *   [x] Not Found (PGRST116 / no rows).
        *   [x] DB error.
        *   [x] Unexpected error.
    *   [x] Test `updateMacroPlan`: 
        *   [x] Success.
        *   [x] Not Found / No permission.
        *   [x] DB error.
        *   [x] Unexpected error.
*   **`workout-log-service.js** (99.51% Stmts / 94.56% Br / 95.45% Fn / 100% Ln) - COMPLETE
    *   [x] Mock Supabase client (`getSupabaseClientWithJWT`) for CRUD operations.
    *   [x] Mock profile service/Supabase call for unit preference. (Not needed based on service code review)
    *   [x] Mock unit conversion utilities. (Not needed based on service code review)
    *   [x] Test `storeWorkoutLog`: Success (metric/imperial -> simplified as no conversion in service), validation errors, DB errors.
    *   [x] Test `retrieveWorkoutLogs`: Success, filtering (date, plan, exercise -> plan tested), pagination, no logs found, DB errors.
    *   [x] Test `getWorkoutLogById`: Success, not found (404), unauthorized (implicit via RLS mock), DB errors.
    *   [x] Test `updateWorkoutLog`: Success, not found (404), unauthorized (implicit via RLS mock), validation errors, DB errors.
    *   [x] Test `deleteWorkoutLog`: Success, not found (404), unauthorized (implicit via RLS mock), DB errors.
    *   [x] Test data transformation (metric/imperial units). (Not applicable in this service)
    *   [x] Test error handling (`WorkoutLogServiceError`, `ValidationError`, `NotFoundError`). (Partially tested via function tests)
*   **`check-in-service.js** (98.16% Stmts / 90.64% Br / 100% Fn / 98.85% Ln) - COMPLETE
    *   [x] Mock Supabase client (`getSupabaseClientWithJWT` -> `createClient`) for check-in CRUD.
    *   [x] Mock profile service/Supabase if needed. (Not needed)
    *   [x] Mock AI Service (e.g., OpenAI) for `generateProgressReport`. (Not applicable - function not present)
    *   [x] Test `recordCheckIn` (aliased as `storeCheckIn`): Success, validation errors (invalid metrics -> userId/data/date tested), DB errors.
    *   [x] Test `getCheckIns`: Success, date filtering, pagination, no check-ins found, DB errors.
    *   [x] Test `getCheckInById`: Success, not found (404), unauthorized (implicit via RLS), DB errors.
    *   [x] Test `getLatestCheckIn`: Success, no check-ins found, DB errors. (Skipped - function not present)
    *   [x] Test `deleteCheckIn`: Success, not found (404), unauthorized (implicit via RLS), DB errors. (Skipped - function not present)
    *   [x] Test `generateProgressReport`: Correct data fetching, AI interaction mock, handling no data, AI errors. (Skipped - function not present)
    *   [x] Test `computeMetrics`: Success, no data, validation errors, DB errors, helper function logic.
    *   [x] Test internal validation/helper functions. (Tested implicitly via computeMetrics)
    *   [x] Test error handling (`CheckInServiceError`, `ValidationError`, `NotFoundError`). (Partially tested via function tests)
*   **`export-service.js** (97% Stmts / 74.56% Br / 100% Fn / 74.7% Ln)
    *   [x] Mock Supabase/other services for data fetching (profile, workouts, logs).
    *   [x] Mock file generation libraries (`xlsx`, `pdfkit`, `csv-stringify`, `googleapis`). (`fast-csv`, `exceljs` mocked; `pdfkit` mocked; others N/A)
    *   [x] Test `fetchUserData`: Success (single/multiple types), no data, unknown type, errors.
    *   [x] Test `exportJSON`: Success, error handling (fetchUserData error, client init error).
    *   [x] Test `generateXLSX`/`exportXLSX`: Data fetch, formatting, xlsx lib interaction, no data case, fetch errors, generation errors.
    *   [x] Test `generatePDF`/`exportPDF`: Data fetch, formatting, pdfkit interaction, no data case, fetch errors, generation errors.
    *   [x] Test `generateCSV`/`exportCSV`: Success, no data, fetch errors, stream errors.
    *   [-] Test `generateGoogleSheet`: (Skipped - Function not implemented in service)
    *   [x] Test user authorization checks. (Implicitly via JWT requirement)
    *   [x] Test helper functions (data fetching/formatting). (`fetchUserData` tested, others implicitly via export fns)
    *   [x] Test error handling (`ExportServiceError`). (Partially - tested via thrown `DatabaseError` and dependency errors, including PDFKit error)
*   **`import-service.js** (96.44% Stmts / 77.85% Br / 98.21% Fn / 96.32% Ln) - COMPLETE
    *   [x] Mock file parsing libraries (`xlsx`, `pdf-parse`, `csv-parse`, `googleapis`) with sample valid/invalid data.
    *   [x] Mock Supabase/other services for data storage verification.
    *   [x] Test `importXLSX`: Success, parse errors, validation errors, storage interaction, storage errors.
    *   [-] Test `importPDF`: Success, parse errors, validation errors, storage interaction, storage errors. (Not implemented in service)
    *   [x] Test `importCSV`: Success, parse errors, validation errors, storage interaction, storage errors.
    *   [x] Test `importJSON`: Success, validation errors, storage interaction, storage errors.
    *   [-] Test `importGoogleSheet`: Success, API errors, auth handling, validation errors, storage interaction, storage errors. (Not implemented in service)
    *   [x] Test data validation logic (directly tested helper).
    *   [x] Test handling of duplicates/conflicts (via `batchInsert` `onConflict`).
    *   [x] Test user authorization checks (via JWT token validation).
    *   [x] Test helper functions (`validateData`, `processJsonFields`, `batchInsert`).
    *   [x] Test error handling (`ValidationError`, `DatabaseError`).
*   **`supabase-admin.js** (96.55% Stmts / 81.61% Br / 100% Fn / 96.35% Ln) - COMPLETE
    *   [x] Mock `@supabase/supabase-js` `createClient` and admin methods (`auth.admin.*`).
    *   [x] Test `getAdminClient`: Correct initialization, singleton logic, missing env var handling, server env validation.
    *   [x] Test `createUser`: Success (auth only, with profile), validation errors, auth failure, profile failure (with cleanup).
    *   [x] Test `getUserById`: Success, user not found, API error scenarios, parameter validation.
    *   [x] Test `listUsers`: Success (with/without pagination), API error scenarios, parameter validation.
    *   [x] Test `deleteUser`: Success (with/without backup), validation errors, DB errors (ignoring PGRST116 on related data), auth error.
    *   [x] Test `migrateData`: Deprecated warning, calls runMigrations util, handles success/error.
    *   [x] Test `manageTables`: Various operations (create, alter, drop), SQL generation, error handling.
    *   [x] Test error handling and logging.
*   **`supabase.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock `env` from `../config`.
    *   Mock `pg.Pool` and its methods (`connect`, `query`, `release`, `end`).
    *   Mock `dns.promises.lookup`.
    *   Test `getProjectRef`:
        *   Success: Returns ref from `env.supabase.projectRef` if present.
        *   Success: Extracts ref correctly from valid Supabase URL.
        *   Error: Throws if env var missing and URL is invalid or doesn't contain ref.
    *   Test `createConnectionString`:
        *   Options: Handles default and specific `type`, `useServiceRole` options.
        *   Env Var Precedence: Correctly uses pre-configured env connection strings when available (service role, direct, pooler types).
        *   Manual Construction: Correctly builds strings for 'direct', 'sessionPooler', 'transactionPooler' when env vars missing (uses service role or DB password).
        *   Error: Throws on invalid `type` or if `getProjectRef` fails when needed.
    *   Test `getPoolConfig`:
        *   Base Config: Includes correct base settings (SSL, timeouts, retries).
        *   Type Specifics: Returns correct distinct configs for 'direct', 'sessionPooler', 'transactionPooler'.
        *   Error: Throws on invalid `type`.
    *   Test `testConnection`:
        *   Success: DNS lookup succeeds, Pool connects, query runs; returns success object with version/type. Verifies client release/pool end.
        *   Failure (DNS Lookup): `dns.lookup` fails (error or empty result); returns specific DNS error object.
        *   Failure (DB Connect): `pool.connect` fails; returns connection error object. Verifies pool end called.
        *   Failure (DB Query): `client.query` fails; returns query error object. Verifies client release/pool end called.
        *   Type Detection: Correctly identifies connection type based on string.
    *   Test `createConnectionWithFallback`:
        *   Mock `createConnectionString`, `testConnection`.
        *   Success (First Type): `testConnection` succeeds on first try.
        *   Success (Fallback Type): `testConnection` fails for first N types, then succeeds.
        *   Failure (All Types): `testConnection` fails for all types; returns last error.
        *   Error (String Creation): Handles error from `createConnectionString`.
        *   Options: Works with default and custom `types`, `useServiceRole`.
  *   [x] **Overall Service Coverage**
    | Statements |  Branches  |  Functions  |     Lines    |
    | :--------: |  :------:  |  :-------:  |     :---:    |
    | [ ] 87.96% | [ ] 73.17% | [ ] 93.5%   |  [ ] 88.07%  |
    *Successful Test Methods:* Mocking direct dependencies (`config/supabase`, `utils/logger`, `@supabase/supabase-js` createClient via helper mock) using `jest.doMock`. Using `jest.resetModules()` in `beforeEach` to handle singletons. Using `try...catch` for detailed error assertion when `rejects.toThrow/toMatchObject` is unreliable (e.g., after retries). Using prototype spying (`jest.spyOn(pg.Pool.prototype, 'method')`) for complex instance methods like `pg.Pool` connect/end when module mocking fails. Providing necessary mock data in `env` mock (like `databaseUrl`) to bypass problematic internal logic.
    *Unsuccessful Test Methods:* Trying to assert internal calls across module boundaries (e.g., spying on `getSupabaseAdminClient` from within `query`). Reliably testing conditional logic based on `isTest` across module resets.