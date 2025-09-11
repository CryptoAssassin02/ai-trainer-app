# Perplexity Service Implementation Test Plan

## 1. Introduction

This document outlines the detailed plan for creating an implementation-focused test suite for `perplexity-service.js`. The primary goal is to achieve comprehensive code coverage (Statements, Functions, Lines: >=80%; Branches: >=70%) by testing the internal logic, request/response handling, error management, and retry mechanisms of the service. This suite will complement the existing contract-focused tests.

## 2. Setup and Mocking Strategy

The success of implementation testing heavily relies on effectively mocking external dependencies.

### 2.1. Core Dependencies to Mock:

*   **`node-fetch`**: This is the most critical mock. It will allow us to simulate various network responses (successful, error HTTP statuses, network failures, invalid JSON) without making actual API calls.
    *   We will use `jest.mock('node-fetch', () => jest.fn());` and then assign `fetch.mockResolvedValueOnce` or `fetch.mockRejectedValueOnce` in individual tests.
*   **`../../config/logger`**: To verify logging calls (info, error, warn, debug) without polluting the console during tests.
    *   `jest.mock('../../config/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }));`
*   **`../../config/perplexity`**: To control API endpoint, API key (though often overridden), default model parameters, retry settings (`maxRetries`, `baseDelay`, `retryableStatusCodes`), and mock response configuration (`mock.enabled`, `mock.mockResponse`) during tests.
    *   This can be mocked using `jest.doMock()` for test-specific configurations or a general mock that allows overriding values.

### 2.2. Jest Utilities:

*   `jest.resetModules()`: To ensure a clean slate for mocks when modules are re-required, especially when testing different config scenarios.
*   `jest.useFakeTimers()` and `jest.advanceTimersByTime()`: Essential for testing retry logic involving delays without making tests slow.

## 3. Test Suite Structure

The test suite will be organized as follows:

```javascript
// /backend/tests/services/perplexity-service.implementation.test.js

// Mock core dependencies at the top
// const fetch = require('node-fetch'); // Mocked version
// const logger = require('../../config/logger'); // Mocked version
// const perplexityConfig = require('../../config/perplexity'); // Potentially mocked/overridden

// Require the actual service *after* initial mocks if not using jest.doMock extensively
// const PerplexityService = require('../../services/perplexity-service');

describe('PerplexityService Implementation Tests', () => {
  let serviceInstance;
  let mockFetch; // To re-assign from require('node-fetch')
  let mockLogger;
  let mockPerplexityConfig;

  beforeEach(() => {
    jest.resetModules(); // Ensure clean mocks for each test

    // Re-require mocked dependencies
    mockFetch = require('node-fetch');
    mockLogger = require('../../config/logger');

    // Example of loading and potentially modifying config for tests
    // Use jest.doMock for more fine-grained control per describe/test block if needed
    jest.doMock('../../config/perplexity', () => ({
      // Default mock config values, can be overridden in specific tests
      apiBaseUrl: 'https://api.perplexity.ai',
      defaultModel: 'test-sonar-small-32k-online',
      temperature: 0.7,
      maxTokens: 1024,
      mock: {
        enabled: false,
        mockResponse: { choices: [{ message: { content: 'Default mock response' } }] }
      },
      retry: {
        maxRetries: 2,
        baseDelay: 100, // ms
        retryableStatusCodes: [429, 500, 502, 503, 504],
      },
      // ... other config values
    }));
    mockPerplexityConfig = require('../../config/perplexity');

    const PerplexityService = require('../../services/perplexity-service');
    // Initialize with a test API key
    serviceInstance = new PerplexityService('test-api-key', {}, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers(); // Clean up fake timers
  });

  // Test groups (constructor, search, searchQuery) will follow
});
```

## 4. Detailed Test Cases

### 4.1. Constructor (`new PerplexityService(apiKey, options, logger)`)

*   **Objective**: Verify correct initialization of the service instance.
*   **Test Cases**:
    1.  **Initialization with API Key**:
        *   Sets the API key correctly when provided directly.
        *   If the service supports falling back to `process.env.PERPLEXITY_API_KEY`, test that scenario (requires mocking `process.env`).
    2.  **Error on Missing API Key**:
        *   Throws a `PerplexityServiceError` (or specific error type) if no API key is provided and not found in `process.env`.
    3.  **Options Merging**:
        *   Correctly merges default options from `perplexityConfig` with options passed to the constructor. Test overriding a few default parameters.
    4.  **Logger Initialization**:
        *   Uses the provided logger instance.
        *   If no logger is provided, it should initialize and use the default logger from `../../config/logger`.

### 4.2. `search(queryText, callOptions)` Method

*   **Objective**: Verify the internal logic of making requests to Perplexity, handling responses, errors, and retries.

    #### 4.2.1. Request Formulation & `fetch` Calls
    *   **Test Cases**:
        1.  **Correct API Endpoint and Method**:
            *   `fetch` is called with the correct URL (e.g., `mockPerplexityConfig.apiBaseUrl + '/chat/completions'`).
            *   `fetch` is called with the `POST` method.
        2.  **Correct Headers**:
            *   `fetch` is called with `Authorization: Bearer test-api-key`.
            *   `fetch` is called with `Content-Type: application/json`.
            *   `fetch` is called with `Accept: application/json`.
        3.  **Payload Construction (Defaults)**:
            *   `fetch` body includes `model: mockPerplexityConfig.defaultModel`.
            *   `fetch` body includes `messages` array with `role: 'user'` and `content: queryText`.
            *   `fetch` body includes other defaults from `mockPerplexityConfig` (e.g., `temperature`).
        4.  **Payload Construction (Overrides)**:
            *   `callOptions` (e.g., `model`, `temperature`, `max_tokens`, `system`) correctly override defaults in the `fetch` body.
            *   If `system` prompt is provided in `callOptions`, it's correctly added to the `messages` array.

    #### 4.2.2. Successful Response Handling
    *   **Test Cases**:
        1.  **Standard Successful Response (`choices[0].message.content`)**:
            *   `mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: 'Test response' } }] }) })`.
            *   Method returns the expected content string (or the full message object, depending on service's contract).
        2.  **Alternative Successful Response Structure (e.g., `choices[0].text`)**:
            *   If the service is designed to handle other known Perplexity response variations, test them. For example:
                `mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ text: 'Alternative response' }] }) })`.
            *   Method correctly extracts content.
        3.  **Response with `usage` data**:
            *   If the service processes or logs usage data, verify this.
                `mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [...], usage: { total_tokens: 50 } }) })`.

    #### 4.2.3. Error Handling (API Errors & Network Issues)
    *   **Test Cases**:
        1.  **`fetch` Throws Network Error**:
            *   `mockFetch.mockRejectedValueOnce(new Error('Network connection failed'))`.
            *   Method throws a `PerplexityServiceError` with appropriate message and `originalError`.
        2.  **API Returns Non-JSON Response**:
            *   `mockFetch.mockResolvedValueOnce({ ok: true, text: async () => 'Not JSON', json: async () => { throw new Error('Invalid JSON'); } })`.
            *   Method throws a `PerplexityServiceError` indicating a parsing issue.
        3.  **API Returns Empty/Invalid JSON Structure**:
            *   `mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })` (e.g., missing `choices`).
            *   `mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [] }) })`.
            *   Method throws a `PerplexityServiceError` indicating an invalid response structure.
        4.  **API Returns HTTP 400 (Bad Request)**:
            *   `mockFetch.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: { message: 'Invalid input' } }) })`.
            *   Method throws `PerplexityServiceError` with status 400, no retries attempted. Log error.
        5.  **API Returns HTTP 401 (Unauthorized)**:
            *   `mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: { message: 'Invalid API key' } }) })`.
            *   Method throws `PerplexityServiceError` with status 401, no retries. Log error.
        6.  **API Returns HTTP 403 (Forbidden)**:
            *   Similar to 401, test for non-retryable error.
        7.  **API Returns HTTP 404 (Not Found)**:
            *   Similar to 401, test for non-retryable error for the specific endpoint.

    #### 4.2.4. Retry Logic
    *   **Setup**: `jest.useFakeTimers();` before tests involving retries.
    *   **Test Cases**:
        1.  **Retry on HTTP 429 (Rate Limit)**:
            *   `mockFetch.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ error: { message: 'Rate limited' } }) })` for initial attempts.
            *   `mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: 'Success after retry' } }] }) })` for a subsequent attempt.
            *   Verify `mockLogger.warn` is called for retrying.
            *   Verify `jest.advanceTimersByTime()` triggers the retry.
            *   Method eventually succeeds.
            *   `fetch` is called `n` times (initial + retries).
        2.  **Retry on HTTP 500 (Internal Server Error)**:
            *   Similar to 429, but with status 500.
        3.  **Retry on HTTP 502, 503, 504**:
            *   Test one or two of these to ensure all configured `retryableStatusCodes` are handled.
        4.  **Exhaust Max Retries**:
            *   `mockFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: { message: 'Server down' } }) })` for all attempts (initial + `maxRetries`).
            *   Method throws `PerplexityServiceError` after exhausting retries, containing details of the last error.
            *   `mockLogger.error` logs the final failure after retries.
            *   `fetch` is called `1 + mockPerplexityConfig.retry.maxRetries` times.
        5.  **No Retry on Non-Retryable Status (e.g., 400)**:
            *   `mockFetch.mockResolvedValueOnce({ ok: false, status: 400, ... })`.
            *   Method throws error immediately, `fetch` called only once. `mockLogger.warn` for retrying is NOT called.

    #### 4.2.5. Mock Mode
    *   **Setup**: Modify `mockPerplexityConfig.mock.enabled = true;` and set `mockPerplexityConfig.mock.mockResponse`.
    *   **Test Cases**:
        1.  **Returns Mock Response**:
            *   When `mock.enabled` is true, the method returns the content from `mockPerplexityConfig.mock.mockResponse.choices[0].message.content` (or the full message object).
            *   `fetch` is NOT called.
            *   `mockLogger.info` logs that a mock response is being used.

### 4.3. `searchQuery(queryText, options)` Method

*   **Objective**: Verify this higher-level method correctly utilizes the `search` method and processes its output.
*   **Setup**: This method will likely call `this.search()`. We can spy on `serviceInstance.search` using `jest.spyOn(serviceInstance, 'search')` to verify it's called correctly and to mock its return value for specific `searchQuery` tests.

*   **Test Cases**:
    1.  **Calls `this.search` Correctly**:
        *   `jest.spyOn(serviceInstance, 'search').mockResolvedValueOnce({ role: 'assistant', content: 'Search method response' });`
        *   `searchQuery(queryText, { someOption: 'value' })` calls `serviceInstance.search(queryText, { someOption: 'value' })`.
    2.  **Successful Text Content Extraction (Default/`structuredResponse: false`)**:
        *   `jest.spyOn(serviceInstance, 'search').mockResolvedValueOnce({ role: 'assistant', content: 'This is the content.' });`
        *   `searchQuery(queryText)` returns `'This is the content.'`.
    3.  **Handles `this.search` Returning Null/Empty Content**:
        *   `jest.spyOn(serviceInstance, 'search').mockResolvedValueOnce({ role: 'assistant', content: null });` or `({ role: 'assistant', content: '' })`.
        *   `searchQuery` returns `null` or empty string, or throws a specific error if that's the designed behavior. Log a warning.
    4.  **Successful Structured JSON Parsing (`structuredResponse: true`)**:
        *   `const jsonData = { key: 'value' };`
        *   `jest.spyOn(serviceInstance, 'search').mockResolvedValueOnce({ role: 'assistant', content: JSON.stringify(jsonData) });`
        *   `searchQuery(queryText, { structuredResponse: true })` returns the parsed `jsonData` object.
    5.  **Error on Invalid JSON for Structured Response**:
        *   `jest.spyOn(serviceInstance, 'search').mockResolvedValueOnce({ role: 'assistant', content: 'This is not JSON' });`
        *   `searchQuery(queryText, { structuredResponse: true })` throws a `PerplexityServiceError` (or specific error) indicating JSON parsing failure. `mockLogger.error` logs the parsing error.
    6.  **Error Propagation from `this.search`**:
        *   `const searchError = new PerplexityServiceError('Search failed', 500);`
        *   `jest.spyOn(serviceInstance, 'search').mockRejectedValueOnce(searchError);`
        *   `searchQuery(queryText)` re-throws the `searchError`.

## 5. Test Execution and Coverage

*   Run tests using `npm test` or `jest backend/tests/services/perplexity-service.implementation.test.js`.
*   Generate coverage reports using `jest --coverage`.
*   Iteratively write tests and refactor the service if needed to improve testability and meet coverage goals (Statements, Functions, Lines: >=80%; Branches: >=70%).

This plan provides a comprehensive roadmap for testing the `PerplexityService` implementation thoroughly. 