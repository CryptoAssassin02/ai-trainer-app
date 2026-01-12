# User Profiles Services Documentation

## Overview
The User Profiles service handles all business logic for user profile management including CRUD operations, data validation, unit conversions, and storage format transformations. The service provides a comprehensive interface for profile operations with robust error handling and data integrity.

## Service Architecture

### Dependencies
- **Supabase Client**: `getSupabaseClientWithToken()` for RLS-scoped database access
- **Error Handling**: `ValidationError`, `NotFoundError`, `InternalError`, `ConflictError`
- **Unit Conversion**: `convertHeight()`, `convertWeight()` from utils
- **Logging**: Winston logger for structured logging

### Database Constants
- **Table**: `user_profiles`
- **Version Conflict Error**: `P2034`
- **Max Retry Attempts**: 3
- **PGRST116**: PostgreSQL "not found" error code

## Service Methods

### 1. getProfileByUserId()
**Purpose**: Retrieve a user's complete profile with unit conversions

**Signature**: `getProfileByUserId(userId, jwtToken)`

**Parameters**:
- `userId` (string): UUID of the user
- `jwtToken` (string): JWT token for RLS-scoped client

**Database Operations**:
```javascript
const { data, error } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('user_id', userId)
  .single();
```

**Data Transformation**:
- Converts database snake_case to camelCase
- Applies unit conversions based on user preference
- Maps `fitness_goals` → `goals`
- Maps `equipment` → `equipment`

**Response Format**:
```javascript
{
  id: "uuid",
  userId: "uuid",
  unitPreference: "metric",
  gender: "male",
  age: 30,
  name: "John Doe",
  experienceLevel: "intermediate",
  medicalConditions: ["none"],
  goals: ["strength", "endurance"],
  workoutFrequency: "4-5 times per week",
  equipment: ["dumbbells", "barbell"],
  height: 175, // cm or {feet: 5, inches: 10}
  weight: 70.5, // kg or lbs based on preference
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-01-15T10:30:00Z"
}
```

**Error Handling**:
- `PGRST116` → `NotFoundError`
- Database errors → `InternalError`
- Null data → `NotFoundError`

**Logging**:
- Warning for not found profiles
- Error for database operations
- Debug for data conversion

### 2. createProfile()
**Purpose**: Create a new user profile with comprehensive validation

**Signature**: `createProfile(profileData, jwtToken)`

**Parameters**:
- `profileData` (Object): Complete profile data
- `jwtToken` (string): JWT token for RLS-scoped client

**Request Data Processing**:
1. Validates all input data using `validateProfileData()`
2. Converts to database format using `prepareProfileDataForStorage()`
3. Handles unit conversions for height/weight
4. Maps camelCase to snake_case field names

**Database Operations**:
```javascript
const { data: newProfileData } = await supabase
  .from('user_profiles')
  .insert(dbData)
  .select()
  .single();
```

**Data Validation Requirements**:
- `userId`: Required, UUID format
- `unitPreference`: Required, "metric" or "imperial"
- `height`: Optional, number (cm) or {feet, inches}
- `weight`: Optional, positive number
- `age`: Optional, positive integer
- `medicalConditions`: Optional, array of strings (max 10, max 200 chars each)
- `goals`: Optional, array of strings
- `equipment`: Optional, array of strings

**Unit Conversion Logic**:
- Height: Imperial {feet, inches} → cm for storage
- Weight: lbs → kg for storage (when unitPreference = "imperial")
- Storage: Always metric in database
- Response: Converted to user preference

**Error Handling**:
- `ValidationError` → Re-thrown for client
- `23505` (unique violation) → `ConflictError`
- Database errors → `InternalError`
- Missing data after insert → `InternalError`

**Logging**:
- Info for successful creation
- Debug for data preparation and conversion
- Error for all failure cases

### 3. updateProfile()
**Purpose**: Update existing profile with partial data support

**Signature**: `updateProfile(userId, data, jwtToken)`

**Parameters**:
- `userId` (string): UUID of the user
- `data` (Object): Partial profile data to update
- `jwtToken` (string): JWT token for RLS-scoped client

**Update Process**:
1. Validates input data using `validateProfileData(data, true)`
2. Fetches existing profile for reference
3. Prepares update payload with existing data context
4. Performs atomic database update

**Database Operations**:
```javascript
// Fetch existing profile
const { data: existingProfile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('user_id', userId)
  .single();

// Update with changes
const { data: updatedData } = await supabase
  .from('user_profiles')
  .update(updatePayload)
  .eq('user_id', userId)
  .select()
  .single();
```

**Partial Update Logic**:
- Only updates provided fields
- Preserves existing values for non-provided fields
- Handles unit preference changes with existing measurements
- Automatic timestamp updates

**Unit Conversion During Updates**:
- Height: Converts new height values to cm for storage
- Weight: Converts new weight values to kg for storage
- Unit preference changes: Keeps existing measurements in database format
- Response conversion: Always matches user's current preference

**Error Handling**:
- `PGRST116` → `NotFoundError`
- `ValidationError` → Re-thrown
- Database errors → `InternalError`

**Logging**:
- Debug for fetch operations
- Debug for update operations
- Error for all failure cases

### 4. getProfilePreferences()
**Purpose**: Retrieve only preference-related profile data

**Signature**: `getProfilePreferences(userId, jwtToken)`

**Parameters**:
- `userId` (string): UUID of the user
- `jwtToken` (string): JWT token for RLS-scoped client

**Database Operations**:
```javascript
const { data, error } = await supabase
  .from('user_profiles')
  .select('unit_preference, fitness_goals, equipment, experience_level, workout_frequency, updated_at, user_id')
  .eq('user_id', userId)
  .single();
```

**Response Format**:
```javascript
{
  userId: "uuid",
  unitPreference: "metric",
  goals: ["strength", "endurance"],
  equipment: ["dumbbells", "barbell"],
  experienceLevel: "intermediate",
  workoutFrequency: "4-5 times per week",
  updatedAt: "2024-01-15T10:30:00Z"
}
```

**Data Transformation**:
- Maps `fitness_goals` → `goals`
- Maps `unit_preference` → `unitPreference`
- Maps `experience_level` → `experienceLevel`
- Maps `workout_frequency` → `workoutFrequency`

**Error Handling**:
- `PGRST116` → `NotFoundError`
- Database errors → `InternalError`
- Null data → `NotFoundError`

**Use Cases**:
- Preference-only queries for UI
- Lightweight data loading
- Settings synchronization

### 5. updateProfilePreferences()
**Purpose**: Update only preference-related profile data

**Signature**: `updateProfilePreferences(userId, preferenceData, jwtToken)`

**Parameters**:
- `userId` (string): UUID of the user
- `preferenceData` (Object): Preference data to update
- `jwtToken` (string): JWT token for RLS-scoped client

**Update Process**:
1. Validates preference data using `validatePreferenceData()`
2. Checks if profile exists
3. Prepares partial update payload
4. Performs selective database update

**Supported Preference Fields**:
- `unitPreference`: "metric" or "imperial"
- `goals`: Array of fitness goals
- `equipment`: Array of equipment preferences
- `experienceLevel`: User's experience level
- `workoutFrequency`: Workout frequency preference

**Database Operations**:
```javascript
// Check profile existence
const { data: existingProfile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('user_id', userId)
  .single();

// Update only provided preferences
const { data } = await supabase
  .from('user_profiles')
  .update(dataToUpdate)
  .eq('user_id', userId)
  .select('unit_preference, fitness_goals, equipment, experience_level, workout_frequency, updated_at, user_id')
  .single();
```

**Partial Update Logic**:
- Only updates fields present in `preferenceData`
- Preserves existing values for non-provided fields
- Returns existing data if no changes provided
- Automatic timestamp updates

**Error Handling**:
- `ValidationError` → Re-thrown
- `PGRST116` → `NotFoundError`
- Database errors → `InternalError`

**Special Features**:
- No-op handling for empty updates
- Atomic preference updates
- Optimistic update support

## Data Validation Framework

### Profile Data Validation (`validateProfileData()`)

**Required Fields (Create)**:
- `userId`: Must be present and valid UUID
- `unitPreference`: Must be "metric" or "imperial"

**Optional Fields (Create/Update)**:
- `height`: Number (cm) or {feet, inches} object
- `weight`: Positive number
- `age`: Positive integer
- `goals`: Array of strings
- `equipment`: Array of strings
- `medicalConditions`: Array of strings with healthcare validation

**Healthcare Data Validation**:
- Max 10 medical conditions
- Max 200 characters per condition
- Alphanumeric characters only with basic punctuation
- XSS and injection prevention
- Empty string validation

**Height Validation**:
- Metric: Positive number (centimeters)
- Imperial: Object with `feet` and `inches` properties
- Both values must be non-negative numbers

**Weight Validation**:
- Must be positive number
- Validated before unit conversion

### Preference Data Validation (`validatePreferenceData()`)

**Validated Fields**:
- `unitPreference`: "metric" or "imperial"
- `goals`: Array of strings
- `equipment`: Array of strings
- `experienceLevel`: String value
- `workoutFrequency`: String value

**Validation Rules**:
- All fields are optional
- Array fields must be arrays when provided
- String fields must be strings when provided
- Null values are allowed

## Unit Conversion System

### Storage Format (Database)
- **Height**: Always stored in centimeters (cm)
- **Weight**: Always stored in kilograms (kg)
- **Unit Preference**: Stored as string ("metric" or "imperial")

### Conversion Logic

#### Height Conversion
**Imperial to Metric (Storage)**:
```javascript
// Input: {feet: 5, inches: 10}
const totalInches = (feet * 12) + inches;
const centimeters = Math.round(totalInches * 2.54 * 10) / 10;
// Output: 177.8 cm
```

**Metric to Imperial (Response)**:
```javascript
// Input: 177.8 cm
const totalInches = centimeters / 2.54;
const feet = Math.floor(totalInches / 12);
const inches = Math.round(totalInches % 12);
// Output: {feet: 5, inches: 10}
```

#### Weight Conversion
**Imperial to Metric (Storage)**:
```javascript
// Input: 150 lbs
const kilograms = Math.round(pounds * 0.45359237 * 10) / 10;
// Output: 68.0 kg
```

**Metric to Imperial (Response)**:
```javascript
// Input: 68.0 kg
const pounds = Math.round(kilograms * 2.20462262 * 10) / 10;
// Output: 150.0 lbs
```

### Response Unit Conversion (`convertProfileUnitsForResponse()`)

**Conversion Rules**:
- Height: cm → {feet, inches} if unitPreference = "imperial"
- Weight: kg → lbs if unitPreference = "imperial"
- No conversion if unitPreference = "metric"
- Fallback to original values if conversion fails

**Error Handling**:
- Conversion failures logged but don't fail the request
- Original values returned as fallback
- Debug logging for all conversions

## Data Storage Preparation (`prepareProfileDataForStorage()`)

### Field Mapping (camelCase → snake_case)
- `userId` → `user_id`
- `unitPreference` → `unit_preference`
- `goals` → `fitness_goals`
- `workoutFrequency` → `workout_frequency`
- `experienceLevel` → `experience_level`
- `medicalConditions` → `medical_conditions`

### Equipment Field Handling
**Priority Order**:
1. `equipmentPreferences` → `equipment`
2. `exercisePreferences` → `equipment`
3. `equipment` → `equipment`

### Unit Conversion During Storage
- Height: Converts imperial objects to centimeters
- Weight: Converts pounds to kilograms based on unit preference
- Unit preference changes: Preserves existing measurements
- Validation before conversion

### Timestamp Management
- `updated_at`: Always set to current timestamp
- `created_at`: Only set for new profiles
- ISO string format for all timestamps

## Error Handling Architecture

### Error Types
- `ValidationError`: Input data validation failures
- `NotFoundError`: Profile not found (404)
- `ConflictError`: Profile already exists (409)
- `InternalError`: Database or system errors (500)

### Error Codes
- `PGRST116`: PostgreSQL "not found" error
- `23505`: PostgreSQL unique constraint violation
- `P2034`: Version conflict error

### Error Propagation
- Validation errors: Re-thrown to controller
- Database errors: Wrapped in appropriate error type
- Conversion errors: Wrapped in ValidationError
- Logging: All errors logged with context

### Error Context
- User ID included in all error logs
- Operation type specified
- Original error preserved in wrapping

## Performance Considerations

### Database Optimization
- Single query operations
- Efficient SELECT statements
- RLS policy compliance
- Indexed user_id queries

### Response Times
- Profile retrieval: < 100ms
- Profile creation: < 200ms
- Profile updates: < 150ms
- Preference operations: < 100ms

### Memory Usage
- Minimal object creation
- Efficient data transformation
- Garbage collection friendly
- Stream processing for large data

### Caching Strategy
- No service-level caching (handled by RLS)
- Efficient unit conversion caching
- Minimal intermediate objects

## Security Implementation

### Authentication
- JWT token required for all operations
- RLS-scoped Supabase client
- Token validation at service boundary

### Authorization
- User can only access own profile
- RLS policies enforced
- No cross-user data access

### Data Protection
- Healthcare data validation
- XSS prevention in medical conditions
- Input sanitization
- SQL injection prevention

### Privacy
- No logging of sensitive data
- Error messages don't leak user data
- Audit trail for profile changes

## Integration Patterns

### Controller Integration
```javascript
// Standard service call pattern
const profile = await profileService.getProfileByUserId(userId, jwtToken);

// Error handling delegation
try {
  const result = await profileService.createProfile(profileData, jwtToken);
} catch (error) {
  // Service throws typed errors for controller handling
}
```

### Database Integration
```javascript
// RLS-scoped client usage
const supabase = getSupabaseClientWithToken(jwtToken);

// Consistent error handling
if (error.code === 'PGRST116') {
  throw new NotFoundError('Profile not found');
}
```

### Unit Conversion Integration
```javascript
// Conversion utility usage
const centimeters = convertHeight(height, 'imperial', 'metric');
const kilograms = convertWeight(weight, 'imperial', 'metric');
```

## Testing Considerations

### Unit Testing
- Mock Supabase client responses
- Test all validation scenarios
- Error handling coverage
- Unit conversion accuracy

### Integration Testing
- Real database operations
- RLS policy validation
- End-to-end data flow
- Error propagation testing

### Performance Testing
- Load testing with concurrent users
- Database query optimization
- Memory usage monitoring
- Response time validation

### Security Testing
- Authentication bypass attempts
- Input validation bypasses
- SQL injection attempts
- XSS protection validation

## Monitoring & Logging

### Log Levels
- **Info**: Successful operations
- **Debug**: Data transformation steps
- **Warn**: Not found conditions
- **Error**: Database errors and failures

### Structured Logging
```javascript
logger.info('Profile created successfully', { userId, operation: 'createProfile' });
logger.debug('Data conversion completed', { from: 'imperial', to: 'metric' });
logger.error('Database error in getProfileByUserId', { userId, error: error.message });
```

### Performance Monitoring
- Operation timing
- Database query performance
- Unit conversion overhead
- Memory usage tracking

### Error Tracking
- Error frequency monitoring
- Error type distribution
- User impact analysis
- Performance degradation alerts

## Future Enhancements

### Planned Features
- Profile versioning support
- Bulk profile operations
- Advanced validation rules
- Profile completion scoring

### Performance Improvements
- Query optimization
- Response caching
- Unit conversion optimization
- Database connection pooling

### Security Enhancements
- Enhanced healthcare data protection
- Audit logging
- Advanced input validation
- Rate limiting integration

---

*This documentation reflects the actual implementation as of the current codebase state. All service methods, validation logic, unit conversions, and error handling are documented based on the working code.*