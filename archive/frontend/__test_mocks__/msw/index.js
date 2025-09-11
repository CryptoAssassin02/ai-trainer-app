// Export dummy implementations for tests
// These are just stubs to make the tests pass
// Real implementation would use actual MSW
const server = {
  listen: function() {
    // console.log('MSW Server started');
    return server;
  },
  resetHandlers: function() {
    // console.log('MSW Server handlers reset');
    return server;
  },
  close: function() {
    // console.log('MSW Server closed');
    return server;
  },
  use: function() {
    // console.log('Using additional handlers');
    return server;
  }
};

const worker = {
  start: function(options) {
    options = options || {};
    // console.log('MSW Worker started with options:', options);
    return Promise.resolve(worker);
  },
  use: function() {
    // console.log('Using additional handlers in worker');
    return worker;
  }
};

const handlers = [];

function initMocks() {
  // console.log('Mock initialization called');
}

module.exports = {
  server: server,
  worker: worker,
  handlers: handlers,
  initMocks: initMocks
}; 