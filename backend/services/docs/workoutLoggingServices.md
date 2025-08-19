# Workout Logging Service Documentation

## Overview
Handles all database operations for workout logs including creation, retrieval, updates, and deletion. Implements row-level security through Supabase JWT tokens, provides comprehensive error handling, and supports filtering and pagination for log retrieval. Manages data transformations between API format and database storage format.

## Service Class/Module

### Configuration
- **Dependencies:** @supabase/supabase-js, pg (Pool), ../utils/errors, ../config/logger, ./supabase
- **Database Tables:** workout_logs (primary)
- **External APIs:** Supabase PostgREST API via authenticated client
- **Initialization:** Uses getSupabaseClientWithToken for authenticated database access

## Service Methods

### storeWorkoutLog()
**File:** `services/workout-log-service.js`
**Line:** 17-58
**Called By:** `workoutLogController.createWorkoutLog()`, `workoutLogController.logWorkout()`

#### Method Signature
```javascript
async storeWorkoutLog(userId, logData, jwtToken)
```

#### Parameters
- **userId:** string - User ID for ownership association (required)
- **logData:** object - Workout log data with date, exercises_completed (required)
- **jwtToken:** string - JWT token for RLS authentication (required)

#### Business Logic
1. Validate required fields (date, exercises_completed array)
2. Create authenticated Supabase client with JWT token
3. Transform API data to database format (add user_id, handle defaults)
4. Insert record into workout_logs table with RLS enforcement
5. Return created record with generated ID
6. Handle validation and database errors with proper error types

#### Database Operations
```sql
-- Primary operation
INSERT INTO workout_logs (
  user_id, plan_id, date, completed, 
  exercises_completed, overall_difficulty, 
  energy_level, satisfaction, feedback
) VALUES (...) RETURNING *;
```

#### Transaction Boundaries
- **Uses Transactions:** No (single atomic operation)
- **Rollback Conditions:** N/A
- **Isolation Level:** Default (Supabase managed)

#### Return Value
```javascript
{
  id: "uuid",
  user_id: "uuid",
  plan_id: "uuid|null",
  date: "YYYY-MM-DD",
  completed: boolean,
  exercises_completed: [object],
  overall_difficulty: number|null,
  energy_level: number|null,
  satisfaction: number|null,
  feedback: "string|null",
  created_at: "timestamp",
  updated_at: "timestamp"
}
```

#### Error Cases
- **ValidationError:** Missing date or exercises_completed, empty exercises array
- **DatabaseError:** Supabase insertion failure, constraint violations, RLS permission denied
- **Generic DatabaseError:** Unexpected errors during operation

#### Performance Considerations
- **Typical Duration:** 50-200ms for single log creation
- **Caching:** None implemented
- **Batch Operations:** Not supported (single record operations only)

---

### retrieveWorkoutLogs()
**File:** `services/workout-log-service.js`
**Line:** 67-108
**Called By:** `workoutLogController.getWorkoutLogs()`

#### Method Signature
```javascript
async retrieveWorkoutLogs(userId, filters = {}, jwtToken)
```

#### Parameters
- **userId:** string - User ID for ownership filtering (required)
- **filters:** object - Optional: { limit, offset, startDate, endDate, planId }
- **jwtToken:** string - JWT token for RLS authentication (required)

#### Business Logic
1. Extract filters with defaults (limit=10, offset=0)
2. Create authenticated Supabase client
3. Build query with user_id filter and optional date/plan filters
4. Apply ordering (date DESC) and pagination using range()
5. Execute query and return results array
6. Handle empty results gracefully

#### Database Operations
```sql
-- Primary query with filters
SELECT * FROM workout_logs 
WHERE user_id = $1
  AND date >= $2 (if startDate)
  AND date <= $3 (if endDate)  
  AND plan_id = $4 (if planId)
ORDER BY date DESC
LIMIT $5 OFFSET $6;
```

#### Transaction Boundaries
- **Uses Transactions:** No (read-only operation)
- **Rollback Conditions:** N/A
- **Isolation Level:** Default read committed

#### Return Value
```javascript
[
  {
    id: "uuid",
    user_id: "uuid", 
    plan_id: "uuid|null",
    date: "YYYY-MM-DD",
    completed: boolean,
    exercises_completed: [object],
    overall_difficulty: number|null,
    energy_level: number|null,
    satisfaction: number|null,
    feedback: "string|null",
    created_at: "timestamp",
    updated_at: "timestamp"
  }
]
```

#### Error Cases
- **DatabaseError:** Supabase query failure, RLS permission denied, invalid filter values
- **Generic DatabaseError:** Unexpected errors during retrieval

#### Performance Considerations
- **Typical Duration:** 30-150ms depending on result set size
- **Caching:** None implemented
- **Batch Operations:** Supports pagination via limit/offset

---

### retrieveWorkoutLog()
**File:** `services/workout-log-service.js`
**Line:** 117-156
**Called By:** `workoutLogController.getWorkoutLog()`, `updateWorkoutLog()`, `deleteWorkoutLog()`

#### Method Signature
```javascript
async retrieveWorkoutLog(logId, userId, jwtToken)
```

#### Parameters
- **logId:** string - UUID of the workout log to retrieve (required)
- **userId:** string - User ID for ownership verification (required)
- **jwtToken:** string - JWT token for RLS authentication (required)

#### Business Logic
1. Create authenticated Supabase client
2. Query for single log with both ID and user_id filters
3. Handle specific Supabase error codes (PGRST116 for not found)
4. Validate data exists and return single record
5. Convert database errors to appropriate error types

#### Database Operations
```sql
-- Primary query
SELECT * FROM workout_logs 
WHERE id = $1 AND user_id = $2
LIMIT 1;
```

#### Transaction Boundaries
- **Uses Transactions:** No (single read operation)
- **Rollback Conditions:** N/A
- **Isolation Level:** Default read committed

#### Return Value
```javascript
{
  id: "uuid",
  user_id: "uuid",
  plan_id: "uuid|null", 
  date: "YYYY-MM-DD",
  completed: boolean,
  exercises_completed: [object],
  overall_difficulty: number|null,
  energy_level: number|null,
  satisfaction: number|null,
  feedback: "string|null",
  created_at: "timestamp",
  updated_at: "timestamp"
}
```

#### Error Cases
- **NotFoundError:** Log ID not found, user doesn't own log, PGRST116 error code
- **DatabaseError:** Supabase query failure, RLS permission denied
- **Generic DatabaseError:** Unexpected errors during retrieval

#### Performance Considerations
- **Typical Duration:** 20-80ms for single record lookup
- **Caching:** None implemented  
- **Batch Operations:** Not applicable (single record)

---

### updateWorkoutLog()
**File:** `services/workout-log-service.js`
**Line:** 168-207
**Called By:** `workoutLogController.updateWorkoutLog()`

#### Method Signature
```javascript
async updateWorkoutLog(logId, updates, userId, jwtToken, retrieveFn = retrieveWorkoutLog)
```

#### Parameters
- **logId:** string - UUID of the workout log to update (required)
- **updates:** object - Fields to update (partial workout log data)
- **userId:** string - User ID for ownership verification (required) 
- **jwtToken:** string - JWT token for RLS authentication (required)
- **retrieveFn:** function - Function for existence verification (default: retrieveWorkoutLog)

#### Business Logic
1. Verify log exists and user owns it using retrieveFn
2. Create authenticated Supabase client
3. Apply updates with automatic updated_at timestamp
4. Execute update with ID filter and return updated record
5. Validate update succeeded and data returned

#### Database Operations
```sql
-- Verification query (via retrieveFn)
SELECT * FROM workout_logs WHERE id = $1 AND user_id = $2;

-- Update operation
UPDATE workout_logs 
SET [update_fields], updated_at = NOW()
WHERE id = $1
RETURNING *;
```

#### Transaction Boundaries
- **Uses Transactions:** No (atomic update operation)
- **Rollback Conditions:** N/A
- **Isolation Level:** Default read committed

#### Return Value
```javascript
{
  id: "uuid",
  user_id: "uuid",
  plan_id: "uuid|null",
  date: "YYYY-MM-DD", 
  completed: boolean,
  exercises_completed: [object],
  overall_difficulty: number|null,
  energy_level: number|null,
  satisfaction: number|null,
  feedback: "string|null",
  created_at: "timestamp",
  updated_at: "timestamp" // Updated timestamp
}
```

#### Error Cases
- **NotFoundError:** Propagated from retrieveFn (log not found/not owned)
- **DatabaseError:** Update operation failure, constraint violations, RLS permission denied
- **Generic DatabaseError:** Unexpected errors during update process

#### Performance Considerations
- **Typical Duration:** 40-120ms (includes verification query)
- **Caching:** None implemented
- **Batch Operations:** Not supported (single record updates)

---

### deleteWorkoutLog()
**File:** `services/workout-log-service.js`
**Line:** 219-249
**Called By:** `workoutLogController.deleteWorkoutLog()`

#### Method Signature
```javascript
async deleteWorkoutLog(logId, userId, jwtToken, retrieveFn = retrieveWorkoutLog)
```

#### Parameters
- **logId:** string - UUID of the workout log to delete (required)
- **userId:** string - User ID for ownership verification (required)
- **jwtToken:** string - JWT token for RLS authentication (required)
- **retrieveFn:** function - Function for existence verification (default: retrieveWorkoutLog)

#### Business Logic
1. Verify log exists and user owns it using retrieveFn
2. Create authenticated Supabase client
3. Execute hard delete operation with ID filter
4. Verify deletion succeeded (no error returned)
5. Log successful deletion

#### Database Operations
```sql
-- Verification query (via retrieveFn)
SELECT * FROM workout_logs WHERE id = $1 AND user_id = $2;

-- Delete operation
DELETE FROM workout_logs WHERE id = $1;
```

#### Transaction Boundaries
- **Uses Transactions:** No (atomic delete operation)
- **Rollback Conditions:** N/A
- **Isolation Level:** Default read committed

#### Return Value
```javascript
void // No return value on successful deletion
```

#### Error Cases
- **NotFoundError:** Propagated from retrieveFn (log not found/not owned)
- **DatabaseError:** Delete operation failure, RLS permission denied
- **Generic DatabaseError:** Unexpected errors during deletion process

#### Performance Considerations
- **Typical Duration:** 30-100ms (includes verification query)
- **Caching:** None implemented
- **Batch Operations:** Not supported (single record deletions)

---

## Data Integrity Rules
- **Primary Key:** id (UUID, auto-generated)
- **Foreign Keys:** user_id → users.id, plan_id → workout_plans.id (nullable)
- **Required Fields:** user_id, date, exercises_completed
- **Cascade Behaviors:** No cascading deletes (referential integrity preserved)
- **RLS Enforcement:** All operations filtered by user_id via JWT token
- **Constraints:** Date format validation, JSON structure for exercises_completed

## Integration Patterns
- **Pagination Support:** limit/offset parameters with range() method
- **Filtering Support:** startDate, endDate (date range), planId (exact match)
- **Sorting Support:** Fixed DESC sort by date (most recent first)
- **Authentication Pattern:** JWT token required for all operations (RLS enforcement)
- **Error Propagation:** Structured error types (NotFoundError, DatabaseError, ValidationError)
- **Logging Integration:** Comprehensive debug/info/error logging for all operations
- **Data Transformation:** API camelCase to database snake_case (minimal - mostly direct mapping)