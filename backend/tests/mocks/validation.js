/**
 * Mock implementation of validation middleware functions used in routes.
 * This mock simulates the behavior of validation middleware without performing actual validation.
 */

// Generic validate function for request bodies
const validate = jest.fn(() => (req, res, next) => {
  // Simply pass through without validation in tests
  next();
});

// Mock specific validation schemas
const validateProfile = {};
const validatePartialProfile = {};
const validateProfilePreferences = {};
const validateWorkoutPlan = {};
const validateWorkoutLog = jest.fn((req, res, next) => next());
const validateWorkoutLogUpdate = jest.fn((req, res, next) => next());
const validateWorkoutLogQuery = jest.fn((req, res, next) => next());
const validateProgressData = {};
const validateMacros = {};
const validateNotificationPreferences = {};
const validateExportRequest = {};
const validateImportRequest = {};
const validateWorkoutGeneration = jest.fn((req, res, next) => next());
const validateWorkoutAdjustment = jest.fn((req, res, next) => next());
const validateWorkoutQuery = jest.fn((req, res, next) => next());
const validateWorkoutPlanId = jest.fn((req, res, next) => next());

module.exports = {
  validate,
  validateProfile,
  validatePartialProfile,
  validateProfilePreferences,
  validateWorkoutPlan,
  validateWorkoutLog,
  validateWorkoutLogUpdate,
  validateWorkoutLogQuery,
  validateProgressData,
  validateMacros,
  validateNotificationPreferences,
  validateExportRequest,
  validateImportRequest,
  validateWorkoutGeneration,
  validateWorkoutAdjustment,
  validateWorkoutQuery,
  validateWorkoutPlanId
}; 