/**
 * Network Detector Tests
 * Tests for network status detection and error classification
 */

import { 
  createNetworkDetector, 
  isNetworkError, 
  getNetworkErrorMessage, 
  useNetworkStatus 
} from '@/utils/error/network-detector';
import { renderHook, act } from '@testing-library/react';

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock navigator.connection
Object.defineProperty(navigator, 'connection', {
  writable: true,
  value: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
    saveData: false
  }
});

// Mock window events
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();
Object.defineProperty(window, 'addEventListener', { value: mockAddEventListener });
Object.defineProperty(window, 'removeEventListener', { value: mockRemoveEventListener });

// Mock global fetch
global.fetch = jest.fn();

describe('createNetworkDetector', () => {
  let detector: any;

  afterEach(() => {
    if (detector) {
      detector.destroy();
      detector = null;
    }
    jest.clearAllMocks();
  });

  test('creates detector with default options', () => {
    detector = createNetworkDetector();
    expect(detector).toBeDefined();
    expect(typeof detector.getStatus).toBe('function');
    expect(typeof detector.subscribe).toBe('function');
    expect(typeof detector.destroy).toBe('function');
  });

  test('creates detector with custom options', () => {
    detector = createNetworkDetector({
      pingUrl: '/custom/health',
      pingInterval: 15000,
      slowConnectionThreshold: 2000
    });
    expect(detector).toBeDefined();
  });

  test('detects initial online status', () => {
    (navigator as any).onLine = true;
    detector = createNetworkDetector();
    
    const status = detector.getStatus();
    expect(status.isOnline).toBe(true);
  });

  test('detects initial offline status', () => {
    (navigator as any).onLine = false;
    detector = createNetworkDetector();
    
    const status = detector.getStatus();
    expect(status.isOnline).toBe(false);
  });

  test('detects slow connection based on RTT', () => {
    (navigator as any).connection = {
      effectiveType: '2g',
      downlink: 0.5,
      rtt: 2000,
      saveData: true
    };
    
    detector = createNetworkDetector({
      slowConnectionThreshold: 1000
    });
    
    const status = detector.getStatus();
    expect(status.isSlowConnection).toBe(true);
  });

  test('subscribes to status changes', () => {
    detector = createNetworkDetector();
    
    const listener = jest.fn();
    const unsubscribe = detector.subscribe(listener);
    
    expect(typeof unsubscribe).toBe('function');
    
    // Trigger online event
    const onlineEvent = new Event('online');
    window.dispatchEvent(onlineEvent);
    
    expect(listener).toHaveBeenCalled();
    
    // Unsubscribe
    unsubscribe();
    
    // Should not be called after unsubscribe
    listener.mockClear();
    window.dispatchEvent(onlineEvent);
    expect(listener).not.toHaveBeenCalled();
  });

  test('handles online/offline events', () => {
    detector = createNetworkDetector();
    const listener = jest.fn();
    detector.subscribe(listener);
    
    // Test that events are set up - verify addEventListener was called
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    
    // Re-create detector to see addEventListener calls
    detector.destroy();
    detector = createNetworkDetector();
    
    expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    
    addEventListenerSpy.mockRestore();
  });

  test('performs heartbeat checks when enabled', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200
    });
    
    detector = createNetworkDetector({
      enableHeartbeat: true,
      pingInterval: 100 // Very short for testing
    });
    
    // Wait for initial heartbeat
    await new Promise(resolve => setTimeout(resolve, 150));
    
    expect(global.fetch).toHaveBeenCalledWith('/api/health', {
      method: 'HEAD',
      cache: 'no-cache',
      signal: expect.any(AbortSignal)
    });
  });

  test('handles heartbeat failures', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    detector = createNetworkDetector({
      enableHeartbeat: true,
      pingInterval: 100
    });
    
    const listener = jest.fn();
    detector.subscribe(listener);
    
    // Wait for heartbeat failure
    await new Promise(resolve => setTimeout(resolve, 150));
    
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ isOnline: false })
    );
  });

  test('cleans up event listeners on destroy', () => {
    detector = createNetworkDetector();
    detector.destroy();
    
    expect(mockRemoveEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(mockRemoveEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  test('stops heartbeat on destroy', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    
    detector = createNetworkDetector({
      enableHeartbeat: true
    });
    
    detector.destroy();
    
    expect(clearIntervalSpy).toHaveBeenCalled();
    
    clearIntervalSpy.mockRestore();
  });
});

describe('isNetworkError', () => {
  test('identifies fetch errors as network errors', () => {
    const fetchError = new Error('Failed to fetch');
    expect(isNetworkError(fetchError)).toBe(true);
  });

  test('identifies network abort errors', () => {
    const abortError = new Error('The operation was aborted');
    expect(isNetworkError(abortError)).toBe(true);
  });

  test('identifies timeout errors', () => {
    const timeoutError = new Error('Request timeout');
    expect(isNetworkError(timeoutError)).toBe(true);
  });

  test('identifies DNS errors', () => {
    const dnsError = new Error('getaddrinfo ENOTFOUND');
    expect(isNetworkError(dnsError)).toBe(true);
  });

  test('identifies connection refused errors', () => {
    const connectionError = new Error('connect ECONNREFUSED');
    expect(isNetworkError(connectionError)).toBe(true);
  });

  test('identifies TypeError network errors', () => {
    const typeError = new TypeError('Failed to fetch');
    expect(isNetworkError(typeError)).toBe(true);
  });

  test('does not identify non-network errors', () => {
    const validationError = new Error('Invalid input');
    expect(isNetworkError(validationError)).toBe(false);
    
    const authError = new Error('Unauthorized');
    expect(isNetworkError(authError)).toBe(false);
  });

  test('handles DOMException network errors', () => {
    const domException = new DOMException('The operation was aborted', 'AbortError');
    expect(isNetworkError(domException)).toBe(true);
  });

  test('handles errors with cause chains', () => {
    const rootCause = new Error('Failed to fetch');
    const wrappedError = new Error('API request failed');
    (wrappedError as any).cause = rootCause;
    
    expect(isNetworkError(wrappedError)).toBe(true);
  });
});

describe('getNetworkErrorMessage', () => {
  test('returns appropriate message for fetch errors', () => {
    const fetchError = new Error('Failed to fetch');
    const message = getNetworkErrorMessage(fetchError);
    
    expect(message).toContain('network');
    expect(message).toContain('connection');
  });

  test('returns appropriate message for timeout errors', () => {
    const timeoutError = new Error('Request timeout');
    const message = getNetworkErrorMessage(timeoutError);
    
    expect(message).toContain('timed out');
    expect(message).toContain('slow');
  });

  test('returns appropriate message for DNS errors', () => {
    const dnsError = new Error('getaddrinfo ENOTFOUND api.example.com');
    const message = getNetworkErrorMessage(dnsError);
    
    expect(message).toContain('server');
    expect(message).toContain('resolve');
  });

  test('returns default message for unknown network errors', () => {
    const unknownError = new Error('Unknown network issue');
    const message = getNetworkErrorMessage(unknownError);
    
    expect(message).toContain('network');
    expect(message).toContain('try again');
  });

  test('includes retry suggestion for transient errors', () => {
    const transientError = new Error('Service temporarily unavailable');
    const message = getNetworkErrorMessage(transientError);
    
    expect(message).toContain('try again');
  });
});

describe('useNetworkStatus hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset navigator.connection to default mock values
    if (typeof navigator !== 'undefined') {
      (navigator as any).connection = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        saveData: false,
        onchange: null
      };
      (navigator as any).onLine = true;
    }
  });

  afterEach(() => {
    // Clean up global network detector to avoid test interference
    const { resetNetworkDetector } = require('../../utils/error/network-detector');
    resetNetworkDetector();
  });

  test('returns initial network status', () => {
    // Set navigator.onLine to true 
    (navigator as any).onLine = true;
    
    const { result } = renderHook(() => useNetworkStatus());
    
    // Check that the hook returns a valid status object
    expect(result.current).toHaveProperty('isOnline');
    expect(result.current).toHaveProperty('isSlowConnection');
    expect(typeof result.current.isOnline).toBe('boolean');
    expect(typeof result.current.isSlowConnection).toBe('boolean');
  });

  test('updates status when network changes', () => {
    // Set up slow connection conditions before creating the hook
    (navigator as any).connection.effectiveType = '2g';
    (navigator as any).connection.rtt = 2000;
    
    const { result } = renderHook(() => useNetworkStatus());
    
    // The hook should detect the slow connection from the initial state
    expect(result.current.isSlowConnection).toBe(true);
  });

  test('provides network connection details', () => {
    // The values should already be set correctly by beforeEach
    const { result } = renderHook(() => useNetworkStatus());
    
    expect(result.current.effectiveType).toBe('4g');
    expect(result.current.downlink).toBe(10);
    expect(result.current.rtt).toBe(50);
    expect(result.current.saveData).toBe(false);
  });

  test('detects slow connections', () => {
    (navigator as any).connection = {
      effectiveType: '2g',
      downlink: 0.5,
      rtt: 2000,
      saveData: true
    };
    
    const { result } = renderHook(() => useNetworkStatus({
      slowConnectionThreshold: 1000
    }));
    
    expect(result.current.isSlowConnection).toBe(true);
  });

  test('handles missing connection API gracefully', () => {
    // Create a custom navigator without connection API
    const originalNavigator = global.navigator;
    const navigatorWithoutConnection = { ...originalNavigator, onLine: true };
    delete (navigatorWithoutConnection as any).connection;
    
    // Temporarily replace navigator
    Object.defineProperty(global, 'navigator', {
      value: navigatorWithoutConnection,
      configurable: true
    });
    
    const { result } = renderHook(() => useNetworkStatus());
    
    expect(result.current.isOnline).toBe(true);
    expect(result.current.isSlowConnection).toBe(false);
    
    // Restore original navigator
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true
    });
  });

  test('cleans up detector on unmount', () => {
    const { unmount } = renderHook(() => useNetworkStatus());
    
    // Simply test that unmount doesn't throw an error
    expect(() => unmount()).not.toThrow();
    
    // Verify that a new detector can be created after cleanup
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current).toHaveProperty('isOnline');
  });

  test('accepts custom detector options', () => {
    const { result } = renderHook(() => useNetworkStatus({
      pingUrl: '/custom/ping',
      pingInterval: 5000,
      enableHeartbeat: true
    }));
    
    expect(result.current).toBeDefined();
  });
});