/**
 * @fileoverview Mock Validation Middleware for Tests
 */

// Create mock schemas with validate functions
const userSchemas = {
  registration: {
    validate: jest.fn()
  },
  login: {
    validate: jest.fn()
  },
  refreshToken: {
    validate: jest.fn()
  },
  profile: {
    create: {
      validate: jest.fn()
    },
    update: {
      validate: jest.fn()
    }
  }
};

const workoutSchemas = {
  create: {
    validate: jest.fn()
  },
  update: {
    validate: jest.fn()
  }
};

const profileSchemas = {
  create: {
    validate: jest.fn()
  },
  update: {
    validate: jest.fn()
  }
};

// Mock validation middleware
const mockValidate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path[0],
        message: detail.message,
        type: detail.type
      }));
      
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors
      });
    }
    
    // If validation passes
    req.validatedData = value;
    next();
  };
};

// Mock sanitize query middleware
const mockSanitizeQuery = (req, res, next) => {
  // Convert string numbers to actual numbers
  Object.keys(req.query).forEach(key => {
    const value = req.query[key];
    if (!isNaN(value) && value !== '') {
      req.query[key] = Number(value);
    }
  });
  next();
};

// Mock strip unknown fields middleware
const mockStripUnknown = (allowedFields) => {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      const filtered = {};
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          filtered[field] = req.body[field];
        }
      });
      req.body = filtered;
    }
    next();
  };
};

// Reset all mocks and set up default validation behavior
const resetMocks = () => {
  // Clear all mock implementations
  userSchemas.registration.validate.mockReset();
  userSchemas.login.validate.mockReset();
  userSchemas.refreshToken.validate.mockReset();
  userSchemas.profile.create.validate.mockReset();
  userSchemas.profile.update.validate.mockReset();
  workoutSchemas.create.validate.mockReset();
  workoutSchemas.update.validate.mockReset();
  profileSchemas.create.validate.mockReset();
  profileSchemas.update.validate.mockReset();
  
  // Set up default validation implementations
  userSchemas.registration.validate.mockImplementation(data => {
    const errors = [];
    
    if (!data.email) {
      errors.push({
        path: ['email'],
        message: 'Email is required',
        type: 'any.required'
      });
    }
    
    if (!data.password) {
      errors.push({
        path: ['password'],
        message: 'Password is required',
        type: 'any.required'
      });
    }
    
    if (!data.name) {
      errors.push({
        path: ['name'],
        message: 'Name is required',
        type: 'any.required'
      });
    }
    
    if (errors.length > 0) {
      return { error: { details: errors } };
    }
    
    return { value: data };
  });
  
  userSchemas.login.validate.mockImplementation(data => {
    const errors = [];
    
    if (!data.email) {
      errors.push({
        path: ['email'],
        message: 'Email is required',
        type: 'any.required'
      });
    }
    
    if (!data.password) {
      errors.push({
        path: ['password'],
        message: 'Password is required',
        type: 'any.required'
      });
    }
    
    if (errors.length > 0) {
      return { error: { details: errors } };
    }
    
    return { value: data };
  });
  
  userSchemas.refreshToken.validate.mockImplementation(data => {
    const errors = [];
    
    if (!data.refreshToken) {
      errors.push({
        path: ['refreshToken'],
        message: 'Refresh token is required',
        type: 'any.required'
      });
    }
    
    if (errors.length > 0) {
      return { error: { details: errors } };
    }
    
    return { value: data };
  });
};

// Initialize mocks
resetMocks();

// Export mock functions and schemas
module.exports = {
  validate: mockValidate,
  sanitizeQuery: mockSanitizeQuery,
  stripUnknown: mockStripUnknown,
  userSchemas,
  workoutSchemas,
  profileSchemas,
  schemas: {
    user: userSchemas,
    workout: workoutSchemas,
    profile: profileSchemas
  },
  resetMocks
}; 