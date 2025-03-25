"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2, Info, AlertCircle, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useProfile } from "@/lib/profile-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { useSupabase } from "@/utils/supabase/context"

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

// Define form schema with validation
const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  age: z.coerce
    .number()
    .int()
    .min(13, { message: "You must be at least 13 years old." })
    .max(120, { message: "Age must be less than 120." }),
  gender: z.enum(["male", "female", "non-binary", "prefer-not-to-say"], {
    required_error: "Please select a gender.",
  }),
  heightFeet: z.coerce.number().min(0).optional(),
  heightInches: z.coerce.number().min(0).max(11).optional(),
  heightCm: z.coerce.number().min(0).optional(),
  weightLbs: z.coerce.number().min(0).optional(),
  weightKg: z.coerce.number().min(0).optional(),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"], {
    required_error: "Please select your experience level.",
  }),
  fitnessGoals: z.array(z.string()).min(1, { message: "Please select at least one fitness goal." }),
  medicalConditions: z.string().optional(),
  equipment: z.array(z.string()).optional(),
  unitPreference: z.enum(["metric", "imperial"], {
    required_error: "Please select your preferred unit system."
  })
})

type FormValues = z.infer<typeof formSchema>

export function UserProfileForm() {
  const { profile, updateProfile, isLoading: profileLoading, error: profileError } = useProfile()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMetric, setIsMetric] = useState(profile.unit_preference === "metric")
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const supabase = useSupabase()

  // Initialize form with values from profile context
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: profile.name || "",
      age: profile.age || 30,
      gender: (profile.gender as any) || "prefer-not-to-say",
      heightFeet: !isMetric ? Math.floor(profile.height / 30.48) || 5 : undefined,
      heightInches: !isMetric ? Math.round((profile.height % 30.48) / 2.54) || 10 : undefined,
      heightCm: isMetric ? profile.height || 178 : undefined,
      weightLbs: !isMetric ? Math.round(profile.weight * 2.20462) || 160 : undefined,
      weightKg: isMetric ? profile.weight || 72.5 : undefined,
      experienceLevel: (profile.experienceLevel as any) || "beginner",
      fitnessGoals: profile.fitnessGoals || [],
      medicalConditions: profile.medicalConditions || "",
      equipment: profile.equipment || [],
      unitPreference: profile.unit_preference || "metric"
    },
  })

  // Update form when profile changes
  useEffect(() => {
    if (!profileLoading && profile) {
      // Update isMetric based on the profile preference
      setIsMetric(profile.unit_preference === "metric")

      form.reset({
        name: profile.name || "",
        age: profile.age || 30,
        gender: (profile.gender as any) || "prefer-not-to-say",
        heightFeet: !isMetric ? Math.floor(profile.height / 30.48) || 5 : undefined,
        heightInches: !isMetric ? Math.round((profile.height % 30.48) / 2.54) || 10 : undefined,
        heightCm: isMetric ? profile.height || 178 : undefined,
        weightLbs: !isMetric ? Math.round(profile.weight * 2.20462) || 160 : undefined,
        weightKg: isMetric ? profile.weight || 72.5 : undefined,
        experienceLevel: (profile.experienceLevel as any) || "beginner",
        fitnessGoals: profile.fitnessGoals || [],
        medicalConditions: profile.medicalConditions || "",
        equipment: profile.equipment || [],
        unitPreference: profile.unit_preference || "metric"
      })
    }
  }, [profile, profileLoading, form, isMetric])

  // Handle unit preference change
  const handleUnitChange = (newUnitPreference: "metric" | "imperial") => {
    const isNewMetric = newUnitPreference === "metric"
    setIsMetric(isNewMetric)
    
    // Get current height and weight
    let currentHeight, currentWeight
    
    if (isNewMetric) {
      // Convert from imperial to metric
      const feet = form.getValues('heightFeet') || 0
      const inches = form.getValues('heightInches') || 0
      const pounds = form.getValues('weightLbs') || 0
      
      currentHeight = Math.round((feet * 30.48) + (inches * 2.54))
      currentWeight = Math.round(pounds * 0.453592 * 10) / 10
      
      form.setValue('heightCm', currentHeight)
      form.setValue('weightKg', currentWeight)
    } else {
      // Convert from metric to imperial
      const cm = form.getValues('heightCm') || 0
      const kg = form.getValues('weightKg') || 0
      
      const totalInches = cm / 2.54
      const feet = Math.floor(totalInches / 12)
      const inches = Math.round(totalInches % 12)
      const pounds = Math.round(kg * 2.20462)
      
      form.setValue('heightFeet', feet)
      form.setValue('heightInches', inches)
      form.setValue('weightLbs', pounds)
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
        heightInCm = data.heightCm
        weightInKg = data.weightKg
      } else {
        // Convert imperial to metric
        heightInCm = data.heightFeet && data.heightInches ? data.heightFeet * 30.48 + data.heightInches * 2.54 : undefined
        weightInKg = data.weightLbs ? data.weightLbs * 0.453592 : undefined
      }

      // Check for user authentication
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
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
        fitnessGoals: data.fitnessGoals,
        medicalConditions: data.medicalConditions || "",
        equipment: data.equipment || [],
        unit_preference: data.unitPreference
      }

      // Update profile via the ProfileProvider
      await updateProfile(finalData)
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
            <AlertDescription>{profileError}</AlertDescription>
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
                />
                <span className={`text-sm ${isMetric ? "font-medium" : "text-muted-foreground"}`}>Metric</span>
              </div>
            </div>

            {/* Basic Information Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Basic Information</h3>

              {/* Name Field */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Age and Gender - Two columns on larger screens */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Age Field */}
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel>Age</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={13}
                          max={120}
                          placeholder="Enter your age"
                          value={value || ""}
                          onChange={(e) => {
                            const val = e.target.value
                            onChange(val ? Number.parseInt(val, 10) : "")
                          }}
                          {...fieldProps}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Gender Field */}
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Gender</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center space-x-3 space-y-0">
                              <RadioGroupItem value="male" id="gender-male" />
                              <FormLabel htmlFor="gender-male" className="font-normal">
                                Male
                              </FormLabel>
                            </div>
                            <div className="flex items-center space-x-3 space-y-0">
                              <RadioGroupItem value="female" id="gender-female" />
                              <FormLabel htmlFor="gender-female" className="font-normal">
                                Female
                              </FormLabel>
                            </div>
                            <div className="flex items-center space-x-3 space-y-0">
                              <RadioGroupItem value="non-binary" id="gender-non-binary" />
                              <FormLabel htmlFor="gender-non-binary" className="font-normal">
                                Non-binary
                              </FormLabel>
                            </div>
                            <div className="flex items-center space-x-3 space-y-0">
                              <RadioGroupItem value="prefer-not-to-say" id="gender-prefer-not-to-say" />
                              <FormLabel htmlFor="gender-prefer-not-to-say" className="font-normal">
                                Prefer not to say
                              </FormLabel>
                            </div>
                          </div>
                        </RadioGroup>
                      </FormControl>
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
                    name="heightCm"
                    render={({ field: { value, onChange, ...fieldProps } }) => (
                      <FormItem>
                        <div className="flex items-center space-x-2">
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              placeholder="Height"
                              value={value || ""}
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
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="heightFeet"
                      render={({ field: { value, onChange, ...fieldProps } }) => (
                        <FormItem>
                          <div className="flex items-center space-x-2">
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                placeholder="Feet"
                                value={value || ""}
                                onChange={(e) => {
                                  const val = e.target.value
                                  onChange(val ? Number.parseInt(val, 10) : "")
                                }}
                                {...fieldProps}
                                className="w-full"
                              />
                            </FormControl>
                            <span className="text-muted-foreground">ft</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="heightInches"
                      render={({ field: { value, onChange, ...fieldProps } }) => (
                        <FormItem>
                          <div className="flex items-center space-x-2">
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                max={11}
                                placeholder="Inches"
                                value={value || ""}
                                onChange={(e) => {
                                  const val = e.target.value
                                  onChange(val ? Number.parseInt(val, 10) : "")
                                }}
                                {...fieldProps}
                                className="w-full"
                              />
                            </FormControl>
                            <span className="text-muted-foreground">in</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Weight Field */}
              <div className="space-y-4">
                <div className="text-sm font-medium">Weight</div>
                {isMetric ? (
                  <FormField
                    control={form.control}
                    name="weightKg"
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
                    name="weightLbs"
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your experience level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner (0-6 months of consistent training)</SelectItem>
                        <SelectItem value="intermediate">
                          Intermediate (6 months - 2 years of consistent training)
                        </SelectItem>
                        <SelectItem value="advanced">Advanced (2+ years of consistent training)</SelectItem>
                      </SelectContent>
                    </Select>
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
                    name="fitnessGoals"
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

              {/* Medical Conditions Field */}
              <FormField
                control={form.control}
                name="medicalConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medical Conditions or Movement Limitations</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Please list any medical conditions, injuries, or movement limitations that might affect your workouts."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This information helps us provide safer workout recommendations. It will be kept confidential.
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
              disabled={isSubmitting || profileLoading}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Profile...
                </>
              ) : (
                "Save Profile"
              )}
            </Button>
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

