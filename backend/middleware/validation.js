const Joi = require('joi');
const { logger } = require('../config/config');

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      logger.warn('Validation error:', error.details);
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    next();
  };
};

// Common validation schemas
const schemas = {
  workout: Joi.object({
    fitnessLevel: Joi.string().valid('beginner', 'intermediate', 'advanced').required(),
    goals: Joi.array().items(Joi.string()).min(1).required(),
    equipment: Joi.array().items(Joi.string()),
    restrictions: Joi.array().items(Joi.string()),
    exerciseTypes: Joi.array().items(Joi.string()),
    workoutFrequency: Joi.string().required()
  }),

  profile: Joi.object({
    height: Joi.number().positive().required(),
    weight: Joi.number().positive().required(),
    age: Joi.number().integer().min(13).required(),
    gender: Joi.string().valid('male', 'female', 'other').required(),
    preferences: Joi.object({
      units: Joi.string().valid('metric', 'imperial').required(),
      exerciseTypes: Joi.array().items(Joi.string()),
      equipment: Joi.array().items(Joi.string()),
      workoutFrequency: Joi.string()
    }).required()
  })
};

module.exports = {
  validate,
  schemas
}; 