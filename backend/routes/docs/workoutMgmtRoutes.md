# Workout Management Routes Documentation

## Overview
Workout Management routes handle AI-powered workout plan generation, listing, retrieval, adjustment, and deletion. These routes integrate with AI agents for research-backed plan generation and intelligent plan modifications based on user feedback.

## Route Definitions

### POST /v1/workouts
**File:** `routes/workout.js`
**Line:** 34-39
**Router:** express.Router()

#### Configuration
- **Rate Limiting:** Yes, 10 requests/hour in production, 100 requests/minute in test
- **Middleware Applied:** [authenticate, planGenerationLimiter, validateWorkoutGeneration]
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/workouts/workouts.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** workoutGenerationSchema (Joi)

#### Handler Mapping
- **Controller Method:** `workoutController.generateWorkoutPlan()`
- **Response Format:** 
  ```json
  {
    "planId": "uuid",
    "planName": "string",
    "exercises": [...],
    "researchInsights": [...],
    "reasoning": "string"
  }
  ```

#### Error Routes
- **400:** Invalid request body, validation failed
- **401:** Authentication required or invalid JWT token
- **429:** Rate limit exceeded (10 requests/hour)
- **500:** Internal server error, AI generation failed

---

### GET /v1/workouts
**File:** `routes/workout.js`
**Line:** 47-51
**Router:** express.Router()

#### Configuration
- **Rate Limiting:** No specific rate limiting
- **Middleware Applied:** [authenticate, validateWorkoutQuery]
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/workouts/workouts.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** 
  - `limit` (integer, 1-100, default: 10)
  - `offset` (integer, min: 0, default: 0)
  - `searchTerm` (string, max: 100 chars, optional)
  - `status` (enum: draft|active|archived, optional)
  - `difficulty` (enum: beginner|intermediate|advanced, optional)
  - `sortBy` (enum: created_at|updated_at|name, default: created_at)
- **Body Validation:** workoutQuerySchema (Joi)

#### Handler Mapping
- **Controller Method:** `workoutController.getWorkoutPlans()`
- **Response Format:** 
  ```json
  {
    "data": [...],
    "pagination": {
      "total": "number",
      "page": "number",
      "limit": "number"
    }
  }
  ```

#### Error Routes
- **400:** Invalid query parameters
- **401:** Authentication required or invalid JWT token
- **500:** Internal server error

---

### GET /v1/workouts/:planId
**File:** `routes/workout.js`
**Line:** 58-62
**Router:** express.Router()

#### Configuration
- **Rate Limiting:** No specific rate limiting
- **Middleware Applied:** [authenticate]
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/workouts/workouts_planId.yaml`

#### Route Parameters
- **Path Parameters:** 
  - `planId` (UUID, required) - Unique workout plan identifier
- **Query Parameters:** None
- **Body Validation:** None (planId validated in controller)

#### Handler Mapping
- **Controller Method:** `workoutController.getWorkoutPlan()`
- **Response Format:** 
  ```json
  {
    "planId": "uuid",
    "planName": "string",
    "exercises": [...],
    "researchInsights": [...],
    "reasoning": "string",
    "createdAt": "ISO string",
    "updatedAt": "ISO string"
  }
  ```

#### Error Routes
- **401:** Authentication required or invalid JWT token
- **403:** Permission denied (user doesn't own plan)
- **404:** Workout plan not found
- **500:** Internal server error

---

### POST /v1/workouts/:planId
**File:** `routes/workout.js`
**Line:** 71-76
**Router:** express.Router()

#### Configuration
- **Rate Limiting:** No specific rate limiting (consider implementing 20 requests/hour)
- **Middleware Applied:** [authenticate, validateWorkoutAdjustment]
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/workouts/workouts_planId.yaml`

#### Route Parameters
- **Path Parameters:** 
  - `planId` (UUID, required) - Unique workout plan identifier
- **Query Parameters:** None
- **Body Validation:** workoutAdjustmentSchema (Joi)

#### Handler Mapping
- **Controller Method:** `workoutController.adjustWorkoutPlan()`
- **Response Format:** 
  ```json
  {
    "adjustedPlan": {...},
    "appliedChanges": [...],
    "skippedChanges": [...],
    "feedbackSummary": "string",
    "adjustmentReasoning": "string"
  }
  ```

#### Error Routes
- **400:** Invalid request body, validation failed
- **401:** Authentication required or invalid JWT token
- **403:** Permission denied (user doesn't own plan)
- **404:** Workout plan not found
- **422:** Adjustment could not be processed
- **429:** Rate limit exceeded (if implemented)
- **500:** Internal server error, AI adjustment failed

---

### DELETE /v1/workouts/:planId
**File:** `routes/workout.js`
**Line:** 83-87
**Router:** express.Router()

#### Configuration
- **Rate Limiting:** No specific rate limiting
- **Middleware Applied:** [authenticate]
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/workouts/workouts_planId.yaml`

#### Route Parameters
- **Path Parameters:** 
  - `planId` (UUID, required) - Unique workout plan identifier
- **Query Parameters:** None
- **Body Validation:** None

#### Handler Mapping
- **Controller Method:** `workoutController.deleteWorkoutPlan()`
- **Response Format:** No content (204 status)

#### Error Routes
- **401:** Authentication required or invalid JWT token
- **403:** Permission denied (user doesn't own plan)
- **404:** Workout plan not found
- **500:** Internal server error

---

## Route Precedence Notes
- Workout routes are mounted at `/workouts` under the `/v1` API prefix
- The router is mounted AFTER workout log routes to avoid /:planId conflicts
- All routes require authentication via JWT Bearer token
- Routes are processed in order: specific paths before parameterized paths

## Validation Schemas

### workoutGenerationSchema
```javascript
{
  fitnessLevel: required enum ['beginner', 'intermediate', 'advanced'],
  goals: required array of strings (min 1),
  equipment: optional array of strings,
  restrictions: optional array of strings,
  exerciseTypes: required array of strings (min 1),
  workoutFrequency: optional string,
  additionalNotes: optional string (max 500 chars)
}
```

### workoutAdjustmentSchema
```javascript
{
  adjustments: {
    exercisesToAdd: optional array of objects,
    exercisesToRemove: optional array of UUIDs,
    notesOrPreferences: required string (max 1000 chars)
  }
}
```

### workoutQuerySchema
```javascript
{
  limit: optional integer (1-100, default 10),
  offset: optional integer (min 0, default 0),
  searchTerm: optional string (max 100 chars)
}
```

## Rate Limiting Configuration

### Plan Generation Rate Limiting
- **Production:** 10 requests per hour per IP
- **Test Environment:** 100 requests per minute per IP
- **Headers:** Uses standardHeaders (RateLimit-*), no legacy headers
- **Handler:** Custom handler with logger.warn for rate limit violations
- **Response:** 
  ```json
  {
    "status": "error",
    "message": "Too many workout plan generation requests from this IP, please try again after an hour"
  }
  ```

## Integration Notes
- All routes use RLS (Row Level Security) for data access control
- Plan ownership is enforced at the controller/service level
- AI agent integration occurs in controller layer
- Response caching may be implemented for GET endpoints
- Soft delete implementation maintains data integrity for associated workout logs
- Frontend should handle 429 rate limiting gracefully with user feedback