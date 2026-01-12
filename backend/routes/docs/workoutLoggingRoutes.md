# Workout Logging Routes Documentation

## Overview
Routes for tracking and managing workout logs. Handles creation, retrieval, updating, and deletion of workout log entries. Includes rate limiting for operations and comprehensive filtering options for log retrieval.

## Route Definitions

### POST /v1/workouts/log
**File:** `routes/workout-log.js`
**Line:** 32-36
**Router:** express.Router()

#### Configuration
- **Rate Limiting:** Yes - 20 requests/hour (production), 100 requests/minute (test)
- **Middleware Applied:** authenticate → logOperationLimiter → validateWorkoutLog → workoutLogController.logWorkout
- **Authentication Required:** Yes, JWT via authenticate middleware
- **OpenAPI Reference:** `/docs/paths/workoutLogs/workouts_log.yaml` (post operation)

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** validateWorkoutLog middleware (workoutLogSchema)

#### Handler Mapping
- **Controller Method:** `workoutLogController.logWorkout()`
- **Response Format:** JSON with created workout log data

#### Error Routes
- **400:** Invalid request body (validation failed)
- **401:** Unauthorized (missing/invalid JWT token)
- **429:** Rate limit exceeded (too many log operations)
- **500:** Internal server error

---

### GET /v1/workouts/log
**File:** `routes/workout-log.js`
**Line:** 38-42
**Router:** express.Router()

#### Configuration
- **Rate Limiting:** No
- **Middleware Applied:** authenticate → validateWorkoutLogQuery → workoutLogController.getWorkoutLogs
- **Authentication Required:** Yes, JWT via authenticate middleware
- **OpenAPI Reference:** `/docs/paths/workoutLogs/workouts_log.yaml` (get operation)

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** limit, offset, startDate, endDate, planId (all optional)
- **Body Validation:** validateWorkoutLogQuery middleware for query parameters

#### Handler Mapping
- **Controller Method:** `workoutLogController.getWorkoutLogs()`
- **Response Format:** JSON with paginated array of workout logs

#### Error Routes
- **400:** Invalid query parameters
- **401:** Unauthorized (missing/invalid JWT token)
- **500:** Internal server error

---

### GET /v1/workouts/log/:logId
**File:** `routes/workout-log.js`
**Line:** 44-47
**Router:** express.Router()

#### Configuration
- **Rate Limiting:** No
- **Middleware Applied:** authenticate → workoutLogController.getWorkoutLog
- **Authentication Required:** Yes, JWT via authenticate middleware
- **OpenAPI Reference:** `/docs/paths/workoutLogs/workouts_log_logId.yaml` (get operation)

#### Route Parameters
- **Path Parameters:** logId (UUID format)
- **Query Parameters:** None
- **Body Validation:** None

#### Handler Mapping
- **Controller Method:** `workoutLogController.getWorkoutLog()`
- **Response Format:** JSON with specific workout log data

#### Error Routes
- **401:** Unauthorized (missing/invalid JWT token)
- **404:** Workout log not found or not owned by user
- **500:** Internal server error

---

### PATCH /v1/workouts/log/:logId
**File:** `routes/workout-log.js`
**Line:** 49-54
**Router:** express.Router()

#### Configuration
- **Rate Limiting:** Yes - 20 requests/hour (production), 100 requests/minute (test)
- **Middleware Applied:** authenticate → logOperationLimiter → validateWorkoutLogUpdate → workoutLogController.updateWorkoutLog
- **Authentication Required:** Yes, JWT via authenticate middleware
- **OpenAPI Reference:** `/docs/paths/workoutLogs/workouts_log_logId.yaml` (patch operation)

#### Route Parameters
- **Path Parameters:** logId (UUID format)
- **Query Parameters:** None
- **Body Validation:** validateWorkoutLogUpdate middleware (workoutLogUpdateSchema)

#### Handler Mapping
- **Controller Method:** `workoutLogController.updateWorkoutLog()`
- **Response Format:** JSON with updated workout log data

#### Error Routes
- **400:** Invalid request body (validation failed)
- **401:** Unauthorized (missing/invalid JWT token)
- **404:** Workout log not found or not owned by user
- **429:** Rate limit exceeded (too many log operations)
- **500:** Internal server error

---

### DELETE /v1/workouts/log/:logId
**File:** `routes/workout-log.js`
**Line:** 56-59
**Router:** express.Router()

#### Configuration
- **Rate Limiting:** No
- **Middleware Applied:** authenticate → workoutLogController.deleteWorkoutLog
- **Authentication Required:** Yes, JWT via authenticate middleware
- **OpenAPI Reference:** `/docs/paths/workoutLogs/workouts_log_logId.yaml` (delete operation)

#### Route Parameters
- **Path Parameters:** logId (UUID format)
- **Query Parameters:** None
- **Body Validation:** None

#### Handler Mapping
- **Controller Method:** `workoutLogController.deleteWorkoutLog()`
- **Response Format:** JSON with deletion confirmation

#### Error Routes
- **401:** Unauthorized (missing/invalid JWT token)
- **404:** Workout log not found or not owned by user
- **500:** Internal server error

---

## Rate Limiting Configuration

### logOperationLimiter
- **Window:** 1 hour (production), 1 minute (test)
- **Max Requests:** 20 (production), 100 (test)
- **Applied To:** POST /v1/workouts/log, PATCH /v1/workouts/log/:logId
- **Message:** "Too many workout log operations from this IP, please try again after an hour"
- **Headers:** Uses standardHeaders, no legacyHeaders

## Route Precedence Notes
- All routes are defined in order of specificity (most specific first)
- No route conflicts due to different HTTP methods and specific path patterns
- All routes are properly namespaced under `/v1/workouts/log`

## Integration Notes
- All routes require authentication - frontend must include JWT token in Authorization header
- Rate limiting applies to create/update operations only - consider implementing client-side queuing
- Query parameter validation ensures type safety for frontend filtering implementations
- Path parameters (logId) must be UUID format - frontend should validate before making requests
- Error responses include structured JSON for consistent frontend error handling