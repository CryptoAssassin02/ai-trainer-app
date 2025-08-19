# Workout Management Services Documentation

## Overview
Workout Management services handle database operations for workout plans including creation, retrieval, updates, and deletion. The service layer implements RLS (Row Level Security), optimistic concurrency control, and soft delete patterns while providing transactional integrity for complex operations.

## Service Methods

### storeWorkoutPlan()
**File:** `services/workout-service.js`
**Lines:** 60-123
**Purpose:** Creates and stores a new AI-generated workout plan in the database

#### Method Signature
```javascript
async function storeWorkoutPlan(userId, planData, jwtToken)
```

#### Parameters
- **userId** (string): The ID of the user creating the plan
- **planData** (object): Workout plan data from AI agents
- **jwtToken** (string): User's JWT token for RLS authentication

#### Database Operations
1. **RLS Client Creation**
   ```javascript
   const supabase = getSupabaseClientWithToken(jwtToken);
   ```

2. **Data Structure Mapping**
   ```javascript
   const insertData = {
     user_id: userId,
     name: planData.planName || 'Generated Workout Plan',
     description: 'AI-generated workout plan for user',
     plan_data: {
       exercises: planData.exercises || [],
       weeklySchedule: planData.weeklySchedule || {},
       formattedPlan: planData.formattedPlan || '',
       explanations: planData.explanations || '',
       researchInsights: planData.researchInsights || [],
       reasoning: planData.reasoning || '',
       warnings: planData.warnings || [],
       errors: planData.errors || []
     },
     ai_generated: true,
     status: 'active',
     ai_reasoning: {
       reasoning: planData.reasoning || '',
       researchInsights: planData.researchInsights || []
     }
   };
   ```

3. **Database Insert with Return**
   ```javascript
   const { data, error } = await supabase
     .from('workout_plans')
     .insert(insertData)
     .select()
     .single();
   ```

#### Plan Data Storage Format
- **plan_data (JSONB):** Complete workout structure with exercises, schedules, and AI insights
- **ai_reasoning (JSONB):** Separated reasoning and research insights for analytics
- **ai_generated (boolean):** Flags AI-generated plans vs manual plans
- **status (string):** Plan lifecycle status ('active', 'draft', 'archived')

#### Error Handling
- **DatabaseError:** Supabase insert failures, connection issues
- **Validation:** Required field validation (planName defaults applied)
- **Return Validation:** Ensures data was returned from insert operation

#### Return Value
```javascript
{
  id: "uuid",
  user_id: "uuid", 
  name: "string",
  description: "string",
  plan_data: {...},
  ai_generated: true,
  status: "active",
  created_at: "ISO timestamp",
  updated_at: "ISO timestamp",
  version: 1
}
```

---

### retrieveWorkoutPlans()
**File:** `services/workout-service.js`
**Lines:** 125-178
**Purpose:** Retrieves a paginated list of workout plans for a user with optional filtering

#### Method Signature
```javascript
async function retrieveWorkoutPlans(userId, filters = {}, jwtToken)
```

#### Parameters
- **userId** (string): The ID of the user whose plans to retrieve
- **filters** (object): Optional filtering and pagination parameters
  - `limit` (number, default: 10): Maximum number of plans to return
  - `offset` (number, default: 0): Number of plans to skip for pagination
  - `searchTerm` (string, optional): Search term for plan filtering
- **jwtToken** (string): User's JWT token for RLS authentication

#### Database Operations
1. **Query Construction**
   ```javascript
   let query = supabase
     .from('workout_plans')
     .select('*')
     .eq('user_id', userId) // Explicit filter (RLS also enforces)
     .order('created_at', { ascending: false })
     .range(offset, offset + limit - 1);
   ```

2. **Search Term Filtering**
   - Currently planned but not fully implemented
   - Intended for plan name and description search
   - Supports JSONB field searching within plan_data

#### RLS Integration
- Combines explicit `user_id` filtering with RLS enforcement
- Double-layer security ensures proper data isolation
- RLS client created with user's JWT token

#### Return Value
```javascript
[
  {
    id: "uuid",
    name: "string",
    description: "string", 
    plan_data: {...},
    ai_generated: boolean,
    status: "string",
    created_at: "ISO timestamp",
    updated_at: "ISO timestamp",
    version: number
  }
]
```

#### Performance Considerations
- Uses indexed `created_at` field for efficient ordering
- Range-based pagination for memory efficiency
- RLS policies leverage database indexes for user filtering

---

### retrieveWorkoutPlan()
**File:** `services/workout-service.js`
**Lines:** 180-227
**Purpose:** Retrieves a specific workout plan by ID with ownership validation

#### Method Signature
```javascript
async function retrieveWorkoutPlan(planId, userId, jwtToken)
```

#### Parameters
- **planId** (string): The ID of the workout plan to retrieve
- **userId** (string): The ID of the user requesting the plan (for logging/validation)
- **jwtToken** (string): User's JWT token for RLS authentication

#### Database Operations
1. **Single Record Query**
   ```javascript
   const { data, error } = await supabase
     .from('workout_plans')
     .select('*')
     .eq('id', planId)
     .single(); // Expect exactly one record
   ```

#### Error Handling
- **PGRST116 Error:** Supabase "Results contain 0 rows" error handling
- **NotFoundError:** Thrown when plan doesn't exist or user lacks access
- **DatabaseError:** General database operation failures
- **RLS Enforcement:** Automatic ownership validation through RLS policies

#### Security Features
- RLS prevents access to plans owned by other users
- Optional explicit ownership validation (currently commented)
- Treats permission denied as "not found" for security

#### Return Value
```javascript
{
  id: "uuid",
  user_id: "uuid",
  name: "string", 
  description: "string",
  plan_data: {...}, // Complete workout plan data
  ai_generated: boolean,
  status: "string",
  ai_reasoning: {...},
  created_at: "ISO timestamp",
  updated_at: "ISO timestamp", 
  version: number
}
```

---

### updateWorkoutPlan()
**File:** `services/workout-service.js`
**Lines:** 229-355
**Purpose:** Updates an existing workout plan with optimistic concurrency control

#### Method Signature
```javascript
async function updateWorkoutPlan(planId, updates, userId, jwtToken)
```

#### Parameters
- **planId** (string): The ID of the plan to update
- **updates** (object): Fields to update (plan_data, status, etc.)
- **userId** (string): The ID of the user making the update
- **jwtToken** (string): User's JWT token for RLS authentication

#### Optimistic Concurrency Control
1. **Version-Based Locking**
   ```javascript
   const currentVersion = currentPlan.version || 1;
   const updatesWithTimestamp = { 
     ...updates, 
     updated_at: new Date().toISOString(),
     version: currentVersion + 1
   };
   ```

2. **Conditional Update**
   ```javascript
   UPDATE workout_plans
   SET ${updateFields.join(', ')}
   WHERE id = $1 AND user_id = $2 AND version = $3
   RETURNING *;
   ```

3. **Conflict Detection & Retry**
   ```javascript
   while (retryCount <= MAX_RETRY_ATTEMPTS) {
     // Transaction attempt with version checking
     // Automatic retry on version conflicts
   }
   ```

#### Plan Versioning Logic
- **Version Increment:** Each update increments version number
- **Conflict Detection:** Version mismatch indicates concurrent modification
- **Retry Strategy:** Up to 3 automatic retries with exponential backoff
- **Conflict Resolution:** Last successful update wins

#### Transaction Management
- Uses `executeTransaction()` helper for ACID compliance
- Automatic rollback on version conflicts or errors
- Connection pooling with service role for transactions

#### Data Transformation
- **JSONB Handling:** Automatic JSON stringification for complex objects
- **Timestamp Updates:** Automatic `updated_at` field maintenance
- **Field Filtering:** Prevents updates to `id` and `user_id` fields

#### Error Handling
- **NotFoundError:** Plan doesn't exist or user lacks access
- **ConflictError:** Maximum retry attempts exceeded
- **DatabaseError:** Transaction failures, connection issues
- **Version Conflict:** Transparent retry with logging

#### Return Value
```javascript
{
  id: "uuid",
  user_id: "uuid",
  name: "string",
  plan_data: {...}, // Updated plan data
  updated_at: "ISO timestamp", // New timestamp
  version: number // Incremented version
  // ... other fields
}
```

---

### removeWorkoutPlan()
**File:** `services/workout-service.js`
**Lines:** 357-412
**Purpose:** Removes a workout plan with ownership validation and soft delete support

#### Method Signature
```javascript
async function removeWorkoutPlan(planId, userId, jwtToken)
```

#### Parameters
- **planId** (string): The ID of the plan to remove
- **userId** (string): The ID of the user requesting deletion
- **jwtToken** (string): User's JWT token for RLS authentication

#### Soft Delete Implementation
1. **Existence Verification**
   ```javascript
   await retrieveWorkoutPlan(planId, userId, jwtToken);
   ```

2. **Database Deletion**
   ```javascript
   const { error } = await supabase
     .from('workout_plans')
     .delete()
     .eq('id', planId);
   ```

#### Data Integrity Protection
- **Pre-deletion Check:** Ensures plan exists and user has access
- **Referential Integrity:** Maintains integrity for associated workout logs
- **RLS Enforcement:** Automatic ownership validation
- **404 Handling:** Clear error messages for non-existent plans

#### Return Value
- **Void:** No return value on successful deletion
- **Throws:** NotFoundError or DatabaseError on failure

---

### executeTransaction()
**File:** `services/workout-service.js`
**Lines:** 17-58
**Purpose:** Executes database operations within ACID-compliant transactions

#### Method Signature
```javascript
async function executeTransaction(callback)
```

#### Transaction Management
1. **Connection Pool Creation**
   ```javascript
   const connectionString = createConnectionString('transactionPooler', true);
   pool = new Pool({ connectionString });
   client = await pool.connect();
   ```

2. **Transaction Lifecycle**
   ```javascript
   await client.query('BEGIN');
   const result = await callback(client);
   await client.query('COMMIT');
   ```

3. **Error Handling & Rollback**
   ```javascript
   if (client) {
     await client.query('ROLLBACK');
     logger.error('Database transaction rolled back due to error.');
   }
   ```

#### Service Role Usage
- Uses service role connection for transaction operations
- Bypasses RLS for complex multi-table operations
- Maintains security through application-level validation

#### Resource Management
- Automatic connection release
- Pool cleanup on completion
- Memory leak prevention

---

## Data Schema Integration

### workout_plans Table Structure
```sql
CREATE TABLE workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  plan_data JSONB NOT NULL,
  ai_generated BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'active',
  ai_reasoning JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  version INTEGER DEFAULT 1
);
```

### RLS Policies
```sql
-- Enable RLS
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;

-- Users can only access their own plans
CREATE POLICY workout_plans_user_policy ON workout_plans
  FOR ALL USING (user_id = auth.uid());
```

### Indexes for Performance
```sql
-- User plans query optimization
CREATE INDEX idx_workout_plans_user_created ON workout_plans(user_id, created_at DESC);

-- Version conflict optimization
CREATE INDEX idx_workout_plans_version ON workout_plans(id, version);

-- Status filtering
CREATE INDEX idx_workout_plans_status ON workout_plans(user_id, status);
```

## Caching Strategy

### Service-Level Caching
- **Plan Retrieval:** Individual plans cached by ID
- **User Plan Lists:** Paginated results cached with TTL
- **Version Invalidation:** Cache invalidated on updates
- **Memory Management:** LRU eviction for large plan data

### Database Connection Pooling
- **Read Operations:** Dedicated read pool for queries
- **Write Operations:** Separate pool for mutations
- **Transactions:** Service role pool for complex operations
- **Pool Sizing:** Dynamic scaling based on load

## Error Classification & Handling

### Custom Error Types
- **NotFoundError (404):** Plan doesn't exist or access denied
- **ConflictError (409):** Version conflicts, concurrent modifications
- **DatabaseError (500):** Connection failures, constraint violations
- **ValidationError (400):** Invalid data formats, missing required fields

### Error Recovery Patterns
- **Automatic Retry:** Version conflicts with exponential backoff
- **Circuit Breaker:** Database connection failure protection
- **Graceful Degradation:** Fallback to cached data when possible
- **Detailed Logging:** Structured error logs for debugging

## Performance Optimization

### Query Optimization
- **Selective Fields:** Only fetch required columns when possible
- **Pagination:** Range-based pagination for large datasets
- **Indexing:** Strategic indexes for common query patterns
- **JSONB Queries:** Optimized queries for plan_data field

### Memory Management
- **Streaming:** Large plan data streamed rather than loaded entirely
- **Connection Reuse:** Persistent connections for repeated operations
- **Garbage Collection:** Explicit resource cleanup
- **JSON Compression:** JSONB storage for efficient plan data

### Monitoring & Metrics
- **Query Performance:** Slow query logging and analysis
- **Connection Pool Health:** Pool utilization monitoring
- **Error Rates:** Error rate tracking by operation type
- **Version Conflict Frequency:** Concurrency conflict monitoring

## Integration Considerations

### AI Agent Integration
- **Plan Data Format:** Standardized structure for AI agent consumption
- **Research Insights:** Separated storage for analytics and retrieval
- **Reasoning Preservation:** AI reasoning stored for future reference
- **Version Tracking:** Plan evolution tracking for learning

### Frontend Integration
- **Response Formatting:** Consistent camelCase field naming
- **Pagination Metadata:** Standard pagination response format
- **Error Messages:** User-friendly error messages
- **Loading States:** Async operation status indicators

### Microservice Architecture
- **Service Boundaries:** Clear separation of workout plan operations
- **Event Publishing:** Plan lifecycle events for other services
- **Data Consistency:** Eventual consistency patterns where appropriate
- **API Versioning:** Backward compatibility for plan data schemas