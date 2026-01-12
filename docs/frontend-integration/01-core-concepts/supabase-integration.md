# Supabase Integration Guide

## Overview

This document provides a comprehensive guide to Supabase integration within the trAIner application, covering authentication, database operations, vector storage, and configuration management based on the actual implementation patterns used throughout the backend.

## Table of Contents

- [Service Layer Architecture](#service-layer-architecture)
- [Authentication Integration](#authentication-integration)
- [Database Schema and Migrations](#database-schema-and-migrations)
- [Row Level Security (RLS) Policies](#row-level-security-rls-policies)
- [Vector Storage for AI Memory](#vector-storage-for-ai-memory)
- [Environment Configuration](#environment-configuration)
- [Testing Integration](#testing-integration)
- [Error Handling Patterns](#error-handling-patterns)
- [Best Practices](#best-practices)

---

## Service Layer Architecture

### Core Service Files

The Supabase integration is organized through a layered service architecture:

#### Primary Service Layer (`backend/services/supabase.js`)
The main service factory that provides environment-aware Supabase client management:

```javascript
// Factory pattern for creating environment-appropriate clients
const supabaseService = {
  getSupabaseClient: () => {
    // Returns standard authenticated client
  },
  getSupabaseAdminClient: () => {
    // Returns admin client with elevated privileges
  },
  getSupabaseClientWithToken: (jwtToken) => {
    // Returns client with specific user context
  }
};
```

**Key Features:**
- Environment-aware client creation (development/test/production)
- Automatic token management and session handling
- Connection pooling and retry logic
- SSL configuration for secure connections

#### Retry Logic Configuration (`backend/services/supabase.js`)
```javascript
// Retry configuration for Supabase operations
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  retryableStatusCodes: [408, 429, 500, 502, 503, 504]
};

// Implements retry logic for Supabase operations
async function withRetry(operation, operationName = 'Database operation') {
  let lastError = null;
  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // If error is not retryable or this is the last attempt, don't retry
      if (!error.retryable || attempt === RETRY_CONFIG.maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = RETRY_CONFIG.retryDelay * Math.pow(2, attempt - 1);
      logger.warn(`Retry attempt ${attempt}/${RETRY_CONFIG.maxRetries} for ${operationName} in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  logger.error(`All retry attempts failed for ${operationName}`);
  throw lastError;
}

// Usage in service operations
const query = async (table, filters, jwtToken) => {
  return withRetry(async () => {
    const supabase = getSupabaseClientWithToken(jwtToken);
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .match(filters);
    
    if (error) handleSupabaseError(error, `Query ${table}`);
    return data;
  }, `Query ${table}`);
};
```

#### Singleton Pattern Implementation
```javascript
// Singleton client management with test environment handling
let supabaseInstance = null;
let supabaseAdminInstance = null;

function getSupabaseClient() {
  if (supabaseInstance) {
    // In Jest tests, clear mocks between test cases
    if (isTest && actualCreateSupabaseClient.mock && 
        actualCreateSupabaseClient.mock.calls.length === 0) {
      supabaseInstance = null;
    } else {
      return supabaseInstance;
    }
  }

  try {
    logger.info('Initializing Supabase client');
    supabaseInstance = actualCreateSupabaseClient(env, logger, env.env, false, null);
    logger.info('Supabase client initialized successfully');
    return supabaseInstance;
  } catch (error) {
    logger.error('Failed to initialize Supabase client:', error);
    throw new Error('Failed to initialize database connection');
  }
}
```

#### Admin Service Layer (`backend/services/supabase-admin.js`)
Handles administrative operations requiring elevated privileges:

```javascript
// Admin operations for user management and system tasks
const adminOperations = {
  createUser: async (userData) => { /* Admin user creation */ },
  signOutUser: async (userId) => { /* Force user logout */ },
  getUserById: async (userId) => { /* Admin user lookup */ },
  listUsers: () => { /* User management operations */ }
};
```

#### Transaction Pooler Usage (`backend/services/workout-service.js`)
```javascript
// Execute operations within a transaction using transaction pooler
async function executeTransaction(callback) {
  let pool;
  let client;
  try {
    const connectionString = createConnectionString('transactionPooler', true); // Use service role for transactions
    pool = new Pool({ connectionString });
    client = await pool.connect();

    await client.query('BEGIN');
    logger.debug('Database transaction started.');

    const result = await callback(client);

    await client.query('COMMIT');
    logger.debug('Database transaction committed.');
    return result;
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
      logger.error('Database transaction rolled back due to error.', { error: error.message });
    }
    logger.error(`Transaction error: ${error.message}`);
    
    // Re-throw specific known errors, wrap unknown errors
    if (error instanceof DatabaseError || error instanceof NotFoundError || error instanceof ConflictError) {
      throw error;
    } else {
      throw new DatabaseError(`Database transaction failed: ${error.message}`);
    }
  } finally {
    if (client) {
      client.release();
    }
    if (pool) {
      await pool.end();
    }
  }
}

// Usage example in service
const updateWorkoutPlan = async (planId, planData, userId, jwtToken) => {
  const result = await executeTransaction(async (pgClient) => {
    // Perform multiple related operations within transaction
    const updateQuery = `
      UPDATE workout_plans 
      SET name = $1, description = $2, updated_at = NOW()
      WHERE id = $3 AND user_id = $4 
      RETURNING *`;
    
    const result = await pgClient.query(updateQuery, [
      planData.name, 
      planData.description, 
      planId, 
      userId
    ]);
    
    if (result.rows.length === 0) {
      throw new NotFoundError(`Workout plan ${planId} not found`);
    }
    
    return result.rows[0];
  });
  
  return result;
};
```

#### Configuration Layer (`backend/config/supabase.js`)
Centralizes Supabase configuration and client initialization:

```javascript
// Environment-specific configuration management
const config = {
  supabaseUrl: process.env.SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  anonKey: process.env.SUPABASE_ANON_KEY,
  // SSL and connection settings
  ssl: { rejectUnauthorized: true },
  connectionTimeout: 30000
};
```

---

## Authentication Integration

### Controller Implementation (`backend/controllers/auth.js`)

The authentication system leverages Supabase Auth with comprehensive error handling:

#### Signup Flow
```javascript
const signup = async (req, res, next) => {
  const { email, password, name } = req.body;
  
  // Environment-specific handling
  if (process.env.NODE_ENV === 'test') {
    // Admin client for test bypass
    const { data, error } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true // Skip confirmation in tests
    });
  } else {
    // Standard signup flow
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });
  }
  
  // Profile creation in public.user_profiles
  await supabase.from('user_profiles').insert({
    user_id: data.user.id,
    name: profileName
  });
};
```

#### Authentication Middleware (`backend/middleware/auth.js`)
```javascript
const authenticate = async (req, res, next) => {
  const token = extractBearerToken(req);
  
  // Verify token with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return next(new AuthenticationError('Invalid token'));
  }
  
  req.user = user;
  next();
};
```

### Token Management Patterns

#### JWT Token Flow
- **Access Tokens**: 1-hour expiry, managed by Supabase
- **Refresh Tokens**: 7-day expiry with rotation enabled
- **Session Management**: Automatic token refresh on client side

#### Environment-Specific Behavior
```javascript
// Test Environment
- Email confirmation bypassed
- Admin client used for user creation
- Mock token validation

// Production Environment  
- Full email verification flow
- Standard Supabase Auth flow
- Production security policies
```

---

## Database Schema and Migrations

### Migration System Structure

The migration system follows a sequential numbering pattern with descriptive names:

```
0000_enable_extensions.sql       # Vector and UUID extensions
0002_create_user_profiles.sql    # User profile schema
0005_create_workout_plans.sql    # Workout plan storage
0013_create_agent_memory.sql     # AI memory with vector storage
0018_add_workout_plans_rls_policies.sql  # Security policies
```

### Core Schema Patterns

#### User Profiles Table
```sql
CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT,
  age INTEGER,
  gender TEXT,
  height NUMERIC,
  weight NUMERIC,
  experience_level TEXT,
  fitness_goals TEXT[] DEFAULT '{}',
  equipment TEXT[] DEFAULT '{}',
  medical_conditions TEXT,
  unit_preference TEXT DEFAULT 'metric',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_user_id_key UNIQUE (user_id),
  CONSTRAINT user_profiles_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  
  -- Data validation constraints
  CONSTRAINT user_profiles_age_check 
    CHECK (age >= 13 AND age <= 120),
  CONSTRAINT user_profiles_weight_check 
    CHECK (weight > 0),
  CONSTRAINT user_profiles_unit_preference_check 
    CHECK (unit_preference IN ('metric', 'imperial')),
  CONSTRAINT user_profiles_experience_level_check 
    CHECK (experience_level IN ('beginner', 'intermediate', 'advanced'))
);
```

#### Automatic Timestamps
```sql
-- Trigger for automatic updated_at management
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();
```

---

## Row Level Security (RLS) Policies

### Policy Implementation Pattern

All user data tables implement comprehensive RLS policies:

#### Workout Plans Security
```sql
-- Enable RLS on table
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

-- View access policy
CREATE POLICY "Users can view own workout plans"
  ON public.workout_plans
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert policy
CREATE POLICY "Users can create workout plans"
  ON public.workout_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Update policy
CREATE POLICY "Users can update own workout plans"
  ON public.workout_plans
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Delete policy
CREATE POLICY "Users can delete own workout plans"
  ON public.workout_plans
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

### Service-Level Security Enhancement

Controllers implement additional security layers beyond RLS:

```javascript
// Double security: RLS + application-level filtering
const getWorkoutPlan = async (req, res) => {
  const { planId } = req.params;
  const userId = req.user.id;
  
  const { data, error } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('id', planId)
    .eq('user_id', userId)  // Explicit user filtering
    .single();
};
```

---

## Vector Storage for AI Memory

### Agent Memory Schema

The AI memory system leverages PostgreSQL's vector extension:

```sql
CREATE TABLE public.agent_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  embedding public.vector(1536),  -- OpenAI embedding dimensions
  content JSONB NOT NULL DEFAULT '{}',
  type TEXT NOT NULL,
  agent_type TEXT,
  metadata JSONB DEFAULT '{}',
  is_archived BOOLEAN DEFAULT false,
  workout_plan_id UUID,
  workout_log_id UUID,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT agent_memory_pkey PRIMARY KEY (id),
  CONSTRAINT agent_memory_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT agent_memory_agent_type_check 
    CHECK (agent_type IN ('nutrition', 'workout', 'research', 'adjustment', 'system', 'feedback')),
  CONSTRAINT valid_embedding 
    CHECK (embedding IS NULL OR vector_dims(embedding) = 1536)
);
```

### Vector Indexes for Performance

```sql
-- HNSW index for similarity search
CREATE INDEX idx_agent_memory_embedding_hnsw 
  ON public.agent_memory 
  USING hnsw (embedding vector_cosine_ops);

-- IVFFlat index for approximate search
CREATE INDEX idx_agent_memory_embedding 
  ON public.agent_memory 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Composite indexes for filtered searches
CREATE INDEX idx_agent_memory_user_plan 
  ON public.agent_memory (user_id, workout_plan_id)
  WHERE user_id IS NOT NULL AND workout_plan_id IS NOT NULL;
```

### Memory Search Functions

#### Similarity Search Function
```sql
CREATE OR REPLACE FUNCTION public.match_agent_memories(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_user_id UUID DEFAULT NULL,
  filter_plan_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  agent_type TEXT,
  content JSONB,
  metadata JSONB,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    am.id,
    am.user_id,
    am.agent_type,
    am.content,
    am.metadata,
    1 - (am.embedding <=> query_embedding) AS similarity
  FROM public.agent_memory am
  WHERE
    am.embedding IS NOT NULL
    AND (filter_user_id IS NULL OR am.user_id = filter_user_id)
    AND (filter_plan_id IS NULL OR am.workout_plan_id = filter_plan_id)
    AND 1 - (am.embedding <=> query_embedding) > match_threshold
    AND am.is_archived = FALSE
  ORDER BY am.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Filtered Memory Retrieval
```sql
CREATE OR REPLACE FUNCTION public.filter_agent_memories(
  user_id_param UUID,
  metadata_filter JSONB DEFAULT '{}',
  agent_type_param TEXT DEFAULT NULL,
  plan_id_param UUID DEFAULT NULL,
  include_archived BOOLEAN DEFAULT FALSE,
  limit_param INT DEFAULT 10,
  sort_by_param TEXT DEFAULT 'created_at'
)
RETURNS SETOF public.agent_memory AS $$
-- Function implementation with dynamic filtering
$$;
```

---

## Real-Time Features & Channel Management

### Real-Time Analytics Service (`backend/services/realtime-analytics-service.js`)

The application implements comprehensive real-time subscriptions with JWT authentication:

#### Channel Subscription Lifecycle
```javascript
class RealtimeAnalyticsService extends EventEmitter {
  constructor({ supabaseClient, analyticsService, logger }) {
    super();
    this.supabaseClient = supabaseClient;
    this.analyticsService = analyticsService;
    this.activeChannels = new Map();
    this.connectionStats = {
      totalConnections: 0,
      activeConnections: 0,
      failedConnections: 0,
      totalEvents: 0,
      lastConnectionTime: null
    };
  }

  async subscribeToUserAnalytics(userId, jwtToken, clientCallback, options = {}) {
    if (!jwtToken) {
      throw new ApplicationError('JWT token required for real-time analytics subscription');
    }

    const channelName = `user-analytics-${userId}`;
    
    // Create authenticated client for real-time
    const supabaseWithAuth = getSupabaseClientWithToken(jwtToken);
    
    const channel = supabaseWithAuth
      .channel(channelName, {
        config: {
          headers: { Authorization: `Bearer ${jwtToken}` }
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_analytics_aggregates',
        filter: `user_id=eq.${userId}`
      }, async (payload) => {
        this.connectionStats.totalEvents++;
        const updatedAnalytics = await this._processRealtimeUpdate(payload, userId, jwtToken);
        clientCallback(updatedAnalytics);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public', 
        table: 'workout_logs',
        filter: `user_id=eq.${userId}`
      }, async (payload) => {
        await this._triggerAnalyticsRefresh(userId, jwtToken, 'workout_completed');
      });

    await channel.subscribe();
    this.activeChannels.set(channelName, { channel, userId, jwtToken });
    this.connectionStats.activeConnections++;
    
    return channelName;
  }
}
```

#### Connection Management and Cleanup
```javascript
// Unsubscribe with proper cleanup
async unsubscribeFromAnalytics(channelName) {
  const channelInfo = this.activeChannels.get(channelName);
  
  if (!channelInfo) {
    this.logger.warn(`Attempted to unsubscribe from non-existent channel: ${channelName}`);
    return false;
  }

  await this.supabaseClient.removeChannel(channelInfo.channel);
  this.activeChannels.delete(channelName);
  this.connectionStats.activeConnections = Math.max(0, this.connectionStats.activeConnections - 1);
  
  this.logger.info(`Successfully unsubscribed from channel: ${channelName}`);
  return true;
}

// Get real-time connection statistics
getConnectionStats() {
  return {
    ...this.connectionStats,
    activeChannels: this.activeChannels.size,
    channels: Array.from(this.activeChannels.keys())
  };
}
```

#### Real-Time Update Processing
```javascript
// Process incoming real-time updates
async _processRealtimeUpdate(payload, userId, jwtToken) {
  try {
    const { new: newRecord, old: oldRecord, eventType } = payload;
    
    this.logger.debug(`Processing real-time update for user ${userId}:`, {
      eventType,
      hasNewRecord: !!newRecord,
      hasOldRecord: !!oldRecord
    });

    return {
      type: 'analytics_update',
      userId,
      data: newRecord,
      previousData: oldRecord,
      timestamp: new Date().toISOString(),
      changeType: eventType,
      source: 'realtime_analytics'
    };

  } catch (error) {
    this.logger.error(`Error processing real-time update for user ${userId}:`, error);
    throw error;
  }
}

// Background analytics refresh trigger
async _triggerAnalyticsRefresh(userId, jwtToken, triggerType) {
  setTimeout(async () => {
    try {
      this.logger.debug(`Triggering analytics refresh for user ${userId}, trigger: ${triggerType}`);
      
      if (this.analyticsService.refreshUserAnalytics) {
        await this.analyticsService.refreshUserAnalytics(userId, jwtToken, { 
          triggerType,
          source: 'realtime_trigger'
        });
      }
      
    } catch (error) {
      this.logger.error(`Analytics refresh failed for user ${userId}:`, error);
    }
  }, 0);
}
```

---

## Environment Configuration

### Configuration Structure (`backend/config/env.js`)

Environment variables are organized into logical categories:

```javascript
module.exports = {
  env: process.env.NODE_ENV,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  
  supabase: {
    // Core connection settings
    url: env.SUPABASE_URL,
    projectRef: env.SUPABASE_PROJECT_REF,
    anonKey: env.SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    
    // Database connection components
    dbHost: env.DB_HOST,
    dbPort: env.DB_PORT,
    dbUser: env.DB_USER,
    databasePassword: env.DATABASE_PASSWORD,
    
    // Connection strings for different purposes
    databaseUrl: env.DATABASE_URL,
    databaseUrlServiceRole: env.DATABASE_URL_SERVICE_ROLE,
    databaseUrlPoolerSession: env.DATABASE_URL_POOLER_SESSION,
    databaseUrlPoolerTransaction: env.DATABASE_URL_POOLER_TRANSACTION,
    
    // SSL and security settings
    sslRejectUnauthorized: env.NODE_TLS_REJECT_UNAUTHORIZED !== '0',
    sslMode: env.SSL_MODE,
    connectionTimeout: parseInt(env.CONNECTION_TIMEOUT) || 30000
  },
  
  auth: {
    adminBypassOwnership: true // Admin configuration
  }
};
```

### Local Development Configuration (`backend/supabase/config.toml`)

```toml
project_id = "backend"

[api]
enabled = true
port = 54321
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[db]
port = 54322
shadow_port = 54320
major_version = 15

[auth]
enabled = true
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = ["https://127.0.0.1:3000"]
jwt_expiry = 3600
enable_refresh_token_rotation = true
enable_signup = true
minimum_password_length = 6

[auth.email]
enable_signup = true
enable_confirmations = false  # Disabled for development
double_confirm_changes = true

[storage]
enabled = true
file_size_limit = "50MiB"

[realtime]
enabled = true

[studio]
enabled = true
port = 54323
api_url = "http://127.0.0.1"
openai_api_key = "env(OPENAI_API_KEY)"
```

---

## Testing Integration

### Test Helper Patterns (`backend/tests/helpers/integration-auth-helpers.js`)

```javascript
/**
 * Creates a test user via API signup and returns JWT token
 */
async function getTestUserToken(app, userData = {}) {
  const uniqueEmail = userData.email || `testuser_${Date.now()}@example.com`;
  const password = userData.password || 'PasswordForTest123!';
  const name = userData.name || 'Test User';

  // Sign up via API endpoint
  await supertest(app)
    .post('/v1/auth/signup')
    .send({ name, email: uniqueEmail, password })
    .expect(200);

  // Login to get JWT token
  const loginResponse = await supertest(app)
    .post('/v1/auth/login')
    .send({ email: uniqueEmail, password })
    .expect(200);

  return loginResponse.body.jwtToken;
}
```

### Environment-Specific Test Behavior

#### Test Environment Setup
```javascript
// In auth controller - test-specific behavior
if (process.env.NODE_ENV === 'test') {
  // Use admin client to bypass email confirmation
  const { data, error } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { name },
    email_confirm: true // Skip email verification
  });
}
```

#### Mock and Real Integration
```javascript
// Test helper for Supabase operations
const createTestData = async (userId) => {
  // Use real Supabase client for integration testing
  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      user_id: userId,
      name: 'Test User',
      age: 25,
      unit_preference: 'metric'
    });
  
  return data;
};
```

---

## Error Handling Patterns

### Authentication Error Classification

The system implements comprehensive error handling with specific error types:

```javascript
// Custom error classes for different scenarios
class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
  }
}
```

### Supabase Error Mapping

```javascript
// Map Supabase errors to application errors
const handleSupabaseError = (error, operation) => {
  if (error.message.includes('User already registered')) {
    throw new ConflictError('Email already registered');
  }
  
  if (error.message.includes('Invalid login credentials')) {
    throw new AuthenticationError('Invalid email or password');
  }
  
  if (error.message.includes('Password should be at least')) {
    throw new ValidationError('Password should be at least 6 characters');
  }
  
  // Generic fallback
  throw new InternalError(`${operation} failed due to an unexpected error.`, error.message);
};
```

### Database Error Handling

```javascript
// Handle database constraints and RLS errors
const handleDatabaseError = (error, operation) => {
  if (error.code === '23505') {
    throw new ConflictError('Resource already exists');
  }
  
  if (error.code === 'PGRST116') {
    throw new NotFoundError('Resource not found');
  }
  
  if (error.message.includes('row-level security policy')) {
    throw new AuthenticationError('Access denied');
  }
  
  throw new DatabaseError(`${operation} failed`, error.message);
};
```

---

## Best Practices

### 1. Service Layer Design

**✅ Do:**
- Use factory pattern for client creation
- Implement environment-aware configuration
- Centralize connection management
- Handle token refresh automatically

**❌ Don't:**
- Create clients directly in controllers
- Hard-code connection parameters
- Mix admin and user client operations
- Ignore environment-specific behavior

### 2. Security Implementation

**✅ Do:**
- Enable RLS on all user data tables
- Implement double security (RLS + application filtering)
- Use proper foreign key constraints
- Validate user ownership in controllers

**❌ Don't:**
- Rely solely on application-level security
- Skip user_id filtering in queries
- Use admin client for regular operations
- Expose sensitive database functions

### 3. Vector Storage Optimization

**✅ Do:**
- Use appropriate vector indexes (HNSW for accuracy, IVF for speed)
- Implement proper dimension validation
- Create composite indexes for filtered searches
- Use security definer functions for controlled access

**❌ Don't:**
- Store vectors without proper indexing
- Use incorrect embedding dimensions
- Skip vector validation constraints
- Allow direct vector table access

### 4. Migration Management

**✅ Do:**
- Use sequential numbering for migrations
- Include descriptive names
- Test migrations in all environments
- Include both up and down migration paths

**❌ Don't:**
- Skip migration testing
- Use non-sequential numbering
- Include environment-specific data
- Modify existing migrations

### 5. Error Handling Strategy

**✅ Do:**
- Map Supabase errors to application errors
- Log errors with appropriate detail level
- Return user-friendly error messages
- Implement proper error classification

**❌ Don't:**
- Expose database error details to users
- Use generic error messages for specific issues
- Skip error logging for debugging
- Allow unhandled promise rejections

### 6. Testing Integration

**✅ Do:**
- Use real Supabase instances for integration tests
- Test environment-specific behavior
- Clean up test data properly
- Mock external dependencies only

**❌ Don't:**
- Use production database for testing
- Skip cleanup in test teardown
- Mock Supabase for integration tests
- Test only happy path scenarios

---

## Conclusion

This Supabase integration guide provides a comprehensive overview of the patterns and practices used throughout the trAIner application. The implementation emphasizes security, performance, and maintainability while leveraging Supabase's full feature set including authentication, database operations, real-time subscriptions, and vector storage capabilities.

For specific implementation examples, refer to the actual source files mentioned throughout this document. The patterns described here are extracted directly from the working codebase and represent proven approaches for production Supabase integration. 