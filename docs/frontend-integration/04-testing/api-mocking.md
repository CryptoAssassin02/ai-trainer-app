# API Mocking Guide

## Overview

This guide establishes comprehensive API mocking strategies for the trAIner app using Mock Service Worker (MSW). Our approach emphasizes realistic API simulation, consistent test environments, and maintainable mocking patterns that support both development and testing workflows.

## Why Mock Service Worker?

**Realistic Network Simulation**: MSW intercepts network requests at the browser/Node.js level, providing the most realistic API mocking experience.

**Environment Agnostic**: Works seamlessly in browsers, Node.js tests, and development environments.

**Type Safety**: Full TypeScript support with type-safe request/response handling.

**Maintenance**: Centralized mock definitions that can be shared across tests and development.

## MSW Setup and Configuration

### Installation and Basic Setup

```bash
npm install --save-dev msw
npx msw init public/ --save
```

### Test Environment Configuration

```typescript
// __mocks__/msw/index.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// Test setup
export const resetHandlers = () => server.resetHandlers();
export const useHandler = (handler: RequestHandler) => server.use(handler);
```

```typescript
// __tests__/setup.ts
import { server } from '../__mocks__/msw';

// Establish API mocking before all tests
beforeAll(() => server.listen());

// Reset handlers after each test (important for test isolation)
afterEach(() => server.resetHandlers());

// Clean up after all tests are done
afterAll(() => server.close());
```

### Browser Development Configuration

```typescript
// __mocks__/msw/browser.ts
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

// Start worker conditionally in development
if (process.env.NODE_ENV === 'development') {
  worker.start({
    onUnhandledRequest: 'warn',
  });
}
```

## API Handler Patterns

### Authentication Handlers

```typescript
// __mocks__/msw/handlers/auth.ts
import { http, HttpResponse } from 'msw';
import { createTestUser } from '../../fixtures/user-fixtures';

export const authHandlers = [
  // Successful login
  http.post('/v1/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        userId: 'user-123',
        jwtToken: 'mock-jwt-token',
        message: 'Login successful.'
      });
    }
    
    return HttpResponse.json(
      { status: 'error', message: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  // User signup
  http.post('/v1/auth/signup', async ({ request }) => {
    const body = await request.json() as { name: string; email: string; password: string };
    
    // Simulate existing user check
    if (body.email === 'existing@example.com') {
      return HttpResponse.json(
        { status: 'error', message: 'User already exists' },
        { status: 409 }
      );
    }
    
    return HttpResponse.json({
      userId: 'new-user-123',
      message: 'Account created successfully.'
    }, { status: 201 });
  }),

  // Token validation
  http.get('/v1/auth/me', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.includes('mock-jwt-token')) {
      return HttpResponse.json(
        { status: 'error', message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return HttpResponse.json({
      user: createTestUser()
    });
  }),
];
```

### Workout API Handlers

```typescript
// __mocks__/msw/handlers/workouts.ts
import { http, HttpResponse, delay } from 'msw';
import { createTestWorkoutPlan, createTestExercise } from '../../fixtures/workout-fixtures';

export const workoutHandlers = [
  // Generate workout plan (with AI simulation)
  http.post('/v1/workouts', async ({ request }) => {
    const body = await request.json() as WorkoutGenerationRequest;
    
    // Simulate AI processing time
    await delay(2000);
    
    // Simulate AI generation failure occasionally
    if (Math.random() < 0.1) { // 10% failure rate
      return HttpResponse.json(
        { 
          status: 'error', 
          message: 'AI service temporarily unavailable',
          errorType: 'ai_generation_failed'
        },
        { status: 503 }
      );
    }
    
    // Generate plan based on request parameters
    const plan = createTestWorkoutPlan({
      difficulty: body.fitnessLevel,
      exercises: generateExercisesForGoals(body.goals, body.equipment),
      estimatedDuration: body.workoutDuration || 45,
      reasoning: `Plan created for ${body.fitnessLevel} level user focusing on ${body.goals.join(', ')}`
    });
    
    return HttpResponse.json({
      status: 'success',
      data: plan
    });
  }),

  // Get workout plans list
  http.get('/v1/workouts', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const status = url.searchParams.get('status') || 'active';
    
    // Generate mock data based on parameters
    const plans = Array.from({ length: limit }, (_, i) => 
      createTestWorkoutPlan({
        id: `plan-${page}-${i}`,
        status: status as 'active' | 'draft' | 'archived'
      })
    );
    
    return HttpResponse.json({
      status: 'success',
      data: plans,
      pagination: {
        page,
        limit,
        totalPages: 5,
        hasNextPage: page < 5,
        hasPreviousPage: page > 1
      },
      totalCount: 100
    });
  }),

  // Get specific workout plan
  http.get('/v1/workouts/:planId', ({ params }) => {
    const { planId } = params;
    
    if (planId === 'non-existent') {
      return HttpResponse.json(
        { status: 'error', message: 'Workout plan not found' },
        { status: 404 }
      );
    }
    
    return HttpResponse.json({
      status: 'success',
      data: createTestWorkoutPlan({ id: planId as string })
    });
  }),

  // Adjust workout plan
  http.post('/v1/workouts/:planId', async ({ params, request }) => {
    const { planId } = params;
    const body = await request.json() as WorkoutAdjustmentRequest;
    
    await delay(1500); // Simulate AI processing
    
    const adjustedPlan = createTestWorkoutPlan({ id: planId as string });
    
    return HttpResponse.json({
      status: 'success',
      data: {
        adjustedPlan,
        appliedChanges: [
          {
            type: 'exercise_modified',
            description: 'Increased difficulty based on feedback',
            exerciseAffected: 'Bench Press',
            reason: body.feedback
          }
        ],
        feedbackSummary: `Applied adjustments: ${body.feedback}`
      }
    });
  }),
];

// Helper function to generate exercises based on goals
function generateExercisesForGoals(goals: string[], equipment: string[]) {
  const exerciseMap = {
    strength: ['Barbell Bench Press', 'Barbell Squat', 'Deadlift'],
    muscle_gain: ['Barbell Row', 'Overhead Press', 'Pull-ups'],
    endurance: ['Running', 'Cycling', 'Burpees']
  };
  
  const selectedExercises: any[] = [];
  
  goals.forEach(goal => {
    if (exerciseMap[goal as keyof typeof exerciseMap]) {
      exerciseMap[goal as keyof typeof exerciseMap].forEach(name => {
        selectedExercises.push(createTestExercise({ name }));
      });
    }
  });
  
  return selectedExercises.slice(0, 6); // Limit to 6 exercises
}
```

### Profile API Handlers

```typescript
// __mocks__/msw/handlers/profile.ts
import { http, HttpResponse } from 'msw';
import { createTestUserProfile } from '../../fixtures/profile-fixtures';

export const profileHandlers = [
  // Get user profile
  http.get('/v1/profile', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return HttpResponse.json(
        { status: 'error', message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return HttpResponse.json({
      status: 'success',
      data: createTestUserProfile()
    });
  }),

  // Create/Update profile
  http.post('/v1/profile', async ({ request }) => {
    const body = await request.json() as any;
    
    // Simulate validation errors
    if (!body.age || body.age < 13) {
      return HttpResponse.json({
        status: 'error',
        message: 'Validation failed',
        errors: [
          { field: 'age', message: 'Age must be at least 13', type: 'min' }
        ]
      }, { status: 400 });
    }
    
    const updatedProfile = createTestUserProfile({
      ...body,
      updatedAt: new Date().toISOString()
    });
    
    return HttpResponse.json({
      status: 'success',
      updatedProfile,
      message: 'Profile updated successfully.'
    });
  }),

  // Profile preferences
  http.get('/v1/profile/preferences', () => {
    return HttpResponse.json({
      status: 'success',
      data: {
        unitPreference: 'metric',
        goals: ['strength', 'muscle_gain'],
        equipment: ['dumbbells', 'barbell'],
        workoutFrequency: '3x per week'
      }
    });
  }),

  http.put('/v1/profile/preferences', async ({ request }) => {
    const contentType = request.headers.get('Content-Type');
    
    if (contentType !== 'application/json') {
      return HttpResponse.json(
        { status: 'error', message: 'Content-Type must be application/json' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    return HttpResponse.json({
      status: 'success',
      data: body,
      message: 'Preferences updated successfully.'
    });
  }),
];
```

## Real-Time Subscription Mocking

### WebSocket Simulation for AI Progress

```typescript
// __mocks__/msw/handlers/realtime.ts
import { http, HttpResponse } from 'msw';

// Simulate WebSocket events for AI reasoning progress
export const realtimeHandlers = [
  // Establish WebSocket connection
  http.post('/v1/realtime/connect', () => {
    return HttpResponse.json({
      connectionId: 'ws-connection-123',
      endpoint: 'ws://localhost:3000/ws'
    });
  }),

  // AI reasoning progress events
  http.get('/v1/realtime/ai-progress/:sessionId', ({ params }) => {
    const { sessionId } = params;
    
    // Simulate Server-Sent Events
    const stream = new ReadableStream({
      start(controller) {
        const steps = [
          { step: 'analyzing_profile', status: 'in_progress', message: 'Analyzing user profile...' },
          { step: 'researching_exercises', status: 'in_progress', message: 'Finding relevant exercises...' },
          { step: 'generating_plan', status: 'in_progress', message: 'Creating personalized plan...' },
          { step: 'complete', status: 'completed', message: 'Workout plan ready!' }
        ];
        
        let stepIndex = 0;
        const interval = setInterval(() => {
          if (stepIndex < steps.length) {
            const event = `data: ${JSON.stringify(steps[stepIndex])}\n\n`;
            controller.enqueue(new TextEncoder().encode(event));
            stepIndex++;
          } else {
            clearInterval(interval);
            controller.close();
          }
        }, 1000);
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  }),
];
```

### Supabase Real-Time Simulation

```typescript
// __mocks__/msw/handlers/supabase.ts
import { http, HttpResponse } from 'msw';

export const supabaseHandlers = [
  // Simulate Supabase realtime subscriptions
  http.post('*/realtime/v1/websocket', () => {
    return HttpResponse.json({
      status: 'ok',
      response: {
        type: 'system',
        event: 'phx_reply',
        payload: { status: 'ok', response: {} }
      }
    });
  }),

  // Workout plan updates via realtime
  http.get('/v1/realtime/workout-updates', () => {
    const stream = new ReadableStream({
      start(controller) {
        // Simulate workout plan update
        setTimeout(() => {
          const update = {
            event: 'UPDATE',
            table: 'workout_plans',
            new: createTestWorkoutPlan(),
            old: null
          };
          
          const event = `data: ${JSON.stringify(update)}\n\n`;
          controller.enqueue(new TextEncoder().encode(event));
          controller.close();
        }, 2000);
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });
  }),
];
```

## Error Simulation Patterns

### Network Error Simulation

```typescript
// __mocks__/msw/handlers/errors.ts
import { http, HttpResponse } from 'msw';

export const errorHandlers = [
  // Simulate network timeout
  http.post('/v1/workouts/timeout-test', () => {
    return HttpResponse.error();
  }),

  // Simulate rate limiting
  http.post('/v1/workouts/rate-limit-test', () => {
    return HttpResponse.json(
      { 
        status: 'error', 
        message: 'Rate limit exceeded. Try again in 60 seconds.',
        retryAfter: 60
      },
      { status: 429 }
    );
  }),

  // Simulate server error
  http.post('/v1/workouts/server-error-test', () => {
    return HttpResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    );
  }),

  // Simulate validation error
  http.post('/v1/workouts/validation-error-test', () => {
    return HttpResponse.json({
      status: 'error',
      message: 'Validation failed',
      errors: [
        { field: 'fitnessLevel', message: 'Fitness level is required', type: 'required' },
        { field: 'goals', message: 'At least one goal must be selected', type: 'minItems' }
      ]
    }, { status: 400 });
  }),
];
```

### Conditional Error Simulation

```typescript
// __mocks__/msw/handlers/conditional-errors.ts
import { http, HttpResponse } from 'msw';

// Global error simulation state
let simulateErrors = false;
let errorType = 'network';

export const conditionalErrorHandlers = [
  // Control error simulation
  http.post('/__test/simulate-errors', async ({ request }) => {
    const body = await request.json() as { enabled: boolean; type: string };
    simulateErrors = body.enabled;
    errorType = body.type;
    
    return HttpResponse.json({ success: true });
  }),

  // Conditional workout generation with errors
  http.post('/v1/workouts', ({ request }) => {
    if (simulateErrors) {
      switch (errorType) {
        case 'network':
          return HttpResponse.error();
        case 'timeout':
          return new Promise(() => {}); // Never resolves
        case 'server':
          return HttpResponse.json(
            { status: 'error', message: 'Server error' },
            { status: 500 }
          );
        case 'ai_quota':
          return HttpResponse.json(
            { 
              status: 'error', 
              message: 'AI quota exceeded',
              errorType: 'quota_exceeded',
              retryAfter: 3600
            },
            { status: 429 }
          );
      }
    }
    
    // Normal response
    return HttpResponse.json({
      status: 'success',
      data: createTestWorkoutPlan()
    });
  }),
];

// Helper functions for tests
export const enableErrorSimulation = (type: string) => {
  fetch('/__test/simulate-errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled: true, type })
  });
};

export const disableErrorSimulation = () => {
  fetch('/__test/simulate-errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled: false, type: 'none' })
  });
};
```

## Dynamic Response Generation

### Parameterized Responses

```typescript
// __mocks__/msw/handlers/dynamic.ts
import { http, HttpResponse } from 'msw';

export const dynamicHandlers = [
  // Dynamic workout plan generation based on user profile
  http.post('/v1/workouts', async ({ request }) => {
    const body = await request.json() as WorkoutGenerationRequest;
    
    // Generate plan complexity based on fitness level
    const complexityMap = {
      beginner: { exercises: 4, setsRange: [2, 3], complexity: 'simple' },
      intermediate: { exercises: 6, setsRange: [3, 4], complexity: 'moderate' },
      advanced: { exercises: 8, setsRange: [4, 5], complexity: 'complex' }
    };
    
    const config = complexityMap[body.fitnessLevel as keyof typeof complexityMap];
    
    const exercises = Array.from({ length: config.exercises }, (_, i) => 
      createTestExercise({
        sets: config.setsRange[0] + Math.floor(Math.random() * (config.setsRange[1] - config.setsRange[0] + 1)),
        name: `${body.fitnessLevel} Exercise ${i + 1}`
      })
    );
    
    return HttpResponse.json({
      status: 'success',
      data: createTestWorkoutPlan({
        exercises,
        difficulty: body.fitnessLevel,
        reasoning: `Generated ${config.complexity} plan for ${body.fitnessLevel} user`
      })
    });
  }),

  // Dynamic filtering based on query parameters
  http.get('/v1/workouts', ({ request }) => {
    const url = new URL(request.url);
    const difficulty = url.searchParams.get('difficulty');
    const equipment = url.searchParams.getAll('equipment');
    const search = url.searchParams.get('search');
    
    // Generate filtered results
    let plans = Array.from({ length: 20 }, (_, i) => createTestWorkoutPlan({ id: `plan-${i}` }));
    
    if (difficulty) {
      plans = plans.filter(plan => plan.difficulty === difficulty);
    }
    
    if (equipment.length > 0) {
      plans = plans.filter(plan => 
        plan.equipmentRequired.some(eq => equipment.includes(eq))
      );
    }
    
    if (search) {
      plans = plans.filter(plan => 
        plan.planName.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    return HttpResponse.json({
      status: 'success',
      data: plans,
      totalCount: plans.length
    });
  }),
];
```

## Test-Specific Mocking Patterns

### Test Suite Isolation

```typescript
// __tests__/components/workout/workout-generator.test.tsx
import { server } from '../../../__mocks__/msw';
import { http, HttpResponse } from 'msw';

describe('WorkoutGenerator', () => {
  describe('Success Cases', () => {
    beforeEach(() => {
      // Use default successful handlers
      server.resetHandlers();
    });

    it('generates plan successfully', async () => {
      // Test with default mock responses
    });
  });

  describe('Error Cases', () => {
    beforeEach(() => {
      // Override with error handlers for this suite
      server.use(
        http.post('/v1/workouts', () => {
          return HttpResponse.json(
            { status: 'error', message: 'AI service unavailable' },
            { status: 503 }
          );
        })
      );
    });

    it('handles AI service errors gracefully', async () => {
      // Test error handling
    });
  });

  describe('Loading States', () => {
    beforeEach(() => {
      // Override with delayed responses
      server.use(
        http.post('/v1/workouts', async () => {
          await delay(5000); // Long delay to test loading
          return HttpResponse.json({
            status: 'success',
            data: createTestWorkoutPlan()
          });
        })
      );
    });

    it('shows loading state during generation', async () => {
      // Test loading behavior
    });
  });
});
```

### Per-Test Handler Overrides

```typescript
// __tests__/components/auth/login-form.test.tsx
describe('LoginForm', () => {
  it('handles invalid credentials', async () => {
    // Override just for this test
    server.use(
      http.post('/v1/auth/login', () => {
        return HttpResponse.json(
          { status: 'error', message: 'Invalid credentials' },
          { status: 401 }
        );
      })
    );

    // Test implementation
  });

  it('handles server errors during login', async () => {
    server.use(
      http.post('/v1/auth/login', () => {
        return HttpResponse.error();
      })
    );

    // Test implementation
  });
});
```

## Advanced Mocking Patterns

### Data Persistence Simulation

```typescript
// __mocks__/msw/handlers/persistence.ts
import { http, HttpResponse } from 'msw';

// In-memory data store for simulating persistence
const mockDataStore = new Map<string, any>();

export const persistenceHandlers = [
  // Create data with persistence
  http.post('/v1/workouts', async ({ request }) => {
    const body = await request.json();
    const planId = `plan-${Date.now()}`;
    
    // Store in mock database
    mockDataStore.set(planId, {
      ...createTestWorkoutPlan(body),
      id: planId,
      createdAt: new Date().toISOString()
    });
    
    return HttpResponse.json({
      status: 'success',
      data: mockDataStore.get(planId)
    }, { status: 201 });
  }),

  // Retrieve persisted data
  http.get('/v1/workouts/:planId', ({ params }) => {
    const { planId } = params;
    const plan = mockDataStore.get(planId as string);
    
    if (!plan) {
      return HttpResponse.json(
        { status: 'error', message: 'Workout plan not found' },
        { status: 404 }
      );
    }
    
    return HttpResponse.json({
      status: 'success',
      data: plan
    });
  }),

  // Update persisted data
  http.put('/v1/workouts/:planId', async ({ params, request }) => {
    const { planId } = params;
    const body = await request.json();
    const existingPlan = mockDataStore.get(planId as string);
    
    if (!existingPlan) {
      return HttpResponse.json(
        { status: 'error', message: 'Workout plan not found' },
        { status: 404 }
      );
    }
    
    const updatedPlan = {
      ...existingPlan,
      ...body,
      updatedAt: new Date().toISOString()
    };
    
    mockDataStore.set(planId as string, updatedPlan);
    
    return HttpResponse.json({
      status: 'success',
      data: updatedPlan
    });
  }),

  // Delete persisted data
  http.delete('/v1/workouts/:planId', ({ params }) => {
    const { planId } = params;
    
    if (!mockDataStore.has(planId as string)) {
      return HttpResponse.json(
        { status: 'error', message: 'Workout plan not found' },
        { status: 404 }
      );
    }
    
    mockDataStore.delete(planId as string);
    
    return HttpResponse.json({
      status: 'success',
      message: 'Workout plan deleted successfully'
    });
  }),

  // Clear all mock data (for test cleanup)
  http.delete('/__test/clear-data', () => {
    mockDataStore.clear();
    return HttpResponse.json({ success: true });
  }),
];

// Helper to access mock data in tests
export const getMockData = (key: string) => mockDataStore.get(key);
export const setMockData = (key: string, value: any) => mockDataStore.set(key, value);
export const clearMockData = () => mockDataStore.clear();
```

### Context-Aware Response Generation

```typescript
// __mocks__/msw/handlers/context-aware.ts
import { http, HttpResponse } from 'msw';

// Track request context across calls
const requestContext = new Map<string, any>();

export const contextAwareHandlers = [
  // AI workout generation with learning
  http.post('/v1/workouts', async ({ request }) => {
    const body = await request.json() as WorkoutGenerationRequest;
    const authHeader = request.headers.get('Authorization');
    const userId = extractUserIdFromAuth(authHeader);
    
    // Get user's workout history
    const userContext = requestContext.get(userId) || { 
      previousPlans: [], 
      preferences: {},
      feedback: []
    };
    
    // Generate plan based on user history
    const plan = createTestWorkoutPlan({
      difficulty: body.fitnessLevel,
      exercises: adaptExercisesBasedOnHistory(body, userContext),
      reasoning: generateContextualReasoning(body, userContext)
    });
    
    // Update user context
    userContext.previousPlans.push(plan.id);
    userContext.preferences = { ...userContext.preferences, ...body };
    requestContext.set(userId, userContext);
    
    return HttpResponse.json({
      status: 'success',
      data: plan
    });
  }),

  // Plan feedback affects future generations
  http.post('/v1/workouts/:planId/feedback', async ({ params, request }) => {
    const { planId } = params;
    const body = await request.json() as { feedback: string; rating: number };
    const authHeader = request.headers.get('Authorization');
    const userId = extractUserIdFromAuth(authHeader);
    
    const userContext = requestContext.get(userId) || { feedback: [] };
    userContext.feedback.push({
      planId,
      feedback: body.feedback,
      rating: body.rating,
      timestamp: new Date().toISOString()
    });
    
    requestContext.set(userId, userContext);
    
    return HttpResponse.json({
      status: 'success',
      message: 'Feedback recorded'
    });
  }),
];

function adaptExercisesBasedOnHistory(request: any, context: any) {
  // Simulate AI learning from user feedback
  const previousFeedback = context.feedback || [];
  const lowRatedExercises = previousFeedback
    .filter((f: any) => f.rating < 3)
    .map((f: any) => f.planId);
  
  // Generate exercises avoiding patterns from low-rated plans
  return generateExercisesForGoals(request.goals, request.equipment)
    .filter(exercise => !lowRatedExercises.includes(exercise.name));
}

function generateContextualReasoning(request: any, context: any) {
  const previousCount = context.previousPlans?.length || 0;
  const avgFeedback = context.feedback?.length 
    ? context.feedback.reduce((sum: number, f: any) => sum + f.rating, 0) / context.feedback.length
    : 0;
  
  let reasoning = `Generated plan based on ${request.fitnessLevel} level`;
  
  if (previousCount > 0) {
    reasoning += ` (${previousCount} previous plans considered)`;
  }
  
  if (avgFeedback > 0) {
    reasoning += `. Incorporating feedback (avg rating: ${avgFeedback.toFixed(1)})`;
  }
  
  return reasoning;
}

function extractUserIdFromAuth(authHeader: string | null): string {
  // Extract user ID from JWT token (simplified)
  return authHeader?.includes('mock-jwt-token') ? 'user-123' : 'anonymous';
}
```

## Environment Configuration

### Development vs Test vs Production

```typescript
// __mocks__/msw/config.ts
interface MockConfig {
  enabled: boolean;
  delay: { min: number; max: number };
  errorRate: number;
  logRequests: boolean;
}

const mockConfigs: Record<string, MockConfig> = {
  development: {
    enabled: true,
    delay: { min: 500, max: 2000 },
    errorRate: 0.05, // 5% error rate
    logRequests: true
  },
  test: {
    enabled: true,
    delay: { min: 0, max: 100 },
    errorRate: 0,
    logRequests: false
  },
  production: {
    enabled: false,
    delay: { min: 0, max: 0 },
    errorRate: 0,
    logRequests: false
  }
};

export const getMockConfig = (): MockConfig => {
  const env = process.env.NODE_ENV || 'development';
  return mockConfigs[env];
};

// Environment-aware handler wrapper
export const withEnvironmentConfig = (handler: any) => {
  return async (request: any) => {
    const config = getMockConfig();
    
    if (!config.enabled) {
      // Pass through to real API in production
      return;
    }
    
    // Apply random delay
    if (config.delay.max > 0) {
      const delay = Math.random() * (config.delay.max - config.delay.min) + config.delay.min;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Simulate random errors
    if (Math.random() < config.errorRate) {
      return HttpResponse.json(
        { status: 'error', message: 'Random simulated error' },
        { status: 500 }
      );
    }
    
    // Log requests in development
    if (config.logRequests) {
      console.log(`[MSW] ${request.method} ${request.url}`);
    }
    
    return handler(request);
  };
};
```

### Feature Flag Integration

```typescript
// __mocks__/msw/handlers/feature-flags.ts
import { http, HttpResponse } from 'msw';

const featureFlags = new Map<string, boolean>([
  ['ai_reasoning_visualization', true],
  ['advanced_analytics', false],
  ['social_features', false],
  ['premium_workouts', true]
]);

export const featureFlagHandlers = [
  // Get feature flags
  http.get('/v1/features', () => {
    return HttpResponse.json({
      status: 'success',
      data: Object.fromEntries(featureFlags)
    });
  }),

  // Set feature flag (for testing)
  http.post('/__test/feature-flags', async ({ request }) => {
    const body = await request.json() as Record<string, boolean>;
    
    Object.entries(body).forEach(([flag, enabled]) => {
      featureFlags.set(flag, enabled);
    });
    
    return HttpResponse.json({ success: true });
  }),

  // Feature-gated workout generation
  http.post('/v1/workouts', async ({ request }) => {
    const body = await request.json();
    const plan = createTestWorkoutPlan(body);
    
    // Add AI reasoning only if feature is enabled
    if (featureFlags.get('ai_reasoning_visualization')) {
      plan.aiGenerationData = {
        steps: [
          { step: 'analyze_profile', completed: true },
          { step: 'research_exercises', completed: true },
          { step: 'generate_plan', completed: true }
        ],
        reasoning: 'Detailed AI reasoning available'
      };
    }
    
    return HttpResponse.json({
      status: 'success',
      data: plan
    });
  }),
];

// Helper functions for tests
export const enableFeature = (flag: string) => {
  fetch('/__test/feature-flags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [flag]: true })
  });
};

export const disableFeature = (flag: string) => {
  fetch('/__test/feature-flags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [flag]: false })
  });
};
```

## Debugging and Development Tools

### Request/Response Logging

```typescript
// __mocks__/msw/debugging.ts
import { http, HttpResponse } from 'msw';

// Request logging middleware
export const logRequests = (handler: any) => {
  return async (info: any) => {
    const { request } = info;
    const start = Date.now();
    
    console.group(`[MSW] ${request.method} ${request.url}`);
    
    // Log request details
    const body = await request.clone().text();
    if (body) {
      console.log('Request Body:', body);
    }
    
    const headers = Object.fromEntries(request.headers.entries());
    console.log('Request Headers:', headers);
    
    // Execute handler
    const response = await handler(info);
    
    const duration = Date.now() - start;
    console.log(`Response: ${response.status} (${duration}ms)`);
    console.groupEnd();
    
    return response;
  };
};

// Mock data inspector
export const inspectMockData = () => {
  return http.get('/__test/inspect', () => {
    return HttpResponse.json({
      mockDataStore: Object.fromEntries(mockDataStore),
      requestContext: Object.fromEntries(requestContext),
      featureFlags: Object.fromEntries(featureFlags),
      timestamp: new Date().toISOString()
    });
  });
};

// Handler performance profiling
const handlerPerformance = new Map<string, number[]>();

export const profileHandler = (name: string, handler: any) => {
  return async (info: any) => {
    const start = performance.now();
    const response = await handler(info);
    const duration = performance.now() - start;
    
    if (!handlerPerformance.has(name)) {
      handlerPerformance.set(name, []);
    }
    
    handlerPerformance.get(name)!.push(duration);
    
    // Log slow handlers
    if (duration > 100) {
      console.warn(`[MSW Performance] Slow handler: ${name} (${duration.toFixed(2)}ms)`);
    }
    
    return response;
  };
};

export const getHandlerPerformanceReport = () => {
  const report: Record<string, any> = {};
  
  handlerPerformance.forEach((times, name) => {
    const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
    const max = Math.max(...times);
    const min = Math.min(...times);
    
    report[name] = {
      calls: times.length,
      avgDuration: avg.toFixed(2),
      maxDuration: max.toFixed(2),
      minDuration: min.toFixed(2)
    };
  });
  
  return report;
};
```

## Best Practices

### DO's

- **Use realistic delays** to simulate actual API response times
- **Test different network conditions** with conditional error simulation
- **Maintain data consistency** across related API calls
- **Use type-safe request/response handling** with TypeScript
- **Implement proper authentication checks** in mock handlers
- **Test error scenarios** extensively with various error types
- **Keep mock data fresh** with factory functions
- **Use environment-specific configurations** for different testing needs

### DON'Ts

- **Don't hardcode mock responses** - use dynamic generation
- **Don't ignore authentication** in protected endpoints
- **Don't forget to clean up** mock state between tests
- **Don't mock everything** - focus on external dependencies
- **Don't make mocks too complex** - keep them focused and maintainable
- **Don't ignore real-world constraints** like rate limits and timeouts
- **Don't test implementation details** - focus on API contracts

### Mock Maintenance

```typescript
// __mocks__/msw/maintenance.ts

// Regular health checks for mock handlers
export const validateMockHandlers = () => {
  const issues: string[] = [];
  
  // Check for missing authentication
  authHandlers.forEach(handler => {
    if (!handler.toString().includes('Authorization')) {
      issues.push(`Auth handler missing Authorization check: ${handler.name}`);
    }
  });
  
  // Check for hardcoded values
  workoutHandlers.forEach(handler => {
    if (handler.toString().includes('hardcoded')) {
      issues.push(`Workout handler contains hardcoded values: ${handler.name}`);
    }
  });
  
  return {
    healthy: issues.length === 0,
    issues
  };
};

// Mock data cleanup utilities
export const cleanupMockData = () => {
  mockDataStore.clear();
  requestContext.clear();
  handlerPerformance.clear();
};

// Handler usage statistics
export const getMockUsageStats = () => {
  return {
    dataStoreSize: mockDataStore.size,
    contextSize: requestContext.size,
    handlerCalls: Array.from(handlerPerformance.values())
      .reduce((total, times) => total + times.length, 0)
  };
};
```

### Testing Checklist

For each API endpoint, ensure:

- [ ] Authentication is properly simulated
- [ ] Different response scenarios are covered (success, error, empty)
- [ ] Request validation is implemented
- [ ] Realistic delays are applied
- [ ] Error rates are configurable
- [ ] Data persistence works correctly
- [ ] Real-time features are mocked appropriately
- [ ] Performance is adequate
- [ ] Type safety is maintained
- [ ] Cleanup is implemented

## Integration with Component Tests

```typescript
// Example: Using MSW in component tests
// __tests__/pages/workout-generator.test.tsx

import { server } from '../../__mocks__/msw';
import { enableFeature, disableFeature } from '../../__mocks__/msw/handlers/feature-flags';

describe('Workout Generator Page', () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it('shows AI reasoning when feature is enabled', async () => {
    enableFeature('ai_reasoning_visualization');
    
    // Test implementation
  });

  it('hides AI reasoning when feature is disabled', async () => {
    disableFeature('ai_reasoning_visualization');
    
    // Test implementation
  });
});
```

## Cross-Document Integration Strategy

### Component Testing Integration

API mocking patterns established here directly support the component testing strategies outlined in `component-testing.md`:

- **Shared Handler Usage**: Component tests import and use the same MSW handlers for consistency
- **Fixture Data**: Test fixtures defined here provide realistic data for component rendering
- **Error State Testing**: Standardized error responses enable consistent error handling testing

### AI Response Mocking Coordination

API mocking works in conjunction with AI response mocking from `ai-response-mocking.md`:

- **Agent Endpoint Mocking**: Standard HTTP endpoints are mocked here, while AI streaming responses are handled by AI-specific mocking
- **Hybrid Scenarios**: Some workflows combine traditional API calls with AI interactions, requiring both mocking approaches
- **Data Flow**: API mocked data feeds into AI agents, requiring coordination between mock strategies

### E2E Workflow Support

The mock patterns established here support the end-to-end testing documented in `e2e-workflows.md`:

- **Development Environment**: E2E tests can run against mocked APIs during development
- **Integration Testing**: Full user journeys can be tested with controlled API responses
- **Performance Testing**: Mock response timing helps establish performance baselines

This comprehensive API mocking guide provides the foundation for reliable, maintainable, and realistic API simulation throughout the trAIner app development and testing process. 