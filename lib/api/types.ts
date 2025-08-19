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
  medicalConditions?: string; // single text field, max 1000 chars
  goals?: string[];
  workoutFrequency?: string;
  equipment?: string[];
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
  equipment?: string[];
  exercisePreferences?: string[]; // mapped to equipment field
  equipmentPreferences?: string[]; // mapped to equipment field
  medicalConditions?: string;
  workoutFrequency?: string;
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
  equipment?: string[];
  medicalConditions?: string;
  workoutFrequency?: string;
}

// Profile preferences type
export interface ProfilePreferences {
  userId: string;
  unitPreference: 'metric' | 'imperial';
  goals?: string[];
  equipment?: string[];
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  workoutFrequency?: string;
  updatedAt: string;
}

// Profile preferences update request
export interface UpdatePreferencesRequest {
  unitPreference?: 'metric' | 'imperial';
  goals?: string[];
  equipment?: string[];
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
  name: string;
  description?: string;
  exercises: Exercise[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number;
  equipmentRequired: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  researchInsights?: string[];
  reasoning?: string;
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

// Request/Response types for specific operations
export interface WorkoutGenerationRequest {
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  goals: string[];
  equipment: string[];
  restrictions?: string[];
  exerciseTypes?: string[];
  workoutFrequency?: string;
  workoutDuration?: number;
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
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
  researchAgent?: {
    sessionId: string;
    researchQueries: string[];
    sourcesConsulted: number;
    processingTime: number;
  };
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

// Service method options
export interface RequestOptions {
  timeout?: number;
  skipAuth?: boolean;
  retries?: number;
  skipCache?: boolean;
}