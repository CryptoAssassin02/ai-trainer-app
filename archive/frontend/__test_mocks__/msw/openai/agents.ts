/**
 * Mock responses for different AI agents in the workout system
 */
export const mockAgentResponses = {
  /**
   * Research agent responses - for analyzing user profiles and fitness data
   */
  researchAgent: (messages: any[]) => {
    return {
      id: 'chatcmpl-mock-research',
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'gpt-4-turbo',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: `Based on your profile analysis, I can see that you're an intermediate-level fitness enthusiast focused on strength training and weight loss. Here are my observations:

1. **Current Status**: 30-year-old male, 180cm, 80kg, with an intermediate fitness level.
2. **Goals**: Primary focus on strength development and secondary focus on weight loss.
3. **Equipment Access**: Limited to dumbbells, barbell, and bench - suggesting a home gym setup.
4. **Schedule Preference**: Monday, Wednesday, Friday workouts with approximately 60 minutes per session.

**Research Insights**:
- Your current body mass index (BMI) is approximately 24.7, which is within the normal range.
- For optimal strength gains while promoting weight loss, research suggests a caloric deficit of 300-500 calories per day combined with high-protein intake (1.6-2.2g/kg of body weight).
- With your available equipment, a full-body workout routine 3x per week would be optimal for your goals and time constraints.
- Your previous workout logs show consistent progress on compound movements, particularly bench press and squats.

**Recommendations**:
- Continue prioritizing compound movements (bench press, squats, deadlifts, overhead press) for optimal strength development.
- Incorporate supersets of antagonistic muscle groups to increase workout density within your 60-minute timeframe.
- Include 2-3 high-intensity interval training (HIIT) sessions of 10-15 minutes for additional calorie burning without sacrificing strength gains.
- Consider adding progressive overload by increasing weights by 2.5-5% every 2-3 weeks.

Would you like me to develop a specific workout plan based on these findings?`,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 350,
        completion_tokens: 330,
        total_tokens: 680,
      },
    };
  },

  /**
   * Workout generation agent responses - for creating personalized workout plans
   */
  workoutGenerationAgent: (messages: any[]) => {
    return {
      id: 'chatcmpl-mock-workout-gen',
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'gpt-4-turbo',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: `# 8-Week Intermediate Strength & Fat Loss Program

## Program Overview
- **Duration**: 8 weeks
- **Frequency**: 3 workouts per week (Monday, Wednesday, Friday)
- **Session Length**: 60 minutes
- **Equipment**: Dumbbells, barbell, and bench
- **Focus**: Strength development with secondary fat loss emphasis

## Workout Schedule

### Workout A (Monday)
1. **Barbell Bench Press**: 4 sets × 6-8 reps, 2 min rest
   - *Progressive overload: Add 2.5kg/5lbs every second week*
2. **Barbell Bent-Over Rows**: 4 sets × 8-10 reps, 90 sec rest
3. **Barbell Back Squats**: 4 sets × 6-8 reps, 2 min rest
   - *Progressive overload: Add 2.5kg/5lbs every second week*
4. **Dumbbell Shoulder Press**: 3 sets × 8-10 reps, 90 sec rest
5. **Superset**: (No rest between exercises, 60 sec rest after both)
   - **Dumbbell Bicep Curls**: 3 sets × 10-12 reps
   - **Tricep Dips/Bench Dips**: 3 sets × 10-12 reps
6. **Planks**: 3 sets × 30-60 seconds, 45 sec rest

### Workout B (Wednesday)
1. **Deadlifts**: 4 sets × 5-6 reps, 2 min rest
   - *Progressive overload: Add 5kg/10lbs every second week*
2. **Incline Dumbbell Press**: 4 sets × 8-10 reps, 90 sec rest
3. **Pull-ups or Lat Pulldowns**: 4 sets × 6-10 reps, 90 sec rest
4. **Dumbbell Lunges**: 3 sets × 10-12 reps (each leg), 90 sec rest
5. **Superset**: (No rest between exercises, 60 sec rest after both)
   - **Lateral Raises**: 3 sets × 12-15 reps
   - **Face Pulls/Rear Delt Flyes**: 3 sets × 12-15 reps
6. **Hanging Leg Raises or Lying Leg Raises**: 3 sets × 10-15 reps, 45 sec rest

### Workout C (Friday)
1. **Barbell Overhead Press**: 4 sets × 6-8 reps, 2 min rest
   - *Progressive overload: Add 2.5kg/5lbs every second week*
2. **Romanian Deadlifts**: 4 sets × 8-10 reps, 90 sec rest
3. **Dumbbell Chest Flyes**: 3 sets × 10-12 reps, 60 sec rest
4. **Barbell Hip Thrusts or Glute Bridges**: 3 sets × 10-12 reps, 90 sec rest
5. **Superset**: (No rest between exercises, 60 sec rest after both)
   - **Hammer Curls**: 3 sets × 10-12 reps
   - **Skull Crushers**: 3 sets × 10-12 reps
6. **Russian Twists**: 3 sets × 15-20 reps (each side), 45 sec rest

## Cardio Component (Optional for additional fat loss)
- After weight training or on separate days (Tues/Thurs/Sat):
- **HIIT**: 10-15 minutes
  - 30 seconds high intensity / 30 seconds recovery
  - Example exercises: Burpees, Mountain Climbers, High Knees, Jump Squats

## Recovery and Progression
- Ensure at least 48 hours rest between training the same muscle group
- Track weights, sets, and reps to ensure progressive overload
- Aim to increase weights by 2.5-5kg/5-10lbs every 2 weeks on main lifts
- If unable to complete minimum reps with good form, reduce weight by 5-10%

## Nutrition Guidelines
- Maintain a moderate caloric deficit (300-500 calories below maintenance)
- Protein intake: 1.8-2.2g per kg of bodyweight
- Prioritize whole foods, adequate hydration, and pre/post workout nutrition

Would you like me to adjust any part of this workout plan to better suit your preferences or constraints?`,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 400,
        completion_tokens: 650,
        total_tokens: 1050,
      },
    };
  },

  /**
   * Plan adjustment agent - for modifying existing workout plans
   */
  planAdjustmentAgent: (messages: any[]) => {
    return {
      id: 'chatcmpl-mock-adjust',
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'gpt-4-turbo',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: `I've adjusted your workout plan based on your lower back issues and limited time on Mondays. Here are the changes:

## Modified Workout Plan

### Workout A (Monday) - 45 Minute Version
1. **Dumbbell Bench Press**: 3 sets × 8-10 reps (replacing barbell for faster setup)
2. **Seated Cable Rows**: 3 sets × 10-12 reps (replacing bent-over rows to reduce lower back stress)
3. **Goblet Squats**: 3 sets × 10-12 reps (replacing back squats for lower back safety)
4. **Superset**: (To save time while maintaining volume)
   - **Lateral Raises**: 3 sets × 12-15 reps
   - **Tricep Pushdowns**: 3 sets × 12-15 reps
5. **Plank Variations**: 2 sets × 30 seconds (standard, side planks)

### Workout B (Wednesday) - No Changes to Duration
1. **Trap Bar Deadlifts**: 4 sets × 6-8 reps (replacing conventional deadlifts to reduce lower back strain)
2. **Incline Dumbbell Press**: 4 sets × 8-10 reps
3. **Pull-ups or Lat Pulldowns**: 4 sets × 6-10 reps
4. **Bulgarian Split Squats**: 3 sets × 10-12 reps (each leg) (replacing lunges for better stability)
5. **Superset**:
   - **Lateral Raises**: 3 sets × 12-15 reps
   - **Face Pulls**: 3 sets × 12-15 reps
6. **Dead Bugs**: 3 sets × 10-15 reps (replacing hanging leg raises for lower back safety)

### Workout C (Friday) - No Changes to Duration
1. **Seated Dumbbell Shoulder Press**: 4 sets × 8-10 reps (replacing barbell OHP to reduce lower back strain)
2. **Single-Leg Romanian Deadlifts**: 3 sets × 10-12 reps (lighter weight focus on form)
3. **Dumbbell Chest Flyes**: 3 sets × 10-12 reps
4. **Barbell Hip Thrusts**: 3 sets × 10-12 reps (excellent for glutes with minimal lower back stress)
5. **Superset**:
   - **Hammer Curls**: 3 sets × 10-12 reps
   - **Skull Crushers**: 3 sets × 10-12 reps
6. **Bird Dogs**: 3 sets × 10-12 reps (each side) (replacing Russian twists for lower back rehabilitation)

## Additional Adjustments:
1. **Lower Back Rehabilitation Exercises**:
   - Add 5 minutes of cat-cow stretches, child's pose, and supine knee-to-chest stretches at the end of each workout
   - Consider foam rolling the lower back area gently before workouts

2. **Modified HIIT Protocol**:
   - Use low-impact HIIT: rowing machine, cycling, or elliptical
   - 20 seconds high intensity / 40 seconds recovery (instead of 30/30)
   - Avoid high-impact movements like burpees and jump squats

3. **Recovery Enhancement**:
   - Consider adding an Epsom salt bath 1-2 times per week
   - Prioritize 7-8 hours of quality sleep for optimal recovery

These changes maintain the focus on strength development and fat loss while protecting your lower back and accommodating your time constraints on Mondays. Would you like me to make any additional adjustments?`,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 550,
        completion_tokens: 600,
        total_tokens: 1150,
      },
    };
  },

  /**
   * Nutrition agent - for dietary recommendations
   */
  nutritionAgent: (messages: any[]) => {
    return {
      id: 'chatcmpl-mock-nutrition',
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'gpt-4-turbo',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: `# Nutrition Plan to Support Your Strength & Fat Loss Goals

Based on your profile (30-year-old male, 180cm, 80kg, intermediate fitness level) and workout program, I've developed the following nutrition plan to complement your training.

## Caloric Target: Moderate Deficit
- **Maintenance calories**: ~2,800 calories (estimated based on your stats and activity level)
- **Target calories**: ~2,400 calories (moderate 400 calorie deficit)
- **Weekly deficit**: ~2,800 calories (targeting ~0.3-0.4kg loss per week)

## Macronutrient Breakdown
- **Protein**: 160g (640 calories, 27% of total)
  - 2g per kg of bodyweight for muscle preservation during fat loss
- **Fat**: 80g (720 calories, 30% of total)
  - Supports hormone production and joint health
- **Carbohydrates**: 260g (1040 calories, 43% of total)
  - Prioritized around workouts for performance and recovery

## Meal Timing & Structure
### Training Days (Mon/Wed/Fri)

**Meal 1 (Breakfast) - 7:00 AM** (~500 calories)
- 3 whole eggs + 3 egg whites scrambled
- 1 slice whole grain toast with 1/4 avocado
- 1 cup mixed berries
- Black coffee or green tea

**Pre-Workout Snack - 30-60 mins before training** (~250 calories)
- 1 medium banana
- 1 scoop (25g) whey protein with water
- 5g creatine monohydrate (optional supplement)

**Post-Workout Meal - Within 60 mins after training** (~650 calories)
- 150g lean protein source (chicken breast, lean beef, or white fish)
- 200g white rice or sweet potato
- 1-2 cups mixed vegetables
- 1 tablespoon olive oil for cooking/dressing

**Meal 4 (Dinner)** (~700 calories)
- 150g protein source (salmon, turkey, or lean beef)
- 150g complex carbs (quinoa, brown rice, or whole wheat pasta)
- 2+ cups fibrous vegetables
- 1-2 tablespoons healthy fats (olive oil, nuts, or avocado)

**Evening Snack (optional)** (~300 calories)
- 1 cup Greek yogurt (0% fat)
- 1 tablespoon honey
- 25g mixed nuts
- 1 scoop protein powder (casein preferred for slow digestion)

### Rest Days (Tue/Thu/Sat/Sun)

- **Reduce carbohydrates** by ~50g (200 calories)
- **Increase fats** by ~20g (180 calories)
- Keep protein constant
- Overall calories ~2,380

## Hydration Guidelines
- Minimum 3-4 liters of water daily
- Additional 500ml during each workout
- Limit liquid calories (juices, sodas)

## Supplementation (Optional)
- **Whey/Casein Protein**: To help meet protein targets
- **Creatine Monohydrate**: 5g daily for strength performance
- **Fish Oil**: 1-2g combined EPA/DHA for recovery and joint health
- **Vitamin D**: 1000-2000 IU daily (especially if limited sun exposure)
- **Magnesium**: 300-400mg daily for muscle function and recovery

## Flexible Approach
- Follow an 80/20 approach: 80% nutrient-dense whole foods, 20% flexibility
- One "free meal" per week (not exceeding 1000 calories) for psychological sustainability
- Track progress weekly and adjust calories if weight loss stalls for more than 2 weeks

## Sample Grocery List
**Proteins:**
- Chicken breast
- Lean ground beef (90%+ lean)
- Eggs
- Greek yogurt
- Whey protein
- Salmon
- White fish
- Turkey breast

**Carbohydrates:**
- Oats
- Sweet potatoes
- Brown rice
- Quinoa
- Whole grain bread
- Fruits (berries, bananas, apples)
- White rice (post-workout)

**Fats:**
- Avocados
- Olive oil
- Mixed nuts
- Nut butters
- Fatty fish
- Eggs

**Vegetables:**
- Broccoli
- Spinach
- Bell peppers
- Zucchini
- Asparagus
- Kale
- Carrots
- Mushrooms

Would you like me to adjust any aspect of this nutrition plan to better suit your preferences or needs?`,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 500,
        completion_tokens: 750,
        total_tokens: 1250,
      },
    };
  },

  /**
   * Default agent response - fallback for unspecified agent types
   */
  defaultAgent: (messages: any[]) => {
    return {
      id: 'chatcmpl-mock-default',
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'gpt-4-turbo',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: `I understand you're looking for assistance with your fitness journey. Our AI system can help you with:

1. **Analyzing your fitness profile and goals**
2. **Creating personalized workout plans**
3. **Adjusting existing workout routines**
4. **Providing nutrition guidance**
5. **Tracking and measuring your progress**

What specifically would you like help with today? If you could provide more details about your fitness level, goals, and any constraints, I can better assist you.`,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 150,
        completion_tokens: 120,
        total_tokens: 270,
      },
    };
  },
}; 