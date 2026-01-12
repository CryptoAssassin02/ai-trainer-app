# Progress Tracking Routes Documentation

## Overview
Progress tracking routes handle user check-in functionality, enabling comprehensive tracking of physical measurements, wellness metrics, and progress calculations. These endpoints support the app's analytics and goal tracking features through detailed data collection and trend analysis.

**Core Features:**
- User check-in recording with physical and wellness metrics
- Flexible check-in retrieval with filtering and pagination
- Individual check-in detailed views with analytics context
- Comprehensive progress metrics calculation and trend analysis

## Route Definitions

### POST /v1/progress/check-in
**File:** `routes/check-in.js`
**Line:** 26-31
**Router:** `express.Router()`

#### Configuration
- **Rate Limiting:** Yes, 5 requests per hour per user (disabled in test environment)
- **Middleware Applied:** 
  1. `authenticate` - JWT token validation and user context
  2. `checkInLimiter` - Rate limiting for check-in creation
  3. `validateCheckIn` - Request body validation
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/progress/progress_check-in.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** 
  - `date` (required, string, YYYY-MM-DD format, not in future)
  - `weight` (optional, number, reasonable range validation)
  - `body_fat_percentage` (optional, number, 0-50% range)
  - `measurements` (optional, object with body measurements)
  - `mood` (optional, integer, 1-10 scale)
  - `sleep_quality` (optional, integer, 1-10 scale)
  - `energy_level` (optional, integer, 1-10 scale)
  - `stress_level` (optional, integer, 1-10 scale)
  - `notes` (optional, string, max length validation)

#### Handler Mapping
- **Controller Method:** `checkInController.recordCheckIn()`
- **Response Format:** 
  ```json
  {
    "status": "success",
    "data": {
      "checkIn": {
        "id": "uuid",
        "user_id": "uuid",
        "date": "YYYY-MM-DD",
        "weight": "number",
        "body_fat_percentage": "number",
        "measurements": "object",
        "mood": "integer",
        "sleep_quality": "integer",
        "energy_level": "integer",
        "stress_level": "integer",
        "notes": "string",
        "created_at": "timestamp"
      }
    },
    "message": "Check-in recorded successfully"
  }
  ```

#### Error Routes
- **400:** Invalid request data, future date, validation failures
- **401:** Missing or invalid JWT token
- **409:** Duplicate check-in for the same date
- **422:** Data validation errors (measurements out of range)
- **429:** Rate limit exceeded (5 check-ins per hour)
- **500:** Database errors, internal server errors

#### Business Logic Notes
- **Duplicate Prevention:** Only one check-in per day per user allowed
- **Data Validation:** Physical measurements validated against reasonable ranges
- **Analytics Trigger:** Automatically triggers progress calculations and trend updates
- **Rate Limiting Logic:** Test environment bypasses rate limiting completely

---

### GET /v1/progress/check-ins
**File:** `routes/check-in.js`
**Line:** 34-39
**Router:** `express.Router()`

#### Configuration
- **Rate Limiting:** No (read operation)
- **Middleware Applied:** 
  1. `authenticate` - JWT token validation and user context
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/progress/progress_check-ins.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** 
  - `startDate` (optional, string, YYYY-MM-DD format)
  - `endDate` (optional, string, YYYY-MM-DD format)
  - `sortBy` (optional, string, enum: date|weight|body_fat_percentage|mood|sleep_quality|energy_level|stress_level, default: date)
  - `sortOrder` (optional, string, enum: asc|desc, default: desc)
  - `page` (optional, integer, min: 1, default: 1)
  - `limit` (optional, integer, min: 1, max: 100, default: 20)
  - `includeMetrics` (optional, boolean, default: true)
  - `includeNotes` (optional, boolean, default: true)
  - `dataCompleteness` (optional, string, enum: all|complete|partial|minimal, default: all)
  - `weightRange` (optional, string, pattern: min-max format)
  - `bodyFatRange` (optional, string, pattern: min-max format)
  - `moodRange` (optional, string, pattern: min-max format 1-10)
  - `searchNotes` (optional, string, max: 100 chars, case-insensitive)
  - `format` (optional, string, enum: json|summary|export, default: json)
- **Body Validation:** None (GET request)

#### Handler Mapping
- **Controller Method:** `checkInController.getCheckIns()`
- **Response Format:** 
  ```json
  {
    "status": "success",
    "data": {
      "checkIns": [
        {
          "id": "uuid",
          "date": "YYYY-MM-DD",
          "weight": "number",
          "body_fat_percentage": "number",
          "measurements": "object",
          "mood": "integer",
          "sleep_quality": "integer",
          "energy_level": "integer",
          "stress_level": "integer",
          "notes": "string",
          "created_at": "timestamp"
        }
      ],
      "pagination": {
        "page": "integer",
        "limit": "integer",
        "total": "integer",
        "totalPages": "integer"
      },
      "summary": {
        "totalCheckIns": "integer",
        "dateRange": {
          "start": "YYYY-MM-DD",
          "end": "YYYY-MM-DD"
        },
        "averages": "object"
      }
    }
  }
  ```

#### Error Routes
- **400:** Invalid query parameters, malformed date ranges
- **401:** Missing or invalid JWT token
- **404:** No check-ins found for specified criteria
- **429:** Generic rate limiting (if applied)
- **500:** Database errors, internal server errors

#### Business Logic Notes
- **Filtering Flexibility:** Supports multiple simultaneous filters with logical AND
- **Pagination:** Cursor-based pagination for large datasets
- **Data Optimization:** Response includes summary statistics and trend indicators
- **Export Support:** Multiple format options for data export functionality
- **Search Functionality:** Full-text search within notes field

---

### GET /v1/progress/check-ins/:checkInId
**File:** `routes/check-in.js`
**Line:** 42-47
**Router:** `express.Router()`

#### Configuration
- **Rate Limiting:** No (read operation)
- **Middleware Applied:** 
  1. `authenticate` - JWT token validation and user context
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/progress/progress_check-ins_checkInId.yaml`

#### Route Parameters
- **Path Parameters:** 
  - `checkInId` (required, string, UUID format)
- **Query Parameters:**
  - `includeContext` (optional, boolean, default: true)
  - `includeAnalytics` (optional, boolean, default: true)
  - `includePrevious` (optional, boolean, default: true)
  - `includeGoalProgress` (optional, boolean, default: false)
  - `contextDays` (optional, integer, min: 0, max: 90, default: 30)
  - `format` (optional, string, enum: detailed|summary|export, default: detailed)
- **Body Validation:** None (GET request)

#### Handler Mapping
- **Controller Method:** `checkInController.getCheckIn()`
- **Response Format:** 
  ```json
  {
    "status": "success",
    "data": {
      "checkIn": {
        "id": "uuid",
        "date": "YYYY-MM-DD",
        "weight": "number",
        "body_fat_percentage": "number",
        "measurements": "object",
        "mood": "integer",
        "sleep_quality": "integer",
        "energy_level": "integer",
        "stress_level": "integer",
        "notes": "string",
        "created_at": "timestamp"
      },
      "context": {
        "previousCheckIn": "object",
        "nextCheckIn": "object",
        "trendData": "array"
      },
      "analytics": {
        "progressSinceLast": "object",
        "trendAnalysis": "object",
        "goalProgress": "object"
      },
      "calculations": {
        "bmi": "number",
        "progressPercentages": "object",
        "timeBasedContext": "object"
      }
    }
  }
  ```

#### Error Routes
- **400:** Invalid UUID format for checkInId, invalid query parameters
- **401:** Missing or invalid JWT token
- **403:** User doesn't have permission to access this check-in
- **404:** Check-in not found
- **429:** Generic rate limiting (if applied)
- **500:** Database errors, internal server errors

#### Business Logic Notes
- **Context Enrichment:** Includes data from surrounding check-ins for trend analysis
- **Analytics Integration:** Real-time calculation of progress metrics and trends
- **Goal Correlation:** Optional integration with user goal progress tracking
- **Data Enrichment:** Automatic calculation of derived metrics (BMI, progress percentages)
- **User Ownership:** Strict validation that user can only access their own check-ins

---

### POST /v1/progress/metrics
**File:** `routes/check-in.js`
**Line:** 50-55
**Router:** `express.Router()`

#### Configuration
- **Rate Limiting:** No (but computationally expensive - consider implementing)
- **Middleware Applied:** 
  1. `authenticate` - JWT token validation and user context
  2. `validateMetricsCalculation` - Request body validation for metrics parameters
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/progress/progress_metrics.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:**
  - `startDate` (required, string, YYYY-MM-DD format)
  - `endDate` (required, string, YYYY-MM-DD format, must be after startDate)
  - `includeWellness` (optional, boolean, default: true)
  - `includeTrends` (optional, boolean, default: true)
  - `includeCorrelations` (optional, boolean, default: false)
  - `includeStatistics` (optional, boolean, default: false)
  - `granularity` (optional, string, enum: daily|weekly|monthly, default: daily)
  - `comparisonPeriod` (optional, string, enum: previous_week|previous_month|previous_quarter)
  - `focusMetrics` (optional, array of strings)
  - `analysisDepth` (optional, string, enum: basic|standard|comprehensive, default: standard)
  - `includeRecommendations` (optional, boolean, default: false)
  - `includeProjections` (optional, boolean, default: false)
  - `goalId` (optional, string, UUID format)

#### Handler Mapping
- **Controller Method:** `checkInController.calculateMetrics()`
- **Response Format:** 
  ```json
  {
    "status": "success",
    "data": {
      "metrics": {
        "dateRange": {
          "start": "YYYY-MM-DD",
          "end": "YYYY-MM-DD"
        },
        "summary": {
          "totalCheckIns": "integer",
          "dataCompleteness": "number",
          "consistencyScore": "number"
        },
        "weightProgression": "object",
        "bodyCompositionChanges": "object",
        "wellnessMetrics": "object",
        "trends": "object",
        "correlations": "object",
        "statistics": "object",
        "comparisons": "object",
        "recommendations": "array",
        "projections": "object"
      },
      "calculationMetadata": {
        "calculatedAt": "timestamp",
        "analysisDepth": "string",
        "dataQuality": "number"
      }
    }
  }
  ```

#### Error Routes
- **400:** Invalid date range, malformed request parameters
- **401:** Missing or invalid JWT token
- **404:** No check-in data found for specified date range
- **422:** Invalid calculation parameters or insufficient data
- **429:** Rate limiting (if implemented for computational protection)
- **500:** Database errors, calculation failures, internal server errors

#### Business Logic Notes
- **Computational Intensity:** Complex statistical calculations - consider caching results
- **Data Requirements:** Requires minimum data points for meaningful calculations
- **Trend Analysis:** Advanced statistical analysis including correlation and regression
- **Comparison Logic:** Comparative analysis with historical periods and user averages
- **Goal Integration:** Optional correlation with user goal progress and predictions

---

## Route Precedence Notes

**Important Routing Order:**
1. `/check-in` (POST) - Must come before parameterized routes
2. `/check-ins` (GET) - Must come before `/check-ins/:checkInId`
3. `/check-ins/:checkInId` (GET) - Parameterized route comes last
4. `/metrics` (POST) - Standalone endpoint, order not critical

**Potential Conflicts:**
- No conflicts identified - routes are properly differentiated
- UUID validation in path parameters prevents false matches

**Rate Limiting Hierarchy:**
- POST endpoints have stricter limits (check-in creation: 5/hour)
- GET endpoints generally unlimited (but subject to general API limits)
- Metrics calculation could benefit from rate limiting due to computational cost

## Integration Notes

**Frontend Routing Considerations:**
- All endpoints require authentication - implement token refresh logic
- Check-in creation is rate-limited - show appropriate user feedback
- Pagination required for check-ins list - implement infinite scroll or pagination UI
- Metrics calculation may be slow - implement loading states and caching

**Database Dependencies:**
- Primary table: `user_check_ins`
- Foreign key relationships with `users` table
- Potential relationships with `user_goals` for goal progress tracking
- Analytics data may be cached in separate tables for performance

**Analytics Integration:**
- Check-in creation triggers automatic analytics updates
- Metrics calculations feed into broader analytics pipeline
- Real-time progress tracking depends on timely check-in data
- Trend analysis requires historical data consistency

**Mobile Optimization:**
- Check-ins data structure optimized for mobile display
- Pagination supports infinite scroll patterns
- Image upload support for progress photos (future enhancement)
- Offline check-in recording with sync capabilities (future enhancement)

**Performance Considerations:**
- Metrics calculations are computationally expensive - implement caching
- Large date ranges may require background processing
- Database indexes required on user_id, date, and frequently filtered fields
- Consider read replicas for analytics-heavy operations

**Security Considerations:**
- Strict user ownership validation on all operations
- Sensitive wellness data requires additional privacy protections
- Rate limiting prevents abuse of check-in creation
- Input validation prevents injection attacks on measurement data

**Caching Strategy:**
- Individual check-ins: Cache for 5 minutes (data rarely changes)
- Check-ins lists: Cache for 2 minutes with user-specific keys
- Metrics calculations: Cache for 1 hour with invalidation on new check-ins
- Trend data: Cache for 30 minutes with background refresh