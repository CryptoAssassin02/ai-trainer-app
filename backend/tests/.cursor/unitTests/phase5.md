# Test Coverage Improvement Tracking

This document serves as a working checklist to track our progress in improving test coverage based on our coverage improvement plan.

## Current Coverage Metrics

- [ ] **Statements**: 37.72% → 38.93% → 40.57% → 54.21% → 55.38% → 58.97% → 63.72%
- [ ] **Branches**: 30.55% → 32.1% → 34.28% → 41.29% → 41.38% → 44.62% → 47.9%
- [ ] **Functions**: 41.14% → 41.95% → 45.14% → 54.62% → 59.1% → 61.26% → 65.18%
- [ ] **Lines**: 38.19% → 39.46% → 41.36% → 58.49% → 55.65% → 59.08% → 64.1%

Last updated: April 29, 2025

## Phase 5: Routing Layer

### Routes (Target: 80% Statements/Functions, 70% Branches)
*   **`check-in.js`** (Target: 80% Stmts/Fn/Ln, 70% Br) **[DONE]**
    *   [x] Mock dependencies: `express` (Router, use, get, post), `../middleware/auth` (`authenticate`), `../middleware/validation` (`validateCheckIn`, `validateMetricsCalculation`), `../controllers/check-in` (mock all methods: `recordCheckIn`, `getCheckIns`, `getCheckIn`, `calculateMetrics`), `express-rate-limit` (mock the limiter middleware).
    *   [x] Setup: Create mock Express app instance, use the router.
    *   [x] Test Route Configuration:
        *   `POST /v1/progress/check-in`:
            *   [x] Verify route exists with method `POST`.
            *   [x] Verify the middleware stack order: `authenticate`, mock `checkInLimiter`, `validateCheckIn`, `checkInController.recordCheckIn`.
            *   [x] Simulate request: Ensure only `checkInController.recordCheckIn` is the final handler called after mocked middleware calls `next()`.
        *   `GET /v1/progress/check-ins`:
            *   [x] Verify route exists with method `GET`.
            *   [x] Verify the middleware stack order: `authenticate`, `checkInController.getCheckIns`.
            *   [x] Simulate request: Ensure only `checkInController.getCheckIns` is the final handler called.
        *   `GET /v1/progress/check-ins/:checkInId`:
            *   [x] Verify route exists with method `GET` and path parameter.
            *   [x] Verify the middleware stack order: `authenticate`, `checkInController.getCheckIn`.
            *   [x] Simulate request: Ensure only `checkInController.getCheckIn` is the final handler called.
        *   `POST /v1/progress/metrics`:
            *   [x] Verify route exists with method `POST`.
            *   [x] Verify the middleware stack order: `authenticate`, `validateMetricsCalculation`, `checkInController.calculateMetrics`.
            *   [x] Simulate request: Ensure only `checkInController.calculateMetrics` is the final handler called.
*   **`data-transfer.js`** (Target: 80% Stmts/Fn/Ln, 70% Br) **[DONE]**
    *   [x] Mock dependencies: `express` (Router, use, post), `../middleware/auth` (`authenticate`), `../middleware/validation` (`validate`), `../controllers/data-transfer` (mock `exportData`, `importData`), `express-rate-limit` (mock `exportLimiter`, `importLimiter`), `multer` (mock `diskStorage`, `limits`, `fileFilter`, mock `upload.single` middleware), `fs` (mock `existsSync`, `mkdirSync`), `path`, `joi`.
    *   [x] Setup: Create mock Express app instance, use the router.
    *   [x] Test File System Check (Initial Setup):
        *   [x] `fs.existsSync` returns false -> Verify `fs.mkdirSync` is called. (Tested via side-effect of module load)
        *   [x] `fs.existsSync` returns true -> Verify `fs.mkdirSync` is *not* called. (Tested via side-effect of module load, though simplified)
    *   [x] Test Route Configuration:
        *   `POST /v1/export`:
            *   [x] Verify route exists with method `POST`.
            *   [x] Verify the middleware stack order: `authenticate`, mock `exportLimiter`, mock `validate(exportSchema)`, `dataTransferController.exportData`.
            *   [x] Simulate request: Ensure only `dataTransferController.exportData` is the final handler called after mocked middleware calls `next()`.
        *   `POST /v1/import`:
            *   [x] Verify route exists with method `POST`.
            *   [x] Verify the middleware stack order: `authenticate`, mock `importLimiter`, mock `upload.single('file')`, `handleMulterError`, `dataTransferController.importData`.
            *   [x] Simulate request (Success): Mock `upload.single` calls `next()` without error. Mock `handleMulterError` calls `next()`. Ensure `dataTransferController.importData` is the final handler.
    *   [x] Test `multer` Configuration (via mocks):
        *   [x] `storage.destination`: Verify it calls `cb` with `null` and the correct `uploadDir` path.
        *   [x] `storage.filename`: Verify it calls `cb` with `null` and a filename containing timestamp and original extension.
        *   [x] `fileFilter`:
            *   [x] Valid type ('text/csv') -> calls `cb(null, true)`.
            *   [x] Invalid type ('image/png') -> calls `cb` with an `Error` containing 'Unsupported file type'.
    *   [x] Test `handleMulterError` Middleware (Branch Coverage):
        *   [x] Multer Error (LIMIT_FILE_SIZE): Pass a mock `MulterError` with code `LIMIT_FILE_SIZE`. Verify `res.status(400).json()` called with specific size limit message. Verify `next()` is *not* called.
        *   [x] Multer Error (Other): Pass a mock `MulterError` with a different code. Verify `res.status(400).json()` called with generic multer error message. Verify `next()` is *not* called.
        *   [x] Other Error: Pass a generic `Error`. Verify `res.status(400).json()` called with the error's message. Verify `next()` is *not* called.
        *   [x] No Error: Call `handleMulterError` with `err = null`. Verify `next()` is called. (Tested implicitly and explicitly)
*   **`index.js`** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   [x] Mock dependencies: `express` (Router, use, get), `os` (mock `loadavg`), `process` (mock `uptime`, `memoryUsage`, `version`, `platform`, `arch`), `../config` (`env`), all imported route modules (`./auth`, `./v1/health`, etc. - mock them as simple routers).
    *   [x] Setup: Create mock Express `app` instance with `use` spy.
    *   [x] Test `/health` Route Handler:
        *   [x] Mock `os` and `process` methods to return predictable values.
        *   [x] Call the handler directly with mock `req`, `res` (spy on `status`, `json`).
        *   [x] Verify `res.status(200).json()` is called.
        *   [x] Verify the JSON response structure matches the expected format (status, timestamp, environment, server info with mocked data).
        *   [x] Verify calculation of `uptimeFormatted` is correct based on mocked `process.uptime`.
    *   [x] Test `registerRoutes` Function:
        *   [x] Call `registerRoutes(mockApp)`.
        *   [x] Verify `app.use` is called for the root `/health` router.
        *   [x] Verify `app.use` is called for each imported sub-router with the correct path prefix:
            *   [x] `/v1` prefix for `apiRouter`.
            *   [x] `/v1/auth` for `authRoutes`.
            *   [x] `/v1/health` for `healthRoutes`.
            *   [x] `/v1/profile` for `profileRoutes`.
            *   [x] `/v1/nutrition` for `nutritionRoutes`.
            *   [x] `/v1/macros` for `macroRoutes`.
            *   [x] `/v1/workouts` for `workoutRoutes`.
            *   [x] `/v1/progress` for `checkInRoutes`.
            *   [x] `/v1/notifications` for `notificationRoutes`.
            *   [x] `/` (root) for `workoutLogRoutes`.
            *   [x] `/` (root) for `dataTransferRoutes`.
        *   [x] Verify `app.use` is called *last* with the 404 handler function.
    *   [x] Test 404 Handler Middleware:
        *   [x] Call the handler function directly with mock `req` (with `originalUrl`) and `res` (spy on `status`, `json`).
        *   [x] Verify `res.status(404).json()` is called.
        *   [x] Verify the JSON response matches the expected 404 structure, including the `req.originalUrl`.
*   **`macros.js`** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock dependencies: `express` (Router, use, get, post, put), `../middleware/auth` (`authenticate`), `../middleware/validation` (`validateMacroCalculation`), `../controllers/macros` (mock all methods: `calculateMacros`, `storeMacros`, `getMacros`, `getLatestMacros`, `updateMacros`), `express-rate-limit` (mock `calculationLimiter`, `standardLimiter`).
    *   Setup: Create mock Express app instance, use the router.
    *   Test Route Configuration:
        *   `POST /calculate`:
            *   [x] Verify route exists with method `POST`.
            *   [x] Verify the middleware stack order: `authenticate`, mock `calculationLimiter`, `validateMacroCalculation`, `macroController.calculateMacros`.
            *   [x] Simulate request: Ensure only `macroController.calculateMacros` is the final handler called.
        *   `POST /`:
            *   [x] Verify route exists with method `POST`.
            *   [x] Verify the middleware stack order: `authenticate`, mock `standardLimiter`, `macroController.storeMacros`.
            *   [x] Simulate request: Ensure only `macroController.storeMacros` is the final handler called.
        *   `GET /`:
            *   [x] Verify route exists with method `GET`.
            *   [x] Verify the middleware stack order: `authenticate`, mock `standardLimiter`, `macroController.getMacros`.
            *   [x] Simulate request: Ensure only `macroController.getMacros` is the final handler called.
        *   `GET /latest`:
            *   [x] Verify route exists with method `GET`.
            *   [x] Verify the middleware stack order: `authenticate`, mock `standardLimiter`, `macroController.getLatestMacros`.
            *   [x] Simulate request: Ensure only `macroController.getLatestMacros` is the final handler called.
        *   `PUT /:planId`:
            *   [x] Verify route exists with method `PUT` and path parameter.
            *   [x] Verify the middleware stack order: `authenticate`, mock `standardLimiter`, `macroController.updateMacros`.
            *   [x] Simulate request: Ensure only `macroController.updateMacros` is the final handler called.
*   **`notifications.js`** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock dependencies: `express` (Router, use, get, post), `../middleware/auth` (`authenticate`), `../middleware/validation` (`validateNotificationPreferences`), `../controllers/notifications` (mock all methods: `updatePreferences`, `getPreferences`, `testNotification`), `express-rate-limit` (mock `preferencesLimiter`).
    *   Setup: Create mock Express app instance, use the router.
    *   Test Rate Limiter Configuration:
        *   [x] Verify `preferencesLimiter` mock is created with options including `keyGenerator`. Test the key generator function with a mock `req` having `req.user.id`.
    *   Test Route Configuration:
        *   `POST /v1/notifications/preferences`:
            *   [x] Verify route exists with method `POST`.
            *   [x] Verify the middleware stack order: `authenticate`, mock `preferencesLimiter`, `validateNotificationPreferences`, `notificationController.updatePreferences`.
            *   [x] Simulate request: Ensure only `notificationController.updatePreferences` is the final handler called.
        *   `GET /v1/notifications/preferences`:
            *   [x] Verify route exists with method `GET`.
            *   [x] Verify the middleware stack order: `authenticate`, `notificationController.getPreferences`.
            *   [x] Simulate request: Ensure only `notificationController.getPreferences` is the final handler called.
        *   `POST /v1/notifications/test`:
            *   [x] Verify route exists with method `POST`.
            *   [x] Verify the middleware stack order: `authenticate`, mock `preferencesLimiter`, `notificationController.testNotification`.
            *   [x] Simulate request: Ensure only `notificationController.testNotification` is the final handler called.
*   **`nutrition.js`** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock dependencies: `express` (Router, use, get, post), `../controllers/nutrition` (mock all methods: `calculateMacros`, `getNutritionPlan`, `getDietaryPreferences`, `updateDietaryPreferences`, `logMeal`, `getMealLogs`), `../middleware/auth` (`authenticate`).
    *   Setup: Create mock Express app instance, use the router.
    *   Test Global Middleware:
        *   [x] Verify `router.use(authenticate)` is called *before* any specific route definitions.
    *   Test Route Configuration:
        *   `POST /calculate`:
            *   [x] Verify route exists with method `POST`.
            *   [x] Verify the middleware stack order: `authenticate` (globally applied), `nutritionController.calculateMacros`.
            *   [x] Simulate request: Ensure `nutritionController.calculateMacros` is the final handler.
        *   `GET /`:
            *   [x] Verify route exists with method `GET`.
            *   [x] Verify the middleware stack order: `authenticate`, `nutritionController.getNutritionPlan`.
            *   [x] Simulate request: Ensure `nutritionController.getNutritionPlan` is the final handler.
        *   `GET /preferences`:
            *   [x] Verify route exists with method `GET`.
            *   [x] Verify the middleware stack order: `authenticate`, `nutritionController.getDietaryPreferences`.
            *   [x] Simulate request: Ensure `nutritionController.getDietaryPreferences` is the final handler.
        *   `POST /preferences`:
            *   [x] Verify route exists with method `POST`.
            *   [x] Verify the middleware stack order: `authenticate`, `nutritionController.updateDietaryPreferences`.
            *   [x] Simulate request: Ensure `nutritionController.updateDietaryPreferences` is the final handler.
        *   `POST /meal-log`:
            *   [x] Verify route exists with method `POST`.
            *   [x] Verify the middleware stack order: `authenticate`, `nutritionController.logMeal`.
            *   [x] Simulate request: Ensure `nutritionController.logMeal` is the final handler.
        *   `GET /meal-log`:
            *   [x] Verify route exists with method `GET`.
            *   [x] Verify the middleware stack order: `authenticate`, `nutritionController.getMealLogs`.
            *   [x] Simulate request: Ensure `nutritionController.getMealLogs` is the final handler.
        *   `GET /:userId`:
            *   [x] Verify route exists with method `GET` and path parameter.
            *   [x] Verify the middleware stack order: `authenticate`, `nutritionController.getNutritionPlan`.
            *   [x] Simulate request: Ensure `nutritionController.getNutritionPlan` is the final handler.
*   **`workout-log.js`** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock dependencies: `express` (Router, use, get, post, patch, delete), `../middleware/auth` (`authenticate`), `../middleware/validation` (`validateWorkoutLog`, `validateWorkoutLogUpdate`, `validateWorkoutLogQuery`), `../controllers/workout-log` (mock all methods: `logWorkout`, `getWorkoutLogs`, `getWorkoutLog`, `updateWorkoutLog`, `deleteWorkoutLog`), `express-rate-limit` (mock `logOperationLimiter`), `../config/logger`.
    *   Setup: Create mock Express app instance, use the router.
    *   Test Rate Limiter Handler (Branch Coverage):
        *   [x] Simulate rate limit exceeded: Call the custom `handler` function directly with mock `req`, `res`, `next`, `options`. Verify `logger.warn` is called. Verify `res.status(options.statusCode).send(options.message)` is called. Verify `next()` is *not* called.
    *   Test Route Configuration:
        *   `POST /workouts/log`:
            *   [x] Verify route exists with method `POST`.
            *   [x] Verify the middleware stack order: `authenticate`, mock `logOperationLimiter`, `validateWorkoutLog`, `workoutLogController.logWorkout`.
            *   [x] Simulate request: Ensure only `workoutLogController.logWorkout` is the final handler called.
        *   `GET /workouts/log`:
            *   [x] Verify route exists with method `GET`.
            *   [x] Verify the middleware stack order: `authenticate`, `validateWorkoutLogQuery`, `workoutLogController.getWorkoutLogs`.
            *   [x] Simulate request: Ensure only `workoutLogController.getWorkoutLogs` is the final handler called.
        *   `GET /workouts/log/:logId`:
            *   [x] Verify route exists with method `GET` and path parameter.
            *   [x] Verify the middleware stack order: `authenticate`, `workoutLogController.getWorkoutLog`.
            *   [x] Simulate request: Ensure only `workoutLogController.getWorkoutLog` is the final handler called.
        *   `PATCH /workouts/log/:logId`:
            *   [x] Verify route exists with method `PATCH` and path parameter.
            *   [x] Verify the middleware stack order: `authenticate`, mock `logOperationLimiter`, `validateWorkoutLogUpdate`, `workoutLogController.updateWorkoutLog`.
            *   [x] Simulate request: Ensure only `workoutLogController.updateWorkoutLog` is the final handler called.
        *   `DELETE /workouts/log/:logId`:
            *   [x] Verify route exists with method `DELETE` and path parameter.
            *   [x] Verify the middleware stack order: `authenticate`, `workoutLogController.deleteWorkoutLog`.
            *   [x] Simulate request: Ensure only `workoutLogController.deleteWorkoutLog` is the final handler called.
*   **`workout.js`** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock dependencies: `express` (Router, use, get, post, delete), `../middleware/auth` (`authenticate`), `../middleware/validation` (`validateWorkoutGeneration`, `validateWorkoutAdjustment`, `validateWorkoutQuery`), `../controllers/workout` (mock all methods: `generateWorkoutPlan`, `getWorkoutPlans`, `getWorkoutPlan`, `adjustWorkoutPlan`, `deleteWorkoutPlan`), `express-rate-limit` (mock `planGenerationLimiter`), `../config/logger`.
    *   Setup: Create mock Express app instance, use the router.
    *   Test Rate Limiter Handler (Branch Coverage):
        *   [x] Simulate rate limit exceeded for `planGenerationLimiter`: Call the custom `handler` function directly with mock `req`, `res`, `next`, `options`. Verify `logger.warn` is called. Verify `res.status(options.statusCode).send(options.message)` is called. Verify `next()` is *not* called.
    *   Test Route Configuration:
        *   `POST /`:
            *   [x] Verify route exists with method `POST`.
            *   [x] Verify the middleware stack order: `authenticate`, mock `planGenerationLimiter`, `validateWorkoutGeneration`, `workoutController.generateWorkoutPlan`.
            *   [x] Simulate request: Ensure only `workoutController.generateWorkoutPlan` is the final handler called.
        *   `GET /`:
            *   [x] Verify route exists with method `GET`.
            *   [x] Verify the middleware stack order: `authenticate`, `validateWorkoutQuery`, `workoutController.getWorkoutPlans`.
            *   [x] Simulate request: Ensure only `workoutController.getWorkoutPlans` is the final handler called.
        *   `GET /:planId`:
            *   [x] Verify route exists with method `GET` and path parameter.
            *   [x] Verify the middleware stack order: `authenticate`, `workoutController.getWorkoutPlan`.
            *   [x] Simulate request: Ensure only `workoutController.getWorkoutPlan` is the final handler called.
        *   `POST /:planId`:
            *   [x] Verify route exists with method `POST` and path parameter.
            *   [x] Verify the middleware stack order: `authenticate`, `validateWorkoutAdjustment`, `workoutController.adjustWorkoutPlan`.
            *   [x] Simulate request: Ensure only `workoutController.adjustWorkoutPlan` is the final handler called.
        *   `DELETE /:planId`:
            *   [x] Verify route exists with method `DELETE` and path parameter.
            *   [x] Verify the middleware stack order: `authenticate`, `workoutController.deleteWorkoutPlan`.
            *   [x] Simulate request: Ensure only `workoutController.deleteWorkoutPlan` is the final handler called.
*   [ ] **Overall Routes Coverage**
  | Statements |  Branches  |  Functions  |     Lines    |
  | :--------: |  :------:  |  :-------:  |     :---:    |
  | [ ] 13.38% | [ ] 0% | [ ] 12%  |  [ ] 14.57%  |

*   **Successful Test Methods (Routes):**
    *   Mocking middleware (`authenticate`, validation, rate limiters) by having them call `next()` immediately (or simulating their specific behavior like rate limit key generation) and mocking controller methods to return simple responses (e.g., `res.status(200).json(...)`) allowed for clear testing of the route structure and ensuring the correct controller methods were invoked with expected `req` properties (like `body` or `params`).
    *   Using `supertest` to make HTTP requests to an Express app instance (with the specific router under test mounted, often with a prefix like `/v1/routeName` or directly if the router defines full paths like `/workouts/log`) was effective for triggering routes and verifying status codes and basic response structure.
    *   `jest.mock('module-path', () => mockImplementation)` at the top level of test files was crucial for replacing actual dependencies. 
        *   **Important for modules like `express-rate-limit` that are instantiated in the SUT:** The `jest.mock` call must appear *before* the `require('../../routes/your-route-file')` statement in the test file. This ensures the SUT gets the mocked version when it first loads the dependency. This was consistently applied for `workout-log.test.js` and `workout.test.js`.
        *   For `express-rate-limit` with a custom `handler` in its options: 
            1.  Define a variable in the test file scope to capture the options (e.g., `let capturedRateLimitOptions;`).
            2.  Define a mock middleware function (e.g., `const mockLimiterMiddleware = jest.fn((req, res, next) => next());`).
            3.  Mock `express-rate-limit` with a factory function: `jest.mock('express-rate-limit', () => jest.fn(options => { capturedRateLimitOptions = options; return mockLimiterMiddleware; }));`.
            4.  In tests for routes *using* the limiter, assert that `mockLimiterMiddleware` was called.
            5.  In a separate test for the custom handler itself, access `capturedRateLimitOptions.handler` (after ensuring the SUT module has loaded and thus called `rateLimit()`) and call it directly with mock `req`, `res`, `next`, and the original `options` (or relevant parts of it, especially the `message` and `statusCode` the handler expects) to verify its specific logic (e.g., `logger.warn` calls, `res.status().send()`). This was successful for both `workout-log.test.js` and `workout.test.js`.
        *   For `multer`, mocking `multer()` to return an object with a mock `single` (or `array`, etc.) method, which itself is a mock middleware (e.g., `(req, res, next) => { req.file = mockFile; next(); }`). Mocking `multer.diskStorage` allowed capturing its options object to test `destination` and `filename` callbacks directly. Simulating `multer` populating `req.body` for text fields in `multipart/form-data` often required the mock `single` middleware to manually set `req.body` based on test inputs.
    *   `beforeEach(() => { jest.clearAllMocks(); })` was essential for test isolation, ensuring mock call counts and captured arguments were reset before each test case.
    *   Asserting `toHaveBeenCalledWith(expect.objectContaining({ body: ..., params: ..., query: ... }), expect.any(Object), expect.any(Function))` on controller mocks confirmed that request data (`body`, `params`, `query`) was correctly propagated by the router and middleware stack.
    *   Spying on `express.Router()` to capture internally created router instances (e.g., an `apiRouter` in `index.js`) and then inspecting their `.stack` property was a robust way to verify that sub-routers were mounted correctly, especially when direct spying on `internalRouter.use()` proved difficult.
    *   Mocking all imported sub-route modules (e.g., in `index.test.js`) using `jest.mock('path/to/sub-route', () => require('express').Router())` was effective for isolating the main router logic and ensuring correct comparisons in assertions (as `require` in the test would return the same mock router instance).
    *   Testing custom error handling middleware (like `handleMulterError`) involved having the preceding mock middleware call `next(err)` with various error types and asserting the HTTP response.
*   **Unsuccessful Test Methods (Routes):**
    *   Initial attempts to mock modules like `express-rate-limit` by returning an object with a `default` property (e.g., `{ default: mockFn }`) sometimes failed if the System Under Test (SUT) expected the module to directly export the factory function (e.g., `const rateLimit = require('express-rate-limit');`). Ensuring the mock module directly exported the expected type (function or object) was key.
    *   Referencing mock variables from within their own `jest.mock` factory function before their definition (due to JavaScript hoisting or module execution order) could lead to `ReferenceError`. This was often resolved by defining the mock instance *inside* the `jest.mock` factory scope or ensuring variables were accessible when the factory executed.
    *   Asserting that factory functions (like for rate-limiters or Joi validation HOFs) were called *within each test case* (after `mockClear()` in `beforeEach`) was often incorrect for instances created at the module scope (i.e., when the route file is first `require`d). These factories are typically called once on module load. The correct approach was to assert that the *middleware instance itself* was called during a request and to test any captured factory options based on values set at module load.
    *   Forgetting to use `express.json()` middleware on the test `app` instance would lead to `req.body` being undefined in `POST` or `PUT` request handlers, even if `supertest` sent a body. This was a common oversight when setting up the test Express application.
    *   Directly spying on methods of router instances that were created and used internally within the SUT (e.g., a sub-router created within `index.js`) was often unreliable. The `router.stack` inspection method provided a more stable alternative for verifying middleware and sub-router mounting.
    *   Inconsistent path mocking (e.g., `../../middleware/auth` vs. `../middleware/auth`) was a frequent source of initial test setup failures. Precise relative paths in `jest.mock` are critical.
    *   When testing file uploads with `multer`, simply mocking `upload.single()` to call `next()` wasn't always enough. If the controller relied on `req.file` or `req.files`, the mock middleware needed to populate these fields. Similarly, for `multipart/form-data` with text fields, the mock had to simulate `req.body` population if controllers depended on it.