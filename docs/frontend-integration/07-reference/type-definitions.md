# TypeScript Definitions Reference

> **Purpose**: Comprehensive TypeScript reference using hybrid auto-generation + manual curation approach. This document provides complete type coverage for the trAIner application with usage examples and best practices.

## Table of Contents

1. [Database Types](#database-types)
2. [Component Prop Interfaces](#component-prop-interfaces)
3. [API & State Types](#api-state-types)
4. [Utility & Helper Types](#utility-helper-types)
5. [Usage Examples & Patterns](#usage-examples-patterns)

---

## 1. Database Types

### Supabase-Generated Types Overview

Our database types are auto-generated from the Supabase schema and located in `types/database.types.ts`. These provide type-safe access to all database operations.

```typescript
// Base JSON type for Supabase
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Main database interface
export interface Database {
  public: {
    Tables: {
      // All table definitions...
    }
    Views: {
      // Database views...
    }
    Functions: {
      // Database functions...
    }
  }
}
```

### Core Table Types

#### User Profiles
```typescript
interface UserProfile {
  Row: {
    id: string;
    user_id: string;
    height: number;
    weight: number;
    age: number;
    gender: string | null;
    fitness_goals: string[];
    equipment_access: string[];
    experience_level: string;
    unit_preference: 'metric' | 'imperial';
    medical_conditions: string[];
    created_at: string;
    updated_at: string;
  };
  Insert: {
    user_id: string;
    height: number;
    weight: number;
    age: number;
    gender?: string | null;
    fitness_goals?: string[];
    equipment_access?: string[];
    experience_level?: string;
    unit_preference?: 'metric' | 'imperial';
    medical_conditions?: string[];
  };
  Update: {
    height?: number;
    weight?: number;
    age?: number;
    gender?: string | null;
    fitness_goals?: string[];
    equipment_access?: string[];
    experience_level?: string;
    unit_preference?: 'metric' | 'imperial';
    medical_conditions?: string[];
  };
}
```

#### Workout Plans
```typescript
interface WorkoutPlans {
  Row: {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    plan_data: Json; // Structured workout plan data
    difficulty_level: 'beginner' | 'intermediate' | 'advanced';
    estimated_duration: number;
    ai_generated: boolean;
    status: 'draft' | 'active' | 'archived';
    created_at: string;
    updated_at: string;
  };
  Insert: {
    user_id: string;
    name: string;
    description?: string | null;
    plan_data: Json;
    difficulty_level: 'beginner' | 'intermediate' | 'advanced';
    estimated_duration: number;
    ai_generated?: boolean;
    status?: 'draft' | 'active' | 'archived';
  };
  Update: {
    name?: string;
    description?: string | null;
    plan_data?: Json;
    difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
    estimated_duration?: number;
    status?: 'draft' | 'active' | 'archived';
  };
}
```

#### Workout Logs
```typescript
interface WorkoutLogs {
  Row: {
    id: string;
    user_id: string;
    plan_id: string | null;
    date: string;
    completed: boolean;
    overall_difficulty: number; // 1-10 scale
    energy_level: number; // 1-10 scale
    satisfaction: number; // 1-10 scale
    feedback: string | null;
    exercises_completed: Json; // Array of completed exercises
    created_at: string;
    updated_at: string;
  };
  Insert: {
    user_id: string;
    plan_id?: string | null;
    date: string;
    completed: boolean;
    overall_difficulty: number;
    energy_level: number;
    satisfaction: number;
    feedback?: string | null;
    exercises_completed: Json;
  };
  Update: {
    completed?: boolean;
    overall_difficulty?: number;
    energy_level?: number;
    satisfaction?: number;
    feedback?: string | null;
    exercises_completed?: Json;
  };
}
```

#### Analytics Events
```typescript
interface AnalyticsEvents {
  Row: {
    id: string;
    user_id: string | null;
    event_type: string;
    timestamp: string;
    metadata: Json | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    user_id?: string | null;
    event_type: string;
    timestamp?: string;
    metadata?: Json | null;
  };
  Update: {
    event_type?: string;
    timestamp?: string;
    metadata?: Json | null;
  };
}
```

### Frontend-Friendly Type Mappings

Transform database types into frontend-friendly interfaces:

```typescript
// Frontend profile type (camelCase, computed fields)
export interface UserProfileFrontend {
  id: string;
  userId: string;
  height: number;
  weight: number;
  age: number;
  gender?: string;
  goals: string[]; // Mapped from fitness_goals
  equipment: string[]; // Mapped from equipment_access
  experienceLevel: string; // Mapped from experience_level
  unitPreference: 'metric' | 'imperial'; // Mapped from unit_preference
  medicalConditions: string[]; // Mapped from medical_conditions
  createdAt: string;
  updatedAt: string;
  
  // Computed fields
  bmi?: number;
  isComplete: boolean;
  profileCompletion: number; // 0-100 percentage
}

// Frontend workout plan type
export interface WorkoutPlanFrontend {
  id: string;
  userId: string;
  name: string;
  description?: string;
  exercises: Exercise[]; // Parsed from plan_data
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number;
  aiGenerated: boolean;
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
  
  // Computed fields
  exerciseCount: number;
  targetMuscles: string[];
  equipmentRequired: string[];
  lastUsed?: string;
  usageCount: number;
}
```

### API Response Type Alignment

Ensure frontend types align with API responses:

```typescript
// Generic API response wrapper
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  errors?: ValidationError[];
}

// Paginated response wrapper
export interface PaginatedResponse<T> {
  status: 'success';
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// API response types
export type ProfileResponse = ApiResponse<UserProfileFrontend>;
export type WorkoutPlanResponse = ApiResponse<WorkoutPlanFrontend>;
export type WorkoutPlansResponse = PaginatedResponse<WorkoutPlanFrontend>;
export type WorkoutLogResponse = ApiResponse<WorkoutLogFrontend>;
```

### Type Conversion Utilities

Helper functions for converting between database and frontend types:

```typescript
// Database to frontend conversion
export const convertProfileToFrontend = (
  dbProfile: Database['public']['Tables']['user_profiles']['Row']
): UserProfileFrontend => ({
  id: dbProfile.id,
  userId: dbProfile.user_id,
  height: dbProfile.height,
  weight: dbProfile.weight,
  age: dbProfile.age,
  gender: dbProfile.gender,
  goals: dbProfile.fitness_goals || [],
  equipment: dbProfile.equipment_access || [],
  experienceLevel: dbProfile.experience_level,
  unitPreference: dbProfile.unit_preference,
  medicalConditions: dbProfile.medical_conditions || [],
  createdAt: dbProfile.created_at,
  updatedAt: dbProfile.updated_at,
  bmi: calculateBMI(dbProfile.height, dbProfile.weight),
  isComplete: isProfileComplete(dbProfile),
  profileCompletion: calculateProfileCompletion(dbProfile)
});

// Frontend to database conversion
export const convertProfileToDatabase = (
  frontendProfile: Partial<UserProfileFrontend>
): Database['public']['Tables']['user_profiles']['Update'] => ({
  height: frontendProfile.height,
  weight: frontendProfile.weight,
  age: frontendProfile.age,
  gender: frontendProfile.gender,
  fitness_goals: frontendProfile.goals,
  equipment_access: frontendProfile.equipment,
  experience_level: frontendProfile.experienceLevel,
  unit_preference: frontendProfile.unitPreference,
  medical_conditions: frontendProfile.medicalConditions
});
```

---

## 2. Component Prop Interfaces

### UI Component Props (55+ Components)

#### Button Components
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

interface LoadingButtonProps extends ButtonProps {
  loading: boolean;
  loadingText?: string;
  loadingIcon?: React.ReactNode;
}
```

#### Form Components
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'error' | 'success';
  helperText?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  fullWidth?: boolean;
}

interface SelectProps {
  options: SelectOption[];
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
}

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}
```

#### Card Components
```typescript
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  interactive?: boolean;
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  avatar?: React.ReactNode;
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}

interface CardActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  justify?: 'start' | 'center' | 'end' | 'between';
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}
```

### Workout & Exercise Types

#### Exercise Components
```typescript
interface ExerciseCardProps {
  name: string;
  sets: number;
  repsMin: number;
  repsMax?: number;
  imageUrl?: string;
  notes?: string;
  technique?: string;
  restTime?: string;
  targetMuscles?: string[];
  equipment?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  videoUrl?: string;
  alternatives?: string[];
  onEdit?: (exercise: Exercise) => void;
  onRemove?: (exerciseId: string) => void;
  readonly?: boolean;
}

interface ExerciseFormProps {
  exercise?: Exercise;
  onSubmit: (exercise: Exercise) => void;
  onCancel: () => void;
  availableEquipment: string[];
  muscleGroups: string[];
  loading?: boolean;
}

interface ExerciseListProps {
  exercises: Exercise[];
  onExerciseSelect?: (exercise: Exercise) => void;
  onExerciseEdit?: (exercise: Exercise) => void;
  onExerciseRemove?: (exerciseId: string) => void;
  selectable?: boolean;
  editable?: boolean;
  groupBy?: 'muscle' | 'equipment' | 'difficulty';
  filter?: ExerciseFilter;
  sort?: ExerciseSort;
}

interface ExerciseFilter {
  muscleGroups?: string[];
  equipment?: string[];
  difficulty?: ('beginner' | 'intermediate' | 'advanced')[];
  searchTerm?: string;
}

interface ExerciseSort {
  field: 'name' | 'difficulty' | 'equipment' | 'muscle';
  direction: 'asc' | 'desc';
}
```

#### Workout Plan Components
```typescript
interface WorkoutPlanDisplayProps {
  plan: WorkoutPlanFrontend;
  onEdit?: (plan: WorkoutPlanFrontend) => void;
  onStart?: (plan: WorkoutPlanFrontend) => void;
  onDuplicate?: (plan: WorkoutPlanFrontend) => void;
  onDelete?: (planId: string) => void;
  onExerciseEdit?: (exercise: Exercise) => void;
  readonly?: boolean;
  compact?: boolean;
}

interface WorkoutPlanGeneratorProps {
  onPlanGenerated: (plan: WorkoutPlanFrontend) => void;
  defaultParams?: Partial<WorkoutGenerationRequest>;
  loading?: boolean;
  disabled?: boolean;
}

interface WorkoutPlanListProps {
  plans: WorkoutPlanFrontend[];
  onPlanSelect: (plan: WorkoutPlanFrontend) => void;
  onPlanEdit?: (plan: WorkoutPlanFrontend) => void;
  onPlanDelete?: (planId: string) => void;
  filter?: WorkoutPlanFilter;
  sort?: WorkoutPlanSort;
  view?: 'grid' | 'list';
  selectable?: boolean;
}

interface WorkoutPlanFilter {
  status?: ('draft' | 'active' | 'archived')[];
  difficulty?: ('beginner' | 'intermediate' | 'advanced')[];
  aiGenerated?: boolean;
  duration?: { min?: number; max?: number };
  searchTerm?: string;
}

interface WorkoutPlanSort {
  field: 'name' | 'createdAt' | 'lastUsed' | 'duration' | 'difficulty';
  direction: 'asc' | 'desc';
}
```

### Progress & Analytics Types

#### Progress Tracking Components
```typescript
interface ProgressChartProps {
  data: ProgressDataPoint[];
  type: 'line' | 'bar' | 'area';
  metric: 'weight' | 'bodyFat' | 'strength' | 'consistency';
  timeframe: 'week' | 'month' | 'quarter' | 'year';
  showGoals?: boolean;
  interactive?: boolean;
  height?: number;
}

interface ProgressDataPoint {
  date: string;
  value: number;
  goal?: number;
  note?: string;
}

interface CheckInFormProps {
  onSubmit: (checkIn: CheckInData) => void;
  onCancel?: () => void;
  loading?: boolean;
  defaultValues?: Partial<CheckInData>;
  requiredFields?: (keyof CheckInData)[];
}

interface CheckInData {
  workoutCompleted: boolean;
  difficulty: number; // 1-10
  satisfaction: number; // 1-10
  energyLevel: number; // 1-10
  bodyMetrics: {
    weight?: number;
    bodyFat?: number;
    measurements?: BodyMeasurements;
  };
  notes?: string;
  mood?: 'poor' | 'fair' | 'good' | 'great' | 'excellent';
  sleep?: {
    hours: number;
    quality: number; // 1-10
  };
}

interface BodyMeasurements {
  chest?: number;
  waist?: number;
  hips?: number;
  bicep?: number;
  thigh?: number;
  neck?: number;
}
```

#### Analytics Components
```typescript
interface AnalyticsOverviewProps {
  data: AnalyticsOverview;
  timeframe: 'week' | 'month' | 'quarter' | 'year';
  onTimeframeChange: (timeframe: string) => void;
  loading?: boolean;
  error?: string;
}

interface AnalyticsOverview {
  workoutConsistency: number; // 0-100 percentage
  strengthProgress: number; // Percentage change
  weeklyGoals: GoalProgress[];
  averageDifficulty: number;
  averageSatisfaction: number;
  totalWorkouts: number;
  activeStreak: number;
  longestStreak: number;
}

interface GoalProgress {
  id: string;
  name: string;
  target: number;
  current: number;
  unit: string;
  deadline?: string;
  status: 'on-track' | 'behind' | 'ahead' | 'completed';
}

interface AIInsightsProps {
  insights: AIInsight[];
  onInsightAction?: (insight: AIInsight, action: string) => void;
  loading?: boolean;
  refreshable?: boolean;
  onRefresh?: () => void;
}

interface AIInsight {
  id: string;
  type: 'recommendation' | 'observation' | 'warning' | 'achievement';
  title: string;
  description: string;
  confidence: number; // 0-1
  impact: 'low' | 'medium' | 'high';
  category: 'performance' | 'consistency' | 'form' | 'nutrition' | 'recovery';
  actionable: boolean;
  suggestedActions?: string[];
  data?: Record<string, any>;
  createdAt: string;
}
```

### AI Reasoning Visualization Types

#### AI Agent Components
```typescript
interface AIReasoningVisualizationProps {
  reasoning: AIReasoningStep[];
  onStepClick?: (step: AIReasoningStep) => void;
  expandable?: boolean;
  showConfidence?: boolean;
  showTimeline?: boolean;
}

interface AIReasoningStep {
  id: string;
  type: 'thought' | 'action' | 'observation' | 'reflection';
  content: string;
  confidence?: number; // 0-1
  timestamp: string;
  duration?: number; // milliseconds
  metadata?: Record<string, any>;
  references?: string[]; // Citations or sources
}

interface AgentStatusProps {
  agent: AgentInfo;
  status: AgentStatus;
  progress?: AgentProgress;
  onCancel?: () => void;
  onRetry?: () => void;
}

interface AgentInfo {
  id: string;
  name: string;
  type: 'research' | 'generation' | 'adjustment' | 'nutrition';
  description: string;
  capabilities: string[];
}

interface AgentStatus {
  state: 'idle' | 'working' | 'completed' | 'error' | 'cancelled';
  message?: string;
  startedAt?: string;
  completedAt?: string;
  error?: {
    message: string;
    code: string;
    recoverable: boolean;
  };
}

interface AgentProgress {
  current: number;
  total: number;
  stage: string;
  substage?: string;
  estimatedTimeRemaining?: number; // seconds
}
```

---

## 3. API & State Types

### API Request/Response Types

#### Authentication API Types
```typescript
interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface LoginResponse {
  userId: string;
  jwtToken: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    profileComplete: boolean;
  };
}

interface SignupRequest {
  name: string;
  email: string;
  password: string;
  acceptTerms: boolean;
  marketingConsent?: boolean;
}

interface SignupResponse {
  userId: string;
  jwtToken: string;
  requiresEmailVerification: boolean;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

interface RefreshTokenRequest {
  refreshToken: string;
}

interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
```

#### Workout API Types
```typescript
interface WorkoutGenerationRequest {
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  goals: string[];
  equipment: string[];
  restrictions: string[];
  exerciseTypes: string[];
  workoutFrequency: string;
  workoutDuration?: number; // minutes
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
  unitPreference?: 'metric' | 'imperial';
}

interface WorkoutGenerationResponse {
  planId: string;
  planName: string;
  planDescription?: string;
  exercises: Exercise[];
  weeklySchedule: {
    daysPerWeek: number;
    restDays: string[];
    workoutDays: string[];
  };
  researchInsights: string[];
  reasoning: string;
  aiGenerationData: {
    generationId: string;
    researchAgent: {
      sessionId: string;
      processingTime: number;
      sourcesConsulted: number;
    };
    workoutAgent: {
      sessionId: string;
      modelUsed: string;
      tokensUsed: number;
      processingTime: number;
    };
  };
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number;
  equipmentRequired: string[];
  tags: string[];
}

interface WorkoutAdjustmentRequest {
  feedback: string;
  adjustmentType?: 'difficulty' | 'focus' | 'equipment' | 'schedule' | 'medical';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  preserveStructure?: boolean;
  specificExercises?: {
    exerciseName: string;
    action: 'modify' | 'remove' | 'replace';
    newValue?: string;
  }[];
}

interface WorkoutAdjustmentResponse {
  adjustedPlan: WorkoutPlanFrontend;
  appliedChanges: PlanChange[];
  skippedChanges: PlanChange[];
  feedbackSummary: string;
  adjustmentReasoning: string;
  conflictsResolved: {
    conflict: string;
    resolution: string;
  }[];
  safetyWarnings: string[];
}

interface PlanChange {
  changeId: string;
  type: 'exercise_added' | 'exercise_removed' | 'exercise_modified' | 'sets_changed' | 'reps_changed' | 'weight_adjusted' | 'rest_modified' | 'order_changed';
  description: string;
  exerciseAffected?: string;
  oldValue?: string;
  newValue?: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
  category: 'safety' | 'preference' | 'optimization' | 'equipment' | 'medical';
}
```

#### Analytics API Types
```typescript
interface AnalyticsRequest {
  timeframe: 'week' | 'month' | 'quarter' | 'year';
  metrics?: ('consistency' | 'strength' | 'satisfaction' | 'goals')[];
  includeInsights?: boolean;
  includeComparisons?: boolean;
}

interface AnalyticsResponse {
  overview: AnalyticsOverview;
  insights?: AIInsight[];
  patterns?: AnalyticsPattern[];
  comparisons?: {
    previousPeriod: AnalyticsOverview;
    percentageChange: Record<string, number>;
  };
}

interface AnalyticsPattern {
  id: string;
  type: 'trend' | 'cycle' | 'anomaly' | 'correlation';
  description: string;
  confidence: number;
  significance: 'low' | 'medium' | 'high';
  timeframe: string;
  data: Record<string, any>;
}
```

### Context State Types (Auth, Workout, Profile)

#### Authentication Context
```typescript
interface AuthContextType {
  // State
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  login: (credentials: LoginRequest) => Promise<LoginResponse>;
  signup: (userData: SignupRequest) => Promise<SignupResponse>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  
  // Utilities
  getToken: () => string | null;
  hasPermission: (permission: string) => boolean;
  checkSession: () => Promise<boolean>;
}

interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  profileComplete: boolean;
  createdAt: string;
  lastLogin?: string;
  permissions: string[];
  subscription?: {
    plan: 'free' | 'premium' | 'pro';
    status: 'active' | 'cancelled' | 'expired';
    expiresAt?: string;
  };
}
```

#### Workout Context
```typescript
interface WorkoutContextType {
  // State
  plans: WorkoutPlanFrontend[];
  activePlan: WorkoutPlanFrontend | null;
  currentWorkout: ActiveWorkout | null;
  workoutHistory: WorkoutLogFrontend[];
  isLoading: boolean;
  
  // Plan Management
  generatePlan: (request: WorkoutGenerationRequest) => Promise<WorkoutPlanFrontend>;
  adjustPlan: (planId: string, request: WorkoutAdjustmentRequest) => Promise<WorkoutAdjustmentResponse>;
  savePlan: (plan: WorkoutPlanFrontend) => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
  setActivePlan: (plan: WorkoutPlanFrontend) => void;
  
  // Workout Execution
  startWorkout: (plan: WorkoutPlanFrontend) => void;
  completeExercise: (exerciseId: string, sets: CompletedSet[]) => void;
  completeWorkout: (workoutData: WorkoutCompletionData) => Promise<void>;
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  cancelWorkout: () => void;
  
  // History & Logs
  logWorkout: (workoutLog: WorkoutLogData) => Promise<void>;
  getWorkoutHistory: (filters?: WorkoutLogFilter) => Promise<WorkoutLogFrontend[]>;
  updateWorkoutLog: (logId: string, updates: Partial<WorkoutLogData>) => Promise<void>;
  deleteWorkoutLog: (logId: string) => Promise<void>;
}

interface ActiveWorkout {
  plan: WorkoutPlanFrontend;
  startTime: string;
  currentExerciseIndex: number;
  completedExercises: CompletedExercise[];
  isPaused: boolean;
  totalDuration: number; // seconds
  restTimer?: {
    remaining: number; // seconds
    isActive: boolean;
  };
}

interface CompletedExercise {
  exerciseId: string;
  exerciseName: string;
  sets: CompletedSet[];
  completedAt: string;
  notes?: string;
}

interface CompletedSet {
  setNumber: number;
  weight?: number;
  reps: number;
  restTime?: number; // seconds
  rpe?: number; // Rate of perceived exertion 1-10
  notes?: string;
}
```

#### Profile Context
```typescript
interface ProfileContextType {
  // State
  profile: UserProfileFrontend | null;
  preferences: ProfilePreferences | null;
  isLoading: boolean;
  isComplete: boolean;
  completionPercentage: number;
  
  // Actions
  createProfile: (profileData: ProfileCreationData) => Promise<UserProfileFrontend>;
  updateProfile: (updates: Partial<UserProfileFrontend>) => Promise<UserProfileFrontend>;
  updatePreferences: (preferences: Partial<ProfilePreferences>) => Promise<ProfilePreferences>;
  calculateBMI: () => number | null;
  convertUnits: (value: number, from: string, to: string) => number;
  
  // Validation
  validateProfile: () => ProfileValidationResult;
  getRequiredFields: () => string[];
  getOptionalFields: () => string[];
}

interface ProfileCreationData {
  height: number | { feet: number; inches: number };
  weight: number;
  age: number;
  gender?: string;
  goals: string[];
  equipment: string[];
  experienceLevel: string;
  unitPreference: 'metric' | 'imperial';
  medicalConditions: string[];
  workoutFrequency: string;
}

interface ProfilePreferences {
  unitPreference: 'metric' | 'imperial';
  equipment: string[];
  exerciseTypes: string[];
  workoutFrequency: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'flexible';
  notifications: {
    workoutReminders: boolean;
    progressUpdates: boolean;
    aiInsights: boolean;
    weeklyReports: boolean;
  };
  privacy: {
    shareProgress: boolean;
    publicProfile: boolean;
    anonymizeData: boolean;
  };
}

interface ProfileValidationResult {
  isValid: boolean;
  errors: {
    field: string;
    message: string;
  }[];
  warnings: {
    field: string;
    message: string;
  }[];
}
```

### Hook Return Types

#### Authentication Hooks
```typescript
// useAuth hook
interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

// useSession hook
interface UseSessionReturn {
  session: Session | null;
  isLoading: boolean;
  isValidating: boolean;
  mutate: () => Promise<void>;
  error: Error | null;
}

interface Session {
  user: User;
  token: string;
  expiresAt: string;
  isActive: boolean;
}
```

#### Data Fetching Hooks
```typescript
// useWorkoutPlans hook
interface UseWorkoutPlansReturn {
  plans: WorkoutPlanFrontend[];
  isLoading: boolean;
  isValidating: boolean;
  error: Error | null;
  mutate: () => Promise<void>;
  createPlan: (request: WorkoutGenerationRequest) => Promise<WorkoutPlanFrontend>;
  updatePlan: (planId: string, updates: Partial<WorkoutPlanFrontend>) => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
}

// useAnalytics hook
interface UseAnalyticsReturn {
  analytics: AnalyticsOverview | null;
  insights: AIInsight[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  getInsights: (timeframe: string) => Promise<AIInsight[]>;
}

// usePagination hook
interface UsePaginationReturn<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  isLoading: boolean;
  error: Error | null;
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;
  changeLimit: (limit: number) => void;
}
```

### Error Type Definitions

#### API Error Types
```typescript
interface ApiError extends Error {
  status: number;
  code: string;
  endpoint: string;
  method: string;
  timestamp: string;
  requestId?: string;
  details?: Record<string, any>;
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

interface AuthenticationError extends ApiError {
  status: 401;
  code: 'AUTHENTICATION_FAILED' | 'TOKEN_EXPIRED' | 'TOKEN_INVALID';
  refreshable: boolean;
}

interface AuthorizationError extends ApiError {
  status: 403;
  code: 'INSUFFICIENT_PERMISSIONS' | 'RESOURCE_FORBIDDEN';
  requiredPermissions: string[];
}

interface RateLimitError extends ApiError {
  status: 429;
  code: 'RATE_LIMIT_EXCEEDED';
  retryAfter: number; // seconds
  limit: number;
  remaining: number;
  resetTime: string;
}

interface AIServiceError extends ApiError {
  status: 503 | 429 | 400;
  code: 'AI_SERVICE_UNAVAILABLE' | 'AI_QUOTA_EXCEEDED' | 'AI_GENERATION_FAILED';
  service: 'openai' | 'perplexity';
  fallbackAvailable: boolean;
  retryAfter?: number;
}
```

---

## 4. Utility & Helper Types

### AI Agent Interfaces

#### Base Agent Interface
```typescript
interface BaseAgent {
  id: string;
  name: string;
  type: 'research' | 'generation' | 'adjustment' | 'nutrition';
  description: string;
  version: string;
  capabilities: string[];
  
  // Core methods
  process(input: AgentInputType): Promise<AgentResultType>;
  validate(input: AgentInputType): ValidationResult;
  getStatus(): AgentStatus;
  
  // Configuration
  configure(config: AgentConfig): void;
  getConfig(): AgentConfig;
}

interface AgentInputType {
  profile: UserProfileFrontend;
  goals: string[];
  preferences: Record<string, any>;
  previousResults?: Record<string, any>;
  messages?: ChatMessage[];
  feedback?: string;
  planId?: string;
  context?: AgentContext;
}

interface AgentResultType {
  success: boolean;
  data: Record<string, any>;
  reasoning: string;
  messages: ChatMessage[];
  metadata: AgentMetadata;
  error?: AgentError;
}

interface AgentConfig {
  maxTokens: number;
  temperature: number;
  model: string;
  timeout: number; // milliseconds
  retryAttempts: number;
  enableCaching: boolean;
  debugMode: boolean;
}

interface AgentContext {
  sessionId: string;
  userId: string;
  timestamp: string;
  memoryEnabled: boolean;
  previousInteractions: string[];
}

interface AgentMetadata {
  processingTime: number; // milliseconds
  tokensUsed: number;
  model: string;
  confidence: number; // 0-1
  sources: string[];
  version: string;
}

interface AgentError {
  code: string;
  message: string;
  recoverable: boolean;
  retryAfter?: number;
  details?: Record<string, any>;
}
```

#### Specific Agent Types
```typescript
// Research Agent
interface ResearchAgent extends BaseAgent {
  type: 'research';
  search(query: string, filters?: SearchFilters): Promise<ResearchResult>;
  summarize(content: string[]): Promise<SummaryResult>;
  cite(sources: string[]): CitationResult;
}

interface ResearchResult {
  query: string;
  results: SearchResult[];
  summary: string;
  confidence: number;
  sources: string[];
  executionTime: number;
}

interface SearchResult {
  title: string;
  content: string;
  source: string;
  relevance: number; // 0-1
  credibility: number; // 0-1
  publishedAt?: string;
}

// Workout Generation Agent
interface WorkoutGenerationAgent extends BaseAgent {
  type: 'generation';
  generatePlan(input: WorkoutGenerationInput): Promise<WorkoutGenerationResult>;
  optimizePlan(plan: WorkoutPlanFrontend, criteria: OptimizationCriteria): Promise<WorkoutPlanFrontend>;
  validateSafety(plan: WorkoutPlanFrontend, profile: UserProfileFrontend): SafetyAssessment;
}

interface WorkoutGenerationInput extends AgentInputType {
  fitnessLevel: string;
  equipment: string[];
  restrictions: string[];
  timeConstraints: {
    duration: number;
    frequency: string;
    timeOfDay: string;
  };
}

interface WorkoutGenerationResult extends AgentResultType {
  data: {
    plan: WorkoutPlanFrontend;
    alternatives: Exercise[];
    progressions: Exercise[];
    regressions: Exercise[];
  };
}

// Plan Adjustment Agent
interface PlanAdjustmentAgent extends BaseAgent {
  type: 'adjustment';
  adjustPlan(plan: WorkoutPlanFrontend, feedback: string): Promise<AdjustmentResult>;
  analyzeFeedback(feedback: string): FeedbackAnalysis;
  suggestModifications(plan: WorkoutPlanFrontend, issues: string[]): ModificationSuggestion[];
}

interface AdjustmentResult extends AgentResultType {
  data: {
    adjustedPlan: WorkoutPlanFrontend;
    changes: PlanChange[];
    reasoning: string;
  };
}

interface FeedbackAnalysis {
  intent: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  topics: string[];
  urgency: 'low' | 'medium' | 'high';
  actionable: boolean;
  suggestions: string[];
}
```

### Helper Function Types

#### Validation Helpers
```typescript
type ValidatorFunction<T> = (value: T) => ValidationResult;

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// Profile validation
type ProfileValidator = ValidatorFunction<UserProfileFrontend>;
type HeightValidator = ValidatorFunction<number | { feet: number; inches: number }>;
type WeightValidator = ValidatorFunction<number>;
type AgeValidator = ValidatorFunction<number>;

// Workout validation
type ExerciseValidator = ValidatorFunction<Exercise>;
type WorkoutPlanValidator = ValidatorFunction<WorkoutPlanFrontend>;
type WorkoutLogValidator = ValidatorFunction<WorkoutLogData>;

// Generic validators
type EmailValidator = ValidatorFunction<string>;
type PasswordValidator = ValidatorFunction<string>;
type DateValidator = ValidatorFunction<string>;
type NumberRangeValidator = (min: number, max: number) => ValidatorFunction<number>;
```

#### Conversion Helpers
```typescript
// Unit conversion types
type UnitType = 'weight' | 'height' | 'distance' | 'temperature';
type WeightUnit = 'kg' | 'lbs' | 'oz' | 'g';
type HeightUnit = 'cm' | 'ft' | 'in' | 'm';
type DistanceUnit = 'km' | 'mi' | 'm' | 'ft' | 'yd';

interface ConversionFunction<T> {
  (value: number, from: T, to: T): number;
}

type WeightConverter = ConversionFunction<WeightUnit>;
type HeightConverter = ConversionFunction<HeightUnit>;
type DistanceConverter = ConversionFunction<DistanceUnit>;

// Data transformation types
type DatabaseToFrontendConverter<TDb, TFrontend> = (data: TDb) => TFrontend;
type FrontendToDatabaseConverter<TFrontend, TDb> = (data: TFrontend) => TDb;

// Profile converters
type ProfileDbToFrontend = DatabaseToFrontendConverter<
  Database['public']['Tables']['user_profiles']['Row'],
  UserProfileFrontend
>;

type ProfileFrontendToDb = FrontendToDatabaseConverter<
  UserProfileFrontend,
  Database['public']['Tables']['user_profiles']['Update']
>;
```

#### Analytics Helpers
```typescript
// Analytics calculation types
interface AnalyticsCalculator {
  calculateConsistency(logs: WorkoutLogFrontend[], timeframe: string): number;
  calculateProgress(logs: WorkoutLogFrontend[], metric: string): ProgressData;
  calculateGoalProgress(logs: WorkoutLogFrontend[], goals: Goal[]): GoalProgress[];
  calculateTrends(data: DataPoint[], timeframe: string): TrendData;
}

interface ProgressData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface TrendData {
  direction: 'up' | 'down' | 'flat';
  strength: 'weak' | 'moderate' | 'strong';
  confidence: number; // 0-1
  dataPoints: number;
  timeframe: string;
}

interface DataPoint {
  date: string;
  value: number;
  metadata?: Record<string, any>;
}
```

### Configuration Types

#### Application Configuration
```typescript
interface AppConfig {
  app: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
    baseUrl: string;
    apiUrl: string;
  };
  auth: {
    provider: 'supabase';
    tokenExpiry: number; // seconds
    refreshTokenExpiry: number; // seconds
    sessionTimeout: number; // seconds
  };
  api: {
    timeout: number; // milliseconds
    retryAttempts: number;
    retryDelay: number; // milliseconds
    rateLimiting: {
      requests: number;
      window: number; // seconds
    };
  };
  ai: {
    providers: {
      openai: {
        apiKey: string;
        model: string;
        maxTokens: number;
        temperature: number;
      };
      perplexity: {
        apiKey: string;
        model: string;
        maxTokens: number;
      };
    };
    agents: {
      research: AgentConfig;
      generation: AgentConfig;
      adjustment: AgentConfig;
      nutrition: AgentConfig;
    };
  };
  features: {
    aiGeneration: boolean;
    planAdjustment: boolean;
    analytics: boolean;
    dataExport: boolean;
    realTimeSync: boolean;
  };
  ui: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    animations: boolean;
    density: 'comfortable' | 'compact';
  };
}
```

#### Environment Types
```typescript
interface EnvironmentVariables {
  // Application
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: string;
  BASE_URL: string;
  
  // Database
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  
  // AI Services
  OPENAI_API_KEY: string;
  PERPLEXITY_API_KEY: string;
  
  // Authentication
  JWT_SECRET: string;
  REFRESH_TOKEN_SECRET: string;
  
  // External Services
  ANALYTICS_API_KEY?: string;
  ERROR_REPORTING_DSN?: string;
  
  // Feature Flags
  ENABLE_AI_GENERATION: 'true' | 'false';
  ENABLE_ANALYTICS: 'true' | 'false';
  ENABLE_DEBUG_MODE: 'true' | 'false';
}

type EnvironmentType = keyof EnvironmentVariables;
type ConfigValue<T extends EnvironmentType> = EnvironmentVariables[T];
```

---

## 5. Usage Examples & Patterns

### Type-Safe API Calls

#### Using Generic API Client
```typescript
// Generic API client with type safety
class TypedApiClient {
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await fetch(`/api${endpoint}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(response);
  }

  async post<TRequest, TResponse>(
    endpoint: string, 
    data: TRequest
  ): Promise<ApiResponse<TResponse>> {
    const response = await fetch(`/api${endpoint}`, {
      method: 'POST',
      headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return this.handleResponse<TResponse>(response);
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }
    return response.json();
  }
}

// Usage examples
const apiClient = new TypedApiClient();

// Type-safe profile retrieval
const profileResponse = await apiClient.get<UserProfileFrontend>('/v1/profile');
const profile: UserProfileFrontend = profileResponse.data;

// Type-safe workout generation
const workoutRequest: WorkoutGenerationRequest = {
  fitnessLevel: 'intermediate',
  goals: ['strength', 'muscle_gain'],
  equipment: ['dumbbells', 'barbell'],
  restrictions: [],
  exerciseTypes: ['strength'],
  workoutFrequency: '3x per week'
};

const workoutResponse = await apiClient.post<
  WorkoutGenerationRequest, 
  WorkoutGenerationResponse
>('/v1/workouts', workoutRequest);

const generatedPlan: WorkoutGenerationResponse = workoutResponse.data;
```

#### Custom Hook with Type Safety
```typescript
// Type-safe data fetching hook
function useTypedApi<T>(endpoint: string, dependencies: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await apiClient.get<T>(endpoint);
        
        if (mounted) {
          setData(response.data);
        }
      } catch (err) {
        if (mounted) {
          setError(err as ApiError);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, dependencies);

  return { data, loading, error };
}

// Usage with type safety
const ProfileComponent = () => {
  const { data: profile, loading, error } = useTypedApi<UserProfileFrontend>('/v1/profile');

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!profile) return <EmptyState />;

  // TypeScript knows profile is UserProfileFrontend
  return (
    <div>
      <h1>{profile.goals.join(', ')}</h1>
      <p>Experience: {profile.experienceLevel}</p>
      <p>BMI: {profile.bmi}</p>
    </div>
  );
};
```

### Component Prop Patterns

#### Polymorphic Component Types
```typescript
// Base polymorphic component type
type PropsOf<T extends keyof JSX.IntrinsicElements | React.JSXElementConstructor<any>> = 
  JSX.LibraryManagedAttributes<T, React.ComponentPropsWithoutRef<T>>;

type AsProp<T extends React.ElementType> = {
  as?: T;
};

type PolymorphicComponentProp<T extends React.ElementType, Props = {}> = 
  React.PropsWithChildren<Props & AsProp<T>> & 
  Omit<PropsOf<T>, keyof AsProp<T> | keyof Props>;

// Button component with polymorphic typing
type ButtonOwnProps = {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
};

type ButtonProps<T extends React.ElementType = 'button'> = 
  PolymorphicComponentProp<T, ButtonOwnProps>;

function Button<T extends React.ElementType = 'button'>({ 
  as, 
  variant = 'primary', 
  size = 'md', 
  loading = false,
  children,
  ...props 
}: ButtonProps<T>) {
  const Component = as || 'button';
  
  return (
    <Component 
      className={`btn btn-${variant} btn-${size} ${loading ? 'btn-loading' : ''}`}
      disabled={loading}
      {...props}
    >
      {loading ? <Spinner /> : children}
    </Component>
  );
}

// Usage with type safety
<Button>Regular button</Button>
<Button as="a" href="/link">Link button</Button>
<Button as={Link} to="/route">Router link button</Button>
```

#### Compound Component Types
```typescript
// Compound component pattern with proper typing
interface CardContextType {
  variant: 'default' | 'outlined' | 'elevated';
  padding: 'none' | 'sm' | 'md' | 'lg';
}

const CardContext = createContext<CardContextType | null>(null);

const useCardContext = () => {
  const context = useContext(CardContext);
  if (!context) {
    throw new Error('Card compound components must be used within a Card');
  }
  return context;
};

// Main Card component
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardContextType['variant'];
  padding?: CardContextType['padding'];
}

const Card = ({ variant = 'default', padding = 'md', children, ...props }: CardProps) => (
  <CardContext.Provider value={{ variant, padding }}>
    <div className={`card card-${variant} card-padding-${padding}`} {...props}>
      {children}
    </div>
  </CardContext.Provider>
);

// Card subcomponents with context awareness
interface CardHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

const CardHeader = ({ title, subtitle, action, children, ...props }: CardHeaderProps) => {
  const { padding } = useCardContext();
  
  return (
    <header className={`card-header card-header-${padding}`} {...props}>
      {title && <h3>{title}</h3>}
      {subtitle && <p>{subtitle}</p>}
      {action && <div className="card-action">{action}</div>}
      {children}
    </header>
  );
};

// Compound component with proper typing
Card.Header = CardHeader;
Card.Content = CardContent;
Card.Actions = CardActions;

export { Card };

// Usage with full type safety
<Card variant="elevated" padding="lg">
  <Card.Header title="Workout Plan" action={<Button>Edit</Button>} />
  <Card.Content>
    <p>Your personalized workout plan</p>
  </Card.Content>
  <Card.Actions>
    <Button>Start Workout</Button>
  </Card.Actions>
</Card>
```

### State Typing Best Practices

#### Discriminated Union Types for State
```typescript
// Loading state with discriminated unions
type AsyncState<T, E = Error> = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E };

// Reducer for async state
type AsyncAction<T, E = Error> = 
  | { type: 'LOADING' }
  | { type: 'SUCCESS'; payload: T }
  | { type: 'ERROR'; payload: E }
  | { type: 'RESET' };

const asyncReducer = <T, E = Error>(
  state: AsyncState<T, E>, 
  action: AsyncAction<T, E>
): AsyncState<T, E> => {
  switch (action.type) {
    case 'LOADING':
      return { status: 'loading' };
    case 'SUCCESS':
      return { status: 'success', data: action.payload };
    case 'ERROR':
      return { status: 'error', error: action.payload };
    case 'RESET':
      return { status: 'idle' };
    default:
      return state;
  }
};

// Custom hook with type safety
function useAsyncState<T, E = Error>(
  asyncFn: () => Promise<T>
): [AsyncState<T, E>, () => Promise<void>] {
  const [state, dispatch] = useReducer(asyncReducer<T, E>, { status: 'idle' });

  const execute = useCallback(async () => {
    dispatch({ type: 'LOADING' });
    try {
      const result = await asyncFn();
      dispatch({ type: 'SUCCESS', payload: result });
    } catch (error) {
      dispatch({ type: 'ERROR', payload: error as E });
    }
  }, [asyncFn]);

  return [state, execute];
}

// Usage with type inference
const WorkoutList = () => {
  const [state, loadWorkouts] = useAsyncState<WorkoutPlanFrontend[]>(
    () => apiClient.get<WorkoutPlanFrontend[]>('/v1/workouts')
  );

  useEffect(() => {
    loadWorkouts();
  }, []);

  // TypeScript narrows the type based on status
  switch (state.status) {
    case 'idle':
      return <EmptyState />;
    case 'loading':
      return <LoadingSpinner />;
    case 'success':
      // state.data is WorkoutPlanFrontend[]
      return <WorkoutGrid plans={state.data} />;
    case 'error':
      // state.error is Error
      return <ErrorMessage error={state.error} />;
  }
};
```

#### Context with Reducer Pattern
```typescript
// Workout context state with reducer
interface WorkoutState {
  plans: WorkoutPlanFrontend[];
  activePlan: WorkoutPlanFrontend | null;
  currentWorkout: ActiveWorkout | null;
  loading: Record<string, boolean>;
  errors: Record<string, string>;
}

type WorkoutAction = 
  | { type: 'SET_LOADING'; key: string; loading: boolean }
  | { type: 'SET_ERROR'; key: string; error: string }
  | { type: 'SET_PLANS'; plans: WorkoutPlanFrontend[] }
  | { type: 'ADD_PLAN'; plan: WorkoutPlanFrontend }
  | { type: 'UPDATE_PLAN'; planId: string; updates: Partial<WorkoutPlanFrontend> }
  | { type: 'DELETE_PLAN'; planId: string }
  | { type: 'SET_ACTIVE_PLAN'; plan: WorkoutPlanFrontend | null }
  | { type: 'START_WORKOUT'; plan: WorkoutPlanFrontend }
  | { type: 'COMPLETE_EXERCISE'; exerciseId: string; sets: CompletedSet[] }
  | { type: 'COMPLETE_WORKOUT'; workoutData: WorkoutCompletionData }
  | { type: 'RESET_WORKOUT' };

const workoutReducer = (state: WorkoutState, action: WorkoutAction): WorkoutState => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: { ...state.loading, [action.key]: action.loading }
      };
    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.key]: action.error }
      };
    case 'SET_PLANS':
      return { ...state, plans: action.plans };
    case 'ADD_PLAN':
      return { ...state, plans: [action.plan, ...state.plans] };
    case 'UPDATE_PLAN':
      return {
        ...state,
        plans: state.plans.map(plan => 
          plan.id === action.planId ? { ...plan, ...action.updates } : plan
        )
      };
    case 'DELETE_PLAN':
      return {
        ...state,
        plans: state.plans.filter(plan => plan.id !== action.planId)
      };
    case 'SET_ACTIVE_PLAN':
      return { ...state, activePlan: action.plan };
    case 'START_WORKOUT':
      return {
        ...state,
        currentWorkout: {
          plan: action.plan,
          startTime: new Date().toISOString(),
          currentExerciseIndex: 0,
          completedExercises: [],
          isPaused: false,
          totalDuration: 0
        }
      };
    case 'COMPLETE_EXERCISE':
      if (!state.currentWorkout) return state;
      return {
        ...state,
        currentWorkout: {
          ...state.currentWorkout,
          completedExercises: [
            ...state.currentWorkout.completedExercises,
            {
              exerciseId: action.exerciseId,
              exerciseName: state.currentWorkout.plan.exercises.find(e => e.id === action.exerciseId)?.name || '',
              sets: action.sets,
              completedAt: new Date().toISOString()
            }
          ],
          currentExerciseIndex: state.currentWorkout.currentExerciseIndex + 1
        }
      };
    case 'RESET_WORKOUT':
      return { ...state, currentWorkout: null };
    default:
      return state;
  }
};

// Context provider with full typing
const WorkoutProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(workoutReducer, {
    plans: [],
    activePlan: null,
    currentWorkout: null,
    loading: {},
    errors: {}
  });

  const actions = useMemo(() => ({
    setLoading: (key: string, loading: boolean) => 
      dispatch({ type: 'SET_LOADING', key, loading }),
    
    generatePlan: async (request: WorkoutGenerationRequest) => {
      dispatch({ type: 'SET_LOADING', key: 'generate', loading: true });
      try {
        const response = await apiClient.post<
          WorkoutGenerationRequest, 
          WorkoutGenerationResponse
        >('/v1/workouts', request);
        const plan = convertResponseToPlan(response.data);
        dispatch({ type: 'ADD_PLAN', plan });
        return plan;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', key: 'generate', error: error.message });
        throw error;
      } finally {
        dispatch({ type: 'SET_LOADING', key: 'generate', loading: false });
      }
    },
    
    // ... other actions
  }), []);

  return (
    <WorkoutContext.Provider value={{ state, ...actions }}>
      {children}
    </WorkoutContext.Provider>
  );
};
```

### Generic Type Usage

#### Flexible Data Fetching
```typescript
// Generic data fetching with flexible configuration
interface DataFetchConfig<T> {
  endpoint: string;
  transform?: (data: any) => T;
  validate?: (data: T) => boolean;
  cache?: boolean;
  cacheKey?: string;
  retry?: number;
  fallback?: T;
}

function useDataFetch<T>(config: DataFetchConfig<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let result = await apiClient.get<any>(config.endpoint);
      
      if (config.transform) {
        result = config.transform(result.data);
      }
      
      if (config.validate && !config.validate(result)) {
        throw new Error('Data validation failed');
      }
      
      setData(result);
    } catch (err) {
      setError(err as Error);
      if (config.fallback) {
        setData(config.fallback);
      }
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Usage with different types
const ProfileData = () => {
  const { data: profile } = useDataFetch<UserProfileFrontend>({
    endpoint: '/v1/profile',
    transform: (data) => convertProfileToFrontend(data),
    validate: (profile) => profile.age > 0 && profile.height > 0,
    cache: true,
    cacheKey: 'user-profile'
  });

  const { data: workouts } = useDataFetch<WorkoutPlanFrontend[]>({
    endpoint: '/v1/workouts',
    transform: (data) => data.map(convertWorkoutToFrontend),
    fallback: []
  });

  return (
    <div>
      <ProfileCard profile={profile} />
      <WorkoutList workouts={workouts} />
    </div>
  );
};
```

#### Generic Form Handling
```typescript
// Generic form handling with validation
interface FormField<T> {
  name: keyof T;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'textarea';
  required?: boolean;
  validate?: (value: any) => string | null;
  options?: { value: string; label: string }[];
  placeholder?: string;
  helperText?: string;
}

interface FormConfig<T> {
  fields: FormField<T>[];
  onSubmit: (data: T) => Promise<void>;
  initialValues?: Partial<T>;
  validation?: (data: Partial<T>) => Record<string, string>;
}

function useForm<T extends Record<string, any>>(config: FormConfig<T>) {
  const [values, setValues] = useState<Partial<T>>(config.initialValues || {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Clear field error when value changes
    if (errors[name as string]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }, [errors]);

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    // Field-level validation
    config.fields.forEach(field => {
      const value = values[field.name];
      
      if (field.required && (!value || value === '')) {
        newErrors[field.name as string] = `${field.label} is required`;
      } else if (field.validate && value) {
        const error = field.validate(value);
        if (error) {
          newErrors[field.name as string] = error;
        }
      }
    });

    // Form-level validation
    if (config.validation) {
      const formErrors = config.validation(values);
      Object.assign(newErrors, formErrors);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values, config]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await config.onSubmit(values as T);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, values, config]);

  return {
    values,
    errors,
    isSubmitting,
    setValue,
    handleSubmit,
    validate
  };
}

// Usage with profile form
const ProfileForm = () => {
  const { values, errors, isSubmitting, setValue, handleSubmit } = useForm<UserProfileFrontend>({
    fields: [
      {
        name: 'height',
        label: 'Height',
        type: 'number',
        required: true,
        validate: (value) => value <= 0 ? 'Height must be positive' : null
      },
      {
        name: 'weight',
        label: 'Weight',
        type: 'number',
        required: true,
        validate: (value) => value <= 0 ? 'Weight must be positive' : null
      },
      {
        name: 'goals',
        label: 'Fitness Goals',
        type: 'multiselect',
        required: true,
        options: [
          { value: 'weight_loss', label: 'Weight Loss' },
          { value: 'muscle_gain', label: 'Muscle Gain' },
          { value: 'strength', label: 'Strength' }
        ]
      }
    ],
    onSubmit: async (data) => {
      await apiClient.post('/v1/profile', data);
    },
    validation: (data) => {
      const errors: Record<string, string> = {};
      if (data.age && data.age < 13) {
        errors.age = 'Must be at least 13 years old';
      }
      return errors;
    }
  });

  return (
    <form onSubmit={handleSubmit}>
      {/* Render form fields based on configuration */}
      <Button type="submit" loading={isSubmitting}>
        Save Profile
      </Button>
    </form>
  );
};
```

---

## Cross-References

- **Frontend API Reference**: [API Endpoints Documentation](./api-endpoints.md)
- **Database Types Source**: [`types/database.types.ts`](../../types/database.types.ts)
- **Component Documentation**: [UI Patterns Guide](../03-ui-patterns/)
- **Testing Types**: [Testing Documentation](../04-testing/)

---

## Automation & Maintenance

### TypeDoc Integration

This document incorporates auto-generated content from TypeDoc. 

#### Initial TypeDoc Setup (Phase 1)

**1. Install TypeDoc Dependencies:**
```bash
npm install --save-dev typedoc @typedoc/plugin-markdown
```

**2. Configure TypeDoc (`typedoc.json`):**
```json
{
  "entryPoints": [
    "./types/database.types.ts",
    "./components/**/*.tsx",
    "./utils/**/*.ts",
    "./contexts/**/*.tsx"
  ],
  "out": "docs/generated/types",
  "plugin": ["@typedoc/plugin-markdown"],
  "readme": "none",
  "excludePrivate": true,
  "excludeProtected": true,
  "categorizeByGroup": true,
  "categoryOrder": [
    "Database Types",
    "Component Props", 
    "API Types",
    "Utility Types"
  ],
  "sort": ["source-order"]
}
```

**3. Add TSDoc Comments:**
```typescript
/**
 * @category Database Types
 * @description User profile data structure from Supabase
 * @example
 * ```typescript
 * const profile: UserProfile['Row'] = {
 *   id: 'uuid',
 *   user_id: 'auth-uuid',
 *   height: 175,
 *   weight: 70
 * };
 * ```
 */
export interface UserProfile {
  Row: {
    id: string;
    user_id: string;
    height: number;
    weight: number;
    // ...
  };
}
```

**4. Generate Documentation:**
```bash
# Generate TypeScript documentation
npm run docs:types

# Update type definitions reference
npm run docs:sync-types
```

**5. Custom Template Integration:**
```typescript
// scripts/generate-type-docs.js
const TypeDoc = require('typedoc');

async function generateTypeDocs() {
  const app = new TypeDoc.Application();
  
  app.options.addReader(new TypeDoc.TSConfigReader());
  app.options.addReader(new TypeDoc.TypeDocReader());
  
  app.bootstrap({
    entryPoints: ['./types/database.types.ts'],
    plugin: ['@typedoc/plugin-markdown'],
    theme: 'markdown'
  });
  
  const project = app.convert();
  
  if (project) {
    await app.generateDocs(project, './docs/generated/types');
  }
}

generateTypeDocs();
```

### CI/CD Integration

Type definitions are automatically validated on:
- Pull request creation
- Type file changes
- Component interface updates
- Database schema migrations

#### Detailed CI/CD Pipeline Setup (Phase 4)

**1. GitHub Actions Workflow (`.github/workflows/docs-automation.yml`):**
```yaml
name: Documentation Automation

on:
  push:
    branches: [main, develop]
    paths:
      - 'types/**/*.ts'
      - 'components/**/*.tsx'
      - 'utils/**/*.ts'
      - 'contexts/**/*.tsx'
      - 'docs/openapi.yaml'
      - 'backend/supabase/migrations/*.sql'
  pull_request:
    paths:
      - 'types/**/*.ts'
      - 'components/**/*.tsx'
      - 'docs/**/*.md'

jobs:
  update-documentation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Generate TypeScript documentation
        run: |
          npm run docs:types
          npm run docs:sync-types
          
      - name: Validate OpenAPI spec
        run: npm run openapi:validate
        
      - name: Update API documentation
        run: npm run docs:sync-api
        
      - name: Check for documentation changes
        id: docs-changes
        run: |
          if [[ $(git diff --name-only | grep "docs/") ]]; then
            echo "changes=true" >> $GITHUB_OUTPUT
          else
            echo "changes=false" >> $GITHUB_OUTPUT
          fi
          
      - name: Commit documentation updates
        if: steps.docs-changes.outputs.changes == 'true'
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add docs/
          git commit -m "docs: auto-update reference documentation [skip ci]"
          git push

  validate-links:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Check documentation links
        uses: lycheeverse/lychee-action@v1
        with:
          args: 'docs/**/*.md --exclude-file .lycheeignore'
          
  test-examples:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Test documentation code examples
        run: npm run test:docs-examples
```

**2. Package.json Scripts:**
```json
{
  "scripts": {
    "docs:types": "typedoc",
    "docs:sync-types": "node scripts/sync-type-docs.js",
    "docs:sync-api": "node scripts/sync-api-docs.js",
    "openapi:validate": "node scripts/validate-openapi.js",
    "test:docs-examples": "node scripts/test-doc-examples.js"
  }
}
```

**3. Documentation Sync Scripts:**
```typescript
// scripts/sync-type-docs.js
const fs = require('fs');
const path = require('path');

async function syncTypeDocumentation() {
  const generatedDocs = path.join(__dirname, '../docs/generated/types');
  const referenceDocs = path.join(__dirname, '../docs/frontend-integration/07-reference/type-definitions.md');
  
  // Read generated TypeDoc content
  const typeContent = fs.readFileSync(path.join(generatedDocs, 'index.md'), 'utf8');
  
  // Extract and merge with manual content
  const manualContent = fs.readFileSync(referenceDocs, 'utf8');
  
  // Update sections with auto-generated content
  const updatedContent = mergeGeneratedContent(manualContent, typeContent);
  
  fs.writeFileSync(referenceDocs, updatedContent);
  console.log('✅ Type definitions documentation updated');
}

function mergeGeneratedContent(manual, generated) {
  // Implementation for merging auto-generated content with manual curation
  // This would identify sections marked for auto-update and replace them
  return manual; // Simplified for example
}

syncTypeDocumentation();
```

**4. API Documentation Sync:**
```typescript
// scripts/sync-api-docs.js
const yaml = require('js-yaml');
const fs = require('fs');

async function syncAPIDocumentation() {
  // Read OpenAPI spec
  const openAPIContent = fs.readFileSync('docs/openapi.yaml', 'utf8');
  const apiSpec = yaml.load(openAPIContent);
  
  // Extract frontend-relevant endpoints
  const frontendEndpoints = extractFrontendEndpoints(apiSpec);
  
  // Update API reference document
  const apiDocsPath = 'docs/frontend-integration/07-reference/api-endpoints.md';
  const currentContent = fs.readFileSync(apiDocsPath, 'utf8');
  
  const updatedContent = updateAPIEndpointsSection(currentContent, frontendEndpoints);
  
  fs.writeFileSync(apiDocsPath, updatedContent);
  console.log('✅ API documentation synchronized with OpenAPI spec');
}

function extractFrontendEndpoints(apiSpec) {
  // Extract endpoints relevant to frontend development
  const endpoints = {};
  
  Object.entries(apiSpec.paths).forEach(([path, methods]) => {
    Object.entries(methods).forEach(([method, details]) => {
      if (details.tags?.includes('frontend')) {
        endpoints[`${method.toUpperCase()} ${path}`] = {
          summary: details.summary,
          parameters: details.parameters,
          responses: details.responses
        };
      }
    });
  });
  
  return endpoints;
}

syncAPIDocumentation();
```

**5. Automated Testing for Documentation:**
```typescript
// scripts/test-doc-examples.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function testDocumentationExamples() {
  const docsDir = 'docs/frontend-integration/07-reference';
  const files = fs.readdirSync(docsDir).filter(file => file.endsWith('.md'));
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(docsDir, file), 'utf8');
    const codeBlocks = extractCodeBlocks(content);
    
    for (const block of codeBlocks) {
      if (block.language === 'typescript' || block.language === 'javascript') {
        try {
          await testCodeBlock(block.code, file);
          console.log(`✅ Code example in ${file} validated`);
        } catch (error) {
          console.error(`❌ Code example in ${file} failed:`, error.message);
          process.exit(1);
        }
      }
    }
  }
}

function extractCodeBlocks(content) {
  const regex = /```(\w+)\n([\s\S]*?)\n```/g;
  const blocks = [];
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    blocks.push({
      language: match[1],
      code: match[2]
    });
  }
  
  return blocks;
}

async function testCodeBlock(code, filename) {
  // Create temporary file and test compilation
  const tempFile = `temp-${Date.now()}.ts`;
  
  try {
    fs.writeFileSync(tempFile, code);
    execSync(`npx tsc --noEmit ${tempFile}`, { stdio: 'ignore' });
  } finally {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

testDocumentationExamples();
```

**6. Automated Maintenance Triggers:**
```typescript
// scripts/check-maintenance-triggers.js
async function checkMaintenanceTriggers() {
  const triggers = [
    {
      name: 'Database Schema Changes',
      check: () => hasRecentMigrations(),
      action: 'Update database type definitions'
    },
    {
      name: 'New Components',
      check: () => hasNewComponents(),
      action: 'Update component prop interfaces'
    },
    {
      name: 'API Changes',
      check: () => hasAPIChanges(),
      action: 'Sync API documentation'
    },
    {
      name: 'Dependency Updates',
      check: () => hasDependencyUpdates(),
      action: 'Update migration guides'
    }
  ];
  
  for (const trigger of triggers) {
    if (await trigger.check()) {
      console.log(`🔄 Maintenance trigger: ${trigger.name}`);
      console.log(`   Action required: ${trigger.action}`);
      
      // Create GitHub issue for manual review
      await createMaintenanceIssue(trigger);
    }
  }
}

checkMaintenanceTriggers();
```

### Manual Update Triggers

Update this document when:
- Adding new TypeScript interfaces
- Modifying existing type definitions
- Creating new component prop patterns
- Changing API response structures
- Adding utility type helpers

**Last Updated**: Auto-synced with TypeScript definitions
**Next Review**: Triggered by type definition changes 