# Authentication & User Management Routes Documentation

## Overview
Handles all authentication-related operations including user registration, login, token management, password reset functionality, and email verification. These routes provide secure access control for the entire application.

**File Location:** `backend/routes/auth.js`  
**Router Instance:** `express.Router()`  
**API Prefix:** `/v1/auth`  
**OpenAPI Documentation:** `/docs/paths/auth/` (12 endpoint files)

## Route Definitions

### POST /signup
**File:** `routes/auth.js`  
**Line:** 27-37  
**Router:** `router`

#### Configuration
- **Rate Limiting:** Yes - 10 signups per hour (conditionally applied - skipped in test env)
- **Middleware Applied:** 
  1. `conditionalRateLimit(authLimiters.signup)` 
  2. `sanitizeUserInput()` middleware
- **Authentication Required:** No (Public)
- **OpenAPI Reference:** `/docs/paths/auth/signup.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** JSON body with name, email, password fields

#### Handler Mapping
- **Controller Method:** `authController.signup()`
- **Response Format:** `{ userId: string, message: string }`

#### Error Routes
- **400:** Missing required fields or validation errors
- **409:** Email already exists in system
- **429:** Rate limit exceeded (10/hour)
- **500:** Internal server error during user creation

---

### POST /login
**File:** `routes/auth.js`  
**Line:** 44-54  
**Router:** `router`

#### Configuration
- **Rate Limiting:** Yes - 5 login attempts per 15 minutes (conditionally applied - skipped in test env)
- **Middleware Applied:** 
  1. `conditionalRateLimit(authLimiters.login)` 
  2. `sanitizeUserInput()` middleware
- **Authentication Required:** No (Public)
- **OpenAPI Reference:** `/docs/paths/auth/login.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** JSON body with email, password, optional rememberMe boolean

#### Handler Mapping
- **Controller Method:** `authController.login()`
- **Response Format:** `{ userId: string, jwtToken: string, refreshToken?: string, message: string }`

#### Error Routes
- **400:** Missing required fields or validation errors
- **401:** Invalid credentials
- **429:** Rate limit exceeded (5/15min)
- **500:** Internal server error during authentication

---

### POST /refresh
**File:** `routes/auth.js`  
**Line:** 60-66  
**Router:** `router`

#### Configuration
- **Rate Limiting:** Yes - 10 refresh attempts per 15 minutes (conditionally applied - skipped in test env)
- **Middleware Applied:** `conditionalRateLimit(authLimiters.refresh)`
- **Authentication Required:** No (uses refresh token)
- **OpenAPI Reference:** `/docs/paths/auth/refresh.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** JSON body with refresh token

#### Handler Mapping
- **Controller Method:** `authController.refreshToken()`
- **Response Format:** `{ jwtToken: string, refreshToken: string }`

#### Error Routes
- **400:** Missing or invalid refresh token
- **401:** Expired or revoked refresh token
- **429:** Rate limit exceeded (10/15min)
- **500:** Internal server error during token refresh

---

### POST /logout
**File:** `routes/auth.js`  
**Line:** 72-79  
**Router:** `router`

#### Configuration
- **Rate Limiting:** No
- **Middleware Applied:** `authenticate` middleware
- **Authentication Required:** Yes (JWT Bearer token)
- **OpenAPI Reference:** `/docs/paths/auth/logout.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** None (uses JWT token from header)

#### Handler Mapping
- **Controller Method:** `authController.logout()`
- **Response Format:** `{ message: string }`

#### Error Routes
- **401:** Invalid or missing JWT token
- **500:** Internal server error during logout

---

### GET /me
**File:** `routes/auth.js`  
**Line:** 85-92  
**Router:** `router`

#### Configuration
- **Rate Limiting:** No
- **Middleware Applied:** `authenticate` middleware
- **Authentication Required:** Yes (JWT Bearer token)
- **OpenAPI Reference:** `/docs/paths/auth/me.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** None

#### Handler Mapping
- **Controller Method:** `authController.getCurrentUser()`
- **Response Format:** User profile object with authentication details

#### Error Routes
- **401:** Invalid or missing JWT token
- **404:** User not found
- **500:** Internal server error during profile retrieval

---

### GET /validate-session
**File:** `routes/auth.js`  
**Line:** 98-105  
**Router:** `router`

#### Configuration
- **Rate Limiting:** No
- **Middleware Applied:** `authenticate` middleware
- **Authentication Required:** Yes (JWT Bearer token)
- **OpenAPI Reference:** `/docs/paths/auth/validate-session.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** None

#### Handler Mapping
- **Controller Method:** `authController.validateSession()`
- **Response Format:** `{ valid: boolean, user: object }`

#### Error Routes
- **401:** Invalid or expired JWT token
- **500:** Internal server error during validation

---

### POST /update-password
**File:** `routes/auth.js`  
**Line:** 111-118  
**Router:** `router`

#### Configuration
- **Rate Limiting:** No
- **Middleware Applied:** `authenticate` middleware
- **Authentication Required:** Yes (JWT Bearer token)
- **OpenAPI Reference:** `/docs/paths/auth/update-password.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** JSON body with currentPassword and newPassword

#### Handler Mapping
- **Controller Method:** `authController.updatePassword()`
- **Response Format:** `{ message: string }`

#### Error Routes
- **400:** Missing required fields or weak password
- **401:** Invalid current password or JWT token
- **500:** Internal server error during password update

---

### POST /password-reset
**File:** `routes/auth.js`  
**Line:** 124-135  
**Router:** `router`

#### Configuration
- **Rate Limiting:** Yes - 3 password reset requests per hour (conditionally applied - skipped in test env)
- **Middleware Applied:** 
  1. `conditionalRateLimit(authLimiters.passwordReset)` 
  2. `sanitizeUserInput()` middleware
- **Authentication Required:** No (Public)
- **OpenAPI Reference:** `/docs/paths/auth/password-reset.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** JSON body with email field

#### Handler Mapping
- **Controller Method:** `authController.requestPasswordReset()`
- **Response Format:** `{ message: string }`

#### Error Routes
- **400:** Missing email field
- **404:** Email not found (may return success for security)
- **429:** Rate limit exceeded (3/hour)
- **500:** Internal server error during reset request

---

### POST /reset-password
**File:** `routes/auth.js`  
**Line:** 141-152  
**Router:** `router`

#### Configuration
- **Rate Limiting:** Yes - 3 reset attempts per hour (conditionally applied - skipped in test env)
- **Middleware Applied:** 
  1. `conditionalRateLimit(authLimiters.passwordReset)` 
  2. `sanitizeUserInput()` middleware
- **Authentication Required:** No (uses reset token)
- **OpenAPI Reference:** `/docs/paths/auth/reset-password.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** JSON body with token and newPassword

#### Handler Mapping
- **Controller Method:** `authController.resetPassword()`
- **Response Format:** `{ message: string }`

#### Error Routes
- **400:** Missing fields or weak password
- **401:** Invalid or expired reset token
- **429:** Rate limit exceeded (3/hour)
- **500:** Internal server error during password reset

---

### POST /resend-verification
**File:** `routes/auth.js`  
**Line:** 158-169  
**Router:** `router`

#### Configuration
- **Rate Limiting:** Yes - 3 requests per hour (reuses passwordReset limiter, conditionally applied - skipped in test env)
- **Middleware Applied:** 
  1. `conditionalRateLimit(authLimiters.passwordReset)` 
  2. `sanitizeUserInput()` middleware
- **Authentication Required:** No (Public)
- **OpenAPI Reference:** `/docs/paths/auth/resend-verification.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** JSON body with email field

#### Handler Mapping
- **Controller Method:** `authController.resendEmailVerification()`
- **Response Format:** `{ message: string }`

#### Error Routes
- **400:** Missing email field
- **404:** Email not found or already verified
- **429:** Rate limit exceeded (3/hour)
- **500:** Internal server error during verification resend

---

### POST /verify-email
**File:** `routes/auth.js`  
**Line:** 175-186  
**Router:** `router`

#### Configuration
- **Rate Limiting:** Yes - 5 attempts per 15 minutes (reuses login limiter, conditionally applied - skipped in test env)
- **Middleware Applied:** 
  1. `conditionalRateLimit(authLimiters.login)` 
  2. `sanitizeUserInput()` middleware
- **Authentication Required:** No (uses verification token)
- **OpenAPI Reference:** `/docs/paths/auth/verify-email.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** JSON body with verification token

#### Handler Mapping
- **Controller Method:** `authController.verifyEmail()`
- **Response Format:** `{ message: string, verified: boolean }`

#### Error Routes
- **400:** Missing verification token
- **401:** Invalid or expired verification token
- **429:** Rate limit exceeded (5/15min)
- **500:** Internal server error during email verification

---

### GET /email-verification-status
**File:** `routes/auth.js`  
**Line:** 192-199  
**Router:** `router`

#### Configuration
- **Rate Limiting:** No
- **Middleware Applied:** `authenticate` middleware
- **Authentication Required:** Yes (JWT Bearer token)
- **OpenAPI Reference:** `/docs/paths/auth/email-verification-status.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** None

#### Handler Mapping
- **Controller Method:** `authController.checkEmailVerificationStatus()`
- **Response Format:** `{ verified: boolean, email: string }`

#### Error Routes
- **401:** Invalid or missing JWT token
- **404:** User not found
- **500:** Internal server error during status check

---

## Route Precedence Notes

**Important:** These routes are mounted under `/v1/auth` prefix in the main router (see `backend/routes/index.js` line 67).

**Critical Mounting Order:** The auth routes don't have precedence conflicts as they use specific path patterns. However, the conditional rate limiting function ensures test environment compatibility by bypassing rate limits when `NODE_ENV === 'test'`.

**Authentication Exemptions:** Public routes (signup, login, refresh, password-reset, reset-password, resend-verification, verify-email) do not require JWT authentication. All other routes require valid JWT Bearer token in Authorization header.

## Integration Notes

**Frontend Authentication Flow:**
1. Use `/signup` or `/login` to obtain JWT token
2. Store JWT token securely (httpOnly cookie recommended)
3. Include `Authorization: Bearer <token>` header in subsequent requests
4. Use `/refresh` endpoint to renew expired tokens
5. Handle 401 responses by redirecting to login

**Rate Limiting Considerations:**
- Implement exponential backoff on the frontend for rate-limited endpoints
- Display user-friendly error messages for 429 responses
- Consider implementing client-side rate limiting to prevent unnecessary requests

**Security Headers:**
- All endpoints return standard rate limit headers when limits are applied
- HTTPS is required in production for all auth endpoints
- JWT tokens have configurable expiration times

**Error Handling:**
- All auth errors follow consistent JSON response format
- Sensitive operations may return generic success messages for security
- Log all authentication attempts for security monitoring