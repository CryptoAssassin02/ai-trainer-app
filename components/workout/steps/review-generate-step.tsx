/**
 * Review & Generate Step Component
 * Phase 2 - Final review and AI operation progress
 * Integrates with AI operation progress patterns and profile validation
 */

'use client';

import React from 'react';
import { useSafeFormWatch } from '@/hooks/use-safe-form-watch';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { NativeSelect } from '@/components/ui/native-select';

// Gym category display names mapping
const GYM_CATEGORY_NAMES: Record<string, string> = {
  'full_service_commercial': 'Full-Service Commercial Gym',
  'budget_friendly': 'Budget-Friendly Gym',
  'hardcore_strength': 'Hardcore Strength/Powerlifting Gym',
  'luxury_athletic_club': 'Luxury Athletic Club',
  'franchise_24_7': '24/7 Franchise Gym',
  'community_recreation': 'Community Recreation Center',
  'crossfit_functional': 'CrossFit/Functional Fitness Gym',
  'limited_residential': 'Limited Residential Gym',
  'personal_home_setup': 'Personal Home Setup',
  'minimal_home': 'Minimal/No-Equipment Home Workout'
};
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Info, CheckCircle, User, Target, Settings, Brain } from 'lucide-react';

interface ReviewGenerateStepProps {
  form: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  userProfile: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  isLoading?: boolean;
}

// Fitness level options (matches backend validation)
const fitnessLevels = [
  { 
    value: 'beginner', 
    label: '🌱 Beginner', 
    description: '0-6 months of consistent training'
  },
  { 
    value: 'intermediate', 
    label: '💪 Intermediate', 
    description: '6 months - 2 years of consistent training'
  },
  { 
    value: 'advanced', 
    label: '🏆 Advanced', 
    description: '2+ years of consistent training'
  }
];

export function ReviewGenerateStep({ form, userProfile, isLoading }: ReviewGenerateStepProps) {
  const formValues = form.getValues();
  const fitnessLevel = useSafeFormWatch(form, 'fitnessLevel', userProfile?.experienceLevel || 'beginner');

  // Calculate summary statistics
  const summaryStats = {
    goals: formValues.goals?.length || 0,
    exerciseTypes: formValues.exerciseTypes?.length || 0,
    restrictions: formValues.restrictions?.length || 0,
    hasNotes: !!(formValues.additionalNotes && formValues.additionalNotes.trim().length > 0),
  };

  return (
    <div className="space-y-6">
      
      {/* Fitness Level Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📊 Fitness Experience Level</CardTitle>
          {userProfile?.experienceLevel && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                From your profile: <strong>{userProfile.experienceLevel}</strong>. 
                You can adjust this for your workout plan if needed.
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="fitnessLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select your current fitness experience level</FormLabel>
                <FormControl>
                  <NativeSelect
                    onValueChange={field.onChange}
                    value={field.value || ''}
                    disabled={isLoading}
                    data-testid="fitness-level-select"
                    placeholder="Select your fitness experience level"
                    options={fitnessLevels.map(level => ({
                      value: level.value,
                      label: `${level.label} - ${level.description}`
                    }))}
                  />
                </FormControl>
                <FormDescription>
                  This determines the intensity and complexity of your workout plan
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Review Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            📋 Review Your Selections
            <Badge variant="outline">
              {summaryStats.goals + summaryStats.exerciseTypes} preferences
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Profile Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4 text-cornflower-blue" />
              Profile Information
            </div>
            <div className="pl-6 space-y-1 text-sm text-muted-foreground">
              <p>Name: <span className="font-medium">{userProfile?.name || 'Not specified'}</span></p>
              <p>Age: <span className="font-medium">{userProfile?.age || 'Not specified'}</span></p>
            </div>
          </div>

          <Separator />

          {/* Fitness Goals */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Target className="h-4 w-4 text-cornflower-blue" />
              Fitness Goals ({summaryStats.goals})
              {formValues.primaryGoal && (
                <Badge variant="default" className="bg-cornflower-blue">
                  Primary: {formValues.primaryGoal.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </Badge>
              )}
            </div>
            <div className="pl-6">
              {formValues.goals?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {formValues.goals.map((goal: string) => (
                    <Badge 
                      key={goal} 
                      variant={goal === formValues.primaryGoal ? "default" : "secondary"} 
                      className={goal === formValues.primaryGoal ? "bg-cornflower-blue border-cornflower-blue" : "text-xs"}
                    >
                      {goal === formValues.primaryGoal && "🎯 "}
                      {goal.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      {goal === formValues.primaryGoal && " (Primary)"}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No goals selected</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Exercise Types */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Target className="h-4 w-4 text-cornflower-blue" />
              Exercise Types ({summaryStats.exerciseTypes})
            </div>
            <div className="pl-6">
              {formValues.exerciseTypes?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {formValues.exerciseTypes.map((type: string) => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No exercise types selected</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Gym Category */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Settings className="h-4 w-4 text-cornflower-blue" />
              Gym Category
            </div>
            <div className="pl-6">
              {userProfile?.gymCategory ? (
                <Badge variant="outline" className="text-xs">
                  {GYM_CATEGORY_NAMES[userProfile.gymCategory] || userProfile.gymCategory.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </Badge>
              ) : (
                <p className="text-sm text-muted-foreground">Minimal/No-Equipment Home Workout</p>
              )}
            </div>
          </div>

          {/* Workout Frequency */}
          {formValues.workoutFrequency && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Settings className="h-4 w-4 text-cornflower-blue" />
                  Workout Frequency
                </div>
                <div className="pl-6">
                  <Badge variant="outline" className="text-xs">
                    {formValues.workoutFrequency}
                  </Badge>
                </div>
              </div>
            </>
          )}

          {/* Physical Limitations */}
          {summaryStats.restrictions > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Info className="h-4 w-4 text-amber-500" />
                  Physical Limitations ({summaryStats.restrictions})
                </div>
                <div className="pl-6">
                  <div className="flex flex-wrap gap-2">
                    {formValues.restrictions.map((restriction: string) => (
                      <Badge key={restriction} variant="destructive" className="text-xs">
                        {restriction}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Additional Notes */}
          {summaryStats.hasNotes && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Info className="h-4 w-4 text-cornflower-blue" />
                  Additional Notes
                </div>
                <div className="pl-6">
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {formValues.additionalNotes}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* AI Generation Information */}
      <Card className="bg-gradient-to-r from-cornflower-blue/5 to-blue-500/5 border-cornflower-blue/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-cornflower-blue" />
            AI Workout Generation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Our AI agents will use your profile information and preferences to create a personalized workout plan:
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span><strong>Research Agent</strong> will gather exercise research and best practices</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span><strong>Workout Generation Agent</strong> will create your personalized plan</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span><strong>Safety Validation</strong> will ensure exercises match your limitations</span>
              </div>
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Generation typically takes 15-30 seconds. You can cancel at any time if needed.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


