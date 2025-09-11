# Nutrition & Macros Feature Documentation

## Feature Overview
Complete nutrition management system providing macro calculation, meal planning, dietary preference management, and food logging capabilities. The feature integrates AI-powered nutrition planning with scientific calculation methods, supporting both metric and imperial units while maintaining comprehensive user profiles and preferences.

**Primary Components:**
- **Routes:** 10 endpoints across nutrition.js (6 endpoints) and macros.js (4 endpoints) route files
- **Controllers:** 6 controller methods handling HTTP requests and business logic  
- **Services:** 2 service modules for nutrition data operations and macro calculations
- **AI Agent:** 1 specialized nutrition agent for intelligent meal planning and recommendations
- **Database Tables:** nutrition_plans, dietary_preferences, meal_logs, macros_storage

**Key Capabilities:**
- Scientific BMR/TDEE calculations using Mifflin-St Jeor equation
- AI-powered meal planning with dietary restriction consideration
- Comprehensive food suggestion system with categorization
- Meal logging with macro tracking and aggregation
- Unit conversion support (metric/imperial)
- Dietary preference management and storage
- Progress tracking and nutritional analysis

---

## API Endpoints Reference

### Authentication Requirements
**All endpoints require:**
- JWT Bearer token in Authorization header
- Valid user session with req.user.id populated by auth middleware
- RLS (Row Level Security) enforcement for data isolation

### Rate Limiting
- **Nutrition Plan Generation:** 10 requests/hour per user
- **Macro Calculations:** 5 requests/hour per user (production), 100/minute (test)
- **Standard Operations:** 20 requests per 15 minutes (production), 100/minute (test)
- **Meal Logging:** Standard rate limits apply

---

## Route Definitions

### POST /v1/nutrition/calculate
**Purpose:** Calculate personalized nutrition plan with meal suggestions
**File:** `routes/nutrition.js` (Line 20)
**Rate Limiting:** Standard rate limits applied
**Middleware:** `authenticate` (JWT token validation)
**OpenAPI Reference:** `/docs/paths/nutritionMacros/nutrition_calculate.yaml`

**Request Processing:**
- Validates user authentication and extracts userId from JWT
- Passes goals and activityLevel to nutrition controller
- Triggers AI agent processing for comprehensive nutrition planning

**Response Handling:**
- Returns structured nutrition plan with BMR/TDEE calculations
- Includes AI-generated meal plans and food suggestions
- Provides scientific explanations and rationale

**Error Scenarios:**
- 401: Invalid or missing JWT token
- 400: Invalid goals array or activity level
- 429: Rate limit exceeded
- 500: AI generation failure or database errors

---

### POST /v1/macros/
**Purpose:** Store calculated macro values for user tracking
**File:** `routes/macros.js` (Line 44)
**Rate Limiting:** Standard rate limits applied (20 per 15 minutes)
**Middleware:** `authenticate`, `standardLimiter`
**OpenAPI Reference:** `/docs/paths/nutritionMacros/macros_store.yaml`

**Request Processing:**
- Validates macro data structure using built-in validation
- Ensures all required macro fields are present (protein, carbs, fat, calories)
- Processes unit conversions if necessary

**Response Handling:**
- Returns storage confirmation with macro ID
- Includes timestamp and user association
- Provides validation success indicators

**Error Scenarios:**
- 400: Invalid macro data or missing required fields
- 401: Authentication failure
- 409: Duplicate macro entry conflict
- 429: Rate limit exceeded
- 500: Database storage failure

---

### GET /v1/macros/
**Purpose:** List all macro entries for authenticated user
**File:** `routes/macros.js` (Line 55)
**Rate Limiting:** Standard rate limits applied
**Middleware:** `authenticate`, `standardLimiter`
**OpenAPI Reference:** `/docs/paths/nutritionMacros/macros_list.yaml`

**Query Parameters:**
- `limit`: Number of entries to return (default: 50, max: 100)
- `offset`: Number of entries to skip for pagination
- `sortBy`: Sort field (createdAt, calories, protein)
- `order`: Sort direction (asc, desc)

**Request Processing:**
- Applies user-specific filtering via RLS
- Handles pagination and sorting parameters
- Performs unit conversions for display

**Response Handling:**
- Returns paginated list of macro entries
- Includes metadata for pagination navigation
- Provides summary statistics if requested

**Error Scenarios:**
- 400: Invalid query parameters
- 401: Authentication failure
- 429: Rate limit exceeded
- 500: Database query failure

---

### GET /v1/macros/latest
**Purpose:** Retrieve most recent macro entry for authenticated user
**File:** `routes/macros.js` (Line 60)
**Rate Limiting:** Standard rate limits applied
**Middleware:** `authenticate`, `standardLimiter`
**OpenAPI Reference:** `/docs/paths/nutritionMacros/macros_latest.yaml`

**Request Processing:**
- Validates user authentication and applies RLS filtering
- Retrieves most recent macro entry by timestamp
- Handles unit conversion based on user preferences

**Response Handling:**
- Returns latest macro entry with calculations
- Includes creation/update timestamps
- Provides related meal plan references if applicable

**Error Scenarios:**
- 404: No macro entries found for user
- 401: Authentication failure
- 429: Rate limit exceeded
- 500: Database retrieval error

---

### PUT /v1/macros/:planId
**Purpose:** Update existing macro entry
**File:** `routes/macros.js` (Line 67)
**Rate Limiting:** Standard rate limits applied
**Middleware:** `authenticate`, `standardLimiter`
**OpenAPI Reference:** `/docs/paths/nutritionMacros/macros_update.yaml`

**Path Parameters:**
- `planId`: UUID of the macro plan to update

**Request Processing:**
- Validates ownership and update permissions
- Applies macro validation rules
- Handles partial updates with merge logic

**Response Handling:**
- Returns updated macro entry
- Includes modification timestamp
- Provides change summary if requested

**Error Scenarios:**
- 404: Macro entry not found
- 400: Invalid update data
- 403: Insufficient permissions
- 429: Rate limit exceeded
- 500: Database update failure

---

### POST /v1/nutrition/meal-log
**Purpose:** Log meal consumption with macro tracking
**File:** `routes/nutrition.js` (Line 43)
**Rate Limiting:** Standard rate limits applied
**Middleware:** `authenticate`
**OpenAPI Reference:** `/docs/paths/nutritionMacros/meal_log.yaml`

**Request Processing:**
- Validates meal data structure and macro information
- Associates meal with nutrition plan if applicable
- Handles portion size calculations and conversions

**Response Handling:**
- Returns meal log entry with calculated totals
- Includes daily progress towards macro targets
- Provides meal timing and frequency analysis

**Error Scenarios:**
- 400: Invalid meal data or macro information
- 401: Authentication failure
- 429: Rate limit exceeded
- 500: Database logging error

---

### GET /v1/nutrition/meal-log
**Purpose:** Retrieve meal logs with filtering options
**File:** `routes/nutrition.js` (Line 51)
**Rate Limiting:** Standard rate limits applied
**Middleware:** `authenticate`
**OpenAPI Reference:** `/docs/paths/nutritionMacros/meal_logs_list.yaml`

**Query Parameters:**
- `startDate`: Filter logs from specific date (YYYY-MM-DD)
- `endDate`: Filter logs to specific date (YYYY-MM-DD)
- `mealType`: Filter by meal type (breakfast, lunch, dinner, snack)
- `limit`: Number of logs to return
- `offset`: Pagination offset

**Request Processing:**
- Applies date range filtering and meal type selection
- Aggregates macro totals for specified periods
- Handles timezone considerations for date filtering

**Response Handling:**
- Returns filtered meal logs with aggregated data
- Includes daily/weekly macro summaries
- Provides trend analysis data if requested

**Error Scenarios:**
- 400: Invalid date range or filter parameters
- 401: Authentication failure
- 429: Rate limit exceeded
- 500: Database query error

---

### GET /v1/nutrition/
**Purpose:** Get user's current nutrition plan
**File:** `routes/nutrition.js` (Line 26)
**Rate Limiting:** Standard rate limits applied
**Middleware:** `authenticate`
**OpenAPI Reference:** `/docs/paths/nutritionMacros/nutrition_plan_get.yaml`

**Request Processing:**
- Validates user authentication and retrieves current nutrition plan
- Handles unit conversions for display preferences
- Implements efficient data retrieval with related data inclusion

**Response Handling:**
- Returns complete nutrition plan with all components
- Includes AI reasoning and scientific explanations
- Provides usage statistics and adherence data

**Error Scenarios:**
- 404: Nutrition plan not found or access denied
- 401: Authentication failure
- 429: Rate limit exceeded
- 500: Database retrieval error

---

### GET /v1/nutrition/preferences
**Purpose:** Get user's dietary preferences
**File:** `routes/nutrition.js` (Line 31)
**Rate Limiting:** Standard rate limits applied
**Middleware:** `authenticate`
**OpenAPI Reference:** `/docs/paths/nutritionMacros/dietary_preferences_get.yaml`

**Request Processing:**
- Validates user authentication and retrieves dietary preferences
- Applies RLS filtering for data security
- Handles preference defaults for missing data

**Response Handling:**
- Returns complete dietary preference configuration
- Includes food restrictions, allergies, and meal timing preferences
- Provides preference update timestamps

**Error Scenarios:**
- 404: Dietary preferences not found (returns defaults)
- 401: Authentication failure
- 429: Rate limit exceeded
- 500: Database retrieval error

---

### POST /v1/nutrition/preferences
**Purpose:** Update user's dietary preferences
**File:** `routes/nutrition.js` (Line 37)
**Rate Limiting:** Standard rate limits applied
**Middleware:** `authenticate`
**OpenAPI Reference:** `/docs/paths/nutritionMacros/dietary_preferences_update.yaml`

**Request Processing:**
- Validates preference data structure and content
- Handles partial updates while preserving existing preferences
- Validates food restriction and allergy data

**Response Handling:**
- Returns updated dietary preferences configuration
- Includes modification timestamps
- Provides validation confirmation

**Error Scenarios:**
- 400: Invalid preference data or structure
- 401: Authentication failure
- 429: Rate limit exceeded
- 500: Database update failure

---

## Controller Layer Implementation

### Nutrition Controller Methods

#### calculateMacros()
**File:** `controllers/nutrition.js` (Line 24)
**Route Handler:** POST /v1/nutrition/calculate

**Request Processing:**
- Extracts and validates `goals` and `activityLevel` from request body
- Validates user authentication via `req.user.id` with comprehensive error handling
- Performs input sanitization to prevent injection attacks

**Business Logic Flow:**
1. **User Profile Validation**
   - Fetches complete user profile from database
   - Validates essential fields (age, weight, height, gender)
   - Handles missing profile data with appropriate error responses

2. **Nutrition Service Integration**
   - Calls `nutritionService.generateNutritionPlan(userId, goals, activityLevel, req.jwtToken)`
   - Passes JWT token for RLS-enabled database operations
   - Handles service-level validation and business rule enforcement

3. **AI Agent Processing**
   - Service layer invokes NutritionAgent for comprehensive planning
   - Integrates scientific calculations with AI-powered meal suggestions
   - Handles response variations and fallback scenarios

**Response Formatting:**
- **Success (200):** Complete nutrition plan with calculations and recommendations
- **Validation Error (400):** Specific field-level error details with correction guidance
- **Authentication Error (401):** Token validation failure with re-authentication prompt
- **Server Error (500):** Internal processing error with tracking ID for debugging

**Error Handling Patterns:**
- Implements comprehensive try-catch with specific error type handling
- Logs errors with context for debugging while sanitizing sensitive data
- Provides user-friendly error messages with actionable guidance
- Maintains error tracking for pattern analysis and system monitoring

**Integration Points:**
- **Nutrition Service:** Primary business logic integration with comprehensive error handling
- **Auth Middleware:** JWT validation with user context population
- **Response Utilities:** Consistent response formatting across all endpoints
- **Error Middleware:** Centralized error processing and logging

---

#### logMeal()
**File:** `controllers/nutrition.js` (Line 67)
**Route Handler:** POST /v1/nutrition/meal/log

**Request Processing:**
- Extracts meal data including food items, portions, and macro information
- Validates meal timing and type consistency (breakfast, lunch, dinner, snack)
- Performs comprehensive data validation using Joi schemas

**Business Logic Flow:**
1. **Meal Data Validation**
   - Validates food items, portion sizes, and macro calculations
   - Ensures data consistency between food items and calculated macros
   - Handles unit conversions for portion sizes and nutrients

2. **Nutrition Plan Association**
   - Links meal log to active nutrition plan if applicable
   - Calculates progress towards daily macro targets
   - Handles plan adherence tracking and analysis

3. **Database Storage**
   - Stores meal log with complete macro breakdown
   - Updates daily aggregates and progress tracking
   - Maintains meal frequency and timing analysis

**Response Formatting:**
- **Success (201):** Meal log confirmation with daily progress update
- **Validation Error (400):** Detailed validation failure information
- **Authentication Error (401):** Access denied with authentication guidance

**Error Handling:**
- Handles duplicate meal log prevention with timestamp validation
- Manages database constraints and foreign key relationships
- Provides detailed validation error messages for user guidance

---

#### getMealLogs()
**File:** `controllers/nutrition.js` (Line 110)
**Route Handler:** GET /v1/nutrition/meal/logs

**Request Processing:**
- Processes query parameters for filtering (date range, meal type, pagination)
- Validates date formats and range constraints
- Handles timezone considerations for accurate date filtering

**Business Logic Flow:**
1. **Query Parameter Processing**
   - Validates and sanitizes all query parameters
   - Sets default values for pagination and sorting
   - Handles timezone conversion for accurate date filtering

2. **Data Retrieval and Aggregation**
   - Fetches filtered meal logs with efficient database queries
   - Calculates daily/weekly macro summaries
   - Provides trend analysis data for progress tracking

3. **Response Optimization**
   - Implements efficient pagination for large datasets
   - Includes aggregated statistics in response headers
   - Optimizes data transfer with selective field inclusion

**Response Formatting:**
- **Success (200):** Paginated meal logs with aggregation data
- **No Content (204):** Valid request but no logs found for criteria
- **Bad Request (400):** Invalid query parameters with correction guidance

---

#### getNutritionPlan()
**File:** `controllers/nutrition.js` (Line 153)
**Route Handler:** GET /v1/nutrition/plan/:id

**Request Processing:**
- Validates nutrition plan ID format and user ownership
- Handles unit preference conversion for display consistency
- Implements efficient data retrieval with related data inclusion

**Business Logic Flow:**
1. **Plan Ownership Validation**
   - Verifies user has access to requested nutrition plan
   - Handles RLS enforcement at application level
   - Provides appropriate access denied responses

2. **Complete Plan Retrieval**
   - Fetches nutrition plan with all related components
   - Includes AI reasoning and scientific explanations
   - Handles deprecated plan versions and migrations

3. **Data Enhancement**
   - Adds usage statistics and adherence metrics
   - Includes related meal logs and progress data
   - Provides plan effectiveness analysis

**Response Formatting:**
- **Success (200):** Complete nutrition plan with enhancements
- **Not Found (404):** Plan not found or access denied
- **Server Error (500):** Data retrieval or processing error

---

### Macro Controller Methods

#### storeMacros()
**File:** `controllers/macros.js` (Line 18)
**Route Handler:** POST /v1/macros/store

**Request Processing:**
- Validates complete macro data structure (protein, carbs, fat, calories)
- Ensures data consistency and mathematical accuracy
- Handles unit conversions and normalization

**Business Logic Flow:**
1. **Data Validation and Sanitization**
   - Validates all macro values for realistic ranges
   - Ensures mathematical consistency (macros sum to calories)
   - Handles precision and rounding for accurate calculations

2. **Storage Processing**
   - Calls `macroService.storeMacros(userId, macroData, jwtToken)`
   - Handles duplicate detection and conflict resolution
   - Manages database constraints and unique key enforcement

3. **Response Enhancement**
   - Includes storage confirmation with generated ID
   - Provides calculated ratios and percentages
   - Adds related nutrition plan associations

**Response Formatting:**
- **Success (201):** Macro storage confirmation with calculated data
- **Validation Error (400):** Detailed validation failure information
- **Conflict (409):** Duplicate macro entry with resolution options

---

#### getMacros()
**File:** `controllers/macros.js` (Line 45)
**Route Handler:** GET /v1/macros/retrieve/:id

**Request Processing:**
- Validates macro ID format and user access permissions
- Handles efficient data retrieval with related information
- Implements caching strategies for frequently accessed data

**Business Logic Flow:**
1. **Access Control Validation**
   - Verifies user ownership of requested macro data
   - Handles RLS enforcement and access logging
   - Provides appropriate security responses

2. **Data Retrieval and Enhancement**
   - Fetches complete macro entry with timestamps
   - Includes calculated ratios and nutritional analysis
   - Handles unit conversions based on user preferences

3. **Response Optimization**
   - Implements efficient data serialization
   - Includes related data for reduced API calls
   - Handles cache headers for client-side optimization

**Response Formatting:**
- **Success (200):** Complete macro data with enhancements
- **Not Found (404):** Macro not found or access denied
- **Server Error (500):** Data retrieval failure with tracking

---

## Service Layer Implementation

### Nutrition Service (`services/nutrition-service.js`)

#### Configuration and Dependencies
- **Database Integration:** getSupabaseClientWithToken for RLS-enabled operations
- **Error Handling:** ValidationError, NotFoundError, InternalError for structured error management
- **Logging:** Comprehensive operation logging with privacy-aware data sanitization
- **Primary Tables:** nutrition_plans, dietary_preferences, meal_logs

#### generateNutritionPlan()
**File:** `services/nutrition-service.js` (Line 28)
**Purpose:** Generate comprehensive nutrition plan using AI agent integration

**Input Processing:**
- **Parameters:** `(userId, goals, activityLevel, jwtToken)`
- **Validation:** Goals array validation, activity level enumeration check
- **Authentication:** JWT token validation with user context verification

**Business Logic Implementation:**
1. **User Profile Integration**
   - Fetches complete user profile with dietary preferences
   - Validates essential health data for safe calculations
   - Handles missing profile completion prompts

2. **AI Agent Invocation**
   - Integrates with NutritionAgent for intelligent meal planning
   - Passes user context and goals for personalized recommendations
   - Handles AI response variations and fallback scenarios

3. **Data Storage and Persistence**
   - Stores generated nutrition plan using upsert operations
   - Maintains plan versioning and historical tracking
   - Updates user preferences based on plan acceptance

**Database Operations:**
- **Primary Table:** `nutrition_plans` with user_id foreign key constraint
- **RLS Integration:** Uses JWT token for row-level security enforcement
- **Transaction Handling:** Atomic operations for data consistency
- **Optimistic Locking:** Handles concurrent plan generation scenarios

**Error Handling:**
- **ValidationError:** Invalid goals or activity level with specific error codes
- **NotFoundError:** User profile incomplete or missing essential data
- **InternalError:** AI generation failure or database operation errors
- **Fallback Processing:** Basic calculation fallback when AI unavailable

**Return Format:**
```javascript
{
  status: "success",
  plan: {
    id: "uuid",
    userId: "string", 
    bmr: number,
    tdee: number,
    macros: { protein_g, carbs_g, fat_g, calories },
    meal_plan: { meals: [...], snacks: [...] },
    food_suggestions: { protein: [...], carbs: [...], fat: [...] },
    explanations: { rationale, principles, guidelines, references }
  },
  calculations: { bmr, tdee, adjustedCalories },
  warnings: ["string", ...]
}
```

---

#### logMealConsumption()
**File:** `services/nutrition-service.js` (Line 145)
**Purpose:** Log meal consumption with macro tracking and progress analysis

**Input Processing:**
- **Parameters:** `(userId, mealData, jwtToken)`
- **Validation:** Meal structure validation, macro consistency checks
- **Data Sanitization:** Food item validation and portion size normalization

**Business Logic Implementation:**
1. **Meal Data Processing**
   - Validates food items and portion sizes
   - Calculates total macros from individual components
   - Handles unit conversions for international users

2. **Progress Tracking Integration**
   - Associates meal with active nutrition plan
   - Calculates daily progress towards macro targets
   - Updates adherence metrics and frequency analysis

3. **Database Storage**
   - Stores meal log in `meal_logs` table with complete breakdown
   - Updates daily aggregates for efficient reporting
   - Maintains meal timing patterns for analysis

**Database Operations:**
- **Primary Table:** `meal_logs` with nutrition_plan_id foreign key
- **Aggregation Updates:** Daily macro summaries for dashboard display
- **RLS Enforcement:** User-specific data isolation via JWT token

**Performance Optimizations:**
- **Bulk Insert Support:** Handles multiple meal items efficiently
- **Aggregation Caching:** Pre-calculated daily/weekly summaries
- **Index Optimization:** Efficient querying by date ranges and meal types

---

#### retrieveMealLogs()
**File:** `services/nutrition-service.js` (Line 198)
**Purpose:** Retrieve meal logs with filtering and aggregation capabilities

**Input Processing:**
- **Parameters:** `(userId, filterOptions, jwtToken)`
- **Filter Support:** Date ranges, meal types, food categories
- **Pagination:** Limit/offset with efficient cursor-based navigation

**Business Logic Implementation:**
1. **Query Construction**
   - Builds efficient database queries with proper indexing
   - Handles complex filtering with optimized WHERE clauses
   - Implements timezone-aware date filtering

2. **Data Aggregation**
   - Calculates daily/weekly macro summaries
   - Provides trend analysis and progress metrics
   - Handles statistical calculations for reporting

3. **Response Optimization**
   - Implements selective field loading for performance
   - Includes pagination metadata for frontend navigation
   - Provides aggregated statistics in response headers

**Database Operations:**
- **Complex Queries:** Multi-table joins with optimized performance
- **Aggregation Functions:** SUM, AVG, COUNT for macro analysis
- **Date Range Optimization:** Efficient querying with proper indexing

---

### Macro Service (`services/macro-service.js`)

#### Configuration and Dependencies
- **Database Integration:** getSupabaseClientWithToken for secure data operations
- **Utility Integration:** MacroCalculator for scientific calculations
- **Error Management:** Comprehensive error handling with specific error codes
- **Primary Table:** `macros_storage` for persistent macro data

#### storeMacros()
**File:** `services/macro-service.js` (Line 24)
**Purpose:** Store calculated macro values with validation and conflict resolution

**Input Processing:**
- **Parameters:** `(userId, macroData, jwtToken)`
- **Validation:** Comprehensive macro data validation with range checks
- **Consistency Checks:** Mathematical validation (macros sum to calories)

**Business Logic Implementation:**
1. **Data Validation and Sanitization**
   - Validates all macro values for realistic nutritional ranges
   - Ensures mathematical consistency between components and totals
   - Handles precision requirements for accurate calculations

2. **Storage Logic**
   - Implements upsert operations for data persistence
   - Handles duplicate detection with timestamp-based resolution
   - Manages database constraints and unique key enforcement

3. **Enhancement Processing**
   - Calculates macro ratios and percentages
   - Adds nutritional analysis and recommendations
   - Links to related nutrition plans when applicable

**Database Operations:**
- **Primary Table:** `macros_storage` with user_id association
- **Unique Constraints:** Prevents duplicate entries with same parameters
- **RLS Integration:** Row-level security for data isolation
- **Audit Logging:** Tracks all storage operations for compliance

**Error Handling:**
- **ValidationError:** Invalid macro data with specific field information
- **ConflictError:** Duplicate macro entries with resolution options
- **InternalError:** Database storage failures with recovery guidance

---

#### retrieveMacros()
**File:** `services/macro-service.js` (Line 78)
**Purpose:** Retrieve macro entries with filtering and enhancement capabilities

**Input Processing:**
- **Parameters:** `(userId, macroId, jwtToken)` or `(userId, filterOptions, jwtToken)`
- **Access Control:** User ownership validation with security logging
- **Enhancement Options:** Include related data and calculations

**Business Logic Implementation:**
1. **Access Control and Validation**
   - Verifies user ownership of requested macro data
   - Handles RLS enforcement at application and database levels
   - Provides security audit trails for sensitive operations

2. **Data Retrieval and Enhancement**
   - Fetches complete macro data with timestamps and metadata
   - Calculates derived values (ratios, percentages, recommendations)
   - Includes related nutrition plan associations

3. **Response Optimization**
   - Implements efficient data serialization for API responses
   - Handles unit conversions based on user preferences
   - Includes caching headers for client-side optimization

**Database Operations:**
- **Efficient Queries:** Optimized SELECT statements with proper indexing
- **Related Data Loading:** Includes nutrition plan associations
- **Performance Monitoring:** Query execution time tracking and optimization

---

## AI Agent Integration

### NutritionAgent Overview
The NutritionAgent is the core AI component responsible for generating personalized nutrition plans, meal suggestions, and educational content. It integrates OpenAI's GPT-4o model with scientific calculation utilities to provide comprehensive nutrition guidance.

**Agent Configuration:**
- **Model:** GPT-4o for advanced reasoning and personalization
- **Temperature:** 0.7 for balanced creativity and consistency
- **Response Format:** Structured JSON for frontend integration
- **Memory Integration:** User preference learning and plan optimization

### Agent Processing Pipeline

#### 1. Data Collection and Validation Phase
- Fetches comprehensive user profile with essential health metrics
- Validates required fields (age, weight, height, gender) for safe calculations
- Loads dietary preferences with intelligent defaults for missing values
- Implements security validation (UUID format, authentication context)

#### 2. Goals and Activity Analysis
- Validates goals array using comprehensive validation utilities
- Resolves goal priorities for focused nutrition planning
- Validates activity level against accepted enumeration values
- Stores primary goal context for AI reasoning enhancement

#### 3. Scientific Calculation Integration
- **BMR Calculation:** Uses Mifflin-St Jeor Equation for accuracy
- **TDEE Calculation:** Applies activity multipliers with goal adjustments  
- **Macro Distribution:** Implements goal-specific ratio calculations
- **Unit Handling:** Seamless metric/imperial conversion support

#### 4. AI-Powered Content Generation
- **Meal Plan Creation:** Structured meal distribution with macro targets
- **Food Suggestions:** Categorized recommendations with dietary compliance
- **Educational Content:** Scientific explanations with implementation guidance
- **Safety Validation:** Medical condition awareness and conservative recommendations

#### 5. Storage and Memory Integration
- Stores complete nutrition plan with upsert operations for updates
- Integrates with agent memory system for preference learning
- Cross-references previous plans for consistency and improvement
- Maintains user feedback integration for plan optimization

### Response Variations and Adaptability

#### Success Response Structure
```javascript
{
  status: "success",
  plan: {
    id: "uuid",
    userId: "string",
    bmr: number,
    tdee: number,
    macros: {
      protein_g: number,
      carbs_g: number, 
      fat_g: number,
      calories: number
    },
    meal_plan: {
      meals: [{
        name: "string",
        target_macros: { protein_g, carbs_g, fat_g },
        example: "string"
      }],
      snacks: []
    },
    food_suggestions: {
      protein: ["string", ...],
      carbs: ["string", ...],
      fat: ["string", ...]
    },
    explanations: {
      rationale: "string",
      principles: "string",
      guidelines: "string", 
      references: ["string", ...]
    }
  },
  reasoning: { ... },
  calculations: {
    bmr: number,
    tdee: number,
    adjustedCalories: number
  },
  warnings: ["string", ...]
}
```

#### Adaptive Response Patterns
- **Dietary Restrictions:** Plans automatically adapt for allergies, intolerances, and restrictions
- **Cultural Preferences:** Meal suggestions incorporate cuisine and cultural food preferences
- **Lifestyle Factors:** Meal timing and frequency adapt to work schedules and lifestyle patterns
- **Medical Considerations:** Conservative recommendations with professional consultation guidance

#### Fallback and Error Scenarios
- **AI Generation Failure:** Provides scientific calculations with basic explanations
- **Partial Profile Data:** Generates conservative recommendations with completion prompts
- **Conflicting Goals:** Resolves conflicts with priority-based recommendations and explanations
- **System Overload:** Implements graceful degradation with cached recommendation patterns

### Memory Usage Patterns

#### Storage Patterns
- **Nutrition Plans:** Complete plan data with reasoning and user feedback integration
- **Calculation History:** BMR/TDEE calculations with methodology tracking
- **User Preferences:** Dietary restrictions, preferred foods, and successful strategies
- **Feedback Integration:** User satisfaction and adherence data for improvement

#### Retrieval Patterns
- **Recent Plans Prioritization:** Most recent nutrition plans weighted for relevance
- **Goal-Specific Retrieval:** Tagged memories for specific goal contexts
- **Similarity Matching:** Vector-based retrieval for similar user profiles and preferences
- **Feedback Loop Integration:** User success patterns influence future recommendations

#### Performance Characteristics
- **Typical Duration:** 5-15 seconds for new users, 3-8 seconds with cached preferences
- **Token Usage:** 1000-2500 tokens average (meal plan + suggestions + explanations)
- **Cost Implications:** ~$0.01-0.04 per generation at GPT-4o pricing
- **Memory Overhead:** Efficient with preference caching and calculation optimization

### Reasoning Visualization Data

#### Scientific Foundation Approach
- Prioritizes established nutritional science over popular trends
- Uses validated formulas (Mifflin-St Jeor) for metabolic calculations
- Applies evidence-based macro distribution ratios with goal customization
- Cross-references dietary guidelines and peer-reviewed research

#### User-Centric Personalization Patterns
- Adapts meal frequency to lifestyle and preference patterns
- Considers comprehensive dietary restrictions and food preferences
- Balances nutritional optimality with practical adherence strategies
- Integrates cultural cuisine preferences when specified by user

#### Safety-First Philosophy
- Validates all inputs for realistic physiological ranges
- Provides conservative recommendations for edge cases and medical conditions
- Includes comprehensive disclaimers and professional consultation recommendations
- Maintains data integrity throughout all calculation and recommendation processes

### Processing Time Expectations

#### Performance Benchmarks
- **Initial Plan Generation:** 5-15 seconds for comprehensive analysis with new users
- **Plan Updates:** 3-8 seconds for modifications with existing user data and preferences
- **Unit Conversions:** <1 second for profile transformation and display preferences
- **Complex Dietary Restrictions:** 8-20 seconds for specialized planning with multiple constraints

#### Optimization Strategies
- **Preference Caching:** Reduces processing time for returning users
- **Calculation Reuse:** Efficient reuse of BMR/TDEE calculations for similar profiles
- **Template Optimization:** Pre-calculated meal plan templates for common scenarios
- **Memory Integration:** Leverages previous successful plans for faster generation

### Token Usage Patterns

#### Usage Distribution
- **Meal Plan Generation:** 600-1000 tokens for structured meal planning
- **Food Suggestions:** 300-500 tokens for categorized food recommendations  
- **Scientific Explanations:** 400-800 tokens for educational content
- **Reasoning and Rationale:** 200-400 tokens for decision explanation

#### Cost Management
- **Template Efficiency:** Optimized prompts reduce token usage without quality loss
- **Response Caching:** Reuses common explanations and food suggestions
- **Progressive Enhancement:** Basic plans with optional detailed enhancements
- **Batch Processing:** Handles multiple nutrition requests efficiently

---

## Database Schema Integration

### Primary Tables

#### nutrition_plans
- **Primary Key:** id (UUID)
- **Foreign Keys:** user_id → user_profiles.user_id
- **Key Fields:** bmr, tdee, macros (JSONB), meal_plan (JSONB), food_suggestions (JSONB), explanations (JSONB)
- **Indexes:** user_id, created_at for efficient retrieval
- **RLS Policy:** Users can only access their own nutrition plans

#### dietary_preferences
- **Primary Key:** id (UUID) 
- **Foreign Keys:** user_id → user_profiles.user_id
- **Key Fields:** diet_type, allergies (JSONB), restrictions (JSONB), meal_frequency
- **Indexes:** user_id for user-specific queries
- **RLS Policy:** User-specific data isolation

#### meal_logs
- **Primary Key:** id (UUID)
- **Foreign Keys:** user_id → user_profiles.user_id, nutrition_plan_id → nutrition_plans.id
- **Key Fields:** meal_type, foods (JSONB), macros_consumed (JSONB), logged_at
- **Indexes:** user_id, logged_at, nutrition_plan_id for efficient filtering
- **RLS Policy:** User-specific meal logs with plan association

#### macros_storage
- **Primary Key:** id (UUID)
- **Foreign Keys:** user_id → user_profiles.user_id
- **Key Fields:** protein_g, carbs_g, fat_g, calories, calculation_method
- **Indexes:** user_id, created_at for retrieval and analysis
- **RLS Policy:** User-specific macro data storage

### Data Relationships

#### Nutrition Plan Ecosystem
- **User Profile → Dietary Preferences:** One-to-one relationship for preference management
- **User Profile → Nutrition Plans:** One-to-many for plan versioning and history
- **Nutrition Plans → Meal Logs:** One-to-many for adherence tracking
- **Nutrition Plans → Macro Storage:** One-to-many for calculation storage

#### Foreign Key Constraints
- **Cascading Updates:** Profile changes update related nutrition data
- **Soft Delete Support:** Maintains data integrity while allowing logical deletion
- **Referential Integrity:** Ensures data consistency across all related tables

---

## Performance Characteristics

### API Response Times
- **Nutrition Plan Generation:** 5-15 seconds (includes AI processing)
- **Macro Storage Operations:** <1 second for CRUD operations
- **Meal Log Operations:** <2 seconds including aggregation calculations
- **Plan Retrieval:** <1 second with efficient database indexing

### Database Performance
- **Query Optimization:** Efficient indexes on user_id and timestamp fields
- **Aggregation Performance:** Pre-calculated summaries for dashboard display
- **Connection Management:** Optimized connection pooling for concurrent users
- **RLS Enforcement:** Minimal performance impact with proper indexing

### AI Agent Performance
- **Token Efficiency:** Optimized prompts reduce cost while maintaining quality
- **Response Caching:** Common recommendations cached for faster delivery
- **Memory Integration:** Efficient preference retrieval enhances personalization
- **Fallback Performance:** Quick scientific calculations when AI unavailable

---

## Security Implementation

### Authentication and Authorization
- **JWT Token Validation:** All endpoints require valid authentication tokens
- **Row Level Security:** Database-enforced data isolation per user
- **Access Control:** Application-level ownership validation for all operations
- **Session Management:** Secure session handling with token refresh support

### Data Protection
- **Input Validation:** Comprehensive validation to prevent injection attacks
- **Data Sanitization:** Medical and dietary information sanitized for privacy
- **Encryption:** Sensitive health data encrypted at rest and in transit
- **Audit Logging:** All nutrition operations logged for compliance and monitoring

### Privacy Considerations
- **Medical Data Handling:** Special handling for health-related information
- **Dietary Restrictions:** Secure storage and processing of allergy information
- **User Consent:** Clear consent mechanisms for AI processing and data storage
- **Data Retention:** Configurable retention policies for nutrition and health data

---

## Error Handling and Recovery

### Error Classification
- **ValidationError:** Invalid input data with specific field-level guidance
- **AuthenticationError:** Token validation failures with re-authentication prompts
- **NotFoundError:** Resource not found or access denied with appropriate messaging
- **InternalError:** System errors with tracking IDs for debugging and resolution

### Recovery Patterns
- **Graceful Degradation:** AI failures fall back to scientific calculations
- **Retry Logic:** Transient failures automatically retry with exponential backoff
- **User Guidance:** Clear error messages with actionable resolution steps
- **System Monitoring:** Comprehensive error tracking for pattern analysis and prevention

### Monitoring and Alerting
- **Performance Monitoring:** Real-time tracking of response times and success rates
- **Error Rate Monitoring:** Automated alerts for elevated error rates
- **AI Agent Monitoring:** Token usage tracking and cost monitoring
- **Database Health:** Connection pool monitoring and query performance tracking

---

## Integration Considerations

### Frontend Integration Requirements
- **Response Format Consistency:** Standardized JSON responses for predictable frontend handling
- **Unit System Flexibility:** Dynamic unit conversion based on user preferences
- **Pagination Support:** Consistent pagination patterns for large datasets
- **Real-time Updates:** WebSocket support for live nutrition tracking and progress updates

### Third-Party Integrations
- **Food Database APIs:** Integration points for comprehensive food information
- **Wearable Device APIs:** Activity level integration from fitness trackers
- **Health Platform APIs:** Integration with health monitoring platforms
- **Nutrition Label APIs:** Barcode scanning and nutrition information lookup

### Scalability Considerations
- **Horizontal Scaling:** Service architecture supports multiple instance deployment
- **Database Scaling:** Read replicas for improved query performance
- **Caching Strategy:** Redis integration for session and calculation caching
- **AI Agent Scaling:** Request queuing and load balancing for AI operations

### Maintenance and Updates
- **Version Management:** API versioning strategy for backward compatibility
- **Migration Support:** Database migration scripts for schema updates
- **Feature Flags:** Controlled rollout of new nutrition features
- **Documentation Updates:** Automated documentation generation and maintenance

---

## Testing and Quality Assurance

### Test Coverage Requirements
- **Unit Tests:** Individual method testing with comprehensive edge case coverage
- **Integration Tests:** End-to-end API testing with real database operations
- **AI Agent Tests:** Response quality validation and fallback scenario testing
- **Performance Tests:** Load testing for concurrent user scenarios

### Quality Metrics
- **Response Accuracy:** AI-generated content quality and scientific accuracy validation
- **Performance Benchmarks:** Response time and throughput monitoring
- **Error Rate Tracking:** Success rate monitoring and error pattern analysis
- **User Satisfaction:** Feedback integration and recommendation effectiveness tracking

---

This comprehensive documentation provides complete coverage of the Nutrition & Macros feature, integrating all components from routes through AI agents with detailed implementation guidance, performance characteristics, and integration considerations for successful frontend integration. 