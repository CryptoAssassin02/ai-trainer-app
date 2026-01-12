# User Profiles Middleware Documentation

## Overview
The User Profiles middleware stack provides authentication, validation, content-type checking, and error handling for all profile-related routes. The middleware ensures secure access, data integrity, and proper error handling across all profile operations.

## Middleware Stack Architecture

### Route-Level Middleware Chain
```javascript
// Applied to all profile routes
router.use(authenticate);

// Applied to specific routes
router.put('/preferences', requireJsonContentType, validateProfilePreferences, asyncHandler(controller));
router.post('/', validateProfileCreation, asyncHandler(controller));
router.put('/', validateProfileUpdate, asyncHandler(controller));
router.get('/', asyncHandler(controller));
router.get('/preferences', asyncHandler(controller));
```

### Middleware Dependencies
- **Authentication**: Supabase Auth integration
- **Validation**: Joi schema validation
- **Error Handling**: Custom error classes and Winston logging
- **Content-Type**: HTTP header validation

## Authentication Middleware

### 1. authenticate
**File**: `backend/middleware/auth.js`
**Purpose**: Verify JWT token and attach user data to request

**Implementation**:
```javascript
const authenticate = async (req, res, next) => {
  // 1. Extract Authorization header
  // 2. Validate Bearer token format
  // 3. Verify token with Supabase Auth
  // 4. Attach user data to req.user
  // 5. Attach token string to req.tokenString
}
```

**Request Processing**:
1. **Header Extraction**: Extracts `Authorization` header
2. **Format Validation**: Ensures "Bearer [token]" format
3. **Token Verification**: Uses Supabase `auth.getUser(token)`
4. **User Data Attachment**: Populates `req.user` with verified user data
5. **Token Storage**: Stores validated token in `req.tokenString`

**User Data Structure**:
```javascript
req.user = {
  id: "uuid",                    // Supabase user ID
  email: "user@example.com",     // User email
  role: "authenticated",         // User role
  ...app_metadata,              // App metadata from Supabase
  ...user_metadata              // User metadata (name, etc.)
}
```

**Error Handling**:
- **401 - No Authorization Header**: "Authentication required"
- **401 - Invalid Format**: "Invalid authorization format. Use Bearer [token]"
- **401 - Invalid Token**: "Authentication failed: Invalid or expired token"
- **401 - Expired Token**: "Authentication failed: Token has expired" (code: TOKEN_EXPIRED)
- **500 - Unexpected Error**: "Authentication failed due to an unexpected server error"

**Response Format**:
```javascript
{
  status: 'error',
  message: 'Authentication failed',
  error: 'Invalid token or user not found',
  code: 'TOKEN_EXPIRED' // For expired tokens
}
```

**Security Features**:
- JWT token validation via Supabase Auth
- Automatic token expiration detection
- Secure user data extraction
- Error message sanitization

**Performance Characteristics**:
- Single Supabase Auth API call
- Minimal request overhead
- Efficient token validation
- Request object augmentation

**Integration Pattern**:
```javascript
// All profile routes require authentication
router.use(authenticate);

// Controllers access user data
const userId = req.user.id;
const jwtToken = req.tokenString;
```

### 2. requireOwnership (Factory)
**File**: `backend/middleware/auth.js`
**Purpose**: Factory function for resource ownership verification

**Implementation**:
```javascript
const requireOwnership = (getResourceOwnerId) => {
  return async (req, res, next) => {
    // 1. Check user authentication
    // 2. Extract resource owner ID
    // 3. Compare user ID with resource owner ID
    // 4. Allow or deny access
  }
}
```

**Usage Pattern**:
```javascript
// Example usage for profile ownership
const checkProfileOwnership = requireOwnership(async (req) => {
  return req.params.userId || req.user.id;
});

router.get('/profile/:userId', authenticate, checkProfileOwnership, handler);
```

**Error Handling**:
- **401 - Not Authenticated**: "Authentication required"
- **403 - Access Denied**: "Authorization failed - Resource access denied"
- **500 - Ownership Check Error**: "Server error - Failed to verify resource ownership"

**Note**: Not currently used in profile routes as they rely on implicit ownership through authentication.

### 3. optionalAuth
**File**: `backend/middleware/auth.js`
**Purpose**: Optional authentication that doesn't require a token

**Implementation**:
```javascript
const optionalAuth = async (req, res, next) => {
  // 1. Set req.user = null by default
  // 2. Check for Authorization header
  // 3. Verify token if present
  // 4. Attach user data if valid
  // 5. Continue regardless of token validity
}
```

**Use Cases**:
- Public endpoints that benefit from user context
- Mixed authenticated/unauthenticated functionality
- Feature flags based on authentication status

**Note**: Not used in profile routes as all profile operations require authentication.

## Validation Middleware

### 1. validate (Factory)
**File**: `backend/middleware/validation.js`
**Purpose**: Factory function for Joi schema validation

**Implementation**:
```javascript
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    // 1. Extract data from request[source]
    // 2. Remove userId from profile requests
    // 3. Validate against Joi schema
    // 4. Format errors if validation fails
    // 5. Update request with validated data
  }
}
```

**Special Profile Handling**:
```javascript
// Remove userId from body for profile routes
if (source === 'body' && req.originalUrl.includes('/profile') && data && 'userId' in data) {
  const { userId, ...dataWithoutUserId } = data;
  req[source] = dataWithoutUserId;
}
```

**Validation Options**:
```javascript
const { error, value } = schema.validate(req[source], {
  abortEarly: false,  // Collect all errors
  convert: true       // Enable type conversion
});
```

**Error Response Format**:
```javascript
{
  status: 'error',
  message: 'Primary validation error message',
  errors: [
    {
      field: 'fieldName',
      message: 'Specific error message',
      type: 'joi.error.type'
    }
  ]
}
```

**Logging**:
- Logs validation failures with request path and error details
- Uses Winston logger for structured logging
- Includes error context for debugging

### 2. validateProfileCreation
**File**: `backend/middleware/validation.js`
**Purpose**: Validates profile creation requests

**Schema**: `profileSchemas.create`
**Method**: `validate(profileSchemas.create, 'body')`

**Validation Rules**:
- **userId**: Optional UUID (overridden by controller)
- **name**: 2-100 characters, optional
- **age**: 13-120 years, optional
- **gender**: Enum values, optional
- **height**: Number (cm) or {feet, inches} object, optional
- **weight**: Positive number, optional
- **unitPreference**: "metric" or "imperial", optional
- **experienceLevel**: "beginner", "intermediate", "advanced", optional
- **goals**: Array of strings, optional
- **equipment**: Array of strings, optional
- **medicalConditions**: Array of strings with healthcare validation, optional
- **workoutFrequency**: String, optional

**Height Validation**:
```javascript
height: Joi.alternatives()
  .try(
    Joi.number().positive(),           // Metric (cm)
    Joi.object({                       // Imperial
      feet: Joi.number().integer().min(0).required(),
      inches: Joi.number().integer().min(0).max(11).required()
    }).strict()
  )
  .allow(null)
  .optional()
```

**Medical Conditions Validation**:
```javascript
medicalConditions: Joi.array()
  .items(
    Joi.string()
      .trim()
      .min(1)
      .max(200)
      .pattern(/^[a-zA-Z0-9\s\-.,()_]+$/)
      .custom((value, helpers) => {
        // XSS prevention
        if (/<[^>]*>/g.test(value) || /javascript:/i.test(value)) {
          return helpers.error('medicalConditions.xss');
        }
        
        // SQL injection prevention
        if (/['";]|--|\*|DROP\s+TABLE|INSERT\s+INTO|DELETE\s+FROM/i.test(value)) {
          return helpers.error('medicalConditions.sqlInjection');
        }
        
        // NoSQL injection prevention
        if (/\$[\w\.]+|\\u0000/g.test(value)) {
          return helpers.error('medicalConditions.nosqlInjection');
        }
        
        return value.trim();
      })
  )
  .max(10)
  .allow(null)
  .optional()
```

**Healthcare Data Security**:
- XSS prevention for script injection
- SQL injection pattern detection
- NoSQL injection prevention
- Medical terminology format validation
- Character set restrictions
- Length limitations (200 chars per condition, max 10 conditions)

### 3. validateProfileUpdate
**File**: `backend/middleware/validation.js`
**Purpose**: Validates profile update requests

**Schema**: `profileSchemas.update`
**Method**: `validate(profileSchemas.update, 'body')`

**Validation Rules**:
- Same as creation schema but all fields are optional
- Partial updates supported
- `allowUnknown: false` to reject unknown fields
- Same healthcare data validation for medical conditions

**Key Features**:
- All fields optional for partial updates
- Maintains same validation rules as creation
- Preserves existing data integrity
- Consistent error messaging

### 4. validateProfilePreferences
**File**: `backend/middleware/validation.js`
**Purpose**: Validates preference-only updates

**Schema**: `profileSchemas.preferences`
**Method**: `validate(profileSchemas.preferences, 'body')`

**Validation Rules**:
```javascript
preferences: Joi.object({
  unitPreference: Joi.string().valid('metric', 'imperial').optional(),
  goals: Joi.array().items(Joi.string()).optional(),
  equipment: Joi.array().items(Joi.string()).optional(),
  experienceLevel: Joi.string().valid('beginner', 'intermediate', 'advanced').allow(null).optional(),
  workoutFrequency: Joi.string().allow(null).optional()
}).min(1).messages({
  'object.min': 'At least one preference field is required'
})
```

**Key Features**:
- Requires at least one preference field
- Lightweight validation for preferences only
- Supports preference-specific operations
- Optimized for settings updates

## Content-Type Middleware

### requireJsonContentType
**File**: `backend/routes/profile.js` (inline)
**Purpose**: Ensures requests use application/json content type

**Implementation**:
```javascript
const requireJsonContentType = (req, res, next) => {
  if (req.method === 'PUT' || req.method === 'POST') {
    const contentType = req.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        status: 'error',
        message: 'Content-Type must be application/json'
      });
    }
  }
  next();
};
```

**Applied To**:
- `PUT /profile/preferences` - Preference updates require JSON
- Other profile routes handle content-type automatically

**Error Response**:
```javascript
{
  status: 'error',
  message: 'Content-Type must be application/json'
}
```

**Purpose**:
- Ensures proper JSON parsing
- Prevents form-data or other content types
- Maintains API consistency
- Improves error handling

## Error Handling Middleware

### asyncHandler
**File**: `backend/utils/error-handlers.js`
**Purpose**: Wraps async route handlers to catch errors

**Implementation**:
```javascript
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

**Usage Pattern**:
```javascript
// All profile routes use asyncHandler
router.get('/', asyncHandler(profileController.getProfile));
router.post('/', validateProfileCreation, asyncHandler(profileController.createOrUpdateProfile));
```

**Error Flow**:
1. Catches any errors thrown in async route handlers
2. Forwards errors to Express error middleware
3. Prevents unhandled promise rejections
4. Maintains consistent error handling

**Benefits**:
- Eliminates need for try-catch in every route handler
- Consistent error propagation
- Prevents application crashes
- Simplified controller code

## Middleware Integration Patterns

### Full Request Flow
```javascript
// 1. Express routing
app.use('/api/profile', profileRoutes);

// 2. Authentication (all routes)
router.use(authenticate);

// 3. Route-specific middleware chain
router.put('/preferences', 
  requireJsonContentType,        // Content-type validation
  validateProfilePreferences,    // Joi validation
  asyncHandler(controller)       // Error handling wrapper
);

// 4. Controller execution
// 5. Response handling
```

### Error Propagation Chain
```javascript
// 1. Middleware error (401, 400, etc.)
// 2. asyncHandler catches controller errors
// 3. Express error middleware handles all errors
// 4. Formatted error response sent to client
```

### Data Flow Transformation
```javascript
// 1. Raw request data
// 2. authenticate: adds req.user, req.tokenString
// 3. validate: validates and sanitizes req.body
// 4. Controller: processes validated data
// 5. Response: formatted response data
```

## Security Implementation

### Authentication Security
- JWT token verification via Supabase Auth
- Token expiration detection
- Secure user data extraction
- Request context augmentation

### Data Validation Security
- XSS prevention in medical conditions
- SQL injection detection
- NoSQL injection prevention
- Input sanitization and validation
- Character set restrictions

### Content Security
- Content-Type validation
- JSON-only endpoints
- Request size limitations
- Unknown field rejection

### Error Security
- Sanitized error messages
- No sensitive data in error responses
- Structured logging for debugging
- Context-aware error handling

## Performance Considerations

### Authentication Performance
- Single Supabase Auth API call per request
- Minimal request object augmentation
- Efficient token validation
- Cached user data structure

### Validation Performance
- Joi schema compilation optimization
- Early abort on validation failures
- Efficient pattern matching
- Memory-efficient validation

### Error Handling Performance
- Minimal overhead wrapper
- Efficient error propagation
- Structured logging optimization
- Quick error response generation

## Testing Considerations

### Unit Testing
- Mock Supabase Auth responses
- Test validation schemas individually
- Test error handling scenarios
- Mock request/response objects

### Integration Testing
- Test complete middleware chain
- Verify authentication flow
- Test validation error responses
- Test error propagation

### Security Testing
- Test authentication bypass attempts
- Test validation bypass attempts
- Test XSS/injection prevention
- Test error message sanitization

## Monitoring & Logging

### Authentication Logging
```javascript
// Success
logger.debug('Authentication successful via Supabase', { userId, url });

// Warning
logger.warn('Authentication failed: No authorization header', { url });

// Error
logger.error('Unexpected error during Supabase authentication', { error, url });
```

### Validation Logging
```javascript
// Warning
logger.warn('Validation failed', {
  path: req.originalUrl,
  errors: error.details.map(detail => detail.message)
});
```

### Error Handling Logging
```javascript
// Error responses
logger[logLevel](`API Error Response [${statusCode}]`, {
  error: error.message,
  details: error.details,
  stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
});
```

## Middleware Configuration

### Development Configuration
- Detailed error messages
- Stack traces in responses
- Debug logging enabled
- Relaxed validation for testing

### Production Configuration
- Sanitized error messages
- No stack traces in responses
- Error logging only
- Strict validation enforcement

## Future Enhancements

### Planned Features
- Rate limiting middleware
- Request size validation
- Enhanced security headers
- Advanced logging correlation

### Performance Improvements
- Validation schema caching
- Authentication token caching
- Batch validation operations
- Optimized error handling

### Security Enhancements
- Enhanced XSS protection
- Advanced injection prevention
- Audit logging
- Security headers middleware

---

*This documentation reflects the actual middleware implementations used in the User Profiles feature. All authentication, validation, content-type checking, and error handling are documented based on the working code.* 