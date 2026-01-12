'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  User, 
  AlertCircle, 
  CheckCircle, 
  ArrowRight, 
  Target,
  Activity,
  Ruler,
  Weight,
  Calendar
} from 'lucide-react';
import Link from 'next/link';

interface ProfileValidationResult {
  isValid: boolean;
  missingFields: string[];
  canProceed: boolean;
  message: string;
}

interface ProfileCompletionPromptProps {
  validation: ProfileValidationResult;
}

export function ProfileCompletionPrompt({ validation }: ProfileCompletionPromptProps) {
  // Field mapping for better display
  const fieldDisplayMap: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
    'age': {
      label: 'Age',
      icon: <Calendar className="h-4 w-4" />,
      description: 'Required for calculating safe exercise intensity'
    },
    'height': {
      label: 'Height',
      icon: <Ruler className="h-4 w-4" />,
      description: 'Used for BMI calculations and exercise modifications'
    },
    'weight': {
      label: 'Weight',
      icon: <Weight className="h-4 w-4" />,
      description: 'Essential for determining appropriate workout intensity'
    },
    'experienceLevel': {
      label: 'Experience Level',
      icon: <Activity className="h-4 w-4" />,
      description: 'Helps tailor workout difficulty to your fitness level'
    },
    'goals': {
      label: 'Fitness Goals',
      icon: <Target className="h-4 w-4" />,
      description: 'Defines the focus and structure of your workout plan'
    },
    'complete profile': {
      label: 'Complete Profile',
      icon: <User className="h-4 w-4" />,
      description: 'All basic information needed for personalization'
    }
  };

  // Calculate completion percentage (assuming 80% is the threshold)
  const totalRequiredFields = 4; // age, height, weight, experienceLevel
  const completedFields = totalRequiredFields - validation.missingFields.length;
  const completionPercentage = Math.max(0, (completedFields / totalRequiredFields) * 100);

  return (
    <div className="container py-8 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
            <User className="h-6 w-6 text-orange-600" />
          </div>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            We need a bit more information to generate your personalized workout plan
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Completion Progress */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Profile Completion</span>
              <span className="font-medium">{Math.round(completionPercentage)}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {completionPercentage >= 80 
                ? 'Your profile is complete enough for workout generation!'
                : 'Complete your profile to unlock AI workout generation'}
            </p>
          </div>

          {/* Missing Fields Alert */}
          {!validation.isValid && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Missing Required Information</AlertTitle>
              <AlertDescription>
                {validation.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Missing Fields List */}
          {validation.missingFields.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Required Information:</h3>
              <div className="space-y-2">
                {validation.missingFields.map((field) => {
                  const fieldInfo = fieldDisplayMap[field] || {
                    label: field,
                    icon: <AlertCircle className="h-4 w-4" />,
                    description: 'Required for workout generation'
                  };
                  
                  return (
                    <div 
                      key={field}
                      className="flex items-start gap-3 p-3 rounded-lg border border-orange-200 bg-orange-50"
                    >
                      <div className="text-orange-600 mt-0.5">
                        {fieldInfo.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{fieldInfo.label}</span>
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {fieldInfo.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Why We Need This Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-sm text-blue-900 mb-2">
              Why do we need this information?
            </h3>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Ensure workout safety and appropriate intensity</li>
              <li>• Personalize exercises based on your fitness level</li>
              <li>• Calculate proper rest periods and progression</li>
              <li>• Tailor recommendations to your specific goals</li>
              <li>• Provide evidence-based exercise modifications</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1">
              <Link href="/profile">
                <User className="mr-2 h-4 w-4" />
                Complete Profile
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            
            {validation.canProceed && (
              <Button variant="outline" asChild>
                <Link href="/workouts">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Continue Anyway
                </Link>
              </Button>
            )}
          </div>

          {/* Help Text */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Completing your profile takes less than 2 minutes and significantly improves 
              the quality of your personalized workout plans.
            </p>
          </div>

          {/* Security Note */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            <CheckCircle className="h-3 w-3 text-green-600" />
            <span>
              Your personal information is encrypted and used only for workout personalization. 
              We never share your data with third parties.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
