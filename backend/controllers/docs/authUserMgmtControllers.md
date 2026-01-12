# Authentication & User Management Controllers Documentation

## Overview
Controllers for authentication and user management operations including signup, login, password management, email verification, and session handling with comprehensive error handling and Supabase integration.

**File**: `backend/controllers/auth.js`  
**Lines**: 1051  
**Last Updated**: Current development phase  

## Controllers Summary

| Controller Function | Purpose | Primary Dependencies | Rate Limited |
|-------------------|---------|---------------------|--------------|
| `signup` | User registration with profile creation | Supabase Auth, Admin Client | Yes (10/hour) |
| `login` | User authentication with session management | Supabase Auth, Rate Limiter | Yes (5/15min) |
| `refreshToken` | JWT token refresh for session extension | Supabase Auth | Yes (10/15min) |
| `logout` | Session termination and cleanup | Supabase Auth | No |
| `getCurrentUser` | Retrieve authenticated user data | Supabase Auth | No |
| `validateSession` | Session validity verification | Supabase Auth | No |
| `updatePassword` | Password change for authenticated users | Supabase Auth | No |
| `requestPasswordReset` | Initiate password reset flow | Supabase Auth | Yes (3/hour) |
| `resetPassword` | Complete password reset with token | Supabase Auth | No |
| `resendVerificationEmail` | Resend email verification | Supabase Auth | Yes (3/hour) |
| `verifyEmail` | Complete email verification process | Supabase Auth | No |
| `getEmailVerificationStatus` | Check email verification status | Supabase Auth | No |

## Dependencies and Imports

### Core Dependencies
```javascript
const { createClient } = require('@supabase/supabase-js')
const rateLimit = require('express-rate-limit')
const { validateRegistration, validateLogin } = require('../utils/validation')
const { logError, logInfo } = require('../utils/logging')
```

### Custom Error Classes
```javascript
const { 
  ValidationError, 
  AuthenticationError, 
  ConflictError, 
  NotFoundError 
} = require('../utils/errors')
```

### Configuration
```javascript
const { supabaseUrl, supabaseServiceKey, supabaseAnonKey } = require('../config')
```

## Controller Functions

### 1. signup(req, res, next)

**Purpose**: Register new user with profile creation  
**Method**: POST  
**Rate Limit**: 10 requests/hour (bypassed in test environment)

#### Request Processing
```javascript
// Input validation
const { name, email, password } = req.body
validateRegistration({ name, email, password })

// Environment-specific handling
const clientConfig = NODE_ENV === 'test' 
  ? { supabaseUrl, supabaseKey: supabaseServiceKey }
  : { supabaseUrl, supabaseKey: supabaseAnonKey }
```

#### Business Logic
1. **Validation**: Email format, password strength, required fields
2. **Duplication Check**: Verify email not already registered
3. **User Creation**: Supabase Auth signup with metadata
4. **Profile Creation**: Create corresponding user profile record
5. **Response**: Return user ID and success message

#### Test Environment Handling
- Uses service key instead of anon key for test reliability
- Bypasses email confirmation requirements
- Enhanced error logging for debugging

#### Error Handling
- `ValidationError`: Invalid input data
- `ConflictError`: Email already exists  
- `AuthenticationError`: Supabase signup failure
- Generic error fallback with sanitized messages

### 2. login(req, res, next)

**Purpose**: Authenticate user and establish session  
**Method**: POST  
**Rate Limit**: 5 requests/15 minutes with memory-based tracking

#### Business Logic
1. **Input Validation**: Email and password required
2. **Rate Limiting**: IP-based with in-memory tracking
3. **Authentication**: Supabase signInWithPassword
4. **Token Management**: Extract and validate JWT tokens
5. **Response**: Return tokens and user information

#### Advanced Features
```javascript
// Memory-based rate limiting
const loginAttempts = new Map()
const maxAttempts = 5
const lockoutDuration = 15 * 60 * 1000 // 15 minutes

// Conditional token handling
const tokens = {
  jwtToken: session?.access_token,
  refreshToken: rememberMe ? session?.refresh_token : undefined
}
```

#### Security Considerations
- IP-based rate limiting with lockout
- Secure token handling and validation
- Failed attempt tracking and prevention
- Optional "remember me" functionality

### 3. refreshToken(req, res, next)

**Purpose**: Refresh expired JWT tokens  
**Method**: POST  
**Rate Limit**: 10 requests/15 minutes

#### Business Logic
1. **Token Extraction**: Get refresh token from request
2. **Session Refresh**: Supabase refreshSession call
3. **Validation**: Verify new session data
4. **Response**: Return new access token

#### Implementation
```javascript
const { refresh_token } = req.body
const { data, error } = await supabase.auth.refreshSession({
  refresh_token
})

if (error) {
  throw new AuthenticationError('Invalid or expired refresh token')
}
```

### 4. logout(req, res, next)

**Purpose**: Terminate user session  
**Method**: POST  
**Authentication**: Required (Bearer token)

#### Business Logic
1. **Token Extraction**: Get JWT from Authorization header
2. **Session Termination**: Supabase signOut call
3. **Cleanup**: Clear any cached session data
4. **Response**: Confirm successful logout

### 5. getCurrentUser(req, res, next)

**Purpose**: Retrieve current authenticated user data  
**Method**: GET  
**Authentication**: Required (Bearer token)

#### Business Logic
1. **Token Validation**: Verify JWT token validity
2. **User Retrieval**: Get user data from Supabase
3. **Data Sanitization**: Remove sensitive information
4. **Response**: Return user profile data

### 6. validateSession(req, res, next)

**Purpose**: Check if current session is valid  
**Method**: GET  
**Authentication**: Required (Bearer token)

#### Business Logic
1. **Token Parsing**: Extract and decode JWT
2. **Session Check**: Verify with Supabase auth
3. **Expiration Check**: Validate token expiry
4. **Response**: Return session validity status

### 7. updatePassword(req, res, next)

**Purpose**: Change password for authenticated user  
**Method**: POST  
**Authentication**: Required (Bearer token)

#### Business Logic
1. **Current Password Verification**: Validate existing password
2. **New Password Validation**: Check strength requirements
3. **Password Update**: Supabase updateUser call
4. **Session Refresh**: Generate new tokens
5. **Response**: Confirm password change

#### Security Features
```javascript
// Password strength validation
const passwordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true
}
```

### 8. requestPasswordReset(req, res, next)

**Purpose**: Initiate password reset flow via email  
**Method**: POST  
**Rate Limit**: 3 requests/hour

#### Business Logic
1. **Email Validation**: Verify email format and existence
2. **Reset Request**: Supabase resetPasswordForEmail
3. **Email Dispatch**: Send reset instructions
4. **Response**: Confirm reset email sent

#### Security Considerations
- Rate limiting to prevent abuse
- No user enumeration (same response for valid/invalid emails)
- Secure token generation and expiry

### 9. resetPassword(req, res, next)

**Purpose**: Complete password reset with token  
**Method**: POST  
**Authentication**: Reset token required

#### Business Logic
1. **Token Validation**: Verify reset token from email
2. **Password Validation**: Check new password requirements
3. **Password Update**: Complete reset process
4. **Session Creation**: Automatically sign in user
5. **Response**: Return new session tokens

### 10. resendVerificationEmail(req, res, next)

**Purpose**: Resend email verification link  
**Method**: POST  
**Rate Limit**: 3 requests/hour

#### Business Logic
1. **User Identification**: Verify user exists
2. **Verification Status**: Check if already verified
3. **Email Resend**: Trigger new verification email
4. **Response**: Confirm email sent

### 11. verifyEmail(req, res, next)

**Purpose**: Complete email verification process  
**Method**: POST  
**Authentication**: Verification token required

#### Business Logic
1. **Token Processing**: Handle verification token from email
2. **Email Confirmation**: Mark email as verified
3. **Account Activation**: Enable full account access
4. **Response**: Confirm successful verification

### 12. getEmailVerificationStatus(req, res, next)

**Purpose**: Check email verification status  
**Method**: GET  
**Authentication**: Required (Bearer token)

#### Business Logic
1. **User Lookup**: Get current user data
2. **Status Check**: Verify email confirmation status
3. **Response**: Return verification state

## Error Handling Strategy

### Error Classification
```javascript
// Custom error types with specific handling
class ValidationError extends Error {
  constructor(message, field = null) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
    this.statusCode = 400
  }
}

class AuthenticationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'AuthenticationError'
    this.statusCode = 401
  }
}
```

### Error Response Format
```javascript
// Standardized error responses
const errorResponse = {
  status: 'error',
  message: sanitizedMessage,
  code: errorCode,
  field: errorField, // For validation errors
  timestamp: new Date().toISOString()
}
```

### Environment-Specific Error Handling
- **Development**: Detailed error messages and stack traces
- **Test**: Enhanced logging for debugging
- **Production**: Sanitized messages, no sensitive data exposure

## Integration Patterns

### Supabase Integration
```javascript
// Dual client configuration
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Context-aware client selection
const client = requiresAdminAccess ? supabaseAdmin : supabaseAnon
```

### Rate Limiting Integration
```javascript
// Environment-conditional rate limiting
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: NODE_ENV === 'test' ? 1000 : 10, // Bypass in tests
  message: { status: 'error', message: 'Too many signup attempts' }
})
```

## Security Features

### Authentication Security
- JWT token validation and refresh
- Secure password hashing via Supabase
- Session management with expiry
- Rate limiting on sensitive operations

### Input Validation
- Email format validation
- Password strength requirements
- Request body sanitization
- SQL injection prevention

### Error Message Security
- No user enumeration in responses
- Sanitized error messages in production
- Consistent response timing
- No sensitive data in logs

## Testing Considerations

### Test Environment Adaptations
```javascript
// Test-specific configurations
if (NODE_ENV === 'test') {
  // Bypass rate limiting
  // Use service key for reliability
  // Enhanced error logging
  // Skip email verification
}
```

### Mock Integration Points
- Supabase client responses
- Email service interactions
- Rate limiting bypass
- Error injection for testing

## Performance Optimizations

### Caching Strategy
- In-memory rate limit tracking
- Session validation caching
- User data caching for frequent lookups

### Database Efficiency
- Optimized user queries
- Efficient profile creation
- Minimal database roundtrips

## Configuration Dependencies

### Environment Variables
```javascript
// Required configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
NODE_ENV=development|test|production
```

### Feature Flags
- Email verification requirements
- Rate limiting enforcement
- Enhanced error logging
- Test environment bypasses

## Future Considerations

### Scalability Enhancements
- Redis-based rate limiting for multi-instance deployments
- Database session storage for persistence
- Advanced user analytics and tracking

### Security Improvements
- Multi-factor authentication support
- Advanced threat detection
- Biometric authentication integration
- OAuth provider integration

### Feature Expansions
- Social login capabilities
- Account linking and unlinking
- Advanced password policies
- Account recovery improvements