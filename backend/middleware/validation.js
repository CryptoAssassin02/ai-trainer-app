/**
 * @fileoverview Validation Middleware
 * Provides middleware functions for request data validation using Joi
 */

const Joi = require('joi');
const { logger } = require('../config');

/**
 * Validation error response formatter
 * Formats Joi validation errors into a consistent API response
 * 
 * @param {Object} error - Joi validation error object
 * @returns {Object} Formatted error response
 */
const formatValidationError = (error) => {
  // Extract validation details
  const details = error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    type: detail.type
  }));
  
  // Use the first error message as the main message for better UX
  const primaryMessage = details.length > 0 ? details[0].message : 'Validation failed';
  
  return {
    status: 'error',
    message: primaryMessage,
    errors: details
  };
};

/**
 * Middleware factory to validate request data against a schema
 * 
 * @param {Object} schema - Joi validation schema
 * @param {string} source - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    
    // For profile routes, remove userId from body since controller will override it
    if (source === 'body' && req.originalUrl.includes('/profile') && data && 'userId' in data) {
      const { userId, ...dataWithoutUserId } = data;
      req[source] = dataWithoutUserId;
    }
    
    // // DEBUG: Log incoming data for the specific route
    // if (req.originalUrl === '/workouts/log' && req.method === 'POST') {
    //   console.log(`[Validation Middleware DEBUG] Validating ${source} for ${req.method} ${req.originalUrl}:`, JSON.stringify(data, null, 2));
    // }
    
    // Validate data against schema
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      convert: false
    });
    
    // // DEBUG: Log validation result
    // if (req.originalUrl === '/workouts/log' && req.method === 'POST') {
    //   if (error) {
    //     console.error('[Validation Middleware DEBUG] Validation Error:', JSON.stringify(error.details, null, 2));
    //   } else {
    //     console.log('[Validation Middleware DEBUG] Validation Success.');
    //   }
    // }
    
    if (error) {
      logger.warn('Validation failed', {
        path: req.originalUrl,
        errors: error.details.map(detail => detail.message)
      });
      
      return res.status(400).json(formatValidationError(error));
    }
    
    // Update request data with validated and sanitized values
    req[source] = value;
    
    next();
  };
};

// User schemas
const userSchemas = {
  // User registration schema
  register: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'Password is required'
      }),
    name: Joi.string()
      .min(2)
      .max(100)
      .allow(null, '')
      .optional()
      .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 100 characters'
      })
  }),
  
  // User login schema
  login: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required'
      }),
    rememberMe: Joi.boolean()
      .default(false)
  }),
  
  // Refresh token schema
  refresh: Joi.object({
    refreshToken: Joi.string()
      .required()
      .messages({
        'any.required': 'Refresh token is required',
        'string.empty': 'Refresh token cannot be empty'
      })
  }),
  
  // Update user profile schema
  updateProfile: Joi.object({
    name: Joi.string()
      .min(2)
      .max(100)
      .allow(null, '')
      .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 100 characters'
      }),
    email: Joi.string()
      .email()
      .messages({
        'string.email': 'Please provide a valid email address'
      }),
    currentPassword: Joi.string(),
    newPassword: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .messages({
        'string.min': 'New password must be at least 8 characters long',
        'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      })
  })
    .with('newPassword', 'currentPassword')
};

// Workout schemas - Renamed create to workoutGenerationSchema and update to workoutReGenerationSchema
// Added workoutAdjustmentSchema and workoutQuerySchema
const workoutSchemas = {
  // Schema for generating a new workout plan based on user criteria
  workoutGenerationSchema: Joi.object({
    fitnessLevel: Joi.string()
      .valid('beginner', 'intermediate', 'advanced')
      .required()
      .messages({
        'any.only': 'Fitness level must be one of: beginner, intermediate, advanced',
        'any.required': 'Fitness level is required'
      }),
    goals: Joi.array()
      .items(Joi.string())
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one goal must be provided',
        'any.required': 'Goals are required'
      }),
    equipment: Joi.array()
      .items(Joi.string())
      .default([]),
    restrictions: Joi.array()
      .items(Joi.string())
      .default([]),
    exerciseTypes: Joi.array()
      .items(Joi.string())
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one exercise type must be provided',
        'any.required': 'Exercise types are required'
      }),
    workoutFrequency: Joi.string() // Changed to string to match API spec examples like '3x per week'
      // .valid('daily', '1x_week', '2x_week', '3x_week', '4x_week', '5x_week', '6x_week') // Example valid values
      .allow(null)
      .optional()
      .messages({
        // 'any.only': 'Invalid workout frequency format',
        'any.required': 'Workout frequency is required'
      }),
    additionalNotes: Joi.string()
      .max(500)
      .allow('')
      .default('')
      .messages({
        'string.max': 'Additional notes cannot exceed 500 characters'
      })
  }),

  // Schema for partially updating criteria for re-generating a workout plan
  workoutReGenerationSchema: Joi.object({
    fitnessLevel: Joi.string()
      .valid('beginner', 'intermediate', 'advanced'),
    goals: Joi.array()
      .items(Joi.string())
      .min(1),
    equipment: Joi.array()
      .items(Joi.string()),
    restrictions: Joi.array()
      .items(Joi.string()),
    exerciseTypes: Joi.array()
      .items(Joi.string())
      .min(1),
    workoutFrequency: Joi.string(), // Keep as string
    additionalNotes: Joi.string()
      .max(500)
      .allow('')
  }).min(1).messages({
      'object.min': 'At least one field is required for updating workout generation criteria'
    }),

  // Schema for adjusting an existing workout plan via agent feedback
  workoutAdjustmentSchema: Joi.object({
    // userId is usually from JWT, not body, but kept if needed for specific flows
    // userId: Joi.string().uuid().required(),
    adjustments: Joi.object({
      exercisesToAdd: Joi.array().items(Joi.object().unknown(true)).optional(), // Allow any object structure inside the array
      exercisesToRemove: Joi.array().items(Joi.string().uuid()).optional(), // Assuming removal by ID
      notesOrPreferences: Joi.string().max(1000).required().messages({
        'string.empty': 'Adjustment notes or preferences are required',
        'any.required': 'Adjustment notes or preferences are required'
      })
    }).required().messages({
        'any.required': 'Adjustments object is required'
      })
  }),

  // Schema for validating query parameters for listing workouts (pagination/filtering)
  workoutQuerySchema: Joi.object({
      limit: Joi.number().integer().min(1).max(100).default(10).messages({
        'number.base': 'Limit must be a number',
        'number.integer': 'Limit must be an integer',
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100'
      }),
      offset: Joi.number().integer().min(0).default(0).messages({
        'number.base': 'Offset must be a number',
        'number.integer': 'Offset must be an integer',
        'number.min': 'Offset must be at least 0'
      }),
      searchTerm: Joi.string().trim().max(100).optional().messages({
        'string.max': 'Search term cannot exceed 100 characters'
      })
    }),

  // Schema for workout logs
  workoutLogSchema: Joi.object({
    log_id: Joi.string()
      .uuid()
      .optional()
      .messages({
        'string.guid': 'Log ID must be a valid UUID'
      }),
    user_id: Joi.string()
      .uuid()
      .optional()
      .messages({
        'string.guid': 'User ID must be a valid UUID'
      }),
    plan_id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.guid': 'Plan ID must be a valid UUID',
        'any.required': 'Plan ID is required'
      }),
    date: Joi.date()
      .required()
      .messages({
        'date.base': 'Date must be a valid date',
        'any.required': 'Date is required'
      }),
    completed: Joi.boolean()
      .default(true),
    exercises_completed: Joi.array()
      .items(Joi.object({
        exercise_id: Joi.string().required().messages({
          'any.required': 'Exercise ID is required'
        }),
        exercise_name: Joi.string().required().messages({
          'any.required': 'Exercise name is required'
        }),
        sets_completed: Joi.number().integer().min(1).required().messages({
          'number.base': 'Sets completed must be a number',
          'number.integer': 'Sets completed must be an integer',
          'number.min': 'Sets completed must be at least 1',
          'any.required': 'Sets completed is required'
        }),
        reps_completed: Joi.array().items(Joi.number().integer().min(0)).required().messages({
          'array.base': 'Reps completed must be an array',
          'any.required': 'Reps completed is required'
        }),
        weights_used: Joi.array().items(Joi.number().min(0)).required().messages({
          'array.base': 'Weights used must be an array',
          'any.required': 'Weights used is required'
        }),
        felt_difficulty: Joi.number().integer().min(1).max(10).messages({
          'number.base': 'Felt difficulty must be a number',
          'number.integer': 'Felt difficulty must be an integer',
          'number.min': 'Felt difficulty must be between 1 and 10',
          'number.max': 'Felt difficulty must be between 1 and 10'
        }),
        notes: Joi.string().allow('').optional()
      }))
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one exercise must be logged',
        'any.required': 'Exercises completed is required'
      }),
    overall_difficulty: Joi.number()
      .integer()
      .min(1)
      .max(10)
      .optional()
      .messages({
        'number.base': 'Overall difficulty must be a number',
        'number.integer': 'Overall difficulty must be an integer',
        'number.min': 'Overall difficulty must be between 1 and 10',
        'number.max': 'Overall difficulty must be between 1 and 10'
      }),
    energy_level: Joi.number()
      .integer()
      .min(1)
      .max(10)
      .optional()
      .messages({
        'number.base': 'Energy level must be a number',
        'number.integer': 'Energy level must be an integer',
        'number.min': 'Energy level must be between 1 and 10',
        'number.max': 'Energy level must be between 1 and 10'
      }),
    satisfaction: Joi.number()
      .integer()
      .min(1)
      .max(10)
      .optional()
      .messages({
        'number.base': 'Satisfaction must be a number',
        'number.integer': 'Satisfaction must be an integer',
        'number.min': 'Satisfaction must be between 1 and 10',
        'number.max': 'Satisfaction must be between 1 and 10'
      }),
    feedback: Joi.string()
      .max(1000)
      .allow('')
      .optional()
      .messages({
        'string.max': 'Feedback cannot exceed 1000 characters'
      })
  }),

  // Schema for updating workout logs
  workoutLogUpdateSchema: Joi.object({
    plan_id: Joi.string()
      .uuid()
      .messages({
        'string.guid': 'Plan ID must be a valid UUID'
      }),
    date: Joi.date()
      .messages({
        'date.base': 'Date must be a valid date'
      }),
    completed: Joi.boolean(),
    exercises_completed: Joi.array()
      .items(Joi.object({
        exercise_id: Joi.string().required().messages({
          'any.required': 'Exercise ID is required'
        }),
        exercise_name: Joi.string().required().messages({
          'any.required': 'Exercise name is required'
        }),
        sets_completed: Joi.number().integer().min(1).required().messages({
          'number.base': 'Sets completed must be a number',
          'number.integer': 'Sets completed must be an integer',
          'number.min': 'Sets completed must be at least 1',
          'any.required': 'Sets completed is required'
        }),
        reps_completed: Joi.array().items(Joi.number().integer().min(0)).required().messages({
          'array.base': 'Reps completed must be an array',
          'any.required': 'Reps completed is required'
        }),
        weights_used: Joi.array().items(Joi.number().min(0)).required().messages({
          'array.base': 'Weights used must be an array',
          'any.required': 'Weights used is required'
        }),
        felt_difficulty: Joi.number().integer().min(1).max(10).messages({
          'number.base': 'Felt difficulty must be a number',
          'number.integer': 'Felt difficulty must be an integer',
          'number.min': 'Felt difficulty must be between 1 and 10',
          'number.max': 'Felt difficulty must be between 1 and 10'
        }),
        notes: Joi.string().allow('').optional()
      }))
      .min(1)
      .messages({
        'array.min': 'At least one exercise must be logged'
      }),
    overall_difficulty: Joi.number()
      .integer()
      .min(1)
      .max(10)
      .messages({
        'number.base': 'Overall difficulty must be a number',
        'number.integer': 'Overall difficulty must be an integer',
        'number.min': 'Overall difficulty must be between 1 and 10',
        'number.max': 'Overall difficulty must be between 1 and 10'
      }),
    energy_level: Joi.number()
      .integer()
      .min(1)
      .max(10)
      .messages({
        'number.base': 'Energy level must be a number',
        'number.integer': 'Energy level must be an integer',
        'number.min': 'Energy level must be between 1 and 10',
        'number.max': 'Energy level must be between 1 and 10'
      }),
    satisfaction: Joi.number()
      .integer()
      .min(1)
      .max(10)
      .messages({
        'number.base': 'Satisfaction must be a number',
        'number.integer': 'Satisfaction must be an integer',
        'number.min': 'Satisfaction must be between 1 and 10',
        'number.max': 'Satisfaction must be between 1 and 10'
      }),
    feedback: Joi.string()
      .max(1000)
      .allow('')
      .messages({
        'string.max': 'Feedback cannot exceed 1000 characters'
      })
  }).min(1).messages({
    'object.min': 'At least one field is required for updating workout log'
  }),

  // Schema for validating query parameters for listing workout logs (filtering/pagination)
  workoutLogQuerySchema: Joi.object({
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(10)
      .messages({
        'number.base': 'Limit must be a number',
        'number.integer': 'Limit must be an integer',
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100'
      }),
    offset: Joi.number()
      .integer()
      .min(0)
      .default(0)
      .messages({
        'number.base': 'Offset must be a number',
        'number.integer': 'Offset must be an integer',
        'number.min': 'Offset must be at least 0'
      }),
    startDate: Joi.date()
      .optional()
      .messages({
        'date.base': 'Start date must be a valid date'
      }),
    endDate: Joi.date()
      .optional()
      .messages({
        'date.base': 'End date must be a valid date'
      }),
    planId: Joi.string()
      .uuid()
      .optional()
      .messages({
        'string.guid': 'Plan ID must be a valid UUID'
      })
  })
};

// Profile schemas
const profileSchemas = {
  // Create profile schema - with detailed validation for all required fields
  create: Joi.object({
    userId: Joi.string()
      .uuid()
      .optional() // Optional because it's always overridden by controller from JWT
      .messages({
        'string.guid': 'User ID must be a valid UUID'
      }),
    name: Joi.string()
      .min(2)
      .max(100)
      .allow(null, '')
      .optional()
      .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 100 characters'
      }),
    age: Joi.number()
      .integer()
      .min(13)
      .max(120)
      .allow(null)
      .optional()
      .messages({
        'number.base': 'Age must be a number',
        'number.integer': 'Age must be a whole number',
        'number.min': 'Age must be at least 13 years',
        'number.max': 'Age cannot exceed 120 years'
      }),
    gender: Joi.string()
      .valid('male', 'female', 'other', 'prefer_not_to_say', 'non-binary', '')
      .allow(null)
      .optional()
      .messages({
        'any.only': 'Gender must be one of: male, female, other, prefer_not_to_say, non-binary, or empty string'
      }),
    height: Joi.alternatives()
      .try(
        // Metric (single number in cm)
        Joi.number().positive(),
        // Imperial (feet and inches)
        Joi.object({
          feet: Joi.number().integer().min(0).required().messages({
            'number.base': 'Feet must be a number',
            'number.integer': 'Feet must be a whole number',
            'number.min': 'Feet cannot be negative',
            'any.required': 'Feet is required for imperial height'
          }),
          inches: Joi.number().integer().min(0).max(11).required().messages({
            'number.base': 'Inches must be a number',
            'number.integer': 'Inches must be a whole number',
            'number.min': 'Inches cannot be negative',
            'number.max': 'Inches must be less than 12',
            'any.required': 'Inches is required for imperial height'
          })
        }).strict()
      )
      .allow(null)
      .optional()
      .messages({
        'alternatives.types': '"height" does not match any of the allowed types'
      }),
    weight: Joi.number()
      .positive()
      .allow(null)
      .optional()
      .messages({
        'number.base': 'Weight must be a number',
        'number.positive': 'Weight must be positive'
      }),
    unitPreference: Joi.string()
      .valid('metric', 'imperial')
      .optional()
      .messages({
        'any.only': 'Unit preference must be either metric or imperial'
      }),
    experienceLevel: Joi.string()
      .valid('beginner', 'intermediate', 'advanced')
      .allow(null)
      .optional()
      .messages({
        'any.only': 'Experience level must be one of: beginner, intermediate, advanced'
      }),
    goals: Joi.array()
      .items(Joi.string())
      .allow(null)
      .optional()
      .messages({
        'array.base': 'Goals must be an array'
      }),
    equipment: Joi.array()
      .items(Joi.string())
      .allow(null)
      .optional()
      .messages({
        'array.base': 'Equipment must be an array'
      }),
    exercisePreferences: Joi.array()
      .items(Joi.string())
      .allow(null)
      .optional()
      .messages({
        'array.base': 'Exercise preferences must be an array'
      }),
    equipmentPreferences: Joi.array()
      .items(Joi.string())
      .allow(null)
      .optional()
      .messages({
        'array.base': 'Equipment preferences must be an array'
      }),
    medicalConditions: Joi.array()
      .items(
        Joi.string()
          .trim()
          .min(1)
          .max(200)
          .pattern(/^[a-zA-Z0-9\s\-.,()_]+$/)
          .custom((value, helpers) => {
            // Healthcare data sanitization patterns
            const sanitized = value.trim();
            
            // Prevent XSS and script injection
            if (/<[^>]*>/g.test(sanitized) || /javascript:/i.test(sanitized)) {
              return helpers.error('medicalConditions.xss');
            }
            
            // Prevent SQL injection patterns
            if (/['";]|--|\*|DROP\s+TABLE|INSERT\s+INTO|DELETE\s+FROM/i.test(sanitized)) {
              return helpers.error('medicalConditions.sqlInjection');
            }
            
            // Prevent NoSQL injection patterns
            if (/\$[\w\.]+|\\u0000/g.test(sanitized)) {
              return helpers.error('medicalConditions.nosqlInjection');
            }
            
            // Validate medical terminology format (basic pattern)
            if (!/^[A-Za-z0-9\s\-.,()_]+$/.test(sanitized)) {
              return helpers.error('medicalConditions.invalidFormat');
            }
            
            return sanitized;
          })
          .messages({
            'string.base': 'Each medical condition must be a string',
            'string.empty': 'Medical condition cannot be empty',
            'string.min': 'Medical condition must be at least 1 character',
            'string.max': 'Medical condition cannot exceed 200 characters',
            'string.pattern.base': 'Medical condition contains invalid characters',
            'medicalConditions.xss': 'Medical condition contains potentially harmful content',
            'medicalConditions.sqlInjection': 'Medical condition contains invalid characters',
            'medicalConditions.nosqlInjection': 'Medical condition contains invalid encoding',
            'medicalConditions.invalidFormat': 'Medical condition format is invalid'
          })
      )
      .max(10)
      .allow(null)
      .optional()
      .messages({
        'array.base': 'Medical conditions must be an array',
        'array.max': 'Cannot have more than 10 medical conditions'
      }),
    workoutFrequency: Joi.string()
      .allow(null)
      .optional()
      .messages({
        'string.base': 'Workout frequency must be a string'
      })
  }).options({ allowUnknown: false }), // Reject unknown fields
  
  // Update profile schema - allows partial updates with the same validation rules
  update: Joi.object({
    userId: Joi.string()
      .uuid()
      .optional() // Optional because it's always overridden by controller from JWT
      .messages({
        'string.guid': 'User ID must be a valid UUID'
      }),
    name: Joi.string()
      .min(2)
      .max(100)
      .allow(null, '')
      .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 100 characters'
      }),
    age: Joi.number()
      .integer()
      .min(13)
      .max(120)
      .allow(null)
      .optional()
      .messages({
        'number.base': 'Age must be a number',
        'number.integer': 'Age must be a whole number',
        'number.min': 'Age must be at least 13 years',
        'number.max': 'Age cannot exceed 120 years'
      }),
    gender: Joi.string()
      .valid('male', 'female', 'other', 'prefer_not_to_say', 'non-binary', '')
      .allow(null)
      .optional()
      .messages({
        'any.only': 'Gender must be one of: male, female, other, prefer_not_to_say, non-binary, or empty string'
      }),
    height: Joi.alternatives()
      .try(
        // Metric (single number in cm)
        Joi.number().positive(),
        // Imperial (feet and inches)
        Joi.object({
          feet: Joi.number().integer().min(0).required().messages({
            'number.base': 'Feet must be a number',
            'number.integer': 'Feet must be a whole number',
            'number.min': 'Feet cannot be negative',
            'any.required': 'Feet is required for imperial height'
          }),
          inches: Joi.number().integer().min(0).max(11).required().messages({
            'number.base': 'Inches must be a number',
            'number.integer': 'Inches must be a whole number',
            'number.min': 'Inches cannot be negative',
            'number.max': 'Inches must be less than 12',
            'any.required': 'Inches is required for imperial height'
          })
        }).strict()
      )
      .allow(null)
      .optional()
      .messages({
        'alternatives.types': '"height" does not match any of the allowed types'
      }),
    weight: Joi.number()
      .positive()
      .allow(null)
      .optional()
      .messages({
        'number.base': 'Weight must be a number',
        'number.positive': 'Weight must be positive'
      }),
    unitPreference: Joi.string()
      .valid('metric', 'imperial')
      .optional()
      .messages({
        'any.only': 'Unit preference must be either metric or imperial'
      }),
    experienceLevel: Joi.string()
      .valid('beginner', 'intermediate', 'advanced')
      .allow(null)
      .optional()
      .messages({
        'any.only': 'Experience level must be one of: beginner, intermediate, advanced'
      }),
    goals: Joi.array()
      .items(Joi.string())
      .allow(null)
      .optional()
      .messages({
        'array.base': 'Goals must be an array'
      }),
    equipment: Joi.array()
      .items(Joi.string())
      .allow(null)
      .optional()
      .messages({
        'array.base': 'Equipment must be an array'
      }),
    exercisePreferences: Joi.array()
      .items(Joi.string())
      .allow(null)
      .optional()
      .messages({
        'array.base': 'Exercise preferences must be an array'
      }),
    equipmentPreferences: Joi.array()
      .items(Joi.string())
      .allow(null)
      .optional()
      .messages({
        'array.base': 'Equipment preferences must be an array'
      }),
    medicalConditions: Joi.array()
      .items(
        Joi.string()
          .trim()
          .min(1)
          .max(200)
          .pattern(/^[a-zA-Z0-9\s\-.,()_]+$/)
          .custom((value, helpers) => {
            // Healthcare data sanitization patterns
            const sanitized = value.trim();
            
            // Prevent XSS and script injection
            if (/<[^>]*>/g.test(sanitized) || /javascript:/i.test(sanitized)) {
              return helpers.error('medicalConditions.xss');
            }
            
            // Prevent SQL injection patterns
            if (/['";]|--|\*|DROP\s+TABLE|INSERT\s+INTO|DELETE\s+FROM/i.test(sanitized)) {
              return helpers.error('medicalConditions.sqlInjection');
            }
            
            // Prevent NoSQL injection patterns
            if (/\$[\w\.]+|\\u0000/g.test(sanitized)) {
              return helpers.error('medicalConditions.nosqlInjection');
            }
            
            // Validate medical terminology format (basic pattern)
            if (!/^[A-Za-z0-9\s\-.,()_]+$/.test(sanitized)) {
              return helpers.error('medicalConditions.invalidFormat');
            }
            
            return sanitized;
          })
          .messages({
            'string.base': 'Each medical condition must be a string',
            'string.empty': 'Medical condition cannot be empty',
            'string.min': 'Medical condition must be at least 1 character',
            'string.max': 'Medical condition cannot exceed 200 characters',
            'string.pattern.base': 'Medical condition contains invalid characters',
            'medicalConditions.xss': 'Medical condition contains potentially harmful content',
            'medicalConditions.sqlInjection': 'Medical condition contains invalid characters',
            'medicalConditions.nosqlInjection': 'Medical condition contains invalid encoding',
            'medicalConditions.invalidFormat': 'Medical condition format is invalid'
          })
      )
      .max(10)
      .allow(null)
      .optional()
      .messages({
        'array.base': 'Medical conditions must be an array',
        'array.max': 'Cannot have more than 10 medical conditions'
      }),
    workoutFrequency: Joi.string()
      .allow(null)
      .optional()
      .messages({
        'string.base': 'Workout frequency must be a string'
      })
  }).options({ allowUnknown: false }), // Reject unknown fields
  
  // Profile preferences schema - for updating only preference-related fields
  preferences: Joi.object({
    unitPreference: Joi.string()
      .valid('metric', 'imperial')
      .optional()
      .messages({
        'any.only': 'Unit preference must be either metric or imperial'
      }),
    goals: Joi.array()
      .items(Joi.string())
      .optional()
      .messages({
        'array.base': 'Goals must be an array'
      }),
    equipment: Joi.array()
      .items(Joi.string())
      .optional()
      .messages({
        'array.base': 'Equipment must be an array'
      }),
    experienceLevel: Joi.string()
      .valid('beginner', 'intermediate', 'advanced')
      .allow(null)
      .optional()
      .messages({
        'any.only': 'Experience level must be one of: beginner, intermediate, advanced'
      }),
    workoutFrequency: Joi.string()
      .allow(null)
      .optional()
      .messages({
        'string.base': 'Workout frequency must be a string'
    })
  }).min(1).messages({
    'object.min': 'At least one preference field is required'
  })
};

/**
 * Schema for validating body measurements
 */
const measurementsSchema = Joi.object({
  waist: Joi.number().positive().optional(),
  chest: Joi.number().positive().optional(),
  arms: Joi.number().positive().optional(),
  legs: Joi.number().positive().optional(),
  hips: Joi.number().positive().optional(),
  shoulders: Joi.number().positive().optional(),
  neck: Joi.number().positive().optional()
}).optional();

/**
 * Schema for validating check-in data
 */
const checkInSchema = Joi.object({
  date: Joi.date().required(),
  weight: Joi.number().positive().optional(),
  body_fat_percentage: Joi.number().min(0).max(50).optional(),
  measurements: measurementsSchema,
  mood: Joi.string().valid('poor', 'fair', 'good', 'excellent').optional(),
  sleep_quality: Joi.string().valid('poor', 'fair', 'good', 'excellent').optional(),
  energy_level: Joi.number().integer().min(1).max(10).optional(),
  stress_level: Joi.number().integer().min(1).max(10).optional(),
  notes: Joi.string().max(500).optional()
}).messages({
  'date.required': 'Date is required',
  'number.positive': 'Measurement must be a positive number',
  'number.min': 'Value must be at least {#limit}',
  'number.max': 'Value cannot exceed {#limit}',
  'number.integer': 'Value must be an integer',
  'string.max': 'Notes cannot exceed {#limit} characters'
});

/**
 * Schema for validating metrics calculation parameters
 */
const metricCalculationSchema = Joi.object({
  startDate: Joi.date().required(),
  endDate: Joi.date().required().min(Joi.ref('startDate'))
}).messages({
  'date.required': 'Start and end dates are required',
  'date.min': 'End date must be after start date'
});

/**
 * Middleware for validating check-in data
 */
function validateCheckIn(req, res, next) {
  const { error, value } = checkInSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const messages = error.details.map(detail => detail.message);
    return res.status(400).json({
      status: 'error',
      message: 'Invalid check-in data',
      details: messages
    });
  }
  
  req.body = value;
  next();
}

/**
 * Middleware for validating metrics calculation parameters
 */
function validateMetricsCalculation(req, res, next) {
  const { error, value } = metricCalculationSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const messages = error.details.map(detail => detail.message);
    return res.status(400).json({
      status: 'error',
      message: 'Invalid metrics calculation parameters',
      details: messages
    });
  }
  
  req.body = value;
  next();
}

/**
 * Schema for validating macro calculation inputs
 */
const macroCalculationSchema = Joi.object({
  weight: Joi.number().min(20).max(300).required()
    .messages({
      'number.min': 'Weight must be at least 20 kg (44 lbs)',
      'number.max': 'Weight must be at most 300 kg (660 lbs)',
      'any.required': 'Weight is required'
    }),
  
  height: Joi.alternatives().try(
    // Metric (cm)
    Joi.number().min(50).max(250).messages({
      'number.min': 'Height must be at least 50 cm (1\'8")',
      'number.max': 'Height must be at most 250 cm (8\'2")'
    }),
    // Imperial (ft/in)
    Joi.object({
      feet: Joi.number().integer().min(3).max(8).required()
        .messages({
          'number.min': 'Feet must be at least 3',
          'number.max': 'Feet must be at most 8'
        }),
      inches: Joi.number().min(0).max(11.99).required()
        .messages({
          'number.min': 'Inches must be between 0 and 11.99',
          'number.max': 'Inches must be between 0 and 11.99'
        })
    }).messages({
      'object.base': 'Height must be a number (cm) or an object with feet and inches'
    })
  ).required().messages({
    'any.required': 'Height is required'
  }),
  
  age: Joi.number().integer().min(13).max(120).required()
    .messages({
      'number.min': 'Age must be at least 13',
      'number.max': 'Age must be at most 120',
      'any.required': 'Age is required'
    }),
  
  gender: Joi.string().valid('male', 'female', 'other').required()
    .messages({
      'any.only': 'Gender must be one of: male, female, other',
      'any.required': 'Gender is required'
    }),
  
  activityLevel: Joi.string().valid('sedentary', 'light', 'moderate', 'active', 'very_active').required()
    .messages({
      'any.only': 'Activity level must be one of: sedentary, light, moderate, active, very_active',
      'any.required': 'Activity level is required'
    }),
  
  goal: Joi.string().valid('weight_loss', 'maintenance', 'muscle_gain').required()
    .messages({
      'any.only': 'Goal must be one of: weight_loss, maintenance, muscle_gain',
      'any.required': 'Goal is required'
    }),
  
  // Optional fields
  units: Joi.string().valid('metric', 'imperial').default('metric'),
  
  useExternalApi: Joi.boolean().default(true)
});

/**
 * Middleware to validate macro calculation request
 */
function validateMacroCalculation(req, res, next) {
  const { error, value } = macroCalculationSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    return res.status(400).json({
      status: 'error',
      message: 'Invalid macro calculation input',
      errors: errorMessages
    });
  }
  
  // Convert imperial to metric if needed
  if (value.units === 'imperial') {
    // Convert weight from lbs to kg
    value.weight = Math.round(value.weight / 2.20462 * 10) / 10;
    
    // Convert height from ft/in to cm
    if (typeof value.height === 'object') {
      const totalInches = (value.height.feet * 12) + value.height.inches;
      value.height = Math.round(totalInches * 2.54);
    }
  }
  
  // Update the request body with validated and converted values
  req.body = value;
  next();
}

/**
 * Schema for validating notification preferences
 */
const notificationPreferencesSchema = Joi.object({
  email_enabled: Joi.boolean().optional(),
  sms_enabled: Joi.boolean().optional(),
  push_enabled: Joi.boolean().optional(),
  in_app_enabled: Joi.boolean().optional(),
  quiet_hours_start: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).optional()
    .messages({ 'string.pattern.base': 'Quiet hours must be in HH:MM format (e.g., 14:30)' }),
  quiet_hours_end: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).optional()
    .messages({ 'string.pattern.base': 'Quiet hours must be in HH:MM format (e.g., 14:30)' })
});

/**
 * Middleware for validating notification preferences
 */
function validateNotificationPreferences(req, res, next) {
  const { error, value } = notificationPreferencesSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const messages = error.details.map(detail => detail.message);
    return res.status(400).json({
      status: 'error',
      message: 'Invalid notification preferences',
      details: messages
    });
  }
  
  req.body = value;
  next();
}

// Export middleware and schemas
module.exports = {
  validate,
  formatValidationError,

  // Schemas (useful if needed elsewhere, but not for direct route middleware)
  userSchemas,
  workoutSchemas, // This will export the object containing workoutGenerationSchema etc.
  profileSchemas,
  measurementsSchema,
  checkInSchema,
  metricCalculationSchema,
  macroCalculationSchema,
  notificationPreferencesSchema,

  schemas: { // Nested schemas for organization if preferred
    user: userSchemas,
    workout: workoutSchemas,
    profile: profileSchemas
  },

  // User Validation Middleware
  validateRegistration: validate(userSchemas.register, 'body'),
  validateLogin: validate(userSchemas.login, 'body'),
  validateRefreshToken: validate(userSchemas.refresh, 'body'),
  // TODO: Add validateProfileUpdate: validate(userSchemas.updateProfile, 'body'), // if updateProfile schema is in userSchemas

  // Profile Validation Middleware
  // Assuming profileSchemas like profileSchemas.create, profileSchemas.update exist:
  validateProfileCreation: validate(profileSchemas.create, 'body'),
  validateProfileUpdate: validate(profileSchemas.update, 'body'),
  validateProfilePreferences: validate(profileSchemas.preferences, 'body'),

  // Workout Validation Middleware
  validateWorkoutGeneration: validate(workoutSchemas.workoutGenerationSchema, 'body'),
  validateWorkoutReGeneration: validate(workoutSchemas.workoutReGenerationSchema, 'body'), // If you have this schema
  validateWorkoutAdjustment: validate(workoutSchemas.workoutAdjustmentSchema, 'body'),
  validateWorkoutQuery: validate(workoutSchemas.workoutQuerySchema, 'query'),

  // Workout Log Validation Middleware
  validateWorkoutLog: validate(workoutSchemas.workoutLogSchema, 'body'),
  validateWorkoutLogUpdate: validate(workoutSchemas.workoutLogUpdateSchema, 'body'),
  validateWorkoutLogQuery: validate(workoutSchemas.workoutLogQuerySchema, 'query'),

  // Other specific validation functions (ensure these are actual middleware (req,res,next) functions)
  validateCheckIn,
  validateMetricsCalculation,
  validateMacroCalculation,
  validateNotificationPreferences
}; 