# Goal Management Routes Documentation

## Overview
Goal management routes handle all operations related to fitness goal creation, tracking, prediction, and progress monitoring. These routes provide comprehensive goal lifecycle management including AI-powered achievement prediction and milestone tracking.

## Route Definitions

### GET /v1/goals
**File:** `routes/goals.js`
**Line:** 31
**Router:** `router` (express.Router() instance)

#### Configuration
- **Rate Limiting:** No rate limiting applied (read operation)
- **Middleware Applied:** `authenticate` (JWT token validation)
- **Authentication Required:** Yes (JWT Bearer token)
- **OpenAPI Reference:** `/docs/paths/goals/goals.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** 
  - `status` (optional): Filter by goal status (active, completed, paused, cancelled)
  - `type` (optional): Filter by goal type (weight_loss, muscle_gain, strength, endurance, body_composition)
  - `timeframe` (optional): Filter by timeframe (1month, 3months, 6months, 1year)
- **Body Validation:** None (GET request)

#### Handler Mapping
- **Controller Method:** `analyticsController.getUserGoals()`
- **Response Format:** JSON array of user goals with progress calculations

#### Error Routes
- **400:** Invalid query parameter values
- **401:** Missing or invalid JWT token
- **500:** Database connection error

---

### POST /v1/goals
**File:** `routes/goals.js`
**Line:** 38
**Router:** `router` (express.Router() instance)

#### Configuration
- **Rate Limiting:** Yes - `goalLimiter` (10 requests per hour, disabled in test environment)
- **Middleware Applied:** `authenticate`, `goalLimiter`
- **Authentication Required:** Yes (JWT Bearer token)
- **OpenAPI Reference:** `/docs/paths/goals/goals.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** 
  - `goalDefinition` (required): Object with `type`, `target`, `timeframe` properties
  - Valid types: weight_loss, muscle_gain, strength, endurance, body_composition
  - Valid timeframes: 1month, 3months, 6months, 1year

#### Handler Mapping
- **Controller Method:** `analyticsController.createGoal()`
- **Response Format:** JSON with created goal details and baseline metrics

#### Error Routes
- **400:** Missing required fields, invalid goal type/timeframe
- **401:** Missing or invalid JWT token
- **429:** Rate limit exceeded (10 requests/hour)
- **500:** Database connection error

---

### GET /v1/goals/:goalId/progress
**File:** `routes/goals.js`
**Line:** 45
**Router:** `router` (express.Router() instance)

#### Configuration
- **Rate Limiting:** No rate limiting applied (read operation)
- **Middleware Applied:** `authenticate`
- **Authentication Required:** Yes (JWT Bearer token)
- **OpenAPI Reference:** `/docs/paths/goals/goals_goalId_progress.yaml`

#### Route Parameters
- **Path Parameters:** 
  - `goalId` (required): UUID of the goal to track progress for
- **Query Parameters:** None
- **Body Validation:** None (GET request)

#### Handler Mapping
- **Controller Method:** `analyticsController.getGoalProgress()`
- **Response Format:** JSON with progress percentage, current/target values, milestones

#### Error Routes
- **400:** Invalid goalId format (not UUID)
- **401:** Missing or invalid JWT token
- **404:** Goal not found or doesn't belong to user
- **500:** Database connection error

---

### PUT /v1/goals/:goalId
**File:** `routes/goals.js`
**Line:** 52
**Router:** `router` (express.Router() instance)

#### Configuration
- **Rate Limiting:** Yes - `goalLimiter` (10 requests per hour, disabled in test environment)
- **Middleware Applied:** `authenticate`, `goalLimiter`
- **Authentication Required:** Yes (JWT Bearer token)
- **OpenAPI Reference:** `/docs/paths/goals/goals_goalId.yaml`

#### Route Parameters
- **Path Parameters:**
  - `goalId` (required): UUID of the goal to update
- **Query Parameters:** None
- **Body Validation:**
  - `updates` (required): Object with allowed fields (target, timeframe, description, priority)

#### Handler Mapping
- **Controller Method:** `analyticsController.updateGoal()`
- **Response Format:** JSON with updated goal details

#### Error Routes
- **400:** Invalid goalId format, invalid update fields
- **401:** Missing or invalid JWT token
- **404:** Goal not found or doesn't belong to user
- **429:** Rate limit exceeded (10 requests/hour)
- **500:** Database connection error

---

### POST /v1/goals/:goalId/predict
**File:** `routes/goals.js`
**Line:** 59
**Router:** `router` (express.Router() instance)

#### Configuration
- **Rate Limiting:** Yes - `goalLimiter` (10 requests per hour, disabled in test environment)
- **Middleware Applied:** `authenticate`, `goalLimiter`
- **Authentication Required:** Yes (JWT Bearer token)
- **OpenAPI Reference:** `/docs/paths/goals/goals_goalId_predict.yaml`

#### Route Parameters
- **Path Parameters:**
  - `goalId` (required): UUID of the goal for prediction (Note: Actually uses `goalDefinition` from body)
- **Query Parameters:** None
- **Body Validation:**
  - `goalDefinition` (required): Object with `type`, `target` properties for AI prediction

#### Handler Mapping
- **Controller Method:** `analyticsController.predictGoalAchievement()`
- **Response Format:** JSON with AI prediction results, probability, timeline, recommendations

#### Error Routes
- **400:** Missing goalDefinition, invalid goal type
- **401:** Missing or invalid JWT token
- **429:** Rate limit exceeded (10 requests/hour)
- **500:** AI service unavailable, database connection error

---

## Route Precedence Notes
Routes are defined in order of specificity. The parameterized route `/:goalId` comes after specific routes like `/progress` and `/predict` to avoid route conflicts.

## Rate Limiting Strategy
- **Goal Limiter Configuration:**
  - **Window:** 1 hour (60 * 60 * 1000 ms)
  - **Max Requests:** 10 per window per user
  - **Test Environment:** Rate limiting disabled (`NODE_ENV === 'test'`)
  - **Applied To:** POST /goals, PUT /goals/:goalId, POST /goals/:goalId/predict

## Authentication Flow
All routes require authentication via the `authenticate` middleware:
1. Extract JWT token from `Authorization: Bearer <token>` header
2. Validate token with Supabase Auth
3. Populate `req.user.id` with authenticated user ID
4. Routes use `req.user.id` for user ownership validation

## Integration Notes
- **Frontend Integration:** All routes expect JWT tokens from Supabase Auth
- **Mobile Optimization:** Goal progress data available through mobile analytics endpoints
- **Caching Strategy:** AI predictions cached for 15 minutes to reduce OpenAI API costs
- **Database Security:** All routes enforce user ownership through RLS policies and service-layer filtering
- **Error Handling:** Comprehensive error classification and logging for debugging
- **Performance:** Read operations (GET) not rate-limited, write operations rate-limited

## Database Tables Accessed
- **Primary:** `user_goals` - Goal definitions, targets, progress
- **Analytics:** `user_analytics_aggregates` - Current metrics for progress calculation
- **Profile:** `profiles` - User demographics for AI predictions