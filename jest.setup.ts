// Polyfill for setImmediate (needed for Winston logger)
global.setImmediate = (callback, ...args) => setTimeout(callback, 0, ...args);

// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import 'next-router-mock';
import { TextDecoder, TextEncoder } from 'util';

// Import and setup MSW server
import { server } from './__mocks__/msw';

// Polyfill for fetch API in Node environment for Jest tests
import 'whatwg-fetch';

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

// Mock IntersectionObserver (conditionally)
if (typeof window !== 'undefined') { 
  global.IntersectionObserver = class IntersectionObserver {
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
  global.ResizeObserver = class ResizeObserver {
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

// Setup MSW handlers before all tests
beforeAll(() => server.listen());

// Reset handlers after each test (important for test isolation)
afterEach(() => server.resetHandlers());

// Clean up after all tests are done
afterAll(() => server.close()); 