# Error Handling Patterns Guide

## Overview

This document provides a comprehensive guide to error handling patterns within the trAIner application, covering the complete error management lifecycle from custom error classes and middleware handling to logging and client responses. The patterns described here are based on the actual implementation found throughout the backend codebase.

## Table of Contents

- [Error Class Hierarchy](#error-class-hierarchy)
- [Middleware Error Handling](#middleware-error-handling)
- [Validation Error Patterns](#validation-error-patterns)
- [Service Layer Error Handling](#service-layer-error-handling)
- [Agent-Specific Error Management](#agent-specific-error-management)
- [Database Error Mapping](#database-error-mapping)
- [Logging and Monitoring](#logging-and-monitoring)
- [Client Response Patterns](#client-response-patterns)
- [Environment-Specific Behavior](#environment-specific-behavior)
- [Best Practices](#best-practices)

---

## Error Class Hierarchy

### Base Error Classes

The application implements a structured error hierarchy with operational vs programming error distinction:

#### ApiError Base Class (`backend/utils/errors.js`)
```javascript
class ApiError extends Error {
  constructor(message, statusCode, details = null, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational; // Operational vs programming error flag
    
    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}
```

**Key Features:**
- **Operational Flag**: Distinguishes between expected business logic errors and unexpected programming errors
- **Status Code Mapping**: Direct HTTP status code association
- **Details Object**: Structured additional error information
- **Stack Trace Preservation**: Maintains debugging information

### HTTP Status-Specific Error Classes

#### Validation Errors (400 Bad Request)
```javascript
class ValidationError extends ApiError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 400, details);
    this.code = 'VALIDATION_ERROR';
    
    // Format validation errors as array of {field, message} objects
    if (details) {
      if (Array.isArray(details)) {
        this.errors = details.map(item => ({
          field: item.field || 'unknown',
          message: item.message || String(item)
        }));
      } else if (typeof details === 'object' && details.field) {
        this.errors = [{
          field: details.field, 
          message: details.message || message
        }];
      } else {
        this.errors = [{ field: 'unknown', message: String(details) }];
      }
    } else {
      this.errors = [{ field: 'unknown', message }];
    }
  }
}
```

#### Authentication Errors (401 Unauthorized)
```javascript
class AuthenticationError extends ApiError {
  constructor(message = 'Authentication required', details = null) {
    super(message, 401, details);
    this.code = 'AUTHENTICATION_ERROR';
  }
}
```

#### Authorization Errors (403 Forbidden)
```javascript
class AuthorizationError extends ApiError {
  constructor(message = 'Insufficient permissions', details = null) {
    super(message, 403, details);
    this.code = 'AUTHORIZATION_ERROR';
  }
}
```

#### Resource Not Found (404)
```javascript
class NotFoundError extends ApiError {
  constructor(message = 'Resource not found', details = null) {
    super(message, 404, details);
    this.code = 'NOT_FOUND_ERROR';
  }
}
```

#### Conflict Errors (409)
```javascript
class ConflictError extends ApiError {
  constructor(message = 'Resource conflict', details = null) {
    super(message, 409, details);
    this.code = 'CONFLICT_ERROR';
  }
}

class ConcurrencyConflictError extends ApiError {
  constructor(message = 'Resource was modified by another process', details = null) {
    super(message, 409, details, true);
    this.code = ERROR_CODES.CONCURRENCY_ERROR;
  }
}
```

#### Rate Limiting (429)
```javascript
class RateLimitError extends ApiError {
  constructor(message = 'Rate limit exceeded', details = null) {
    super(message, 429, details);
  }
}
```

#### Server Errors (500)
```javascript
class DatabaseError extends ApiError {
  constructor(message = 'Database operation failed', details = null) {
    super(message, 500, details);
    this.code = 'DATABASE_ERROR';
  }
}

class InternalError extends ApiError {
  constructor(message = 'Internal server error', details = null) {
    super(message, 500, details);
  }
}
```

#### Service Unavailable (503)
```javascript
class ServiceUnavailableError extends ApiError {
  constructor(message = 'Service unavailable', details = null) {
    super(message, 503, details);
  }
}
```

---

## Middleware Error Handling

### Global Error Handler (`backend/middleware/error-middleware.js`)

The global error handler provides centralized error processing with environment-aware behavior:

#### Error Processing Flow
```javascript
const globalErrorHandler = (err, req, res, next) => {
  // Prevent double responses
  if (res.headersSent) {
    return next(err);
  }

  // Handle AgentError specifically
  if (err instanceof AgentError) {
    const statusCode = mapAgentErrorToStatusCode(err.code);
    const logLevel = !err.isOperational || statusCode >= 500 ? 'error' : 'warn';
    
    logger[logLevel](`${req.method} ${req.originalUrl} [AgentError]`, {
      statusCode,
      errorCode: err.code, 
      message: err.message,
      details: err.details,
      isOperational: err.isOperational,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    
    return res.status(statusCode).json({
      status: 'error',
      message: err.message,
      errorCode: err.code,
      details: err.details
    });
  }
  
  // Handle API errors with operational status consideration
  let statusCode = err.statusCode || 500;
  let logLevel = err.isOperational && statusCode < 500 ? 'warn' : 'error';
  
  logger[logLevel](`${req.method} ${req.originalUrl}`, {
    statusCode,
    error: err.message,
    isOperational: err.isOperational,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    ...(err.details && { details: err.details })
  });
  
  const errorResponse = formatErrorResponse(err);
  res.status(statusCode).json(errorResponse);
};
```

### 404 Not Found Handler
```javascript
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Resource not found: ${req.originalUrl}`);
  next(error);
};
```

### Fatal Error Handling
```javascript
const handleFatalError = (error, source) => {
  logger.fatal(`UNHANDLED ERROR (${source}): ${error.message}`, {
    error: error.message,
    stack: error.stack,
    source
  });
  
  const server = global.server;
  if (server) {
    server.close(() => {
      logger.fatal('Server closed due to unhandled error. Exiting process.');
      process.exit(1);
    });
    
    // Force exit after timeout
    setTimeout(() => {
      logger.fatal('Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, 5000);
  } else {
    logger.fatal('Exiting process due to unhandled error.');
    process.exit(1);
  }
};
```

---

## File Upload Error Handling

### Multer Error Patterns (`backend/routes/data-transfer.js`)

The system implements comprehensive file upload error handling using Multer middleware:

#### File Upload Configuration and Validation
```javascript
// Configure multer with security restrictions
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    }
  }),
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
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
```

#### Multer Error Handler Middleware
```javascript
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Handle Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: 'File size exceeds the 10MB limit.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        status: 'error',
        message: 'Too many files uploaded.'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        status: 'error',
        message: 'Unexpected file field.'
      });
    }
    return res.status(400).json({
      status: 'error',
      message: `File upload error: ${err.message}`
    });
  } else if (err) {
    // Handle custom validation errors
    return res.status(400).json({
      status: 'error',
      message: err.message
    });
  }
  next();
};
```

### Rate Limiting Error Details

#### Rate Limit Configuration with Retry Headers
```javascript
const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    status: 'error',
    message: 'Too many export requests. Please try again later.'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    const retryAfter = Math.round(req.rateLimit.resetTime / 1000);
    
    res.set({
      'Retry-After': retryAfter,
      'X-RateLimit-Limit': req.rateLimit.limit,
      'X-RateLimit-Remaining': req.rateLimit.remaining,
      'X-RateLimit-Reset': new Date(req.rateLimit.resetTime).toISOString()
    });
    
    res.status(429).json({
      status: 'error',
      message: 'Rate limit exceeded',
      retryAfter: retryAfter,
      resetTime: new Date(req.rateLimit.resetTime).toISOString()
    });
  }
});
```

---

## AI-Specific Error Patterns

### AI Service Error Handling

The system implements specialized error handling for AI operations:

#### OpenAI API Error Classification
```javascript
// AI-specific error patterns
const handleAIServiceError = (error, operation) => {
  // OpenAI quota limits
  if (error.status === 429) {
    if (error.message.includes('quota')) {
      throw new AgentError(
        'AI service quota limit reached. Please try again later.',
        ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        { quotaType: 'monthly', service: 'openai' },
        error
      );
    }
    throw new RateLimitError('AI service rate limit exceeded', {
      retryAfter: error.headers?.['retry-after'] || 60
    });
  }
  
  // OpenAI timeout errors
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    throw new AgentError(
      'AI service request timed out. Please try again.',
      ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      { timeout: true, service: 'openai' },
      error
    );
  }
  
  // Content filtering errors
  if (error.status === 400 && error.message.includes('content_filter')) {
    throw new AgentError(
      'Content was filtered by AI safety systems.',
      ERROR_CODES.VALIDATION_ERROR,
      { contentFiltered: true },
      error
    );
  }
  
  // Model availability errors
  if (error.status === 503) {
    throw new AgentError(
      'AI model temporarily unavailable. Please try again.',
      ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      { modelUnavailable: true },
      error
    );
  }
  
  // Generic AI service error
  throw new AgentError(
    `AI service error during ${operation}`,
    ERROR_CODES.EXTERNAL_SERVICE_ERROR,
    { originalStatus: error.status },
    error
  );
};
```

### Cross-Feature Error Propagation

#### Transaction Rollback Scenarios
```javascript
// Cross-feature transaction error handling
const executeAnalyticsTransaction = async (operations) => {
  let client;
  try {
    client = await getPooledConnection('transaction');
    await client.query('BEGIN');
    
    const results = {};
    
    // Execute operations across multiple features
    for (const [feature, operation] of Object.entries(operations)) {
      try {
        results[feature] = await operation(client);
      } catch (error) {
        logger.error(`Transaction failed in ${feature}:`, error);
        
        // Rollback and propagate feature-specific error
        await client.query('ROLLBACK');
        
        throw new AgentError(
          `Cross-feature operation failed in ${feature}`,
          ERROR_CODES.CONCURRENCY_ERROR,
          { 
            feature,
            operationsCompleted: Object.keys(results),
            rollbackRequired: true
          },
          error
        );
      }
    }
    
    await client.query('COMMIT');
    return results;
    
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    if (client) client.release();
  }
};
```

---

## Frontend Error Handling Patterns

### React Error Boundaries

While this is a backend-focused guide, frontend integration requires understanding these patterns:

#### Error Boundary Implementation Strategy
```javascript
// Frontend error handling coordination with backend error types
class APIErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    // Log to backend with error correlation
    this.logErrorToBackend(error, errorInfo);
  }
  
  // Map backend error types to UI responses
  getErrorDisplayStrategy(error) {
    const errorCode = error.response?.data?.errorCode;
    
    switch (errorCode) {
      case 'VALIDATION_ERROR':
        return 'inline'; // Show inline with form fields
      case 'AUTHENTICATION_ERROR':
        return 'redirect'; // Redirect to login
      case 'RATE_LIMIT_ERROR':
        return 'toast'; // Show temporary toast
      case 'AGENT_PROCESSING_ERROR':
        return 'modal'; // Show retry modal
      default:
        return 'boundary'; // Show error boundary fallback
    }
  }
}
```

#### Retry Strategies Based on Error Codes
```javascript
// Frontend retry logic coordinated with backend error codes
const createRetryStrategy = (errorCode) => {
  const strategies = {
    'AGENT_EXTERNAL_SERVICE_ERROR': {
      maxRetries: 3,
      backoffMultiplier: 1.5,
      baseDelay: 1000
    },
    'DATABASE_ERROR': {
      maxRetries: 2,
      backoffMultiplier: 2,
      baseDelay: 2000
    },
    'CONCURRENCY_ERROR': {
      maxRetries: 5,
      backoffMultiplier: 1.2,
      baseDelay: 500
    },
    'RATE_LIMIT_ERROR': {
      maxRetries: 1,
      backoffMultiplier: 1,
      baseDelay: (error) => error.retryAfter * 1000 // Use server-provided retry time
    }
  };
  
  return strategies[errorCode] || { maxRetries: 0 };
};
```

#### Offline Error Queuing
```javascript
// Offline error handling and sync strategies
class OfflineErrorQueue {
  constructor() {
    this.errorQueue = [];
    this.isOnline = navigator.onLine;
    
    window.addEventListener('online', this.processOfflineErrors.bind(this));
    window.addEventListener('offline', () => { this.isOnline = false; });
  }
  
  handleOfflineError(error, operation) {
    if (!this.isOnline) {
      this.errorQueue.push({
        error,
        operation,
        timestamp: new Date().toISOString(),
        retryCount: 0
      });
      
      // Show offline notification
      this.showOfflineNotification();
      return;
    }
    
    // Handle normally if online
    throw error;
  }
  
  async processOfflineErrors() {
    this.isOnline = true;
    
    while (this.errorQueue.length > 0) {
      const { error, operation, retryCount } = this.errorQueue.shift();
      
      try {
        await operation.retry();
      } catch (retryError) {
        if (retryCount < 3) {
          this.errorQueue.push({ error, operation, retryCount: retryCount + 1 });
        } else {
          // Log permanent failure
          this.logPermanentFailure(error, operation);
        }
      }
    }
  }
}
```

---

## Validation Error Patterns

### Joi-Based Validation (`backend/middleware/validation.js`)

The validation system provides comprehensive input validation with detailed error reporting:

#### Validation Middleware Factory
```javascript
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    // Clean sensitive data (e.g., remove userId from body for profile routes)
    if (source === 'body' && req.originalUrl.includes('/profile') && req[source]) {
      const { userId, ...dataWithoutUserId } = req[source];
      req[source] = dataWithoutUserId;
    }
    
    // Validate with Joi
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      convert: true
    });
    
    if (error) {
      logger.warn('Validation failed', {
        path: req.originalUrl,
        errors: error.details.map(detail => detail.message)
      });
      
      return res.status(400).json(formatValidationError(error));
    }
    
    // Update request with sanitized data
    req[source] = value;
    next();
  };
};
```

#### Validation Error Formatting
```javascript
const formatValidationError = (error) => {
  const details = error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    type: detail.type
  }));
  
  const primaryMessage = details.length > 0 ? details[0].message : 'Validation failed';
  
  return {
    status: 'error',
    message: primaryMessage,
    errors: details
  };
};
```

#### Schema Examples
```javascript
const userSchemas = {
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
        'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character',
        'any.required': 'Password is required'
      }),
    name: Joi.string()
      .min(2)
      .max(100)
      .allow(null, '')
      .optional()
  })
};
```

---

## Service Layer Error Handling

### Service Error Patterns (`backend/services/profile-service.js`)

Services implement consistent error throwing patterns with proper error context:

#### Database Operation Error Handling
```javascript
async function getProfileByUserId(userId, jwtToken) {
  try {
    const supabase = getSupabaseClientWithToken(jwtToken);
    
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      // Map specific Supabase errors
      if (error.code === 'PGRST116') {
        logger.warn(`Profile not found for user: ${userId}`);
        throw new NotFoundError(`Profile not found for user: ${userId}`);
      }
      
      logger.error(`Database error in getProfileByUserId for user ${userId}:`, error);
      throw new InternalError('Failed to fetch user profile due to a database error', error);
    }
    
    if (!data) {
      logger.warn(`Profile data is null for user ${userId}`);
      throw new NotFoundError(`Profile not found for user: ${userId}`);
    }
    
    return convertProfileUnitsForResponse(data);

  } catch (error) {
    // Re-throw known errors
    if (error instanceof NotFoundError || error instanceof InternalError) {
      throw error;
    }
    
    // Wrap unknown errors
    logger.error(`Error in getProfileByUserId for user ${userId}:`, error);
    throw new InternalError('Failed to fetch user profile', error);
  }
}
```

#### Input Validation in Services
```javascript
function validateProfileData(profileData, isUpdate = false) {
  if (!profileData || typeof profileData !== 'object') {
    throw new ValidationError('Profile data is required and must be an object');
  }
  
  if (!isUpdate && !profileData.userId) {
    throw new ValidationError('User ID is required for profile creation');
  }
  
  // Additional validation logic...
}
```

#### Concurrency Conflict Handling
```javascript
const createProfile = async (profileData, jwtToken) => {
  const MAX_RETRY_ATTEMPTS = 3;
  let retryCount = 0;
  
  while (retryCount < MAX_RETRY_ATTEMPTS) {
    try {
      validateProfileData(profileData, false);
      const dbData = prepareProfileDataForStorage(profileData);
      
      const { data: newProfileData } = await supabase
        .from(PROFILES_TABLE)
        .insert(dbData)
        .select()
        .single();
      
      return convertProfileUnitsForResponse(newProfileData);
      
    } catch (error) {
      if (error.code === VERSION_CONFLICT_ERROR && retryCount < MAX_RETRY_ATTEMPTS - 1) {
        retryCount++;
        logger.warn(`Version conflict on profile creation, retrying (${retryCount}/${MAX_RETRY_ATTEMPTS})`);
        continue;
      }
      
      throw error;
    }
  }
};
```

---

## Agent-Specific Error Management

### AgentError Class with Standardized Codes

The AgentError class provides specialized error handling for AI agent operations:

#### Error Code Constants
```javascript
const ERROR_CODES = {
  VALIDATION_ERROR: 'AGENT_VALIDATION_ERROR',
  PROCESSING_ERROR: 'AGENT_PROCESSING_ERROR',
  EXTERNAL_SERVICE_ERROR: 'AGENT_EXTERNAL_SERVICE_ERROR',
  RESOURCE_ERROR: 'AGENT_RESOURCE_ERROR',
  MEMORY_SYSTEM_ERROR: 'AGENT_MEMORY_SYSTEM_ERROR',
  CONFIGURATION_ERROR: 'AGENT_CONFIGURATION_ERROR',
  CONCURRENCY_ERROR: 'AGENT_CONCURRENCY_ERROR'
};
```

#### AgentError Implementation
```javascript
class AgentError extends Error {
  constructor(
    message, 
    code = ERROR_CODES.PROCESSING_ERROR, 
    details = null, 
    originalError = null, 
    isOperational = true
  ) {
    super(message);
    this.name = 'AgentError';
    this.code = code;
    this.details = details;
    this.originalError = originalError;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
    
    // Chain original error stack
    if (originalError && originalError.stack) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
    }
  }
}
```

#### Agent Error Code Mapping
```javascript
const mapAgentErrorToStatusCode = (errorCode) => {
  const codeMapping = {
    [ERROR_CODES.VALIDATION_ERROR]: 400,
    [ERROR_CODES.PROCESSING_ERROR]: 500,
    [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 502,
    [ERROR_CODES.RESOURCE_ERROR]: 404,
    [ERROR_CODES.MEMORY_SYSTEM_ERROR]: 500,
    [ERROR_CODES.CONFIGURATION_ERROR]: 500,
    [ERROR_CODES.CONCURRENCY_ERROR]: 409
  };
  
  return codeMapping[errorCode] || 500;
};
```

---

## Database Error Mapping

### Supabase Error Handler (`backend/middleware/errorHandler.js`)

The system includes specialized mapping for database errors:

#### PostgreSQL Error Code Mapping
```javascript
const supabaseErrorHandler = (err) => {
  let apiError = new ApiError('Database operation failed', 500, err.message);
  
  switch (err.code) {
    case 'PGRST301':
      // Resource not found
      apiError = new AgentError(
        'Resource not found', 
        ERROR_CODES.RESOURCE_ERROR, 
        { code: err.code }, 
        err
      );
      break;
      
    case 'PGRST204':
      // No content - not actually an error
      return null;
      
    case '23505':
      // Unique violation
      apiError = new ApiError('Resource already exists', 409, err.message);
      break;
      
    case '23503':
      // Foreign key violation
      apiError = new AgentError(
        'Related resource not found', 
        ERROR_CODES.VALIDATION_ERROR, 
        { code: err.code }, 
        err
      );
      break;
      
    case '23502':
      // Not null violation
      apiError = new AgentError(
        'Missing required field', 
        ERROR_CODES.VALIDATION_ERROR, 
        { code: err.code }, 
        err
      );
      break;
      
    case '23514':
      // Check violation
      apiError = new AgentError(
        'Validation constraint failed', 
        ERROR_CODES.VALIDATION_ERROR, 
        { code: err.code }, 
        err
      );
      break;
      
    case '42601':
      // Syntax error
      apiError = new AgentError(
        'Invalid query syntax', 
        ERROR_CODES.EXTERNAL_SERVICE_ERROR, 
        { code: err.code }, 
        err
      );
      break;
      
    case '42501':
      // Insufficient privilege
      apiError = new ApiError('Insufficient database permissions', 403, err.message);
      break;
      
    default:
      apiError = new AgentError(
        'Database operation failed', 
        ERROR_CODES.EXTERNAL_SERVICE_ERROR, 
        { code: err.code }, 
        err
      );
  }
  
  return apiError;
};
```

---

## Logging and Monitoring

### Winston Logger Configuration (`backend/config/logger.js`)

The logging system provides structured error logging with environment-aware behavior:

#### Logger Setup
```javascript
const winston = require('winston');
const { format, transports } = winston;

const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.colorize(),
        format.printf(({ level, message, timestamp, stack, ...meta }) => {
          let logMessage = `${timestamp} ${level}: ${message}`;
          
          if (Object.keys(meta).length > 0) {
            logMessage += ` ${JSON.stringify(meta)}`;
          }
          
          if (stack) {
            logMessage += `\n${stack}`;
          }
          
          return logMessage;
        })
      )
    })
  ]
});
```

#### Request Correlation and Logging (`backend/server.js`)
```javascript
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = require('crypto').randomBytes(16).toString('hex');
  
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 500 ? 'error' : 
                     res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[logLevel](`${req.method} ${req.originalUrl} completed in ${duration}ms`, {
      ...logger.requestFormat(req, res),
      requestId,
      duration: `${duration}ms`
    });
  });
  
  next();
});
```

#### Error-Specific Logging Patterns
```javascript
// Service layer logging
logger.error('Error getting user profile', { 
  error: error.message,
  stack: error.stack,
  userId: userId
});

// Controller layer logging
logger.warn('Validation failed', {
  path: req.originalUrl,
  errors: error.details.map(detail => detail.message)
});

// Middleware logging with operational context
logger[logLevel](`${req.method} ${req.originalUrl}`, {
  statusCode,
  error: err.message,
  isOperational: err.isOperational,
  stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
});
```

---

## Client Response Patterns

### Standardized Error Response Format (`backend/utils/errors.js`)

The system provides consistent error response formatting across all endpoints:

#### Error Response Formatter
```javascript
const formatErrorResponse = (error) => {
  const response = {
    status: 'error',
    message: error.message
  };

  // Handle ValidationError with detailed field errors
  if (error instanceof ValidationError) {
    return {
      status: 'error',
      message: error.message,
      errors: error.errors,
      errorCode: 'VALIDATION_ERROR'
    };
  }
  
  // Handle ConcurrencyConflictError
  if (error instanceof ConcurrencyConflictError) {
    const formatted = {
      status: 'error',
      message: error.message,
      errorCode: ERROR_CODES.CONCURRENCY_ERROR
    };
    if (error.details) {
      formatted.details = error.details;
    }
    return formatted;
  }

  // Handle generic errors with environment awareness
  if (!(error instanceof ApiError)) {
    if (process.env.NODE_ENV === 'production') {
      if (error.isOperational) {
        return {
          status: 'error',
          message: error.message
        };
      } else {
        return {
          status: 'error',
          message: 'Internal server error'
        };
      }
    } else {
      return {
        status: 'error',
        message: error.message,
        errorDetails: error.message,
        errorCode: error.code || 'INTERNAL_SERVER_ERROR'
      };
    }
  }

  // Handle ApiError types
  if (error instanceof ApiError) {
    if (error.details) {
      response.details = error.details;
    }
    if (error.code) {
      response.errorCode = error.code;
    }
  }

  return response;
};
```

#### Controller Error Handling Pattern (`backend/controllers/profile.js`)
```javascript
const getProfile = async (req, res, next) => {
  try {
    const userId = req.params.userId || (req.user && req.user.id);
    
    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID is required'
      });
    }
    
    const profile = await profileService.getProfileByUserId(userId, jwtToken);
    
    return res.status(200).json({
      status: 'success',
      data: profile
    });
    
  } catch (error) {
    logger.error('Error getting user profile', { 
      error: error.message,
      stack: error.stack
    });
    
    // Handle specific error types with appropriate responses
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
    
    if (error instanceof ValidationError) {
      return res.status(400).json({
        status: 'error',
        message: error.message,
        details: error.details
      });
    }
    
    // Delegate to global error handler for other errors
    next(error);
  }
};
```

---

## Environment-Specific Behavior

### Development vs Production Error Handling

The system adapts error handling behavior based on the environment:

#### Development Environment
- **Stack Traces**: Full stack traces included in responses
- **Detailed Logging**: Debug-level logging enabled
- **Error Details**: Complete error information exposed
- **Console Output**: Colored console logging for better readability

#### Test Environment
- **Silent Operation**: Reduced logging to prevent test noise
- **Mock-Friendly**: Error patterns compatible with test mocking
- **Consistent Behavior**: Predictable error responses for testing

#### Production Environment
- **Security First**: No sensitive information in error responses
- **Minimal Exposure**: Generic error messages for non-operational errors
- **File Logging**: Structured logging to files with rotation
- **Performance Optimized**: Reduced logging overhead

#### Environment Configuration Examples
```javascript
// Development error response
{
  status: 'error',
  message: 'Database connection failed',
  errorDetails: 'Connection timeout after 30000ms',
  errorCode: 'DATABASE_ERROR',
  stack: 'Error: Database connection failed\n    at ...'
}

// Production error response (non-operational error)
{
  status: 'error',
  message: 'Internal server error'
}

// Production error response (operational error)
{
  status: 'error',
  message: 'Profile not found for user: abc123',
  errorCode: 'NOT_FOUND_ERROR'
}
```

---

## Best Practices

### 1. Error Classification

**✅ Do:**
- Use operational flag to distinguish business logic errors from bugs
- Implement specific error classes for different error types
- Provide meaningful error codes for programmatic handling
- Include sufficient context in error details

**❌ Don't:**
- Treat all errors the same way
- Expose internal system details in operational errors
- Use generic error messages for specific validation failures
- Mix user-facing messages with debugging information

### 2. Error Propagation

**✅ Do:**
- Let errors bubble up through the call stack naturally
- Re-throw known errors without wrapping unnecessarily
- Add context at appropriate layers
- Use `next(error)` in Express middleware for proper handling

**❌ Don't:**
- Swallow errors silently
- Wrap errors multiple times unnecessarily
- Break the error chain by catching and throwing new errors
- Handle errors at inappropriate layers

### 3. Logging Strategy

**✅ Do:**
- Log errors with appropriate severity levels
- Include request correlation IDs for tracing
- Use structured logging with relevant metadata
- Adapt logging verbosity to environment

**❌ Don't:**
- Log the same error multiple times
- Include sensitive data in log messages
- Use inappropriate log levels (e.g., 'error' for validation failures)
- Ignore the performance impact of excessive logging

### 4. Client Communication

**✅ Do:**
- Return consistent error response formats
- Provide actionable error messages
- Include field-level validation details
- Use appropriate HTTP status codes

**❌ Don't:**
- Expose stack traces in production
- Return database error messages directly
- Use misleading HTTP status codes
- Provide generic error messages for specific issues

### 5. Validation Patterns

**✅ Do:**
- Validate input at the application boundary
- Provide specific field-level error messages
- Use schema validation with proper error formatting
- Sanitize and convert input data

**❌ Don't:**
- Skip input validation
- Return cryptic validation error messages
- Allow invalid data to propagate through the system
- Validate the same data multiple times unnecessarily

### 6. Database Error Handling

**✅ Do:**
- Map database error codes to application errors
- Handle constraint violations appropriately
- Implement retry logic for transient failures
- Use proper transaction management

**❌ Don't:**
- Expose raw database errors to clients
- Ignore database constraint violations
- Retry non-transient errors
- Allow partial state updates to persist

### 7. Service Integration

**✅ Do:**
- Handle external service errors gracefully
- Implement circuit breaker patterns for unreliable services
- Provide fallback mechanisms where appropriate
- Log external service failures with proper context

**❌ Don't:**
- Let external service failures crash the application
- Retry indefinitely without backoff
- Ignore service degradation patterns
- Expose third-party error messages directly

---

## Conclusion

This comprehensive error handling guide provides the foundation for robust error management throughout the trAIner application. The patterns described here ensure consistent error handling, proper logging, and appropriate client communication while maintaining security and performance standards.

The implementation emphasizes operational error classification, environment-aware behavior, and structured error propagation to create a maintainable and debuggable error handling system. For specific implementation examples, refer to the actual source files mentioned throughout this document. 