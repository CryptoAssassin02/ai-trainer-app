"use client"

import { useState, useEffect, useRef } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useSafeFormWatch } from '@/hooks/use-safe-form-watch'
import { 
  profileCreationSchema, 
  profileUpdateSchema,
  type ProfileCreationFormData,
  type ProfileUpdateFormData,
  VALIDATION_CONSTANTS,
  createDynamicProfileSchema
} from "@/lib/validation/profile-schemas"
import { Loader2, Info, AlertCircle, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { NativeCheckbox } from "@/components/ui/native-checkbox"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useProfile } from "@/hooks/use-profile-queries"
import { useProfileFormLogic } from "@/hooks/use-profile-form-logic"
import type { UserProfile } from "@/lib/api/types"
import type { UserProfileFormProps } from "@/lib/validation/profile-form-types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/components/auth/supabase-auth-provider"

// Define fitness goals options
const fitnessGoals = [
  { id: "weight_loss", label: "Weight Loss", icon: "📉", description: "Reduce body weight and body fat" },
  { id: "muscle_gain", label: "Muscle Gain", icon: "💪", description: "Build lean muscle mass" },
  { id: "strength", label: "Strength", icon: "🏋️", description: "Increase maximum strength" },
  { id: "endurance", label: "Endurance", icon: "🏃", description: "Improve cardiovascular fitness" },
  { id: "flexibility", label: "Flexibility", icon: "🧘", description: "Enhance range of motion" },
  { id: "general_fitness", label: "General Fitness", icon: "⚡", description: "Overall health and wellness" },
  { id: "sports_performance", label: "Sports Performance", icon: "🏆", description: "Excel in specific sports" },
  { id: "body_recomposition", label: "Body Recomposition", icon: "🔄", description: "Lose fat while gaining muscle" },
]

// Exercise types for workout customization
const exerciseTypes = [
  { id: "cardio", label: "Cardio", icon: "🏃", description: "Running, cycling, swimming" },
  { id: "strength", label: "Strength Training", icon: "💪", description: "Weight lifting, resistance training" },
  { id: "hiit", label: "HIIT", icon: "⚡", description: "High-intensity interval training" },
  { id: "yoga", label: "Yoga", icon: "🧘", description: "Flexibility and mindfulness" },
  { id: "pilates", label: "Pilates", icon: "🤸", description: "Core strength and stability" },
  { id: "functional", label: "Functional Training", icon: "🏋️", description: "Movement-based exercises" },
  { id: "sports", label: "Sports-Specific", icon: "🏆", description: "Sport-specific conditioning" },
  { id: "flexibility", label: "Flexibility/Stretching", icon: "🤲", description: "Mobility and recovery" },
]

  // Define gym category options - MUST match validation schema
  const gymCategoryOptions = [
    { id: "full_service_commercial", label: "Full-Service Commercial Gym", description: "LA Fitness, Genesis, etc." },
    { id: "budget_friendly", label: "Budget-Friendly Gym", description: "Planet Fitness, etc." },
    { id: "hardcore_strength", label: "Hardcore Strength/Powerlifting Gym", description: "Iron Heaven, etc." },
    { id: "luxury_athletic_club", label: "Luxury Athletic Club", description: "Lifetime Fitness, etc." },
    { id: "franchise_24_7", label: "24/7 Franchise Gym", description: "Anytime Fitness, etc." },
    { id: "community_recreation", label: "Community Recreation Center", description: "YMCA, etc." },
    { id: "crossfit_functional", label: "CrossFit/Functional Fitness Gym", description: "CrossFit affiliates" },
    { id: "limited_residential", label: "Limited Residential Gym", description: "Apartment fitness centers" },
    { id: "personal_home_setup", label: "Personal Home Setup", description: "Home/garage gym" },
    { id: "minimal_home", label: "Minimal/No-Equipment Home Workout", description: "Bodyweight only" },
  ]

// Use comprehensive validation schema with dynamic height validation
type FormValues = ProfileCreationFormData & {
  medicalConditions: string;
  primaryGoal?: string;
  exerciseTypes: string[];
  additionalNotes?: string;
}

export function UserProfileForm({
  mode = 'edit',
  enableAutoSave = true,
  onSuccess,
  onCancel,
  redirectOnSuccess,
  redirectOnCancel,
  showAdvancedOptions = true,
  enableRealTimeValidation = true,
  showCompletionIndicator = true,
  title = "Your trAIner Profile",
  description = "Update your profile to keep your workout recommendations personalized and effective."
}: UserProfileFormProps = {}) {
  const { profile, updateProfileAsync, isLoading: profileLoading, error: profileError } = useProfile()
  const [isMetric, setIsMetric] = useState<boolean>(true)
  const prevUnitPreferenceRef = useRef<string | null>(null)
  const { isAuthenticated } = useAuth()
  
  // Use shared business logic
  const {
    formState,
    handleSuccess,
    handleCancel,
    handleFormSubmit,
    setFormError,
    setSuccessMessage,
    resetFormState,
    isEditMode
  } = useProfileFormLogic({
    mode,
    onSuccess,
    onCancel,
    redirectOnSuccess,
    redirectOnCancel,
    enableAutoSave,
  })

  // Create dynamic schema based on current unit preference
  const schemaMode = mode === 'edit' ? 'update' : mode;
  const currentSchema = createDynamicProfileSchema(schemaMode, isMetric ? 'metric' : 'imperial');
  
  // Initialize form with comprehensive validation
  const form = useForm<FormValues>({
    resolver: zodResolver(currentSchema),
    mode: enableRealTimeValidation ? 'onChange' : 'onSubmit', // Real-time validation

    defaultValues: {
      name: "",
      age: undefined,
      gender: undefined,
      height: undefined,
      weight: undefined,
      experienceLevel: undefined,
      goals: [],
      primaryGoal: "",
      medicalConditions: "",
      gymCategory: 'minimal_home',
      workoutFrequency: '',
      exerciseTypes: [],
      unitPreference: "metric",
      additionalNotes: ""
    },
  })

  // Destructure reset method for proper useEffect dependencies (React Hook Form best practice)
  const { reset } = form;
  
  // Watch selected goals and exercise types for conditional rendering
  const selectedGoals = useSafeFormWatch(form, 'goals', []);
  const selectedExerciseTypes = useSafeFormWatch(form, 'exerciseTypes', []);
  const additionalNotesValue = useSafeFormWatch(form, 'additionalNotes', '');

  // Update form when profile changes - following React Hook Form best practices
  useEffect(() => {
    if (!profileLoading && profile.data) {
      const profileData = profile.data as UserProfile;
      
      // Determine unit preference from profile data
      const profileIsMetric = profileData.unitPreference === "metric";
      
      // Only update if unit preference actually changed (prevent infinite loop)
      if (prevUnitPreferenceRef.current !== profileData.unitPreference) {
        prevUnitPreferenceRef.current = profileData.unitPreference || "metric";
        setIsMetric(profileIsMetric);
      }

      // Use destructured reset method (React Hook Form best practice)
      reset({
        name: profileData.name || "",
        age: profileData.age || 30,
        gender: profileData.gender as "male" | "female" | "non-binary" | "prefer_not_to_say" || "prefer_not_to_say",
        height: profileIsMetric 
          ? (typeof profileData.height === 'number' ? profileData.height : 178)
          : (typeof profileData.height === 'object' && profileData.height?.feet && profileData.height?.inches !== undefined)
            ? profileData.height  // Use the object directly if it's already in imperial format
            : { feet: 5, inches: 10 }, // Default fallback
        weight: profileData.weight || (profileIsMetric ? 72.5 : 160),
        experienceLevel: profileData.experienceLevel as "beginner" | "intermediate" | "advanced" || "beginner",
        goals: profileData.goals || [],
        primaryGoal: profileData.primaryGoal || "",
        medicalConditions: Array.isArray(profileData.medicalConditions) 
          ? profileData.medicalConditions.join(', ') 
          : (profileData.medicalConditions || ""),
        gymCategory: (profileData.gymCategory as any) || 'minimal_home',
        workoutFrequency: profileData.workoutFrequency || '',
        exerciseTypes: profileData.exerciseTypes || [],
        unitPreference: profileData.unitPreference || "metric",
        additionalNotes: (profileData as any)?.additionalNotes || ""
      })
    }
  }, [(profile.data as UserProfile)?.id, (profile.data as UserProfile)?.updatedAt, profileLoading, reset]) // Use stable identifiers instead of entire object



  // Handle unit preference change
  const handleUnitChange = (newUnitPreference: "metric" | "imperial") => {
    const isNewMetric = newUnitPreference === "metric"
    setIsMetric(isNewMetric)
    
    // CRITICAL FIX: Do NOT convert weight values in frontend
    // The backend handles all unit conversions based on unitPreference
    // Frontend should only change the unit preference and clear values to avoid double conversion
    
    // Get current height and weight
    const currentHeight = form.getValues('height')
    const currentWeight = form.getValues('weight')
    
    // Only handle height conversion since height has different input formats (object vs number)
    if (isNewMetric) {
      // Convert from imperial to metric for height only
      if (typeof currentHeight === 'object' && currentHeight) {
        const { feet = 0, inches = 0 } = currentHeight
        const heightInCm = Math.round((feet * 30.48) + (inches * 2.54))
        form.setValue('height', heightInCm)
      }
      
      // REMOVED: Weight conversion - let backend handle this
      // Clear weight to force user to re-enter in new units
      if (currentWeight) {
        form.setValue('weight', undefined)
      }
    } else {
      // Convert from metric to imperial for height only
      if (typeof currentHeight === 'number') {
        const totalInches = currentHeight / 2.54
        const feet = Math.floor(totalInches / 12)
        const inches = Math.round(totalInches % 12)
        form.setValue('height', { feet, inches })
      }
      
      // REMOVED: Weight conversion - let backend handle this
      // Clear weight to force user to re-enter in new units
      if (currentWeight) {
        form.setValue('weight', undefined)
      }
    }
    
    form.setValue('unitPreference', newUnitPreference)
  }

  // Handle form submission
  async function onSubmit(data: FormValues) {
    try {
      await handleFormSubmit(      async () => {
        // CRITICAL FIX: Do NOT convert units in frontend - backend handles all conversions
        // Send data in the format the user entered it, with unitPreference for backend conversion
        
        // Check for user authentication
        if (!isAuthenticated) {
          throw new Error("You need to be signed in to save your profile.")
        }

        // Prepare final data object - send raw values with unitPreference
        const finalData = {
          name: data.name,
          age: data.age,
          gender: data.gender,
          height: data.height, // Send as-is (number for metric, object for imperial)
          weight: data.weight, // Send as-is (backend will convert based on unitPreference)
          experienceLevel: data.experienceLevel,
          goals: data.goals,
          primaryGoal: data.primaryGoal || '',
          medicalConditions: data.medicalConditions 
            ? data.medicalConditions.split(',').map(s => s.trim()).filter(s => s.length > 0)
            : [],
          gymCategory: data.gymCategory || '',
          workoutFrequency: data.workoutFrequency || '',
          exerciseTypes: data.exerciseTypes || [],
          unitPreference: data.unitPreference, // Backend uses this for proper conversion
          additionalNotes: (form.getValues('additionalNotes') || '').slice(0, 300)
        }

        // Update profile via the modern profile hooks
        const updatedProfile = await updateProfileAsync(finalData)
        
        // Handle success with the updated profile
        await handleSuccess(updatedProfile)
        
        return updatedProfile
      })
    } catch (error) {
      console.error("Error saving profile:", error)
      // Error handling is done by handleFormSubmit
    }
  }

  // Show loading skeleton only if we're in edit mode and have no profile data yet
  // This prevents the "flash" of empty form while still showing loading for slow connections
  if (profileLoading && isEditMode && !profile?.data) {
    return (
      <Card className="w-full max-w-4xl mx-auto bg-card/50 backdrop-blur-sm border border-border/50">
        <CardHeader>
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <Skeleton className="h-6 w-1/4" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-4xl mx-auto bg-card/50 backdrop-blur-sm border border-border/50 hover:border-cornflower-blue/30 transition-all duration-300 hover:shadow-lg hover:shadow-cornflower-blue/10">
      <CardHeader>
        <CardTitle className="text-2xl text-center">{title}</CardTitle>
        <CardDescription className="text-center">
          {description}
        </CardDescription>
        <div className="mt-2 rounded-md bg-primary/10 p-3 text-sm">
          <p className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            <span>
              Review profile information below before saving and proceeding with workout generation.
            </span>
          </p>
        </div>
        
        {profileError && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{profileError?.message || 'An error occurred loading your profile'}</AlertDescription>
          </Alert>
        )}
        
        {formState.error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{formState.error}</AlertDescription>
          </Alert>
        )}
        
        {formState.successMessage && (
          <Alert className="mt-4 bg-green-50 border-green-200 text-green-800">
            <Check className="h-4 w-4 text-green-600" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{formState.successMessage}</AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent>
              <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8"
        >
            {/* Unit Preference Toggle - TEMPORARILY DISABLED TO ISOLATE INFINITE LOOP */}
            <div className="flex justify-end">
              <div className="flex space-x-2 items-center bg-muted rounded-lg p-2">
                <span className={`text-sm ${!isMetric ? "font-medium" : "text-muted-foreground"}`}>Imperial</span>
                {/* TEMPORARILY DISABLED: Switch causing infinite update loop */}
                {/* <Switch 
                  checked={isMetric} 
                  onCheckedChange={(checked) => handleUnitChange(checked ? "metric" : "imperial")}
                  data-testid="unit-toggle"
                /> */}
                <button
                  type="button"
                  onClick={() => handleUnitChange(isMetric ? "imperial" : "metric")}
                  className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded"
                  data-testid="unit-toggle"
                >
                  {isMetric ? "Switch to Imperial" : "Switch to Metric"}
                </button>
                <span className={`text-sm ${isMetric ? "font-medium" : "text-muted-foreground"}`}>Metric</span>
              </div>
            </div>

            {/* Basic Information Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Basic Information</h3>

              {/* Name Field with Enhanced Validation */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-md font-medium">Full Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your name (2-100 characters)" 
                        {...field}

                        data-testid="name-input"
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-muted-foreground">
                      Character count: {field.value?.length || 0}/{VALIDATION_CONSTANTS.NAME_MAX_LENGTH}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Age and Gender - Two columns on larger screens */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Age Field with Enhanced Validation */}
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel className="text-md font-medium">Age</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder={`Enter your age (${VALIDATION_CONSTANTS.AGE_MIN}-${VALIDATION_CONSTANTS.AGE_MAX})`}
                          value={value || ""}
                          onChange={(e) => {
                            const val = e.target.value
                            onChange(val ? Number.parseInt(val, 10) : undefined)
                          }}
                          {...fieldProps}
                          data-testid="age-input"
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-muted-foreground">
                        Must be between {VALIDATION_CONSTANTS.AGE_MIN} and {VALIDATION_CONSTANTS.AGE_MAX} years old
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Gender Field with Inclusive Options */}
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-md font-medium">Gender (Optional)</FormLabel>
                                              <FormControl>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="flex flex-col space-y-1"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="male" id="male" />
                              <Label htmlFor="male">Male</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="female" id="female" />
                              <Label htmlFor="female">Female</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="other" id="other" />
                              <Label htmlFor="other">Other</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="prefer_not_to_say" id="prefer_not_to_say" />
                              <Label htmlFor="prefer_not_to_say">Prefer not to say</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                      <FormDescription className="text-xs text-muted-foreground">
                        This information helps us provide more personalized recommendations
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          
            {/* Body Measurements Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Body Measurements</h3>
              </div>

              {/* Height Fields */}
              <div className="space-y-4">
                <div className="text-md font-medium">Height</div>
                {isMetric ? (
                  <FormField
                    control={form.control}
                    name="height"
                    render={({ field: { value, onChange, ...fieldProps } }) => (
                      <FormItem>
                        <div className="flex items-center space-x-2">
                          <FormControl>
                            <Input
                              type="number"

                              placeholder="Height"
                              value={typeof value === 'number' ? value : ""}
                              onChange={(e) => {
                                const val = e.target.value
                                onChange(val ? Number.parseFloat(val) : "")
                              }}
                              {...fieldProps}
                              className="w-full"
                            />
                          </FormControl>
                          <span className="text-muted-foreground">cm</span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="height"
                    render={({ field: { value, onChange, ...fieldProps } }) => {
                      const heightObj = (typeof value === 'object' && value) ? value : { feet: 5, inches: 10 };
                      return (
                        <FormItem>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center space-x-2">
                              <FormControl>
                                <Input
                                  type="number"
    
                                  placeholder="Feet"
                                  value={heightObj.feet || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const newFeet = val ? Number.parseInt(val, 10) : 0;
                                    onChange({ feet: newFeet, inches: heightObj.inches || 0 });
                                  }}
                                  className="w-full"
                                />
                              </FormControl>
                              <span className="text-muted-foreground">ft</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <FormControl>
                                <Input
                                  type="number"
    

                                  placeholder="Inches"
                                  value={heightObj.inches || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const newInches = val ? Number.parseInt(val, 10) : 0;
                                    onChange({ feet: heightObj.feet || 0, inches: newInches });
                                  }}
                                  className="w-full"
                                />
                              </FormControl>
                              <span className="text-muted-foreground">in</span>
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                )}
              </div>

              {/* Weight Field */}
              <div className="space-y-4">
                <div className="text-md font-medium">Weight</div>
                {isMetric ? (
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field: { value, onChange, ...fieldProps } }) => (
                      <FormItem>
                        <div className="flex items-center space-x-2">
                          <FormControl>
                            <Input
                              type="number"

                              step={0.1}
                              placeholder="Weight"
                              value={value || ""}
                              onChange={(e) => {
                                const val = e.target.value
                                onChange(val ? Number.parseFloat(val) : "")
                              }}
                              {...fieldProps}
                              className="w-full"
                            />
                          </FormControl>
                          <span className="text-muted-foreground">kg</span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field: { value, onChange, ...fieldProps } }) => (
                      <FormItem>
                        <div className="flex items-center space-x-2">
                          <FormControl>
                            <Input
                              type="number"

                              placeholder="Weight"
                              value={value || ""}
                              onChange={(e) => {
                                const val = e.target.value
                                onChange(val ? Number.parseFloat(val) : "")
                              }}
                              {...fieldProps}
                              className="w-full"
                            />
                          </FormControl>
                          <span className="text-muted-foreground">lbs</span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            {/* Fitness Background Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Fitness Background</h3>

              {/* Experience Level Field */}
              <FormField
                control={form.control}
                name="experienceLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-md font-medium">Experience Level</FormLabel>
                    <FormControl>
                      <NativeSelect
                        name="experienceLevel"
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Select your experience level"
                        options={[
                          { value: "beginner", label: "Beginner (0-6 months of consistent training)" },
                          { value: "intermediate", label: "Intermediate (6 months - 2 years of consistent training)" },
                          { value: "advanced", label: "Advanced (2+ years of consistent training)" }
                        ]}
                      />
                    </FormControl>
                    <FormDescription className="text-sm text-muted-foreground">
                      This helps us tailor workout intensity and progression to your level.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Fitness Goals Field */}
              <div className="mb-4">
                <div className="text-md font-medium">Fitness Goals (select all that apply)</div>
                <p className="text-sm text-muted-foreground">Choose the goals that are most important to you (up to 3 goals).</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fitnessGoals.map((goal) => (
                  <FormField
                    key={goal.id}
                    control={form.control}
                    name="goals"
                    render={({ field }) => {
                      return (
                        <FormItem key={goal.id} className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <NativeCheckbox
                              name="goals"
                              value={goal.id}
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

              {/* Primary Goal Selection - Show when 2+ goals selected */}
              {selectedGoals.length > 1 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="text-md font-medium">Primary Goal Selection</div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Choose your main focus. This goal will be prioritized in crafting your personalized workout program.
                  </p>
                  <FormField
                    control={form.control}
                    name="primaryGoal"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <NativeSelect
                            value={field.value || selectedGoals[0]}
                            onValueChange={field.onChange}
                            placeholder="Select your primary goal"
                            options={selectedGoals.map((goalId: string) => {
                              const goal = fitnessGoals.find(g => g.id === goalId);
                              return {
                                value: goalId,
                                label: `${goal?.icon} ${goal?.label}`
                              };
                            })}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Medical Conditions Field with Enhanced Validation */}
              <FormField
                control={form.control}
                name="medicalConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-md font-medium">Medical Considerations</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please list any medical conditions, injuries, or movement limitations that might affect your workouts. Maximum 10 conditions, 200 characters each."
                        className="min-h-[100px]"
                        {...field}

                      />
                    </FormControl>
                    <FormDescription>
                      This information helps us provide safer workout recommendations. It will be kept confidential.
                      <br />
                      <span className="text-xs text-muted-foreground">
                        Character count: {field.value?.length || 0}/{VALIDATION_CONSTANTS.MEDICAL_CONDITION_MAX_LENGTH * VALIDATION_CONSTANTS.MEDICAL_CONDITIONS_MAX}
                      </span>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Additional Notes Field */}
              <FormField
                control={form.control}
                name="additionalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-md font-medium">Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={
                          (additionalNotesValue?.length || 0) === 0
                            ? "Examples: Prefer machines and dumbbells over barbell exercises; Prefer Hack Squat over Barbell Back Squat"
                            : "Share equipment preferences, exercise swaps, or limitations..."
                        }
                        maxLength={300}
                        value={field.value || ""}
                        onChange={field.onChange}
                        className="min-h-[100px]"
                        data-testid="additional-notes-input"
                      />
                    </FormControl>
                    <FormDescription>
                      <span className="text-xs text-muted-foreground">Character count: {additionalNotesValue?.length || 0}/300</span>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

                         {/* Gym Category Section */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Preferences & Equipment</h3>

                <FormField
                  control={form.control}
                  name="gymCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-md font-medium">Gym Type</FormLabel>
                      <FormDescription>
                        Choose the type of gym or workout space you primarily use
                      </FormDescription>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="grid grid-cols-1 gap-3"
                        >
                          {gymCategoryOptions.map((category) => (
                            <div key={category.id} className="space-y-2">
                              <RadioGroupItem
                                value={category.id}
                                id={category.id}
                                className="peer sr-only"
                              />
                              <Label
                                htmlFor={category.id}
                                className="flex flex-col space-y-2 rounded-lg border-2 border-muted p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                              >
                                <span className="font-medium text-sm">{category.label}</span>
                                <p className="text-xs text-muted-foreground">
                                  {category.description}
                                </p>
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Workout Frequency */}
              <div className="space-y-4">
                <h3 className="text-md font-medium">Workout Frequency</h3>

                <FormField
                  control={form.control}
                  name="workoutFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How often do you plan to work out?</FormLabel>
                      <FormDescription>
                        Select your preferred workout frequency per week
                      </FormDescription>
                      <FormControl>
                        <NativeSelect
                          onValueChange={field.onChange}
                          value={field.value || ''}
                          placeholder="Select workout frequency"
                          options={[
                            { value: "1", label: "Once per week - Light activity" },
                            { value: "2", label: "Twice per week - Moderate activity" },
                            { value: "3", label: "3 times per week - Regular activity" },
                            { value: "4", label: "4 times per week - Active lifestyle" },
                            { value: "5", label: "5 times per week - Very active" },
                            { value: "6", label: "6 times per week - Highly active" },
                            { value: "7", label: "Daily - Maximum frequency" },
                          ]}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Exercise Types */}
              <div className="space-y-4">
                <h3 className="text-md font-medium flex items-center gap-2">
                  Exercise Types
                  {selectedExerciseTypes.length > 0 && (
                    <Badge variant="secondary">{selectedExerciseTypes.length} selected</Badge>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Select your preferred types of exercise (minimum 1 required)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {exerciseTypes.map((type) => (
                    <FormField
                      key={type.id}
                      control={form.control}
                      name="exerciseTypes"
                      render={({ field }) => {
                        return (
                          <FormItem key={type.id} className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <NativeCheckbox
                                name="exerciseTypes"
                                value={type.id}
                                checked={field.value?.includes(type.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, type.id])
                                    : field.onChange(field.value?.filter((value) => value !== type.id))
                                }}
                              />
                            </FormControl>
                            <div className="flex-1">
                              <FormLabel className="font-normal flex items-center gap-2">
                                <span className="text-lg">{type.icon}</span>
                                {type.label}
                              </FormLabel>
                              <div className="text-xs text-muted-foreground mt-1">
                                {type.description}
                              </div>
                            </div>
                          </FormItem>
                        )
                      }}
                    />
                  ))}
                </div>
              </div>

            {/* Hidden unit preference field - this is controlled by the switch */}
            <FormField
              control={form.control}
              name="unitPreference"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Input type="hidden" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={formState.isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                className={`bg-[#3E9EFF] hover:bg-[#3E9EFF]/90 ${onCancel ? 'flex-1' : 'w-full'}`}
                disabled={formState.isSubmitting || profileLoading || Object.keys(form.formState.errors).length > 0}
              >
                {formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Profile...
                  </>
                ) : Object.keys(form.formState.errors).length > 0 ? (
                  "Please Complete Required Fields"
                ) : (
                  "Save Profile"
                )}
              </Button>
            </div>
            
            {/* Validation Summary */}
            {Object.keys(form.formState.errors).length > 0 && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Please fix the following errors:</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4 mt-2 space-y-1">
                    {Object.entries(form.formState.errors).map(([field, error]) => (
                      <li key={field} className="text-sm">
                        <strong>{field}:</strong> {error?.message}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center border-t pt-6">
        <p className="text-sm text-muted-foreground">
          Your profile information helps us create highly personalized workout programs.
        </p>
      </CardFooter>
    </Card>
  )
}

