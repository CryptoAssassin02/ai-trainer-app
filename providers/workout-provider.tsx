'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define types for workout context
type Workout = {
  id: string;
  name: string;
  exercises: Exercise[];
  // Add other workout properties as needed
};

type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  // Add other exercise properties as needed
};

interface WorkoutContextType {
  workouts: Workout[];
  currentWorkout: Workout | null;
  setCurrentWorkout: (workout: Workout | null) => void;
  addWorkout: (workout: Workout) => void;
  updateWorkout: (id: string, workout: Workout) => void;
  deleteWorkout: (id: string) => void;
  // Add other methods as needed
}

// Create the context with a default value
const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

// Provider component
export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [currentWorkout, setCurrentWorkout] = useState<Workout | null>(null);

  // Mock implementation of context methods for testing
  const addWorkout = (workout: Workout) => {
    setWorkouts((prev) => [...prev, workout]);
  };

  const updateWorkout = (id: string, updatedWorkout: Workout) => {
    setWorkouts((prev) =>
      prev.map((workout) => (workout.id === id ? updatedWorkout : workout))
    );
  };

  const deleteWorkout = (id: string) => {
    setWorkouts((prev) => prev.filter((workout) => workout.id !== id));
  };

  // Value object with state and methods
  const value = {
    workouts,
    currentWorkout,
    setCurrentWorkout,
    addWorkout,
    updateWorkout,
    deleteWorkout,
  };

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

// Custom hook for using the workout context
export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (context === undefined) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
} 