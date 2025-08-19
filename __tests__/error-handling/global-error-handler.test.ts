/**
 * Global Error Handler Tests
 * Tests for centralized error handling and reporting
 */

import { createGlobalErrorHandler, reportError, useErrorHandler } from '@/utils/error/global-error-handler';
import { renderHook } from '@testing-library/react';

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    success: jest.fn()
  }
}));

jest.mock('@/utils/error/network-detector', () => ({
  createNetworkDetector: jest.fn(() => ({
    getStatus: jest.fn(() => ({ isOnline: true, isSlowConnection: false })),
    destroy: jest.fn()
  })),
  isNetworkError: jest.fn((error: Error) => error.message.includes('fetch')),
  getNetworkErrorMessage: jest.fn(() => 'Network error message')
}));

// Mock global fetch
global.fetch = jest.fn();

// Mock window properties
Object.defineProperty(window, 'location', {
  value: { href: 'https://test.example.com/page' },
  writable: true
});

Object.defineProperty(navigator, 'userAgent', {
  value: 'Test User Agent',
  writable: true
});

// Mock storage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};

const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });
Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage });

describe('GlobalErrorHandler', () => {
  let handler: any;
  let originalConsoleError: typeof console.error;
  let originalConsoleGroup: typeof console.group;
  let originalConsoleGroupEnd: typeof console.groupEnd;

  beforeAll(() => {
    originalConsoleError = console.error;
    originalConsoleGroup = console.group;
    originalConsoleGroupEnd = console.groupEnd;
    
    console.error = jest.fn();
    console.group = jest.fn();
    console.groupEnd = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
    console.group = originalConsoleGroup;
    console.groupEnd = originalConsoleGroupEnd;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockSessionStorage.getItem.mockReturnValue(null);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
  });

  afterEach(() => {
    if (handler) {
      handler.destroy();
      handler = null;
    }
  });

  test('creates global error handler with default options', () => {
    handler = createGlobalErrorHandler();
    expect(handler).toBeDefined();
  });

  test('creates global error handler with custom options', () => {
    handler = createGlobalErrorHandler({
      enableToasts: false,
      enableConsoleLogging: false,
      maxToastsPerMinute: 5
    });
    expect(handler).toBeDefined();
  });

  test('handles errors and returns error ID', () => {
    handler = createGlobalErrorHandler();
    const error = new Error('Test error');
    
    const errorId = handler.handleError(error);
    
    expect(errorId).toMatch(/^error_\d+_[a-z0-9]+$/);
    expect(console.group).toHaveBeenCalledWith(
      expect.stringContaining('Global Error Handler')
    );
  });

  test('determines error severity correctly', () => {
    handler = createGlobalErrorHandler();
    
    // Test different error types
    const securityError = new Error('Unauthorized access detected');
    const networkError = new Error('Failed to fetch data');
    const chunkError = new Error('Loading chunk 0 failed');
    
    const securityId = handler.handleError(securityError);
    const networkId = handler.handleError(networkError);
    const chunkId = handler.handleError(chunkError);
    
    expect(securityId).toBeDefined();
    expect(networkId).toBeDefined();
    expect(chunkId).toBeDefined();
  });

  test('categorizes errors correctly', () => {
    handler = createGlobalErrorHandler();
    
    const networkError = new Error('fetch failed');
    const apiError = new Error('API request failed');
    const securityError = new Error('Unauthorized');
    const performanceError = new Error('chunk loading timeout');
    
    handler.handleError(networkError);
    handler.handleError(apiError);
    handler.handleError(securityError);
    handler.handleError(performanceError);
    
    expect(console.group).toHaveBeenCalledTimes(4);
  });

  test('reports errors to external service in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    handler = createGlobalErrorHandler({
      enableReporting: true,
      reportingUrl: '/api/errors/report'
    });
    
    const error = new Error('Production error');
    handler.handleError(error);
    
    // Wait for async reporting
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(global.fetch).toHaveBeenCalledWith('/api/errors/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('Production error')
    });
    
    process.env.NODE_ENV = originalEnv;
  });

  test('rate limits toast notifications', () => {
    const { toast } = require('sonner');
    
    handler = createGlobalErrorHandler({
      maxToastsPerMinute: 2
    });
    
    // Trigger multiple errors
    for (let i = 0; i < 5; i++) {
      handler.handleError(new Error(`Error ${i}`));
    }
    
    // Should only show limited number of toasts
    expect(toast.warning).toHaveBeenCalledTimes(2);
  });

  test('handles global window errors', () => {
    handler = createGlobalErrorHandler();
    
    const errorEvent = new ErrorEvent('error', {
      message: 'Global error',
      filename: 'test.js',
      lineno: 10,
      colno: 5
    });
    
    window.dispatchEvent(errorEvent);
    
    expect(console.group).toHaveBeenCalled();
  });

  test('handles unhandled promise rejections', async () => {
    handler = createGlobalErrorHandler();
    
    // Create a mock promise that won't actually reject during test execution
    const mockPromise = {
      then: jest.fn(),
      catch: jest.fn()
    } as any;
    
    const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
      promise: mockPromise,
      reason: new Error('Unhandled rejection')
    });
    
    // Mock preventDefault
    rejectionEvent.preventDefault = jest.fn();
    
    window.dispatchEvent(rejectionEvent);
    
    expect(console.group).toHaveBeenCalled();
    expect(rejectionEvent.preventDefault).toHaveBeenCalled();
  });

  test('generates unique session IDs', () => {
    handler = createGlobalErrorHandler();
    
    const error1 = new Error('Test 1');
    const error2 = new Error('Test 2');
    
    handler.handleError(error1);
    handler.handleError(error2);
    
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
      'sessionId',
      expect.stringMatching(/^session_\d+_[a-z0-9]+$/)
    );
  });

  test('extracts user ID from localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
      id: 'user123'
    }));
    
    handler = createGlobalErrorHandler();
    const error = new Error('User context test');
    
    handler.handleError(error);
    
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('user');
  });

  test('handles localStorage errors gracefully', () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    
    handler = createGlobalErrorHandler();
    const error = new Error('Storage error test');
    
    // Should not throw
    expect(() => handler.handleError(error)).not.toThrow();
  });

  test('prevents duplicate toasts with fingerprinting', () => {
    const { toast } = require('sonner');
    
    handler = createGlobalErrorHandler();
    
    // Create identical errors
    const error1 = new Error('Duplicate error');
    const error2 = new Error('Duplicate error');
    
    handler.handleError(error1);
    handler.handleError(error2);
    
    // Should only show one toast due to fingerprinting
    expect(toast.warning).toHaveBeenCalledTimes(1);
  });

  test('cleans up event listeners on destroy', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    
    handler = createGlobalErrorHandler();
    handler.destroy();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    
    removeEventListenerSpy.mockRestore();
  });
});

describe('reportError utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates handler and reports error', () => {
    const error = new Error('Utility test error');
    const context = { component: 'TestComponent' };
    
    const errorId = reportError(error, context);
    
    expect(errorId).toMatch(/^error_\d+_[a-z0-9]+$/);
  });
});

describe('useErrorHandler hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns error handler function', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    expect(typeof result.current).toBe('function');
  });

  test('handles errors when called', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    const error = new Error('Hook test error');
    const context = { hookTest: true };
    
    const errorId = result.current(error, context);
    
    expect(errorId).toMatch(/^error_\d+_[a-z0-9]+$/);
  });

  test('maintains stable reference across re-renders', () => {
    const { result, rerender } = renderHook(() => useErrorHandler());
    
    const firstHandler = result.current;
    rerender();
    const secondHandler = result.current;
    
    expect(firstHandler).toBe(secondHandler);
  });
});

describe('Error reporting API integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('handles reporting failures gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    const handler = createGlobalErrorHandler({
      enableReporting: true
    });
    
    const error = new Error('Test error');
    
    // Should not throw even if reporting fails
    expect(() => handler.handleError(error)).not.toThrow();
    
    handler.destroy();
  });

  test('queues errors when reporting is busy', async () => {
    let resolveFirst: (value: any) => void;
    const firstRequest = new Promise(resolve => {
      resolveFirst = resolve;
    });
    
    (global.fetch as jest.Mock)
      .mockReturnValueOnce(firstRequest)
      .mockResolvedValue({ ok: true });
    
    const handler = createGlobalErrorHandler({
      enableReporting: true
    });
    
    // Report multiple errors rapidly
    handler.handleError(new Error('Error 1'));
    handler.handleError(new Error('Error 2'));
    
    // Resolve first request
    resolveFirst!({ ok: true });
    
    // Wait for queue processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(global.fetch).toHaveBeenCalledTimes(2);
    
    handler.destroy();
  });
});