import { handlers } from './handlers';

// Create a service worker with our request handlers
class MockWorker {
  constructor(private handlers: any[]) {}

  start(options: { onUnhandledRequest: string } = { onUnhandledRequest: 'bypass' }) {
    console.log('MSW Worker started with options:', options);
    return Promise.resolve(this);
  }

  use(...handlers: any[]) {
    console.log('Using additional handlers in worker');
    this.handlers.push(...handlers);
    return this;
  }
}

export const worker = new MockWorker(handlers);

// Initialize the MSW in the browser
export function initMocks() {
  // Log to console when in development
  if (process.env.NODE_ENV === 'development') {
    worker.start({
      onUnhandledRequest: 'bypass',
    }).catch((error: Error) => {
      console.error('Error starting MSW worker:', error);
    });
  }
}

// Export request handlers for direct usage in tests
export { handlers }; 