# Component Testing Guide

## Overview

This guide provides comprehensive patterns and best practices for testing React components in the trAIner app. Our testing strategy emphasizes component isolation, realistic user interactions, and maintainable test patterns that scale with application complexity.

## Testing Philosophy

### Core Principles

**User-Centric Testing**: Test components as users interact with them, focusing on behavior over implementation details.

**Component Isolation**: Each component should be testable in isolation with controlled dependencies and predictable data.

**Realistic Interactions**: Use real user events and interactions rather than artificial triggers to ensure components work in real-world scenarios.

**Maintainable Patterns**: Establish consistent testing patterns that reduce maintenance overhead and improve test reliability.

## Testing Stack

### Primary Tools

- **Jest**: Test runner and assertion library
- **React Testing Library**: DOM testing utilities focused on user behavior
- **Mock Service Worker (MSW)**: API mocking for realistic network interactions
- **@testing-library/user-event**: Realistic user interaction simulation

### Configuration

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1'
  },
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ]
};
```

## Test Structure Patterns

### Standard Test Organization

```typescript
// __tests__/components/workout/exercise-card.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExerciseCard } from '@/components/workout/exercise-card';
import { createTestExercise } from '@/__tests__/fixtures/exercise-fixtures';
import { TestProviders } from '@/__tests__/utils/test-providers';

describe('ExerciseCard', () => {
  const defaultProps = {
    exercise: createTestExercise(),
    onUpdate: jest.fn(),
    onDelete: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays exercise information correctly', () => {
    render(
      <TestProviders>
        <ExerciseCard {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByText(defaultProps.exercise.name)).toBeInTheDocument();
    expect(screen.getByText(`${defaultProps.exercise.sets} sets`)).toBeInTheDocument();
  });
});
```

### Test Fixture Factories

Create consistent, reusable test data with factory patterns:

```typescript
// __tests__/fixtures/exercise-fixtures.ts
export const createTestExercise = (overrides = {}) => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Barbell Bench Press',
  sets: 3,
  reps: '8-12',
  weight: { value: 135, unit: 'lbs' },
  category: 'compound',
  primaryMuscles: ['chest', 'shoulders', 'triceps'],
  instructions: ['Lie on bench', 'Lower bar to chest', 'Press up'],
  ...overrides
});

export const createTestWorkoutPlan = (overrides = {}) => ({
  id: '123e4567-e89b-12d3-a456-426614174001',
  name: 'Upper Body Strength',
  exercises: [
    createTestExercise(),
    createTestExercise({ 
      name: 'Barbell Row', 
      primaryMuscles: ['back', 'biceps'] 
    })
  ],
  difficulty: 'intermediate',
  estimatedDuration: 45,
  ...overrides
});

export const createTestUser = (overrides = {}) => ({
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  profile: {
    age: 30,
    height: 175,
    weight: 70,
    goals: ['strength', 'muscle_gain'],
    fitnessLevel: 'intermediate'
  },
  ...overrides
});
```

## Component Isolation Strategies

### Provider Wrapper Pattern

Create a comprehensive test provider wrapper:

```typescript
// __tests__/utils/test-providers.tsx
import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/providers/auth-provider';
import { WorkoutProvider } from '@/providers/workout-provider';
import { ThemeProvider } from '@/components/layout/theme-provider';

interface TestProvidersProps {
  children: ReactNode;
  initialUser?: User | null;
  initialWorkoutData?: WorkoutData;
}

export const TestProviders = ({ 
  children, 
  initialUser,
  initialWorkoutData 
}: TestProvidersProps) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider initialUser={initialUser}>
          <WorkoutProvider initialData={initialWorkoutData}>
            {children}
          </WorkoutProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
```

### Dependency Injection for Testing

Use dependency injection to control external dependencies:

```typescript
// components/workout/workout-generator.tsx
interface WorkoutGeneratorProps {
  onGenerate?: (plan: WorkoutPlan) => void;
  aiService?: AIService; // Injected for testing
}

export const WorkoutGenerator = ({ 
  onGenerate,
  aiService = defaultAIService 
}: WorkoutGeneratorProps) => {
  // Component implementation using injected aiService
};

// __tests__/components/workout/workout-generator.test.tsx
const mockAIService = {
  generatePlan: jest.fn().mockResolvedValue(createTestWorkoutPlan())
};

it('generates workout plan when form submitted', async () => {
  const user = userEvent.setup();
  const onGenerate = jest.fn();

  render(
    <TestProviders>
      <WorkoutGenerator 
        onGenerate={onGenerate}
        aiService={mockAIService}
      />
    </TestProviders>
  );

  // Fill form and submit
  await user.type(screen.getByLabelText(/fitness level/i), 'intermediate');
  await user.click(screen.getByRole('button', { name: /generate plan/i }));

  await waitFor(() => {
    expect(mockAIService.generatePlan).toHaveBeenCalled();
    expect(onGenerate).toHaveBeenCalledWith(expect.any(Object));
  });
});
```

## AI Component Testing Patterns

### AI Reasoning Visualization Testing

```typescript
// __tests__/components/ai/ai-reasoning-visualization.test.tsx
import { AIReasoningVisualization } from '@/components/ai/ai-reasoning-visualization';

describe('AIReasoningVisualization', () => {
  const mockReasoningSteps = [
    {
      step: 'analyze_user_profile',
      title: 'Analyzing User Profile',
      description: 'Reviewing fitness level and goals',
      status: 'completed'
    },
    {
      step: 'research_exercises',
      title: 'Researching Exercises',
      description: 'Finding evidence-based exercises',
      status: 'in_progress'
    }
  ];

  it('displays reasoning steps in correct order', () => {
    render(
      <TestProviders>
        <AIReasoningVisualization steps={mockReasoningSteps} />
      </TestProviders>
    );

    const steps = screen.getAllByTestId(/reasoning-step/);
    expect(steps).toHaveLength(2);
    expect(steps[0]).toHaveTextContent('Analyzing User Profile');
    expect(steps[1]).toHaveTextContent('Researching Exercises');
  });

  it('shows progress indicators for active steps', () => {
    render(
      <TestProviders>
        <AIReasoningVisualization steps={mockReasoningSteps} />
      </TestProviders>
    );

    expect(screen.getByTestId('step-analyze_user_profile')).toHaveClass('completed');
    expect(screen.getByTestId('step-research_exercises')).toHaveClass('in_progress');
  });
});
```

### Form Component Testing with Validation

```typescript
// __tests__/components/profile/user-profile-form.test.tsx
describe('UserProfileForm', () => {
  it('validates required fields before submission', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();

    render(
      <TestProviders>
        <UserProfileForm onSubmit={onSubmit} />
      </TestProviders>
    );

    // Try to submit without filling required fields
    await user.click(screen.getByRole('button', { name: /save profile/i }));

    // Check validation messages appear
    expect(screen.getByText(/age is required/i)).toBeInTheDocument();
    expect(screen.getByText(/height is required/i)).toBeInTheDocument();
    expect(screen.getByText(/weight is required/i)).toBeInTheDocument();

    // Ensure form wasn't submitted
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('handles unit conversion correctly', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();

    render(
      <TestProviders>
        <UserProfileForm onSubmit={onSubmit} />
      </TestProviders>
    );

    // Switch to imperial units
    await user.click(screen.getByLabelText(/imperial/i));

    // Fill height in feet/inches
    await user.type(screen.getByLabelText(/feet/i), '5');
    await user.type(screen.getByLabelText(/inches/i), '10');
    await user.type(screen.getByLabelText(/weight/i), '150');
    await user.type(screen.getByLabelText(/age/i), '30');

    await user.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          height: expect.objectContaining({
            feet: 5,
            inches: 10
          }),
          weight: 150,
          unitPreference: 'imperial'
        })
      );
    });
  });
});
```

## Async Operations & Loading States

### Testing Loading States

```typescript
// __tests__/components/workout/workout-plans-list.test.tsx
describe('WorkoutPlansList', () => {
  it('shows loading state while fetching plans', async () => {
    // Create a delayed promise to test loading state
    const delayedResponse = new Promise(resolve => 
      setTimeout(() => resolve([createTestWorkoutPlan()]), 100)
    );

    const mockFetch = jest.fn().mockReturnValue(delayedResponse);

    render(
      <TestProviders>
        <WorkoutPlansList fetchPlans={mockFetch} />
      </TestProviders>
    );

    // Check loading state appears immediately
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText(/loading workout plans/i)).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Verify content loaded
    expect(screen.getByText('Upper Body Strength')).toBeInTheDocument();
  });

  it('handles empty state when no plans exist', async () => {
    const mockFetch = jest.fn().mockResolvedValue([]);

    render(
      <TestProviders>
        <WorkoutPlansList fetchPlans={mockFetch} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByText(/no workout plans found/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create your first plan/i })).toBeInTheDocument();
    });
  });
});
```

### Testing Error States

```typescript
// __tests__/components/workout/workout-generator.test.tsx
describe('WorkoutGenerator Error Handling', () => {
  it('displays error message when generation fails', async () => {
    const user = userEvent.setup();
    const mockAIService = {
      generatePlan: jest.fn().mockRejectedValue(new Error('AI service unavailable'))
    };

    render(
      <TestProviders>
        <WorkoutGenerator aiService={mockAIService} />
      </TestProviders>
    );

    // Fill and submit form
    await user.type(screen.getByLabelText(/fitness level/i), 'intermediate');
    await user.click(screen.getByRole('button', { name: /generate plan/i }));

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText(/failed to generate workout plan/i)).toBeInTheDocument();
      expect(screen.getByText(/ai service unavailable/i)).toBeInTheDocument();
    });

    // Verify retry button appears
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('allows retry after error', async () => {
    const user = userEvent.setup();
    const mockAIService = {
      generatePlan: jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(createTestWorkoutPlan())
    };

    render(
      <TestProviders>
        <WorkoutGenerator aiService={mockAIService} />
      </TestProviders>
    );

    // Initial attempt fails
    await user.type(screen.getByLabelText(/fitness level/i), 'intermediate');
    await user.click(screen.getByRole('button', { name: /generate plan/i }));

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    // Retry succeeds
    await user.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => {
      expect(screen.getByText('Upper Body Strength')).toBeInTheDocument();
      expect(screen.queryByText(/network error/i)).not.toBeInTheDocument();
    });
  });
});
```

## Authentication Component Testing

### Protected Component Testing

```typescript
// __tests__/components/auth/protected-route.test.tsx
describe('ProtectedRoute', () => {
  it('redirects to login when user not authenticated', () => {
    const mockPush = jest.fn();
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
      push: mockPush
    });

    render(
      <TestProviders initialUser={null}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </TestProviders>
    );

    expect(mockPush).toHaveBeenCalledWith('/login');
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders children when user is authenticated', () => {
    const testUser = createTestUser();

    render(
      <TestProviders initialUser={testUser}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </TestProviders>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
```

### Login Form Testing

```typescript
// __tests__/components/auth/login-form.test.tsx
describe('LoginForm', () => {
  it('submits form with correct credentials', async () => {
    const user = userEvent.setup();
    const mockLogin = jest.fn().mockResolvedValue({ success: true });

    render(
      <TestProviders>
        <LoginForm onLogin={mockLogin} />
      </TestProviders>
    );

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(mockLogin).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
  });

  it('shows validation errors for invalid inputs', async () => {
    const user = userEvent.setup();
    const mockLogin = jest.fn();

    render(
      <TestProviders>
        <LoginForm onLogin={mockLogin} />
      </TestProviders>
    );

    // Submit with invalid email
    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });
});
```

## Accessibility Testing

### Basic Accessibility Checks

```typescript
// __tests__/components/ui/button.test.tsx
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Button Accessibility', () => {
  it('meets accessibility standards', async () => {
    const { container } = render(
      <Button>Click me</Button>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has proper ARIA attributes when disabled', () => {
    render(
      <Button disabled>
        Disabled Button
      </Button>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toBeDisabled();
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();

    render(
      <Button onClick={onClick}>
        Keyboard Button
      </Button>
    );

    const button = screen.getByRole('button');
    
    // Focus with tab
    await user.tab();
    expect(button).toHaveFocus();

    // Activate with Enter
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalled();

    // Activate with Space
    onClick.mockClear();
    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalled();
  });
});
```

### Form Accessibility Testing

```typescript
// __tests__/components/ui/form-field.test.tsx
describe('FormField Accessibility', () => {
  it('associates labels with inputs correctly', () => {
    render(
      <FormField
        label="Email Address"
        id="email"
        type="email"
        required
      />
    );

    const input = screen.getByLabelText(/email address/i);
    const label = screen.getByText(/email address/i);

    expect(input).toHaveAttribute('id', 'email');
    expect(label).toHaveAttribute('for', 'email');
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('provides error messages with proper ARIA attributes', () => {
    render(
      <FormField
        label="Email Address"
        id="email"
        error="Please enter a valid email"
        type="email"
      />
    );

    const input = screen.getByLabelText(/email address/i);
    const errorMessage = screen.getByText(/please enter a valid email/i);

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('email-error'));
    expect(errorMessage).toHaveAttribute('id', expect.stringContaining('email-error'));
  });
});
```

## Performance Testing

### Component Rendering Performance

```typescript
// __tests__/performance/large-list.test.tsx
describe('Large List Performance', () => {
  it('renders large exercise list efficiently', async () => {
    const largeExerciseList = Array.from({ length: 1000 }, (_, i) => 
      createTestExercise({ id: `exercise-${i}`, name: `Exercise ${i}` })
    );

    const startTime = performance.now();

    render(
      <TestProviders>
        <ExerciseList exercises={largeExerciseList} />
      </TestProviders>
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render within reasonable time
    expect(renderTime).toBeLessThan(1000); // 1 second

    // Should virtualize large lists
    const visibleItems = screen.getAllByTestId(/exercise-item/);
    expect(visibleItems.length).toBeLessThan(50); // Only visible items rendered
  });
});
```

## Offline-First Testing

### Testing Network Connectivity States

```typescript
// __tests__/offline/workout-sync.test.tsx
describe('Offline Workout Sync', () => {
  beforeEach(() => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  it('queues workout data when offline', async () => {
    const user = userEvent.setup();
    
    render(
      <TestProviders>
        <WorkoutLogger />
      </TestProviders>
    );

    // Simulate going offline
    Object.defineProperty(navigator, 'onLine', { value: false });
    fireEvent.event(window, new Event('offline'));

    // Log workout data
    await user.type(screen.getByLabelText(/weight/i), '150');
    await user.type(screen.getByLabelText(/reps/i), '10');
    await user.click(screen.getByRole('button', { name: /save/i }));

    // Should show offline indicator and queue data
    expect(screen.getByText(/offline mode/i)).toBeInTheDocument();
    expect(localStorage.getItem('queuedWorkouts')).toBeTruthy();
  });

  it('syncs queued data when coming back online', async () => {
    // Setup queued data
    localStorage.setItem('queuedWorkouts', JSON.stringify([
      { exercise: 'Squats', weight: 150, reps: 10 }
    ]));

    render(
      <TestProviders>
        <WorkoutLogger />
      </TestProviders>
    );

    // Simulate coming online
    Object.defineProperty(navigator, 'onLine', { value: true });
    fireEvent.event(window, new Event('online'));

    // Should sync data and clear queue
    await waitFor(() => {
      expect(screen.getByText(/synced/i)).toBeInTheDocument();
    });
    
    expect(localStorage.getItem('queuedWorkouts')).toBe('[]');
  });
});
```

### Service Worker Integration Testing

```typescript
// __tests__/offline/service-worker.test.tsx
describe('Service Worker Integration', () => {
  it('caches essential app data', async () => {
    // Mock service worker
    const mockServiceWorker = {
      addEventListener: jest.fn(),
      postMessage: jest.fn()
    };
    
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        ready: Promise.resolve(mockServiceWorker),
        register: jest.fn()
      }
    });

    render(
      <TestProviders>
        <OfflineCapableComponent />
      </TestProviders>
    );

    // Verify component handles service worker integration
    await waitFor(() => {
      expect(navigator.serviceWorker.register).toHaveBeenCalled();
    });
  });
});
```

## Progressive Enhancement Testing

### Feature Detection and Fallbacks

```typescript
// __tests__/progressive/feature-detection.test.tsx
describe('Progressive Enhancement', () => {
  it('provides fallback when advanced features unavailable', () => {
    // Mock missing APIs
    const originalIntersectionObserver = window.IntersectionObserver;
    delete window.IntersectionObserver;

    render(
      <TestProviders>
        <LazyLoadedExerciseList />
      </TestProviders>
    );

    // Should render all items without lazy loading
    const exerciseItems = screen.getAllByTestId(/exercise-item/);
    expect(exerciseItems.length).toBeGreaterThan(10);
    
    // Should show fallback loading behavior
    expect(screen.queryByTestId('intersection-observer')).not.toBeInTheDocument();

    // Restore
    window.IntersectionObserver = originalIntersectionObserver;
  });

  it('enhances experience when modern features available', () => {
    render(
      <TestProviders>
        <LazyLoadedExerciseList />
      </TestProviders>
    );

    // Should use advanced features when available
    expect(screen.getByTestId('intersection-observer')).toBeInTheDocument();
  });
});
```

### Graceful Degradation Testing

```typescript
// __tests__/progressive/graceful-degradation.test.tsx
describe('Graceful Degradation', () => {
  it('works without JavaScript enhancements', () => {
    // Test basic functionality without advanced interactions
    render(
      <TestProviders>
        <BasicWorkoutForm />
      </TestProviders>
    );

    // Form should work with basic HTML validation
    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton.closest('form')).toHaveAttribute('noValidate', false);
  });
});
```

## Mobile-Specific Testing

### Touch Interaction Testing

```typescript
// __tests__/mobile/touch-interactions.test.tsx
describe('Mobile Touch Interactions', () => {
  beforeEach(() => {
    // Mock touch events
    Object.defineProperty(window, 'ontouchstart', { value: {} });
  });

  it('handles swipe gestures on exercise cards', async () => {
    const user = userEvent.setup();
    
    render(
      <TestProviders>
        <SwipeableExerciseCard />
      </TestProviders>
    );

    const card = screen.getByTestId('exercise-card');
    
    // Simulate swipe left gesture
    fireEvent.touchStart(card, {
      touches: [{ clientX: 100, clientY: 100 }]
    });
    fireEvent.touchMove(card, {
      touches: [{ clientX: 50, clientY: 100 }]
    });
    fireEvent.touchEnd(card);

    // Should reveal action buttons
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit/i })).toBeVisible();
    });
  });

  it('has appropriate touch target sizes', () => {
    render(
      <TestProviders>
        <MobileWorkoutControls />
      </TestProviders>
    );

    const buttons = screen.getAllByRole('button');
    
    buttons.forEach(button => {
      const styles = window.getComputedStyle(button);
      const minTouchTarget = 44; // iOS/Android recommendation
      
      expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(minTouchTarget);
      expect(parseInt(styles.minWidth)).toBeGreaterThanOrEqual(minTouchTarget);
    });
  });
});
```

### Responsive Behavior Testing

```typescript
// __tests__/mobile/responsive.test.tsx
describe('Responsive Component Behavior', () => {
  it('adapts layout for mobile viewport', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375
    });
    
    render(
      <TestProviders>
        <ResponsiveWorkoutGrid />
      </TestProviders>
    );

    // Should use mobile layout
    const grid = screen.getByTestId('workout-grid');
    expect(grid).toHaveClass('mobile-layout');
    
    // Should stack items vertically
    const items = screen.getAllByTestId(/workout-item/);
    items.forEach(item => {
      expect(item).toHaveClass('stacked');
    });
  });

  it('optimizes for tablet viewport', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768
    });
    
    render(
      <TestProviders>
        <ResponsiveWorkoutGrid />
      </TestProviders>
    );

    // Should use tablet layout with 2 columns
    const grid = screen.getByTestId('workout-grid');
    expect(grid).toHaveClass('tablet-layout');
  });
});
```

## Integration with Other Testing Approaches

### Cross-Document Testing Strategy

Component testing integrates with other testing approaches documented in this guide:

**API Mocking Integration**: Component tests rely heavily on the API mocking patterns described in `api-mocking.md`. Use the established MSW handlers to ensure consistent API responses across component and integration tests.

```typescript
// Example: Using shared MSW handlers in component tests
import { server } from '../__mocks__/msw';
import { workoutGenerationHandlers } from '../__mocks__/msw/handlers/workout-generation';

beforeEach(() => {
  server.use(...workoutGenerationHandlers);
});
```

**AI Response Mocking**: Components that display AI-generated content should use the AI response mocking patterns from `ai-response-mocking.md` to test various reasoning states and streaming behaviors.

**E2E Workflow Validation**: Critical component interactions tested here should align with the complete user workflows documented in `e2e-workflows.md`. Components tested in isolation should work seamlessly in full user journeys.

## Best Practices Summary

### DO's

- **Test user behavior**, not implementation details
- **Use real user events** with `@testing-library/user-event`
- **Create reusable test fixtures** with factory patterns
- **Test accessibility** with automated tools and manual checks
- **Test error states** and loading conditions
- **Use proper cleanup** in `beforeEach`/`afterEach`
- **Mock external dependencies** while keeping component logic real
- **Test responsive behavior** across different screen sizes

### DON'Ts

- **Don't test implementation details** like state variables or component methods
- **Don't use shallow rendering** - use full rendering with proper providers
- **Don't mock React Testing Library queries** - they should work with real DOM
- **Don't ignore accessibility** - include it in your test strategy
- **Don't test everything** - focus on critical user paths and edge cases
- **Don't forget cleanup** - always clean up subscriptions, timers, and mocks
- **Don't hardcode test data** - use factories for consistency and maintainability

### Testing Checklist

For each component test suite, ensure:

- [ ] Component renders without errors
- [ ] User interactions work correctly
- [ ] Form validation functions properly
- [ ] Loading states are handled
- [ ] Error states are displayed appropriately
- [ ] Accessibility requirements are met
- [ ] Props are handled correctly
- [ ] Edge cases are covered
- [ ] Cleanup is properly implemented
- [ ] Performance is adequate for complex components
- [ ] Offline functionality is tested (where applicable)
- [ ] Progressive enhancement fallbacks work
- [ ] Mobile touch interactions are validated
- [ ] Responsive behavior across viewports is confirmed
- [ ] Cross-document integration patterns are followed 