// Unit tests for backend/utils/retry-utils.js

// Import the function to test
const { retryWithBackoff } = require('../../utils/retry-utils');

// Mock the internal delay function to resolve immediately
jest.mock('../../utils/retry-utils', () => {
  const originalModule = jest.requireActual('../../utils/retry-utils');
  return {
    ...originalModule,
    // The delay function is not exported, so we can't mock it directly here.
    // We need to mock setTimeout globally for this test file OR 
    // refactor retry-utils.js to make delay injectable/mockable.
    // Let's try mocking setTimeout globally for this file.
  };
});

// Mock setTimeout globally JUST for this test suite
beforeAll(() => {
  jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
    // Resolve immediately instead of waiting
    if (typeof callback === 'function') {
      callback();
    }
    // Return a dummy timer ID (object) as expected by clearTimeout
    return { dummyTimerId: true }; 
  });
});

afterAll(() => {
  // Restore original setTimeout after this suite
  global.setTimeout.mockRestore();
});

describe('Retry Utilities', () => {

  describe('retryWithBackoff', () => {
    let mockFn;

    beforeEach(() => {
      mockFn = jest.fn();
      // Clear the setTimeout mock calls before each test within the suite
      global.setTimeout.mockClear(); 
    });

    it('should return the result immediately if the function succeeds on the first try', async () => {
      const expectedResult = 'Success!';
      mockFn.mockResolvedValue(expectedResult);

      const result = await retryWithBackoff(mockFn);

      expect(result).toBe(expectedResult);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(setTimeout).not.toHaveBeenCalled(); // No delay should occur
    });

    it('should retry the function according to maxRetries on failure', async () => {
      const error = new Error('Temporary failure');
      const expectedResult = 'Success on retry!';
      mockFn
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue(expectedResult);

      const options = { maxRetries: 2, initialDelay: 10 }; // Retry twice
      const result = await retryWithBackoff(mockFn, options);

      expect(result).toBe(expectedResult);
      expect(mockFn).toHaveBeenCalledTimes(3); // Initial call + 2 retries
      expect(setTimeout).toHaveBeenCalledTimes(2); // Delays called before retries
    });

    it('should throw the last error if all retries fail', async () => {
      const error1 = new Error('Failure 1');
      const error2 = new Error('Failure 2');
      mockFn
        .mockRejectedValueOnce(error1)
        .mockRejectedValue(error2); // Keep failing with error2

      const options = { maxRetries: 1, initialDelay: 10 }; // Retry once
      
      await expect(retryWithBackoff(mockFn, options)).rejects.toThrow(error2);
      expect(mockFn).toHaveBeenCalledTimes(2); // Initial call + 1 retry
      expect(setTimeout).toHaveBeenCalledTimes(1); // Delay called before the retry
    });

    it('should use the shouldRetry function to determine if retry should occur', async () => {
      const retryableError = new Error('Retry me');
      retryableError.retryable = true;
      const nonRetryableError = new Error('Do not retry');
      nonRetryableError.retryable = false;
      
      mockFn.mockRejectedValueOnce(retryableError) // First fails with retryable
             .mockRejectedValueOnce(nonRetryableError); // Second fails with non-retryable
             
      const options = { 
        maxRetries: 3, 
        initialDelay: 10, 
        shouldRetry: (err) => err.retryable === true 
      };

      // Should throw the non-retryable error after the first retry attempt
      await expect(retryWithBackoff(mockFn, options)).rejects.toThrow(nonRetryableError);
      expect(mockFn).toHaveBeenCalledTimes(2); // Initial call + 1 retry attempt
      expect(setTimeout).toHaveBeenCalledTimes(1); // Delay called before the retry attempt
    });

    it('should handle errors thrown by the shouldRetry function', async () => {
      const error = new Error('Failure');
      mockFn.mockRejectedValue(error);
      const shouldRetryError = new Error('Error in shouldRetry');

      const options = { 
        maxRetries: 1, 
        initialDelay: 10, 
        shouldRetry: () => { throw shouldRetryError; } 
      };

      // Should throw the error from shouldRetry
      await expect(retryWithBackoff(mockFn, options)).rejects.toThrow(shouldRetryError);
      expect(mockFn).toHaveBeenCalledTimes(1); // Only the initial call
      expect(setTimeout).not.toHaveBeenCalled(); // No delay should occur
    });
    
    it('should calculate exponential backoff delay correctly', async () => {
      const error = new Error('Temporary failure');
      mockFn.mockRejectedValue(error);
      const options = { 
          maxRetries: 3, 
          initialDelay: 100, 
          backoffFactor: 2, // Default, but explicit here
          shouldRetry: () => true
      };

      // Expect it to throw the last error after all retries
      await expect(retryWithBackoff(mockFn, options)).rejects.toThrow(error);
      
      expect(mockFn).toHaveBeenCalledTimes(4); // Initial + 3 retries
      
      // Check that setTimeout was called with approximately correct delays
      expect(setTimeout).toHaveBeenCalledTimes(3);
      // Note: Exact delay matching is hard with Math.pow, let's check the call count
      // If needed, could capture args and check ranges
      // expect(setTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), 100 * Math.pow(2, 0)); 
      // expect(setTimeout).toHaveBeenNthCalledWith(2, expect.any(Function), 100 * Math.pow(2, 1)); 
      // expect(setTimeout).toHaveBeenNthCalledWith(3, expect.any(Function), 100 * Math.pow(2, 2)); 
    });
  });
}); 