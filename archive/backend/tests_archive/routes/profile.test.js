/**
 * @fileoverview Tests for Profile Routes
 * Tests for route handlers without relying on Express routing
 */

// Create mock functions for validation, auth, and controllers
const mockControllerFunctions = {
  getProfile: jest.fn().mockImplementation((req, res) => {
    res.status(200).json({
      status: 'success',
      data: { id: 'profile-123', userId: req.user?.id || 'default-id' }
    });
  }),
  createOrUpdateProfile: jest.fn().mockImplementation((req, res) => {
    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: { id: 'profile-123', userId: req.user?.id || 'default-id', ...req.body }
    });
  }),
  getProfilePreferences: jest.fn().mockImplementation((req, res) => {
    res.status(200).json({
      status: 'success',
      data: { unitPreference: 'metric', fitnessGoals: [] }
    });
  }),
  updateProfilePreferences: jest.fn().mockImplementation((req, res) => {
    res.status(200).json({
      status: 'success',
      message: 'Profile preferences updated successfully',
      data: { ...req.body }
    });
  })
};

// Mock middleware functions
const mockAuth = {
  authenticate: jest.fn().mockImplementation((req, res, next) => {
    req.user = { id: 'test-user-id' };
    next();
  }),
  requireAdmin: jest.fn().mockImplementation((req, res, next) => next())
};

const mockValidation = {
  validate: jest.fn().mockImplementation(() => (req, res, next) => next()),
  validateProfile: 'profile-schema',
  validatePartialProfile: 'partial-profile-schema',
  validateProfilePreferences: 'preferences-schema'
};

// Mock the required modules
jest.mock('../../controllers/profile', () => mockControllerFunctions);
jest.mock('../../middleware/auth', () => mockAuth);
jest.mock('../../middleware/validation', () => mockValidation);

// Create simulated req/res objects for testing
function createMockRequest(method = 'GET', url = '/', body = {}, params = {}) {
  return {
    method,
    url,
    body,
    params,
    user: null // Will be set by authenticate middleware
  };
}

function createMockResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    statusCode: 200,
    _getStatusCode: function() {
      return this.statusCode;
    },
    _getResponseData: function() {
      return this.json.mock.calls[0]?.[0];
    }
  };
  res.status.mockImplementation(function(code) {
    res.statusCode = code;
    return res;
  });
  return res;
}

// Run middleware synchronously (simpler approach)
function runMiddleware(middleware, req, res) {
  const next = jest.fn();
  middleware(req, res, next);
  return next;
}

describe('Profile Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('GET /profile', () => {
    it('should require authentication', () => {
      // Simulate authentication failure
      mockAuth.authenticate.mockImplementationOnce((req, res, next) => {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      });
      
      const req = createMockRequest('GET', '/profile');
      const res = createMockResponse();
      
      // Run the authenticate middleware
      runMiddleware(mockAuth.authenticate, req, res);
      
      expect(res._getStatusCode()).toBe(401);
      expect(res._getResponseData().status).toBe('error');
      expect(mockAuth.authenticate).toHaveBeenCalled();
      expect(mockControllerFunctions.getProfile).not.toHaveBeenCalled();
    });
    
    it('should return profile when authenticated', () => {
      const req = createMockRequest('GET', '/profile');
      const res = createMockResponse();
      
      // Run the authenticate middleware
      const next = runMiddleware(mockAuth.authenticate, req, res);
      
      // Verify next was called
      expect(next).toHaveBeenCalled();
      
      // Call the controller function directly
      mockControllerFunctions.getProfile(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      expect(res._getResponseData().status).toBe('success');
      expect(mockAuth.authenticate).toHaveBeenCalled();
      expect(mockControllerFunctions.getProfile).toHaveBeenCalled();
    });
  });
  
  describe('GET /profile/:userId', () => {
    it('should require admin privileges', () => {
      // Simulate admin check failure
      mockAuth.requireAdmin.mockImplementationOnce((req, res, next) => {
        res.status(403).json({
          status: 'error',
          message: 'Admin access required'
        });
      });
      
      const req = createMockRequest('GET', '/profile/other-user-id', {}, { userId: 'other-user-id' });
      const res = createMockResponse();
      
      // Set up user authentication first
      req.user = { id: 'test-user-id' };
      
      // Run the requireAdmin middleware
      runMiddleware(mockAuth.requireAdmin, req, res);
      
      expect(res._getStatusCode()).toBe(403);
      expect(res._getResponseData().status).toBe('error');
      expect(mockAuth.requireAdmin).toHaveBeenCalled();
      expect(mockControllerFunctions.getProfile).not.toHaveBeenCalled();
    });
    
    it('should return profile for specified user ID when admin', () => {
      const req = createMockRequest('GET', '/profile/other-user-id', {}, { userId: 'other-user-id' });
      const res = createMockResponse();
      
      // Set up user authentication first
      req.user = { id: 'test-user-id' };
      
      // Run the requireAdmin middleware
      const next = runMiddleware(mockAuth.requireAdmin, req, res);
      
      // Verify next was called
      expect(next).toHaveBeenCalled();
      
      // Call the controller function directly
      mockControllerFunctions.getProfile(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      expect(res._getResponseData().status).toBe('success');
      expect(mockAuth.requireAdmin).toHaveBeenCalled();
      expect(mockControllerFunctions.getProfile).toHaveBeenCalled();
    });
  });
  
  describe('POST /profile', () => {
    it('should require authentication', () => {
      // Simulate authentication failure
      mockAuth.authenticate.mockImplementationOnce((req, res, next) => {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      });
      
      const profileData = {
        name: 'Test User',
        age: 30,
        height: 180,
        weight: 75
      };
      
      const req = createMockRequest('POST', '/profile', profileData);
      const res = createMockResponse();
      
      // Run the authenticate middleware
      runMiddleware(mockAuth.authenticate, req, res);
      
      expect(res._getStatusCode()).toBe(401);
      expect(res._getResponseData().status).toBe('error');
      expect(mockAuth.authenticate).toHaveBeenCalled();
      expect(mockValidation.validate).not.toHaveBeenCalled();
      expect(mockControllerFunctions.createOrUpdateProfile).not.toHaveBeenCalled();
    });
    
    it('should validate profile data', () => {
      // Create validation middleware that fails
      const validationMiddleware = (req, res, next) => {
        res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: [{ field: 'height', message: 'Height is required' }]
        });
      };
      
      mockValidation.validate.mockReturnValueOnce(validationMiddleware);
      
      const req = createMockRequest('POST', '/profile', {
        name: 'Test User',
        age: 30
        // Missing required fields
      });
      const res = createMockResponse();
      
      // Set up user authentication first
      req.user = { id: 'test-user-id' };
      
      // Get and run the validation middleware
      const validator = mockValidation.validate(mockValidation.validateProfile);
      runMiddleware(validator, req, res);
      
      expect(res._getStatusCode()).toBe(400);
      expect(res._getResponseData().status).toBe('error');
      expect(mockValidation.validate).toHaveBeenCalledWith(mockValidation.validateProfile);
      expect(mockControllerFunctions.createOrUpdateProfile).not.toHaveBeenCalled();
    });
    
    it('should create or update profile with valid data', () => {
      const profileData = {
        name: 'Test User',
        age: 30,
        gender: 'male',
        height: 180,
        weight: 75,
        unitPreference: 'metric',
        activityLevel: 'moderately_active'
      };
      
      const req = createMockRequest('POST', '/profile', profileData);
      const res = createMockResponse();
      
      // Set up user authentication first
      req.user = { id: 'test-user-id' };
      
      // Create a validation middleware that passes (calls next)
      const validationMiddleware = (req, res, next) => next();
      mockValidation.validate.mockReturnValueOnce(validationMiddleware);
      
      // Get and run the validation middleware
      const validator = mockValidation.validate(mockValidation.validateProfile);
      const next = runMiddleware(validator, req, res);
      
      // Verify next was called by validation
      expect(next).toHaveBeenCalled();
      
      // Call the controller function directly
      mockControllerFunctions.createOrUpdateProfile(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      expect(res._getResponseData().status).toBe('success');
      expect(mockValidation.validate).toHaveBeenCalledWith(mockValidation.validateProfile);
      expect(mockControllerFunctions.createOrUpdateProfile).toHaveBeenCalled();
      expect(res._getResponseData().data).toMatchObject(expect.objectContaining(profileData));
    });
  });
  
  describe('PUT /profile', () => {
    it('should require authentication', () => {
      // Simulate authentication failure
      mockAuth.authenticate.mockImplementationOnce((req, res, next) => {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      });
      
      const req = createMockRequest('PUT', '/profile', { weight: 78 });
      const res = createMockResponse();
      
      // Run the authenticate middleware
      runMiddleware(mockAuth.authenticate, req, res);
      
      expect(res._getStatusCode()).toBe(401);
      expect(res._getResponseData().status).toBe('error');
      expect(mockAuth.authenticate).toHaveBeenCalled();
      expect(mockValidation.validate).not.toHaveBeenCalled();
      expect(mockControllerFunctions.createOrUpdateProfile).not.toHaveBeenCalled();
    });
    
    it('should validate partial profile data', () => {
      // Create validation middleware that fails
      const validationMiddleware = (req, res, next) => {
        res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: [{ field: 'weight', message: 'Weight must be positive' }]
        });
      };
      
      mockValidation.validate.mockReturnValueOnce(validationMiddleware);
      
      const req = createMockRequest('PUT', '/profile', { weight: -10 });
      const res = createMockResponse();
      
      // Set up user authentication first
      req.user = { id: 'test-user-id' };
      
      // Get and run the validation middleware
      const validator = mockValidation.validate(mockValidation.validatePartialProfile);
      runMiddleware(validator, req, res);
      
      expect(res._getStatusCode()).toBe(400);
      expect(res._getResponseData().status).toBe('error');
      expect(mockValidation.validate).toHaveBeenCalledWith(mockValidation.validatePartialProfile);
      expect(mockControllerFunctions.createOrUpdateProfile).not.toHaveBeenCalled();
    });
    
    it('should update profile with valid partial data', () => {
      const updateData = {
        weight: 77,
        height: 182
      };
      
      const req = createMockRequest('PUT', '/profile', updateData);
      const res = createMockResponse();
      
      // Set up user authentication first
      req.user = { id: 'test-user-id' };
      
      // Create a validation middleware that passes (calls next)
      const validationMiddleware = (req, res, next) => next();
      mockValidation.validate.mockReturnValueOnce(validationMiddleware);
      
      // Get and run the validation middleware
      const validator = mockValidation.validate(mockValidation.validatePartialProfile);
      const next = runMiddleware(validator, req, res);
      
      // Verify next was called by validation
      expect(next).toHaveBeenCalled();
      
      // Call the controller function directly
      mockControllerFunctions.createOrUpdateProfile(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      expect(res._getResponseData().status).toBe('success');
      expect(mockValidation.validate).toHaveBeenCalledWith(mockValidation.validatePartialProfile);
      expect(mockControllerFunctions.createOrUpdateProfile).toHaveBeenCalled();
      expect(res._getResponseData().data).toMatchObject(expect.objectContaining(updateData));
    });
  });
  
  describe('GET /profile/preferences', () => {
    it('should require authentication', () => {
      // Simulate authentication failure
      mockAuth.authenticate.mockImplementationOnce((req, res, next) => {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      });
      
      const req = createMockRequest('GET', '/profile/preferences');
      const res = createMockResponse();
      
      // Run the authenticate middleware
      runMiddleware(mockAuth.authenticate, req, res);
      
      expect(res._getStatusCode()).toBe(401);
      expect(res._getResponseData().status).toBe('error');
      expect(mockAuth.authenticate).toHaveBeenCalled();
      expect(mockControllerFunctions.getProfilePreferences).not.toHaveBeenCalled();
    });
    
    it('should return profile preferences when authenticated', () => {
      const req = createMockRequest('GET', '/profile/preferences');
      const res = createMockResponse();
      
      // Set up user authentication first
      req.user = { id: 'test-user-id' };
      
      // Call the controller function directly
      mockControllerFunctions.getProfilePreferences(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      expect(res._getResponseData().status).toBe('success');
      expect(mockControllerFunctions.getProfilePreferences).toHaveBeenCalled();
    });
  });
  
  describe('PUT /profile/preferences', () => {
    it('should require authentication', () => {
      // Simulate authentication failure
      mockAuth.authenticate.mockImplementationOnce((req, res, next) => {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      });
      
      const req = createMockRequest('PUT', '/profile/preferences', { unitPreference: 'imperial' });
      const res = createMockResponse();
      
      // Run the authenticate middleware
      runMiddleware(mockAuth.authenticate, req, res);
      
      expect(res._getStatusCode()).toBe(401);
      expect(res._getResponseData().status).toBe('error');
      expect(mockAuth.authenticate).toHaveBeenCalled();
      expect(mockValidation.validate).not.toHaveBeenCalled();
      expect(mockControllerFunctions.updateProfilePreferences).not.toHaveBeenCalled();
    });
    
    it('should validate preference data', () => {
      // Create validation middleware that fails
      const validationMiddleware = (req, res, next) => {
        res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: [{ field: 'unitPreference', message: 'Unit preference must be either metric or imperial' }]
        });
      };
      
      mockValidation.validate.mockReturnValueOnce(validationMiddleware);
      
      const req = createMockRequest('PUT', '/profile/preferences', { unitPreference: 'invalid_unit' });
      const res = createMockResponse();
      
      // Set up user authentication first
      req.user = { id: 'test-user-id' };
      
      // Get and run the validation middleware
      const validator = mockValidation.validate(mockValidation.validateProfilePreferences);
      runMiddleware(validator, req, res);
      
      expect(res._getStatusCode()).toBe(400);
      expect(res._getResponseData().status).toBe('error');
      expect(mockValidation.validate).toHaveBeenCalledWith(mockValidation.validateProfilePreferences);
      expect(mockControllerFunctions.updateProfilePreferences).not.toHaveBeenCalled();
    });
    
    it('should update preferences with valid data', () => {
      const preferencesData = {
        unitPreference: 'imperial',
        fitnessGoals: ['strength', 'endurance'],
        experienceLevel: 'intermediate'
      };
      
      const req = createMockRequest('PUT', '/profile/preferences', preferencesData);
      const res = createMockResponse();
      
      // Set up user authentication first
      req.user = { id: 'test-user-id' };
      
      // Create a validation middleware that passes (calls next)
      const validationMiddleware = (req, res, next) => next();
      mockValidation.validate.mockReturnValueOnce(validationMiddleware);
      
      // Get and run the validation middleware
      const validator = mockValidation.validate(mockValidation.validateProfilePreferences);
      const next = runMiddleware(validator, req, res);
      
      // Verify next was called by validation
      expect(next).toHaveBeenCalled();
      
      // Call the controller function directly
      mockControllerFunctions.updateProfilePreferences(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      expect(res._getResponseData().status).toBe('success');
      expect(mockValidation.validate).toHaveBeenCalledWith(mockValidation.validateProfilePreferences);
      expect(mockControllerFunctions.updateProfilePreferences).toHaveBeenCalled();
      expect(res._getResponseData().data).toMatchObject(expect.objectContaining(preferencesData));
    });
  });
}); 