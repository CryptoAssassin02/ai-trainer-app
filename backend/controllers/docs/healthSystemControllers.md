# Health System Controller Documentation

## Overview
This file documents all health check and system monitoring controller implementations for the trAIner application. The health system includes both dedicated controller methods and inline route handlers that provide comprehensive system status monitoring for infrastructure teams, load balancers, and monitoring systems.

**Implementation Types:** 1 dedicated controller method + 3 inline route handlers  
**Coverage:** System health, service health, database connectivity, analytics service health  
**Authentication:** All endpoints are public (no authentication required)  
**Purpose:** Infrastructure monitoring and health validation

## Dedicated Controller Methods

### getAnalyticsHealth()
**File:** `controllers/analytics.js`  
**Line:** 351-374  
**Route Endpoint:** `GET /v1/analytics/health`

#### Request Processing
- **Extracted From Request:**
  - Body: None (GET request)
  - Params: None
  - User Context: Not required (public endpoint)
  - Headers: None required

#### Business Logic Flow
1. Log health check request initiation
2. Return basic analytics service status information
3. Include timestamp and service metadata
4. Handle any potential service errors gracefully

#### Service Calls
```javascript
// No external service calls - basic health check only
// Returns static health information with current timestamp
```

#### Response Transformation
- **Service Response:** No service calls (static response)
- **Controller Response:** 
  ```json
  {
    "status": "success",
    "data": {
      "service": "analytics",
      "healthy": true,
      "timestamp": "2024-01-15T10:30:00.000Z",
      "version": "1.0.0"
    },
    "message": "Analytics service is healthy."
  }
  ```
- **Added Fields:** service identifier, health status, timestamp, version
- **Removed Fields:** None

#### Error Handling
- **Try/Catch Blocks:** Yes
- **Error Transformation:** 
  ```json
  {
    "status": "error", 
    "message": "Analytics service health check failed."
  }
  ```
- **Logging:** Logs health check requests and any failures

---

## Inline Route Handlers (Controller Equivalents)

### Comprehensive System Health Handler
**File:** `routes/index.js`  
**Line:** 10-36  
**Route Endpoint:** `GET /health`

#### Request Processing
- **Extracted From Request:**
  - Body: None (GET request)
  - Params: None
  - User Context: Not required (public endpoint)  
  - Headers: `req.protocol`, `req.get('host')` for documentation URL

#### Business Logic Flow
1. Calculate server uptime and format into readable structure
2. Gather comprehensive system metrics (memory, CPU, platform info)
3. Generate documentation URLs (conditional on environment)
4. Combine all metrics into unified health response
5. Return 200 status with complete system overview

#### Service Calls
```javascript
// System-level calls (not external services)
const uptime = process.uptime();
const memoryUsage = process.memoryUsage();
const cpuLoad = os.loadavg();
```

#### Response Transformation
- **Service Response:** Native Node.js system metrics
- **Controller Response:**
  ```json
  {
    "status": "ok",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "environment": "development",
    "api": {
      "version": "v1",
      "documentation": "http://localhost:8000/v1/api-docs",
      "openapi": "3.0.0"
    },
    "server": {
      "uptime": {"days": 0, "hours": 2, "minutes": 30, "seconds": 45},
      "nodeVersion": "v18.17.0",
      "memoryUsage": {"rss": 52428800, "heapTotal": 29360128},
      "cpuLoad": [0.5, 0.3, 0.2],
      "platform": "darwin",
      "arch": "x64"
    }
  }
  ```
- **Added Fields:** Formatted uptime structure, environment context, API metadata
- **Removed Fields:** None (comprehensive response)

#### Error Handling
- **Try/Catch Blocks:** No (static system data)
- **Error Transformation:** Not applicable (no failure scenarios)
- **Logging:** No explicit logging (basic health check)

---

### Basic API Health Handler
**File:** `routes/v1/health.js`  
**Line:** 16-26  
**Route Endpoint:** `GET /v1/health`

#### Request Processing
- **Extracted From Request:**
  - Body: None (GET request)
  - Params: None
  - User Context: Not required (public endpoint)
  - Headers: None required

#### Business Logic Flow
1. Return basic API status confirmation
2. Include version information from environment config
3. Add environment context and timestamp
4. Provide minimal response for simple health checks

#### Service Calls
```javascript
// Environment configuration access
version: env.app.version || '1.0.0'
environment: env.app.nodeEnv || 'development'
```

#### Response Transformation
- **Service Response:** Environment configuration values
- **Controller Response:**
  ```json
  {
    "status": "ok",
    "info": {
      "version": "1.0.0",
      "environment": "development", 
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  }
  ```
- **Added Fields:** API version, environment context, timestamp
- **Removed Fields:** None

#### Error Handling
- **Try/Catch Blocks:** No (static response)
- **Error Transformation:** Not applicable
- **Logging:** No explicit logging

---

### Database Connectivity Health Handler
**File:** `routes/v1/health.js`  
**Line:** 38-115  
**Route Endpoint:** `GET /v1/health/supabase`

#### Request Processing
- **Extracted From Request:**
  - Body: None (GET request)
  - Params: None
  - User Context: Not required (public endpoint)
  - Headers: None required

#### Business Logic Flow
1. Attempt primary Supabase connection test using anon client
2. Perform basic query against `_health_check` table
3. If primary fails, implement PostgreSQL Pool fallback mechanism
4. Measure response time for performance monitoring
5. Return connection status with timing metrics
6. Handle multiple failure scenarios with appropriate error responses

#### Service Calls
```javascript
// Primary Supabase client test
const supabase = getSupabaseClient();
const { data, error } = await supabase.from('_health_check').select('*').limit(1).maybeSingle();

// Fallback PostgreSQL Pool connection
const pool = new Pool({
  connectionString: env.supabase.databaseUrlServiceRole || env.supabase.databaseUrl,
  ssl: { rejectUnauthorized: false }
});
const result = await pool.query('SELECT NOW() as timestamp');
```

#### Response Transformation
- **Service Response:** Supabase query result or PostgreSQL timestamp
- **Controller Response (Success):**
  ```json
  {
    "status": "ok",
    "info": {
      "connected": true,
      "responseTime": "45ms",
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  }
  ```
- **Controller Response (Error):**
  ```json
  {
    "status": "error",
    "message": "Supabase connection failed",
    "error": "Connection timeout"
  }
  ```
- **Added Fields:** Connection status, performance timing, timestamp
- **Removed Fields:** Internal connection details (security)

#### Error Handling
- **Try/Catch Blocks:** Yes (nested for primary and fallback)
- **Error Transformation:** Structured error responses with specific failure messages
- **Logging:** Comprehensive error logging for both Supabase and database failures

---

## Controller-Specific Middleware
**None:** All health endpoints use inline handlers without additional middleware layers.

## Health Check Integration Patterns

### Load Balancer Integration
- **Basic Health:** Use `GET /v1/health` for simple alive/dead checks
- **Comprehensive Health:** Use `GET /health` for detailed system metrics
- **Database Health:** Use `GET /v1/health/supabase` for database connectivity validation

### Monitoring System Integration
- **Response Time Monitoring:** All endpoints include timing information where applicable
- **Service-Specific Health:** Use `GET /v1/analytics/health` for analytics service validation
- **Error Classification:** Structured error responses enable automated alerting

### Performance Considerations
- **No Authentication Required:** All health endpoints are public for monitoring access
- **No Rate Limiting:** Health checks excluded from rate limiting for continuous monitoring
- **Minimal Resource Usage:** Lightweight operations suitable for frequent polling
- **Fallback Mechanisms:** Database health check includes PostgreSQL fallback for resilience

### Error Escalation Patterns
- **500 Status Codes:** Indicate service failures requiring immediate attention
- **Response Time Thresholds:** Monitor response times for performance degradation
- **Connection Failures:** Database health failures indicate infrastructure issues
- **Service-Specific Errors:** Analytics health failures indicate AI/service layer issues