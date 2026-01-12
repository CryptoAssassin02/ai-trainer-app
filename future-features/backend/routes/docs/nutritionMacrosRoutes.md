# Nutrition & Macros Routes Documentation

## Overview
Routes for nutrition plan generation, macro calculation, dietary preferences, and meal logging. Divided into two route files: nutrition.js for general nutrition operations and macros.js for macro-specific calculations and storage.

## Route Definitions

### POST /v1/nutrition/calculate
**File:** `routes/nutrition.js`
**Line:** 20
**Router:** `router` (express.Router() instance)

#### Configuration
- **Rate Limiting:** No specific rate limiting applied
- **Middleware Applied:** `authenticate` (JWT token validation)
- **Authentication Required:** Yes, JWT Bearer token from Supabase Auth
- **OpenAPI Reference:** `/docs/paths/nutritionMacros/nutrition_calculate.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** Handled by controller (macro calculation data)

#### Handler Mapping
- **Controller Method:** `nutritionController.calculateMacros()`
- **Response Format:** JSON with calculated macros and nutrition plan

#### Error Routes
- **400:** Invalid macro calculation input
- **401:** Missing or invalid JWT token
- **422:** Macro calculation failed due to invalid data
- **500:** Internal server error

---

### GET /v1/nutrition/
**File:** `routes/nutrition.js`
**Line:** 27
**Router:** `router` (express.Router() instance)

#### Configuration
- **Rate Limiting:** No specific rate limiting applied
- **Middleware Applied:** `authenticate`
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/nutritionMacros/nutrition.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** None

#### Handler Mapping
- **Controller Method:** `nutritionController.getNutritionPlan()`
- **Response Format:** JSON with user's current nutrition plan

#### Error Routes
- **401:** Missing or invalid JWT token
- **404:** Nutrition plan not found
- **500:** Internal server error

---

### GET /v1/nutrition/preferences
**File:** `routes/nutrition.js`
**Line:** 34
**Router:** `router` (express.Router() instance)

#### Configuration
- **Rate Limiting:** No specific rate limiting applied
- **Middleware Applied:** `authenticate`
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/nutritionMacros/nutrition_preferences.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** None

#### Handler Mapping
- **Controller Method:** `nutritionController.getDietaryPreferences()`
- **Response Format:** JSON with user's dietary preferences and restrictions

#### Error Routes
- **401:** Missing or invalid JWT token
- **404:** Dietary preferences not found
- **500:** Internal server error

---

### POST /v1/nutrition/preferences
**File:** `routes/nutrition.js`
**Line:** 41
**Router:** `router` (express.Router() instance)

#### Configuration
- **Rate Limiting:** No specific rate limiting applied
- **Middleware Applied:** `authenticate`
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/nutritionMacros/nutrition_preferences.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** Handled by controller (dietary preferences data)

#### Handler Mapping
- **Controller Method:** `nutritionController.updateDietaryPreferences()`
- **Response Format:** JSON with updated dietary preferences

#### Error Routes
- **400:** Invalid dietary preferences data
- **401:** Missing or invalid JWT token
- **500:** Internal server error

---

### POST /v1/nutrition/meal-log
**File:** `routes/nutrition.js`
**Line:** 48
**Router:** `router` (express.Router() instance)

#### Configuration
- **Rate Limiting:** No specific rate limiting applied
- **Middleware Applied:** `authenticate`
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/nutritionMacros/nutrition_meal-log.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** Handled by controller (meal log data)

#### Handler Mapping
- **Controller Method:** `nutritionController.logMeal()`
- **Response Format:** JSON with logged meal confirmation

#### Error Routes
- **400:** Invalid meal log data
- **401:** Missing or invalid JWT token
- **500:** Internal server error

---

### GET /v1/nutrition/meal-log
**File:** `routes/nutrition.js`
**Line:** 55
**Router:** `router` (express.Router() instance)

#### Configuration
- **Rate Limiting:** No specific rate limiting applied
- **Middleware Applied:** `authenticate`
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/nutritionMacros/nutrition_meal-log.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** Optional date filtering (startDate, endDate)
- **Body Validation:** None

#### Handler Mapping
- **Controller Method:** `nutritionController.getMealLogs()`
- **Response Format:** JSON with array of meal logs, optionally filtered by date

#### Error Routes
- **400:** Invalid date filter parameters
- **401:** Missing or invalid JWT token
- **500:** Internal server error

---

### GET /v1/nutrition/:userId
**File:** `routes/nutrition.js`
**Line:** 62
**Router:** `router` (express.Router() instance)

#### Configuration
- **Rate Limiting:** No specific rate limiting applied
- **Middleware Applied:** `authenticate`
- **Authentication Required:** Yes, JWT Bearer token (admin privileges implied)
- **OpenAPI Reference:** `/docs/paths/nutritionMacros/nutrition_userId.yaml`

#### Route Parameters
- **Path Parameters:** `userId` (UUID of target user)
- **Query Parameters:** None
- **Body Validation:** None

#### Handler Mapping
- **Controller Method:** `nutritionController.getNutritionPlan()`
- **Response Format:** JSON with specified user's nutrition plan

#### Error Routes
- **401:** Missing or invalid JWT token
- **403:** Insufficient privileges (if admin check implemented)
- **404:** User or nutrition plan not found
- **500:** Internal server error

---

### POST /v1/macros/calculate
**File:** `routes/macros.js`
**Line:** 37
**Router:** `router` (express.Router() instance)

#### Configuration
- **Rate Limiting:** Yes, calculation-specific limits
  - Production: 5 requests per hour
  - Test: 100 requests per minute
- **Middleware Applied:** `authenticate`, `calculationLimiter`, `validateMacroCalculation`
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/nutritionMacros/macros_calculate.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** `validateMacroCalculation` middleware with unit conversion

#### Handler Mapping
- **Controller Method:** `macroController.calculateMacros()`
- **Response Format:** JSON with calculated BMR, TDEE, and macro targets

#### Error Routes
- **400:** Validation failed for macro calculation input
- **401:** Missing or invalid JWT token
- **422:** Macro calculation failed
- **429:** Rate limit exceeded (too many calculation requests)
- **500:** Database or calculation error

---

### POST /v1/macros/
**File:** `routes/macros.js`
**Line:** 46
**Router:** `router` (express.Router() instance)

#### Configuration
- **Rate Limiting:** Yes, standard limits
  - Production: 20 requests per 15 minutes
  - Test: 100 requests per minute
- **Middleware Applied:** `authenticate`, `standardLimiter`
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/nutritionMacros/macros.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** Handled by controller (custom macro plan data)

#### Handler Mapping
- **Controller Method:** `macroController.storeMacros()`
- **Response Format:** JSON with stored macro plan details

#### Error Routes
- **400:** Invalid macro plan data
- **401:** Missing or invalid JWT token
- **429:** Rate limit exceeded
- **500:** Database storage error

---

### GET /v1/macros/
**File:** `routes/macros.js`
**Line:** 53
**Router:** `router` (express.Router() instance)

#### Configuration
- **Rate Limiting:** Yes, standard limits (20 per 15 minutes / 100 per minute test)
- **Middleware Applied:** `authenticate`, `standardLimiter`
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/nutritionMacros/macros.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** Pagination parameters (page, limit, sortBy, etc.)
- **Body Validation:** None

#### Handler Mapping
- **Controller Method:** `macroController.getMacros()`
- **Response Format:** JSON with paginated list of user's macro plans

#### Error Routes
- **400:** Invalid pagination parameters
- **401:** Missing or invalid JWT token
- **429:** Rate limit exceeded
- **500:** Database retrieval error

---

### GET /v1/macros/latest
**File:** `routes/macros.js`
**Line:** 60
**Router:** `router` (express.Router() instance)

#### Configuration
- **Rate Limiting:** Yes, standard limits (20 per 15 minutes / 100 per minute test)
- **Middleware Applied:** `authenticate`, `standardLimiter`
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/nutritionMacros/macros_latest.yaml`

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** None

#### Handler Mapping
- **Controller Method:** `macroController.getLatestMacros()`
- **Response Format:** JSON with user's most recent macro plan

#### Error Routes
- **401:** Missing or invalid JWT token
- **404:** No macro plans found for user
- **429:** Rate limit exceeded
- **500:** Database retrieval error

---

### PUT /v1/macros/:planId
**File:** `routes/macros.js`
**Line:** 67
**Router:** `router` (express.Router() instance)

#### Configuration
- **Rate Limiting:** Yes, standard limits (20 per 15 minutes / 100 per minute test)
- **Middleware Applied:** `authenticate`, `standardLimiter`
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/nutritionMacros/macros_planId.yaml`

#### Route Parameters
- **Path Parameters:** `planId` (UUID of macro plan to update)
- **Query Parameters:** None
- **Body Validation:** Handled by controller (updated macro plan data)

#### Handler Mapping
- **Controller Method:** `macroController.updateMacros()`
- **Response Format:** JSON with updated macro plan details

#### Error Routes
- **400:** Invalid macro plan update data
- **401:** Missing or invalid JWT token
- **403:** User doesn't own the specified plan
- **404:** Macro plan not found
- **429:** Rate limit exceeded
- **500:** Database update error

## Route Precedence Notes
- Nutrition routes (`/nutrition`) are mounted before macro routes (`/macros`) but this doesn't create conflicts due to different prefixes
- The `/nutrition/:userId` route uses a parameterized path, so it must be placed after all specific routes in the nutrition.js file
- Rate limiting is only applied to macro routes, with different limits for calculation vs standard operations

## Integration Notes
- All routes require JWT authentication via the `authenticate` middleware
- Rate limiting implementations differ by operation type (calculation vs standard CRUD)
- Unit conversion is handled in validation middleware for macro calculations (imperial → metric)
- Frontend should handle 429 responses with appropriate retry logic for rate-limited operations
- Meal logging supports date-based filtering for analytics and progress tracking
- Admin-level access patterns are present but may require additional authorization middleware