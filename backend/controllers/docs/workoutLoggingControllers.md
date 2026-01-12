# Workout Logging Controller Documentation

## Overview
Handles HTTP request processing for workout log operations. Coordinates between route middleware validation and workout log service layer. Manages authentication context extraction, business logic orchestration, error handling, and response formatting for all workout logging functionality.

## Controller Methods

### createWorkoutLog() / logWorkout()
**File:** `controllers/workout-log.js`
**Line:** 11-41 (createWorkoutLog), 242 (alias as logWorkout)
**Route Endpoint:** `POST /v1/workouts/log`

#### Request Processing
- **Extracted From Request:**
  - Body: `req.body` (workout log data - validated by middleware)
  - User Context: `req.user.id`
  - Headers: `req.headers.authorization` (JWT token extraction)

#### Business Logic Flow
1. Extract userId and jwtToken from request context
2. Validate authentication credentials exist
3. Log operation start with user ID
4. Call workout log service to store data
5. Log successful creation with generated log ID
6. Return standardized success response

#### Service Calls
```javascript
// Primary service call
const savedLog = await workoutLogService.storeWorkoutLog(userId, logData, jwtToken);
```

#### Response Transformation
- **Service Response:** Workout log object with database fields
- **Controller Response:** `{ status: 'success', data: savedLog, message: 'Workout log saved successfully.' }`
- **Added Fields:** status, message wrapper
- **Removed Fields:** None (service response passed through)

#### Error Handling
- **Try/Catch Blocks:** Yes
- **Error Transformation:** DatabaseError → 500 with generic message, other errors → 500 with generic message
- **Logging:** Comprehensive logging of user ID, error message, and full error object

---

### getWorkoutLogs()
**File:** `controllers/workout-log.js`
**Line:** 47-82
**Route Endpoint:** `GET /v1/workouts/log`

#### Request Processing
- **Extracted From Request:**
  - Query: `req.query` (filters: limit, offset, startDate, endDate, planId - validated by middleware)
  - User Context: `req.user.id`
  - Headers: `req.headers.authorization` (JWT token extraction)

#### Business Logic Flow
1. Extract userId, jwtToken, and filters from request
2. Validate authentication credentials exist
3. Log retrieval operation with user ID and filters
4. Call workout log service to retrieve filtered logs
5. Log successful retrieval with count
6. Return standardized success response with data array

#### Service Calls
```javascript
// Primary service call
const logs = await workoutLogService.retrieveWorkoutLogs(userId, filters, jwtToken);
```

#### Response Transformation
- **Service Response:** Array of workout log objects
- **Controller Response:** `{ status: 'success', data: logs, message: 'Workout logs retrieved successfully.' }`
- **Added Fields:** status, message wrapper, logs count in logging
- **Removed Fields:** None (service response passed through)

#### Error Handling
- **Try/Catch Blocks:** Yes
- **Error Transformation:** DatabaseError → 500 with generic message, other errors → 500 with generic message
- **Logging:** User ID, filters applied, error details, and successful count

---

### getWorkoutLog()
**File:** `controllers/workout-log.js`
**Line:** 88-130
**Route Endpoint:** `GET /v1/workouts/log/:logId`

#### Request Processing
- **Extracted From Request:**
  - Params: `req.params.logId`
  - User Context: `req.user.id`
  - Headers: `req.headers.authorization` (JWT token extraction)

#### Business Logic Flow
1. Extract userId, jwtToken, and logId from request
2. Validate authentication credentials exist
3. Validate logId parameter is present
4. Log retrieval operation with log ID and user ID
5. Call workout log service to retrieve specific log
6. Log successful retrieval
7. Return standardized success response

#### Service Calls
```javascript
// Primary service call
const log = await workoutLogService.retrieveWorkoutLog(logId, userId, jwtToken);
```

#### Response Transformation
- **Service Response:** Single workout log object
- **Controller Response:** `{ status: 'success', data: log, message: 'Workout log retrieved successfully.' }`
- **Added Fields:** status, message wrapper
- **Removed Fields:** None (service response passed through)

#### Error Handling
- **Try/Catch Blocks:** Yes
- **Error Transformation:** NotFoundError → 404, DatabaseError → 500, other errors → 500
- **Logging:** User ID, log ID, error details for failures

---

### updateWorkoutLog()
**File:** `controllers/workout-log.js`
**Line:** 136-181
**Route Endpoint:** `PATCH /v1/workouts/log/:logId`

#### Request Processing
- **Extracted From Request:**
  - Body: `req.body` (update data - validated by middleware)
  - Params: `req.params.logId`
  - User Context: `req.user.id`
  - Headers: `req.headers.authorization` (JWT token extraction)

#### Business Logic Flow
1. Extract userId, jwtToken, logId, and updates from request
2. Validate authentication credentials exist
3. Validate logId parameter is present
4. Log update operation with log ID and user ID
5. Call workout log service to update log
6. Log successful update
7. Return standardized success response

#### Service Calls
```javascript
// Primary service call
const updatedLog = await workoutLogService.updateWorkoutLog(logId, updates, userId, jwtToken);
```

#### Response Transformation
- **Service Response:** Updated workout log object
- **Controller Response:** `{ status: 'success', data: updatedLog, message: 'Workout log updated successfully.' }`
- **Added Fields:** status, message wrapper
- **Removed Fields:** None (service response passed through)

#### Error Handling
- **Try/Catch Blocks:** Yes
- **Error Transformation:** NotFoundError → 404, DatabaseError → 500, other errors → 500
- **Logging:** User ID, log ID, error details for all operations

---

### deleteWorkoutLog()
**File:** `controllers/workout-log.js`
**Line:** 187-226
**Route Endpoint:** `DELETE /v1/workouts/log/:logId`

#### Request Processing
- **Extracted From Request:**
  - Params: `req.params.logId`
  - User Context: `req.user.id`
  - Headers: `req.headers.authorization` (JWT token extraction)

#### Business Logic Flow
1. Extract userId, jwtToken, and logId from request
2. Validate authentication credentials exist
3. Validate logId parameter is present
4. Log deletion operation with log ID and user ID
5. Call workout log service to delete log
6. Log successful deletion
7. Return standardized success response (no data field)

#### Service Calls
```javascript
// Primary service call
await workoutLogService.deleteWorkoutLog(logId, userId, jwtToken);
```

#### Response Transformation
- **Service Response:** Void (no return data)
- **Controller Response:** `{ status: 'success', message: 'Workout log deleted successfully.' }`
- **Added Fields:** status, message wrapper
- **Removed Fields:** No data field for deletion confirmation

#### Error Handling
- **Try/Catch Blocks:** Yes
- **Error Transformation:** NotFoundError → 404, DatabaseError → 500, other errors → 500
- **Logging:** User ID, log ID, successful deletion confirmation

---

## Authentication Pattern
All methods implement consistent authentication extraction:
```javascript
const userId = req.user?.id;
const jwtToken = req.headers.authorization?.split(' ')[1];

if (!userId || !jwtToken) {
  logger.warn('[methodName] called without userId or jwtToken in request context.');
  return res.status(401).json({ status: 'error', message: 'Authentication required.' });
}
```

## Error Classification
- **NotFoundError:** Returns 404 with error message
- **DatabaseError:** Returns 500 with generic database message
- **ApplicationError:** Returns 500 with generic internal error message
- **Missing Parameters:** Returns 400 with specific validation message

## Response Standardization
All successful responses follow the pattern:
```javascript
{
  status: 'success',
  data: [responseData], // Omitted for deletion
  message: '[Operation] successful.'
}
```

All error responses follow the pattern:
```javascript
{
  status: 'error',
  message: '[Specific error message]'
}
```

## Integration Considerations
- **Loading States:** All database operations should show loading indicators (create, update, delete operations)
- **Optimistic Updates:** Not recommended - all operations require server confirmation due to validation complexity
- **Validation Beyond Schema:** 
  - Authentication context validation (userId/jwtToken presence)
  - Path parameter validation (logId presence)
  - Business rule validation handled by service layer
- **Rate Limiting:** Create and update operations are rate limited at route level
- **Logging:** Comprehensive operation logging for debugging and audit trails