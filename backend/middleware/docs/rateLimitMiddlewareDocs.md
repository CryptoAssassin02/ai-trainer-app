# Rate Limit Middleware Documentation

## Overview
Rate limiting middleware protects API endpoints from abuse and ensures fair usage across users. This middleware implements user-specific rate limiting with configurable windows, request limits, and standardized error responses. Applied to critical endpoints including authentication, data modification, and resource-intensive operations.

## Middleware Functions

### Notification Preferences Limiter
**File:** `routes/notifications.js`
**Lines:** 10-17
**Applied To:** Notification preference and test endpoints
**Order:** After authentication, before validation

#### Configuration
- **Window:** 1 hour (60 * 60 * 1000 ms)
- **Max Requests:** 10 per user per hour
- **Key Generator:** `req.user.id` (user-specific limiting)
- **Headers:** Standard headers enabled, legacy headers disabled
- **Scope:** User isolation prevents cross-user rate limit sharing

#### Applied Routes
- `POST /v1/notifications/preferences` - Update notification preferences
- `POST /v1/notifications/test` - Send test notification

#### Rate Limiting Logic
```javascript
const preferencesLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, 
  keyGenerator: (req) => req.user.id,
  message: {
    status: 'error',
    message: 'Too many preference updates. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
```

### Request Processing

#### Incoming Request Modifications
- **Headers Added/Modified:**
  - No request headers modified by rate limiter
- **Body Transformations:**
  - No body transformations performed
- **Request Properties Added:**
  - No request properties added (read-only middleware)

#### Validation/Checks Performed
1. **User Identification:** Extract user ID from `req.user.id` (requires prior authentication)
2. **Rate Limit Check:** Verify user hasn't exceeded 10 requests in current hour window
3. **Request Counting:** Increment request counter for identified user

#### Early Termination Conditions
- **429 Rate Limited:** User has exceeded 10 requests per hour limit
  - Response: JSON error with status and message
  - Headers: Standard rate limiting headers included
  - No retry-after header in current implementation

### Response Processing

#### Outgoing Response Modifications
- **Headers Added (standardHeaders: true):**
  - `X-RateLimit-Limit`: Maximum requests allowed in window (10)
  - `X-RateLimit-Remaining`: Requests remaining in current window
  - `X-RateLimit-Reset`: Timestamp when current window resets
- **Body Transformations:**
  - No modifications to successful responses
  - Creates JSON error body for rate limit violations
- **Status Code Changes:**
  - 429 (Too Many Requests) when rate limit exceeded
  - No modifications for successful requests

### Error Handling
- **Catches Errors:** No (rate limiter handles its own errors internally)
- **Error Transformation:** Rate limit violations generate standardized JSON response
- **Logging:** No explicit logging (express-rate-limit handles internally)

### Side Effects
- **Database Operations:** None (memory-based rate limiting)
- **External API Calls:** None
- **Caching:** In-memory rate limit counters (managed by express-rate-limit)
- **Metrics/Analytics:** Rate limiting headers provide client-side metrics

### Performance Impact
- **Typical Duration:** < 1ms (memory lookup and increment)
- **Async Operations:** No (synchronous memory operations)
- **Blocking Behavior:** None for successful requests

## Integration Considerations

### Frontend Implications
- **Rate Limit Headers:** Monitor `X-RateLimit-Remaining` to prevent hitting limits
- **Error Handling:** Implement 429 response handling with user-friendly messages
- **Retry Logic:** Wait for rate limit window reset before retrying

### Error Handling Patterns
**Rate Limit Response Format:**
```json
{
  "status": "error",
  "message": "Too many preference updates. Please try again later."
}
```

### Required Request Format
- **Authentication:** Must have valid JWT token (req.user.id required for key generation)
- **User Context:** Rate limiting depends on authenticated user identification
- **No Special Headers:** No additional headers required beyond authentication

### Notification-Specific Considerations
- **Update Frequency:** 10 requests per hour sufficient for normal preference management
- **Test Notifications:** Share rate limit with preferences (combined usage)
- **Channel Testing:** Each test counts toward user's hourly limit
- **Production vs MVP:** Current limits appropriate for MVP notification functionality