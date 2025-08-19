import { handlers } from './handlers';

// Create a simplified server implementation for Jest testing
class TestServer {
  private listeners: { [key: string]: Function[] } = {
    listen: [],
    resetHandlers: [],
    close: []
  };

  constructor(public handlers: any[]) {}

  listen() {
    console.log('MSW Server started');
    this.listeners.listen.forEach(listener => listener());
    return this;
  }

  resetHandlers() {
    console.log('MSW Server handlers reset');
    this.listeners.resetHandlers.forEach(listener => listener());
    return this;
  }

  close() {
    console.log('MSW Server closed');
    this.listeners.close.forEach(listener => listener());
    return this;
  }
  
  use(...handlers: any[]) {
    console.log('Using additional handlers');
    this.handlers.push(...handlers);
    return this;
  }
}

// Setup MSW server with our request handlers
export const server = new TestServer(handlers);

// Export request handlers for direct usage in tests
export { handlers }; 