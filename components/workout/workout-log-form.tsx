"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, PlusIcon, MinusIcon, TrashIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircledIcon, CrossCircledIcon, ReloadIcon } from "@radix-ui/react-icons"
import { useWorkout } from "@/contexts/workout-context"

// Define the exercise log schema for a single exercise
const exerciseLogSchema = z.object({
  exercise_id: z.string(),
  exercise_name: z.string(),
  sets_completed: z.coerce.number().min(1),
  reps_completed: z.array(z.coerce.number().min(0)),
  weights_used: z.array(z.coerce.number().min(0)),
  felt_difficulty: z.coerce.number().min(1).max(10),
  notes: z.string().optional(),
})

// Define form schema with Zod
const workoutLogFormSchema = z.object({
  date: z.date({
    required_error: "A date is required.",
  }),
  plan_id: z.string(),
  exercises_completed: z.array(exerciseLogSchema).min(1, "At least one exercise must be logged"),
  overall_difficulty: z.coerce.number().min(1).max(10),
  energy_level: z.coerce.number().min(1).max(10),
  satisfaction: z.coerce.number().min(1).max(10),
  feedback: z.string().optional(),
})

type WorkoutLogFormValues = z.infer<typeof workoutLogFormSchema>

interface WorkoutLogFormProps {
  planId?: string
}

// Define a type for exercises in workout schedule
interface WorkoutExercise {
  id: string | undefined;
  name: string;
  sets: number;
  reps: number;
  rest_seconds: number;
}

// Define a type for days in workout schedule
interface WorkoutDay {
  day: string;
  exercises: WorkoutExercise[];
}

export function WorkoutLogForm({ planId }: WorkoutLogFormProps) {
  const { logWorkoutProgress, workoutPlans, fetchWorkoutPlan, selectedPlan } = useWorkout()
  const [loading, setLoading] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [availablePlans, setAvailablePlans] = useState<{id: string, name: string}[]>([])

  // Load selected plan or user's workout plans
  useEffect(() => {
    const loadPlans = async () => {
      if (planId) {
        setLoadingPlan(true)
        try {
          await fetchWorkoutPlan(planId)
        } catch (err) {
          console.error("Error loading plan:", err)
          setError("Failed to load workout plan")
        } finally {
          setLoadingPlan(false)
        }
      }
      
      // Use available workout plans for the dropdown
      if (workoutPlans.length > 0) {
        setAvailablePlans(workoutPlans.map(plan => ({
          id: plan.id || '',
          name: plan.title // Using title instead of name to match WorkoutPlanType
        })))
      }
    }
    
    loadPlans()
  }, [planId, fetchWorkoutPlan, workoutPlans])

  // Set default values
  const defaultValues: Partial<WorkoutLogFormValues> = {
    date: new Date(),
    plan_id: planId || '',
    exercises_completed: [],
    overall_difficulty: 5,
    energy_level: 5,
    satisfaction: 5,
  }

  // Initialize form
  const form = useForm<WorkoutLogFormValues>({
    resolver: zodResolver(workoutLogFormSchema),
    defaultValues,
  })

  // Setup field array for exercises
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "exercises_completed",
  })

  // Populate exercises when a plan is selected
  useEffect(() => {
    if (selectedPlan && form.getValues("exercises_completed").length === 0) {
      // Reset existing exercises
      while (fields.length > 0) {
        remove(0)
      }
      
      // Add exercises from the plan if it has a workout_schedule structure
      if (selectedPlan.exercises && Array.isArray(selectedPlan.exercises)) {
        selectedPlan.exercises.forEach(exercise => {
          const defaultSets = parseInt(exercise.sets?.toString() || "3");
          const defaultReps = exercise.repsMin ? exercise.repsMin : 8; // Use repsMin instead of reps
          
          append({
            exercise_id: exercise.id || exercise.name,
            exercise_name: exercise.name,
            sets_completed: defaultSets,
            reps_completed: Array(defaultSets).fill(defaultReps),
            weights_used: Array(defaultSets).fill(0),
            felt_difficulty: 5,
            notes: '',
          })
        })
      }
    }
  }, [selectedPlan, append, remove, fields.length, form])

  // Handle plan selection change
  const handlePlanChange = async (planId: string) => {
    if (planId) {
      setLoadingPlan(true)
      try {
        await fetchWorkoutPlan(planId)
        form.setValue("plan_id", planId)
      } catch (err) {
        console.error("Error loading plan:", err)
        setError("Failed to load workout plan")
      } finally {
        setLoadingPlan(false)
      }
    }
  }

  const onSubmit = async (data: WorkoutLogFormValues) => {
    setLoading(true)
    setError(null)
    setSuccess(false)
    
    try {
      // Format data for API
      const workoutProgress = {
        plan_id: data.plan_id,
        date: format(data.date, "yyyy-MM-dd"),
        completed: true,
        exercises_completed: data.exercises_completed,
        overall_difficulty: data.overall_difficulty,
        energy_level: data.energy_level,
        satisfaction: data.satisfaction,
        feedback: data.feedback,
      }
      
      // Log workout progress
      const result = await logWorkoutProgress(workoutProgress)
      
      if (result) {
        setSuccess(true)
        // Reset the form
        form.reset({
          ...defaultValues,
          plan_id: data.plan_id, // Keep the same plan selected
        })
      } else {
        throw new Error("Failed to save workout progress")
      }
    } catch (err) {
      console.error("Error saving workout progress:", err)
      setError("Failed to save your workout progress. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Add a new exercise to the form
  const addExercise = () => {
    append({
      exercise_id: '',
      exercise_name: '',
      sets_completed: 3,
      reps_completed: [8, 8, 8],
      weights_used: [0, 0, 0],
      felt_difficulty: 5,
      notes: '',
    })
  }

  // Add a set to an exercise
  const addSet = (index: number) => {
    const exercise = form.getValues(`exercises_completed.${index}`)
    const newReps = [...exercise.reps_completed, exercise.reps_completed[exercise.reps_completed.length - 1] || 8]
    const newWeights = [...exercise.weights_used, exercise.weights_used[exercise.weights_used.length - 1] || 0]
    
    form.setValue(`exercises_completed.${index}.sets_completed`, exercise.sets_completed + 1)
    form.setValue(`exercises_completed.${index}.reps_completed`, newReps)
    form.setValue(`exercises_completed.${index}.weights_used`, newWeights)
  }

  // Remove a set from an exercise
  const removeSet = (index: number) => {
    const exercise = form.getValues(`exercises_completed.${index}`)
    if (exercise.sets_completed <= 1) return
    
    const newReps = [...exercise.reps_completed]
    newReps.pop()
    const newWeights = [...exercise.weights_used]
    newWeights.pop()
    
    form.setValue(`exercises_completed.${index}.sets_completed`, exercise.sets_completed - 1)
    form.setValue(`exercises_completed.${index}.reps_completed`, newReps)
    form.setValue(`exercises_completed.${index}.weights_used`, newWeights)
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <CrossCircledIcon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="bg-green-50 text-green-900 border-green-200">
          <CheckCircledIcon className="h-4 w-4 text-green-600" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Your workout has been logged successfully!</AlertDescription>
        </Alert>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Date Field */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Workout Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Workout Plan Field */}
            <FormField
              control={form.control}
              name="plan_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workout Plan</FormLabel>
                  <Select 
                    onValueChange={(value) => handlePlanChange(value)} 
                    defaultValue={field.value}
                    disabled={loadingPlan}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a workout plan" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availablePlans.map(plan => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Exercises Completed</h3>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addExercise}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Exercise
              </Button>
            </div>
            
            {fields.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Select a workout plan or add exercises manually to log your workout.
              </p>
            )}
            
            {fields.map((field, index) => (
              <div key={field.id} className="border rounded-md p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Exercise {index + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Exercise Name */}
                  <FormField
                    control={form.control}
                    name={`exercises_completed.${index}.exercise_name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exercise Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Bench Press" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Difficulty */}
                  <FormField
                    control={form.control}
                    name={`exercises_completed.${index}.felt_difficulty`}
                    render={({ field: { value, onChange, ...fieldProps } }) => (
                      <FormItem>
                        <FormLabel>Difficulty (1-10): {value}</FormLabel>
                        <FormControl>
                          <Slider
                            min={1}
                            max={10}
                            step={1}
                            defaultValue={[value]}
                            onValueChange={(vals) => onChange(vals[0])}
                            {...fieldProps}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <FormLabel>Sets & Reps</FormLabel>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeSet(index)}
                        disabled={form.getValues(`exercises_completed.${index}.sets_completed`) <= 1}
                      >
                        <MinusIcon className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => addSet(index)}
                      >
                        <PlusIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-muted rounded-md p-2">
                    <div className="grid grid-cols-12 gap-2 font-medium text-sm mb-2">
                      <div className="col-span-2 text-center">Set</div>
                      <div className="col-span-5 text-center">Reps</div>
                      <div className="col-span-5 text-center">Weight</div>
                    </div>
                    
                    {Array.from({ length: form.getValues(`exercises_completed.${index}.sets_completed`) || 0 }).map((_, setIndex) => (
                      <div key={setIndex} className="grid grid-cols-12 gap-2 items-center mb-2">
                        <div className="col-span-2 text-center text-sm">{setIndex + 1}</div>
                        <div className="col-span-5">
                          <FormField
                            control={form.control}
                            name={`exercises_completed.${index}.reps_completed.${setIndex}`}
                            render={({ field }) => (
                              <FormItem className="space-y-0">
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    className="h-8"
                                    {...field} 
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-5">
                          <FormField
                            control={form.control}
                            name={`exercises_completed.${index}.weights_used.${setIndex}`}
                            render={({ field }) => (
                              <FormItem className="space-y-0">
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    className="h-8"
                                    {...field} 
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Notes */}
                <FormField
                  control={form.control}
                  name={`exercises_completed.${index}.notes`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any notes about this exercise..."
                          className="h-20"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}
          </div>
          
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Workout Summary</h3>
            
            {/* Overall Difficulty */}
            <FormField
              control={form.control}
              name="overall_difficulty"
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <FormItem>
                  <FormLabel>Overall Workout Difficulty (1-10): {value}</FormLabel>
                  <FormControl>
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      defaultValue={[value]}
                      onValueChange={(vals) => onChange(vals[0])}
                      {...fieldProps}
                    />
                  </FormControl>
                  <FormDescription>
                    1 = Very easy, 10 = Extremely challenging
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Energy Level */}
            <FormField
              control={form.control}
              name="energy_level"
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <FormItem>
                  <FormLabel>Energy Level (1-10): {value}</FormLabel>
                  <FormControl>
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      defaultValue={[value]}
                      onValueChange={(vals) => onChange(vals[0])}
                      {...fieldProps}
                    />
                  </FormControl>
                  <FormDescription>
                    1 = Very low energy, 10 = Full of energy
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Satisfaction Level */}
            <FormField
              control={form.control}
              name="satisfaction"
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <FormItem>
                  <FormLabel>Satisfaction with Workout (1-10): {value}</FormLabel>
                  <FormControl>
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      defaultValue={[value]}
                      onValueChange={(vals) => onChange(vals[0])}
                      {...fieldProps}
                    />
                  </FormControl>
                  <FormDescription>
                    1 = Not satisfied, 10 = Extremely satisfied
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Feedback */}
            <FormField
              control={form.control}
              name="feedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overall Feedback</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any general thoughts about this workout..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <Button type="submit" className="w-full md:w-auto" disabled={loading}>
            {loading ? (
              <>
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : "Log Workout"}
          </Button>
        </form>
      </Form>
    </div>
  )
} 