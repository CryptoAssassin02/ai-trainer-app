# Health System Service Documentation

## Overview
This file documents all service-layer implementations that support the health system monitoring functionality for the trAIner application. The health system provides comprehensive monitoring capabilities across real-time analytics, caching layers, batch processing systems, and database connectivity. These services enable infrastructure teams to monitor system performance, connection states, and service availability.

**Service Coverage:** 4 primary services with health monitoring capabilities  
**Implementation Types:** 1 dedicated health service + 3 services with health methods  
**Monitoring Scope:** Real-time connections, cache health, batch processing, database connectivity  
**Authentication:** No authentication required (system-level monitoring)

## Primary Health Services

### 1. RealtimeAnalyticsService
**File:** `services/realtime-analytics-service.js`  
**Primary Purpose:** Supabase Realtime connection management with health monitoring  
**Dependencies:** Supabase client, logger, analytics service

#### healthCheck()
**File:** `services/realtime-analytics-service.js`  
**Lines:** 287-298  
**Called By:** Analytics health controller, monitoring systems

##### Method Signature
```javascript
healthCheck()
```

##### Parameters
- **None** - No parameters required for service health check

##### Business Logic
1. Retrieves current connection statistics via `getConnectionStats()`
2. Calculates health status based on connection metrics
3. Applies health threshold: healthy if failure rate < 50% of total connections
4. Generates comprehensive health report with metrics and issues

##### Database Operations
- No direct database operations
- Uses in-memory connection statistics

##### Return Value
```javascript
{
  service: 'realtime-analytics',
  status: 'healthy' | 'degraded',
  timestamp: string, // ISO timestamp
  metrics: {
    totalConnections: number,
    activeConnections: number, 
    failedConnections: number,
    totalEvents: number,
    lastConnectionTime: string,
    activeChannels: number,
    channels: string[]
  },
  issues: string[] // Empty if healthy, contains issues if degraded
}
```

##### Health Thresholds
- **Healthy:** `failedConnections < totalConnections * 0.5` AND `activeConnections >= 0`
- **Degraded:** When failure rate >= 50% of total connections

#### getConnectionStats()
**File:** `services/realtime-analytics-service.js`  
**Lines:** 202-208  
**Called By:** `healthCheck()`, monitoring systems

##### Method Signature
```javascript
getConnectionStats()
```

##### Return Value
```javascript
{
  totalConnections: number,      // Total connection attempts
  activeConnections: number,     // Currently active connections
  failedConnections: number,     // Failed connection attempts
  totalEvents: number,          // Total events processed
  lastConnectionTime: string,   // ISO timestamp of last connection
  activeChannels: number,       // Current active channel count
  channels: string[]           // Array of active channel names
}
```

### 2. AIAnalyticsCache Service
**File:** `services/ai-analytics-cache.js`  
**Primary Purpose:** Redis cache health monitoring and statistics  
**Dependencies:** Redis client, logger

#### getCacheStats()
**File:** `services/ai-analytics-cache.js`  
**Lines:** 384-422  
**Called By:** Health monitoring systems, analytics controllers

##### Method Signature
```javascript
async getCacheStats()
```

##### Business Logic
1. Checks Redis connection availability
2. Retrieves Redis memory and keyspace information
3. Parses Redis INFO command output for metrics
4. Calculates cache performance statistics
5. Returns comprehensive cache health data

##### Redis Operations
```javascript
// Memory information
const info = await this.client.info('memory');
const keyspace = await this.client.info('keyspace');

// Custom statistics
const customStats = await this.client.hGetAll('ai:cache:stats');
```

##### Return Value
```javascript
{
  available: boolean,
  memory: {
    used: string,           // Human-readable memory usage
    maxSize: string        // Configured max cache size
  },
  keys: {
    total: number,         // Total keys in Redis
    aiInsights: number,    // AI insights cache count
    patterns: number,      // Pattern analysis cache count
    recommendations: number // Recommendation cache count
  },
  performance: {
    hitRate: number,       // Cache hit rate percentage
    avgResponseTime: number // Average response time in ms
  },
  lastUpdated: string,     // ISO timestamp
  error?: string          // Error message if not available
}
```

##### Error Handling
- Returns `{ available: false }` if Redis connection is down
- Gracefully handles Redis command failures
- Provides error context in response when available

### 3. BatchAnalyticsProcessor Service
**File:** `services/batch-analytics-processor.js`  
**Primary Purpose:** Batch job processing health and statistics  
**Dependencies:** Event emitter, queue management

#### getProcessorStats()
**File:** `services/batch-analytics-processor.js`  
**Lines:** 209-234  
**Called By:** System monitoring, health checks

##### Method Signature
```javascript
getProcessorStats()
```

##### Business Logic
1. Calculates queue utilization metrics
2. Determines processing capacity utilization
3. Computes success rates and performance metrics
4. Returns real-time processor health status

##### Return Value
```javascript
{
  queue: {
    size: number,           // Current queue size
    maxSize: number,        // Maximum queue capacity
    utilization: string     // Utilization percentage (2 decimal places)
  },
  processing: {
    activeJobs: number,     // Currently processing jobs
    maxConcurrent: number,  // Maximum concurrent jobs
    utilization: string     // Processing utilization percentage
  },
  performance: {
    totalProcessed: number, // Total jobs processed
    totalFailed: number,    // Total failed jobs
    successRate: string,    // Success rate percentage
    avgProcessingTime: number // Average processing time in ms
  },
  status: {
    isProcessing: boolean,  // Whether processor is active
    lastUpdated: string     // ISO timestamp
  }
}
```

## Supporting Database Services

### 4. Supabase Service Health Support
**File:** `services/supabase.js`  
**Primary Purpose:** Database connectivity testing and error handling  
**Dependencies:** Supabase client, PostgreSQL pool

#### Database Connection Testing
**Used By:** `/v1/health/supabase` endpoint  
**Implementation:** Inline health handlers use these utilities

##### Connection Patterns
```javascript
// Primary connection test
const { data, error } = await supabase
  .from('user_profiles')
  .select('id')
  .limit(1);

// Fallback connection test
const fallbackData = await supabase
  .from('workout_plans')
  .select('id') 
  .limit(1);
```

#### Error Handling Support
**File:** `services/supabase.js`  
**Lines:** 85-104

##### handleSupabaseError(error, operation)
```javascript
function handleSupabaseError(error, operation = 'Database operation') {
  logger.error(`Supabase error during ${operation}:`, error);
  
  const statusCode = error.status || error?.statusCode || 500;
  const isRetryable = RETRY_CONFIG.retryableStatusCodes.includes(statusCode);
  
  throw {
    status: statusCode,
    message: error.message || `${operation} failed`,
    details: error.details || {},
    retryable: isRetryable,
    code: error.code || 'SUPABASE_ERROR'
  };
}
```

#### Retry Logic Support
**File:** `services/supabase.js`  
**Lines:** 110-137

##### withRetry(operation, operationName)
```javascript
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second base delay
  retryableStatusCodes: [408, 429, 500, 502, 503, 504]
};

// Exponential backoff retry implementation
async function withRetry(operation, operationName = 'Database operation') {
  // Implements 3-attempt retry with exponential backoff
  // Used by health check endpoints for resilient database testing
}
```

## Service Integration Architecture

### Health Check Coordination
**Pattern:** Services provide health methods, controllers orchestrate health responses

```javascript
// Health controller usage pattern
const realtimeHealth = realtimeService.healthCheck();
const cacheHealth = await cacheService.getCacheStats();
const processorHealth = processorService.getProcessorStats();

// Aggregate health response
const overallHealth = {
  services: {
    realtime: realtimeHealth,
    cache: cacheHealth,
    processor: processorHealth
  },
  overall: calculateOverallHealth([realtimeHealth, cacheHealth, processorHealth])
};
```

### Database Connectivity Testing
**Pattern:** Inline handlers use Supabase service utilities for resilient testing

```javascript
// Primary + fallback pattern
try {
  // Test primary table
  const result = await testDatabaseConnection('user_profiles');
  return { status: 'healthy', connection: 'primary' };
} catch (primaryError) {
  try {
    // Test fallback table
    const fallbackResult = await testDatabaseConnection('workout_plans');
    return { status: 'degraded', connection: 'fallback' };
  } catch (fallbackError) {
    return { status: 'unhealthy', errors: [primaryError, fallbackError] };
  }
}
```

## Configuration Dependencies

### Environment Variables
```javascript
// Real-time analytics service
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_anonymous_key

// AI Analytics Cache (Redis)
REDIS_HOST=localhost
REDIS_PORT=6379  
REDIS_PASSWORD=optional_password
REDIS_DB=0

// Database connectivity
DATABASE_URL=postgresql_connection_string
SUPABASE_SERVICE_KEY=service_role_key
```

### Service Configuration
```javascript
// Retry configurations
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504]
};

// Cache TTL configurations  
const CACHE_TTL = {
  insights: 3600,      // 1 hour
  patterns: 7200,      // 2 hours  
  recommendations: 1800 // 30 minutes
};

// Connection health thresholds
const HEALTH_THRESHOLDS = {
  realtimeFailureRate: 0.5,    // 50% failure rate threshold
  cacheResponseTime: 100,      // 100ms response time threshold
  processorSuccessRate: 0.95   // 95% success rate threshold
};
```

## Performance Considerations

### Real-time Service Performance
- **Connection Pooling:** Managed via Supabase client singleton
- **Memory Usage:** In-memory statistics tracking (minimal overhead)
- **Event Processing:** Asynchronous event handling with error isolation

### Cache Service Performance  
- **Redis Operations:** Pipelined commands for efficiency
- **Memory Monitoring:** Real-time memory usage tracking
- **Connection Management:** Automatic reconnection with exponential backoff

### Database Health Performance
- **Query Optimization:** Uses LIMIT 1 for minimal database load
- **Fallback Strategy:** Primary + fallback table testing for resilience
- **Connection Pooling:** PostgreSQL connection pooling for efficiency

## Error Handling Patterns

### Service-Level Error Handling
```javascript
// Graceful degradation pattern
try {
  const healthData = await service.getHealthMetrics();
  return { status: 'healthy', data: healthData };
} catch (error) {
  logger.error('Health check failed:', error);
  return { 
    status: 'unhealthy', 
    error: error.message,
    fallback: true 
  };
}
```

### Connection Error Classification
```javascript
// Error type classification for appropriate responses
const errorTypes = {
  connectionError: /ENOTFOUND|ECONNREFUSED|ETIMEDOUT/,
  authenticationError: /authentication|unauthorized/i,
  quotaError: /quota|rate.?limit/i,
  databaseError: /relation.*does not exist/i
};
```

## Integration Testing Patterns

### Health Service Testing
```javascript
// Service health validation
test('RealtimeAnalyticsService.healthCheck returns valid health data', async () => {
  const health = realtimeService.healthCheck();
  
  expect(health.service).toBe('realtime-analytics');
  expect(['healthy', 'degraded']).toContain(health.status);
  expect(health.metrics).toBeDefined();
  expect(Array.isArray(health.issues)).toBe(true);
});
```

### Database Connectivity Testing
```javascript
// Database health endpoint testing
test('Database health endpoint handles connection failures gracefully', async () => {
  const response = await request(app).get('/v1/health/supabase');
  
  expect([200, 503]).toContain(response.status);
  expect(response.body.database).toBeDefined();
  expect(response.body.timestamp).toBeDefined();
});
```

## Future Enhancements

### Advanced Health Metrics
- Service dependency mapping
- Performance threshold alerting  
- Health trend analysis
- Predictive failure detection

### Monitoring Integration
- Prometheus metrics export
- Grafana dashboard templates
- Alert manager integration
- Custom health check scheduling

### Scalability Improvements
- Distributed health checking
- Health data aggregation
- Multi-region health monitoring
- Load balancer integration optimization