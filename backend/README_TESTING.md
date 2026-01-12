# Testing Guide

This document outlines how to run tests for the backend application and explains troubleshooting for common issues.

## Running Tests

To run all tests:
```
npm test
```

To run specific tests:
```
npm test -- <test-file-path>
```

For example:
```
npm test -- controllers/workout.test.js
npm test -- integration/workout-flow.test.js
npm test -- utils/validation.test.js
```

## Test Structure

The tests are organized into the following categories:

- **Unit Tests** - Test individual functions and classes in isolation
- **Integration Tests** - Test the interaction between multiple components
- **API Tests** - Test the API endpoints

The tests are located in the following directories:

- `tests/controllers/` - Controller unit tests
- `tests/services/` - Service unit tests
- `tests/utils/` - Utility function unit tests
- `tests/integration/` - Integration tests
- `tests/middleware/` - Middleware unit tests

## Mock Setup

### Mocking Agents

The agent modules are mocked using Jest's manual mock system. There are two approaches:

1. **Directory-level mocks** - Located in `tests/__mocks__/agents.js`
2. **Inline mocks** - Defined directly in test files

Example of inline mocking:

```javascript
jest.mock('../../agents', () => {
  return {
    WorkoutGenerationAgent: {
      process: jest.fn()
    },
    PlanAdjustmentAgent: {
      process: jest.fn()
    }
  };
});
```

### Mocking Environment Configuration

For tests that interact with environment variables, we set them directly in the test file:

```javascript
// Mock the env variables
process.env.SUPABASE_URL = 'https://test-project-id.supabase.co';
process.env.SUPABASE_KEY = 'test-anon-key';
```

Alternatively, we use a `.env.test` file that contains all the necessary variables for testing.

### Mocking Middleware

For integration tests, middleware like error handlers might need to be mocked:

```javascript
const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  
  if (err.statusCode) {
    statusCode = err.statusCode;
  }
  
  if (err.message) {
    message = err.message;
  }
  
  // Map specific error types to status codes
  if (err instanceof NotFoundError) {
    statusCode = 404;
  } else if (err instanceof DatabaseError) {
    statusCode = 500;
  }
  
  res.status(statusCode).json({
    status: 'error',
    message: message
  });
};
```

## Common Issues and Fixes

### Jest Module Resolution Problems

If you encounter errors with Jest not finding modules or dependencies, check the following:

1. **Module mock implementation** - Ensure mocks properly implement the same methods as the actual modules.
2. **Jest config** - Check `jest.config.js` to ensure the module name mapper is correctly set up.

### Supabase Configuration Issues

For tests interacting with Supabase, ensure:

1. `SUPABASE_URL` and `SUPABASE_KEY` are properly set either in the test file or in `.env.test`
2. Mock implementations for Supabase client methods match the call patterns in the actual code

### Environment Variables

If tests fail due to missing environment variables:

1. Check the required variables in the `env.js` configuration file
2. Ensure all required variables are properly set in the `.env.test` file
3. For specific tests, consider setting environment variables directly in the test file

```javascript
process.env.VARIABLE_NAME = 'test-value';
```

## Best Practices

1. **Reset mocks between tests** - Use `beforeEach(() => { jest.clearAllMocks(); })` to reset all mocks between tests.
2. **Isolate tests** - Each test should be independent and not rely on the state from other tests.
3. **Mock external services** - Always mock external services like Supabase or OpenAI.
4. **Test error handling** - Include tests for error conditions and edge cases.
5. **Use descriptive test names** - Test names should clearly describe what is being tested. 