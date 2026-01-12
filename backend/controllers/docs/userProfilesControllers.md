# User Profiles Controllers Documentation

## Overview
The User Profiles controllers handle HTTP requests for user profile management, including profile creation, updates, retrieval, and preferences management. The controllers provide a clean interface between the Express routes and the profile service layer.

## Controller Methods

### 1. getProfile
**Purpose**: Retrieve a user's complete profile data

**Route**: `GET /profile`

**Parameters**:
- `req.params.userId` (optional): User ID from route parameters (admin access)
- `req.user.id`: Authenticated user ID from JWT token
- `req.headers.authorization`: JWT Bearer token

**Request Processing**:
1. Extracts user ID from either route params or authenticated user
2. Safely extracts JWT token from Authorization header
3. Validates user ID presence
4. Validates JWT token presence (except for admin param access)
5. Calls `profileService.getProfileByUserId(userId, jwtToken)`

**Response Format**:
```json
{
  "status": "success",
  "data": {
    "userId": "uuid",
    "age": 30,
    "height": 175,
    "weight": 70.5,
    "unitPreference": "metric",
    "fitnessGoals": ["strength", "endurance"],
    "medicalConditions": ["none"],
    "equipmentAccess": ["dumbbells", "barbell"]
  }
}
```

**Error Handling**:
- `400 Bad Request`: Missing user ID
- `401 Unauthorized`: Missing JWT token (AuthenticationError)
- `404 Not Found`: Profile not found (NotFoundError)
- `500 Internal Server Error`: Database or service errors

**Security**:
- Requires authentication for user profile access
- Supports admin access via route parameters
- JWT token validation for all authenticated requests

### 2. createOrUpdateProfile
**Purpose**: Create new profile or update existing profile (upsert operation)

**Route**: `POST /profile` or `PUT /profile`

**Parameters**:
- `req.user.id`: Authenticated user ID from JWT token
- `req.body`: Profile data to create/update
- `req.headers.authorization`: JWT Bearer token

**Request Processing**:
1. Extracts user ID from authenticated user
2. Safely extracts JWT token from Authorization header
3. Validates user ID and JWT token presence
4. Adds userId to profile data
5. Attempts to get existing profile
6. If profile exists: calls `profileService.updateProfile()`
7. If profile not found: calls `profileService.createProfile()`

**Request Body Schema**:
```json
{
  "age": 30,
  "height": 175,
  "weight": 70.5,
  "unitPreference": "metric",
  "fitnessGoals": ["strength", "endurance"],
  "medicalConditions": ["none"],
  "equipmentAccess": ["dumbbells", "barbell"],
  "experienceLevel": "intermediate",
  "workoutFrequency": "4-5 times per week",
  "timeAvailability": "45-60 minutes"
}
```

**Response Format**:
```json
{
  "status": "success",
  "message": "Profile updated successfully",
  "data": {
    "userId": "uuid",
    "age": 30,
    "height": 175,
    "weight": 70.5,
    "unitPreference": "metric",
    "fitnessGoals": ["strength", "endurance"],
    "medicalConditions": ["none"],
    "equipmentAccess": ["dumbbells", "barbell"]
  }
}
```

**Error Handling**:
- `400 Bad Request`: Missing user ID or validation errors
- `401 Unauthorized`: Missing JWT token
- `404 Not Found`: Profile not found during update
- `409 Conflict`: Profile conflict or concurrency error
- `500 Internal Server Error`: Database or service errors

**Special Features**:
- Upsert operation (create if not exists, update if exists)
- Consistent success message for both create and update
- Conflict error handling for concurrency issues
- Automatic userId injection into profile data

### 3. getProfilePreferences
**Purpose**: Retrieve user's profile preferences only

**Route**: `GET /profile/preferences`

**Parameters**:
- `req.user.id`: Authenticated user ID from JWT token
- `req.headers.authorization`: JWT Bearer token

**Request Processing**:
1. Extracts user ID from authenticated user
2. Safely extracts JWT token from Authorization header
3. Validates user ID and JWT token presence
4. Calls `profileService.getProfilePreferences(userId, jwtToken)`

**Response Format**:
```json
{
  "status": "success",
  "data": {
    "unitPreference": "metric",
    "fitnessGoals": ["strength", "endurance"],
    "equipmentAccess": ["dumbbells", "barbell"],
    "experienceLevel": "intermediate",
    "workoutFrequency": "4-5 times per week",
    "timeAvailability": "45-60 minutes"
  }
}
```

**Error Handling**:
- `400 Bad Request`: Missing user ID
- `401 Unauthorized`: Missing JWT token
- `404 Not Found`: Profile preferences not found
- `500 Internal Server Error`: Database or service errors

**Use Cases**:
- Fetching preferences for profile setup wizards
- Lightweight preference queries
- Settings page data loading

### 4. updateProfilePreferences
**Purpose**: Update user's profile preferences

**Route**: `PUT /profile/preferences`

**Parameters**:
- `req.user.id`: Authenticated user ID from JWT token
- `req.body`: Preference data to update
- `req.headers.authorization`: JWT Bearer token

**Request Processing**:
1. Extracts user ID from authenticated user
2. Safely extracts JWT token from Authorization header
3. Validates user ID and JWT token presence
4. Validates request body is not empty
5. Calls `profileService.updateProfilePreferences(userId, preferenceData, jwtToken)`

**Request Body Schema**:
```json
{
  "unitPreference": "imperial",
  "fitnessGoals": ["weight_loss", "muscle_gain"],
  "equipmentAccess": ["resistance_bands", "bodyweight"],
  "experienceLevel": "beginner",
  "workoutFrequency": "3-4 times per week",
  "timeAvailability": "30-45 minutes"
}
```

**Response Format**:
```json
{
  "status": "success",
  "message": "Profile preferences updated successfully",
  "data": {
    "unitPreference": "imperial",
    "fitnessGoals": ["weight_loss", "muscle_gain"],
    "equipmentAccess": ["resistance_bands", "bodyweight"],
    "experienceLevel": "beginner",
    "workoutFrequency": "3-4 times per week",
    "timeAvailability": "30-45 minutes"
  }
}
```

**Error Handling**:
- `400 Bad Request`: Missing user ID or empty request body
- `401 Unauthorized`: Missing JWT token
- `404 Not Found`: Profile preferences not found
- `500 Internal Server Error`: Database or service errors

**Special Features**:
- Partial update support (only provided fields are updated)
- Empty request body validation
- Dedicated preferences update endpoint

## Authentication & Authorization

### JWT Token Handling
- All controller methods require JWT Bearer token
- Token extracted safely from `Authorization` header
- Token passed to service layer for RLS-scoped database access
- AuthenticationError thrown for missing tokens

### User ID Extraction
- Primary: `req.user.id` from authenticated user
- Secondary: `req.params.userId` for admin access (getProfile only)
- Validation ensures user ID is present before proceeding

### Security Headers
```javascript
// Token extraction pattern
const jwtToken = req.headers.authorization?.split(' ')?.[1];
```

## Error Handling Patterns

### Error Type Mapping
- `ValidationError` → 400 Bad Request
- `NotFoundError` → 404 Not Found
- `ConflictError` → 409 Conflict
- `AuthenticationError` → 401 Unauthorized
- Other errors → 500 Internal Server Error (via next())

### Error Response Format
```json
{
  "status": "error",
  "message": "Error description",
  "details": "Additional error details (for validation errors)"
}
```

### ConflictError Handling
```json
{
  "status": "error",
  "message": "Conflict description",
  "errorCode": "PROFILE_CONFLICT_ERROR"
}
```

## Service Layer Integration

### Service Method Calls
- `profileService.getProfileByUserId(userId, jwtToken)`
- `profileService.createProfile(profileData, jwtToken)`
- `profileService.updateProfile(userId, profileData, jwtToken)`
- `profileService.getProfilePreferences(userId, jwtToken)`
- `profileService.updateProfilePreferences(userId, preferenceData, jwtToken)`

### Data Flow
1. Controller validates request parameters
2. Controller extracts and validates authentication
3. Controller calls appropriate service method
4. Service performs business logic and database operations
5. Controller formats and returns response

## Logging & Monitoring

### Debug Logging
- User ID logged for all operations
- Profile creation/update operations logged
- Error details logged with stack traces

### Warning Logging
- Missing user ID warnings
- Missing JWT token warnings
- Empty request body warnings

### Error Logging
- Full error details with stack traces
- Operation context (user ID, operation type)
- Structured logging format

## Performance Considerations

### Response Times
- Profile retrieval: < 200ms
- Profile updates: < 500ms
- Preferences operations: < 300ms

### Database Optimization
- Single database query per operation
- RLS-scoped queries for security
- Efficient user_id indexed queries

### Memory Usage
- Minimal request/response buffering
- Efficient error object handling
- JWT token extracted once per request

## Testing Considerations

### Unit Test Coverage
- All controller methods
- Error handling scenarios
- Authentication validation
- Request/response formatting

### Integration Test Scenarios
- End-to-end profile operations
- Authentication integration
- Database transaction handling
- Error propagation testing

### Mock Dependencies
- Service layer methods
- JWT token validation
- Database connections
- Error scenarios

## Future Enhancements

### Planned Features
- Profile versioning support
- Audit trail logging
- Bulk preference updates
- Profile validation caching

### Scalability Improvements
- Response caching
- Database connection pooling
- Rate limiting integration
- Async processing for heavy operations

---

*This documentation reflects the actual implementation as of the current codebase state. All controller methods, error handling, and integration patterns are documented based on the working code.*