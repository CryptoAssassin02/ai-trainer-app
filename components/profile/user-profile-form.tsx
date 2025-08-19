"use client"

import { useState, useEffect } from "react"
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
import type { UserProfile } from "@/lib/api/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/providers/auth-provider"

// Define fitness goals options
const fitnessGoals = [
  { id: "weight-loss", label: "Weight Loss" },
  { id: "muscle-gain", label: "Muscle Gain" },
  { id: "strength", label: "Strength" },
  { id: "endurance", label: "Endurance" },
  { id: "flexibility", label: "Flexibility" },
  { id: "general-fitness", label: "General Fitness" },
  { id: "sports-performance", label: "Sports Performance" },
  { id: "body-recomposition", label: "Body Recomposition" },
]

// Define equipment options
const equipmentOptions = [
  { id: "dumbbells", label: "Dumbbells" },
  { id: "barbell", label: "Barbell" },
  { id: "kettlebell", label: "Kettlebell" },
  { id: "resistance-bands", label: "Resistance Bands" },
  { id: "pull-up-bar", label: "Pull-up Bar" },
  { id: "bench", label: "Bench" },
  { id: "squat-rack", label: "Squat Rack" },
  { id: "cardio-equipment", label: "Cardio Equipment" },
  { id: "cable-machine", label: "Cable Machine" },
  { id: "smith-machine", label: "Smith Machine" },
  { id: "gym-membership", label: "Gym Membership" },
]

// Use comprehensive validation schema with dynamic height validation
type FormValues = ProfileCreationFormData & {
  medicalConditions: string;
}

export function UserProfileForm() {
  const { profile, updateProfileAsync, isLoading: profileLoading, error: profileError } = useProfile()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMetric, setIsMetric] = useState<boolean>(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const { isAuthenticated } = useAuth()

  // Create dynamic schema based on current unit preference
  const currentSchema = createDynamicProfileSchema('update', isMetric ? 'metric' : 'imperial');
  
  // Initialize form with comprehensive validation
  const form = useForm<FormValues>({
    resolver: zodResolver(currentSchema),
    mode: 'onChange', // Real-time validation

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

  // Update form when profile changes
  useEffect(() => {
    if (!profileLoading && profile.data) {
      const profileData = profile.data as UserProfile;
      
      // Update isMetric based on the profile preference
      setIsMetric(profileData.unitPreference === "metric")

      form.reset({
        name: profileData.name || "",
        age: profileData.age || 30,
        gender: profileData.gender as "male" | "female" | "non-binary" | "prefer_not_to_say" || "prefer_not_to_say",
        height: isMetric 
          ? (profileData.height || 178)
          : profileData.height 
            ? { 
                feet: Math.floor(profileData.height as number / 30.48) || 5, 
                inches: Math.round((profileData.height as number % 30.48) / 2.54) || 10 
              }
            : { feet: 5, inches: 10 },
        weight: profileData.weight || (isMetric ? 72.5 : 160),
        experienceLevel: profileData.experienceLevel as "beginner" | "intermediate" | "advanced" || "beginner",
        goals: profileData.goals || [],
        medicalConditions: profileData.medicalConditions || "",
        equipment: profileData.equipment || [],
        unitPreference: profileData.unitPreference || "metric"
      })
    }
  }, [profile, profileLoading, form, isMetric])



  // Handle unit preference change
  const handleUnitChange = (newUnitPreference: "metric" | "imperial") => {
    const isNewMetric = newUnitPreference === "metric"
    setIsMetric(isNewMetric)
    
    // Get current height and weight
    const currentHeight = form.getValues('height')
    const currentWeight = form.getValues('weight')
    
    if (isNewMetric) {
      // Convert from imperial to metric
      if (typeof currentHeight === 'object' && currentHeight) {
        const { feet = 0, inches = 0 } = currentHeight
        const heightInCm = Math.round((feet * 30.48) + (inches * 2.54))
        form.setValue('height', heightInCm)
      }
      
      if (typeof currentWeight === 'number') {
        // Assume it's in pounds, convert to kg
        const weightInKg = Math.round(currentWeight * 0.453592 * 10) / 10
        form.setValue('weight', weightInKg)
      }
    } else {
      // Convert from metric to imperial
      if (typeof currentHeight === 'number') {
        const totalInches = currentHeight / 2.54
        const feet = Math.floor(totalInches / 12)
        const inches = Math.round(totalInches % 12)
        form.setValue('height', { feet, inches })
      }
      
      if (typeof currentWeight === 'number') {
        // Assume it's in kg, convert to pounds
        const weightInLbs = Math.round(currentWeight * 2.20462)
        form.setValue('weight', weightInLbs)
      }
    }
    
    form.setValue('unitPreference', newUnitPreference)
  }

  // Handle form submission
  async function onSubmit(data: FormValues) {
    setIsSubmitting(true)
    setFormError(null)
    setSuccessMessage(null)

    try {
      // Convert height and weight to a single unit for storage
      let heightInCm, weightInKg

      if (isMetric) {
        heightInCm = typeof data.height === 'number' ? data.height : undefined
        weightInKg = typeof data.weight === 'number' ? data.weight : undefined
      } else {
        // Convert imperial to metric
        if (typeof data.height === 'object' && data.height) {
          const { feet = 0, inches = 0 } = data.height
          heightInCm = feet * 30.48 + inches * 2.54
        }
        weightInKg = typeof data.weight === 'number' ? data.weight * 0.453592 : undefined
      }

      // Check for user authentication
      if (!isAuthenticated) {
        // If no authenticated user, show message
        setFormError("You need to be signed in to save your profile. Your changes will only be saved locally.")
      }

      // Prepare final data object
      const finalData = {
        name: data.name,
        age: data.age,
        gender: data.gender,
        height: heightInCm || 0,
        weight: weightInKg || 0,
        experienceLevel: data.experienceLevel,
        goals: data.goals, // FIXED: Use 'goals' not 'fitnessGoals'
        medicalConditions: data.medicalConditions || "",
        equipment: data.equipment || [],
        unitPreference: data.unitPreference // FIXED: Use camelCase not snake_case
      }

      // Update profile via the modern profile hooks
      await updateProfileAsync(finalData)
      setSuccessMessage("Your profile has been updated successfully.")
    } catch (error) {
      console.error("Error saving profile:", error)
      setFormError("Failed to save your profile. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (profileLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
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
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Your Fitness Profile</CardTitle>
        <CardDescription>
          Complete your profile to get personalized workout and nutrition recommendations.
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
        
        {formError && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        
        {successMessage && (
          <Alert className="mt-4 bg-green-50 border-green-200 text-green-800">
            <Check className="h-4 w-4 text-green-600" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Unit Preference Toggle */}
            <div className="flex justify-end">
              <div className="flex space-x-2 items-center bg-muted rounded-lg p-2">
                <span className={`text-sm ${!isMetric ? "font-medium" : "text-muted-foreground"}`}>Imperial</span>
                <Switch 
                  checked={isMetric} 
                  onCheckedChange={(checked) => handleUnitChange(checked ? "metric" : "imperial")}
                  data-testid="unit-toggle"
                />
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
                        maxLength={VALIDATION_CONSTANTS.NAME_MAX_LENGTH}
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
                          min={VALIDATION_CONSTANTS.AGE_MIN}
                          max={VALIDATION_CONSTANTS.AGE_MAX}
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
                              min={0}
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
                                  min={0}
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
                                  min={0}
                                  max={11}
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
                              min={0}
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
                              min={0}
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
                        maxLength={VALIDATION_CONSTANTS.MEDICAL_CONDITION_MAX_LENGTH * VALIDATION_CONSTANTS.MEDICAL_CONDITIONS_MAX}
                      />
                    </FormControl>
                    <FormDescription className="space-y-1">
                      <div>This information helps us provide safer workout recommendations. It will be kept confidential.</div>
                      <div className="text-xs text-muted-foreground">
                        Character count: {field.value?.length || 0}/{VALIDATION_CONSTANTS.MEDICAL_CONDITION_MAX_LENGTH * VALIDATION_CONSTANTS.MEDICAL_CONDITIONS_MAX}
                      </div>
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

            <Button
              type="submit"
              className="w-full bg-[#3E9EFF] hover:bg-[#3E9EFF]/90"
              disabled={isSubmitting || profileLoading || Object.keys(form.formState.errors).length > 0}
            >
              {isSubmitting ? (
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

