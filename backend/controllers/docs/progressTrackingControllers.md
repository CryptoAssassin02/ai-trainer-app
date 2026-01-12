# Progress Tracking Controllers Documentation

## Overview
Progress tracking controllers manage user check-in functionality, enabling comprehensive tracking of physical measurements, wellness metrics, and progress calculations. These controllers act as the intermediary between routes and services, handling request processing, data extraction, service coordination, and response formatting for all progress tracking operations.

**Key Responsibilities:**
- Request processing and parameter extraction for check-in operations
- User context validation and JWT token management
- Service method invocation with proper error handling
- Response formatting and HTTP status code management
- Logging and monitoring for progress tracking activities

## Controller Methods

### recordCheckIn
**File:** `controllers/check-in.js`
**Lines:** 12-52
**Route Mapping:** `POST /v1/progress/check-in`

#### Purpose
Records a new check-in entry for a user with physical measurements and wellness metrics, including validation, duplicate prevention, and analytics triggering.

#### Request Processing
```javascript
// Input Extraction
const userId = req.user.id;                           // From auth middleware
const jwtToken = req.headers.authorization.split(' ')[1]; // JWT extraction
const checkInData = req.body;                         // Check-in payload

// Parameter Structure Expected
const checkInData = {
  date: "YYYY-MM-DD",              // Required, validated against future dates
  weight: "number",                // Optional, reasonable range validation
  body_fat_percentage: "number",   // Optional, 0-50% range
  measurements: {                  // Optional body measurements object
    waist: "number",
    chest: "number", 
    arms: "number",
    legs: "number",
    hips: "number",
    shoulders: "number",
    neck: "number"
  },
  mood: "integer",                 // Optional, 1-10 scale
  sleep_quality: "integer",        // Optional, 1-10 scale
  energy_level: "integer",         // Optional, 1-10 scale
  stress_level: "integer",         // Optional, 1-10 scale
  notes: "string"                  // Optional, personal observations
};
```

#### Service Integration
```javascript
// Service Method Called
const result = await checkInService.storeCheckIn(userId, checkInData, jwtToken);

// Service Response Expected
{
  checkIn: {
    id: "uuid",
    user_id: "uuid", 
    date: "YYYY-MM-DD",
    weight: "number",
    body_fat_percentage: "number",
    measurements: "object",
    mood: "integer",
    sleep_quality: "integer", 
    energy_level: "integer",
    stress_level: "integer",
    notes: "string",
    created_at: "timestamp",
    updated_at: "timestamp"
  },
  analytics: {
    progressCalculated: "boolean",
    trendsUpdated: "boolean"
  }
}
```

#### Response Processing
```javascript
// Success Response (201 Created)
{
  status: "success",
  data: result,                    // Complete service response
  message: "Check-in recorded successfully"
}

// Error Response Handling
- BadRequestError → 400 status with error message
- DatabaseError → 500 status with generic database error message
- Unexpected errors → 500 status with generic error message
```

#### Error Handling Patterns
- **Request Validation:** Middleware handles validation before controller
- **Business Logic Errors:** Service throws typed errors (BadRequestError, DatabaseError)
- **Error Logging:** All errors logged with context (userId, error message, stack trace)
- **Error Response:** Consistent JSON format with status and message fields
- **Security:** No sensitive data exposure in error messages

#### Logging and Monitoring
```javascript
// Success Logging
logger.info('Recording check-in', { userId });

// Error Logging  
logger.error('Failed to record check-in', { 
  error: error.message, 
  stack: error.stack 
});
```

---

### getCheckIns
**File:** `controllers/check-in.js`
**Lines:** 54-99
**Route Mapping:** `GET /v1/progress/check-ins`

#### Purpose
Retrieves a filtered and paginated list of check-ins for a user, supporting various filtering options, sorting preferences, and data optimization features.

#### Request Processing
```javascript
// Input Extraction
const userId = req.user.id;
const jwtToken = req.headers.authorization.split(' ')[1];

// Filter Parameters Processing
const filters = {
  startDate: req.query.startDate,               // Optional YYYY-MM-DD format
  endDate: req.query.endDate,                   // Optional YYYY-MM-DD format  
  limit: req.query.limit ? parseInt(req.query.limit) : 10,     // Default 10
  offset: req.query.offset ? parseInt(req.query.offset) : 0    // Default 0
};

// Additional Parameters (handled by service)
const additionalParams = {
  sortBy: req.query.sortBy,                     // date|weight|mood|etc.
  sortOrder: req.query.sortOrder,               // asc|desc
  page: req.query.page,                         // Page number (1-based)
  includeMetrics: req.query.includeMetrics,     // boolean
  includeNotes: req.query.includeNotes,         // boolean  
  dataCompleteness: req.query.dataCompleteness, // all|complete|partial|minimal
  weightRange: req.query.weightRange,           // "min-max" format
  bodyFatRange: req.query.bodyFatRange,         // "min-max" format
  moodRange: req.query.moodRange,               // "min-max" format (1-10)
  searchNotes: req.query.searchNotes,           // Text search in notes
  format: req.query.format                      // json|summary|export
};
```

#### Service Integration
```javascript
// Service Method Called
const result = await checkInService.retrieveCheckIns(userId, filters, jwtToken);

// Service Response Structure
{
  data: [
    {
      id: "uuid",
      date: "YYYY-MM-DD", 
      weight: "number",
      body_fat_percentage: "number",
      measurements: "object",
      mood: "integer",
      sleep_quality: "integer",
      energy_level: "integer", 
      stress_level: "integer",
      notes: "string",
      created_at: "timestamp"
    }
  ],
  pagination: {
    page: "integer",
    limit: "integer", 
    total: "integer",
    totalPages: "integer",
    hasNext: "boolean",
    hasPrevious: "boolean"
  },
  summary: {
    totalCheckIns: "integer",
    dateRange: {
      start: "YYYY-MM-DD",
      end: "YYYY-MM-DD"
    },
    averages: {
      weight: "number",
      mood: "number",
      energy_level: "number"
    }
  }
}
```

#### Response Processing
```javascript
// Success Response (200 OK)
{
  status: "success",
  data: result.data,               // Array of check-in records
  pagination: result.pagination,   // Pagination metadata
  message: "Check-ins retrieved successfully"
}
```

#### Advanced Features
- **Flexible Filtering:** Multiple simultaneous filters with logical AND operations
- **Dynamic Sorting:** Sort by any tracked metric with ascending/descending options
- **Pagination Support:** Both offset-based and cursor-based pagination
- **Data Optimization:** Optional inclusion/exclusion of data components
- **Export Formatting:** Multiple output formats for data export
- **Search Capabilities:** Full-text search within notes field
- **Summary Statistics:** Automatic calculation of key metrics and averages

---

### getCheckIn
**File:** `controllers/check-in.js`
**Lines:** 101-146
**Route Mapping:** `GET /v1/progress/check-ins/:checkInId`

#### Purpose
Retrieves a specific check-in record by ID with enriched analytics context, trend analysis, and detailed progress calculations.

#### Request Processing
```javascript
// Input Extraction and Validation
const userId = req.user.id;
const checkInId = req.params.checkInId;           // UUID from URL path
const jwtToken = req.headers.authorization.split(' ')[1];

// Parameter Validation
if (!checkInId) {
  return res.status(400).json({
    status: 'error',
    message: 'Check-in ID is required'
  });
}

// Query Parameters (processed by service)
const options = {
  includeContext: req.query.includeContext,       // boolean, default true
  includeAnalytics: req.query.includeAnalytics,   // boolean, default true
  includePrevious: req.query.includePrevious,      // boolean, default true
  includeGoalProgress: req.query.includeGoalProgress, // boolean, default false
  contextDays: req.query.contextDays,             // integer, 0-90, default 30
  format: req.query.format                        // detailed|summary|export
};
```

#### Service Integration
```javascript
// Service Method Called
const result = await checkInService.retrieveCheckIn(checkInId, userId, jwtToken);

// Enhanced Response Structure
{
  checkIn: {
    id: "uuid",
    user_id: "uuid",
    date: "YYYY-MM-DD",
    weight: "number",
    body_fat_percentage: "number", 
    measurements: "object",
    mood: "integer",
    sleep_quality: "integer",
    energy_level: "integer",
    stress_level: "integer", 
    notes: "string",
    created_at: "timestamp"
  },
  context: {
    previousCheckIn: "object",      // Previous check-in for comparison
    nextCheckIn: "object",          // Next check-in (if exists)
    trendData: "array"              // Historical trend context
  },
  analytics: {
    progressSinceLast: "object",    // Changes since previous check-in
    trendAnalysis: "object",        // Trend indicators and patterns
    goalProgress: "object"          // Goal progress implications
  },
  calculations: {
    bmi: "number",                  // Calculated BMI
    progressPercentages: "object",  // Progress as percentages
    timeBasedContext: "object",     // Time-based progress context
    dataQuality: "number"           // Data completeness score
  }
}
```

#### Error Handling Specifics
```javascript
// Input Validation Errors
if (!checkInId) → 400 Bad Request

// Service Error Mapping
BadRequestError → 400 Bad Request (malformed UUID, invalid parameters)
NotFoundError → 404 Not Found (check-in doesn't exist or user doesn't own it)
Unexpected errors → 500 Internal Server Error
```

#### Security Considerations
- **User Ownership Validation:** Service ensures user can only access their own check-ins
- **UUID Validation:** Parameter validation prevents injection attacks
- **Authorization Context:** JWT token passed to service for additional security checks

---

### calculateMetrics
**File:** `controllers/check-in.js`
**Lines:** 148-203
**Route Mapping:** `POST /v1/progress/metrics`

#### Purpose
Calculates comprehensive progress metrics for a specified date range, including statistical analysis, trend detection, correlations, and recommendations.

#### Request Processing
```javascript
// Input Extraction
const userId = req.user.id;
const jwtToken = req.headers.authorization.split(' ')[1];

// Date Range Processing  
const dateRange = {
  startDate: req.body.startDate,        // Required YYYY-MM-DD
  endDate: req.body.endDate             // Required YYYY-MM-DD
};

// Advanced Parameters (processed by service)
const calculationParams = {
  includeWellness: req.body.includeWellness,           // boolean, default true
  includeTrends: req.body.includeTrends,               // boolean, default true
  includeCorrelations: req.body.includeCorrelations,   // boolean, default false
  includeStatistics: req.body.includeStatistics,       // boolean, default false
  granularity: req.body.granularity,                   // daily|weekly|monthly
  comparisonPeriod: req.body.comparisonPeriod,         // previous_*
  focusMetrics: req.body.focusMetrics,                 // array of metric names
  analysisDepth: req.body.analysisDepth,               // basic|standard|comprehensive
  includeRecommendations: req.body.includeRecommendations, // boolean, default false
  includeProjections: req.body.includeProjections,     // boolean, default false
  goalId: req.body.goalId                              // UUID for goal correlation
};
```

#### Service Integration
```javascript
// Service Method Called
const result = await checkInService.computeMetrics(userId, dateRange, jwtToken);

// Comprehensive Metrics Response
{
  data: {
    metrics: {
      dateRange: {
        start: "YYYY-MM-DD",
        end: "YYYY-MM-DD"
      },
      summary: {
        totalCheckIns: "integer",
        dataCompleteness: "number",      // 0-1 score
        consistencyScore: "number"       // 0-1 score
      },
      weightProgression: {
        trend: "string",                 // increasing|decreasing|stable
        changeAmount: "number",          // Total change in period
        changePercentage: "number",      // Percentage change
        velocity: "number"               // Change per day/week
      },
      bodyCompositionChanges: "object",  // Similar structure for body fat
      wellnessMetrics: {
        mood: "object",                  // Trends and averages
        sleep_quality: "object",
        energy_level: "object", 
        stress_level: "object"
      },
      trends: "object",                  // Statistical trend analysis
      correlations: "object",            // Metric correlation matrix
      statistics: "object",              // Advanced statistical measures
      comparisons: "object",             // Comparison with previous periods
      recommendations: "array",          // AI-generated recommendations
      projections: "object"              // Future trend projections
    },
    calculationMetadata: {
      calculatedAt: "timestamp",
      analysisDepth: "string",
      dataQuality: "number",
      processingTime: "number"
    }
  },
  message: "string"                      // Success or informational message
}
```

#### Computational Considerations
- **Processing Intensity:** Complex statistical calculations may take significant time
- **Memory Usage:** Large date ranges require substantial memory for analysis
- **Caching Opportunity:** Results should be cached to avoid repeated calculations
- **Background Processing:** Consider async processing for comprehensive analysis
- **Data Requirements:** Minimum data points needed for meaningful analysis

#### Business Logic Integration
- **Statistical Analysis:** Advanced trend detection and correlation analysis
- **Goal Correlation:** Optional integration with user goal progress tracking  
- **Recommendation Engine:** AI-powered insights based on patterns
- **Projection Modeling:** Predictive analytics for future trends
- **Quality Assessment:** Data quality scoring and completeness analysis

---

## Cross-Method Patterns

### Authentication Handling
**Consistent Pattern Across All Methods:**
```javascript
// User Context Extraction
const userId = req.user.id;                    // From auth middleware
const jwtToken = req.headers.authorization.split(' ')[1];  // JWT token extraction

// Security Validation
- req.user populated by auth middleware
- JWT token validated and passed to services
- User ownership enforced at service level
```

### Error Handling Architecture
**Standardized Error Processing:**
```javascript
// Error Type Classification
BadRequestError → 400 status (client errors)
NotFoundError → 404 status (resource not found)  
DatabaseError → 500 status (server errors)
Unexpected errors → 500 status (generic server errors)

// Error Logging Pattern
logger.error('Operation failed', { 
  error: error.message, 
  stack: error.stack,
  context: { userId, operationId }
});

// Response Format
{
  status: "error",
  message: "string"          // User-friendly error message
}
```

### Request Parameter Processing
**Consistent Parameter Extraction:**
```javascript
// Path Parameters
const resourceId = req.params.resourceId;

// Query Parameters  
const filters = extractQueryParams(req.query);

// Body Parameters
const requestData = req.body;

// Parameter Validation
- Basic validation in controller
- Advanced validation delegated to middleware
- Business logic validation in services
```

### Response Format Standardization
**Unified Response Structure:**
```javascript
// Success Response
{
  status: "success",
  data: "object",           // Main response payload
  pagination: "object",     // For list endpoints
  message: "string"         // Success message
}

// HTTP Status Codes
201 → Created (POST operations)
200 → OK (GET, PUT operations)  
400 → Bad Request (client errors)
404 → Not Found (resource not found)
500 → Internal Server Error (server errors)
```

### Service Integration Patterns
**Consistent Service Method Invocation:**
```javascript
// Service Call Pattern
const result = await service.method(userId, parameters, jwtToken);

// Service Response Handling
- Services return structured response objects
- Controllers pass through service responses
- Error handling delegated to services with typed exceptions
- JWT tokens passed for additional service-level security
```

### Logging and Monitoring Standards
**Comprehensive Logging Strategy:**
```javascript
// Operation Start Logging
logger.info('Operation started', { userId, operation: 'operation_name', parameters });

// Success Logging
logger.info('Operation completed', { userId, operation: 'operation_name', result: 'summary' });

// Error Logging
logger.error('Operation failed', { userId, operation: 'operation_name', error: error.message, stack: error.stack });

// Performance Monitoring
- Execution time tracking for metrics calculations
- Memory usage monitoring for large data processing
- Service response time measurement
```

---

## Performance Optimization Strategies

### Response Time Optimization
- **Metrics Calculations:** Implement caching for repeated calculations
- **Database Queries:** Optimize with proper indexing and query structure
- **Data Processing:** Stream processing for large datasets
- **Memory Management:** Efficient object handling for analytics operations

### Scalability Considerations
- **Rate Limiting:** Implement computational rate limiting for metrics endpoint
- **Background Processing:** Move complex calculations to background jobs
- **Caching Layer:** Implement Redis caching for frequent operations
- **Database Optimization:** Use read replicas for analytics queries

### Error Recovery Mechanisms
- **Retry Logic:** Automatic retry for transient database errors
- **Graceful Degradation:** Partial results when complete calculation fails
- **Circuit Breaker:** Prevent cascade failures in metrics calculations
- **Fallback Responses:** Default responses when services are unavailable

---

## Integration Dependencies

### Service Layer Dependencies
- **checkInService:** Core service for all progress tracking operations
- **logger:** Centralized logging service for monitoring and debugging
- **Error Classes:** Typed error classes for consistent error handling

### Middleware Dependencies
- **authenticate:** JWT validation and user context population
- **validateCheckIn:** Request body validation for check-in creation
- **validateMetricsCalculation:** Request body validation for metrics calculation

### Database Dependencies
- **user_check_ins:** Primary table for check-in data storage
- **users:** User information and authentication context
- **user_goals:** Optional integration for goal progress tracking
- **cached_analytics:** Potential caching tables for performance optimization

### External Service Dependencies
- **Analytics Engine:** Statistical analysis and trend detection
- **Recommendation Service:** AI-powered insights and recommendations
- **Goal Tracking System:** Integration with user goal progress
- **Notification Service:** Triggering progress notifications and alerts