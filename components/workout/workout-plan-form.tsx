"use client"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2, Info, BarChart, Brain, ListChecks, ArrowRight, AlertTriangle, HelpCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useProfile } from "@/lib/profile-context"
import { useWorkout } from "@/contexts/workout-context"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const fitnessGoals = [
  { id: "strength", label: "Strength" },
  { id: "muscle-gain", label: "Muscle Gain" },
  { id: "weight-loss", label: "Weight Loss" },
  { id: "endurance", label: "Endurance" },
  { id: "body-recomposition", label: "Body Recomposition" },
  { id: "hypertrophy", label: "Hypertrophy" },
  { id: "athletic-performance", label: "Athletic Performance" },
  { id: "general-fitness", label: "General Fitness" },
]

const cardioOptions = [
  { id: "running", label: "Running" },
  { id: "cycling", label: "Cycling" },
  { id: "rowing", label: "Rowing" },
  { id: "jump-rope", label: "Jump Rope" },
  { id: "sprints", label: "Sprints" },
  { id: "walking", label: "Walking" },
  { id: "swimming", label: "Swimming" },
  { id: "hiit", label: "HIIT" },
  { id: "stair-climber", label: "Stair Climber" },
  { id: "elliptical", label: "Elliptical" },
]

const mobilityOptions = [
  { id: "dynamic-stretching", label: "Dynamic Stretching" },
  { id: "foam-rolling", label: "Foam Rolling" },
  { id: "massage-gun", label: "Massage Gun" },
  { id: "stretching", label: "Stretching" },
  { id: "yoga", label: "Yoga" },
  { id: "mobility-drills", label: "Mobility Drills" },
]

const timingOptions = [
  { value: "workout-days", label: "On workout days" },
  { value: "rest-days", label: "On rest days" },
  { value: "mix", label: "Mix of both" },
]

const includeOptions = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
]

const formSchema = z.object({
  goals: z.array(z.string()).min(1, {
    message: "Please select at least one goal.",
  }),
  frequency: z.number().min(1).max(7),
  duration: z.number().min(15).max(120),
  includeCardio: z.boolean().default(false),
  cardioPreferences: z.array(z.string()).optional(),
  cardioIncludeInDuration: z.string().optional(),
  cardioTiming: z.string().optional(),
  includeMobility: z.boolean().default(false),
  mobilityPreferences: z.array(z.string()).optional(),
  mobilityIncludeInDuration: z.string().optional(),
  mobilityTiming: z.string().optional(),
  additionalPreferences: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export function WorkoutPlanForm() {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { profile } = useProfile()
  const { 
    generateWorkoutPlan, 
    generationStatus, 
    generationProgress, 
    currentAgent, 
    agentMessages,
    selectedPlan 
  } = useWorkout()
  const router = useRouter()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      goals: [],
      frequency: 3,
      duration: 60,
      includeCardio: false,
      cardioPreferences: [],
      cardioIncludeInDuration: "yes",
      cardioTiming: "workout-days",
      includeMobility: false,
      mobilityPreferences: [],
      mobilityIncludeInDuration: "yes",
      mobilityTiming: "workout-days",
      additionalPreferences: "",
    },
  })

  const includeCardio = form.watch("includeCardio")
  const includeMobility = form.watch("includeMobility")

  // Map the form data to the input required by the workout generation service
  async function onSubmit(data: FormValues) {
    setIsSubmitted(true)
    
    try {
      // Convert form data to goals and preferences for the generateWorkoutPlan function
      const goals = data.goals
      
      const preferences = {
        frequency: data.frequency,
        sessionDuration: data.duration,
        cardio: {
          include: data.includeCardio,
          preferences: data.cardioPreferences || [],
          includeInDuration: data.cardioIncludeInDuration === "yes",
          timing: data.cardioTiming
        },
        mobility: {
          include: data.includeMobility,
          preferences: data.mobilityPreferences || [],
          includeInDuration: data.mobilityIncludeInDuration === "yes",
          timing: data.mobilityTiming
        },
        includeNutrition: true, // Enable nutrition recommendations
        equipment: profile?.equipment || [], 
        additionalNotes: data.additionalPreferences
      }
      
      // Call the workout generation service
      await generateWorkoutPlan(goals, preferences)
      
      // After the plan is generated, if we have a selectedPlan, redirect to it
      if (selectedPlan?.id) {
        router.push(`/workouts/${selectedPlan.id}`)
      }
    } catch (error) {
      console.error("Error generating workout plan:", error)
      // Error state is handled by the workout context (generationStatus will be 'error')
    }
  }

  // Function to determine if a plan generation is in progress
  const isGenerating = generationStatus !== 'idle' && generationStatus !== 'complete' && generationStatus !== 'error'
  
  // Function to get the agent display name
  const getAgentDisplayName = (agentType: string | null) => {
    switch(agentType) {
      case 'research': return 'Research Agent';
      case 'generation': return 'Workout Generation Agent';
      case 'adjustment': return 'Plan Adjustment Agent';
      case 'reflection': return 'Reflection Agent';
      default: return 'AI Agent';
    }
  }
  
  // Function to get the icon for the current agent
  const getCurrentAgentIcon = () => {
    switch(currentAgent) {
      case 'research': return <Brain className="h-5 w-5" />;
      case 'generation': return <ListChecks className="h-5 w-5" />;
      case 'adjustment': return <ArrowRight className="h-5 w-5" />;
      case 'reflection': return <BarChart className="h-5 w-5" />;
      default: return <Loader2 className="h-5 w-5 animate-spin" />;
    }
  }

  if (isSubmitted) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">
              {generationStatus === 'complete' 
                ? 'Workout Plan Generated!' 
                : generationStatus === 'error'
                ? 'Generation Error'
                : 'Generating Your Workout Plan'}
            </CardTitle>
            {isGenerating && (
              <Badge variant="outline" className="flex items-center gap-2">
                {getCurrentAgentIcon()}
                {getAgentDisplayName(currentAgent)} Active
              </Badge>
            )}
          </div>
          <CardDescription>
            {generationStatus === 'complete' 
              ? 'Your personalized workout plan is ready to view.'
              : generationStatus === 'error'
              ? 'There was an error generating your workout plan.'
              : 'Our AI agents are crafting your personalized workout plan based on your preferences.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {generationStatus === 'error' ? (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Generating Plan</AlertTitle>
              <AlertDescription>
                We encountered an error while generating your workout plan. Please try again later or 
                adjust your preferences. If the problem persists, contact support.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {isGenerating && (
                <div className="mb-6 space-y-2">
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span>{generationStatus.charAt(0).toUpperCase() + generationStatus.slice(1)}</span>
                    <span>{generationProgress}%</span>
                  </div>
                  <Progress value={generationProgress} className="h-2" />
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Generation Process</h3>
                <Tabs defaultValue="messages" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="messages">Agent Messages</TabsTrigger>
                    <TabsTrigger value="reasoning">Agent Reasoning</TabsTrigger>
                  </TabsList>
                  <TabsContent value="messages">
                    <Card>
                      <ScrollArea className="h-[300px] p-4">
                        {agentMessages.length === 0 ? (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            No messages yet
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {agentMessages.map((message, index) => (
                              <div key={index} className={`flex ${message.role === 'assistant' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`rounded-lg px-4 py-2 max-w-[80%] ${
                                  message.role === 'system' 
                                    ? 'bg-secondary text-secondary-foreground'
                                    : message.role === 'assistant'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}>
                                  {message.content.length > 300 
                                    ? `${message.content.substring(0, 300)}...`
                                    : message.content}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </Card>
                  </TabsContent>
                  <TabsContent value="reasoning">
                    <Card>
                      <ScrollArea className="h-[300px] p-4">
                        {agentMessages.length === 0 ? (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            No reasoning available yet
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {agentMessages
                              .filter(message => message.content.includes('## ') || message.role === 'system')
                              .map((message, index) => (
                                <div key={index} className="prose dark:prose-invert max-w-full">
                                  {message.role === 'system' ? (
                                    <div className="bg-secondary rounded-lg p-3 text-sm">
                                      <strong>System Instruction:</strong> {message.content}
                                    </div>
                                  ) : (
                                    <div dangerouslySetInnerHTML={{ 
                                      __html: message.content
                                        .replace(/## (.*)/g, '<h2>$1</h2>')
                                        .replace(/### (.*)/g, '<h3>$1</h3>')
                                        .replace(/\n/g, '<br />')
                                    }} />
                                  )}
                                </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}

          <div className="flex justify-center gap-4 mt-6">
            {generationStatus === 'complete' && selectedPlan?.id && (
              <Button onClick={() => router.push(`/workouts/${selectedPlan.id}`)}>
                View Your Plan
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsSubmitted(false)}>
              {generationStatus === 'error' ? 'Try Again' : 'Start Over'}
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-muted-foreground">
          {generationStatus === 'complete' 
            ? 'Your plan has been generated and saved to your account.'
            : generationStatus === 'error'
            ? 'There was an error in the generation process. You can try again with different preferences.'
            : 'Please wait while our AI agents craft your personalized workout plan.'}
        </CardFooter>
      </Card>
    )
  }

  // Original form rendering code remains the same
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Generate Your Workout Plan</CardTitle>
        <CardDescription>
          Fill out the form below to create a personalized workout plan tailored to your needs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="mb-6 rounded-md bg-muted/50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-5 w-5 text-primary" />
                <h4 className="font-medium">Using Profile Data</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Your fitness level, medical conditions, and equipment availability are being used from your profile. You
                can update these details in your{" "}
                <Link href="/profile" className="text-primary hover:underline">
                  profile settings
                </Link>
                .
              </p>
            </div>

            {/* Goals */}
            <FormField
              control={form.control}
              name="goals"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel>Goals (select all that apply)</FormLabel>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {fitnessGoals.map((goal) => (
                      <FormField
                        key={goal.id}
                        control={form.control}
                        name="goals"
                        render={({ field }) => {
                          return (
                            <FormItem key={goal.id} className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(goal.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, goal.id])
                                      : field.onChange(field.value?.filter((value) => value !== goal.id))
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">{goal.label}</FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Workout Frequency */}
            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workout Frequency (days per week)</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      <Slider
                        min={1}
                        max={7}
                        step={1}
                        defaultValue={[field.value]}
                        onValueChange={(vals) => field.onChange(vals[0])}
                      />
                      <div className="flex justify-between">
                        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                          <span
                            key={day}
                            className={`text-sm ${field.value === day ? "text-primary font-bold" : "text-muted-foreground"}`}
                          >
                            {day}
                          </span>
                        ))}
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Currently selected:{" "}
                    <span className="font-medium">
                      {field.value} {field.value === 1 ? "day" : "days"}
                    </span>{" "}
                    per week
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Workout Duration */}
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workout Duration (minutes)</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      <Slider
                        min={15}
                        max={120}
                        step={1}
                        defaultValue={[field.value]}
                        onValueChange={(vals) => field.onChange(vals[0])}
                      />
                      <div className="flex justify-between">
                        {[15, 30, 45, 60, 75, 90, 105, 120].map((min) => (
                          <span key={min} className="text-sm text-muted-foreground">
                            {min}
                          </span>
                        ))}
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Currently selected: <span className="font-medium">{field.value} minutes</span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Include Cardio */}
            <FormField
              control={form.control}
              name="includeCardio"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FormLabel>Include Cardio</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conditional Cardio Options */}
            {includeCardio && (
              <div className="pl-6 border-l-2 border-primary/20 space-y-6">
                {/* Cardio Preferences */}
                <FormField
                  control={form.control}
                  name="cardioPreferences"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel>Cardio Preferences (select all that apply)</FormLabel>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {cardioOptions.map((item) => (
                          <FormField
                            key={item.id}
                            control={form.control}
                            name="cardioPreferences"
                            render={({ field }) => {
                              return (
                                <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(item.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), item.id])
                                          : field.onChange(field.value?.filter((value) => value !== item.id))
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">{item.label}</FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Include in Workout Duration */}
                <FormField
                  control={form.control}
                  name="cardioIncludeInDuration"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel>Include in Workout Duration Time?</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-80">
                              <p>
                                <strong>Yes:</strong> Cardio will be included within your selected workout duration
                                time.
                              </p>
                              <p>
                                <strong>No:</strong> Cardio will be additional time beyond your selected workout
                                duration.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {includeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Cardio Timing */}
                <FormField
                  control={form.control}
                  name="cardioTiming"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cardio Timing Preference</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select timing preference" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timingOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Include Mobility */}
            <FormField
              control={form.control}
              name="includeMobility"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FormLabel>Include Mobility</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conditional Mobility Options */}
            {includeMobility && (
              <div className="pl-6 border-l-2 border-primary/20 space-y-6">
                {/* Mobility Preferences */}
                <FormField
                  control={form.control}
                  name="mobilityPreferences"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel>Mobility Preferences (select all that apply)</FormLabel>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {mobilityOptions.map((item) => (
                          <FormField
                            key={item.id}
                            control={form.control}
                            name="mobilityPreferences"
                            render={({ field }) => {
                              return (
                                <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(item.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), item.id])
                                          : field.onChange(field.value?.filter((value) => value !== item.id))
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">{item.label}</FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Include in Workout Duration */}
                <FormField
                  control={form.control}
                  name="mobilityIncludeInDuration"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormLabel>Include in Workout Duration Time?</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-80">
                              <p>
                                <strong>Yes:</strong> Mobility work will be included within your selected workout
                                duration time.
                              </p>
                              <p>
                                <strong>No:</strong> Mobility work will be additional time beyond your selected workout
                                duration.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {includeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Mobility Timing */}
                <FormField
                  control={form.control}
                  name="mobilityTiming"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobility Timing Preference</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select timing preference" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timingOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Additional Preferences */}
            <FormField
              control={form.control}
              name="additionalPreferences"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Preferences</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any specific exercises, rep schemes, splits, or other preferences you'd like included in your plan."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional: Include any specific exercises, rep schemes, splits, or other preferences.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full bg-[#3E9EFF] hover:bg-[#3E9EFF]/90" disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Your Plan...
                </>
              ) : (
                "Generate Workout Plan"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center text-sm text-muted-foreground">
        Your plan will be generated based on your preferences and fitness goals.
      </CardFooter>
    </Card>
  )
}

