# Authentication & User Management Middleware Documentation

## Overview
Comprehensive middleware layer for authentication, authorization, security, and rate limiting specifically supporting the trAIner app's authentication and user management features with defense-in-depth security measures.

**Primary Files**: 
- `backend/middleware/auth.js` (226 lines) - Core authentication and authorization
- `backend/middleware/security.js` (286 lines) - Security headers and protection
- `backend/middleware/rateLimit.js` (157 lines) - Rate limiting for auth endpoints
- `backend/middleware/swagger-auth.js` (18 lines) - API documentation protection
**Last Updated**: Current development phase  

## Middleware Summary

| Middleware Function | Purpose | File | Rate Limited | Security Level |
|-------------------|---------|------|-------------|----------------|
| `authenticate` | JWT token verification | auth.js | No | High |
| `requireOwnership` | Resource ownership authorization | auth.js | No | High |
| `optionalAuth` | Optional authentication | auth.js | No | Medium |
| `setupSecurityMiddleware` | Global security headers | security.js | No | High |
| `authLimiters.*` | Auth endpoint rate limiting | rateLimit.js | Yes | High |
| `swaggerBasicAuth` | API docs protection | swagger-auth.js | No | Medium |

## Core Authentication Middleware (`auth.js`)

### 1. authenticate (Required Authentication)

**Purpose**: Verify JWT token from Authorization header and attach user data to request  
**Security Level**: High - Blocks unauthenticated requests  
**Token Source**: Authorization header (`Bearer <token>`)  
**User Data**: Attaches `req.user` and `req.tokenString`

```javascript
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  // Validate Authorization header format
  if (!authHeader) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required',
      error: 'No authorization token provided'
    });
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication failed',
      error: 'Invalid authorization format. Use "Bearer [token]"'
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const supabase = supabaseService.getSupabaseClient();
    
    // Verify token using Supabase auth
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !supabaseUser) {
      // Handle token expiration specifically
      if (authError && (authError.message.includes('token is expired') || authError.message.includes('JWT expired'))) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication failed: Token has expired',
          error: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({
        status: 'error',
        message: 'Authentication failed: Invalid or expired token',
        error: authError ? authError.message : 'Invalid token or user not found'
      });
    }
    
    // Attach user data to request with metadata
    req.user = { 
      id: supabaseUser.id, 
      email: supabaseUser.email, 
      role: supabaseUser.role || 'authenticated',
      ...supabaseUser.app_metadata,
      ...supabaseUser.user_metadata
    };
    req.tokenString = token;
    
    logger.debug('Authentication successful via Supabase', { 
      userId: supabaseUser.id,
      url: req.originalUrl
    });
    
    next();
  } catch (error) {
    logger.error('Unexpected error during Supabase authentication', { 
      error: error.message,
      url: req.originalUrl
    });
    
    return res.status(500).json({
      status: 'error',
      message: 'Authentication failed due to an unexpected server error',
      error: error.message
    });
  }
};
```

**Request Object Modifications**:
- `req.user`: User data object with id, email, role, metadata
- `req.tokenString`: Validated JWT token string

**Error Codes**:
- `401`: No token, invalid format, expired token, invalid token
- `500`: Unexpected server error during authentication
- `TOKEN_EXPIRED`: Specific code for expired tokens

**Usage**:
```javascript
// Protected route requiring authentication
router.get('/protected-endpoint', authenticate, controllerFunction);
```

### 2. requireOwnership (Authorization Factory)

**Purpose**: Factory function to create ownership-based authorization middleware  
**Security Level**: High - Enforces resource ownership  
**Dependencies**: Must be used after `authenticate` middleware  
**Factory Parameter**: `getResourceOwnerId` function

```javascript
const requireOwnership = (getResourceOwnerId) => {
  return async (req, res, next) => {
    try {
      // Verify user is authenticated
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required',
          error: 'User not authenticated'
        });
      }
      
      const userId = req.user.id;
      
      // Get resource owner ID using provided function
      const resourceOwnerId = await getResourceOwnerId(req);
      
      // Check ownership
      if (userId === resourceOwnerId) {
        return next();
      }
      
      logger.warn('Authorization failed: User does not own resource', {
        userId,
        resourceOwnerId,
        url: req.originalUrl
      });
      
      return res.status(403).json({
        status: 'error',
        message: 'Authorization failed',
        error: 'Resource access denied'
      });
    } catch (error) {
      logger.error('Error in ownership verification', {
        error: error.message,
        url: req.originalUrl
      });
      
      return res.status(500).json({
        status: 'error',
        message: 'Server error',
        error: 'Failed to verify resource ownership'
      });
    }
  };
};
```

**Error Codes**:
- `401`: User not authenticated (middleware order issue)
- `403`: User does not own the resource
- `500`: Error in ownership verification

**Usage Examples**:
```javascript
// Profile ownership verification
const profileOwnership = requireOwnership(async (req) => {
  const { userId } = req.params;
  return userId; // Profile belongs to user in URL parameter
});

// Workout plan ownership verification
const workoutPlanOwnership = requireOwnership(async (req) => {
  const { planId } = req.params;
  const plan = await getWorkoutPlan(planId);
  return plan.user_id; // Return the plan's owner ID
});

// Usage in routes
router.get('/profiles/:userId', authenticate, profileOwnership, getProfileController);
router.put('/workout-plans/:planId', authenticate, workoutPlanOwnership, updatePlanController);
```

### 3. optionalAuth (Optional Authentication)

**Purpose**: Verify token if present but allow requests without authentication  
**Security Level**: Medium - Permissive but secure when token present  
**Token Source**: Authorization header (optional)  
**Fallback**: Sets `req.user = null` if no token or invalid token

```javascript
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  // Default to null user
  req.user = null;
  
  // Skip authentication if no header or wrong format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const supabase = supabaseService.getSupabaseClient();
    
    // Attempt token verification
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !supabaseUser) {
      logger.debug('Optional authentication: Supabase token verification failed', { 
        error: authError ? authError.message : 'No user returned',
        url: req.originalUrl 
      });
      return next(); // Continue with req.user = null
    }
    
    // Attach user data if token is valid
    req.user = { 
      id: supabaseUser.id, 
      email: supabaseUser.email, 
      role: supabaseUser.role || 'authenticated',
      ...supabaseUser.app_metadata,
      ...supabaseUser.user_metadata
    };
    req.tokenString = token;
    
    logger.debug('Optional authentication successful', { 
      userId: supabaseUser.id,
      url: req.originalUrl
    });

  } catch (error) {
    logger.debug('Optional authentication: Unexpected error', { 
      error: error.message,
      url: req.originalUrl
    });
    // req.user remains null, continue
  }
  
  next();
};
```

**Request Object Modifications**:
- `req.user`: User data object if authenticated, `null` if not
- `req.tokenString`: JWT token if valid, undefined if not

**Usage**:
```javascript
// Public endpoint that enhances functionality for authenticated users
router.get('/public-data', optionalAuth, getPublicDataController);

// Backward compatibility alias
authenticate.optional = optionalAuth;
```

## Security Middleware (`security.js`)

### 4. setupSecurityMiddleware (Global Security Configuration)

**Purpose**: Configure comprehensive security headers and protections  
**Security Level**: High - Defense-in-depth security measures  
**Scope**: Applied globally to all routes  
**Components**: Helmet, CORS, SQL injection protection, cache headers

```javascript
const setupSecurityMiddleware = (app) => {
  // Apply Helmet with security headers
  app.use(configureHelmet());
  
  // Configure CORS with environment-aware settings
  app.use(configureCors());
  
  // Apply SQL injection protection
  app.use(sqlInjectionProtection());
  
  // Add secure Cache-Control headers
  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  });
};
```

### 4.1. configureHelmet (Security Headers)

**Purpose**: Configure HTTP security headers using Helmet  
**Protection**: XSS, clickjacking, MIME sniffing, etc.

```javascript
const configureHelmet = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://cdn.jsdelivr.net", "https://validator.swagger.io"],
        connectSrc: ["'self'", env.supabase && env.supabase.url, "https://api.openai.com", "https://validator.swagger.io"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    crossOriginResourcePolicy: { policy: "same-origin" },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hidePoweredBy: true,
    xssFilter: true,
    noSniff: true,
    frameguard: { action: 'deny' }
  });
};
```

**Security Headers Applied**:
- **CSP**: Content Security Policy preventing XSS
- **HSTS**: HTTP Strict Transport Security for HTTPS enforcement
- **X-Frame-Options**: Clickjacking protection
- **X-Content-Type-Options**: MIME type sniffing prevention
- **Referrer-Policy**: Control referrer information leakage

### 4.2. configureCors (Cross-Origin Resource Sharing)

**Purpose**: Configure CORS with environment-aware origin control  
**Development**: Allows any origin for ease of development  
**Production**: Enforces whitelist of allowed origins

```javascript
const configureCors = () => {
  const allowedOrigins = env.cors && env.cors.origin 
    ? Array.isArray(env.cors.origin) 
      ? env.cors.origin 
      : env.cors.origin.split(',').map(origin => origin.trim())
    : [];

  const corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl)
      if (!origin) {
        return callback(null, true);
      }
      
      // Allow whitelisted origins OR any origin in development
      if ((allowedOrigins.indexOf(origin) !== -1) || env.env === 'development') {
        return callback(null, true);
      }
      
      // Block non-whitelisted origins
      logger.warn('CORS blocked request from origin:', origin);
      callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    credentials: true,
    maxAge: 86400 // 24 hours
  };

  return cors(corsOptions);
};
```

**Configuration**:
- **Development**: Permissive (any origin allowed)
- **Production**: Restrictive (whitelist only)
- **Methods**: Standard HTTP methods for REST API
- **Headers**: Content-Type, Authorization, CSRF token
- **Credentials**: Enabled for cookie-based features

### 4.3. sqlInjectionProtection (SQL Injection Prevention)

**Purpose**: Additional layer of SQL injection protection beyond parameterized queries  
**Detection**: Pattern matching for common SQL injection attempts  
**Action**: Block requests containing suspicious patterns

```javascript
const sqlInjectionProtection = () => {
  return (req, res, next) => {
    const checkForSqlInjection = (value) => {
      if (typeof value !== 'string') return false;
      
      // SQL injection patterns
      const sqlPatterns = [
        /('|%27|--|\(|\)|;|=|%3D)/i, // Basic SQL injection characters
        /(union|select|insert|update|delete|drop|alter|truncate|declare)/i, // SQL commands
        /(exec\s+xp_|exec\s+sp_)/i // SQL stored procedures
      ];
      
      return sqlPatterns.some(pattern => pattern.test(value));
    };
    
    // Recursively check request data
    const checkObject = (obj) => {
      if (!obj) return false;
      
      if (typeof obj === 'string' && checkForSqlInjection(obj)) {
        return true;
      }
      
      if (typeof obj === 'object') {
        return Object.values(obj).some(value => {
          if (typeof value === 'string') {
            return checkForSqlInjection(value);
          } else if (typeof value === 'object' && value !== null) {
            return checkObject(value);
          }
          return false;
        });
      }
      
      return false;
    };
    
    // Check all request data
    const hasSuspiciousParams = checkObject(req.params);
    const hasSuspiciousQuery = checkObject(req.query);
    const hasSuspiciousBody = checkObject(req.body);
    
    if (hasSuspiciousParams || hasSuspiciousQuery || hasSuspiciousBody) {
      logger.warn('Potential SQL injection detected', {
        ip: req.ip,
        path: req.originalUrl,
        method: req.method,
        params: req.params,
        query: req.query
      });
      
      return res.status(403).json({
        status: 'error',
        message: 'Request contains disallowed characters or patterns',
        code: 'INVALID_INPUT'
      });
    }
    
    next();
  };
};
```

**Detection Patterns**:
- **Characters**: Single quotes, SQL operators, comments
- **Commands**: SQL DML/DDL keywords
- **Procedures**: SQL Server extended procedures

## Rate Limiting Middleware (`rateLimit.js`)

### 5. Authentication Rate Limiters

**Purpose**: Protect authentication endpoints from brute force attacks  
**Security Level**: High - Critical for preventing credential attacks  
**Customization**: Different limits per auth operation type

#### 5.1. authLimiters Configuration

```javascript
const authLimiters = {
  signup: createAuthLimiter(60 * 60 * 1000, 10), // 10 signups per hour
  login: createAuthLimiter(15 * 60 * 1000, 5),   // 5 login attempts per 15 minutes
  refresh: createAuthLimiter(15 * 60 * 1000, 10), // 10 refresh attempts per 15 minutes
  passwordReset: createAuthLimiter(60 * 60 * 1000, 3) // 3 password reset requests per hour
};
```

**Rate Limit Specifications**:
- **Signup**: 10 attempts per hour per IP
- **Login**: 5 attempts per 15 minutes per IP
- **Token Refresh**: 10 attempts per 15 minutes per IP
- **Password Reset**: 3 attempts per hour per IP

#### 5.2. createAuthLimiter (Authentication Rate Limiter Factory)

**Purpose**: Create rate limiters specifically for authentication endpoints  
**Key Strategy**: IP-based (user not authenticated yet)  
**Error Response**: Authentication-specific error messages

```javascript
const createAuthLimiter = (windowMs = 15 * 60 * 1000, maxAttempts = 5) => {
  return createRateLimiter({
    windowMs,
    max: maxAttempts,
    message: {
      status: 'error',
      message: 'Too many authentication attempts. Please try again later.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED'
    },
    // Use IP only for auth endpoints (user ID not available)
    keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown'
  });
};
```

#### 5.3. createRateLimiter (General Rate Limiter Factory)

**Purpose**: Base factory for creating customized rate limiters  
**Key Strategy**: IP + User ID for authenticated requests  
**Logging**: Comprehensive rate limit violation logging

```javascript
const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 60 * 1000, // 1 minute window
    max: 60, // 60 requests per minute
    message: {
      status: 'error',
      message: 'Too many requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true, // RateLimit-* headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    keyGenerator: (req) => {
      // Use IP + User ID for more precise limiting
      const userId = req.user?.id || 'anonymous';
      return `${req.ip}_${userId}`;
    }
  };

  const finalOptions = { ...defaultOptions, ...options };

  return rateLimit({
    ...finalOptions,
    // Custom handler with logging
    handler: (req, res) => {
      const path = req.originalUrl || req.url;
      const ip = req.ip || req.headers['x-forwarded-for'];
      const userAgent = req.headers['user-agent'] || 'unknown';
      const userId = req.user?.id || 'anonymous';
      
      logger.warn('Rate limit exceeded', {
        ip,
        userId,
        path,
        userAgent,
        method: req.method,
        windowMs: finalOptions.windowMs,
        limit: finalOptions.max
      });
      
      res.status(429).json(finalOptions.message);
    }
  });
};
```

**Features**:
- **Flexible Configuration**: Customizable window and limit
- **Smart Key Generation**: IP + User ID for authenticated users
- **Comprehensive Logging**: Detailed rate limit violation logs
- **Standard Headers**: Modern RateLimit-* headers for client awareness

### 6. Specialized Rate Limiters

#### 6.1. AI Operation Rate Limiters

```javascript
const apiLimiters = {
  standard: createApiLimiter(100, 60 * 1000),     // 100 requests per minute
  workoutGen: createWorkoutGenLimiter(10, 60 * 60 * 1000), // 10 workout generations per hour
  aiOperations: createAiOperationLimiter(20, 60 * 60 * 1000) // 20 AI operations per hour
};
```

**Purpose**: Protect expensive AI operations from abuse while allowing reasonable usage

## API Documentation Protection (`swagger-auth.js`)

### 7. swaggerBasicAuth (Swagger UI Protection)

**Purpose**: Protect API documentation in production environments  
**Security Level**: Medium - Basic authentication for docs access  
**Environment Behavior**: Disabled in development, enabled in production

```javascript
const swaggerBasicAuth = () => {
  if (!env.isProduction) {
    return (req, res, next) => next(); // No protection in development
  }

  return basicAuth({
    users: { 
      [env.API_DOCS_USERNAME || 'admin']: env.API_DOCS_PASSWORD || 'change_me'
    },
    challenge: true,
    realm: 'trAIner API Documentation'
  });
};
```

**Configuration**:
- **Development**: No authentication required
- **Production**: Basic auth with environment-configured credentials
- **Default Credentials**: admin / change_me (should be overridden)

**Environment Variables**:
- `API_DOCS_USERNAME`: Username for API docs access
- `API_DOCS_PASSWORD`: Password for API docs access

## Integration Patterns & Usage Examples

### Authentication Flow Pattern

```javascript
// Complete authentication and authorization chain
router.post('/users/:userId/workouts', 
  authLimiters.standard,           // Rate limiting
  authenticate,                    // Authentication
  requireOwnership(getUserFromParam), // Authorization
  validateWorkoutData,             // Validation
  createWorkoutController          // Business logic
);
```

### Optional Authentication Pattern

```javascript
// Public endpoint with enhanced functionality for authenticated users
router.get('/public-workouts', 
  apiLimiters.standard,    // Rate limiting
  optionalAuth,            // Optional authentication
  getPublicWorkoutsController
);

// Controller can check req.user for enhanced features
const getPublicWorkoutsController = (req, res) => {
  const isAuthenticated = !!req.user;
  const workouts = getPublicWorkouts({ 
    includePersonalRecommendations: isAuthenticated 
  });
  res.json(workouts);
};
```

### Security Headers Setup

```javascript
// Apply security middleware to entire application
const express = require('express');
const { setupSecurityMiddleware } = require('./middleware/security');

const app = express();

// Apply security headers and protections globally
setupSecurityMiddleware(app);
```

### Rate Limiter Usage by Endpoint Type

```javascript
// Authentication endpoints
router.post('/auth/signup', authLimiters.signup, signupController);
router.post('/auth/login', authLimiters.login, loginController);
router.post('/auth/refresh', authLimiters.refresh, refreshController);
router.post('/auth/password-reset', authLimiters.passwordReset, resetController);

// API endpoints  
router.get('/api/data', apiLimiters.standard, dataController);
router.post('/api/workouts/generate', apiLimiters.workoutGen, generateController);
router.post('/api/ai/analyze', apiLimiters.aiOperations, analyzeController);
```

## Error Handling Patterns

### Authentication Error Response Format

```javascript
// Standard authentication error format
{
  "status": "error",
  "message": "Authentication failed: Token has expired", 
  "error": "Token has expired",
  "code": "TOKEN_EXPIRED" // Optional specific error code
}
```

### Authorization Error Response Format

```javascript
// Standard authorization error format
{
  "status": "error",
  "message": "Authorization failed",
  "error": "Resource access denied"
}
```

### Rate Limiting Error Response Format

```javascript
// Standard rate limiting error format
{
  "status": "error",
  "message": "Too many authentication attempts. Please try again later.",
  "code": "AUTH_RATE_LIMIT_EXCEEDED"
}
```

### Security Violation Response Format

```javascript
// SQL injection or security violation
{
  "status": "error",
  "message": "Request contains disallowed characters or patterns",
  "code": "INVALID_INPUT"
}
```

## Performance Considerations

### Middleware Order

**Critical**: Middleware order affects performance and security effectiveness

```javascript
app.use(securityMiddleware);     // 1. Security headers first
app.use(rateLimitMiddleware);    // 2. Rate limiting early  
app.use(authenticationMiddleware); // 3. Authentication after rate limiting
app.use(authorizationMiddleware); // 4. Authorization after authentication
app.use(businessLogicMiddleware); // 5. Business logic last
```

### Key Generation Strategy

- **IP + User ID**: More precise rate limiting for authenticated users
- **IP Only**: For authentication endpoints (user not known yet)
- **Fallback Handling**: Uses 'unknown' when IP cannot be determined

### Memory Usage

- **Rate Limiting**: In-memory store (not persistent across restarts)
- **Token Caching**: No token caching implemented (verify each request)
- **User Data**: Attached to request object (cleaned up per request)

## Configuration Dependencies

### Environment Variables

```javascript
// Security configuration
CORS_ORIGIN=http://localhost:3000,https://trainer.app
API_DOCS_USERNAME=admin
API_DOCS_PASSWORD=secure_password

// Supabase configuration (for auth middleware)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_anonymous_key

// Environment detection
NODE_ENV=development|test|production
```

### Required Packages

```javascript
// package.json dependencies for middleware
{
  "express-rate-limit": "^6.x.x",
  "helmet": "^7.x.x", 
  "cors": "^2.x.x",
  "express-basic-auth": "^1.x.x"
}
```

## Testing Considerations

### Middleware Testing Patterns

```javascript
// Authentication middleware testing
describe('authenticate middleware', () => {
  it('should reject requests without authorization header', async () => {
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    
    await authenticate(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
```

### Rate Limiting Test Considerations

- Tests should use separate rate limiter instances
- Consider resetting rate limit state between tests
- Test both under-limit and over-limit scenarios

### Security Testing

- Test CORS behavior with different origins
- Verify SQL injection protection with malicious inputs
- Test security headers are properly applied

## Security Best Practices

### Token Management

- **Never Log Tokens**: Tokens should not appear in logs
- **Token Validation**: Always verify tokens with Supabase
- **Error Handling**: Provide generic error messages to prevent information leakage

### Rate Limiting Strategy

- **Layer Defense**: Apply rate limiting before expensive operations
- **User + IP Keys**: Combine user ID and IP for better precision
- **Different Limits**: Use appropriate limits for different operation types

### Ownership Verification

- **Factory Pattern**: Use factory functions for flexible ownership checks
- **Error Logging**: Log authorization failures for security monitoring
- **Fail Secure**: Default to denying access when ownership cannot be verified

## Future Enhancements

### Performance Improvements

- **Redis Integration**: External store for rate limiting across instances
- **Token Caching**: Short-term token validation caching
- **IP Whitelist**: Skip rate limiting for trusted IPs

### Security Enhancements

- **Device Fingerprinting**: Additional security factor for authentication
- **Anomaly Detection**: ML-based unusual behavior detection
- **Enhanced Logging**: Security event correlation and alerting

### Feature Additions

- **2FA Integration**: Two-factor authentication support
- **Session Management**: Advanced session handling and invalidation
- **Audit Logging**: Comprehensive security audit trail 