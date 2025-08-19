# Validation Middleware Documentation

## Overview

The validation middleware provides comprehensive request validation using Joi schemas for all API endpoints. It implements defense-in-depth validation with custom sanitization patterns, particularly for healthcare data, and standardized error responses.

**Location**: `backend/middleware/validation.js`  
**Dependencies**: `joi`, custom error utilities  
**Type**: Request validation and sanitization

## Core Functions

### Primary Validation Function

```javascript
validate(schema, property = 'body')
```
- **Purpose**: Generic validation middleware factory
- **Parameters**: 
  - `schema`: Joi validation schema
  - `property`: Request property to validate ('body', 'query', 'params')
- **Returns**: Express middleware function
- **Error Handling**: Returns 400 with detailed validation errors

### Error Formatting Function

```javascript
formatValidationError(error)
```
- **Purpose**: Standardizes Joi validation error responses
- **Parameters**: Joi validation error object
- **Returns**: Formatted error object with status, message, and details

## Validation Schemas

### User Authentication Schemas

#### Registration Schema (`userSchemas.register`)
```javascript
{
  email: string (email format, required),
  password: string (min 8 chars, pattern validation, required),
  name: string (2-100 chars, optional)
}
```
**Validation Rules**:
- Email: Valid email format required
- Password: Minimum 8 characters, must contain uppercase, lowercase, number, and special character
- Name: 2-100 characters, allows null/empty

#### Login Schema (`userSchemas.login`)
```javascript
{
  email: string (email format, required),
  password: string (required),
  rememberMe: boolean (default: false)
}
```

#### Refresh Token Schema (`userSchemas.refresh`)
```javascript
{
  refreshToken: string (required, non-empty)
}
```

#### Update Profile Schema (`userSchemas.updateProfile`)
```javascript
{
  name: string (2-100 chars, optional),
  email: string (email format, optional),
  currentPassword: string (required if newPassword provided),
  newPassword: string (same pattern as registration, requires currentPassword)
}
```

### Workout Management Schemas

#### Workout Generation Schema (`workoutSchemas.workoutGenerationSchema`)
```javascript
{
  fitnessLevel: string (enum: ['beginner', 'intermediate', 'advanced'], required),
  goals: array of strings (min 1 item, required),
  equipment: array of strings (default: []),
  restrictions: array of strings (default: []),
  exerciseTypes: array of strings (min 1 item, required),
  workoutFrequency: string (optional),
  additionalNotes: string (max 500 chars, default: '')
}
```

#### Workout Re-Generation Schema (`workoutSchemas.workoutReGenerationSchema`)
- Partial update version of generation schema
- Minimum 1 field required
- All fields optional but follow same validation rules

#### Workout Adjustment Schema (`workoutSchemas.workoutAdjustmentSchema`)
```javascript
{
  adjustments: {
    exercisesToAdd: array of objects (optional),
    exercisesToRemove: array of UUIDs (optional),
    notesOrPreferences: string (max 1000 chars, required)
  }
}
```

#### Workout Query Schema (`workoutSchemas.workoutQuerySchema`)
```javascript
{
  limit: number (1-100, default: 10),
  offset: number (min 0, default: 0),
  searchTerm: string (max 100 chars, optional)
}
```

### Workout Logging Schemas

#### Workout Log Schema (`workoutSchemas.workoutLogSchema`)
```javascript
{
  log_id: string UUID (optional),
  user_id: string UUID (optional),
  plan_id: string UUID (nullable, optional),
  date: date (required),
  completed: boolean (default: true),
  exercises_completed: array of exercise objects (min 1, required),
  overall_difficulty: number (1-10, optional),
  energy_level: number (1-10, optional),
  satisfaction: number (1-10, optional),
  feedback: string (max 1000 chars, optional)
}
```

**Exercise Object Structure**:
```javascript
{
  exercise_id: string (required),
  exercise_name: string (required),
  sets_completed: number (min 1, required),
  reps_completed: array of numbers (min 0, required),
  weights_used: array of numbers (min 0, required),
  felt_difficulty: number (1-10, optional),
  notes: string (optional)
}
```

#### Workout Log Update Schema (`workoutSchemas.workoutLogUpdateSchema`)
- Partial update version of workout log schema
- Minimum 1 field required for updates
- Same validation rules as creation schema

#### Workout Log Query Schema (`workoutSchemas.workoutLogQuerySchema`)
```javascript
{
  limit: number (1-100, default: 10),
  offset: number (min 0, default: 0),
  startDate: date (optional),
  endDate: date (optional),
  planId: string UUID (optional)
}
```

### Profile Management Schemas

#### Profile Creation Schema (`profileSchemas.create`)
```javascript
{
  userId: string UUID (optional - overridden by JWT),
  name: string (2-100 chars, optional),
  age: number (13-120, optional),
  gender: string (enum: ['male', 'female', 'other', 'prefer_not_to_say', 'non-binary', ''], optional),
  height: number | object (metric: cm, imperial: {feet, inches}, optional),
  weight: number (positive, optional),
  unitPreference: string (enum: ['metric', 'imperial'], optional),
  experienceLevel: string (enum: ['beginner', 'intermediate', 'advanced'], optional),
  goals: array of strings (optional),
  equipment: array of strings (optional),
  exercisePreferences: array of strings (optional),
  equipmentPreferences: array of strings (optional),
  medicalConditions: array of sanitized strings (max 10, optional),
  workoutFrequency: string (optional)
}
```

**Special Validation Rules**:

**Height Field**: Supports both metric and imperial formats
```javascript
// Metric (centimeters)
height: 175

// Imperial (feet and inches)
height: {
  feet: 5,
  inches: 11
}
```

**Medical Conditions**: Enhanced security validation
```javascript
medicalConditions: [
  "asthma",
  "lower back pain"
]
```
**Sanitization Patterns**:
- XSS prevention: Blocks HTML tags and JavaScript
- SQL injection prevention: Blocks SQL keywords and patterns
- NoSQL injection prevention: Blocks MongoDB operators
- Character validation: Alphanumeric plus safe punctuation only
- Length limits: 1-200 characters per condition
- Array limits: Maximum 10 conditions

#### Profile Update Schema (`profileSchemas.update`)
- Same validation rules as creation schema
- All fields optional for partial updates
- `allowUnknown: false` to reject unexpected fields

#### Profile Preferences Schema (`profileSchemas.preferences`)
```javascript
{
  unitPreference: string (enum: ['metric', 'imperial'], optional),
  goals: array of strings (optional),
  equipment: array of strings (optional),
  experienceLevel: string (enum: ['beginner', 'intermediate', 'advanced'], optional),
  workoutFrequency: string (optional)
}
```
- Minimum 1 field required for updates

### Health & Progress Schemas

#### Check-In Schema (`checkInSchema`)
```javascript
{
  date: date (required),
  weight: number (positive, optional),
  body_fat_percentage: number (0-50, optional),
  measurements: {
    waist: number (positive, optional),
    chest: number (positive, optional),
    arms: number (positive, optional),
    legs: number (positive, optional),
    hips: number (positive, optional),
    shoulders: number (positive, optional),
    neck: number (positive, optional)
  },
  mood: string (enum: ['poor', 'fair', 'good', 'excellent'], optional),
  sleep_quality: string (enum: ['poor', 'fair', 'good', 'excellent'], optional),
  energy_level: number (1-10, optional),
  stress_level: number (1-10, optional),
  notes: string (max 500 chars, optional)
}
```

#### Metrics Calculation Schema (`metricCalculationSchema`)
```javascript
{
  startDate: date (required),
  endDate: date (required, must be after startDate)
}
```

### Macro Calculation Schema

#### Macro Calculation Schema (`macroCalculationSchema`)
```javascript
{
  weight: number (20-300, required),
  height: number | object (metric: 50-250 cm, imperial: 3-8 ft, required),
  age: number (13-120, required),
  gender: string (enum: ['male', 'female', 'other'], required),
  activityLevel: string (enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'], required),
  goal: string (enum: ['weight_loss', 'maintenance', 'muscle_gain'], required),
  units: string (enum: ['metric', 'imperial'], default: 'metric'),
  useExternalApi: boolean (default: true)
}
```

**Automatic Unit Conversion**:
- Imperial weight (lbs) → metric (kg): `weight / 2.20462`
- Imperial height (ft/in) → metric (cm): `(feet * 12 + inches) * 2.54`

### Notification Preferences Schema

#### Notification Preferences Schema (`notificationPreferencesSchema`)
```javascript
{
  email_enabled: boolean (optional),
  sms_enabled: boolean (optional),
  push_enabled: boolean (optional),
  in_app_enabled: boolean (optional),
  quiet_hours_start: string (HH:MM format, optional),
  quiet_hours_end: string (HH:MM format, optional)
}
```

## Middleware Functions

### User Authentication Middleware
- `validateRegistration`: Validates user registration data
- `validateLogin`: Validates login credentials
- `validateRefreshToken`: Validates refresh token requests

### Profile Management Middleware
- `validateProfileCreation`: Validates profile creation data
- `validateProfileUpdate`: Validates profile updates
- `validateProfilePreferences`: Validates preference updates

### Workout Management Middleware
- `validateWorkoutGeneration`: Validates workout generation requests
- `validateWorkoutReGeneration`: Validates workout regeneration requests
- `validateWorkoutAdjustment`: Validates workout adjustment requests
- `validateWorkoutQuery`: Validates workout query parameters

### Workout Logging Middleware
- `validateWorkoutLog`: Validates workout log creation
- `validateWorkoutLogUpdate`: Validates workout log updates
- `validateWorkoutLogQuery`: Validates workout log query parameters

### Health & Progress Middleware
- `validateCheckIn`: Validates check-in data submission
- `validateMetricsCalculation`: Validates metrics calculation parameters
- `validateMacroCalculation`: Validates macro calculation requests
- `validateNotificationPreferences`: Validates notification preference updates

## Usage Patterns

### Basic Route Validation
```javascript
const { validateProfileCreation } = require('../middleware/validation');

router.post('/profile', validateProfileCreation, profileController.createProfile);
```

### Query Parameter Validation
```javascript
const { validateWorkoutQuery } = require('../middleware/validation');

router.get('/workouts', validateWorkoutQuery, workoutController.listWorkouts);
```

### Custom Schema Validation
```javascript
const { validate, workoutSchemas } = require('../middleware/validation');

router.put('/workouts/:planId', 
  validate(workoutSchemas.workoutAdjustmentSchema, 'body'),
  workoutController.adjustWorkout
);
```

### Multiple Property Validation
```javascript
router.get('/workout-logs',
  validate(workoutSchemas.workoutLogQuerySchema, 'query'),
  workoutController.getWorkoutLogs
);
```

## Error Handling

### Validation Error Response Format
```javascript
{
  status: "error",
  message: "Validation failed",
  details: [
    {
      field: "email",
      message: "Please provide a valid email address",
      type: "string.email",
      value: "invalid-email"
    }
  ]
}
```

### Healthcare Data Validation Errors
```javascript
{
  status: "error",
  message: "Validation failed",
  details: [
    {
      field: "medicalConditions",
      message: "Medical condition contains potentially harmful content",
      type: "medicalConditions.xss"
    }
  ]
}
```

### Unit Conversion Errors
Automatic unit conversion is performed in the `validateMacroCalculation` middleware:
```javascript
// Imperial to metric conversion
if (value.units === 'imperial') {
  value.weight = Math.round(value.weight / 2.20462 * 10) / 10;
  if (typeof value.height === 'object') {
    const totalInches = (value.height.feet * 12) + value.height.inches;
    value.height = Math.round(totalInches * 2.54);
  }
}
```

## Configuration Options

### Validation Options
```javascript
// Strict validation (reject unknown fields)
.options({ allowUnknown: false })

// Abort early vs. collect all errors
.validate(data, { abortEarly: false })

// Convert types automatically
.validate(data, { convert: true })
```

### Custom Error Messages
```javascript
Joi.string()
  .min(8)
  .messages({
    'string.min': 'Password must be at least 8 characters long'
  })
```

### Healthcare Data Sanitization
```javascript
.custom((value, helpers) => {
  const sanitized = value.trim();
  
  // XSS prevention
  if (/<[^>]*>/g.test(sanitized)) {
    return helpers.error('medicalConditions.xss');
  }
  
  // SQL injection prevention
  if (/['";]|--|\*|DROP\s+TABLE/i.test(sanitized)) {
    return helpers.error('medicalConditions.sqlInjection');
  }
  
  return sanitized;
})
```

## Best Practices

### Schema Organization
- Group related schemas by functional area (user, workout, profile)
- Use descriptive schema names that indicate purpose
- Export both individual middleware functions and schema objects

### Error Message Clarity
- Provide specific, actionable error messages
- Include field names and acceptable values
- Use consistent error format across all endpoints

### Security Considerations
- Implement custom sanitization for sensitive data
- Validate array lengths to prevent DoS attacks
- Reject unknown fields to prevent parameter pollution
- Use pattern matching for format validation

### Performance Optimization
- Use `abortEarly: false` only when all errors are needed
- Keep regex patterns simple and efficient
- Cache compiled schemas when possible

## Integration Examples

### Complete Route Implementation
```javascript
const express = require('express');
const { 
  validateProfileCreation, 
  validateProfileUpdate,
  validateProfilePreferences 
} = require('../middleware/validation');
const profileController = require('../controllers/profile');

const router = express.Router();

// Profile creation with validation
router.post('/profile', 
  validateProfileCreation, 
  profileController.createProfile
);

// Profile update with validation
router.put('/profile', 
  validateProfileUpdate, 
  profileController.updateProfile
);

// Preference update with validation
router.put('/profile/preferences', 
  validateProfilePreferences, 
  profileController.updatePreferences
);

module.exports = router;
```

### Error Handling Integration
```javascript
const { globalErrorHandler } = require('../middleware/error-middleware');

// Validation middleware automatically calls next(error) on validation failure
// Global error handler will format and send standardized error responses
app.use(globalErrorHandler);
```