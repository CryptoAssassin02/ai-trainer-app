// Export dummy implementations for tests
// These are just stubs to make the tests pass
// Real implementation would use actual MSW
export const server = {
  listen: () => {
    // console.log('MSW Server started');
    return server;
  },
  resetHandlers: () => {
    // console.log('MSW Server handlers reset');
    return server;
  },
  close: () => {
    // console.log('MSW Server closed');
    return server;
  },
  use: (...handlers: any[]) => {
    // console.log('Using additional handlers');
    return server;
  }
};

export const worker = {
  start: (options = {}) => {
    // console.log('MSW Worker started with options:', options);
    return Promise.resolve(worker);
  },
  use: (...handlers: any[]) => {
    // console.log('Using additional handlers in worker');
    return worker;
  }
};

export const handlers = [];

export function initMocks() {
  // console.log('Mock initialization called');
} 