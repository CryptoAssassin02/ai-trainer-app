# Cross-Feature Coordination Guide

## Overview

This document provides a comprehensive guide to cross-feature coordination within the trAIner application, covering how different backend components, services, and features work together to create a cohesive system. The patterns described here are based on the actual implementation found throughout the backend codebase.

## Table of Contents

- [Application Architecture Overview](#application-architecture-overview)
- [Route Organization and API Structure](#route-organization-and-api-structure)
- [Service Layer Integration](#service-layer-integration)
- [Middleware Coordination](#middleware-coordination)
- [Configuration Management](#configuration-management)
- [Data Flow Coordination](#data-flow-coordination)
- [Cross-Feature Dependencies](#cross-feature-dependencies)
- [Application Lifecycle Management](#application-lifecycle-management)
- [Shared Resource Management](#shared-resource-management)
- [Best Practices](#best-practices)

---

## Application Architecture Overview

### Layered Architecture Pattern

The trAIner application follows a layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│              Routes Layer               │
│  (API endpoints, versioning, routing)  │
├─────────────────────────────────────────┤
│            Middleware Layer             │
│   (auth, validation, error handling)   │
├─────────────────────────────────────────┤
│           Controllers Layer             │
│    (request handling, coordination)    │
├─────────────────────────────────────────┤
│            Services Layer               │
│  (business logic, feature integration) │
├─────────────────────────────────────────┤
│            Database Layer               │
│     (Supabase, transactions, RLS)      │
└─────────────────────────────────────────┘
```

### Feature-Based Organization

Each major feature is organized as a cohesive module:

- **Authentication**: User management, JWT handling, session control
- **Analytics**: Data aggregation, insights, cross-feature reporting
- **Workouts**: Exercise planning, logging, progression tracking
- **Nutrition**: Meal planning, macro calculation, dietary management
- **Profiles**: User data, preferences, configuration
- **Data Transfer**: Import/export across all features

---

## Route Organization and API Structure

### Centralized Route Registration (`backend/routes/index.js`)

The application uses a centralized approach to route registration with clear feature organization:

#### Route Registration Pattern
```javascript
function registerRoutes(app) {
  const apiRouter = express.Router();
  
  // Environment-aware documentation
  if (!env.isProduction || env.ENABLE_DOCS_IN_PRODUCTION === 'true') {
    apiRouter.use('/api-docs', docsRoutes);
  }

  // Feature-based route registration with conflict resolution
  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/health', healthRoutes);
  apiRouter.use('/profile', profileRoutes);
  apiRouter.use('/nutrition', nutritionRoutes);
  apiRouter.use('/macros', macroRoutes);
  
  // Order-dependent registration for path conflict resolution
  apiRouter.use('/', workoutLogRoutes); // BEFORE workout routes to avoid /:planId conflict
  apiRouter.use('/workouts', workoutRoutes);
  
  apiRouter.use('/progress', checkInRoutes);
  apiRouter.use('/notifications', notificationRoutes);
  apiRouter.use('/', dataTransferRoutes); // Root-level for full path control
  apiRouter.use('/analytics', analyticsRoutes);
  apiRouter.use('/goals', goalsRoutes);
  apiRouter.use('/mobile', mobileAnalyticsRoutes);

  // Version prefix
  app.use('/v1', apiRouter);
}
```

#### API Versioning Strategy
```javascript
// Health check at root level
app.use(router); // Unversioned health endpoints

// All feature APIs under version prefix
app.use('/v1', apiRouter);

// Example API paths:
// GET /health - System health check
// GET /v1/auth/login - Authentication
// GET /v1/analytics/overview - Analytics data
// POST /v1/workouts/log - Workout logging
```

### Route Conflict Resolution

The system handles route conflicts through careful ordering:

```javascript
// Critical ordering for path resolution
apiRouter.use('/', workoutLogRoutes); // Handles /workouts/log before generic /:planId
apiRouter.use('/workouts', workoutRoutes); // Handles /workouts/:planId

// This prevents conflicts between:
// POST /workouts/log (workout logging)
// GET /workouts/:planId (specific workout plan)
```

---

## Service Layer Integration

### Cross-Service Dependencies (`backend/services/analytics-service.js`)

Services coordinate through dependency injection and shared interfaces:

#### AI Service Integration Pattern
```javascript
// Multi-service initialization with dependency coordination
async function initializeAIServices() {
  try {
    // Initialize core services
    const openaiService = new OpenAIService();
    await openaiService.initClient();
    
    // Validate service interfaces
    if (typeof openaiService.generateChatCompletion !== 'function') {
      throw new ApplicationError('OpenAI service missing required interface');
    }
    
    // Initialize database services
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Cross-service memory system
    const memorySystem = new AgentMemorySystem({
      supabase: supabaseClient,
      openai: openaiService,
      logger: logger
    });
    
    // Analytics agent with coordinated services
    analyticsAgent = new AnalyticsAgent({
      openaiService: openaiService,
      analyticsService: {
        getOverviewMetrics,
        getProgressTrends,
        getStrengthProgression,
        getAdherenceMetrics,
        getTrendsData
      },
      supabaseClient: supabaseClient,
      memorySystem: memorySystem,
      logger: logger
    });
    
    return analyticsAgent;
    
  } catch (error) {
    logger.error('Failed to initialize AI services:', error);
    throw new ApplicationError(`AI services initialization failed: ${error.message}`);
  }
}
```

#### Transaction Coordination
```javascript
// Cross-feature transaction management
async function executeAnalyticsTransaction(callback) {
  let pool, client;
  try {
    const connectionString = createConnectionString('transactionPooler', true);
    pool = new Pool({ connectionString });
    client = await pool.connect();

    await client.query('BEGIN');
    logger.debug('Analytics database transaction started.');

    // Execute coordinated operations across features
    const result = await callback(client);

    await client.query('COMMIT');
    logger.debug('Analytics database transaction committed.');
    return result;
    
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      logger.error('Analytics database transaction rolled back.');
    }
    throw new DatabaseError(`Analytics transaction failed: ${error.message}`);
  } finally {
    if (client) client.release();
    if (pool) await pool.end();
  }
}
```

### Service Interface Standardization

Services follow consistent patterns for coordination:

#### Standard Service Interface
```javascript
// Common service patterns across features
class FeatureService {
  constructor(dependencies) {
    this.supabase = dependencies.supabase;
    this.logger = dependencies.logger;
    this.config = dependencies.config;
  }
  
  async getFeatureData(userId, jwtToken, options = {}) {
    // Standard authentication and authorization
    // Consistent error handling
    // Logging patterns
    // Return format standardization
  }
  
  async updateFeatureData(userId, data, jwtToken) {
    // Input validation
    // Transaction management
    // Cross-feature notifications
    // Audit logging
  }
}
```

---

## Middleware Coordination

### Global Middleware Pipeline (`backend/middleware/index.js`)

Middleware coordination ensures consistent behavior across all features:

#### Middleware Registration Order
```javascript
function configureMiddleware(app) {
  // Security first - applies to all routes
  app.use(helmet());

  // CORS configuration for cross-origin coordination
  app.use(cors({
    origin: env.security.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Body parsing with consistent limits
  app.use(express.json({ limit: serverConfig.maxRequestBodySize }));
  app.use(express.urlencoded({ 
    extended: true, 
    limit: serverConfig.maxRequestBodySize 
  }));

  // Performance optimization
  app.use(compression({ level: serverConfig.compressionLevel }));

  // Request correlation for cross-feature tracing
  app.use((req, res, next) => {
    const startTime = Date.now();
    const requestId = require('crypto').randomBytes(16).toString('hex');
    
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    
    // Cross-feature request logging
    logger.info(`Incoming ${req.method} ${req.url}`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: requestId
    });

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.info(`Completed ${req.method} ${req.url}`, {
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        requestId: requestId
      });
    });

    next();
  });
}
```

### Cross-Feature Authentication

Authentication middleware provides unified access control:

```javascript
// Shared authentication across all protected routes
const authenticate = async (req, res, next) => {
  try {
    const token = extractBearerToken(req);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return next(new AuthenticationError('Invalid token'));
    }
    
    // User context available to all features
    req.user = user;
    req.jwtToken = token;
    
    next();
  } catch (error) {
    next(new AuthenticationError('Authentication failed'));
  }
};
```

---

## Configuration Management

### Centralized Configuration (`backend/config/index.js`)

Configuration coordination ensures consistent behavior across features:

#### Configuration Loading with Fallbacks
```javascript
// Graceful configuration loading with feature coordination
let env, config, logger, supabase, openai, perplexity;

try {
  env = require('./env');
} catch (error) {
  // Critical configuration - fail fast
  throw new Error(`Failed to load environment configuration: ${error.message}`);
}

try {
  config = require('./config');
} catch (error) {
  console.warn('Using default server configuration.');
  config = { server: {} }; // Graceful fallback
}

try {
  logger = require('../utils/logger');
} catch (error) {
  // Provide fallback logger for graceful degradation
  logger = {
    info: (...args) => console.log('INFO:', ...args),
    warn: (...args) => console.warn('WARN:', ...args),
    error: (...args) => console.error('ERROR:', ...args),
    debug: (...args) => console.log('DEBUG:', ...args),
  };
}

// Feature-specific configurations with fallbacks
try {
  openai = require('./openai');
} catch (error) {
  console.warn('OpenAI configuration unavailable - AI features disabled.');
  openai = {}; 
}

try {
  perplexity = require('./perplexity');
} catch (error) {
  console.warn('Perplexity configuration unavailable - research features limited.');
  perplexity = {}; 
}
```

#### Environment-Aware Feature Coordination
```javascript
// Configuration determines feature availability
const serverConfig = config && config.server ? config.server : {
  maxRequestBodySize: '50mb',
  requestTimeout: 30000,
  compressionLevel: 6,
  trustProxy: true
};

// Export coordinated configuration
module.exports = {
  env,           // Environment variables
  config,        // Server configuration
  logger,        // Logging utilities
  supabase,      // Database configuration
  openai,        // AI service configuration
  perplexity,    // Research service configuration
  serverConfig   // Runtime server configuration
};
```

---

## Data Flow Coordination

### Cross-Feature Data Export (`backend/controllers/data-transfer.js`)

Data coordination enables seamless information flow between features:

#### Multi-Feature Export Coordination
```javascript
async function exportData(req, res, next) {
  const userId = req.user?.id;
  const jwtToken = req.headers.authorization?.split(' ')[1];
  const { format, dataTypes } = req.body;
  
  // Validate data types across features
  const validDataTypes = ['profiles', 'workouts', 'workout_logs', 'nutrition', 'analytics'];
  const invalidTypes = dataTypes.filter(type => !validDataTypes.includes(type));
  
  if (invalidTypes.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: `Invalid data types: ${invalidTypes.join(', ')}`
    });
  }
  
  logger.info(`Cross-feature export for user ${userId}: ${dataTypes.join(', ')}`);
  
  // Coordinate export across multiple services
  switch (format.toLowerCase()) {
    case 'json':
      const data = await exportService.exportJSON(userId, dataTypes, jwtToken);
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json(data);
      
    case 'csv':
      const stream = await exportService.exportCSV(userId, dataTypes, jwtToken);
      res.setHeader('Content-Type', 'text/csv');
      stream.pipe(res);
      break;
      
    // Additional formats...
  }
}
```

#### Cross-Service Data Validation
```javascript
// Coordinated validation across features
function validateImportData(parsedData, dataTypes) {
  const validationResults = {};
  
  for (const dataType of dataTypes) {
    switch (dataType) {
      case 'profiles':
        validationResults.profiles = validateProfileData(parsedData.profiles);
        break;
      case 'workouts':
        validationResults.workouts = validateWorkoutData(parsedData.workouts);
        break;
      case 'nutrition':
        validationResults.nutrition = validateNutritionData(parsedData.nutrition);
        break;
    }
  }
  
  return validationResults;
}
```

---

## Cross-Feature Dependencies

### Analytics Feature Coordination (`backend/controllers/analytics.js`)

Analytics demonstrates sophisticated cross-feature integration:

#### Multi-Service Controller Pattern
```javascript
// Analytics controller coordinates multiple services
const analyticsService = require('../services/analytics-service');
const GoalPredictionService = require('../services/goal-prediction-service');

// Service initialization with cross-dependencies
const goalPredictionService = new GoalPredictionService({
  analyticsService: analyticsService,
  supabaseClient: require('../services/supabase').getSupabaseClient(),
  logger: logger
});

async function getAnalyticsOverview(req, res) {
  const userId = req.user?.id;
  const jwtToken = req.headers.authorization?.split(' ')[1];

  try {
    // Coordinate data from multiple features
    const options = {
      timeframe: req.query.timeframe || '30 days',
      includeProjections: req.query.includeProjections === 'true'
    };

    // Analytics service coordinates with workout, nutrition, and profile services
    const overview = await analyticsService.getOverviewMetrics(userId, jwtToken, options);
    
    return res.status(200).json({ 
      status: 'success', 
      data: overview,
      message: overview.hasData ? 'Analytics data retrieved.' : 'No data available.'
    });

  } catch (error) {
    logger.error(`Analytics overview error for user ${userId}:`, error);
    
    // Coordinated error handling
    if (error instanceof DatabaseError) {
      return res.status(500).json({ 
        status: 'error', 
        message: 'Analytics unavailable due to database issue.' 
      });
    }
    return res.status(500).json({ 
      status: 'error', 
      message: 'Analytics unavailable due to internal error.' 
    });
  }
}
```

### Dependency Injection Patterns

Services use dependency injection for loose coupling:

```javascript
// Service constructor with dependency coordination
class AnalyticsService {
  constructor({
    supabaseClient,
    openaiService,
    memorySystem,
    workoutService,
    nutritionService,
    profileService,
    logger
  }) {
    this.supabase = supabaseClient;
    this.openai = openaiService;
    this.memory = memorySystem;
    this.workouts = workoutService;
    this.nutrition = nutritionService;
    this.profiles = profileService;
    this.logger = logger;
  }
  
  // Cross-feature method coordination
  async generateInsights(userId, jwtToken) {
    // Coordinate data from multiple services
    const workoutData = await this.workouts.getProgressData(userId, jwtToken);
    const nutritionData = await this.nutrition.getComplianceData(userId, jwtToken);
    const profileData = await this.profiles.getGoalsAndPreferences(userId, jwtToken);
    
    // AI analysis across all features
    return await this.openai.generateInsights({
      workouts: workoutData,
      nutrition: nutritionData,
      profile: profileData
    });
  }
}
```

---

## Application Lifecycle Management

### Startup Coordination (`backend/server.js`)

The application coordinates startup across all features:

#### Application Startup Sequence
```javascript
const startServer = (port) => {
  const serverPort = port || env.port || 8000;
  
  const server = app.listen(serverPort, () => {
    logger.info(`Server running in ${env.env} mode on port ${serverPort}`);
    
    // Global server reference for coordinated shutdown
    global.server = server;
    
    // Start background coordination tasks
    startCleanupInterval();
  });
  
  // Configure server behavior
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  
  return server;
};
```

#### Background Task Coordination
```javascript
// Coordinated cleanup across all features
const performCleanupTasks = async () => {
  try {
    // JWT token cleanup
    const removedTokens = await cleanupBlacklistedTokens();
    if (removedTokens > 0) {
      logger.info(`Cleaned up ${removedTokens} expired tokens`);
    }
    
    // Analytics aggregation
    await aggregateAnalyticsData();
    
    // Memory system maintenance
    await consolidateAgentMemories();
    
    // Database maintenance
    await optimizeDatabaseConnections();
    
  } catch (error) {
    logger.error('Cleanup tasks failed:', error);
  }
};

// Schedule coordinated maintenance
const startCleanupInterval = () => {
  cleanupInterval = setInterval(performCleanupTasks, 60 * 60 * 1000); // Every hour
  performCleanupTasks(); // Run immediately on startup
};
```

### Graceful Shutdown Coordination

The application coordinates shutdown across all features:

```javascript
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received, starting coordinated shutdown...`);
  
  // Stop all background tasks
  stopCleanupInterval();
  
  // Close database connections
  closeAllDatabasePools();
  
  // Finish ongoing requests
  closeServer();
  
  // Exit process
  process.exit(0);
};

// Coordinate shutdown for different signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

### Error Recovery Coordination

Global error handling coordinates recovery across features:

```javascript
// Fatal error handling with coordinated recovery
const handleFatalError = (error, source) => {
  logger.fatal(`UNHANDLED ERROR (${source}): ${error.message}`, {
    error: error.message,
    stack: error.stack,
    source
  });
  
  const server = global.server;
  if (server) {
    // Coordinated graceful shutdown
    server.close(() => {
      logger.fatal('Server closed due to unhandled error.');
      process.exit(1);
    });
    
    // Force exit if graceful shutdown fails
    setTimeout(() => {
      logger.fatal('Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, 5000);
  } else {
    process.exit(1);
  }
};

// Register coordinated error handlers
process.on('unhandledRejection', (err) => handleFatalError(err, 'unhandledRejection'));
process.on('uncaughtException', (err) => handleFatalError(err, 'uncaughtException'));
```

---

## Shared Resource Management

### Database Connection Coordination

Shared database management across features:

```javascript
// Connection pool coordination
const createConnectionString = (poolType, useServiceRole = false) => {
  const config = env.supabase;
  
  switch (poolType) {
    case 'session':
      return config.databaseUrlPoolerSession;
    case 'transaction':
      return config.databaseUrlPoolerTransaction;
    case 'direct':
      return useServiceRole ? config.databaseUrlServiceRole : config.databaseUrl;
    default:
      return config.databaseUrl;
  }
};

// Shared connection management
const getPooledConnection = async (poolType = 'session') => {
  const connectionString = createConnectionString(poolType);
  const pool = new Pool({ connectionString });
  return await pool.connect();
};
```

### Authentication Token Management

Coordinated token management across features:

```javascript
// JWT token coordination across all features
const extractBearerToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

// Shared token validation
const validateTokenAcrossFeatures = async (token) => {
  // Check blacklist across all features
  const isBlacklisted = await isTokenBlacklisted(token);
  if (isBlacklisted) {
    throw new AuthenticationError('Token has been revoked');
  }
  
  // Validate with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    throw new AuthenticationError('Invalid token');
  }
  
  return user;
};
```

### Logging Coordination

Centralized logging coordination across all features:

```javascript
// Request correlation across features
const addRequestCorrelation = (req, res, next) => {
  const requestId = require('crypto').randomBytes(16).toString('hex');
  
  // Add to request for feature logging
  req.requestId = requestId;
  
  // Add to response headers for client correlation
  res.setHeader('X-Request-ID', requestId);
  
  // Add to logger context for all features
  req.logger = logger.child({ requestId });
  
  next();
};

// Coordinated error logging across features
const logFeatureError = (feature, operation, error, context = {}) => {
  logger.error(`${feature} - ${operation} failed`, {
    feature,
    operation,
    error: error.message,
    stack: error.stack,
    ...context
  });
};
```

---

## Event-Driven Architecture

### EventEmitter Patterns (`backend/services/batch-analytics-processor.js`)

The application implements event-driven coordination for background processing:

#### Batch Analytics Processor with EventEmitter
```javascript
class BatchAnalyticsProcessor extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      maxConcurrentJobs: parseInt(process.env.BATCH_MAX_CONCURRENT) || 3,
      jobTimeout: parseInt(process.env.BATCH_JOB_TIMEOUT) || 300000,
      retryAttempts: parseInt(process.env.BATCH_RETRY_ATTEMPTS) || 3,
      retryDelay: parseInt(process.env.BATCH_RETRY_DELAY) || 5000,
      maxQueueSize: parseInt(process.env.BATCH_MAX_QUEUE_SIZE) || 100,
      priorityLevels: ['low', 'normal', 'high', 'urgent']
    };
    
    // Job management
    this.jobQueue = new Map();
    this.activeJobs = new Map();
    this.completedJobs = new Map();
    this.failedJobs = new Map();
    
    // Processing state
    this.isProcessing = false;
    this.totalJobsProcessed = 0;
    this.totalJobsFailed = 0;
    
    // Initialize processor
    this._initializeProcessor();
  }

  // Submit analytics job with event emission
  async submitJob(operation, params, options = {}) {
    const jobId = this._generateJobId();
    
    if (this.jobQueue.size >= this.config.maxQueueSize) {
      throw new ApplicationError(`Queue is full (${this.config.maxQueueSize} jobs)`);
    }
    
    const job = {
      id: jobId,
      operation,
      params,
      options: {
        priority: options.priority || 'normal',
        userId: options.userId,
        timeframe: options.timeframe || '30 days',
        ...options
      },
      status: 'queued',
      createdAt: new Date().toISOString(),
      attempts: 0,
      progress: 0
    };
    
    this._addToQueue(job);
    
    // Emit job submitted event for cross-feature coordination
    this.emit('jobSubmitted', job);
    this.emit('queueUpdated', { queueSize: this.jobQueue.size });
    
    return jobId;
  }
}
```

#### Cross-Feature Event Coordination
```javascript
// Event listeners for cross-feature coordination
processor.on('jobCompleted', (job) => {
  // Notify analytics service
  analyticsService.notifyJobCompletion(job);
  
  // Update cache invalidation
  if (cacheService) {
    cacheService.invalidateUserCache(job.options.userId);
  }
  
  // Trigger real-time updates
  realtimeService.broadcastAnalyticsUpdate(job.options.userId, job.result);
});

processor.on('jobFailed', (job, error) => {
  // Log failure across features
  logger.error(`Job ${job.id} failed:`, error);
  
  // Notify notification service
  notificationService.queueFailureNotification(job.options.userId, job.operation);
});

// No Bull/Agenda queue system architectural decision
// The application uses direct EventEmitter-based processing instead of 
// external queue systems for simplicity and reduced infrastructure overhead
```

---

## Redis Caching Layer & Cross-Feature Coordination

### AI Analytics Cache (`backend/services/ai-analytics-cache.js`)

Intelligent caching system with cross-feature invalidation strategies:

#### Cache Configuration and TTL Management
```javascript
class AIAnalyticsCache {
  constructor(config = {}) {
    this.config = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || null,
        db: process.env.REDIS_DB || 0
      },
      
      // TTL configurations for different data types
      ttl: {
        insights: 3600,           // 1 hour - AI insights change with new data
        patterns: 7200,           // 2 hours - Patterns are more stable
        recommendations: 1800,    // 30 minutes - Recommendations should be fresh
        predictions: 14400,       // 4 hours - Goal predictions are longer-term
        userOverview: 900,        // 15 minutes - Overview data changes frequently
        trendAnalysis: 1800       // 30 minutes - Trend analysis moderately stable
      },
      
      // Cache key coordination across features
      keyPrefixes: {
        insights: 'ai:insights',
        patterns: 'ai:patterns', 
        recommendations: 'ai:recommendations',
        predictions: 'ai:predictions',
        overview: 'analytics:overview',
        trends: 'analytics:trends'
      }
    };
  }
}
```

#### Cross-Feature Cache Invalidation
```javascript
// Cache invalidation strategies across features
const invalidateUserCache = async (userId, triggerFeature, changedData) => {
  try {
    const invalidationPatterns = {
      'workout': ['insights', 'patterns', 'overview', 'trends'],
      'nutrition': ['recommendations', 'insights', 'overview'],
      'profile': ['insights', 'recommendations', 'predictions'],
      'checkin': ['overview', 'trends', 'patterns']
    };
    
    const keysToInvalidate = invalidationPatterns[triggerFeature] || [];
    
    for (const keyType of keysToInvalidate) {
      const pattern = `${this.config.keyPrefixes[keyType]}:${userId}:*`;
      const keys = await this.client.keys(pattern);
      
      if (keys.length > 0) {
        await this.client.del(...keys);
        logger.debug(`Invalidated ${keys.length} ${keyType} cache keys for user ${userId}`);
      }
    }
    
    // Emit cache invalidation event for other services
    eventEmitter.emit('cacheInvalidated', {
      userId,
      triggerFeature,
      invalidatedTypes: keysToInvalidate
    });
    
  } catch (error) {
    logger.error(`Cache invalidation failed for user ${userId}:`, error);
  }
};
```

#### Mobile Optimization Caching Patterns
```javascript
// Mobile-specific cache coordination
const optimizeForMobile = async (data, cacheKey) => {
  // Compress payload for mobile
  const mobileData = {
    overview: {
      workoutStreak: data.workoutStreak,
      weeklyGoalProgress: data.weeklyGoalProgress,
      keyMetrics: data.keyMetrics.slice(0, 3) // Limit to top 3 metrics
    },
    trends: data.trends ? {
      direction: data.trends.direction,
      change: data.trends.change
    } : null
  };
  
  // Cache with mobile-specific TTL (shorter for bandwidth efficiency)
  await this.client.setEx(
    `mobile:${cacheKey}`, 
    300, // 5 minutes for mobile
    JSON.stringify(mobileData)
  );
  
  return mobileData;
};
```

---

## Comprehensive Transaction Management

### Transaction Coordination Across Features

#### Analytics Transaction Management (`backend/services/analytics-service.js`)
```javascript
// Cross-feature transaction coordination
async function executeAnalyticsTransaction(callback) {
  let pool, client;
  try {
    const connectionString = createConnectionString('transactionPooler', true);
    pool = new Pool({ connectionString });
    client = await pool.connect();

    await client.query('BEGIN');
    logger.debug('Analytics database transaction started.');

    // Execute coordinated operations across features
    const result = await callback(client);

    await client.query('COMMIT');
    logger.debug('Analytics database transaction committed.');
    return result;
    
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      logger.error('Analytics database transaction rolled back.');
    }
    throw new DatabaseError(`Analytics transaction failed: ${error.message}`);
  } finally {
    if (client) client.release();
    if (pool) await pool.end();
  }
}
```

#### Optimistic Locking Patterns
```javascript
// Optimistic locking for concurrent feature updates
const updateWithOptimisticLocking = async (table, id, updates, currentVersion) => {
  return await executeTransaction(async (client) => {
    // Check current version
    const versionQuery = `SELECT version FROM ${table} WHERE id = $1`;
    const versionResult = await client.query(versionQuery, [id]);
    
    if (versionResult.rows.length === 0) {
      throw new NotFoundError(`Record not found in ${table}`);
    }
    
    const dbVersion = versionResult.rows[0].version;
    if (dbVersion !== currentVersion) {
      throw new ConcurrencyConflictError(
        `Record was modified by another process. Expected version ${currentVersion}, found ${dbVersion}`
      );
    }
    
    // Update with version increment
    const updateQuery = `
      UPDATE ${table} 
      SET ${Object.keys(updates).map((key, i) => `${key} = $${i + 3}`).join(', ')},
          version = version + 1,
          updated_at = NOW()
      WHERE id = $1 AND version = $2
      RETURNING *`;
    
    const values = [id, currentVersion, ...Object.values(updates)];
    const result = await client.query(updateQuery, values);
    
    return result.rows[0];
  });
};
```

#### Rollback Pattern Coordination
```javascript
// Cross-feature rollback coordination
const coordinatedRollback = async (operations, completedFeatures) => {
  const rollbackPromises = [];
  
  for (const feature of completedFeatures.reverse()) {
    const rollbackOperation = operations[feature].rollback;
    if (rollbackOperation) {
      rollbackPromises.push(
        rollbackOperation().catch(error => {
          logger.error(`Rollback failed for feature ${feature}:`, error);
          return { feature, error: error.message };
        })
      );
    }
  }
  
  const rollbackResults = await Promise.allSettled(rollbackPromises);
  
  const failedRollbacks = rollbackResults
    .filter(result => result.status === 'rejected' || result.value?.error)
    .map(result => result.value?.feature || 'unknown');
  
  if (failedRollbacks.length > 0) {
    logger.error(`Rollback failed for features: ${failedRollbacks.join(', ')}`);
    // Alert monitoring system about data inconsistency
    monitoringService.alertDataInconsistency(failedRollbacks);
  }
  
  return rollbackResults;
};
```

---

## Real-Time Coordination

### Real-Time Analytics Integration

The real-time system coordinates updates across all features:

#### WebSocket Subscription Lifecycle Management
```javascript
// Real-time coordination across features
class RealtimeCoordinator {
  constructor() {
    this.activeSubscriptions = new Map();
    this.featureChannels = new Map();
  }
  
  async subscribeToUserUpdates(userId, jwtToken, features = ['analytics', 'workouts', 'nutrition']) {
    const subscriptions = {};
    
    for (const feature of features) {
      const channelName = `${feature}-${userId}`;
      
      try {
        const subscription = await this.createFeatureSubscription(feature, userId, jwtToken);
        subscriptions[feature] = subscription;
        this.activeSubscriptions.set(channelName, subscription);
      } catch (error) {
        logger.error(`Failed to subscribe to ${feature} for user ${userId}:`, error);
      }
    }
    
    return subscriptions;
  }
  
  async createFeatureSubscription(feature, userId, jwtToken) {
    const supabaseWithAuth = getSupabaseClientWithToken(jwtToken);
    
    const channel = supabaseWithAuth
      .channel(`${feature}-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: this.getTableForFeature(feature),
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        this.handleCrossFeatureUpdate(feature, userId, payload);
      });
    
    await channel.subscribe();
    return channel;
  }
  
  handleCrossFeatureUpdate(feature, userId, payload) {
    // Coordinate updates across related features
    const relatedFeatures = this.getRelatedFeatures(feature);
    
    for (const relatedFeature of relatedFeatures) {
      this.triggerFeatureRefresh(relatedFeature, userId, {
        trigger: feature,
        changeType: payload.eventType
      });
    }
  }
}
```

---

## Mobile Optimization Coordination

### Mobile-Specific Caching Headers (`backend/controllers/mobile-analytics.js`)

Coordination of mobile optimization across features:

#### Mobile Payload Optimization
```javascript
class MobilePayloadOptimizer {
  optimizeAnalyticsPayload(data) {
    // Reduce payload size for mobile bandwidth
    return {
      overview: {
        workoutStreak: data.workoutStreak,
        weeklyProgress: Math.round(data.weeklyGoalProgress || 0),
        keyMetrics: this.selectTopMetrics(data.metrics, 3)
      },
      trends: data.trends ? {
        direction: data.trends.direction,
        change: parseFloat((data.trends.change || 0).toFixed(1))
      } : null,
      lastUpdated: new Date().toISOString()
    };
  }
  
  selectTopMetrics(metrics, limit) {
    return (metrics || [])
      .sort((a, b) => (b.importance || 0) - (a.importance || 0))
      .slice(0, limit)
      .map(metric => ({
        name: metric.name,
        value: parseFloat((metric.value || 0).toFixed(1)),
        unit: metric.unit
      }));
  }
}

// Mobile caching coordination
const setMobileCacheHeaders = (res, data) => {
  const payloadSize = JSON.stringify(data).length;
  
  res.set({
    'Cache-Control': 'public, max-age=300', // 5 minute cache
    'ETag': generateETag(data),
    'X-Payload-Size': payloadSize.toString(),
    'X-Mobile-Optimized': 'true',
    'Vary': 'User-Agent' // Cache varies by mobile/desktop
  });
};
```

#### Offline Sync Strategies
```javascript
// Mobile offline sync coordination
const processMobileSync = async (userId, jwtToken, lastSyncTimestamp, offlineData, syncType) => {
  const syncResult = {
    status: 'success',
    conflictsResolved: 0,
    recordsProcessed: 0,
    processingTime: 0
  };
  
  const startTime = Date.now();
  
  try {
    // Process offline data across features
    if (offlineData) {
      const featureResults = await Promise.allSettled([
        syncWorkoutData(userId, offlineData.workouts, jwtToken),
        syncNutritionData(userId, offlineData.nutrition, jwtToken),
        syncProgressData(userId, offlineData.progress, jwtToken)
      ]);
      
      // Handle conflicts and aggregate results
      for (const result of featureResults) {
        if (result.status === 'fulfilled') {
          syncResult.recordsProcessed += result.value.recordsProcessed || 0;
          syncResult.conflictsResolved += result.value.conflictsResolved || 0;
        }
      }
    }
    
    syncResult.processingTime = Date.now() - startTime;
    return syncResult;
    
  } catch (error) {
    logger.error(`Mobile sync failed for user ${userId}:`, error);
    throw new ApplicationError(`Mobile sync failed: ${error.message}`);
  }
};
```

---

## Database Schema Coordination

### Cross-Feature Database Triggers (`backend/supabase/migrations/0023_realtime_analytics_triggers.sql`)

Database-level coordination through triggers and functions:

#### Analytics Refresh Queue System
```sql
-- Analytics refresh queue for cross-feature coordination
CREATE TABLE IF NOT EXISTS analytics_refresh_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_table TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_trigger_event CHECK (trigger_event IN ('INSERT', 'UPDATE', 'DELETE')),
  CONSTRAINT valid_trigger_table CHECK (trigger_table IN ('workout_logs', 'user_check_ins', 'meal_logs'))
);

-- Function to refresh analytics on data changes
CREATE OR REPLACE FUNCTION refresh_user_analytics_on_change()
RETURNS TRIGGER AS $$
DECLARE
  affected_user_id UUID;
BEGIN
  affected_user_id := COALESCE(NEW.user_id, OLD.user_id);
  
  IF affected_user_id IS NOT NULL THEN
    INSERT INTO analytics_refresh_queue (user_id, trigger_table, trigger_event, scheduled_at)
    VALUES (
      affected_user_id,
      TG_TABLE_NAME,
      TG_OP,
      NOW() + INTERVAL '30 seconds'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Cascade Behaviors Affecting Multiple Features
```sql
-- Cross-feature cascade and constraint relationships
ALTER TABLE workout_logs 
  ADD CONSTRAINT fk_workout_logs_plan_id 
  FOREIGN KEY (workout_plan_id) REFERENCES workout_plans(id) 
  ON DELETE SET NULL; -- Preserve logs even if plan is deleted

ALTER TABLE user_analytics_aggregates 
  ADD CONSTRAINT fk_analytics_user_id 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) 
  ON DELETE CASCADE; -- Analytics data follows user lifecycle

-- Cross-feature trigger registration
CREATE TRIGGER trigger_refresh_analytics_workout_logs
  AFTER INSERT OR UPDATE OR DELETE ON workout_logs
  FOR EACH ROW EXECUTE FUNCTION refresh_user_analytics_on_change();

CREATE TRIGGER trigger_refresh_analytics_user_check_ins
  AFTER INSERT OR UPDATE OR DELETE ON user_check_ins
  FOR EACH ROW EXECUTE FUNCTION refresh_user_analytics_on_change();

CREATE TRIGGER trigger_refresh_analytics_meal_logs
  AFTER INSERT OR UPDATE OR DELETE ON meal_logs
  FOR EACH ROW EXECUTE FUNCTION refresh_user_analytics_on_change();
```

#### Cross-Feature Update Functions (`backend/supabase/migrations/0021_analytics_aggregation_functions.sql`)
```sql
-- Function for coordinated analytics refresh across features
CREATE OR REPLACE FUNCTION public.refresh_user_analytics(
  target_user_id UUID,
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID AS $$
DECLARE
  current_date_iter DATE;
  workout_stats RECORD;
  checkin_stats RECORD;
  meal_stats RECORD;
BEGIN
  -- Validate inputs
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'target_user_id cannot be null';
  END IF;
  
  -- Loop through date range and aggregate across features
  current_date_iter := start_date;
  WHILE current_date_iter <= end_date LOOP
    
    -- Get workout statistics
    SELECT 
      COUNT(*) as workouts_completed,
      AVG(overall_difficulty) as avg_difficulty,
      AVG(energy_level) as avg_energy
    INTO workout_stats
    FROM workout_logs wl
    WHERE wl.user_id = target_user_id 
      AND wl.date = current_date_iter;
    
    -- Get check-in statistics  
    SELECT 
      AVG(weight) as avg_weight,
      AVG(body_fat_percentage) as avg_body_fat
    INTO checkin_stats
    FROM user_check_ins uc
    WHERE uc.user_id = target_user_id 
      AND uc.date = current_date_iter;
    
    -- Upsert aggregated data
    INSERT INTO user_analytics_aggregates (
      user_id, date, workouts_completed, avg_difficulty, 
      avg_energy, avg_weight, avg_body_fat
    ) VALUES (
      target_user_id, current_date_iter,
      workout_stats.workouts_completed,
      workout_stats.avg_difficulty,
      workout_stats.avg_energy,
      checkin_stats.avg_weight,
      checkin_stats.avg_body_fat
    )
    ON CONFLICT (user_id, date) 
    DO UPDATE SET 
      workouts_completed = EXCLUDED.workouts_completed,
      avg_difficulty = EXCLUDED.avg_difficulty,
      avg_energy = EXCLUDED.avg_energy,
      avg_weight = EXCLUDED.avg_weight,
      avg_body_fat = EXCLUDED.avg_body_fat,
      updated_at = NOW();
    
    current_date_iter := current_date_iter + INTERVAL '1 day';
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Best Practices

### 1. Route Organization

**✅ Do:**
- Use feature-based route grouping
- Implement clear API versioning
- Handle route conflicts through ordering
- Provide consistent route naming patterns

**❌ Don't:**
- Mix feature routes without organization
- Ignore route conflict resolution
- Skip API versioning strategy
- Use inconsistent naming conventions

### 2. Service Coordination

**✅ Do:**
- Use dependency injection for loose coupling
- Implement standard service interfaces
- Coordinate transactions across features
- Handle cross-service error propagation

**❌ Don't:**
- Create tight coupling between services
- Skip transaction coordination
- Ignore service interface consistency
- Allow services to fail silently

### 3. Middleware Pipeline

**✅ Do:**
- Order middleware for proper functionality
- Use shared middleware for cross-cutting concerns
- Implement request correlation for tracing
- Handle middleware errors gracefully

**❌ Don't:**
- Ignore middleware ordering requirements
- Duplicate middleware across features
- Skip request correlation
- Allow middleware failures to crash the application

### 4. Configuration Management

**✅ Do:**
- Centralize configuration loading
- Implement graceful fallbacks
- Use environment-aware configuration
- Validate configuration at startup

**❌ Don't:**
- Scatter configuration across features
- Ignore configuration validation
- Skip fallback mechanisms
- Mix environment-specific configuration

### 5. Data Flow Coordination

**✅ Do:**
- Validate data at feature boundaries
- Use consistent data formats
- Implement proper data transformation
- Handle cross-feature data dependencies

**❌ Don't:**
- Skip data validation between features
- Use inconsistent data formats
- Ignore data transformation requirements
- Create circular dependencies

### 6. Error Handling Coordination

**✅ Do:**
- Use consistent error types across features
- Implement coordinated error recovery
- Log errors with proper context
- Handle errors at appropriate boundaries

**❌ Don't:**
- Use feature-specific error handling only
- Ignore error propagation between features
- Skip error correlation and context
- Allow errors to break feature coordination

### 7. Resource Management

**✅ Do:**
- Share resources efficiently across features
- Implement proper resource cleanup
- Monitor resource usage patterns
- Use connection pooling effectively

**❌ Don't:**
- Duplicate resource management
- Ignore resource cleanup
- Skip resource monitoring
- Create resource contention

---

## Conclusion

This comprehensive cross-feature coordination guide provides the foundation for building cohesive, well-integrated features within the trAIner application. The patterns described here ensure proper separation of concerns while maintaining seamless coordination between different functional areas.

The implementation emphasizes loose coupling, shared resource management, and consistent interfaces to create a maintainable and scalable system architecture. For specific implementation examples, refer to the actual source files mentioned throughout this document. 