# Coverage Improvement Plan

## Current Coverage Status

Originally, our test coverage was at approximately:
- Statements: 24%
- Branches: 19%
- Functions: 25%
- Lines: 24%

Current coverage (as of May 2, 2025 → April 30, 2025):
- Statements: 54.41% (↑ 30.41%)
- Branches: 41.29% (↑ 22.29%)
- Functions: 58.49% (↑ 33.49%)
- Lines: 54.62% (↑ 30.62%)

Our target remains:
- Statements: 80%
- Branches: 70%
- Functions: 80%
- Lines: 80%

## Testing Strategy Update: Dual Approach for Services

After analyzing our current testing approach, we've identified that our service tests are currently implemented as **contract tests**, which verify the API contract and function calls but don't exercise the actual implementation code. While this is a valid testing strategy, it doesn't contribute to code coverage metrics.

To address this gap and maintain the benefits of both approaches, we're implementing a dual testing strategy for services:

1. **Contract Tests**: Continue with our current approach that verifies:
   - Function signatures and contracts
   - Parameter validation
   - Return values and error handling
   - Integration points with other components

2. **Implementation Tests**: Add new test files focusing on:
   - Testing the actual implementation code
   - Verifying internal logic and business rules
   - Achieving higher code coverage metrics
   - Testing edge cases and error paths in the implementation

This dual approach will allow us to maintain the integrity of our API contracts while also ensuring our code is thoroughly tested and our coverage metrics accurately reflect the quality of our testing.

## Phase 1 Completion Summary

We have successfully completed Phase 1 (Critical Security Components) with the following coverage metrics:

| Component             | Statements  | Branches   | Functions  | Lines      | Status   |
|-----------------------|-------------|------------|------------|------------|----------|
| JWT Utils             | 86.52%      | 61.83%     | 88.67%     | 87.80%     | Complete |
| Sanitization Utils    | 96.24%      | 84.09%     | 93.75%     | 95.88%     | Complete |
| Error Handling Utils  | 100.00%     | 98.59%     | 100.00%    | 100.00%    | Complete |
| Security Middleware   | 93.20%      | 88.39%     | 94.11%     | 91.72%     | Complete |
| Rate Limit Middleware | 100.00%     | 90.62%     | 100.00%    | 100.00%    | Complete |
| Auth Middleware       | 99.61%      | 91.91%     | 100.00%    | 99.53%     | Complete |

All critical security components now have excellent test coverage, with most exceeding our targets. The only component slightly below target is JWT Utils branch coverage at 61.83% (compared to our 70% target), but this represents a significant improvement from the starting point.

## Phase 2 Progress

We have made significant progress implementing tests for high-usage components as part of Phase 2:

| Component             | Contract Tests | Implementation Tests | Status                                        |
|-----------------------|----------------|----------------------|-----------------------------------------------|
| Profile Service       | Complete       | Complete            | All tests passing with improved coverage      |
| Workout Service       | Complete       | Complete            | All tests passing, high coverage achieved     |
| OpenAI Service        | Complete       | Complete            | All tests passing with improved coverage      |
| Perplexity Service    | Complete       | Pending (Skipped)   | Contract tests complete, impl tests skipped   |
| Nutrition Service     | N/A            | Complete            | All tests passing                             |
| Macro Service         | N/A            | Complete            | All tests passing                             |
| Workout Log Service   | N/A            | Complete            | All tests passing                             |
| Check-in Service      | N/A            | Complete            | All tests passing                             |
| Export Service        | N/A            | Complete            | All tests passing                             |
| Import Service        | N/A            | Complete            | All tests passing                             |
| Supabase Admin Service| N/A            | Complete            | All tests passing                             |
| Supabase Client Service| N/A           | Complete            | All tests passing                             |
| Controllers           | Pending        | Pending             | Will implement after Services are fully tested|

The Profile, Workout, and OpenAI Service implementation tests are complete with all tests passing, contributing significantly to coverage.

**All remaining service implementation tests (`nutrition`, `macro`, `workout-log`, `check-in`, `export`, `import`, `supabase-admin`, `supabase.js`) are now complete and passing.**

## Test Infrastructure Status

We have established our test infrastructure in the `tests` directory with the following structure:
- `utils/`: Utility function tests
- `workouts/`: Workout functionality tests
- `mocks/`: Mock objects and functions
- `infrastructure/`: Testing infrastructure
- `memory/`: Memory system tests
- `adjustment-logic/`: Plan adjustment tests
- `agents/`: Agent implementation tests
- `profile/`: Profile management tests
- `auth/`: Authentication tests
- `services/`: Service layer tests
- `setup-tests.js`: Global test setup

Our Jest configuration is set up with appropriate coverage thresholds, mocking patterns, and test fixtures. All new tests should follow the established patterns to maintain consistency.

## Test Script Maintenance

The NPM script for running backend tests with coverage is critical for tracking our progress:

```json
"test:backend-coverage": "jest --testMatch=\"**/backend/tests/**/*.test.js\" --collectCoverageFrom=\"backend/agents/**/*.js\" --collectCoverageFrom=\"backend/adjustment-logic/**/*.js\" --collectCoverageFrom=\"backend/controllers/**/*.js\" --collectCoverageFrom=\"backend/routes/**/*.js\" --collectCoverageFrom=\"backend/middleware/**/*.js\" --collectCoverageFrom=\"backend/utils/**/*.js\" --collectCoverageFrom=\"backend/services/**/*.js\" --coveragePathIgnorePatterns=\"backend/tests_archive\" --coveragePathIgnorePatterns=\"backend/utils/migrations.js\" --coverage --coverageThreshold='{\"global\":{\"statements\":80,\"branches\":70,\"functions\":80,\"lines\":80}}'",
```

As we implement additional components or modify the codebase structure, this script must be kept up-to-date:

1. **Add New Directories**: If new directories are created, add the appropriate `--collectCoverageFrom` patterns
2. **Update Ignore Patterns**: Maintain the `--coveragePathIgnorePatterns` for files/directories that should be excluded
3. **Review Thresholds**: Periodically review if the coverage thresholds remain appropriate
4. **Run Consistently**: Run this script before and after implementing new tests to track improvement

When running the script, document the coverage percentages to track progress over time. This will help maintain awareness of which areas need additional focus and when coverage targets have been achieved.

## Updated Priority Areas to Target Next

Based on the current coverage report and our Phase 2 progress (completion of the service layer), these are the areas we should prioritize next:

### 1. Controllers (18.69% statements, 13.21% branches, 18.36% functions, 18.51% lines)
- Create tests for high-impact controllers:
  - `workout.js`
  - `workout-log.js`
  - `check-in.js`
  - `macros.js`

### 2. Routes (14.93% statements, 0% branches, 14.28% functions, 15.86% lines)
- `auth.js` has 100% coverage, use as a template for other route tests
- Create tests for `workout.js`, `workout-log.js`, and `check-in.js`

### 3. Agents (48.41% statements, 35.04% branches, 46.64% functions, 49.56% lines)
- Improve coverage for `nutrition-agent.js` (28.8%)
- Improve coverage for `research-agent.js` (34.86%)
- Improve coverage for `plan-adjustment-agent.js` (47.18%)

### 4. Memory System (10.71% statements, 5.38% branches, 33.33% functions, 11.19% lines)
- Test memory storage
- Test memory retrieval
- Test memory cleanup


## Implementation Strategy

1. **Testing Workflow**: 
   - Deeply understand each component before writing tests
   - Investigate the codebase to identify relationships and dependencies
   - Create small, incremental test additions
   - Run tests after each set of additions to ensure no regressions
   - Debug failures by understanding root causes, not just symptoms
   - Document any edge cases or assumptions in the test files

2. **Lessons Learned from Phase 1**: 
   - Mocking external dependencies (especially Supabase and JWT) requires careful setup
   - Focus on testing error handling and edge cases for maximum branch coverage
   - Testing asynchronous code requires appropriate handling of promises and async functions
   - Using spies to verify function calls is very effective for middleware testing

3. **Lessons Learned from Phase 2 (So Far)**: 
   - Contract tests effectively verify API behavior but don't exercise implementation code
   - Implementation tests are needed alongside contract tests for proper coverage
   - Complex services like workout-service require comprehensive mocking strategy
   - For transaction testing, properly mocking PG Pool and Client is essential
   - Mocking only what's necessary for each test keeps tests focused and maintainable
   - Consider service-specific mocking approaches rather than one-size-fits-all
   - `jest.doMock` and `jest.resetModules` are crucial for managing module-level mocks and singletons.

4. **Mock Dependencies**: 
   - Use mocks to isolate the components being tested
   - Ensure consistent mocking patterns across all tests
   - Avoid over-mocking that could hide integration issues

5. **Integration Considerations**: 
   - Test concurrency handling with multiple simulated users
   - Verify security measures including authentication and authorization
   - Validate error handling with various error scenarios
   - Ensure proper data sanitization and validation

6. **Preventing Regressions**: 
   - Always run the full test suite before finalizing changes
   - Ensure new tests don't break existing functionality
   - Maintain consistent testing patterns and practices

7. **Dual Testing Strategy for Services**: 
   - Maintain contract tests to verify API behavior and integration points
   - Implement separate implementation tests to exercise actual code paths
   - Use different naming conventions to distinguish between test types
   - Run both test suites to ensure complete coverage

8. **Continuous Monitoring**: 
   - Run coverage reports after each iteration to track progress
   - Address any new failures immediately

## Updated Timeline

### ✅ Phase 1: Critical Security Components (Completed April 25, 2025)
- ✅ `jwt.js` (Auth tokens)
- ✅ `sanitization.js` (Input validation)
- ✅ `security.js` (Security middleware)
- ✅ Rate limiting middleware
- ✅ Auth middleware
- ✅ Error handling utils

### ✅ Phase 2: High-Usage Components - Services (Completed April 30, 2025)
- ✅ `profile-service.js` (contract & implementation)
- ✅ `workout-service.js` (contract & implementation)
- ✅ `openai-service.js` (contract & implementation)
- ✅ `perplexity-service.js` (contract tests)
- ✅ `nutrition-service.js` (implementation)
- ✅ `macro-service.js` (implementation)
- ✅ `workout-log-service.js` (implementation)
- ✅ `check-in-service.js` (implementation)
- ✅ `export-service.js` (implementation)
- ✅ `import-service.js` (implementation)
- ✅ `supabase-admin.js` (implementation)
- ✅ `supabase.js` (implementation)

### Phase 2: High-Usage Components - Controllers (Current Focus)
- **Controllers (`workout.js`, `workout-log.js`, `check-in.js`, `macros.js`):**
  - Planned next.

### Phase 3: Memory and Integration
- Memory system tests
- External service integration tests

### Phase 4: Remaining Components
- Remaining routes
- Agent implementation tests

### Phase 5: Integration Testing
- End-to-end integration tests
- Performance testing

## Best Practices for Test Development

1. **Test Business Logic**: Focus on the core business logic rather than simple getters/setters
2. **Error Cases**: Test both happy paths and error cases
3. **Edge Cases**: Identify and test boundary conditions
4. **Isolation**: Use dependency injection and mocks to isolate the component being tested
5. **Realistic Data**: Use realistic data samples in tests
6. **CI/CD Integration**: Automate testing in the CI/CD pipeline
7. **Separate Contract from Implementation**: Maintain separate test files for contract and implementation testing
8. **Mock Strategically**: Only mock external dependencies, not the code being tested in implementation tests

## Examples

For each major component type, we should create example tests that can be used as templates:

```javascript
// Example for controller test
describe('WorkoutController', () => {
  test('should generate a workout plan successfully', async () => {
    // Setup mocks
    // Test function
    // Assert results
  });
  
  test('should handle missing required fields', async () => {
    // Setup mocks for error case
    // Test function with invalid input
    // Assert error response
  });
});
```

## Debugging Guidelines

When tests fail, follow this debugging approach:

1. **Analyze the Error**: Understand exactly what failed and why
2. **Check the Test**: Ensure the test itself is correct
3. **Inspect the Code**: Review the code being tested for issues
4. **Use Print Statements**: Add temporary logging to understand the state
5. **Isolate the Issue**: Simplify the test case if needed
6. **Fix the Root Cause**: Address the underlying issue, not just the symptom
7. **Verify the Fix**: Ensure the test passes and doesn't cause regressions

## Progress Tracking

| Date | Phase | Work Completed | Coverage Change |
|------|-------|----------------|-----------------| 
| July 21, 2023 | Initial | Initial assessment | 24%/19%/25%/24% |
| July 21-24, 2023 | Phase 1 | Implemented Critical Security Components tests | 24%/19%/25%/24% → 30.29%/23.46%/32.37%/30.88% |
| April 24, 2025 | Phase 1 | Fixed CSRF protection and SQL injection tests | 30.29%/23.46%/32.37%/30.88% → 30.10%/22.98%/31.90%/30.68% |
| April 25, 2025 | Phase 1 | Fixed all JWT Utils tests | 30.10%/22.98%/31.90%/30.68% → 32.01%/26.32%/38.12%/32.61% |
| April 26, 2025 | Phase 2 | Implemented contract tests for workout-service.js | 32.01%/26.32%/38.12%/32.61% → 31.51%/23.58%/31.25%/31.93% |
| April 26, 2025 | Strategy Update | Updated testing strategy to include both contract and implementation tests | 31.51%/23.58%/31.25%/31.93% → 31.51%/23.58%/31.25%/31.93% |
| May 1, 2025 | Phase 2 | Implemented profile-service implementation tests (partial) | 31.51%/23.58%/31.25%/31.93% → 33.27%/25.84%/33.41%/33.68% |
| May 2, 2025 | Phase 2 | Completed profile-service implementation tests | 33.27%/25.84%/33.41%/33.68% → 35.82%/28.87%/39.55%/36.30% |
| April 28, 2025 | Phase 2 | Completed workout-service implementation tests | 35.82%/28.87%/39.55%/36.30% → 37.72%/30.55%/41.14%/38.19% |
| April 28, 2025 | Phase 2 | Completed openai-service contract & implementation tests | 37.72%/30.55%/41.14%/38.19% → 38.93%/32.1%/41.95%/39.46% |
| April 29, 2025 | Phase 2 | Completed perplexity-service.js contract tests | 38.93%/32.1%/41.95%/39.46% → (No change expected from contract tests) |
| April 29, 2025 | Phase 2 | Completed nutrition-service.js implementation tests | 38.93%/32.1%/41.95%/39.46% → 40.57%/34.28%/45.14%/41.36% |
| April 29, 2025 | Phase 2 | Completed macro-service.js implementation tests | 40.57%/34.28%/45.14%/41.36% → 42.56%/35.82%/47.23%/43.49% |
| April 29, 2025 | Phase 2 | Completed workout-log-service.js implementation tests | 42.56%/35.82%/47.23%/43.49% → 45.11%/37.98%/51.04%/46.32% |
| April 29, 2025 | Phase 2 | Completed check-in-service.js implementation tests | 45.11%/37.98%/51.04%/46.32% → 46.83%/38.41%/52.58%/47.95% |
| April 30, 2025 | Phase 2 | Completed export-service.js implementation tests | 46.83%/38.41%/52.58%/47.95% → 50.21%/40.12%/54.88%/50.99% |
| April 30, 2025 | Phase 2 | Completed import-service.js implementation tests | 50.21%/40.12%/54.88%/50.99% → 52.11%/41.43%/55.25%/52.42% |
| April 30, 2025 | Phase 2 | Completed supabase-admin.js implementation tests | 52.11%/41.43%/55.25%/52.42% → 53.97%/43.41%/57.77%/54.36% |
| April 30, 2025 | Phase 2 | Completed supabase.js implementation tests | 53.97%/43.41%/57.77%/54.36% → 54.41%/41.29%/58.49%/54.62% |

## Conclusion

We have successfully completed both contract and implementation tests for the Profile Service, Workout Service, OpenAI Service, and *all remaining backend services* (`nutrition`, `macro`, `workout-log`, `check-in`, `export`, `import`, `supabase-admin`, `supabase.js`). This marks a significant milestone in Phase 2, with all service tests now passing and contributing to improved overall coverage metrics. The service layer coverage now stands at 87.96% Statements / 73.17% Branches / 93.5% Functions / 88.07% Lines, meeting or exceeding our targets.

Our next steps are to:
1. Address low-coverage areas within the tested services (like Perplexity implementation, if needed later).
2. Begin implementing controller tests.
3. Address other low-coverage areas like Routes, Memory System, and Agents.

The successful completion of the entire service layer testing validates our dual testing approach and provides a strong foundation for testing the remaining components. 