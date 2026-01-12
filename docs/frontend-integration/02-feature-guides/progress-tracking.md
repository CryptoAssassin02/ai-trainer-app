# Progress Tracking Feature Integration Guide

## Table of Contents
1. [Overview & Architecture](#overview--architecture)
2. [API Endpoints Reference](#api-endpoints-reference)
3. [State Management](#state-management)
4. [Implementation Guide](#implementation-guide)
5. [Photo Upload System](#photo-upload-system)
6. [UI Components](#ui-components)
7. [Real-time Features](#real-time-features)
8. [Error Handling & Recovery](#error-handling--recovery)
9. [Testing Strategies](#testing-strategies)
10. [Troubleshooting](#troubleshooting)

---

## Overview & Architecture

The Progress Tracking feature provides comprehensive functionality for users to record daily check-ins with physical measurements, wellness metrics, and progress analytics. This feature serves as the foundation for user engagement, goal tracking, and personalized insights through detailed data collection and statistical analysis.

### Key Capabilities

**Core Functionality:**
- **Daily Check-ins**: Comprehensive tracking of 13+ data points including weight, body measurements, and wellness metrics
- **Photo Upload System**: Progress photo storage with before/after comparisons and image optimization
- **Statistical Analysis**: Advanced progress calculations, trend detection, and time-series analysis
- **Flexible Data Retrieval**: Advanced filtering, pagination, and search capabilities with export options
- **Milestone Detection**: Automatic achievement recognition and progress celebration

**Business Impact:**
- **User Engagement**: Regular check-ins drive consistent app usage and habit formation
- **Analytics Foundation**: Provides rich data for AI insights, goal tracking, and personalized recommendations  
- **Progress Visualization**: Enables charts, trends, and comparative analysis over time
- **Health Monitoring**: Comprehensive wellness tracking beyond just physical measurements

### Architecture Overview

```typescript
// Component Architecture
interface ProgressTrackingArchitecture {
  apiLayer: {
    checkInCreation: 'POST /v1/progress/check-in',
    checkInRetrieval: 'GET /v1/progress/check-ins',
    individualCheckIn: 'GET /v1/progress/check-ins/:id',
    metricsCalculation: 'POST /v1/progress/metrics'
  };
  stateManagement: {
    checkInsData: 'Array<CheckInRecord>',
    currentCheckIn: 'CheckInRecord | null',
    progressMetrics: 'ProgressMetrics | null',
    photos: 'Array<ProgressPhoto>',
    filters: 'CheckInFilters'
  };
  components: {
    checkInForm: 'Daily check-in creation interface',
    progressDashboard: 'Overview with charts and trends',
    checkInHistory: 'List view with filtering and search',
    photoComparison: 'Before/after photo management',
    metricsAnalytics: 'Statistical analysis and insights'
  };
}
```

### Data Flow Architecture

**Check-in Creation Flow:**
1. User inputs measurements and wellness metrics
2. Optional photo upload with compression and optimization
3. Data validation on frontend and backend
4. Real-time progress calculations triggered
5. Cache invalidation and state updates
6. Analytics pipeline notification

**Data Retrieval Flow:**
1. Filtered data request with pagination
2. Server-side caching check (2-5 minute TTL)
3. Database query with optimized indexes
4. Response formatting and enrichment
5. Frontend state management update
6. UI re-rendering with loading states

---

## API Endpoints Reference

### 1. POST /v1/progress/check-in
**Purpose**: Create a new daily check-in record with comprehensive measurements and wellness data

#### Request Configuration
- **Method**: POST
- **Authentication**: Required (JWT Bearer token)
- **Rate Limiting**: 5 requests per hour per user
- **Content-Type**: application/json

#### Request Body Schema
```typescript
interface CheckInCreateRequest {
  date: string;                    // Required: YYYY-MM-DD format, cannot be future date
  weight?: number;                 // Optional: Weight in kg or lbs (based on user preference)
  body_fat_percentage?: number;    // Optional: 0-50% range
  measurements?: {                 // Optional: Body measurements object
    waist?: number;                // All measurements in cm or inches
    chest?: number;
    hips?: number;
    arms?: number;
    legs?: number;
    shoulders?: number;
    neck?: number;
  };
  mood?: number;                   // Optional: 1-10 scale
  sleep_quality?: number;          // Optional: 1-10 scale  
  energy_level?: number;           // Optional: 1-10 scale
  stress_level?: number;           // Optional: 1-10 scale
  notes?: string;                  // Optional: Max 1000 characters
}
```

#### Success Response (201 Created)
```typescript
interface CheckInResponse {
  status: 'success';
  data: {
    checkIn: {
      id: string;                  // UUID identifier
      user_id: string;             // User ownership reference
      date: string;                // YYYY-MM-DD format
      weight: number | null;
      body_fat_percentage: number | null;
      measurements: object | null;
      mood: number | null;         // 1-10 scale
      sleep_quality: number | null; // 1-10 scale
      energy_level: number | null; // 1-10 scale  
      stress_level: number | null; // 1-10 scale
      notes: string | null;
      created_at: string;          // ISO timestamp
      updated_at: string;          // ISO timestamp
    };
  };
  message: string;
}
```

#### Error Responses
- **400 Bad Request**: Invalid date format, future date, measurement out of range
- **401 Unauthorized**: Missing or invalid JWT token
- **409 Conflict**: Duplicate check-in for the same date
- **422 Unprocessable Entity**: Data validation failures
- **429 Too Many Requests**: Rate limit exceeded (5/hour)
- **500 Internal Server Error**: Database or server errors

#### Frontend Implementation
```typescript
class CheckInAPI {
  async createCheckIn(checkInData: CheckInCreateRequest): Promise<CheckInResponse> {
    const response = await fetch('/v1/progress/check-in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getJWTToken()}`
      },
      body: JSON.stringify(checkInData)
    });

    if (!response.ok) {
      throw await this.handleError(response);
    }

    return response.json();
  }

  private async handleError(response: Response): Promise<Error> {
    const errorData = await response.json().catch(() => ({}));
    
    switch (response.status) {
      case 409:
        throw new Error('A check-in already exists for this date. Please edit the existing entry.');
      case 429:
        throw new Error('You can only create 5 check-ins per hour. Please try again later.');
      default:
        throw new Error(errorData.message || 'Failed to create check-in');
    }
  }
}
```

### 2. GET /v1/progress/check-ins
**Purpose**: Retrieve filtered and paginated list of user check-ins with summary analytics

#### Request Configuration
- **Method**: GET
- **Authentication**: Required (JWT Bearer token)
- **Rate Limiting**: None (read operation)

#### Query Parameters
```typescript
interface CheckInListParams {
  startDate?: string;              // Optional: YYYY-MM-DD format
  endDate?: string;                // Optional: YYYY-MM-DD format
  sortBy?: 'date' | 'weight' | 'mood' | 'energy_level' | 'stress_level';
  sortOrder?: 'asc' | 'desc';      // Default: 'desc'
  page?: number;                   // Default: 1, min: 1
  limit?: number;                  // Default: 20, min: 1, max: 100
  includeMetrics?: boolean;        // Default: true
  includeNotes?: boolean;          // Default: true
  dataCompleteness?: 'all' | 'complete' | 'partial' | 'minimal'; // Default: 'all'
  weightRange?: string;            // Format: "min-max" (e.g., "70-80")
  moodRange?: string;              // Format: "min-max" for 1-10 scale
  searchNotes?: string;            // Max 100 chars, case-insensitive
  format?: 'json' | 'summary' | 'export'; // Default: 'json'
}
```

#### Success Response (200 OK)
```typescript
interface CheckInListResponse {
  status: 'success';
  data: {
    checkIns: CheckInRecord[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
    summary: {
      totalCheckIns: number;
      dateRange: {
        start: string;             // YYYY-MM-DD
        end: string;               // YYYY-MM-DD
      };
      averages: {
        weight?: number;
        mood?: number;
        energy_level?: number;
        stress_level?: number;
      };
    };
  };
}
```

#### Frontend Implementation
```typescript
class CheckInAPI {
  async getCheckIns(params: CheckInListParams = {}): Promise<CheckInListResponse> {
    const searchParams = new URLSearchParams();
    
    // Add parameters with defaults
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    const response = await fetch(`/v1/progress/check-ins?${searchParams}`, {
      headers: {
        'Authorization': `Bearer ${getJWTToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch check-ins: ${response.statusText}`);
    }

    return response.json();
  }

  // Convenience method for common filtering patterns
  async getRecentCheckIns(days: number = 30): Promise<CheckInListResponse> {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    return this.getCheckIns({
      startDate,
      endDate,
      sortBy: 'date',
      sortOrder: 'desc',
      includeMetrics: true
    });
  }
}
```

### 3. GET /v1/progress/check-ins/:checkInId
**Purpose**: Retrieve specific check-in with enriched analytics context and trend analysis

#### Request Configuration
- **Method**: GET
- **Authentication**: Required (JWT Bearer token)
- **Rate Limiting**: None (read operation)

#### Path Parameters
- **checkInId** (required): UUID of the specific check-in record

#### Query Parameters
```typescript
interface CheckInDetailParams {
  includeContext?: boolean;        // Default: true
  includeAnalytics?: boolean;      // Default: true
  includePrevious?: boolean;       // Default: true
  includeGoalProgress?: boolean;   // Default: false
  contextDays?: number;            // Default: 30, min: 0, max: 90
  format?: 'detailed' | 'summary' | 'export'; // Default: 'detailed'
}
```

#### Success Response (200 OK)
```typescript
interface CheckInDetailResponse {
  status: 'success';
  data: {
    checkIn: CheckInRecord;
    context?: {
      previousCheckIn: CheckInRecord | null;
      nextCheckIn: CheckInRecord | null;
      trendData: CheckInRecord[];  // Recent check-ins for trend analysis
    };
    analytics?: {
      progressSinceLast: {
        weightChange?: { absolute: number; percent: number };
        moodChange?: { absolute: number; percent: number };
        energyChange?: { absolute: number; percent: number };
      };
      trendAnalysis: {
        weightTrend: 'increasing' | 'decreasing' | 'stable';
        moodTrend: 'increasing' | 'decreasing' | 'stable';
        consistencyScore: number;  // 0-1 scale
      };
    };
    calculations?: {
      bmi?: number;
      progressPercentages?: Record<string, number>;
      dataQuality: number;         // 0-1 scale
    };
  };
}
```

#### Frontend Implementation
```typescript
class CheckInAPI {
  async getCheckIn(
    checkInId: string, 
    params: CheckInDetailParams = {}
  ): Promise<CheckInDetailResponse> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    const response = await fetch(
      `/v1/progress/check-ins/${checkInId}?${searchParams}`,
      {
        headers: {
          'Authorization': `Bearer ${getJWTToken()}`
        }
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Check-in not found or you do not have permission to access it');
      }
      throw new Error(`Failed to fetch check-in: ${response.statusText}`);
    }

    return response.json();
  }
}
```

### 4. POST /v1/progress/metrics
**Purpose**: Calculate comprehensive progress metrics for specified date range with statistical analysis

#### Request Configuration
- **Method**: POST
- **Authentication**: Required (JWT Bearer token)
- **Rate Limiting**: Consider implementing (computationally expensive)
- **Content-Type**: application/json

#### Request Body Schema
```typescript
interface MetricsCalculationRequest {
  startDate: string;               // Required: YYYY-MM-DD format
  endDate: string;                 // Required: YYYY-MM-DD format (must be after startDate)
  includeWellness?: boolean;       // Default: true
  includeTrends?: boolean;         // Default: true
  includeCorrelations?: boolean;   // Default: false
  includeStatistics?: boolean;     // Default: false
  granularity?: 'daily' | 'weekly' | 'monthly'; // Default: 'daily'
  comparisonPeriod?: 'previous_week' | 'previous_month' | 'previous_quarter';
  focusMetrics?: string[];         // Specific metrics to focus on
  analysisDepth?: 'basic' | 'standard' | 'comprehensive'; // Default: 'standard'
  includeRecommendations?: boolean; // Default: false
  includeProjections?: boolean;    // Default: false
  goalId?: string;                 // Optional: UUID for goal correlation
}
```

#### Success Response (200 OK)
```typescript
interface MetricsCalculationResponse {
  status: 'success';
  data: {
    metrics: {
      dateRange: {
        start: string;             // YYYY-MM-DD
        end: string;               // YYYY-MM-DD
        totalDays: number;
      };
      summary: {
        totalCheckIns: number;
        dataCompleteness: number;  // 0-1 score
        consistencyScore: number;  // 0-1 score
      };
      weightProgression?: {
        trend: 'increasing' | 'decreasing' | 'stable';
        changeAmount: number;      // Absolute change
        changePercentage: number;  // Percentage change
        velocity: number;          // Change per day
      };
      bodyCompositionChanges?: {
        bodyFat?: { absolute: number; percent: number };
      };
      wellnessMetrics?: {
        mood: { average: number; trend: string };
        energyLevel: { average: number; trend: string };
        stressLevel: { average: number; trend: string };
      };
      averages: {
        weight?: number;
        bodyFat?: number;
        energyLevel?: number;
        stressLevel?: number;
      };
    };
    calculationMetadata: {
      calculatedAt: string;        // ISO timestamp
      analysisDepth: string;
      dataQuality: number;         // 0-1 score
      processingTime: number;      // Milliseconds
    };
  };
}
```

#### Frontend Implementation
```typescript
class CheckInAPI {
  async calculateMetrics(
    request: MetricsCalculationRequest
  ): Promise<MetricsCalculationResponse> {
    const response = await fetch('/v1/progress/metrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getJWTToken()}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 422) {
        throw new Error('Insufficient data for metrics calculation. Please ensure you have at least 2 check-ins in the selected period.');
      }
      
      throw new Error(errorData.message || 'Failed to calculate metrics');
    }

    return response.json();
  }

  // Convenience method for common metric calculations
  async getMonthlyProgress(): Promise<MetricsCalculationResponse> {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    return this.calculateMetrics({
      startDate,
      endDate,
      includeWellness: true,
      includeTrends: true,
      analysisDepth: 'standard'
    });
  }
}
```

---

## State Management

### TypeScript Interfaces

```typescript
// Core Data Types
interface CheckInRecord {
  id: string;
  user_id: string;
  date: string;                    // YYYY-MM-DD
  weight?: number;
  body_fat_percentage?: number;
  measurements?: {
    waist?: number;
    chest?: number;
    hips?: number;
    arms?: number;
    legs?: number;
    shoulders?: number;
    neck?: number;
  };
  mood?: number;                   // 1-10 scale
  sleep_quality?: number;          // 1-10 scale
  energy_level?: number;           // 1-10 scale
  stress_level?: number;           // 1-10 scale
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface ProgressPhoto {
  id: string;
  checkInId: string;
  type: 'front' | 'side' | 'back' | 'custom';
  url: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  metadata?: {
    fileSize: number;
    dimensions: { width: number; height: number };
    format: string;
  };
}

interface CheckInFilters {
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page: number;
  limit: number;
  includeMetrics: boolean;
  includeNotes: boolean;
  dataCompleteness?: string;
  weightRange?: string;
  moodRange?: string;
  searchNotes?: string;
}

interface ProgressMetrics {
  dateRange: {
    start: string;
    end: string;
    totalDays: number;
  };
  summary: {
    totalCheckIns: number;
    dataCompleteness: number;
    consistencyScore: number;
  };
  weightProgression?: {
    trend: string;
    changeAmount: number;
    changePercentage: number;
    velocity: number;
  };
  wellnessMetrics?: {
    mood: { average: number; trend: string };
    energyLevel: { average: number; trend: string };
    stressLevel: { average: number; trend: string };
  };
  averages: Record<string, number>;
}
```

### React Context Implementation

```typescript
// Context State
interface ProgressTrackingState {
  // Data State
  checkIns: CheckInRecord[];
  currentCheckIn: CheckInRecord | null;
  progressMetrics: ProgressMetrics | null;
  photos: ProgressPhoto[];
  
  // UI State
  filters: CheckInFilters;
  loading: {
    checkIns: boolean;
    currentCheckIn: boolean;
    metrics: boolean;
    photos: boolean;
    creating: boolean;
  };
  
  // Error State
  errors: {
    checkIns: string | null;
    currentCheckIn: string | null;
    metrics: string | null;
    photos: string | null;
    creating: string | null;
  };
  
  // Pagination State
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Context Actions
interface ProgressTrackingActions {
  // Check-in Operations
  createCheckIn: (data: CheckInCreateRequest) => Promise<void>;
  loadCheckIns: (params?: CheckInListParams) => Promise<void>;
  loadCheckIn: (id: string, params?: CheckInDetailParams) => Promise<void>;
  calculateMetrics: (request: MetricsCalculationRequest) => Promise<void>;
  
  // Photo Operations
  uploadPhoto: (checkInId: string, file: File, type: string) => Promise<void>;
  deletePhoto: (photoId: string) => Promise<void>;
  
  // Filter Operations
  updateFilters: (filters: Partial<CheckInFilters>) => void;
  resetFilters: () => void;
  
  // Pagination Operations
  nextPage: () => Promise<void>;
  previousPage: () => Promise<void>;
  goToPage: (page: number) => Promise<void>;
  
  // Utility Operations
  clearErrors: () => void;
  refreshData: () => Promise<void>;
}

// Context Provider Implementation
const ProgressTrackingContext = createContext<{
  state: ProgressTrackingState;
  actions: ProgressTrackingActions;
} | null>(null);

export const ProgressTrackingProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const [state, setState] = useState<ProgressTrackingState>({
    // Initial state
    checkIns: [],
    currentCheckIn: null,
    progressMetrics: null,
    photos: [],
    filters: {
      page: 1,
      limit: 20,
      includeMetrics: true,
      includeNotes: true,
      sortBy: 'date',
      sortOrder: 'desc'
    },
    loading: {
      checkIns: false,
      currentCheckIn: false,
      metrics: false,
      photos: false,
      creating: false
    },
    errors: {
      checkIns: null,
      currentCheckIn: null,
      metrics: null,
      photos: null,
      creating: null
    },
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false
    }
  });

  const checkInAPI = useMemo(() => new CheckInAPI(), []);

  const actions: ProgressTrackingActions = {
    createCheckIn: async (data: CheckInCreateRequest) => {
      setState(prev => ({ 
        ...prev, 
        loading: { ...prev.loading, creating: true },
        errors: { ...prev.errors, creating: null }
      }));

      try {
        const response = await checkInAPI.createCheckIn(data);
        
        // Add new check-in to the beginning of the list
        setState(prev => ({
          ...prev,
          checkIns: [response.data.checkIn, ...prev.checkIns],
          loading: { ...prev.loading, creating: false }
        }));
        
        // Refresh metrics if we have recent data
        if (state.progressMetrics) {
          actions.calculateMetrics({
            startDate: state.progressMetrics.dateRange.start,
            endDate: new Date().toISOString().split('T')[0]
          });
        }
        
      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: { ...prev.loading, creating: false },
          errors: { ...prev.errors, creating: error.message }
        }));
        throw error;
      }
    },

    loadCheckIns: async (params: CheckInListParams = {}) => {
      setState(prev => ({ 
        ...prev, 
        loading: { ...prev.loading, checkIns: true },
        errors: { ...prev.errors, checkIns: null }
      }));

      try {
        const response = await checkInAPI.getCheckIns({ ...state.filters, ...params });
        
        setState(prev => ({
          ...prev,
          checkIns: response.data.checkIns,
          pagination: response.data.pagination,
          loading: { ...prev.loading, checkIns: false }
        }));
        
      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: { ...prev.loading, checkIns: false },
          errors: { ...prev.errors, checkIns: error.message }
        }));
      }
    },

    calculateMetrics: async (request: MetricsCalculationRequest) => {
      setState(prev => ({ 
        ...prev, 
        loading: { ...prev.loading, metrics: true },
        errors: { ...prev.errors, metrics: null }
      }));

      try {
        const response = await checkInAPI.calculateMetrics(request);
        
        setState(prev => ({
          ...prev,
          progressMetrics: response.data.metrics,
          loading: { ...prev.loading, metrics: false }
        }));
        
      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: { ...prev.loading, metrics: false },
          errors: { ...prev.errors, metrics: error.message }
        }));
      }
    },

    updateFilters: (newFilters: Partial<CheckInFilters>) => {
      const updatedFilters = { ...state.filters, ...newFilters };
      setState(prev => ({ ...prev, filters: updatedFilters }));
      
      // Auto-reload with new filters
      actions.loadCheckIns(updatedFilters);
    },

    refreshData: async () => {
      await Promise.all([
        actions.loadCheckIns(),
        state.progressMetrics && actions.calculateMetrics({
          startDate: state.progressMetrics.dateRange.start,
          endDate: state.progressMetrics.dateRange.end
        })
      ]);
    },

    // ... implement remaining actions
  };

  return (
    <ProgressTrackingContext.Provider value={{ state, actions }}>
      {children}
    </ProgressTrackingContext.Provider>
  );
};

// Custom Hook
export const useProgressTracking = () => {
  const context = useContext(ProgressTrackingContext);
  if (!context) {
    throw new Error('useProgressTracking must be used within ProgressTrackingProvider');
  }
  return context;
};
```

### React Query Integration (Alternative/Additional)

```typescript
// React Query Keys
export const progressTrackingKeys = {
  all: ['progress-tracking'] as const,
  checkIns: () => [...progressTrackingKeys.all, 'check-ins'] as const,
  checkInsFiltered: (filters: CheckInListParams) => 
    [...progressTrackingKeys.checkIns(), filters] as const,
  checkIn: (id: string) => [...progressTrackingKeys.all, 'check-in', id] as const,
  metrics: (request: MetricsCalculationRequest) => 
    [...progressTrackingKeys.all, 'metrics', request] as const,
  photos: (checkInId: string) => 
    [...progressTrackingKeys.all, 'photos', checkInId] as const,
};

// React Query Hooks
export const useCheckIns = (params: CheckInListParams = {}) => {
  const checkInAPI = new CheckInAPI();
  
  return useQuery({
    queryKey: progressTrackingKeys.checkInsFiltered(params),
    queryFn: () => checkInAPI.getCheckIns(params),
    staleTime: 2 * 60 * 1000,      // 2 minutes
    cacheTime: 5 * 60 * 1000,      // 5 minutes
    keepPreviousData: true         // For pagination
  });
};

export const useCheckIn = (id: string, params: CheckInDetailParams = {}) => {
  const checkInAPI = new CheckInAPI();
  
  return useQuery({
    queryKey: progressTrackingKeys.checkIn(id),
    queryFn: () => checkInAPI.getCheckIn(id, params),
    staleTime: 5 * 60 * 1000,      // 5 minutes
    enabled: !!id
  });
};

export const useProgressMetrics = (request: MetricsCalculationRequest) => {
  const checkInAPI = new CheckInAPI();
  
  return useQuery({
    queryKey: progressTrackingKeys.metrics(request),
    queryFn: () => checkInAPI.calculateMetrics(request),
    staleTime: 30 * 60 * 1000,     // 30 minutes
    cacheTime: 60 * 60 * 1000,     // 1 hour
    enabled: !!(request.startDate && request.endDate)
  });
};

// Mutations
export const useCreateCheckIn = () => {
  const queryClient = useQueryClient();
  const checkInAPI = new CheckInAPI();
  
  return useMutation({
    mutationFn: (data: CheckInCreateRequest) => checkInAPI.createCheckIn(data),
    onSuccess: () => {
      // Invalidate and refetch check-ins
      queryClient.invalidateQueries(progressTrackingKeys.checkIns());
      
      // Invalidate metrics that might be affected
      queryClient.invalidateQueries(progressTrackingKeys.all);
    }
  });
};
```

---

## Implementation Guide

### Installation & Dependencies

```bash
# Core dependencies for progress tracking
npm install react-hook-form @hookform/resolvers yup
npm install react-query date-fns 
npm install recharts react-chartjs-2 chart.js  # For visualizations
npm install react-image-crop react-image-file-resizer  # For photo handling

# Optional: Enhanced UI components
npm install @radix-ui/react-dialog @radix-ui/react-tabs
npm install framer-motion  # For animations
```

### Required Imports

```typescript
// Core React and hooks
import React, { useState, useEffect, useMemo, useCallback } from 'react';

// Form handling
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// Data fetching
import { useQuery, useMutation, useQueryClient } from 'react-query';

// Date utilities
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

// Chart components
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// UI Components (adjust paths to your UI library)
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
  Progress,
  Badge,
  Alert,
  AlertDescription,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui';

// Icons
import { Camera, TrendingUp, TrendingDown, Calendar, Scale, Heart } from 'lucide-react';
```

### API Service Layer

```typescript
class CheckInAPI {
  private baseURL = '/v1/progress';
  
  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getJWTToken()}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw await this.handleError(response);
    }

    return response.json();
  }

  private async handleError(response: Response): Promise<Error> {
    const errorData = await response.json().catch(() => ({}));
    return new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  // All the API methods implemented above
  async createCheckIn(data: CheckInCreateRequest): Promise<CheckInResponse> {
    return this.request('/check-in', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCheckIns(params: CheckInListParams = {}): Promise<CheckInListResponse> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    return this.request(`/check-ins?${searchParams}`);
  }

  async getCheckIn(id: string, params: CheckInDetailParams = {}): Promise<CheckInDetailResponse> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    return this.request(`/check-ins/${id}?${searchParams}`);
  }

  async calculateMetrics(request: MetricsCalculationRequest): Promise<MetricsCalculationResponse> {
    return this.request('/metrics', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
}

// Utility functions for JWT token management
function getJWTToken(): string {
  return localStorage.getItem('jwtToken') || '';
}

function isTokenValid(): boolean {
  const token = getJWTToken();
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}
```

---

## Photo Upload System

### Photo Management Infrastructure

The progress tracking feature includes comprehensive photo upload capabilities for before/after comparisons and visual progress documentation.

#### Photo Upload Component

```typescript
interface ProgressPhotoUploadProps {
  checkInId: string;
  onUploadComplete: (photo: ProgressPhoto) => void;
  maxFiles?: number;
  allowedTypes?: string[];
}

export const ProgressPhotoUpload: React.FC<ProgressPhotoUploadProps> = ({
  checkInId,
  onUploadComplete,
  maxFiles = 4,
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const photoAPI = useMemo(() => new PhotoAPI(), []);

  const handleFileSelect = useCallback(async (files: FileList) => {
    setError(null);
    setUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file, index) => {
        // Validate file type
        if (!allowedTypes.includes(file.type)) {
          throw new Error(`Invalid file type: ${file.type}`);
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error('File size must be less than 10MB');
        }

        // Compress and resize image
        const processedFile = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.8
        });

        // Upload with progress tracking
        return photoAPI.uploadPhoto(checkInId, processedFile, {
          onProgress: (progress) => {
            setUploadProgress(prev => ({
              ...prev,
              [file.name]: progress
            }));
          }
        });
      });

      const uploadedPhotos = await Promise.all(uploadPromises);
      
      uploadedPhotos.forEach(photo => {
        onUploadComplete(photo);
      });

    } catch (error) {
      setError(error.message);
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  }, [checkInId, allowedTypes, onUploadComplete, photoAPI]);

  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Progress Photos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* File Upload Area */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
            onClick={() => document.getElementById('photo-upload')?.click()}
          >
            <input
              id="photo-upload"
              type="file"
              multiple
              accept={allowedTypes.join(',')}
              max={maxFiles}
              className="hidden"
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              disabled={uploading}
            />
            
            <Camera className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900">
              Upload Progress Photos
            </p>
            <p className="text-sm text-gray-500">
              Select up to {maxFiles} photos (JPEG, PNG, WebP)
            </p>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              {Object.entries(uploadProgress).map(([filename, progress]) => (
                <div key={filename} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate">{filename}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              ))}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Image compression utility
async function compressImage(
  file: File, 
  options: { maxWidth: number; maxHeight: number; quality: number }
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      const { maxWidth, maxHeight } = options;

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        file.type,
        options.quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}
```

#### Photo Comparison Component

```typescript
interface PhotoComparisonProps {
  photos: ProgressPhoto[];
  checkInDate: string;
  comparisonMode?: 'side-by-side' | 'overlay' | 'slider';
}

export const PhotoComparison: React.FC<PhotoComparisonProps> = ({
  photos,
  checkInDate,
  comparisonMode = 'side-by-side'
}) => {
  const [selectedPhotos, setSelectedPhotos] = useState<ProgressPhoto[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'comparison'>(
    photos.length <= 2 ? 'comparison' : 'grid'
  );

  const photosByType = useMemo(() => {
    return photos.reduce((acc, photo) => {
      if (!acc[photo.type]) acc[photo.type] = [];
      acc[photo.type].push(photo);
      return acc;
    }, {} as Record<string, ProgressPhoto[]>);
  }, [photos]);

  return (
    <Card className="p-4">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Progress Photos - {format(new Date(checkInDate), 'MMM dd, yyyy')}</CardTitle>
          
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              Grid
            </Button>
            <Button
              variant={viewMode === 'comparison' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('comparison')}
              disabled={photos.length < 2}
            >
              Compare
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                  selectedPhotos.includes(photo)
                    ? 'border-blue-500 scale-105'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  setSelectedPhotos(prev => 
                    prev.includes(photo)
                      ? prev.filter(p => p.id !== photo.id)
                      : [...prev, photo].slice(0, 2) // Max 2 for comparison
                  );
                }}
              >
                <img
                  src={photo.thumbnailUrl || photo.url}
                  alt={`${photo.type} progress photo`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="text-xs">
                    {photo.type}
                  </Badge>
                </div>
                {selectedPhotos.includes(photo) && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="default" className="text-xs">
                      Selected
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {selectedPhotos.length === 2 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedPhotos.map((photo, index) => (
                  <div key={photo.id} className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">
                      Photo {index + 1} - {photo.type}
                    </div>
                    <div className="aspect-square rounded-lg overflow-hidden">
                      <img
                        src={photo.url}
                        alt={`${photo.type} progress photo`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-xs text-gray-500">
                      Uploaded: {format(new Date(photo.uploadedAt), 'MMM dd, yyyy HH:mm')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Select 2 photos from the grid above to compare
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

---

## UI Components

### 1. Check-in Creation Form

```typescript
interface CheckInFormData {
  date: string;
  weight?: number;
  body_fat_percentage?: number;
  measurements?: {
    waist?: number;
    chest?: number;
    hips?: number;
    arms?: number;
    legs?: number;
    shoulders?: number;
    neck?: number;
  };
  mood?: number;
  sleep_quality?: number;
  energy_level?: number;
  stress_level?: number;
  notes?: string;
}

const checkInSchema = yup.object({
  date: yup
    .string()
    .required('Date is required')
    .matches(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .test('not-future', 'Cannot create check-in for future dates', (value) => {
      return value ? new Date(value) <= new Date() : true;
    }),
  weight: yup
    .number()
    .min(30, 'Weight must be at least 30')
    .max(300, 'Weight must be less than 300')
    .optional(),
  body_fat_percentage: yup
    .number()
    .min(0, 'Body fat percentage must be at least 0%')
    .max(50, 'Body fat percentage must be less than 50%')
    .optional(),
  measurements: yup.object({
    waist: yup.number().min(20).max(60).optional(),
    chest: yup.number().min(20).max(80).optional(),
    hips: yup.number().min(20).max(80).optional(),
    arms: yup.number().min(8).max(30).optional(),
    legs: yup.number().min(15).max(50).optional(),
    shoulders: yup.number().min(20).max(80).optional(),
    neck: yup.number().min(8).max(25).optional(),
  }).optional(),
  mood: yup.number().min(1).max(10).optional(),
  sleep_quality: yup.number().min(1).max(10).optional(),
  energy_level: yup.number().min(1).max(10).optional(),
  stress_level: yup.number().min(1).max(10).optional(),
  notes: yup.string().max(1000, 'Notes must be less than 1000 characters').optional(),
});

export const CheckInForm: React.FC = () => {
  const { actions } = useProgressTracking();
  const createCheckInMutation = useCreateCheckIn();

  const { control, handleSubmit, formState: { errors }, reset } = useForm<CheckInFormData>({
    resolver: yupResolver(checkInSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      measurements: {}
    }
  });

  const onSubmit = async (data: CheckInFormData) => {
    try {
      await createCheckInMutation.mutateAsync(data);
      reset();
      // Show success message
    } catch (error) {
      // Error handling is managed by the mutation
    }
  };

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Daily Check-in
        </CardTitle>
      </CardHeader>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  className={errors.date ? 'border-red-500' : ''}
                />
              )}
            />
            {errors.date && (
              <p className="text-sm text-red-500">{errors.date.message}</p>
            )}
          </div>

          {/* Physical Measurements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Controller
                name="weight"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    step="0.1"
                    placeholder="75.5"
                    className={errors.weight ? 'border-red-500' : ''}
                  />
                )}
              />
              {errors.weight && (
                <p className="text-sm text-red-500">{errors.weight.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="body_fat_percentage">Body Fat %</Label>
              <Controller
                name="body_fat_percentage"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    step="0.1"
                    placeholder="18.5"
                    className={errors.body_fat_percentage ? 'border-red-500' : ''}
                  />
                )}
              />
              {errors.body_fat_percentage && (
                <p className="text-sm text-red-500">{errors.body_fat_percentage.message}</p>
              )}
            </div>
          </div>

          {/* Body Measurements */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Body Measurements (cm)</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries({
                waist: 'Waist',
                chest: 'Chest',
                hips: 'Hips',
                arms: 'Arms',
                legs: 'Legs',
                shoulders: 'Shoulders',
                neck: 'Neck'
              }).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{label}</Label>
                  <Controller
                    name={`measurements.${key}` as any}
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="number"
                        step="0.1"
                        placeholder="32.0"
                      />
                    )}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Wellness Metrics */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Wellness Metrics (1-10 scale)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries({
                mood: 'Mood',
                sleep_quality: 'Sleep Quality',
                energy_level: 'Energy Level',
                stress_level: 'Stress Level'
              }).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{label}</Label>
                  <Controller
                    name={key as any}
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value?.toString() || ''}
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} - {getScaleLabel(key, num)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  placeholder="How are you feeling today? Any observations about your progress..."
                  rows={3}
                  maxLength={1000}
                  className={errors.notes ? 'border-red-500' : ''}
                />
              )}
            />
            {errors.notes && (
              <p className="text-sm text-red-500">{errors.notes.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={createCheckInMutation.isLoading}
          >
            {createCheckInMutation.isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Creating Check-in...
              </>
            ) : (
              'Create Check-in'
            )}
          </Button>

          {/* Error Display */}
          {createCheckInMutation.error && (
            <Alert variant="destructive">
              <AlertDescription>
                {createCheckInMutation.error.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </form>
    </Card>
  );
};

// Helper function for wellness scale labels
function getScaleLabel(metric: string, value: number): string {
  const labels = {
    mood: ['Terrible', 'Poor', 'Bad', 'Low', 'Okay', 'Good', 'Great', 'Very Good', 'Excellent', 'Amazing'],
    sleep_quality: ['Awful', 'Poor', 'Bad', 'Restless', 'Okay', 'Good', 'Sound', 'Very Good', 'Excellent', 'Perfect'],
    energy_level: ['Exhausted', 'Drained', 'Low', 'Sluggish', 'Okay', 'Good', 'Energetic', 'High', 'Very High', 'Peak'],
    stress_level: ['Overwhelmed', 'Very High', 'High', 'Elevated', 'Moderate', 'Manageable', 'Low', 'Very Low', 'Minimal', 'None']
  };
  
  return labels[metric]?.[value - 1] || value.toString();
}
```

### 2. Progress Dashboard Component

```typescript
export const ProgressDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    startDate: subDays(new Date(), 30).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const { data: checkIns, isLoading: checkInsLoading } = useCheckIns({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    limit: 100
  });

  const { data: metrics, isLoading: metricsLoading } = useProgressMetrics({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    includeWellness: true,
    includeTrends: true
  });

  const chartData = useMemo(() => {
    if (!checkIns?.data.checkIns) return [];
    
    return checkIns.data.checkIns
      .filter(checkIn => checkIn.weight !== null)
      .map(checkIn => ({
        date: checkIn.date,
        weight: checkIn.weight,
        mood: checkIn.mood,
        energy: checkIn.energy_level,
        stress: checkIn.stress_level
      }))
      .reverse(); // Chronological order
  }, [checkIns]);

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4 items-center">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                max={dateRange.endDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                max={new Date().toISOString().split('T')[0]}
                min={dateRange.startDate}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDateRange({
                startDate: subDays(new Date(), 7).toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0]
              })}
            >
              Last 7 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDateRange({
                startDate: subDays(new Date(), 30).toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0]
              })}
            >
              Last 30 Days
            </Button>
          </div>
        </div>
      </Card>

      {/* Metrics Summary */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Scale className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Weight Change</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">
                    {metrics.data.metrics.weightProgression?.changeAmount?.toFixed(1) || '0.0'} kg
                  </span>
                  {metrics.data.metrics.weightProgression?.trend === 'decreasing' && (
                    <TrendingDown className="h-4 w-4 text-green-600" />
                  )}
                  {metrics.data.metrics.weightProgression?.trend === 'increasing' && (
                    <TrendingUp className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {metrics.data.metrics.weightProgression?.changePercentage?.toFixed(1)}% change
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Heart className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Avg Mood</p>
                <span className="text-2xl font-bold">
                  {metrics.data.metrics.wellnessMetrics?.mood?.average?.toFixed(1) || 'N/A'}
                </span>
                <p className="text-xs text-gray-500">
                  {metrics.data.metrics.wellnessMetrics?.mood?.trend || 'stable'} trend
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                ⚡
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Energy</p>
                <span className="text-2xl font-bold">
                  {metrics.data.metrics.wellnessMetrics?.energyLevel?.average?.toFixed(1) || 'N/A'}
                </span>
                <p className="text-xs text-gray-500">
                  {metrics.data.metrics.wellnessMetrics?.energyLevel?.trend || 'stable'} trend
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                📊
              </div>
              <div>
                <p className="text-sm text-gray-600">Check-ins</p>
                <span className="text-2xl font-bold">
                  {metrics.data.metrics.summary.totalCheckIns}
                </span>
                <p className="text-xs text-gray-500">
                  {Math.round(metrics.data.metrics.summary.consistencyScore * 100)}% consistency
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Progress Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weight Chart */}
        <Card className="p-4">
          <CardHeader>
            <CardTitle>Weight Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => format(new Date(date), 'MMM dd')}
                  />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip 
                    labelFormatter={(date) => format(new Date(date), 'MMM dd, yyyy')}
                    formatter={(value, name) => [`${value} kg`, 'Weight']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="#2563eb" 
                    strokeWidth={2}
                    dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No weight data available for the selected period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Wellness Metrics Chart */}
        <Card className="p-4">
          <CardHeader>
            <CardTitle>Wellness Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => format(new Date(date), 'MMM dd')}
                  />
                  <YAxis domain={[1, 10]} />
                  <Tooltip 
                    labelFormatter={(date) => format(new Date(date), 'MMM dd, yyyy')}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="mood" 
                    stroke="#dc2626" 
                    strokeWidth={2}
                    name="Mood"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="energy" 
                    stroke="#16a34a" 
                    strokeWidth={2}
                    name="Energy"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="stress" 
                    stroke="#9333ea" 
                    strokeWidth={2}
                    name="Stress"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No wellness data available for the selected period
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Loading States */}
      {(checkInsLoading || metricsLoading) && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-3 text-gray-600">Loading progress data...</span>
        </div>
      )}
    </div>
  );
};
```

---

## Real-time Features

### Live Progress Updates

```typescript
// Real-time progress tracking with WebSocket integration
export const useRealTimeProgress = (userId: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Establish WebSocket connection
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/progress/${userId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('Progress tracking WebSocket connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'check-in-created':
          // Invalidate and refetch check-ins
          queryClient.invalidateQueries(progressTrackingKeys.checkIns());
          break;
          
        case 'metrics-updated':
          // Update metrics cache
          queryClient.setQueryData(
            progressTrackingKeys.metrics(data.request),
            data.metrics
          );
          break;
          
        case 'milestone-achieved':
          // Show milestone notification
          showMilestoneNotification(data.milestone);
          break;
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('Progress tracking WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('Progress tracking WebSocket error:', error);
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [userId, queryClient]);

  return { isConnected };
};

// Milestone notification system
function showMilestoneNotification(milestone: any) {
  // Implementation depends on your notification system
  toast.success(`🎉 Milestone Achieved: ${milestone.message}`, {
    duration: 5000,
    position: 'top-right'
  });
}
```

---

## Error Handling & Recovery

### Comprehensive Error Management

```typescript
// Error boundary for progress tracking
export class ProgressTrackingErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Progress tracking error:', error, errorInfo);
    // Send to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="p-6 text-center">
          <CardContent>
            <h3 className="text-lg font-semibold text-red-600 mb-2">
              Something went wrong with progress tracking
            </h3>
            <p className="text-gray-600 mb-4">
              We're sorry for the inconvenience. Please try refreshing the page.
            </p>
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Retry mechanism for API calls
export const useRetryableQuery = <T,>(
  queryKey: any[],
  queryFn: () => Promise<T>,
  options: any = {}
) => {
  return useQuery({
    queryKey,
    queryFn,
    retry: (failureCount, error: any) => {
      // Don't retry on authentication errors
      if (error.message?.includes('401') || error.message?.includes('403')) {
        return false;
      }
      
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options
  });
};
```

---

## Testing Strategies

### Unit Testing Examples

```typescript
// Test for CheckInForm component
describe('CheckInForm', () => {
  test('validates required fields', async () => {
    render(<CheckInForm />);
    
    // Try to submit without required date
    fireEvent.click(screen.getByText('Create Check-in'));
    
    await waitFor(() => {
      expect(screen.getByText('Date is required')).toBeInTheDocument();
    });
  });

  test('prevents future date selection', async () => {
    render(<CheckInForm />);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    fireEvent.change(screen.getByLabelText('Date'), {
      target: { value: tomorrow.toISOString().split('T')[0] }
    });
    
    fireEvent.click(screen.getByText('Create Check-in'));
    
    await waitFor(() => {
      expect(screen.getByText('Cannot create check-in for future dates')).toBeInTheDocument();
    });
  });
});

// Integration test for API
describe('CheckInAPI', () => {
  test('creates check-in successfully', async () => {
    const api = new CheckInAPI();
    const mockData = {
      date: '2024-01-15',
      weight: 75.5,
      mood: 8
    };

    const response = await api.createCheckIn(mockData);
    
    expect(response.status).toBe('success');
    expect(response.data.checkIn.weight).toBe(75.5);
  });
});
```

---

## Troubleshooting

### Common Issues and Solutions

#### Rate Limiting Issues
- **Problem**: 429 errors when creating multiple check-ins
- **Solution**: Implement client-side rate limiting and user feedback
- **Prevention**: Show remaining quota to users

#### Photo Upload Failures
- **Problem**: Large photos failing to upload
- **Solution**: Implement image compression and chunked uploads
- **Monitoring**: Track upload success rates and file sizes

#### Data Sync Issues
- **Problem**: Inconsistent data between cache and server
- **Solution**: Implement cache invalidation strategies and optimistic updates
- **Recovery**: Manual refresh options for users

#### Performance Issues
- **Problem**: Slow metrics calculations
- **Solution**: Implement background processing and loading states
- **Optimization**: Cache frequently requested metrics

---

This comprehensive progress tracking feature guide provides all the necessary information for successful frontend integration, covering photo management, complex data visualization, real-time features, comprehensive error handling, and thorough testing strategies. The implementation includes all 4 API endpoints with detailed examples and handles the complex data structures required for effective progress tracking and analytics.
``` 