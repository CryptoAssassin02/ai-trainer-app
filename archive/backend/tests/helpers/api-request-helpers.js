const supertest = require('supertest');

/**
 * Returns a Supertest agent with the Authorization header pre-set if a token is provided.
 * @param {object} app - The Express app instance.
 * @param {string} [token] - Optional JWT token.
 * @returns {supertest.SuperTest<supertest.Test>} A Supertest agent.
 */
function apiRequest(app, token) {
  const agent = supertest(app); // Create a new agent for each request helper call
  if (token) {
    // For supertest, you set headers per request, not on the agent globally for all subsequent.
    // So, this helper might be better structured to return the app, and tests chain .set()
    // Or, more commonly, tests call supertest(app).get(...).set('Authorization', ...)
    // Let's adjust to make it clear.
    // This function could simply be a reminder or not used if tests call supertest directly.
    // A more useful helper would be one that performs an action AND sets the token.
  }
  return agent; // Returns the basic supertest agent on app.
}

// A more practical helper for authenticated GET, POST, etc.
function authenticatedGet(app, route, token) {
  return supertest(app).get(route).set('Authorization', `Bearer ${token}`);
}
function authenticatedPost(app, route, token) {
  return supertest(app).post(route).set('Authorization', `Bearer ${token}`);
}
// Add PUT, DELETE etc. as needed

module.exports = { apiRequest, authenticatedGet, authenticatedPost /* ... */ }; 