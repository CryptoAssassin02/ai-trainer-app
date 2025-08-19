# User Profiles Routes Documentation

## Overview
This file implements all routes related to user profile management, including profile creation, retrieval, updates, and preference management. The routes handle both complete profile operations and preference-specific operations for granular control.

## Route Definitions

### GET /profile
**File:** `routes/profile.js`
**Line:** 30
**Router:** `express.Router()`

#### Configuration
- **Rate Limiting:** No (inherits from global rate limits)
- **Middleware Applied:** `authenticate`, `asyncHandler`
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/profiles/profile.yaml` (GET operation)

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** None

#### Handler Mapping
- **Controller Method:** `profileController.getProfile()`
- **Response Format:** 
  ```json
  {
    "status": "success",
    "data": {
      // Complete user profile object
    }
  }
  ```

#### Error Routes
- **400:** Missing user ID
- **401:** Invalid or missing JWT token
- **404:** Profile not found
- **500:** Internal server error

---

### GET /profile/preferences
**File:** `routes/profile.js`
**Line:** 38
**Router:** `express.Router()`

#### Configuration
- **Rate Limiting:** No (inherits from global rate limits)
- **Middleware Applied:** `authenticate`, `asyncHandler`
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/profiles/preferences.yaml` (GET operation)

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** None

#### Handler Mapping
- **Controller Method:** `profileController.getProfilePreferences()`
- **Response Format:** 
  ```json
  {
    "status": "success",
    "data": {
      "unitPreference": "metric",
      "goals": ["weight_loss", "muscle_gain"],
      "equipment": ["dumbbells", "barbell"],
      "experienceLevel": "intermediate",
      "workoutFrequency": "3x per week"
    }
  }
  ```

#### Error Routes
- **400:** Missing user ID
- **401:** Invalid or missing JWT token
- **404:** Profile not found
- **500:** Internal server error

---

### PUT /profile/preferences
**File:** `routes/profile.js`
**Line:** 46
**Router:** `express.Router()`

#### Configuration
- **Rate Limiting:** No (inherits from global rate limits)
- **Middleware Applied:** `requireJsonContentType`, `validateProfilePreferences`, `authenticate`, `asyncHandler`
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/profiles/preferences.yaml` (PUT operation)

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** `profileSchemas.preferences` (Joi schema)
  - **Required:** At least one preference field
  - **Optional Fields:** `unitPreference`, `goals`, `equipment`, `experienceLevel`, `workoutFrequency`
  - **Content-Type:** Must be `application/json`

#### Handler Mapping
- **Controller Method:** `profileController.updateProfilePreferences()`
- **Response Format:** 
  ```json
  {
    "status": "success",
    "data": {
      // Updated preferences object
    }
  }
  ```

#### Error Routes
- **400:** Invalid Content-Type, validation errors, or missing required fields
- **401:** Invalid or missing JWT token
- **404:** Profile not found
- **500:** Internal server error

---

### POST /profile
**File:** `routes/profile.js`
**Line:** 55
**Router:** `express.Router()`

#### Configuration
- **Rate Limiting:** No (inherits from global rate limits)
- **Middleware Applied:** `validateProfileCreation`, `authenticate`, `asyncHandler`
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/profiles/profile.yaml` (POST operation)

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** `profileSchemas.create` (Joi schema)
  - **Required:** `unitPreference` (in OpenAPI specification)
  - **Optional Fields:** `name`, `age`, `gender`, `height`, `weight`, `experienceLevel`, `goals`, `equipment`, `exercisePreferences`, `equipmentPreferences`, `medicalConditions`, `workoutFrequency`
  - **Special Validations:** 
    - Height: Either number (metric) or object with feet/inches (imperial)
    - Medical conditions: Max 10 items, healthcare data sanitization
    - Name: 2-100 characters
    - Age: 13-120 years

#### Handler Mapping
- **Controller Method:** `profileController.createOrUpdateProfile()`
- **Response Format:** 
  ```json
  {
    "status": "success",
    "data": {
      // Created profile object
    }
  }
  ```

#### Error Routes
- **400:** Validation errors, invalid data format
- **401:** Invalid or missing JWT token
- **409:** Profile already exists or unit conversion error
- **500:** Internal server error

---

### PUT /profile
**File:** `routes/profile.js`
**Line:** 62
**Router:** `express.Router()`

#### Configuration
- **Rate Limiting:** No (inherits from global rate limits)
- **Middleware Applied:** `validateProfileUpdate`, `authenticate`, `asyncHandler`
- **Authentication Required:** Yes, JWT Bearer token
- **OpenAPI Reference:** `/docs/paths/profiles/profile.yaml` (PUT operation)

#### Route Parameters
- **Path Parameters:** None
- **Query Parameters:** None
- **Body Validation:** `profileSchemas.update` (Joi schema)
  - **Required:** None (partial update allowed)
  - **Optional Fields:** Same as create schema but all optional
  - **Special Validations:** Same validation rules as create schema

#### Handler Mapping
- **Controller Method:** `profileController.createOrUpdateProfile()`
- **Response Format:** 
  ```json
  {
    "status": "success",
    "data": {
      // Updated profile object
    }
  }
  ```

#### Error Routes
- **400:** Validation errors, invalid data format
- **401:** Invalid or missing JWT token
- **404:** Profile not found
- **409:** Unit conversion error
- **500:** Internal server error

---

## Route Precedence Notes

1. **Specific Routes First:** `/profile/preferences` is registered before `/profile` to prevent route conflicts
2. **Method-Specific Behavior:** Same path (`/profile`) handles both POST (create) and PUT (update) with different validation schemas
3. **Authentication Requirement:** All routes require authentication via `router.use(authenticate)`

## Integration Notes

### Authentication Flow
- All routes require JWT Bearer token in `Authorization` header
- User ID is extracted from JWT token (`req.user.id`)
- No anonymous access permitted for profile operations

### Content-Type Validation
- PUT `/profile/preferences` explicitly requires `application/json` Content-Type
- Other routes inherit standard Express JSON parsing behavior

### Healthcare Data Handling
- Medical conditions field implements comprehensive sanitization
- XSS, SQL injection, and NoSQL injection prevention
- Max 10 medical conditions per profile
- Pattern validation for medical terminology

### Unit Conversion Support
- Height field supports both metric (number) and imperial (feet/inches object)
- Weight and other measurements respect `unitPreference` setting
- Conversion errors result in 409 status code

### Body Size Limits
- **Medical Conditions:** Max 10 items, 200 characters each
- **Name:** 2-100 characters
- **Notes/Comments:** 500 characters (if applicable)
- **No explicit file upload limits** (profiles are JSON-only)

### Frontend Integration Considerations
- **State Management:** Profile changes should trigger app-wide state updates
- **Form Validation:** Client-side validation should match server-side Joi schemas
- **Error Handling:** Specific error types (ValidationError, ConflictError) for appropriate UI feedback
- **Unit Preferences:** UI should adapt based on user's `unitPreference` setting
- **Progressive Enhancement:** Profile creation can be done incrementally (all fields optional except `unitPreference`)

### Performance Characteristics
- **No Rate Limiting:** Profile operations are not rate-limited (assuming reasonable usage)
- **Validation Overhead:** Comprehensive validation adds processing time
- **Database Operations:** All operations use authenticated Supabase client with RLS