# Nutrition & Macros Service Documentation

## Overview
Services for handling nutrition plan generation, macro calculation, dietary preferences, and meal logging. Split across two service modules: nutrition-service.js for general nutrition data operations and macro-service.js for macro-specific calculations and storage.

## Service Classes/Modules

### Nutrition Service (`services/nutrition-service.js`)

#### Configuration
- **Dependencies:** getSupabaseClientWithToken, ValidationError, NotFoundError, InternalError, logger
- **Database Tables:** nutrition_plans, dietary_preferences, meal_logs
- **External APIs:** None (pure database operations)
- **Initialization:** None required

### Macro Service (`services/macro-service.js`)

#### Configuration
- **Dependencies:** @supabase/supabase-js, NutritionAgent, OpenAIService, retryOperation, getSupabaseClientWithToken
- **Database Tables:** nutrition_plans
- **External APIs:** OpenAI API via NutritionAgent
- **Initialization:** OpenAIService instantiation required

## Service Methods

### getNutritionPlanByUserId()
**File:** `services/nutrition-service.js`
**Line:** 22
**Called By:** `nutrition.calculateMacros()`, external services

#### Method Signature
```javascript
async getNutritionPlanByUserId(userId, jwtToken)
```

#### Parameters
- **userId:** string - UUID of the user
- **jwtToken:** string - JWT token for RLS-scoped client authentication

#### Business Logic
1. Creates RLS-scoped Supabase client using JWT token
2. Queries nutrition_plans table for user-specific plan
3. Uses single() method to enforce one result per user
4. Handles PGRST116 error code for not found cases
5. Formats response data using formatNutritionPlanResponse()

#### Database Operations
```sql
-- Primary query
SELECT * FROM nutrition_plans WHERE user_id = $1 LIMIT 1;
```

#### Transaction Boundaries
- **Uses Transactions:** No
- **Rollback Conditions:** N/A
- **Isolation Level:** Default

#### Return Value
```javascript
{
  id: string,
  userId: string,
  calculations: {
    bmr: number,
    tdee: number,
    macros: { protein_g, carbs_g, fat_g, calories }
  },
  mealPlan: object,
  foodSuggestions: object,
  explanations: object,
  goals: array,
  activityLevel: string,
  updatedAt: string,
  createdAt: string
}
```

#### Error Cases
- **NotFoundError:** When plan doesn't exist (PGRST116 code)
- **InternalError:** When database operation fails
- **InternalError:** For unexpected errors

#### Performance Considerations
- **Typical Duration:** < 500ms
- **Caching:** Not implemented
- **Batch Operations:** Not supported

---

### createOrUpdateNutritionPlan()
**File:** `services/nutrition-service.js`
**Line:** 56
**Called By:** `nutrition.calculateMacros()`, nutrition controllers

#### Method Signature
```javascript
async createOrUpdateNutritionPlan(planData, jwtToken)
```

#### Parameters
- **planData:** object - Nutrition plan data with userId, calculations, goals, activityLevel
- **jwtToken:** string - JWT token for RLS-scoped client authentication

#### Business Logic
1. Validates nutrition plan data structure using validateNutritionPlanData()
2. Creates RLS-scoped Supabase client
3. Prepares data for storage with snake_case conversion
4. Uses upsert operation with user_id conflict resolution
5. Formats response for client consumption

#### Database Operations
```sql
-- Upsert operation
INSERT INTO nutrition_plans (user_id, bmr, tdee, macros, goals, activity_level, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (user_id) DO UPDATE SET
  bmr = EXCLUDED.bmr,
  tdee = EXCLUDED.tdee,
  macros = EXCLUDED.macros,
  goals = EXCLUDED.goals,
  activity_level = EXCLUDED.activity_level,
  updated_at = EXCLUDED.updated_at
RETURNING *;
```

#### Transaction Boundaries
- **Uses Transactions:** No
- **Rollback Conditions:** N/A
- **Isolation Level:** Default

#### Return Value
```javascript
{
  id: string,
  userId: string,
  calculations: { bmr, tdee, macros },
  mealPlan: object,
  foodSuggestions: object,
  explanations: object,
  goals: array,
  activityLevel: string,
  updatedAt: string,
  createdAt: string
}
```

#### Error Cases
- **ValidationError:** When planData fails validation
- **InternalError:** When database operation fails
- **InternalError:** For unexpected errors

#### Performance Considerations
- **Typical Duration:** < 1 second
- **Caching:** Not implemented
- **Batch Operations:** Not supported

---

### getDietaryPreferences()
**File:** `services/nutrition-service.js`
**Line:** 99
**Called By:** Nutrition controllers, external services

#### Method Signature
```javascript
async getDietaryPreferences(userId, jwtToken)
```

#### Parameters
- **userId:** string - UUID of the user
- **jwtToken:** string - JWT token for RLS-scoped client authentication

#### Business Logic
1. Creates RLS-scoped Supabase client using JWT token
2. Queries dietary_preferences table for user-specific preferences
3. Uses single() method to enforce one result per user
4. Handles PGRST116 error code for not found cases
5. Formats response data using formatDietaryPreferencesResponse()

#### Database Operations
```sql
-- Primary query
SELECT * FROM dietary_preferences WHERE user_id = $1 LIMIT 1;
```

#### Transaction Boundaries
- **Uses Transactions:** No
- **Rollback Conditions:** N/A
- **Isolation Level:** Default

#### Return Value
```javascript
{
  id: string,
  userId: string,
  mealFrequency: number,
  mealTimingPrefs: object,
  timeConstraints: object,
  restrictions: array,
  dislikedFoods: array,
  allergies: array,
  preferredCuisine: string,
  dietType: string,
  updatedAt: string,
  createdAt: string
}
```

#### Error Cases
- **NotFoundError:** When preferences don't exist (PGRST116 code)
- **InternalError:** When database operation fails
- **InternalError:** For unexpected errors

#### Performance Considerations
- **Typical Duration:** < 500ms
- **Caching:** Not implemented
- **Batch Operations:** Not supported

---

### createOrUpdateDietaryPreferences()
**File:** `services/nutrition-service.js`
**Line:** 135
**Called By:** Dietary preference controllers

#### Method Signature
```javascript
async createOrUpdateDietaryPreferences(preferencesData, jwtToken)
```

#### Parameters
- **preferencesData:** object - Dietary preferences with userId, mealFrequency, restrictions, allergies, etc.
- **jwtToken:** string - JWT token for RLS-scoped client authentication

#### Business Logic
1. Validates dietary preferences data using validateDietaryPreferences()
2. Creates RLS-scoped Supabase client
3. Prepares data for storage with snake_case conversion
4. Uses upsert operation with user_id conflict resolution
5. Formats response for client consumption

#### Database Operations
```sql
-- Upsert operation
INSERT INTO dietary_preferences (user_id, meal_frequency, restrictions, allergies, diet_type, updated_at)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (user_id) DO UPDATE SET
  meal_frequency = EXCLUDED.meal_frequency,
  restrictions = EXCLUDED.restrictions,
  allergies = EXCLUDED.allergies,
  diet_type = EXCLUDED.diet_type,
  updated_at = EXCLUDED.updated_at
RETURNING *;
```

#### Transaction Boundaries
- **Uses Transactions:** No
- **Rollback Conditions:** N/A
- **Isolation Level:** Default

#### Return Value
```javascript
{
  id: string,
  userId: string,
  mealFrequency: number,
  mealTimingPrefs: object,
  timeConstraints: object,
  restrictions: array,
  dislikedFoods: array,
  allergies: array,
  preferredCuisine: string,
  dietType: string,
  updatedAt: string,
  createdAt: string
}
```

#### Error Cases
- **ValidationError:** When preferencesData fails validation
- **InternalError:** When database operation fails
- **InternalError:** For unexpected errors

#### Performance Considerations
- **Typical Duration:** < 1 second
- **Caching:** Not implemented
- **Batch Operations:** Not supported

---

### logMeal()
**File:** `services/nutrition-service.js`
**Line:** 174
**Called By:** Meal logging controllers

#### Method Signature
```javascript
async logMeal(mealLogData, jwtToken)
```

#### Parameters
- **mealLogData:** object - Meal log data with userId, mealName, foods array, loggedAt timestamp
- **jwtToken:** string - JWT token for RLS-scoped client authentication

#### Business Logic
1. Validates meal log data using validateMealLogData()
2. Creates RLS-scoped Supabase client
3. Prepares data for storage with food array transformation
4. Inserts new meal log record
5. Formats response for client consumption

#### Database Operations
```sql
-- Insert operation
INSERT INTO meal_logs (user_id, meal_name, foods, notes, logged_at, created_at)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;
```

#### Transaction Boundaries
- **Uses Transactions:** No
- **Rollback Conditions:** N/A
- **Isolation Level:** Default

#### Return Value
```javascript
{
  id: string,
  userId: string,
  mealName: string,
  foods: array[{
    name: string,
    portionSize: number,
    units: string,
    protein_g: number,
    carbs_g: number,
    fat_g: number,
    calories: number
  }],
  notes: string,
  loggedAt: string,
  createdAt: string
}
```

#### Error Cases
- **ValidationError:** When mealLogData fails validation
- **InternalError:** When database operation fails
- **InternalError:** For unexpected errors

#### Performance Considerations
- **Typical Duration:** < 1 second
- **Caching:** Not implemented
- **Batch Operations:** Not supported

---

### getMealLogs()
**File:** `services/nutrition-service.js`
**Line:** 207
**Called By:** Meal history controllers, analytics services

#### Method Signature
```javascript
async getMealLogs(userId, startDate, endDate, jwtToken)
```

#### Parameters
- **userId:** string - UUID of the user
- **startDate:** string - Start date in YYYY-MM-DD format (optional)
- **endDate:** string - End date in YYYY-MM-DD format (optional)
- **jwtToken:** string - JWT token for RLS-scoped client authentication

#### Business Logic
1. Validates date format inputs using isValidDateFormat()
2. Creates RLS-scoped Supabase client
3. Builds query with date range filters if provided
4. Orders results by logged_at descending (most recent first)
5. Formats each meal log for response

#### Database Operations
```sql
-- Query with optional date filters
SELECT * FROM meal_logs 
WHERE user_id = $1 
  AND logged_at >= $2::timestamp  -- if startDate provided
  AND logged_at <= $3::timestamp  -- if endDate provided
ORDER BY logged_at DESC;
```

#### Transaction Boundaries
- **Uses Transactions:** No
- **Rollback Conditions:** N/A
- **Isolation Level:** Default

#### Return Value
```javascript
[{
  id: string,
  userId: string,
  mealName: string,
  foods: array[{ name, portionSize, units, protein_g, carbs_g, fat_g, calories }],
  notes: string,
  loggedAt: string,
  createdAt: string
}]
```

#### Error Cases
- **ValidationError:** When date format is invalid
- **InternalError:** When database operation fails
- **InternalError:** For unexpected errors

#### Performance Considerations
- **Typical Duration:** < 2 seconds for large date ranges
- **Caching:** Not implemented
- **Batch Operations:** Not supported

---

### calculateMacros()
**File:** `services/macro-service.js`
**Line:** 17
**Called By:** `macros.calculateMacros()` controller

#### Method Signature
```javascript
async calculateMacros(userInfo, useExternalApi = true, jwtToken)
```

#### Parameters
- **userInfo:** object - User demographic data including weight, height, age, gender, activityLevel, goal
- **useExternalApi:** boolean - Whether to use NutritionAgent API (default: true)
- **jwtToken:** string - User's JWT token for RLS-scoped client

#### Business Logic
1. Attempts AI-powered calculation via NutritionAgent if useExternalApi is true
2. Falls back to formula-based calculation if API fails
3. Validates user information comprehensively
4. Calculates BMR using Mifflin-St Jeor Equation
5. Calculates TDEE using activity multipliers
6. Adjusts calories based on goal (-500 for weight loss, +300 for muscle gain)
7. Distributes macros based on goal percentages

#### Database Operations
```sql
-- No direct database operations
-- Uses RLS-scoped client for NutritionAgent initialization
```

#### Transaction Boundaries
- **Uses Transactions:** No
- **Rollback Conditions:** N/A
- **Isolation Level:** N/A

#### Return Value
```javascript
{
  calories: number,
  macros: {
    protein: number,
    carbs: number,
    fat: number
  },
  bmr: number,
  tdee: number,
  goalType: string,
  calorieAdjustment: number
}
```

#### Error Cases
- **BadRequestError:** When userInfo validation fails
- **BadRequestError:** When external API and formula calculation both fail
- **BadRequestError:** For unexpected calculation errors

#### Performance Considerations
- **Typical Duration:** 1-5 seconds (depending on API usage)
- **Caching:** Not implemented
- **Batch Operations:** Not supported

---

### storeMacros()
**File:** `services/macro-service.js`
**Line:** 123
**Called By:** `macros.calculateMacros()` controller after calculation

#### Method Signature
```javascript
async storeMacros(userId, macroData, jwtToken)
```

#### Parameters
- **userId:** string - User ID
- **macroData:** object - Calculated macro data with bmr, tdee, calories, macros, calorieAdjustment
- **jwtToken:** string - User's JWT token for RLS

#### Business Logic
1. Creates Supabase client with JWT for RLS
2. Prepares planData for insertion with all required fields
3. Inserts data into nutrition_plans table
4. Returns the created plan ID for reference

#### Database Operations
```sql
-- Insert operation
INSERT INTO nutrition_plans (user_id, bmr, tdee, calories, macros, calorie_adjustment, status, meal_plan, food_suggestions, explanations)
VALUES ($1, $2, $3, $4, $5, $6, 'active', NULL, NULL, $7)
RETURNING id;
```

#### Transaction Boundaries
- **Uses Transactions:** No
- **Rollback Conditions:** N/A
- **Isolation Level:** Default

#### Return Value
```javascript
string // Plan ID of created nutrition plan
```

#### Error Cases
- **DatabaseError:** When insertion fails
- **DatabaseError:** For unexpected database errors

#### Performance Considerations
- **Typical Duration:** < 1 second
- **Caching:** Not implemented
- **Batch Operations:** Not supported

---

### retrieveMacros()
**File:** `services/macro-service.js`
**Line:** 168
**Called By:** Macro history controllers, analytics services

#### Method Signature
```javascript
async retrieveMacros(userId, filters = {}, jwtToken)
```

#### Parameters
- **userId:** string - User ID
- **filters:** object - Filtering options including page, pageSize, startDate, endDate, status
- **jwtToken:** string - User's JWT token for RLS

#### Business Logic
1. Creates Supabase client with JWT for RLS
2. Sets up pagination with page and pageSize parameters
3. Builds query with date range and status filters
4. Orders results by created_at descending
5. Applies pagination range
6. Returns data with pagination metadata

#### Database Operations
```sql
-- Query with filters and pagination
SELECT id, created_at, bmr, tdee, calories, macros, status, calorie_adjustment
FROM nutrition_plans 
WHERE user_id = $1 
  AND created_at >= $2  -- if startDate provided
  AND created_at <= $3  -- if endDate provided
  AND status = $4       -- if status provided
ORDER BY created_at DESC
OFFSET $5 LIMIT $6;

-- Count query
SELECT COUNT(*) FROM nutrition_plans WHERE user_id = $1 [filters];
```

#### Transaction Boundaries
- **Uses Transactions:** No
- **Rollback Conditions:** N/A
- **Isolation Level:** Default

#### Return Value
```javascript
{
  data: array[{
    id: string,
    created_at: string,
    bmr: number,
    tdee: number,
    calories: number,
    macros: object,
    status: string,
    calorie_adjustment: number
  }],
  pagination: {
    total: number,
    page: number,
    pageSize: number,
    totalPages: number
  }
}
```

#### Error Cases
- **DatabaseError:** When query fails
- **DatabaseError:** For unexpected database errors

#### Performance Considerations
- **Typical Duration:** < 2 seconds for large datasets
- **Caching:** Not implemented
- **Batch Operations:** Supports pagination

---

### retrieveLatestMacros()
**File:** `services/macro-service.js`
**Line:** 242
**Called By:** Dashboard controllers, quick access endpoints

#### Method Signature
```javascript
async retrieveLatestMacros(userId, jwtToken)
```

#### Parameters
- **userId:** string - User ID
- **jwtToken:** string - User's JWT token for RLS

#### Business Logic
1. Creates Supabase client with JWT for RLS
2. Queries for most recent active macro plan
3. Uses single() method to enforce one result
4. Handles "No rows found" condition specifically

#### Database Operations
```sql
-- Query for latest active plan
SELECT * FROM nutrition_plans 
WHERE user_id = $1 AND status = 'active'
ORDER BY created_at DESC 
LIMIT 1;
```

#### Transaction Boundaries
- **Uses Transactions:** No
- **Rollback Conditions:** N/A
- **Isolation Level:** Default

#### Return Value
```javascript
{
  id: string,
  user_id: string,
  bmr: number,
  tdee: number,
  calories: number,
  macros: object,
  calorie_adjustment: number,
  status: string,
  meal_plan: object,
  food_suggestions: object,
  explanations: string,
  created_at: string,
  updated_at: string
}
```

#### Error Cases
- **NotFoundError:** When no active macro plan found
- **DatabaseError:** When query fails
- **DatabaseError:** For unexpected database errors

#### Performance Considerations
- **Typical Duration:** < 500ms
- **Caching:** Not implemented
- **Batch Operations:** Not supported

---

### updateMacroPlan()
**File:** `services/macro-service.js`
**Line:** 284
**Called By:** Macro update controllers

#### Method Signature
```javascript
async updateMacroPlan(planId, updates, currentVersion, jwtToken)
```

#### Parameters
- **planId:** string - Plan ID to update
- **updates:** object - Data to update
- **currentVersion:** number - Current version for concurrency control
- **jwtToken:** string - User's JWT token for RLS

#### Business Logic
1. Creates Supabase client with JWT for RLS
2. Updates plan with provided data
3. Includes updated_at timestamp
4. Checks if any rows were affected for existence validation

#### Database Operations
```sql
-- Update operation
UPDATE nutrition_plans 
SET <update_fields>, updated_at = $1
WHERE id = $2
RETURNING *;
```

#### Transaction Boundaries
- **Uses Transactions:** No
- **Rollback Conditions:** N/A
- **Isolation Level:** Default

#### Return Value
```javascript
boolean // true if update successful
```

#### Error Cases
- **NotFoundError:** When plan ID not found or no permission
- **DatabaseError:** When update operation fails
- **DatabaseError:** For unexpected database errors

#### Performance Considerations
- **Typical Duration:** < 1 second
- **Caching:** Not implemented
- **Batch Operations:** Not supported

## Data Integrity Rules
- Foreign key constraints on user_id fields to users table
- RLS policies enforce user ownership on all operations
- Unique constraints on user_id for nutrition_plans and dietary_preferences tables
- JSON validation on macros and foods fields
- Date/timestamp validation on logged_at and created_at fields

## Integration Patterns
- **Pagination Support:** retrieveMacros() supports page-based pagination with metadata
- **Filtering Support:** Date range filters (startDate, endDate), status filters, user_id isolation
- **Sorting Support:** Created_at descending (most recent first), logged_at descending for meal logs