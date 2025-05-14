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
  fetchUserWorkoutPlans: (userId?: string | null) => Promise<void>
  fetchWorkoutPlan: (planId: string) => Promise<WorkoutPlanType | null>
  generateWorkoutPlan: (goals: string[], preferences: Record<string, any>) => Promise<void>
  adjustWorkoutPlan: (planId: string, feedback: string) => Promise<void>
  saveWorkoutPlan: (plan: WorkoutPlanType) => Promise<string | null>
  deleteWorkoutPlan: (planId: string) => Promise<boolean>
  
  // Progress tracking
  logWorkoutProgress: (progress: WorkoutProgressType) => Promise<string | null>
  logCheckIn: (checkIn: WorkoutCheckInType) => Promise<string | null>
  getProgressHistory: (planId: string) => Promise<WorkoutProgressType[]>
  getCheckInHistory: (userId?: string | null) => Promise<WorkoutCheckInType[]>
  
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
  const getUserId = async (): Promise<string | null> => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Error getting Supabase session:', sessionError);
      return null;
    }
    if (!session?.user?.id) {
      console.error('No active user session found.');
      // Optionally try temp ID as fallback if needed for specific flows,
      // but primary operations should rely on auth.uid()
      return sessionStorage.getItem('tempUserId') || null;
    }
    return session.user.id; // Return the actual authenticated user ID
  }
  
  // Fetch user's workout plans on mount
  useEffect(() => {
    // Use an async IIFE to call async getUserId if needed here
    // Or adjust fetchUserWorkoutPlans/getCheckInHistory to accept userId
    (async () => {
      const userId = await getUserId();
      if (userId) {
        // Pass userId to functions if they need it, or they can call getUserId internally
        fetchUserWorkoutPlans(userId);
        getCheckInHistory(userId);
      }
    })();
  }, [profile]); // Dependency array might need adjustment based on actual auth flow
  
  // Transformation Helper Function (can be defined outside or inside the provider)
  const transformDbPlanToFrontend = (dbPlan: any): WorkoutPlanType | null => {
    if (!dbPlan) return null;
    
    // Safely parse plan_data JSON
    let exercises: ExerciseType[] = [];
    if (dbPlan.plan_data) {
      try {
        const parsedExercises = typeof dbPlan.plan_data === 'string' 
          ? JSON.parse(dbPlan.plan_data) 
          : dbPlan.plan_data;
        if (Array.isArray(parsedExercises)) {
          exercises = parsedExercises as ExerciseType[];
        }
      } catch (e) {
        console.error(`Failed to parse plan_data for plan ${dbPlan.id}:`, e);
      }
    }
    
    // Safely parse ai_reasoning JSON
    let aiReasoning: WorkoutGenerationReasoning | undefined = undefined;
    if (dbPlan.ai_reasoning) {
      try {
        const parsedReasoning = typeof dbPlan.ai_reasoning === 'string' 
          ? JSON.parse(dbPlan.ai_reasoning) 
          : dbPlan.ai_reasoning;
        aiReasoning = parsedReasoning as WorkoutGenerationReasoning;
      } catch (e) {
        console.error(`Failed to parse ai_reasoning for plan ${dbPlan.id}:`, e);
      }
    }

    return {
      id: dbPlan.id,
      user_id: dbPlan.user_id,
      title: dbPlan.name || 'Untitled Plan',
      description: dbPlan.description || '',
      duration: dbPlan.estimated_duration ? `${dbPlan.estimated_duration} mins` : 'N/A',
      level: dbPlan.difficulty_level || 'Intermediate',
      sessions: dbPlan.schedule_frequency ? (parseInt(dbPlan.schedule_frequency.match(/^\d+/)?.[0] || '0', 10) || 0) : 0,
      tags: dbPlan.tags || [],
      exercises: exercises,
      created_at: dbPlan.created_at || undefined,
      updated_at: dbPlan.updated_at || undefined,
      instructions: undefined, // No direct mapping from DB shown
      goals: dbPlan.goals || [],
      ai_reasoning: aiReasoning,
    };
  };

  // Transformation Helper for Saving (Frontend to DB)
  const transformFrontendPlanToDb = (plan: WorkoutPlanType, userId: string) => {
    // Basic validation or defaults
    const estimatedDurationMatch = plan.duration.match(/^\d+/);
    const estimatedDuration = estimatedDurationMatch ? parseInt(estimatedDurationMatch[0], 10) : null;
    
    // Simple conversion for frequency - assumes format like "3x per week"
    const scheduleFrequency = plan.sessions > 0 ? `${plan.sessions}x per week` : null;
    
    return {
      // Fields matching DB schema
      id: plan.id, // Include if updating
      user_id: plan.user_id || userId,
      name: plan.title,
      description: plan.description,
      estimated_duration: estimatedDuration,
      difficulty_level: plan.level,
      schedule_frequency: scheduleFrequency,
      goals: plan.goals,
      tags: plan.tags,
      // Stringify JSON fields
      plan_data: JSON.stringify(plan.exercises || []),
      ai_reasoning: plan.ai_reasoning ? JSON.stringify(plan.ai_reasoning) : null,
      // Add other DB fields if necessary (e.g., ai_generated, status, version)
      // updated_at will likely be handled by DB trigger or Supabase
    };
  };

  // Transformation Helper for Logs (DB to Frontend)
  const transformDbLogToFrontend = (dbLog: any): WorkoutProgressType | null => {
     if (!dbLog) return null;
     
     let exercisesCompleted: WorkoutProgressType['exercises_completed'] = [];
      if (dbLog.exercises_completed) {
        try {
          const parsed = typeof dbLog.exercises_completed === 'string' 
            ? JSON.parse(dbLog.exercises_completed) 
            : dbLog.exercises_completed;
          if (Array.isArray(parsed)) {
            // TODO: Validate structure further
            exercisesCompleted = parsed;
          }
        } catch (e) {
          console.error(`Failed to parse exercises_completed for log ${dbLog.id}:`, e);
        }
      }

     return {
       id: dbLog.id,
       user_id: dbLog.user_id,
       plan_id: dbLog.plan_id || '', // Ensure plan_id is always string
       date: dbLog.date,
       completed: dbLog.completed || false,
       exercises_completed: exercisesCompleted,
       overall_difficulty: dbLog.overall_difficulty || 0,
       energy_level: dbLog.energy_level || 0,
       satisfaction: dbLog.satisfaction || 0,
       feedback: dbLog.feedback || undefined,
     };
   };

  // Transformation Helper for Check-ins (DB to Frontend)
  const transformDbCheckInToFrontend = (dbCheckIn: any): WorkoutCheckInType | null => {
    if (!dbCheckIn) return null;
    
    let measurements: WorkoutCheckInType['measurements'] = undefined;
    if (dbCheckIn.measurements) {
      try {
        const parsed = typeof dbCheckIn.measurements === 'string' 
          ? JSON.parse(dbCheckIn.measurements) 
          : dbCheckIn.measurements;
        // Basic check if it's an object - further validation could be added
        if (typeof parsed === 'object' && parsed !== null) {
          measurements = parsed;
        }
      } catch (e) {
        console.error(`Failed to parse measurements for check-in ${dbCheckIn.id}:`, e);
      }
    }

    // Explicitly map mood and sleep_quality to the expected union types or default
    const moodMap: { [key: string]: WorkoutCheckInType['mood'] } = {
      poor: 'poor', fair: 'fair', good: 'good', excellent: 'excellent'
    };
    const sleepQualityMap: { [key: string]: WorkoutCheckInType['sleep_quality'] } = {
      poor: 'poor', fair: 'fair', good: 'good', excellent: 'excellent'
    };

    return {
      id: dbCheckIn.id,
      user_id: dbCheckIn.user_id,
      date: dbCheckIn.date,
      // Convert null from DB to undefined for optional number fields
      weight: dbCheckIn.weight === null ? undefined : dbCheckIn.weight,
      body_fat_percentage: dbCheckIn.body_fat_percentage === null ? undefined : dbCheckIn.body_fat_percentage,
      measurements: measurements,
      mood: dbCheckIn.mood && moodMap[dbCheckIn.mood] ? moodMap[dbCheckIn.mood] : 'good', // Default if invalid
      sleep_quality: dbCheckIn.sleep_quality && sleepQualityMap[dbCheckIn.sleep_quality] ? sleepQualityMap[dbCheckIn.sleep_quality] : 'good', // Default if invalid
      energy_level: dbCheckIn.energy_level === null ? 0 : dbCheckIn.energy_level, // Default to 0
      stress_level: dbCheckIn.stress_level === null ? 0 : dbCheckIn.stress_level, // Default to 0
      notes: dbCheckIn.notes === null ? undefined : dbCheckIn.notes,
    };
  };

  /**
   * Fetch all workout plans for the current user
   */
  const fetchUserWorkoutPlans = async (userId?: string | null) => {
    const currentUserId = userId || await getUserId();
    if (!currentUserId) {
      console.error("User ID not available for fetching plans.");
      return;
    }
    
    try {
      const { data: dbData, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
      
      if (error) throw error;
      
      const transformedPlans = (dbData || []).map(transformDbPlanToFrontend).filter(p => p !== null) as WorkoutPlanType[];
      
      setWorkoutPlans(transformedPlans)
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
  const fetchWorkoutPlan = async (planId: string): Promise<WorkoutPlanType | null> => {
    try {
      const { data: dbPlan, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('id', planId)
        .single()
      
      if (error) throw error
      
      const transformedPlan = transformDbPlanToFrontend(dbPlan); // Transform here
      setSelectedPlan(transformedPlan) // Set state with transformed plan
      return transformedPlan // Return transformed plan
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
      const userId = await getUserId()
      if (!userId) {
        console.error("Cannot generate plan without user ID.");
        toast({ title: 'Error', description: 'User session not found.', variant: 'destructive' });
        setGenerationStatus('error');
        return;
      }
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
        user_id: userId,
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
      
      // Prepare the updated plan object
      const currentUserId = currentPlan.user_id || await getUserId();
      if (!currentUserId) {
        console.error("Cannot adjust plan without user ID.");
        toast({ title: 'Error', description: 'User session not found.', variant: 'destructive' });
        setGenerationStatus('error');
        return;
      }

      const updatedPlanData: WorkoutPlanType = {
        ...currentPlan,
        // Apply adjustments from AI
        title: adjustmentResult.data.title || currentPlan.title,
        description: adjustmentResult.data.description || currentPlan.description,
        duration: adjustmentResult.data.duration || currentPlan.duration,
        sessions: adjustmentResult.data.sessions || currentPlan.sessions,
        level: adjustmentResult.data.level || currentPlan.level,
        tags: adjustmentResult.data.tags || currentPlan.tags,
        exercises: adjustmentResult.data.exercises || currentPlan.exercises,
        user_id: currentUserId,
        // Additional adjustment information
        updated_at: new Date().toISOString()
      };
      
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
      const adjustedPlanId = await saveWorkoutPlan(updatedPlanData)
      
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
    const userId = await getUserId();
    if (!userId) return null;
    
    try {
      // Transform frontend plan to DB structure
      const dbPlanData = transformFrontendPlanToDb(plan, userId);

      if (plan.id) {
        // Update existing plan
        const { data, error } = await supabase
          .from('workout_plans')
          // Use transformed data, remove id explicitly if update expects no id in payload
          .update({ ...dbPlanData, id: undefined })
          .eq('id', plan.id)
          .eq('user_id', userId)
        
        if (error) throw error
        
        // Optimistically update local state or refetch
        await fetchUserWorkoutPlans(userId) // Refetch list after update
        if (selectedPlan?.id === plan.id) {
          setSelectedPlan(plan); // Update selected plan immediately
        }

        return plan.id
      } else {
        // Insert new plan
        const { data, error } = await supabase
          .from('workout_plans')
          .insert(dbPlanData) // Use transformed data
          .select()
          .single() // Expecting a single row back
        
        if (error) throw error
        
        // Update local state with the newly created plan (transform back if needed)
        if (data) {
           const newPlan = transformDbPlanToFrontend(data);
           if (newPlan) {
             setWorkoutPlans(prev => [newPlan, ...prev]);
             return newPlan.id || null;
           }
        }
        return null; // Return null if insert succeeded but no data returned
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
    const userId = await getUserId();
    if (!userId) return null;
    
    try {
      const progressWithUserId = {
        ...progress,
        user_id: progress.user_id || userId,
        date: progress.date || new Date().toISOString().split('T')[0],
      }
      
      const { data, error } = await supabase
        .from('workout_logs') // Corrected table name
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
    const userId = await getUserId();
    if (!userId) {
      console.error("Cannot log check-in without user ID.");
      toast({ title: 'Error', description: 'User session not found.', variant: 'destructive' });
      return null;
    }

    try {
      // Ensure user_id being inserted IS the authenticated user's ID
      const checkInWithUserId = {
        ...checkIn,
        user_id: userId,
        date: checkIn.date || new Date().toISOString().split('T')[0],
      };

      const { data, error } = await supabase
        .from('user_check_ins')
        .insert(checkInWithUserId)
        .select();

      if (error) throw error;

      setUserCheckIns(prev => [...prev, { ...checkInWithUserId, id: data?.[0]?.id }]);

      toast({
        title: 'Check-in Logged',
        description: 'Your fitness check-in has been saved',
      });

      return data?.[0]?.id || null;
    } catch (error) {
      console.error('Error logging check-in:', error);
      toast({
        title: 'Error',
        description: `Failed to log check-in data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
      return null;
    }
  }
  
  /**
   * Get progress history for a specific plan
   */
  const getProgressHistory = async (planId: string): Promise<WorkoutProgressType[]> => {
    const userId = await getUserId();
    if (!userId) return [];
    
    try {
      const { data: dbLogs, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('plan_id', planId)
        .order('date', { ascending: false });
      
      if (error) throw error
      
      // Transform logs
      const transformedLogs = (dbLogs || []).map(transformDbLogToFrontend).filter(l => l !== null) as WorkoutProgressType[];
      return transformedLogs
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
  const getCheckInHistory = async (userId?: string | null): Promise<WorkoutCheckInType[]> => {
    const currentUserId = userId || await getUserId();
    if (!currentUserId) return [];
    
    try {
      const { data: dbCheckIns, error } = await supabase
        .from('user_check_ins')
        .select('*')
        .eq('user_id', currentUserId)
        .order('date', { ascending: false });
      
      if (error) throw error
      
      // Transform check-ins
      const transformedCheckIns = (dbCheckIns || []).map(transformDbCheckInToFrontend).filter(c => c !== null) as WorkoutCheckInType[];
      
      setUserCheckIns(transformedCheckIns) // Set state with transformed data
      return transformedCheckIns // Return transformed data
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