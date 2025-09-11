/**
 * Goals & Preferences Step Component
 * Phase 2 - Fitness goals, exercise types, medical limitations, and workout frequency
 * Follows proven fitness-info-step.tsx patterns with workout-specific enhancements
 */

'use client';

import React, { useState } from 'react';
import { useSafeFormWatch } from '@/hooks/use-safe-form-watch';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { NativeSelect } from '@/components/ui/native-select';
import { NativeCheckbox } from '@/components/ui/native-checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface GoalsPreferencesStepProps {
  form: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  userProfile: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  isLoading?: boolean;
}

// Fitness goals with icons and descriptions (from profile patterns)
const fitnessGoals = [
  { id: "weight_loss", label: "Weight Loss", icon: "📉", description: "Burn calories and reduce body fat" },
  { id: "muscle_gain", label: "Muscle Gain", icon: "💪", description: "Build lean muscle mass" },
  { id: "strength", label: "Strength", icon: "🏋️", description: "Increase overall strength" },
  { id: "endurance", label: "Endurance", icon: "🏃", description: "Improve cardiovascular fitness" },
  { id: "flexibility", label: "Flexibility", icon: "🧘", description: "Enhance mobility and range of motion" },
  { id: "general_fitness", label: "General Fitness", icon: "⚡", description: "Overall health and wellness" },
  { id: "sports_performance", label: "Sports Performance", icon: "🏆", description: "Athletic performance enhancement" },
  { id: "body_recomposition", label: "Body Recomposition", icon: "🔄", description: "Lose fat while gaining muscle" },
];

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
];

// Common workout frequencies - ALIGNED WITH PROFILE FORM VALUES
const workoutFrequencies = [
  { value: "1", label: "1x per week" },
  { value: "2", label: "2x per week" },
  { value: "3", label: "3x per week" },
  { value: "4", label: "4x per week" },
  { value: "5", label: "5x per week" },
  { value: "6", label: "6x per week" },
  { value: "7", label: "Daily" },
];

export function GoalsPreferencesStep({ form, userProfile, isLoading }: GoalsPreferencesStepProps) {
  const [showMedicalLimitations, setShowMedicalLimitations] = useState(false);
  
  const selectedGoals = useSafeFormWatch(form, 'goals', []);
  const selectedExerciseTypes = useSafeFormWatch(form, 'exerciseTypes', []);

  // Check if user has medical conditions from profile
  const hasProfileMedicalConditions = userProfile?.medicalConditions && 
    (Array.isArray(userProfile.medicalConditions) ? userProfile.medicalConditions.length > 0 : 
     userProfile.medicalConditions.trim().length > 0);

  return (
    <div className="space-y-6">
      
      {/* Fitness Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            🎯 Fitness Goals
            {selectedGoals.length > 0 && (
              <Badge variant="secondary">{selectedGoals.length} selected</Badge>
            )}
          </CardTitle>
          {userProfile?.goals?.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Pre-loaded from your profile. You can modify these selections or add new goals.
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="goals"
            render={() => (
              <FormItem>
                <FormLabel>Select all goals that apply to you (minimum 1 required)</FormLabel>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {fitnessGoals.map((goal) => (
                    <FormField
                      key={goal.id}
                      control={form.control}
                      name="goals"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                              <NativeCheckbox
                                checked={field.value?.includes(goal.id)}
                                onCheckedChange={(checked) => {
                                  const currentGoals = field.value || [];
                                  if (checked) {
                                    if (currentGoals.length < 3) {
                                      field.onChange([...currentGoals, goal.id]);
                                    }
                                  } else {
                                    field.onChange(currentGoals.filter((g: string) => g !== goal.id));
                                  }
                                }}
                                disabled={isLoading || (!field.value?.includes(goal.id) && (field.value?.length || 0) >= 3)}
                                data-testid={`goal-${goal.id}`}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{goal.icon}</span>
                                  <span className="font-medium">{goal.label}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {goal.description}
                                </p>
                              </div>
                            </label>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Primary Goal Selection - Show when 2+ goals selected */}
      {selectedGoals.length > 1 && (
        <Card className="border-cornflower-blue/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              🎯 Primary Goal Selection
              <Badge variant="outline">Optional</Badge>
            </CardTitle>
            <CardDescription>
              Choose your main focus. This goal gets 60% priority in your workout plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="primaryGoal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Goal</FormLabel>
                  <FormControl>
                    <NativeSelect
                      value={field.value || selectedGoals[0]}
                      onValueChange={field.onChange}
                      disabled={isLoading}
                      options={selectedGoals.map((goalId: string) => {
                        const goal = fitnessGoals.find(g => g.id === goalId);
                        return {
                          value: goalId,
                          label: `${goal?.icon} ${goal?.label}`
                        };
                      })}
                    />
                  </FormControl>
                  <FormDescription>
                    Your primary goal will receive the most focus in the workout plan
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      )}

      {/* Exercise Types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            🏋️ Exercise Types
            {selectedExerciseTypes.length > 0 && (
              <Badge variant="secondary">{selectedExerciseTypes.length} selected</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="exerciseTypes"
            render={() => (
              <FormItem>
                <FormLabel>Select your preferred types of exercise (minimum 1 required)</FormLabel>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {exerciseTypes.map((type) => (
                    <FormField
                      key={type.id}
                      control={form.control}
                      name="exerciseTypes"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                              <NativeCheckbox
                                checked={field.value?.includes(type.id)}
                                onCheckedChange={(checked) => {
                                  const updatedTypes = checked
                                    ? [...(field.value || []), type.id]
                                    : field.value?.filter((t: string) => t !== type.id) || [];
                                  field.onChange(updatedTypes);
                                }}
                                disabled={isLoading}
                                data-testid={`exercise-type-${type.id}`}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{type.icon}</span>
                                  <span className="font-medium">{type.label}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {type.description}
                                </p>
                              </div>
                            </label>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Medical Limitations (following profile pattern) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🏥 Physical Limitations</CardTitle>
          {hasProfileMedicalConditions && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                We found medical conditions in your profile. Please review and update as needed for workout safety.
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <NativeCheckbox
                checked={showMedicalLimitations}
                onCheckedChange={setShowMedicalLimitations}
                disabled={isLoading}
                data-testid="has-medical-limitations"
              />
              <label className="text-sm font-medium cursor-pointer">
                I have physical limitations or medical conditions that affect my workouts
              </label>
            </div>

            {showMedicalLimitations && (
              <FormField
                control={form.control}
                name="restrictions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Physical Limitations or Medical Conditions</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe any injuries, medical conditions, or physical limitations (e.g., knee injury, lower back pain, heart condition)..."
                        value={Array.isArray(field.value) ? field.value.join(', ') : (field.value || '')}
                        onChange={(e) => {
                          const text = e.target.value;
                          const restrictionsArray = text
                            .split(',')
                            .map(r => r.trim())
                            .filter(r => r.length > 0);
                          field.onChange(restrictionsArray);
                        }}
                        disabled={isLoading}
                        className="min-h-[100px]"
                        data-testid="medical-limitations-textarea"
                      />
                    </FormControl>
                    <FormDescription>
                      This information helps us create safe, personalized workout recommendations.
                      Separate multiple conditions with commas.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Workout Frequency */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📅 Workout Frequency</CardTitle>
          {userProfile?.workoutFrequency && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Current preference from profile: <strong>{userProfile.workoutFrequency}</strong>
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="workoutFrequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>How often do you want to work out?</FormLabel>
                <FormControl>
                  <NativeSelect
                    onValueChange={field.onChange}
                    value={field.value || ''}
                    disabled={isLoading}
                    data-testid="workout-frequency-select"
                    placeholder="Select your preferred workout frequency"
                    options={workoutFrequencies.map(freq => ({
                      value: freq.value,
                      label: freq.label
                    }))}
                  />
                </FormControl>
                <FormDescription>
                  This helps us plan the right workout intensity and recovery time
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}


