/**
 * Mock implementation of express-rate-limit used in routes.
 * This mock simulates the behavior of rate limiting middleware without actually limiting.
 */

// Mock constructor that returns a middleware function
const rateLimit = jest.fn((options) => {
  return (req, res, next) => next(); // Simply pass through in tests
});

// Specific limiters used in the app
const authLimiters = {
  signup: jest.fn((req, res, next) => next()),
  login: jest.fn((req, res, next) => next()),
  refreshToken: jest.fn((req, res, next) => next()),
  logout: jest.fn((req, res, next) => next()),
};

const apiLimiters = {
  standard: jest.fn((req, res, next) => next()),
  sensitive: jest.fn((req, res, next) => next()),
};

const workoutLimiters = {
  generate: jest.fn((req, res, next) => next()),
  edit: jest.fn((req, res, next) => next()),
};

const logOperationLimiter = jest.fn((req, res, next) => next());

module.exports = rateLimit;
module.exports.authLimiters = authLimiters;
module.exports.apiLimiters = apiLimiters;
module.exports.workoutLimiters = workoutLimiters;
module.exports.logOperationLimiter = logOperationLimiter; 