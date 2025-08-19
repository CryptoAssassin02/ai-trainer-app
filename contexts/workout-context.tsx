'use client'

// Note: Backend API calls will be handled via the apiClient
import { useOpenAI } from '@/utils/ai/openai'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useProfile, UserProfile } from '@/lib/profile-context'
import { useToast } from '@/components/ui/use-toast'
// @ts-ignore - UUID import
import { v4 as uuidv4 } from 'uuid'
// Import our new agent classes
import { 
  ResearchAgent,
  WorkoutGenerationAgent,
  PlanAdjustmentAgent,
  NutritionAgent,
  AgentMemorySystem,
  AgentInputType,
  AgentResultType
} from '@/utils/ai/workout-generation'
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

// Define TypeScript types for our workout context
type WorkoutAgentType = 'research' | 'generation' | 'adjustment' | 'reflection'

interface ExerciseType {
  id?: string
  name: string
  sets: number
  repsMin: number
  repsMax: number
  notes?: string
  imageUrl?: string
  technique?: string
  targetMuscles: string[]
  equipment: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  weight?: number
  restTime?: string
  alternatives?: string[]
  videoUrl?: string
}

interface WorkoutPlanType {
  id?: string
  user_id?: string
  title: string
  description: string
  duration: string
  sessions: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  exercises: ExerciseType[]
  createdAt?: string
  updatedAt?: string
  notes?: string
  estimatedCaloriesBurn?: number
  tags?: string[]
}

interface WorkoutProgressType {
  id?: string
  user_id?: string
  plan_id?: string
  exercise_name: string
  sets_completed: number
  reps_completed: number[]
  weight_used: number[]
  duration?: number
  notes?: string
  difficulty_rating?: number
  completed_at?: string
  created_at?: string
}

interface WorkoutCheckInType {
  id?: string
  user_id?: string
  check_in_date: string
  weight?: number
  body_fat_percentage?: number
  muscle_mass?: number
  measurements?: {
    chest?: number
    waist?: number
    hips?: number
    arms?: number
    thighs?: number
  }
  energy_level?: number
  motivation_level?: number
  workout_satisfaction?: number
  sleep_quality?: number
  stress_level?: number
  notes?: string
  progress_photos?: string[]
  goals_update?: string[]
  challenges?: string[]
  achievements?: string[]
  created_at?: string
}

interface AgentMessageType {
  agent: WorkoutAgentType | 'user'
  message: string
  timestamp: Date
  type: 'info' | 'success' | 'error' | 'warning' | 'user'
  data?: any
}

// Define the context type
interface WorkoutContextType {
  // State
  workoutPlans: WorkoutPlanType[]
  selectedPlan: WorkoutPlanType | null
  userProgress: WorkoutProgressType[]
  userCheckIns: WorkoutCheckInType[]
  isGenerating: boolean
  generationStatus: 'idle' | 'researching' | 'generating' | 'complete' | 'error'
  generationProgress: number
  currentAgent: WorkoutAgentType | null
  agentMessages: AgentMessageType[]
  workoutLogs: WorkoutProgressType[]
  checkInHistory: WorkoutCheckInType[]
  currentPlan: WorkoutPlanType | null
  
  // Functions
  generateWorkoutPlan: (goals: string[], preferences: Record<string, any>) => Promise<void>
  adjustWorkoutPlan: (planId: string, feedback: string) => Promise<void>
  saveWorkoutPlan: (plan: WorkoutPlanType) => Promise<string | null>
  deleteWorkoutPlan: (planId: string) => Promise<boolean>
  logWorkoutProgress: (progress: WorkoutProgressType) => Promise<string | null>
  logCheckIn: (checkIn: WorkoutCheckInType) => Promise<string | null>
  submitCheckIn: (checkIn: WorkoutCheckInType) => Promise<boolean>
  fetchUserWorkoutPlans: (userId?: string) => Promise<void>
  fetchWorkoutPlan: (planId: string) => Promise<WorkoutPlanType | null>
  getWorkoutLogs: (userId?: string) => Promise<WorkoutProgressType[]>
  getCheckInHistory: (userId?: string) => Promise<WorkoutCheckInType[]>
  setSelectedPlan: (plan: WorkoutPlanType | null) => void
  clearGenerationState: () => void
}

// Create the workout context
const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined)

// Create the provider component
export function WorkoutProvider({ children }: { children: ReactNode }) {
  // TEMPORARILY DISABLED: Workout features until Phase 3 implementation
  // Backend API calls will be handled via our API client instead of direct Supabase
  const { profile } = useProfile()
  const { toast } = useToast()
  const openai = useOpenAI()
  
  // Early return with disabled context until backend integration is complete
  const disabledContextValue: WorkoutContextType = {
    // State
    workoutPlans: [],
    selectedPlan: null,
    userProgress: [],
    userCheckIns: [],
    isGenerating: false,
    generationStatus: 'idle',
    generationProgress: 0,
    currentAgent: null,
    agentMessages: [],
    workoutLogs: [],
    checkInHistory: [],
    currentPlan: null,
    
    // Functions (all disabled)
    generateWorkoutPlan: async (_goals: string[], _preferences: Record<string, any>) => { console.log('Workout generation disabled until backend integration'); },
    adjustWorkoutPlan: async (_planId: string, _feedback: string) => { console.log('Workout adjustment disabled until backend integration'); },
    saveWorkoutPlan: async (_plan: WorkoutPlanType) => { console.log('Workout saving disabled until backend integration'); return null; },
    deleteWorkoutPlan: async (_planId: string) => { console.log('Workout deletion disabled until backend integration'); return false; },
    logWorkoutProgress: async (_progress: WorkoutProgressType) => { console.log('Workout logging disabled until backend integration'); return null; },
    logCheckIn: async (_checkIn: WorkoutCheckInType) => { console.log('Check-in logging disabled until backend integration'); return null; },
    submitCheckIn: async (_checkIn: WorkoutCheckInType) => { console.log('Check-in disabled until backend integration'); return false; },
    fetchUserWorkoutPlans: async (_userId?: string) => { console.log('Workout plan fetching disabled until backend integration'); },
    fetchWorkoutPlan: async (_planId: string) => { console.log('Individual workout plan fetching disabled until backend integration'); return null; },
    getWorkoutLogs: async (_userId?: string) => { console.log('Workout log fetching disabled until backend integration'); return []; },
    getCheckInHistory: async (_userId?: string) => { console.log('Check-in history fetching disabled until backend integration'); return []; },
    setSelectedPlan: (_plan: WorkoutPlanType | null) => { console.log('Plan selection disabled until backend integration'); },
    clearGenerationState: () => { console.log('Generation state clearing disabled until backend integration'); },
  };
  
  return (
    <WorkoutContext.Provider value={disabledContextValue}>
      {children}
    </WorkoutContext.Provider>
  )
}

// Create a hook to use the workout context
export function useWorkout() {
  const context = useContext(WorkoutContext)
  
  if (context === undefined) {
    throw new Error('useWorkout must be used within a WorkoutProvider')
  }
  
  return context
}

// Export types for use in other files
export type {
  WorkoutAgentType,
  ExerciseType,
  WorkoutPlanType,
  WorkoutProgressType,
  WorkoutCheckInType,
  AgentMessageType,
  WorkoutContextType
}
