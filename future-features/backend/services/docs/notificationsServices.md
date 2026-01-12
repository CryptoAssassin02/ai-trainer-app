# Notifications Services Documentation

## Overview
The Notifications Service provides the core business logic for notification preference management and test functionality. This service handles Supabase database operations with Row Level Security (RLS), implements comprehensive error handling, and manages notification channel testing. The service ensures data isolation, proper authentication, and robust database operations for user notification preferences.

## Service Architecture

### Notification Service (`backend/services/notification-service.js`)
**File:** `services/notification-service.js`
**Lines:** 1-164
**Pattern:** Functional service with JWT-based Supabase client initialization

#### Dependencies
- `@supabase/supabase-js` - Database client for Supabase operations
- `logger` - Application logging for debugging and monitoring
- `DatabaseError, NotFoundError` - Custom error classes from utilities

## Core Service Methods

### getSupabaseClient Function
**File:** `services/notification-service.js`
**Lines:** 16-37
**Purpose:** Initialize authenticated Supabase client with JWT for RLS

#### Function Signature
```javascript
function getSupabaseClient(jwtToken)
```

#### Parameters
- `jwtToken` (string) - JWT token for user authentication and RLS

#### Configuration Validation
**Environment Variables Required:**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon/public key

#### Client Configuration
```javascript
return createClient(supabaseUrl, supabaseKey, {
  global: { headers: { Authorization: `Bearer ${jwtToken}` } }
});
```

#### Error Handling
- **Missing Environment Variables:** Throws "Supabase configuration is missing"
- **Missing JWT Token:** Throws "Authentication token is required"
- **Logging:** Error messages for configuration issues

#### Security Features
- **RLS Enforcement:** JWT token in Authorization header enables Row Level Security
- **User Isolation:** Database operations scoped to authenticated user
- **Configuration Validation:** Prevents service startup with missing credentials

---

### storePreferences Method
**File:** `services/notification-service.js`
**Lines:** 50-92
**Purpose:** Store or update notification preferences with upsert functionality

#### Function Signature
```javascript
async function storePreferences(userId, prefsData, jwtToken)
```

#### Parameters
- `userId` (string) - User UUID identifier
- `prefsData` (object) - Notification preference data
- `jwtToken` (string) - JWT token for authentication

#### Preferences Data Structure
```javascript
{
  email_enabled?: boolean,
  sms_enabled?: boolean,
  push_enabled?: boolean,
  in_app_enabled?: boolean,
  quiet_hours_start?: string,  // HH:MM format
  quiet_hours_end?: string     // HH:MM format
}
```

#### Database Operation
**Table:** `notification_preferences`
**Operation:** UPSERT with conflict resolution
**Conflict Handling:** `onConflict: 'user_id'` (update if user preferences exist)
**Return:** Complete preference record with timestamps

#### SQL Operation Pattern
```javascript
const { data, error } = await supabase
  .from('notification_preferences')
  .upsert({ 
    user_id: userId,
    ...prefsData,
    updated_at: new Date().toISOString()
  }, { 
    onConflict: 'user_id',
    returning: 'representation'
  });
```

#### Response Structure
Returns first element of data array containing:
- `id` - UUID primary key
- `user_id` - User UUID
- All preference fields
- `created_at` - Timestamp
- `updated_at` - Current timestamp

#### Error Handling
- **Database Errors:** Wrapped in `DatabaseError` with context
- **Logging:** Error and success logging with user context
- **Propagation:** Service errors bubble up to controller layer

---

### retrievePreferences Method
**File:** `services/notification-service.js`
**Lines:** 101-136
**Purpose:** Retrieve user notification preferences with graceful missing data handling

#### Function Signature
```javascript
async function retrievePreferences(userId, jwtToken)
```

#### Parameters
- `userId` (string) - User UUID identifier
- `jwtToken` (string) - JWT token for authentication

#### Database Operation
**Table:** `notification_preferences`
**Operation:** SELECT with single record expectation
**Filter:** `user_id = userId` (RLS ensures user isolation)

#### SQL Operation Pattern
```javascript
const { data, error } = await supabase
  .from('notification_preferences')
  .select('*')
  .eq('user_id', userId)
  .single();
```

#### Special Error Handling
**PGRST116 Error Code:** "No rows returned" from PostgREST
- **Behavior:** Returns empty object `{}` for new users
- **Rationale:** Graceful handling of users who haven't set preferences
- **Logging:** Info-level message for missing preferences

#### Response Structure
**Existing User:** Complete preference object with all fields
**New User:** Empty object `{}` (controller applies defaults)

#### Error Handling
- **No Records Found:** Returns empty object (not an error)
- **Database Errors:** Wrapped in `DatabaseError` with context
- **Logging:** Success and error logging with user context

---

### sendTestNotification Method
**File:** `services/notification-service.js`
**Lines:** 145-164
**Purpose:** Send test notification (MVP mock implementation)

#### Function Signature
```javascript
async function sendTestNotification(userId, channel, jwtToken)
```

#### Parameters
- `userId` (string) - User UUID identifier
- `channel` (string) - Notification channel ('email', 'sms', 'push', 'in_app')
- `jwtToken` (string) - JWT token for authentication

#### MVP Implementation Details
**Current Behavior:** Mock implementation for testing
**Logging Pattern:** Console log with mock notification format
```javascript
console.log(`[MOCK ${channel.toUpperCase()}]: Test notification for user ${userId}`);
```

#### Channel Preference Check
1. **Retrieve User Preferences:** Calls `retrievePreferences(userId, jwtToken)`
2. **Check Channel Status:** Verifies if `{channel}_enabled` is true/false
3. **Warning Generation:** Adds warning if channel is disabled

#### Response Structure
```javascript
{
  success: boolean,
  message: string  // Includes channel status warning if applicable
}
```

#### Message Generation Logic
- **Base Message:** `"Test {channel} notification logged"`
- **Disabled Warning:** `" (Note: {channel} notifications are currently disabled in your preferences)"`

#### Error Handling
- **Service Errors:** Generic error wrapping for test failures
- **Logging:** Debug logging for test operations

## Database Integration Patterns

### Table Schema Alignment
**Table:** `notification_preferences`
**Primary Key:** `id` (UUID)
**Foreign Key:** `user_id` references `auth.users(id)`
**Unique Constraint:** `user_id` (one preference record per user)

### Field Validation
**Database Constraints:**
- `quiet_hours_start`: CHECK constraint with HH:MM pattern validation
- `quiet_hours_end`: CHECK constraint with HH:MM pattern validation
- **Pattern:** `^([01][0-9]|2[0-3]):[0-5][0-9]$`

### RLS Security Model
**Policies Applied:**
- Users can only access their own notification preferences
- INSERT/UPDATE/SELECT operations filtered by `auth.uid() = user_id`
- Cross-user access prevented at database level

### Automatic Triggers
**Updated Timestamp:** `update_notification_preferences_updated_at` trigger
- **Executes:** BEFORE UPDATE operations
- **Action:** Sets `updated_at = NOW()`
- **Purpose:** Automatic timestamp management

## Error Classification and Handling

### Custom Error Types
**DatabaseError:** Database operation failures
- **Usage:** Wrapping Supabase errors with context
- **Propagation:** Bubbles to controller for standard HTTP responses

**Configuration Errors:** Environment and setup issues
- **Usage:** Missing Supabase configuration or JWT tokens
- **Handling:** Immediate failure with descriptive messages

### Error Response Patterns
**Database Errors:**
```javascript
throw new DatabaseError(`Failed to {operation}: ${error.message}`);
```

**Configuration Errors:**
```javascript
throw new Error('Supabase configuration is missing.');
```

### Logging Strategy
**Debug Level:** Operational logging with user context
**Error Level:** Exception logging with full error details
**Info Level:** Success operations and business logic outcomes

## Performance Characteristics

### Database Operation Efficiency
**Single Query Operations:** All methods use single database queries
**Index Usage:** `idx_notification_preferences_user_id` for fast user lookups
**RLS Overhead:** Minimal due to indexed user_id filtering

### Response Time Expectations
- **storePreferences:** < 100ms (upsert operation)
- **retrievePreferences:** < 50ms (indexed SELECT)
- **sendTestNotification:** < 10ms (mock implementation)

### Memory Usage
**Stateless Operations:** No persistent state between calls
**JWT Token Scope:** Client instances created per request
**Garbage Collection:** Automatic cleanup of Supabase clients

## Security Implementation

### Authentication Requirements
**JWT Token Validation:** Required for all operations
**RLS Enforcement:** Database-level security via authenticated user context
**Cross-User Prevention:** Impossible due to RLS policies

### Data Sanitization
**Input Validation:** Handled at middleware/controller layers
**SQL Injection Prevention:** Supabase ORM prevents direct SQL construction
**Output Sanitization:** No sensitive data in preference records

### Privacy Considerations
**Data Scope:** Only notification preferences stored
**User Isolation:** Complete isolation via RLS
**No PII Storage:** Preferences contain only boolean and time values

## Integration Patterns

### Service Layer Architecture
**Controller Dependencies:** Called by notification controller methods
**Error Propagation:** Standardized error bubbling to HTTP layer
**Response Transformation:** Raw database objects returned (controller adds defaults)

### Future Extension Points
**Actual Notification Services:** Mock test method ready for real implementation
**Additional Channels:** Schema supports new channel types via additional boolean fields
**Scheduling:** Quiet hours fields ready for notification scheduling logic
**Audit Trail:** Database structure supports comprehensive logging