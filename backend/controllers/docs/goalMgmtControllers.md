# Goal Management Controllers Documentation

## Overview
Goal management controllers handle the business logic for fitness goal operations, including creation, tracking, progress monitoring, and AI-powered achievement prediction. These controllers are implemented within the analytics controller module and coordinate between HTTP request processing and the goal prediction service.

## Controller Methods

### predictGoalAchievement
**File:** `controllers/analytics.js`
**Lines:** 672-749
**Route Handler:** POST /v1/goals/:goalId/predict

#### Request Processing
- **Authentication:** Extracts `userId` from `req.user.id` (follows consistent pattern)
- **JWT Token:** Extracted from `Authorization` header (Bearer token)
- **Body Extraction:** `goalDefinition` object from `req.body`
- **Validation Logic:**
  - JWT token presence validation
  - Goal definition structure validation (requires `type` and `target`)
  - Goal type validation against enum: weight_loss, muscle_gain, strength, endurance, body_composition
  - Target value validation (numeric value required)

#### Service Integration
- **Service Call:** `goalPredictionService.predictGoalAchievement(userId, jwtToken, goalDefinition)`
- **Parameter Order:** Follows JWT token parameter ordering rule (userId, jwtToken, goalDefinition)
- **Response Processing:** Direct passthrough of service response
- **Caching:** Service handles 15-minute cache internally

#### Error Handling
- **ApplicationError:** 400 status with error message
- **DatabaseError:** 500 status with database failure message  
- **Generic Errors:** 500 status with generic failure message
- **Logging:** Comprehensive error logging with user context

#### Response Format
```json
{
  "status": "success", 
  "data": {
    "goalType": "weight_loss",
    "achievementProbability": 0.75,
    "estimatedTimeToCompletion": "4-5 months", 
    "confidenceScore": 0.85,
    "recommendedAdjustments": ["Increase protein intake", "Add strength training"],
    "milestones": [{"percentage": 0.25, "date": "2024-03-15"}],
    "riskFactors": ["Low adherence in past month"]
  }
}
```

---

### getGoalProgress  
**File:** `controllers/analytics.js`
**Lines:** 759-835
**Route Handler:** GET /v1/goals/:goalId/progress

#### Request Processing
- **Authentication:** Extracts `userId` from `req.user.id`
- **JWT Token:** Extracted from `Authorization` header
- **Path Parameters:** `goalId` from `req.params` with UUID validation
- **Validation Logic:**
  - JWT token presence validation
  - Goal ID presence validation
  - UUID format validation using `isValidUUID()` helper

#### Service Integration
- **Service Call:** `goalPredictionService.trackGoalProgress(userId, jwtToken, goalId)`
- **Parameter Order:** Follows established JWT token parameter ordering
- **Response Processing:** Direct service response passthrough
- **Progress Calculation:** Service handles progress percentage and milestone tracking

#### Error Handling
- **NotFoundError:** 404 status when goal not found or unauthorized
- **ApplicationError:** 400 status with validation message
- **DatabaseError:** 500 status with database failure message
- **Logging:** Error context includes userId and goalId

#### Response Format
```json
{
  "status": "success",
  "data": {
    "goalId": "uuid",
    "goalType": "weight_loss", 
    "progressPercentage": 67.5,
    "currentValue": 77.5,
    "targetValue": 70,
    "milestonesAchieved": [{"name": "50% Complete"}],
    "onTrack": true,
    "daysRemaining": 45
  }
}
```

---

### createGoal
**File:** `controllers/analytics.js` 
**Lines:** 836-926
**Route Handler:** POST /v1/goals

#### Request Processing
- **Authentication:** Extracts `userId` from `req.user.id`
- **JWT Token:** Extracted from `Authorization` header
- **Body Extraction:** `goalDefinition` object from `req.body`
- **Comprehensive Validation:**
  - JWT token presence validation
  - Goal definition presence validation
  - Required fields validation: type, target, timeframe
  - Goal type enum validation: weight_loss, muscle_gain, strength, endurance, body_composition
  - Timeframe enum validation: 1month, 3months, 6months, 1year

#### Service Integration
- **Service Call:** `goalPredictionService.createGoal(userId, jwtToken, goalDefinition)`
- **Parameter Order:** Consistent JWT token parameter ordering
- **Baseline Establishment:** Service automatically establishes baseline metrics
- **Database Operations:** Service handles goal creation and initial progress setup

#### Error Handling
- **ValidationError:** 400 status with field-specific error messages
- **ApplicationError:** 400 status with business logic errors
- **DatabaseError:** 500 status with database failure message
- **Field Validation:** Missing fields reported as comma-separated list

#### Response Format
```json
{
  "status": "success",
  "data": {
    "goalId": "uuid",
    "type": "weight_loss",
    "target": {"value": 70, "unit": "kg"},
    "baseline": {"value": 80, "recordedAt": "2024-01-15T10:00:00Z"},
    "timeframe": "6months",
    "status": "active",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

---

### updateGoal
**File:** `controllers/analytics.js`
**Lines:** 927-1021  
**Route Handler:** PUT /v1/goals/:goalId

#### Request Processing
- **Authentication:** Extracts `userId` from `req.user.id`
- **JWT Token:** Extracted from `Authorization` header
- **Path Parameters:** `goalId` from `req.params` with UUID validation
- **Body Extraction:** `updates` object from `req.body`
- **Field Validation:**
  - UUID format validation for goalId
  - Updates object presence and non-empty validation
  - Allowed fields validation: target, timeframe, description, priority
  - Invalid fields rejection with clear error messages

#### Service Integration  
- **Service Call:** `goalPredictionService.updateGoal(userId, jwtToken, goalId, updates)`
- **Parameter Order:** JWT token parameter ordering (userId, jwtToken, goalId, updates)
- **Ownership Verification:** Service verifies goal belongs to user
- **Update Processing:** Service handles partial updates with timestamp

#### Error Handling
- **NotFoundError:** 404 status when goal not found or unauthorized
- **ValidationError:** 400 status with field validation errors
- **ApplicationError:** 400 status with business logic errors  
- **DatabaseError:** 500 status with database failure message
- **Field Security:** Only allowed fields can be updated

#### Response Format
```json
{
  "status": "success", 
  "data": {
    "goalId": "uuid",
    "type": "weight_loss",
    "target": {"value": 65, "unit": "kg"}, 
    "timeframe": "6months",
    "status": "active",
    "description": "Updated target weight",
    "updatedAt": "2024-01-20T10:00:00Z"
  }
}
```

---

### getUserGoals
**File:** `controllers/analytics.js`
**Lines:** 1023-1115
**Route Handler:** GET /v1/goals

#### Request Processing
- **Authentication:** Extracts `userId` from `req.user.id`
- **JWT Token:** Extracted from `Authorization` header  
- **Query Parameters:** Extracted from `req.query` with validation
  - `status`: Filter by goal status (active, completed, paused, cancelled)
  - `type`: Filter by goal type (weight_loss, muscle_gain, strength, endurance, body_composition)  
  - `timeframe`: Filter by timeframe (1month, 3months, 6months, 1year)
- **Options Processing:** Builds filter options object for service call

#### Query Parameter Validation
- **Status Validation:** Enum check against valid statuses
- **Type Validation:** Enum check against valid goal types  
- **Timeframe Validation:** Enum check against valid timeframes
- **Error Responses:** 400 status with clear enum value messages

#### Service Integration
- **Service Call:** `goalPredictionService.getUserGoals(userId, jwtToken, options)`
- **Parameter Order:** Consistent JWT token parameter ordering
- **Progress Enhancement:** Service calculates progress for each goal
- **Filtering:** Service applies query parameter filters

#### Error Handling  
- **ValidationError:** 400 status with invalid parameter messages
- **DatabaseError:** 500 status with database failure message
- **Logging:** Goal count included in success logs

#### Response Format
```json
{
  "status": "success",
  "data": {
    "goals": [
      {
        "id": "uuid",
        "type": "weight_loss", 
        "target": {"value": 70},
        "progressPercentage": 45.5,
        "onTrack": true,
        "daysRemaining": 120,
        "status": "active"
      }
    ],
    "totalGoals": 3,
    "activeGoals": 2, 
    "completedGoals": 1
  }
}
```

---

## Shared Patterns

### Authentication Consistency
All controller methods follow the same authentication pattern:
- Extract `userId` from `req.user.id` (never mix with `req.user.userId`)
- Extract JWT token from `Authorization: Bearer <token>` header
- Validate JWT token presence before proceeding
- Pass both `userId` and `jwtToken` to service methods

### Parameter Ordering
All service calls follow consistent parameter ordering:
- Primary identifier (userId, goalId) first
- JWT token second  
- Request data (goalDefinition, updates, options) third
- Optional parameters last

### Error Classification
Controllers implement comprehensive error handling:
- **ApplicationError:** Business logic validation failures (400)
- **NotFoundError:** Resource not found or unauthorized access (404)
- **DatabaseError:** Database connection or query failures (500) 
- **ValidationError:** Request validation failures (400)

### Response Format Consistency
All responses follow the same structure:
- Success responses: `{status: "success", data: {...}}`
- Error responses: `{status: "error", message: "..."}`
- HTTP status codes align with error types

### Logging Strategy
Controllers provide comprehensive logging:
- **Info Level:** Request start with userId and operation context
- **Success Level:** Operation completion with relevant metrics
- **Error Level:** Full error details with user and operation context
- **Security:** No sensitive data in logs

## Integration Considerations
- **Mobile Analytics:** Goal progress data available through mobile endpoints
- **AI Caching:** Predictions cached at service layer to optimize costs
- **Real-time Updates:** Goal progress updates integrate with analytics aggregation
- **Rate Limiting:** Creation and prediction operations rate-limited at route level
- **Database Security:** All operations enforce user ownership through service layer