# Nutrition & Macros Controllers Documentation

## Overview
Controllers handling HTTP requests for nutrition plan generation, macro calculation, dietary preferences, and meal logging. Split across two controller files: nutrition.js for general nutrition operations and macros.js for macro-specific calculations and storage.

## Controller Methods

### Nutrition Controller (`controllers/nutrition.js`)

#### calculateMacros()
**File:** `controllers/nutrition.js`
**Line:** 24
**Route Handler:** POST /v1/nutrition/calculate

##### Request Processing
- **Request Body Extraction:** Extracts `goals`, `activityLevel` from validated request body
- **User Authentication:** Validates `req.user.id` and JWT token from Authorization header
- **Input Validation:** Ensures goals array is non-empty and activityLevel is provided
- **Service Integration:** Initializes NutritionAgent with RLS-scoped Supabase client

##### Business Logic Flow
1. **JWT Token Extraction:** Safely extracts token from `req.headers.authorization`
2. **Input Validation:** Validates required fields (goals array, activityLevel)
3. **Agent Initialization:** Creates per-request NutritionAgent with RLS-scoped client
4. **AI Processing:** Calls `nutritionAgent.process()` with user context
5. **Data Persistence:** Saves generated plan via `nutritionService.createOrUpdateNutritionPlan()`

##### Response Handling
- **Success Response:** 200 status with nutrition plan data
- **Error Handling:** Validates error types (ValidationError, NotFoundError, AuthenticationError)
- **Logging:** Comprehensive error logging with user context

##### Service Calls
- `nutritionAgent.process(context)` - AI-powered nutrition plan generation
- `nutritionService.createOrUpdateNutritionPlan(agentResult, jwtToken)` - Data persistence

##### Transformations Applied
- Adds `userId` to request context for agent processing
- Creates RLS-scoped Supabase client with JWT authorization headers

---

#### getNutritionPlan()
**File:** `controllers/nutrition.js`
**Line:** 105
**Route Handler:** GET /v1/nutrition/ and GET /v1/nutrition/:userId

##### Request Processing
- **User ID Resolution:** Uses `req.params.userId` or falls back to `req.user.id`
- **JWT Authentication:** Validates and extracts JWT token
- **Parameter Validation:** Ensures userId and jwtToken are present

##### Business Logic Flow
1. **User ID Determination:** Supports both parameterized and authenticated user access
2. **Token Validation:** Ensures JWT token is available for RLS enforcement
3. **Data Retrieval:** Calls service to fetch nutrition plan by user ID
4. **Response Formatting:** Returns plan data with success status

##### Service Calls
- `nutritionService.getNutritionPlanByUserId(userId, jwtToken)` - Plan retrieval

##### Transformations Applied
- None (direct service delegation)

---

#### getDietaryPreferences()
**File:** `controllers/nutrition.js`
**Line:** 148
**Route Handler:** GET /v1/nutrition/preferences

##### Request Processing
- **User Authentication:** Validates `req.user.id` and JWT token
- **Input Validation:** Ensures user context is available

##### Business Logic Flow
1. **Authentication Verification:** Validates user ID and JWT token presence
2. **Service Delegation:** Calls service to retrieve dietary preferences
3. **Response Formatting:** Returns preferences with success wrapper

##### Service Calls
- `nutritionService.getDietaryPreferences(userId, jwtToken)` - Preferences retrieval

##### Transformations Applied
- None (direct service delegation)

---

#### updateDietaryPreferences()
**File:** `controllers/nutrition.js`
**Line:** 185
**Route Handler:** POST /v1/nutrition/preferences

##### Request Processing
- **Request Body Processing:** Merges `req.body` with `userId`
- **Authentication Validation:** Ensures user context and JWT token availability

##### Business Logic Flow
1. **Data Preparation:** Adds userId to preference data from request body
2. **Service Integration:** Calls service to create or update preferences
3. **Response Handling:** Returns updated preferences with success message

##### Service Calls
- `nutritionService.createOrUpdateDietaryPreferences(preferenceData, jwtToken)` - Preferences update

##### Transformations Applied
- Adds `userId` to request body data for service processing

---

#### logMeal()
**File:** `controllers/nutrition.js`
**Line:** 225
**Route Handler:** POST /v1/nutrition/meal-log

##### Request Processing
- **Request Body Enhancement:** Adds `userId` to meal log data
- **Authentication Verification:** Validates user context and JWT token

##### Business Logic Flow
1. **Data Enrichment:** Merges userId into meal log data
2. **Logging Context:** Extracts meal name for logging purposes
3. **Service Integration:** Delegates to service for meal log creation
4. **Success Response:** Returns created meal log with 201 status

##### Service Calls
- `nutritionService.logMeal(mealLogData, jwtToken)` - Meal log creation

##### Transformations Applied
- Adds `userId` to meal log data
- Extracts `mealName` for logging context

---

#### getMealLogs()
**File:** `controllers/nutrition.js`
**Line:** 267
**Route Handler:** GET /v1/nutrition/meal-log

##### Request Processing
- **Query Parameter Extraction:** Extracts `startDate`, `endDate` from query string
- **Authentication Validation:** Ensures user context and JWT token

##### Business Logic Flow
1. **Filter Parameter Processing:** Extracts optional date filtering parameters
2. **Service Delegation:** Calls service with user ID and filter parameters
3. **Response Formatting:** Returns meal logs array with success status

##### Service Calls
- `nutritionService.getMealLogs(userId, startDate, endDate, jwtToken)` - Filtered meal logs retrieval

##### Transformations Applied
- Extracts query parameters for service filtering

---

### Macros Controller (`controllers/macros.js`)

#### calculateMacros()
**File:** `controllers/macros.js`
**Line:** 13
**Route Handler:** POST /v1/macros/calculate

##### Request Processing
- **User Data Preparation:** Merges `req.body` with `userId` for tracking
- **External API Flag:** Supports `useExternalApi` parameter for calculation method
- **JWT Token Extraction:** Direct token extraction from Authorization header

##### Business Logic Flow
1. **Data Enhancement:** Adds userId to calculation request for tracking
2. **Macro Calculation:** Uses service to calculate macros with optional external API
3. **Data Persistence:** Stores calculated macros in database
4. **Response Formation:** Returns plan ID and calculated macro data

##### Service Calls
- `macroService.calculateMacros(userData, req.body.useExternalApi)` - Macro calculation
- `macroService.storeMacros(userId, macros, jwtToken)` - Data storage

##### Transformations Applied
- Adds `userId` to calculation data
- Combines calculation and storage into single operation

---

#### storeMacros()
**File:** `controllers/macros.js`
**Line:** 48
**Route Handler:** POST /v1/macros/

##### Request Processing
- **Direct Data Processing:** Uses `req.body` as macro data
- **Authentication Context:** Extracts user ID and JWT token

##### Business Logic Flow
1. **Service Delegation:** Direct call to service for macro storage
2. **Response Generation:** Returns created plan ID with success status

##### Service Calls
- `macroService.storeMacros(userId, macroData, jwtToken)` - Custom macro plan storage

##### Transformations Applied
- None (direct service delegation)

---

#### getMacros()
**File:** `controllers/macros.js`
**Line:** 80
**Route Handler:** GET /v1/macros/

##### Request Processing
- **Filter Parameter Processing:** Extracts pagination and filter parameters from query
- **Parameter Conversion:** Converts string parameters to appropriate types

##### Business Logic Flow
1. **Filter Preparation:** Constructs filter object from query parameters
2. **Service Integration:** Retrieves paginated macro plans with filters
3. **Response Structuring:** Returns data with pagination metadata

##### Service Calls
- `macroService.retrieveMacros(userId, filters, jwtToken)` - Paginated macro retrieval

##### Transformations Applied
- Converts query string parameters to typed filter object
- Structures response with data and pagination separation

---

#### getLatestMacros()
**File:** `controllers/macros.js`
**Line:** 137
**Route Handler:** GET /v1/macros/latest

##### Request Processing
- **Simple Authentication:** Basic user ID and JWT token validation
- **Direct Service Call:** No parameter processing required

##### Business Logic Flow
1. **Service Delegation:** Direct call to retrieve latest macro plan
2. **Response Formatting:** Returns latest plan with success wrapper

##### Service Calls
- `macroService.retrieveLatestMacros(userId, jwtToken)` - Latest plan retrieval

##### Transformations Applied
- None (direct service delegation)

---

#### updateMacros()
**File:** `controllers/macros.js`
**Line:** 171
**Route Handler:** PUT /v1/macros/:planId

##### Request Processing
- **Path Parameter Extraction:** Gets `planId` from URL parameters
- **Version Handling:** Extracts version from request body for optimistic locking
- **Update Data Processing:** Uses request body as update payload

##### Business Logic Flow
1. **Parameter Extraction:** Gets plan ID from URL and update data from body
2. **Version Control:** Handles optimistic locking with version parameter
3. **Service Integration:** Delegates update operation to service
4. **Success Response:** Returns update confirmation

##### Service Calls
- `macroService.updateMacroPlan(planId, updates, currentVersion, jwtToken)` - Plan update

##### Transformations Applied
- Extracts version from body for optimistic locking
- Combines path and body parameters for service call

## Cross-Cutting Concerns

### Authentication Pattern
- **Consistent User Context:** All methods validate `req.user.id` presence
- **JWT Token Handling:** Uniform token extraction from Authorization header
- **RLS Integration:** Nutrition controller creates RLS-scoped clients for agent operations

### Error Handling Strategy
- **Typed Error Handling:** Different handling for ValidationError, NotFoundError, AuthenticationError
- **Consistent Error Responses:** Standardized error response format across controllers
- **Comprehensive Logging:** Error logging with user context and request details

### Service Integration Patterns
- **JWT Token Propagation:** All service calls include JWT token for RLS enforcement
- **Data Enrichment:** Controllers add user context (userId) to service requests
- **Response Standardization:** Consistent success response format with status and data

### Validation Responsibilities
- **Input Validation:** Basic validation in controllers, detailed validation in middleware/services
- **Authentication Validation:** Required field presence validation (userId, JWT token)
- **Business Logic Validation:** Delegated to service layer

## Performance Considerations
- **Per-Request Agent Initialization:** Nutrition agent created per-request with RLS-scoped client
- **Service Layer Delegation:** Controllers remain thin with business logic in services
- **Efficient Error Handling:** Early returns for validation failures to prevent unnecessary processing