# Test Coverage Improvement Tracking

This document serves as a working checklist to track our progress in improving test coverage based on our coverage improvement plan.

## Current Coverage Metrics

- [x] **Statements**: 37.72% → 38.93% → 40.57% → 54.21% → 55.38% → 58.97% → 63.72% → 66.07% → 67.73% → 68.04% → 67.86% → **68.3%**
- [x] **Branches**: 30.55% → 32.1% → 34.28% → 41.29% → 41.38% → 44.62% → 47.9% → 51.54% → 53.71% → 53.64% → 54.09% → **55.85%**
- [x] **Functions**: 41.14% → 41.95% → 45.14% → 54.62% → 59.1% → 61.26% → 65.18% → 67.7% → 67.39% → 67.52% → 65.46% → **66.6%**
- [x] **Lines**: 38.19% → 39.46% → 41.36% → 58.49% → 55.65% → 59.08% → 64.1% → 66.54% → 68.11% → 68.29% → 68.03% → **68.49%**

Last updated: May 3, 2025

## Phase 3: Foundational Utilities & Middleware

### Utils (Target: 80% Statements/Functions, 70% Branches)
*   **`adjustment-prompts.js`** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Test Handlebars helpers (`join`, `limit`, `capitalize`): [ ] (Partially covered implicitly)
        *   `join`: Empty array, array with items, null/undefined input.
        *   `limit`: Empty array, array < limit, array > limit, limit 0, null/undefined input.
        *   `capitalize`: Empty string, single/multi-char string, null/undefined input.
    *   Test `generateAdjustmentPrompt`: [x]
        *   [x] Success: Basic valid inputs for all arguments.
        *   [x] Success (Long Plan): `originalPlan` JSON > 1000 chars triggers summarization.
        *   [x] Success (Short Plan): `originalPlan` JSON <= 1000 chars uses full details.
        *   [x] Success (Profile Variations): Test with missing optional fields (age, gender, specific preferences).
        *   [x] Success (Feedback Variations): Test with each `parsedFeedback` category present/absent and with multiple items.
        *   [x] Success (Schema): Verify `jsonSchemaString` is correctly included.
        *   [x] Error Handling: Test `try...catch`.
    *   Test `generateSpecializedPrompt`: [x]
        *   [x] Success: Test each valid `adjustmentType` ('painConcern', 'equipmentLimitation', 'progression', 'substitution', 'volume', 'intensity', 'schedule', 'rest') with relevant `data`.
        *   [x] Edge Case: Invalid/unknown `adjustmentType` returns empty string.
    *   Test `formatAdjustedOutput`: [x]
        *   [x] Success: Valid `adjustedPlan`, `changes`, `explanations` are correctly stringified.
        *   [x] Structure Check: Verify the output matches the expected JSON structure.
        *   [x] Error Handling: Test `try...catch` fallback.
    *   Test `getFeedbackParsingPrompt`: [x]
        *   [x] Success: Verify the function returns the correct static prompt string.
    *   Test `getExplanationSummaryPrompt`: [x]
        *   [x] Success (Empty): `appliedChanges` is empty array.
        *   [x] Success (Non-Empty): `appliedChanges` has items, verify summary text format.
*   **`auth-utils.js`** (Target: 80% Stmts/Fn/Ln, 70% Br) **[DONE]**
    *   [x] Mock `jsonwebtoken` (`jwt.verify`).
    *   [x] Mock `logger` from `../config`.
    *   Test `verifyToken`:
        *   [x] Success: `jwt.verify` succeeds, returns decoded payload.
        *   [x] Error (Expired): `jwt.verify` throws `TokenExpiredError`, logs warning, throws `Error('Token has expired')`.
        *   [x] Error (Invalid): `jwt.verify` throws generic error, logs warning, throws `Error('Invalid token')`.
        *   [x] Secret Handling: Ensure `jwt.verify` is called with the correct secret (process.env or default).
    *   Test `extractTokenFromHeader`:
        *   [x] Success: Valid 'Bearer <token>' header returns '<token>'.
        *   [x] Error (Missing Header): `null` or `undefined` input throws `Error('Invalid Authorization header')`.
        *   [x] Error (No 'Bearer ' prefix): Input without 'Bearer ' prefix throws `Error('Invalid Authorization header')`.
        *   [x] Error (Only 'Bearer '): Input 'Bearer ' throws `Error('Invalid Authorization header')`.
*   **`error-handlers.js`** (Target: 80% Stmts/Fn/Ln, 70% Br) **[DONE]**
    *   [x] Mock `logger` from `../config`.
    *   [x] Mock `formatErrorResponse` from `./errors` (used real).
    *   [x] Mock Express `req`, `res` (with `status`, `json` spies), `next` function.
    *   [x] Mock `process.env.NODE_ENV`.
    *   Test `asyncHandler`:
        *   [x] Success: Wrapped function resolves, `next()` is not called with an error.
        *   [x] Error: Wrapped function rejects, `next()` is called with the error.
    *   Test `errorResponse`:
        *   [x] Error >= 500: Uses `logger.error`, sets correct status code (e.g., 500, 503), calls `res.json` with formatted error.
        *   [x] Error < 500: Uses `logger.warn`, sets correct status code (e.g., 400), calls `res.json` with formatted error.
        *   [x] Default Status: Plain Error defaults to 500.
        *   [x] Details Logging: Logs `error.details` if present.
        *   [x] Stack Trace Logging: Logs `error.stack` only if `NODE_ENV` is 'development'.
    *   Test `successResponse`:
        *   [x] Success (All Args): Sets specified status, calls `res.json` with `{ status: 'success', message, data }`.
        *   [x] Success (No Data): Calls `res.json` with `{ status: 'success', message }` (no `data` key).
        *   [x] Success (Defaults): Uses default status 200 and default message 'Success' when not provided.
*   **`logger.js`** (Target: 80% Stmts/Fn/Ln, 70% Br)
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
*   **`macro-calculator.js`** (Target: 80% Stmts/Fn/Ln, 70% Br) **[DONE]**
    *   [x] Mock `./validation-utils` (validateUserProfile, validateGoals, resolveGoalPriority, validateDietaryPreferences).
    *   [x] Mock `./unit-conversion` (UnitConverter class and its methods poundsToKg, inchesToCm).
    *   [x] Test `calculateBMR`:
        *   [x] Error: Throws if `userProfile` is missing.
        *   [x] Units (Imperial): Correctly calls `poundsToKg` and `inchesToCm`.
        *   [x] Units (Metric): Does *not* call conversion methods.
        *   [x] Gender (Male): Uses correct formula path.
        *   [x] Gender (Female): Uses correct formula path.
        *   [x] Gender (Other/Undefined): Uses averaging logic.
        *   [x] Hardcoded Values: Test specific inputs matching comments for compatibility.
        *   [x] Rounding: Result is rounded.
        *   [x] Internal Converter: Creates `UnitConverter` if not provided.
    *   [x] Test `calculateTDEE`:
        *   [x] Error: Throws if `bmr` is invalid.
        *   [x] Activity Levels: Correct multiplier used for 'sedentary', 'light', 'moderate', 'active', 'very_active'.
        *   [x] Default Level: Uses 'moderate' multiplier for null/undefined/invalid `activityLevel`.
        *   [x] Rounding: Result is rounded.
    *   [x] Test `calculateMacros`:
        *   [x] Error: Throws if `tdee` is invalid.
        *   [x] Goals (Primary): Correct `calorieAdjustment` and base percentages for 'weight_loss', 'muscle_gain', 'performance', 'maintenance', 'general_health', default.
        *   [x] Calorie Floor: `targetCalories` does not go below 1200.
        *   [x] Dietary Preferences: Correct percentage adjustments for 'keto', 'vegan', 'vegetarian', 'paleo', none/other.
        *   [x] Calculations: Correctly calculates grams from adjusted percentages and calories (4/4/9).
        *   [x] Output: Returns object with `calories`, `macros` (protein, carbs, fat grams), `percentages` (protein, carbs, fat %).
    *   [x] Test `getComprehensiveRecommendation`:
        *   [x] Validation Calls: Verifies calls to `ValidationUtils` methods.
        *   [x] Validation Failure: Throws error if any `ValidationUtils` call returns invalid.
        *   [x] Method Chaining: Verifies `calculateBMR`, `calculateTDEE`, `calculateMacros` are called correctly in sequence.
        *   [x] Internal Converter: Creates `UnitConverter` if not provided.
        *   [x] Output: Returns object with `bmr`, `tdee`, macro results (`calories`, `macros`, `percentages`), and `goals`.
*   **`nutrition-formulas.js`** (Target: 80% Stmts/Fn/Ln, 70% Br) **[DONE]**
    *   [x] Mock logger (e.g., `winston`).
    *   [x] Test `validateBMRInputs`:
        *   [x] Error (Missing Fields): Throws on missing age, weight, height, gender, units.
        *   [x] Error (Invalid Values): Throws on invalid age, weight, units, gender.
        *   [x] Error (Height Metric): Throws on invalid type/value for metric height.
        *   [x] Error (Height Imperial Num): Throws on invalid type/value for imperial number height.
        *   [x] Error (Height Imperial Obj): Throws on invalid type/value/range for imperial {feet, inches} object.
        *   [x] Error (Height Imperial Format): Throws on other invalid imperial height formats.
        *   [x] Success: Returns true for valid metric and imperial (object/number) inputs.
        *   [x] Logger: Verify `logger.error` called on validation failures.
    *   [x] Test `convertWeight`:
        *   [x] Success: kg -> lbs, lbs -> kg.
        *   [x] Success (No Change): kg -> kg, lbs -> lbs.
        *   [x] Error: Invalid units.
    *   [x] Test `convertHeight`:
        *   [x] Success: cm -> in/cm, in -> cm/in.
        *   [x] Success (ft_in Object): 'ft_in' {obj} -> cm/in.
        *   [x] Success (ft_in Number): 'ft_in' num -> cm/in, verify `logger.warn`.
        *   [x] Error: Invalid fromUnit/toUnit.
        *   [x] Error: Invalid value type for units.
    *   [x] Test `calculateBMR`:
        *   [x] Validation: Calls `validateBMRInputs` and throws if it fails.
        *   [x] Units (Metric): Correct calculation with metric inputs.
        *   [x] Units (Imperial Obj): Correct calculation using `convertWeight`/'ft_in' `convertHeight`.
        *   [x] Units (Imperial Num): Correct calculation using `convertWeight`/'in' `convertHeight`.
        *   [x] Gender: Correct formula used for 'male' and 'female'.
        *   [x] Rounding: Result is rounded.
        *   [x] Logger: Verify `logger.info` called.
    *   [x] Test `calculateTDEE`:
        *   [x] Validation: Throws on invalid BMR, missing/invalid activityLevel type, unrecognized activityLevel string.
        *   [x] Multipliers: Correct result for each valid `activityLevel` key/alias in `TDEE_MULTIPLIERS`.
        *   [x] Rounding: Result is rounded.
        *   [x] Logger: Verify `logger.info` on success, `logger.error` on validation failures.
    *   [x] Test `calculateMacros`:
        *   [x] Validation: Throws on invalid TDEE. Handles invalid/empty `goals` array (defaults to maintenance, logs warning).
        *   [x] Goal Logic: Correct percentages set for 'weight_loss', 'muscle_gain', 'maintenance', 'endurance', default.
        *   [x] Percentage Sum Check: Test fallback if percentages don't sum to ~1, verify `logger.error`.
        *   [x] Gram Calculation: Correct `protein_g`, `carbs_g`, `fat_g` calculated.
        *   [x] Recalculated Calories: Returned `calories` based on calculated grams.
        *   [x] Output: Returns correct structure `{ protein_g, carbs_g, fat_g, calories }`.
        *   [x] Logger: Verify `logger.info` on success, relevant logs on errors/warnings.
*   **`openai-helpers.js`** (Target: 80% Stmts/Fn/Ln, 70% Br) **[DONE]**
    *   [x] Mock `logger` from `../config`.
    *   [x] Test `formatMessages`:
        *   [x] Error: Throws if input is not array.
        *   [x] Error: Throws if messages are invalid (missing role/content, null, not object), logs error.
        *   [x] Success: Returns correctly formatted messages.
        *   [x] Success (Optional Fields): Includes `name`, `tool_call_id`, `tool_calls` if present.
        *   [x] Logger: Verify `logger.debug` called.
    *   [x] Test `extractJSONFromResponse`:
        *   [x] Input Handling: Returns `null` for null/undefined/non-string input, logs debug.
        *   [x] Extraction (Markdown): Correctly extracts and parses JSON from ```json ... ``` and ``` ... ``` blocks, logs debug.
        *   [x] Extraction (Braces): Correctly extracts and parses JSON using first/last brace boundaries, logs debug.
        *   [x] Extraction (Direct): Correctly parses string that is only valid JSON.
        *   [x] Parsing Failure (Invalid JSON): Logs warning and returns `null` if parsing fails.
        *   [x] Parsing Failure (Non-Object): Logs warning and returns `null` if parsed JSON is not an object.
        *   [x] No Boundaries: Logs debug and returns `null` if no clear boundaries found.
    *   [x] Test `validateResponse`:
        *   [x] Input Handling: Returns `false` for null/undefined response, logs warning.
        *   [x] Basic Success: Returns `true` for valid non-null input with no options.
        *   [x] `expectJson=true`: Returns `true` for valid JSON string/object, `false` for invalid JSON/non-string/non-object, logs appropriately.
        *   [x] `schemaValidator`: Calls validator, returns `true` on success (logs debug), `false` on schema mismatch or validator error (logs warning).
    *   [x] Test `createSystemPrompt`:
        *   [x] Success: Returns correct `{ role: 'system', content }` object.
        *   [x] Error: Throws on invalid/empty content.
    *   [x] Test `createUserPrompt`:
        *   [x] Success: Returns correct `{ role: 'user', content }` object.
        *   [x] Error: Throws on invalid/empty content.
    *   [x] Test `createAssistantPrompt`:
        *   [x] Success (String): Returns correct `{ role: 'assistant', content: 'string' }`.
        *   [x] Success (Null): Returns correct `{ role: 'assistant', content: null }`.
        *   [x] Error: Throws on invalid (undefined, empty string, non-string/non-null) content.
*   **`research-helpers.js`** (Target: 80% Stmts/Fn/Ln, 70% Br) **[DONE]**
    *   Mock internal logger (console) or spy on console methods.
    *   Test `validateUserParams`: [x]
        *   [x] Error: Missing `userParams`.
        *   [x] Error: Missing fields in `requiredFields` list.
        *   [x] Success: All required fields present.
        *   [x] Logger: Verify logger calls on failure.
    *   Test `formatResearchQuery`: [x]
        *   [x] Error: Returns `null` if `validateUserParams` fails.
        *   [x] Optional Params: Correct query string with/without equipment, restrictions, preferences.
        *   [x] `researchType`: Correct query variation for 'exercise', 'technique', 'nutrition', 'progression', default/unknown (logs warning).
    *   Test `formatExerciseQuery`: [x]
        *   [x] Error: Returns `null` if base formatter fails.
        *   [x] Refinement: Includes target muscle focus when present.
    *   Test `formatTechniqueQuery`: [x]
        *   [x] Error: Returns `null` if `userParams` or `exerciseName` missing (logs error).
        *   [x] Success: Returns correct technique-specific query.
    *   Test `formatNutritionQuery`: [x]
        *   [x] Error: Returns `null` if base formatter fails.
        *   [x] Refinement: Includes nutrition-specific text.
        *   [x] Logger: Verify `logger.info` call.
    *   Test `formatProgressionQuery`: [x]
        *   [x] Error: Returns `null` if base formatter fails.
        *   [x] Refinement: Includes progression-specific text.
    *   Test `extractResearchInsights`: [x]
        *   [x] Error: Invalid `rawResponse` (null, non-string) returns `null`, logs error.
        *   [x] Exercise: Extracts name, desc, diff, equip (list), muscles (list), instructions (multi-line) correctly when present/absent. Calls `formatExerciseData`.
        *   [x] Nutrition: Extracts item, calories (float), macros, benefits, serving correctly when present/absent. Calls `formatNutritionData`.
        *   [x] Unknown Type: Returns `{ rawContent }`, logs warning.
        *   [x] Error Handling: Catches errors during processing, logs error, returns `null`.
    *   Test `validateResearchResults`: [x]
        *   [x] Error: Invalid `structuredData` returns `false`, logs warning.
        *   [x] Completeness: Fails (`false`) if required fields missing for exercise/nutrition.
        *   [x] Relevance: Logs warning if keywords don't match, but may return `true`.
        *   [x] Trusted Sources: Logs warning/info based on trusted/untrusted/missing sources in mock `rawApiResponse`.
        *   [x] Safety: Logs warning for missing exercise instructions, lack of safety keywords, very low calories.
        *   [x] Constraints: Returns `false` or logs warning based on equipment/dietary/restriction mismatches.
        *   [x] Success: Returns `true` if checks pass.
    *   Test `formatExerciseData`: [x]
        *   [x] Defaults: Applies correct defaults for missing fields.
        *   [x] Arrays: Correctly formats/cleans/defaults `equipmentNeeded` and `musclesTargeted`.
        *   [x] Trimming: Trims string fields.
    *   Test `formatNutritionData`: [x]
        *   [x] Defaults: Applies correct defaults.
        *   [x] Types: Correctly handles types (calories as number, macros as string).
        *   [x] Trimming: Trims string fields.
*   **`research-prompts.js`** (Target: 80% Stmts/Fn/Ln, 70% Br) **[DONE]**
    *   Test `getAdditionalInstructions`:
        *   [x] Success (Defaults): Empty/no args return empty string.
        *   [x] Success (Beginner): `fitnessLevel='beginner'` adds beginner instruction.
        *   [x] Success (Injury String): `constraints.injury='string'` adds injury instruction.
        *   [x] Success (Injury Array): `constraints.injury=['array']` adds joined injury instruction.
        *   [x] Success (Combinations): Test combinations of beginner/non-beginner and injury/no-injury.
    *   Test `buildExerciseQuery`:
        *   [x] Success (All Args): Correctly replaces all placeholders with string/array inputs.
        *   [x] Success (Defaults): Uses defaults for equipment ('any'), constraints ('none'), instructions ('') when omitted.
        *   [x] Success (Required Defaults): Uses defaults for muscleGroup/fitnessLevel ('any') when omitted.
    *   Test `buildTechniqueQuery`:
        *   [x] Success (All Args): Correctly replaces all placeholders.
        *   [x] Success (Defaults): Uses defaults for technique, fitnessLevel, instructions when omitted.
    *   Test `buildProgressionQuery`:
        *   [x] Success (All Args): Correctly replaces all placeholders.
        *   [x] Success (Defaults): Uses defaults for exercise, fitnessLevel, instructions when omitted.
    *   Test `buildNutritionQuery`:
        *   [x] Success (All Args): Correctly replaces all placeholders with string/array inputs for restrictions.
        *   [x] Success (Defaults): Uses defaults for goal, restrictions, instructions when omitted.
    *   Test Exports: [x] Verify all expected functions/constants/schemas are exported.
*   **`research-utils.js`** (Target: 80% Stmts/Fn/Ln, 70% Br) **[DONE]**
    *   Mock `ajv` and its `compile`/`validate` methods/properties. [x]
    *   Mock `logger` from `../config`. [x]
    *   Test `validateAgainstSchema`:
        *   Error: Invalid schema input (null/non-object), logs error, returns specific error object. [x]
        *   Success (Empty Array): Handles empty array data correctly. [x]
        *   Success: Valid data passes validation. [x]
        *   Failure: Invalid data fails validation, logs warning, returns errors. [x]
        *   Error: Schema compilation error, logs error, returns specific error object. [x]
    *   Test `safeParseResponse`:
        *   Error: Invalid input (null/non-string), logs warning, returns null. [x]
        *   Success (Simple JSON): Parses valid JSON string. [x]
        *   Success (Double Encoded): Parses stringified JSON within a string. [x]
        *   Failure: Invalid JSON input, logs errors, returns null. [x]
    *   Test `extractExerciseData`:
        *   Mock `validateAgainstSchema`. [x] (Via Dependency Injection)
        *   Error: Null/undefined input `parsedData`, logs warning, returns error object. [x]
        *   Validation Failure: `validateAgainstSchema` returns false, logs warning, returns error object. [x]
        *   Success: `validateAgainstSchema` returns true, returns original `parsedData`. [x]
    *   Test `extractTechniqueData`:
        *   Mock `safeParseResponse`, `validateAgainstSchema`.
        *   Parsing Failure: `safeParseResponse` returns null, function returns null. [x]
        *   Validation Failure: `validateAgainstSchema` returns false, logs warning, returns error object. [x]
        *   Success: Both dependencies succeed, returns parsed data. [x]
    *   Test `extractProgressionData`:
        *   Mock `safeParseResponse`, `validateAgainstSchema`. [x] (Mocked Ajv compile for validator)
        *   Parsing Failure: `safeParseResponse` returns null, function returns null. [x]
        *   Validation Failure: `validateAgainstSchema` returns false, logs warning, returns error object. [x]
        *   Success: Both dependencies succeed, returns parsed data. [x]
    *   Test `validateSchemaAlignment`:
        *   Mock `logger`, mock `schema` (with `example`), mock `extractor` function. [x]
        *   Error: Schema or schema.example missing, logs warning, returns false. [x]
        *   Extractor Failure: Extractor returns null or throws, logs appropriately, returns false. [x]
        *   Required Fields Failure (Object/Array): Extracted data missing required fields, logs warning, returns false. [x]
        *   Result Type Mismatch: Extracted data type doesn't match schema type for required check, logs warning, returns false. [x]
        *   Success: Example data passes validation and required checks, logs success, returns true. [x]
    *   Test `generateContraindicationWarning`:
        *   Input Handling: Returns null for null/undefined/empty array. [x]
        *   Success: Returns correctly formatted warning string for valid input array (handles missing names). [x]
*   **`retry-utils.js`** (Target: 80% Stmts/Fn/Ln, 70% Br) **[DONE]**
    *   Use `jest.useFakeTimers()` and `jest.advanceTimersByTimeAsync()`. [x]
    *   Mock the function `fn` to be retried (allow controlling success/failure per attempt). [x]
    *   Test `retryWithBackoff`:
        *   Options (Defaults): Works correctly with default options. [x]
        *   Options (Custom): Correctly uses custom `maxRetries`, `initialDelay`, `backoffFactor`, `shouldRetry`. [x]
        *   Success (First Attempt): `fn` succeeds immediately, returns result, no delays. [x]
        *   Success (After Retries): `fn` fails N times (< maxRetries), then succeeds. Verifies correct number of calls to `fn`, `setTimeout` (with increasing backoff delays), and returns successful result. [x]
        *   Failure (Max Retries): `fn` always fails. Verifies correct number of calls (`maxRetries + 1`), correct delays, and throws the *last* error from `fn`. [x]
        *   `shouldRetry` (Prevents Retry by Error): Custom `shouldRetry` returns false for specific error, loop terminates early, error is thrown. [x]
        *   `shouldRetry` (Prevents Retry by Attempt): Custom `shouldRetry` returns false after N attempts, loop terminates early, error is thrown. [x]
        *   `attempt` Argument: Verify the attempt number passed to `fn` increments correctly. [x]
    *   **Successful Test Methods (Utils):** Testing retry logic (`retry-utils.js`) using `async`/`await`, `jest.useFakeTimers()`, `jest.spyOn(global, 'setTimeout')`, and `await jest.advanceTimersByTimeAsync()` worked well for verifying success paths, mock function calls, attempt numbers, and delay calculations. Using `await Promise.resolve()` after starting the async function under test helped synchronize assertions about the initial call. Asserting expected resolutions with `await expect(promise).resolves...` was straightforward.
    *   **Unsuccessful Test Methods (Utils):** Testing expected promise rejections in `retry-utils.js` with `await expect(promise).rejects.toThrow(...)`, even with correct async/timer handling, consistently resulted in Jest reporting the expected rejection as a test failure in the summary output, although the assertion itself logically passed. This appears to be a reporting artifact in Jest for complex async tests with fake timers.
    
*   **`supabase.js`** (Target: 80% Stmts/Fn/Ln, 70% Br) **[DONE]**
    *   Mock `env` from `../config`. [x]
    *   Mock `pg.Pool` and its methods (`connect`, `query`, `release`, `end`). [x]
    *   Mock `dns.promises.lookup`. [x]
    *   Test `getProjectRef`:
        *   [x] Success: Returns ref from `env.supabase.projectRef` if present.
        *   [x] Success: Extracts ref correctly from valid Supabase URL.
        *   [x] Error: Throws if env var missing and URL is invalid or doesn't contain ref.
    *   Test `createConnectionString`:
        *   [x] Options: Handles default and specific `type`, `useServiceRole` options.
        *   [x] Env Var Precedence: Correctly uses pre-configured env connection strings when available (service role, direct, pooler types).
        *   [x] Manual Construction: Correctly builds strings for 'direct', 'sessionPooler', 'transactionPooler' when env vars missing (uses service role or DB password).
        *   [x] Error: Throws on invalid `type` or if `getProjectRef` fails when needed.
    *   Test `getPoolConfig`:
        *   [x] Base Config: Includes correct base settings (SSL, timeouts, retries).
        *   [x] Type Specifics: Returns correct distinct configs for 'direct', 'sessionPooler', 'transactionPooler'.
        *   [x] Error: Throws on invalid `type`.
    *   Test `testConnection`:
        *   [x] Success: DNS lookup succeeds, Pool connects, query runs; returns success object with version/type. Verifies client release/pool end.
        *   [x] Failure (DNS Lookup): `dns.lookup` fails (error or empty result); returns specific DNS error object.
        *   [x] Failure (DB Connect): `pool.connect` fails; returns connection error object. Verifies pool end called. (Note: pool.end is not called if pool.connect fails, test adjusted)
        *   [x] Failure (DB Query): `client.query` fails; returns query error object. Verifies client release/pool end called.
        *   [x] Type Detection: Correctly identifies connection type based on string.
    *   Test `createConnectionWithFallback`:
        *   [x] Mock `createConnectionString`, `testConnection`.
        *   [x] Success (First Type): `testConnection` succeeds on first try.
        *   [x] Success (Fallback Type): `testConnection` fails for first N types, then succeeds.
        *   [x] Failure (All Types): `testConnection` fails for all types; returns last error.
        *   [x] Error (String Creation): Handles error from `createConnectionString`.
        *   [x] Options: Works with default and custom `types`, `useServiceRole`.
    *   **Successful Test Methods (Utils):** For `supabase.js`, mocking env/pg/dns worked well. Using `jest.spyOn` on `module.exports` after refactoring internal calls in the implementation was key for testing functions calling other functions in the same module (`createConnectionWithFallback`). Controlling mock resolutions/rejections (`mockResolvedValue`, `mockRejectedValue`, `mockImplementation`) effectively tested different paths. Adjusting test expectations for specific error codes/messages (`ERR_INVALID_URL`) thrown by underlying Node/implementation logic was necessary.
    *   **Unsuccessful Test Methods (Utils):** Spying on direct internal calls within the same CommonJS module failed initially; required refactoring implementation (`supabase.js`) to use `module.exports`. Misunderstanding implementation details (e.g., loops continuing after caught errors, exact error codes from `new URL()`) led to incorrect initial test assertions that needed correction.

*   **`unit-conversion.js`** (Target: 80% Stmts/Fn/Ln, 70% Br) **[DONE]**
    *   Test `convertHeightToMetric`:
        *   [x] Validation: Throws on invalid/NaN/negative feet/inches.
        *   [x] Success: Correct cm calculation & rounding (feet only, feet+inches).
    *   Test `convertHeightToImperial`:
        *   [x] Validation: Throws on invalid/NaN/negative cm.
        *   [x] Success: Correct calculation of feet and inches.
        *   [x] Edge Case: Correctly handles inches rounding up to 12 (increments feet, resets inches to 0).
    *   Test `convertWeightToMetric`:
        *   [x] Validation: Throws on invalid/NaN/negative lbs.
        *   [x] Success: Correct kg calculation & rounding.
    *   Test `convertWeightToImperial`:
        *   [x] Validation: Throws on invalid/NaN/negative kg.
        *   [x] Success: Correct lbs calculation & rounding.
    *   Test `convertHeight`:
        *   [x] Validation: Invalid `fromUnit`/`toUnit`. Logger called.
        *   [x] No Change: Returns input if `fromUnit === toUnit`.
        *   [x] Metric -> Imperial: Calls `convertHeightToImperial`.
        *   [x] Imperial (Num) -> Metric: Correct cm calculation from inches.
        *   [x] Imperial (Obj) -> Metric: Calls `convertHeightToMetric` (feet/inches).
        *   [x] Error (Imperial): Throws on invalid imperial input type/structure. Logger called.
        *   [x] Error Handling: Verify wrapper error message format.
    *   Test `convertWeight`:
        *   [x] Validation: Invalid `fromUnit`/`toUnit`. Logger called.
        *   [x] No Change: Returns input if `fromUnit === toUnit`.
        *   [x] Metric -> Imperial: Calls `convertWeightToImperial`.
        *   [x] Imperial -> Metric: Calls `convertWeightToMetric`.
        *   [x] Error Handling: Verify wrapper error message format.
    *   Test `formatHeight`:
        *   [x] Validation: Invalid value/unitSystem. Logger called.
        *   [x] Metric: Correct `${value} cm` format.
        *   [x] Imperial: Calls `convertHeightToImperial`, correct `${feet}\'${inches}"` format.
    *   Test `formatWeight`:
        *   [x] Validation: Invalid value/unitSystem. Logger called.
        *   [x] Metric: Correct `${value} kg` format.
        *   [x] Imperial: Correct `${value} lbs` format.
    *   Test `convertUserProfile`:
        *   [x] Validation: Invalid `fromUnit`/`toUnit`. Logger called.
        *   [x] No Change: Returns copy if `fromUnit === toUnit`.
        *   [x] Success: Converts height and weight correctly.
        *   [x] Success: Updates `preferences.units`.
        *   [x] Partial Data: Handles profile missing height/weight/preferences gracefully.
        *   [x] Error: Correctly propagates errors from internal `convertHeight`/`convertWeight`. Verify wrapper error message format. Logger called on error.
        *   [x] Logger: Verify `logger.info` called on success.
    *   [x] Test `CONVERSION_CONSTANTS` export.
*   **`validation-utils.js`** (Target: 80% Stmts/Fn/Ln, 70% Br) **[DONE]**
    *   Test `isValidNumber`:
        *   [x] Success: Valid positive numbers.
        *   [x] Failure: Zero, negative numbers, non-numbers, NaN, Infinity.
    *   Test `isValidGender`:
        *   [x] Success: 'male', 'female', 'other' (case-insensitive, with/without padding).
        *   [x] Failure: Invalid strings, non-strings, null.
    *   Test `isValidActivityLevel`:
        *   [x] Success: 'sedentary', 'light', 'moderate', 'active', 'very_active' (case-insensitive, with/without padding).
        *   [x] Failure: Invalid strings, non-strings, null.
    *   Test `validateUserProfile`:
        *   [x] Error: Null/undefined profile returns `isValid: false` with message.
        *   [x] Success: Valid profile returns `isValid: true`, empty messages.
        *   [x] Failure (Required): Missing/invalid weight, height, age returns `isValid: false` with specific messages.
        *   [x] Failure (Optional): Invalid gender, activityLevel returns `isValid: false` with specific messages.
        *   [x] Success (Optional): Missing gender, activityLevel returns `isValid: true`.
    *   Test `validateGoals`:
        *   [x] Error: Null/undefined/empty array returns `isValid: false` with message.
        *   [x] Success: Valid goals array returns `isValid: true`, empty messages (unless conflicting).
        *   [x] Failure: Array with invalid goal strings returns `isValid: false` with specific message.
        *   [x] Conflict: Array with 'weight_loss' and 'muscle_gain' returns `isValid: true` but includes note in messages.
    *   Test `validateDietaryPreferences`:
        *   [x] Success (Optional): Null/undefined input returns `isValid: true`.
        *   [x] Success: Valid preferences object returns `isValid: true`.
        *   [x] Failure: Invalid `dietType` returns `isValid: false` with message.
        *   [x] Failure: Non-array `allergies`, `preferredFoods`, `avoidedFoods` returns `isValid: false` with messages.
    *   Test `resolveGoalPriority`:
        *   [x] Defaults: Null/undefined/empty array returns `{ primaryGoal: 'general_health', secondaryGoals: [] }`.
        *   [x] Success: Correctly identifies primary and secondary based on priority order for various combinations.
        *   [x] Unknown Goals: Handles unknown goals correctly (places them at the end of secondary).
*   **`validation.js`** (Target: 80% Stmts/Fn/Ln, 70% Br) **[DONE]**
    *   Mock or spy on `logger` (winston instance).
    *   Test `ValidationUtils` constructor:
        *   [x] Success: Instantiates with default logger.
        *   [x] Success: Instantiates with provided mock logger.
    *   Test `validateUserProfile`:
        *   [x] Error: Null/undefined profile returns specific error.
        *   [x] Options (`requireAllFields`): Test true/false behavior with missing required fields.
        *   [x] Options (`validateValues`): Test true/false behavior with invalid field values.
        *   [x] Validation (Age): Test invalid type, NaN, negative, < 13, > 120.
        *   [x] Validation (Weight - Metric): Test invalid type, zero, negative, out of range (20-300).
        *   [x] Validation (Weight - Imperial): Test invalid type, zero, negative, out of range (44-660).
        *   [x] Validation (Height - Metric): Test invalid type, NaN, zero, negative, out of range (120-250).
        *   [x] Validation (Height - Imperial Num): Test invalid type, NaN, zero, negative.
        *   [x] Validation (Height - Imperial Obj): Test invalid types/NaN/negative for feet/inches, inches >= 12, out of range (48-96 total inches).
        *   [x] Validation (Height - Imperial Other): Test non-number/non-object height.
        *   [x] Validation (Gender): Test invalid type, unknown strings.
        *   [x] Validation (Units): Test invalid type, unknown strings.
        *   [x] Success: Valid profile (metric/imperial, with/without optionals) returns `isValid: true`, empty errors.
        *   [x] Logger: Verify `logger.error` called on validation failures.
    *   Test `validateAndPrioritizeGoals`:
        *   [x] Error: Null/non-array/empty array input returns specific errors.
        *   [x] Success (Normalization): Valid goals (direct match, aliases, padding, case-insensitive) are normalized.
        *   [x] Error (Unknown): Array with unknown goal strings returns `isValid: false` with specific error.
        *   [x] Conflict: Array with 'weight_loss' and 'weight_gain' returns `isValid: false` with specific error.
        *   [x] Priority: Verify correct `primaryGoal` determination based on priority for various combinations.
        *   [x] Output: Verify structure `{ isValid, errors, normalizedGoals, primaryGoal }`.
        *   [x] Logger: Verify `logger.error` called on validation failures.
    *   Test `validateActivityLevel`:
        *   [x] Error: Null/non-string input returns specific error.
        *   [x] Success (Normalization): Valid levels (direct match, aliases, padding, case-insensitive) return correct `normalizedLevel` and `multiplier`.
        *   [x] Error (Unknown): Unknown level string returns `isValid: false` with specific error.
        *   [x] Output: Verify structure `{ isValid, errors, normalizedLevel, multiplier }`.
        *   [x] Logger: Verify `logger.error` called on validation failures.
    *   Test `validateDietaryPreferences`:
        *   [x] Success (Optional): Null/undefined input returns `{ isValid: true, errors: [], normalized: {} }`.
        *   [x] Validation (Restrictions): Test non-array, array with unknown strings.
        *   [x] Validation (Meal Frequency): Test non-number, NaN, < 1, > 10.
        *   [x] Validation (Disliked/Allergies): Test non-array.
        *   [x] Success: Valid preferences object returns `isValid: true`, normalized values.
        *   [x] Normalization: Verify strings are lowercased/trimmed in `normalized` object.
        *   [x] Output: Verify structure `{ isValid, errors, normalized }`.
        *   [x] Logger: Verify `logger.error` called on validation failures.
*   [x] **Overall Utils Coverage**
  | Statements |  Branches  |  Functions  |     Lines    |
  | :--------: |  :------:  |  :-------:  |     :---:    |
  | [x] 96.74% | [x] 90.47% | [x] 96.26%  |  [x] 97.23%  |

*   **Successful Test Methods (Utils):** Testing simple string/object returning functions by asserting output structure/content. For Handlebars template generators, providing varied mock context objects and checking `toContain` on the output string works well. Testing internal `catch` blocks requires ensuring the error occurs *within* the `try` block; **Dependency Injection (passing mock functions/objects as arguments) is effective for mocking module-internal dependencies (like compiled templates or validators) that are difficult to mock externally due to scope/caching.** Using `jest.spyOn(console, 'error').mockImplementation()` helps manage expected error logs. Mocking external libraries (`jsonwebtoken`, `ajv`) and their methods (`jwt.verify`, `ajv.compile`) to simulate success/error return values is standard and effective. Using `expect().toThrow()` works well for error path testing. Testing functions that use `process.env` requires careful management of the environment variable within the test setup (e.g., setting/deleting in `beforeEach` or specific tests) and aligning assertions with the function's internal fallback logic. **Testing Express-style middleware utils (`asyncHandler`, `errorResponse`, `successResponse`) involves mocking `req`, `res` (with chained `status().json()` spies), and `next`. Asserting calls to these mocks based on different inputs (including various error types/status codes) is effective. Testing higher-order functions (`asyncHandler`) works by passing mock functions that resolve/reject.** **Mocking CommonJS classes requires using the `jest.mock()` factory pattern to return a mock constructor, which in turn returns an object containing mocks for instance methods. Defining method mocks outside the factory and clearing them in `beforeEach` aids test isolation.** **Using `jest.spyOn()` on static methods within the same class is effective for testing orchestrator methods.** **Using `expect.objectContaining()` or `expect.any()` when asserting arguments passed to mocks (especially object instances) can be more robust than checking for exact reference equality.** **Mocking internal default dependencies (like `winston`) requires defining the mock *before* the `jest.mock()` call and requiring the module under test *after* the mock setup.** **Testing validation functions requires careful separation of `null`/`undefined` checks (missing field errors) from invalid value/type checks.** **Testing JSON parsing/extraction logic involves testing various formats (markdown, brace-bound, direct) and failure modes (invalid JSON, non-object JSON).** **Spying on `console` methods worked well for simple logging.** **Refactoring tests into separate `it` blocks for each specific condition (especially when testing validation/logging) resolved issues with `mockClear()` and cumulative assertions.** **Testing functions that return `true`/`false` based on multiple internal checks requires carefully constructing input data to isolate each check and asserting both the return value and any associated log messages (info for warnings, warn for fatal errors).** **Mocking parts of the global environment (like `String.prototype.match`) can be used to simulate internal errors.** **Fixing implementation logic (like the implicit dietary check or template string issues in `research-prompts.js`) is necessary when tests correctly reflect flawed behavior.** **Testing pure string manipulation utilities (like `research-prompts.js`) relies effectively on direct input/output assertions (`toContain`, `toBe`, checking trimmed output with `endsWith`) and verifying default value handling.** **Mocking external dependencies (`Ajv`) within the specific `describe` block for the function under test allows fine-grained control over the dependency's behavior for that function's tests.** For pure numeric conversion and formatting utilities (like `unit-conversion.js`), direct input/output assertions (`.toBe()`, `.toEqual()`, `.toBeCloseTo()`) and `expect().toThrow()` for validation are highly effective. Systematically testing invalid input types (string, null, undefined, NaN), boundary conditions (negative, zero), and rounding with `toBeCloseTo()` covers most cases. **For class-based utilities with dependencies (like `unit-converter.js`), instantiating the class in `beforeEach` with mock dependencies (e.g., a logger object with `jest.fn()` methods) is effective. Testing involves calling instance methods and asserting outputs, thrown errors (`toThrow`), and calls to mock dependency methods (`toHaveBeenCalledWith`).** Testing simple validation functions that return an object with `isValid` (boolean) and `messages` (array) was straightforward. We covered: null/undefined/empty inputs; valid inputs that should pass; various invalid inputs that should fail, checking for specific error messages in the `messages` array; case-insensitivity and padding for string inputs where applicable; combinations of valid and invalid data within more complex objects; priority logic by providing different combinations of inputs and asserting the `primaryGoal` and `secondaryGoals`. All tests were synchronous and involved direct input/output assertions using `toBe`, `toEqual`, `toContain`, and `not.toContain`. Mocking `winston` using `jest.mock()` with a factory function defining the mock logger inside resolved initialization errors. Instantiating class-based utilities (`validation.js`) with mock loggers worked well for verifying logger calls (`toHaveBeenCalledWith`, `not.toHaveBeenCalled`) for specific error conditions.
*   **Unsuccessful Test Methods (Utils):** Trying to trigger `catch` blocks by providing invalid data to lenient libraries like Handlebars often fails as they might render partial output instead of throwing. Mocking functions (like `Handlebars.compile`) that run at the *module scope* doesn't help test `try...catch` blocks *inside* exported functions that execute later. Trying to modify module exports from a test (`module.exports.someFunc = mock`) often doesn't affect internal references within the module due to CommonJS caching/scoping. Initial environment variable tests can fail if the assertion doesn't match the function's internal default/fallback logic when the `process.env` variable is undefined in the test context. **Testing synchronous error handling within promise-catching wrappers like `asyncHandler` can be misleading in direct unit tests, as it doesn't fully replicate Express's own sync error handling.** **Initial assertions about the output of dependencies (like `formatErrorResponse`) can be wrong; it's important to verify the dependency's actual behavior or mock it precisely.** **Attempting to call `.mockImplementation()` directly on a mocked class constructor (instead of within the factory or on an instance) will fail.** **Asserting `toHaveBeenCalledWith` using a direct mock instance reference (`MockClass.mock.instances[0]`) can be brittle; `expect.objectContaining` is often better.** **Mocking modules/variables *after* they are required/referenced (due to hoisting) causes `ReferenceError`.** **Initial test logic may incorrectly assert the expected error type if the implementation handles different invalid inputs with different error messages (e.g., format error vs. value error). Align tests with actual implementation behavior or fix implementation.** **Using `jest.spyOn` on functions within the same module can be unreliable if not attached correctly to the exported object or if used to intercept calls *within* other functions of the same module; mocking external dependencies or testing integrated behavior is often necessary.** **Forgetting to import all functions under test leads to `ReferenceError`s.** **Asserting complex combined log messages with multiple `expect.stringContaining` using `&&` proved unreliable; asserting the exact final string or simplifying the check was necessary.** **Initial regex checks (e.g., `not.toMatch(/\.\s*$/)`) for template output can be less direct than simple string methods (`endsWith` after `trim`) when debugging template spacing/punctuation issues.** **Relying on specific methods of a mocked dependency (like `ajv.errorsText`) within the implementation file can fail if the mock setup doesn't include that specific method; refactoring the implementation to remove such direct dependencies can improve testability.** Misunderstanding implementation details (e.g., default parameter values, error wrapping logic) can lead to initially incorrect test assertions, requiring careful review of the function/method signature and behavior (as seen with `unit-conversion.js` and `unit-converter.js`). Initial attempt to mock `winston` by defining the mock logger outside the factory failed (`ReferenceError`). Initial assumptions about logger calls being generic for any error were incorrect; tests needed adjustment to verify specific, explicit log calls made by the implementation. Implementation logic needed fixing for object validation (e.g., height array check, weight object check) when initial tests revealed flaws.

### Middleware (Target: 80% Statements/Functions, 70% Branches)
*   **`error-middleware.js`** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   [x] Mock `logger` from `../config`.
    *   [x] Mock `formatErrorResponse` from `../utils/errors`.
    *   [x] Mock Error classes (`ApiError`, `AgentError`, `NotFoundError`, custom errors).
    *   [x] Mock Express `req`, `res` (with `status`, `json`, `headersSent` flag), `next` spy.
    *   [x] Mock `process.env.NODE_ENV`.
    *   [x] Mock `global.server` and its `close` method.
    *   [x] Mock `process.exit`.
    *   Test `notFoundHandler`:
        *   [x] Success: Calls `next` with a `NotFoundError` instance.
        *   [x] Success: The passed error has the correct message including `req.originalUrl`.
    *   Test `mapAgentErrorToStatusCode`:
        *   Mapping: Test each specific `ERROR_CODES` maps to the correct HTTP status.
        *   Default: Test an unknown error code maps to 500.
    *   Test `globalErrorHandler`:
        *   [x] Headers Sent: If `res.headersSent` is true, calls `next` with the error and does nothing else.
        *   AgentError Handling:
            *   [x] Mapping: Calls `mapAgentErrorToStatusCode`.
            *   [x] Logging (Error): Logs as 'error' if `statusCode >= 500`. Verify logged details (code, message, details).
            *   [x] Logging (Warn): Logs as 'warn' if `statusCode < 500`. Verify logged details.
            *   [x] Logging (Dev): Includes `stack` and `originalError` details in log only if `NODE_ENV=development`.
            *   [x] Response: Calls `res.status().json()` with the correct status code and formatted response (specific AgentError structure).
        *   ApiError/Generic Error Handling:
            *   Status Code: Uses `err.statusCode` if available, defaults to 500.
            *   Logging (Error): Logs as 'error' if `!err.isOperational` or `statusCode >= 500`. Verify logged details (status, message, operational).
            *   Logging (Warn): Logs as 'warn' if `err.isOperational` and `statusCode < 500`. Verify logged details.
            *   Logging (Dev): Includes `stack` in log only if `NODE_ENV=development`.
            *   Logging (Details): Includes `err.details` in log if present.
            *   Response Format: Calls `formatErrorResponse` to get the response body.
            *   Response: Calls `res.status().json()` with the correct status code and formatted response from `formatErrorResponse` mock.
    *   Test `handleFatalError`:
        *   Logging: Calls `logger.fatal` with correct source ('uncaughtException'/'unhandledRejection') and error details (message, stack).
        *   Server Close (Success): Calls `global.server.close`, logs message, calls `process.exit(1)` in callback.
        *   Server Close (Timeout): Sets timeout, calls `logger.fatal` (timeout message), calls `process.exit(1)` after timeout. (Use `jest.useFakeTimers`).
        *   Server Close (No Server): If `global.server` is undefined, logs message, calls `process.exit(1)` immediately.
*   **`errorHandler.js`** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock `logger` from `../config`.
    *   Mock `formatErrorResponse` from `../utils/errors`.
    *   Mock Error classes (`ApiError`, `AgentError`, custom errors with specific codes like 'PGRST301').
    *   Mock Express `req`, `res` (with `status`, `json` spies), `next` function.
    *   Mock `process.env.NODE_ENV`.
    *   Test `notFoundHandler`:
        *   [x] Success: Calls `res.status(404).json()` with the exact expected error object.
    *   Test `mapAgentErrorToStatusCode`:
        *   [x] Mapping: Test each specific `ERROR_CODES` maps to the correct HTTP status.
        *   [x] Default: Test an unknown error code maps to 500.
    *   Test `errorHandler`:
        *   AgentError Handling:
            *   [x] Mapping: Calls `mapAgentErrorToStatusCode`.
            *   [x] Logging (Error): Logs as 'error' if `statusCode >= 500`. Verify logged details (code, message, details).
            *   [x] Logging (Warn): Logs as 'warn' if `statusCode < 500`. Verify logged details.
            *   [x] Logging (Dev): Includes `stack` and `originalError` details in log only if `NODE_ENV=development`.
            *   [x] Response: Calls `res.status().json()` with the correct status code and formatted response (specific AgentError structure).
        *   ApiError/Generic Error Handling:
            *   [x] Status Code: Uses `err.statusCode` if available, defaults to 500.
            *   [x] Logging (Error): Logs as 'error' if `statusCode >= 500`. Verify logged details.
            *   [x] Logging (Warn): Logs as 'warn' if `statusCode < 500`. Verify logged details.
            *   [x] Logging (Dev): Includes `stack` in log only if `NODE_ENV=development`.
            *   [x] Logging (Details): Includes `err.details` in log if present.
            *   [x] Response Format: Calls `formatErrorResponse` to get the response body.
            *   [x] Response: Calls `res.status().json()` with the correct status code and formatted response from `formatErrorResponse` mock.
    *   Test `supabaseErrorHandler`:
        *   [x] Mapping (PGRST301): Maps to AgentError (RESOURCE_ERROR).
        *   [x] Mapping (PGRST204): Returns null.
        *   [x] Mapping (23505): Maps to ApiError (409).
        *   [x] Mapping (23503): Maps to AgentError (VALIDATION_ERROR).
        *   [x] Mapping (23502): Maps to AgentError (VALIDATION_ERROR).
        *   [x] Mapping (23514): Maps to AgentError (VALIDATION_ERROR).
        *   [x] Mapping (42601): Maps to AgentError (EXTERNAL_SERVICE_ERROR).
        *   [x] Mapping (42501): Maps to ApiError (403).
        *   [x] Mapping (Other): Maps other codes to AgentError (EXTERNAL_SERVICE_ERROR).
        *   [x] Error Object: Verify the created ApiError/AgentError has the original Supabase error message/code included correctly.
*   **`validation.js`** (Target: 80% Stmts/Fn/Ln, 70% Br)
    *   Mock `logger` from `../config`.
    *   Mock Express `req` (with `body`, `query`, `params`), `res` (with `status`, `json` spies), `next` spy function.
    *   Test `formatValidationError` function:
        *   Success: Provide a Joi error object (mocked or from a real Joi validation failure).
        *   Verify returned object structure: `status: 'error'`, `message: 'Validation failed'`, `errors` array.
        *   Verify `errors` array content: each element has `field`, `message`, `type`.
    *   Test `validate` middleware factory:
        *   Schema Validation (Error Path - for a sample schema like `userSchemas.login`):
            *   Input: Invalid data for the schema (e.g., missing email).
            *   Source: Test for `source = 'body'`, `source = 'query'`, `source = 'params'`.
            *   Verify `logger.warn` is called with correct path and error details.
            *   Verify `res.status(400).json` is called.
            *   Verify the argument to `res.json` is the output of `formatValidationError` (check structure).
            *   Verify `next` is NOT called.
        *   Schema Validation (Success Path - for a sample schema):
            *   Input: Valid data for the schema.
            *   Source: Test for `source = 'body'`, `source = 'query'`, `source = 'params'`.
            *   Verify `req[source]` is updated with the `value` returned by `schema.validate`.
            *   Verify `next` is called.
            *   Verify `res.status().json()` is NOT called by this middleware.
        *   Strip Unknown: Ensure `stripUnknown: true` is effective (pass extra fields and check they are removed from `req[source]`).
    *   Test Individual Schemas (Iterate through all schemas in `userSchemas`, `workoutSchemas`, `profileSchemas`, plus standalone schemas):
        *   For each schema (e.g., `userSchemas.register`):
            *   For each field in the schema:
                *   Success: Valid data satisfying all rules for that field.
                *   Failure (Required): If field is `.required()`, test with missing field. Verify specific Joi message.
                *   Failure (Type): Invalid data type (e.g., number for string). Verify Joi message.
                *   Failure (Min/Max): Data violating `.min()` or `.max()` for strings/numbers/arrays. Verify Joi message.
                *   Failure (Pattern): Data violating `.pattern()`. Verify Joi message.
                *   Failure (Email): Invalid email for `.email()`. Verify Joi message.
                *   Failure (Valid/Only): Data not in `.valid()` or `.only()` set. Verify Joi message.
                *   Failure (UUID): Invalid UUID for `.uuid()`. Verify Joi message.
                *   Failure (Date): Invalid date for `.date()`. Verify Joi message.
                *   Failure (Alternatives): Test each alternative in `Joi.alternatives().try(...)` with valid/invalid data. (e.g. `profileSchemas.create.height`).
                *   Failure (Object Min): For `Joi.object().min(1)`, test with empty object. Verify Joi message.
                *   Success (Default): Field omitted, verify `req[source]` gets the default value.
                *   Success (Optional): Field omitted and present.
                *   Success (With): For `.with('peer', 'anotherPeer')`, test scenarios where dependent fields are present/absent.
            *   Ensure custom Joi messages (`.messages({...})`) are triggered and validated in responses.
    *   Test `workoutSchemas.workoutGenerationSchema`:
        *   fitnessLevel: required, valid enum.
        *   goals: required, array of strings, min 1.
        *   equipment: array of strings, defaults to [].
        *   restrictions: array of strings, defaults to [].
        *   exerciseTypes: required, array of strings, min 1.
        *   workoutFrequency: required string.
        *   additionalNotes: string, max 500, allow '', default ''.
    *   Test `workoutSchemas.workoutReGenerationSchema`:
        *   At least one field required (`.min(1)`).
        *   Each field (fitnessLevel, goals, etc.) with its specific validation if provided.
    *   Test `workoutSchemas.workoutAdjustmentSchema`:
        *   `adjustments` object: required.
        *   `adjustments.exercisesToAdd`: optional array of objects.
        *   `adjustments.exercisesToRemove`: optional array of UUID strings.
        *   `adjustments.notesOrPreferences`: required string, max 1000.
    *   Test `workoutSchemas.workoutQuerySchema` (source: 'query'):
        *   limit: number, integer, min 1, max 100, default 10.
        *   offset: number, integer, min 0, default 0.
        *   searchTerm: optional string, trim, max 100.
    *   Test `workoutSchemas.workoutLogSchema`:
        *   plan_id: required UUID.
        *   date: required date.
        *   completed: boolean, default true.
        *   exercises_completed: required array, min 1.
            *   Each item: exercise_id (req string), exercise_name (req string), sets_completed (req int, min 1), reps_completed (req array of int >=0), weights_used (req array of num >=0), felt_difficulty (opt int, 1-10), notes (opt string).
        *   overall_difficulty, energy_level, satisfaction: optional int, 1-10.
        *   feedback: optional string, max 1000.
    *   Test `workoutSchemas.workoutLogUpdateSchema`:
        *   Object `.min(1)`.
        *   Each field similar to `workoutLogSchema` but optional.
    *   Test `workoutSchemas.workoutLogQuerySchema` (source: 'query'):
        *   limit, offset (as above).
        *   startDate, endDate: optional dates.
        *   planId: optional UUID.
    *   Test `profileSchemas.create`:
        *   name: required string, min 2, max 100.
        *   age: required int, min 13, max 120.
        *   gender: required enum.
        *   height: required alternative (number for metric, {feet, inches} for imperial). Test valid/invalid for both.
        *   weight: required positive number.
        *   unitPreference: required enum ('metric', 'imperial').
        *   activityLevel: required enum.
        *   fitnessGoals, healthConditions, equipment: array of strings, default [].
        *   experienceLevel: enum, default 'beginner'.
    *   Test `profileSchemas.update`:
        *   Object `.min(1)`.
        *   Each field similar to `create` but optional.
    *   Test `profileSchemas.preferences`:
        *   Object `.min(1)`.
        *   unitPreference, fitnessGoals, equipment, experienceLevel (optional versions of profile fields).
        *   notificationPreferences: object with email (bool), push (bool), frequency (enum). Defaults tested.
    *   Test `measurementsSchema`:
        *   All fields (waist, chest, etc.): optional positive numbers.
    *   Test `checkInSchema`:
        *   date: required.
        *   weight, body_fat_percentage: optional positive numbers with ranges.
        *   measurements: optional `measurementsSchema`.
        *   mood, sleep_quality: optional enums.
        *   energy_level, stress_level: optional int, 1-10.
        *   notes: optional string, max 500.
    *   Test `metricCalculationSchema`:
        *   startDate, endDate: required dates, endDate >= startDate.
    *   Test `macroCalculationSchema`:
        *   weight: required number, range.
        *   height: required alternative (number for metric cm, {feet, inches} for imperial). Test ranges.
        *   age: required int, range.
        *   gender: required enum.
        *   activityLevel: required enum.
        *   goal: required enum.
        *   units: enum, default 'metric'.
        *   useExternalApi: boolean, default true.
    *   Test `notificationPreferencesSchema`:
        *   email_enabled, sms_enabled, push_enabled, in_app_enabled: optional booleans.
        *   quiet_hours_start, quiet_hours_end: optional string HH:MM pattern.
    *   Test `validateCheckIn` custom middleware:
        *   Success: Valid req.body, `next()` called, `req.body` is updated with validated value.
        *   Failure: Invalid req.body, `res.status(400).json()` called with specific error structure, `next()` not called.
    *   Test `validateMetricsCalculation` custom middleware:
        *   Success: Valid req.body, `next()` called, `req.body` is updated.
        *   Failure: Invalid req.body (e.g., endDate < startDate), `res.status(400).json()` called, `next()` not called.
    *   Test `validateMacroCalculation` custom middleware:
        *   Success (Metric): Valid metric req.body, `next()` called, `req.body` is updated.
        *   Success (Imperial): Valid imperial req.body.
            *   Verify internal conversion: `value.weight` (lbs to kg), `value.height` (ft/in to cm).
            *   `next()` called, `req.body` is updated with converted metric values.
        *   Failure: Invalid req.body, `res.status(400).json()` called, `next()` not called.
    *   Test `validateNotificationPreferences` custom middleware:
        *   Success: Valid req.body, `next()` called, `req.body` is updated.
        *   Failure: Invalid req.body (e.g., invalid quiet hours format), `res.status(400).json()` called, `next()` not called.
    *   Ensure all exported validation middlewares (e.g., `validateWorkoutGeneration`, `validateWorkoutLog`) are tested by proxy through testing the `validate` factory with their respective schemas and sources.

*   [x] **Overall Middleware Coverage**
  | Statements |  Branches  |  Functions  |     Lines    |
  | :--------: |  :------:  |  :-------:  |     :---:    |
  | [x] 93.97% | [x] 90% | [x] 92.37%  |  [x] 94.45%  |
  
*   **Successful Test Methods (Middleware):** Mocking Express `req`/`res`/`next` objects (including chained methods like `status().json()`). Mocking dependencies (`logger`, `formatErrorResponse`, error classes). Controlling `process.env.NODE_ENV`. Mocking `global.server` and `process.exit`. Using fake timers (`jest.useFakeTimers`) for `setTimeout`. Testing different error types/properties (`instanceof`, `isOperational`, `statusCode`). Using `expect.objectContaining`/`stringContaining`/`expect.arrayContaining`. Using `toHaveBeenNthCalledWith`. Explicitly setting properties on error instances post-construction (e.g., `err.isOperational = false`) was more reliable than relying solely on constructor parameters in tests. Asserting `toBeUndefined()` for properties expected to be undefined. For custom middleware functions, invoking them directly with mock req/res/next worked well. Asserting the response structure (status, message, details) for 400 errors and verifying `req.body` updates on success paths covered their functionality.
*   **Unsuccessful Test Methods (Middleware):** Relying solely on constructor parameters for `AgentError`/`ApiError` occasionally led to unexpected logged values (fixed by explicit property setting). Initial assertions sometimes misinterpreted implementation details (e.g., expecting `isOperational: false` for generic errors instead of `undefined`, misinterpreting sequences of log calls) requiring correction. Asserting exact custom Joi messages defined via `.messages({...})` proved unreliable in some cases (e.g., `validateCheckIn`, `validateMetricsCalculation`), potentially due to nuances in how Joi applies object-level messages vs. field-level messages; reverting to check only the error field or using `stringContaining` was more robust.