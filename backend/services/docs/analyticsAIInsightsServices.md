# Analytics & AI Insights Service Documentation

## Overview
This service manages all analytics data operations and AI-powered insights for the trAIner application. It provides comprehensive data aggregation, trend analysis, strength progression tracking, adherence metrics, and sophisticated AI-powered pattern detection and insight generation. The service integrates with multiple database systems (Supabase, PostgreSQL) and AI agents to deliver actionable analytics and personalized recommendations.

**File:** `services/analytics-service.js`
**Total Methods:** 14 service methods (9 traditional analytics + 5 AI-powered methods)
**Database Integration:** Supabase client with RLS, PostgreSQL direct connections with transactions
**AI Integration:** AnalyticsAgent, PatternDetector, InsightGenerator with OpenAI service

## Service Class/Module

### Configuration
- **Dependencies:** 
  - `@supabase/supabase-js` for authenticated database operations
  - `pg` (PostgreSQL) for direct transaction-based operations
  - Custom error classes (DatabaseError, NotFoundError, ApplicationError)
  - Logger for structured logging
  - Supabase configuration and client utilities
- **Database Tables:** 
  - `user_analytics_aggregates` (primary analytics data)
  - PostgreSQL stored procedures (`calculate_strength_progression`, `compute_adherence_metrics`, `refresh_user_analytics`)
  - Cross-referenced with workout logs, check-ins, user profiles
- **External APIs:** 
  - OpenAI API (via OpenAIService for AI insights and recommendations)
  - Supabase Auth for Row Level Security integration
- **AI Services:**
  - AnalyticsAgent for comprehensive AI analysis
  - PatternDetector for behavior pattern identification
  - InsightGenerator for actionable recommendations
  - AgentMemorySystem for context retention
- **Initialization:** 
  - Lazy initialization of AI services (`initializeAIServices()`)
  - Service role key configuration for transactions
  - OpenAI client verification and validation

## Service Methods

### executeAnalyticsTransaction()
**File:** `services/analytics-service.js`
**Line:** 65
**Called By:** `getStrengthProgression()`, `getAdherenceMetrics()`, `refreshUserAnalytics()`

#### Method Signature
```javascript
async executeAnalyticsTransaction(callback)
```

#### Parameters
- **callback:** Function - Async function that receives connected PostgreSQL client for operations

#### Business Logic
1. Create PostgreSQL connection pool with service role credentials
2. Acquire client connection from pool
3. Begin database transaction with error handling
4. Execute callback function with connected client
5. Commit transaction on success or rollback on failure
6. Ensure proper cleanup of connections and pool

#### Database Operations
```sql
-- Transaction management
BEGIN;
-- Callback operations (varies by caller)
COMMIT; -- or ROLLBACK on error
```

#### Transaction Boundaries
- **Uses Transactions:** Yes, full ACID compliance
- **Rollback Conditions:** Any error in callback function, connection failures
- **Isolation Level:** Default PostgreSQL isolation (Read Committed)

#### Return Value
```javascript
// Returns result from callback function - structure varies by caller
```

#### Error Cases
- **DatabaseError:** Connection failures, transaction rollback scenarios, pool creation issues
- **Propagated Errors:** Custom errors from callback functions

#### Performance Considerations
- **Typical Duration:** 50-500ms depending on callback complexity
- **Caching:** No direct caching (delegates to callback)
- **Batch Operations:** Supports batch operations within callback transactions

---

### getOverviewMetrics()
**File:** `services/analytics-service.js`
**Line:** 99
**Called By:** `analyticsController.getAnalyticsOverview()`, `analyticsController.getAnalyticsByDateRange()`

#### Method Signature
```javascript
async getOverviewMetrics(userId, jwtToken, options = {})
```

#### Parameters
- **userId:** string - User UUID for analytics retrieval
- **jwtToken:** string - JWT token for RLS authentication
- **options:** object - Configuration options
  - `timeframe` (string, default: '30 days') - Analysis timeframe
  - `includeProjections` (boolean, default: false) - Include future projections

#### Business Logic
1. Create authenticated Supabase client with JWT token
2. Parse timeframe and calculate date range (7, 30, or 90 days)
3. Query `user_analytics_aggregates` table with date filtering
4. Handle no-data scenarios with default response structure
5. Calculate comprehensive overview metrics from aggregated data
6. Compute wellness score using multi-factor algorithm
7. Calculate weight and body fat changes between timeframe endpoints
8. Return structured analytics overview with data quality indicators

#### Database Operations
```sql
-- Primary analytics query
SELECT * FROM user_analytics_aggregates 
WHERE user_id = $userId 
AND date >= $startDate 
ORDER BY date DESC;
```

#### Transaction Boundaries
- **Uses Transactions:** No (single read operation)
- **Rollback Conditions:** N/A
- **Isolation Level:** N/A

#### Return Value
```javascript
{
  userId: string,
  timeframe: string,
  hasData: boolean,
  overview: {
    workouts: {
      completed: number,
      totalExercises: number,
      avgDifficulty: number,
      avgSatisfaction: number,
      consistency: number
    },
    physical: {
      currentWeight: number,
      weightChange: number,
      currentBodyFat: number,
      bodyFatChange: number
    },
    wellness: {
      overallScore: number,
      mood: number,
      sleep: number,
      energy: number,
      stress: number
    },
    adherence: {
      workout: number,
      nutrition: number,
      overall: number
    }
  },
  dataQuality: number,
  lastUpdated: string
}
```

#### Error Cases
- **DatabaseError:** Supabase query failures, connection issues
- **ValidationError:** Invalid userId format (handled by RLS)

#### Performance Considerations
- **Typical Duration:** 100-300ms for standard timeframes
- **Caching:** 5-minute cache at controller level
- **Batch Operations:** Single aggregated query design

---

### getProgressTrends()
**File:** `services/analytics-service.js`
**Line:** 178
**Called By:** `analyticsController.getProgressTrends()`, `getTrendsData()` wrapper

#### Method Signature
```javascript
async getProgressTrends(userId, jwtToken, options = {})
```

#### Parameters
- **userId:** string - User UUID for trends analysis
- **jwtToken:** string - JWT token for RLS authentication
- **options:** object - Trend analysis configuration
  - `timeframe` (string, default: '90 days') - Analysis period
  - `groupBy` (string, default: 'week') - Data grouping (day/week/month)
  - `metrics` (array, default: ['weight', 'workouts', 'wellness']) - Metrics to analyze

#### Business Logic
1. Parse timeframe into numerical days (30, 90, 365)
2. Query analytics data with ascending date order for trend calculation
3. Group data by specified timeframe (day/week/month) using helper functions
4. Calculate trends for each requested metric using linear analysis
5. Compute trend direction (improving/declining/stable) and percentage changes
6. Generate time-series data points for visualization
7. Return comprehensive trend analysis with metadata

#### Database Operations
```sql
-- Trends data query
SELECT * FROM user_analytics_aggregates 
WHERE user_id = $userId 
AND date >= $startDate 
ORDER BY date ASC;
```

#### Transaction Boundaries
- **Uses Transactions:** No (read-only operation)
- **Rollback Conditions:** N/A
- **Isolation Level:** N/A

#### Return Value
```javascript
{
  userId: string,
  timeframe: string,
  groupBy: string,
  hasData: boolean,
  trends: {
    weight?: {
      trend: 'improving'|'declining'|'stable',
      change: number,
      percentChange: number,
      values: Array<{date: string, value: number}>,
      firstValue: number,
      lastValue: number
    },
    workouts?: {
      completed: TrendObject,
      difficulty: TrendObject,
      satisfaction: TrendObject
    },
    wellness?: {
      mood: TrendObject,
      sleep: TrendObject,
      energy: TrendObject,
      stress: TrendObject
    }
  },
  dataPoints: number,
  lastUpdated: string
}
```

#### Error Cases
- **DatabaseError:** Query execution failures, connection issues
- **ApplicationError:** Invalid groupBy parameter (handled at controller level)

#### Performance Considerations
- **Typical Duration:** 150-400ms depending on data volume and grouping
- **Caching:** 5-minute cache at controller level
- **Batch Operations:** Single query with client-side aggregation for efficiency

---

### getStrengthProgression()
**File:** `services/analytics-service.js`
**Line:** 254
**Called By:** `analyticsController.getStrengthProgression()`

#### Method Signature
```javascript
async getStrengthProgression(userId, jwtToken, options = {})
```

#### Parameters
- **userId:** string - User UUID for strength analysis
- **jwtToken:** string - JWT token (used for context, but method uses PostgreSQL function)
- **options:** object - Progression analysis options
  - `timeframe` (string, default: '90 days') - Analysis period

#### Business Logic
1. Parse timeframe into numerical days for database function
2. Execute transaction with PostgreSQL stored procedure
3. Call `calculate_strength_progression` database function with user ID and day range
4. Handle empty results with appropriate default response
5. Return structured progression data with metadata

#### Database Operations
```sql
-- PostgreSQL stored procedure call
SELECT calculate_strength_progression($1, $2) as progression_data;
-- Where $1 = userId, $2 = days
```

#### Transaction Boundaries
- **Uses Transactions:** Yes (via executeAnalyticsTransaction)
- **Rollback Conditions:** Database function execution failures
- **Isolation Level:** Default PostgreSQL isolation

#### Return Value
```javascript
{
  userId: string,
  timeframe: string,
  hasData: boolean,
  progression: {
    // Structure depends on database function implementation
    // Typically includes exercise-specific progression metrics
  },
  lastUpdated: string
}
```

#### Error Cases
- **DatabaseError:** Stored procedure failures, transaction rollbacks, connection issues

#### Performance Considerations
- **Typical Duration:** 200-600ms depending on data complexity
- **Caching:** No service-level caching (relies on database optimization)
- **Batch Operations:** Single stored procedure call for efficiency

---

### getAdherenceMetrics()
**File:** `services/analytics-service.js`
**Line:** 284
**Called By:** `analyticsController.getAdherenceMetrics()`, `getPatternAnalysis()` for data gathering

#### Method Signature
```javascript
async getAdherenceMetrics(userId, jwtToken, options = {})
```

#### Parameters
- **userId:** string - User UUID for adherence analysis
- **jwtToken:** string - JWT token for context (PostgreSQL function used)
- **options:** object - Adherence calculation options
  - `timeframe` (string, default: '30 days') - Analysis period

#### Business Logic
1. Parse timeframe into days (7, 30, 90)
2. Execute transaction with adherence computation function
3. Call `compute_adherence_metrics` PostgreSQL function
4. Handle empty results gracefully
5. Return structured adherence data

#### Database Operations
```sql
-- PostgreSQL stored procedure call
SELECT compute_adherence_metrics($1, $2) as adherence_data;
-- Where $1 = userId, $2 = days
```

#### Transaction Boundaries
- **Uses Transactions:** Yes (via executeAnalyticsTransaction)
- **Rollback Conditions:** Function execution failures
- **Isolation Level:** Default PostgreSQL isolation

#### Return Value
```javascript
{
  userId: string,
  timeframe: string,
  hasData: boolean,
  adherence: {
    // Structure from database function
    // Typically includes workout and nutrition adherence percentages
  },
  lastUpdated: string
}
```

#### Error Cases
- **DatabaseError:** Stored procedure failures, transaction issues

#### Performance Considerations
- **Typical Duration:** 150-400ms
- **Caching:** No service-level caching
- **Batch Operations:** Single function call

---

### refreshUserAnalytics()
**File:** `services/analytics-service.js`
**Line:** 314
**Called By:** `analyticsController.refreshAnalytics()`

#### Method Signature
```javascript
async refreshUserAnalytics(userId, jwtToken, options = {})
```

#### Parameters
- **userId:** string - User UUID for analytics refresh
- **jwtToken:** string - JWT token for context
- **options:** object - Refresh operation options
  - `startDate` (string, default: 30 days ago) - Refresh start date (YYYY-MM-DD)
  - `endDate` (string, default: today) - Refresh end date (YYYY-MM-DD)

#### Business Logic
1. Set default date range (30 days back to today) if not provided
2. Execute transaction with analytics refresh function
3. Call `refresh_user_analytics` PostgreSQL function with date range
4. Log successful refresh operation
5. Return confirmation with operation metadata

#### Database Operations
```sql
-- PostgreSQL refresh procedure
SELECT refresh_user_analytics($1, $2::date, $3::date);
-- Where $1 = userId, $2 = startDate, $3 = endDate
```

#### Transaction Boundaries
- **Uses Transactions:** Yes (via executeAnalyticsTransaction)
- **Rollback Conditions:** Refresh function failures, invalid date ranges
- **Isolation Level:** Default PostgreSQL isolation

#### Return Value
```javascript
{
  userId: string,
  operation: 'refresh',
  success: boolean,
  dateRange: {
    startDate: string,
    endDate: string
  },
  timestamp: string
}
```

#### Error Cases
- **DatabaseError:** Refresh function failures, transaction rollbacks, invalid date formats

#### Performance Considerations
- **Typical Duration:** 500-2000ms depending on date range and data volume
- **Caching:** Invalidates related caches
- **Batch Operations:** Single refresh operation for date range

---

### getTrendsData()
**File:** `services/analytics-service.js`
**Line:** 468
**Called By:** AI service methods (`getPatternAnalysis()`, `getGoalPredictions()`) as consistent interface wrapper

#### Method Signature
```javascript
async getTrendsData(userId, timeframe = '30 days', jwtToken = null)
```

#### Parameters
- **userId:** string - User UUID for trends data
- **timeframe:** string - Analysis timeframe (default: '30 days')
- **jwtToken:** string - JWT token for RLS (nullable for internal calls)

#### Business Logic
1. Prepare standardized options for getProgressTrends call
2. Use 'week' grouping and comprehensive metrics by default
3. Call existing getProgressTrends method with consistent parameters
4. Transform response for AnalyticsAgent consumption
5. Return formatted trends data with standardized structure

#### Database Operations
```javascript
// Delegates to getProgressTrends - no direct database operations
```

#### Transaction Boundaries
- **Uses Transactions:** No (delegates to getProgressTrends)
- **Rollback Conditions:** Propagated from getProgressTrends
- **Isolation Level:** N/A

#### Return Value
```javascript
{
  userId: string,
  timeframe: string,
  hasData: boolean,
  trends: TrendsObject,
  dataPoints: number,
  lastUpdated: string
}
```

#### Error Cases
- **Propagated Errors:** All errors from getProgressTrends

#### Performance Considerations
- **Typical Duration:** Same as getProgressTrends (150-400ms)
- **Caching:** Inherits caching from getProgressTrends
- **Batch Operations:** Single delegation call

---

### getAIInsights()
**File:** `services/analytics-service.js`
**Line:** 492
**Called By:** `analyticsController.getAIInsights()`, `analyticsController.getComprehensiveAIAnalytics()`

#### Method Signature
```javascript
async getAIInsights(userId, timeframe = '30 days', jwtToken)
```

#### Parameters
- **userId:** string - User UUID for AI analysis
- **timeframe:** string - Analysis timeframe for insights generation
- **jwtToken:** string - JWT token for authenticated data access

#### Business Logic
1. Initialize AI services (AnalyticsAgent) with lazy loading pattern
2. Prepare context object with user ID, timeframe, and focus areas
3. Record processing start time for performance tracking
4. Execute AnalyticsAgent processing with comprehensive context
5. Validate AI agent response and extract insights data
6. Calculate processing time and enhance response with metadata
7. Return structured AI insights with confidence scores and recommendations

#### Database Operations
```javascript
// AI Agent performs database operations internally through injected services
// No direct database calls in this method
```

#### Transaction Boundaries
- **Uses Transactions:** No (delegates to AI agent)
- **Rollback Conditions:** N/A
- **Isolation Level:** N/A

#### Return Value
```javascript
{
  status: 'success',
  data: {
    insights: Array<{
      id: string,
      title: string,
      description: string,
      category: string,
      priority: 'high'|'medium'|'low',
      confidence: number,
      actionable_steps: Array<string>
    }>,
    patterns: Array<PatternObject>,
    metadata: {
      confidenceScore: number,
      dataQuality: number,
      aiGenerated: boolean
    },
    processingTime: number
  },
  message: string
}
```

#### Error Cases
- **ApplicationError:** AI services initialization failures, agent processing errors
- **DatabaseError:** Propagated from AI agent data operations

#### Performance Considerations
- **Typical Duration:** 3-15 seconds (AI processing intensive)
- **Caching:** 1-hour cache at controller level due to AI costs
- **Batch Operations:** AI agent handles internal batch processing

---

### getPatternAnalysis()
**File:** `services/analytics-service.js`
**Line:** 544
**Called By:** `analyticsController.getPatternAnalysis()`, `analyticsController.getComprehensiveAIAnalytics()`

#### Method Signature
```javascript
async getPatternAnalysis(userId, timeframe = '30 days', jwtToken)
```

#### Parameters
- **userId:** string - User UUID for pattern detection
- **timeframe:** string - Analysis period for pattern identification
- **jwtToken:** string - JWT token for authenticated data access

#### Business Logic
1. Initialize PatternDetector with Supabase client authentication
2. Gather comprehensive user data (overview, trends, adherence metrics)
3. Calculate total data points for pattern analysis confidence
4. Execute AI-powered pattern detection with user data
5. Log pattern detection results with count information
6. Return structured pattern analysis with confidence metrics

#### Database Operations
```javascript
// Delegates to multiple service methods:
// - getOverviewMetrics() -> Supabase queries
// - getTrendsData() -> Analytics aggregates
// - getAdherenceMetrics() -> PostgreSQL functions
```

#### Transaction Boundaries
- **Uses Transactions:** Partial (through delegate methods)
- **Rollback Conditions:** Failures in delegate service methods
- **Isolation Level:** Mixed (depends on delegate methods)

#### Return Value
```javascript
{
  status: 'success',
  data: {
    patterns: Array<{
      type: string,
      confidence: number,
      description: string,
      significance: 'high'|'medium'|'low',
      occurrences: number
    }>,
    userData: {
      hasData: boolean,
      dataPoints: number
    },
    analysisDate: string
  },
  message: string
}
```

#### Error Cases
- **DatabaseError:** Failures in data gathering methods
- **ApplicationError:** Pattern detection algorithm failures

#### Performance Considerations
- **Typical Duration:** 2-8 seconds (includes AI processing)
- **Caching:** 1-hour cache due to computational complexity
- **Batch Operations:** Parallel data gathering with Promise.all pattern

---

### getPersonalizedRecommendations()
**File:** `services/analytics-service.js`
**Line:** 596
**Called By:** `analyticsController.getPersonalizedRecommendations()`, `analyticsController.getComprehensiveAIAnalytics()`

#### Method Signature
```javascript
async getPersonalizedRecommendations(userId, jwtToken, options = {})
```

#### Parameters
- **userId:** string - User UUID for personalized recommendations
- **jwtToken:** string - JWT token for authenticated access
- **options:** object - Recommendation configuration
  - `timeframe` (string, default: '30 days') - Analysis period
  - `categories` (array, default: ['performance', 'adherence', 'progression', 'recommendations']) - Recommendation categories
  - `maxRecommendations` (number, default: 10) - Maximum recommendations to return

#### Business Logic
1. Extract configuration options with comprehensive defaults
2. Generate AI insights using getAIInsights method
3. Handle insufficient data scenarios gracefully
4. Filter insights by requested categories and priority
5. Sort recommendations by priority (high>medium>low) and confidence scores
6. Limit results to maxRecommendations parameter
7. Transform insights into actionable recommendation format
8. Return structured recommendations with implementation guidance

#### Database Operations
```javascript
// Delegates to getAIInsights() -> AI agent database operations
```

#### Transaction Boundaries
- **Uses Transactions:** No direct transactions (delegates to AI insights)
- **Rollback Conditions:** Propagated from getAIInsights
- **Isolation Level:** N/A

#### Return Value
```javascript
{
  status: 'success',
  data: {
    recommendations: Array<{
      id: string,
      title: string,
      description: string,
      actionableSteps: Array<string>,
      priority: 'high'|'medium'|'low',
      confidence: number,
      category: string,
      estimatedImpact: string,
      timeToImplement: string
    }>,
    hasData: boolean,
    totalRecommendations: number,
    categories: Array<string>,
    generatedAt: string
  },
  message: string
}
```

#### Error Cases
- **DatabaseError:** Propagated from getAIInsights
- **ApplicationError:** AI insights generation failures

#### Performance Considerations
- **Typical Duration:** 3-15 seconds (depends on AI insights generation)
- **Caching:** Inherits 1-hour cache from AI insights
- **Batch Operations:** Single AI insights call with post-processing

---

### getGoalPredictions()
**File:** `services/analytics-service.js`
**Line:** 670
**Called By:** `analyticsController.getGoalPredictions()`

#### Method Signature
```javascript
async getGoalPredictions(userId, goalType, jwtToken, options = {})
```

#### Parameters
- **userId:** string - User UUID for goal predictions
- **goalType:** string - Type of goal for prediction (weight_loss, muscle_gain, etc.)
- **jwtToken:** string - JWT token for authenticated data access
- **options:** object - Prediction configuration
  - `timeframe` (string, default: '90 days') - Analysis period for predictions

#### Business Logic
1. Gather comprehensive data using parallel Promise.all execution
2. Collect overview metrics, trends data, and pattern analysis
3. Initialize AI services (AnalyticsAgent) for goal prediction analysis
4. Prepare context with user data and goal-specific parameters
5. Execute AI processing with prediction-focused analysis
6. Calculate achievement probability using AI confidence scores
7. Estimate time to goal using trend analysis
8. Extract key factors from insights and patterns
9. Return structured prediction with actionable recommendations

#### Database Operations
```javascript
// Parallel data gathering:
// - getOverviewMetrics() -> Supabase queries
// - getTrendsData() -> Analytics aggregates  
// - getPatternAnalysis() -> Pattern detection + multiple DB calls
```

#### Transaction Boundaries
- **Uses Transactions:** Partial (through delegate methods)
- **Rollback Conditions:** Failures in any of the parallel data gathering operations
- **Isolation Level:** Mixed (depends on delegate methods)

#### Return Value
```javascript
{
  status: 'success',
  data: {
    prediction: {
      goalType: string,
      achievementProbability: number,
      timeToGoal: string,
      keyFactors: Array<{
        factor: string,
        impact: 'major'|'moderate',
        description: string
      }>,
      recommendations: Array<RecommendationObject>,
      dataQuality: number
    },
    generatedAt: string,
    basedOnData: {
      timeframe: string,
      dataPoints: number
    }
  },
  message: string
}
```

#### Error Cases
- **DatabaseError:** Failures in data gathering or AI processing
- **ApplicationError:** AI agent initialization or processing failures

#### Performance Considerations
- **Typical Duration:** 5-20 seconds (most complex operation with parallel AI processing)
- **Caching:** 1-hour cache due to computational intensity
- **Batch Operations:** Parallel data gathering followed by AI analysis

---

### initializeAIServices()
**File:** `services/analytics-service.js`
**Line:** 30
**Called By:** `getAIInsights()`, `getGoalPredictions()` (lazy initialization)

#### Method Signature
```javascript
async initializeAIServices()
```

#### Parameters
- No parameters (initialization method)

#### Business Logic
1. Check initialization status to prevent multiple initializations
2. Initialize OpenAI service with client verification
3. Validate OpenAI service methods for proper integration
4. Create Supabase client with service role key
5. Initialize AgentMemorySystem with cross-service dependencies
6. Create AnalyticsAgent with all required service injections
7. Set global initialization flag and return agent instance

#### Database Operations
```javascript
// No direct database operations
// Creates Supabase client for later use by agents
```

#### Transaction Boundaries
- **Uses Transactions:** No
- **Rollback Conditions:** N/A
- **Isolation Level:** N/A

#### Return Value
```javascript
// Returns AnalyticsAgent instance or throws ApplicationError
```

#### Error Cases
- **ApplicationError:** OpenAI service initialization failures, missing methods, service dependency issues

#### Performance Considerations
- **Typical Duration:** 500-2000ms (one-time initialization)
- **Caching:** Global initialization flag prevents re-initialization
- **Batch Operations:** N/A

## Helper Functions

### calculateAverage()
**Purpose:** Calculate average of numeric field across data array with null handling
**Returns:** number or null if no valid values

### calculateWellnessScore()
**Purpose:** Multi-factor wellness score calculation using mood, sleep, energy, stress
**Returns:** number (wellness score)

### groupDataByTimeframe()
**Purpose:** Group analytics data by day/week/month for trend analysis
**Returns:** object with grouped data arrays

### calculateTrend()
**Purpose:** Linear trend calculation with direction and percentage change
**Returns:** object with trend metadata and time-series values

### _estimateTimeToGoal()
**Purpose:** Goal achievement time estimation based on progress trends
**Returns:** string (time range estimate)

### _extractKeyFactors()
**Purpose:** Extract key success factors from insights and patterns
**Returns:** array of factor objects with impact ratings

## Data Integrity Rules
- **User ID Validation:** All methods require valid UUID format for userId
- **JWT Token Requirement:** Authentication required for all data access (except health checks)
- **Row Level Security:** Supabase operations enforce RLS policies automatically
- **Date Range Validation:** Timeframe parameters validated and constrained to reasonable limits
- **AI Service Dependencies:** Proper initialization and error handling for external AI services
- **Transaction Consistency:** PostgreSQL operations use ACID transactions for data integrity

## Integration Patterns
- **Pagination Support:** Not implemented (analytics typically return aggregated data)
- **Filtering Support:** 
  - Timeframe filtering (7, 30, 90, 365 days)
  - Metrics filtering (weight, workouts, wellness categories)
  - Category filtering for recommendations
- **Sorting Support:** 
  - Chronological ordering for trends
  - Priority/confidence sorting for recommendations
  - Significance-based sorting for patterns
- **Caching Strategy:**
  - Standard analytics: 5-minute controller-level cache
  - AI analytics: 1-hour controller-level cache
  - No service-level caching (delegates to application layer)
- **Error Propagation:** Consistent error handling with custom error types
- **Performance Optimization:**
  - Lazy AI service initialization
  - Parallel data gathering using Promise.all
  - Single-query aggregation where possible
  - Transaction pooling for PostgreSQL operations