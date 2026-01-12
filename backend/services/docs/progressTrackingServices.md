# Progress Tracking Services Documentation

## Overview
The progress tracking service layer manages all database operations and business logic for user check-in functionality, providing comprehensive data persistence, retrieval, and analytics calculation capabilities. This service layer acts as the primary interface between controllers and the database, implementing robust error handling, data validation, and metric computation algorithms.

**Primary Responsibilities:**
- Check-in data creation and validation with duplicate prevention
- Flexible check-in retrieval with filtering, sorting, and pagination
- Individual check-in record access with user ownership validation  
- Progress metrics calculation with statistical analysis capabilities
- Database transaction management and RLS token handling
- Comprehensive error handling and logging for all operations

## Service Methods

### storeCheckIn()
**File:** `services/check-in-service.js`
**Lines:** 15-56
**Purpose:** Creates a new check-in record for a user with comprehensive validation and data normalization

#### Method Signature
```javascript
async storeCheckIn(userId, data, jwtToken)
```

#### Parameters
- **userId** (string, required): The user's unique identifier for ownership validation
- **data** (object, required): Check-in data object containing measurements and wellness metrics
  - `date` (string, required): Check-in date in YYYY-MM-DD format
  - `weight` (number, optional): User's weight measurement
  - `body_fat_percentage` (number, optional): Body fat percentage (0-50 range)
  - `measurements` (object, optional): Body measurements (chest, waist, hips, etc.)
  - `mood` (integer, optional): Mood rating on 1-10 scale
  - `sleep_quality` (integer, optional): Sleep quality rating on 1-10 scale
  - `energy_level` (integer, optional): Energy level rating on 1-10 scale
  - `stress_level` (integer, optional): Stress level rating on 1-10 scale
  - `notes` (string, optional): Free-form text notes about the check-in
- **jwtToken** (string, required): JWT token for RLS enforcement and user context

#### Return Value
```javascript
{
  id: "uuid",                    // Generated check-in record ID
  user_id: "uuid",               // User identifier
  date: "YYYY-MM-DD",           // Check-in date
  weight: number|null,          // Weight measurement
  body_fat_percentage: number|null, // Body fat percentage
  measurements: object|null,    // Body measurements object
  mood: integer|null,           // Mood rating (1-10)
  sleep_quality: integer|null,  // Sleep quality rating (1-10)
  energy_level: integer|null,   // Energy level rating (1-10)
  stress_level: integer|null,   // Stress level rating (1-10)
  notes: string|null,           // User notes
  created_at: "timestamp",      // Record creation timestamp
  updated_at: "timestamp"       // Last update timestamp
}
```

#### Database Operations
- **Primary Table:** `user_check_ins`
- **Query Type:** INSERT with SELECT return
- **RLS Enforcement:** Yes, via JWT token context
- **Transaction:** Single atomic insert operation
- **Constraints:** 
  - User ownership enforcement (user_id matching)
  - Date uniqueness per user (one check-in per day)
  - Data type validation on wellness metrics
  - Range validation on percentage and rating fields

#### Error Handling
- **BadRequestError (400):** Missing userId or required date field
- **DatabaseError (500):** Database connection issues, constraint violations
- **ValidationError (422):** Date format errors, measurement range violations
- **ConflictError (409):** Duplicate check-in for same date (handled at database level)

#### Business Logic
- **Data Normalization:** Null values assigned to optional fields when not provided
- **Date Validation:** Implicit validation through database date column constraints
- **Duplicate Prevention:** Database unique constraint on (user_id, date) combination
- **Measurement Storage:** JSON object storage for flexible body measurement tracking
- **Logging:** Comprehensive error logging with user context for debugging

#### Usage Example
```javascript
const checkInData = {
  date: '2024-01-15',
  weight: 75.5,
  body_fat_percentage: 18.2,
  measurements: { waist: 32, chest: 40, hips: 38 },
  mood: 7,
  energy_level: 8,
  notes: 'Feeling strong today'
};

const result = await storeCheckIn(userId, checkInData, jwtToken);
```

---

### retrieveCheckIns()
**File:** `services/check-in-service.js`
**Lines:** 58-111
**Purpose:** Retrieves check-in records for a user with comprehensive filtering, sorting, and pagination support

#### Method Signature
```javascript
async retrieveCheckIns(userId, filters = {}, jwtToken)
```

#### Parameters
- **userId** (string, required): The user's unique identifier for data scoping
- **filters** (object, optional): Filtering and pagination options
  - `startDate` (string, optional): Start date filter in YYYY-MM-DD format
  - `endDate` (string, optional): End date filter in YYYY-MM-DD format
  - `limit` (integer, optional): Maximum records to return (default: 10)
  - `offset` (integer, optional): Number of records to skip for pagination (default: 0)
- **jwtToken** (string, required): JWT token for RLS enforcement and user context

#### Return Value
```javascript
{
  data: [
    {
      id: "uuid",
      user_id: "uuid",
      date: "YYYY-MM-DD",
      weight: number|null,
      body_fat_percentage: number|null,
      measurements: object|null,
      mood: integer|null,
      sleep_quality: integer|null,
      energy_level: integer|null,
      stress_level: integer|null,
      notes: string|null,
      created_at: "timestamp",
      updated_at: "timestamp"
    }
    // ... additional records
  ],
  pagination: {
    limit: integer,     // Applied limit value
    offset: integer,    // Applied offset value
    total: integer      // Total record count matching filters
  }
}
```

#### Database Operations
- **Primary Table:** `user_check_ins`
- **Query Type:** SELECT with filtering, sorting, and pagination
- **RLS Enforcement:** Yes, via JWT token context
- **Sorting:** Default DESC by date (most recent first)
- **Indexes:** Requires indexes on user_id, date for optimal performance
- **Query Optimization:** Range-based filtering with efficient pagination

#### Filtering Logic
- **Date Range Filtering:** Inclusive start and end date bounds using GTE/LTE operators
- **User Scoping:** All queries scoped to specific user via eq('user_id', userId)
- **Pagination:** Efficient range-based pagination with offset and limit
- **Default Behavior:** Returns empty array if no records found (graceful degradation)

#### Error Handling
- **BadRequestError (400):** Missing userId parameter
- **DatabaseError (500):** Database connection issues, query execution failures
- **ValidationError (422):** Invalid date format in filters
- **Performance Warnings:** Large date ranges may require background processing

#### Performance Considerations
- **Index Requirements:** Compound index on (user_id, date) for optimal query performance
- **Memory Usage:** Large result sets limited by pagination to prevent memory exhaustion
- **Caching Opportunities:** Results suitable for short-term caching (2-5 minutes)
- **Query Optimization:** Efficient range queries with minimal data scanning

#### Usage Example
```javascript
const filters = {
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  limit: 20,
  offset: 0
};

const result = await retrieveCheckIns(userId, filters, jwtToken);
```

---

### retrieveCheckIn()
**File:** `services/check-in-service.js`
**Lines:** 113-150
**Purpose:** Retrieves a specific check-in record by ID with user ownership validation and comprehensive error handling

#### Method Signature
```javascript
async retrieveCheckIn(checkInId, userId, jwtToken)
```

#### Parameters
- **checkInId** (string, required): Unique identifier for the specific check-in record
- **userId** (string, required): User identifier for ownership validation and RLS enforcement
- **jwtToken** (string, required): JWT token for database authentication and context

#### Return Value
```javascript
{
  id: "uuid",                    // Check-in record identifier
  user_id: "uuid",               // User identifier (matches input userId)
  date: "YYYY-MM-DD",           // Check-in date
  weight: number|null,          // Weight measurement
  body_fat_percentage: number|null, // Body fat percentage
  measurements: object|null,    // Body measurements object
  mood: integer|null,           // Mood rating (1-10)
  sleep_quality: integer|null,  // Sleep quality rating (1-10)
  energy_level: integer|null,   // Energy level rating (1-10)
  stress_level: integer|null,   // Stress level rating (1-10)
  notes: string|null,           // User notes
  created_at: "timestamp",      // Record creation timestamp
  updated_at: "timestamp"       // Last update timestamp
}
```

#### Database Operations
- **Primary Table:** `user_check_ins`
- **Query Type:** SELECT single record with dual-key lookup
- **RLS Enforcement:** Yes, via JWT token context
- **Query Pattern:** Compound WHERE clause on id AND user_id for security
- **Performance:** Single row lookup with primary key access

#### Security Implementation
- **Ownership Validation:** Explicit user_id matching in WHERE clause prevents cross-user access
- **RLS Double-Check:** Database RLS policies provide additional security layer
- **Error Masking:** NotFoundError for both missing records and unauthorized access attempts
- **Audit Trail:** All access attempts logged with user context for security monitoring

#### Error Handling
- **BadRequestError (400):** Missing checkInId or userId parameters
- **NotFoundError (404):** Check-in record not found or user doesn't have access
- **DatabaseError (500):** Database connection issues, query execution failures
- **SecurityError (403):** Cross-user access attempts (masked as NotFoundError)

#### Access Control Logic
- **Primary Security:** Compound query ensures user can only access their own records
- **Secondary Security:** RLS policies at database level provide defense-in-depth
- **Error Consistency:** Same error response for missing records and access violations
- **Logging Security:** Failed access attempts logged for security analysis

#### Usage Example
```javascript
const checkInRecord = await retrieveCheckIn(checkInId, userId, jwtToken);

// Access specific fields
const userWeight = checkInRecord.weight;
const checkInDate = checkInRecord.date;
const userNotes = checkInRecord.notes;
```

---

### computeMetrics()
**File:** `services/check-in-service.js`
**Lines:** 152-195
**Purpose:** Computes comprehensive progress metrics based on user check-in data over specified time periods with statistical analysis

#### Method Signature
```javascript
async computeMetrics(userId, dateRange, jwtToken)
```

#### Parameters
- **userId** (string, required): User identifier for data scoping and ownership validation
- **dateRange** (object, required): Time period specification for metrics calculation
  - `startDate` (string, required): Period start date in YYYY-MM-DD format
  - `endDate` (string, required): Period end date in YYYY-MM-DD format (must be after startDate)
- **jwtToken** (string, required): JWT token for RLS enforcement and database authentication

#### Return Value
```javascript
{
  message: "Metrics calculated successfully",
  data: {
    period: {
      startDate: "YYYY-MM-DD",     // Calculation period start
      endDate: "YYYY-MM-DD",       // Calculation period end  
      totalDays: integer           // Total days in period
    },
    weightChange: {
      absolute: number,            // Absolute weight change
      percent: number              // Percentage weight change
    } | null,
    bodyFatChange: {
      absolute: number,            // Absolute body fat change
      percent: number              // Percentage body fat change
    } | null,
    measurementChanges: {
      [measurementName]: {
        absolute: number,          // Absolute measurement change
        percent: number            // Percentage measurement change
      }
      // ... for each body measurement type
    },
    checkInCount: integer,         // Total check-ins in period
    averages: {
      weight: number|null,         // Average weight over period
      bodyFat: number|null,        // Average body fat over period
      energyLevel: number|null,    // Average energy level (1-10)
      stressLevel: number|null     // Average stress level (1-10)
    }
  }
}
```

#### Database Operations
- **Primary Table:** `user_check_ins`
- **Query Type:** SELECT with date range filtering and chronological ordering
- **RLS Enforcement:** Yes, via JWT token context
- **Data Processing:** In-memory statistical calculations on retrieved dataset
- **Ordering:** Ascending by date for proper first/last comparison calculations

#### Calculation Algorithms
- **Change Calculation:** Absolute and percentage changes between first and last measurements
- **Null Handling:** Graceful handling when measurements are missing at start or end of period
- **Percentage Logic:** Prevents division by zero with appropriate fallback calculations
- **Precision:** All calculations rounded to 2 decimal places for consistency
- **Averaging:** Excludes null values from average calculations to ensure accuracy

#### Statistical Methods
```javascript
// Change calculation helper
calculateChange(start, end) {
  absolute: end - start,
  percent: (change / start) * 100
}

// Measurement changes across object properties
calculateMeasurementChanges(startMeasurements, endMeasurements) {
  // Iterates through measurement types and calculates individual changes
}

// Averages calculation with null exclusion
calculateAverages(checkIns) {
  // Calculates mean values excluding null entries for each metric
}
```

#### Error Handling
- **BadRequestError (400):** Missing userId or incomplete dateRange object
- **DatabaseError (500):** Database connection issues, query execution failures
- **InsufficientDataError (422):** No check-in data available for specified period
- **ValidationError (422):** Invalid date range (end date before start date)

#### Business Logic Features
- **Graceful Degradation:** Returns structured response even when no data is available
- **Data Quality Indicators:** Check-in count provides context for metric reliability
- **Flexible Metrics:** Only calculates metrics for available data types
- **Period Context:** Includes period length for trend analysis context

#### Performance Considerations
- **Data Loading:** Retrieves full dataset for in-memory processing (efficient for typical date ranges)
- **Memory Usage:** Reasonable memory footprint for typical user check-in volumes
- **Caching Opportunity:** Results highly cacheable with invalidation on new check-ins
- **Computational Complexity:** O(n) processing where n is number of check-ins in period

#### Usage Example
```javascript
const dateRange = {
  startDate: '2024-01-01',
  endDate: '2024-01-31'
};

const metrics = await computeMetrics(userId, dateRange, jwtToken);

// Access calculated metrics
const weightLoss = metrics.data.weightChange.absolute;
const bodyFatReduction = metrics.data.bodyFatChange.percent;
const averageEnergyLevel = metrics.data.averages.energyLevel;
```

---

## Helper Functions

### calculateChange()
**File:** `services/check-in-service.js`
**Lines:** 197-210
**Purpose:** Utility function for calculating absolute and percentage changes between two numerical values

#### Implementation Details
- **Null Handling:** Returns null when either start or end value is null/undefined
- **Zero Division Protection:** Handles cases where start value is zero
- **Precision:** Rounds results to 2 decimal places for consistent formatting
- **Return Format:** Object with `absolute` and `percent` properties

#### Usage Pattern
```javascript
const change = calculateChange(startWeight, endWeight);
// Returns: { absolute: 2.5, percent: 3.45 }
```

### calculateMeasurementChanges()
**File:** `services/check-in-service.js`
**Lines:** 212-226
**Purpose:** Processes body measurement objects to calculate changes across multiple measurement types

#### Implementation Details
- **Object Iteration:** Processes all measurement types present in start measurements
- **Key Matching:** Only calculates changes for measurements present in both start and end objects
- **Dynamic Processing:** Handles arbitrary measurement types without hardcoding
- **Null Safety:** Gracefully handles missing measurement objects

#### Usage Pattern
```javascript
const startMeasurements = { waist: 32, chest: 40, hips: 38 };
const endMeasurements = { waist: 30, chest: 41, hips: 37 };
const changes = calculateMeasurementChanges(startMeasurements, endMeasurements);
// Returns: { waist: { absolute: -2, percent: -6.25 }, ... }
```

### calculateAverages()
**File:** `services/check-in-service.js`
**Lines:** 228-277
**Purpose:** Computes average values across all check-ins in a dataset with proper null value handling

#### Implementation Details
- **Null Exclusion:** Excludes null/undefined values from average calculations
- **Multiple Metrics:** Calculates averages for weight, body fat, energy level, and stress level
- **Running Totals:** Uses sum/count pattern for memory-efficient average calculation
- **Precision:** Rounds final averages to 2 decimal places

#### Metrics Calculated
- **weight:** Average weight across all non-null weight measurements
- **bodyFat:** Average body fat percentage across all non-null measurements
- **energyLevel:** Average energy level rating (1-10 scale)
- **stressLevel:** Average stress level rating (1-10 scale)

#### Usage Pattern
```javascript
const checkIns = [/* array of check-in records */];
const averages = calculateAverages(checkIns);
// Returns: { weight: 75.3, bodyFat: 18.7, energyLevel: 7.2, stressLevel: 4.1 }
```

---

## Service Integration

### Database Dependencies
- **Primary Table:** `user_check_ins` with full CRUD operations
- **Foreign Key:** `user_id` references `users.id` table
- **Indexes Required:** 
  - Compound index on `(user_id, date)` for efficient filtering
  - Individual index on `user_id` for ownership queries
  - Date index for range queries and sorting operations

### RLS (Row Level Security) Implementation
- **Token-Based Access:** All operations use JWT token for user context
- **Policy Enforcement:** Database-level policies ensure users only access their own data
- **Defense in Depth:** Service-level user_id filtering combined with RLS policies
- **Error Masking:** Unauthorized access attempts return consistent NotFoundError responses

### Caching Integration
- **Individual Records:** 5-minute cache TTL for single check-in lookups
- **Lists with Filters:** 2-minute cache TTL with user-specific cache keys
- **Metrics Calculations:** 30-minute cache TTL with invalidation on new check-ins
- **Cache Keys:** Include user_id and relevant parameters for proper isolation

### Analytics Pipeline Integration  
- **Real-time Updates:** New check-ins trigger analytics recalculation workflows
- **Trend Analysis:** Metrics calculations feed into broader user analytics
- **Goal Progress:** Weight and body composition changes integrate with user goal tracking
- **Health Insights:** Long-term trend data enables personalized health recommendations

### Error Handling Philosophy
- **Graceful Degradation:** Always return structured responses, even for edge cases
- **Comprehensive Logging:** All errors logged with full context for debugging
- **User-Friendly Messages:** Error messages appropriate for frontend display
- **Security-First:** Error responses never expose internal system details

### Performance Optimization
- **Query Efficiency:** Single-query operations where possible to minimize database round trips
- **Index Strategy:** Comprehensive indexing strategy for common query patterns
- **Memory Management:** Efficient data processing for large date ranges
- **Background Processing:** Consider async processing for computationally expensive operations

## Testing Considerations

### Unit Testing Requirements
- **Method Coverage:** All public methods require comprehensive unit test coverage
- **Error Scenarios:** Test all error conditions and edge cases
- **Parameter Validation:** Verify proper handling of invalid inputs
- **Helper Functions:** Individual testing of all calculation helper functions

### Integration Testing Requirements  
- **Database Operations:** Test actual database interactions with test data
- **RLS Enforcement:** Verify user isolation works correctly in database
- **Performance Testing:** Validate query performance with realistic data volumes
- **Concurrent Access:** Test service behavior under concurrent user operations

### Mock Strategy
- **Database Mocking:** Mock Supabase client for isolated unit testing
- **JWT Token Mocking:** Mock token validation for testing different user contexts
- **Error Simulation:** Mock database errors to test error handling paths
- **Performance Simulation:** Mock slow queries to test timeout handling

---

## Future Enhancement Opportunities

### Analytics Enhancement
- **Trend Prediction:** Machine learning integration for progress predictions
- **Goal Correlation:** Advanced analysis of goal achievement patterns  
- **Health Correlations:** Cross-metric analysis for health insights
- **Comparative Analysis:** Anonymous population comparisons for benchmarking

### Performance Optimization
- **Background Processing:** Async metrics calculation for complex analyses
- **Materialized Views:** Pre-computed metrics tables for instant access
- **Query Optimization:** Advanced database query optimization and caching
- **Read Replicas:** Separate read/write operations for better performance

### Feature Extensions
- **Data Export:** CSV/Excel export functionality for user data
- **Photo Integration:** Progress photo storage and comparison features
- **Reminder System:** Smart check-in reminders based on user patterns  
- **Social Features:** Optional data sharing and progress comparison features