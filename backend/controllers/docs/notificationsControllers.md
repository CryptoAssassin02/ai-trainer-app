# Notifications Controllers Documentation

## Overview
The Notifications Controller handles HTTP requests for notification preference management and testing functionality. This controller processes user authentication, extracts JWT tokens, coordinates with the notification service layer, and implements comprehensive error handling with logging. The controller manages three core operations: updating preferences, retrieving preferences, and sending test notifications.

## Controller Module Structure

### Notifications Controller Module
**File:** `controllers/notifications.js`
**Lines:** 1-132
**Pattern:** Functional controller with service dependencies

#### Dependencies
- `notificationService` - Core business logic for preference management
- `logger` - Application logging for debugging and monitoring

## Controller Methods

### updatePreferences Method
**File:** `controllers/notifications.js`
**Lines:** 13-35
**HTTP Method:** POST
**Route:** `/v1/notifications/preferences`

#### Request Processing
**Parameters Extracted:**
- `userId` from `req.user.id` (populated by auth middleware)
- `jwtToken` from `req.headers.authorization` (Bearer token extraction)
- `req.body` - Notification preferences data (validated by middleware)

**Request Validation:**
- JWT token presence verified by auth middleware
- Body validation performed by `validateNotificationPreferences` middleware
- User context available via `req.user` object

#### Business Logic Flow
1. **Authentication Context:** Extracts user ID from authenticated request
2. **Token Extraction:** Splits Authorization header to get JWT token
3. **Service Invocation:** Calls `notificationService.storePreferences(userId, req.body, jwtToken)`
4. **Response Formatting:** Returns success response with updated preferences

#### Response Handling
**Success Response (200):**
```json
{
  "status": "success",
  "data": {updatedPrefs},
  "message": "Notification preferences updated successfully"
}
```

**Error Response (500):**
```json
{
  "status": "error",
  "message": "Failed to update notification preferences",
  "error": {error.message}
}
```

#### Error Handling
- **Catches:** All service layer exceptions
- **Logging:** Error details with user context
- **Response:** Standardized error format with generic message
- **Security:** No sensitive data exposed in error responses

---

### getPreferences Method
**File:** `controllers/notifications.js`
**Lines:** 44-78
**HTTP Method:** GET
**Route:** `/v1/notifications/preferences`

#### Request Processing
**Parameters Extracted:**
- `userId` from `req.user.id` (populated by auth middleware)
- `jwtToken` from `req.headers.authorization` (Bearer token extraction)

**Request Validation:**
- JWT token presence verified by auth middleware
- No body validation required (GET request)

#### Business Logic Flow
1. **Authentication Context:** Extracts user ID from authenticated request
2. **Token Extraction:** Splits Authorization header to get JWT token
3. **Service Invocation:** Calls `notificationService.retrievePreferences(userId, jwtToken)`
4. **Default Application:** Applies default values for missing preferences
5. **Response Formatting:** Returns standardized preferences object

#### Default Values Logic
**Applied Defaults:**
- `email_enabled`: false (if not set)
- `sms_enabled`: false (if not set)
- `push_enabled`: false (if not set)
- `in_app_enabled`: true (if not set) - Default enabled for in-app notifications
- `quiet_hours_start`: null (if not set)
- `quiet_hours_end`: null (if not set)

#### Response Handling
**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "email_enabled": boolean,
    "sms_enabled": boolean,
    "push_enabled": boolean,
    "in_app_enabled": boolean,
    "quiet_hours_start": string|null,
    "quiet_hours_end": string|null
  }
}
```

**Error Response (500):**
```json
{
  "status": "error",
  "message": "Failed to retrieve notification preferences",
  "error": {error.message}
}
```

#### Error Handling
- **Catches:** All service layer exceptions
- **Logging:** Error details with user context
- **Response:** Standardized error format
- **Fallback:** Graceful handling of missing preferences

---

### testNotification Method
**File:** `controllers/notifications.js`
**Lines:** 87-128
**HTTP Method:** POST
**Route:** `/v1/notifications/test`

#### Request Processing
**Parameters Extracted:**
- `userId` from `req.user.id` (populated by auth middleware)
- `jwtToken` from `req.headers.authorization` (Bearer token extraction)
- `channel` from `req.body.channel` - Notification channel to test

**Request Validation:**
- JWT token presence verified by auth middleware
- Manual channel validation in controller method
- Rate limiting applied via `preferencesLimiter` middleware

#### Channel Validation Logic
**Valid Channels:** `['email', 'sms', 'push', 'in_app']`
**Validation Response (400):**
```json
{
  "status": "error", 
  "message": "Invalid notification channel. Must be one of: email, sms, push, in_app"
}
```

#### Business Logic Flow
1. **Authentication Context:** Extracts user ID from authenticated request
2. **Token Extraction:** Splits Authorization header to get JWT token
3. **Input Validation:** Validates channel parameter against allowed values
4. **Service Invocation:** Calls `notificationService.sendTestNotification(userId, channel, jwtToken)`
5. **Response Formatting:** Returns test result with service message

#### Response Handling
**Success Response (200):**
```json
{
  "status": "success",
  "data": {result},
  "message": {result.message}
}
```

**Error Response (500):**
```json
{
  "status": "error",
  "message": "Failed to send test notification",
  "error": {error.message}
}
```

#### Error Handling
- **Catches:** All service layer exceptions and validation errors
- **Logging:** Error details with user and channel context
- **Response:** Standardized error format
- **MVP Note:** Current implementation is mock for testing purposes

## Common Patterns

### JWT Token Extraction
**Pattern Used:** `req.headers.authorization.split(' ')[1]`
**Assumption:** Bearer token format: `"Bearer {jwt_token}"`
**Security:** Auth middleware ensures valid token presence

### User Context Access
**Pattern Used:** `req.user.id`
**Source:** Populated by `authenticate` middleware
**Type:** UUID string representing user identifier

### Error Logging Format
**Pattern Used:** 
```javascript
logger.error('Error {operation}:', error);
logger.debug('{operation}', { userId });
```

### Response Standardization
**Success Format:**
- `status`: "success"
- `data`: Response payload
- `message`: Optional success message

**Error Format:**
- `status`: "error"
- `message`: User-friendly error description
- `error`: Technical error details (optional)

## Security Considerations

### Authentication Requirements
- **All endpoints require valid JWT token**
- **User context verified via auth middleware**
- **No cross-user access possible (RLS enforced at service layer)**

### Data Sanitization
- **Input validation via Joi schemas (middleware)**
- **No direct SQL construction (Supabase ORM)**
- **Error messages sanitized (no sensitive data exposure)**

### Rate Limiting
- **Applied to state-changing operations (POST endpoints)**
- **User-specific limiting via `req.user.id`**
- **Shared limiter for preferences and test operations**

## Performance Characteristics

### Response Times
- **GET preferences:** < 200ms (single database query)
- **POST preferences:** < 300ms (upsert operation)
- **POST test:** < 100ms (mock implementation)

### Logging Overhead
- **Debug logging on all operations**
- **Error logging with context**
- **Minimal performance impact**

### Memory Usage
- **Stateless controller methods**
- **No caching at controller layer**
- **Immediate response after service calls**