const { retryWithBackoff } = require('../../utils/retry-utils');
const logger = require('../../config/logger');

// Mock the logger
jest.mock('../../config/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  fatal: jest.fn(),
}));

// Use fake timers
jest.useFakeTimers();

// Spy on the global setTimeout
jest.spyOn(global, 'setTimeout');

describe('retryWithBackoff', () => {
  let mockFn;

  beforeEach(() => {
    // Reset mocks before each test
    mockFn = jest.fn();
    jest.clearAllMocks();
    // It's important to clear timers too if previous tests might leave them running
    jest.clearAllTimers(); 
  });

  test('should succeed on the first attempt with default options', async () => {
    const expectedResult = 'Success!';
    mockFn.mockResolvedValueOnce(expectedResult);

    const promise = retryWithBackoff(mockFn);

    // No timers should be needed as it succeeds first time
    await jest.runAllTimersAsync(); // Use async version for promises

    await expect(promise).resolves.toBe(expectedResult);
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith(0); // Check attempt number
    expect(setTimeout).not.toHaveBeenCalled(); // No delays expected
  });

  test('should succeed on the first attempt with custom options', async () => {
    const expectedResult = 'Custom Success!';
    mockFn.mockResolvedValueOnce(expectedResult);
    const options = { maxRetries: 5, initialDelay: 500, backoffFactor: 3, shouldRetry: () => true };

    const promise = retryWithBackoff(mockFn, options);

    await jest.runAllTimersAsync();

    await expect(promise).resolves.toBe(expectedResult);
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith(0);
    expect(setTimeout).not.toHaveBeenCalled();
  });

  test('should succeed after one retry', async () => {
    const failError = new Error('Temporary Failure');
    const expectedResult = 'Succeeded on Retry 1';
    mockFn
      .mockRejectedValueOnce(failError)
      .mockResolvedValueOnce(expectedResult);
    
    const options = { initialDelay: 100 }; // Use a small delay for testing

    const promise = retryWithBackoff(mockFn, options);

    // Expect the first call (attempt 0)
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith(0);

    // Advance timers past the first delay (100ms)
    await jest.advanceTimersByTimeAsync(100); 

    // Expect the second call (attempt 1)
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenCalledWith(1);

    await expect(promise).resolves.toBe(expectedResult);
    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 100);
  });

  test('should succeed after multiple retries with increasing backoff', async () => {
    const failError1 = new Error('Fail 1');
    const failError2 = new Error('Fail 2');
    const expectedResult = 'Succeeded on Retry 2';
    mockFn
      .mockRejectedValueOnce(failError1)
      .mockRejectedValueOnce(failError2)
      .mockResolvedValueOnce(expectedResult);

    const options = { maxRetries: 3, initialDelay: 100, backoffFactor: 2 };

    const promise = retryWithBackoff(mockFn, options);

    // Attempt 0 fails
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith(0);
    await jest.advanceTimersByTimeAsync(100); // Delay 1: 100ms

    // Attempt 1 fails
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenCalledWith(1);
    await jest.advanceTimersByTimeAsync(200); // Delay 2: 100 * 2^1 = 200ms

    // Attempt 2 succeeds
    expect(mockFn).toHaveBeenCalledTimes(3);
    expect(mockFn).toHaveBeenCalledWith(2);

    await expect(promise).resolves.toBe(expectedResult);
    expect(setTimeout).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), 100);
    expect(setTimeout).toHaveBeenNthCalledWith(2, expect.any(Function), 200);
  });

  test('should fail after maximum retries and throw the last error', async () => {
    const finalError = new Error('Final Error');
    mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('Attempt 0 Fails')) // Fails on attempt 0
      .mockRejectedValueOnce(new Error('Attempt 1 Fails')) // Fails on attempt 1
      .mockRejectedValue(finalError);                     // Fails on attempt 2 (and subsequent, if any)

    const options = { maxRetries: 2, initialDelay: 10, backoffFactor: 1 }; // Total 3 attempts: 0, 1, 2

    const promise = retryWithBackoff(mockFn, options);

    // Initial call (attempt 0)
    // Let the promise start processing before checking mockFn calls
    await Promise.resolve(); 
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenLastCalledWith(0);

    // First retry (triggers call for attempt 1)
    await jest.advanceTimersByTimeAsync(10); // Advance by initialDelay * backoffFactor^0
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith(1);

    // Second retry (triggers call for attempt 2)
    await jest.advanceTimersByTimeAsync(10); // Advance by initialDelay * backoffFactor^1 (factor is 1 here)
    expect(mockFn).toHaveBeenCalledTimes(3);
    expect(mockFn).toHaveBeenLastCalledWith(2);

    // After maxRetries (2), the next failure (attempt 2) should cause the promise to reject with the error from that attempt.
    // No more timers should be advanced beyond this point for retries.

    await expect(promise).rejects.toThrow('Final Error');

    // Check setTimeout calls: one after attempt 0, one after attempt 1
    expect(setTimeout).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), 10);
    expect(setTimeout).toHaveBeenNthCalledWith(2, expect.any(Function), 10); 
  });
  
  test('should stop retrying if shouldRetry returns false for specific error', async () => {
    const normalError = new Error('Normal Error - Should Retry');
    const specialError = new Error('Special Error - Do Not Retry');

    mockFn = jest.fn()
      .mockRejectedValueOnce(normalError)
      .mockRejectedValueOnce(specialError); // This error will be thrown by the promise if not retried
      // .mockRejectedValue(new Error('This should not be reached')); // Fallback for safety

    const shouldRetryMock = jest.fn((error, attempt) => {
      return error.message !== 'Special Error - Do Not Retry';
    });

    const options = { 
      maxRetries: 3, 
      initialDelay: 10, 
      backoffFactor: 1,
      shouldRetry: shouldRetryMock 
    };

    const promise = retryWithBackoff(mockFn, options);

    // Initial call (attempt 0), fails with normalError
    await Promise.resolve();
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenLastCalledWith(0);
    expect(shouldRetryMock).toHaveBeenCalledTimes(1);
    expect(shouldRetryMock).toHaveBeenLastCalledWith(normalError, 0);

    // First retry (triggers call for attempt 1), fails with specialError
    await jest.advanceTimersByTimeAsync(10);
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith(1);
    expect(shouldRetryMock).toHaveBeenCalledTimes(2);
    expect(shouldRetryMock).toHaveBeenLastCalledWith(specialError, 1); // This call makes shouldRetryMock return false

    // shouldRetryMock returned false, so no more retries or delays.
    // Let any remaining microtasks flush to ensure promise settles.
    await jest.runAllTimersAsync(); 
    expect(mockFn).toHaveBeenCalledTimes(2); // Still 2, no further calls to mockFn

    await expect(promise).rejects.toThrow('Special Error - Do Not Retry');

    // Check setTimeout calls: only one after attempt 0
    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), 10);
  });
  
  test('should stop retrying if shouldRetry returns false based on attempt number', async () => {
    const testError = new Error('Test Error');
    mockFn = jest.fn().mockRejectedValue(testError);

    // shouldRetry returns false for attempt 1 (i.e., after the first retry, which is the second call to fn)
    const shouldRetryMock = jest.fn((error, attempt) => attempt < 1); // Allows attempt 0 to retry, but not attempt 1

    const options = {
      maxRetries: 5, // Higher than when shouldRetry will stop it
      initialDelay: 10,
      backoffFactor: 1,
      shouldRetry: shouldRetryMock
    };

    const promise = retryWithBackoff(mockFn, options);

    // Initial call (attempt 0)
    await Promise.resolve();
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenLastCalledWith(0);
    expect(shouldRetryMock).toHaveBeenCalledTimes(1);
    expect(shouldRetryMock).toHaveBeenLastCalledWith(testError, 0); // attempt is 0, shouldRetry is true

    // First retry (triggers call for attempt 1)
    await jest.advanceTimersByTimeAsync(10); // Delay after attempt 0
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith(1);
    expect(shouldRetryMock).toHaveBeenCalledTimes(2);
    expect(shouldRetryMock).toHaveBeenLastCalledWith(testError, 1); // attempt is 1, shouldRetry is false

    // No more retries as shouldRetryMock returned false for attempt 1.
    await jest.runAllTimersAsync();
    expect(mockFn).toHaveBeenCalledTimes(2); // mockFn was only called for attempt 0 and 1

    await expect(promise).rejects.toThrow('Test Error');

    // Check setTimeout calls: only one, after attempt 0
    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), 10);
  });

  test('attempt argument in fn should increment correctly', async () => {
    const expectedResult = 'Success on attempt 2';
    mockFn
      .mockRejectedValueOnce(new Error('Attempt 0 fail'))
      .mockRejectedValueOnce(new Error('Attempt 1 fail'))
      .mockResolvedValueOnce(expectedResult); // Success on attempt 2

    const options = { maxRetries: 3, initialDelay: 10 };
    const promise = retryWithBackoff(mockFn, options);

    await Promise.resolve(); // Allow first fn call
    expect(mockFn).toHaveBeenLastCalledWith(0);

    await jest.advanceTimersByTimeAsync(10); // After attempt 0
    expect(mockFn).toHaveBeenLastCalledWith(1);

    await jest.advanceTimersByTimeAsync(10 * (options.backoffFactor || 2)); // After attempt 1 (default backoffFactor=2 if not set)
    expect(mockFn).toHaveBeenLastCalledWith(2);

    await expect(promise).resolves.toBe(expectedResult);
    expect(mockFn).toHaveBeenCalledTimes(3);
  });
}); 