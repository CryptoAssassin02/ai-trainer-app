/**
 * Fitness Information Step Component
 * Phase 2.1.4 - Multi-step form component for fitness experience, goals, and medical considerations
 */

'use client';

import React, { useState } from 'react';
import { useSafeFormWatch } from '@/hooks/use-safe-form-watch';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { NativeSelect } from '@/components/ui/native-select';
import { NativeCheckbox } from '@/components/ui/native-checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
// Use dynamic import for lucide-react to handle Jest environment issues
let Info: any = 'div';
let Plus: any = 'div';
let X: any = 'div';
try {
  const lucideReact = require("lucide-react");
  Info = lucideReact.Info || 'div';
  Plus = lucideReact.Plus || 'div';
  X = lucideReact.X || 'div';
} catch (e) {
  // Fallback to div in test environment
  Info = 'div';
  Plus = 'div';
  X = 'div';
}
import { VALIDATION_CONSTANTS } from '@/lib/validation/profile-schemas';

interface FitnessInfoStepProps {
  form: any;
  unitPreference: 'metric' | 'imperial';
  isLoading?: boolean;
}

const fitnessGoals = [
  { id: "weight_loss", label: "Weight Loss", icon: "📉", description: "Reduce body weight and body fat" },
  { id: "muscle_gain", label: "Muscle Gain", icon: "💪", description: "Build lean muscle mass" },
  { id: "strength", label: "Strength", icon: "🏋️", description: "Increase maximum strength" },
  { id: "endurance", label: "Endurance", icon: "🏃", description: "Improve cardiovascular fitness" },
  { id: "flexibility", label: "Flexibility", icon: "🧘", description: "Enhance range of motion" },
  { id: "general_fitness", label: "General Fitness", icon: "⚡", description: "Overall health and wellness" },
  { id: "sports_performance", label: "Sports Performance", icon: "🏆", description: "Excel in specific sports" },
  { id: "body_recomposition", label: "Body Recomposition", icon: "🔄", description: "Lose fat while gaining muscle" },
];

export function FitnessInfoStep({ form, unitPreference, isLoading }: FitnessInfoStepProps) {
  const [showMedicalConditions, setShowMedicalConditions] = useState(false);
  const selectedGoals = useSafeFormWatch(form, 'goals', []);
  const medicalConditions = useSafeFormWatch(form, 'medicalConditions', '');



  return (
    <div className="space-y-6">
      
      {/* Experience Level */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📊 Fitness Experience Level</CardTitle>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="experienceLevel"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <NativeSelect
                    onValueChange={field.onChange}
                    value={field.value || ''}
                    disabled={isLoading}
                    data-testid="experience-level-select"
                    placeholder="Select your fitness experience level"
                    options={[
                      { value: 'beginner', label: '🌱 Beginner (0-6 months of consistent training)' },
                      { value: 'intermediate', label: '💪 Intermediate (6 months - 2 years of consistent training)' },
                      { value: 'advanced', label: '🏆 Advanced (2+ years of consistent training)' }
                    ]}
                  />
                </FormControl>
                <FormDescription>
                  This helps us tailor workout intensity and progression to your level
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Fitness Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🎯 Fitness Goals</CardTitle>
          <div className="space-y-2">
            <FormDescription>
              Select up to {VALIDATION_CONSTANTS.GOALS_MAX} goals that are most important to you
            </FormDescription>
            {selectedGoals.length > 0 && (
              <Badge variant="outline" className="inline-flex">
                {selectedGoals.length}/{VALIDATION_CONSTANTS.GOALS_MAX} selected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {fitnessGoals.map((goal) => (
              <Card key={goal.id} className={`cursor-pointer transition-all hover:shadow-md touch-manipulation ${
                selectedGoals.includes(goal.id) ? 'ring-2 ring-[#3E9EFF] bg-[#3E9EFF]/5' : 'hover:bg-muted/30'
              }`}>
                <CardContent className="p-4 sm:p-5">
                  <FormField
                    control={form.control}
                    name="goals"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              value={goal.id}
                              checked={selectedGoals.includes(goal.id)}
                              onChange={(e) => {
                                const currentGoals = field.value || [];
                                if (e.target.checked) {
                                  if (currentGoals.length < VALIDATION_CONSTANTS.GOALS_MAX) {
                                    field.onChange([...currentGoals, goal.id]);
                                  }
                                } else {
                                  field.onChange(currentGoals.filter((g: string) => g !== goal.id));
                                }
                              }}
                              disabled={isLoading || (!selectedGoals.includes(goal.id) && selectedGoals.length >= VALIDATION_CONSTANTS.GOALS_MAX)}
                              className="sr-only"
                              data-testid={`goal-${goal.id}`}
                            />
                            <span className="text-2xl">{goal.icon}</span>
                            <div className="flex-1">
                              <span className="text-base font-semibold cursor-pointer">
                                {goal.label}
                              </span>
                              <div className="text-sm text-muted-foreground mt-1">
                                {goal.description}
                              </div>
                            </div>
                          </label>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedGoals.length >= VALIDATION_CONSTANTS.GOALS_MAX && (
            <Alert className="mt-3 sm:mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                You've selected the maximum number of goals. Deselect one to choose a different goal.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Medical Conditions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🏥 Medical Considerations</CardTitle>
          <FormDescription>
            Help us provide safer workout recommendations by sharing any medical conditions or physical limitations
          </FormDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <NativeCheckbox
                id="has-conditions"
                checked={showMedicalConditions || medicalConditions.length > 0}
                onCheckedChange={(checked) => {
                  setShowMedicalConditions(!!checked);
                  if (!checked) {
                    form.setValue('medicalConditions', '');
                  }
                }}
                disabled={isLoading}
              />
              <FormLabel htmlFor="has-conditions" className="cursor-pointer">
                I have medical conditions or physical limitations to consider
              </FormLabel>
            </div>

            {(showMedicalConditions || medicalConditions.length > 0) && (
              <div className="space-y-3">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Medical Disclaimer:</strong> This information helps us provide safer workout recommendations. 
                    Always consult with a healthcare professional before starting any new exercise program.
                  </AlertDescription>
                </Alert>

                <FormField
                  control={form.control}
                  name="medicalConditions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medical Conditions & Physical Limitations</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Please describe any medical conditions, injuries, physical limitations, or health considerations that should be taken into account when creating your workout plan..."
                          disabled={isLoading}
                          rows={4}
                          maxLength={1000}
                          data-testid="medical-conditions-textarea"
                          {...field}
                        />
                      </FormControl>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{field.value?.length || 0}/1000 characters</span>
                      </div>
                      <FormDescription>
                        Include any conditions like asthma, joint issues, previous injuries, or other health considerations.
                      </FormDescription>
                      <FormMessage data-testid="medical-conditions-error" />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step Summary */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium mb-2">🎯 Personalizing your fitness journey:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• <strong>Experience Level:</strong> Determines appropriate exercise complexity and progression speed</li>
          <li>• <strong>Goals:</strong> Shapes your workout structure, exercise selection, and training focus</li>
          <li>• <strong>Medical Conditions:</strong> Ensures exercise recommendations are safe and appropriate</li>
          <li>• <strong>Privacy:</strong> All medical information is kept strictly confidential and secure</li>
        </ul>
      </div>
    </div>
  );
}
