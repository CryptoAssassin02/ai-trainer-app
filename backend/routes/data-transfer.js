/**
 * @fileoverview Data Transfer Routes
 * Defines API endpoints for data export and import with proper security
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const dataTransferController = require('../controllers/data-transfer');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Joi = require('joi');
const logger = require('../config/logger');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename with timestamp and original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// Configure file upload middleware with size and type restrictions
const upload = multer({
  storage,
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only specific mime types
    const validTypes = [
      'text/csv',
      'application/json',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (validTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  }
});

// Custom error handler for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Handle Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: 'File size exceeds the 10MB limit.'
      });
    }
    return res.status(400).json({
      status: 'error',
      message: `File upload error: ${err.message}`
    });
  } else if (err) {
    // Handle other errors
    return res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
  next();
};

// Rate limiting configurations
const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // 5 requests per hour
  message: {
    status: 'error',
    message: 'Too many export requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip // Use user ID if available, otherwise IP
});

const importLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 3, // 3 requests per hour
  message: {
    status: 'error',
    message: 'Too many import requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip // Use user ID if available, otherwise IP
});

// Validation schemas
const exportSchema = Joi.object({
  format: Joi.string()
    .valid('json', 'csv', 'xlsx', 'pdf')
    .required()
    .messages({
      'any.required': 'Export format is required',
      'any.only': 'Format must be one of: json, csv, xlsx, pdf'
    }),
  dataTypes: Joi.array()
    .items(Joi.string().valid('profiles', 'workouts', 'workout_logs'))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one data type must be specified',
      'any.required': 'Data types are required',
      'any.only': 'Data types must be one of: profiles, workouts, workout_logs'
    })
});

// Routes

/**
 * @route POST /v1/export
 * @desc Export user data in specified format
 * @access Private
 */
router.post('/v1/export',
  authenticate,
  exportLimiter,
  validate(exportSchema),
  dataTransferController.exportData
);

/**
 * @route POST /v1/import
 * @desc Import data from uploaded file
 * @access Private
 */
router.post('/v1/import',
  authenticate,
  importLimiter,
  upload.single('file'),
  handleMulterError,
  dataTransferController.importData
);

module.exports = router; 