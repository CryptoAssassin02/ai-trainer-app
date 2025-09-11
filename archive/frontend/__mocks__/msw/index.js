// Use dynamic import for MSW to handle Jest module resolution issues
let setupServer;
try {
  // Try the standard import first
  setupServer = require('msw/node').setupServer;
} catch (e) {
  try {
    // Try with absolute path as fallback
    const path = require('path');
    const mswNodePath = path.join(__dirname, '../../node_modules/msw/lib/node/index.js');
    setupServer = require(mswNodePath).setupServer;
  } catch (e2) {
    console.error('Failed to load msw/node:', e.message);
    console.error('Also failed with absolute path:', e2.message);
    throw new Error('Failed to load setupServer from msw');
  }
}
const { handlers } = require('./handlers.js');

// Note: handlers.ts compiles to handlers.js via ts-jest/babel in Jest context. For direct require here,
// ensure ts-jest transforms TypeScript in tests, but mocks are loaded before transform.
// To avoid issues, provide a small JS shim that re-exports compiled handlers if available,
// otherwise require the TS module via ts-node/register if present.

let resolvedHandlers = [];
try {
  // Prefer the transpiled JS if ts-jest has processed it
  // eslint-disable-next-line import/no-unresolved, global-require
  resolvedHandlers = require('./handlers').handlers;
} catch (e) {
  try {
    require('ts-node/register');
    // eslint-disable-next-line global-require
    resolvedHandlers = require('./handlers.ts').handlers;
  } catch (e2) {
    throw new Error('Failed to load MSW handlers from __mocks__/msw/handlers.{ts,js}');
  }
}

const server = setupServer(...resolvedHandlers);

module.exports = { server };
