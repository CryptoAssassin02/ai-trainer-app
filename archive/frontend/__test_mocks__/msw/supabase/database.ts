import { v4 as uuidv4 } from 'uuid';

// Mock user profiles data
const mockProfiles: Record<string, any> = {
  'user-123': {
    id: 'profile-123',
    user_id: 'user-123',
    first_name: 'Test',
    last_name: 'User',
    age: 30,
    gender: 'male',
    height: 180,
    weight: 80,
    fitness_level: 'intermediate',
    fitness_goals: ['strength', 'weight_loss'],
    available_equipment: ['dumbbells', 'barbell', 'bench'],
    preferred_workout_days: ['monday', 'wednesday', 'friday'],
    workout_duration_preference: 60,
    measurement_preference: 'metric',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  'user-456': {
    id: 'profile-456',
    user_id: 'user-456',
    first_name: 'Admin',
    last_name: 'User',
    age: 35,
    gender: 'female',
    height: 165,
    weight: 65,
    fitness_level: 'advanced',
    fitness_goals: ['muscle_gain', 'endurance'],
    available_equipment: ['gym', 'full_home_gym'],
    preferred_workout_days: ['tuesday', 'thursday', 'saturday', 'sunday'],
    workout_duration_preference: 90,
    measurement_preference: 'imperial',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
};

// Mock workout plans data
const mockWorkoutPlans: Record<string, any> = {
  'plan-123': {
    id: 'plan-123',
    user_id: 'user-123',
    title: 'Beginner Strength Training',
    description: 'A basic strength training program for beginners',
    fitness_level: 'beginner',
    target_muscle_groups: ['chest', 'back', 'legs', 'shoulders', 'arms'],
    duration_weeks: 8,
    workouts_per_week: 3,
    created_at: '2023-01-10T00:00:00Z',
    updated_at: '2023-01-10T00:00:00Z',
    workout_schedule: [
      {
        day: 'monday',
        exercises: [
          { id: 'ex-1', name: 'Bench Press', sets: 3, reps: '8-10', rest_time: 90 },
          { id: 'ex-2', name: 'Barbell Rows', sets: 3, reps: '8-10', rest_time: 90 },
          { id: 'ex-3', name: 'Squats', sets: 3, reps: '8-10', rest_time: 120 },
        ],
      },
      {
        day: 'wednesday',
        exercises: [
          { id: 'ex-4', name: 'Overhead Press', sets: 3, reps: '8-10', rest_time: 90 },
          { id: 'ex-5', name: 'Pull Ups', sets: 3, reps: 'max', rest_time: 90 },
          { id: 'ex-6', name: 'Deadlifts', sets: 3, reps: '8-10', rest_time: 120 },
        ],
      },
      {
        day: 'friday',
        exercises: [
          { id: 'ex-7', name: 'Incline Bench Press', sets: 3, reps: '8-10', rest_time: 90 },
          { id: 'ex-8', name: 'Dumbbell Rows', sets: 3, reps: '8-10', rest_time: 90 },
          { id: 'ex-9', name: 'Leg Press', sets: 3, reps: '10-12', rest_time: 90 },
        ],
      },
    ],
  },
  'plan-456': {
    id: 'plan-456',
    user_id: 'user-456',
    title: 'Advanced Hypertrophy Program',
    description: 'High volume training plan for muscle growth',
    fitness_level: 'advanced',
    target_muscle_groups: ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'],
    duration_weeks: 12,
    workouts_per_week: 5,
    created_at: '2023-02-15T00:00:00Z',
    updated_at: '2023-02-15T00:00:00Z',
    workout_schedule: [
      {
        day: 'monday',
        exercises: [
          { id: 'ex-10', name: 'Barbell Bench Press', sets: 4, reps: '8-10', rest_time: 90 },
          { id: 'ex-11', name: 'Incline Dumbbell Press', sets: 4, reps: '10-12', rest_time: 60 },
          { id: 'ex-12', name: 'Cable Flyes', sets: 3, reps: '12-15', rest_time: 60 },
          { id: 'ex-13', name: 'Tricep Pushdowns', sets: 3, reps: '10-12', rest_time: 60 },
        ],
      },
      {
        day: 'tuesday',
        exercises: [
          { id: 'ex-14', name: 'Pull Ups', sets: 4, reps: '8-10', rest_time: 90 },
          { id: 'ex-15', name: 'Barbell Rows', sets: 4, reps: '8-10', rest_time: 90 },
          { id: 'ex-16', name: 'Lat Pulldowns', sets: 3, reps: '10-12', rest_time: 60 },
          { id: 'ex-17', name: 'Bicep Curls', sets: 3, reps: '10-12', rest_time: 60 },
        ],
      },
    ],
  },
};

// Mock workout progress data
const mockWorkoutProgress: Record<string, any[]> = {
  'user-123': [
    {
      id: 'progress-123',
      user_id: 'user-123',
      plan_id: 'plan-123',
      date: '2023-03-01T00:00:00Z',
      exercises_completed: [
        {
          exercise_id: 'ex-1',
          exercise_name: 'Bench Press',
          sets_completed: 3,
          reps_completed: [10, 8, 8],
          weights_used: [60, 65, 65],
          felt_difficulty: 7,
        },
        {
          exercise_id: 'ex-2',
          exercise_name: 'Barbell Rows',
          sets_completed: 3,
          reps_completed: [10, 10, 8],
          weights_used: [50, 50, 55],
          felt_difficulty: 6,
        },
      ],
      overall_difficulty: 7,
      energy_level: 8,
      satisfaction: 8,
      feedback: 'Felt good today, progressed on bench press',
    },
  ],
};

// Mock check-in data
const mockCheckIns: Record<string, any[]> = {
  'user-123': [
    {
      id: 'checkin-123',
      user_id: 'user-123',
      date: '2023-03-01T00:00:00Z',
      weight: 79.5,
      body_fat_percentage: 18,
      body_measurements: {
        chest: 100,
        waist: 85,
        hips: 95,
        biceps: 35,
        thighs: 58,
      },
      mood: 'good',
      sleep_quality: 7,
      energy_level: 8,
      stress_level: 4,
      notes: 'Feeling good today, weight coming down slowly',
    },
  ],
};

/**
 * Generate mock database responses for Supabase
 */
export const mockDatabaseResponses = {
  // Profile operations
  getAllProfiles: () => {
    return Object.values(mockProfiles);
  },

  getUserProfile: (userId: string) => {
    return [mockProfiles[userId] || null];
  },

  createProfile: (profile: any) => {
    const id = profile.id || `profile-${uuidv4()}`;
    const newProfile = {
      ...profile,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    mockProfiles[profile.user_id] = newProfile;
    return newProfile;
  },

  updateProfile: (userId: string, updates: any) => {
    if (!mockProfiles[userId]) {
      return { error: 'Profile not found' };
    }
    
    mockProfiles[userId] = {
      ...mockProfiles[userId],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    return mockProfiles[userId];
  },

  // Workout plans operations
  getAllWorkoutPlans: () => {
    return Object.values(mockWorkoutPlans);
  },

  getUserWorkoutPlans: (userId: string) => {
    return Object.values(mockWorkoutPlans).filter(plan => plan.user_id === userId);
  },

  getWorkoutPlan: (planId: string) => {
    return [mockWorkoutPlans[planId] || null];
  },

  createWorkoutPlan: (plan: any) => {
    const id = plan.id || `plan-${uuidv4()}`;
    const newPlan = {
      ...plan,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    mockWorkoutPlans[id] = newPlan;
    return newPlan;
  },

  updateWorkoutPlan: (planId: string, updates: any) => {
    if (!mockWorkoutPlans[planId]) {
      return { error: 'Plan not found' };
    }
    
    mockWorkoutPlans[planId] = {
      ...mockWorkoutPlans[planId],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    return mockWorkoutPlans[planId];
  },

  deleteWorkoutPlan: (planId: string) => {
    if (!mockWorkoutPlans[planId]) {
      return { error: 'Plan not found' };
    }
    
    const plan = mockWorkoutPlans[planId];
    delete mockWorkoutPlans[planId];
    
    return { success: true, deleted: plan };
  },

  // Progress tracking operations
  getUserProgress: (userId: string) => {
    return mockWorkoutProgress[userId] || [];
  },

  getPlanProgress: (planId: string) => {
    return Object.values(mockWorkoutProgress)
      .flat()
      .filter(entry => entry.plan_id === planId);
  },

  logWorkoutProgress: (progress: any) => {
    const id = progress.id || `progress-${uuidv4()}`;
    const newProgress = {
      ...progress,
      id,
      created_at: new Date().toISOString(),
    };
    
    if (!mockWorkoutProgress[progress.user_id]) {
      mockWorkoutProgress[progress.user_id] = [];
    }
    
    mockWorkoutProgress[progress.user_id].push(newProgress);
    return newProgress;
  },

  // Check-in operations
  getUserCheckIns: (userId: string) => {
    return mockCheckIns[userId] || [];
  },

  logCheckIn: (checkIn: any) => {
    const id = checkIn.id || `checkin-${uuidv4()}`;
    const newCheckIn = {
      ...checkIn,
      id,
      created_at: new Date().toISOString(),
    };
    
    if (!mockCheckIns[checkIn.user_id]) {
      mockCheckIns[checkIn.user_id] = [];
    }
    
    mockCheckIns[checkIn.user_id].push(newCheckIn);
    return newCheckIn;
  },
}; 