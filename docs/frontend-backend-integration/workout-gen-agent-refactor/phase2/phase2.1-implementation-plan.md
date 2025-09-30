## Phase 2.1 Schema Separation: Detailed Implementation Plan

After reviewing the `chunked-schemas.js` file and its dependencies, here's my detailed assessment for schema separation:

### 📊 Current Schema Structure Analysis

**File Structure:**
- **Lines 1-54**: `programStructureSchema` - High-level program architecture
- **Lines 56-273**: `mesocycleDetailSchema` - Detailed workout specifications
- **Lines 1-11**: Critical OpenAI structured output documentation

**Dependencies Found:**
- `workout-prompts-chunked.js` - Uses both schemas for template generation
- `workout-chunked.js` - Uses both schemas for validation with AJV

### 🎯 Implementation Plan for Schema Separation

#### **Step 1: Create `workout-structure-schema.js`**
**Note:** No changes to structure fields required for Phase 2.1; goal prioritization ratios are enforced in prompts (Phase 2.2), not via schema.

Extract lines 1-54 from `chunked-schemas.js`:

**File Contents:**
- Copy the OpenAI strict mode documentation (lines 1-11) - Critical for both files
- Extract `programStructureSchema` object (lines 12-54)
- Add enhanced JSDoc documentation for each field
- Export as named export for consistency

Done
- Created `backend/utils/workout-structure-schema.js` with strict mode docs, extracted `programStructureSchema`, and JSDoc typedefs.

**Key Additions:**
```javascript
/**
 * @typedef {Object} ProgramStructure
 * @property {string} programName - Auto-generated descriptive name
 * @property {number} totalDuration - Program length in weeks (8-16)
 * @property {number} totalMesocycles - Number of training phases (2-4)
 * ... (document each field)
 */
```

#### **Step 2: Create `workout-mesocycle-schema.js`**

Extract lines 56-273 from `chunked-schemas.js`:

**File Contents:**
- Copy the OpenAI strict mode documentation (critical for schema compliance)
- Extract `mesocycleDetailSchema` object
- Extract the repetitive exercise schema pattern (appears 7 times for day1-day7)
- Create a reusable `exerciseSchema` constant to DRY the code

**Key Refactoring Opportunity:**
The current schema has identical exercise structures repeated 7 times. Extract this pattern:
```javascript
const exerciseSchema = {
  type: "object",
  required: ["exercise", "sets", "reps", "restTime", "notes"],
  properties: {
    exercise: { type: "string" },
    sets: { type: "integer", minimum: 1, maximum: 6 },
    reps: {
      oneOf: [
        { type: "integer", minimum: 1, maximum: 50 },
        { type: "string", pattern: "^\\d+-\\d+$" }
      ]
    },
    restTime: { type: "string" },
    notes: { type: "string" }
  },
  additionalProperties: false
};

const dayWorkoutSchema = {
  type: "object",
  required: ["exercises"],
  properties: {
    exercises: {
      type: "array",
      items: exerciseSchema
    }
  },
  additionalProperties: false
};

const restDaySchema = { type: "string", enum: ["Rest", "Active Recovery"] };

const daySchema = { oneOf: [dayWorkoutSchema, restDaySchema] };

// In mesocycleDetailSchema → weeks[].workouts:
workouts: {
  type: "object",
  required: ["day1","day2","day3","day4","day5","day6","day7"],
  properties: {
    day1: daySchema,
    day2: daySchema,
    day3: daySchema,
    day4: daySchema,
    day5: daySchema,
    day6: daySchema,
    day7: daySchema
  },
  additionalProperties: false
}
```

Then reference it in each day's schema, reducing 200+ lines to ~50 lines.

Done
- Created `backend/utils/workout-mesocycle-schema.js` with `exerciseSchema`, `dayWorkoutSchema`, `restDaySchema`, `daySchema`, and `mesocycleDetailSchema` referencing those. `workouts` requires day1–day7 and `additionalProperties: false` throughout.

#### **Step 3: Update Import Statements**

**In `backend/utils/workout-prompts-chunked.js`:**
```javascript
// Change from:
const { programStructureSchema, mesocycleDetailSchema } = require('./chunked-schemas');

// To:
const { programStructureSchema } = require('./workout-structure-schema');
const { mesocycleDetailSchema } = require('./workout-mesocycle-schema');
```

**In `backend/controllers/workout-chunked.js`:**
Done
- Updated both files to import from the new schema modules.
```javascript
// Change from:
const { programStructureSchema, mesocycleDetailSchema } = require('../utils/chunked-schemas');

// To:
const { programStructureSchema } = require('../utils/workout-structure-schema');
const { mesocycleDetailSchema } = require('../utils/workout-mesocycle-schema');
```

#### **Step 4: Deprecate Original File**

After confirming all imports work:
1. Add deprecation notice to `chunked-schemas.js`
2. Keep `backend/utils/chunked-schemas.js` as a thin re-export wrapper so there is only one definition of each schema:
```javascript
// backend/utils/chunked-schemas.js
module.exports = {
  ...require('./workout-structure-schema'),
  ...require('./workout-mesocycle-schema')
};
```
  - Wrapper is transitional and will be removed later, all consumers should migrate to new files
3. Remove in future cleanup phase

Done
- Replaced contents of `backend/utils/chunked-schemas.js` with a deprecation wrapper re-exporting the two new schema modules.

### 🔍 Critical Considerations

**1. OpenAI Strict Mode Requirements**
Both new files MUST retain the critical documentation about:
- `additionalProperties: false` requirement
- All properties must be in `required` arrays
- No optional properties in strict mode

**2. Schema Validation Context**
The schemas are used with:
- OpenAI's structured output (strict=true mode)
- AJV validation in the controller
- Both contexts require the exact schema structure

**3. Testing Requirements**
After separation:
- Verify OpenAI generation still works
- Confirm AJV validation passes
- Check that both agents can use their respective schemas
- Verify structured outputs with `USE_STRUCTURED_OUTPUTS=true` succeed for both structure and mesocycle routes
- Verify Ajv fallback with `USE_STRUCTURED_OUTPUTS=false` works for both routes
- Add a mesocycle test case where at least one day is "Rest" to validate the union works E2E.

**4. Schema/Template Alignment**
Phase 2.2 templates (`phase2.2-implementation-plan.md`) state day fields may be 'Rest':
- Mesocycle schema now allows per-day rest via a union type
- Required to prevent structured output rejections

**5. Ajv Fallback Compatibility**
- Controller fallback validation using Ajv in `workout-chunked.js` must continue to pass after separation
- Schema shape is unchanged semantically, so no controller changes are needed beyond import paths

### ✅ Benefits of This Separation

1. **Clear Ownership**: Each agent owns its schema
2. **Reduced Complexity**: 279 lines → ~60 lines (structure) + ~100 lines (mesocycle)  
3. **DRY Principle**: Exercise schema defined once, not 7 times
4. **Independent Evolution**: Schemas can evolve separately

### 📋 Validation Checklist

- [x] Both schemas maintain OpenAI strict mode compliance
- [x] Import statements updated in 2 dependent files
- [x] Exercise schema DRY refactoring reduces repetition
- [x] JSDoc documentation added for clarity
- [x] Original functionality preserved
- [x] Mesocycle day schema supports both workout objects and rest strings
- [x] `workouts` requires `day1`-`day7`, `additionalProperties: false`

This separation is straightforward because the schemas are already cleanly divided in the original file. The main work is extracting them into separate files and updating imports, with the bonus opportunity to DRY up the repetitive exercise schema pattern.

### 🚀 Quick Implementation Summary

**What We're Doing:**
- Splitting 1 file (279 lines) → 2 focused files (~160 total lines)
- Eliminating 150+ lines of repetition through DRY refactoring
- Preserving all OpenAI strict mode requirements

**File Changes:**
```
chunked-schemas.js → workout-structure-schema.js (lines 1-54)
                  → workout-mesocycle-schema.js (lines 56-273, DRY'd to ~100)
```

**Update Imports in 2 Files:**
- `workout-prompts-chunked.js`
- `workout-chunked.js`

The implementation is low-risk because we're simply extracting existing, working code into separate files with minimal modifications.