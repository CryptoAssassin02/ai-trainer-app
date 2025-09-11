/**
 * @fileoverview Tests for Profile Validation Schemas
 * Ensures proper validation of profile data
 */

// Polyfill for setImmediate (needed for winston logger)
if (typeof setImmediate === 'undefined') {
  global.setImmediate = (callback, ...args) => setTimeout(callback, 0, ...args);
}

// Mock the config module before requiring the validation middleware
jest.mock('../../config', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  },
  supabase: {
    url: 'https://test-project.supabase.co',
    anonKey: 'test-anon-key'
  }
}));

// Import validation middleware
const { validate, profileSchemas } = require('../../middleware/validation');

describe('Profile Validation Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      body: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  describe('Create Profile Validation', () => {
    let validateMiddleware;

    beforeEach(() => {
      validateMiddleware = validate(profileSchemas.create);
    });

    it('should pass validation with valid profile data (metric units)', () => {
      mockReq.body = {
        name: 'Test User',
        age: 30,
        gender: 'male',
        height: 180, // cm
        weight: 75, // kg
        unitPreference: 'metric',
        activityLevel: 'moderately_active',
        fitnessGoals: ['weight-loss', 'strength'],
        healthConditions: [],
        equipment: ['dumbbells'],
        experienceLevel: 'intermediate'
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should pass validation with valid profile data (imperial units)', () => {
      mockReq.body = {
        name: 'Test User',
        age: 30,
        gender: 'female',
        height: { feet: 5, inches: 9 },
        weight: 150, // lbs
        unitPreference: 'imperial',
        activityLevel: 'very_active',
        fitnessGoals: ['endurance'],
        healthConditions: ['asthma'],
        equipment: [],
        experienceLevel: 'beginner'
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should fail validation when name is missing', () => {
      mockReq.body = {
        age: 30,
        gender: 'male',
        height: 180,
        weight: 75,
        unitPreference: 'metric',
        activityLevel: 'moderately_active'
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            message: expect.stringContaining('required')
          })
        ])
      }));
    });

    it('should fail validation when name is too short', () => {
      mockReq.body = {
        name: 'A', // Too short
        age: 30,
        gender: 'male',
        height: 180,
        weight: 75,
        unitPreference: 'metric',
        activityLevel: 'moderately_active'
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            message: expect.stringContaining('at least 2 characters')
          })
        ])
      }));
    });

    it('should fail validation when age is missing', () => {
      mockReq.body = {
        name: 'Test User',
        gender: 'male',
        height: 180,
        weight: 75,
        unitPreference: 'metric',
        activityLevel: 'moderately_active'
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'age',
            message: expect.stringContaining('required')
          })
        ])
      }));
    });

    it('should fail validation when age is out of range', () => {
      mockReq.body = {
        name: 'Test User',
        age: 10, // Too young
        gender: 'male',
        height: 180,
        weight: 75,
        unitPreference: 'metric',
        activityLevel: 'moderately_active'
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'age',
            message: expect.stringContaining('at least 13 years')
          })
        ])
      }));
    });

    it('should fail validation when gender is invalid', () => {
      mockReq.body = {
        name: 'Test User',
        age: 30,
        gender: 'invalid',
        height: 180,
        weight: 75,
        unitPreference: 'metric',
        activityLevel: 'moderately_active'
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'gender',
            message: expect.stringContaining('one of: male, female, other, prefer_not_to_say')
          })
        ])
      }));
    });

    it('should fail validation when height is missing', () => {
      mockReq.body = {
        name: 'Test User',
        age: 30,
        gender: 'male',
        weight: 75,
        unitPreference: 'metric',
        activityLevel: 'moderately_active'
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'height',
            message: expect.stringContaining('required')
          })
        ])
      }));
    });

    it('should fail validation when imperial height is missing inches', () => {
      mockReq.body = {
        name: 'Test User',
        age: 30,
        gender: 'male',
        height: { feet: 5 }, // Missing inches
        weight: 150,
        unitPreference: 'imperial',
        activityLevel: 'moderately_active'
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('Inches is required')
          })
        ])
      }));
    });

    it('should fail validation when weight is negative', () => {
      mockReq.body = {
        name: 'Test User',
        age: 30,
        gender: 'male',
        height: 180,
        weight: -10, // Negative weight
        unitPreference: 'metric',
        activityLevel: 'moderately_active'
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'weight',
            message: expect.stringContaining('positive')
          })
        ])
      }));
    });

    it('should fail validation when unitPreference is invalid', () => {
      mockReq.body = {
        name: 'Test User',
        age: 30,
        gender: 'male',
        height: 180,
        weight: 75,
        unitPreference: 'invalid',
        activityLevel: 'moderately_active'
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'unitPreference',
            message: expect.stringContaining('either metric or imperial')
          })
        ])
      }));
    });

    it('should fail validation when activityLevel is invalid', () => {
      mockReq.body = {
        name: 'Test User',
        age: 30,
        gender: 'male',
        height: 180,
        weight: 75,
        unitPreference: 'metric',
        activityLevel: 'invalid'
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'activityLevel',
            message: expect.stringContaining('one of: sedentary, lightly_active')
          })
        ])
      }));
    });

    it('should fail validation with multiple missing required fields', () => {
      mockReq.body = {
        name: 'Test User'
        // Missing most required fields
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            message: expect.any(String)
          })
        ])
      }));
      // Should have multiple errors
      expect(mockRes.json.mock.calls[0][0].errors.length).toBeGreaterThan(1);
    });
  });

  describe('Update Profile Validation', () => {
    let validateMiddleware;

    beforeEach(() => {
      validateMiddleware = validate(profileSchemas.update);
    });

    it('should pass validation with valid partial update (metric)', () => {
      mockReq.body = {
        weight: 72,
        age: 31
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should pass validation with valid partial update (imperial)', () => {
      mockReq.body = {
        height: { feet: 5, inches: 10 },
        unitPreference: 'imperial'
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should pass validation when updating multiple fields', () => {
      mockReq.body = {
        name: 'Updated Name',
        age: 32,
        gender: 'female',
        fitnessGoals: ['strength', 'flexibility'],
        experienceLevel: 'advanced'
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should fail validation with empty update object', () => {
      mockReq.body = {};

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('one field is required')
          })
        ])
      }));
    });

    it('should fail validation when name is too short', () => {
      mockReq.body = {
        name: 'A' // Too short
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            message: expect.stringContaining('at least 2 characters')
          })
        ])
      }));
    });

    it('should fail validation when age is out of range', () => {
      mockReq.body = {
        age: 130 // Too high
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'age',
            message: expect.stringContaining('cannot exceed 120 years')
          })
        ])
      }));
    });

    it('should fail validation when weight is invalid', () => {
      mockReq.body = {
        weight: 'not a number'
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'weight',
            message: expect.stringContaining('must be a number')
          })
        ])
      }));
    });

    it('should fail validation when imperial height has invalid inches', () => {
      mockReq.body = {
        height: { feet: 5, inches: 14 } // Inches too high
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('must be less than 12')
          })
        ])
      }));
    });
  });

  describe('Profile Preferences Validation', () => {
    let validateMiddleware;

    beforeEach(() => {
      validateMiddleware = validate(profileSchemas.preferences);
    });

    it('should pass validation with valid preferences', () => {
      mockReq.body = {
        unitPreference: 'metric',
        fitnessGoals: ['weight-loss', 'muscle-gain'],
        experienceLevel: 'intermediate',
        notificationPreferences: {
          email: true,
          push: false,
          frequency: 'weekly'
        }
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should pass validation with minimal valid preferences', () => {
      mockReq.body = {
        unitPreference: 'imperial'
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should fail validation with empty preferences object', () => {
      mockReq.body = {};

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('one preference field is required')
          })
        ])
      }));
    });

    it('should fail validation when unitPreference is invalid', () => {
      mockReq.body = {
        unitPreference: 'invalid'
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'unitPreference',
            message: expect.stringContaining('either metric or imperial')
          })
        ])
      }));
    });

    it('should fail validation when fitnessGoals is not an array', () => {
      mockReq.body = {
        fitnessGoals: 'weight-loss' // Not an array
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'fitnessGoals',
            message: expect.stringContaining('must be an array')
          })
        ])
      }));
    });

    it('should fail validation when experienceLevel is invalid', () => {
      mockReq.body = {
        experienceLevel: 'expert' // Invalid value
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'experienceLevel',
            message: expect.stringContaining('beginner, intermediate, advanced')
          })
        ])
      }));
    });

    it('should fail validation when notification frequency is invalid', () => {
      mockReq.body = {
        notificationPreferences: {
          email: true,
          push: true,
          frequency: 'hourly' // Invalid frequency
        }
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'notificationPreferences.frequency',
            message: expect.stringContaining('must be one of')
          })
        ])
      }));
    });
  });
}); 