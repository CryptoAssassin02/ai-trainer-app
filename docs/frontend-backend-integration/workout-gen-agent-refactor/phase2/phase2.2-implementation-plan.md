## Phase 2.2 Prompt Separation: Detailed Implementation Plan

After reviewing the existing files and database schema, here's my detailed assessment:

### 📊 Current Prompt Analysis

**Missing User Profile Fields in Templates:**
The current templates (lines 32-63 for structure, 65-104 for mesocycle) are missing critical user data:
- **Demographics**: age, gender (affect exercise selection and progression)
- **Physical Stats**: height, weight, unit_preference (needed for load calculations)
- **Medical Data**: medical_conditions (JSONB array for contraindications)
- **Preferences**: exercise_types (user's preferred training modalities)

**Current Template Dependencies:**
- 6 Handlebars helpers (lines 5-29)
- Goal strategy loader function (lines 114-168)
- Schema string injection for OpenAI

### 🎯 Implementation Plan for Prompt Separation

#### **Step 1: Create `workout-structure-prompts.js`**

**Extract from `workout-prompts-chunked.js`:**
- Handlebars setup and helpers (lines 1-29)
- Structure template (lines 32-63)
- Goal strategy loader (lines 114-168)
- Structure prompt generator function (lines 179-218)

**Key Enhancements Required:**
1. **Expand User Profile Section** in template:
```handlebars
## User Profile:
- Age: {{userProfile.age}} | Gender: {{userProfile.gender}}
- Experience Level: {{userProfile.experienceLevel}}
- Body Stats: {{userProfile.height}}{{#if (eq userProfile.unitPreference 'imperial')}} in{{else}} cm{{/if}}, {{userProfile.weight}}{{#if (eq userProfile.unitPreference 'imperial')}} lbs{{else}} kg{{/if}}
- Fitness Goals: {{join goals ', '}}
{{#if primaryGoal}}- Primary Goal: {{primaryGoal}} (60% priority){{/if}}
- Workout Frequency: {{userProfile.preferences.workoutFrequency}}
- Preferred Exercises: {{join userProfile.preferences.exerciseTypes ', '}}
- Gym Access: {{userProfile.gymCategory}}
{{#if userProfile.medicalConditions}}- Medical Considerations: {{join userProfile.medicalConditions ', '}}{{/if}}

{{{goalSpecificInstructions}}}
Done
- Created `backend/utils/workout-structure-prompts.js` with expanded profile section, added `eq` helper via centralized helpers, updated context to include demographics, stats, preferences, and medical conditions; uses separated schema import.
```

2. **Add New Handlebars Helper**:
```javascript
Handlebars.registerHelper('eq', (a, b) => a === b);
```

3. **Update Context Building** in `generateStructurePrompt`:
- Map database field names correctly (experience_level → experienceLevel)
- Include all profile fields in context object
- Handle medical_conditions JSONB array properly

4. **Ensure Separated Schema Imports** are used inside new prompt modules (aligns with Phase 2.1):
```javascript
const { programStructureSchema } = require('../utils/workout-structure-schema');
const structureSchemaString = JSON.stringify(programStructureSchema, null, 2);
```

5. **Standardize Context Building in Structure Prompt Generator**:
- Accept `(userProfile, goals, gymData, injuryPrompt = '', primaryGoal = null)`
- Build `userProfile.preferences` with `workoutFrequency`, `exerciseTypes`, `constraints` defaults
- Compute `goalSpecificInstructions = loadGoalSpecificInstructions(goals, primaryGoal)`

#### **Step 2: Create `workout-mesocycle-prompts.js`**

**Extract from `workout-prompts-chunked.js`:**
- Shared Handlebars helpers (reference from structure file)
- Mesocycle template (lines 65-104)
- Mesocycle prompt generator function (lines 235-282)

**Key Enhancements Required:**
1. **Expand User Context** in template:
```handlebars
## User Profile:
- Demographics: {{userProfile.age}}yo {{userProfile.gender}}
- Experience: {{userProfile.experienceLevel}}
- Body Metrics: {{userProfile.weight}}{{#if (eq userProfile.unitPreference 'imperial')}}lbs{{else}}kg{{/if}}
- Equipment Access: {{userProfile.gymCategory}}
- Exercise Preferences: {{join userProfile.preferences.exerciseTypes ', '}}
{{#if userProfile.medicalConditions}}- Contraindications: {{join userProfile.medicalConditions ', '}}{{/if}}

{{{goalSpecificInstructions}}}
Done
- Created `backend/utils/workout-mesocycle-prompts.js` with enhanced user context and exercise selection guidance, using separated schema import and standardized context building.
```

2. **Add Exercise Selection Guidance**:
- Reference user's preferred exercise types
- Consider age/gender for exercise appropriateness
- Apply medical contraindications to exercise selection

3. **Ensure Separated Schema Imports** are used inside new prompt modules (aligns with Phase 2.1):
```javascript
const { mesocycleDetailSchema } = require('../utils/workout-mesocycle-schema');
const mesocycleSchemaString = JSON.stringify(mesocycleDetailSchema, null, 2);
```

4. **Standardize Context Building in Mesocycle Prompt Generator**:
- Accept the structured plan context plus `(userProfile, goals = [], injuryPrompt = '', primaryGoal = null)`
- Same `goalSpecificInstructions` call as above for `workout-structure-prompts.js` file
  - Compute `goalSpecificInstructions = loadGoalSpecificInstructions(goals, primaryGoal)`
- Keep `workoutFrequency` numeric param from program structure for clarity

#### **Step 3: Create Shared Utilities**

**Create `workout-prompt-helpers.js`:**
```javascript
const registerWorkoutHelpers = (Handlebars) => {
  Handlebars.registerHelper('eq', (a, b) => a === b);
  Handlebars.registerHelper('gt', (a, b) => a > b);
  Handlebars.registerHelper('join', (arr, sep) => Array.isArray(arr) ? arr.join(sep) : '');
  Handlebars.registerHelper('slice', (arr, start, end) => Array.isArray(arr) ? arr.slice(start, end) : []);
  Handlebars.registerHelper('limit', (arr, limit) => (arr ? arr.slice(0, limit) : []));
  Handlebars.registerHelper('or', (...args) => { const o = args.pop(); return args.some(Boolean); });
};

// workout-prompt-helpers.js
const loadGoalSpecificInstructions = (goals, primaryGoal = null) => {
  // Move existing implementation here (from workout-prompts-chunked.js)
  // Keep strategy map and ordering (primary first, rest as secondary)
  return combinedInstructions;
};

module.exports = { registerWorkoutHelpers, loadGoalSpecificInstructions /*, mapProfileFields if kept*/ };

// Profile field mapping function
const mapProfileFields = (dbProfile) => ({
  age: dbProfile.age,
  gender: dbProfile.gender,
  height: dbProfile.height,
  weight: dbProfile.weight,
  unitPreference: dbProfile.unit_preference,
  experienceLevel: dbProfile.experience_level,
  fitnessGoals: dbProfile.fitness_goals,
  primaryGoal: dbProfile.primary_goal,
  workoutFrequency: dbProfile.workout_frequency,
  exerciseTypes: dbProfile.exercise_types || [],
  gymCategory: dbProfile.gym_category,
  medicalConditions: dbProfile.medical_conditions || []
});
Done
- Created `backend/utils/workout-prompt-helpers.js` centralizing helpers (including `eq`) and moved goal strategy loader; included optional `mapProfileFields` for raw DB rows.
```

**Profile Mapping Usage Clarification**:
- Backend already returns camelCase via `getProfileByUserId`
- `mapProfileField` is optional for server code and should be used only when starting from raw DB rows
- In Node backend, pass through the camelCase profile and construct `preferences` in the prompt context

**Deprecate Legacy Prompt Module**
- Turn `backend/utils/workout-prompts-chunked.js` into a thin wrapper re-export to avoid two sources of truth while dependent files migrate:
```javascript
// backend/utils/workout-prompts-chunked.js
module.exports = {
  ...require('./workout-structure-prompts'),
  ...require('./workout-mesocycle-prompts') // Deprecated: use the new modules directly
};
Done
- Converted `backend/utils/workout-prompts-chunked.js` into a thin re-export wrapper of the two new modules with deprecation note.
```
- **Note:** mark as deprecated and schedule removal once all imports are migrated

#### **Step 4: Update Import Statements**

**In controllers and agents that use prompts (specifically `backend/controllers/workout-chunked.js`):**
```javascript
// Change from:
const { generateStructurePrompt, generateMesocyclePrompt } = require('../utils/workout-prompts-chunked');

// To:
const { generateStructurePrompt } = require('../utils/workout-structure-prompts');
const { generateMesocyclePrompt } = require('../utils/workout-mesocycle-prompts');
Done
- Updated `backend/controllers/workout-chunked.js` to import from `workout-structure-prompts` and `workout-mesocycle-prompts`.
```

### 🔍 Critical Considerations

**1. Medical Data Handling**
- Medical conditions are now JSONB array (migration 0017)
- Must safely handle both empty arrays and populated arrays
- Consider HIPAA-compliant language in prompts

**2. Unit System Awareness**
- Templates must respect user's unit_preference
- Weight/height display should adapt accordingly
- Future load calculations need unit conversion

**3. Goal Prioritization Logic**
- Primary goal gets 60% focus (as per user requirement)
- Secondary goals share remaining 40%
- Structure template must enforce this ratio

**4. Schema/Prompt Alignment**
- Mesocycle day fields allow 'Rest' per Phase 2.1 union schema
- Prompt must continue to instruct 'day1'..'day7' as object-or-Rest

**5. Helper Parity**
- Centralize all helpers to avoid subtle differences between prompt modules

### ✅ Benefits of Enhanced Prompts

1. **Personalization**: AI has complete user context for better recommendations
2. **Safety**: Medical conditions properly considered
3. **Preference Alignment**: Exercise types guide selection
4. **Demographic Appropriateness**: Age/gender-appropriate programming

### 📋 Testing Checklist

After implementation:
- [ ] Verify all profile fields populate in prompts
- [ ] Test with various unit preferences (metric/imperial)
- [ ] Confirm medical conditions array handling
- [ ] Validate goal prioritization logic
- [ ] Check Handlebars helper functionality
- [ ] Verify `goalSpecificInstructions` appear in both prompts with correct primary/secondary ordering.
- [ ] Verify unit-aware formatting via `eq` helper (imperial vs metric).
- [ ] Verify templates render correctly with profiles missing optional arrays (e.g., empty `exerciseTypes`, `medicalConditions`).
- [ ] Validate a mesocycle case with at least one 'Rest' day end-to-end (OpenAI structured output strict mode).

The key insight is that the current templates are missing ~60% of available user data, which significantly impacts personalization quality. This separation and enhancement will dramatically improve the AI's ability to generate truly personalized workout plans.

### 🚀 Quick Summary

**Critical Finding**: Current prompts use only ~40% of available user data

**What Needs Enhancement**:
- Add demographics (age, gender) for appropriate exercise selection
- Include body metrics (height, weight) for load calculations  
- Incorporate medical conditions array for safety
- Use exercise type preferences to guide programming
- Respect unit system preference throughout

**File Structure After Separation**:
```
workout-structure-prompts.js (enhanced profile section)
workout-mesocycle-prompts.js (enhanced user context)
workout-prompt-helpers.js (shared utilities, new file)
```

The implementation is straightforward extraction with critical enhancements to leverage all available user data for truly personalized workout generation.