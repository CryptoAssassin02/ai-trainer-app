# Mobile Analytics Routes Documentation

## Overview
Mobile analytics routes provide optimized endpoints for mobile applications with payload compression, network awareness, and battery optimization features. These routes handle mobile-specific analytics, data synchronization, and notification preferences with strict payload size limits (under 50KB) and caching strategies.

## Route Definitions

### GET /v1/mobile/overview
**File:** `routes/mobile-analytics.js`
**Line:** 42
**Router:** express.Router()

#### Configuration
- **Rate Limiting:** Yes, 30 requests per hour (mobileLimiter)
- **Middleware Applied:** [authenticate, mobileLimiter]
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/mobile/mobile_overview.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** 
  - `timeRange` (optional, default: 'week') - Values: 'week', 'month', '3months'
- **Body Validation:** None (GET request)

#### Handler Mapping
- **Controller Method:** `mobileAnalyticsController.getMobileOverview()`
- **Response Format:** Mobile-optimized analytics with payload size under 50KB

#### Error Routes
- **400:** Invalid time range parameter
- **401:** Missing or invalid JWT token
- **413:** Mobile payload exceeds size limit (>50KB)
- **429:** Rate limit exceeded (30 requests/hour)
- **500:** Analytics service failure or database error

---

### POST /v1/mobile/sync
**File:** `routes/mobile-analytics.js`
**Line:** 48
**Router:** express.Router()

#### Configuration
- **Rate Limiting:** Yes, 12 requests per hour (syncLimiter)
- **Middleware Applied:** [authenticate, syncLimiter]
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/mobile/mobile_sync.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** 
  - `lastSyncTimestamp` (optional) - ISO 8601 timestamp
  - `offlineData` (optional) - Object containing offline workout logs and check-ins
  - `syncType` (optional, default: 'full') - Values: 'full', 'incremental', 'analytics_only'

#### Handler Mapping
- **Controller Method:** `mobileAnalyticsController.syncMobileData()`
- **Response Format:** Sync status with updated analytics payload

#### Error Routes
- **400:** Invalid sync type or timestamp format
- **401:** Missing or invalid JWT token
- **429:** Rate limit exceeded (12 syncs/hour)
- **500:** Sync processing failure or database error

---

### GET /v1/mobile/goals/:goalId/progress
**File:** `routes/mobile-analytics.js`
**Line:** 54
**Router:** express.Router()

#### Configuration
- **Rate Limiting:** Yes, 30 requests per hour (mobileLimiter)
- **Middleware Applied:** [authenticate, mobileLimiter]
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/mobile/mobile_goals_goalId_progress.yaml`

#### Route Parameters
- **Path Parameters:** 
  - `goalId` (required) - UUID format goal identifier
- **Query Parameters:** None
- **Body Validation:** None (GET request)

#### Handler Mapping
- **Controller Method:** `mobileAnalyticsController.getMobileGoalProgress()`
- **Response Format:** Mobile-optimized goal progress data

#### Error Routes
- **400:** Invalid or missing goal ID (non-UUID format)
- **401:** Missing or invalid JWT token
- **404:** Goal not found or not accessible by user
- **429:** Rate limit exceeded (30 requests/hour)
- **500:** Goal service failure or database error

---

### GET /v1/mobile/peer-comparison
**File:** `routes/mobile-analytics.js`
**Line:** 60
**Router:** express.Router()

#### Configuration
- **Rate Limiting:** Yes, 30 requests per hour (mobileLimiter)
- **Middleware Applied:** [authenticate, mobileLimiter]
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/mobile/mobile_peer-comparison.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** 
  - `comparisonType` (optional, default: 'workout_consistency') - Values: 'workout_consistency', 'strength_gains', 'overall_fitness'
- **Body Validation:** None (GET request)

#### Handler Mapping
- **Controller Method:** `mobileAnalyticsController.getMobilePeerComparison()`
- **Response Format:** Mobile-optimized peer comparison with anonymized data

#### Error Routes
- **400:** Invalid comparison type parameter
- **401:** Missing or invalid JWT token
- **429:** Rate limit exceeded (30 requests/hour)
- **500:** Comparison service failure or database error

---

### GET /v1/mobile/notifications/preferences
**File:** `routes/mobile-analytics.js`
**Line:** 66
**Router:** express.Router()

#### Configuration
- **Rate Limiting:** No (notification preferences access is frequent)
- **Middleware Applied:** [authenticate]
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/mobile/mobile_notifications_preferences.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** None (GET request)

#### Handler Mapping
- **Controller Method:** `mobileAnalyticsController.getMobileNotificationPreferences()`
- **Response Format:** Mobile notification preferences object

#### Error Routes
- **401:** Missing or invalid JWT token
- **500:** Database error retrieving preferences

---

### GET /v1/mobile/analytics
**File:** `routes/mobile-analytics.js`
**Line:** 72
**Router:** express.Router()

#### Configuration
- **Rate Limiting:** Yes, 30 requests per hour (mobileLimiter)
- **Middleware Applied:** [authenticate, mobileLimiter]
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/mobile/mobile_analytics.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None (uses default mobile optimization settings)
- **Body Validation:** None (GET request)

#### Handler Mapping
- **Controller Method:** `mobileAnalyticsController.getMobileOptimizedAnalytics()`
- **Response Format:** General mobile-optimized analytics payload

#### Error Routes
- **401:** Missing or invalid JWT token
- **429:** Rate limit exceeded (30 requests/hour)
- **500:** Analytics service failure or optimization error

---

## Route Precedence Notes
- All mobile analytics routes are mounted under `/mobile` prefix in the main router
- No route conflicts exist as all paths are distinct
- Rate limiting is disabled during testing (`NODE_ENV === 'test'`)
- Sync operations have more restrictive rate limiting (12/hour) compared to read operations (30/hour)

## Mobile Optimization Features
- **Payload Size Limits:** All responses optimized to stay under 50KB with automatic compression
- **Network Awareness:** Automatic compression and optimization based on connection type
- **Battery Optimization:** Reduced processing and cached responses to minimize battery usage
- **Offline Sync:** POST /sync endpoint handles offline data synchronization
- **Cache Headers:** Responses include cache headers for mobile app caching strategies

## Integration Notes
- Mobile routes use the same authentication middleware as other API routes
- JWT tokens must be passed in Authorization header: `Bearer <token>`
- All mobile endpoints follow RESTful conventions with mobile-specific optimizations
- Rate limiting uses different strategies for read vs. sync operations
- Payload optimization is automatically applied in controllers using MobilePayloadOptimizer class