'use client';

import React, { useEffect, useState } from 'react';
import { MultiStepWorkoutForm } from '@/components/workout/multi-step-workout-form';
import { ProfileCompletionPrompt } from '@/components/workout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWorkout } from '@/hooks/use-workout';

export default function GenerateWorkoutPage() {
  const { validateProfileForGeneration } = useWorkout();
  const [validation, setValidation] = useState<{ isValid: boolean; missingFields: string[]; canProceed: boolean; message: string } | null>(null);
  
  useEffect(() => {
    const checkProfile = async () => {
      try {
        const result = await validateProfileForGeneration();
        setValidation({
          isValid: result.isValid,
          missingFields: result.missingFields,
          canProceed: result.isValid || result.missingFields.length <= 2, // Allow if only 1-2 fields missing
          message: result.isValid 
            ? 'Profile is ready for workout generation'
            : `Please complete: ${result.missingFields.join(', ')}`
        });
      } catch (error) {
        setValidation({
          isValid: false,
          missingFields: ['complete profile'],
          canProceed: false,
          message: 'Please complete your profile before generating workout plans.'
        });
      }
    };
    
    checkProfile();
  }, [validateProfileForGeneration]);
  
  if (!validation) {
    return (
      <div className="w-full py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Checking profile...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  if (!validation.canProceed) {
    return <ProfileCompletionPrompt validation={validation} />;
  }
  
  return (
    <div className="w-full py-8 px-4 sm:px-6 lg:px-8">
      {/* Centered Header Section */}
      <div className="text-center space-y-4 mb-8">
        <h1 className="text-4xl font-bold">
          Generate <span className="bg-gradient-to-r from-cornflower-blue to-blue-600 bg-clip-text text-transparent">trAIner</span> Workout Plan
        </h1>
        <p className="text-muted-foreground text-lg">
          Create a personalized workout plan using our advanced AI agents
        </p>
      </div>
      
      {/* Multi-Step Form */}
      <MultiStepWorkoutForm 
        enableChunkedGeneration={true}
        onSuccess={(workoutPlan) => {
          console.log('Workout plan generated:', workoutPlan);
          // TODO: Handle success (redirect to plan view, show success message, etc.)
        }}
        onCancel={() => {
          window.history.back();
        }}
      />
    </div>
  );
}