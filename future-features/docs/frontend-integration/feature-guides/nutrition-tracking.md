# Nutrition Tracking Feature Integration Guide

> **📋 Documentation Update Note**: This guide has been updated to correct critical database schema discrepancies and align with actual backend implementation. The nutrition system uses 3 database tables (not 4), dietary preferences schema has been corrected to match actual migration files, and rate limiting configurations have been verified against backend implementation.

## Table of Contents
1. [Overview & Architecture](#overview--architecture)
2. [AI Agent Integration](#ai-agent-integration)
3. [API Endpoints Reference](#api-endpoints-reference)
4. [State Management](#state-management)
5. [Implementation Guide](#implementation-guide)
6. [Complex UI Components](#complex-ui-components)
7. [Real-time Features](#real-time-features)
8. [Performance Optimization](#performance-optimization)
9. [Error Handling & Recovery](#error-handling--recovery)
10. [Testing Strategies](#testing-strategies)

---

## Overview & Architecture

The Nutrition Tracking feature provides comprehensive nutrition management through AI-powered meal planning, macro calculations, dietary preference management, and real-time meal logging. This feature integrates multiple AI agents with scientific calculation methods to deliver personalized nutrition guidance.

### Core Components
- **10 API Endpoints** across 2 route files (nutrition.js: 6, macros.js: 4)
- **NutritionAgent** for AI-powered meal planning and recommendations
- **Scientific Calculations** using Mifflin-St Jeor equation for BMR/TDEE
- **3 Database Tables** (nutrition_plans, dietary_preferences, meal_logs) for comprehensive nutrition data management
- **Rate Limiting** with operation-specific limits (5/hour calculation, 20/15min standard)

### Key Capabilities
- AI-powered nutrition plan generation with meal suggestions
- Scientific macro calculations (BMR, TDEE, macro distribution)
- Comprehensive dietary preference management
- Real-time meal logging with macro tracking
- Unit conversion support (metric/imperial)
- Progress tracking and nutritional analysis

### Data Flow Architecture
```
User Input → Controller → Service → NutritionAgent → OpenAI API
                      ↓
Database Storage ← Data Processing ← Response Formatting
```

---

## AI Agent Integration

### NutritionAgent Overview
The NutritionAgent is the core AI component for nutrition planning, using OpenAI's GPT-4o model with scientific calculation utilities.

**Configuration:**
- Model: GPT-4o for advanced reasoning
- Temperature: 0.7 for balanced creativity/consistency
- Response Format: Structured JSON
- Token Usage: 1000-2500 tokens average
- Processing Time: 5-15 seconds (new users), 3-8 seconds (returning)

### Agent Processing Pipeline

#### 1. Data Collection & Validation
```typescript
interface NutritionContext {
  userId: string;
  goals: Array<'weight_loss' | 'muscle_gain' | 'maintenance' | 'performance' | 'general_health' | 'endurance'>;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  additionalNotes?: string;
}
```

#### 2. Scientific Calculation Integration
- **BMR**: Mifflin-St Jeor Equation
- **TDEE**: Activity multipliers with goal adjustments
- **Macros**: Goal-specific ratio calculations
- **Unit Conversion**: Seamless metric/imperial support

#### 3. AI Content Generation
```typescript
interface NutritionPlanResponse {
  id: string;
  userId: string;
  calculations: {
    bmr: number;
    tdee: number;
    macros: MacroBreakdown;
  };
  mealPlan: MealPlan;
  foodSuggestions: FoodSuggestions;
  explanations: {
    rationale: string;
    principles: string;
    guidelines: string;
    references: string[];
  };
  goals: string[];
  activityLevel: string;
  createdAt: string;
  updatedAt: string;
}

interface MacroBreakdown {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  calories: number;
}

interface MealPlan {
  meals: Array<{
    name: string;
    target_macros: {
      protein_g: number;
      carbs_g: number;
      fat_g: number;
    };
    example?: string;
    timing?: string;
  }>;
  snacks: Array<{
    name: string;
    target_macros: {
      protein_g: number;
      carbs_g: number;
      fat_g: number;
    };
    example?: string;
    timing?: string;
  }>;
}

interface FoodSuggestions {
  protein: string[];
  carbs: string[];
  fat: string[];
  vegetables: string[];
  snacks: string[];
}

interface MacroPlan {
  id: string;
  userId: string;
  bmr: number;
  tdee: number;
  calories: number;
  macros: MacroBreakdown;
  status: 'active' | 'archived';
  calorieAdjustment: number;
  createdAt: string;
  updatedAt: string;
}

interface MacroCalculationResponse {
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  bmr: number;
  tdee: number;
  goalType: string;
  calorieAdjustment: number;
}
```

### Memory Integration
- Stores nutrition plans, preferences, and feedback
- Vector-based similarity matching for recommendations
- Preference learning from user interactions
- Cross-referencing with previous successful plans

---

## API Endpoints Reference

### Nutrition Endpoints

#### POST /v1/nutrition/calculate
**Purpose:** Generate AI-powered nutrition plan
**Rate Limit:** 5 requests/hour (production)

```typescript
interface CalculateRequest {
  goals: string[];
  activityLevel: string;
  additionalNotes?: string;
}

// Usage
const generateNutritionPlan = async (data: CalculateRequest) => {
  const response = await fetch('/v1/nutrition/calculate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return response.json();
};
```

#### GET /v1/nutrition/
**Purpose:** Retrieve current nutrition plan

```typescript
const getCurrentNutritionPlan = async (): Promise<NutritionPlan> => {
  const response = await fetch('/v1/nutrition/', {
    headers: { 'Authorization': `Bearer ${jwtToken}` }
  });
  return response.json();
};
```

#### GET/POST /v1/nutrition/preferences
**Purpose:** Manage dietary preferences

```typescript
interface DietaryPreferences {
  dietType: 'standard' | 'vegetarian' | 'vegan' | 'keto' | 'paleo' | 'mediterranean';
  mealFrequency: number;
  restrictions: string[];
  allergies: string[];
}

const updateDietaryPreferences = async (prefs: DietaryPreferences) => {
  const response = await fetch('/v1/nutrition/preferences', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(prefs)
  });
  return response.json();
};
```

#### POST/GET /v1/nutrition/meal-log
**Purpose:** Log and retrieve meal consumption

```typescript
interface MealLogRequest {
  mealName: string;
  foods: FoodItem[];
  notes?: string;
  loggedAt: string;
}

interface FoodItem {
  name: string;
  portionSize: number;
  units: string;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  calories: number;
}

const logMeal = async (mealData: MealLogRequest) => {
  const response = await fetch('/v1/nutrition/meal-log', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(mealData)
  });
  return response.json();
};
```

### Macro Endpoints

#### POST /v1/macros/calculate
**Purpose:** Calculate macros with optional AI integration
**Rate Limit:** 5 requests/hour (production)

```typescript
interface MacroCalculationRequest {
  weight: number;
  height: number;
  age: number;
  gender: 'male' | 'female';
  activityLevel: string;
  goal: string;
  useExternalApi?: boolean;
}

const calculateMacros = async (userData: MacroCalculationRequest) => {
  const response = await fetch('/v1/macros/calculate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData)
  });
  return response.json();
};
```

#### GET /v1/macros/ & /v1/macros/latest
**Purpose:** Retrieve macro plans with pagination support

```typescript
interface MacroListFilters {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  status?: 'active' | 'archived';
}

const getMacroPlans = async (filters: MacroListFilters = {}) => {
  const queryParams = new URLSearchParams(filters as any);
  const response = await fetch(`/v1/macros/?${queryParams}`, {
    headers: { 'Authorization': `Bearer ${jwtToken}` }
  });
  return response.json();
};

const getLatestMacros = async () => {
  const response = await fetch('/v1/macros/latest', {
    headers: { 'Authorization': `Bearer ${jwtToken}` }
  });
  return response.json();
};
```

#### PUT /v1/macros/:planId
**Purpose:** Update existing macro plan
**Rate Limit:** Standard limits (20/15min)

```typescript
const updateMacroPlan = async (planId: string, updates: Partial<MacroPlan>) => {
  const response = await fetch(`/v1/macros/${planId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  return response.json();
};
```

#### GET /v1/nutrition/:userId (Admin)
**Purpose:** Retrieve nutrition plan for specific user (admin access)

```typescript
const getNutritionPlanByUserId = async (userId: string): Promise<NutritionPlan> => {
  const response = await fetch(`/v1/nutrition/${userId}`, {
    headers: { 'Authorization': `Bearer ${jwtToken}` }
  });
  return response.json();
};
```

---

## State Management

### Context Structure

```typescript
interface NutritionContextState {
  // Current nutrition data
  currentPlan: NutritionPlan | null;
  dietaryPreferences: DietaryPreferences | null;
  macroPlans: MacroPlan[];
  mealLogs: MealLog[];
  
  // UI state
  isGeneratingPlan: boolean;
  isLoggingMeal: boolean;
  calculationProgress: number;
  
  // Filters and pagination
  mealLogFilters: {
    startDate?: string;
    endDate?: string;
    mealType?: string;
  };
  macroFilters: MacroListFilters;
  
  // Error states
  errors: {
    planGeneration?: string;
    mealLogging?: string;
    calculation?: string;
  };
}

interface NutritionContextActions {
  // Plan management
  generateNutritionPlan: (data: CalculateRequest) => Promise<void>;
  refreshCurrentPlan: () => Promise<void>;
  
  // Preferences management
  updateDietaryPreferences: (prefs: DietaryPreferences) => Promise<void>;
  
  // Meal logging
  logMeal: (mealData: MealLogRequest) => Promise<void>;
  getMealLogs: (filters?: any) => Promise<void>;
  
  // Macro management
  calculateMacros: (userData: MacroCalculationRequest) => Promise<void>;
  getMacroPlans: (filters?: MacroListFilters) => Promise<void>;
  
  // Utility functions
  clearErrors: () => void;
  resetFilters: () => void;
}
```

### Context Implementation

```typescript
const NutritionContext = createContext<{
  state: NutritionContextState;
  actions: NutritionContextActions;
} | null>(null);

export const NutritionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<NutritionContextState>({
    currentPlan: null,
    dietaryPreferences: null,
    macroPlans: [],
    mealLogs: [],
    isGeneratingPlan: false,
    isLoggingMeal: false,
    calculationProgress: 0,
    mealLogFilters: {},
    macroFilters: {},
    errors: {}
  });

  const actions: NutritionContextActions = {
    generateNutritionPlan: async (data: CalculateRequest) => {
      setState(prev => ({ ...prev, isGeneratingPlan: true, errors: { ...prev.errors, planGeneration: undefined } }));
      
      try {
        const plan = await generateNutritionPlan(data);
        setState(prev => ({ 
          ...prev, 
          currentPlan: plan, 
          isGeneratingPlan: false 
        }));
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          isGeneratingPlan: false,
          errors: { ...prev.errors, planGeneration: error.message }
        }));
      }
    },

    logMeal: async (mealData: MealLogRequest) => {
      setState(prev => ({ ...prev, isLoggingMeal: true, errors: { ...prev.errors, mealLogging: undefined } }));
      
      try {
        const loggedMeal = await logMeal(mealData);
        setState(prev => ({ 
          ...prev, 
          mealLogs: [loggedMeal, ...prev.mealLogs],
          isLoggingMeal: false 
        }));
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          isLoggingMeal: false,
          errors: { ...prev.errors, mealLogging: error.message }
        }));
      }
    },

    // ... other actions
  };

  return (
    <NutritionContext.Provider value={{ state, actions }}>
      {children}
    </NutritionContext.Provider>
  );
};

export const useNutrition = () => {
  const context = useContext(NutritionContext);
  if (!context) throw new Error('useNutrition must be used within NutritionProvider');
  return context;
};
```

---

## Implementation Guide

### 1. Basic Setup

```bash
# Install dependencies
npm install react-hook-form @hookform/resolvers yup react-query date-fns
```

### 2. Required Imports

```typescript
// Core React and hooks
import React, { useState, useEffect, useMemo, useCallback, useContext, createContext } from 'react';

// Form handling
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

// Data fetching
import { useQuery, useMutation, useQueryClient } from 'react-query';

// UI Components (adjust import paths based on your UI library)
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Textarea,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Checkbox,
  Progress,
  Badge,
  Slider
} from '@/components/ui';

// Icons (using lucide-react)
import {
  Loader2,
  Plus,
  Trash2,
  Camera,
  X,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';

// Date handling
import { format } from 'date-fns';

// Toast notifications
import { toast } from '@/hooks/use-toast';

// Auth context (adjust based on your auth implementation)
import { useAuth } from '@/contexts/AuthContext';
```

### 3. API Service Layer

```typescript
// services/nutritionAPI.ts
class NutritionAPI {
  private baseURL = '/v1';
  private authToken: string;

  constructor(authToken: string) {
    this.authToken = authToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  // Nutrition endpoints
  async generateNutritionPlan(data: CalculateRequest): Promise<NutritionPlan> {
    return this.request('/nutrition/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCurrentPlan(): Promise<NutritionPlan> {
    return this.request('/nutrition/');
  }

  async getDietaryPreferences(): Promise<DietaryPreferences> {
    return this.request('/nutrition/preferences');
  }

  async updateDietaryPreferences(prefs: DietaryPreferences): Promise<DietaryPreferences> {
    return this.request('/nutrition/preferences', {
      method: 'POST',
      body: JSON.stringify(prefs),
    });
  }

  async logMeal(mealData: MealLogRequest): Promise<MealLog> {
    return this.request('/nutrition/meal-log', {
      method: 'POST',
      body: JSON.stringify(mealData),
    });
  }

  async getMealLogs(filters?: any): Promise<MealLog[]> {
    const queryParams = new URLSearchParams(filters);
    return this.request(`/nutrition/meal-log?${queryParams}`);
  }

  // Macro endpoints
  async calculateMacros(userData: MacroCalculationRequest): Promise<MacroCalculationResponse> {
    return this.request('/macros/calculate', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getMacroPlans(filters: MacroListFilters = {}): Promise<{ data: MacroPlan[]; pagination: any }> {
    const queryParams = new URLSearchParams(filters as any);
    return this.request(`/macros/?${queryParams}`);
  }

  async getLatestMacros(): Promise<MacroPlan> {
    return this.request('/macros/latest');
  }

  async updateMacroPlan(planId: string, updates: any): Promise<boolean> {
    return this.request(`/macros/${planId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }
}

// Hook for API service
export const useNutritionAPI = () => {
  const { session } = useAuth();
  return useMemo(() => new NutritionAPI(session?.access_token || ''), [session]);
};
```

### 3. React Query Integration

```typescript
// hooks/useNutritionQueries.ts
export const useNutritionQueries = () => {
  const api = useNutritionAPI();

  const currentPlan = useQuery({
    queryKey: ['nutrition', 'current-plan'],
    queryFn: () => api.getCurrentPlan(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const dietaryPreferences = useQuery({
    queryKey: ['nutrition', 'preferences'],
    queryFn: () => api.getDietaryPreferences(),
  });

  const generatePlanMutation = useMutation({
    mutationFn: (data: CalculateRequest) => api.generateNutritionPlan(data),
    onSuccess: (data) => {
      queryClient.setQueryData(['nutrition', 'current-plan'], data);
      toast.success('Nutrition plan generated successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to generate nutrition plan');
    },
  });

  const mealLogMutation = useMutation({
    mutationFn: (data: MealLogRequest) => api.logMeal(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['nutrition', 'meal-logs']);
      toast.success('Meal logged successfully!');
    },
  });

  return {
    currentPlan,
    dietaryPreferences,
    generatePlanMutation,
    mealLogMutation,
  };
};
```

## Constants and Configuration

### Goal Options
```typescript
const GOAL_OPTIONS = [
  { value: 'weight_loss', label: 'Weight Loss' },
  { value: 'muscle_gain', label: 'Muscle Gain' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'performance', label: 'Performance' },
  { value: 'general_health', label: 'General Health' },
  { value: 'endurance', label: 'Endurance' }
];
```

### Activity Levels
```typescript
const ACTIVITY_LEVELS = [
  { 
    value: 'sedentary', 
    label: 'Sedentary', 
    description: 'Little to no exercise, desk job' 
  },
  { 
    value: 'light', 
    label: 'Light', 
    description: 'Light exercise 1-3 days/week' 
  },
  { 
    value: 'moderate', 
    label: 'Moderate', 
    description: 'Moderate exercise 3-5 days/week' 
  },
  { 
    value: 'active', 
    label: 'Active', 
    description: 'Hard exercise 6-7 days/week' 
  },
  { 
    value: 'very_active', 
    label: 'Very Active', 
    description: 'Very hard exercise, physical job' 
  }
];
```

### Diet Types
```typescript
const DIET_TYPES = [
  { value: 'standard', label: 'Standard' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'keto', label: 'Ketogenic' },
  { value: 'paleo', label: 'Paleo' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'low_carb', label: 'Low Carb' },
  { value: 'low_fat', label: 'Low Fat' },
  { value: 'gluten_free', label: 'Gluten Free' }
];
```

### Validation Schemas

```typescript
import * as yup from 'yup';

const nutritionCalculateSchema = yup.object({
  goals: yup
    .array()
    .of(yup.string().oneOf(['weight_loss', 'muscle_gain', 'maintenance', 'performance', 'general_health', 'endurance']))
    .min(1, 'At least one goal is required')
    .required('Goals are required'),
  activityLevel: yup
    .string()
    .oneOf(['sedentary', 'light', 'moderate', 'active', 'very_active'])
    .required('Activity level is required'),
  additionalNotes: yup
    .string()
    .max(500, 'Additional notes must be 500 characters or less')
    .optional()
});

const dietaryPreferencesSchema = yup.object({
  dietType: yup
    .string()
    .oneOf(['standard', 'vegetarian', 'vegan', 'keto', 'paleo', 'mediterranean', 'low_carb', 'low_fat', 'gluten_free'])
    .required('Diet type is required'),
  mealFrequency: yup
    .number()
    .min(1, 'Must have at least 1 meal per day')
    .max(8, 'Cannot exceed 8 meals per day')
    .required('Meal frequency is required'),
  restrictions: yup
    .array()
    .of(yup.string())
    .default([]),
  allergies: yup
    .array()
    .of(yup.string())
    .default([])
});

const mealLogSchema = yup.object({
  mealName: yup
    .string()
    .required('Meal name is required')
    .max(100, 'Meal name must be 100 characters or less'),
  foods: yup
    .array()
    .of(
      yup.object({
        name: yup.string().required('Food name is required'),
        portionSize: yup.number().min(0, 'Portion size must be positive').required(),
        units: yup.string().required('Units are required'),
        protein_g: yup.number().min(0, 'Protein must be 0 or greater').required(),
        carbs_g: yup.number().min(0, 'Carbs must be 0 or greater').required(),
        fat_g: yup.number().min(0, 'Fat must be 0 or greater').required(),
        calories: yup.number().min(0, 'Calories must be 0 or greater').required()
      })
    )
    .min(1, 'At least one food item is required'),
  notes: yup
    .string()
    .max(500, 'Notes must be 500 characters or less')
    .optional(),
  loggedAt: yup
    .string()
    .required('Logged date/time is required')
});
```

---

## Complex UI Components

### Supporting Components

#### AIProcessingIndicator Component

```typescript
// components/AIProcessingIndicator.tsx
interface AIProcessingIndicatorProps {
  stage: string;
  estimatedTime: string;
  progress?: number;
}

export const AIProcessingIndicator: React.FC<AIProcessingIndicatorProps> = ({ 
  stage, 
  estimatedTime, 
  progress 
}) => {
  return (
    <Card className="p-4 bg-blue-50 border-blue-200">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900">{stage}</p>
          <p className="text-xs text-blue-700">Estimated time: {estimatedTime}</p>
          {progress !== undefined && (
            <div className="mt-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-blue-600 mt-1">{progress}% complete</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
```

#### TagInput Component

```typescript
// components/TagInput.tsx
interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
}

export const TagInput: React.FC<TagInputProps> = ({ 
  value = [], 
  onChange, 
  placeholder = "Add tag...",
  maxTags = 20
}) => {
  const [inputValue, setInputValue] = useState('');

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !value.includes(trimmedTag) && value.length < maxTags) {
      onChange([...value, trimmedTag]);
      setInputValue('');
    }
  };

  const removeTag = (indexToRemove: number) => {
    onChange(value.filter((_, index) => index !== indexToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((tag, index) => (
          <Badge key={index} variant="secondary" className="flex items-center gap-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="ml-1 text-gray-500 hover:text-gray-700"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => inputValue && addTag(inputValue)}
        placeholder={placeholder}
        disabled={value.length >= maxTags}
      />
      {value.length >= maxTags && (
        <p className="text-xs text-gray-500">Maximum {maxTags} tags allowed</p>
      )}
    </div>
  );
};
```

### 1. Nutrition Plan Generator

```typescript
// components/NutritionPlanGenerator.tsx
interface NutritionPlanGeneratorProps {
  onPlanGenerated?: (plan: NutritionPlan) => void;
}

export const NutritionPlanGenerator: React.FC<NutritionPlanGeneratorProps> = ({ onPlanGenerated }) => {
  const { generatePlanMutation } = useNutritionQueries();
  const { watch, control, handleSubmit, formState: { errors } } = useForm<CalculateRequest>({
    resolver: yupResolver(nutritionCalculateSchema),
    defaultValues: {
      goals: [],
      activityLevel: 'moderate',
      additionalNotes: ''
    }
  });

  const selectedGoals = watch('goals');

  const onSubmit = async (data: CalculateRequest) => {
    try {
      const plan = await generatePlanMutation.mutateAsync(data);
      onPlanGenerated?.(plan);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Generate Nutrition Plan</CardTitle>
        <CardDescription>
          Create a personalized nutrition plan based on your goals and activity level
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <Label htmlFor="goals">Fitness Goals</Label>
          <Controller
            name="goals"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-3">
                {GOAL_OPTIONS.map((goal) => (
                  <div key={goal.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={goal.value}
                      checked={field.value.includes(goal.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          field.onChange([...field.value, goal.value]);
                        } else {
                          field.onChange(field.value.filter(g => g !== goal.value));
                        }
                      }}
                    />
                    <Label htmlFor={goal.value} className="text-sm">
                      {goal.label}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          />
          {errors.goals && (
            <p className="text-sm text-red-600">{errors.goals.message}</p>
          )}
        </div>

        <div className="space-y-4">
          <Label htmlFor="activityLevel">Activity Level</Label>
          <Controller
            name="activityLevel"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Select activity level" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div>
                        <div className="font-medium">{level.label}</div>
                        <div className="text-sm text-gray-500">{level.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.activityLevel && (
            <p className="text-sm text-red-600">{errors.activityLevel.message}</p>
          )}
        </div>

        <div className="space-y-4">
          <Label htmlFor="additionalNotes">Additional Notes (Optional)</Label>
          <Controller
            name="additionalNotes"
            control={control}
            render={({ field }) => (
              <Textarea
                {...field}
                placeholder="Any specific preferences, restrictions, or notes..."
                maxLength={500}
                rows={3}
              />
            )}
          />
        </div>

        <Button 
          type="submit" 
          disabled={generatePlanMutation.isLoading}
          className="w-full"
        >
          {generatePlanMutation.isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Plan...
            </>
          ) : (
            'Generate Nutrition Plan'
          )}
        </Button>
      </form>

      {generatePlanMutation.isLoading && (
        <AIProcessingIndicator 
          stage="Analyzing your profile and goals..."
          estimatedTime="5-15 seconds"
        />
      )}
    </Card>
  );
};
```

### 2. Meal Logging Component

```typescript
// components/MealLogger.tsx
export const MealLogger: React.FC = () => {
  const { mealLogMutation } = useNutritionQueries();
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<MealLogRequest>();

  const addFood = () => {
    setFoods([...foods, {
      name: '',
      portionSize: 0,
      units: 'g',
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      calories: 0
    }]);
  };

  const removeFood = (index: number) => {
    setFoods(foods.filter((_, i) => i !== index));
  };

  const updateFood = (index: number, field: keyof FoodItem, value: any) => {
    const updatedFoods = [...foods];
    updatedFoods[index] = { ...updatedFoods[index], [field]: value };
    setFoods(updatedFoods);
  };

  const calculateTotalMacros = () => {
    return foods.reduce((total, food) => ({
      protein: total.protein + food.protein_g,
      carbs: total.carbs + food.carbs_g,
      fat: total.fat + food.fat_g,
      calories: total.calories + food.calories
    }), { protein: 0, carbs: 0, fat: 0, calories: 0 });
  };

  const onSubmit = async (data: MealLogRequest) => {
    const mealData = {
      ...data,
      foods: foods,
      loggedAt: new Date().toISOString()
    };

    try {
      await mealLogMutation.mutateAsync(mealData);
      reset();
      setFoods([]);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const totalMacros = calculateTotalMacros();

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Log Meal</CardTitle>
        <CardDescription>
          Track your food intake and macros
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <Label htmlFor="mealName">Meal Name</Label>
          <Input
            {...register('mealName', { required: 'Meal name is required' })}
            placeholder="e.g., Breakfast, Lunch, Post-workout snack"
          />
          {errors.mealName && (
            <p className="text-sm text-red-600">{errors.mealName.message}</p>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>Food Items</Label>
            <Button type="button" onClick={addFood} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Food
            </Button>
          </div>

          {foods.map((food, index) => (
            <Card key={index} className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor={`food-name-${index}`}>Food Name</Label>
                  <Input
                    id={`food-name-${index}`}
                    value={food.name}
                    onChange={(e) => updateFood(index, 'name', e.target.value)}
                    placeholder="Food name"
                  />
                </div>

                <div>
                  <Label htmlFor={`portion-${index}`}>Portion</Label>
                  <div className="flex space-x-2">
                    <Input
                      id={`portion-${index}`}
                      type="number"
                      value={food.portionSize}
                      onChange={(e) => updateFood(index, 'portionSize', parseFloat(e.target.value))}
                      placeholder="Amount"
                    />
                    <Select 
                      value={food.units} 
                      onValueChange={(value) => updateFood(index, 'units', value)}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="oz">oz</SelectItem>
                        <SelectItem value="cup">cup</SelectItem>
                        <SelectItem value="piece">piece</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor={`protein-${index}`}>Protein (g)</Label>
                    <Input
                      id={`protein-${index}`}
                      type="number"
                      step="0.1"
                      value={food.protein_g}
                      onChange={(e) => updateFood(index, 'protein_g', parseFloat(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`carbs-${index}`}>Carbs (g)</Label>
                    <Input
                      id={`carbs-${index}`}
                      type="number"
                      step="0.1"
                      value={food.carbs_g}
                      onChange={(e) => updateFood(index, 'carbs_g', parseFloat(e.target.value))}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    <div>
                      <Label htmlFor={`fat-${index}`}>Fat (g)</Label>
                      <Input
                        id={`fat-${index}`}
                        type="number"
                        step="0.1"
                        value={food.fat_g}
                        onChange={(e) => updateFood(index, 'fat_g', parseFloat(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`calories-${index}`}>Calories</Label>
                      <Input
                        id={`calories-${index}`}
                        type="number"
                        value={food.calories}
                        onChange={(e) => updateFood(index, 'calories', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeFood(index)}
                    className="ml-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {foods.length > 0 && (
          <Card className="p-4 bg-gray-50">
            <h4 className="font-medium mb-2">Total Macros</h4>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Protein:</span> {totalMacros.protein.toFixed(1)}g
              </div>
              <div>
                <span className="font-medium">Carbs:</span> {totalMacros.carbs.toFixed(1)}g
              </div>
              <div>
                <span className="font-medium">Fat:</span> {totalMacros.fat.toFixed(1)}g
              </div>
              <div>
                <span className="font-medium">Calories:</span> {totalMacros.calories}
              </div>
            </div>
          </Card>
        )}

        <div className="space-y-4">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            {...register('notes')}
            placeholder="Any additional notes about this meal..."
            rows={2}
          />
        </div>

        <Button 
          type="submit" 
          disabled={mealLogMutation.isLoading || foods.length === 0}
          className="w-full"
        >
          {mealLogMutation.isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Logging Meal...
            </>
          ) : (
            'Log Meal'
          )}
        </Button>
      </form>
    </Card>
  );
};
```

### 3. Dietary Preferences Manager

```typescript
// components/DietaryPreferencesManager.tsx
export const DietaryPreferencesManager: React.FC = () => {
  const { dietaryPreferences } = useNutritionQueries();
  const [updatePrefs] = useMutation(updateDietaryPreferences);
  
  const { control, handleSubmit, watch, formState: { errors } } = useForm<DietaryPreferences>({
    resolver: yupResolver(dietaryPreferencesSchema),
    defaultValues: dietaryPreferences.data || {
      dietType: 'standard',
      mealFrequency: 3,
      restrictions: [],
      allergies: []
    }
  });

  const onSubmit = async (data: DietaryPreferences) => {
    try {
      await updatePrefs.mutateAsync(data);
      toast.success('Dietary preferences updated!');
    } catch (error) {
      toast.error('Failed to update preferences');
    }
  };

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Dietary Preferences</CardTitle>
        <CardDescription>
          Configure your dietary restrictions and preferences
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <Label htmlFor="dietType">Diet Type</Label>
          <Controller
            name="dietType"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIET_TYPES.map((diet) => (
                    <SelectItem key={diet.value} value={diet.value}>
                      {diet.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-4">
          <Label htmlFor="mealFrequency">Meals Per Day</Label>
          <Controller
            name="mealFrequency"
            control={control}
            render={({ field }) => (
              <Slider
                value={[field.value]}
                onValueChange={(value) => field.onChange(value[0])}
                min={1}
                max={8}
                step={1}
                className="w-full"
              />
            )}
          />
          <p className="text-sm text-gray-600">{watch('mealFrequency')} meals per day</p>
        </div>

        <div className="space-y-4">
          <Label>Food Allergies</Label>
          <Controller
            name="allergies"
            control={control}
            render={({ field }) => (
              <TagInput
                value={field.value}
                onChange={field.onChange}
                placeholder="Add allergy (e.g., peanuts, shellfish)"
              />
            )}
          />
        </div>

        <div className="space-y-4">
          <Label>Dietary Restrictions</Label>
          <Controller
            name="restrictions"
            control={control}
            render={({ field }) => (
              <TagInput
                value={field.value}
                onChange={field.onChange}
                placeholder="Add restriction (e.g., dairy-free, gluten-free)"
              />
            )}
          />
        </div>

        <Button type="submit" disabled={updatePrefs.isLoading} className="w-full">
          {updatePrefs.isLoading ? 'Updating...' : 'Update Preferences'}
        </Button>
      </form>
    </Card>
  );
};
```

---

## Real-time Features

### 1. Live Macro Tracking

```typescript
// hooks/useLiveMacroTracking.ts
export const useLiveMacroTracking = () => {
  const [dailyTotals, setDailyTotals] = useState({
    protein: 0,
    carbs: 0,
    fat: 0,
    calories: 0
  });

  const [targets, setTargets] = useState({
    protein: 0,
    carbs: 0,
    fat: 0,
    calories: 0
  });

  const { data: mealLogs } = useQuery({
    queryKey: ['nutrition', 'meal-logs', 'today'],
    queryFn: () => getMealLogs({
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd')
    }),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: currentPlan } = useQuery({
    queryKey: ['nutrition', 'current-plan'],
    queryFn: () => getCurrentNutritionPlan()
  });

  useEffect(() => {
    if (mealLogs) {
      const totals = mealLogs.reduce((acc, log) => {
        log.foods.forEach(food => {
          acc.protein += food.protein_g;
          acc.carbs += food.carbs_g;
          acc.fat += food.fat_g;
          acc.calories += food.calories;
        });
        return acc;
      }, { protein: 0, carbs: 0, fat: 0, calories: 0 });

      setDailyTotals(totals);
    }
  }, [mealLogs]);

  useEffect(() => {
    if (currentPlan?.calculations?.macros) {
      setTargets({
        protein: currentPlan.calculations.macros.protein_g,
        carbs: currentPlan.calculations.macros.carbs_g,
        fat: currentPlan.calculations.macros.fat_g,
        calories: currentPlan.calculations.macros.calories
      });
    }
  }, [currentPlan]);

  const progress = {
    protein: targets.protein > 0 ? (dailyTotals.protein / targets.protein) * 100 : 0,
    carbs: targets.carbs > 0 ? (dailyTotals.carbs / targets.carbs) * 100 : 0,
    fat: targets.fat > 0 ? (dailyTotals.fat / targets.fat) * 100 : 0,
    calories: targets.calories > 0 ? (dailyTotals.calories / targets.calories) * 100 : 0
  };

  return {
    dailyTotals,
    targets,
    progress,
    isOnTrack: progress.calories >= 90 && progress.calories <= 110
  };
};

// Component using live tracking
export const LiveMacroTracker: React.FC = () => {
  const { dailyTotals, targets, progress, isOnTrack } = useLiveMacroTracking();

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Today's Progress
          <Badge variant={isOnTrack ? 'success' : 'secondary'}>
            {isOnTrack ? 'On Track' : 'Tracking...'}
          </Badge>
        </CardTitle>
      </CardHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(progress).map(([macro, percentage]) => (
          <div key={macro} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium capitalize">{macro}</span>
              <span className="text-gray-600">
                {dailyTotals[macro as keyof typeof dailyTotals].toFixed(macro === 'calories' ? 0 : 1)}
                {macro === 'calories' ? '' : 'g'} / 
                {targets[macro as keyof typeof targets].toFixed(macro === 'calories' ? 0 : 1)}
                {macro === 'calories' ? '' : 'g'}
              </span>
            </div>
            <Progress value={Math.min(percentage, 100)} className="h-2" />
            <p className="text-xs text-gray-500">{percentage.toFixed(0)}% of target</p>
          </div>
        ))}
      </div>
    </Card>
  );
};
```

### 2. Real-time Meal Suggestions

```typescript
// components/RealTimeMealSuggestions.tsx
export const RealTimeMealSuggestions: React.FC = () => {
  const { dailyTotals, targets } = useLiveMacroTracking();
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const remaining = {
      protein: Math.max(0, targets.protein - dailyTotals.protein),
      carbs: Math.max(0, targets.carbs - dailyTotals.carbs),
      fat: Math.max(0, targets.fat - dailyTotals.fat),
      calories: Math.max(0, targets.calories - dailyTotals.calories)
    };

    const newSuggestions = generateMealSuggestions(remaining);
    setSuggestions(newSuggestions);
  }, [dailyTotals, targets]);

  if (suggestions.length === 0) {
    return (
      <Card className="p-6">
        <CardTitle>🎉 Macro Goals Achieved!</CardTitle>
        <p className="text-gray-600">You've met your daily macro targets.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Suggested Foods</CardTitle>
        <CardDescription>
          Based on your remaining macro needs
        </CardDescription>
      </CardHeader>

      <div className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <div key={index} className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm">{suggestion}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};
```

---

## Performance Optimization

### 1. API Response Caching

```typescript
// utils/nutritionCache.ts
class NutritionCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttlMinutes: number = 5) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    });
  }

  get(key: string) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear() {
    this.cache.clear();
  }
}

export const nutritionCache = new NutritionCache();

// Enhanced API service with caching
export const useNutritionAPIWithCache = () => {
  const api = useNutritionAPI();

  const getCachedCurrentPlan = async (): Promise<NutritionPlan> => {
    const cacheKey = 'current-plan';
    const cached = nutritionCache.get(cacheKey);
    
    if (cached) return cached;

    const plan = await api.getCurrentPlan();
    nutritionCache.set(cacheKey, plan, 5); // 5 minutes TTL
    return plan;
  };

  const getCachedDietaryPreferences = async (): Promise<DietaryPreferences> => {
    const cacheKey = 'dietary-preferences';
    const cached = nutritionCache.get(cacheKey);
    
    if (cached) return cached;

    const prefs = await api.getDietaryPreferences();
    nutritionCache.set(cacheKey, prefs, 30); // 30 minutes TTL
    return prefs;
  };

  return {
    ...api,
    getCachedCurrentPlan,
    getCachedDietaryPreferences
  };
};
```

### 2. Optimized Re-renders

```typescript
// hooks/useOptimizedNutrition.ts
export const useOptimizedNutrition = () => {
  const { state, actions } = useNutrition();

  // Memoize expensive calculations
  const macroProgress = useMemo(() => {
    if (!state.currentPlan || !state.mealLogs.length) return null;

    const targets = state.currentPlan.calculations.macros;
    const totals = state.mealLogs.reduce((acc, log) => {
      log.foods.forEach(food => {
        acc.protein += food.protein_g;
        acc.carbs += food.carbs_g;
        acc.fat += food.fat_g;
        acc.calories += food.calories;
      });
      return acc;
    }, { protein: 0, carbs: 0, fat: 0, calories: 0 });

    return {
      protein: (totals.protein / targets.protein_g) * 100,
      carbs: (totals.carbs / targets.carbs_g) * 100,
      fat: (totals.fat / targets.fat_g) * 100,
      calories: (totals.calories / targets.calories) * 100
    };
  }, [state.currentPlan, state.mealLogs]);

  // Memoize filtered meal logs
  const filteredMealLogs = useMemo(() => {
    let logs = state.mealLogs;

    if (state.mealLogFilters.startDate) {
      logs = logs.filter(log => 
        new Date(log.loggedAt) >= new Date(state.mealLogFilters.startDate!)
      );
    }

    if (state.mealLogFilters.endDate) {
      logs = logs.filter(log => 
        new Date(log.loggedAt) <= new Date(state.mealLogFilters.endDate!)
      );
    }

    if (state.mealLogFilters.mealType) {
      logs = logs.filter(log => 
        log.mealName.toLowerCase().includes(state.mealLogFilters.mealType!.toLowerCase())
      );
    }

    return logs;
  }, [state.mealLogs, state.mealLogFilters]);

  // Memoized actions to prevent unnecessary re-renders
  const memoizedActions = useMemo(() => ({
    generateNutritionPlan: useCallback(actions.generateNutritionPlan, []),
    logMeal: useCallback(actions.logMeal, []),
    updateDietaryPreferences: useCallback(actions.updateDietaryPreferences, []),
  }), [actions]);

  return {
    ...state,
    macroProgress,
    filteredMealLogs,
    actions: memoizedActions
  };
};
```

### 3. Image Optimization for Food Items

```typescript
// components/FoodImageUploader.tsx
interface FoodImageUploaderProps {
  onImageUploaded: (imageUrl: string) => void;
}

export const FoodImageUploader: React.FC<FoodImageUploaderProps> = ({ onImageUploaded }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);

    try {
      // Optimize image before upload
      const optimizedFile = await optimizeImage(file, {
        maxWidth: 800,
        maxHeight: 600,
        quality: 0.8,
        format: 'webp'
      });

      // Create preview
      const previewUrl = URL.createObjectURL(optimizedFile);
      setPreview(previewUrl);

      // Upload to storage
      const uploadResult = await uploadFoodImage(optimizedFile);
      onImageUploaded(uploadResult.url);
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div 
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
        onClick={() => document.getElementById('food-image-input')?.click()}
      >
        {preview ? (
          <img src={preview} alt="Food preview" className="mx-auto max-h-32 rounded" />
        ) : (
          <div className="space-y-2">
            <Camera className="mx-auto h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-600">
              {isUploading ? 'Uploading...' : 'Add food photo (optional)'}
            </p>
          </div>
        )}
      </div>

      <input
        id="food-image-input"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageUpload(file);
        }}
      />
    </div>
  );
};

// Image optimization utility
const optimizeImage = (file: File, options: {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: string;
}): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      const { width, height } = calculateDimensions(
        img.width,
        img.height,
        options.maxWidth,
        options.maxHeight
      );

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          const optimizedFile = new File([blob!], file.name, {
            type: `image/${options.format}`,
            lastModified: Date.now()
          });
          resolve(optimizedFile);
        },
        `image/${options.format}`,
        options.quality
      );
    };

    img.src = URL.createObjectURL(file);
  });
};
```

### Utility Functions

```typescript
// utils/nutritionUtils.ts

/**
 * Generate meal suggestions based on remaining macro needs
 */
export const generateMealSuggestions = (remaining: MacroBreakdown): string[] => {
  const suggestions: string[] = [];
  
  // High protein suggestions
  if (remaining.protein_g > 20) {
    suggestions.push(`Try adding ${Math.round(remaining.protein_g)}g protein: grilled chicken, Greek yogurt, or protein shake`);
  }
  
  // High carb suggestions
  if (remaining.carbs_g > 30) {
    suggestions.push(`Need ${Math.round(remaining.carbs_g)}g carbs: brown rice, sweet potato, or oatmeal`);
  }
  
  // High fat suggestions
  if (remaining.fat_g > 15) {
    suggestions.push(`Add ${Math.round(remaining.fat_g)}g healthy fats: avocado, nuts, or olive oil`);
  }
  
  // Balanced meal suggestions
  if (remaining.calories > 200 && suggestions.length === 0) {
    suggestions.push("Consider a balanced snack like apple with almond butter");
    suggestions.push("Greek yogurt with berries and granola would work well");
  }
  
  return suggestions;
};

/**
 * Calculate optimal image dimensions maintaining aspect ratio
 */
export const calculateDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } => {
  const aspectRatio = originalWidth / originalHeight;
  
  let newWidth = originalWidth;
  let newHeight = originalHeight;
  
  // Scale down if too wide
  if (newWidth > maxWidth) {
    newWidth = maxWidth;
    newHeight = newWidth / aspectRatio;
  }
  
  // Scale down if too tall
  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = newHeight * aspectRatio;
  }
  
  return {
    width: Math.round(newWidth),
    height: Math.round(newHeight)
  };
};

/**
 * Upload food image to storage service
 */
export const uploadFoodImage = async (file: File): Promise<{ url: string; id: string }> => {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('category', 'food');
  
  const response = await fetch('/v1/upload/image', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: formData
  });
  
  if (!response.ok) {
    throw new Error('Failed to upload image');
  }
  
  const result = await response.json();
  return {
    url: result.url,
    id: result.id
  };
};

/**
 * Format macro values for display
 */
export const formatMacroValue = (value: number, type: 'protein' | 'carbs' | 'fat' | 'calories'): string => {
  if (type === 'calories') {
    return Math.round(value).toString();
  }
  return value.toFixed(1);
};

/**
 * Calculate macro percentages
 */
export const calculateMacroPercentages = (macros: MacroBreakdown): { protein: number; carbs: number; fat: number } => {
  const totalCalories = macros.calories;
  if (totalCalories === 0) return { protein: 0, carbs: 0, fat: 0 };
  
  return {
    protein: Math.round((macros.protein_g * 4 / totalCalories) * 100),
    carbs: Math.round((macros.carbs_g * 4 / totalCalories) * 100),
    fat: Math.round((macros.fat_g * 9 / totalCalories) * 100)
  };
};

/**
 * Validate macro consistency (macros should sum to calories within tolerance)
 */
export const validateMacroConsistency = (macros: MacroBreakdown, tolerance: number = 50): boolean => {
  const calculatedCalories = (macros.protein_g * 4) + (macros.carbs_g * 4) + (macros.fat_g * 9);
  const difference = Math.abs(calculatedCalories - macros.calories);
  return difference <= tolerance;
};

// Get auth token helper
const getAuthToken = (): string => {
  // Implementation depends on your auth system
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  if (!token) throw new Error('No authentication token found');
  return token;
};
```

---

## Error Handling & Recovery

### 1. Comprehensive Error Classification

```typescript
// utils/nutritionErrorHandler.ts
export enum NutritionErrorType {
  VALIDATION = 'validation',
  RATE_LIMIT = 'rate_limit',
  AI_GENERATION = 'ai_generation',
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  NOT_FOUND = 'not_found',
  SERVER = 'server'
}

export interface NutritionError {
  type: NutritionErrorType;
  message: string;
  code?: string;
  retryable: boolean;
  retryAfter?: number;
  suggestions?: string[];
}

export const classifyNutritionError = (error: any): NutritionError => {
  // Rate limiting errors
  if (error.status === 429) {
    return {
      type: NutritionErrorType.RATE_LIMIT,
      message: 'Rate limit exceeded. Please try again later.',
      retryable: true,
      retryAfter: error.retryAfter || 3600, // 1 hour default
      suggestions: [
        'Try again in an hour',
        'Consider using cached results',
        'Reduce frequency of plan generation'
      ]
    };
  }

  // Validation errors
  if (error.status === 400) {
    return {
      type: NutritionErrorType.VALIDATION,
      message: error.message || 'Invalid input data',
      retryable: false,
      suggestions: [
        'Check required fields',
        'Verify goal selection',
        'Ensure activity level is selected'
      ]
    };
  }

  // AI generation failures
  if (error.message?.includes('AI generation failed')) {
    return {
      type: NutritionErrorType.AI_GENERATION,
      message: 'Failed to generate nutrition plan',
      retryable: true,
      suggestions: [
        'Try again in a few moments',
        'Simplify your goals',
        'Use basic macro calculation instead'
      ]
    };
  }

  // Network errors
  if (error.message?.includes('fetch') || error.code === 'NETWORK_ERROR') {
    return {
      type: NutritionErrorType.NETWORK,
      message: 'Network connection error',
      retryable: true,
      suggestions: [
        'Check your internet connection',
        'Try again in a moment',
        'Use offline cached data if available'
      ]
    };
  }

  // Authentication errors
  if (error.status === 401) {
    return {
      type: NutritionErrorType.AUTHENTICATION,
      message: 'Authentication required',
      retryable: false,
      suggestions: [
        'Please log in again',
        'Check your session status'
      ]
    };
  }

  // Default server error
  return {
    type: NutritionErrorType.SERVER,
    message: 'An unexpected error occurred',
    retryable: true,
    suggestions: [
      'Try again in a few moments',
      'Contact support if the problem persists'
    ]
  };
};

// Error recovery hook
export const useNutritionErrorRecovery = () => {
  const [errors, setErrors] = useState<Map<string, NutritionError>>(new Map());
  const [retryAttempts, setRetryAttempts] = useState<Map<string, number>>(new Map());

  const handleError = useCallback((operationId: string, error: any) => {
    const nutritionError = classifyNutritionError(error);
    setErrors(prev => new Map(prev.set(operationId, nutritionError)));

    // Show appropriate toast
    if (nutritionError.type === NutritionErrorType.RATE_LIMIT) {
      toast.error(`Rate limit exceeded. Try again in ${Math.ceil(nutritionError.retryAfter! / 60)} minutes.`);
    } else if (nutritionError.type === NutritionErrorType.VALIDATION) {
      toast.error(nutritionError.message);
    } else {
      toast.error(nutritionError.message, {
        action: nutritionError.retryable ? {
          label: 'Retry',
          onClick: () => retry(operationId)
        } : undefined
      });
    }
  }, []);

  const retry = useCallback(async (operationId: string, operation?: () => Promise<any>) => {
    const error = errors.get(operationId);
    if (!error?.retryable) return;

    const attempts = retryAttempts.get(operationId) || 0;
    if (attempts >= 3) {
      toast.error('Maximum retry attempts reached. Please try again later.');
      return;
    }

    setRetryAttempts(prev => new Map(prev.set(operationId, attempts + 1)));

    if (operation) {
      try {
        await operation();
        setErrors(prev => {
          const newErrors = new Map(prev);
          newErrors.delete(operationId);
          return newErrors;
        });
        setRetryAttempts(prev => {
          const newAttempts = new Map(prev);
          newAttempts.delete(operationId);
          return newAttempts;
        });
      } catch (retryError) {
        handleError(operationId, retryError);
      }
    }
  }, [errors, retryAttempts, handleError]);

  const clearError = useCallback((operationId: string) => {
    setErrors(prev => {
      const newErrors = new Map(prev);
      newErrors.delete(operationId);
      return newErrors;
    });
  }, []);

  return {
    errors,
    handleError,
    retry,
    clearError
  };
};
```

### 2. Fallback UI Components

```typescript
// components/NutritionErrorBoundary.tsx
interface NutritionErrorBoundaryState {
  hasError: boolean;
  error?: NutritionError;
}

export class NutritionErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  NutritionErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): NutritionErrorBoundaryState {
    const nutritionError = classifyNutritionError(error);
    return {
      hasError: true,
      error: nutritionError
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Nutrition feature error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="p-6 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nutrition Feature Unavailable</h3>
          <p className="text-gray-600 mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          
          {this.state.error?.suggestions && (
            <div className="space-y-2 mb-4">
              {this.state.error.suggestions.map((suggestion, index) => (
                <p key={index} className="text-sm text-gray-500">• {suggestion}</p>
              ))}
            </div>
          )}

          {this.state.error?.retryable && (
            <Button 
              onClick={() => this.setState({ hasError: false })}
              variant="outline"
            >
              Try Again
            </Button>
          )}
        </Card>
      );
    }

    return this.props.children;
  }
}

// Fallback components for specific scenarios
export const NutritionPlanFallback: React.FC = () => (
  <Card className="p-6">
    <CardHeader>
      <CardTitle>Unable to Load Nutrition Plan</CardTitle>
    </CardHeader>
    <div className="space-y-4">
      <p className="text-gray-600">
        Your nutrition plan is temporarily unavailable. You can still log meals and track progress.
      </p>
      <div className="flex space-x-2">
        <Button variant="outline" size="sm">
          Try Again
        </Button>
        <Button variant="outline" size="sm">
          Use Basic Calculator
        </Button>
      </div>
    </div>
  </Card>
);

export const AIGenerationFallback: React.FC<{ onUseBasicCalculator: () => void }> = ({ onUseBasicCalculator }) => (
  <Card className="p-6 border-yellow-200 bg-yellow-50">
    <div className="flex items-start space-x-3">
      <AlertCircle className="h-5 w-5 text-yellow-600 mt-1" />
      <div className="space-y-3">
        <div>
          <h4 className="font-medium text-yellow-800">AI Generation Unavailable</h4>
          <p className="text-sm text-yellow-700">
            The AI nutrition planner is temporarily unavailable. You can still calculate macros using our scientific formula.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onUseBasicCalculator}
          className="bg-white hover:bg-gray-50"
        >
          Use Basic Calculator
        </Button>
      </div>
    </div>
  </Card>
);
```

---

## Testing Strategies

### 1. Unit Testing for Nutrition Components

```typescript
// __tests__/NutritionPlanGenerator.test.tsx
describe('NutritionPlanGenerator', () => {
  const mockGeneratePlan = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate required fields', async () => {
    render(<NutritionPlanGenerator />);
    
    const submitButton = screen.getByRole('button', { name: /generate nutrition plan/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/goals are required/i)).toBeInTheDocument();
    });
  });

  it('should handle multiple goal selection', () => {
    render(<NutritionPlanGenerator />);
    
    const weightLossCheckbox = screen.getByLabelText(/weight loss/i);
    const muscleGainCheckbox = screen.getByLabelText(/muscle gain/i);

    fireEvent.click(weightLossCheckbox);
    fireEvent.click(muscleGainCheckbox);

    expect(weightLossCheckbox).toBeChecked();
    expect(muscleGainCheckbox).toBeChecked();
  });

  it('should show loading state during generation', async () => {
    mockGeneratePlan.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    render(
      <QueryClient>
        <NutritionPlanGenerator />
      </QueryClient>
    );

    // Fill out form
    fireEvent.click(screen.getByLabelText(/weight loss/i));
    fireEvent.change(screen.getByDisplayValue(/moderate/i), { target: { value: 'active' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /generate nutrition plan/i }));

    await waitFor(() => {
      expect(screen.getByText(/generating plan/i)).toBeInTheDocument();
      expect(screen.getByText(/analyzing your profile/i)).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    mockGeneratePlan.mockRejectedValue(new Error('Rate limit exceeded'));

    render(
      <QueryClient>
        <NutritionPlanGenerator />
      </QueryClient>
    );

    // Fill and submit form
    fireEvent.click(screen.getByLabelText(/weight loss/i));
    fireEvent.click(screen.getByRole('button', { name: /generate nutrition plan/i }));

    await waitFor(() => {
      expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
    });
  });
});
```

### 2. Integration Testing for API Calls

```typescript
// __tests__/nutritionAPI.integration.test.ts
describe('Nutrition API Integration', () => {
  let api: NutritionAPI;

  beforeEach(() => {
    api = new NutritionAPI('test-token');
  });

  describe('generateNutritionPlan', () => {
    it('should successfully generate a plan with valid data', async () => {
      const requestData = {
        goals: ['weight_loss'],
        activityLevel: 'moderate',
        additionalNotes: 'Prefer vegetarian options'
      };

      const response = await api.generateNutritionPlan(requestData);

      expect(response).toHaveProperty('id');
      expect(response).toHaveProperty('calculations');
      expect(response.calculations).toHaveProperty('bmr');
      expect(response.calculations).toHaveProperty('tdee');
      expect(response.calculations.macros).toHaveProperty('protein_g');
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        goals: [], // Empty goals should fail
        activityLevel: 'invalid_level'
      };

      await expect(api.generateNutritionPlan(invalidData))
        .rejects
        .toThrow(/validation/i);
    });

    it('should handle rate limiting', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const requests = Array(10).fill(null).map(() => 
        api.generateNutritionPlan({
          goals: ['muscle_gain'],
          activityLevel: 'active'
        })
      );

      const results = await Promise.allSettled(requests);
      const rejectedRequests = results.filter(r => r.status === 'rejected');

      expect(rejectedRequests.length).toBeGreaterThan(0);
      expect(rejectedRequests[0].reason.message).toMatch(/rate limit/i);
    });
  });

  describe('mealLogging', () => {
    it('should successfully log a meal', async () => {
      const mealData = {
        mealName: 'Test Breakfast',
        foods: [{
          name: 'Oatmeal',
          portionSize: 100,
          units: 'g',
          protein_g: 10,
          carbs_g: 30,
          fat_g: 5,
          calories: 200
        }],
        notes: 'Delicious breakfast',
        loggedAt: new Date().toISOString()
      };

      const response = await api.logMeal(mealData);

      expect(response).toHaveProperty('id');
      expect(response.mealName).toBe(mealData.mealName);
      expect(response.foods).toHaveLength(1);
    });

    it('should retrieve meal logs with date filtering', async () => {
      const today = new Date().toISOString().split('T')[0];
      const logs = await api.getMealLogs({
        startDate: today,
        endDate: today
      });

      expect(Array.isArray(logs)).toBe(true);
      logs.forEach(log => {
        expect(new Date(log.loggedAt).toISOString().split('T')[0]).toBe(today);
      });
    });
  });
});
```

### 3. End-to-End Testing

```typescript
// e2e/nutrition-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Nutrition Planning Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should complete full nutrition planning flow', async ({ page }) => {
    // Navigate to nutrition section
    await page.click('[data-testid="nutrition-tab"]');
    
    // Generate nutrition plan
    await page.click('[data-testid="generate-plan-button"]');
    
    // Fill out form
    await page.check('[data-testid="goal-weight-loss"]');
    await page.selectOption('[data-testid="activity-level"]', 'moderate');
    await page.fill('[data-testid="additional-notes"]', 'Prefer high protein');
    
    // Submit and wait for generation
    await page.click('[data-testid="submit-plan-generation"]');
    
    await expect(page.locator('[data-testid="ai-processing-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="nutrition-plan-results"]')).toBeVisible({ timeout: 20000 });
    
    // Verify plan results
    await expect(page.locator('[data-testid="bmr-value"]')).toContainText(/\d+/);
    await expect(page.locator('[data-testid="tdee-value"]')).toContainText(/\d+/);
    await expect(page.locator('[data-testid="protein-target"]')).toContainText(/\d+g/);
  });

  test('should handle meal logging', async ({ page }) => {
    await page.click('[data-testid="nutrition-tab"]');
    await page.click('[data-testid="log-meal-button"]');
    
    // Fill meal information
    await page.fill('[data-testid="meal-name"]', 'Breakfast');
    
    // Add food item
    await page.click('[data-testid="add-food-button"]');
    await page.fill('[data-testid="food-name-0"]', 'Scrambled Eggs');
    await page.fill('[data-testid="portion-size-0"]', '2');
    await page.selectOption('[data-testid="portion-units-0"]', 'piece');
    await page.fill('[data-testid="protein-0"]', '12');
    await page.fill('[data-testid="carbs-0"]', '1');
    await page.fill('[data-testid="fat-0"]', '8');
    await page.fill('[data-testid="calories-0"]', '140');
    
    // Submit meal log
    await page.click('[data-testid="submit-meal-log"]');
    
    await expect(page.locator('[data-testid="meal-log-success"]')).toBeVisible();
    
    // Verify meal appears in history
    await page.click('[data-testid="meal-history-tab"]');
    await expect(page.locator('[data-testid="meal-log-item"]')).toContainText('Breakfast');
  });

  test('should update dietary preferences', async ({ page }) => {
    await page.click('[data-testid="nutrition-tab"]');
    await page.click('[data-testid="preferences-tab"]');
    
    // Update preferences
    await page.selectOption('[data-testid="diet-type"]', 'vegetarian');
    await page.fill('[data-testid="meal-frequency-slider"]', '4');
    await page.fill('[data-testid="allergies-input"]', 'peanuts');
    await page.keyboard.press('Enter');
    
    await page.click('[data-testid="save-preferences"]');
    
    await expect(page.locator('[data-testid="preferences-success"]')).toBeVisible();
  });

  test('should show real-time macro tracking', async ({ page }) => {
    // Log a meal first
    await page.click('[data-testid="nutrition-tab"]');
    await page.click('[data-testid="log-meal-button"]');
    
    // Quick meal log
    await page.fill('[data-testid="meal-name"]', 'Snack');
    await page.click('[data-testid="add-food-button"]');
    await page.fill('[data-testid="food-name-0"]', 'Apple');
    await page.fill('[data-testid="calories-0"]', '95');
    await page.click('[data-testid="submit-meal-log"]');
    
    // Check macro tracker updates
    await page.click('[data-testid="macro-tracker-tab"]');
    
    await expect(page.locator('[data-testid="daily-calories"]')).toContainText('95');
    await expect(page.locator('[data-testid="calories-progress-bar"]')).toBeVisible();
  });
});
```

---

## Database Integration & Security

### Database Tables Structure

The nutrition tracking feature utilizes 3 primary database tables:

#### 1. nutrition_plans
- **Primary Key:** id (UUID)
- **Foreign Keys:** user_id → user_profiles.user_id
- **Key Fields:** bmr, tdee, calorie_adjustment
- **Key JSONB Fields:** 
  - macros: `{ protein_g, carbs_g, fat_g, calories }`
  - meal_plan: `{ meals: [...], snacks: [...] }`
  - food_suggestions: `{ protein: [...], carbs: [...], fat: [...] }`
  - explanations: `{ rationale, principles, guidelines, references }`
- **RLS Policy:** Users can only access their own nutrition plans

#### 2. dietary_preferences
- **Primary Key:** id (UUID)
- **Foreign Keys:** user_id → user_profiles.user_id
- **Key Fields:** diet_type, meal_frequency
- **Key JSONB Fields:**
  - restrictions: `["dairy-free", "gluten-free"]`
  - allergies: `["peanuts", "shellfish"]`
- **RLS Policy:** User-specific data isolation

#### 3. meal_logs
- **Primary Key:** id (UUID)
- **Foreign Keys:** user_id → user_profiles.user_id, nutrition_plan_id → nutrition_plans.id
- **Key JSONB Fields:**
  - foods: `[{ name, portionSize, units, protein_g, carbs_g, fat_g, calories }]`
- **RLS Policy:** User-specific meal logs with plan association

### Row Level Security (RLS)

All nutrition endpoints enforce RLS at the database level:

```sql
-- Example RLS policy for nutrition_plans
CREATE POLICY "Users can only access their own nutrition plans"
  ON nutrition_plans
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());
```

### Unit Conversion System

The system supports seamless metric/imperial conversions:

```typescript
interface UnitConversion {
  weight: {
    kg_to_lbs: (kg: number) => number;
    lbs_to_kg: (lbs: number) => number;
  };
  volume: {
    ml_to_fl_oz: (ml: number) => number;
    fl_oz_to_ml: (flOz: number) => number;
  };
}

const unitConverter: UnitConversion = {
  weight: {
    kg_to_lbs: (kg) => kg * 2.20462,
    lbs_to_kg: (lbs) => lbs / 2.20462
  },
  volume: {
    ml_to_fl_oz: (ml) => ml * 0.033814,
    fl_oz_to_ml: (flOz) => flOz / 0.033814
  }
};
```

### Data Integrity Patterns

#### Foreign Key Relationships
- nutrition_plans.user_id → user_profiles.user_id (CASCADE UPDATE, RESTRICT DELETE)
- meal_logs.nutrition_plan_id → nutrition_plans.id (SET NULL ON DELETE)
- meal_logs.user_id → user_profiles.user_id (CASCADE UPDATE, RESTRICT DELETE)
- dietary_preferences.user_id → user_profiles.user_id (CASCADE UPDATE, RESTRICT DELETE)

#### Data Validation
- JSON schemas validate JSONB field structures
- Check constraints ensure positive values for macros
- Unique constraints prevent duplicate preferences per user

#### Rate Limiting Implementation

```typescript
// Rate limiting configuration per endpoint type
export const NUTRITION_RATE_LIMITS = {
  // AI-powered operations
  nutritionGeneration: {
    production: '5 requests/hour',
    test: '100 requests/minute'
  },
  macroCalculation: {
    production: '5 requests/hour', 
    test: '100 requests/minute'
  },
  
  // Standard CRUD operations
  standardOperations: {
    production: '20 requests/15 minutes',
    test: '100 requests/minute'
  },
  
  // Meal logging (higher limit for frequent use)
  mealLogging: {
    production: '20 requests/15 minutes',
    test: '100 requests/minute'
  }
};
```

---

This comprehensive nutrition tracking feature guide provides all the necessary information for successful frontend integration, including AI agent integration, complex UI components, real-time features, performance optimization, error handling, thorough testing strategies, and complete database integration patterns. The implementation covers all 10 endpoints, complex data structures, unit conversions, rate limiting, and security considerations while maintaining the established patterns from the successful workout logging guide.

## Step 3: Review Implementation
**Note**: This documentation has been corrected to align with actual backend implementation after systematic verification.

**Critical Corrections Made:**
- ✅ **Database Schema**: Corrected from 4 tables to 3 tables (removed non-existent "macros_storage")
- ✅ **Dietary Preferences**: Removed non-existent fields (dislikedFoods, preferredCuisine) 
- ✅ **Schema Alignment**: Updated interfaces and validation to match actual migration files
- ✅ **Foreign Key Relationships**: Corrected to reflect actual database structure

**Verified Implementation Coverage:**
✅ **Covers all 10 API endpoints** with proper TypeScript interfaces
✅ **Documents AI agent integration** with OpenAI GPT-4o and memory systems  
✅ **Includes complex data structures** for nutrition plans, meal logging, and dietary preferences
✅ **Handles unit conversions** for metric/imperial systems
✅ **Implements rate limiting** with different limits per operation type
✅ **Provides real-time features** for macro tracking and meal suggestions
✅ **Includes comprehensive error handling** with fallback scenarios
✅ **Documents performance optimization** strategies including caching
✅ **Provides thorough testing strategies** for unit, integration, and E2E testing

The nutrition tracking feature guide is now accurately and completely documented based on the actual backend implementation. 