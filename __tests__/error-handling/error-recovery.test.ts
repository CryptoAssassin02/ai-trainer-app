/**
 * Error Recovery Hook Tests
 * Tests for error recovery utilities and retry mechanisms
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useErrorRecovery } from '@/hooks/use-error-recovery';

// Mock dependencies
jest.mock('@/utils/error/network-detector', () => ({
  useNetworkStatus: jest.fn(() => ({
    isOnline: true,
    isSlowConnection: false
  })),
  isNetworkError: jest.fn((error: Error) => error.message.includes('network'))
}));

jest.mock('@/utils/error/global-error-handler', () => ({
  useErrorHandler: jest.fn(() => jest.fn())
}));

describe('useErrorRecovery', () => {
  let mockOperation: jest.Mock;
  let mockErrorHandler: jest.Mock;

  beforeEach(() => {
    mockOperation = jest.fn();
    mockErrorHandler = jest.fn();
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock the error handler
    const { useErrorHandler } = require('@/utils/error/global-error-handler');
    useErrorHandler.mockReturnValue(mockErrorHandler);
  });

  test('initializes with correct default state', () => {
    const { result } = renderHook(() => useErrorRecovery(mockOperation));
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.retryCount).toBe(0);
    expect(result.current.canRetry).toBe(true);
    expect(result.current.isRecovering).toBe(false);
  });

  test('executes operation successfully', async () => {
    mockOperation.mockResolvedValue('success');
    
    const { result } = renderHook(() => useErrorRecovery(mockOperation));
    
    await act(async () => {
      await result.current.execute();
    });
    
    expect(mockOperation).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  test('handles operation failure', async () => {
    const testError = new Error('Operation failed');
    mockOperation.mockRejectedValue(testError);
    
    const { result } = renderHook(() => useErrorRecovery(mockOperation));
    
    await act(async () => {
      await result.current.execute();
    });
    
    expect(result.current.error).toBe(testError);
    expect(result.current.isLoading).toBe(false);
    expect(mockErrorHandler).toHaveBeenCalledWith(testError, expect.any(Object));
  });

  test('sets loading state during operation', async () => {
    let resolveOperation: (value: any) => void;
    const operationPromise = new Promise(resolve => {
      resolveOperation = resolve;
    });
    mockOperation.mockReturnValue(operationPromise);
    
    const { result } = renderHook(() => useErrorRecovery(mockOperation));
    
    // Start operation
    act(() => {
      result.current.execute();
    });
    
    expect(result.current.isLoading).toBe(true);
    
    // Resolve operation
    await act(async () => {
      resolveOperation!('success');
      await operationPromise;
    });
    
    expect(result.current.isLoading).toBe(false);
  });

  test('retries failed operation', async () => {
    jest.useFakeTimers();
    
    mockOperation
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValue('success');
    
    const { result } = renderHook(() => useErrorRecovery(mockOperation, { retryDelay: 100 }));
    
    // First execution fails
    await act(async () => {
      await result.current.execute();
    });
    
    expect(result.current.error).toBeTruthy();
    expect(result.current.retryCount).toBe(0);
    
    // Start retry
    await act(async () => {
      const promise = result.current.retry();
      // Fast-forward the timer to trigger retry
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      await promise;
    });
    

    
    expect(result.current.error).toBe(null);
    expect(result.current.retryCount).toBe(1);
    expect(mockOperation).toHaveBeenCalledTimes(2);
    
    jest.useRealTimers();
  });

  test('respects max retries limit', async () => {
    const testError = new Error('Persistent failure');
    mockOperation.mockRejectedValue(testError);
    
    const { result } = renderHook(() => 
      useErrorRecovery(mockOperation, { maxRetries: 2 })
    );
    
    // Initial execution
    await act(async () => {
      await result.current.execute();
    });
    
    // First retry
    await act(async () => {
      await result.current.retry();
    });
    
    expect(result.current.canRetry).toBe(true);
    expect(result.current.retryCount).toBe(1);
    
    // Second retry
    await act(async () => {
      await result.current.retry();
    });
    
    expect(result.current.canRetry).toBe(false);
    expect(result.current.retryCount).toBe(2);
    
    // Should not allow more retries
    const canRetryMore = result.current.canRetry;
    expect(canRetryMore).toBe(false);
  });

  test('applies retry delay', async () => {
    jest.useFakeTimers();
    
    mockOperation.mockRejectedValue(new Error('Failure'));
    
    const { result } = renderHook(() => 
      useErrorRecovery(mockOperation, { retryDelay: 1000 })
    );
    
    // Initial execution
    await act(async () => {
      await result.current.execute();
    });
    
    // Start retry
    act(() => {
      result.current.retry();
    });
    
    expect(result.current.isRecovering).toBe(true);
    
    // Fast-forward time
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    
    await waitFor(() => {
      expect(result.current.isRecovering).toBe(false);
    });
    
    jest.useRealTimers();
  });

  test('uses exponential backoff', async () => {
    jest.useFakeTimers();
    
    mockOperation.mockRejectedValue(new Error('Failure'));
    
    const { result } = renderHook(() => 
      useErrorRecovery(mockOperation, { 
        retryDelay: 100,
        exponentialBackoff: true
      })
    );
    
    // Initial execution
    await act(async () => {
      await result.current.execute();
    });
    
    // First retry - should wait 100ms
    act(() => {
      result.current.retry();
    });
    
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    
    // Second retry - should wait 200ms (exponential)
    act(() => {
      result.current.retry();
    });
    
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    
    expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    
    jest.useRealTimers();
  });

  test('retries on network reconnect when enabled', async () => {
    const { useNetworkStatus } = require('@/utils/error/network-detector');
    
    // Start offline
    useNetworkStatus.mockReturnValue({
      isOnline: false,
      isSlowConnection: false
    });
    
    const networkError = new Error('network failure');
    mockOperation.mockRejectedValue(networkError);
    
    // Mock isNetworkError to return true for our error
    const { isNetworkError } = require('@/utils/error/network-detector');
    isNetworkError.mockReturnValue(true);
    
    const { result, rerender } = renderHook(() => 
      useErrorRecovery(mockOperation, { 
        retryOnNetworkReconnect: true 
      })
    );
    
    // Initial execution fails
    await act(async () => {
      await result.current.execute();
    });
    
    expect(result.current.error).toBe(networkError);
    
    // Simulate network reconnection
    mockOperation.mockResolvedValue('success');
    useNetworkStatus.mockReturnValue({
      isOnline: true,
      isSlowConnection: false
    });
    
    // Re-render to trigger network status change
    rerender();
    
    // Wait for automatic retry
    await waitFor(() => {
      expect(result.current.error).toBe(null);
    });
  });

  test('resets state correctly', async () => {
    const testError = new Error('Test error');
    mockOperation.mockRejectedValue(testError);
    
    const { result } = renderHook(() => useErrorRecovery(mockOperation));
    
    // Execute and fail
    await act(async () => {
      await result.current.execute();
    });
    
    expect(result.current.error).toBe(testError);
    expect(result.current.retryCount).toBe(0);
    
    // Retry once
    await act(async () => {
      await result.current.retry();
    });
    
    expect(result.current.retryCount).toBe(1);
    
    // Reset state
    act(() => {
      result.current.reset();
    });
    
    expect(result.current.error).toBe(null);
    expect(result.current.retryCount).toBe(0);
    expect(result.current.canRetry).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRecovering).toBe(false);
  });

  test('clears error only', async () => {
    const testError = new Error('Test error');
    mockOperation.mockRejectedValue(testError);
    
    const { result } = renderHook(() => useErrorRecovery(mockOperation));
    
    // Execute and fail, then retry
    await act(async () => {
      await result.current.execute();
    });
    
    await act(async () => {
      await result.current.retry();
    });
    
    expect(result.current.error).toBe(testError);
    expect(result.current.retryCount).toBe(1);
    
    // Clear error only
    act(() => {
      result.current.clearError();
    });
    
    expect(result.current.error).toBe(null);
    expect(result.current.retryCount).toBe(1); // Should remain unchanged
  });

  test('handles operation that throws synchronously', async () => {
    const syncError = new Error('Synchronous error');
    mockOperation.mockImplementation(() => {
      throw syncError;
    });
    
    const { result } = renderHook(() => useErrorRecovery(mockOperation));
    
    await act(async () => {
      await result.current.execute();
    });
    
    expect(result.current.error).toBe(syncError);
    expect(result.current.isLoading).toBe(false);
  });

  test('prevents concurrent executions', async () => {
    let resolveFirst: (value: any) => void;
    const firstPromise = new Promise(resolve => {
      resolveFirst = resolve;
    });
    
    mockOperation
      .mockReturnValueOnce(firstPromise)
      .mockResolvedValue('second call');
    
    const { result } = renderHook(() => useErrorRecovery(mockOperation));
    
    // Start first execution
    act(() => {
      result.current.execute();
    });
    
    expect(result.current.isLoading).toBe(true);
    
    // Try to start second execution while first is running
    act(() => {
      result.current.execute();
    });
    
    // Should still only have called once
    expect(mockOperation).toHaveBeenCalledTimes(1);
    
    // Resolve first execution
    await act(async () => {
      resolveFirst!('first result');
      await firstPromise;
    });
    
    expect(result.current.isLoading).toBe(false);
  });

  test('prevents retry when not failed', () => {
    mockOperation.mockResolvedValue('success');
    
    const { result } = renderHook(() => useErrorRecovery(mockOperation));
    
    // No error initially, retry should not do anything
    act(() => {
      result.current.retry();
    });
    
    expect(mockOperation).not.toHaveBeenCalled();
  });

  test('handles operation changes', async () => {
    const firstOperation = jest.fn().mockResolvedValue('first');
    const secondOperation = jest.fn().mockResolvedValue('second');
    
    const { result, rerender } = renderHook(
      ({ operation }) => useErrorRecovery(operation),
      { initialProps: { operation: firstOperation } }
    );
    
    // Execute with first operation
    await act(async () => {
      await result.current.execute();
    });
    
    expect(firstOperation).toHaveBeenCalled();
    
    // Change operation
    rerender({ operation: secondOperation });
    
    // Execute with second operation
    await act(async () => {
      await result.current.execute();
    });
    
    expect(secondOperation).toHaveBeenCalled();
  });
});