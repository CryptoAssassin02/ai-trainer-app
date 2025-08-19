/**
 * Enhanced Profile Form with React Query Integration
 * Demonstrates modern patterns with optimistic updates, real-time validation, and completion tracking
 */

'use client';

import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Info, AlertCircle, Check, TrendingUp, Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';

import { 
  useProfileQueryContext, 
  useProfileForm, 
  useProfileFormCompletion, 
  useProfileFormValidation 
} from './profile-query-provider';
import { 
  profileCreationSchema, 
  profileUpdateSchema, 
  createDynamicProfileSchema,
  type ProfileCreationFormData,
  type ProfileUpdateFormData,
  VALIDATION_CONSTANTS 
} from '@/lib/validation/profile-schemas';
import type { UpdateProfileRequest } from '@/lib/api/types';

// ==========================================
// FORM DATA INTERFACES
// ==========================================

type FormData = ProfileCreationFormData | ProfileUpdateFormData;

// ==========================================
// FORM OPTIONS
// ==========================================

const fitnessGoals = [
  { id: "weight_loss", label: "Weight Loss", icon: "📉" },
  { id: "muscle_gain", label: "Muscle Gain", icon: "💪" },
  { id: "strength", label: "Strength", icon: "🏋️" },
  { id: "endurance", label: "Endurance", icon: "🏃" },
  { id: "flexibility", label: "Flexibility", icon: "🧘" },
  { id: "general_fitness", label: "General Fitness", icon: "⚡" },
  { id: "sports_performance", label: "Sports Performance", icon: "🏆" },
  { id: "body_recomposition", label: "Body Recomposition", icon: "🔄" },
];

const equipmentOptions = [
  { id: "dumbbells", label: "Dumbbells" },
  { id: "barbell", label: "Barbell" },
  { id: "kettlebell", label: "Kettlebell" },
  { id: "resistance_bands", label: "Resistance Bands" },
  { id: "pull_up_bar", label: "Pull-up Bar" },
  { id: "bench", label: "Bench" },
  { id: "cable_machine", label: "Cable Machine" },
  { id: "treadmill", label: "Treadmill" },
  { id: "stationary_bike", label: "Stationary Bike" },
  { id: "rowing_machine", label: "Rowing Machine" },
  { id: "bodyweight_only", label: "Bodyweight Only" },
];

// ==========================================
// MAIN COMPONENT
// ==========================================

interface EnhancedProfileFormProps {
  mode?: 'create' | 'update';
  onSuccess?: (data: any) => void;
  onCancel?: () => void;
  enableOptimistic?: boolean;
  showCompletion?: boolean;
  showValidation?: boolean;
}

export function EnhancedProfileForm({
  mode = 'update',
  onSuccess,
  onCancel,
  enableOptimistic = true,
  showCompletion = true,
  showValidation = true,
}: EnhancedProfileFormProps) {
  
  // React Query integration
  const { 
    profile,
    preferences, 
    isLoading: contextLoading,
    isUpdating: contextUpdating,
    error: contextError 
  } = useProfileQueryContext();

  const {
    defaultValues,
    isLoading: formLoading,
    isSubmitting,
    onSubmit: handleFormSubmit,
    error: formError,
    isCreateMode,
    isUpdateMode,
  } = useProfileForm({
    mode,
    enableOptimistic,
    onSuccess,
    onError: (error) => console.error('Profile form error:', error),
  });

  const completion = useProfileFormCompletion();
  const validation = useProfileFormValidation();

  // Dynamic schema based on mode and unit preference
  const [unitPreference, setUnitPreference] = React.useState<'metric' | 'imperial'>(
    defaultValues.unitPreference || 'metric'
  );

  const schema = useMemo(() => {
    return createDynamicProfileSchema(
      isCreateMode ? 'create' : 'update',
      unitPreference
    );
  }, [unitPreference, isCreateMode]);

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange', // Real-time validation
  });

  // Watch unit preference changes
  const watchedUnitPreference = form.watch('unitPreference');
  useEffect(() => {
    if (watchedUnitPreference && watchedUnitPreference !== unitPreference) {
      setUnitPreference(watchedUnitPreference);
    }
  }, [watchedUnitPreference, unitPreference]);

  // Update form when data loads
  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0) {
      form.reset(defaultValues);
    }
  }, [defaultValues, form]);

  // Form submission
  const onSubmit = async (data: FormData) => {
    try {
      await handleFormSubmit(data as UpdateProfileRequest);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  // Loading state
  const isLoading = contextLoading || formLoading;
  const isProcessing = isSubmitting || contextUpdating;

  if (isLoading) {
    return <ProfileFormSkeleton />;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {isCreateMode ? '🆕 Create Your Profile' : '✏️ Update Profile'}
            </CardTitle>
            <CardDescription>
              {isCreateMode 
                ? 'Let\'s get started with your fitness journey' 
                : 'Keep your profile up to date for better recommendations'
              }
            </CardDescription>
          </div>
          
          {showCompletion && (
            <ProfileCompletionBadge 
              percentage={completion.percentage}
              isComplete={completion.isComplete}
            />
          )}
        </div>

        {showCompletion && !completion.isComplete && (
          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertTitle>Profile Completion: {completion.percentage}%</AlertTitle>
            <AlertDescription>
              {completion.getNextRecommendation() || 'Complete your profile for better workout recommendations'}
            </AlertDescription>
            <Progress value={completion.percentage} className="mt-2" />
          </Alert>
        )}

        {showValidation && validation.hasErrors && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Validation Issues ({validation.errors.length})</AlertTitle>
            <AlertDescription>
              Please review and fix the highlighted issues below.
            </AlertDescription>
          </Alert>
        )}

        {(contextError || formError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {contextError?.message || formError?.message || 'An error occurred'}
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <CardContent className="space-y-6">
            
            {/* Unit Preference */}
            <FormField
              control={form.control}
              name="unitPreference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    🌍 Unit System
                    <FieldStatusIcon fieldName="unitPreference" />
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-row space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="metric" id="metric" />
                        <FormLabel htmlFor="metric" className="font-normal cursor-pointer">
                          Metric (kg, cm)
                        </FormLabel>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="imperial" id="imperial" />
                        <FormLabel htmlFor="imperial" className="font-normal cursor-pointer">
                          Imperial (lbs, ft/in)
                        </FormLabel>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FieldValidationMessage fieldName="unitPreference" />
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Personal Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        👤 Full Name
                        <FieldStatusIcon fieldName="name" />
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={`Enter your name (${VALIDATION_CONSTANTS.NAME_MIN_LENGTH}-${VALIDATION_CONSTANTS.NAME_MAX_LENGTH} characters)`}
                          {...field} 
                        />
                      </FormControl>
                      <FieldValidationMessage fieldName="name" />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Age */}
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        🎂 Age
                        <FieldStatusIcon fieldName="age" />
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={VALIDATION_CONSTANTS.AGE_MIN}
                          max={VALIDATION_CONSTANTS.AGE_MAX}
                          placeholder={`${VALIDATION_CONSTANTS.AGE_MIN}-${VALIDATION_CONSTANTS.AGE_MAX} years`}
                          value={value || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            onChange(val ? Number.parseInt(val, 10) : "");
                          }}
                          {...fieldProps}
                        />
                      </FormControl>
                      <FieldValidationMessage fieldName="age" />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Gender */}
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      ⚧️ Gender Identity
                      <FieldStatusIcon fieldName="gender" />
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="grid grid-cols-2 md:grid-cols-3 gap-2"
                      >
                        {[
                          { value: 'male', label: 'Male' },
                          { value: 'female', label: 'Female' },
                          { value: 'non-binary', label: 'Non-binary' },
                          { value: 'other', label: 'Other' },
                          { value: 'prefer_not_to_say', label: 'Prefer not to say' },
                        ].map(({ value, label }) => (
                          <div key={value} className="flex items-center space-x-2">
                            <RadioGroupItem value={value} id={`gender-${value}`} />
                            <FormLabel htmlFor={`gender-${value}`} className="font-normal text-sm cursor-pointer">
                              {label}
                            </FormLabel>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FieldValidationMessage fieldName="gender" />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Physical Measurements */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Physical Measurements</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Height */}
                <HeightInput 
                  control={form.control}
                  unitPreference={unitPreference}
                />

                {/* Weight */}
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        ⚖️ Weight
                        <FieldStatusIcon fieldName="weight" />
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder={`Weight in ${unitPreference === 'metric' ? 'kg' : 'lbs'}`}
                          value={value || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            onChange(val ? Number.parseFloat(val) : "");
                          }}
                          {...fieldProps}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter your weight in {unitPreference === 'metric' ? 'kilograms' : 'pounds'}
                      </FormDescription>
                      <FieldValidationMessage fieldName="weight" />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Fitness Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Fitness Information</h3>

              {/* Experience Level */}
              <FormField
                control={form.control}
                name="experienceLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      📊 Experience Level
                      <FieldStatusIcon fieldName="experienceLevel" />
                    </FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your fitness experience level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">🌱 Beginner (0-6 months)</SelectItem>
                          <SelectItem value="intermediate">💪 Intermediate (6 months - 2 years)</SelectItem>
                          <SelectItem value="advanced">🏆 Advanced (2+ years)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FieldValidationMessage fieldName="experienceLevel" />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Fitness Goals */}
              <FormField
                control={form.control}
                name="goals"
                render={() => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      🎯 Fitness Goals
                      <FieldStatusIcon fieldName="goals" />
                    </FormLabel>
                    <FormDescription>
                      Select all that apply (recommended: 3-5 goals for best results)
                    </FormDescription>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {fitnessGoals.map((goal) => (
                        <FormField
                          key={goal.id}
                          control={form.control}
                          name="goals"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(goal.id)}
                                  onCheckedChange={(checked) => {
                                    const currentGoals = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentGoals, goal.id]);
                                    } else {
                                      field.onChange(currentGoals.filter((g: string) => g !== goal.id));
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                {goal.icon} {goal.label}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FieldValidationMessage fieldName="goals" />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Equipment */}
              <FormField
                control={form.control}
                name="equipment"
                render={() => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      🏋️ Available Equipment
                      <FieldStatusIcon fieldName="equipment" />
                    </FormLabel>
                    <FormDescription>
                      Select all equipment you have access to
                    </FormDescription>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {equipmentOptions.map((equipment) => (
                        <FormField
                          key={equipment.id}
                          control={form.control}
                          name="equipment"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(equipment.id)}
                                  onCheckedChange={(checked) => {
                                    const currentEquipment = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentEquipment, equipment.id]);
                                    } else {
                                      field.onChange(currentEquipment.filter((e: string) => e !== equipment.id));
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                {equipment.label}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FieldValidationMessage fieldName="equipment" />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Workout Frequency */}
              <FormField
                control={form.control}
                name="workoutFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      📅 Workout Frequency
                      <FieldStatusIcon fieldName="workoutFrequency" />
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., 3-4 times per week, Daily, Every other day"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Describe how often you plan to workout
                    </FormDescription>
                    <FieldValidationMessage fieldName="workoutFrequency" />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row gap-3">
            <Button
              type="submit"
              className="w-full sm:w-auto bg-[#3E9EFF] hover:bg-[#3E9EFF]/90"
              disabled={isProcessing || !form.formState.isValid}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isCreateMode ? 'Creating Profile...' : 'Saving Changes...'}
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {isCreateMode ? 'Create Profile' : 'Save Changes'}
                </>
              )}
            </Button>

            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isProcessing}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            )}

            {enableOptimistic && isProcessing && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Info className="mr-1 h-3 w-3" />
                Changes applied optimistically
              </div>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

// ==========================================
// HELPER COMPONENTS
// ==========================================

function ProfileFormSkeleton() {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-10 bg-gray-200 rounded" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ProfileCompletionBadge({ 
  percentage, 
  isComplete 
}: { 
  percentage: number; 
  isComplete: boolean; 
}) {
  return (
    <Badge variant={isComplete ? "default" : "secondary"} className="flex items-center gap-1">
      {isComplete ? <Star className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
      {percentage}% Complete
    </Badge>
  );
}

function FieldStatusIcon({ fieldName }: { fieldName: string }) {
  const completion = useProfileFormCompletion();
  const status = completion.getFieldCompletionStatus(fieldName);
  
  if (status === 'completed') {
    return <Check className="h-3 w-3 text-green-500" />;
  }
  
  if (status === 'missing') {
    return <AlertCircle className="h-3 w-3 text-orange-500" />;
  }
  
  return null;
}

function FieldValidationMessage({ fieldName }: { fieldName: string }) {
  const validation = useProfileFormValidation();
  const fieldValidation = validation.getFieldValidation(fieldName);
  
  if (!fieldValidation?.hasIssues) return null;
  
  return (
    <Alert variant={fieldValidation.severity === 'error' ? 'destructive' : 'default'} className="mt-2">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        {fieldValidation.error?.message || fieldValidation.warning?.message}
        {fieldValidation.warning?.suggestion && (
          <div className="mt-1 text-sm font-medium">
            💡 {fieldValidation.warning.suggestion}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

function HeightInput({ 
  control, 
  unitPreference 
}: { 
  control: any; 
  unitPreference: 'metric' | 'imperial'; 
}) {
  if (unitPreference === 'imperial') {
    return (
      <div className="space-y-4">
        <FormLabel className="flex items-center gap-2">
          📏 Height
          <FieldStatusIcon fieldName="height" />
        </FormLabel>
        
        <div className="grid grid-cols-2 gap-2">
          <FormField
            control={control}
            name="height.feet"
            render={({ field: { value, onChange, ...fieldProps } }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    placeholder="Feet"
                    value={value || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      onChange(val ? Number.parseInt(val, 10) : "");
                    }}
                    {...fieldProps}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={control}
            name="height.inches"
            render={({ field: { value, onChange, ...fieldProps } }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="11"
                    placeholder="Inches"
                    value={value || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      onChange(val ? Number.parseInt(val, 10) : "");
                    }}
                    {...fieldProps}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FieldValidationMessage fieldName="height" />
      </div>
    );
  }

  return (
    <FormField
      control={control}
      name="height"
      render={({ field: { value, onChange, ...fieldProps } }) => (
        <FormItem>
          <FormLabel className="flex items-center gap-2">
            📏 Height
            <FieldStatusIcon fieldName="height" />
          </FormLabel>
          <FormControl>
            <Input
              type="number"
              step="0.1"
              placeholder="Height in centimeters"
              value={value || ""}
              onChange={(e) => {
                const val = e.target.value;
                onChange(val ? Number.parseFloat(val) : "");
              }}
              {...fieldProps}
            />
          </FormControl>
          <FormDescription>
            Enter your height in centimeters
          </FormDescription>
          <FieldValidationMessage fieldName="height" />
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default EnhancedProfileForm;
