# Security Middleware Documentation

## Overview

The security middleware implements defense-in-depth security measures for the API, including security headers, CORS configuration, CSRF protection, SQL injection prevention, and cache control. It provides comprehensive protection against common web vulnerabilities while maintaining API functionality.

**Location**: `backend/middleware/security.js`  
**Dependencies**: `helmet`, `cors`, `crypto`, environment configuration  
**Type**: Application-level security enforcement

## Core Security Components

### Helmet Configuration

#### Purpose
Configures security headers to protect against various web vulnerabilities including XSS, clickjacking, and content type sniffing.

#### Implementation
```javascript
configureHelmet()
```

**Content Security Policy (CSP)**:
```javascript
{
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
  styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
  fontSrc: ["'self'", "https://fonts.gstatic.com"],
  imgSrc: ["'self'", "data:", "https://cdn.jsdelivr.net", "https://validator.swagger.io"],
  connectSrc: ["'self'", env.supabase.url, "https://api.openai.com", "https://validator.swagger.io"],
  frameSrc: ["'none'"],
  objectSrc: ["'none'"],
  upgradeInsecureRequests: []
}
```

**Security Headers Applied**:
- **HSTS**: `Strict-Transport-Security` with 1-year max-age, includeSubDomains, and preload
- **X-Content-Type-Options**: `nosniff` to prevent MIME type sniffing
- **X-Frame-Options**: `DENY` to prevent clickjacking
- **X-XSS-Protection**: `1; mode=block` for legacy XSS protection
- **Referrer-Policy**: `strict-origin-when-cross-origin` to control referrer information
- **Cross-Origin-Resource-Policy**: `same-origin` to control resource sharing
- **Cross-Origin-Opener-Policy**: `same-origin` to isolate browsing context

### CORS Configuration

#### Purpose
Controls cross-origin requests with environment-aware origin validation and appropriate headers.

#### Implementation
```javascript
configureCors()
```

**Configuration**:
```javascript
{
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl)
    if (!origin) return callback(null, true);
    
    // Development: Allow any origin
    if (env.env === 'development') return callback(null, true);
    
    // Production: Check allowlist
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    
    // Block unauthorized origins
    callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  credentials: true,
  maxAge: 86400 // 24 hours
}
```

**Environment-Specific Behavior**:
- **Development**: Allows any origin for ease of development
- **Production**: Only allows whitelisted origins from `env.cors.origin`
- **Origins from env var**: Parsed as comma-separated list if string

### CSRF Protection

#### Purpose
Implements token-based CSRF protection for cookie-based authentication scenarios.

#### Implementation
```javascript
csrfProtection()
```

**Token Generation**:
```javascript
generateCsrfToken(req, res, next)
```
- Generates 32-byte random token using crypto.randomBytes
- Stores token in `XSRF-TOKEN` cookie (accessible to JavaScript)
- Cookie settings: `httpOnly: false`, `secure: production`, `sameSite: strict`
- Token available in `req.csrfToken` for same-request use

**Token Verification**:
```javascript
verifyCsrfToken(req, res, next)
```
- Skips verification for safe methods: GET, HEAD, OPTIONS
- Checks `X-CSRF-Token` or `X-XSRF-Token` headers
- Validates against cookie value
- Returns 403 if validation fails

**Configuration Control**:
```javascript
// Enable/disable via environment
env.security.csrfProtection = true/false
```

### SQL Injection Protection

#### Purpose
Provides additional defense layer against SQL injection attacks beyond database parameterization.

#### Implementation
```javascript
sqlInjectionProtection()
```

**Detection Patterns**:
```javascript
const sqlPatterns = [
  /('|%27|--|\(|\)|;|=|%3D)/i,           // Basic injection characters
  /(union|select|insert|update|delete|drop|alter|truncate|declare)/i, // SQL commands
  /(exec\s+xp_|exec\s+sp_)/i             // SQL stored procedures
];
```

**Protection Scope**:
- **Request Parameters**: `req.params`
- **Query Strings**: `req.query`
- **Request Body**: `req.body`
- **Recursive Validation**: Deep object scanning

**Response on Detection**:
```javascript
{
  status: "error",
  message: "Request contains disallowed characters or patterns",
  code: "INVALID_INPUT"
}
```

### Cache Control Headers

#### Purpose
Prevents caching of sensitive information and ensures fresh data requests.

#### Implementation
```javascript
// Applied to all routes
res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
res.setHeader('Pragma', 'no-cache');
res.setHeader('Expires', '0');
res.setHeader('Surrogate-Control', 'no-store');
```

## Security Middleware Setup

### Application Integration
```javascript
setupSecurityMiddleware(app)
```

**Middleware Application Order**:
1. Helmet security headers
2. CORS configuration
3. SQL injection protection
4. Cache control headers

**Logging**:
```javascript
logger.info('Security middleware configured', { 
  environment: env.env,
  csrfProtectionStatus: 'Configured but not applied to API routes'
});
```

## Configuration Options

### Environment Variables

#### CORS Configuration
```javascript
// Single origin
CORS_ORIGIN=https://yourdomain.com

// Multiple origins (comma-separated)
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com,https://admin.yourdomain.com
```

#### CSRF Protection
```javascript
SECURITY_CSRF_PROTECTION=true
```

#### Supabase URL (for CSP)
```javascript
SUPABASE_URL=https://your-project.supabase.co
```

### Development vs Production

#### Development Environment
- **CORS**: Allows any origin
- **CSRF**: Can be disabled for API testing
- **Logging**: More verbose security events
- **CSP**: May include unsafe-inline for debugging

#### Production Environment
- **CORS**: Strict origin validation
- **CSRF**: Enabled if using cookie authentication
- **Logging**: Security warnings and blocks
- **CSP**: Strict policy enforcement

## Security Event Logging

### CORS Violations
```javascript
logger.warn('CORS blocked request from origin:', origin);
```

### CSRF Validation Failures
```javascript
logger.warn('CSRF validation failed', {
  ip: req.ip,
  path: req.originalUrl,
  method: req.method,
  hasToken: !!token,
  hasCookieToken: !!cookieToken
});
```

### SQL Injection Attempts
```javascript
logger.warn('Potential SQL injection detected', {
  ip: req.ip,
  path: req.originalUrl,
  method: req.method,
  params: req.params,
  query: req.query
  // Body not logged to avoid sensitive data exposure
});
```

## Usage Examples

### Basic Application Setup
```javascript
const express = require('express');
const { setupSecurityMiddleware } = require('./middleware/security');

const app = express();

// Apply all security middleware
setupSecurityMiddleware(app);

// Define routes after security setup
app.use('/api/v1', apiRoutes);
```

### Custom CORS for Specific Routes
```javascript
const { configureCors } = require('./middleware/security');

// Custom CORS for API routes
app.use('/api', configureCors());

// Different CORS for webhooks
app.use('/webhooks', cors({
  origin: ['https://external-service.com'],
  methods: ['POST'],
  credentials: false
}));
```

### Conditional CSRF Protection
```javascript
const { csrfProtection } = require('./middleware/security');

if (process.env.USE_COOKIE_AUTH === 'true') {
  const csrf = csrfProtection();
  app.use(csrf.generateToken);
  app.use(csrf.verifyToken);
}
```

### Manual SQL Injection Check
```javascript
const { sqlInjectionProtection } = require('./middleware/security');

// Apply to specific sensitive routes
app.use('/admin', sqlInjectionProtection());
app.use('/admin', adminRoutes);
```

## Error Handling

### CORS Rejection
- **Status**: Request blocked at browser level
- **Behavior**: Browser prevents request completion
- **Logging**: Warning logged on server

### CSRF Validation Failure
```javascript
{
  status: "error",
  message: "CSRF validation failed",
  code: "CSRF_VALIDATION_FAILED"
}
```
- **Status Code**: 403 Forbidden
- **Client Action**: Obtain new CSRF token

### SQL Injection Detection
```javascript
{
  status: "error",
  message: "Request contains disallowed characters or patterns",
  code: "INVALID_INPUT"
}
```
- **Status Code**: 403 Forbidden
- **Client Action**: Review and sanitize request data

## Best Practices

### Content Security Policy
- **Minimize unsafe-inline**: Use nonces or hashes for scripts
- **Avoid unsafe-eval**: Pre-compile templates and avoid dynamic code execution
- **Whitelist specific domains**: Don't use wildcards in production
- **Test CSP thoroughly**: Use report-only mode first

### CORS Configuration
- **Be specific with origins**: Avoid wildcards in production
- **Minimize allowed headers**: Only include necessary headers
- **Consider credentials carefully**: Only enable when required
- **Monitor blocked requests**: Review logs for legitimate blocks

### CSRF Protection
- **Use for cookie authentication**: Not needed for stateless JWT APIs
- **Implement properly in frontend**: Send token in headers
- **Rotate tokens regularly**: Generate new tokens per session
- **Validate on state-changing operations**: Skip for GET requests

### SQL Injection Prevention
- **Primary defense is parameterization**: This is additional protection
- **Don't rely solely on pattern matching**: Use with proper ORM/parameterized queries
- **Keep patterns updated**: Review and update detection patterns
- **Monitor false positives**: Adjust patterns if legitimate requests are blocked

## Integration with Frontend

### Required Headers
Frontend applications must include these headers when applicable:

#### Authentication
```javascript
Authorization: Bearer <jwt-token>
```

#### CSRF Protection (if enabled)
```javascript
X-CSRF-Token: <csrf-token-value>
// or
X-XSRF-Token: <csrf-token-value>
```

#### Content Type
```javascript
Content-Type: application/json
```

### CORS Considerations
- **Credentials**: Include credentials if using cookies
- **Preflight requests**: Handle OPTIONS requests properly
- **Origin header**: Must match whitelisted origins in production

### Error Handling
Frontend should handle these security-related errors:

#### 403 Forbidden
- CSRF validation failure → Refresh token and retry
- SQL injection detection → Review request data
- CORS violation → Check origin configuration

#### Mixed Content Warnings
- Ensure all requests use HTTPS in production
- Update CSP if external resources are blocked

## Monitoring and Alerts

### Security Metrics to Track
- **CORS violations per hour**: Unusual patterns may indicate attacks
- **CSRF failures per session**: High rates may indicate token issues
- **SQL injection attempts**: Any detections warrant investigation
- **CSP violations**: Indicates potential XSS attempts

### Alert Thresholds
- **Multiple CORS violations**: > 10 per minute from same IP
- **SQL injection patterns**: Any detection triggers immediate alert
- **CSRF failure spike**: > 20% failure rate
- **Unusual user agents**: Non-browser agents attempting browser-specific attacks

## Performance Considerations

### Middleware Order Impact
- Security headers (Helmet): Minimal performance impact
- CORS checking: Low impact, mostly header operations
- SQL injection scanning: Moderate impact on large payloads
- CSRF validation: Low impact, simple token comparison

### Optimization Strategies
- **Cache CSP directives**: Pre-compile CSP strings
- **Efficient pattern matching**: Use compiled RegExp objects
- **Skip unnecessary checks**: Implement early returns for safe operations
- **Monitor response times**: Set up alerts for degraded performance

### Memory Usage
- **Pattern compilation**: Minimal memory for RegExp objects
- **Token storage**: Temporary token storage in cookies/session
- **Origin validation**: String comparison operations only