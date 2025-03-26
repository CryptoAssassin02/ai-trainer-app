'use client'

// @ts-ignore - Supabase client import
import { createClient } from '@/lib/supabase/client'
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
  level: string
  tags: string[]
  exercises: ExerciseType[]
  created_at?: string
  updated_at?: string
  instructions?: string
  goals?: string[]
  ai_reasoning?: WorkoutGenerationReasoning
}

interface WorkoutProgressType {
  id?: string
  user_id?: string
  plan_id: string
  date: string
  completed: boolean
  exercises_completed: {
    exercise_id: string
    sets_completed: number
    reps_completed: number[]
    weights_used: number[]
    felt_difficulty: number // 1-10 scale
    notes?: string
  }[]
  overall_difficulty: number // 1-10 scale
  energy_level: number // 1-10 scale
  satisfaction: number // 1-10 scale
  feedback?: string
}

interface WorkoutCheckInType {
  id?: string
  user_id?: string
  date: string
  weight?: number
  body_fat_percentage?: number
  measurements?: {
    chest?: number
    waist?: number
    hips?: number
    arms?: number
    thighs?: number
  }
  mood: 'poor' | 'fair' | 'good' | 'excellent'
  sleep_quality: 'poor' | 'fair' | 'good' | 'excellent'
  energy_level: number // 1-10 scale
  stress_level: number // 1-10 scale
  notes?: string
}

interface AgentMessageType {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface WorkoutGenerationReasoning {
  research: {
    profile_analysis: string
    goal_identification: string
    constraint_evaluation: string
    training_history?: string
  }
  analysis: {
    volume_optimization: string
    frequency_determination: string
    exercise_selection: string
    progression_model: string
  }
  recommendation: {
    program_structure: string
    workout_design: string
    cardio_integration?: string
    nutrition_guidelines?: string
    progress_tracking: string
  }
}

interface WorkoutContextType {
  // State
  workoutPlans: WorkoutPlanType[]
  selectedPlan: WorkoutPlanType | null
  userProgress: WorkoutProgressType[]
  userCheckIns: WorkoutCheckInType[]
  generationStatus: 'idle' | 'researching' | 'generating' | 'adjusting' | 'complete' | 'error'
  generationProgress: number // 0-100
  currentAgent: WorkoutAgentType | null
  agentMessages: AgentMessageType[]
  
  // Functions
  fetchUserWorkoutPlans: () => Promise<void>
  fetchWorkoutPlan: (planId: string) => Promise<WorkoutPlanType | null>
  generateWorkoutPlan: (goals: string[], preferences: Record<string, any>) => Promise<void>
  adjustWorkoutPlan: (planId: string, feedback: string) => Promise<void>
  saveWorkoutPlan: (plan: WorkoutPlanType) => Promise<string | null>
  deleteWorkoutPlan: (planId: string) => Promise<boolean>
  
  // Progress tracking
  logWorkoutProgress: (progress: WorkoutProgressType) => Promise<string | null>
  logCheckIn: (checkIn: WorkoutCheckInType) => Promise<string | null>
  getProgressHistory: (planId: string) => Promise<WorkoutProgressType[]>
  getCheckInHistory: () => Promise<WorkoutCheckInType[]>
  
  // Agent interaction
  sendMessageToAgent: (message: string) => Promise<void>
  resetAgentConversation: () => void
}

// Create the workout context
const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined)

// Create the provider component
export function WorkoutProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const { profile } = useProfile()
  const { toast } = useToast()
  const openai = useOpenAI()
  
  // State for workout plans and progress
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlanType[]>([])
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlanType | null>(null)
  const [userProgress, setUserProgress] = useState<WorkoutProgressType[]>([])
  const [userCheckIns, setUserCheckIns] = useState<WorkoutCheckInType[]>([])
  
  // State for AI generation
  const [generationStatus, setGenerationStatus] = useState<WorkoutContextType['generationStatus']>('idle')
  const [generationProgress, setGenerationProgress] = useState(0)
  const [currentAgent, setCurrentAgent] = useState<WorkoutAgentType | null>(null)
  const [agentMessages, setAgentMessages] = useState<AgentMessageType[]>([])
  
  // Get user ID - since we don't have an id in the profile, we'll use name as a unique identifier
  // or create a temporary ID for testing purposes
  const getUserId = () => {
    // In a real implementation, this would be the user's authenticated ID
    // For now, we'll use the profile name or a session-based ID
    return profile?.name || sessionStorage.getItem('tempUserId') || createTempUserId()
  }
  
  // Create a temporary user ID for demo purposes
  const createTempUserId = () => {
    const tempId = uuidv4()
    sessionStorage.setItem('tempUserId', tempId)
    return tempId
  }
  
  // Fetch user's workout plans on mount
  useEffect(() => {
    if (profile?.name) {
      fetchUserWorkoutPlans()
      getCheckInHistory()
    }
  }, [profile?.name])
  
  /**
   * Fetch all workout plans for the current user
   */
  const fetchUserWorkoutPlans = async () => {
    const userId = getUserId()
    if (!userId) return
    
    try {
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setWorkoutPlans(data || [])
    } catch (error) {
      console.error('Error fetching workout plans:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch your workout plans',
        variant: 'destructive',
      })
    }
  }
  
  /**
   * Fetch a specific workout plan by ID
   */
  const fetchWorkoutPlan = async (planId: string) => {
    try {
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('id', planId)
        .single()
      
      if (error) throw error
      
      setSelectedPlan(data)
      return data
    } catch (error) {
      console.error('Error fetching workout plan:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch workout plan details',
        variant: 'destructive',
      })
      return null
    }
  }
  
  /**
   * Generate a new workout plan based on user goals and preferences
   */
  const generateWorkoutPlan = async (goals: string[], preferences: Record<string, any>) => {
    if (!profile) {
      toast({
        title: 'Profile Required',
        description: 'Please complete your profile before generating a workout plan',
        variant: 'destructive',
      })
      return
    }
    
    try {
      // Reset state for new generation
      setGenerationStatus('researching')
      setGenerationProgress(10)
      setCurrentAgent('research')
      resetAgentConversation()
      
      // Create agent memory system
      const userId = getUserId()
      const memorySystem = new AgentMemorySystem(userId)
      
      // Initialize agents
      const researchAgent = new ResearchAgent()
      const workoutGenerationAgent = new WorkoutGenerationAgent()
      const nutritionAgent = new NutritionAgent()
      
      // Add initial system message for research agent
      const researchSystemPrompt = `You are a fitness research agent. Your job is to analyze the user's profile, goals, and preferences to provide insights for workout plan generation. Consider their fitness level, experience, any limitations, and specific goals.`
      
      setAgentMessages([
        { role: 'system', content: researchSystemPrompt },
      ])
      
      // Execute research agent
      const agentInput: AgentInputType = {
        profile: profile,
        goals: goals,
        preferences: preferences
      }
      
      // Run the research agent with visible reasoning
      const researchResult = await researchAgent.process(agentInput)
      
      // Convert OpenAI message format to our AgentMessageType
      const convertedResearchMessages = researchResult.messages.map(msg => ({
        role: msg.role === 'system' || msg.role === 'user' || msg.role === 'assistant' 
          ? msg.role 
          : 'system',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
      })) as AgentMessageType[]
      
      setAgentMessages(prev => [...prev, ...convertedResearchMessages])
      memorySystem.storeResult('research', researchResult)
      
      if (!researchResult.success) {
        throw new Error(researchResult.error || 'Research phase failed')
      }
      
      // Show research phase reasoning in UI
      setAgentMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: `## Research Phase Reasoning\n\n${researchResult.reasoning}` 
        }
      ])
      
      setGenerationProgress(30)
      
      // Move to generation phase
      setGenerationStatus('generating')
      setCurrentAgent('generation')
      
      // Execute workout generation agent with research results
      const generationInput: AgentInputType = {
        profile: profile,
        goals: goals,
        preferences: preferences,
        previousResults: researchResult.data,
        messages: researchResult.messages
      }
      
      const generationResult = await workoutGenerationAgent.process(generationInput)
      
      // For the generation result messages
      const convertedGenerationMessages = generationResult.messages.map(msg => ({
        role: msg.role === 'system' || msg.role === 'user' || msg.role === 'assistant' 
          ? msg.role 
          : 'system',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
      })) as AgentMessageType[]
      
      setAgentMessages(prev => [...prev, ...convertedGenerationMessages])
      memorySystem.storeResult('generation', generationResult)
      
      if (!generationResult.success) {
        throw new Error(generationResult.error || 'Plan generation failed')
      }
      
      // Show generation phase reasoning in UI
      setAgentMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: `## Plan Generation Reasoning\n\n${generationResult.reasoning}` 
        }
      ])
      
      setGenerationProgress(70)
      
      // Optional nutrition recommendations
      if (preferences.includeNutrition) {
        const nutritionInput: AgentInputType = {
          profile: profile,
          goals: goals,
          preferences: preferences,
          previousResults: generationResult.data
        }
        
        const nutritionResult = await nutritionAgent.process(nutritionInput)
        
        // For nutrition result messages
        const convertedNutritionMessages = nutritionResult.messages.map(msg => ({
          role: msg.role === 'system' || msg.role === 'user' || msg.role === 'assistant' 
            ? msg.role 
            : 'system',
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
        })) as AgentMessageType[]
        
        setAgentMessages(prev => [...prev, ...convertedNutritionMessages])
        memorySystem.storeResult('nutrition', nutritionResult)
        
        // Add nutrition data to the workout plan
        generationResult.data.nutritionRecommendations = nutritionResult.data
      }
      
      // Prepare workout plan for saving with all required properties
      const workoutPlan: WorkoutPlanType = {
        ...generationResult.data,
        title: generationResult.data.title || 'Custom Workout Plan',
        description: generationResult.data.description || 'AI-generated workout plan',
        duration: generationResult.data.duration || '4 weeks',
        sessions: generationResult.data.sessions || 3,
        level: generationResult.data.level || 'beginner',
        tags: generationResult.data.tags || [],
        exercises: generationResult.data.exercises || [],
        user_id: getUserId(),
        ai_reasoning: {
          research: {
            profile_analysis: researchResult.data.profile_analysis || '',
            goal_identification: researchResult.data.goal_identification || '',
            constraint_evaluation: researchResult.data.training_recommendations || '',
            training_history: ''
          },
          analysis: {
            volume_optimization: generationResult.data.reasoning?.volumeOptimization || '',
            frequency_determination: generationResult.data.reasoning?.frequencyDetermination || '',
            exercise_selection: generationResult.data.reasoning?.exerciseSelection || '',
            progression_model: generationResult.data.reasoning?.progressionModel || ''
          },
          recommendation: {
            program_structure: generationResult.data.reasoning?.programStructure || '',
            workout_design: generationResult.data.reasoning?.workoutDesign || '',
            cardio_integration: generationResult.data.reasoning?.cardioIntegration || '',
            nutrition_guidelines: preferences.includeNutrition ? 'Included in nutrition recommendations' : '',
            progress_tracking: generationResult.data.reasoning?.progressTracking || ''
          }
        }
      }
      
      setGenerationProgress(90)
      
      // Save plan to database
      const planId = await saveWorkoutPlan(workoutPlan)
      
      if (planId) {
        // Fetch the saved plan with its ID
        await fetchWorkoutPlan(planId)
      }
      
      setGenerationStatus('complete')
      setGenerationProgress(100)
      
      toast({
        title: 'Workout Plan Generated',
        description: 'Your custom workout plan is ready!',
      })
      
    } catch (error) {
      console.error('Error generating workout plan:', error)
      setGenerationStatus('error')
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate workout plan. Please try again.',
        variant: 'destructive',
      })
    }
  }
  
  /**
   * Adjust an existing workout plan based on user feedback
   */
  const adjustWorkoutPlan = async (planId: string, feedback: string) => {
    if (!profile) {
      toast({
        title: 'Profile Required',
        description: 'Please complete your profile before adjusting a workout plan',
        variant: 'destructive',
      })
      return
    }
    
    try {
      // Reset state for adjustment
      setGenerationStatus('adjusting')
      setGenerationProgress(30)
      setCurrentAgent('adjustment')
      
      // Fetch the current plan
      const currentPlan = await fetchWorkoutPlan(planId)
      
      if (!currentPlan) {
        throw new Error('Failed to retrieve workout plan for adjustment')
      }
      
      // Create adjustment agent
      const adjustmentAgent = new PlanAdjustmentAgent()
      
      // Create input for the adjustment agent
      const adjustmentInput: AgentInputType = {
        profile: profile,
        goals: currentPlan.goals || [],
        preferences: {},
        previousResults: { data: currentPlan },
        feedback: feedback,
        planId: planId
      }
      
      // Execute adjustment agent
      const adjustmentResult = await adjustmentAgent.process(adjustmentInput)
      
      if (!adjustmentResult.success) {
        throw new Error(adjustmentResult.error || 'Plan adjustment failed')
      }
      
      // Convert the adjusted plan to match our WorkoutPlanType
      const adjustedPlan: WorkoutPlanType = {
        ...currentPlan,
        ...adjustmentResult.data,
        title: adjustmentResult.data.title || currentPlan.title,
        description: adjustmentResult.data.description || currentPlan.description,
        duration: adjustmentResult.data.duration || currentPlan.duration,
        sessions: adjustmentResult.data.sessions || currentPlan.sessions,
        level: adjustmentResult.data.level || currentPlan.level,
        tags: adjustmentResult.data.tags || currentPlan.tags,
        exercises: adjustmentResult.data.exercises || currentPlan.exercises,
        user_id: currentPlan.user_id || getUserId(),
        // Additional adjustment information
        updated_at: new Date().toISOString()
      }
      
      // Show adjustment reasoning in UI
      setAgentMessages([
        { role: 'system', content: 'You are a fitness plan adjustment agent.' },
        { role: 'user', content: `Adjust the workout plan with ID ${planId} based on this feedback: ${feedback}` },
        { 
          role: 'assistant', 
          content: `## Plan Adjustment\n\n${adjustmentResult.reasoning}` 
        }
      ])
      
      // Save the adjusted plan
      const adjustedPlanId = await saveWorkoutPlan(adjustedPlan)
      
      if (adjustedPlanId) {
        // Fetch the saved plan with its ID
        await fetchWorkoutPlan(adjustedPlanId)
      }
      
      setGenerationStatus('complete')
      setGenerationProgress(100)
      
      toast({
        title: 'Workout Plan Adjusted',
        description: 'Your workout plan has been adjusted based on your feedback.',
      })
      
    } catch (error) {
      console.error('Error adjusting workout plan:', error)
      setGenerationStatus('error')
      toast({
        title: 'Adjustment Failed',
        description: 'Failed to adjust workout plan. Please try again.',
        variant: 'destructive',
      })
    }
  }
  
  /**
   * Save a workout plan to the database
   */
  const saveWorkoutPlan = async (plan: WorkoutPlanType): Promise<string | null> => {
    const userId = getUserId()
    if (!userId) return null
    
    try {
      const planWithUserId = {
        ...plan,
        user_id: plan.user_id || userId,
      }
      
      if (plan.id) {
        // Update existing plan
        const { error } = await supabase
          .from('workout_plans')
          .update(planWithUserId)
          .eq('id', plan.id)
        
        if (error) throw error
        
        return plan.id
      } else {
        // Insert new plan
        const { data, error } = await supabase
          .from('workout_plans')
          .insert(planWithUserId)
          .select()
        
        if (error) throw error
        
        // Update local state
        await fetchUserWorkoutPlans()
        
        return data?.[0]?.id || null
      }
    } catch (error) {
      console.error('Error saving workout plan:', error)
      toast({
        title: 'Error',
        description: 'Failed to save workout plan',
        variant: 'destructive',
      })
      return null
    }
  }
  
  /**
   * Delete a workout plan
   */
  const deleteWorkoutPlan = async (planId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('workout_plans')
        .delete()
        .eq('id', planId)
      
      if (error) throw error
      
      // Update local state
      setWorkoutPlans(prev => prev.filter(plan => plan.id !== planId))
      if (selectedPlan?.id === planId) {
        setSelectedPlan(null)
      }
      
      toast({
        title: 'Plan Deleted',
        description: 'Workout plan has been deleted',
      })
      
      return true
    } catch (error) {
      console.error('Error deleting workout plan:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete workout plan',
        variant: 'destructive',
      })
      return false
    }
  }
  
  /**
   * Log workout progress
   */
  const logWorkoutProgress = async (progress: WorkoutProgressType): Promise<string | null> => {
    const userId = getUserId()
    if (!userId) return null
    
    try {
      const progressWithUserId = {
        ...progress,
        user_id: progress.user_id || userId,
        date: progress.date || new Date().toISOString().split('T')[0],
      }
      
      const { data, error } = await supabase
        .from('workout_progress')
        .insert(progressWithUserId)
        .select()
      
      if (error) throw error
      
      // Update local state
      setUserProgress(prev => [...prev, {...progressWithUserId, id: data?.[0]?.id}])
      
      toast({
        title: 'Progress Logged',
        description: 'Your workout progress has been saved',
      })
      
      return data?.[0]?.id || null
    } catch (error) {
      console.error('Error logging workout progress:', error)
      toast({
        title: 'Error',
        description: 'Failed to log workout progress',
        variant: 'destructive',
      })
      return null
    }
  }
  
  /**
   * Log user check-in data
   */
  const logCheckIn = async (checkIn: WorkoutCheckInType): Promise<string | null> => {
    const userId = getUserId()
    if (!userId) return null
    
    try {
      const checkInWithUserId = {
        ...checkIn,
        user_id: checkIn.user_id || userId,
        date: checkIn.date || new Date().toISOString().split('T')[0],
      }
      
      const { data, error } = await supabase
        .from('user_check_ins')
        .insert(checkInWithUserId)
        .select()
      
      if (error) throw error
      
      // Update local state
      setUserCheckIns(prev => [...prev, {...checkInWithUserId, id: data?.[0]?.id}])
      
      toast({
        title: 'Check-in Logged',
        description: 'Your fitness check-in has been saved',
      })
      
      return data?.[0]?.id || null
    } catch (error) {
      console.error('Error logging check-in:', error)
      toast({
        title: 'Error',
        description: 'Failed to log check-in data',
        variant: 'destructive',
      })
      return null
    }
  }
  
  /**
   * Get progress history for a specific plan
   */
  const getProgressHistory = async (planId: string): Promise<WorkoutProgressType[]> => {
    const userId = getUserId()
    if (!userId) return []
    
    try {
      const { data, error } = await supabase
        .from('workout_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('plan_id', planId)
        .order('date', { ascending: false })
      
      if (error) throw error
      
      return data || []
    } catch (error) {
      console.error('Error fetching progress history:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch workout progress history',
        variant: 'destructive',
      })
      return []
    }
  }
  
  /**
   * Get user check-in history
   */
  const getCheckInHistory = async (): Promise<WorkoutCheckInType[]> => {
    const userId = getUserId()
    if (!userId) return []
    
    try {
      const { data, error } = await supabase
        .from('user_check_ins')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
      
      if (error) throw error
      
      setUserCheckIns(data || [])
      return data || []
    } catch (error) {
      console.error('Error fetching check-in history:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch check-in history',
        variant: 'destructive',
      })
      return []
    }
  }
  
  /**
   * Send a message to the current agent
   */
  const sendMessageToAgent = async (message: string) => {
    if (!currentAgent) return
    
    setAgentMessages(prev => [...prev, { role: 'user', content: message }])
    
    try {
      const messages = [
        ...agentMessages,
        { role: 'user' as const, content: message }
      ]
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        temperature: 0.7,
      })
      
      const response = completion.choices[0].message.content || ''
      setAgentMessages(prev => [...prev, { role: 'assistant', content: response }])
    } catch (error) {
      console.error('Error sending message to agent:', error)
      toast({
        title: 'Error',
        description: 'Failed to communicate with AI agent',
        variant: 'destructive',
      })
    }
  }
  
  /**
   * Reset the agent conversation
   */
  const resetAgentConversation = () => {
    setAgentMessages([])
  }
  
  /**
   * Helper function to extract insights from AI responses
   */
  const extractInsight = (text: string, sectionTitle: string): string => {
    const regex = new RegExp(`${sectionTitle}[:\\s-]+(.*?)(?=\\n\\s*\\n|\\n\\s*[A-Z#]|$)`, 'is')
    const match = text.match(regex)
    return match ? match[1].trim() : ''
  }
  
  /**
   * Helper function to extract JSON from AI responses
   */
  const extractJsonFromResponse = (text: string): WorkoutPlanType | null => {
    try {
      // First try to find JSON between ```json and ```
      const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```/
      const jsonMatch = text.match(jsonRegex)
      
      if (jsonMatch && jsonMatch[1]) {
        return JSON.parse(jsonMatch[1])
      }
      
      // If that fails, try to find JSON between { and }
      const braceRegex = /{[\s\S]*}/
      const braceMatch = text.match(braceRegex)
      
      if (braceMatch) {
        return JSON.parse(braceMatch[0])
      }
      
      // If all else fails, try to parse the entire text as JSON
      return JSON.parse(text)
    } catch (error) {
      console.error('Error parsing JSON from response:', error)
      return null
    }
  }
  
  // Combine all values and functions into the context value
  const contextValue: WorkoutContextType = {
    workoutPlans,
    selectedPlan,
    userProgress,
    userCheckIns,
    generationStatus,
    generationProgress,
    currentAgent,
    agentMessages,
    
    fetchUserWorkoutPlans,
    fetchWorkoutPlan,
    generateWorkoutPlan,
    adjustWorkoutPlan,
    saveWorkoutPlan,
    deleteWorkoutPlan,
    
    logWorkoutProgress,
    logCheckIn,
    getProgressHistory,
    getCheckInHistory,
    
    sendMessageToAgent,
    resetAgentConversation,
  }
  
  return (
    <WorkoutContext.Provider value={contextValue}>
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
  WorkoutGenerationReasoning,
  AgentMessageType,
} 