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
      .required()
      .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 100 characters',
        'any.required': 'Name is required'
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
  // Create profile schema
  create: Joi.object({
    height: Joi.object({
      value: Joi.number().positive().required(),
      unit: Joi.string().valid('cm', 'ft').required()
    }).required(),
    weight: Joi.object({
      value: Joi.number().positive().required(),
      unit: Joi.string().valid('kg', 'lb').required()
    }).required(),
    age: Joi.number()
      .integer()
      .min(13)
      .max(100)
      .required()
      .messages({
        'number.min': 'Age must be at least 13 years',
        'number.max': 'Age cannot exceed 100 years',
        'any.required': 'Age is required'
      }),
    gender: Joi.string()
      .valid('male', 'female', 'other', 'prefer_not_to_say')
      .required()
      .messages({
        'any.only': 'Gender must be one of: male, female, other, prefer_not_to_say',
        'any.required': 'Gender is required'
      }),
    activityLevel: Joi.string()
      .valid('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active')
      .required()
      .messages({
        'any.only': 'Activity level must be one of: sedentary, lightly_active, moderately_active, very_active, extremely_active',
        'any.required': 'Activity level is required'
      }),
    dietaryPreferences: Joi.array()
      .items(Joi.string())
      .default([]),
    healthConditions: Joi.array()
      .items(Joi.string())
      .default([])
  }),
  
  // Update profile schema
  update: Joi.object({
    height: Joi.object({
      value: Joi.number().positive().required(),
      unit: Joi.string().valid('cm', 'ft').required()
    }),
    weight: Joi.object({
      value: Joi.number().positive().required(),
      unit: Joi.string().valid('kg', 'lb').required()
    }),
    age: Joi.number()
      .integer()
      .min(13)
      .max(100),
    gender: Joi.string()
      .valid('male', 'female', 'other', 'prefer_not_to_say'),
    activityLevel: Joi.string()
      .valid('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active'),
    dietaryPreferences: Joi.array()
      .items(Joi.string()),
    healthConditions: Joi.array()
      .items(Joi.string())
  }).min(1)
};

// Export middleware and schemas
module.exports = {
  validate,
  schemas: {
    user: userSchemas,
    workout: workoutSchemas,
    profile: profileSchemas
  }
}; 