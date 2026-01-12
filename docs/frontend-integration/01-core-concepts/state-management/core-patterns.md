# Core State Management Patterns

## Table of Contents
- [Overview](#overview)
- [State Management Architecture](#state-management-architecture)
- [State Organization Principles](#state-organization-principles)
- [Global vs Local State Decision Matrix](#global-vs-local-state-decision-matrix)
- [State Shape Design](#state-shape-design)
- [Update Patterns and Immutability](#update-patterns-and-immutability)
- [Derived State Calculations](#derived-state-calculations)
- [State Initialization Patterns](#state-initialization-patterns)
- [Error State Management](#error-state-management)
- [Loading State Patterns](#loading-state-patterns)
- [State Type Safety](#state-type-safety)

## Overview

The trAIner application uses a hybrid state management approach combining React Context API for global state with local component state for UI-specific concerns. This architecture prioritizes simplicity, type safety, and performance while avoiding over-engineering.

### Core Technologies
- **React Context API**: Global state management without external dependencies
- **useReducer**: Complex state logic with predictable updates
- **useState**: Simple local state management
- **Supabase**: Real-time data synchronization and persistence
- **TypeScript**: Type-safe state definitions and transformations

## State Management Architecture

### Context Providers Hierarchy
```typescript
// app/components/providers/index.tsx
<QueryClientProvider>
  <ThemeProvider>
    <ProfileProvider>       // User profile and preferences
      <WorkoutProvider>     // Workout plans and progress
        {children}
      </WorkoutProvider>
    </ProfileProvider>
  </ThemeProvider>
</QueryClientProvider>
```

### Core Contexts

#### 1. Authentication Context
```typescript
interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signUp: (email: string, password: string, userData?: Partial<User>) => Promise<void>
  updateProfile: (userData: Partial<User>) => Promise<void>
}
```

#### 2. Profile Context
```typescript
interface ProfileContextType {
  profile: UserProfile
  updateProfile: (data: Partial<UserProfile>) => Promise<void>
  isProfileComplete: boolean
  isLoading: boolean
  error: string | null
}
```

#### 3. Workout Context
```typescript
interface WorkoutContextType {
  // State
  workoutPlans: WorkoutPlanType[]
  selectedPlan: WorkoutPlanType | null
  userProgress: WorkoutProgressType[]
  userCheckIns: WorkoutCheckInType[]
  generationStatus: 'idle' | 'researching' | 'generating' | 'adjusting' | 'complete' | 'error'
  generationProgress: number
  
  // Actions
  fetchUserWorkoutPlans: (userId?: string | null) => Promise<void>
  generateWorkoutPlan: (goals: string[], preferences: Record<string, any>) => Promise<void>
  logWorkoutProgress: (progress: WorkoutProgressType) => Promise<string | null>
}
```

#### 4. React 19+ Pattern: Conditional Context Reading
With React 19's `use()` hook, contexts can be read conditionally:
```typescript
import { use } from 'react';

function WorkoutDisplay({ showDetails }: { showDetails: boolean }) {
  if (!showDetails) {
    return <div>Loading...</div>
  }
  
  // Can read context after early return with use()
  const { selectedPlan } = use(WorkoutContext)
  const theme = use(ThemeContext)
  
  return (
    <div className={`workout-display theme-${theme}`}>
      <h2>{selectedPlan?.name}</h2>
      {/* Render workout details */}
    </div>
  )
}
```

This pattern is particularly useful for:
- Components with conditional rendering logic
- Avoiding context subscription until needed
- Cleaner component organization without hook rules violations

## State Organization Principles

### 1. Single Source of Truth
Each piece of state has one authoritative source:
- **User Authentication**: Supabase Auth + Auth Context
- **User Profile**: Database + Profile Context
- **Workout Data**: Database + Workout Context
- **UI State**: Local component state

### 2. State Colocation
State is kept as close to where it's used as possible:
```typescript
// ❌ Bad: Global state for form inputs
const [formData, setFormData] = useGlobalState('profileForm')

// ✅ Good: Local state for form management
function ProfileForm() {
  const [formData, setFormData] = useState(initialValues)
  // Form state stays local until submission
}
```

### 3. State Normalization
Complex nested data is normalized for easier updates:
```typescript
// ❌ Bad: Deeply nested state
{
  workouts: [{
    id: "1",
    exercises: [{
      id: "e1",
      sets: [{ reps: 10, weight: 100 }]
    }]
  }]
}

// ✅ Good: Normalized state
{
  workouts: { "1": { id: "1", exerciseIds: ["e1"] } },
  exercises: { "e1": { id: "e1", setIds: ["s1"] } },
  sets: { "s1": { id: "s1", reps: 10, weight: 100 } }
}
```

## Global vs Local State Decision Matrix

| Criteria | Global State | Local State |
|----------|--------------|-------------|
| **Used by multiple components** | ✅ | ❌ |
| **Persists across navigation** | ✅ | ❌ |
| **Requires server sync** | ✅ | ❌ |
| **UI-only concern** | ❌ | ✅ |
| **Form temporary data** | ❌ | ✅ |
| **Animation/transition state** | ❌ | ✅ |

### Examples

**Global State**:
- User authentication status
- User profile data
- Workout plans and progress
- Application preferences

**Local State**:
- Form input values
- Modal open/closed state
- Loading spinners
- Validation errors
- Hover/focus states

## State Shape Design

### 1. Flat State Structure
```typescript
// ✅ Good: Flat structure for easy updates
interface AppState {
  auth: AuthState
  profile: ProfileState
  workouts: WorkoutState
  ui: UIState
}

// Each sub-state is also flat
interface WorkoutState {
  plans: Record<string, WorkoutPlan>
  currentPlanId: string | null
  isLoading: boolean
  error: string | null
}
```

### 2. Consistent State Properties
Every stateful entity follows a consistent pattern:
```typescript
interface StateEntity<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  lastUpdated: string | null
}

// Usage
interface ProfileState extends StateEntity<UserProfile> {
  isComplete: boolean
}
```

### 3. Discriminated Unions for Complex States
```typescript
type GenerationState = 
  | { status: 'idle' }
  | { status: 'researching'; progress: number }
  | { status: 'generating'; progress: number; currentAgent: string }
  | { status: 'complete'; result: WorkoutPlan }
  | { status: 'error'; error: string }
```

## Update Patterns and Immutability

### 1. Reducer Pattern for Complex Updates
```typescript
const workoutReducer = (state: WorkoutState, action: WorkoutAction): WorkoutState => {
  switch (action.type) {
    case 'SET_PLANS':
      return {
        ...state,
        plans: action.payload,
        isLoading: false
      }
    
    case 'ADD_PLAN':
      return {
        ...state,
        plans: [...state.plans, action.payload],
        isLoading: false
      }
    
    case 'UPDATE_PLAN':
      return {
        ...state,
        plans: state.plans.map(plan =>
          plan.id === action.payload.id ? action.payload : plan
        )
      }
    
    default:
      return state
  }
}
```

### 2. Immutable Update Helpers
```typescript
// Array updates
const addItem = (arr: T[], item: T) => [...arr, item]
const removeItem = (arr: T[], id: string) => arr.filter(item => item.id !== id)
const updateItem = (arr: T[], id: string, updates: Partial<T>) =>
  arr.map(item => item.id === id ? { ...item, ...updates } : item)

// Object updates
const updateNested = (obj: any, path: string[], value: any) => {
  const [head, ...rest] = path
  if (rest.length === 0) {
    return { ...obj, [head]: value }
  }
  return { ...obj, [head]: updateNested(obj[head], rest, value) }
}
```

### 3. Optimistic Updates
```typescript
const updateProfile = async (updates: Partial<UserProfile>) => {
  // Optimistically update UI
  setProfile(prev => ({ ...prev, ...updates }))
  
  try {
    const updated = await api.updateProfile(updates)
    setProfile(updated) // Set server response
  } catch (error) {
    setProfile(prev => ({ ...prev })) // Revert on error
    setError(error.message)
  }
}
```

## Derived State Calculations

### 1. Memoized Selectors
```typescript
const useWorkoutStats = () => {
  const { workoutPlans, userProgress } = useWorkout()
  
  return useMemo(() => {
    const completedCount = userProgress.filter(p => p.completed).length
    const totalSessions = workoutPlans.reduce((sum, plan) => sum + plan.sessions, 0)
    const completionRate = totalSessions > 0 ? completedCount / totalSessions : 0
    
    return {
      completedCount,
      totalSessions,
      completionRate,
      streak: calculateStreak(userProgress)
    }
  }, [workoutPlans, userProgress])
}
```

### 2. Computed Properties
```typescript
interface UserProfile {
  height: number // stored in cm
  weight: number // stored in kg
  unit_preference: 'metric' | 'imperial'
}

// Computed getters
const getDisplayHeight = (profile: UserProfile) => {
  if (profile.unit_preference === 'imperial') {
    const totalInches = profile.height / 2.54
    return {
      feet: Math.floor(totalInches / 12),
      inches: Math.round(totalInches % 12)
    }
  }
  return profile.height
}
```

### 3. Aggregated State
```typescript
const useAppReadyState = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { isProfileComplete, isLoading: profileLoading } = useProfile()
  const { workoutPlans, isLoading: workoutLoading } = useWorkout()
  
  return {
    isReady: isAuthenticated && isProfileComplete && workoutPlans.length > 0,
    isLoading: authLoading || profileLoading || workoutLoading
  }
}
```

## State Initialization Patterns

### 1. Lazy Initial State
```typescript
// ❌ Bad: Expensive computation on every render
const [data, setData] = useState(expensiveComputation())

// ✅ Good: Lazy initialization
const [data, setData] = useState(() => expensiveComputation())
```

### 2. Default State Values
```typescript
const defaultProfile: UserProfile = {
  name: "",
  age: 30,
  gender: "prefer-not-to-say",
  height: 178,
  weight: 75,
  experienceLevel: "beginner",
  fitnessGoals: [],
  medicalConditions: "",
  equipment: [],
  unit_preference: "metric"
}

// Use defaults as fallback
const profile = dbProfile || defaultProfile
```

### 3. Progressive Enhancement
```typescript
const [profile, setProfile] = useState<UserProfile>(defaultProfile)

useEffect(() => {
  // Try localStorage first (fast)
  const cached = localStorage.getItem('userProfile')
  if (cached) {
    setProfile(JSON.parse(cached))
  }
  
  // Then fetch from server (authoritative)
  fetchUserProfile().then(setProfile)
}, [])
```

## Error State Management

### 1. Error State Structure
```typescript
interface ErrorState {
  message: string
  code?: string
  field?: string
  timestamp: number
  retryable: boolean
}

// Component usage
const [error, setError] = useState<ErrorState | null>(null)
```

### 2. Error Boundaries
```typescript
class StateErrorBoundary extends React.Component {
  state = { hasError: false, error: null }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('State error:', error, info)
    // Log to error reporting service
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />
    }
    return this.props.children
  }
}
```

### 3. Error Recovery Patterns
```typescript
const useErrorRecovery = () => {
  const [retryCount, setRetryCount] = useState(0)
  
  const retry = useCallback(async (fn: () => Promise<void>) => {
    try {
      await fn()
      setRetryCount(0) // Reset on success
    } catch (error) {
      if (retryCount < 3) {
        setRetryCount(prev => prev + 1)
        setTimeout(() => retry(fn), Math.pow(2, retryCount) * 1000)
      } else {
        throw error // Give up after 3 attempts
      }
    }
  }, [retryCount])
  
  return { retry, retryCount }
}
```

## Loading State Patterns

### 1. Granular Loading States
```typescript
interface LoadingStates {
  profiles: boolean
  workouts: boolean
  analytics: boolean
  [key: string]: boolean
}

const useLoadingStates = () => {
  const [loading, setLoading] = useState<LoadingStates>({
    profiles: false,
    workouts: false,
    analytics: false
  })
  
  const setLoadingFor = (key: string, value: boolean) => {
    setLoading(prev => ({ ...prev, [key]: value }))
  }
  
  const isAnyLoading = Object.values(loading).some(Boolean)
  
  return { loading, setLoadingFor, isAnyLoading }
}
```

### 2. Loading State Transitions
```typescript
type LoadingState = 
  | { status: 'idle' }
  | { status: 'loading'; message?: string }
  | { status: 'success'; data: any }
  | { status: 'error'; error: Error }

const useAsyncState = <T,>(asyncFn: () => Promise<T>) => {
  const [state, setState] = useState<LoadingState>({ status: 'idle' })
  
  const execute = async () => {
    setState({ status: 'loading' })
    try {
      const data = await asyncFn()
      setState({ status: 'success', data })
    } catch (error) {
      setState({ status: 'error', error })
    }
  }
  
  return { state, execute }
}
```

## State Type Safety

### 1. Strict Type Definitions
```typescript
// Define exhaustive types for all state values
type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'
type Gender = 'male' | 'female' | 'non-binary' | 'prefer-not-to-say'
type UnitPreference = 'metric' | 'imperial'

// Use type guards for runtime validation
const isValidExperienceLevel = (level: string): level is ExperienceLevel => 
  ['beginner', 'intermediate', 'advanced'].includes(level)
```

### 2. State Transformation Types
```typescript
// Frontend to Backend transformation
type FrontendProfile = {
  userId: string
  unitPreference: UnitPreference
  experienceLevel: ExperienceLevel
}

type BackendProfile = {
  user_id: string
  unit_preference: UnitPreference
  experience_level: ExperienceLevel
}

// Type-safe transformer
const toBackendProfile = (profile: FrontendProfile): BackendProfile => ({
  user_id: profile.userId,
  unit_preference: profile.unitPreference,
  experience_level: profile.experienceLevel
})
```

### 3. Generic State Hooks
```typescript
// Type-safe state hook with persistence
function usePersistentState<T>(
  key: string,
  defaultValue: T,
  storage: Storage = localStorage
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const item = storage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  })
  
  const setPersistentState = useCallback((value: T | ((prev: T) => T)) => {
    setState(prev => {
      const nextState = value instanceof Function ? value(prev) : value
      storage.setItem(key, JSON.stringify(nextState))
      return nextState
    })
  }, [key, storage])
  
  return [state, setPersistentState]
}
```

## Best Practices Summary

1. **Keep state minimal**: Only store what you can't derive
2. **Normalize complex data**: Flatten nested structures
3. **Use TypeScript strictly**: Define all state shapes
4. **Handle loading/error states**: Every async operation needs both
5. **Optimize re-renders**: Use memoization for expensive computations
6. **Test state logic**: Unit test reducers and state transformations
7. **Document state shape**: Keep interfaces updated with actual usage 