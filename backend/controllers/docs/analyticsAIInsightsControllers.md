# Analytics & AI Insights Controller Documentation

## Overview
This controller manages all analytics and AI-powered insights functionality for the trAIner application. It coordinates business logic between routes and services, handles request processing, implements comprehensive error handling, and manages AI analytics operations. The controller integrates with multiple services including analytics-service and goal-prediction-service, and implements sophisticated request validation and response transformation patterns.

**File:** `controllers/analytics.js`
**Total Methods:** 18 controller methods
**Service Dependencies:** analytics-service, goal-prediction-service, Supabase client
**Error Handling:** Custom error classes with proper logging and user-friendly messages

## Dependency Injection
- **Analytics Service:** `require('../services/analytics-service')`
- **Goal Prediction Service:** Initialized with analytics-service, Supabase client, and logger
- **Logger:** `require('../config/logger')` for structured logging
- **Error Classes:** NotFoundError, DatabaseError, ApplicationError from utils
- **UUID Validator:** `isValidUUID` from agent memory validators

## Controller Methods

### getAnalyticsOverview()
**File:** `controllers/analytics.js`
**Line:** 18
**Route Endpoint:** `GET /v1/analytics/overview`

#### Request Processing
- **Extracted From Request:**
  - User Context: `req.user.id`
  - Headers: JWT token from `Authorization` header (Bearer format)
  - Query Params: `timeframe` (default: '30 days'), `includeProjections` (boolean)

#### Business Logic Flow
1. Validate user authentication and JWT token presence
2. Extract options from query parameters with default values
3. Call analytics service with user ID, JWT token, and options
4. Log successful retrieval with user information
5. Return structured response with status messaging

#### Service Calls
```javascript
// Primary service call
const overview = await analyticsService.getOverviewMetrics(userId, jwtToken, options);
```

#### Response Transformation
- **Service Response:** Raw overview metrics data
- **Controller Response:** Standardized JSON with status, data, and conditional messaging
- **Added Fields:** Status indicator, contextual success/no-data messages
- **Removed Fields:** None (full service response passed through)

#### Error Handling
- **Try/Catch Blocks:** Yes, comprehensive error handling
- **Error Transformation:** DatabaseError → 500, Generic errors → 500
- **Logging:** Authentication warnings, success confirmations, error details with user context

---

### getProgressTrends()
**File:** `controllers/analytics.js`
**Line:** 43
**Route Endpoint:** `GET /v1/analytics/trends`

#### Request Processing
- **Extracted From Request:**
  - User Context: `req.user.id`
  - Headers: JWT token from `Authorization` header
  - Query Params: `timeframe` (default: '90 days'), `groupBy` (default: 'week'), `metrics` (comma-separated, default: ['weight', 'workouts', 'wellness'])

#### Business Logic Flow
1. Authenticate user and validate JWT token
2. Extract and process query parameters with defaults
3. Validate `groupBy` parameter against allowed values ['day', 'week', 'month']
4. Parse `metrics` parameter from comma-separated string to array
5. Call analytics service with processed options
6. Return structured response with metrics count logging

#### Service Calls
```javascript
// Primary service call with processed options
const trends = await analyticsService.getProgressTrends(userId, jwtToken, options);
```

#### Response Transformation
- **Service Response:** Progress trends with time-series data
- **Controller Response:** Standard JSON with status and contextual messaging
- **Added Fields:** Status, conditional messaging based on data availability
- **Removed Fields:** None

#### Error Handling
- **Try/Catch Blocks:** Yes
- **Error Transformation:** Invalid groupBy → 400, DatabaseError → 500, Generic → 500
- **Logging:** Detailed logging including metrics count and user context

---

### getStrengthProgression()
**File:** `controllers/analytics.js`
**Line:** 87
**Route Endpoint:** `GET /v1/analytics/strength`

#### Request Processing
- **Extracted From Request:**
  - User Context: `req.user.id`
  - Headers: JWT token validation
  - Query Params: `timeframe` (default: '90 days'), `exercises` (optional comma-separated list)

#### Business Logic Flow
1. Validate authentication requirements
2. Extract options with timeframe defaults
3. Process optional exercises parameter (split comma-separated string)
4. Call strength progression service
5. Log successful retrieval

#### Service Calls
```javascript
const progression = await analyticsService.getStrengthProgression(userId, jwtToken, options);
```

#### Response Transformation
- **Service Response:** Strength progression metrics and analysis
- **Controller Response:** Structured JSON with availability messaging
- **Added Fields:** Status and contextual success/no-data messages
- **Removed Fields:** None

#### Error Handling
- **Try/Catch Blocks:** Comprehensive error handling
- **Error Transformation:** DatabaseError → 500, Generic → 500
- **Logging:** User-specific logging with progression retrieval confirmation

---

### getAdherenceMetrics()
**File:** `controllers/analytics.js`
**Line:** 119
**Route Endpoint:** `GET /v1/analytics/adherence`

#### Request Processing
- **Extracted From Request:**
  - User Context: `req.user.id`
  - Headers: JWT token extraction and validation
  - Query Params: `timeframe` (default: '30 days')

#### Business Logic Flow
1. Validate user authentication and JWT presence
2. Extract options with default timeframe
3. Call adherence metrics service
4. Log successful metrics retrieval
5. Return formatted response

#### Service Calls
```javascript
const adherence = await analyticsService.getAdherenceMetrics(userId, jwtToken, options);
```

#### Response Transformation
- **Service Response:** Adherence metrics and compliance data
- **Controller Response:** Standard JSON structure with conditional messaging
- **Added Fields:** Status and data availability messaging
- **Removed Fields:** None

#### Error Handling
- **Try/Catch Blocks:** Yes
- **Error Transformation:** DatabaseError → 500, Generic → 500
- **Logging:** User context with adherence metrics confirmation

---

### refreshAnalytics()
**File:** `controllers/analytics.js`
**Line:** 151
**Route Endpoint:** `POST /v1/analytics/refresh`

#### Request Processing
- **Extracted From Request:**
  - User Context: `req.user.id`
  - Headers: JWT token validation
  - Body/Query: `startDate` (optional), `endDate` (optional) with YYYY-MM-DD format validation

#### Business Logic Flow
1. Validate authentication requirements
2. Extract optional date parameters from body or query
3. Validate date format using regex (YYYY-MM-DD)
4. Validate date range logic (startDate ≤ endDate)
5. Call refresh service with validated options
6. Return refresh status and updated data

#### Service Calls
```javascript
const refreshResult = await analyticsService.refreshUserAnalytics(userId, jwtToken, options);
```

#### Response Transformation
- **Service Response:** Refresh operation results
- **Controller Response:** Success confirmation with refresh data
- **Added Fields:** Status and success messaging
- **Removed Fields:** None

#### Error Handling
- **Try/Catch Blocks:** Yes, with validation logic before service call
- **Error Transformation:** Invalid dates → 400, Date range errors → 400, DatabaseError → 500
- **Logging:** Refresh operation logging with user context

---

### getAnalyticsByDateRange()
**File:** `controllers/analytics.js`
**Line:** 209
**Route Endpoint:** `GET /v1/analytics/daterange`

#### Request Processing
- **Extracted From Request:**
  - User Context: `req.user.id`
  - Headers: JWT token validation
  - Query Params: Required `startDate` and `endDate` with comprehensive validation

#### Business Logic Flow
1. Validate authentication and required parameters
2. Validate date format (YYYY-MM-DD regex)
3. Validate actual date values and parsing accuracy
4. Validate date range (startDate ≤ endDate)
5. Calculate day differential and convert to timeframe string
6. Call overview metrics with calculated timeframe
7. Enhance response with requested date range metadata

#### Service Calls
```javascript
// Calculate timeframe and call service
const overview = await analyticsService.getOverviewMetrics(userId, jwtToken, options);
```

#### Response Transformation
- **Service Response:** Standard overview metrics
- **Controller Response:** Enhanced with requestedDateRange metadata
- **Added Fields:** `requestedDateRange` object with startDate, endDate, and daysCovered
- **Removed Fields:** None

#### Error Handling
- **Try/Catch Blocks:** Yes, with extensive validation
- **Error Transformation:** Missing params → 400, Invalid format → 400, Invalid values → 400, Range errors → 400
- **Logging:** Date range specifics with day count confirmation

---

### getAnalyticsHealth()
**File:** `controllers/analytics.js`
**Line:** 291
**Route Endpoint:** `GET /v1/analytics/health`

#### Request Processing
- **Extracted From Request:** None (public endpoint)

#### Business Logic Flow
1. Basic health check implementation
2. Return service status with metadata
3. Generate timestamp and version information

#### Service Calls
```javascript
// No external service calls - basic health status
```

#### Response Transformation
- **Service Response:** N/A
- **Controller Response:** Health status object with service metadata
- **Added Fields:** service, healthy, timestamp, version fields
- **Removed Fields:** N/A

#### Error Handling
- **Try/Catch Blocks:** Yes, basic error handling
- **Error Transformation:** Any errors → 500
- **Logging:** Health check requests and failures

---

### getAIInsights()
**File:** `controllers/analytics.js`
**Line:** 320
**Route Endpoint:** `GET /v1/analytics/ai/insights`

#### Request Processing
- **Extracted From Request:**
  - User Context: `req.user.id`
  - Headers: JWT token with Bearer prefix validation
  - Query Params: `timeframe` (default: '30 days')

#### Business Logic Flow
1. Validate user authentication
2. Extract and validate JWT token with Bearer prefix check
3. Extract timeframe with default value
4. Call AI insights service
5. Log AI insight generation success
6. Return AI-generated insights

#### Service Calls
```javascript
const result = await analyticsService.getAIInsights(userId, timeframe, jwtToken);
```

#### Response Transformation
- **Service Response:** AI insights with reasoning and recommendations
- **Controller Response:** Direct service response pass-through
- **Added Fields:** None (service response maintained)
- **Removed Fields:** None

#### Error Handling
- **Try/Catch Blocks:** Yes, with AI-specific error handling
- **Error Transformation:** Service errors with statusCode preserved, Generic → 500
- **Logging:** AI insight generation with user context and error details

---

### getPatternAnalysis()
**File:** `controllers/analytics.js`
**Line:** 363
**Route Endpoint:** `GET /v1/analytics/ai/patterns`

#### Request Processing
- **Extracted From Request:**
  - User Context: `req.user.id`
  - Headers: JWT token validation
  - Query Params: `timeframe` (default: '30 days'), `patternTypes` (default: ['temporal', 'performance', 'exercise', 'behavioral', 'statistical'])

#### Business Logic Flow
1. Validate authentication requirements
2. Extract options with comprehensive defaults for pattern types
3. Call pattern analysis service
4. Log successful pattern detection with count
5. Return pattern analysis results

#### Service Calls
```javascript
const analysis = await analyticsService.getPatternAnalysis(userId, options.timeframe, jwtToken);
```

#### Response Transformation
- **Service Response:** Pattern analysis data with detected patterns
- **Controller Response:** Structured JSON with pattern data and messaging
- **Added Fields:** Status and success messaging
- **Removed Fields:** None

#### Error Handling
- **Try/Catch Blocks:** Yes, with specific error type handling
- **Error Transformation:** DatabaseError → 500, ApplicationError → 400, Generic → 500
- **Logging:** Pattern detection success with pattern count

---

### getPersonalizedRecommendations()
**File:** `controllers/analytics.js`
**Line:** 398
**Route Endpoint:** `GET /v1/analytics/ai/recommendations`

#### Request Processing
- **Extracted From Request:**
  - User Context: `req.user.id`
  - Headers: JWT token validation
  - Query Params: `timeframe` (default: '30 days'), `categories` (default: ['performance', 'adherence', 'progression', 'recommendations']), `maxRecommendations` (integer, 1-50 range)

#### Business Logic Flow
1. Validate authentication requirements
2. Extract and process options with defaults
3. Validate maxRecommendations parameter (1-50 range, integer validation)
4. Call personalized recommendations service
5. Log successful generation with recommendation count
6. Return recommendation data

#### Service Calls
```javascript
const recommendations = await analyticsService.getPersonalizedRecommendations(userId, jwtToken, options);
```

#### Response Transformation
- **Service Response:** Personalized recommendations with categories
- **Controller Response:** Structured JSON with recommendation data
- **Added Fields:** Status and success messaging
- **Removed Fields:** None

#### Error Handling
- **Try/Catch Blocks:** Yes, with parameter validation
- **Error Transformation:** Invalid maxRecommendations → 400, DatabaseError → 500, ApplicationError → 400
- **Logging:** Recommendation generation with count logging

---

### getGoalPredictions()
**File:** `controllers/analytics.js`
**Line:** 441
**Route Endpoint:** `GET /v1/analytics/ai/predictions/:goalType`

#### Request Processing
- **Extracted From Request:**
  - User Context: `req.user.id`
  - Headers: JWT token validation
  - Params: `goalType` (required path parameter)
  - Query Params: `timeframe` (default: '90 days')

#### Business Logic Flow
1. Validate authentication requirements
2. Validate required goalType parameter presence
3. Validate goalType against allowed values ['weight_loss', 'muscle_gain', 'strength', 'endurance', 'general_fitness']
4. Extract options with default timeframe
5. Call goal predictions service
6. Log prediction success with achievement probability
7. Return prediction analysis

#### Service Calls
```javascript
const predictions = await analyticsService.getGoalPredictions(userId, goalType, jwtToken, options);
```

#### Response Transformation
- **Service Response:** Goal predictions with achievement probability
- **Controller Response:** Structured prediction data with messaging
- **Added Fields:** Status and success messaging
- **Removed Fields:** None

#### Error Handling
- **Try/Catch Blocks:** Yes, with goalType validation
- **Error Transformation:** Missing goalType → 400, Invalid goalType → 400, DatabaseError → 500, ApplicationError → 400
- **Logging:** Goal predictions with achievement probability percentage

---

### getComprehensiveAIAnalytics()
**File:** `controllers/analytics.js`
**Line:** 489
**Route Endpoint:** `GET /v1/analytics/ai/comprehensive`

#### Request Processing
- **Extracted From Request:**
  - User Context: `req.user.id`
  - Headers: JWT token validation
  - Query Params: `timeframe` (default: '30 days'), `includeRecommendations` (default: true), `maxRecommendations` (integer, 1-20 range)

#### Business Logic Flow
1. Validate authentication requirements
2. Extract options with defaults for comprehensive analytics
3. Validate maxRecommendations parameter (1-20 range for comprehensive endpoint)
4. Execute parallel service calls for insights, patterns, and recommendations
5. Combine all AI analytics data into comprehensive response structure
6. Calculate metadata including totals and high-priority counts
7. Log comprehensive analytics success with summary statistics
8. Return combined analytics package

#### Service Calls
```javascript
// Parallel execution for efficiency
const [insights, patterns, recommendations] = await Promise.all([
  analyticsService.getAIInsights(userId, options.timeframe, jwtToken),
  analyticsService.getPatternAnalysis(userId, options.timeframe, jwtToken),
  options.includeRecommendations ? 
    analyticsService.getPersonalizedRecommendations(userId, jwtToken, { 
      timeframe: options.timeframe, 
      maxRecommendations: options.maxRecommendations 
    }) : 
    Promise.resolve({ data: { recommendations: [], hasData: false } })
]);
```

#### Response Transformation
- **Service Response:** Three separate AI service responses
- **Controller Response:** Combined comprehensive analytics object
- **Added Fields:** 
  - insights.total, insights.highPriority, insights.categories
  - patterns.total, patterns.highConfidence, patterns.types  
  - recommendations.total, recommendations.hasData, recommendations.categories
  - metadata.timeframe, metadata.generatedAt, metadata.aiGenerated, metadata.dataQuality, metadata.processingTime
- **Removed Fields:** None (all source data preserved in .data arrays)

#### Error Handling
- **Try/Catch Blocks:** Yes, with comprehensive parameter validation
- **Error Transformation:** Invalid maxRecommendations → 400, DatabaseError → 500, ApplicationError → 400
- **Logging:** Comprehensive summary with totals for insights, patterns, and recommendations

---

### predictGoalAchievement()
**File:** `controllers/analytics.js`
**Line:** 569
**Route Endpoint:** Not explicitly mapped in routes (internal method)

#### Request Processing
- **Extracted From Request:**
  - User Context: `req.user.id` (strict consistency)
  - Headers: JWT token with Bearer prefix validation
  - Body: `goalDefinition` (required object with type and target validation)

#### Business Logic Flow
1. Validate authentication with strict JWT Bearer format
2. Validate required goalDefinition presence and structure
3. Validate goalDefinition.type against allowed values ['weight_loss', 'muscle_gain', 'strength', 'endurance', 'body_composition']
4. Validate goalDefinition.target structure (must include numeric value)
5. Call goal prediction service with proper parameter ordering
6. Log prediction completion
7. Return prediction results

#### Service Calls
```javascript
// JWT Token Parameter Ordering (userId, jwtToken, goalDefinition)
const result = await goalPredictionService.predictGoalAchievement(
  userId,
  jwtToken,
  goalDefinition
);
```

#### Response Transformation
- **Service Response:** Goal achievement prediction results
- **Controller Response:** Direct service response pass-through
- **Added Fields:** None
- **Removed Fields:** None

#### Error Handling
- **Try/Catch Blocks:** Yes, with comprehensive validation
- **Error Transformation:** ApplicationError → 400, DatabaseError → 500, Generic → 500
- **Logging:** Goal prediction completion with user context

---

### getGoalProgress()
**File:** `controllers/analytics.js`
**Line:** 638
**Route Endpoint:** Not explicitly mapped in routes (internal method)

#### Request Processing
- **Extracted From Request:**
  - User Context: `req.user.id` (consistency pattern)
  - Headers: JWT token with Bearer prefix validation
  - Params: `goalId` (required UUID validation)

#### Business Logic Flow
1. Validate authentication with JWT Bearer format
2. Validate required goalId presence
3. Validate goalId format using UUID validator
4. Call goal progress tracking service
5. Log successful progress retrieval
6. Return progress data

#### Service Calls
```javascript
// JWT Token Parameter Ordering
const result = await goalPredictionService.trackGoalProgress(
  userId,
  jwtToken,
  goalId
);
```

#### Response Transformation
- **Service Response:** Goal progress tracking data
- **Controller Response:** Direct service response pass-through
- **Added Fields:** None
- **Removed Fields:** None

#### Error Handling
- **Try/Catch Blocks:** Yes, with UUID validation
- **Error Transformation:** NotFoundError → 404, ApplicationError → 400, DatabaseError → 500
- **Logging:** Goal progress retrieval with goal ID context

---

### createGoal()
**File:** `controllers/analytics.js`
**Line:** 689
**Route Endpoint:** Not explicitly mapped in routes (internal method)

#### Request Processing
- **Extracted From Request:**
  - User Context: `req.user.id` (consistency pattern)
  - Headers: JWT token with Bearer prefix validation
  - Body: `goalDefinition` (required object with comprehensive validation)

#### Business Logic Flow
1. Validate authentication requirements
2. Validate required goalDefinition presence
3. Check for required fields ['type', 'target', 'timeframe']
4. Validate goalType against allowed values ['weight_loss', 'muscle_gain', 'strength', 'endurance', 'body_composition']
5. Validate timeframe against allowed values ['1month', '3months', '6months', '1year']
6. Call goal creation service
7. Log successful goal creation
8. Return creation result with 201 status

#### Service Calls
```javascript
// JWT Token Parameter Ordering
const result = await goalPredictionService.createGoal(
  userId,
  jwtToken,
  goalDefinition
);
```

#### Response Transformation
- **Service Response:** Goal creation confirmation
- **Controller Response:** Direct service response with 201 status
- **Added Fields:** None
- **Removed Fields:** None

#### Error Handling
- **Try/Catch Blocks:** Yes, with comprehensive field validation
- **Error Transformation:** Missing fields → 400, Invalid values → 400, ApplicationError → 400, DatabaseError → 500
- **Logging:** Goal creation success with goal type

---

### updateGoal()
**File:** `controllers/analytics.js`
**Line:** 760
**Route Endpoint:** Not explicitly mapped in routes (internal method)

#### Request Processing
- **Extracted From Request:**
  - User Context: `req.user.id` (consistency pattern)
  - Headers: JWT token with Bearer prefix validation
  - Params: `goalId` (required UUID validation)
  - Body: `updates` (required object with allowed fields validation)

#### Business Logic Flow
1. Validate authentication requirements
2. Validate required goalId and UUID format
3. Validate updates object presence and content
4. Validate allowed update fields ['target', 'timeframe', 'description', 'priority']
5. Call goal update service with validated parameters
6. Log successful goal update
7. Return update results

#### Service Calls
```javascript
// JWT Token Parameter Ordering
const result = await goalPredictionService.updateGoal(
  userId,
  jwtToken,
  goalId,
  updates
);
```

#### Response Transformation
- **Service Response:** Goal update confirmation
- **Controller Response:** Direct service response pass-through
- **Added Fields:** None
- **Removed Fields:** None

#### Error Handling
- **Try/Catch Blocks:** Yes, with comprehensive validation
- **Error Transformation:** Invalid fields → 400, NotFoundError → 404, ApplicationError → 400, DatabaseError → 500
- **Logging:** Goal update success with goal ID

---

### getUserGoals()
**File:** `controllers/analytics.js`
**Line:** 833
**Route Endpoint:** Not explicitly mapped in routes (internal method)

#### Request Processing
- **Extracted From Request:**
  - User Context: `req.user.id` (consistency pattern)
  - Headers: JWT token with Bearer prefix validation
  - Query Params: Optional filters - `status`, `type`, `timeframe` with validation

#### Business Logic Flow
1. Validate authentication requirements
2. Extract optional query parameters for filtering
3. Validate status filter against allowed values ['active', 'completed', 'paused', 'cancelled']
4. Validate type filter against allowed values ['weight_loss', 'muscle_gain', 'strength', 'endurance', 'body_composition']
5. Validate timeframe filter against allowed values ['1month', '3months', '6months', '1year']
6. Build options object with validated filters
7. Call goal retrieval service
8. Log successful retrieval with goal count
9. Return filtered goals list

#### Service Calls
```javascript
// JWT Token Parameter Ordering
const result = await goalPredictionService.getUserGoals(
  userId,
  jwtToken,
  options
);
```

#### Response Transformation
- **Service Response:** Filtered goals list
- **Controller Response:** Direct service response pass-through
- **Added Fields:** None
- **Removed Fields:** None

#### Error Handling
- **Try/Catch Blocks:** Yes, with filter validation
- **Error Transformation:** Invalid filters → 400, DatabaseError → 500
- **Logging:** Goal retrieval success with count information

## Controller-Specific Middleware
- **JWT Token Extraction:** Bearer prefix validation and token extraction pattern
- **UUID Validation:** Using imported `isValidUUID` function for goalId parameters
- **Parameter Validation:** Extensive query parameter and body validation with allowed values checking
- **Error Classification:** Custom error handling based on error types (DatabaseError, ApplicationError, NotFoundError)

## Integration Considerations
- **Loading States:** AI endpoints (insights, patterns, recommendations) may take 5-30 seconds for processing
- **Optimistic Updates:** Basic analytics can support optimistic UI updates with 5-minute cache
- **Validation Beyond Schema:** 
  - Date range validation (365-day maximum)
  - Parameter range validation (maxRecommendations: 1-50 for individual endpoints, 1-20 for comprehensive)
  - Goal type and timeframe enum validation
  - UUID format validation for goal operations
- **Caching Considerations:** 
  - Standard analytics: 5-minute cache window
  - AI analytics: 1-hour cache window due to processing costs
  - Refresh operations: Cache invalidation patterns
- **Error Response Consistency:** All methods use standardized error response format with status, message, and optional code fields
- **Parallel Processing:** Comprehensive AI analytics uses Promise.all for efficient parallel service calls
- **Authentication Patterns:** Consistent JWT token validation with Bearer prefix checking across all methods