"use client"

import { useState, useEffect, useRef } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
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
import { NativeRadioGroup } from "@/components/ui/native-radio-group"
import { NativeSelect } from "@/components/ui/native-select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useProfile } from "@/hooks/use-profile-queries"
import { useProfileFormLogic } from "@/hooks/use-profile-form-logic"
import type { UserProfile } from "@/lib/api/types"
import type { UserProfileFormProps } from "@/lib/validation/profile-form-types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/components/auth/supabase-auth-provider"

// Define fitness goals options
const fitnessGoals = [
  { id: "weight_loss", label: "Weight Loss" },
  { id: "muscle_gain", label: "Muscle Gain" },
  { id: "strength", label: "Strength" },
  { id: "endurance", label: "Endurance" },
  { id: "flexibility", label: "Flexibility" },
  { id: "general_fitness", label: "General Fitness" },
  { id: "sports_performance", label: "Sports Performance" },
  { id: "body_recomposition", label: "Body Recomposition" },
]

// Define equipment options - MUST match MultiStepProfileForm equipment IDs
const equipmentOptions = [
  // Free Weights
  { id: "dumbbells", label: "Dumbbells" },
  { id: "barbells", label: "Barbells" },
  { id: "kettlebells", label: "Kettlebells" },
  { id: "medicine_balls", label: "Medicine Balls" },
  
  // Machines & Stations
  { id: "cable_machine", label: "Cable Machine" },
  { id: "smith_machine", label: "Smith Machine" },
  { id: "power_rack", label: "Power Rack/Squat Rack" },
  { id: "leg_press", label: "Leg Press Machine" },
  { id: "lat_pulldown", label: "Lat Pulldown" },
  
  // Cardio Equipment
  { id: "treadmill", label: "Treadmill" },
  { id: "stationary_bike", label: "Stationary Bike" },
  { id: "elliptical", label: "Elliptical Machine" },
  { id: "rowing_machine", label: "Rowing Machine" },
  { id: "stair_climber", label: "Stair Climber" },
  
  // Bodyweight & Accessories
  { id: "pull_up_bar", label: "Pull-up Bar" },
  { id: "resistance_bands", label: "Resistance Bands" },
  { id: "suspension_trainer", label: "Suspension Trainer" },
  { id: "yoga_mat", label: "Yoga/Exercise Mat" },
  { id: "foam_roller", label: "Foam Roller" },
  
  // Specialized Equipment
  { id: "battle_ropes", label: "Battle Ropes" },
  { id: "plyometric_box", label: "Plyometric Box" },
  { id: "agility_ladder", label: "Agility Ladder" },
  { id: "parallette_bars", label: "Parallette Bars" },
]

// Use comprehensive validation schema with dynamic height validation
type FormValues = ProfileCreationFormData & {
  medicalConditions: string;
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
      medicalConditions: "",
      equipment: [],
      unitPreference: "metric"
    },
  })

  // Destructure reset method for proper useEffect dependencies (React Hook Form best practice)
  const { reset } = form;

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
        medicalConditions: Array.isArray(profileData.medicalConditions) 
          ? profileData.medicalConditions.join(', ') 
          : (profileData.medicalConditions || ""),
        equipment: profileData.equipment || [],
        unitPreference: profileData.unitPreference || "metric"
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
          medicalConditions: data.medicalConditions 
            ? data.medicalConditions.split(',').map(s => s.trim()).filter(s => s.length > 0)
            : [],
          equipment: data.equipment || [],
          unitPreference: data.unitPreference // Backend uses this for proper conversion
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
              The information you provide here will be used to personalize your workout plans and recommendations.
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
                    <FormLabel>Full Name</FormLabel>
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
                      <FormLabel>Age</FormLabel>
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
                      <FormLabel>Gender (Optional)</FormLabel>
                                              <FormControl>
                          <NativeRadioGroup
                            name="gender"
                            value={field.value}
                            onValueChange={field.onChange}
                            options={[
                              { value: "male", label: "Male" },
                              { value: "female", label: "Female" },
                              { value: "non-binary", label: "Non-binary" },
                              { value: "other", label: "Other" },
                              { value: "prefer_not_to_say", label: "Prefer not to say" }
                            ]}
                            className="flex flex-col space-y-1"
                          />
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
                <div className="text-sm font-medium">Height</div>
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
                <div className="text-sm font-medium">Weight</div>
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
                    <FormLabel>Experience Level</FormLabel>
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
                    <FormDescription>
                      This helps us tailor workout intensity and progression to your level.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Fitness Goals Field */}
              <div className="mb-4">
                <div className="text-sm font-medium">Fitness Goals (select all that apply)</div>
                <p className="text-sm text-muted-foreground">Choose the goals that are most important to you.</p>
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

              {/* Medical Conditions Field with Enhanced Validation */}
              <FormField
                control={form.control}
                name="medicalConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medical Conditions or Movement Limitations</FormLabel>
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
            </div>

            {/* Equipment Availability Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Equipment Availability</h3>

              <div className="mb-4">
                <div className="text-sm font-medium">Available Equipment (select all that apply)</div>
                <p className="text-sm text-muted-foreground">
                  Select the equipment you have access to at home or at your gym.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {equipmentOptions.map((item) => (
                  <FormField
                    key={item.id}
                    control={form.control}
                    name="equipment"
                    render={({ field }) => {
                      return (
                        <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <NativeCheckbox
                              name="equipment"
                              value={item.id}
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
          Your profile information helps us create personalized workout and nutrition plans.
        </p>
      </CardFooter>
    </Card>
  )
}

