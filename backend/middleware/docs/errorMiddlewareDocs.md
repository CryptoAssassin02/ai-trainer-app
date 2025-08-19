# Error Middleware Documentation

## Overview

The error middleware provides standardized error handling for the Express application, including 404 handling for undefined routes, global error handling with consistent response formatting, and fatal error handling for uncaught exceptions. It integrates with custom error classes and provides comprehensive logging.

**Location**: `backend/middleware/error-middleware.js`  
**Dependencies**: Custom error utilities, logger configuration  
**Type**: Application-level error handling

## Core Error Handling Components

### 404 Not Found Handler

#### Purpose
Handles requests to undefined routes by creating standardized 404 errors.

#### Implementation
```javascript
notFoundHandler(req, res, next)
```

**Functionality**:
- Intercepts requests that don't match any defined routes
- Creates `NotFoundError` with request URL information
- Passes error to global error handler via `next(error)`
- Must be placed after all route definitions

**Usage**:
```javascript
// Place after all routes
app.use('*', notFoundHandler);
```

### Global Error Handler

#### Purpose
Centralized error processing that formats all errors into standardized API responses with appropriate logging.

#### Implementation
```javascript
globalErrorHandler(err, req, res, next)
```

**Error Type Handling**:

#### AgentError Handling
```javascript
if (err instanceof AgentError) {
  const statusCode = mapAgentErrorToStatusCode(err.code);
  const logLevel = !err.isOperational || statusCode >= 500 ? 'error' : 'warn';
  
  // Specialized logging for agent errors
  logger[logLevel](`${req.method} ${req.originalUrl} [AgentError]`, {
    statusCode,
    errorCode: err.code,
    message: err.message,
    details: err.details,
    isOperational: err.isOperational
  });
}
```

**Agent Error Code Mapping**:
```javascript
const codeMapping = {
  [ERROR_CODES.VALIDATION_ERROR]: 400,     // Bad Request
  [ERROR_CODES.PROCESSING_ERROR]: 500,     // Internal Server Error
  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 502, // Bad Gateway
  [ERROR_CODES.RESOURCE_ERROR]: 404,       // Not Found
  [ERROR_CODES.MEMORY_SYSTEM_ERROR]: 500,  // Internal Server Error
  [ERROR_CODES.CONFIGURATION_ERROR]: 500,  // Internal Server Error
  [ERROR_CODES.CONCURRENCY_ERROR]: 409     // Conflict
};
```

#### Generic Error Handling
```javascript
// Determine logging level
let logLevel = 'error';
if (err.isOperational && statusCode < 500) {
  logLevel = 'warn';
}

// Log with appropriate detail level
logger[logLevel](`${req.method} ${req.originalUrl}`, {
  statusCode,
  error: err.message,
  isOperational: err.isOperational,
  stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
});
```

### Fatal Error Handler

#### Purpose
Handles uncaught exceptions and unhandled promise rejections with graceful shutdown.

#### Implementation
```javascript
handleFatalError(error, source)
```

**Shutdown Process**:
1. **Log Fatal Error**: Critical level logging with full stack trace
2. **Graceful Server Close**: Allow existing requests to complete
3. **Timeout Protection**: Force exit if shutdown takes > 5 seconds
4. **Process Exit**: Terminate with error code 1

**Integration**:
```javascript
process.on('uncaughtException', (error) => {
  handleFatalError(error, 'uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  handleFatalError(reason, 'unhandledRejection');
});
```

## Error Response Formats

### Standard API Error Response
```javascript
{
  status: "error",
  message: "Human-readable error message",
  errorCode: "SPECIFIC_ERROR_CODE", // Optional
  details: {} // Optional additional details
}
```

### AgentError Response
```javascript
{
  status: "error",
  message: "Agent processing failed",
  errorCode: "PROCESSING_ERROR",
  details: {
    agentType: "workout-generation",
    phase: "research",
    context: "User profile validation"
  }
}
```

### Validation Error Response
```javascript
{
  status: "error",
  message: "Validation failed",
  details: [
    {
      field: "email",
      message: "Please provide a valid email address",
      type: "string.email",
      value: "invalid-email"
    }
  ]
}
```

### 404 Error Response
```javascript
{
  status: "error",
  message: "Resource not found: /api/v1/nonexistent"
}
```

## Error Classification and Logging

### Operational vs Programming Errors

#### Operational Errors (Expected)
- **Characteristics**: Business logic violations, user input errors, external service failures
- **Logging Level**: `warn` (< 500 status) or `error` (≥ 500 status)
- **Examples**: Validation failures, resource not found, authentication errors
- **Response**: Structured error response with user-friendly message

#### Programming Errors (Unexpected)
- **Characteristics**: Code bugs, logic errors, system failures
- **Logging Level**: `error`
- **Examples**: TypeError, ReferenceError, database connection failures
- **Response**: Generic error message (avoid exposing internal details)

### Logging Detail Levels

#### Development Environment
```javascript
logger.error('Error details', {
  statusCode,
  error: err.message,
  stack: err.stack,           // Full stack trace
  originalError: err.originalError ? {
    message: err.originalError.message,
    name: err.originalError.name
  } : undefined
});
```

#### Production Environment
```javascript
logger.error('Error details', {
  statusCode,
  error: err.message,
  isOperational: err.isOperational
  // Stack trace excluded for security
});
```

## Error Types Integration

### Custom Error Classes

#### ApiError
```javascript
class ApiError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
  }
}
```

#### AgentError
```javascript
class AgentError extends Error {
  constructor(message, code, details = null, originalError = null) {
    super(message);
    this.code = code;
    this.details = details;
    this.originalError = originalError;
    this.isOperational = true;
  }
}
```

#### NotFoundError
```javascript
class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(message, 404, true);
  }
}
```

### Error Utilities Integration

#### Error Response Formatting
```javascript
const formatErrorResponse = (error) => {
  const response = {
    status: 'error',
    message: error.message
  };

  if (error.errorCode) {
    response.errorCode = error.errorCode;
  }

  if (error.details) {
    response.details = error.details;
  }

  return response;
};
```

## Usage Patterns

### Application Integration
```javascript
const express = require('express');
const { 
  notFoundHandler, 
  globalErrorHandler, 
  handleFatalError 
} = require('./middleware/error-middleware');

const app = express();

// Define all routes first
app.use('/api/v1', apiRoutes);

// 404 handler for undefined routes (must be after all routes)
app.use('*', notFoundHandler);

// Global error handler (must be last middleware)
app.use(globalErrorHandler);

// Setup fatal error handlers
process.on('uncaughtException', (error) => {
  handleFatalError(error, 'uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  handleFatalError(reason, 'unhandledRejection');
});

// Store server reference for graceful shutdown
global.server = app.listen(port);
```

### Route-Level Error Handling
```javascript
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.get('/workouts', asyncHandler(async (req, res) => {
  const workouts = await workoutService.getWorkouts(req.user.id);
  res.json({ status: 'success', data: workouts });
}));

// Errors automatically passed to global error handler
```

### Manual Error Creation
```javascript
const { ApiError, AgentError, ERROR_CODES } = require('../utils/errors');

// Business logic error
if (!user) {
  throw new ApiError('User not found', 404);
}

// Agent-specific error
if (generationFailed) {
  throw new AgentError(
    'Workout generation failed',
    ERROR_CODES.PROCESSING_ERROR,
    { phase: 'generation', attempts: 3 }
  );
}
```

## Error Recovery Strategies

### Graceful Degradation
```javascript
try {
  const enhancedData = await expensiveOperation();
  res.json({ status: 'success', data: enhancedData });
} catch (error) {
  logger.warn('Enhanced operation failed, using fallback', { error: error.message });
  const basicData = await basicOperation();
  res.json({ 
    status: 'success', 
    data: basicData,
    warning: 'Some features temporarily unavailable'
  });
}
```

### Retry Logic
```javascript
const retryOperation = async (operation, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

### Circuit Breaker Pattern
```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureThreshold = threshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.state = 'closed';
    this.nextAttempt = null;
  }

  async call(operation) {
    if (this.state === 'open') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is open');
      }
      this.state = 'half-open';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

## Monitoring and Alerting

### Error Metrics to Track
- **Error rate by endpoint**: 4xx and 5xx errors per minute
- **Error types distribution**: Operational vs programming errors
- **Agent error patterns**: Specific agent error codes and frequency
- **Fatal error occurrences**: Uncaught exceptions requiring process restart

### Alert Thresholds
- **High error rate**: > 5% 5xx errors in 5-minute window
- **Fatal errors**: Any uncaught exception triggers immediate alert
- **Agent failures**: > 10% agent errors for specific operation
- **Validation failures spike**: > 20% increase in 400 errors

### Log Analysis Queries
```javascript
// High-level error patterns
SELECT 
  DATE_TRUNC('hour', timestamp) as hour,
  status_code,
  COUNT(*) as error_count
FROM error_logs 
WHERE status_code >= 400
GROUP BY hour, status_code
ORDER BY hour DESC;

// Agent error analysis
SELECT 
  error_code,
  agent_type,
  COUNT(*) as occurrences,
  AVG(processing_time) as avg_processing_time
FROM agent_error_logs 
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY error_code, agent_type;
```

## Best Practices

### Error Message Guidelines
- **User-facing messages**: Clear, actionable, non-technical
- **Log messages**: Detailed, include context, structured data
- **Avoid sensitive data**: Don't expose passwords, tokens, or PII
- **Consistent format**: Use standardized response structure

### Security Considerations
- **Stack traces**: Only in development environment
- **Error details**: Limit information exposure in production
- **Logging sensitive data**: Exclude from error logs
- **Rate limiting**: Prevent error-based DoS attacks

### Performance Impact
- **Minimize error processing time**: Quick error identification and response
- **Avoid recursive errors**: Prevent error handlers from throwing errors
- **Graceful shutdown**: Allow existing requests to complete
- **Resource cleanup**: Ensure proper cleanup in error scenarios

### Development Workflow
- **Error reproduction**: Maintain reproducible error scenarios
- **Error testing**: Include error cases in test suites
- **Error documentation**: Document known error conditions
- **Error monitoring**: Set up development error tracking

## Integration with Frontend

### Error Response Handling
```javascript
// Frontend error handling pattern
try {
  const response = await api.post('/workouts', workoutData);
  return response.data;
} catch (error) {
  if (error.response) {
    // Server error response
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        // Handle validation errors
        displayValidationErrors(data.details);
        break;
      case 401:
        // Handle authentication errors
        redirectToLogin();
        break;
      case 404:
        // Handle not found errors
        showNotFoundMessage();
        break;
      case 500:
        // Handle server errors
        showGenericErrorMessage();
        break;
      default:
        showGenericErrorMessage();
    }
  } else {
    // Network or other errors
    showNetworkErrorMessage();
  }
}
```

### Error State Management
```javascript
// React error state management
const [errors, setErrors] = useState({});

const handleApiError = (error) => {
  if (error.response?.data?.details) {
    // Validation errors
    const fieldErrors = {};
    error.response.data.details.forEach(detail => {
      fieldErrors[detail.field] = detail.message;
    });
    setErrors(fieldErrors);
  } else {
    // General errors
    setErrors({ general: error.response?.data?.message || 'An error occurred' });
  }
};
```

## Configuration Options

### Environment-Specific Behavior
```javascript
// Development configuration
const errorConfig = {
  includeStackTrace: process.env.NODE_ENV === 'development',
  verboseLogging: process.env.NODE_ENV === 'development',
  exposeInternalErrors: process.env.NODE_ENV === 'development'
};

// Production configuration
const productionConfig = {
  includeStackTrace: false,
  verboseLogging: false,
  exposeInternalErrors: false,
  enableErrorReporting: true
};
```

### Logging Configuration
```javascript
// Winston logger configuration for errors
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Error-specific transport
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    // General application transport
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});
```