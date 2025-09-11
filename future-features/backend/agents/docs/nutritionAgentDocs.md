# Nutrition Agent Documentation

## Overview
The NutritionAgent is responsible for calculating nutritional needs, generating meal plans, providing food suggestions, and explaining recommendations based on user data and goals. It uses OpenAI's GPT-4o model to create personalized nutrition plans, integrates with the MacroCalculator utility for scientifically-based calculations, and maintains comprehensive user profiles through the memory system.

## Agent Configuration

### Initialization
```javascript
const agent = new NutritionAgent({
  openai: openaiServiceInstance,  // OpenAI client instance (required)
  supabase: supabaseRLSClient,    // Supabase client (RLS-scoped if handling user data)
  memorySystem: userScopedMemorySystem, // Memory system for agent memories (optional)
  logger: loggerInstance,         // Logger instance (optional, defaults to console)
  config: {                       // Agent-specific configuration (optional)
    model: 'gpt-4o',
    temperature: 0.7,
    // Additional config options
  }
});
```

### AI Model Settings
- **Model:** gpt-4o (OpenAI's latest model for nutrition planning)
- **Temperature:** 0.7 (balanced creativity and consistency for meal plans)
- **Max Tokens:** No specific limit set (uses model defaults)
- **Response Format:** JSON object format enforced for structured data
- **System Prompt:** Specialized nutrition planning prompts for each AI operation

### Dependencies
- **OpenAI Service:** For AI-powered meal plan and food suggestion generation
- **Supabase Client:** RLS-enabled database access for user profiles and nutrition plans
- **Memory System:** User nutrition history and preference storage
- **MacroCalculator Utility:** Scientific BMR, TDEE, and macro calculations
- **UnitConverter Module:** Handles metric/imperial unit conversions
- **ValidationUtils:** Comprehensive data validation for goals and profiles

## Agent Methods

### process()
**File:** `agents/nutrition-agent.js`
**Line:** 73
**Called By:** `nutritionController.calculateMacros()` via macro-service

#### Input Processing
- **Expected Input:**
  ```javascript
  {
    userId: "uuid",              // User ID for nutrition plan generation
    goals: ["weight_loss", ...], // Array of fitness/nutrition goals
    activityLevel: "moderate"    // User's activity level (sedentary to very_active)
  }
  ```
- **Context Required:** Complete user profile from database, dietary preferences
- **Memory Retrieval:** Previous nutrition plans, feedback patterns, successful strategies

#### AI Processing Steps

1. **Data Fetching & Validation Phase**
   - Fetches user profile from `user_profiles` table with comprehensive validation
   - Validates required fields: age, weight, height, gender
   - Loads dietary preferences with defaults for missing values
   - UUID format validation for security

2. **Goals & Activity Analysis**
   - Validates goals array using ValidationUtils.validateGoals()
   - Resolves goal priorities using ValidationUtils.resolveGoalPriority()
   - Validates activity level against accepted values (sedentary, light, moderate, active, very_active)
   - Stores primary goal for focused nutrition planning

3. **Scientific Calculation Phase**
   - **BMR Calculation:** Uses MacroCalculator.calculateBMR() with Mifflin-St Jeor Equation
   - **TDEE Calculation:** Uses MacroCalculator.calculateTDEE() with activity multipliers
   - **Macro Distribution:** Uses MacroCalculator.calculateMacros() with goal-based ratios
   - Handles unit conversions (metric/imperial) automatically

4. **AI-Powered Content Generation**
   - **Meal Plan Generation:** Creates structured meal distribution with target macros per meal
   - **Food Suggestions:** Generates categorized food lists (protein, carbs, fats) based on restrictions
   - **Explanation Generation:** Provides scientific rationale and implementation guidelines

5. **Storage & Memory Integration**
   - Stores complete nutrition plan in `nutrition_plans` table via upsert operation
   - Stores plan data and reasoning in memory system with tags and importance levels
   - Cross-references with previous plans for consistency tracking

#### Output Variations
- **Success Response:**
  ```javascript
  {
    status: "success",
    plan: {
      id: "uuid",
      userId: "string",
      bmr: number,
      tdee: number,
      macros: {
        protein_g: number,
        carbs_g: number,
        fat_g: number,
        calories: number
      },
      meal_plan: {
        meals: [{
          name: "string",
          target_macros: { protein_g, carbs_g, fat_g },
          example: "string"
        }],
        snacks: []
      },
      food_suggestions: {
        protein: ["string", ...],
        carbs: ["string", ...],
        fat: ["string", ...]
      },
      explanations: {
        rationale: "string",
        principles: "string", 
        guidelines: "string",
        references: ["string", ...]
      }
    },
    reasoning: { ... },
    calculations: {
      bmr: number,
      tdee: number,
      adjustedCalories: number
    },
    warnings: ["string", ...]
  }
  ```
- **Variation Patterns:** Plans adapt based on dietary restrictions, allergies, meal frequency preferences
- **Fallback Responses:** Basic calculations with simplified explanations when AI generation fails

#### Error Handling
- **Profile Validation Errors:** Throws ValidationError with INVALID_PROFILE code for missing essential data
- **Goal Validation Errors:** Throws ValidationError with INVALID_GOALS code for invalid goal arrays  
- **Activity Level Errors:** Throws ValidationError with INVALID_ACTIVITY_LEVEL code for invalid activity levels
- **Calculation Errors:** Throws ValidationError with specific codes (BMR_CALCULATION_ERROR, TDEE_CALCULATION_ERROR, MACRO_CALCULATION_ERROR)
- **AI Generation Errors:** Implements fallback with basic explanations for non-critical failures
- **Database Errors:** Throws ValidationError with STORAGE_ERROR code for database operation failures

#### Memory Integration
- **Stores:** Nutrition plans, calculation reasoning, user feedback analysis, preference patterns
- **Retrieval Pattern:** Recent nutrition plans prioritized, tags used for goal-specific retrieval
- **Vector Storage:** Used for similarity-based meal planning and food suggestions
- **Feedback Loop:** Integrates user satisfaction and adherence data into future plans

#### Performance Characteristics
- **Typical Duration:** 5-15 seconds for new users, 3-8 seconds with cached preferences
- **Token Usage:** 1000-2500 tokens average (meal plan + food suggestions + explanations)
- **Cost Implications:** ~$0.01-0.04 per generation (GPT-4o pricing)
- **Memory Overhead:** Efficient with preference caching and calculation optimization

---

### convertUserProfile()
**File:** `agents/nutrition-agent.js`
**Line:** 981
**Called By:** External utility method for unit system conversions

#### Input Processing
- **Expected Input:** User profile object with height, weight, and unit preferences
- **Context Required:** Source and target unit systems (metric/imperial)
- **Memory Retrieval:** None (pure conversion utility)

#### Processing Steps
1. **Unit System Detection**
   - Determines source units from profile.preferences.units or defaults to metric
   - Validates conversion requirements (no-op if units match)

2. **Weight Conversion**
   - Uses UnitConverter.convertWeightToImperial() for metric to imperial
   - Uses UnitConverter.convertWeightToMetric() for imperial to metric

3. **Height Conversion** 
   - Handles height objects {feet, inches} for imperial
   - Uses UnitConverter height conversion methods
   - Maintains data structure integrity

#### Output Variations
- **Converted Profile:** Complete profile with converted measurements and updated unit preferences
- **No-op Response:** Returns copy of original profile if units already match
- **Error Response:** Throws ValidationError for invalid conversion parameters

---

## Agent Reasoning Patterns

### Scientific Foundation Approach
- Prioritizes established nutritional science over trends
- Uses validated formulas (Mifflin-St Jeor) for BMR calculations
- Applies evidence-based macro distribution ratios
- Cross-references dietary guidelines and research

### User-Centric Personalization
- Adapts meal frequency to user preferences and lifestyle
- Considers dietary restrictions, allergies, and food preferences
- Balances nutritional optimality with practical adherence
- Integrates cultural and cuisine preferences when specified

### Safety-First Philosophy
- Validates all user inputs for realistic ranges
- Provides conservative recommendations for edge cases
- Includes disclaimers and professional consultation recommendations
- Maintains data integrity throughout all calculations

## Integration Considerations

### Response Time Expectations
- **Initial Plan Generation:** 5-15 seconds for comprehensive analysis
- **Plan Updates:** 3-8 seconds with existing user data
- **Unit Conversions:** <1 second for profile transformation
- **Complex Dietary Restrictions:** 8-20 seconds for specialized planning

### AI Content Quality
- **Meal Plans:** Structured format suitable for frontend rendering
- **Food Suggestions:** Categorized lists with dietary compliance
- **Explanations:** Educational content with scientific backing
- **Progressive Enhancement:** Plans improve with user feedback integration

### Database Integration
- **Upsert Operations:** Handles creation and updates seamlessly via user_id
- **RLS Compliance:** Works with row-level security for data isolation
- **Transaction Handling:** Uses atomic operations for data consistency
- **Memory Persistence:** Integrates with agent memory system for learning

### Error Recovery Patterns
- **Non-Critical Failures:** Continues processing with simplified content (e.g., basic explanations)
- **Critical Failures:** Fails fast with clear error messaging and codes
- **Graceful Degradation:** Provides fallback calculations when AI generation fails
- **Warning Systems:** Collects and reports non-fatal issues for monitoring

### Unit System Flexibility
- **Dynamic Conversion:** Handles metric/imperial conversions transparently
- **Profile Compatibility:** Works with both unit systems in database
- **UI Integration:** Provides conversion utilities for frontend display
- **Data Integrity:** Maintains accuracy across unit system boundaries