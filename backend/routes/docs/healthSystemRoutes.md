# Health System Routes Documentation

## Overview
This file implements all health check and system monitoring routes for the trAIner application. These routes provide comprehensive system status monitoring including server health, database connectivity, and service-specific health checks for monitoring systems and infrastructure teams.

**Health Endpoints:** 4 total health check endpoints across different service levels  
**Authentication:** All endpoints are public (no authentication required)  
**Purpose:** Infrastructure monitoring, load balancer health checks, service discovery

## Route Definitions

### GET /health
**File:** `routes/index.js`  
**Line:** 10-36  
**Router:** `express.Router()` (main router)

#### Configuration
- **Rate Limiting:** No (monitoring endpoint)
- **Middleware Applied:** None (direct route handler)
- **Authentication Required:** No (Public endpoint)
- **OpenAPI Reference:** `/docs/paths/healthSystem/health.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** None

#### Handler Mapping
- **Controller Method:** Inline route handler (no controller)
- **Response Format:** 
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
      "uptime": {
        "days": 0,
        "hours": 2,
        "minutes": 15,
        "seconds": 30
      },
      "nodeVersion": "v18.17.0",
      "memoryUsage": {
        "rss": 45678592,
        "heapTotal": 32456704,
        "heapUsed": 28234176,
        "external": 1234567
      },
      "cpuLoad": [0.5, 0.6, 0.7],
      "platform": "darwin",
      "arch": "x64"
    }
  }
  ```

#### Error Routes
- **500:** Server unable to generate health response

---

### GET /v1/health
**File:** `routes/v1/health.js`  
**Line:** 16-26  
**Router:** `express.Router()`

#### Configuration
- **Rate Limiting:** No (basic health endpoint)
- **Middleware Applied:** None (direct route handler)
- **Authentication Required:** No (Public endpoint)
- **OpenAPI Reference:** `/docs/paths/healthSystem/v1_health.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** None

#### Handler Mapping
- **Controller Method:** Inline route handler (no controller)
- **Response Format:** 
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

#### Error Routes
- **500:** API service unable to respond

---

### GET /v1/health/supabase
**File:** `routes/v1/health.js`  
**Line:** 38-115  
**Router:** `express.Router()`

#### Configuration
- **Rate Limiting:** No (database health endpoint)
- **Middleware Applied:** None (direct route handler)
- **Authentication Required:** No (Public endpoint)
- **OpenAPI Reference:** `/docs/paths/healthSystem/v1_health_supabase.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** None

#### Handler Mapping
- **Controller Method:** Inline async route handler with fallback mechanisms
- **Response Format (Success):** 
  ```json
  {
    "status": "ok",
    "info": {
      "connected": true,
      "responseTime": "150ms",
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  }
  ```
- **Response Format (Error):** 
  ```json
  {
    "status": "error",
    "message": "Supabase connection failed",
    "error": "Connection timeout"
  }
  ```

#### Error Routes
- **500:** Database connection failed
- **500:** Fallback connection failed
- **500:** Service unavailable

#### Connection Testing Process
1. **Primary Test:** Query `_health_check` table with anon key
2. **Fallback Test:** Direct PostgreSQL connection with service role
3. **Performance Measurement:** Response time tracking
4. **Error Classification:** Detailed error reporting with fallback usage

---

### GET /v1/analytics/health
**File:** `routes/analytics.js`  
**Line:** 121  
**Router:** `express.Router()`

#### Configuration
- **Rate Limiting:** No (service health endpoint)
- **Middleware Applied:** None (no authentication required)
- **Authentication Required:** No (Public endpoint)
- **OpenAPI Reference:** `/docs/paths/analytics/health.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** None

#### Handler Mapping
- **Controller Method:** `analyticsController.getAnalyticsHealth()`
- **Response Format (Success):** 
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
- **Response Format (Error):** 
  ```json
  {
    "status": "error",
    "message": "Analytics service health check failed."
  }
  ```

#### Error Routes
- **500:** Analytics service health check failed

---

## Route Precedence Notes

**Important Mounting Order:**
1. Root health check (`/health`) is mounted at the main router level
2. Versioned health routes (`/v1/health/*`) are mounted under the API prefix
3. Service-specific health (`/v1/analytics/health`) follows service routing patterns

**Critical Configuration:**
- All health endpoints bypass authentication middleware
- No rate limiting applied to any health endpoints for monitoring compatibility
- Analytics health endpoint is mounted before auth-required analytics routes

**Fallback Mechanisms:**
- Supabase health check implements intelligent fallback from anon key to service role
- Error responses include detailed information for troubleshooting
- Response time measurements help identify performance issues

## Integration Notes

**Monitoring System Integration:**
- All endpoints return JSON format compatible with monitoring tools
- Response time measurements included for performance tracking
- Detailed error information for automated alerting systems

**Load Balancer Configuration:**
- Use `/v1/health` for basic load balancer health checks (fastest response)
- Use `/health` for comprehensive monitoring dashboards
- Use `/v1/health/supabase` for database dependency monitoring

**Frontend Health Status:**
- Client applications can poll `/v1/health` for basic connectivity
- Use analytics health endpoint to show service-specific status
- Implement exponential backoff for health check polling

**Docker/Container Integration:**
- `/v1/health` endpoint suitable for Docker HEALTHCHECK instructions
- Container orchestration readiness probes
- Service discovery health verification

**Performance Expectations:**
- `/v1/health`: < 20ms typical response time
- `/health`: < 50ms typical response time  
- `/v1/health/supabase`: < 100ms typical response time
- `/v1/analytics/health`: < 30ms typical response time