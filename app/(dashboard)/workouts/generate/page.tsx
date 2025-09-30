'use client';

import React from 'react';
import { SingleStepWorkoutForm } from '@/components/workout/single-step-workout-form';

export default function GenerateWorkoutPage() {
  return (
    <div className="w-full py-8 px-4 sm:px-6 lg:px-8">
      {/* Centered Header Section */}
      <div className="text-center space-y-4 mb-8">
        <h1 className="text-4xl font-bold">
          Generate <span className="bg-gradient-to-r from-[#3E9EFF] to-[#3E9EFF]/65 bg-clip-text text-transparent">trAIner</span> Workout Plan
        </h1>
        <p className="text-muted-foreground text-lg">
          Review your selections and generate your workout plan
        </p>
      </div>
      
      {/* Single-Step Form */}
      <SingleStepWorkoutForm 
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