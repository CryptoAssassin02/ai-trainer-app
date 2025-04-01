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
  
  return {
    status: 'error',
    message: 'Validation failed',
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
    
    // Validate data against schema
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });
    
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

// Workout schemas
const workoutSchemas = {
  // Create workout schema
  create: Joi.object({
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
    workoutDuration: Joi.number()
      .integer()
      .min(10)
      .max(120)
      .required()
      .messages({
        'number.min': 'Workout duration must be at least 10 minutes',
        'number.max': 'Workout duration cannot exceed 120 minutes',
        'any.required': 'Workout duration is required'
      }),
    workoutFrequency: Joi.number()
      .integer()
      .min(1)
      .max(7)
      .required()
      .messages({
        'number.min': 'Workout frequency must be at least 1 day per week',
        'number.max': 'Workout frequency cannot exceed 7 days per week',
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
  
  // Update workout schema
  update: Joi.object({
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
    workoutDuration: Joi.number()
      .integer()
      .min(10)
      .max(120),
    workoutFrequency: Joi.number()
      .integer()
      .min(1)
      .max(7),
    additionalNotes: Joi.string()
      .max(500)
      .allow('')
  }).min(1)
};

// Profile schemas
const profileSchemas = {
  // Create profile schema - with detailed validation for all required fields
  create: Joi.object({
    name: Joi.string()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 100 characters',
        'any.required': 'Name is required'
      }),
    age: Joi.number()
      .integer()
      .min(13)
      .max(120)
      .required()
      .messages({
        'number.base': 'Age must be a number',
        'number.integer': 'Age must be a whole number',
        'number.min': 'Age must be at least 13 years',
        'number.max': 'Age cannot exceed 120 years',
        'any.required': 'Age is required'
      }),
    gender: Joi.string()
      .valid('male', 'female', 'other', 'prefer_not_to_say')
      .required()
      .messages({
        'any.only': 'Gender must be one of: male, female, other, prefer_not_to_say',
        'any.required': 'Gender is required'
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
          inches: Joi.number().min(0).max(11.99).required().messages({
            'number.base': 'Inches must be a number',
            'number.min': 'Inches cannot be negative',
            'number.max': 'Inches must be less than 12',
            'any.required': 'Inches is required for imperial height'
          })
        })
      )
      .required()
      .messages({
        'alternatives.types': 'Height must be a positive number for metric units, or an object with feet and inches for imperial units',
        'any.required': 'Height is required'
      }),
    weight: Joi.number()
      .positive()
      .required()
      .messages({
        'number.base': 'Weight must be a number',
        'number.positive': 'Weight must be positive',
        'any.required': 'Weight is required'
      }),
    unitPreference: Joi.string()
      .valid('metric', 'imperial')
      .required()
      .messages({
        'any.only': 'Unit preference must be either metric or imperial',
        'any.required': 'Unit preference is required'
      }),
    activityLevel: Joi.string()
      .valid('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active')
      .required()
      .messages({
        'any.only': 'Activity level must be one of: sedentary, lightly_active, moderately_active, very_active, extremely_active',
        'any.required': 'Activity level is required'
      }),
    fitnessGoals: Joi.array()
      .items(Joi.string())
      .default([])
      .messages({
        'array.base': 'Fitness goals must be an array'
      }),
    healthConditions: Joi.array()
      .items(Joi.string())
      .default([])
      .messages({
        'array.base': 'Health conditions must be an array'
      }),
    equipment: Joi.array()
      .items(Joi.string())
      .default([])
      .messages({
        'array.base': 'Equipment must be an array'
      }),
    experienceLevel: Joi.string()
      .valid('beginner', 'intermediate', 'advanced')
      .default('beginner')
      .messages({
        'any.only': 'Experience level must be one of: beginner, intermediate, advanced'
      })
  }),
  
  // Update profile schema - allows partial updates with the same validation rules
  update: Joi.object({
    name: Joi.string()
      .min(2)
      .max(100)
      .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 100 characters'
      }),
    age: Joi.number()
      .integer()
      .min(13)
      .max(120)
      .messages({
        'number.base': 'Age must be a number',
        'number.integer': 'Age must be a whole number',
        'number.min': 'Age must be at least 13 years',
        'number.max': 'Age cannot exceed 120 years'
      }),
    gender: Joi.string()
      .valid('male', 'female', 'other', 'prefer_not_to_say')
      .messages({
        'any.only': 'Gender must be one of: male, female, other, prefer_not_to_say'
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
          inches: Joi.number().min(0).max(11.99).required().messages({
            'number.base': 'Inches must be a number',
            'number.min': 'Inches cannot be negative',
            'number.max': 'Inches must be less than 12',
            'any.required': 'Inches is required for imperial height'
          })
        })
      )
      .messages({
        'alternatives.types': 'Height must be a positive number for metric units, or an object with feet and inches for imperial units'
      }),
    weight: Joi.number()
      .positive()
      .messages({
        'number.base': 'Weight must be a number',
        'number.positive': 'Weight must be positive'
      }),
    unitPreference: Joi.string()
      .valid('metric', 'imperial')
      .messages({
        'any.only': 'Unit preference must be either metric or imperial'
      }),
    activityLevel: Joi.string()
      .valid('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active')
      .messages({
        'any.only': 'Activity level must be one of: sedentary, lightly_active, moderately_active, very_active, extremely_active'
      }),
    fitnessGoals: Joi.array()
      .items(Joi.string())
      .messages({
        'array.base': 'Fitness goals must be an array'
      }),
    healthConditions: Joi.array()
      .items(Joi.string())
      .messages({
        'array.base': 'Health conditions must be an array'
      }),
    equipment: Joi.array()
      .items(Joi.string())
      .messages({
        'array.base': 'Equipment must be an array'
      }),
    experienceLevel: Joi.string()
      .valid('beginner', 'intermediate', 'advanced')
      .messages({
        'any.only': 'Experience level must be one of: beginner, intermediate, advanced'
      })
  }).min(1).messages({
    'object.min': 'At least one field is required for profile update'
  }),
  
  // Profile preferences schema - for updating only preference-related fields
  preferences: Joi.object({
    unitPreference: Joi.string()
      .valid('metric', 'imperial')
      .messages({
        'any.only': 'Unit preference must be either metric or imperial'
      }),
    fitnessGoals: Joi.array()
      .items(Joi.string())
      .messages({
        'array.base': 'Fitness goals must be an array'
      }),
    equipment: Joi.array()
      .items(Joi.string())
      .messages({
        'array.base': 'Equipment must be an array'
      }),
    experienceLevel: Joi.string()
      .valid('beginner', 'intermediate', 'advanced')
      .messages({
        'any.only': 'Experience level must be one of: beginner, intermediate, advanced'
      }),
    notificationPreferences: Joi.object({
      email: Joi.boolean().default(true),
      push: Joi.boolean().default(true),
      frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'none').default('weekly')
    }).messages({
      'object.base': 'Notification preferences must be an object'
    })
  }).min(1).messages({
    'object.min': 'At least one preference field is required'
  })
};

// Export middleware and schemas
module.exports = {
  validate,
  userSchemas,
  workoutSchemas,
  profileSchemas,
  schemas: {
    user: userSchemas,
    workout: workoutSchemas,
    profile: profileSchemas
  },
  // Expose individual profile schemas for direct import
  validateProfile: profileSchemas.create,
  validatePartialProfile: profileSchemas.update,
  validateProfilePreferences: profileSchemas.preferences
}; 