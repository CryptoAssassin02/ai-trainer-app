// __mocks__/node-fetch.js

// Basic mock for the node-fetch library
// Returns a Jest mock function that resolves with a basic Response object structure.
// You can override this mock in specific tests if needed.
const fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}), // Default empty JSON response
    text: () => Promise.resolve(''),   // Default empty text response
    headers: new Map(),             // Mock headers
  })
);

module.exports = fetch;
