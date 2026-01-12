# End-to-End Workflow Testing Guide

## Overview

This guide establishes comprehensive end-to-end testing strategies for the trAIner app's complete user workflows. Our approach covers critical user journeys, cross-feature integrations, test infrastructure, performance benchmarks, and accessibility compliance to ensure production-ready quality.

## Why End-to-End Testing?

**User Experience Validation**: E2E tests validate complete user workflows as they would experience them in production.

**Integration Verification**: Ensures all components, services, and external dependencies work together correctly.

**Regression Prevention**: Catches breaking changes that unit and integration tests might miss.

**Performance Monitoring**: Validates that complete workflows meet performance and accessibility standards.

**Business Logic Validation**: Ensures complex business flows work correctly across multiple features and services.

## Testing Philosophy

### Core Principles

**User-Centric Scenarios**: Test flows that represent real user behavior and goals.

**Production Environment Simulation**: Use realistic data, timing, and system conditions.

**Cross-Browser Compatibility**: Ensure consistent behavior across different browsers and devices.

**Accessibility Compliance**: Validate that all workflows are accessible to users with disabilities.

**Performance Awareness**: Monitor and validate performance throughout critical user journeys.

## Critical User Journeys

### New User Onboarding Flow

The complete onboarding experience is critical for user adoption and sets the foundation for all subsequent interactions.

#### Complete Registration Journey

**Flow Overview**: Signup → Email verification → Initial profile setup → First workout generation

```typescript
describe('Complete User Onboarding', () => {
  test('should complete full onboarding flow successfully', async ({ page }) => {
    // Step 1: Landing page and signup initiation
    await page.goto('/');
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="cta-signup"]')).toBeVisible();
    
    // Performance check: Landing page loads within 3 seconds
    const loadTime = await page.evaluate(() => performance.now());
    expect(loadTime).toBeLessThan(3000);
    
    // Step 2: Signup form completion
    await page.click('[data-testid="cta-signup"]');
    await expect(page.locator('[data-testid="signup-form"]')).toBeVisible();
    
    const testUser = {
      name: 'Test User E2E',
      email: `e2e-test-${Date.now()}@example.com`,
      password: 'TestPassword123!'
    };
    
    await page.fill('[data-testid="signup-name"]', testUser.name);
    await page.fill('[data-testid="signup-email"]', testUser.email);
    await page.fill('[data-testid="signup-password"]', testUser.password);
    await page.fill('[data-testid="signup-confirm-password"]', testUser.password);
    
    // Test form validation
    await page.click('[data-testid="signup-submit"]');
    
    // Step 3: Email verification simulation
    await expect(page.locator('[data-testid="verification-notice"]')).toBeVisible();
    
    // In test environment, auto-verify email
    if (process.env.NODE_ENV === 'test') {
      await page.goto(`/auth/verify?token=test-verification-token&email=${testUser.email}`);
    }
    
    // Step 4: Profile setup initiation
    await expect(page.locator('[data-testid="profile-setup-welcome"]')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Complete Your Profile');
    
    // Step 5: Profile completion tracking
    const profileSteps = [
      'demographics',
      'fitness-level', 
      'goals',
      'preferences',
      'medical-conditions'
    ];
    
    for (const [index, step] of profileSteps.entries()) {
      await expect(page.locator(`[data-testid="profile-step-${step}"]`)).toBeVisible();
      
      // Progress indicator validation
      const progressText = `${index + 1} of ${profileSteps.length}`;
      await expect(page.locator('[data-testid="progress-indicator"]')).toContainText(progressText);
      
      await fillProfileStep(page, step);
      
      if (index < profileSteps.length - 1) {
        await page.click('[data-testid="profile-next"]');
      } else {
        await page.click('[data-testid="profile-complete"]');
      }
    }
    
    // Step 6: Dashboard redirection and welcome state
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="welcome-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="generate-first-workout"]')).toBeVisible();
    
    // Cleanup
    await cleanupTestUser(testUser.email);
  });
});

async function fillProfileStep(page: Page, step: string): Promise<void> {
  switch (step) {
    case 'demographics':
      await page.selectOption('[data-testid="age-select"]', '30');
      await page.selectOption('[data-testid="gender-select"]', 'male');
      
      // Height input (metric/imperial handling)
      await page.selectOption('[data-testid="unit-preference"]', 'metric');
      await page.fill('[data-testid="height-cm"]', '175');
      await page.fill('[data-testid="weight-kg"]', '70');
      break;
      
    case 'fitness-level':
      await page.click('[data-testid="fitness-level-intermediate"]');
      await page.fill('[data-testid="exercise-experience"]', '2');
      break;
      
    case 'goals':
      await page.check('[data-testid="goal-muscle-gain"]');
      await page.check('[data-testid="goal-strength"]');
      await page.selectOption('[data-testid="primary-goal"]', 'muscle_gain');
      break;
      
    case 'preferences':
      await page.check('[data-testid="equipment-dumbbells"]');
      await page.check('[data-testid="equipment-barbell"]');
      await page.selectOption('[data-testid="workout-frequency"]', '3x per week');
      await page.selectOption('[data-testid="workout-duration"]', '45-60 minutes');
      break;
      
    case 'medical-conditions':
      await page.selectOption('[data-testid="medical-conditions"]', 'none');
      await page.check('[data-testid="terms-agreement"]');
      await page.check('[data-testid="privacy-agreement"]');
      break;
  }
}
```

#### Profile Completion Validation

Ensure all profile data is properly saved and accessible:

```typescript
test('should save and validate all profile data', async ({ page }) => {
  // Complete profile setup
  await completeProfileSetup(page);
  
  // Navigate to profile edit page
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="edit-profile"]');
  
  // Verify all data was saved correctly
  await expect(page.locator('[data-testid="age-select"]')).toHaveValue('30');
  await expect(page.locator('[data-testid="height-cm"]')).toHaveValue('175');
  await expect(page.locator('[data-testid="weight-kg"]')).toHaveValue('70');
  await expect(page.locator('[data-testid="goal-muscle-gain"]')).toBeChecked();
  await expect(page.locator('[data-testid="equipment-dumbbells"]')).toBeChecked();
  
  // Test profile update functionality
  await page.fill('[data-testid="weight-kg"]', '72');
  await page.click('[data-testid="save-profile"]');
  
  await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
  
  // Verify update persisted
  await page.reload();
  await expect(page.locator('[data-testid="weight-kg"]')).toHaveValue('72');
});
```

#### First Workout Generation Experience

Test the complete first-time workout generation flow:

```typescript
test('should generate first workout successfully', async ({ page }) => {
  await completeOnboarding(page);
  
  // Initiate first workout generation
  await page.click('[data-testid="generate-first-workout"]');
  
  // AI processing flow
  await expect(page.locator('[data-testid="ai-processing"]')).toBeVisible();
  await expect(page.locator('[data-testid="processing-stage"]')).toContainText('Analyzing your profile');
  
  // Wait for processing completion (with timeout)
  await page.waitForSelector('[data-testid="workout-plan-ready"]', { timeout: 60000 });
  
  // Verify workout plan components
  await expect(page.locator('[data-testid="plan-name"]')).toBeVisible();
  await expect(page.locator('[data-testid="plan-exercises"]')).toBeVisible();
  await expect(page.locator('[data-testid="plan-reasoning"]')).toBeVisible();
  
  // Exercise validation
  const exercises = page.locator('[data-testid="exercise-item"]');
  const exerciseCount = await exercises.count();
  expect(exerciseCount).toBeGreaterThan(3);
  expect(exerciseCount).toBeLessThan(8);
  
  // Verify exercise details
  const firstExercise = exercises.first();
  await expect(firstExercise.locator('[data-testid="exercise-name"]')).toBeVisible();
  await expect(firstExercise.locator('[data-testid="exercise-sets"]')).toBeVisible();
  await expect(firstExercise.locator('[data-testid="exercise-reps"]')).toBeVisible();
  await expect(firstExercise.locator('[data-testid="exercise-instructions"]')).toBeVisible();
  
  // Plan acceptance
  await page.click('[data-testid="accept-plan"]');
  await expect(page.locator('[data-testid="plan-accepted"]')).toBeVisible();
  
  // Verify plan appears in dashboard
  await page.click('[data-testid="nav-dashboard"]');
  await expect(page.locator('[data-testid="current-plan"]')).toBeVisible();
  await expect(page.locator('[data-testid="plan-name"]')).toBeVisible();
});
```

### Workout Generation → Adjustment → Logging Cycle

This represents the core workout management flow that users will repeat frequently.

#### Plan Generation with Custom Requirements

```typescript
describe('Workout Plan Generation Cycle', () => {
  test('should generate plan with custom requirements', async ({ page }) => {
    await loginTestUser(page);
    
    // Navigate to workout generation
    await page.click('[data-testid="nav-workouts"]');
    await page.click('[data-testid="generate-new-plan"]');
    
    // Custom requirements input
    await page.selectOption('[data-testid="plan-focus"]', 'upper_body');
    await page.selectOption('[data-testid="plan-duration"]', '30 minutes');
    await page.check('[data-testid="equipment-dumbbells-only"]');
    await page.fill('[data-testid="special-requirements"]', 'Focus on shoulders and back, avoid overhead pressing due to shoulder impingement');
    
    // Generate plan
    await page.click('[data-testid="generate-plan"]');
    
    // Monitor AI processing stages
    const stages = [
      'Analyzing requirements',
      'Researching exercises',
      'Designing workout structure',
      'Validating safety guidelines',
      'Personalizing recommendations'
    ];
    
    for (const stage of stages) {
      await expect(page.locator('[data-testid="current-stage"]')).toContainText(stage);
    }
    
    // Verify plan meets requirements
    await page.waitForSelector('[data-testid="generated-plan"]', { timeout: 60000 });
    
    const planDuration = await page.locator('[data-testid="plan-duration"]').textContent();
    expect(planDuration).toContain('30');
    
    const planFocus = await page.locator('[data-testid="plan-focus"]').textContent();
    expect(planFocus.toLowerCase()).toContain('upper body');
    
    // Verify safety considerations were applied
    const exercises = await page.locator('[data-testid="exercise-name"]').allTextContents();
    const hasOverheadPress = exercises.some(name => 
      name.toLowerCase().includes('overhead press') || 
      name.toLowerCase().includes('shoulder press')
    );
    expect(hasOverheadPress).toBe(false);
  });
});
```

#### Plan Customization and Adjustment

```typescript
test('should adjust plan based on user feedback', async ({ page }) => {
  await generateTestWorkout(page);
  
  // Initiate plan adjustment
  await page.click('[data-testid="adjust-plan"]');
  
  // Provide feedback
  await page.fill('[data-testid="adjustment-feedback"]', 
    'This workout is too challenging for me. Please make it more beginner-friendly and add more rest time between sets.'
  );
  
  await page.click('[data-testid="submit-adjustment"]');
  
  // Monitor adjustment processing
  await expect(page.locator('[data-testid="adjustment-processing"]')).toBeVisible();
  await expect(page.locator('[data-testid="ai-reasoning"]')).toBeVisible();
  
  // Wait for adjusted plan
  await page.waitForSelector('[data-testid="adjusted-plan"]', { timeout: 45000 });
  
  // Verify adjustments were applied
  const adjustmentSummary = await page.locator('[data-testid="adjustment-summary"]').textContent();
  expect(adjustmentSummary.toLowerCase()).toContain('reduced difficulty');
  expect(adjustmentSummary.toLowerCase()).toContain('increased rest');
  
  // Compare original vs adjusted plan
  const originalSets = await page.locator('[data-testid="original-sets"]').textContent();
  const adjustedSets = await page.locator('[data-testid="adjusted-sets"]').textContent();
  expect(parseInt(adjustedSets)).toBeLessThanOrEqual(parseInt(originalSets));
  
  // Accept adjustments
  await page.click('[data-testid="accept-adjustments"]');
  await expect(page.locator('[data-testid="plan-updated"]')).toBeVisible();
});
```

#### Workout Execution and Real-time Logging

```typescript
test('should log workout with real-time tracking', async ({ page }) => {
  await selectActiveWorkout(page);
  
  // Start workout session
  await page.click('[data-testid="start-workout"]');
  await expect(page.locator('[data-testid="workout-timer"]')).toBeVisible();
  
  // Log first exercise
  const firstExercise = page.locator('[data-testid="current-exercise"]');
  await expect(firstExercise).toBeVisible();
  
  const sets = await page.locator('[data-testid="set-input"]').count();
  
  for (let setIndex = 0; setIndex < sets; setIndex++) {
    // Fill set data
    await page.fill(`[data-testid="set-${setIndex}-weight"]`, '50');
    await page.fill(`[data-testid="set-${setIndex}-reps"]`, '10');
    await page.click(`[data-testid="set-${setIndex}-complete"]`);
    
    // Verify set completion
    await expect(page.locator(`[data-testid="set-${setIndex}-completed"]`)).toBeVisible();
    
    // Rest timer (except for last set)
    if (setIndex < sets - 1) {
      await expect(page.locator('[data-testid="rest-timer"]')).toBeVisible();
      
      // Skip rest for testing
      await page.click('[data-testid="skip-rest"]');
    }
  }
  
  // Complete exercise
  await page.click('[data-testid="complete-exercise"]');
  
  // Move to next exercise or complete workout
  const hasNextExercise = await page.locator('[data-testid="next-exercise"]').isVisible();
  
  if (hasNextExercise) {
    await page.click('[data-testid="next-exercise"]');
  } else {
    // Workout completion
    await page.click('[data-testid="complete-workout"]');
    
    // Post-workout feedback
    await page.selectOption('[data-testid="difficulty-rating"]', '7');
    await page.selectOption('[data-testid="energy-level"]', '8');
    await page.selectOption('[data-testid="satisfaction"]', '9');
    await page.fill('[data-testid="workout-notes"]', 'Great workout! Felt strong throughout.');
    
    await page.click('[data-testid="submit-feedback"]');
    
    // Verify workout saved
    await expect(page.locator('[data-testid="workout-saved"]')).toBeVisible();
    
    // Check workout appears in history
    await page.click('[data-testid="nav-history"]');
    await expect(page.locator('[data-testid="recent-workout"]').first()).toBeVisible();
  }
});
```

### Nutrition Planning & Tracking Flow

#### Dietary Assessment and Meal Plan Generation

```typescript
describe('Nutrition Planning Flow', () => {
  test('should complete dietary assessment and generate meal plan', async ({ page }) => {
    await loginTestUser(page);
    
    // Navigate to nutrition section
    await page.click('[data-testid="nav-nutrition"]');
    
    // Dietary assessment form
    await page.click('[data-testid="start-nutrition-plan"]');
    
    // Basic dietary information
    await page.selectOption('[data-testid="diet-type"]', 'balanced');
    await page.selectOption('[data-testid="activity-level"]', 'moderately_active');
    await page.selectOption('[data-testid="goal"]', 'muscle_gain');
    
    // Allergies and restrictions
    await page.check('[data-testid="allergy-nuts"]');
    await page.check('[data-testid="restriction-dairy-free"]');
    
    // Meal preferences
    await page.selectOption('[data-testid="meals-per-day"]', '4');
    await page.selectOption('[data-testid="cooking-time"]', 'moderate');
    await page.check('[data-testid="meal-prep-friendly"]');
    
    // Cultural preferences
    await page.selectOption('[data-testid="cuisine-preference"]', 'mediterranean');
    
    await page.click('[data-testid="generate-meal-plan"]');
    
    // AI processing for nutrition plan
    await expect(page.locator('[data-testid="nutrition-ai-processing"]')).toBeVisible();
    
    const nutritionStages = [
      'Analyzing dietary requirements',
      'Calculating macro targets',
      'Researching meal options',
      'Creating personalized meal plan',
      'Validating nutritional balance'
    ];
    
    for (const stage of nutritionStages) {
      await expect(page.locator('[data-testid="processing-stage"]')).toContainText(stage);
    }
    
    // Verify meal plan generation
    await page.waitForSelector('[data-testid="meal-plan-ready"]', { timeout: 60000 });
    
    // Validate macro targets
    await expect(page.locator('[data-testid="daily-calories"]')).toBeVisible();
    await expect(page.locator('[data-testid="protein-target"]')).toBeVisible();
    await expect(page.locator('[data-testid="carbs-target"]')).toBeVisible();
    await expect(page.locator('[data-testid="fat-target"]')).toBeVisible();
    
    // Verify meal plan structure
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    for (const mealType of mealTypes) {
      await expect(page.locator(`[data-testid="meal-${mealType}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="${mealType}-calories"]`)).toBeVisible();
    }
    
    // Check dietary restrictions compliance
    const allMealTexts = await page.locator('[data-testid^="meal-"]').allTextContents();
    const containsNuts = allMealTexts.some(text => 
      text.toLowerCase().includes('nuts') || 
      text.toLowerCase().includes('almonds') || 
      text.toLowerCase().includes('peanuts')
    );
    expect(containsNuts).toBe(false);
    
    const containsDairy = allMealTexts.some(text => 
      text.toLowerCase().includes('milk') || 
      text.toLowerCase().includes('cheese') || 
      text.toLowerCase().includes('yogurt')
    );
    expect(containsDairy).toBe(false);
  });
});
```

#### Food Logging and Macro Tracking

```typescript
test('should log food and track macros accurately', async ({ page }) => {
  await setupNutritionPlan(page);
  
  // Start food logging for the day
  await page.click('[data-testid="log-food"]');
  
  // Log breakfast
  await page.click('[data-testid="log-breakfast"]');
  
  // Search for food items
  await page.fill('[data-testid="food-search"]', 'oatmeal');
  await page.waitForSelector('[data-testid="search-results"]');
  
  await page.click('[data-testid="food-result-0"]');
  await page.fill('[data-testid="serving-size"]', '1');
  await page.selectOption('[data-testid="serving-unit"]', 'cup');
  await page.click('[data-testid="add-food"]');
  
  // Add second breakfast item
  await page.fill('[data-testid="food-search"]', 'banana');
  await page.click('[data-testid="food-result-0"]');
  await page.fill('[data-testid="serving-size"]', '1');
  await page.selectOption('[data-testid="serving-unit"]', 'medium');
  await page.click('[data-testid="add-food"]');
  
  // Complete breakfast logging
  await page.click('[data-testid="complete-meal"]');
  
  // Verify macro updates
  await expect(page.locator('[data-testid="calories-consumed"]')).not.toContainText('0');
  await expect(page.locator('[data-testid="protein-consumed"]')).not.toContainText('0');
  
  // Check progress bars
  const caloriesProgress = await page.locator('[data-testid="calories-progress"]').getAttribute('aria-valuenow');
  expect(parseInt(caloriesProgress)).toBeGreaterThan(0);
  
  // Log quick meal from meal plan
  await page.click('[data-testid="quick-log-lunch"]');
  await page.click('[data-testid="confirm-meal-plan-lunch"]');
  
  // Verify daily totals update
  const totalCalories = await page.locator('[data-testid="total-calories"]').textContent();
  expect(parseInt(totalCalories)).toBeGreaterThan(300);
  
  // Custom food entry
  await page.click('[data-testid="add-custom-food"]');
  await page.fill('[data-testid="custom-food-name"]', 'Homemade protein smoothie');
  await page.fill('[data-testid="custom-calories"]', '250');
  await page.fill('[data-testid="custom-protein"]', '30');
  await page.fill('[data-testid="custom-carbs"]', '15');
  await page.fill('[data-testid="custom-fat"]', '8');
  await page.click('[data-testid="save-custom-food"]');
  
  // Verify custom food appears in log
  await expect(page.locator('[data-testid="logged-foods"]')).toContainText('Homemade protein smoothie');
});
```

### Progress Tracking & Analytics Journey

#### Regular Check-ins and Data Collection

```typescript
describe('Progress Tracking Flow', () => {
  test('should complete comprehensive progress check-in', async ({ page }) => {
    await loginTestUser(page);
    
    // Navigate to progress section
    await page.click('[data-testid="nav-progress"]');
    
    // Initiate check-in
    await page.click('[data-testid="start-check-in"]');
    
    // Body measurements
    await page.fill('[data-testid="current-weight"]', '72.5');
    await page.fill('[data-testid="waist-measurement"]', '32');
    await page.fill('[data-testid="chest-measurement"]', '40');
    await page.fill('[data-testid="arm-measurement"]', '14.5');
    
    // Body composition (optional)
    await page.fill('[data-testid="body-fat"]', '15');
    
    // Energy and wellness
    await page.selectOption('[data-testid="energy-level"]', '8');
    await page.selectOption('[data-testid="sleep-quality"]', '7');
    await page.selectOption('[data-testid="stress-level"]', '4');
    await page.selectOption('[data-testid="mood-rating"]', '8');
    
    // Workout performance
    await page.selectOption('[data-testid="workout-consistency"]', '90');
    await page.selectOption('[data-testid="workout-intensity"]', '8');
    await page.fill('[data-testid="strength-improvements"]', 'Bench press increased by 10 lbs');
    
    // Goals progress
    await page.selectOption('[data-testid="goal-progress"]', '75');
    await page.fill('[data-testid="goal-notes"]', 'Making good progress on muscle gain goal');
    
    // Photo upload (optional)
    await page.setInputFiles('[data-testid="progress-photo"]', 'test-files/progress-photo.jpg');
    
    // Save check-in
    await page.click('[data-testid="save-check-in"]');
    
    // Verify check-in saved
    await expect(page.locator('[data-testid="check-in-saved"]')).toBeVisible();
    
    // Verify data appears in progress history
    await page.click('[data-testid="view-progress-history"]');
    await expect(page.locator('[data-testid="recent-check-in"]')).toBeVisible();
    await expect(page.locator('[data-testid="weight-entry"]')).toContainText('72.5');
  });
});
```

#### Progress Visualization and Trend Analysis

```typescript
test('should display progress charts and trends', async ({ page }) => {
  await createProgressHistory(page);
  
  // Navigate to analytics view
  await page.click('[data-testid="nav-analytics"]');
  
  // Weight trend chart
  await expect(page.locator('[data-testid="weight-chart"]')).toBeVisible();
  
  // Change time range
  await page.selectOption('[data-testid="chart-timeframe"]', '3months');
  await page.waitForSelector('[data-testid="chart-updated"]');
  
  // Verify chart updates
  const chartData = await page.locator('[data-testid="chart-data-points"]').count();
  expect(chartData).toBeGreaterThan(5);
  
  // Strength progress chart
  await page.click('[data-testid="strength-progress-tab"]');
  await expect(page.locator('[data-testid="strength-chart"]')).toBeVisible();
  
  // Exercise-specific progress
  await page.selectOption('[data-testid="exercise-select"]', 'bench_press');
  await expect(page.locator('[data-testid="exercise-progress-chart"]')).toBeVisible();
  
  // AI insights generation
  await page.click('[data-testid="generate-insights"]');
  await expect(page.locator('[data-testid="ai-insights-processing"]')).toBeVisible();
  
  await page.waitForSelector('[data-testid="progress-insights"]', { timeout: 45000 });
  
  // Verify insights content
  await expect(page.locator('[data-testid="insight-summary"]')).toBeVisible();
  await expect(page.locator('[data-testid="recommendations"]')).toBeVisible();
  
  const insights = await page.locator('[data-testid="insight-item"]').count();
  expect(insights).toBeGreaterThan(2);
});
```

### Data Export → Modification → Import Flow

#### Complete Data Export Process

```typescript
describe('Data Export/Import Flow', () => {
  test('should export complete user data in multiple formats', async ({ page }) => {
    await setupCompleteUserData(page);
    
    // Navigate to data management
    await page.click('[data-testid="nav-settings"]');
    await page.click('[data-testid="data-management"]');
    
    // Export configuration
    await expect(page.locator('[data-testid="export-section"]')).toBeVisible();
    
    // Select data types to export
    await page.check('[data-testid="export-profile"]');
    await page.check('[data-testid="export-workouts"]');
    await page.check('[data-testid="export-nutrition"]');
    await page.check('[data-testid="export-progress"]');
    
    // Test CSV export
    await page.selectOption('[data-testid="export-format"]', 'csv');
    await page.click('[data-testid="export-data"]');
    
    // Wait for export processing
    await expect(page.locator('[data-testid="export-processing"]')).toBeVisible();
    await page.waitForSelector('[data-testid="export-ready"]', { timeout: 30000 });
    
    // Download export file
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="download-export"]')
    ]);
    
    expect(download.suggestedFilename()).toContain('.csv');
    await download.saveAs(`test-downloads/${download.suggestedFilename()}`);
    
    // Test JSON export
    await page.selectOption('[data-testid="export-format"]', 'json');
    await page.click('[data-testid="export-data"]');
    
    await page.waitForSelector('[data-testid="export-ready"]', { timeout: 30000 });
    
    const [jsonDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="download-export"]')
    ]);
    
    expect(jsonDownload.suggestedFilename()).toContain('.json');
    
    // Test PDF export
    await page.selectOption('[data-testid="export-format"]', 'pdf');
    await page.click('[data-testid="export-data"]');
    
    await page.waitForSelector('[data-testid="export-ready"]', { timeout: 45000 });
    
    const [pdfDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="download-export"]')
    ]);
    
    expect(pdfDownload.suggestedFilename()).toContain('.pdf');
  });
});
```

#### Data Import and Validation

```typescript
test('should import and validate modified data', async ({ page }) => {
  await loginTestUser(page);
  
  // Navigate to import section
  await page.click('[data-testid="nav-settings"]');
  await page.click('[data-testid="data-management"]');
  await page.click('[data-testid="import-tab"]');
  
  // Import file selection
  await page.setInputFiles('[data-testid="import-file"]', 'test-files/modified-workout-data.json');
  
  // File validation
  await expect(page.locator('[data-testid="file-validation"]')).toBeVisible();
  await page.waitForSelector('[data-testid="validation-complete"]', { timeout: 15000 });
  
  // Review import preview
  await expect(page.locator('[data-testid="import-preview"]')).toBeVisible();
  
  const recordsToImport = await page.locator('[data-testid="import-count"]').textContent();
  expect(parseInt(recordsToImport)).toBeGreaterThan(0);
  
  // Handle conflicts
  const hasConflicts = await page.locator('[data-testid="conflict-resolution"]').isVisible();
  
  if (hasConflicts) {
    await page.selectOption('[data-testid="conflict-strategy"]', 'merge_update');
    await page.click('[data-testid="resolve-conflicts"]');
  }
  
  // Import data
  await page.click('[data-testid="import-data"]');
  
  // Monitor import progress
  await expect(page.locator('[data-testid="import-processing"]')).toBeVisible();
  await page.waitForSelector('[data-testid="import-complete"]', { timeout: 60000 });
  
  // Verify import results
  const importSummary = await page.locator('[data-testid="import-summary"]').textContent();
  expect(importSummary).toContain('successful');
  
  // Validate imported data
  await page.click('[data-testid="nav-workouts"]');
  
  // Check that imported workouts appear
  const workoutCount = await page.locator('[data-testid="workout-item"]').count();
  expect(workoutCount).toBeGreaterThan(0);
  
  // Verify data integrity
  await page.click('[data-testid="workout-item"]').first();
  await expect(page.locator('[data-testid="workout-details"]')).toBeVisible();
  await expect(page.locator('[data-testid="exercise-list"]')).toBeVisible();
});
```

This completes the first major section of the e2e-workflows.md document covering all critical user journeys. The next part will continue with cross-feature integration workflows and test infrastructure. 

## Cross-Feature Integration Workflows

### Workout-Nutrition Integration

The seamless integration between workout planning and nutrition management is critical for user success.

#### Calorie Burn Integration and Macro Adjustment

```typescript
describe('Workout-Nutrition Integration', () => {
  test('should adjust nutrition based on workout calorie burn', async ({ page }) => {
    await setupUserWithNutritionPlan(page);
    
    // Complete a high-intensity workout
    await page.click('[data-testid="nav-workouts"]');
    await page.click('[data-testid="start-workout"]');
    
    // Log workout with high intensity
    await logCompleteWorkout(page, {
      exercises: [
        { name: 'Deadlifts', sets: 4, reps: 8, weight: 225 },
        { name: 'Squats', sets: 4, reps: 10, weight: 185 },
        { name: 'Bench Press', sets: 3, reps: 8, weight: 155 }
      ],
      intensity: 'high',
      duration: 75
    });
    
    // Rate workout intensity
    await page.selectOption('[data-testid="intensity-rating"]', '9');
    await page.selectOption('[data-testid="exertion-level"]', '8');
    await page.click('[data-testid="complete-workout"]');
    
    // Verify calorie burn calculation
    await expect(page.locator('[data-testid="calories-burned"]')).toBeVisible();
    const caloriesBurned = await page.locator('[data-testid="calories-burned"]').textContent();
    expect(parseInt(caloriesBurned)).toBeGreaterThan(300);
    
    // Navigate to nutrition dashboard
    await page.click('[data-testid="nav-nutrition"]');
    
    // Verify macro targets were adjusted
    await expect(page.locator('[data-testid="adjusted-targets-notice"]')).toBeVisible();
    
    const originalCalories = 2200; // From setup
    const adjustedCalories = await page.locator('[data-testid="daily-calorie-target"]').textContent();
    expect(parseInt(adjustedCalories)).toBeGreaterThan(originalCalories);
    
    // Check specific macro adjustments
    const carbsTarget = await page.locator('[data-testid="carbs-target"]').textContent();
    const proteinTarget = await page.locator('[data-testid="protein-target"]').textContent();
    
    // Post-workout carb window suggestion
    await expect(page.locator('[data-testid="post-workout-suggestion"]')).toBeVisible();
    await expect(page.locator('[data-testid="post-workout-suggestion"]')).toContainText('carbohydrate');
    
    // Quick log post-workout meal
    await page.click('[data-testid="quick-post-workout-meal"]');
    await page.click('[data-testid="add-protein-shake"]');
    await page.click('[data-testid="add-banana"]');
    await page.click('[data-testid="confirm-post-workout"]');
    
    // Verify macro tracking reflects workout impact
    const proteinProgress = await page.locator('[data-testid="protein-progress"]').getAttribute('aria-valuenow');
    expect(parseInt(proteinProgress)).toBeGreaterThan(10);
  });
});
```

#### Meal Timing Optimization

```typescript
test('should optimize meal timing around workouts', async ({ page }) => {
  await setupUserProfile(page);
  
  // Schedule a workout for tomorrow
  await page.click('[data-testid="nav-workouts"]');
  await page.click('[data-testid="schedule-workout"]');
  await page.selectOption('[data-testid="workout-time"]', '07:00');
  await page.click('[data-testid="save-schedule"]');
  
  // Navigate to meal planning
  await page.click('[data-testid="nav-nutrition"]');
  await page.click('[data-testid="meal-planner"]');
  
  // Generate meal plan with workout timing
  await page.click('[data-testid="optimize-for-workouts"]');
  await page.click('[data-testid="generate-meal-timing"]');
  
  await expect(page.locator('[data-testid="meal-timing-processing"]')).toBeVisible();
  await page.waitForSelector('[data-testid="optimized-meal-plan"]', { timeout: 30000 });
  
  // Verify pre-workout meal timing
  const preWorkoutMeal = page.locator('[data-testid="pre-workout-meal"]');
  await expect(preWorkoutMeal).toBeVisible();
  
  const preWorkoutTime = await preWorkoutMeal.locator('[data-testid="meal-time"]').textContent();
  expect(preWorkoutTime).toContain('06:00'); // 1 hour before workout
  
  // Verify pre-workout meal composition
  const preWorkoutContent = await preWorkoutMeal.locator('[data-testid="meal-content"]').textContent();
  expect(preWorkoutContent.toLowerCase()).toContain('carbohydrate');
  expect(preWorkoutContent.toLowerCase()).not.toContain('high fat'); // Should avoid high fat pre-workout
  
  // Check post-workout meal timing
  const postWorkoutMeal = page.locator('[data-testid="post-workout-meal"]');
  const postWorkoutTime = await postWorkoutMeal.locator('[data-testid="meal-time"]').textContent();
  expect(postWorkoutTime).toContain('08:30'); // 30-90 minutes post-workout
  
  // Verify post-workout nutrition
  const postWorkoutContent = await postWorkoutMeal.locator('[data-testid="meal-content"]').textContent();
  expect(postWorkoutContent.toLowerCase()).toContain('protein');
  expect(postWorkoutContent.toLowerCase()).toContain('carbohydrate');
});
```

### Progress-Analytics Integration

#### Data Collection and Pattern Recognition

```typescript
describe('Progress-Analytics Integration', () => {
  test('should analyze patterns across multiple data sources', async ({ page }) => {
    await createMultiSourceProgressData(page);
    
    // Navigate to analytics dashboard
    await page.click('[data-testid="nav-analytics"]');
    
    // Trigger comprehensive analysis
    await page.click('[data-testid="analyze-patterns"]');
    await expect(page.locator('[data-testid="pattern-analysis-processing"]')).toBeVisible();
    
    // Wait for AI analysis completion
    await page.waitForSelector('[data-testid="pattern-insights"]', { timeout: 60000 });
    
    // Verify correlation insights
    await expect(page.locator('[data-testid="correlation-workout-nutrition"]')).toBeVisible();
    await expect(page.locator('[data-testid="correlation-sleep-performance"]')).toBeVisible();
    
    // Check specific pattern detection
    const workoutConsistencyPattern = page.locator('[data-testid="workout-consistency-pattern"]');
    await expect(workoutConsistencyPattern).toBeVisible();
    
    const consistencyInsight = await workoutConsistencyPattern.textContent();
    expect(consistencyInsight.toLowerCase()).toContain('consistent');
    
    // Nutrition adherence pattern
    const nutritionPattern = page.locator('[data-testid="nutrition-adherence-pattern"]');
    await expect(nutritionPattern).toBeVisible();
    
    // Progress velocity analysis
    const progressVelocity = page.locator('[data-testid="progress-velocity"]');
    await expect(progressVelocity).toBeVisible();
    
    const velocityText = await progressVelocity.textContent();
    expect(velocityText).toContain('%'); // Should show percentage change
    
    // Predictive insights
    await page.click('[data-testid="view-predictions"]');
    await expect(page.locator('[data-testid="prediction-models"]')).toBeVisible();
    
    // 30-day prediction
    const monthPrediction = page.locator('[data-testid="30-day-prediction"]');
    await expect(monthPrediction).toBeVisible();
    
    // Confidence intervals
    await expect(page.locator('[data-testid="prediction-confidence"]')).toBeVisible();
    const confidence = await page.locator('[data-testid="confidence-score"]').textContent();
    expect(parseFloat(confidence)).toBeGreaterThan(0.6);
  });
});
```

#### Goal-Driven Feature Coordination

```typescript
test('should coordinate all features toward goal achievement', async ({ page }) => {
  await loginTestUser(page);
  
  // Set new primary goal
  await page.click('[data-testid="nav-profile"]');
  await page.click('[data-testid="edit-goals"]');
  
  await page.selectOption('[data-testid="primary-goal"]', 'strength_gain');
  await page.fill('[data-testid="goal-details"]', 'Increase bench press by 50 lbs in 6 months');
  await page.selectOption('[data-testid="goal-timeline"]', '6_months');
  await page.click('[data-testid="save-goal"]');
  
  // Verify system-wide recalibration
  await expect(page.locator('[data-testid="recalibration-notice"]')).toBeVisible();
  await page.click('[data-testid="start-recalibration"]');
  
  // Monitor AI recalibration process
  await expect(page.locator('[data-testid="ai-recalibration"]')).toBeVisible();
  const stages = [
    'Analyzing new goal requirements',
    'Updating workout programming',
    'Adjusting nutrition targets',
    'Recalibrating progress metrics'
  ];
  
  for (const stage of stages) {
    await expect(page.locator('[data-testid="recalibration-stage"]')).toContainText(stage);
  }
  
  await page.waitForSelector('[data-testid="recalibration-complete"]', { timeout: 60000 });
  
  // Verify workout plan changes
  await page.click('[data-testid="nav-workouts"]');
  const workoutFocus = await page.locator('[data-testid="plan-focus"]').textContent();
  expect(workoutFocus.toLowerCase()).toContain('strength');
  
  // Check exercise selection emphasis
  const exercises = await page.locator('[data-testid="exercise-name"]').allTextContents();
  const hasCompoundLifts = exercises.some(name => 
    name.toLowerCase().includes('bench press') ||
    name.toLowerCase().includes('squat') ||
    name.toLowerCase().includes('deadlift')
  );
  expect(hasCompoundLifts).toBe(true);
  
  // Verify nutrition adjustments
  await page.click('[data-testid="nav-nutrition"]');
  const proteinTarget = await page.locator('[data-testid="protein-target"]').textContent();
  expect(parseInt(proteinTarget)).toBeGreaterThan(140); // Higher protein for strength goals
  
  // Check progress tracking metrics
  await page.click('[data-testid="nav-progress"]');
  await expect(page.locator('[data-testid="strength-metrics"]')).toBeVisible();
  await expect(page.locator('[data-testid="bench-press-tracking"]')).toBeVisible();
  
  // Verify goal milestone setup
  await expect(page.locator('[data-testid="goal-milestones"]')).toBeVisible();
  const milestones = await page.locator('[data-testid="milestone-item"]').count();
  expect(milestones).toBeGreaterThan(3); // Should have intermediate milestones
});
```

## E2E Test Infrastructure

### Test Environment Setup

#### Playwright Configuration and Management

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/test-results.json' }]
  ],
  
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 30000
  },

  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    
    // Mobile devices
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] }
    },
    
    // Tablet
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] }
    }
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
});
```

#### Test Data Management

```typescript
// e2e/utils/test-data-manager.ts
export class TestDataManager {
  private static instance: TestDataManager;
  private testUsers: Map<string, TestUser> = new Map();
  private testData: Map<string, any> = new Map();

  static getInstance(): TestDataManager {
    if (!this.instance) {
      this.instance = new TestDataManager();
    }
    return this.instance;
  }

  async createTestUser(scenario: string): Promise<TestUser> {
    const userData = {
      name: `E2E User ${scenario}`,
      email: `e2e-${scenario}-${Date.now()}@test.com`,
      password: 'TestPassword123!',
      profile: this.getProfileForScenario(scenario)
    };

    // Create user in test database
    const response = await fetch('/api/test/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    const user = await response.json();
    this.testUsers.set(user.id, user);
    
    return user;
  }

  async seedWorkoutData(userId: string, workoutCount: number = 5): Promise<void> {
    const workouts = [];
    
    for (let i = 0; i < workoutCount; i++) {
      workouts.push({
        userId,
        name: `Test Workout ${i + 1}`,
        exercises: this.generateTestExercises(),
        completedAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
        difficulty: Math.floor(Math.random() * 10) + 1,
        satisfaction: Math.floor(Math.random() * 10) + 1
      });
    }

    await fetch('/api/test/workouts/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workouts })
    });
  }

  async seedProgressData(userId: string, entryCount: number = 10): Promise<void> {
    const baseWeight = 70;
    const progressEntries = [];

    for (let i = 0; i < entryCount; i++) {
      const daysAgo = i * 7; // Weekly entries
      progressEntries.push({
        userId,
        date: new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000)),
        weight: baseWeight + (Math.random() - 0.5) * 2, // Small variations
        bodyFat: 15 + (Math.random() - 0.5) * 3,
        measurements: {
          chest: 40 + Math.random(),
          waist: 32 + Math.random(),
          arms: 14 + Math.random()
        },
        energyLevel: Math.floor(Math.random() * 10) + 1,
        sleepQuality: Math.floor(Math.random() * 10) + 1
      });
    }

    await fetch('/api/test/progress/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: progressEntries })
    });
  }

  async cleanupTestData(): Promise<void> {
    const userIds = Array.from(this.testUsers.keys());
    
    await fetch('/api/test/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds })
    });

    this.testUsers.clear();
    this.testData.clear();
  }

  private getProfileForScenario(scenario: string): UserProfile {
    const profiles = {
      beginner: {
        fitnessLevel: 'beginner',
        goals: ['weight_loss', 'general_fitness'],
        equipment: ['bodyweight'],
        workoutFrequency: '3x per week',
        experience: 0
      },
      intermediate: {
        fitnessLevel: 'intermediate',
        goals: ['muscle_gain', 'strength'],
        equipment: ['dumbbells', 'barbell'],
        workoutFrequency: '4x per week',
        experience: 2
      },
      advanced: {
        fitnessLevel: 'advanced',
        goals: ['strength', 'athletic_performance'],
        equipment: ['full_gym'],
        workoutFrequency: '5x per week',
        experience: 5
      }
    };

    return profiles[scenario] || profiles.intermediate;
  }

  private generateTestExercises(): Exercise[] {
    const exercisePool = [
      { name: 'Push-ups', sets: 3, reps: 12, weight: 0 },
      { name: 'Squats', sets: 3, reps: 15, weight: 0 },
      { name: 'Bench Press', sets: 4, reps: 8, weight: 135 },
      { name: 'Deadlifts', sets: 3, reps: 5, weight: 185 },
      { name: 'Pull-ups', sets: 3, reps: 8, weight: 0 }
    ];

    return exercisePool.slice(0, 3 + Math.floor(Math.random() * 3));
  }
}
```

#### Environment Variables and Configuration

```typescript
// e2e/config/test-config.ts
export const TestConfig = {
  // Test environment URLs
  baseUrl: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
  apiUrl: process.env.TEST_API_URL || 'http://localhost:3000/api',
  
  // Database configuration
  testDatabase: {
    url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/trainer_test',
    resetBetweenTests: process.env.RESET_DB_BETWEEN_TESTS === 'true'
  },
  
  // External service mocking
  mockExternalServices: process.env.MOCK_EXTERNAL_SERVICES !== 'false',
  
  // AI service configuration
  aiServices: {
    mockOpenAI: process.env.MOCK_OPENAI === 'true',
    mockPerplexity: process.env.MOCK_PERPLEXITY === 'true',
    openAIApiKey: process.env.TEST_OPENAI_API_KEY,
    perplexityApiKey: process.env.TEST_PERPLEXITY_API_KEY
  },
  
  // Performance thresholds
  performance: {
    pageLoadTimeout: parseInt(process.env.PAGE_LOAD_TIMEOUT || '3000'),
    apiResponseTimeout: parseInt(process.env.API_RESPONSE_TIMEOUT || '5000'),
    aiProcessingTimeout: parseInt(process.env.AI_PROCESSING_TIMEOUT || '60000')
  },
  
  // Test execution configuration
  parallel: {
    workers: parseInt(process.env.E2E_WORKERS || '1'),
    retries: parseInt(process.env.E2E_RETRIES || '2'),
    timeout: parseInt(process.env.E2E_TIMEOUT || '30000')
  },
  
  // Visual regression testing
  visualRegression: {
    threshold: parseFloat(process.env.VISUAL_REGRESSION_THRESHOLD || '0.2'),
    updateSnapshots: process.env.UPDATE_VISUAL_SNAPSHOTS === 'true'
  },
  
  // Accessibility testing
  accessibility: {
    level: process.env.A11Y_LEVEL || 'AA',
    includeTags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
    excludeTags: ['experimental']
  }
};
```

### Authentication State Management

#### Session Handling and User Contexts

```typescript
// e2e/fixtures/auth-fixtures.ts
import { test as base, expect } from '@playwright/test';
import { TestDataManager } from '../utils/test-data-manager';

type AuthFixtures = {
  authenticatedUser: {
    page: Page;
    userData: TestUser;
    logout: () => Promise<void>;
  };
  multipleUsers: {
    users: Array<{ page: Page; userData: TestUser }>;
    cleanup: () => Promise<void>;
  };
};

export const test = base.extend<AuthFixtures>({
  authenticatedUser: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Create test user
    const testDataManager = TestDataManager.getInstance();
    const userData = await testDataManager.createTestUser('authenticated');
    
    // Login
    await page.goto('/auth/login');
    await page.fill('[data-testid="email"]', userData.email);
    await page.fill('[data-testid="password"]', userData.password);
    await page.click('[data-testid="login-submit"]');
    
    // Wait for successful login
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    
    const logout = async () => {
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout"]');
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    };
    
    await use({ page, userData, logout });
    
    // Cleanup
    await context.close();
    await testDataManager.cleanupTestData();
  },

  multipleUsers: async ({ browser }, use) => {
    const contexts = [];
    const users = [];
    const testDataManager = TestDataManager.getInstance();
    
    // Create multiple user contexts
    for (let i = 0; i < 3; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const userData = await testDataManager.createTestUser(`multi-user-${i}`);
      
      // Login each user
      await page.goto('/auth/login');
      await page.fill('[data-testid="email"]', userData.email);
      await page.fill('[data-testid="password"]', userData.password);
      await page.click('[data-testid="login-submit"]');
      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
      
      contexts.push(context);
      users.push({ page, userData });
    }
    
    const cleanup = async () => {
      for (const context of contexts) {
        await context.close();
      }
      await testDataManager.cleanupTestData();
    };
    
    await use({ users, cleanup });
    
    await cleanup();
  }
});
```

### Database Cleanup & Isolation

#### Parallel Test Safety

```typescript
// e2e/utils/database-manager.ts
export class DatabaseManager {
  private static instance: DatabaseManager;
  private isolationMap: Map<string, string> = new Map();

  static getInstance(): DatabaseManager {
    if (!this.instance) {
      this.instance = new DatabaseManager();
    }
    return this.instance;
  }

  async createIsolatedEnvironment(testId: string): Promise<string> {
    const isolationId = `test_${testId}_${Date.now()}`;
    
    // Create isolated schema or namespace
    await this.executeQuery(`CREATE SCHEMA IF NOT EXISTS ${isolationId}`);
    
    // Copy necessary tables and data
    await this.setupIsolatedTables(isolationId);
    
    this.isolationMap.set(testId, isolationId);
    return isolationId;
  }

  async cleanupIsolatedEnvironment(testId: string): Promise<void> {
    const isolationId = this.isolationMap.get(testId);
    if (!isolationId) return;

    try {
      // Drop isolated schema
      await this.executeQuery(`DROP SCHEMA ${isolationId} CASCADE`);
      this.isolationMap.delete(testId);
    } catch (error) {
      console.error(`Failed to cleanup test environment ${isolationId}:`, error);
    }
  }

  async seedTestData(isolationId: string, dataType: string, data: any[]): Promise<void> {
    const tableName = `${isolationId}.${dataType}`;
    
    for (const item of data) {
      const columns = Object.keys(item);
      const values = Object.values(item);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      await this.executeQuery(
        `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
        values
      );
    }
  }

  private async setupIsolatedTables(isolationId: string): Promise<void> {
    const tables = [
      'users', 'profiles', 'workouts', 'exercises', 'nutrition_plans',
      'progress_entries', 'workout_logs', 'food_logs'
    ];

    for (const table of tables) {
      // Copy table structure
      await this.executeQuery(
        `CREATE TABLE ${isolationId}.${table} (LIKE public.${table} INCLUDING ALL)`
      );
      
      // Copy essential reference data
      if (['exercises', 'foods'].includes(table)) {
        await this.executeQuery(
          `INSERT INTO ${isolationId}.${table} SELECT * FROM public.${table}`
        );
      }
    }
  }

  private async executeQuery(query: string, params: any[] = []): Promise<any> {
    // Implementation depends on your database client
    // This is a simplified version
    const client = await this.getDbClient();
    try {
      return await client.query(query, params);
    } finally {
      await client.release();
    }
  }

  private async getDbClient(): Promise<any> {
    // Return database client based on your setup
    // Could be pg, prisma, or other database client
    throw new Error('Database client implementation required');
  }
}

// Test setup with database isolation
test.beforeEach(async ({ page }, testInfo) => {
  const dbManager = DatabaseManager.getInstance();
  const isolationId = await dbManager.createIsolatedEnvironment(testInfo.testId);
  
  // Store isolation ID for use in test
  (page as any).testIsolationId = isolationId;
});

test.afterEach(async ({ page }, testInfo) => {
  const dbManager = DatabaseManager.getInstance();
  await dbManager.cleanupIsolatedEnvironment(testInfo.testId);
});
```

## Performance Benchmarks & Monitoring

### Frontend Performance Targets

#### Core Web Vitals Monitoring

```typescript
// e2e/performance/core-web-vitals.spec.ts
import { test, expect } from '@playwright/test';
import { injectSpeedInsights } from '@vercel/speed-insights';

test.describe('Core Web Vitals', () => {
  test('should meet performance targets on dashboard', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Measure Core Web Vitals
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {};
        
        // First Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
          if (fcpEntry) {
            vitals.fcp = fcpEntry.startTime;
          }
        }).observe({ entryTypes: ['paint'] });
        
        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            vitals.lcp = entries[entries.length - 1].startTime;
          }
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Cumulative Layout Shift
        let clsScore = 0;
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            if (!entry.hadRecentInput) {
              clsScore += entry.value;
            }
          }
          vitals.cls = clsScore;
        }).observe({ entryTypes: ['layout-shift'] });
        
        // First Input Delay (simulated)
        document.addEventListener('click', function measureFID() {
          vitals.fid = performance.now();
          document.removeEventListener('click', measureFID);
        }, { once: true });
        
        // Wait for measurements
        setTimeout(() => resolve(vitals), 3000);
      });
    });
    
    // Assert performance targets
    expect(vitals.fcp).toBeLessThan(1800); // < 1.8s Good FCP
    expect(vitals.lcp).toBeLessThan(2500); // < 2.5s Good LCP  
    expect(vitals.cls).toBeLessThan(0.1);  // < 0.1 Good CLS
  });

  test('should load AI workout generation within performance targets', async ({ page }) => {
    await loginTestUser(page);
    
    // Start performance measurement
    await page.addInitScript(() => {
      window.performanceMarks = {};
      
      // Mark start of AI generation
      window.markAIStart = () => {
        window.performanceMarks.aiStart = performance.now();
      };
      
      // Mark first token received
      window.markFirstToken = () => {
        window.performanceMarks.firstToken = performance.now();
      };
      
      // Mark AI generation complete
      window.markAIComplete = () => {
        window.performanceMarks.aiComplete = performance.now();
      };
    });
    
    // Navigate to workout generation
    await page.goto('/workouts/generate');
    await page.click('[data-testid="generate-workout"]');
    
    // Wait for AI processing to complete
    await page.waitForSelector('[data-testid="workout-plan-ready"]', { timeout: 60000 });
    
    // Measure AI response timing
    const timings = await page.evaluate(() => window.performanceMarks);
    
    const timeToFirstToken = timings.firstToken - timings.aiStart;
    const totalProcessingTime = timings.aiComplete - timings.aiStart;
    
    // Performance assertions
    expect(timeToFirstToken).toBeLessThan(2000); // First token within 2s
    expect(totalProcessingTime).toBeLessThan(30000); // Complete within 30s
    
    // Verify UI responsiveness during AI processing
    const uiResponsive = await page.evaluate(() => {
      // Test that UI remained interactive during processing
      const button = document.querySelector('[data-testid="cancel-generation"]');
      return button && !button.disabled;
    });
    
    expect(uiResponsive).toBeTruthy();
  });
});
```

#### Form Submission Performance

```typescript
test.describe('Form Performance', () => {
  test('should provide feedback within 1 second', async ({ page }) => {
    await loginTestUser(page);
    await page.goto('/profile/edit');
    
    // Start timing
    const startTime = Date.now();
    
    // Submit form changes
    await page.fill('[data-testid="weight"]', '75');
    await page.click('[data-testid="save-profile"]');
    
    // Wait for feedback
    await page.waitForSelector('[data-testid="save-success"]');
    
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(1000); // < 1 second feedback
  });

  test('should handle nutrition logging efficiently', async ({ page }) => {
    await setupNutritionPlan(page);
    
    const foods = [
      { name: 'Oatmeal', amount: '1 cup' },
      { name: 'Banana', amount: '1 medium' },
      { name: 'Protein powder', amount: '1 scoop' }
    ];
    
    const startTime = performance.now();
    
    // Log multiple foods quickly
    for (const food of foods) {
      await page.fill('[data-testid="food-search"]', food.name);
      await page.waitForSelector('[data-testid="search-results"]');
      await page.click('[data-testid="food-result-0"]');
      await page.fill('[data-testid="serving-amount"]', food.amount);
      await page.click('[data-testid="add-food"]');
      
      // Verify quick response
      await page.waitForSelector('[data-testid="food-added"]', { timeout: 2000 });
    }
    
    const totalTime = performance.now() - startTime;
    const averageTimePerFood = totalTime / foods.length;
    
    expect(averageTimePerFood).toBeLessThan(3000); // < 3s per food item
  });
});
```

### User Experience Metrics

#### Interaction Responsiveness

```typescript
test.describe('Interaction Responsiveness', () => {
  test('should provide immediate visual feedback on clicks', async ({ page }) => {
    await loginTestUser(page);
    await page.goto('/workouts');
    
    // Test button feedback timing
    const buttons = await page.locator('[data-testid^="workout-action"]').all();
    
    for (const button of buttons) {
      const startTime = performance.now();
      
      // Click button
      await button.click();
      
      // Wait for visual feedback (loading state, color change, etc.)
      await page.waitForFunction(() => {
        // Check for any visual feedback indicators
        return document.querySelector('[data-testid="loading"]') !== null ||
               document.querySelector('.button-clicked') !== null ||
               document.querySelector('[aria-pressed="true"]') !== null;
      }, undefined, { timeout: 500 });
      
      const feedbackTime = performance.now() - startTime;
      expect(feedbackTime).toBeLessThan(100); // < 100ms visual feedback
    }
  });

  test('should maintain 60fps during animations', async ({ page }) => {
    await page.goto('/progress');
    
    // Monitor frame rate during chart animation
    const frameRates = await page.evaluate(() => {
      return new Promise((resolve) => {
        const frames = [];
        let lastTime = performance.now();
        
        function measureFrame() {
          const currentTime = performance.now();
          const fps = 1000 / (currentTime - lastTime);
          frames.push(fps);
          lastTime = currentTime;
          
          if (frames.length < 60) { // Measure for ~1 second
            requestAnimationFrame(measureFrame);
          } else {
            resolve(frames);
          }
        }
        
        // Trigger animation
        document.querySelector('[data-testid="animate-chart"]')?.click();
        requestAnimationFrame(measureFrame);
      });
    });
    
    const averageFPS = frameRates.reduce((a, b) => a + b) / frameRates.length;
    const minFPS = Math.min(...frameRates);
    
    expect(averageFPS).toBeGreaterThan(55); // Average > 55fps
    expect(minFPS).toBeGreaterThan(45);     // Never below 45fps
  });
});
```

### Performance Monitoring Integration

#### Lighthouse Integration

```typescript
// e2e/performance/lighthouse.spec.ts
import { test } from '@playwright/test';
import { playAudit } from 'playwright-lighthouse';

test.describe('Lighthouse Audits', () => {
  test('should pass Lighthouse performance audit', async ({ page, browser }) => {
    await page.goto('/dashboard');
    
    // Run Lighthouse audit
    const auditResults = await playAudit({
      page,
      thresholds: {
        performance: 85,
        accessibility: 95,
        'best-practices': 90,
        seo: 85,
        pwa: 70
      },
      port: 9222
    });
    
    // Assert audit scores
    expect(auditResults.lhr.categories.performance.score * 100).toBeGreaterThan(85);
    expect(auditResults.lhr.categories.accessibility.score * 100).toBeGreaterThan(95);
    expect(auditResults.lhr.categories['best-practices'].score * 100).toBeGreaterThan(90);
  });

  test('should meet mobile performance standards', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 12']
    });
    
    const page = await context.newPage();
    await page.goto('/dashboard');
    
    const auditResults = await playAudit({
      page,
      thresholds: {
        performance: 80, // Slightly lower for mobile
        accessibility: 95,
        'best-practices': 90
      },
      port: 9223
    });
    
    expect(auditResults.lhr.categories.performance.score * 100).toBeGreaterThan(80);
    
    await context.close();
  });
});
```

## Visual Regression & Accessibility Testing

### Chromatic Integration

#### Component Library Testing

```typescript
// e2e/visual/component-consistency.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test('should maintain consistent workout card design', async ({ page }) => {
    await loginTestUser(page);
    await page.goto('/workouts');
    
    // Wait for all images and content to load
    await page.waitForLoadState('networkidle');
    
    // Screenshot workout card component
    const workoutCard = page.locator('[data-testid="workout-card"]').first();
    await expect(workoutCard).toHaveScreenshot('workout-card.png');
    
    // Test different states
    await workoutCard.hover();
    await expect(workoutCard).toHaveScreenshot('workout-card-hover.png');
    
    await workoutCard.click();
    const expandedCard = page.locator('[data-testid="workout-card-expanded"]');
    await expect(expandedCard).toHaveScreenshot('workout-card-expanded.png');
  });

  test('should maintain dashboard layout across viewports', async ({ page }) => {
    await loginTestUser(page);
    await page.goto('/dashboard');
    
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-large' },
      { width: 1366, height: 768, name: 'desktop-medium' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500); // Allow for responsive adjustments
      
      await expect(page).toHaveScreenshot(`dashboard-${viewport.name}.png`);
    }
  });

  test('should maintain consistent theme variations', async ({ page }) => {
    await loginTestUser(page);
    
    // Test light theme
    await page.goto('/dashboard');
    await page.locator('[data-testid="theme-toggle"]').click();
    await page.waitForSelector('[data-theme="light"]');
    await expect(page).toHaveScreenshot('dashboard-light-theme.png');
    
    // Test dark theme  
    await page.locator('[data-testid="theme-toggle"]').click();
    await page.waitForSelector('[data-theme="dark"]');
    await expect(page).toHaveScreenshot('dashboard-dark-theme.png');
    
    // Test high contrast mode
    await page.locator('[data-testid="accessibility-menu"]').click();
    await page.locator('[data-testid="high-contrast-toggle"]').click();
    await page.waitForSelector('[data-theme="high-contrast"]');
    await expect(page).toHaveScreenshot('dashboard-high-contrast.png');
  });
});
```

### Accessibility Compliance

#### WCAG 2.1 AA Testing

```typescript
// e2e/accessibility/wcag-compliance.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Compliance', () => {
  test('should pass WCAG 2.1 AA compliance on all main pages', async ({ page }) => {
    const pages = [
      '/dashboard',
      '/workouts',
      '/nutrition', 
      '/progress',
      '/profile'
    ];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    let focusedElement = await page.locator(':focus').first();
    await expect(focusedElement).toBeVisible();
    
    // Navigate through main menu
    const menuItems = ['workouts', 'nutrition', 'progress', 'profile'];
    
    for (const item of menuItems) {
      await page.keyboard.press('Tab');
      focusedElement = await page.locator(':focus').first();
      
      // Verify focus is visible
      const focusOutline = await focusedElement.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.outline !== 'none' || styles.boxShadow !== 'none';
      });
      
      expect(focusOutline).toBeTruthy();
      
      // Test Enter key activation
      if (await focusedElement.getAttribute('data-testid') === `nav-${item}`) {
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(new RegExp(item));
        await page.goBack();
      }
    }
  });

  test('should provide proper ARIA labels and roles', async ({ page }) => {
    await page.goto('/workouts/generate');
    
    // Test form accessibility
    const formElements = await page.locator('input, select, textarea, button').all();
    
    for (const element of formElements) {
      const hasLabel = await element.evaluate((el) => {
        // Check for aria-label, aria-labelledby, or associated label
        return el.hasAttribute('aria-label') ||
               el.hasAttribute('aria-labelledby') ||
               document.querySelector(`label[for="${el.id}"]`) !== null;
      });
      
      expect(hasLabel).toBeTruthy();
    }
    
    // Test interactive elements have proper roles
    const buttons = await page.locator('[role="button"], button').all();
    for (const button of buttons) {
      const isAccessible = await button.evaluate((el) => {
        return el.hasAttribute('aria-label') || el.textContent.trim() !== '';
      });
      
      expect(isAccessible).toBeTruthy();
    }
  });

  test('should support screen readers', async ({ page }) => {
    await page.goto('/progress');
    
    // Test live regions for dynamic content
    await page.click('[data-testid="generate-insights"]');
    
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toBeVisible();
    
    // Test that important updates are announced
    await page.waitForSelector('[data-testid="insights-complete"]');
    
    const liveRegionContent = await liveRegion.textContent();
    expect(liveRegionContent).toContain('insights');
    
    // Test chart accessibility
    const chart = page.locator('[data-testid="progress-chart"]');
    await expect(chart).toHaveAttribute('role', 'img');
    await expect(chart).toHaveAttribute('aria-label');
    
    // Verify chart has data table alternative
    const dataTable = page.locator('[data-testid="chart-data-table"]');
    await expect(dataTable).toBeVisible();
  });

  test('should meet color contrast requirements', async ({ page }) => {
    await page.goto('/dashboard');
    
    const colorContrastScan = await new AxeBuilder({ page })
      .withTags(['color-contrast'])
      .analyze();
    
    expect(colorContrastScan.violations).toEqual([]);
    
    // Test high contrast mode
    await page.locator('[data-testid="accessibility-menu"]').click();
    await page.locator('[data-testid="high-contrast-toggle"]').click();
    
    const highContrastScan = await new AxeBuilder({ page })
      .withTags(['color-contrast'])
      .analyze();
    
    expect(highContrastScan.violations).toEqual([]);
  });
});
```

## Testing Strategy Integration

### Component Testing Foundation

E2E workflows build upon the component testing foundation established in `component-testing.md`:

- **Component Validation**: E2E tests validate that individually tested components work correctly in full user workflows
- **Shared Test Utilities**: Reuse component test fixtures and utilities for consistent data setup
- **Progressive Testing**: Move from isolated component tests → integration tests → full E2E workflows

### API and AI Mocking Coordination

E2E tests leverage both API mocking (`api-mocking.md`) and AI response mocking (`ai-response-mocking.md`):

```typescript
// Example: E2E test with coordinated mocking
describe('Complete Workout Generation Journey', () => {
  beforeEach(() => {
    // Use API mocks for standard endpoints
    server.use(...standardAPIHandlers);
    
    // Add AI-specific mocking for workout generation
    server.use(...aiWorkoutGenerationHandlers);
  });

  it('completes full workout generation workflow', async ({ page }) => {
    // Test leverages both API and AI mocking for realistic E2E experience
    await page.goto('/workouts/generate');
    
    // API mock handles user profile fetch
    await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
    
    // AI mock handles workout generation
    await page.click('[data-testid="generate-workout"]');
    await expect(page.locator('[data-testid="ai-reasoning"]')).toBeVisible();
    
    // Combined mocking enables full workflow testing
  });
});
```

### Unified Testing Strategy

The complete testing approach integrates all documentation:

1. **Component Tests** → Validate individual component behavior
2. **API Mocking** → Provide realistic backend responses  
3. **AI Mocking** → Simulate intelligent agent interactions
4. **E2E Workflows** → Verify complete user journeys work end-to-end

This layered approach ensures comprehensive coverage while maintaining testing efficiency and reliability.

This completes the comprehensive E2E Workflow Testing Guide with all required sections covering critical user journeys, cross-feature integration, test infrastructure, performance monitoring, and accessibility compliance for the trAIner app. 