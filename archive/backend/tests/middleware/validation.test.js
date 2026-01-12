const Joi = require('joi');
const { logger } = require('../../config');
const {
  validate,
  formatValidationError, // Assuming this is exported for testing, if not, test via 'validate'
  userSchemas,
  workoutSchemas,
  // profileSchemas, // Add as needed
} = require('../../middleware/validation');

// Mock logger
jest.mock('../../config', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Validation Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
      originalUrl: '/test-route',
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('formatValidationError', () => {
    it('should format Joi validation error correctly', () => {
      const joiError = {
        details: [
          { path: ['email'], message: '"email" is required', type: 'any.required' },
          { path: ['password'], message: '"password" fails to match the required pattern', type: 'string.pattern.base' },
        ],
      };
      const formatted = formatValidationError(joiError);
      expect(formatted).toEqual({
        status: 'error',
        message: 'Validation failed',
        errors: [
          { field: 'email', message: '"email" is required', type: 'any.required' },
          { field: 'password', message: '"password" fails to match the required pattern', type: 'string.pattern.base' },
        ],
      });
    });

    it('should handle errors with nested paths', () => {
        const joiError = {
            details: [
                { path: ['profile', 'address', 'street'], message: '"street" is not allowed', type: 'object.allowUnknown' }
            ]
        };
        const formatted = formatValidationError(joiError);
        expect(formatted.errors[0].field).toBe('profile.address.street');
    });
  });

  describe('validate middleware factory', () => {
    // Using userSchemas.login for a sample schema
    const loginSchema = userSchemas.login;
    const validateLoginBody = validate(loginSchema, 'body');
    const validateLoginQuery = validate(loginSchema, 'query');
    const validateLoginParams = validate(loginSchema, 'params');

    const testCases = [
      { source: 'body', validator: validateLoginBody, prop: 'body' },
      { source: 'query', validator: validateLoginQuery, prop: 'query' },
      { source: 'params', validator: validateLoginParams, prop: 'params' },
    ];

    testCases.forEach(({ source, validator, prop }) => {
      describe(`when validating req.${source}`, () => {
        it('should call res.status(400) and res.json with formatted error if validation fails', () => {
          mockReq[prop] = { email: 'not-an-email' }; // Invalid data
          validator(mockReq, mockRes, mockNext);

          expect(logger.warn).toHaveBeenCalledWith('Validation failed', {
            path: '/test-route',
            errors: expect.any(Array),
          });
          expect(mockRes.status).toHaveBeenCalledWith(400);
          expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
              status: 'error',
              message: 'Validation failed',
              errors: expect.arrayContaining([
                expect.objectContaining({
                  field: 'email',
                  message: 'Please provide a valid email address', // Specific message from schema
                }),
                 expect.objectContaining({
                  field: 'password',
                  message: 'Password is required',
                }),
              ]),
            })
          );
          expect(mockNext).not.toHaveBeenCalled();
        });

        it('should call res.status(400) for missing required fields', () => {
          mockReq[prop] = {}; // Missing email and password
          validator(mockReq, mockRes, mockNext);
        
          expect(logger.warn).toHaveBeenCalled();
          expect(mockRes.status).toHaveBeenCalledWith(400);
          expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
              errors: expect.arrayContaining([
                expect.objectContaining({ field: 'email', message: 'Email is required' }),
                expect.objectContaining({ field: 'password', message: 'Password is required' }),
              ]),
            })
          );
          expect(mockNext).not.toHaveBeenCalled();
        });

        it('should call next() if validation succeeds', () => {
          mockReq[prop] = { email: 'test@example.com', password: 'Password123!' }; // Valid data
          validator(mockReq, mockRes, mockNext);

          expect(mockNext).toHaveBeenCalled();
          expect(mockRes.status).not.toHaveBeenCalled();
          expect(mockRes.json).not.toHaveBeenCalled();
        });

        it('should update req[source] with validated value', () => {
          const validData = { email: 'test@example.com', password: 'Password123!', rememberMe: false }; // rememberMe default
          mockReq[prop] = { ...validData }; 
          validator(mockReq, mockRes, mockNext);

          expect(mockReq[prop]).toEqual(validData);
          expect(mockNext).toHaveBeenCalled();
        });

        it('should strip unknown properties', () => {
          const validData = { email: 'test@example.com', password: 'Password123!', rememberMe: false }; // rememberMe default
          mockReq[prop] = { ...validData, unknownProperty: 'should_be_stripped' };
          validator(mockReq, mockRes, mockNext);

          expect(mockReq[prop]).toEqual(validData); // unknownProperty should be stripped
          expect(mockReq[prop].unknownProperty).toBeUndefined();
          expect(mockNext).toHaveBeenCalled();
        });
      });
    });
  });

  describe('Individual Schemas', () => {
    describe('userSchemas.register', () => {
      const schema = userSchemas.register;
      const validateBody = validate(schema, 'body');

      it('should pass with valid registration data', () => {
        mockReq.body = { email: 'test@example.com', password: 'Password123!', name: 'Test User' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.json).not.toHaveBeenCalled();
      });

      it('should pass with valid data and without optional name', () => {
        mockReq.body = { email: 'test@example.com', password: 'Password123!' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
      });

      // Email validations
      it('should fail if email is missing', () => {
        mockReq.body = { password: 'Password123!' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'email', message: 'Email is required' })]),
        }));
      });

      it('should fail if email is not a valid email format', () => {
        mockReq.body = { email: 'not-an-email', password: 'Password123!' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'email', message: 'Please provide a valid email address' })]),
        }));
      });

      // Password validations
      it('should fail if password is missing', () => {
        mockReq.body = { email: 'test@example.com' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'password', message: 'Password is required' })]),
        }));
      });

      it('should fail if password is less than 8 characters', () => {
        mockReq.body = { email: 'test@example.com', password: 'Pass1!' }; // 6 chars
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'password', message: 'Password must be at least 8 characters long' })]),
        }));
      });

      it('should fail if password does not meet pattern requirements (no uppercase)', () => {
        mockReq.body = { email: 'test@example.com', password: 'password123!' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'password', message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' })]),
        }));
      });

      it('should fail if password does not meet pattern requirements (no lowercase)', () => {
        mockReq.body = { email: 'test@example.com', password: 'PASSWORD123!' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'password', message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' })]),
        }));
      });
      
      it('should fail if password does not meet pattern requirements (no number)', () => {
        mockReq.body = { email: 'test@example.com', password: 'Password!' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'password', message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' })]),
        }));
      });

      it('should fail if password does not meet pattern requirements (no special character)', () => {
        mockReq.body = { email: 'test@example.com', password: 'Password123' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'password', message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' })]),
        }));
      });

      // Name validations (optional field)
      it('should fail if name is provided and less than 2 characters', () => {
        mockReq.body = { email: 'test@example.com', password: 'Password123!', name: 'A' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'name', message: 'Name must be at least 2 characters long' })]),
        }));
      });

      it('should fail if name is provided and more than 100 characters', () => {
        mockReq.body = { email: 'test@example.com', password: 'Password123!', name: 'A'.repeat(101) };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'name', message: 'Name cannot exceed 100 characters' })]),
        }));
      });
    });

    describe('userSchemas.login', () => {
      const schema = userSchemas.login;
      const validateBody = validate(schema, 'body');

      it('should pass with valid login data', () => {
        mockReq.body = { email: 'test@example.com', password: 'Password123!' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.body.rememberMe).toBe(false); // Check default value
      });

      it('should pass with rememberMe set to true', () => {
        mockReq.body = { email: 'test@example.com', password: 'Password123!', rememberMe: true };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.body.rememberMe).toBe(true);
      });

      it('should pass with rememberMe set to false explicitly', () => {
        mockReq.body = { email: 'test@example.com', password: 'Password123!', rememberMe: false };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.body.rememberMe).toBe(false);
      });

      it('should fail if email is missing', () => {
        mockReq.body = { password: 'Password123!' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'email', message: 'Email is required' })]),
        }));
      });

      it('should fail if email is not a valid email format', () => {
        mockReq.body = { email: 'not-an-email', password: 'Password123!' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'email', message: 'Please provide a valid email address' })]),
        }));
      });

      it('should fail if password is missing', () => {
        mockReq.body = { email: 'test@example.com' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'password', message: 'Password is required' })]),
        }));
      });

      it('should fail if rememberMe is not a boolean', () => {
        mockReq.body = { email: 'test@example.com', password: 'Password123!', rememberMe: 'not-a-boolean' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'rememberMe', message: '"rememberMe" must be a boolean' })]),
        }));
      });
    });

    describe('userSchemas.refresh', () => {
      const schema = userSchemas.refresh;
      const validateBody = validate(schema, 'body');

      it('should pass with a valid refresh token', () => {
        mockReq.body = { refreshToken: 'aValidRefreshTokenString' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should fail if refreshToken is missing', () => {
        mockReq.body = {};
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'refreshToken', message: 'Refresh token is required' })]),
        }));
      });

      it('should fail if refreshToken is an empty string', () => {
        mockReq.body = { refreshToken: '' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'refreshToken', message: 'Refresh token cannot be empty' })]),
        }));
      });

      it('should fail if refreshToken is not a string', () => {
        mockReq.body = { refreshToken: 12345 };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'refreshToken', message: '"refreshToken" must be a string' })]),
        }));
      });
    });

    describe('userSchemas.updateProfile', () => {
      const schema = userSchemas.updateProfile;
      const validateBody = validate(schema, 'body');

      it('should pass with an empty object (no updates)', () => {
        mockReq.body = {};
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass when updating only name', () => {
        mockReq.body = { name: 'New Name' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass when updating only email with valid data', () => {
        mockReq.body = { email: 'newemail@example.com' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass when updating password with valid current and new passwords', () => {
        mockReq.body = { currentPassword: 'OldPassword123!', newPassword: 'NewPassword456$' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass with a combination of valid updates', () => {
        mockReq.body = { name: 'Another Name', email: 'another@example.com' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
      });

      // Name validation
      it('should fail if name is too short', () => {
        mockReq.body = { name: 'N' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'name', message: 'Name must be at least 2 characters long' })]),
        }));
      });

      it('should fail if name is too long', () => {
        mockReq.body = { name: 'N'.repeat(101) };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'name', message: 'Name cannot exceed 100 characters' })]),
        }));
      });

      // Email validation
      it('should fail if email is invalid', () => {
        mockReq.body = { email: 'invalid-email' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'email', message: 'Please provide a valid email address' })]),
        }));
      });

      // Password validations
      it('should fail if newPassword is provided without currentPassword', () => {
        mockReq.body = { newPassword: 'NewPassword456$' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        // Joi's default message for .with() is usually like ""newPassword" missing required peer "currentPassword""
        // or ""currentPassword" is required" depending on how it resolves the peer dependency
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining('currentPassword') })]),
        }));
      });

      it('should pass if only currentPassword is provided', () => {
        mockReq.body = { currentPassword: 'OldPassword123!' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should fail if newPassword is too short', () => {
        mockReq.body = { currentPassword: 'OldPassword123!', newPassword: 'New1$' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'newPassword', message: 'New password must be at least 8 characters long' })]),
        }));
      });

      it('should fail if newPassword does not meet pattern requirements', () => {
        mockReq.body = { currentPassword: 'OldPassword123!', newPassword: 'newpasswordweak' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'newPassword', message: 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' })]),
        }));
      });
    });

    describe('workoutSchemas.workoutGenerationSchema', () => {
      const schema = workoutSchemas.workoutGenerationSchema;
      const validateBody = validate(schema, 'body');
      const minimalValidData = {
        fitnessLevel: 'beginner',
        goals: ['weight_loss'],
        exerciseTypes: ['cardio'],
        workoutFrequency: '3x per week',
      };

      it('should pass with minimal valid data', () => {
        mockReq.body = { ...minimalValidData };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.body.equipment).toEqual([]); // Check default
        expect(mockReq.body.restrictions).toEqual([]); // Check default
        expect(mockReq.body.additionalNotes).toBe(''); // Check default
      });

      it('should pass with all fields valid, including optionals', () => {
        mockReq.body = {
          ...minimalValidData,
          equipment: ['dumbbells'],
          restrictions: ['knee_pain'],
          additionalNotes: 'Focus on form',
        };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.body.equipment).toEqual(['dumbbells']);
        expect(mockReq.body.restrictions).toEqual(['knee_pain']);
        expect(mockReq.body.additionalNotes).toBe('Focus on form');
      });

      // fitnessLevel validations
      it('should fail if fitnessLevel is missing', () => {
        const { fitnessLevel, ...rest } = minimalValidData;
        mockReq.body = rest;
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'fitnessLevel', message: 'Fitness level is required' })]),
        }));
      });

      it('should fail if fitnessLevel is invalid', () => {
        mockReq.body = { ...minimalValidData, fitnessLevel: 'expert' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'fitnessLevel', message: 'Fitness level must be one of: beginner, intermediate, advanced' })]),
        }));
      });

      // goals validations
      it('should fail if goals is missing', () => {
        const { goals, ...rest } = minimalValidData;
        mockReq.body = rest;
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'goals', message: 'Goals are required' })]),
        }));
      });

      it('should fail if goals is an empty array', () => {
        mockReq.body = { ...minimalValidData, goals: [] };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'goals', message: 'At least one goal must be provided' })]),
        }));
      });

      it('should fail if goals is not an array', () => {
        mockReq.body = { ...minimalValidData, goals: 'not-an-array' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'goals', message: '"goals" must be an array' })]),
        }));
      });
      
      // exerciseTypes validations
      it('should fail if exerciseTypes is missing', () => {
        const { exerciseTypes, ...rest } = minimalValidData;
        mockReq.body = rest;
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'exerciseTypes', message: 'Exercise types are required' })]),
        }));
      });

      it('should fail if exerciseTypes is an empty array', () => {
        mockReq.body = { ...minimalValidData, exerciseTypes: [] };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'exerciseTypes', message: 'At least one exercise type must be provided' })]),
        }));
      });

      // workoutFrequency validations
      it('should fail if workoutFrequency is missing', () => {
        const { workoutFrequency, ...rest } = minimalValidData;
        mockReq.body = rest;
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'workoutFrequency', message: 'Workout frequency is required' })]),
        }));
      });

      // additionalNotes validations
      it('should fail if additionalNotes is too long', () => {
        mockReq.body = { ...minimalValidData, additionalNotes: 'A'.repeat(501) };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'additionalNotes', message: 'Additional notes cannot exceed 500 characters' })]),
        }));
      });

      // equipment and restrictions (optional, default to [])
      it('should fail if equipment is not an array', () => {
        mockReq.body = { ...minimalValidData, equipment: 'not-an-array' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'equipment', message: '"equipment" must be an array' })]),
        }));
      });

      it('should fail if restrictions is not an array', () => {
        mockReq.body = { ...minimalValidData, restrictions: 'not-an-array' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'restrictions', message: '"restrictions" must be an array' })]),
        }));
      });
    });

    describe('workoutSchemas.workoutReGenerationSchema', () => {
      const schema = workoutSchemas.workoutReGenerationSchema;
      const validateBody = validate(schema, 'body');

      it('should fail if the update object is empty', () => {
        mockReq.body = {};
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          // Joi's message for object.min(1)
          errors: expect.arrayContaining([expect.objectContaining({ message: 'At least one field is required for updating workout generation criteria' })]), 
        }));
      });

      it('should pass when updating only fitnessLevel with valid data', () => {
        mockReq.body = { fitnessLevel: 'intermediate' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass when updating only goals with valid data', () => {
        mockReq.body = { goals: ['muscle_gain'] };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should pass when updating multiple fields with valid data', () => {
        mockReq.body = { fitnessLevel: 'advanced', equipment: ['barbell'], workoutFrequency: '5x per week' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should fail if updating fitnessLevel with invalid data', () => {
        mockReq.body = { fitnessLevel: 'pro' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'fitnessLevel' })]),
        }));
      });

      it('should fail if updating goals with empty array', () => {
        mockReq.body = { goals: [] }; // Fails .min(1)
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'goals' })]),
        }));
      });

      it('should fail if updating additionalNotes with data that is too long', () => {
        mockReq.body = { additionalNotes: 'A'.repeat(501) }; 
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'additionalNotes' })]),
        }));
      });
    });

    describe('workoutSchemas.workoutAdjustmentSchema', () => {
      const schema = workoutSchemas.workoutAdjustmentSchema;
      const validateBody = validate(schema, 'body');
      const minimalValidData = {
        adjustments: {
          notesOrPreferences: 'Focus more on upper body',
        },
      };

      it('should pass with minimal valid data (only notes)', () => {
        mockReq.body = { ...minimalValidData };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
        // Check that optional fields which were not provided are indeed undefined
        expect(mockReq.body.adjustments.exercisesToAdd).toBeUndefined();
        expect(mockReq.body.adjustments.exercisesToRemove).toBeUndefined();
      });

      it('should pass with all valid fields provided', () => {
        mockReq.body = {
          adjustments: {
            notesOrPreferences: 'Add more cardio, remove leg press',
            exercisesToAdd: [{ name: 'Treadmill Run', duration: '20min' }],
            exercisesToRemove: ['123e4567-e89b-12d3-a456-426614174000'],
          },
        };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.body.adjustments.exercisesToAdd).toEqual([{ name: 'Treadmill Run', duration: '20min' }]);
        expect(mockReq.body.adjustments.exercisesToRemove).toEqual(['123e4567-e89b-12d3-a456-426614174000']);
      });

      it('should fail if adjustments object is missing', () => {
        mockReq.body = {};
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'adjustments', message: 'Adjustments object is required' })]),
        }));
      });

      it('should fail if adjustments.notesOrPreferences is missing', () => {
        mockReq.body = { adjustments: {} };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'adjustments.notesOrPreferences', message: 'Adjustment notes or preferences are required' })]),
        }));
      });

      it('should fail if adjustments.notesOrPreferences is an empty string', () => {
        mockReq.body = { adjustments: { notesOrPreferences: '' } };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        // Joi message might be different for empty string vs missing, check schema message
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'adjustments.notesOrPreferences', message: 'Adjustment notes or preferences are required' })]),
        }));
      });

      it('should fail if adjustments.notesOrPreferences is too long', () => {
        mockReq.body = { adjustments: { notesOrPreferences: 'A'.repeat(1001) } };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'adjustments.notesOrPreferences', message: '"adjustments.notesOrPreferences" length must be less than or equal to 1000 characters long' })]),
        }));
      });

      it('should fail if adjustments.exercisesToAdd is not an array', () => {
        mockReq.body = { adjustments: { notesOrPreferences: 'Valid', exercisesToAdd: 'not-an-array' } };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'adjustments.exercisesToAdd', message: '"adjustments.exercisesToAdd" must be an array' })]),
        }));
      });

      it('should fail if adjustments.exercisesToRemove is not an array', () => {
        mockReq.body = { adjustments: { notesOrPreferences: 'Valid', exercisesToRemove: 'not-an-array' } };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'adjustments.exercisesToRemove', message: '"adjustments.exercisesToRemove" must be an array' })]),
        }));
      });

      it('should fail if adjustments.exercisesToRemove contains non-UUID strings', () => {
        mockReq.body = {
          adjustments: {
            notesOrPreferences: 'Valid',
            exercisesToRemove: ['123e4567-e89b-12d3-a456-426614174000', 'not-a-uuid'],
          },
        };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'adjustments.exercisesToRemove.1', message: '"adjustments.exercisesToRemove[1]" must be a valid GUID' })]),
        }));
      });
    });

    describe('workoutSchemas.workoutQuerySchema', () => {
      const schema = workoutSchemas.workoutQuerySchema;
      // IMPORTANT: Set source to 'query' for this schema
      const validateQuery = validate(schema, 'query'); 

      it('should pass with an empty query and apply defaults', () => {
        mockReq.query = {};
        validateQuery(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.query.limit).toBe(10); // Check default
        expect(mockReq.query.offset).toBe(0); // Check default
        expect(mockReq.query.searchTerm).toBeUndefined();
      });

      it('should pass with valid limit, offset, and searchTerm', () => {
        mockReq.query = { limit: 50, offset: 10, searchTerm: ' pushups ' };
        validateQuery(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.query.limit).toBe(50);
        expect(mockReq.query.offset).toBe(10);
        expect(mockReq.query.searchTerm).toBe('pushups'); // Check trimming
      });

      it('should pass with only searchTerm', () => {
        mockReq.query = { searchTerm: 'squats' };
        validateQuery(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.query.limit).toBe(10);
        expect(mockReq.query.offset).toBe(0);
        expect(mockReq.query.searchTerm).toBe('squats');
      });

      // Limit validations
      it('should fail if limit is not a number', () => {
        mockReq.query = { limit: 'not-a-number' };
        validateQuery(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'limit', message: 'Limit must be a number' })]),
        }));
      });
      
      it('should fail if limit is not an integer', () => {
        mockReq.query = { limit: 10.5 };
        validateQuery(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'limit', message: 'Limit must be an integer' })]),
        }));
      });

      it('should fail if limit is less than 1', () => {
        mockReq.query = { limit: 0 };
        validateQuery(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'limit', message: 'Limit must be at least 1' })]),
        }));
      });

      it('should fail if limit is greater than 100', () => {
        mockReq.query = { limit: 101 };
        validateQuery(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'limit', message: 'Limit cannot exceed 100' })]),
        }));
      });

      // Offset validations
      it('should fail if offset is not a number', () => {
        mockReq.query = { offset: 'abc' };
        validateQuery(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'offset', message: 'Offset must be a number' })]),
        }));
      });

      it('should fail if offset is not an integer', () => {
        mockReq.query = { offset: 1.2 };
        validateQuery(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'offset', message: 'Offset must be an integer' })]),
        }));
      });

      it('should fail if offset is less than 0', () => {
        mockReq.query = { offset: -1 };
        validateQuery(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'offset', message: 'Offset must be at least 0' })]),
        }));
      });

      // searchTerm validations
      it('should fail if searchTerm is too long', () => {
        mockReq.query = { searchTerm: 'A'.repeat(101) };
        validateQuery(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'searchTerm', message: 'Search term cannot exceed 100 characters' })]),
        }));
      });
    });

    describe('workoutSchemas.workoutLogSchema', () => {
      const schema = workoutSchemas.workoutLogSchema;
      const validateBody = validate(schema, 'body');
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      const minimalValidExercise = {
        exercise_id: 'ex123',
        exercise_name: 'Bench Press',
        sets_completed: 3,
        reps_completed: [10, 8, 6],
        weights_used: [135, 145, 155],
      };
      const minimalValidLog = {
        plan_id: validUUID,
        date: '2024-05-10',
        exercises_completed: [minimalValidExercise],
      };

      it('should pass with minimal valid data', () => {
        mockReq.body = { ...minimalValidLog };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.body.completed).toBe(true); // Check default
        expect(mockReq.body.log_id).toBeUndefined();
        expect(mockReq.body.user_id).toBeUndefined();
        expect(mockReq.body.overall_difficulty).toBeUndefined();
        expect(mockReq.body.feedback).toBeUndefined(); 
      });

      it('should pass with all valid fields provided', () => {
        mockReq.body = {
          ...minimalValidLog,
          log_id: '987e6543-e21b-54d3-c876-153314174999',
          user_id: 'user-abc', // Assuming string ID is allowed if not UUID
          completed: false,
          exercises_completed: [
            { ...minimalValidExercise, felt_difficulty: 8, notes: 'Good form' },
            { exercise_id: 'ex456', exercise_name: 'Squats', sets_completed: 4, reps_completed: [12,12,10,10], weights_used: [185,185,195,195] }
          ],
          overall_difficulty: 7,
          energy_level: 6,
          satisfaction: 8,
          feedback: 'Felt strong today',
        };
        // Correcting user_id if schema requires UUID
        mockReq.body.user_id = '987e6543-e21b-54d3-c876-153314174999'; // Assuming UUID is required

        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.body.completed).toBe(false);
        expect(mockReq.body.feedback).toBe('Felt strong today');
        expect(mockReq.body.exercises_completed.length).toBe(2);
      });

      // Required field failures
      ['plan_id', 'date', 'exercises_completed'].forEach(field => {
        it(`should fail if ${field} is missing`, () => {
          const { [field]: _, ...rest } = minimalValidLog;
          mockReq.body = rest;
          validateBody(mockReq, mockRes, mockNext);
          expect(mockRes.status).toHaveBeenCalledWith(400);
          expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            errors: expect.arrayContaining([expect.objectContaining({ field })]),
          }));
        });
      });

      it('should fail if plan_id is not a UUID', () => {
        mockReq.body = { ...minimalValidLog, plan_id: 'not-a-uuid' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'plan_id', message: 'Plan ID must be a valid UUID' })]),
        }));
      });

      it('should fail if date is not a valid date', () => {
        mockReq.body = { ...minimalValidLog, date: 'invalid-date' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'date', message: 'Date must be a valid date' })]),
        }));
      });

      it('should fail if exercises_completed is an empty array', () => {
        mockReq.body = { ...minimalValidLog, exercises_completed: [] };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'exercises_completed', message: 'At least one exercise must be logged' })]),
        }));
      });

      // exercises_completed item validations
      it('should fail if exercise item is missing exercise_id', () => {
        const { exercise_id, ...rest } = minimalValidExercise;
        mockReq.body = { ...minimalValidLog, exercises_completed: [rest] };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'exercises_completed.0.exercise_id' })]),
        }));
      });
      
      it('should fail if exercise item has sets_completed < 1', () => {
        mockReq.body = { ...minimalValidLog, exercises_completed: [{ ...minimalValidExercise, sets_completed: 0 }] };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'exercises_completed.0.sets_completed' })]),
        }));
      });

      it('should fail if exercise item has reps_completed with negative number', () => {
        mockReq.body = { ...minimalValidLog, exercises_completed: [{ ...minimalValidExercise, reps_completed: [10, -1, 8] }] };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'exercises_completed.0.reps_completed.1' })]),
        }));
      });

       it('should fail if exercise item has weights_used with negative number', () => {
        mockReq.body = { ...minimalValidLog, exercises_completed: [{ ...minimalValidExercise, weights_used: [135, -5, 155] }] };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'exercises_completed.0.weights_used.1' })]),
        }));
      });

      it('should fail if exercise item has felt_difficulty out of range', () => {
        mockReq.body = { ...minimalValidLog, exercises_completed: [{ ...minimalValidExercise, felt_difficulty: 11 }] };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'exercises_completed.0.felt_difficulty' })]),
        }));
      });
      
      // Optional top-level fields
      it('should fail if overall_difficulty is out of range', () => {
        mockReq.body = { ...minimalValidLog, overall_difficulty: 0 };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'overall_difficulty' })]),
        }));
      });

      it('should fail if feedback is too long', () => {
        mockReq.body = { ...minimalValidLog, feedback: 'A'.repeat(1001) };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'feedback', message: 'Feedback cannot exceed 1000 characters' })]),
        }));
      });

       it('should pass with feedback exactly 1000 characters', () => {
        mockReq.body = { ...minimalValidLog, feedback: 'A'.repeat(1000) };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('workoutSchemas.workoutLogUpdateSchema', () => {
      const schema = workoutSchemas.workoutLogUpdateSchema;
      const validateBody = validate(schema, 'body');
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      const validExerciseUpdate = {
        exercise_id: 'ex123',
        exercise_name: 'Updated Bench Press',
        sets_completed: 4,
        reps_completed: [8, 8, 8, 8],
        weights_used: [140, 140, 140, 140],
        felt_difficulty: 7
      };

      it('should fail if the update object is empty', () => {
        mockReq.body = {};
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ message: 'At least one field is required for updating workout log' })]),
        }));
      });

      it('should pass when updating only date', () => {
        mockReq.body = { date: '2024-05-11' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.body.date).toEqual(new Date('2024-05-11T00:00:00.000Z')); // Joi converts to Date object
      });

      it('should pass when updating only completed status', () => {
        mockReq.body = { completed: false };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.body.completed).toBe(false);
      });

      it('should pass when updating only feedback', () => {
        mockReq.body = { feedback: 'Updated feedback' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.body.feedback).toBe('Updated feedback');
      });

      it('should pass when updating exercises_completed with valid data', () => {
        mockReq.body = { exercises_completed: [validExerciseUpdate] };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.body.exercises_completed).toEqual([validExerciseUpdate]);
      });

      it('should pass with multiple valid updates', () => {
        mockReq.body = { overall_difficulty: 8, energy_level: 7 };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should fail if updating date with invalid format', () => {
        mockReq.body = { date: 'invalid' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'date' })]),
        }));
      });

      it('should fail if updating overall_difficulty with value out of range', () => {
        mockReq.body = { overall_difficulty: 11 };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'overall_difficulty' })]),
        }));
      });

      it('should fail if updating exercises_completed with non-array', () => {
        mockReq.body = { exercises_completed: 'not-an-array' };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'exercises_completed' })]),
        }));
      });

       it('should fail if updating exercises_completed with item missing required field (exercise_name)', () => {
         const { exercise_name, ...invalidExercise } = validExerciseUpdate;
         mockReq.body = { exercises_completed: [invalidExercise] };
         validateBody(mockReq, mockRes, mockNext);
         expect(mockRes.status).toHaveBeenCalledWith(400);
         expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
           errors: expect.arrayContaining([expect.objectContaining({ field: 'exercises_completed.0.exercise_name' })]),
         }));
       });

       it('should fail if updating exercises_completed with item having invalid data (negative reps)', () => {
         mockReq.body = { exercises_completed: [{...validExerciseUpdate, reps_completed: [8, -1] }] };
         validateBody(mockReq, mockRes, mockNext);
         expect(mockRes.status).toHaveBeenCalledWith(400);
         expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
           errors: expect.arrayContaining([expect.objectContaining({ field: 'exercises_completed.0.reps_completed.1' })]),
         }));
       });
    });

    describe('workoutSchemas.workoutLogQuerySchema', () => {
      const schema = workoutSchemas.workoutLogQuerySchema;
      const validateQuery = validate(schema, 'query');
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';

      it('should pass with an empty query and apply defaults', () => {
        mockReq.query = {};
        validateQuery(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.query.limit).toBe(10);
        expect(mockReq.query.offset).toBe(0);
        expect(mockReq.query.startDate).toBeUndefined();
        expect(mockReq.query.endDate).toBeUndefined();
        expect(mockReq.query.planId).toBeUndefined();
      });

      it('should pass with all valid query parameters', () => {
        mockReq.query = {
          limit: 20,
          offset: 5,
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          planId: validUUID,
        };
        validateQuery(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.query.limit).toBe(20);
        expect(mockReq.query.offset).toBe(5);
        expect(mockReq.query.startDate).toEqual(new Date('2024-01-01T00:00:00.000Z'));
        expect(mockReq.query.endDate).toEqual(new Date('2024-01-31T00:00:00.000Z'));
        expect(mockReq.query.planId).toBe(validUUID);
      });

      // Inherited limit/offset tests from workoutQuerySchema tests - add a couple for sanity
      it('should fail if limit is invalid', () => {
        mockReq.query = { limit: -5 };
        validateQuery(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'limit' })]),
        }));
      });

      it('should fail if offset is invalid', () => {
        mockReq.query = { offset: -10 };
        validateQuery(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'offset' })]),
        }));
      });

      // startDate / endDate validations
      it('should fail if startDate is not a valid date', () => {
        mockReq.query = { startDate: 'not-a-date' };
        validateQuery(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'startDate', message: 'Start date must be a valid date' })]),
        }));
      });

      it('should fail if endDate is not a valid date', () => {
        mockReq.query = { endDate: 'definitely-not-a-date' }; // Use unambiguously invalid format
        validateQuery(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'endDate', message: 'End date must be a valid date' })]),
        }));
      });

      // planId validation
      it('should fail if planId is not a valid UUID', () => {
        mockReq.query = { planId: 'invalid-uuid' };
        validateQuery(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field: 'planId', message: 'Plan ID must be a valid UUID' })]),
        }));
      });
    });
  });

  // Import profileSchemas if not already done
  const { profileSchemas } = require('../../middleware/validation');

  describe('profileSchemas.create', () => {
    const schema = profileSchemas.create;
    const validateBody = validate(schema, 'body');

    const minimalValidMetric = {
      name: 'Metric User',
      age: 30,
      gender: 'female',
      height: 175, // cm
      weight: 70, // kg
      unitPreference: 'metric',
      activityLevel: 'moderately_active',
    };

    const minimalValidImperial = {
      name: 'Imperial User',
      age: 25,
      gender: 'male',
      height: { feet: 5, inches: 11 }, // ft/in
      weight: 180, // lbs
      unitPreference: 'imperial',
      activityLevel: 'lightly_active',
    };

    it('should pass with minimal valid metric data and check defaults', () => {
      mockReq.body = { ...minimalValidMetric };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body.fitnessGoals).toEqual([]);
      expect(mockReq.body.healthConditions).toEqual([]);
      expect(mockReq.body.equipment).toEqual([]);
      expect(mockReq.body.experienceLevel).toBe('beginner');
    });

    it('should pass with minimal valid imperial data and check defaults', () => {
      mockReq.body = { ...minimalValidImperial };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body.fitnessGoals).toEqual([]);
      expect(mockReq.body.healthConditions).toEqual([]);
      expect(mockReq.body.equipment).toEqual([]);
      expect(mockReq.body.experienceLevel).toBe('beginner');
    });

    it('should pass with all fields valid (metric)', () => {
      mockReq.body = {
        ...minimalValidMetric,
        fitnessGoals: ['strength'],
        healthConditions: ['none'],
        equipment: ['barbell'],
        experienceLevel: 'intermediate',
      };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body.experienceLevel).toBe('intermediate');
    });

    // Required field failures
    ['name', 'age', 'gender', 'height', 'weight', 'unitPreference', 'activityLevel'].forEach(field => {
      it(`should fail if required field ${field} is missing`, () => {
        const { [field]: _, ...rest } = minimalValidMetric;
        mockReq.body = rest;
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field })]),
        }));
      });
    });

    // Field specific validations
    it('should fail if age is outside range (too young)', () => {
      mockReq.body = { ...minimalValidMetric, age: 12 };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'age', message: 'Age must be at least 13 years' })]),
      }));
    });
    
     it('should fail if age is outside range (too old)', () => {
      mockReq.body = { ...minimalValidMetric, age: 121 };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'age', message: 'Age cannot exceed 120 years' })]),
      }));
    });

    it('should fail if gender is invalid', () => {
      mockReq.body = { ...minimalValidMetric, gender: 'robot' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'gender' })]),
      }));
    });

    it('should fail if metric height is not a positive number', () => {
      mockReq.body = { ...minimalValidMetric, height: -175 };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'height' })]),
      }));
    });

    it('should fail if imperial height object is missing feet', () => {
      mockReq.body = { ...minimalValidImperial, height: { inches: 11 } };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'height.feet' })]),
      }));
    });

    it('should fail if imperial height inches are >= 12', () => {
      mockReq.body = { ...minimalValidImperial, height: { feet: 5, inches: 12 } };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'height.inches' })]),
      }));
    });
    
    it('should fail if height is not a number (metric) or object (imperial)', () => {
      mockReq.body = { ...minimalValidMetric, height: 'tall' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'height' })]),
      }));
    });

    it('should fail if weight is not a positive number', () => {
      mockReq.body = { ...minimalValidMetric, weight: 0 };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'weight', message: 'Weight must be positive' })]),
      }));
    });

    it('should fail if unitPreference is invalid', () => {
      mockReq.body = { ...minimalValidMetric, unitPreference: 'kilograms' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'unitPreference' })]),
      }));
    });

    it('should fail if activityLevel is invalid', () => {
      mockReq.body = { ...minimalValidMetric, activityLevel: 'sometimes' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'activityLevel' })]),
      }));
    });

    it('should fail if fitnessGoals is not an array', () => {
      mockReq.body = { ...minimalValidMetric, fitnessGoals: 'get strong' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'fitnessGoals' })]),
      }));
    });

     it('should fail if experienceLevel is invalid', () => {
      mockReq.body = { ...minimalValidMetric, experienceLevel: 'expert' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'experienceLevel' })]),
      }));
    });
  });

  describe('profileSchemas.update', () => {
    const schema = profileSchemas.update;
    const validateBody = validate(schema, 'body');
    const validMetricData = {
      name: 'New Metric Name',
      age: 35,
      gender: 'other',
      height: 180,
      weight: 75,
      unitPreference: 'metric',
      activityLevel: 'very_active',
      experienceLevel: 'advanced'
    };

    it('should fail if the update object is empty', () => {
      mockReq.body = {};
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ message: 'At least one field is required for profile update' })]),
      }));
    });

    it('should pass when updating only name', () => {
      mockReq.body = { name: 'Updated Name' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass when updating only metric height', () => {
      mockReq.body = { height: 177 };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass when updating only imperial height', () => {
      mockReq.body = { height: { feet: 6, inches: 1 } };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass when updating only experienceLevel', () => {
      mockReq.body = { experienceLevel: 'intermediate' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass when updating multiple fields', () => {
      mockReq.body = { age: 40, weight: 80, unitPreference: 'imperial' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    // Field specific failures
    it('should fail if age is out of range', () => {
      mockReq.body = { age: 150 };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'age', message: 'Age cannot exceed 120 years' })]),
      }));
    });

    it('should fail if gender is invalid', () => {
      mockReq.body = { gender: 'non-binary' }; // Assuming this isn't in the valid list
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'gender' })]),
      }));
    });

     it('should fail if height is invalid (wrong type)', () => {
      mockReq.body = { height: '6ft' }; 
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'height' })]),
      }));
    });

    it('should fail if weight is negative', () => {
      mockReq.body = { weight: -70 };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'weight', message: 'Weight must be positive' })]),
      }));
    });

    it('should fail if experienceLevel is invalid', () => {
      mockReq.body = { experienceLevel: 'master' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'experienceLevel' })]),
      }));
    });
  });

  describe('profileSchemas.preferences', () => {
    const schema = profileSchemas.preferences;
    const validateBody = validate(schema, 'body');

    it('should fail if the preferences object is empty', () => {
      mockReq.body = {};
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ message: 'At least one preference field is required' })]),
      }));
    });

    it('should pass when updating only unitPreference', () => {
      mockReq.body = { unitPreference: 'imperial' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass when updating only fitnessGoals', () => {
      mockReq.body = { fitnessGoals: ['endurance'] };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass when updating only experienceLevel', () => {
      mockReq.body = { experienceLevel: 'advanced' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass when updating only notificationPreferences and check defaults', () => {
      mockReq.body = { notificationPreferences: { email: false } }; // Update one field
      validateBody(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body.notificationPreferences.email).toBe(false);
      expect(mockReq.body.notificationPreferences.push).toBe(true); // Check default
      expect(mockReq.body.notificationPreferences.frequency).toBe('weekly'); // Check default
    });
    
     it('should pass when updating notificationPreferences frequency', () => {
      mockReq.body = { notificationPreferences: { frequency: 'daily' } };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body.notificationPreferences.frequency).toBe('daily'); 
      expect(mockReq.body.notificationPreferences.email).toBe(true);
      expect(mockReq.body.notificationPreferences.push).toBe(true); 
    });

    it('should pass when updating multiple preferences', () => {
      mockReq.body = { unitPreference: 'metric', equipment: ['none'] };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    // Failures
    it('should fail if unitPreference is invalid', () => {
      mockReq.body = { unitPreference: 'stone' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'unitPreference' })]),
      }));
    });

    it('should fail if fitnessGoals is not an array', () => {
      mockReq.body = { fitnessGoals: 'goal1' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'fitnessGoals' })]),
      }));
    });

    it('should fail if experienceLevel is invalid', () => {
      mockReq.body = { experienceLevel: 'guru' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'experienceLevel' })]),
      }));
    });

     it('should fail if notificationPreferences is not an object', () => {
      mockReq.body = { notificationPreferences: 'yes' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'notificationPreferences' })]),
      }));
    });

    it('should fail if notificationPreferences.email is not a boolean', () => {
      mockReq.body = { notificationPreferences: { email: 'maybe' } };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'notificationPreferences.email' })]),
      }));
    });

    it('should fail if notificationPreferences.frequency is invalid', () => {
      mockReq.body = { notificationPreferences: { frequency: 'often' } };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'notificationPreferences.frequency' })]),
      }));
    });
  });

  // Import standalone schemas if they aren't already accessible
  // (Assuming they are exported or accessible via the main export object)
  const { measurementsSchema } = require('../../middleware/validation'); 
  // Adjust import if needed based on actual export structure

  describe('measurementsSchema', () => {
    // Need to wrap it in an object for the validate function if testing directly
    const testSchema = Joi.object({ measurements: measurementsSchema });
    const validateBody = validate(testSchema, 'body');

    it('should pass if measurements is not provided (as it is optional)', () => {
        mockReq.body = {}; // No measurements field
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.body.measurements).toBeUndefined();
    });
    
    it('should pass with an empty measurements object', () => {
        mockReq.body = { measurements: {} }; 
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.body.measurements).toEqual({});
    });

    it('should pass with valid positive numbers', () => {
      mockReq.body = { measurements: { waist: 32.5, chest: 40 } };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body.measurements).toEqual({ waist: 32.5, chest: 40 });
    });

    it('should pass with integer values', () => {
        mockReq.body = { measurements: { hips: 38, neck: 15 } };
        validateBody(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.body.measurements).toEqual({ hips: 38, neck: 15 });
    });

    it('should fail if waist is zero', () => {
      mockReq.body = { measurements: { waist: 0 } };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'measurements.waist' })]),
      }));
    });

    it('should fail if chest is negative', () => {
      mockReq.body = { measurements: { chest: -40 } };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
       expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'measurements.chest' })]),
      }));
    });

    it('should fail if arms is not a number', () => {
      mockReq.body = { measurements: { arms: 'strong' } };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'measurements.arms' })]),
      }));
    });
  });

  // Import checkInSchema
  const { checkInSchema } = require('../../middleware/validation');

  describe('checkInSchema', () => {
    const schema = checkInSchema;
    const validateBody = validate(schema, 'body');
    const minimalValidData = {
      date: '2024-05-15',
    };
    const validMeasurements = { waist: 31, chest: 39 };

    it('should pass with minimal required data (date)', () => {
      mockReq.body = { ...minimalValidData };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body.weight).toBeUndefined();
      expect(mockReq.body.measurements).toBeUndefined();
      expect(mockReq.body.notes).toBeUndefined();
    });

    it('should pass with all valid fields', () => {
      mockReq.body = {
        ...minimalValidData,
        weight: 178,
        body_fat_percentage: 15.5,
        measurements: validMeasurements,
        mood: 'good',
        sleep_quality: 'excellent',
        energy_level: 8,
        stress_level: 3,
        notes: 'Feeling great after the workout.',
      };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body.measurements).toEqual(validMeasurements);
      expect(mockReq.body.notes).toBe('Feeling great after the workout.');
    });

    // Date validation
    it('should fail if date is missing', () => {
      mockReq.body = { weight: 180 }; // Date is required
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([
          // Revert to just checking the field, not the specific message
          expect.objectContaining({ field: 'date' })
        ]),
      }));
    });

    it('should fail if date is invalid', () => {
      mockReq.body = { date: 'invalid-date' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'date' })]),
      }));
    });

    // Optional field validations
    it('should fail if weight is zero', () => {
      mockReq.body = { ...minimalValidData, weight: 0 };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'weight' })]), // Message: 'must be a positive number'
      }));
    });

    it('should fail if body_fat_percentage is negative', () => {
      mockReq.body = { ...minimalValidData, body_fat_percentage: -5 };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'body_fat_percentage' })]), // Message: 'must be at least 0'
      }));
    });

    it('should fail if body_fat_percentage is too high', () => {
      mockReq.body = { ...minimalValidData, body_fat_percentage: 51 };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'body_fat_percentage' })]), // Message: 'cannot exceed 50'
      }));
    });

    it('should fail if measurements contains invalid data (e.g., negative waist)', () => {
      mockReq.body = { ...minimalValidData, measurements: { waist: -30 } };
      // Need to use the wrapper schema for this test
      const testSchema = Joi.object({ date: Joi.date().required(), measurements: measurementsSchema });
      const customValidate = validate(testSchema, 'body');
      customValidate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'measurements.waist' })]),
      }));
    });

    it('should fail if mood is invalid', () => {
      mockReq.body = { ...minimalValidData, mood: 'meh' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'mood' })]),
      }));
    });

    it('should fail if energy_level is out of range (too high)', () => {
      mockReq.body = { ...minimalValidData, energy_level: 11 };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'energy_level' })]),
      }));
    });

    it('should fail if stress_level is out of range (too low)', () => {
      mockReq.body = { ...minimalValidData, stress_level: 0 };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'stress_level' })]),
      }));
    });

    it('should fail if notes is too long', () => {
      mockReq.body = { ...minimalValidData, notes: 'A'.repeat(501) };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'notes' })]),
      }));
    });
  });

  // Import metricCalculationSchema
  const { metricCalculationSchema } = require('../../middleware/validation');

  describe('metricCalculationSchema', () => {
    const schema = metricCalculationSchema;
    const validateBody = validate(schema, 'body');

    it('should pass with valid start and end dates', () => {
      mockReq.body = { startDate: '2024-04-01', endDate: '2024-04-30' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass when start date and end date are the same', () => {
      mockReq.body = { startDate: '2024-04-15', endDate: '2024-04-15' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail if startDate is missing', () => {
      mockReq.body = { endDate: '2024-04-30' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        // Revert to just checking the field
        errors: expect.arrayContaining([expect.objectContaining({ field: 'startDate' })]),
      }));
    });

    it('should fail if endDate is missing', () => {
      mockReq.body = { startDate: '2024-04-01' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        // Revert to just checking the field
        errors: expect.arrayContaining([expect.objectContaining({ field: 'endDate' })]), 
      }));
    });

    it('should fail if startDate is not a valid date', () => {
      mockReq.body = { startDate: 'invalid', endDate: '2024-04-30' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'startDate' })]),
      }));
    });

    it('should fail if endDate is not a valid date', () => {
      mockReq.body = { startDate: '2024-04-01', endDate: 'invalid' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'endDate' })]),
      }));
    });

    it('should fail if endDate is before startDate', () => {
      mockReq.body = { startDate: '2024-04-30', endDate: '2024-04-01' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        // Using custom message from schema
        errors: expect.arrayContaining([expect.objectContaining({ field: 'endDate', message: 'End date must be after start date' })]),
      }));
    });
  });

  // Import macroCalculationSchema
  const { macroCalculationSchema } = require('../../middleware/validation');

  describe('macroCalculationSchema', () => {
    const schema = macroCalculationSchema;
    const validateBody = validate(schema, 'body');

    const minimalValidData = {
      weight: 75,
      height: 180,
      age: 30,
      gender: 'male',
      activityLevel: 'moderate',
      goal: 'maintenance',
      // units defaults to metric
    };

    it('should pass with minimal valid metric data and check defaults', () => {
      mockReq.body = { ...minimalValidData };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body.units).toBe('metric');
      expect(mockReq.body.useExternalApi).toBe(true);
    });

    it('should pass with valid imperial data', () => {
      mockReq.body = {
        weight: 165, // lbs
        height: { feet: 5, inches: 11 },
        age: 28,
        gender: 'female',
        activityLevel: 'active',
        goal: 'muscle_gain',
        units: 'imperial',
        useExternalApi: false,
      };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body.units).toBe('imperial');
      expect(mockReq.body.useExternalApi).toBe(false);
    });

    // Required field failures
    ['weight', 'height', 'age', 'gender', 'activityLevel', 'goal'].forEach(field => {
      it(`should fail if required field ${field} is missing`, () => {
        const { [field]: _, ...rest } = minimalValidData;
        mockReq.body = rest;
        validateBody(mockReq, mockRes, mockNext);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ field })]),
        }));
      });
    });

    // Field specific validations
    it('should fail if weight is out of range (too low)', () => {
      mockReq.body = { ...minimalValidData, weight: 19 };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'weight' })]),
      }));
    });

    it('should fail if metric height is out of range (too high)', () => {
      mockReq.body = { ...minimalValidData, height: 251 };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'height' })]),
      }));
    });

     it('should fail if imperial height feet are out of range (too low)', () => {
      mockReq.body = {
        ...minimalValidData, 
        units: 'imperial',
        height: { feet: 2, inches: 10 }
      };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'height.feet' })]),
      }));
    });

    it('should fail if age is not an integer', () => {
      mockReq.body = { ...minimalValidData, age: 30.5 };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'age' })]),
      }));
    });

    it('should fail if gender is invalid', () => {
      mockReq.body = { ...minimalValidData, gender: 'apache_helicopter' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'gender' })]),
      }));
    });

    it('should fail if activityLevel is invalid', () => {
      mockReq.body = { ...minimalValidData, activityLevel: 'lazy' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'activityLevel' })]),
      }));
    });

     it('should fail if goal is invalid', () => {
      mockReq.body = { ...minimalValidData, goal: 'get_shredded' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'goal' })]),
      }));
    });

    it('should fail if units is invalid', () => {
      mockReq.body = { ...minimalValidData, units: 'metric_and_imperial' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'units' })]),
      }));
    });

    it('should fail if useExternalApi is not a boolean', () => {
      mockReq.body = { ...minimalValidData, useExternalApi: 'maybe' };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'useExternalApi' })]),
      }));
    });
  });

  // Import notificationPreferencesSchema
  const { notificationPreferencesSchema } = require('../../middleware/validation');

  describe('notificationPreferencesSchema', () => {
    // Need to wrap it in an object for the validate function if testing directly
    const testSchema = Joi.object({ notifications: notificationPreferencesSchema });
    const validateBody = validate(testSchema, 'body');

    it('should pass with an empty object', () => {
      mockReq.body = { notifications: {} };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body.notifications).toEqual({});
    });

    it('should pass with valid boolean fields', () => {
      mockReq.body = { notifications: { email_enabled: false, sms_enabled: true } };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body.notifications.email_enabled).toBe(false);
      expect(mockReq.body.notifications.sms_enabled).toBe(true);
    });

    it('should pass with valid quiet hours', () => {
      mockReq.body = { notifications: { quiet_hours_start: '22:00', quiet_hours_end: '07:30' } };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.body.notifications.quiet_hours_start).toBe('22:00');
      expect(mockReq.body.notifications.quiet_hours_end).toBe('07:30');
    });
    
    it('should pass with all valid fields', () => {
      mockReq.body = { notifications: {
         email_enabled: true,
         sms_enabled: false,
         push_enabled: true,
         in_app_enabled: false,
         quiet_hours_start: '21:00',
         quiet_hours_end: '06:00' 
      } };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    // Failures
    it('should fail if email_enabled is not a boolean', () => {
      mockReq.body = { notifications: { email_enabled: 123 } }; // Use unambiguous wrong type
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'notifications.email_enabled' })]),
      }));
    });

    it('should fail if quiet_hours_start has invalid format (missing minutes)', () => {
      mockReq.body = { notifications: { quiet_hours_start: '22' } };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'notifications.quiet_hours_start' })]),
      }));
    });

    it('should fail if quiet_hours_end has invalid format (out of range hour)', () => {
      mockReq.body = { notifications: { quiet_hours_end: '25:00' } };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'notifications.quiet_hours_end' })]),
      }));
    });

    it('should fail if quiet_hours_end has invalid format (non-digit)', () => {
      mockReq.body = { notifications: { quiet_hours_end: 'aa:bb' } };
      validateBody(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        errors: expect.arrayContaining([expect.objectContaining({ field: 'notifications.quiet_hours_end' })]),
      }));
    });
  });

  // Import custom middleware
  const { 
    validateCheckIn,
    validateMetricsCalculation,
    validateMacroCalculation,
    validateNotificationPreferences
   } = require('../../middleware/validation');

  describe('Custom Validation Middleware', () => {
    describe('validateCheckIn', () => {
      it('should call next() for valid check-in data', () => {
        mockReq.body = { date: '2024-05-20', weight: 80, mood: 'good' };
        validateCheckIn(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockRes.status).not.toHaveBeenCalled();
        expect(mockRes.json).not.toHaveBeenCalled();
        // Check if body was potentially updated by Joi conversion (e.g., date string to Date object)
        expect(mockReq.body.date).toBeInstanceOf(Date); 
      });

      it('should return 400 if check-in data is invalid (missing date)', () => {
        mockReq.body = { weight: 80 };
        validateCheckIn(mockReq, mockRes, mockNext);
        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          status: 'error',
          message: 'Invalid check-in data',
          details: ['"date" is required'],
        });
      });

      it('should return 400 if check-in data is invalid (invalid mood)', () => {
        mockReq.body = { date: '2024-05-20', mood: 'fantastic' };
        validateCheckIn(mockReq, mockRes, mockNext);
        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
          status: 'error',
          message: 'Invalid check-in data',
          details: expect.arrayContaining([expect.stringContaining('"mood" must be one of')]),
        }));
      });
    });

    describe('validateMetricsCalculation', () => {
      it('should call next() for valid metrics calculation data', () => {
        mockReq.body = { startDate: '2024-03-15', endDate: '2024-04-15' };
        validateMetricsCalculation(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockRes.status).not.toHaveBeenCalled();
        expect(mockRes.json).not.toHaveBeenCalled();
        expect(mockReq.body.startDate).toBeInstanceOf(Date);
        expect(mockReq.body.endDate).toBeInstanceOf(Date);
      });

      it('should return 400 if metrics calculation data is invalid (endDate < startDate)', () => {
        mockReq.body = { startDate: '2024-04-15', endDate: '2024-03-15' };
        validateMetricsCalculation(mockReq, mockRes, mockNext);
        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          status: 'error',
          message: 'Invalid metrics calculation parameters',
          details: ['End date must be after start date'], // Specific message from schema
        });
      });

      it('should return 400 if metrics calculation data is invalid (missing endDate)', () => {
        mockReq.body = { startDate: '2024-04-15' };
        validateMetricsCalculation(mockReq, mockRes, mockNext);
        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          status: 'error',
          message: 'Invalid metrics calculation parameters',
           // Joi default message for required is used here as the custom one targets endDate.min
          details: ['"endDate" is required'], 
        });
      });
    });

    describe('validateMacroCalculation', () => {
      const minimalValidMetric = {
        weight: 75,
        height: 180,
        age: 30,
        gender: 'male',
        activityLevel: 'moderate',
        goal: 'maintenance',
        units: 'metric',
      };
      const minimalValidImperial = {
        weight: 165, // lbs
        height: { feet: 5, inches: 11 }, // 71 inches = 180.34 cm
        age: 28,
        gender: 'female',
        activityLevel: 'active',
        goal: 'muscle_gain',
        units: 'imperial',
      };

      it('should call next() for valid metric macro calculation data', () => {
        mockReq.body = { ...minimalValidMetric };
        validateMacroCalculation(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockRes.status).not.toHaveBeenCalled();
        // Check body remains unchanged (metric)
        expect(mockReq.body.weight).toBe(75);
        expect(mockReq.body.height).toBe(180);
        expect(mockReq.body.units).toBe('metric');
      });

      it('should call next() for valid imperial data and convert units in req.body', () => {
        mockReq.body = { ...minimalValidImperial };
        validateMacroCalculation(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockRes.status).not.toHaveBeenCalled();
        
        // Check body for converted values
        // Weight: 165 lbs / 2.20462 = 74.846... -> rounded to 74.8 kg
        expect(mockReq.body.weight).toBeCloseTo(74.8);
        // Height: (5 * 12 + 11) * 2.54 = 180.34 -> rounded to 180 cm
        expect(mockReq.body.height).toBe(180);
        // Units should still be imperial as conversion happens after validation
        // UPDATE: No, the function *updates* req.body with converted values, so units should remain imperial? Let's check implementation.
        // Implementation updates req.body *in place* with converted values. Units field itself is not changed by this middleware.
        expect(mockReq.body.units).toBe('imperial'); 
      });

      it('should return 400 if macro calculation data is invalid (missing weight)', () => {
        const { weight, ...rest } = minimalValidMetric;
        mockReq.body = rest;
        validateMacroCalculation(mockReq, mockRes, mockNext);
        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          status: 'error',
          message: 'Invalid macro calculation input',
          // Expect the custom message
          errors: expect.arrayContaining(['Weight is required']),
        });
      });

      it('should return 400 if macro calculation data is invalid (age too low)', () => {
        mockReq.body = { ...minimalValidMetric, age: 12 };
        validateMacroCalculation(mockReq, mockRes, mockNext);
        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          status: 'error',
          message: 'Invalid macro calculation input',
          // Expect the custom message
          errors: expect.arrayContaining(['Age must be at least 13']),
        });
      });
      
      it('should return 400 if imperial height is invalid (inches too high)', () => {
        mockReq.body = {
          ...minimalValidImperial,
          height: { feet: 5, inches: 12 }, 
        };
        validateMacroCalculation(mockReq, mockRes, mockNext);
        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
         expect(mockRes.json).toHaveBeenCalledWith({
          status: 'error',
          message: 'Invalid macro calculation input',
          // Expect the custom message
          errors: expect.arrayContaining(['Inches must be between 0 and 11.99']),
        });
      });
    });

    describe('validateNotificationPreferences', () => {
      it('should call next() for valid notification preferences data', () => {
        mockReq.body = { email_enabled: false, quiet_hours_start: '23:00' };
        validateNotificationPreferences(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockRes.status).not.toHaveBeenCalled();
      });

       it('should call next() for empty notification preferences data', () => {
        mockReq.body = {};
        validateNotificationPreferences(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('should return 400 if notification preferences data is invalid (invalid format)', () => {
        mockReq.body = { quiet_hours_start: 'bad-time' };
        validateNotificationPreferences(mockReq, mockRes, mockNext);
        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          status: 'error',
          message: 'Invalid notification preferences',
          details: expect.arrayContaining([expect.stringContaining('Quiet hours must be in HH:MM format')]),
        });
      });
      
      it('should return 400 if notification preferences data is invalid (invalid type)', () => {
        mockReq.body = { sms_enabled: 'yes' };
        validateNotificationPreferences(mockReq, mockRes, mockNext);
        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          status: 'error',
          message: 'Invalid notification preferences',
          details: expect.arrayContaining([expect.stringContaining('"sms_enabled" must be a boolean')]),
        });
      });
    });
  });
}); 