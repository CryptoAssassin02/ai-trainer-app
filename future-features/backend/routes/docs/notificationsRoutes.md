# Notifications Routes Documentation

## Overview
The notifications routes handle user notification preference management and testing functionality. This route module provides three endpoints for managing user notification settings across multiple channels (email, SMS, push, in-app) with rate limiting protection and comprehensive validation.

## Route Definitions

### POST /v1/notifications/preferences
**File:** `routes/notifications.js`
**Line:** 27
**Router:** express.Router()

#### Configuration
- **Rate Limiting:** Yes - 10 updates per hour per user
- **Middleware Applied:** [authenticate, preferencesLimiter, validateNotificationPreferences]
- **Authentication Required:** Yes - JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/notifications/updatePreferences.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** notificationPreferencesSchema (Joi validation)

#### Handler Mapping
- **Controller Method:** `notificationController.updatePreferences()`
- **Response Format:** JSON with status, data, and message

#### Error Routes
- **400:** Invalid notification preferences (validation failed)
- **401:** Missing or invalid JWT token
- **429:** Too many preference updates (rate limit exceeded)
- **500:** Internal server error during preference storage

---

### GET /v1/notifications/preferences
**File:** `routes/notifications.js`
**Line:** 37
**Router:** express.Router()

#### Configuration
- **Rate Limiting:** No - Read operation
- **Middleware Applied:** [authenticate]
- **Authentication Required:** Yes - JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/notifications/getPreferences.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** None (GET request)

#### Handler Mapping
- **Controller Method:** `notificationController.getPreferences()`
- **Response Format:** JSON with status and data (preferences object)

#### Error Routes
- **401:** Missing or invalid JWT token
- **500:** Internal server error during preference retrieval

---

### POST /v1/notifications/test
**File:** `routes/notifications.js`
**Line:** 45
**Router:** express.Router()

#### Configuration
- **Rate Limiting:** Yes - 10 tests per hour per user (shared with preferences limiter)
- **Middleware Applied:** [authenticate, preferencesLimiter]
- **Authentication Required:** Yes - JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/notifications/testNotification.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** Manual validation in controller (channel field required)

#### Handler Mapping
- **Controller Method:** `notificationController.testNotification()`
- **Response Format:** JSON with status, data, and message

#### Error Routes
- **400:** Invalid notification channel specified
- **401:** Missing or invalid JWT token
- **429:** Too many test requests (rate limit exceeded)
- **500:** Internal server error during test notification

## Rate Limiting Configuration

### Preferences Limiter
**File:** `routes/notifications.js`
**Lines:** 10-17
**Configuration:**
- **Window:** 1 hour (60 * 60 * 1000 ms)
- **Max Requests:** 10 per user per hour
- **Key Generator:** `req.user.id` (user-specific limiting)
- **Headers:** Standard headers enabled, legacy headers disabled
- **Error Response:** JSON format with status and message

**Applied To:**
- POST /v1/notifications/preferences
- POST /v1/notifications/test

## Validation Schemas

### Notification Preferences Schema
**File:** `middleware/validation.js`
**Lines:** 1080-1088
**Schema Details:**
- **email_enabled:** Boolean (optional)
- **sms_enabled:** Boolean (optional)
- **push_enabled:** Boolean (optional)
- **in_app_enabled:** Boolean (optional)
- **quiet_hours_start:** String pattern HH:MM format (optional)
- **quiet_hours_end:** String pattern HH:MM format (optional)

**Pattern Validation:**
- Time format: `/^([01]\d|2[0-3]):([0-5]\d)$/`
- Custom error messages for invalid time format

## Route Registration

### Main Router Integration
**File:** `routes/index.js`
**Line:** 83
**Mount Path:** `/notifications`
**Full Endpoint Paths:**
- `/v1/notifications/preferences` (POST, GET)
- `/v1/notifications/test` (POST)

## Route Precedence Notes
All notification routes are registered at the same level with no precedence conflicts. The specific HTTP methods (GET vs POST) differentiate the preferences endpoints.

## Integration Notes

### Frontend Integration Requirements
- **Authentication:** All endpoints require JWT Bearer token in Authorization header
- **Rate Limiting:** Frontend should handle 429 responses with retry logic
- **Validation:** Use provided schemas for client-side validation before API calls
- **Error Handling:** Implement proper error handling for all documented error codes

### Channel Support
**Supported Notification Channels:**
- `email` - Email notifications
- `sms` - SMS text notifications  
- `push` - Push notifications (mobile/web)
- `in_app` - In-application notifications

### MVP Implementation Notes
- Test notification functionality is currently a mock implementation
- Actual notification delivery mechanisms are placeholders for future enhancement
- Preference storage and retrieval are fully functional