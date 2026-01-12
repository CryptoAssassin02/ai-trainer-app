// Add a basic mock for Joi, as config/env likely uses it
jest.mock('joi', () => ({
  object: jest.fn().mockReturnThis(),
  keys: jest.fn().mockReturnThis(),
  string: jest.fn().mockReturnThis(),
  number: jest.fn().mockReturnThis(),
  boolean: jest.fn().mockReturnThis(),
  uri: jest.fn().mockReturnThis(),
  required: jest.fn().mockReturnThis(),
  optional: jest.fn().mockReturnThis(),
  default: jest.fn().mockReturnThis(),
  validate: jest.fn().mockReturnValue({ error: null, value: {} }) // Simulate successful validation
}));

describe('Configuration Index - backend/config/index.js', () => {
  let originalNodeEnv;

  beforeAll(() => {
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    // Reset NODE_ENV after each test
    process.env.NODE_ENV = originalNodeEnv;
    // No need for jest.resetModules() if using isolateModules correctly
  });

  it('should export all expected configuration modules in dev', () => {
    // Test standard loading in a non-test env
    process.env.NODE_ENV = 'development';
    jest.isolateModules(() => {
      // Use jest.doMock inside isolateModules for more control over timing
      jest.doMock('../../config/env', () => ({ env: 'development' }), { virtual: true });
      jest.doMock('../../config/supabase', () => ({ createSupabaseClient: jest.fn(), getSupabaseAdmin: jest.fn() }), { virtual: true });
      jest.doMock('../../config/config', () => ({ server: { defined: true } }), { virtual: true }); // Mock with server prop
      jest.doMock('../../utils/logger', () => ({ warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }), { virtual: true }); 
      jest.doMock('../../config/openai', () => ({}), { virtual: true });
      jest.doMock('../../config/perplexity', () => ({}), { virtual: true });
      
      // Require the module *after* mocks are defined with doMock
      const configIndex = require('../../config/index');

      // Check all exports should now be defined
      expect(configIndex.env).toBeDefined();
      expect(configIndex.supabase).toBeDefined();
      expect(configIndex.config).toBeDefined();
      expect(configIndex.logger).toBeDefined();
      expect(configIndex.openai).toBeDefined();
      expect(configIndex.perplexity).toBeDefined();
      expect(configIndex.serverConfig).toBeDefined(); 
    });
  });

  it('should export modules with expected types in dev', () => {
     process.env.NODE_ENV = 'development';
     jest.isolateModules(() => {
       // Use jest.doMock here as well
       jest.doMock('../../config/env', () => ({ env: 'development' }), { virtual: true });
       jest.doMock('../../config/config', () => ({ server: { defined: true } }), { virtual: true });
       jest.doMock('../../utils/logger', () => ({ info: jest.fn(), error: jest.fn() }), { virtual: true });
       jest.doMock('../../config/supabase', () => ({ createSupabaseClient: jest.fn() }), { virtual: true });
       jest.doMock('../../config/openai', () => ({ openAIApiKey: 'key' }), { virtual: true });
       jest.doMock('../../config/perplexity', () => ({ perplexityApiKey: 'key' }), { virtual: true });

       // Require after doMocks
       const configIndex = require('../../config/index');

       expect(typeof configIndex.env).toBe('object');
       expect(typeof configIndex.config).toBe('object');
       expect(typeof configIndex.logger).toBe('object');
       expect(typeof configIndex.supabase).toBe('object');
       expect(typeof configIndex.openai).toBe('object');
       expect(typeof configIndex.perplexity).toBe('object');
       expect(typeof configIndex.serverConfig).toBe('object');
     });
  });


  describe('Fallback/Error Logic', () => {
    
    // Test Fallbacks when NODE_ENV=test
    it('NODE_ENV=test: should provide fallback for config module if require fails', () => {
      process.env.NODE_ENV = 'test';
      jest.isolateModules(() => {
        jest.mock('../../config/env', () => ({ env: 'test' }), { virtual: true }); // Mock env success
        jest.doMock('../../config/config', () => { throw new Error('Module not found'); }); // Force config fail
        jest.mock('../../utils/logger', () => ({ warn: jest.fn() }), { virtual: true }); // Mock logger 
        jest.mock('../../config/supabase', () => ({}), { virtual: true }); // Mock others
        jest.mock('../../config/openai', () => ({}), { virtual: true });
        jest.mock('../../config/perplexity', () => ({}), { virtual: true });

        const configIndex = require('../../config/index');
        // Check the specific fallback provided in config/index.js
        expect(configIndex.config).toEqual({ server: {} }); 
        // Check logger was warned
        expect(require('../../utils/logger').warn).toHaveBeenCalledWith(expect.stringContaining('Failed to load server configuration'), expect.any(Error));
      });
    });

    it('NODE_ENV=test: should provide console logger if logger require fails', () => {
       process.env.NODE_ENV = 'test';
       jest.isolateModules(() => {
          jest.mock('../../config/env', () => ({ env: 'test' }), { virtual: true }); 
          jest.mock('../../config/config', () => ({}), { virtual: true }); 
          jest.doMock('../../utils/logger', () => { throw new Error('Module not found'); }); // Force logger fail
          jest.mock('../../config/supabase', () => ({}), { virtual: true }); 
          jest.mock('../../config/openai', () => ({}), { virtual: true });
          jest.mock('../../config/perplexity', () => ({}), { virtual: true });
          
          // Mock console.error to check if it was called
          const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

          const configIndex = require('../../config/index');
          expect(configIndex.logger).toBeDefined();
          expect(typeof configIndex.logger.info).toBe('function');
          expect(typeof configIndex.logger.error).toBe('function');
          expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load logger'), expect.any(Error));
          
          consoleErrorSpy.mockRestore(); // Clean up spy
       });
    });

    it('NODE_ENV=test: should provide fallback for openai module if require fails', () => {
       process.env.NODE_ENV = 'test'; 
       jest.isolateModules(() => {
         jest.mock('../../config/env', () => ({ env: 'test' }), { virtual: true });
         jest.mock('../../config/config', () => ({}), { virtual: true });
         jest.mock('../../utils/logger', () => ({ warn: jest.fn() }), { virtual: true });
         jest.mock('../../config/supabase', () => ({}), { virtual: true });
         jest.doMock('../../config/openai', () => { throw new Error('Module not found'); }); // Force fail
         jest.mock('../../config/perplexity', () => ({}), { virtual: true });

         const configIndex = require('../../config/index');
         expect(configIndex.openai).toEqual({});
         expect(require('../../utils/logger').warn).toHaveBeenCalledWith(expect.stringContaining('Failed to load OpenAI'), expect.any(Error));
        });
     });

     it('NODE_ENV=test: should provide fallback for perplexity module if require fails', () => {
       process.env.NODE_ENV = 'test';
       jest.isolateModules(() => {
         jest.mock('../../config/env', () => ({ env: 'test' }), { virtual: true });
         jest.mock('../../config/config', () => ({}), { virtual: true });
         jest.mock('../../utils/logger', () => ({ warn: jest.fn() }), { virtual: true });
         jest.mock('../../config/supabase', () => ({}), { virtual: true });
         jest.mock('../../config/openai', () => ({}), { virtual: true });
         jest.doMock('../../config/perplexity', () => { throw new Error('Module not found'); }); // Force fail

         const configIndex = require('../../config/index');
         expect(configIndex.perplexity).toEqual({});
         expect(require('../../utils/logger').warn).toHaveBeenCalledWith(expect.stringContaining('Failed to load Perplexity'), expect.any(Error));
        });
     });

     // Test Error Throwing when NODE_ENV is NOT test
     it('NODE_ENV=dev: should throw error if env module require fails', () => {
      process.env.NODE_ENV = 'development';
      jest.isolateModules(() => {
        jest.doMock('../../config/env', () => { throw new Error('Cannot find ./env'); }); // Force fail
        // Mock others simply 
        jest.mock('../../config/config', () => ({}), { virtual: true }); 
        jest.mock('../../utils/logger', () => ({ error: jest.fn() }), { virtual: true });
        jest.mock('../../config/supabase', () => ({}), { virtual: true });
        jest.mock('../../config/openai', () => ({}), { virtual: true });
        jest.mock('../../config/perplexity', () => ({}), { virtual: true });

        expect(() => require('../../config/index')).toThrow('Failed to load environment configuration: Cannot find ./env');
      });
    });

     it('NODE_ENV=dev: should NOT throw but use fallback if config module require fails', () => {
       process.env.NODE_ENV = 'development';
       jest.isolateModules(() => {
         jest.mock('../../config/env', () => ({ env: 'development' }), { virtual: true });
         jest.doMock('../../config/config', () => { throw new Error('Cannot find module ./config'); }); // Force fail
         jest.mock('../../utils/logger', () => ({ warn: jest.fn() }), { virtual: true });
         jest.mock('../../config/supabase', () => ({}), { virtual: true });
         jest.mock('../../config/openai', () => ({}), { virtual: true });
         jest.mock('../../config/perplexity', () => ({}), { virtual: true });

         let configIndex;
         expect(() => { 
             configIndex = require('../../config/index');
         }).not.toThrow(); // Should not throw
         expect(configIndex.config).toEqual({ server: {} }); // Should use fallback
         expect(require('../../utils/logger').warn).toHaveBeenCalled();
        });
     });

     it('NODE_ENV=dev: should NOT throw but use console logger if logger require fails', () => {
        process.env.NODE_ENV = 'development';
        jest.isolateModules(() => {
            jest.mock('../../config/env', () => ({ env: 'development' }), { virtual: true }); 
            jest.mock('../../config/config', () => ({}), { virtual: true }); 
            jest.doMock('../../utils/logger', () => { throw new Error('Cannot find module ../utils/logger'); }); // Force fail
            jest.mock('../../config/supabase', () => ({}), { virtual: true }); 
            jest.mock('../../config/openai', () => ({}), { virtual: true });
            jest.mock('../../config/perplexity', () => ({}), { virtual: true });

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            let configIndex;
            expect(() => { 
                configIndex = require('../../config/index');
            }).not.toThrow(); // Should not throw
            expect(configIndex.logger).toBeDefined(); // Should have console logger fallback
            expect(typeof configIndex.logger.error).toBe('function');
            expect(consoleErrorSpy).toHaveBeenCalled();
            consoleErrorSpy.mockRestore();
        });
     });

     it('NODE_ENV=dev: should throw error if supabase module require fails', () => {
       process.env.NODE_ENV = 'development';
       jest.isolateModules(() => {
         jest.mock('../../config/env', () => ({ env: 'development' }), { virtual: true });
         jest.mock('../../config/config', () => ({}), { virtual: true });
         jest.mock('../../utils/logger', () => ({ error: jest.fn() }), { virtual: true });
         jest.doMock('../../config/supabase', () => { throw new Error('Cannot find module ./supabase'); }); // Force fail
         jest.mock('../../config/openai', () => ({}), { virtual: true });
         jest.mock('../../config/perplexity', () => ({}), { virtual: true });

         expect(() => require('../../config/index')).toThrow('Failed to load Supabase configuration: Cannot find module ./supabase');
        });
     });

     it('NODE_ENV=dev: should NOT throw but use fallback if openai module require fails', () => {
       process.env.NODE_ENV = 'development';
       jest.isolateModules(() => {
         jest.mock('../../config/env', () => ({ env: 'development' }), { virtual: true });
         jest.mock('../../config/config', () => ({}), { virtual: true });
         jest.mock('../../utils/logger', () => ({ warn: jest.fn() }), { virtual: true });
         jest.mock('../../config/supabase', () => ({}), { virtual: true });
         jest.doMock('../../config/openai', () => { throw new Error('Cannot find module ./openai'); }); // Force fail
         jest.mock('../../config/perplexity', () => ({}), { virtual: true });

         let configIndex;
         expect(() => {
             configIndex = require('../../config/index');
         }).not.toThrow();
         expect(configIndex.openai).toEqual({});
         expect(require('../../utils/logger').warn).toHaveBeenCalled();
        });
     });

     it('NODE_ENV=dev: should NOT throw but use fallback if perplexity module require fails', () => {
       process.env.NODE_ENV = 'development';
       jest.isolateModules(() => {
         jest.mock('../../config/env', () => ({ env: 'development' }), { virtual: true });
         jest.mock('../../config/config', () => ({}), { virtual: true });
         jest.mock('../../utils/logger', () => ({ warn: jest.fn() }), { virtual: true });
         jest.mock('../../config/supabase', () => ({}), { virtual: true });
         jest.mock('../../config/openai', () => ({}), { virtual: true });
         jest.doMock('../../config/perplexity', () => { throw new Error('Cannot find module ./perplexity'); }); // Force fail

         let configIndex;
         expect(() => {
             configIndex = require('../../config/index');
         }).not.toThrow();
         expect(configIndex.perplexity).toEqual({});
         expect(require('../../utils/logger').warn).toHaveBeenCalled();
        });
     });
  });

   describe('Server Configuration', () => {
     it('should export serverConfig with default values if config.server is not defined', () => {
       process.env.NODE_ENV = 'development';
       jest.isolateModules(() => {
         // Mock dependencies
         jest.mock('../../config/env', () => ({ env: 'development' }), { virtual: true });
         jest.mock('../../config/config', () => ({}), { virtual: true }); // config HAS NO server property
         jest.mock('../../utils/logger', () => ({}), { virtual: true });
         jest.mock('../../config/supabase', () => ({}), { virtual: true });
         jest.mock('../../config/openai', () => ({}), { virtual: true });
         jest.mock('../../config/perplexity', () => ({}), { virtual: true });

         const configIndex = require('../../config/index');

         expect(configIndex.serverConfig).toBeDefined();
         // It should equal the default serverConfig from index.js
         expect(configIndex.serverConfig).toEqual({ 
             maxRequestBodySize: '50mb',
             requestTimeout: 30000,
             compressionLevel: 6,
             trustProxy: true
         });
       });
     });

     it('should export exactly config.server if defined, ignoring defaults', () => {
       process.env.NODE_ENV = 'development';
       jest.isolateModules(() => {
         // Mock config WITH a server property
         const mockServerConfig = {
           maxRequestBodySize: '100mb',
           requestTimeout: 60000,
           customValue: 'test'
         };
         jest.mock('../../config/config', () => ({ server: mockServerConfig }), { virtual: true });
         // Mock other dependencies
         jest.mock('../../config/env', () => ({ env: 'development' }), { virtual: true });
         jest.mock('../../utils/logger', () => ({}), { virtual: true });
         jest.mock('../../config/supabase', () => ({}), { virtual: true });
         jest.mock('../../config/openai', () => ({}), { virtual: true });
         jest.mock('../../config/perplexity', () => ({}), { virtual: true });

         const configIndex = require('../../config/index');

         expect(configIndex.serverConfig).toBeDefined();
         // It should be EXACTLY the object from config.server, not merged
         expect(configIndex.serverConfig).toEqual(mockServerConfig);
         expect(configIndex.serverConfig.maxRequestBodySize).toBe('100mb');
         expect(configIndex.serverConfig.requestTimeout).toBe(60000);
         expect(configIndex.serverConfig.customValue).toBe('test');
         // Default values should NOT be present
         expect(configIndex.serverConfig.compressionLevel).toBeUndefined();
         expect(configIndex.serverConfig.trustProxy).toBeUndefined();
       });
     });
   });

}); 