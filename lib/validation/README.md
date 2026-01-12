# Profile Validation System

## Overview

This comprehensive validation system demonstrates modern form validation patterns using **Zod** and **React Hook Form** with advanced TypeScript integration. The system provides healthcare-grade data validation, real-time feedback, and seamless unit conversion.

## Key Features

### 🔒 **Healthcare Data Validation**
- Sanitizes medical condition inputs
- Prevents XSS attacks with content validation
- Supports array-based medical conditions (max 10)
- Character limits per condition (200 chars max)

### 📏 **Complex Height Validation**
- Dynamic schema validation based on unit preference
- Imperial: `{ feet: number, inches: number }` object structure
- Metric: Simple `number` (centimeters)
- Real-time unit conversion with validation
- Range validation per unit system

### ⚡ **Real-time Validation**
- `mode: 'onChange'` for instant feedback
- Character counters on text inputs
- Dynamic validation messages
- Form state-based submit button controls

### 🎯 **Type Safety**
- Full TypeScript integration with `z.infer`
- Strict type checking across components
- Schema-driven type generation
- Compile-time validation

## Schema Architecture

### Primary Profile Schema
```typescript
// Core demographic validation
export const profileCreationSchema = z.object({
  unitPreference: unitSystemSchema,
  name: nameSchema,                 // 2-100 chars, letters only
  age: ageSchema,                   // 13-120 years
  gender: genderSchema,             // Inclusive options
  height: z.union([...]),           // Dynamic based on unit
  weight: weightSchema,             // Range validated by unit
  experienceLevel: experienceLevelSchema,
  goals: goalsSchema,               // 1-3 goals max
  equipment: equipmentSchema,       // 1-10 items max
  medicalConditions: medicalConditionsSchema,
  workoutFrequency: workoutFrequencySchema,
});
```

### Medical Conditions Schema
```typescript
// Healthcare-grade validation
export const medicalConditionSchema = z.string()
  .min(1, 'Medical condition cannot be empty')
  .max(200, 'Medical condition description must be 200 characters or less')
  .regex(/^[a-zA-Z0-9\s\-.,()_\/&]+$/, 'Invalid characters detected')
  .refine(val => !/<[^>]*>|javascript:|data:/i.test(val), 'Security violation')
  .transform(val => val.trim());
```

### Dynamic Height Validation
```typescript
// Unit-aware height validation
export const createDynamicProfileSchema = (
  mode: 'create' | 'update',
  unitPreference?: 'metric' | 'imperial'
) => {
  return baseSchema.refine((data) => {
    if (data.height && unitPreference === 'imperial') {
      return typeof data.height === 'object';
    }
    if (data.height && unitPreference === 'metric') {
      return typeof data.height === 'number';
    }
    return true;
  }, {
    message: `Height format must match ${unitPreference} unit system`,
    path: ['height']
  });
};
```

## Component Examples

### Enhanced Form Integration
```typescript
// React Hook Form with dynamic schema
const currentSchema = createDynamicProfileSchema('update', isMetric ? 'metric' : 'imperial');

const form = useForm<FormValues>({
  resolver: zodResolver(currentSchema),
  mode: 'onChange', // Real-time validation
  defaultValues: {
    // ... comprehensive defaults
  },
});
```

### Medical Conditions Component
- Dynamic field array with validation
- Real-time character counting
- Healthcare data sanitization
- Security pattern matching

### Height Input Component
- Automatic unit conversion
- Complex object/number validation
- Real-time conversion display
- Range validation per unit system

## Validation Patterns

### 1. **Security-First Validation**
```typescript
// Prevents XSS and injection attacks
.refine(val => !/<[^>]*>|javascript:|data:/i.test(val), 'Security violation')
```

### 2. **Healthcare Data Standards**
```typescript
// Allows medical terminology while preventing abuse
.regex(/^[a-zA-Z0-9\s\-.,()_\/&]+$/, 'Invalid characters detected')
```

### 3. **Dynamic Type Validation**
```typescript
// Runtime type checking based on user preference
.refine((data) => {
  if (data.unitPreference === 'imperial' && data.height) {
    return typeof data.height === 'object' && 'feet' in data.height;
  }
  return true;
}, { message: 'Height format must match unit system' })
```

### 4. **Range Validation by Context**
```typescript
// Different ranges based on unit system
.refine((data) => {
  if (data.weight && data.unitPreference === 'imperial') {
    return data.weight >= 44 && data.weight <= 2200; // lbs
  }
  if (data.weight && data.unitPreference === 'metric') {
    return data.weight >= 20 && data.weight <= 1000; // kg
  }
  return true;
}, { message: 'Weight is outside expected range' })
```

## Advanced Features

### Schema Factory Pattern
```typescript
export const createDynamicProfileSchema = (
  mode: 'create' | 'update',
  unitPreference?: 'metric' | 'imperial'
) => {
  // Returns customized schema based on context
};
```

### Validation Helpers
```typescript
export const validateMedicalCondition = (condition: string): boolean => {
  try {
    medicalConditionSchema.parse(condition);
    return true;
  } catch {
    return false;
  }
};
```

### Error Message Customization
```typescript
export const getFieldErrorMessage = (
  field: string,
  error: z.ZodError
): string | undefined => {
  const fieldError = error.errors.find(err => err.path.includes(field));
  return fieldError?.message;
};
```

## Best Practices Demonstrated

### 1. **Real-time Feedback**
- Character counters
- Instant validation messages
- Dynamic submit button states
- Validation summaries

### 2. **Accessibility**
- Proper form labels and descriptions
- Error message associations
- Screen reader friendly
- Keyboard navigation support

### 3. **Security**
- Input sanitization
- XSS prevention
- Content validation
- Safe HTML practices

### 4. **User Experience**
- Progressive disclosure
- Clear validation messages
- Helpful placeholders
- Visual feedback

### 5. **Performance**
- Efficient re-renders with `mode: 'onChange'`
- Optimized validation triggers
- Lazy schema evaluation
- Minimal DOM updates

## Integration Guide

### 1. Install Dependencies
```bash
npm install zod @hookform/resolvers react-hook-form
```

### 2. Import Schema
```typescript
import { 
  profileCreationSchema, 
  type ProfileCreationFormData,
  VALIDATION_CONSTANTS 
} from '@/lib/validation/profile-schemas';
```

### 3. Setup Form
```typescript
const form = useForm<ProfileCreationFormData>({
  resolver: zodResolver(profileCreationSchema),
  mode: 'onChange',
});
```

### 4. Use Components
```typescript
import { HeightInput } from '@/components/profile/height-input';
import { MedicalConditionsForm } from '@/components/profile/medical-conditions-form';
```

## Testing Strategy

### Unit Tests
- Schema validation edge cases
- Helper function validation
- Type inference verification

### Integration Tests
- Form submission flows
- Unit conversion accuracy
- Error state handling

### Security Tests
- XSS prevention verification
- Input sanitization validation
- Content filtering effectiveness

## Performance Considerations

- **Lazy validation**: Schemas are created dynamically only when needed
- **Optimized re-renders**: React Hook Form's efficient change detection
- **Minimal validations**: Only validate what's necessary when it's necessary
- **Type safety**: Catch errors at compile time, not runtime

This validation system represents a production-ready approach to complex form validation with modern web standards, security best practices, and excellent user experience.
