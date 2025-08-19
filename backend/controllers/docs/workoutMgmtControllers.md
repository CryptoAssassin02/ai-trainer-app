# Workout Management Controllers Documentation

## Overview
Workout Management controllers handle AI-powered workout plan generation, retrieval, adjustment, and deletion. These controllers integrate directly with AI agents (Research Agent, Workout Generation Agent, Plan Adjustment Agent) to provide intelligent, research-backed workout planning functionality.

## Controller Methods

### generateWorkoutPlan()
**File:** `controllers/workout.js`
**Lines:** 17-118
**Route:** POST /v1/workouts

#### Request Processing
- **Authentication:** Extracts userId from `req.user.id` and JWT token from Authorization header
- **Body Extraction:** Uses validated request body containing user preferences and goals
- **Profile Integration:** Fetches complete user profile using `getProfileByUserId()`
- **Context Preparation:** Combines request data with user profile for AI agents

#### Business Logic Flow
1. **Authentication Validation**
   ```javascript
   const userId = req.user?.id;
   const jwtToken = req.headers.authorization?.split(' ')[1];
   ```

2. **Profile Retrieval & Validation**
   ```javascript
   userProfile = await getProfileByUserId(userId, jwtToken);
   // Maps experienceLevel to fitnessLevel for agent compatibility
   userProfile.fitnessLevel = userProfile.experienceLevel;
   ```

3. **Memory System Initialization**
   ```javascript
   const userScopedMemorySystem = new AgentMemorySystem({
       supabase: supabaseRLSClient,
       openai: openaiService,
       logger
   });
   ```

4. **Two-Step AI Agent Process**
   - **Step 1: Research Agent** - Gathers exercise research using Perplexity AI
   - **Step 2: Workout Generation Agent** - Creates personalized plan using OpenAI

5. **Plan Storage**
   ```javascript
   const savedPlan = await workoutService.storeWorkoutPlan(userId, planDataForStorage, jwtToken);
   ```

#### Agent Invocation Patterns
- **Research Agent:**
  ```javascript
  const researchAgent = new ResearchAgent({
      perplexityService,
      supabaseClient: supabaseRLSClient,
      memorySystem: userScopedMemorySystem,
      logger
  });
  ```

- **Workout Generation Agent:**
  ```javascript
  const generationAgent = new WorkoutGenerationAgent({
      openaiService,
      supabaseClient: supabaseRLSClient,
      memorySystem: userScopedMemorySystem,
      logger
  });
  ```

#### Response Transformations
- **Success Response (201):**
  ```javascript
  {
    "status": "success",
    "data": {
      "planName": "string",
      "weeklySchedule": {...},
      "exercises": [...],
      "researchInsights": [...],
      "reasoning": "string"
    }
  }
  ```

#### Error Handling
- **400:** Profile not found - redirects to profile completion
- **401:** Missing authentication (userId or jwtToken)
- **500:** AI generation failures, service errors
- **Custom Error Classes:** ApplicationError, NotFoundError, DatabaseError

---

### getWorkoutPlans()
**File:** `controllers/workout.js`
**Lines:** 123-146
**Route:** GET /v1/workouts

#### Request Processing
- **Authentication:** Validates userId and JWT token
- **Query Parameters:** Extracts validated filters (limit, offset, searchTerm)
- **Pagination:** Handles pagination parameters from middleware validation

#### Business Logic Flow
1. **Authentication Check**
2. **Filter Extraction**
   ```javascript
   const filters = req.query; // Pre-validated by workoutQuerySchema
   ```
3. **Service Call**
   ```javascript
   const plans = await workoutService.retrieveWorkoutPlans(userId, filters, jwtToken);
   ```

#### Response Format
```javascript
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "description": "string",
      "status": "active|draft|archived",
      "createdAt": "ISO date",
      "updatedAt": "ISO date"
    }
  ]
}
```

#### Error Handling
- **401:** Authentication required
- **500:** Database errors, internal service failures

---

### getWorkoutPlan()
**File:** `controllers/workout.js`
**Lines:** 151-206
**Route:** GET /v1/workouts/:planId

#### Request Processing
- **Authentication:** Validates userId and JWT token
- **Parameter Extraction:** Gets planId from route parameters
- **UUID Validation:** Validates planId format using `isValidUUID()`

#### Business Logic Flow
1. **Authentication & Parameter Validation**
   ```javascript
   if (!isValidUUID(planId)) {
     return res.status(404).json({ status: 'error', message: 'Workout plan not found.' });
   }
   ```

2. **Plan Retrieval**
   ```javascript
   const plan = await workoutService.retrieveWorkoutPlan(planId, userId, jwtToken);
   ```

3. **Response Formatting**
   ```javascript
   const formattedResponse = {
     id: plan.id,
     name: plan.name,
     planData: plan.plan_data, // Snake case to camelCase conversion
     aiGenerated: plan.ai_generated,
     status: plan.status,
     version: plan.version
   };
   ```

#### Data Transformation
- Converts snake_case database fields to camelCase API response
- Extracts `plan_data` as `planData` for frontend consumption
- Maintains database field mapping: `ai_generated` → `aiGenerated`

#### Error Handling
- **400:** Missing planId parameter
- **401:** Authentication required
- **404:** Plan not found or invalid UUID format
- **500:** Database errors

---

### adjustWorkoutPlan()
**File:** `controllers/workout.js`
**Lines:** 211-317
**Route:** POST /v1/workouts/:planId

#### Request Processing
- **Authentication:** Validates userId and JWT token
- **Parameter Validation:** Validates planId UUID format
- **Body Processing:** Extracts adjustment data from validated request body

#### Business Logic Flow
1. **Plan Retrieval**
   ```javascript
   const currentPlanRecord = await workoutService.retrieveWorkoutPlan(planId, userId, jwtToken);
   ```

2. **Memory System & Agent Setup**
   ```javascript
   const adjustmentAgent = new PlanAdjustmentAgent({
       openaiService,
       supabaseClient: supabaseRLSClient,
       memorySystem: userScopedMemorySystem,
       logger
   });
   ```

3. **Feedback Processing**
   - Extracts feedback from various adjustment formats:
     - Direct string adjustments
     - `notesOrPreferences` field
     - Structured exercise additions/removals
   
   ```javascript
   let feedbackString = '';
   if (adjustmentData.adjustments.notesOrPreferences) {
       feedbackString = adjustmentData.adjustments.notesOrPreferences;
   }
   ```

4. **Agent Invocation**
   ```javascript
   const agentInput = {
       plan: planForAgent,
       feedback: feedbackString,
       userProfile: { ...req.user, user_id: userId }
   };
   const adjustedPlanResult = await adjustmentAgent.process(agentInput);
   ```

5. **Plan Update**
   ```javascript
   const updates = { plan_data: adjustedPlanResult.adjustedPlan };
   const updatedPlan = await workoutService.updateWorkoutPlan(planId, updates, userId, jwtToken);
   ```

#### Agent Integration Details
- **Plan Preparation:** Ensures plan object has required `planId` property
- **User Context:** Maps `req.user.id` to `user_id` for agent compatibility
- **Feedback Extraction:** Handles multiple feedback formats from API spec
- **Result Processing:** Uses agent's `adjustedPlan` for database storage

#### Response Format
```javascript
{
  "status": "success",
  "data": {
    "adjustedPlan": {...},
    "appliedChanges": [...],
    "skippedChanges": [...],
    "feedbackSummary": "string",
    "adjustmentReasoning": "string"
  }
}
```

#### Error Handling
- **400:** Missing feedback or invalid adjustment data
- **401:** Authentication required
- **404:** Plan not found or invalid UUID
- **422:** Agent processing failures
- **500:** Internal service errors

---

### deleteWorkoutPlan()
**File:** `controllers/workout.js`
**Lines:** 322-356
**Route:** DELETE /v1/workouts/:planId

#### Request Processing
- **Authentication:** Validates userId and JWT token
- **Parameter Validation:** Validates planId UUID format

#### Business Logic Flow
1. **Authentication & Validation**
2. **Service Call**
   ```javascript
   await workoutService.removeWorkoutPlan(planId, userId, jwtToken);
   ```
3. **No Content Response**
   ```javascript
   return res.status(204).send();
   ```

#### Soft Delete Implementation
- Uses `workoutService.removeWorkoutPlan()` which implements soft delete
- Maintains data integrity for associated workout logs
- Plan status changed to archived/deleted rather than hard deletion

#### Error Handling
- **400:** Missing planId parameter
- **401:** Authentication required
- **404:** Plan not found or invalid UUID format
- **500:** Database errors

---

## Shared Patterns

### Authentication Pattern
All methods use consistent authentication:
```javascript
const userId = req.user?.id;
const jwtToken = req.headers.authorization?.split(' ')[1];

if (!userId || !jwtToken) {
    return res.status(401).json({ status: 'error', message: 'Authentication required.' });
}
```

### UUID Validation Pattern
```javascript
if (!isValidUUID(planId)) {
    return res.status(404).json({ status: 'error', message: 'Workout plan not found.' });
}
```

### RLS Client Pattern
```javascript
const supabaseRLSClient = getSupabaseClientWithToken(jwtToken);
```

### Error Classification
- **NotFoundError:** 404 responses
- **ApplicationError:** Business logic failures
- **DatabaseError:** 500 database issues
- **ValidationError:** 400 validation failures

## Service Dependencies

### Required Services
- `workoutService` - Database operations
- `profile-service` - User profile retrieval
- `openai-service` - AI model access
- `perplexity-service` - Research data gathering
- `supabase` - RLS database client

### Required Agents
- `WorkoutGenerationAgent` - Plan creation
- `PlanAdjustmentAgent` - Plan modifications
- `ResearchAgent` - Exercise research
- `AgentMemorySystem` - User context storage

## Data Flow Patterns

### Generation Flow
1. User Request → Authentication → Profile Fetch → Research Agent → Generation Agent → Storage → Response

### Adjustment Flow
1. User Request → Authentication → Plan Fetch → Feedback Processing → Adjustment Agent → Update → Response

### Retrieval Flow
1. User Request → Authentication → Service Query → Format Response

## Integration Considerations

### Agent Compatibility
- Profile field mapping: `experienceLevel` → `fitnessLevel`
- User ID format: `userId` → `user_id`
- Plan ID requirements: Ensures `planId` property exists

### Response Formatting
- Database fields converted from snake_case to camelCase
- AI agent responses passed through with minimal transformation
- Consistent error response format across all methods

### Memory System Integration
- User-scoped memory system for personalization
- Context preservation across agent calls
- Embedded vector storage for improved recommendations

### Performance Considerations
- Profile data cached during generation process
- Agent responses logged for debugging
- RLS client reused within request scope
- UUID validation prevents unnecessary database queries