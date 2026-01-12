// Polyfill for setImmediate (needed for Winston logger)
if (!global.setImmediate) {
  global.setImmediate = function(callback, ...args) {
    return setTimeout(callback, 0, ...args);
  };
  global.clearImmediate = function(id) {
    clearTimeout(id);
  };
}

// Learn more: https://github.com/testing-library/jest-dom
require('@testing-library/jest-dom');
require('next-router-mock');

// Polyfill TextEncoder/TextDecoder for MSW (must be before MSW import)
const { TextDecoder, TextEncoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Add fetch polyfills for MSW
if (!global.fetch) {
  require('whatwg-fetch');
}
if (!global.Response) {
  global.Response = require('node-fetch').Response;
}
if (!global.Request) {
  global.Request = require('node-fetch').Request;
}
if (!global.Headers) {
  global.Headers = require('node-fetch').Headers;
}

// Import and setup MSW server (with fallback for module resolution issues)
let server;
try {
  server = require('./__mocks__/msw/index.js').server;
} catch (e) {
  console.warn('MSW server setup failed, tests will use direct mocks:', e.message);
  // Create a mock server object to prevent errors
  server = {
    listen: () => {},
    close: () => {},
    resetHandlers: () => {},
  };
}

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  AlertTriangle: ({ className, ...props }) => require('react').createElement('span', { 
    'data-testid': 'mock-lucide-icon', 
    className, 
    ...props 
  }),
  AlertCircle: ({ className, ...props }) => require('react').createElement('span', { 
    'data-testid': 'mock-lucide-icon', 
    className, 
    ...props 
  }),
  Info: ({ className, ...props }) => require('react').createElement('span', { 
    'data-testid': 'mock-lucide-icon', 
    className, 
    ...props 
  }),
  RefreshCw: ({ className, ...props }) => require('react').createElement('span', { 
    'data-testid': 'mock-lucide-icon', 
    className, 
    ...props 
  }),
  Bug: ({ className, ...props }) => require('react').createElement('span', { 
    'data-testid': 'mock-lucide-icon', 
    className, 
    ...props 
  }),
  X: ({ className, ...props }) => require('react').createElement('span', { 
    'data-testid': 'mock-lucide-icon', 
    className, 
    ...props 
  }),
  CheckCircle: ({ className, ...props }) => require('react').createElement('span', { 
    'data-testid': 'mock-lucide-icon', 
    className, 
    ...props 
  }),
  RotateCcw: ({ className, ...props }) => require('react').createElement('span', { 
    'data-testid': 'mock-lucide-icon', 
    className, 
    ...props 
  }),
  Home: ({ className, ...props }) => require('react').createElement('span', { 
    'data-testid': 'mock-lucide-icon', 
    className, 
    ...props 
  }),
  Eye: ({ className, ...props }) => require('react').createElement('span', { 
    'data-testid': 'mock-lucide-icon', 
    className, 
    ...props 
  }),
  EyeOff: ({ className, ...props }) => require('react').createElement('span', { 
    'data-testid': 'mock-lucide-icon', 
    className, 
    ...props 
  }),
  Copy: ({ className, ...props }) => require('react').createElement('span', { 
    'data-testid': 'mock-lucide-icon', 
    className, 
    ...props 
  }),
  ExternalLink: ({ className, ...props }) => require('react').createElement('span', { 
    'data-testid': 'mock-lucide-icon', 
    className, 
    ...props 
  }),
  AlertOctagon: ({ className, ...props }) => require('react').createElement('span', { 
    'data-testid': 'mock-lucide-icon', 
    className, 
    ...props 
  })
}));

// Mock PromiseRejectionEvent for browser API testing
global.PromiseRejectionEvent = class PromiseRejectionEvent extends Event {
  constructor(type, eventInitDict) {
    super(type);
    this.promise = eventInitDict?.promise;
    this.reason = eventInitDict?.reason;
  }
  
  preventDefault() {
    // Mock preventDefault
  }
};

// Polyfill for fetch API in Node environment for Jest tests
require('whatwg-fetch');

// Mock the window.matchMedia function used in responsive components
// Only apply if window exists (i.e., not in 'node' environment)
if (typeof window !== 'undefined') { 
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// Mock Navigator Connection API for network detection tests
if (typeof navigator !== 'undefined') {
  Object.defineProperty(navigator, 'connection', {
    writable: true,
    configurable: true,
    value: {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
      saveData: false,
      onchange: null
    }
  });
  
  // Make navigator.onLine fully configurable for tests
  delete (navigator as any).onLine;
  Object.defineProperty(navigator, 'onLine', {
    get: function() {
      return this._onLine !== undefined ? this._onLine : true;
    },
    set: function(value) {
      this._onLine = value;
    },
    configurable: true
  });
  
  // Initialize to true
  (navigator as any).onLine = true;
}

// Mock IntersectionObserver (conditionally)
if (typeof window !== 'undefined') { 
  global.IntersectionObserver = class MockIntersectionObserver {
    constructor(callback) {
      this.callback = callback;
      this.root = null;
      this.rootMargin = '';
      this.thresholds = [];
    }
    observe() {
      return null;
    }
    unobserve() {
      return null;
    }
    disconnect() {
      return null;
    }
    takeRecords() {
      return [];
    }
  };
}

// Polyfills
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill for HTMLFormElement.prototype.requestSubmit
// Fix for "Error: Not implemented: HTMLFormElement.prototype.requestSubmit"
// Only apply if HTMLFormElement exists (i.e., not in 'node' environment)
if (typeof HTMLFormElement !== 'undefined' && !HTMLFormElement.prototype.requestSubmit) {
  HTMLFormElement.prototype.requestSubmit = function(submitter) {
    if (submitter) {
      submitter.click();
    } else {
      const button = document.createElement('button');
      button.type = 'submit';
      button.hidden = true;
      this.appendChild(button);
      button.click();
      this.removeChild(button);
    }
  };
}

// Mock window.scrollTo (conditionally)
if (typeof window !== 'undefined') { 
  window.scrollTo = jest.fn();
}

// Mock requestAnimationFrame (conditionally)
if (typeof window !== 'undefined') { 
  global.requestAnimationFrame = (callback) => {
    return setTimeout(callback, 0);
  };
  global.cancelAnimationFrame = (id) => {
    clearTimeout(id);
  };
}

// Mock ResizeObserver (conditionally)
if (typeof window !== 'undefined') { 
  global.ResizeObserver = class MockResizeObserver {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {
      return null;
    }
    unobserve() {
      return null;
    }
    disconnect() {
      return null;
    }
  };
}

// Hide console.warn and console.error during tests
// Comment these out when debugging test failures
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

console.warn = (...args) => {
  // Filter out specific expected warnings
  if (
    args[0]?.includes?.('ReactDOM.render is no longer supported') ||
    args[0]?.includes?.('Error: The current host is using the') ||
    args[0]?.includes?.('@storybook') ||
    args[0]?.includes?.('ARIA')
  ) {
    return;
  }
  originalConsoleWarn(...args);
};

console.error = (...args) => {
  // Filter out specific expected errors
  if (
    args[0]?.includes?.('Warning: ReactDOM.render is no longer supported') ||
    args[0]?.includes?.('Error: The current host is using the') ||
    (typeof args[0] === 'object' && args[0]?.type === 'not implemented' && args[0]?.message?.includes?.('HTMLFormElement.prototype.requestSubmit')) ||
    args[0]?.toString()?.includes?.('Error: Not implemented: HTMLFormElement.prototype.requestSubmit')
  ) {
    return;
  }
  originalConsoleError(...args);
};

// Setup MSW handlers before all tests (if available)
beforeAll(() => {
  if (server && server.listen) {
    server.listen();
  }
});

// Reset handlers after each test (important for test isolation)
afterEach(() => {
  if (server && server.resetHandlers) {
    server.resetHandlers();
  }
});

// Clean up after all tests are done
afterAll(() => {
  if (server && server.close) {
    server.close();
  }
}); 