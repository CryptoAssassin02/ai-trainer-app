const request = require('supertest');
const express = require('express');
const registerRoutes = require('../../routes/index'); // The module we are testing

// Mock dependencies
jest.mock('os', () => {
  const originalOs = jest.requireActual('os');
  return {
    ...originalOs, // Spread the actual os module
    loadavg: jest.fn(), // Override specific functions as needed
  };
});
jest.mock('../../config', () => ({
  env: {
    env: 'test-env',
  },
}));

// Mock the process object properties/methods used by /health
const mockProcess = {
  uptime: jest.fn(),
  memoryUsage: jest.fn(),
  version: 'v16.0.0',
  platform: 'test-platform',
  arch: 'test-arch',
};
global.process = { ...process, ...mockProcess }; // Merge with real process, overriding specific mocks

// Mock the route modules to return a new express.Router() instance from the factory
// Jest ensures that require('path') within SUT and test gets the same cached mock instance.
// Require express inside the factory to avoid out-of-scope variable errors.
jest.mock('../../routes/auth', () => require('express').Router());
jest.mock('../../routes/v1/health', () => require('express').Router());
jest.mock('../../routes/profile', () => require('express').Router());
jest.mock('../../routes/nutrition', () => require('express').Router());
jest.mock('../../routes/workout', () => require('express').Router());
jest.mock('../../routes/workout-log', () => require('express').Router());
jest.mock('../../routes/check-in', () => require('express').Router());
jest.mock('../../routes/macros', () => require('express').Router());
jest.mock('../../routes/notifications', () => require('express').Router());
jest.mock('../../routes/data-transfer', () => require('express').Router());

describe('Root Router, /health Endpoint, and Route Registration', () => {
  let app;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup a new express app for each test
    app = express();
    
    // Mock data for os and process for /health route tests
    require('os').loadavg.mockReturnValue([0.1, 0.2, 0.3]);
    mockProcess.uptime.mockReturnValue(123456); // Example uptime in seconds
    mockProcess.memoryUsage.mockReturnValue({ rss: 100000, heapTotal: 200000, heapUsed: 150000, external: 50000, arrayBuffers: 10000 });
    
    // Apply the routes from routes/index.js
    // registerRoutes will mount the root router (containing /health)
    // and the /v1 router with all sub-routes.
    registerRoutes(app); 
  });

  describe('GET /health (Root Level)', () => {
    it('should return 200 OK with health status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.environment).toBe('test-env');
    });

    it('should include server uptime, node version, memory usage, cpu load, platform, and arch', async () => {
      const response = await request(app).get('/health');
      const serverInfo = response.body.server;

      expect(serverInfo).toBeDefined();
      expect(serverInfo.nodeVersion).toBe('v16.0.0');
      expect(serverInfo.memoryUsage).toEqual({ rss: 100000, heapTotal: 200000, heapUsed: 150000, external: 50000, arrayBuffers: 10000 });
      expect(serverInfo.cpuLoad).toEqual([0.1, 0.2, 0.3]);
      expect(serverInfo.platform).toBe('test-platform');
      expect(serverInfo.arch).toBe('test-arch');
    });

    it('should correctly format uptime', async () => {
      // 2 days, 3 hours, 30 minutes, 15 seconds
      const testUptime = (2 * 86400) + (3 * 3600) + (30 * 60) + 15;
      mockProcess.uptime.mockReturnValue(testUptime); 
      
      // Re-register routes if uptime mock needs to be effective before registerRoutes is called by app setup
      // However, since uptime is read dynamically in the handler, just calling the endpoint again is fine.
      const response = await request(app).get('/health');
      const uptimeFormatted = response.body.server.uptime;

      expect(uptimeFormatted).toEqual({
        days: 2,
        hours: 3,
        minutes: 30,
        seconds: 15,
      });
    });

    it('should correctly format uptime when less than 60 seconds', async () => {
        mockProcess.uptime.mockReturnValue(45); // 45 seconds
        const response = await request(app).get('/health');
        const uptimeFormatted = response.body.server.uptime;
        expect(uptimeFormatted).toEqual({
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 45,
        });
    });

    it('should include a valid ISO timestamp', async () => {
      const response = await request(app).get('/health');
      expect(response.body.timestamp).toBeDefined();
      const parsedDate = new Date(response.body.timestamp);
      expect(parsedDate.toISOString()).toBe(response.body.timestamp);
    });
  });

  describe('registerRoutes Function', () => {
    let mockAppForRegisterRoutes;
    let appUseSpy;
    let expressRouterSpy;

    beforeEach(() => {
      jest.clearAllMocks();
      appUseSpy = jest.fn();
      mockAppForRegisterRoutes = { use: appUseSpy };
      if (expressRouterSpy && expressRouterSpy.mockRestore) {
        expressRouterSpy.mockRestore(); // Restore spy from previous test run if any
      }
      expressRouterSpy = undefined; // Clear reference
    });

    afterEach(() => {
      if (expressRouterSpy && expressRouterSpy.mockRestore) {
        expressRouterSpy.mockRestore();
      }
    });

    it('should mount the root router (containing /health) first', () => {
      // This test verifies the effect of registerRoutes, not the internal router creations count by a spy.
      // The root router is created at module load of index.js. registerRoutes mounts it.
      registerRoutes(mockAppForRegisterRoutes);
      expect(appUseSpy).toHaveBeenCalledTimes(3);
      const rootRouterMount = appUseSpy.mock.calls[0][0];
      expect(rootRouterMount).toBeInstanceOf(Function);
      expect(typeof rootRouterMount.get).toBe('function'); // Check it's router-like
    });

    it('should mount all v1 sub-routes onto an apiRouter under /v1 path', () => {
      const originalExpressRouter = express.Router;
      let createdApiRouterBySpy; // Will hold the instance created by the spy

      // This spy is set up *before* registerRoutes is called in this test.
      // It will only catch the express.Router() call made *inside* registerRoutes for apiRouter.
      expressRouterSpy = jest.spyOn(express, 'Router')
        .mockImplementationOnce(() => { // This single mockImplementationOnce is for apiRouter
          createdApiRouterBySpy = originalExpressRouter();
          return createdApiRouterBySpy;
        });

      registerRoutes(mockAppForRegisterRoutes);

      // The spy should be called once (for apiRouter within registerRoutes)
      expect(expressRouterSpy).toHaveBeenCalledTimes(1);

      // Verify that app.use('/v1', ...) was called with the router instance created by our spy
      const v1MountCall = appUseSpy.mock.calls.find(call => call[0] === '/v1');
      expect(v1MountCall).toBeDefined();
      const mountedApiRouter = v1MountCall[1];
      expect(mountedApiRouter).toBe(createdApiRouterBySpy); // Check it's the correct instance

      // Verify that the mountedApiRouter (createdApiRouterBySpy) has the sub-routes
      const expectedSubRouters = [
        require('../../routes/auth'),
        require('../../routes/v1/health'),
        require('../../routes/profile'),
        require('../../routes/nutrition'),
        require('../../routes/macros'),
        require('../../routes/workout'),
        require('../../routes/workout-log'),
        require('../../routes/check-in'),
        require('../../routes/notifications'),
        require('../../routes/data-transfer'),
      ];

      expect(mountedApiRouter.stack).toBeDefined();
      expect(mountedApiRouter.stack.length).toBe(expectedSubRouters.length);

      const actualSubRouterHandles = mountedApiRouter.stack.map(layer => layer.handle);
      expectedSubRouters.forEach(expectedRouter => {
        expect(actualSubRouterHandles).toContain(expectedRouter);
      });
    });

    it('should mount the 404 handler last', () => {
      // No specific spy on express.Router needed here, just check app.use calls
      registerRoutes(mockAppForRegisterRoutes);
      expect(appUseSpy).toHaveBeenCalledTimes(3);
      const lastCallArgs = appUseSpy.mock.calls[2];
      expect(lastCallArgs[0]).toBeInstanceOf(Function); // The 404 handler
      expect(lastCallArgs[0].stack).toBeUndefined();
      expect(lastCallArgs[0].get).toBeUndefined();
    });
  });

  describe('404 Handler Middleware', () => {
    let mockReq, mockRes, fourOhFourHandler;
    
    beforeAll(() => {
        // Extract the 404 handler once
        const tempApp = { use: jest.fn() };
        registerRoutes(tempApp);
        if (tempApp.use.mock.calls.length > 0) {
            const lastCall = tempApp.use.mock.calls[tempApp.use.mock.calls.length - 1];
            if (typeof lastCall[0] === 'function') {
                fourOhFourHandler = lastCall[0];
            }
        }
    });

    beforeEach(() => {
        mockReq = { originalUrl: '/nonexistentpath' };
        mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
        if (!fourOhFourHandler) {
            // Fallback if handler wasn't extracted, though this indicates a bigger issue
            // This will likely cause tests to fail if handler is undefined.
            const tempApp = { use: jest.fn() };
            registerRoutes(tempApp);
            fourOhFourHandler = tempApp.use.mock.calls[tempApp.use.mock.calls.length - 1][0];
        }
    });

    it('should be a function', () => {
        expect(fourOhFourHandler).toBeInstanceOf(Function);
    });

    it('should return 404 status when called', () => {
        if (!fourOhFourHandler) throw new Error('404 handler not extracted');
        fourOhFourHandler(mockReq, mockRes, jest.fn());
        expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return JSON with error message and path when called', () => {
        if (!fourOhFourHandler) throw new Error('404 handler not extracted');
        fourOhFourHandler(mockReq, mockRes, jest.fn());
        expect(mockRes.json).toHaveBeenCalledWith({
            status: 'error',
            message: 'Route not found',
            path: '/nonexistentpath'
        });
    });
  });
}); 