# Analytics & AI Insights Routes Documentation

## Overview
This file contains all analytics and AI-powered insights routes for the trAIner application. It provides both traditional analytics (overview, trends, strength progression, adherence metrics) and AI-enhanced analytics (insights, patterns, recommendations, predictions). The routes implement sophisticated rate limiting, caching strategies, and comprehensive validation middleware to optimize performance and manage AI processing costs.

**Total Endpoints:** 12 routes (Note: Implementation plan referenced 16 endpoints, but actual count is 12)
**Router Instance:** `express.Router()`
**Base Path:** `/v1/analytics`

## Rate Limiting Configuration

### Analytics Limiter
- **Production:** 50 requests per 15 minutes
- **Test Environment:** 100 requests per minute
- **Applied to:** Overview, trends, strength, adherence, daterange endpoints

### Refresh Limiter  
- **Production:** 5 requests per hour
- **Test Environment:** 20 requests per minute
- **Applied to:** Refresh endpoint only

### AI Analytics Limiter
- **Production:** 10 requests per hour (restrictive due to OpenAI costs)
- **Test Environment:** 30 requests per minute
- **Applied to:** All AI endpoints (/ai/*)

## Route Definitions

### GET /health
**File:** `routes/analytics.js`
**Line:** 115
**Router:** `router`

#### Configuration
- **Rate Limiting:** No rate limiting applied
- **Middleware Applied:** None
- **Authentication Required:** No (public health check)
- **OpenAPI Reference:** `/docs/paths/analytics/analytics_health.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** None

#### Handler Mapping
- **Controller Method:** `analyticsController.getAnalyticsHealth()`
- **Response Format:** JSON health status

#### Error Routes
- **500:** Internal service health check failures

---

### GET /overview
**File:** `routes/analytics.js`
**Line:** 118
**Router:** `router`

#### Configuration
- **Rate Limiting:** analyticsLimiter (50/15min production)
- **Middleware Applied:** `authenticate`, `analyticsLimiter`, `validateAnalyticsQuery`
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/analytics/analytics_overview.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** 
  - `timeframe` (string, format: "30 days", "12 weeks", "6 months")
  - `metrics` (string, comma-separated: weight,workouts,wellness,adherence)
  - `groupBy` (enum: day,week,month)
  - `includeAI` (boolean, default: false)
- **Body Validation:** Query parameter validation via `validateAnalyticsQuery`

#### Handler Mapping
- **Controller Method:** `analyticsController.getAnalyticsOverview()`
- **Response Format:** Comprehensive analytics overview with caching (5 minutes)

#### Error Routes
- **400:** Invalid timeframe/groupBy/metrics format
- **401:** Missing or invalid JWT token
- **404:** No analytics data found for user
- **429:** Rate limit exceeded (50 requests per 15 minutes)
- **500:** Internal analytics processing error

---

### GET /trends
**File:** `routes/analytics.js`
**Line:** 125
**Router:** `router`

#### Configuration
- **Rate Limiting:** analyticsLimiter (50/15min production)
- **Middleware Applied:** `authenticate`, `analyticsLimiter`, `validateAnalyticsQuery`
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/analytics/analytics_trends.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** 
  - `timeframe` (string, format: "30 days", "12 weeks", "6 months")
  - `metrics` (string, comma-separated valid metrics)
  - `groupBy` (enum: day,week,month)
- **Body Validation:** Query parameter validation via `validateAnalyticsQuery`

#### Handler Mapping
- **Controller Method:** `analyticsController.getProgressTrends()`
- **Response Format:** Progress trends with time-series data

#### Error Routes
- **400:** Invalid timeframe/groupBy/metrics format
- **401:** Missing or invalid JWT token
- **404:** No trend data available
- **429:** Rate limit exceeded
- **500:** Trend calculation error

---

### GET /strength
**File:** `routes/analytics.js`
**Line:** 132
**Router:** `router`

#### Configuration
- **Rate Limiting:** analyticsLimiter (50/15min production)
- **Middleware Applied:** `authenticate`, `analyticsLimiter`, `validateAnalyticsQuery`
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/analytics/analytics_strength.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** 
  - `timeframe` (string, format validation applied)
  - `metrics` (string, comma-separated)
  - `groupBy` (enum: day,week,month)
- **Body Validation:** Query parameter validation via `validateAnalyticsQuery`

#### Handler Mapping
- **Controller Method:** `analyticsController.getStrengthProgression()`
- **Response Format:** Strength progression metrics and analysis

#### Error Routes
- **400:** Invalid query parameters
- **401:** Authentication failure
- **404:** No strength data found
- **429:** Rate limit exceeded
- **500:** Strength calculation error

---

### GET /adherence
**File:** `routes/analytics.js`
**Line:** 139
**Router:** `router`

#### Configuration
- **Rate Limiting:** analyticsLimiter (50/15min production)
- **Middleware Applied:** `authenticate`, `analyticsLimiter`, `validateAnalyticsQuery`
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/analytics/analytics_adherence.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** 
  - `timeframe` (string, format validation)
  - `metrics` (string, adherence-specific metrics)
  - `groupBy` (enum: day,week,month)
- **Body Validation:** Query parameter validation via `validateAnalyticsQuery`

#### Handler Mapping
- **Controller Method:** `analyticsController.getAdherenceMetrics()`
- **Response Format:** Adherence metrics and compliance data

#### Error Routes
- **400:** Invalid query parameters
- **401:** Authentication failure
- **404:** No adherence data available
- **429:** Rate limit exceeded
- **500:** Adherence calculation error

---

### GET /daterange
**File:** `routes/analytics.js`
**Line:** 146
**Router:** `router`

#### Configuration
- **Rate Limiting:** analyticsLimiter (50/15min production)
- **Middleware Applied:** `authenticate`, `analyticsLimiter`, `validateDateParams`
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/analytics/analytics_daterange.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** 
  - `startDate` (string, YYYY-MM-DD format)
  - `endDate` (string, YYYY-MM-DD format)
  - Date range validation (max 365 days, startDate ≤ endDate)
- **Body Validation:** Date parameter validation via `validateDateParams`

#### Handler Mapping
- **Controller Method:** `analyticsController.getAnalyticsByDateRange()`
- **Response Format:** Analytics data for specified date range

#### Error Routes
- **400:** Invalid date format or range (startDate > endDate, range > 365 days)
- **401:** Authentication failure
- **404:** No data in specified date range
- **429:** Rate limit exceeded
- **500:** Date range processing error

---

### POST /refresh
**File:** `routes/analytics.js`
**Line:** 153
**Router:** `router`

#### Configuration
- **Rate Limiting:** refreshLimiter (5/hour production)
- **Middleware Applied:** `authenticate`, `refreshLimiter`, `validateDateParams`
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/analytics/analytics_refresh.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** 
  - `startDate` (optional, YYYY-MM-DD format)
  - `endDate` (optional, YYYY-MM-DD format)
- **Body Validation:** Date parameter validation via `validateDateParams`

#### Handler Mapping
- **Controller Method:** `analyticsController.refreshAnalytics()`
- **Response Format:** Refresh status and updated data

#### Error Routes
- **400:** Invalid date parameters
- **401:** Authentication failure
- **429:** Rate limit exceeded (5 requests per hour)
- **500:** Refresh operation failed

---

### GET /ai/insights
**File:** `routes/analytics.js`
**Line:** 193
**Router:** `router`

#### Configuration
- **Rate Limiting:** aiAnalyticsLimiter (10/hour production)
- **Middleware Applied:** `authenticate`, `aiAnalyticsLimiter`, `validateAIAnalyticsQuery`
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/analytics/analytics_ai_insights.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** 
  - `timeframe` (string, format validation)
  - `focusAreas` (string, comma-separated: performance,adherence,progression,recommendations,motivation,health_optimization)
  - `categories` (string, comma-separated valid categories)
  - `maxRecommendations` (integer, 1-50 range)
- **Body Validation:** AI analytics query validation via `validateAIAnalyticsQuery`

#### Handler Mapping
- **Controller Method:** `analyticsController.getAIInsights()`
- **Response Format:** AI-generated insights with caching (1 hour)

#### Error Routes
- **400:** Invalid focusAreas, categories, or maxRecommendations
- **401:** Authentication failure
- **404:** Insufficient data for AI analysis
- **429:** Rate limit exceeded (10 requests per hour)
- **500:** AI processing error
- **502:** OpenAI API failure

---

### GET /ai/patterns
**File:** `routes/analytics.js`
**Line:** 200
**Router:** `router`

#### Configuration
- **Rate Limiting:** aiAnalyticsLimiter (10/hour production)
- **Middleware Applied:** `authenticate`, `aiAnalyticsLimiter`, `validateAIAnalyticsQuery`
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/analytics/analytics_ai_patterns.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** Same as AI insights endpoint
- **Body Validation:** AI analytics query validation via `validateAIAnalyticsQuery`

#### Handler Mapping
- **Controller Method:** `analyticsController.getPatternAnalysis()`
- **Response Format:** AI pattern analysis with caching

#### Error Routes
- **400:** Invalid query parameters
- **401:** Authentication failure
- **404:** No patterns detected
- **429:** Rate limit exceeded
- **500:** Pattern analysis error
- **502:** AI service unavailable

---

### GET /ai/recommendations
**File:** `routes/analytics.js`
**Line:** 207
**Router:** `router`

#### Configuration
- **Rate Limiting:** aiAnalyticsLimiter (10/hour production)
- **Middleware Applied:** `authenticate`, `aiAnalyticsLimiter`, `validateAIAnalyticsQuery`
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/analytics/analytics_ai_recommendations.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** AI analytics validation parameters
- **Body Validation:** AI analytics query validation via `validateAIAnalyticsQuery`

#### Handler Mapping
- **Controller Method:** `analyticsController.getPersonalizedRecommendations()`
- **Response Format:** Personalized AI recommendations

#### Error Routes
- **400:** Invalid parameters
- **401:** Authentication failure
- **404:** No recommendations available
- **429:** Rate limit exceeded
- **500:** Recommendation generation error
- **502:** AI service failure

---

### GET /ai/predictions/:goalType
**File:** `routes/analytics.js`
**Line:** 214
**Router:** `router`

#### Configuration
- **Rate Limiting:** aiAnalyticsLimiter (10/hour production)
- **Middleware Applied:** `authenticate`, `aiAnalyticsLimiter`, `validateAIAnalyticsQuery`
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/analytics/analytics_ai_predictions_goalType.yaml`

#### Route Parameters
- **Path Parameters:** 
  - `goalType` (string, goal type for predictions)
- **Query Parameters:** AI analytics validation parameters
- **Body Validation:** AI analytics query validation via `validateAIAnalyticsQuery`

#### Handler Mapping
- **Controller Method:** `analyticsController.getGoalPredictions()`
- **Response Format:** Goal prediction analysis

#### Error Routes
- **400:** Invalid goalType or parameters
- **401:** Authentication failure
- **404:** Goal type not supported or no data
- **429:** Rate limit exceeded
- **500:** Prediction calculation error
- **502:** AI prediction service failure

---

### GET /ai/comprehensive
**File:** `routes/analytics.js`
**Line:** 221
**Router:** `router`

#### Configuration
- **Rate Limiting:** aiAnalyticsLimiter (10/hour production)
- **Middleware Applied:** `authenticate`, `aiAnalyticsLimiter`, `validateAIAnalyticsQuery`
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/analytics/analytics_ai_comprehensive.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** Full AI analytics parameter set
- **Body Validation:** AI analytics query validation via `validateAIAnalyticsQuery`

#### Handler Mapping
- **Controller Method:** `analyticsController.getComprehensiveAIAnalytics()`
- **Response Format:** Complete AI analytics package

#### Error Routes
- **400:** Invalid parameters
- **401:** Authentication failure
- **404:** Insufficient data for comprehensive analysis
- **429:** Rate limit exceeded
- **500:** Comprehensive analysis error
- **502:** AI service unavailable

## Validation Middleware Details

### validateAnalyticsQuery
**Applied to:** Standard analytics endpoints
- Validates `timeframe` format (e.g., "30 days", "12 weeks")
- Validates `groupBy` values (day, week, month)
- Validates `metrics` against allowed list (weight, workouts, wellness, adherence, strength)

### validateDateParams  
**Applied to:** Date range and refresh endpoints
- Validates date format (YYYY-MM-DD)
- Ensures startDate ≤ endDate
- Enforces maximum 365-day range

### validateAIAnalyticsQuery
**Applied to:** AI analytics endpoints
- Validates `timeframe` format
- Validates `focusAreas` and `categories` against allowed values
- Validates `maxRecommendations` range (1-50)

## Caching Strategies

### Standard Analytics
- **Cache Duration:** 5 minutes
- **Applied to:** Overview, trends, strength, adherence endpoints
- **Strategy:** Time-based invalidation

### AI Analytics
- **Cache Duration:** 1 hour (due to processing costs)
- **Applied to:** All /ai/* endpoints  
- **Strategy:** Extended caching to minimize OpenAI API calls

### Refresh Operations
- **Cache Behavior:** Invalidates all related caches
- **Rate Limited:** 5 requests/hour to prevent cache thrashing

## Route Precedence Notes

### Critical Route Ordering
- Specific routes (like `/health`) are defined before parameterized routes
- AI routes with `/ai/*` prefix are grouped together
- Error handling middleware is applied at the end to catch all route errors

### Rate Limiter Hierarchy
1. **aiAnalyticsLimiter** (most restrictive: 10/hour) - Applied to AI endpoints
2. **refreshLimiter** (5/hour) - Applied to refresh operations  
3. **analyticsLimiter** (50/15min) - Applied to standard analytics

## Integration Notes

### Frontend Considerations
- **Rate Limit Headers:** All responses include `RateLimit-*` headers for client-side limiting
- **Cache Headers:** Responses include appropriate cache headers for client optimization
- **Error Format:** Consistent error response format across all endpoints
- **Loading States:** AI endpoints may take 5-30 seconds due to processing complexity

### Performance Optimization
- **Batch Operations:** Consider batching multiple analytics calls
- **Client-side Caching:** Implement client-side caching to complement server-side caching
- **Progressive Loading:** Load basic analytics first, then AI insights
- **Background Refresh:** Use refresh endpoint during low activity periods

### Security Considerations
- All endpoints (except `/health`) require JWT authentication
- Rate limiting prevents both abuse and cost management for AI services
- Input validation prevents injection attacks and ensures data quality
- Error responses don't expose internal system details