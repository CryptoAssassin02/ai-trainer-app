/**
 * API Types and Interfaces for trAIner App
 * Extended types for Axios, API responses, and service configurations
 */

import { AxiosRequestConfig } from 'axios';

// Extend Axios request config to include our custom properties
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: {
      key: string;
      [key: string]: any;
    };
    skipAuth?: boolean;
    _retry?: boolean;
  }

  interface AxiosRequestConfig {
    skipAuth?: boolean;
  }

  // Note: AxiosError interface extension removed to avoid type conflicts
  // Custom error handling is implemented in the API client layer
}

// Base API response interface
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  error?: string;
}

// API Error response
export interface ApiErrorResponse {
  status: 'error';
  message: string;
  code?: string;
  errors?: Array<{
    field: string;
    message: string;
    type: string;
    value?: any;
  }>;
  retryAfter?: number;
  fallbackAvailable?: boolean;
}

// Success response wrapper
export interface ApiSuccessResponse<T = any> {
  status: 'success';
  data: T;
  message?: string;
}

// Pagination metadata
export interface PaginationInfo {
  page: number;
  limit: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Paginated response
export interface PaginatedResponse<T> extends ApiSuccessResponse<T[]> {
  pagination: PaginationInfo;
}

// User profile types aligned with backend API
export interface UserProfile {
  id: string;
  userId: string;
  unitPreference: 'metric' | 'imperial';
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | 'non-binary';
  age?: number; // 13-120
  name?: string; // 2-100 chars
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  medicalConditions?: string[]; // array of medical conditions
  goals?: string[];
  primaryGoal?: string; // optional primary goal from selected goals
  workoutFrequency?: string;
  gymCategory?: string;
  exerciseTypes?: string[]; // array of preferred exercise types
  additionalNotes?: string;
  height?: number | { feet: number; inches: number }; // format depends on unitPreference
  weight?: number; // kg or lbs based on unitPreference
  createdAt: string;
  updatedAt: string;
}

// Profile creation request type
export interface CreateProfileRequest {
  unitPreference: 'metric' | 'imperial'; // REQUIRED
  name?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | 'non-binary';
  height?: number | { feet: number; inches: number };
  weight?: number;
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  goals?: string[];
  primaryGoal?: string;
  gymCategory?: string;
  medicalConditions?: string[];
  workoutFrequency?: string;
  exerciseTypes?: string[];
}

// Profile update request type  
export interface UpdateProfileRequest {
  // All fields optional - partial update support
  name?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | 'non-binary';
  height?: number | { feet: number; inches: number };
  weight?: number;
  unitPreference?: 'metric' | 'imperial';
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  goals?: string[];
  primaryGoal?: string;
  gymCategory?: string;
  medicalConditions?: string[];
  workoutFrequency?: string;
  exerciseTypes?: string[];
}

// Profile preferences type
export interface ProfilePreferences {
  userId: string;
  unitPreference: 'metric' | 'imperial';
  goals?: string[];
  gymCategory?: string;
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  workoutFrequency?: string;
  updatedAt: string;
}

// Profile preferences update request
export interface UpdatePreferencesRequest {
  unitPreference?: 'metric' | 'imperial';
  goals?: string[];
  gymCategory?: string;
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  workoutFrequency?: string;
}

// API Response types for profile operations
export interface GetProfileResponse {
  status: 'success';
  data: UserProfile;
}

export interface UserProfileResponse {
  status: 'success';
  data: UserProfile;
}

export interface GetPreferencesResponse {
  status: 'success';
  data: ProfilePreferences;
}

export interface ProfilePreferencesResponse {
  status: 'success';
  data: ProfilePreferences;
}

// Profile-specific error types
export interface ProfileValidationError {
  status: 'error';
  message: string;
  errors: Array<{
    field: string;
    message: string;
    type: string;
    value?: any;
  }>;
}

export interface UnitConversionError {
  status: 'error';
  message: string;
  originalValue?: any;
  targetUnit?: string;
  conversionDetails?: string;
}

// Workout plan types
export interface Exercise {
  id: string;
  name: string;
  category: string;
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  sets: number;
  reps: string | number;
  weight?: {
    value: number;
    unit: 'kg' | 'lbs';
  };
  restTime?: {
    seconds: number;
    recommendation?: string;
  };
  notes?: string;
  equipment: string[];
  instructions: string[];
  safetyNotes?: string[];
}

export interface WorkoutPlan {
  id: string;
  name: string;                    // ✅ Backend field: workout_plans.name
  description?: string;            // ✅ Backend field: workout_plans.description
  exercises: Exercise[];           // ✅ Backend field: workout_plans.plan_data (JSONB)
  difficulty: 'beginner' | 'intermediate' | 'advanced'; // ✅ Backend field: workout_plans.difficulty_level
  estimatedDuration: number;       // ✅ Backend field: workout_plans.estimated_duration (minutes)
  equipmentRequired: string[];     // ✅ Backend field: workout_plans.equipment_required
  tags: string[];                  // ✅ Backend field: workout_plans.tags
  createdAt: string;              // ✅ Backend field: workout_plans.created_at
  updatedAt: string;              // ✅ Backend field: workout_plans.updated_at

  reasoning?: string;              // ✅ Backend field: extracted from workout_plans.ai_reasoning (JSONB)
  aiGenerated: boolean;            // ✅ Backend field: workout_plans.ai_generated
  status: 'draft' | 'active' | 'archived'; // ✅ Backend field: workout_plans.status
  userId: string;                  // ✅ Backend field: workout_plans.user_id
}

// Analytics types
export interface AnalyticsOverview {
  workoutConsistency: {
    currentStreak: number;
    longestStreak: number;
    weeklyAverage: number;
    monthlyTotal: number;
  };
  strengthProgress: {
    overallImprovement: number;
    exerciseProgress: Array<{
      exercise: string;
      improvement: number;
      trend: 'up' | 'down' | 'stable';
    }>;
  };
  adherenceMetrics: {
    plannedWorkouts: number;
    completedWorkouts: number;
    adherenceRate: number;
  };
}

// Check-in types
export interface CheckIn {
  id: string;
  date: string;
  weight?: number;
  bodyFat?: number;
  measurements?: {
    waist?: number;
    chest?: number;
    arms?: number;
    thighs?: number;
  };
  mood: 1 | 2 | 3 | 4 | 5;
  energy: 1 | 2 | 3 | 4 | 5;
  motivation: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  photos?: string[];
  createdAt: string;
}

// Data transfer types
export interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx' | 'pdf';
  dateRange?: {
    start: string;
    end: string;
  };
  dataTypes: ('workouts' | 'checkins' | 'profile' | 'analytics')[];
}

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors?: string[];
}

// Notification types
export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  workoutReminders: boolean;
  progressReports: boolean;
  achievementAlerts: boolean;
  weeklyDigest: boolean;
}

// Chunked Generation Types
export interface StructureGenerationRequest {
  goals: string[];
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  preferences?: any;
}

export interface ProgramStructure {
  programName: string;
  totalDuration: number;
  totalMesocycles: number;
  trainingFrequency: {
    daysPerWeek: number;
    restDays: string[];
  };
  mesocycles: Array<{
    mesocycleNumber: number;
    theme: string;
    duration: number;
    focus: string;
    goals: string[];
  }>;
  goalPrioritization: {
    primary: string;
    secondary: string[];
  };
}

export interface StructureResponse {
  planId: string;
  structure: ProgramStructure;
  nextStep: {
    action: 'generate_mesocycle';
    mesocycleNumber: number;
    endpoint: string;
  };
}

export interface MesocycleDetails {
  mesocycleNumber: number;
  weeks: Array<{
    weekNumber: number;
    workouts: Record<string, {
      exercises: Array<{
        exercise: string;
        sets: number;
        reps: number | string;
        restTime: string;
        notes?: string;
      }>;
    }>;
  }>;
}

export interface MesocycleResponse {
  planId: string;
  mesocycleNumber: number;
  mesocycleDetails: MesocycleDetails;
  generationComplete: boolean;
  nextStep?: {
    action: 'generate_mesocycle';
    mesocycleNumber: number;
    endpoint: string;
  };
}

export interface GenerationStatusResponse {
  planId: string;
  state: string;
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  currentMesocycle: number;
  timestamps: {
    started: string | null;
    completed: string | null;
  };
  errors: any[];
  nextAction?: {
    action: 'generate_mesocycle';
    mesocycleNumber: number;
    endpoint: string;
  };
}

// Request/Response types for specific operations
export interface WorkoutGenerationRequest {
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  goals: string[];               // ✅ Backend validation: required, min 1
  primaryGoal?: string;          // ✅ NEW: Optional primary goal field
  // Equipment will be resolved from user profile gym category
  restrictions?: string[];       // ✅ Backend validation: optional, default []
  exerciseTypes: string[];       // ✅ Backend validation: required, min 1
  workoutFrequency?: string;     // ✅ Backend validation: optional string
  additionalNotes?: string;      // ✅ Backend validation: max 500 chars
}

export interface WorkoutAdjustmentRequest {
  feedback: string;
  adjustmentType?: 'difficulty' | 'focus' | 'equipment' | 'schedule' | 'medical';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  preserveStructure?: boolean;
}

// AI Generation metadata
export interface AIGenerationMetadata {
  generationId: string;

  workoutAgent?: {
    sessionId: string;
    promptVersion: string;
    modelUsed: string;
    tokensUsed: number;
    processingTime: number;
  };
  qualityMetrics?: {
    exerciseDbMatches: number;
    safetyChecksPerformed: number;
    contradictionsIdentified: number;
    goalAlignmentScore: number;
  };
}

// ===== PHASE 4 DATABASE RESPONSE TYPES =====

// Multi-Goal Orchestrator Data (from orchestrator_data JSONB column)
export interface OrchestratorData {
  programStructure: MesocycleStructureItem[];
  trainingParameters: Record<string, TrainingParameters>;
  exercisePriorities: ExercisePriorities;
  progressionStrategy: ProgressionStrategy;
  recoveryRequirements: RecoveryRequirements;
  goalPriority: {
    primary: string;
    secondary: string[];
  };
  compatibility: CompatibilityAnalysis;
  promptInstructions: string;
  recommendations: string[];
  programDuration: number;
}

// Goal Strategy Data (from goal_strategy_data JSONB column)
export interface GoalStrategyData {
  strategies: Record<string, any>;
  trainingParameters: Record<string, TrainingParameters>;
  exercisePriorities: ExercisePriorities;
  progressionStrategy: ProgressionStrategy;
  recoveryRequirements: RecoveryRequirements;
}

// Training Frequency (from training_frequency JSONB column)
export interface TrainingFrequency {
  daysPerWeek: number;
  sessionsPerDay: number;
  restDays: string[];
}

// ===== AI RESPONSE SCHEMA TYPES (from multiGoalMesocycleSchema) =====

// Goal Structure (from AI response goalStructure)
export interface GoalStructure {
  primaryGoal: string; // Simple string, not complex object
  secondaryGoals?: string[]; // Array of simple strings
  goalPrioritization?: {
    primaryFocus: number; // 50-80%
    secondaryFocus: number; // 20-50%
  };
}

// Program Duration (from AI response programDuration)
export interface ProgramDuration {
  totalWeeks: number; // 8-16
  mesocycles: number; // 2-5
}

// Mesocycle Structure (from mesocycle_structure JSONB column)
export interface MesocycleStructure {
  mesocycleNumber: number;
  name: string;
  phase: string;
  durationWeeks: number;
  focus: string;
  trainingParameters: TrainingParameters;
  progressionStrategy: MesocycleProgressionStrategy;
  weeks: WeekStructure[];
}

// Week Structure (nested in mesocycles)
export interface WeekStructure {
  weekNumber: number;
  weekType: 'build' | 'overload' | 'intensification' | 'deload' | 'test' | 'peak';
  volumeMultiplier: number; // 0.4-1.3
  intensityRange: string;
  specialComponents?: SpecialComponents;
  workouts: Record<string, WorkoutSession | 'Rest'>;
  progressionNotes?: string;
}

// Workout Session (nested in weeks.workouts)
export interface WorkoutSession {
  sessionName: string;
  sessionType: 'strength' | 'hypertrophy' | 'metabolic' | 'power' | 'endurance' | 'mobility' | 'sport_specific' | 'hybrid';
  primaryGoalFocus: string;
  secondaryComponents?: string[];
  targetMuscles: string[];
  exercises: DetailedExercise[];
}

// Detailed Exercise (nested in workout sessions)
export interface DetailedExercise {
  exercise: string;
  category: 'compound' | 'isolation' | 'accessory' | 'cardio' | 'mobility';
  primaryMuscles: string[];
  sets: number;
  repsOrDuration: string | number;
  intensity?: string; // e.g., "75-80% 1RM"
  restSeconds?: number;
  tempo?: string; // e.g., "3-1-2-1"
  rpe?: number; // 1-10
  notes?: string;
  goalAlignment?: string[];
  progressionMethod?: string;
  equipment: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// ===== SUPPORTING TYPES =====

export interface TrainingParameters {
  frequency: number;
  intensity: string;
  volume: string;
  restPeriods: string;
  repRange: string;
  setRange: string;
  multiGoalAdjustments?: Record<string, any>;
  integrationNotes?: string[];
}

export interface ExercisePriorities {
  compound: number;
  isolation: number;
  functional?: number;
  cardio?: number;
  mobility?: number;
}

export interface ProgressionStrategy {
  primary: string;
  deloadFrequency?: number;
  overallMethod?: string;
  volumeProgression?: string;
  intensityProgression?: string;
}

export interface MesocycleProgressionStrategy {
  volumeProgression: 'linear' | 'undulating' | 'step' | 'wave';
  intensityProgression: 'linear' | 'undulating' | 'step' | 'wave';
  deloadWeek?: number;
}

export interface RecoveryRequirements {
  restBetweenSets: string;
  restBetweenSessions?: string;
  sleepRecommendation: string;
  activeRecoveryDays?: number;
  deloadWeekFrequency?: number;
}

export interface CompatibilityAnalysis {
  compatible: boolean;
  conflicts: string[];
  recommendations: string[];
}

export interface SpecialComponents {
  cardioIntegration?: string;
  mobilityWork?: boolean;
  plyometrics?: boolean;
  circuitTraining?: boolean;
  metabolicFinishers?: boolean;
  functionalMovements?: boolean;
  sportSpecificDrills?: boolean;
}

export interface MesocycleStructureItem {
  mesocycleNumber: number;
  name: string;
  weeks: number;
  focus: string;
  volumeProgression: string;
  intensityProgression: string;
  emphasis: string;
  strengthComponent?: boolean;
  hypertrophyComponent?: boolean;
  compoundEmphasis?: string;
}

// ===== ENHANCED WORKOUT PLAN TYPE (Phase 4 Complete) =====

export interface EnhancedWorkoutPlan extends WorkoutPlan, WorkoutPlanComputedProps {
  // Phase 4 Database Fields
  schemaVersion: string; // 'v1.0' | 'v2.0'
  generationMethod: 'single_goal' | 'multi_goal_orchestrated';
  programDurationWeeks: number; // 8-16
  mesocycleCount: number; // 1-5
  primaryGoal?: string; // From primary_goal column
  
  // Phase 4 JSONB Data
  trainingFrequency: TrainingFrequency;
  orchestratorData?: OrchestratorData; // null for single-goal plans
  mesocycleStructure?: MesocycleStructure[]; // null for legacy plans
  goalStrategyData: GoalStrategyData;
  
  // Enhanced plan_data structure
  planData: {
    // Legacy format (computed from structured data for backward compatibility)
    exercises: Exercise[];
    weeklySchedule: Record<string, any>;
    formattedPlan: string;
    
    // Structured output data (primary source - matches multiGoalMesocycleSchema)
    programName?: string;
    programDuration?: {
      totalWeeks: number;
      mesocycles: number;
    };
    goalStructure?: {
      primaryGoal: string;
      secondaryGoals?: string[];
      goalPrioritization?: {
        primaryFocus: number;
        secondaryFocus: number;
      };
    };
    trainingFrequency?: {
      daysPerWeek: number;
      sessionsPerDay?: number;
      restDays: string[];
    };
    mesocycles?: Array<{
      mesocycleNumber: number;
      name: string;
      phase: string;
      durationWeeks: number;
      focus: string;
      trainingParameters: any;
      progressionStrategy: any;
      weeks: Array<{
        weekNumber: number;
        weekType: string;
        workouts: Record<string, any>;
      }>;
    }>;
    progressionStrategy?: any;
    recoveryRequirements?: any;
    
    // Multi-goal orchestrator data (legacy support)
    orchestratedProgram?: OrchestratorData;
    aiResponse?: any; // Deprecated - data now in structured fields above
    
    // AI insights and reasoning
    explanations: string;
    reasoning: string;
    warnings: string[];
    errors: string[];
  };
  
  // Enhanced ai_reasoning structure
  aiReasoning: {
    reasoning: string;
    compatibility?: CompatibilityAnalysis;
    recommendations?: string[];
    promptInstructions?: string;
    goalPriority?: {
      primary: string;
      secondary: string[];
    };
  };
}

/**
 * Computed properties for legacy compatibility
 */
export interface WorkoutPlanComputedProps {
  /** Total exercise count across all mesocycles */
  readonly totalExercises: number;
  
  /** Primary training days from first mesocycle */
  readonly trainingDays: string[];
  
  /** Program overview summary */
  readonly programSummary: string;
}

// Service method options
export interface RequestOptions {
  timeout?: number;
  skipAuth?: boolean;
  retries?: number;
  skipCache?: boolean;
}