# Plan Adjustment Agent Documentation

## Overview
The PlanAdjustmentAgent intelligently modifies existing workout plans based on user feedback using OpenAI's GPT-4o model. It implements a Reflection pattern to analyze feedback, consider safety implications, apply modifications, and validate results. The agent ensures that all adjustments maintain safety standards while addressing user preferences and requirements.

## Agent Configuration

### Initialization
```javascript
const agent = new PlanAdjustmentAgent({
  openaiService: openaiServiceInstance,
  supabaseClient: supabaseRLSClient,
  memorySystem: userScopedMemorySystem,
  logger: loggerInstance,
  config: {
    model: 'gpt-4o',
    temperature: 0.7,
    max_tokens: 4096,
    timeoutLimit: 60000,
    maxRetries: 2
  }
});
```

### AI Model Settings
- **Model:** gpt-4o (OpenAI's latest model for plan modifications)
- **Temperature:** 0.7 (balanced creativity and consistency for adjustments)
- **Max Tokens:** 4096 (sufficient for detailed plan modifications)
- **Timeout Limit:** 60 seconds for complex adjustment processing
- **Max Retries:** 2 attempts for adjustment refinement

### Dependencies
- **OpenAI Service:** For AI-powered plan modification and feedback analysis
- **Supabase Client:** RLS-enabled database access for safety validation
- **Memory System:** User feedback and adjustment history storage
- **Adjustment Logic Modules:** Specialized helper classes for specific tasks

### Helper Modules
- **FeedbackParser:** Analyzes and categorizes user feedback
- **PlanModifier:** Applies specific modifications to workout plans
- **AdjustmentValidator:** Validates safety and coherence of adjustments
- **ExplanationGenerator:** Creates detailed explanations for modifications

## Agent Methods

### process()
**File:** `agents/plan-adjustment-agent.js`
**Lines:** 93-280
**Called By:** `workoutController.adjustWorkoutPlan()`

#### Input Processing
- **Expected Input:**
  ```javascript
  {
    plan: {
      id: "uuid",
      planId: "uuid", // Required for agent compatibility
      plan_data: {...}, // Complete workout plan structure
      user_id: "uuid",
      updated_at: "ISO timestamp"
    },
    feedback: "string", // User's natural language feedback
    userProfile: {
      user_id: "uuid",
      fitnessLevel: "beginner|intermediate|advanced",
      restrictions: ["string", ...],
      // ... other profile fields
    }
  }
  ```
- **Context Required:** Original workout plan, user feedback, complete profile
- **Memory Retrieval:** Previous adjustments, user feedback patterns, safety preferences

#### AI Processing Steps (Reflection Pattern)

1. **Initial Understanding Phase**
   - **Feedback Parsing:** Analyzes user feedback using FeedbackParser
   - **Categorization:** Classifies feedback into types (difficulty, exercises, duration, etc.)
   - **Specificity Analysis:** Extracts specific adjustment requests and preferences
   - **Intent Recognition:** Understands user's underlying goals and concerns

2. **Consideration Phase** 
   - **Feasibility Assessment:** Evaluates technical feasibility of requested changes
   - **Safety Analysis:** Checks medical contraindications and injury risks
   - **Plan Coherence Review:** Ensures modifications maintain workout balance
   - **Alternative Exploration:** Considers multiple approaches to address feedback

3. **Adjustment Phase**
   - **Modification Application:** Implements approved changes using PlanModifier
   - **Safety Preservation:** Maintains safety constraints during modifications
   - **Progressive Enhancement:** Applies changes while preserving plan structure
   - **Alternative Suggestions:** Provides alternatives for unsafe or infeasible requests

4. **Reflection Phase**
   - **Validation Execution:** Validates adjusted plan using AdjustmentValidator
   - **Quality Assurance:** Ensures modifications meet quality standards
   - **Explanation Generation:** Creates detailed explanations using ExplanationGenerator
   - **Comparison Analysis:** Analyzes differences between original and adjusted plans

5. **Memory Integration & Storage**
   - **Adjustment History:** Stores modification patterns and user preferences
   - **Feedback Analysis:** Records feedback categorization and resolution
   - **Success Patterns:** Tracks successful adjustment strategies
   - **Cross-Agent Learning:** Shares insights with WorkoutGenerationAgent

#### Output Variations
- **Success Response:**
  ```javascript
  {
    status: "success",
    adjustedPlan: {
      // Modified workout plan structure
      exercises: [...],
      modifications: [...],
      safetyNotes: [...]
    },
    appliedChanges: [
      {
        type: "exercise_replacement|difficulty_adjustment|duration_change",
        description: "string",
        reasoning: "string"
      }
    ],
    skippedChanges: [
      {
        requestedChange: "string",
        reason: "safety|infeasibility|contradiction",
        alternative: "string"
      }
    ],
    feedbackSummary: "string",
    adjustmentReasoning: "string",
    comparison: {
      originalExerciseCount: number,
      adjustedExerciseCount: number,
      difficultyChange: "increased|decreased|maintained",
      focusShift: "string"
    }
  }
  ```
- **Variation Patterns:** Adjustments vary based on feedback specificity, safety constraints, user experience
- **Fallback Responses:** Conservative modifications when complex requests cannot be safely implemented

#### Error Handling
- **Invalid Feedback:** Requests clarification for ambiguous or conflicting feedback
- **Safety Violations:** Rejects unsafe modifications with explanations and alternatives
- **Plan Corruption:** Validates plan integrity throughout modification process
- **API Errors:** Implements retry logic with progressive fallback strategies

#### Memory Integration
- **Stores:** Adjustment patterns, feedback resolution strategies, user preference evolution
- **Retrieval Pattern:** Recent adjustments prioritized, pattern-based learning
- **Cross-Agent Sharing:** Feeds learning back to WorkoutGenerationAgent
- **Feedback Loop:** Continuous improvement of adjustment strategies

#### Performance Characteristics
- **Typical Duration:** 8-20 seconds for standard adjustments, 20-40 seconds for complex modifications
- **Token Usage:** 1500-3500 tokens average (analysis + modification)
- **Cost Implications:** ~$0.015-0.035 per adjustment (GPT-4o pricing)
- **Memory Efficiency:** Optimized storage of adjustment patterns and feedback analysis

---

### _initialUnderstanding()
**File:** `agents/plan-adjustment-agent.js`
**Lines:** 320-380
**Called By:** `process()` during understanding phase

#### Input Processing
- **Expected Input:** Raw user feedback string, original plan context
- **Analysis Depth:** Natural language processing for intent recognition
- **Categorization:** Maps feedback to actionable modification categories

#### Processing Steps
1. **Feedback Classification**
   - Identifies feedback type (difficulty, exercise preference, time constraints)
   - Extracts specific exercise mentions and preferences
   - Recognizes intensity and volume adjustment requests

2. **Intent Analysis**
   - Understands underlying user goals and concerns
   - Identifies primary vs. secondary feedback points
   - Recognizes urgency and importance levels

3. **Specificity Assessment**
   - Evaluates how specific and actionable the feedback is
   - Identifies areas requiring clarification
   - Prioritizes feedback elements by implementability

---

### _consideration()
**File:** `agents/plan-adjustment-agent.js`
**Lines:** 380-450
**Called By:** `process()` during consideration phase

#### Analysis Framework
1. **Feasibility Evaluation**
   - Assesses technical possibility of requested changes
   - Considers available alternatives and substitutions
   - Evaluates impact on overall plan coherence

2. **Safety Assessment**
   - Cross-references modifications with user medical conditions
   - Validates exercise combinations and progressions
   - Ensures modifications don't introduce new risks

3. **Strategic Planning**
   - Develops multiple approaches to address feedback
   - Prioritizes modifications by safety and impact
   - Plans implementation sequence for complex changes

---

### _adjustment()
**File:** `agents/plan-adjustment-agent.js`
**Lines:** 450-520
**Called By:** `process()` during modification phase

#### Modification Process
1. **Change Implementation**
   - Applies approved modifications systematically
   - Maintains plan structure and balance
   - Preserves safety constraints throughout changes

2. **Quality Control**
   - Validates each modification as it's applied
   - Ensures plan coherence is maintained
   - Checks for unintended side effects

3. **Documentation**
   - Records all applied changes with reasoning
   - Documents skipped changes with explanations
   - Maintains detailed modification audit trail

---

### _reflection()
**File:** `agents/plan-adjustment-agent.js`
**Lines:** 520-580
**Called By:** `process()` during validation phase

#### Validation Process
1. **Plan Integrity Check**
   - Validates modified plan structure and completeness
   - Ensures all required components are present
   - Checks for logical consistency in exercise flow

2. **Safety Validation**
   - Final safety review of all modifications
   - Contraindication checking for new exercise combinations
   - Risk assessment for adjusted intensity and volume

3. **Quality Assessment**
   - Evaluates improvement in addressing user feedback
   - Assesses plan effectiveness and user satisfaction potential
   - Identifies areas for future improvement

---

## Agent Reasoning Patterns

### Reflection Pattern Implementation
1. **Understanding:** Deep analysis of user feedback and intent
2. **Consideration:** Thorough evaluation of modification options and safety
3. **Action:** Systematic application of validated changes
4. **Reflection:** Comprehensive validation and quality assurance

### Safety-First Modification
- All adjustments filtered through safety validation
- Medical conditions prioritized over user preferences
- Conservative approach to ambiguous modification requests

### User-Centric Adaptation
- Feedback history influences modification strategies
- Learning from previous successful adjustments
- Personalization based on user response patterns

### Incremental Enhancement
- Prefers gradual modifications over dramatic changes
- Maintains plan familiarity while addressing concerns
- Builds upon successful elements from original plan

## Integration Considerations

### Response Time Expectations
- **Simple Adjustments:** 8-15 seconds (difficulty, duration changes)
- **Exercise Modifications:** 15-25 seconds (exercise substitutions, additions)
- **Complex Restructuring:** 25-40 seconds (major plan overhauls)

### Feedback Quality Impact
- **Specific Feedback:** Faster, more accurate adjustments
- **Vague Feedback:** Longer processing for clarification and interpretation
- **Conflicting Feedback:** Additional analysis time for resolution

### Reasoning Visualization
- **Data Structure:** Detailed modification reasoning for UI transparency
- **Change Tracking:** Visual comparison between original and adjusted plans
- **Decision Explanation:** Clear rationale for applied and skipped changes

### Variation Handling
- **Feedback Complexity:** Adjusts processing depth based on feedback detail
- **User Experience:** Modifies explanation complexity for user fitness level
- **Safety Constraints:** Adapts modification scope based on medical restrictions
- **Historical Context:** Leverages past adjustment patterns for consistency

### Quality Assurance
- **Modification Validation:** Multi-layer validation ensures plan integrity
- **Safety Verification:** Comprehensive safety checking throughout process
- **User Satisfaction:** Feedback incorporation strategies optimize user experience
- **Continuous Learning:** Adjustment success patterns improve future modifications