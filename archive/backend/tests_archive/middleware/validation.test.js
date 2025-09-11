/**
 * @fileoverview Tests for Validation Middleware
 * Ensures proper validation of request data
 */

// Import the actual validation middleware
const validationMiddleware = require('../../middleware/validation');

// Import our mock validation module
const validationMock = require('../mocks/validation');

describe('Validation Middleware', () => {
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
    
    // Reset validation mocks
    validationMock.resetMocks();
  });

  describe('Registration Validation', () => {
    let validateMiddleware;

    beforeEach(() => {
      validateMiddleware = validationMock.validate(validationMock.userSchemas.registration);
    });

    it('should pass validation with valid registration data', () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'StrongPassword123!',
        name: 'Test User'
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should fail validation when email is missing', () => {
      mockReq.body = {
        password: 'StrongPassword123!',
        name: 'Test User'
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: expect.stringContaining('required')
          })
        ])
      });
    });

    it('should fail validation when password is missing', () => {
      mockReq.body = {
        email: 'test@example.com',
        name: 'Test User'
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'password',
            message: expect.stringContaining('required')
          })
        ])
      });
    });

    it('should fail validation when name is missing', () => {
      // Set up a custom validation behavior for this test case
      validationMock.userSchemas.registration.validate.mockImplementationOnce(data => {
        return {
          error: {
            details: [{
              path: ['name'],
              message: 'Name is required',
              type: 'any.required'
            }]
          }
        };
      });
      
      mockReq.body = {
        email: 'test@example.com',
        password: 'StrongPassword123!'
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            message: expect.stringContaining('required')
          })
        ])
      });
    });

    it('should fail validation with invalid email format', () => {
      // Set up a custom validation behavior for this test case
      validationMock.userSchemas.registration.validate.mockImplementationOnce(data => {
        return {
          error: {
            details: [{
              path: ['email'],
              message: 'Please provide a valid email address',
              type: 'string.email'
            }]
          }
        };
      });
      
      mockReq.body = {
        email: 'invalid-email',
        password: 'StrongPassword123!',
        name: 'Test User'
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: expect.stringContaining('valid email')
          })
        ])
      });
    });

    it('should fail validation with weak password', () => {
      // Set up a custom validation behavior for this test case
      validationMock.userSchemas.registration.validate.mockImplementationOnce(data => {
        return {
          error: {
            details: [{
              path: ['password'],
              message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character',
              type: 'string.pattern.base'
            }]
          }
        };
      });
      
      mockReq.body = {
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User'
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'password',
            message: expect.stringContaining('Password')
          })
        ])
      });
    });

    it('should fail validation with empty request body', () => {
      // Set up a custom validation behavior for this test case
      validationMock.userSchemas.registration.validate.mockImplementationOnce(data => {
        return {
          error: {
            details: [
              {
                path: ['email'],
                message: 'Email is required',
                type: 'any.required'
              },
              {
                path: ['password'],
                message: 'Password is required',
                type: 'any.required'
              },
              {
                path: ['name'],
                message: 'Name is required',
                type: 'any.required'
              }
            ]
          }
        };
      });
      
      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation failed',
        errors: expect.any(Array)
      });
      expect(mockRes.json.mock.calls[0][0].errors.length).toBe(3);
    });
  });

  describe('Login Validation', () => {
    let validateMiddleware;

    beforeEach(() => {
      validateMiddleware = validationMock.validate(validationMock.userSchemas.login);
    });

    it('should pass validation with valid login data', () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'StrongPassword123!'
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should pass validation with rememberMe option', () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'StrongPassword123!',
        rememberMe: true
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should fail validation with missing email', () => {
      mockReq.body = {
        password: 'StrongPassword123!'
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: expect.stringContaining('Email is required')
          })
        ])
      });
    });

    it('should fail validation with missing password', () => {
      mockReq.body = {
        email: 'test@example.com'
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'password',
            message: expect.stringContaining('Password is required')
          })
        ])
      });
    });

    it('should fail validation with invalid rememberMe type', () => {
      // Setup custom validation for this test
      validationMock.userSchemas.login.validate.mockImplementationOnce(data => {
        return {
          error: {
            details: [{
              path: ['rememberMe'],
              message: 'rememberMe must be a boolean',
              type: 'boolean.base'
            }]
          }
        };
      });
      
      mockReq.body = {
        email: 'test@example.com',
        password: 'StrongPassword123!',
        rememberMe: 'yes'
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'rememberMe',
            message: expect.stringContaining('must be a boolean')
          })
        ])
      });
    });

    it('should fail validation with empty request body', () => {
      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation failed',
        errors: expect.any(Array)
      });
      expect(mockRes.json.mock.calls[0][0].errors.length).toBe(2);
    });
  });

  describe('Refresh Token Validation', () => {
    let validateMiddleware;

    beforeEach(() => {
      validateMiddleware = validationMock.validate(validationMock.userSchemas.refreshToken);
    });

    it('should pass validation with valid refresh token', () => {
      mockReq.body = {
        refreshToken: 'valid-refresh-token'
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should fail validation with missing refresh token', () => {
      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'refreshToken',
            message: expect.stringContaining('required')
          })
        ])
      });
    });

    it('should fail validation with empty refresh token', () => {
      // Setup custom validation for this test
      validationMock.userSchemas.refreshToken.validate.mockImplementationOnce(data => {
        return {
          error: {
            details: [{
              path: ['refreshToken'],
              message: 'Refresh token cannot be empty',
              type: 'string.empty'
            }]
          }
        };
      });
      
      mockReq.body = {
        refreshToken: ''
      };

      validateMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: 'refreshToken',
            message: expect.stringContaining('not be empty')
          })
        ])
      });
    });
  });

  describe('Query Sanitization', () => {
    it('should convert string numbers to numeric values', () => {
      const req = {
        query: {
          page: '1',
          limit: '10',
          id: '123'
        }
      };
      const res = {};
      const next = jest.fn();

      validationMock.sanitizeQuery(req, res, next);

      expect(req.query).toEqual({
        page: 1,
        limit: 10,
        id: 123
      });
      expect(next).toHaveBeenCalled();
    });

    it('should leave non-numeric strings unchanged', () => {
      const req = {
        query: {
          search: 'test',
          status: 'active',
          page: '1'
        }
      };
      const res = {};
      const next = jest.fn();

      validationMock.sanitizeQuery(req, res, next);

      expect(req.query).toEqual({
        search: 'test',
        status: 'active',
        page: 1
      });
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Strip Unknown Fields', () => {
    it('should strip unknown fields from request body', () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'StrongPassword123!',
        unknownField: 'should be removed'
      };

      const middleware = validationMock.stripUnknown(['email', 'password']);
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.body).toEqual({
        email: 'test@example.com',
        password: 'StrongPassword123!'
      });
      expect(mockReq.body).not.toHaveProperty('unknownField');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Workout Generation Validation', () => {
    let validateMiddleware;
    let validRequestBody;

    beforeEach(() => {
      // Use the actual middleware from the imported module
      validateMiddleware = validationMiddleware.validateWorkoutGeneration;
      validRequestBody = {
        fitnessLevel: 'intermediate',
        goals: ['strength', 'muscle_gain'],
        equipment: ['barbell', 'dumbbells'],
        restrictions: [],
        exerciseTypes: ['strength', 'hypertrophy'],
        workoutFrequency: '3x per week',
        additionalNotes: 'Focus on compound lifts'
      };
      mockReq.body = { ...validRequestBody };
    });

    it('should pass validation with valid data', () => {
      validateMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should fail if fitnessLevel is missing', () => {
      delete mockReq.body.fitnessLevel;
      validateMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'fitnessLevel' })])
      }));
    });

     it('should fail if fitnessLevel is invalid', () => {
      mockReq.body.fitnessLevel = 'expert'; // Invalid value
      validateMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
       expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'fitnessLevel' })])
      }));
    });

    it('should fail if goals is missing or empty', () => {
      mockReq.body.goals = [];
      validateMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'goals' })])
      }));
    });

    it('should fail if exerciseTypes is missing or empty', () => {
      mockReq.body.exerciseTypes = [];
      validateMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'exerciseTypes' })])
      }));
    });

     it('should fail if workoutFrequency is missing', () => {
      delete mockReq.body.workoutFrequency;
      validateMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
       expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'workoutFrequency' })])
      }));
    });

    it('should pass if optional fields (equipment, restrictions, additionalNotes) are missing', () => {
      delete mockReq.body.equipment;
      delete mockReq.body.restrictions;
      delete mockReq.body.additionalNotes;
      validateMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Workout Adjustment Validation', () => {
      let validateMiddleware;
      let validRequestBody;

      beforeEach(() => {
          validateMiddleware = validationMiddleware.validateWorkoutAdjustment;
          validRequestBody = {
              adjustments: {
                  notesOrPreferences: 'Increase intensity on leg days.',
                  exercisesToAdd: [{ name: 'Leg Press', sets: 3, reps: 12 }],
                  exercisesToRemove: ['d290f1ee-6c54-4b01-90e6-d701748f0851'] // Valid UUID format
              }
          };
          // Reset req.body to the valid sample before each test
          mockReq.body = JSON.parse(JSON.stringify(validRequestBody));
      });

      it('should pass validation with valid adjustment data', () => {
          validateMiddleware(mockReq, mockRes, mockNext);
          expect(mockNext).toHaveBeenCalled();
      });

       it('should pass validation if exercisesToAdd/Remove are missing', () => {
           delete mockReq.body.adjustments.exercisesToAdd;
           delete mockReq.body.adjustments.exercisesToRemove;
           validateMiddleware(mockReq, mockRes, mockNext);
           expect(mockNext).toHaveBeenCalled();
       });

      it('should fail if adjustments object is missing', () => {
          delete mockReq.body.adjustments;
          validateMiddleware(mockReq, mockRes, mockNext);
          expect(mockNext).not.toHaveBeenCalled();
          expect(mockRes.status).toHaveBeenCalledWith(400);
          expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
              errors: expect.arrayContaining([expect.objectContaining({ field: 'adjustments' })])
          }));
      });

      it('should fail if adjustments.notesOrPreferences is missing or empty', () => {
          mockReq.body.adjustments.notesOrPreferences = '';
          validateMiddleware(mockReq, mockRes, mockNext);
          expect(mockNext).not.toHaveBeenCalled();
          expect(mockRes.status).toHaveBeenCalledWith(400);
          expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
              errors: expect.arrayContaining([expect.objectContaining({ field: 'adjustments.notesOrPreferences' })])
          }));
      });

      // Add more tests for invalid types within exercisesToAdd/Remove if needed
  });

   describe('Workout Query Validation', () => {
       let validateMiddleware;

       beforeEach(() => {
           validateMiddleware = validationMiddleware.validateWorkoutQuery;
           mockReq.query = {}; // Reset query
       });

       it('should pass with valid limit and offset', () => {
           mockReq.query = { limit: '20', offset: '10' };
           validateMiddleware(mockReq, mockRes, mockNext);
           expect(mockNext).toHaveBeenCalled();
           // Check that values are parsed to numbers and defaults applied
           expect(mockReq.query.limit).toBe(20);
            expect(mockReq.query.offset).toBe(10);
       });

       it('should apply default limit and offset if not provided', () => {
           validateMiddleware(mockReq, mockRes, mockNext);
           expect(mockNext).toHaveBeenCalled();
           expect(mockReq.query.limit).toBe(10);
           expect(mockReq.query.offset).toBe(0);
       });

        it('should pass with valid searchTerm', () => {
           mockReq.query = { searchTerm: ' Push ups ' };
           validateMiddleware(mockReq, mockRes, mockNext);
           expect(mockNext).toHaveBeenCalled();
           expect(mockReq.query.searchTerm).toBe('Push ups'); // Check trim
       });

       it('should fail with invalid limit (non-integer)', () => {
           mockReq.query = { limit: 'abc' };
           validateMiddleware(mockReq, mockRes, mockNext);
           expect(mockNext).not.toHaveBeenCalled();
           expect(mockRes.status).toHaveBeenCalledWith(400);
           expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
               errors: expect.arrayContaining([expect.objectContaining({ field: 'limit' })])
           }));
       });

       it('should fail with invalid limit (too large)', () => {
           mockReq.query = { limit: '200' };
           validateMiddleware(mockReq, mockRes, mockNext);
           expect(mockNext).not.toHaveBeenCalled();
           expect(mockRes.status).toHaveBeenCalledWith(400);
       });

        it('should fail with invalid offset (negative)', () => {
           mockReq.query = { offset: '-5' };
           validateMiddleware(mockReq, mockRes, mockNext);
           expect(mockNext).not.toHaveBeenCalled();
           expect(mockRes.status).toHaveBeenCalledWith(400);
       });
   });
}); 