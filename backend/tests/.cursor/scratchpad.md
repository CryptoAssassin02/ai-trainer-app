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
  | [ ] 88.1% | [ ] 73.74% | [ ] 93.81%  |  [ ] 88.22%  |

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

## Phase 3: Foundational Utilities & Middleware

### Utils (Target: 80% Statements/Functions, 70% Branches)
*   **`adjustment-prompts.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Test Handlebars helpers (`join`, `limit`, `capitalize`):
        *   `join`: Empty array, array with items, null/undefined input.
        *   `limit`: Empty array, array < limit, array > limit, limit 0, null/undefined input.
        *   `capitalize`: Empty string, single/multi-char string, null/undefined input.
    *   Test `generateAdjustmentPrompt`:
        *   Success: Basic valid inputs for all arguments.
        *   Success (Long Plan): `originalPlan` JSON > 1000 chars triggers summarization.
        *   Success (Short Plan): `originalPlan` JSON <= 1000 chars uses full details.
        *   Success (Profile Variations): Test with missing optional fields (age, gender, specific preferences).
        *   Success (Feedback Variations): Test with each `parsedFeedback` category present/absent and with multiple items.
        *   Success (Schema): Verify `jsonSchemaString` is correctly included.
        *   Error Handling: Test `try...catch` (if possible, though focus is on success paths).
    *   Test `generateSpecializedPrompt`:
        *   Success: Test each valid `adjustmentType` ('painConcern', 'equipmentLimitation', 'progression', 'substitution', 'volume', 'intensity', 'schedule', 'rest') with relevant `data`.
        *   Edge Case: Invalid/unknown `adjustmentType` returns empty string.
    *   Test `formatAdjustedOutput`:
        *   Success: Valid `adjustedPlan`, `changes`, `explanations` are correctly stringified.
        *   Structure Check: Verify the output matches the expected JSON structure.
        *   Error Handling: Test `try...catch` fallback (if possible).
    *   Test `getFeedbackParsingPrompt`:
        *   Success: Verify the function returns the correct static prompt string.
    *   Test `getExplanationSummaryPrompt`:
        *   Success (Empty): `appliedChanges` is empty array.
        *   Success (Non-Empty): `appliedChanges` has items, verify summary text format.
*   **`auth-utils.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock `jsonwebtoken` (`jwt.verify`).
    *   Mock `logger` from `../config`.
    *   Test `verifyToken`:
        *   Success: `jwt.verify` succeeds, returns decoded payload.
        *   Error (Expired): `jwt.verify` throws `TokenExpiredError`, logs warning, throws `Error('Token has expired')`.
        *   Error (Invalid): `jwt.verify` throws generic error, logs warning, throws `Error('Invalid token')`.
        *   Secret Handling: Ensure `jwt.verify` is called with the correct secret (process.env or default).
    *   Test `extractTokenFromHeader`:
        *   Success: Valid 'Bearer <token>' header returns '<token>'.
        *   Error (Missing Header): `null` or `undefined` input throws `Error('Invalid Authorization header')`.
        *   Error (No 'Bearer ' prefix): Input without 'Bearer ' prefix throws `Error('Invalid Authorization header')`.
        *   Error (Only 'Bearer '): Input 'Bearer ' throws `Error('Invalid Authorization header')`.
*   **`error-handlers.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock `logger` from `../config`.
    *   Mock `formatErrorResponse` from `./errors` (optional, can use real).
    *   Mock Express `req`, `res` (with `status`, `json` spies), `next` function.
    *   Mock `process.env.NODE_ENV`.
    *   Test `asyncHandler`:
        *   Success: Wrapped function resolves, `next()` is not called with an error.
        *   Error: Wrapped function rejects, `next()` is called with the error.
    *   Test `errorResponse`:
        *   Error >= 500: Uses `logger.error`, sets correct status code (e.g., 500, 503), calls `res.json` with formatted error.
        *   Error < 500: Uses `logger.warn`, sets correct status code (e.g., 400), calls `res.json` with formatted error.
        *   Default Status: Plain Error defaults to 500.
        *   Details Logging: Logs `error.details` if present.
        *   Stack Trace Logging: Logs `error.stack` only if `NODE_ENV` is 'development'.
    *   Test `successResponse`:
        *   Success (All Args): Sets specified status, calls `res.json` with `{ status: 'success', message, data }`.
        *   Success (No Data): Calls `res.json` with `{ status: 'success', message }` (no `data` key).
        *   Success (Defaults): Uses default status 200 and default message 'Success' when not provided.
*   **`logger.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock `winston` (including `format`, `transports`, `createLogger`).
    *   Mock `path` and potentially `fs` if testing file transport details.
    *   Mock `process.env` (NODE_ENV, DEBUG_TESTS).
    *   Test `redactSensitive` format / `redactRecursive` function:
        *   Success: Top-level sensitive fields (from `SENSITIVE_FIELDS`) are redacted to '[REDACTED]'.
        *   Success: Nested sensitive fields are redacted.
        *   Success: Case-insensitive matching works for redaction.
        *   Success: Non-sensitive fields remain unchanged.
        *   Success: Original input object is not mutated.
        *   Edge Case: Handles non-object/null inputs during recursion gracefully.
    *   Test `consoleFormat`:
        *   Structure: Output includes timestamp, level, message.
        *   Metadata (Dev): Includes pretty-printed JSON metadata when `NODE_ENV='development'`. 
        *   Metadata (Other): Includes compact JSON metadata when `NODE_ENV` is not 'development'.
        *   Stack Trace: Includes stack trace when `stack` property is present in log info.
        *   Colorization: Verify `format.colorize()` is part of the combine chain.
    *   Test `fileFormat`:
        *   Structure: Verify format includes timestamp, errors, and JSON.
    *   Test Transports Configuration:
        *   Console: Always added.
        *   Console Silent (Test Env): `silent` is true when `NODE_ENV='test'` and `DEBUG_TESTS` is not set.
        *   Console Not Silent (Test Env): `silent` is false when `NODE_ENV='test'` and `DEBUG_TESTS` is set.
        *   File Transports (Prod): `File` transports for 'error.log' and 'combined.log' are added *only* when `NODE_ENV='production'`. 
        *   File Transport Options: Verify correct levels/filenames/options are passed (requires deeper Winston mock).
    *   Test Logger Level Configuration:
        *   Level (Dev): Level is 'debug' when `NODE_ENV='development'`. 
        *   Level (Test): Level is 'error' when `NODE_ENV='test'`. 
        *   Level (Prod): Level is 'info' when `NODE_ENV='production'`. 
    *   Test `requestFormat` helper:
        *   Success: Correctly formats string with method, url, ip, status, userAgent, responseTime, userId.
        *   Anonymous User: Handles case where `req.user` or `req.user.id` is missing (shows 'anonymous').
    *   Test `fatal` helper:
        *   Success: Calls underlying `logger.error` with 'FATAL: ' prefix.
*   **`macro-calculator.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock `./validation-utils` (validateUserProfile, validateGoals, resolveGoalPriority, validateDietaryPreferences).
    *   Mock `./unit-conversion` (UnitConverter class and its methods poundsToKg, inchesToCm).
    *   Test `calculateBMR`:
        *   Error: Throws if `userProfile` is missing.
        *   Units (Imperial): Correctly calls `poundsToKg` and `inchesToCm`.
        *   Units (Metric): Does *not* call conversion methods.
        *   Gender (Male): Uses correct formula path.
        *   Gender (Female): Uses correct formula path.
        *   Gender (Other/Undefined): Uses averaging logic.
        *   Hardcoded Values: Test specific inputs matching comments for compatibility.
        *   Rounding: Result is rounded.
        *   Internal Converter: Creates `UnitConverter` if not provided.
    *   Test `calculateTDEE`:
        *   Error: Throws if `bmr` is invalid.
        *   Activity Levels: Correct multiplier used for 'sedentary', 'light', 'moderate', 'active', 'very_active'.
        *   Default Level: Uses 'moderate' multiplier for null/undefined/invalid `activityLevel`.
        *   Rounding: Result is rounded.
    *   Test `calculateMacros`:
        *   Error: Throws if `tdee` is invalid.
        *   Goals (Primary): Correct `calorieAdjustment` and base percentages for 'weight_loss', 'muscle_gain', 'performance', 'maintenance', 'general_health', default.
        *   Calorie Floor: `targetCalories` does not go below 1200.
        *   Dietary Preferences: Correct percentage adjustments for 'keto', 'vegan', 'vegetarian', 'paleo', none/other.
        *   Calculations: Correctly calculates grams from adjusted percentages and calories (4/4/9).
        *   Output: Returns object with `calories`, `macros` (protein, carbs, fat grams), `percentages` (protein, carbs, fat %).
    *   Test `getComprehensiveRecommendation`:
        *   Validation Calls: Verifies calls to `ValidationUtils` methods.
        *   Validation Failure: Throws error if any `ValidationUtils` call returns invalid.
        *   Method Chaining: Verifies `calculateBMR`, `calculateTDEE`, `calculateMacros` are called correctly in sequence.
        *   Internal Converter: Creates `UnitConverter` if not provided.
        *   Output: Returns object with `bmr`, `tdee`, macro results (`calories`, `macros`, `percentages`), and `goals`.
*   **`nutrition-formulas.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock logger (e.g., `winston`).
    *   Test `validateBMRInputs`:
        *   Error (Missing Fields): Throws on missing age, weight, height, gender, units.
        *   Error (Invalid Values): Throws on invalid age, weight, units, gender.
        *   Error (Height Metric): Throws on invalid type/value for metric height.
        *   Error (Height Imperial Num): Throws on invalid type/value for imperial number height.
        *   Error (Height Imperial Obj): Throws on invalid type/value/range for imperial {feet, inches} object.
        *   Error (Height Imperial Format): Throws on other invalid imperial height formats.
        *   Success: Returns true for valid metric and imperial (object/number) inputs.
        *   Logger: Verify `logger.error` called on validation failures.
    *   Test `convertWeight`:
        *   Success: kg -> lbs, lbs -> kg.
        *   Success (No Change): kg -> kg, lbs -> lbs.
        *   Error: Invalid units.
    *   Test `convertHeight`:
        *   Success: cm -> in/cm, in -> cm/in.
        *   Success (ft_in Object): 'ft_in' {obj} -> cm/in.
        *   Success (ft_in Number): 'ft_in' num -> cm/in, verify `logger.warn`.
        *   Error: Invalid fromUnit/toUnit.
        *   Error: Invalid value type for units.
    *   Test `calculateBMR`:
        *   Validation: Calls `validateBMRInputs` and throws if it fails.
        *   Units (Metric): Correct calculation with metric inputs.
        *   Units (Imperial Obj): Correct calculation using `convertWeight`/'ft_in' `convertHeight`.
        *   Units (Imperial Num): Correct calculation using `convertWeight`/'in' `convertHeight`.
        *   Gender: Correct formula used for 'male' and 'female'.
        *   Rounding: Result is rounded.
        *   Logger: Verify `logger.info` called.
    *   Test `calculateTDEE`:
        *   Validation: Throws on invalid BMR, missing/invalid activityLevel type, unrecognized activityLevel string.
        *   Multipliers: Correct result for each valid `activityLevel` key/alias in `TDEE_MULTIPLIERS`.
        *   Rounding: Result is rounded.
        *   Logger: Verify `logger.info` on success, `logger.error` on validation failures.
    *   Test `calculateMacros`:
        *   Validation: Throws on invalid TDEE. Handles invalid/empty `goals` array (defaults to maintenance, logs warning).
        *   Goal Logic: Correct percentages set for 'weight_loss', 'muscle_gain', 'maintenance', 'endurance', default.
        *   Percentage Sum Check: Test fallback if percentages don't sum to ~1, verify `logger.error`.
        *   Gram Calculation: Correct `protein_g`, `carbs_g`, `fat_g` calculated.
        *   Recalculated Calories: Returned `calories` based on calculated grams.
        *   Output: Returns correct structure `{ protein_g, carbs_g, fat_g, calories }`.
        *   Logger: Verify `logger.info` on success, relevant logs on errors/warnings.
*   **`openai-helpers.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock `logger` from `../config`.
    *   Test `formatMessages`:
        *   Error: Throws if input is not array.
        *   Error: Throws if messages are invalid (missing role/content, null, not object), logs error.
        *   Success: Returns correctly formatted messages.
        *   Success (Optional Fields): Includes `name`, `tool_call_id`, `tool_calls` if present.
        *   Logger: Verify `logger.debug` called.
    *   Test `extractJSONFromResponse`:
        *   Input Handling: Returns `null` for null/undefined/non-string input, logs debug.
        *   Extraction (Markdown): Correctly extracts and parses JSON from ```json ... ``` and ``` ... ``` blocks, logs debug.
        *   Extraction (Braces): Correctly extracts and parses JSON using first/last brace boundaries, logs debug.
        *   Extraction (Direct): Correctly parses string that is only valid JSON.
        *   Parsing Failure (Invalid JSON): Logs warning and returns `null` if parsing fails.
        *   Parsing Failure (Non-Object): Logs warning and returns `null` if parsed JSON is not an object.
        *   No Boundaries: Logs debug and returns `null` if no clear boundaries found.
    *   Test `validateResponse`:
        *   Input Handling: Returns `false` for null/undefined response, logs warning.
        *   Basic Success: Returns `true` for valid non-null input with no options.
        *   `expectJson=true`: Returns `true` for valid JSON string/object, `false` for invalid JSON/non-string/non-object, logs appropriately.
        *   `schemaValidator`: Calls validator, returns `true` on success (logs debug), `false` on schema mismatch or validator error (logs warning).
    *   Test `createSystemPrompt`:
        *   Success: Returns correct `{ role: 'system', content }` object.
        *   Error: Throws on invalid/empty content.
    *   Test `createUserPrompt`:
        *   Success: Returns correct `{ role: 'user', content }` object.
        *   Error: Throws on invalid/empty content.
    *   Test `createAssistantPrompt`:
        *   Success (String): Returns correct `{ role: 'assistant', content: 'string' }`.
        *   Success (Null): Returns correct `{ role: 'assistant', content: null }`.
        *   Error: Throws on invalid (undefined, empty string, non-string/non-null) content.
*   **`research-helpers.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock internal logger (console) or spy on console methods.
    *   Test `validateUserParams`:
        *   Error: Missing `userParams`.
        *   Error: Missing fields in `requiredFields` list.
        *   Success: All required fields present.
        *   Logger: Verify logger calls on failure.
    *   Test `formatResearchQuery`:
        *   Error: Returns `null` if `validateUserParams` fails.
        *   Optional Params: Correct query string with/without equipment, restrictions, preferences.
        *   `researchType`: Correct query variation for 'exercise', 'technique', 'nutrition', 'progression', default/unknown (logs warning).
    *   Test `formatExerciseQuery`:
        *   Error: Returns `null` if base formatter fails.
        *   Refinement: Includes target muscle focus when present.
    *   Test `formatTechniqueQuery`:
        *   Error: Returns `null` if `userParams` or `exerciseName` missing (logs error).
        *   Success: Returns correct technique-specific query.
    *   Test `formatNutritionQuery`:
        *   Error: Returns `null` if base formatter fails.
        *   Refinement: Includes nutrition-specific text.
        *   Logger: Verify `logger.info` call.
    *   Test `formatProgressionQuery`:
        *   Error: Returns `null` if base formatter fails.
        *   Refinement: Includes progression-specific text.
    *   Test `extractResearchInsights`:
        *   Error: Invalid `rawResponse` (null, non-string) returns `null`, logs error.
        *   Exercise: Extracts name, desc, diff, equip (list), muscles (list), instructions (multi-line) correctly when present/absent. Calls `formatExerciseData`.
        *   Nutrition: Extracts item, calories (float), macros, benefits, serving correctly when present/absent. Calls `formatNutritionData`.
        *   Unknown Type: Returns `{ rawContent }`, logs warning.
        *   Error Handling: Catches errors during processing, logs error, returns `null`.
    *   Test `validateResearchResults`:
        *   Error: Invalid `structuredData` returns `false`, logs warning.
        *   Completeness: Fails (`false`) if required fields missing for exercise/nutrition.
        *   Relevance: Logs warning if keywords don't match, but may return `true`.
        *   Trusted Sources: Logs warning/info based on trusted/untrusted/missing sources in mock `rawApiResponse`.
        *   Safety: Logs warning for missing exercise instructions, lack of safety keywords, very low calories.
        *   Constraints: Returns `false` or logs warning based on equipment/dietary/restriction mismatches.
        *   Success: Returns `true` if checks pass.
    *   Test `formatExerciseData`:
        *   Defaults: Applies correct defaults for missing fields.
        *   Arrays: Correctly formats/cleans/defaults `equipmentNeeded` and `musclesTargeted`.
    *   Test `formatNutritionData`:
        *   Defaults: Applies correct defaults.
        *   Types: Correctly handles types (calories as number, macros as string).
        *   Trimming: Trims string fields.
*   **`research-prompts.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Test `getAdditionalInstructions`:
        *   Success (Defaults): Empty/no args return empty string.
        *   Success (Beginner): `fitnessLevel='beginner'` adds beginner instruction.
        *   Success (Injury String): `constraints.injury='string'` adds injury instruction.
        *   Success (Injury Array): `constraints.injury=['array']` adds joined injury instruction.
        *   Success (Combinations): Test combinations of beginner/non-beginner and injury/no-injury.
    *   Test `buildExerciseQuery`:
        *   Success (All Args): Correctly replaces all placeholders with string/array inputs.
        *   Success (Defaults): Uses defaults for equipment ('any'), constraints ('none'), instructions ('') when omitted.
        *   Success (Required Defaults): Uses defaults for muscleGroup/fitnessLevel ('any') when omitted.
    *   Test `buildTechniqueQuery`:
        *   Success (All Args): Correctly replaces all placeholders.
        *   Success (Defaults): Uses defaults for technique, fitnessLevel, instructions when omitted.
    *   Test `buildProgressionQuery`:
        *   Success (All Args): Correctly replaces all placeholders.
        *   Success (Defaults): Uses defaults for exercise, fitnessLevel, instructions when omitted.
    *   Test `buildNutritionQuery`:
        *   Success (All Args): Correctly replaces all placeholders with string/array inputs for restrictions.
        *   Success (Defaults): Uses defaults for goal, restrictions, instructions when omitted.
    *   Test Exports: Verify all expected functions/constants/schemas are exported.
*   **`research-utils.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock `ajv` and its `compile`/`validate` methods/properties.
    *   Mock `logger` from `../config`.
    *   Test `validateAgainstSchema`:
        *   Error: Invalid schema input (null/non-object), logs error, returns specific error object.
        *   Success (Empty Array): Handles empty array data correctly.
        *   Success: Valid data passes validation.
        *   Failure: Invalid data fails validation, logs warning, returns errors.
        *   Error: Schema compilation error, logs error, returns specific error object.
    *   Test `safeParseResponse`:
        *   Error: Invalid input (null/non-string), logs warning, returns null.
        *   Success (Simple JSON): Parses valid JSON string.
        *   Success (Double Encoded): Parses stringified JSON within a string.
        *   Failure: Invalid JSON input, logs errors, returns null.
    *   Test `extractExerciseData`:
        *   Mock `validateAgainstSchema`.
        *   Error: Null/undefined input `parsedData`, logs warning, returns error object.
        *   Validation Failure: `validateAgainstSchema` returns false, logs warning, returns error object.
        *   Success: `validateAgainstSchema` returns true, returns original `parsedData`.
    *   Test `extractTechniqueData`:
        *   Mock `safeParseResponse`, `validateAgainstSchema`.
        *   Parsing Failure: `safeParseResponse` returns null, function returns null.
        *   Validation Failure: `validateAgainstSchema` returns false, logs warning, returns error object.
        *   Success: Both dependencies succeed, returns parsed data.
    *   Test `extractProgressionData`:
        *   Mock `safeParseResponse`, `validateAgainstSchema`.
        *   Parsing Failure: `safeParseResponse` returns null, function returns null.
        *   Validation Failure: `validateAgainstSchema` returns false, logs warning, returns error object.
        *   Success: Both dependencies succeed, returns parsed data.
    *   Test `validateSchemaAlignment`:
        *   Mock `logger`, mock `schema` (with `example`), mock `extractor` function.
        *   Error: Schema or schema.example missing, logs warning, returns false.
        *   Extractor Failure: Extractor returns null or throws, logs appropriately, returns false.
        *   Required Fields Failure (Object/Array): Extracted data missing required fields, logs warning, returns false.
        *   Result Type Mismatch: Extracted data type doesn't match schema type for required check, logs warning, returns false.
        *   Success: Example data passes validation and required checks, logs success, returns true.
    *   Test `generateContraindicationWarning`:
        *   Input Handling: Returns null for null/undefined/empty array.
        *   Success: Returns correctly formatted warning string for valid input array (handles missing names).
*   **`retry-utils.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Use `jest.useFakeTimers()` and `jest.advanceTimersByTime()`.
    *   Mock the function `fn` to be retried (allow controlling success/failure per attempt).
    *   Test `retryWithBackoff`:
        *   Options (Defaults): Works correctly with default options.
        *   Options (Custom): Correctly uses custom `maxRetries`, `initialDelay`, `backoffFactor`, `shouldRetry`.
        *   Success (First Attempt): `fn` succeeds immediately, returns result, no delays.
        *   Success (After Retries): `fn` fails N times (< maxRetries), then succeeds. Verifies correct number of calls to `fn`, `setTimeout` (with increasing backoff delays), and returns successful result.
        *   Failure (Max Retries): `fn` always fails. Verifies correct number of calls (`maxRetries + 1`), correct delays, and throws the *last* error from `fn`.
        *   `shouldRetry` (Prevents Retry by Error): Custom `shouldRetry` returns false for specific error, loop terminates early, error is thrown.
        *   `shouldRetry` (Prevents Retry by Attempt): Custom `shouldRetry` returns false after N attempts, loop terminates early, error is thrown.
        *   `attempt` Argument: Verify the attempt number passed to `fn` increments correctly.
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
*   **`unit-conversion.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Test `convertHeightToMetric`:
        *   Validation: Throws on invalid/NaN/negative `feet` or `inches`.
        *   Success: Correct cm calculation and rounding for feet only / feet and inches.
    *   Test `convertHeightToImperial`:
        *   Validation: Throws on invalid/NaN/negative `centimeters`.
        *   Success: Correct calculation of feet and inches.
        *   Edge Case: Correctly handles inches rounding up to 12 (increments feet, resets inches to 0).
    *   Test `convertWeightToMetric`:
        *   Validation: Throws on invalid/NaN/negative `pounds`.
        *   Success: Correct kg calculation and rounding.
    *   Test `convertWeightToImperial`:
        *   Validation: Throws on invalid/NaN/negative `kilograms`.
        *   Success: Correct lbs calculation and rounding.
    *   Test `convertHeight`:
        *   No Change: Returns original value if `fromUnit === toUnit`.
        *   Metric -> Imperial: Calls `convertHeightToImperial` correctly.
        *   Imperial -> Metric: Calls `convertHeightToMetric` with feet/inches from input object (handles defaults). Throws if input is not object.
        *   Error: Throws on invalid `fromUnit` or `toUnit`.
    *   Test `convertWeight`:
        *   No Change: Returns original value if `fromUnit === toUnit`.
        *   Metric -> Imperial: Calls `convertWeightToImperial` correctly.
        *   Imperial -> Metric: Calls `convertWeightToMetric` correctly.
        *   Error: Throws on invalid `fromUnit` or `toUnit`.
    *   Test `formatHeight`:
        *   Validation: Throws on invalid/NaN/negative `value` or invalid `unitSystem`.
        *   Metric: Correctly formats as `${value} cm`.
        *   Imperial: Calls `convertHeightToImperial` (value=cm), formats as `${feet}'${inches}"`.
    *   Test `formatWeight`:
        *   Validation: Throws on invalid/NaN/negative `value` or invalid `unitSystem`.
        *   Metric: Correctly formats as `${value} kg`.
        *   Imperial: Correctly formats as `${value} lbs`.
*   **`unit-converter.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock or spy on `logger` (winston instance).
    *   Test `UnitConverter` constructor:
        *   Success: Instantiates with default logger.
        *   Success: Instantiates with provided mock logger.
    *   Test `validateNumericValue`:
        *   Success: Valid positive/zero/negative numbers (based on options).
        *   Error: Non-number, NaN, zero when disallowed, negative when disallowed. Logger called.
    *   Test `validateUnitType`:
        *   Success: 'metric', 'imperial' (case-insensitive).
        *   Error: Invalid string, null, non-string. Logger called.
    *   Test `convertHeightToMetric`:
        *   Validation: Throws on invalid/NaN/negative feet/inches. Logger called.
        *   Success: Correct cm calculation & rounding (feet only, feet+inches).
    *   Test `convertHeightToImperial`:
        *   Validation: Throws on invalid/NaN/negative cm. Logger called.
        *   Success: Correct feet/inches calculation.
        *   Edge Case: Inches rounding up to 12 (e.g., 5'11.6" -> 6'0").
    *   Test `convertWeightToMetric`:
        *   Validation: Throws on invalid/NaN/negative lbs. Logger called.
        *   Success: Correct kg calculation & rounding.
    *   Test `convertWeightToImperial`:
        *   Validation: Throws on invalid/NaN/negative kg. Logger called.
        *   Success: Correct lbs calculation & rounding.
    *   Test `convertHeight`:
        *   Validation: Invalid `fromUnit`/`toUnit`. Logger called.
        *   No Change: Returns input if `fromUnit === toUnit`.
        *   Metric -> Imperial: Calls `convertHeightToImperial`.
        *   Imperial (Num) -> Metric: Correct cm calculation from inches.
        *   Imperial (Obj) -> Metric: Calls `convertHeightToMetric` (feet/inches).
        *   Error (Imperial): Throws on invalid imperial input type/structure. Logger called.
        *   Error Handling: Verify wrapper error message format.
    *   Test `convertWeight`:
        *   Validation: Invalid `fromUnit`/`toUnit`. Logger called.
        *   No Change: Returns input if `fromUnit === toUnit`.
        *   Metric -> Imperial: Calls `convertWeightToImperial`.
        *   Imperial -> Metric: Calls `convertWeightToMetric`.
        *   Error Handling: Verify wrapper error message format.
    *   Test `formatHeight`:
        *   Validation: Invalid value/unitSystem. Logger called.
        *   Metric: Correct `${value} cm` format.
        *   Imperial: Calls `convertHeightToImperial`, correct `${feet}'${inches}"` format.
    *   Test `formatWeight`:
        *   Validation: Invalid value/unitSystem. Logger called.
        *   Metric: Correct `${value} kg` format.
        *   Imperial: Correct `${value} lbs` format.
    *   Test `convertUserProfile`:
        *   Validation: Invalid `fromUnit`/`toUnit`. Logger called.
        *   No Change: Returns copy if `fromUnit === toUnit`.
        *   Success: Converts height and weight correctly.
        *   Success: Updates `preferences.units`.
        *   Partial Data: Handles profile missing height/weight/preferences gracefully.
        *   Error: Correctly propagates errors from internal `convertHeight`/`convertWeight`. Verify wrapper error message format. Logger called on error.
        *   Logger: Verify `logger.info` called on success.
    *   Test `CONVERSION_CONSTANTS` export.
*   **`validation-utils.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Test `isValidNumber`:
        *   Success: Valid positive numbers.
        *   Failure: Zero, negative numbers, non-numbers, NaN, Infinity.
    *   Test `isValidGender`:
        *   Success: 'male', 'female', 'other' (case-insensitive, with/without padding).
        *   Failure: Invalid strings, non-strings, null.
    *   Test `isValidActivityLevel`:
        *   Success: 'sedentary', 'light', 'moderate', 'active', 'very_active' (case-insensitive, with/without padding).
        *   Failure: Invalid strings, non-strings, null.
    *   Test `validateUserProfile`:
        *   Error: Null/undefined profile returns `isValid: false` with message.
        *   Success: Valid profile returns `isValid: true`, empty messages.
        *   Failure (Required): Missing/invalid weight, height, age returns `isValid: false` with specific messages.
        *   Failure (Optional): Invalid gender, activityLevel returns `isValid: false` with specific messages.
        *   Success (Optional): Missing gender, activityLevel returns `isValid: true`.
    *   Test `validateGoals`:
        *   Error: Null/undefined/empty array returns `isValid: false` with message.
        *   Success: Valid goals array returns `isValid: true`, empty messages (unless conflicting).
        *   Failure: Array with invalid goal strings returns `isValid: false` with specific message.
        *   Conflict: Array with 'weight_loss' and 'muscle_gain' returns `isValid: true` but includes note in messages.
    *   Test `validateDietaryPreferences`:
        *   Success (Optional): Null/undefined input returns `isValid: true`.
        *   Success: Valid preferences object returns `isValid: true`.
        *   Failure: Invalid `dietType` returns `isValid: false` with message.
        *   Failure: Non-array `allergies`, `preferredFoods`, `avoidedFoods` returns `isValid: false` with messages.
    *   Test `resolveGoalPriority`:
        *   Defaults: Null/undefined/empty array returns `{ primaryGoal: 'general_health', secondaryGoals: [] }`.
        *   Success: Correctly identifies primary and secondary based on priority order for various combinations.
        *   Unknown Goals: Handles unknown goals correctly (places them at the end of secondary).
*   **`validation.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock or spy on `logger` (winston instance).
    *   Test `ValidationUtils` constructor:
        *   Success: Instantiates with default logger.
        *   Success: Instantiates with provided mock logger.
    *   Test `validateUserProfile`:
        *   Error: Null/undefined profile returns specific error.
        *   Options (`requireAllFields`): Test true/false behavior with missing required fields.
        *   Options (`validateValues`): Test true/false behavior with invalid field values.
        *   Validation (Age): Test invalid type, NaN, negative, < 13, > 120.
        *   Validation (Weight - Metric): Test invalid type, zero, negative, out of range (20-300).
        *   Validation (Weight - Imperial): Test invalid type, zero, negative, out of range (44-660).
        *   Validation (Height - Metric): Test invalid type, NaN, zero, negative, out of range (120-250).
        *   Validation (Height - Imperial Num): Test invalid type, NaN, zero, negative.
        *   Validation (Height - Imperial Obj): Test invalid types/NaN/negative for feet/inches, inches >= 12, out of range (48-96 total inches).
        *   Validation (Height - Imperial Other): Test non-number/non-object height.
        *   Validation (Gender): Test invalid type, unknown strings.
        *   Validation (Units): Test invalid type, unknown strings.
        *   Success: Valid profile (metric/imperial, with/without optionals) returns `isValid: true`, empty errors.
        *   Logger: Verify `logger.error` called on validation failures.
    *   Test `validateAndPrioritizeGoals`:
        *   Error: Null/non-array/empty array input returns specific errors.
        *   Success (Normalization): Valid goals (direct match, aliases, padding, case-insensitive) are normalized.
        *   Error (Unknown): Array with unknown goal strings returns `isValid: false` with specific error.
        *   Conflict: Array with 'weight_loss' and 'weight_gain' returns `isValid: false` with specific error.
        *   Priority: Verify correct `primaryGoal` determination based on priority for various combinations.
        *   Output: Verify structure `{ isValid, errors, normalizedGoals, primaryGoal }`.
        *   Logger: Verify `logger.error` called on validation failures.
    *   Test `validateActivityLevel`:
        *   Error: Null/non-string input returns specific error.
        *   Success (Normalization): Valid levels (direct match, aliases, padding, case-insensitive) return correct `normalizedLevel` and `multiplier`.
        *   Error (Unknown): Unknown level string returns `isValid: false` with specific error.
        *   Output: Verify structure `{ isValid, errors, normalizedLevel, multiplier }`.
        *   Logger: Verify `logger.error` called on validation failures.
    *   Test `validateDietaryPreferences`:
        *   Success (Optional): Null/undefined input returns `{ isValid: true, errors: [], normalized: {} }`.
        *   Validation (Restrictions): Test non-array, array with unknown strings.
        *   Validation (Meal Frequency): Test non-number, NaN, < 1, > 10.
        *   Validation (Disliked/Allergies): Test non-array.
        *   Success: Valid preferences object returns `isValid: true`, normalized values.
        *   Normalization: Verify strings are lowercased/trimmed in `normalized` object.
        *   Output: Verify structure `{ isValid, errors, normalized }`.
        *   Logger: Verify `logger.error` called on validation failures.
        
### Middleware (Target: 80% Statements/Functions, 70% Branches)
*   **`error-middleware.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock `logger` from `../config`.
    *   Mock `formatErrorResponse` from `../utils/errors`.
    *   Mock Error classes (`ApiError`, `AgentError`, `NotFoundError`, custom errors).
    *   Mock Express `req`, `res` (with `status`, `json`, `headersSent` flag), `next` spy.
    *   Mock `process.env.NODE_ENV`.
    *   Mock `global.server` and its `close` method.
    *   Mock `process.exit`.
    *   Test `notFoundHandler`:
        *   Success: Calls `next` with a `NotFoundError` instance.
        *   Success: The passed error has the correct message including `req.originalUrl`.
    *   Test `mapAgentErrorToStatusCode`:
        *   Mapping: Test each specific `ERROR_CODES` maps to the correct HTTP status.
        *   Default: Test an unknown error code maps to 500.
    *   Test `globalErrorHandler`:
        *   Headers Sent: If `res.headersSent` is true, calls `next` with the error and does nothing else.
        *   AgentError Handling:
            *   Mapping: Calls `mapAgentErrorToStatusCode`.
            *   Logging (Error): Logs as 'error' if `!err.isOperational` or `statusCode >= 500`. Verify logged details (code, message, details, operational status).
            *   Logging (Warn): Logs as 'warn' if `err.isOperational` and `statusCode < 500`. Verify logged details.
            *   Logging (Dev): Includes `stack` and `originalError` details in log only if `NODE_ENV=development`.
            *   Response: Calls `res.status().json()` with the correct mapped status code and specific `AgentError` response format (`status`, `message`, `errorCode`, `details`).
            *   Test with various `ERROR_CODES`.
        *   ApiError/Generic Error Handling:
            *   Status Code: Uses `err.statusCode` if available, defaults to 500.
            *   Logging (Error): Logs as 'error' if `!err.isOperational` or `statusCode >= 500`. Verify logged details (status, message, operational).
            *   Logging (Warn): Logs as 'warn' if `err.isOperational` and `statusCode < 500`. Verify logged details.
            *   Logging (Dev): Includes `stack` in log only if `NODE_ENV=development`.
            *   Logging (Details): Includes `err.details` in log if present.
            *   Response Format: Calls `formatErrorResponse` to get the response body.
            *   Response: Calls `res.status().json()` with the correct status code and formatted response.
            *   Test with various `ApiError` subclasses and generic `Error`.
    *   Test `handleFatalError`:
        *   Logging: Calls `logger.fatal` with correct source ('uncaughtException'/'unhandledRejection') and error details (message, stack).
        *   Server Close (Success): Calls `global.server.close`, logs message, calls `process.exit(1)` in callback.
        *   Server Close (Timeout): Sets timeout, calls `logger.fatal` (timeout message), calls `process.exit(1)` after timeout. (Use `jest.useFakeTimers`).
        *   Server Close (No Server): If `global.server` is undefined, logs message, calls `process.exit(1)` immediately.
*   **`errorHandler.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock `logger` from `../config`.
    *   Mock `formatErrorResponse` from `../utils/errors`.
    *   Mock Error classes (`ApiError`, `AgentError`, custom errors with specific codes like 'PGRST301').
    *   Mock Express `req`, `res` (with `status`, `json` spies), `next` function.
    *   Mock `process.env.NODE_ENV`.
    *   Test `notFoundHandler`:
        *   Success: Calls `res.status(404).json()` with the exact expected error object.
    *   Test `mapAgentErrorToStatusCode`:
        *   Mapping: Test each specific `ERROR_CODES` maps to the correct HTTP status.
        *   Default: Test an unknown error code maps to 500.
    *   Test `errorHandler`:
        *   AgentError Handling:
            *   Mapping: Calls `mapAgentErrorToStatusCode`.
            *   Logging (Error): Logs as 'error' if `statusCode >= 500`. Verify logged details (code, message, details).
            *   Logging (Warn): Logs as 'warn' if `statusCode < 500`. Verify logged details.
            *   Logging (Dev): Includes `stack` and `originalError` details in log only if `NODE_ENV=development`.
            *   Response: Calls `res.status().json()` with the correct mapped status code and specific `AgentError` response format (`status`, `message`, `errorCode`, `details`).
            *   Test with various `ERROR_CODES` (leading to 4xx and 5xx statuses).
        *   ApiError/Generic Error Handling:
            *   Status Code: Uses `err.statusCode` if available, defaults to 500 for generic `Error`.
            *   Logging (Error): Logs as 'error' if `statusCode >= 500`. Verify logged details (status, message).
            *   Logging (Warn): Logs as 'warn' if `statusCode >= 400` and `< 500`. Verify logged details.
            *   Logging (Dev): Includes `stack` in log only if `NODE_ENV=development`.
            *   Logging (Details): Includes `err.details` in log if present.
            *   Response Format: Calls `formatErrorResponse` to get the response body.
            *   Response: Calls `res.status().json()` with the correct status code and formatted response.
            *   Test with various `ApiError` subclasses (4xx, 5xx) and generic `Error`.
    *   Test `supabaseErrorHandler`:
        *   Mapping (Specific Codes): For each code (PGRST301, 23505, 23503, 23502, 23514, 42601, 42501), verify it returns the correct error instance (`ApiError` or `AgentError`) with the correct message, status code, and the original error passed appropriately.
        *   Mapping (PGRST204): Verify input error with code 'PGRST204' returns `null`.
        *   Mapping (Default): Verify an input error with an unmapped code returns the default `AgentError` (EXTERNAL_SERVICE_ERROR).
*   **`index.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock dependencies: `express`, `cors`, `helmet`, `compression`, `../config` (`env`, `logger`, `serverConfig`), `./auth`, `./validation`, `./error-middleware`, `./rateLimit`, `./security`, `../utils/error-handlers` (`asyncHandler`).
    *   Mock Express `app` instance with `use` spy.
    *   Mock Express `req`, `res` (with `on`, `set`, `get`, `status`, `json` spies), `next` spy.
    *   Test Exports:
        *   Verify `auth`, `validation`, `errorMiddleware`, `rateLimit`, `security`, `configureMiddleware`, `asyncHandler` are exported.
    *   Test `configureMiddleware` Function:
        *   Standard Middleware Usage:
            *   Verify `app.use` is called with `helmet()`.
            *   Verify `app.use` is called with `cors()` - check passed options match mock `env.security.corsOrigin`.
            *   Verify `app.use` is called with `express.json()` - check passed options match mock `serverConfig.maxRequestBodySize`.
            *   Verify `app.use` is called with `express.urlencoded()` - check passed options match mock `serverConfig.maxRequestBodySize`.
            *   Verify `app.use` is called with `compression()` - check passed options match mock `serverConfig.compressionLevel`.
        *   Request/Response Logging Middleware:
            *   Mock `Date.now()` to control timing.
            *   Call the middleware function passed to `app.use`.
            *   Verify `logger.info` is called with incoming request details.
            *   Verify `res.on('finish', ...)` is called twice to register callbacks.
            *   Simulate 'finish' event (call the captured callback):
                *   Verify `logger.info` is called with completion details (status code, duration).
                *   Verify `res.set('X-Response-Time', ...)` is called with correct duration.
            *   Verify `next()` is called.
        *   Inline Error Handler Middleware:
            *   Mock `env.server.isDevelopment` (test both true and false).
            *   Call the error middleware function passed to `app.use` with different errors:
                *   Error with `name: 'ValidationError'`: Verify `logger.error` called, `res.status(400).json()` called with correct validation error structure.
                *   Error with `name: 'UnauthorizedError'`: Verify `logger.error` called, `res.status(401).json()` called with correct unauthorized error structure.
                *   Generic `Error('test message')`:
                    *   Verify `logger.error` called.
                    *   Verify `res.status(500).json()` called.
                    *   Verify response message is 'test message' if `isDevelopment=true`.
                    *   Verify response message is 'Internal server error' if `isDevelopment=false`.
*   **`validation.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock `logger` from `../config`.
    *   Mock Express `req` (with `body`, `query`, `params`), `res` (with `status`, `json` spies), `next` spy.
    *   Test `formatValidationError`:
        *   Success: Input Joi error object, verify output structure matches expected format (status, message, errors array with field/message/type).
        *   Edge Case: Test with error details having nested paths (`detail.path`).
    *   Test `validate` Factory Function:
        *   Source ('body'):
            *   Success: Valid data in `req.body`, `schema.validate` returns no error. Verify `req.body` is updated with `value`, `next()` is called without error.
            *   Failure: Invalid data in `req.body`, `schema.validate` returns error. Verify `logger.warn` called, `res.status(400).json()` called with result of `formatValidationError`, `next()` is *not* called.
            *   Strip Unknown: Provide data with extra fields, verify `req.body` is updated with *only* schema fields after validation.
        *   Source ('query'): Repeat success/failure tests for `req.query`.
        *   Source ('params'): Repeat success/failure tests for `req.params`.
    *   Test ALL Exported Joi Schemas (using `schema.validate()` directly):
        *   For each schema (`userSchemas.register`, `userSchemas.login`, ..., `profileSchemas.create`, ..., `workoutLogSchema`, `macroCalculationSchema`, `notificationPreferencesSchema`, etc.):
            *   Valid Data: Test with data that should pass all rules.
            *   Invalid Data (Rule by Rule): For *each field* and *each validation rule* (required, type, min, max, pattern, valid values, alternatives, etc.), provide data that violates *only that rule*. Verify the specific error message matches the custom message defined in the schema (e.g., 'Password must be at least 8 characters long').
            *   Edge Cases: Test specific edge cases (e.g., empty arrays for `min(1)`, imperial vs metric height/weight variations, password pattern variations, date formats, UUID formats).
    *   Test Specific Exported Middleware (`validateCheckIn`, `validateMetricsCalculation`, `validateMacroCalculation`, `validateNotificationPreferences`):
        *   Success: Call middleware with valid `req.body`, verify `next()` is called without error.
        *   Failure: Call middleware with invalid `req.body` (violating specific rules), verify `res.status(400).json()` is called with formatted error, `next()` is *not* called.
        *   `validateMacroCalculation` Specifics:
            *   Imperial Input: Provide valid imperial height/weight, verify `req.body` is updated with correctly converted metric values *before* `next()` is called.
    *   Test Factory-Generated Exported Middleware (e.g., `validateWorkoutGeneration`, `validateWorkoutLogQuery`):
        *   Success (Body): Call `validateWorkoutGeneration` with valid `req.body`, verify `next()` called.
        *   Failure (Body): Call `validateWorkoutGeneration` with invalid `req.body`, verify `res.status(400)` called.
        *   Success (Query): Call `validateWorkoutLogQuery` with valid `req.query`, verify `next()` called.
        *   Failure (Query): Call `validateWorkoutLogQuery` with invalid `req.query`, verify `res.status(400)` called.
        *   (Add similar tests for other factory-generated exports targeting `params` if applicable).
*   [ ] **Overall Middleware Coverage**
  | Statements |  Branches  |  Functions  |     Lines    |
  | :--------: |  :------:  |  :-------:  |     :---:    |
  | [ ] 76.02% | [ ] 60.61% | [ ] 61.11%  |  [ ] 77.28%  |

*   **Successful Test Methods (Middleware):**
*   **Unsuccessful Test Methods (Middleware):**

## Phase 4: Core Agent Logic & Memory

### Agents/Memory (Target: 80% Statements/Functions, 70% Branches)
*   **`consolidations.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *
*   **`core.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *
*   **`embedding.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *
*   **`index.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *
*   **`retrieval.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *
*   **`storage.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *
*   **`utils.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *
*   **`validators.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *
*   [ ] **Overall Agents/Memory Coverage**
  | Statements |  Branches  |  Functions  |     Lines    |
  | :--------: |  :------:  |  :-------:  |     :---:    |
  | [ ] 10.07% | [ ] 4.51% | [ ] 28.88%  |  [ ] 10.59%  |

*   **Successful Test Methods (Agents/Memory):**
*   **Unsuccessful Test Methods (Agents/Memory):**

### Agents (Target: 80% Statements/Functions, 70% Branches)
*   **`nutrition-agent.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *
*   **`plan-adjustment-agent.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *
*   **`research-agent.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *
*   **`workout-generation-agent.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *
*   [ ] **Overall Agents Coverage**
  | Statements |  Branches  |  Functions  |     Lines    |
  | :--------: |  :------:  |  :-------:  |     :---:    |
  | [ ] 51.4% | [ ] 37.07% | [ ] 52.02%  |  [ ] 52.45%  |

*   **Successful Test Methods (Agents):**
*   **Unsuccessful Test Methods (Agents):**

### Agents/Adjustment-Logic (Target: 80% Statements/Functions, 70% Branches)
*   **`feedback-parser.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *
*   **`adjustment-validator.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *
*   **`plan-modifier.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *
*   **`explanation-generator.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *
*   **`plan-modifier.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *
*   [ ] **Overall Agents/Adjustment-Logic Coverage**
  | Statements |  Branches  |  Functions  |     Lines    |
  | :--------: |  :------:  |  :-------:  |     :---:    |
  | [ ] 69.42% | [ ] 51.91% | [ ] 76.03%  |  [ ] 72.45%  |

*   **Successful Test Methods (Agents/Adjustment-Logic):**
*   **Unsuccessful Test Methods (Agents/Adjustment-Logic):**

## Phase 5: Routing Layer

### Routes (Target: 80% Statements/Functions, 70% Branches)
*   **`check-in.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *
*   **`data-transfer.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *
*   **`index.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *
*   **`macros.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *
*   **`notifications.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *
*   **`nutrition.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *
*   **`workout-log.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *
*   **`workout.js** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *
*   [ ] **Overall Routes Coverage**
  | Statements |  Branches  |  Functions  |     Lines    |
  | :--------: |  :------:  |  :-------:  |     :---:    |
  | [ ] 13.38% | [ ] 0% | [ ] 12%  |  [ ] 14.57%  |

*   **Successful Test Methods (Routes):**
*   **Unsuccessful Test Methods (Routes):**

## Progress Log

| Date | Work Completed | Coverage Change | Previous Total Coverage |
|------|----------------|-----------------|-------------------------|
| July 21, 2023 | Initial assessment | 24% → 24% |
| July 21, 2023 | Implemented JWT utils tests with 31 test cases | 24% → 29.2% |
| July 23, 2023 | Completed Sanitization utils tests with 89.81%/83.58%/93.75%/90.47% | 29.2% → XX% |
| July 23, 2023 | Verified Error Handling utils tests with 100%/98.41%/100%/100% | XX% → XX% |
| July 24, 2023 | Planning to implement Security Middleware tests | XX% → XX% |
| July 24, 2023 | Implemented Security Middleware tests with 79.51%/68.18%/82.35%/81.25% | XX% → XX% |
| July 24, 2023 | Implemented Rate Limit Middleware tests with 100%/90%/100%/100% | XX% → XX% |
| July 24, 2023 | Implemented Auth Middleware tests with 42.56%/37.03%/57.14%/42.65% (partial coverage) | XX% → XX% |
| July 24, 2023 | Completed Phase 1: Security Components - Overall progress | 29.2%/13.51%/26.66%/28.83% → 30.29%/23.46%/32.37%/30.88% |
| April 24, 2025 | Fixed CSRF protection tests and SQL injection tests in security.js; fixed duplicate runMigrations function in migrations.js to allow proper code coverage; verified Phase 1 components have good coverage | 30.29%/23.46%/32.37%/30.88% → 30.10%/22.98%/31.90%/30.68% |
| April 25, 2025 | Fixed all JWT Utils tests | 30.10%/22.98%/31.90%/30.68% → 32.01%/26.32%/38.12%/32.61% |
| April 26, 2025 | Implemented contract tests for workout-service.js | 32.01%/26.32%/38.12%/32.61% → 31.51%/23.58%/31.25%/31.93% |
| April 26, 2025 | Updated testing strategy to include both contract and implementation tests | 31.51%/23.58%/31.25%/31.93% → 31.51%/23.58%/31.25%/31.93% |
| April 28, 2025 | Implemented profile-service implementation tests for getProfileByUserId, createProfile, updateProfile, and helper functions with 36/43 passing tests | 31.51%/23.58%/31.25%/31.93% → 33.27%/25.84%/33.41%/33.68% |
| April 28, 2025 | Completed profile-service implementation tests with all tests passing | 33.27%/25.84%/33.41%/33.68% → 35.82%/28.87%/39.55%/36.30% |
| April 28, 2025 | Completed workout-service implementation tests with all tests passing | 35.82%/28.87%/39.55%/36.30% → 37.72%/30.55%/41.14%/38.19% |
| April 28, 2025 | Completed openai-service implementation tests | 37.72%/30.55%/41.14%/38.19% → 38.93%/32.1%/41.95%/39.46% |
| April 29, 2025 | Completed nutrition-service implementation tests (main functions) | 38.93% → 40.57% Stmts | Statements: 40.57%<br>Branches: 34.28%<br>Functions: 45.14%<br>Lines: 41.36% |
| April 30, 2025 | Completed import-service implementation tests | 40.57% → 52.11% Stmts | Statements: 52.11%<br>Branches: 41.43%<br>Functions: 55.25%<br>Lines: 52.42% |
| April 30, 2025 | Completed supabase-admin-service implementation tests | 52.11% → 53.97% Stmts | Statements: 53.97%<br>Branches: 43.41%<br>Functions: 57.77%<br>Lines: 54.36% |
| April 30, 2025 | Completed supabase.js (client) implementation tests | 53.97% → 54.41% Stmts | Statements: 54.41%<br>Branches: 41.29%<br>Functions: 58.49%<br>Lines: 54.62% |

## Next Steps

1. [x] Set up tools and infrastructure for testing (if needed)
2. [x] Begin with Phase 1 critical security components - JWT Utils
3. [x] Continue Phase 1 with Sanitization Utils
4. [x] Complete Error Handling Utils testing
5. [x] Continue Phase 1 with Security Middleware
   - [x] Test authentication middleware
   - [x] Test authorization middleware
   - [x] Test CSRF protection
   - [x] Test rate limiting
6. [x] Enhance Auth.js middleware coverage beyond the current 42.56%
7. [x] Move to Phase 2: High-Usage Components
   - [ ] Controllers for core functionality
   - [x] Services - contract tests for profile management (profile-service.js)
   - [x] Services - contract tests for workout management (workout-service.js)
   - [x] Services - contract tests for OpenAI service (openai-service.js)
   - [x] Services - contract tests for Perplexity service (perplexity-service.js)
   - [x] Services - implementation tests for profile management (profile-service.js)
   - [x] Services - implementation tests for workout management (workout-service.js)
   - [x] Services - implementation tests for OpenAI service (openai-service.js)
   - [x] Services - implementation tests for Perplexity service (perplexity-service.js) - SKIPPED
   - [x] Services - implementation tests for nutrition service (nutrition-service.js)
   - [x] Services - implementation tests for macro service (macro-service.js)
   - [x] Services - implementation tests for workout log service (workout-log-service.js)
   - [x] Services - implementation tests for check-in service (check-in-service.js)
   - [x] Services - implementation tests for export service (export-service.js)
   - [x] Services - implementation tests for import service (import-service.js) - COMPLETE
   - [x] Services - implementation tests for supabase admin (supabase-admin.js) - COMPLETE
   - [x] Services - implementation tests for supabase client (supabase.js) - COMPLETE
8. [x] Run coverage report after each major addition
9. [x] Update this tracking document regularly

## Notes and Challenges

Successfully implemented comprehensive tests for JWT utils, covering token generation, validation, blacklisting, refresh token management, and error handling. These tests required careful mocking of JWT and Supabase functions to properly simulate real-world conditions. We now have a solid pattern to follow for testing other utility modules.

Sanitization utils tests are now complete with excellent coverage metrics (96.24% statement, 84.09% branch, 93.75% function, and 95.88% line coverage). The focus on security-critical patterns has been comprehensive.

Error handling utils were already well-tested with excellent coverage metrics (100% statements, 99.13% branches, 100% functions, and 100% lines). The only uncovered branch is on line 86 of errors.js.

Security middleware tests are fully implemented with outstanding coverage (95.71% statements, 87.05% branches, 96.77% functions, 95.61% lines). We fixed issues with CSRF protection tests by implementing direct unit tests instead of Express integration tests, making the tests more reliable.

Rate limit middleware tests are complete with excellent coverage (100% statements, 90.62% branches, 100% functions, 100% lines). These tests cover all the rate limiter creation functions, key generation logic, and predefined limiters.

Auth middleware tests provide excellent coverage (99.61% statements, 91.91% branches, 100% functions, 99.53% lines). We successfully enhanced the tests to cover all authorization and authentication aspects, including token refresh and verification.

Profile service contract tests are successfully implemented, covering all the key functions including getProfileByUserId, createProfile, updateProfile, and handling edge cases like validation errors, not found errors, and version conflicts.

Workout service contract tests are now complete with comprehensive verification of all six key functions: executeTransaction, storeWorkoutPlan, retrieveWorkoutPlans, retrieveWorkoutPlan, updateWorkoutPlan, and removeWorkoutPlan. The tests cover success cases, error handling, and edge cases like version conflicts for updateWorkoutPlan. Properly mocking the pg Pool and Client was critical for testing the transaction functionality.

Workout service implementation tests are now complete with high coverage (98% statements, 83% branches, 100% functions, 98% lines), meeting targets for this service.

After analyzing our test coverage results, we've identified that our contract tests, while effective for verifying API behavior, don't contribute significantly to code coverage since they mock the service implementations. To address this limitation, we're implementing complementary implementation tests that will exercise the actual code while maintaining the benefits of our contract tests.

## Phase 1 Summary

In Phase 1, we successfully implemented tests for critical security components:

1. JWT Utils: Created comprehensive tests for token generation, validation, blacklisting, and refresh token management, achieving excellent coverage (86.52% statements, 61.83% branches, 88.67% functions, 87.80% lines). Branch coverage is below our 70% target but significantly improved from the starting point.

2. Sanitization Utils: Achieved excellent coverage with tests for input validation, XSS protection, and SQL injection protection (96.24% statements, 84.09% branches, 93.75% functions, 95.88% lines).

3. Error Handling Utils: Verified the existing test suite for error classes, error formatting, and error categorization, maintaining perfect coverage (100% statements, 98.59% branches, 100% functions, 100% lines).

4. Security Middleware: Implemented tests for Helmet configuration, CORS configuration, CSRF protection, and SQL injection protection, with excellent coverage (95.71% statements, 87.05% branches, 96.77% functions, 95.61% lines).

5. Rate Limit Middleware: Created tests with excellent coverage for all rate limiting functions and configurations (100% statements, 90.62% branches, 100% functions, 100% lines).

6. Auth Middleware: Implemented comprehensive tests focusing on all authentication and authorization aspects, achieving exceptional coverage (99.61% statements, 91.91% branches, 100% functions, 99.53% lines).

We've made significant progress in securing the core security components of the application. The overall test coverage has improved to 32.01%/26.32%/38.12%/32.61% (statements/branches/functions/lines).

## Phase 2 Progress

In Phase 2, we've started implementing tests for high-usage components:

1. Profile Service (Contract Tests): Implemented comprehensive tests for all functions including getProfileByUserId, createProfile, updateProfile, and associated helper functions. The tests cover success cases, validation errors, not found errors, and version conflicts.

2. Workout Service (Contract Tests): Completed tests for all six key functions: executeTransaction, storeWorkoutPlan, retrieveWorkoutPlans, retrieveWorkoutPlan, updateWorkoutPlan, and removeWorkoutPlan. The tests cover success paths, error handling, and edge cases like version conflicts for updateWorkoutPlan.

3. Workout Service (Implementation Tests): Completed tests covering the internal logic of all functions. Achieved high coverage (98% statements, 83% branches, 100% functions, 98% lines), meeting targets for this service.

4. Testing Strategy Update: Identified that contract tests effectively verify API behavior but don't exercise implementation code. Decided to implement a dual approach with both contract and implementation tests to maintain API verification while improving code coverage.

Next steps include:
1. Implementing implementation tests for profile-service.js to improve code coverage
2. Implementing implementation tests for workout-service.js to improve code coverage
3. Creating contract and implementation tests for the OpenAI service
4. Creating contract and implementation tests for the Perplexity service
5. Developing controller tests once the service layer is fully tested
6. Continuing to update this tracking document as we progress 

We fixed these failures by adding `/** @jest-environment node */` to the top of the test file and correctly mocking the `logger` utility using `jest.mock('../../utils/logger');`.

Import service implementation tests completed successfully after refactoring mocks to only target external dependencies (`exceljs`, `fast-csv`, `node-fetch` for PDF, Supabase client) and allowing internal helpers like `validateData`, `processJsonFields`, and `batchInsert` to run.

Supabase Admin service implementation tests completed successfully after fixing the test environment issue and ensuring the logger was properly mocked.

Supabase Client service implementation tests completed after extensive debugging involving `jest.doMock`, `jest.resetModules`, prototype spying for `pg.Pool`, and careful assertion adjustments for retry logic.

## Phase 2 Summary

Supabase Client service (`supabase.js`) tests completed successfully, requiring careful management of mocks (`jest.doMock`), module resets (`jest.resetModules`), and specific handling for `pg.Pool` using prototype spying. Coverage for this file reached ~99% lines.

Overall service layer coverage increased to 87.96% Statements / 73.17% Branches / 93.5% Functions / 88.07% Lines, meeting or exceeding targets.

We fixed these failures by adding `/** @jest-environment node */` to the top of the test file and correctly mocking the `logger` utility using `jest.mock('../../utils/logger');`.

Import service implementation tests completed successfully after refactoring mocks to only target external dependencies (`exceljs`, `fast-csv`, `node-fetch` for PDF, Supabase client) and allowing internal helpers like `validateData`, `processJsonFields`, and `batchInsert` to run.

Supabase Admin service implementation tests completed successfully after fixing the test environment issue and ensuring the logger was properly mocked.

Supabase Client service implementation tests completed after extensive debugging involving `jest.doMock`, `jest.resetModules`, prototype spying for `pg.Pool`, and careful assertion adjustments for retry logic. 


## Prompt
1. Okay, now before we proceed with implementing the additional utils tests in to increase our overall utils coverage, please review the implementation-focused tests already within the   for reference as to certain methods and test structures that have already proven to be successful (but keep in mind that the utils test methods may differ from the service layer or controller test methods). Also review lines 523-524 in the @phase3.md document (attached as context) for the successful and unsuccessful test methods for our utils tests to determine if any would be applicable for our utils test methods.

2. After reviewing the successful utils, service layer, and controller implementation-focused test suites that have been successfully implemented, we can continue to proceed with implementing the utils implementation-focused test suites, continuing with the 'error-handlers.test.js' suite (based on the specific and detailed plan laid out in @phase3.md - lines 55-72 attached as context). 

3. Prior to beginning with the implementation of the test suite, you should think critically to determine if a modular, refactored approach for the specific service is a better approach or including all of the test suite for the specific service is a better approach. Thoroughly consider the pros and cons of each method to help you determine the best approach for each individual service implementation file being tested.

4. Also, prior to beginning with the implementation of the test suite, you should think critically upon the code structure, language, etc. used by the specific implementation file being tested (@auth-utils.js) - like CommonJS vs. ES modules, for example. **Pay attention to every little detail.** Search the @Web to identify best practices and up-to-date documentation related to controller implementations and use context7 MCP tools, as well.

5. When you're ready to begin implementing the test suite, ensure you approach implementation paying rigorous attention to the specific service file being tested and the specific plan for that file (@phase3.md). You **should approach this systematically and incrementally** to ensure **surgical precision and rigorous, laser-focus.**

6. After you've implemented approximately 4-5 specific mocks/tests for the specific service you're currently working on (from the @phase3.md checklist), you should run the full test suite for just that specific utils implementation. 
   - For example, for the adjustment-prompts util you'd run <npm test backend/tests/utils/error-handlers.test.js> from the root level. 
   - This allows you to not only verify the implementations thus far are passing successfully, but also verifies you aren't causing further regressions within the suite.
   - If there are test failures, please follow the debugging strategy included at the bottom of this prompt in <xml> tags.

7. After each successful test run (all currently implemented tests pass), please update (check off increments successfully implemented) the @phase3.md for the progress made and then continue working through the remaining checklist items from that document.

8. Continue following Steps 2-7 above until the full test suite for the specific service passes successfully. Once you reach that point, please run <npm run test:backend-coverage> from the root level to run the full backend test suite to ensure the implementations caused no regressions elsewhere. Then update the @phase3.md checklist for the progress made on that utils suite.

9. Once you've completed Step 8, please thoroughly review and analyze everything that's been done in relation to the implementation of this test suite and consider the following: what methods worked well, which did we have issues with, which did not work at all, etc. Once you have a deep, thorough understanding, please add to the summary of your analysis of successful and unsuccessful test methods (utils) - in lines 523-524 in the @phase3.md document (see lines attached).

<Debugging_Strategy>
## Steps to Debug Failing Tests

1. Starting with the first failing test, please think critically for 20 minutes on the failing test. Consider the following questions:

   - Why is it failing? 
   - What's the core issue causing this test to fail? 
   - Am I certain of the core issue? 
      - If not, I need to dig further until I am 100% certain of the core issue - without a shadow of a doubt - until I am 100% certain of the core issue.

2. Once you're certain you've identified the core issue, then proceed to consider how best to approach resolving the core issue causing this individual test to fail. Think critically for 20 minutes on potential solutions until you've ensured you've identified the absolute core issue causing the test to fail.

3. Once you're certain you've identified the solution to resolve the core issue and believe it will result in the specific, individual test to successfully pass, please incrementally implement the necessary revisions to the applicable suites and/or to the applicable implementation files. 

4. Once you believe the necessary revisions have successfully been implemented, please run the suite to verify if the revisions implemented resulted in that specific, individual test to pass successfully.

5. Once you've verified that that specific, individual test does successfully pass, repeat Steps 1-4 for the next failing test. Continue this way until all remaining failing individual tests within the suites pass and the failing suites pass. 

## Requirements & Things to Consider When Working Through Steps Above

1. This process requires surgical precision and laser-focus throughout. You must put all your focus on the step you are currently working on. 

2. You must ensure the individual tests are properly implemented so they **actually contribute towards the required coverage percentage thresholds set out in the scratchpad.md and coverage-improvement-plan.md documents.**

3. You must ensure the test suite is aligned with the implementation file that's being tested by the suite and vice versa.

4. You must ensure any revisions/edits to the code - both in the test suite and the implementation file - do not cause further regressions within the suite nor in any other backend test suite.

5. Review other test suites within for reference as to what works and what has successfully been implemented and passed - **if it is applicable or relates to this test suite.**.

6. Use the context7 MCP tools to search for up-to-date documentation pertaining to the tests, issues, implementation file, etc. to ensure our code appears proper both in the test suite and the implementation file.

7. Please search the @Web to identify best practices and solutions for our specific failures, if applicable.
</Debugging_Strategy>