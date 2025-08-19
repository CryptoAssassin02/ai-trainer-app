# Mobile Analytics Controllers Documentation

## Overview
The Mobile Analytics Controller provides mobile-optimized endpoints with advanced payload optimization, network awareness, and battery-conscious features. This controller implements sophisticated mobile-specific optimizations including automatic payload compression, caching strategies, and offline data synchronization capabilities.

## Controller Class Structure

### MobileAnalyticsController Class
**File:** `controllers/mobile-analytics.js`
**Lines:** 9-732
**Pattern:** Class-based controller with service injection

#### Dependencies
- `analyticsService` - Core analytics operations
- `RealtimeAnalyticsService` - Real-time analytics updates
- `ComparativeAnalyticsService` - Peer comparison functionality  
- `GoalPredictionService` - Goal tracking and predictions
- `MobilePayloadOptimizer` - Mobile payload optimization
- `logger` - Centralized logging
- Error classes: `DatabaseError`, `NotFoundError`, `ApplicationError`

#### Constructor Pattern
```javascript
constructor() {
  this.analyticsService = analyticsService;
  this.realtimeService = new RealtimeAnalyticsService({...});
  this.comparativeService = new ComparativeAnalyticsService({...});
  this.goalService = new GoalPredictionService({...});
  this.mobileOptimizer = new MobilePayloadOptimizer();
}
```

## Controller Methods

### getMobileOverview(req, res)
**Purpose:** Get mobile-optimized analytics overview with strict payload limits
**Line:** 33
**Rate Limit:** 30 requests/hour

#### Request Processing
- **Authentication:** Extracts `userId` from `req.user.id` (follows authentication field consistency)
- **JWT Extraction:** From Authorization header with Bearer format validation
- **Input Validation:** 
  - `timeRange` query parameter (values: 'week', 'month', '3months')
  - Default: 'week' if not provided

#### Business Logic
1. **Parameter Validation:** Validates timeRange against allowed values
2. **Service Integration:** Calls `analyticsService.getOverviewMetrics(userId, jwtToken, options)`
3. **Mobile Optimization:** Applies `MobilePayloadOptimizer.optimizeAnalyticsPayload()`
4. **Size Validation:** Ensures payload < 50KB, applies compression if needed
5. **Cache Headers:** Sets 5-minute cache with ETag for mobile optimization

#### Response Handling
- **Success (200):** Mobile-optimized analytics with metadata and cache headers
- **Error (400):** Invalid timeRange parameter
- **Error (401):** Missing/invalid JWT token
- **Error (500):** Database or analytics service failure

#### Mobile Optimizations
- Payload size monitoring and automatic compression
- Cache-Control headers for 5-minute caching
- ETag generation for conditional requests
- X-Payload-Size header for client optimization

---

### syncMobileData(req, res)
**Purpose:** Synchronize offline mobile data with server
**Line:** 108
**Rate Limit:** 12 requests/hour (more restrictive for sync operations)

#### Request Processing
- **Authentication:** `userId` from `req.user.id` with JWT token validation
- **Input Validation:**
  - `lastSyncTimestamp` (optional, ISO 8601 format)
  - `offlineData` (optional, contains workout logs and check-ins)
  - `syncType` (optional, values: 'full', 'incremental', 'analytics_only', default: 'full')

#### Sync Processing Logic
1. **Validation:** Validates sync type and timestamp format
2. **Offline Data Processing:** Handles workout logs and check-ins from offline storage
3. **Conflict Resolution:** Resolves data conflicts and tracks resolution count
4. **Analytics Refresh:** Triggers analytics refresh after successful sync
5. **Response Optimization:** Returns updated analytics with mobile optimization

#### Data Validation Patterns
- **Workout Logs:** Validates date, exercises array, and structure
- **Check-ins:** Validates date and at least one metric (weight, mood, energy_level)
- **Timestamps:** ISO 8601 format validation with fallback

#### Error Handling
- **DatabaseError:** Returns 500 with database-specific message
- **ApplicationError:** Returns 400 with validation message
- **Generic Errors:** Returns 500 with generic sync failure message

---

### getMobileGoalProgress(req, res)
**Purpose:** Get mobile-optimized goal progress data
**Line:** 199
**Rate Limit:** 30 requests/hour

#### Request Processing
- **Path Parameters:** `goalId` (required, UUID format validation)
- **Authentication:** Standard `req.user.id` and JWT token extraction
- **Validation:** UUID format validation for goalId using `isValidUUID()`

#### Business Logic
1. **Goal Validation:** Verifies goalId is valid UUID format
2. **Service Call:** `goalService.trackGoalProgress(userId, jwtToken, goalId)`
3. **Mobile Optimization:** Applies `MobilePayloadOptimizer.optimizeGoalProgress()`
4. **Cache Strategy:** 10-minute cache for goal progress data

#### Response Handling
- **Success (200):** Optimized goal progress with cache metadata
- **Error (400):** Invalid or missing goal ID
- **Error (401):** Authentication failure
- **Error (404):** Goal not found (via NotFoundError)
- **Error (500):** Service failure

---

### getMobilePeerComparison(req, res)
**Purpose:** Get mobile-optimized peer comparison analytics
**Line:** 242
**Rate Limit:** 30 requests/hour

#### Request Processing
- **Query Parameters:** `comparisonType` (optional, default: 'workout_consistency')
- **Validation:** Checks against valid types: 'workout_consistency', 'strength_gains', 'overall_fitness'
- **Authentication:** Standard JWT and user ID extraction

#### Business Logic
1. **Type Validation:** Ensures comparisonType is in allowed values
2. **Service Integration:** Calls `comparativeService.getPeerComparison()` with 3-month timeframe
3. **Mobile Optimization:** Applies `MobilePayloadOptimizer.optimizePeerComparison()`
4. **Privacy Features:** Ensures all peer data is anonymized
5. **Cache Strategy:** 15-minute cache for peer comparison data

#### Privacy and Security
- All peer data automatically anonymized
- Privacy notice included in response metadata
- User isolation maintained through service layer

---

### getMobileNotificationPreferences(req, res)
**Purpose:** Get mobile notification preferences
**Line:** 290
**Rate Limit:** None (frequent access expected)

#### Request Processing
- **Authentication:** Standard JWT and user ID validation
- **Database Access:** Direct Supabase query with token-based authentication

#### Business Logic
1. **Database Query:** Queries `notification_preferences` table with RLS
2. **Default Values:** Provides sensible defaults if no preferences exist
3. **Mobile Format:** Structures response for mobile consumption

#### Preference Structure
- `pushNotifications`, `workoutReminders`, `goalMilestones`
- `weeklyReports`, `peerComparisons`
- `quietHours` with start/end times
- `lastUpdated` timestamp

---

### getMobileOptimizedAnalytics(req, res)
**Purpose:** General mobile-optimized analytics endpoint (test-compatible)
**Line:** 337
**Rate Limit:** 30 requests/hour

#### Request Processing
- **Test Compatibility:** Handles both real and mock request/response objects
- **Authentication:** Graceful handling of missing authentication for testing
- **Fallback Logic:** Returns error objects when response object unavailable

#### Business Logic
1. **Authentication Check:** Validates user ID and JWT token
2. **Service Call:** Gets overview metrics with mobile optimization flag
3. **Payload Optimization:** Applies standard mobile optimization
4. **Response Handling:** Handles both Express and test response objects

#### Test Integration Features
- Compatible with mock request/response objects
- Graceful error handling without response objects
- Logging for test transparency
- Return value compatibility for testing

## Private Helper Methods

### _processMobileSync(userId, jwtToken, lastSyncTimestamp, offlineData, syncType)
**Purpose:** Process mobile data synchronization
**Line:** 390
**Returns:** Sync result with processing metrics

#### Processing Logic
1. **Record Processing:** Iterates through offline workout logs and check-ins
2. **Validation:** Validates each record before processing
3. **Conflict Resolution:** Tracks conflicts and resolution attempts
4. **Analytics Trigger:** Schedules analytics refresh after successful sync
5. **Performance Tracking:** Measures processing time and record counts

### _validateWorkoutLog(log), _validateCheckIn(checkIn)
**Purpose:** Validate offline data structures
**Lines:** 462, 474
**Returns:** Boolean validation result

#### Validation Rules
- **Workout Logs:** Requires date, exercises array with content
- **Check-ins:** Requires date and at least one metric (weight, mood, energy_level)

### _getMobileNotificationPreferences(userId, jwtToken)
**Purpose:** Database access for notification preferences
**Line:** 503
**Returns:** Notification preferences object with defaults

#### Database Integration
- Uses token-authenticated Supabase client
- Handles missing preferences gracefully
- Provides comprehensive default values
- Includes error handling for database failures

### Utility Methods
- `_generateETag(data)` - MD5 hash generation for caching
- `_isValidTimestamp(timestamp)` - ISO 8601 timestamp validation
- `_syncWorkoutLog(userId, jwtToken, log)` - Individual workout log sync
- `_syncCheckIn(userId, jwtToken, checkIn)` - Individual check-in sync

## MobilePayloadOptimizer Class

### Overview
**Purpose:** Optimize payloads for mobile consumption with size and battery constraints
**Lines:** 742-884

### Key Methods

#### optimizeAnalyticsPayload(payload)
**Purpose:** Optimize analytics data for mobile
**Optimizations:**
- Reduces to essential metrics only
- Limits trends to 14 days maximum
- Truncates arrays (recent activity: 5 items, insights: 3 items)
- Rounds numbers to 1 decimal place
- Simplifies goal data structure

#### optimizeGoalProgress(goalData)
**Purpose:** Optimize goal progress for mobile
**Features:**
- Essential fields only (progress percentage, current/target values)
- Boolean on-track indicator
- Limited milestone history (3 recent items)
- Rounded percentages

#### optimizePeerComparison(comparisonData)
**Purpose:** Optimize peer comparison for mobile
**Optimizations:**
- Simplified rank and performance indicators
- Reduced insight count (2 key insights maximum)
- Anonymized peer group size only

#### compressPayload(payload)
**Purpose:** Emergency compression for oversized payloads
**Compression Strategy:**
- Removes non-essential fields
- Further reduces array sizes
- Maintains critical functionality

## Error Handling Patterns

### Error Classification
- **DatabaseError:** Database connectivity or query failures
- **ApplicationError:** Business logic validation failures
- **NotFoundError:** Resource not found (goals, preferences)
- **Generic Errors:** Unexpected failures with fallback messages

### Response Strategies
- Consistent error format: `{status: 'error', message: 'description'}`
- Appropriate HTTP status codes
- Logging for debugging and monitoring
- Graceful degradation for mobile environments

## Mobile Optimization Features

### Payload Management
- **Size Monitoring:** Automatic payload size calculation
- **Compression:** On-demand compression for large payloads
- **Essential Data:** Prioritization of critical information
- **Array Limits:** Configurable limits for mobile consumption

### Network Awareness
- **Caching:** Strategic cache headers for different data types
- **ETags:** Conditional request support
- **Compression:** Automatic payload compression
- **Battery Optimization:** Reduced processing and cached responses

### Offline Support
- **Sync Capabilities:** Comprehensive offline data synchronization
- **Conflict Resolution:** Automatic conflict handling
- **Data Validation:** Robust validation for offline-generated data
- **Progress Tracking:** Sync status and metrics

## Integration Considerations

### Authentication Consistency
- All methods follow `req.user.id` authentication pattern
- JWT token extraction with Bearer format validation
- Consistent error responses for authentication failures

### Service Integration
- Follows JWT token parameter ordering: `(userId, jwtToken, options)`
- Service dependency injection in constructor
- Error handling delegated to service layer where appropriate

### Testing Compatibility
- Mock request/response object support
- Graceful handling of test environments
- Return value compatibility for test assertions
- Comprehensive logging for test transparency