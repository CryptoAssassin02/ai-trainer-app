# Frontend API Quick Reference

> **Purpose**: This document provides frontend-focused API usage patterns and examples that complement our comprehensive [OpenAPI documentation](../../openapi.yaml). It focuses on practical implementation patterns for React/Next.js developers.

## Table of Contents

1. [Quick Lookup by Feature](#quick-lookup-by-feature)
2. [Frontend Integration Patterns](#frontend-integration-patterns)
3. [Common Use Cases](#common-use-cases)
4. [Authentication Flow Examples](#authentication-flow-examples)

---

## 1. Quick Lookup by Feature

### Authentication Endpoints with React Hooks

#### Basic Authentication Operations
```typescript
// Signup
POST /v1/auth/signup
Request: { name: string, email: string, password: string }
Response: { userId: string, jwtToken: string }

// Login  
POST /v1/auth/login
Request: { email: string, password: string, rememberMe?: boolean }
Response: { userId: string, jwtToken: string, refreshToken?: string }

// Session validation
GET /v1/auth/me
Headers: { Authorization: "Bearer {jwtToken}" }
Response: { user: UserProfile }

// Password reset
POST /v1/auth/password-reset
Request: { email: string }
Response: { message: string }
```

#### React Hook Integration
```typescript
// useAuth hook pattern
const { user, login, logout, loading } = useAuth();
const { signUp, error: signupError } = useSignup();

// Component usage
const handleLogin = async (credentials) => {
  const response = await fetch('/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  const data = await response.json();
  // Store token and update auth state
};
```

### Profile Management with State Patterns

#### Profile Operations
```typescript
// Get profile
GET /v1/profile
Headers: { Authorization: "Bearer {jwtToken}" }
Response: UserProfile

// Create/Update profile
POST /v1/profile
Request: { 
  height: number | { feet: number, inches: number },
  weight: number,
  age: number,
  goals: string[],
  preferences: ProfilePreferences
}

// Update preferences
PUT /v1/profile/preferences
Request: { 
  unitPreference: 'metric' | 'imperial',
  equipment: string[],
  exerciseTypes: string[]
}
```

#### State Management Pattern
```typescript
const [profile, setProfile] = useState<UserProfile | null>(null);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const updateProfile = async (updates: Partial<UserProfile>) => {
  setIsLoading(true);
  setError(null);
  try {
    const response = await apiClient.post('/v1/profile', updates);
    setProfile(response.data);
  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};
```

### Workout Operations with Error Handling

#### Workout Plan Generation
```typescript
// Generate workout plan
POST /v1/workouts
Request: {
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced',
  goals: string[],
  equipment: string[],
  restrictions: string[],
  workoutFrequency: string
}
Response: {
  planId: string,
  planName: string,
  exercises: Exercise[],
  researchInsights: string[],
  reasoning: string
}

// Adjust existing plan
POST /v1/workouts/{planId}
Request: {
  feedback: string,
  adjustmentType: 'difficulty' | 'focus' | 'equipment',
  priority: 'low' | 'medium' | 'high'
}
```

#### Error Handling Pattern
```typescript
const generateWorkout = async (params: WorkoutGenerationRequest) => {
  try {
    const response = await apiClient.post('/v1/workouts', params);
    return { success: true, data: response.data };
  } catch (error) {
    if (error.status === 429) {
      return { success: false, error: 'Rate limit exceeded. Please try again later.' };
    }
    if (error.status === 400) {
      return { success: false, error: 'Invalid workout parameters. Please check your inputs.' };
    }
    return { success: false, error: 'Failed to generate workout. Please try again.' };
  }
};
```

### Progress Tracking with Real-time Updates

#### Progress Operations
```typescript
// Log workout completion
POST /v1/progress/check-in
Request: {
  workoutCompleted: boolean,
  difficulty: number,
  satisfaction: number,
  bodyMetrics: { weight?: number, bodyFat?: number }
}

// Get analytics
GET /v1/analytics/overview?timeframe=week
Response: {
  workoutConsistency: number,
  strengthProgress: number,
  weeklyGoals: GoalProgress[]
}

// Get detailed insights
GET /v1/analytics/ai/insights?timeframe=month
Response: {
  insights: AIInsight[],
  patterns: Pattern[],
  recommendations: string[]
}
```

#### Real-time Updates Pattern
```typescript
const useProgressTracking = () => {
  const [metrics, setMetrics] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateProgress = async (data: ProgressUpdate) => {
    setIsUpdating(true);
    const result = await apiClient.post('/v1/progress/check-in', data);
    
    // Trigger immediate analytics refresh
    const updatedMetrics = await apiClient.get('/v1/analytics/overview');
    setMetrics(updatedMetrics.data);
    setIsUpdating(false);
  };

  return { metrics, updateProgress, isUpdating };
};
```

---

## 2. Frontend Integration Patterns

### TypeScript Interface Examples

#### API Response Types
```typescript
// Base API response structure
interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  errors?: ValidationError[];
}

// Workout plan response
interface WorkoutPlanResponse extends ApiResponse<WorkoutPlan> {
  data: {
    planId: string;
    planName: string;
    exercises: Exercise[];
    researchInsights: string[];
    reasoning: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedDuration: number;
  };
}

// Profile response
interface ProfileResponse extends ApiResponse<UserProfile> {
  data: {
    id: string;
    height: number;
    weight: number;
    age: number;
    goals: string[];
    preferences: ProfilePreferences;
    unitPreference: 'metric' | 'imperial';
  };
}
```

#### Request Types
```typescript
// Workout generation request
interface WorkoutGenerationRequest {
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  goals: string[];
  equipment: string[];
  restrictions: string[];
  exerciseTypes: string[];
  workoutFrequency: string;
  workoutDuration?: number;
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
}

// Profile update request
interface ProfileUpdateRequest {
  height?: number | { feet: number; inches: number };
  weight?: number;
  age?: number;
  gender?: string;
  goals?: string[];
  preferences?: Partial<ProfilePreferences>;
}
```

### Error Handling per Endpoint Type

#### Authentication Errors
```typescript
const handleAuthError = (error: ApiError) => {
  switch (error.status) {
    case 401:
      // Invalid credentials or expired token
      logout();
      router.push('/login');
      toast.error('Please log in again');
      break;
    case 429:
      // Rate limited
      toast.error('Too many login attempts. Please try again later.');
      break;
    case 400:
      // Validation error
      setFieldErrors(error.errors);
      break;
    default:
      toast.error('Authentication failed. Please try again.');
  }
};
```

#### Workout Generation Errors
```typescript
const handleWorkoutGenerationError = (error: ApiError) => {
  switch (error.status) {
    case 429:
      // Rate limited - show retry timer
      setRetryAfter(error.retryAfter || 3600);
      toast.error('Workout generation limit reached. Try again in 1 hour.');
      break;
    case 400:
      // Invalid parameters
      setFormErrors(error.errors);
      toast.error('Please check your workout preferences');
      break;
    case 503:
      // AI service unavailable
      setShowFallbackOptions(true);
      toast.error('AI service temporarily unavailable. Showing saved plans.');
      break;
    default:
      toast.error('Failed to generate workout. Please try again.');
  }
};
```

#### Progress Tracking Errors
```typescript
const handleProgressError = (error: ApiError, operation: string) => {
  switch (operation) {
    case 'check-in':
      // Allow offline storage for check-ins
      storeOfflineCheckIn(lastCheckInData);
      toast.warning('Saved offline. Will sync when connected.');
      break;
    case 'analytics':
      // Show cached data if available
      if (cachedAnalytics) {
        setAnalytics(cachedAnalytics);
        toast.info('Showing cached analytics data');
      }
      break;
    default:
      toast.error(`Failed to ${operation}. Please try again.`);
  }
};
```

### Loading State Management

#### Global Loading Pattern
```typescript
interface LoadingState {
  isLoading: boolean;
  operation?: string;
  progress?: number;
}

const useLoadingState = () => {
  const [loading, setLoading] = useState<LoadingState>({ isLoading: false });

  const setOperationLoading = (operation: string, progress?: number) => {
    setLoading({ isLoading: true, operation, progress });
  };

  const clearLoading = () => {
    setLoading({ isLoading: false });
  };

  return { loading, setOperationLoading, clearLoading };
};
```

#### Component-Level Loading
```typescript
const WorkoutGenerationForm = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  const generateWorkout = async (params: WorkoutGenerationRequest) => {
    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      // Simulate progress for AI generation
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const result = await apiClient.post('/v1/workouts', params);
      
      clearInterval(progressInterval);
      setGenerationProgress(100);
      
      return result;
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress(0);
      }, 500);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <Button disabled={isGenerating}>
        {isGenerating ? `Generating... ${generationProgress}%` : 'Generate Workout'}
      </Button>
    </form>
  );
};
```

### Optimistic Updates Implementation

#### Profile Updates
```typescript
const useOptimisticProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [optimisticProfile, setOptimisticProfile] = useState<UserProfile | null>(null);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    // Optimistic update
    const newProfile = { ...profile, ...updates };
    setOptimisticProfile(newProfile);

    try {
      const response = await apiClient.put('/v1/profile', updates);
      setProfile(response.data);
      setOptimisticProfile(null); // Clear optimistic state
    } catch (error) {
      // Revert optimistic update
      setOptimisticProfile(null);
      toast.error('Failed to update profile');
      throw error;
    }
  };

  return {
    profile: optimisticProfile || profile,
    updateProfile,
    isOptimistic: optimisticProfile !== null
  };
};
```

#### Workout Log Updates
```typescript
const useOptimisticWorkoutLogs = () => {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);

  const addWorkoutLog = async (logData: NewWorkoutLog) => {
    const optimisticLog = {
      ...logData,
      id: `temp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      isPending: true
    };

    // Add optimistically
    setLogs(prev => [optimisticLog, ...prev]);

    try {
      const response = await apiClient.post('/v1/workouts/log', logData);
      
      // Replace optimistic log with real data
      setLogs(prev => prev.map(log => 
        log.id === optimisticLog.id ? response.data : log
      ));
    } catch (error) {
      // Remove failed optimistic update
      setLogs(prev => prev.filter(log => log.id !== optimisticLog.id));
      toast.error('Failed to save workout log');
    }
  };

  return { logs, addWorkoutLog };
};
```

---

## 3. Common Use Cases

### Component-Specific API Usage

#### Dashboard Component
```typescript
const Dashboard = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [analyticsRes, workoutsRes] = await Promise.all([
          apiClient.get('/v1/analytics/overview?timeframe=week'),
          apiClient.get('/v1/workouts/log?limit=5')
        ]);

        setAnalytics(analyticsRes.data);
        setRecentWorkouts(workoutsRes.data);
      } catch (error) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  return (
    <div className="dashboard">
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <AnalyticsOverview data={analytics} />
          <RecentWorkouts workouts={recentWorkouts} />
        </>
      )}
    </div>
  );
};
```

#### Workout Plan Generator Component
```typescript
const WorkoutPlanGenerator = () => {
  const { profile } = useProfile();
  const [generationParams, setGenerationParams] = useState<WorkoutGenerationRequest>({
    fitnessLevel: profile?.experienceLevel || 'beginner',
    goals: profile?.goals || [],
    equipment: profile?.equipment || [],
    restrictions: profile?.medicalConditions || [],
    exerciseTypes: profile?.preferredExerciseTypes || [],
    workoutFrequency: profile?.workoutFrequency || '3x per week'
  });

  const [generatedPlan, setGeneratedPlan] = useState<WorkoutPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePlan = async () => {
    setIsGenerating(true);
    try {
      const response = await apiClient.post('/v1/workouts', generationParams);
      setGeneratedPlan(response.data);
      
      // Track analytics event
      track('workout_plan_generated', {
        fitnessLevel: generationParams.fitnessLevel,
        goalsCount: generationParams.goals.length,
        equipmentCount: generationParams.equipment.length
      });
    } catch (error) {
      handleWorkoutGenerationError(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="workout-generator">
      <WorkoutPreferencesForm 
        params={generationParams}
        onChange={setGenerationParams}
      />
      <Button onClick={generatePlan} disabled={isGenerating}>
        {isGenerating ? 'Generating...' : 'Generate Workout Plan'}
      </Button>
      {generatedPlan && (
        <WorkoutPlanDisplay plan={generatedPlan} />
      )}
    </div>
  );
};
```

#### Progress Tracking Component
```typescript
const ProgressTracker = () => {
  const [checkInData, setCheckInData] = useState<CheckInData>({
    workoutCompleted: false,
    difficulty: 5,
    satisfaction: 5,
    bodyMetrics: {},
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitCheckIn = async () => {
    setIsSubmitting(true);
    try {
      await apiClient.post('/v1/progress/check-in', checkInData);
      
      // Refresh analytics data
      const analyticsResponse = await apiClient.get('/v1/analytics/overview');
      updateAnalytics(analyticsResponse.data);
      
      toast.success('Progress logged successfully!');
      resetForm();
    } catch (error) {
      handleProgressError(error, 'check-in');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CheckInForm data={checkInData} onChange={setCheckInData} />
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Log Progress'}
      </Button>
    </form>
  );
};
```

### State Synchronization Patterns

#### Cross-Component State Updates
```typescript
// Global state context for workout plans
const WorkoutContext = createContext(null);

export const WorkoutProvider = ({ children }) => {
  const [plans, setPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);

  const addPlan = (newPlan: WorkoutPlan) => {
    setPlans(prev => [newPlan, ...prev]);
    setActivePlan(newPlan);
  };

  const updatePlan = async (planId: string, updates: Partial<WorkoutPlan>) => {
    try {
      const response = await apiClient.put(`/v1/workouts/${planId}`, updates);
      
      setPlans(prev => prev.map(plan => 
        plan.id === planId ? response.data : plan
      ));
      
      if (activePlan?.id === planId) {
        setActivePlan(response.data);
      }
    } catch (error) {
      toast.error('Failed to update workout plan');
    }
  };

  return (
    <WorkoutContext.Provider value={{ plans, activePlan, addPlan, updatePlan }}>
      {children}
    </WorkoutContext.Provider>
  );
};
```

#### Real-time Data Synchronization
```typescript
const useRealtimeSync = (endpoint: string, dependencies: any[] = []) => {
  const [data, setData] = useState(null);
  const [lastSync, setLastSync] = useState(Date.now());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get(endpoint);
        setData(response.data);
        setLastSync(Date.now());
      } catch (error) {
        console.error('Sync failed:', error);
      }
    };

    fetchData();

    // Sync every 30 seconds for analytics data
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, dependencies);

  const forcSync = () => {
    fetchData();
  };

  return { data, lastSync, forceSync };
};
```

### Error Boundary Integration

#### API Error Boundary
```typescript
class ApiErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    if (error.name === 'ApiError') {
      return { hasError: true, error };
    }
    return null;
  }

  componentDidCatch(error, errorInfo) {
    if (error.name === 'ApiError') {
      // Log API errors to monitoring service
      logError('API_ERROR', {
        message: error.message,
        status: error.status,
        endpoint: error.endpoint,
        errorInfo
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>{this.state.error.message}</p>
          <Button onClick={() => this.setState({ hasError: false })}>
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Performance Optimization Examples

#### Data Caching Strategy
```typescript
const apiCache = new Map();

const cachedApiCall = async (endpoint: string, options = {}) => {
  const cacheKey = `${endpoint}-${JSON.stringify(options)}`;
  
  // Check cache first
  if (apiCache.has(cacheKey)) {
    const cached = apiCache.get(cacheKey);
    const isExpired = Date.now() - cached.timestamp > 300000; // 5 minutes
    
    if (!isExpired) {
      return cached.data;
    }
  }

  // Fetch fresh data
  const response = await apiClient.get(endpoint, options);
  
  // Cache the response
  apiCache.set(cacheKey, {
    data: response.data,
    timestamp: Date.now()
  });

  return response.data;
};
```

#### Request Debouncing
```typescript
const useDebounceApi = (apiCall: Function, delay: number = 300) => {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const debouncedCall = useMemo(
    () => debounce(async (...args) => {
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await apiCall(...args);
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    }, delay),
    [apiCall, delay]
  );

  return { call: debouncedCall, isLoading, data, error };
};
```

#### Pagination with Infinite Scroll
```typescript
const useInfiniteWorkoutLogs = () => {
  const [logs, setLogs] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);

  const loadMore = async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const response = await apiClient.get(`/v1/workouts/log?page=${page}&limit=20`);
      
      setLogs(prev => [...prev, ...response.data.logs]);
      setHasMore(response.data.hasMore);
      setPage(prev => prev + 1);
    } catch (error) {
      toast.error('Failed to load more logs');
    } finally {
      setIsLoading(false);
    }
  };

  return { logs, loadMore, isLoading, hasMore };
};
```

---

## 4. Authentication Flow Examples

### JWT Token Handling

#### Token Storage and Management
```typescript
class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'trAIner_access_token';
  private static readonly REFRESH_TOKEN_KEY = 'trAIner_refresh_token';

  static setTokens(accessToken: string, refreshToken?: string) {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  static getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static clearTokens() {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
}
```

#### Automatic Token Refresh
```typescript
class ApiClient {
  private isRefreshing = false;
  private failedQueue: Array<{ resolve: Function; reject: Function }> = [];

  async request(config: RequestConfig) {
    try {
      return await this.makeRequest(config);
    } catch (error) {
      if (error.status === 401 && !config._retry) {
        return this.handleTokenRefresh(config);
      }
      throw error;
    }
  }

  private async handleTokenRefresh(originalConfig: RequestConfig) {
    if (this.isRefreshing) {
      // Queue the request while refresh is in progress
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      const refreshToken = TokenManager.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch('/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const { accessToken, refreshToken: newRefreshToken } = await response.json();
      
      TokenManager.setTokens(accessToken, newRefreshToken);

      // Process queued requests
      this.failedQueue.forEach(({ resolve }) => {
        resolve(this.makeRequest(originalConfig));
      });

      return this.makeRequest(originalConfig);
    } catch (error) {
      // Clear tokens and redirect to login
      TokenManager.clearTokens();
      window.location.href = '/login';
      
      this.failedQueue.forEach(({ reject }) => reject(error));
      throw error;
    } finally {
      this.isRefreshing = false;
      this.failedQueue = [];
    }
  }
}
```

### Refresh Token Patterns

#### Proactive Token Refresh
```typescript
const useTokenRefresh = () => {
  useEffect(() => {
    const checkAndRefreshToken = async () => {
      const accessToken = TokenManager.getAccessToken();
      if (!accessToken) return;

      // Refresh token if it expires within 5 minutes
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const timeUntilExpiry = payload.exp * 1000 - Date.now();
      
      if (timeUntilExpiry < 300000) { // 5 minutes
        try {
          await apiClient.post('/v1/auth/refresh', {
            refreshToken: TokenManager.getRefreshToken()
          });
        } catch (error) {
          // Redirect to login if refresh fails
          logout();
        }
      }
    };

    // Check every minute
    const interval = setInterval(checkAndRefreshToken, 60000);
    return () => clearInterval(interval);
  }, []);
};
```

### Protected Route Implementation

#### Route Guard Component
```typescript
const ProtectedRoute = ({ children, requireProfile = false }) => {
  const { user, isLoading } = useAuth();
  const { profile } = useProfile();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
        return;
      }

      if (requireProfile && !profile) {
        router.push('/profile/setup');
        return;
      }
    }
  }, [user, profile, isLoading, requireProfile]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  if (requireProfile && !profile) {
    return null;
  }

  return <>{children}</>;
};

// Usage in Next.js pages
const WorkoutPage = () => (
  <ProtectedRoute requireProfile>
    <WorkoutPlanGenerator />
  </ProtectedRoute>
);
```

#### Route-Level Authentication
```typescript
// HOC for page-level authentication
export const withAuth = (WrappedComponent: React.ComponentType, options = {}) => {
  return function AuthenticatedComponent(props: any) {
    const { user, isLoading } = useAuth();
    const { profile } = useProfile();
    
    if (isLoading) {
      return <PageSkeleton />;
    }

    if (!user) {
      return <LoginRedirect />;
    }

    if (options.requireProfile && !profile) {
      return <ProfileSetupRedirect />;
    }

    return <WrappedComponent {...props} />;
  };
};

// Usage
export default withAuth(DashboardPage, { requireProfile: true });
```

### Session Management

#### Session State Management
```typescript
const useSession = () => {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeSession = async () => {
      const token = TokenManager.getAccessToken();
      
      if (token && !TokenManager.isTokenExpired(token)) {
        try {
          const response = await apiClient.get('/v1/auth/me');
          setSession({
            user: response.data.user,
            token,
            isAuthenticated: true
          });
        } catch (error) {
          TokenManager.clearTokens();
          setSession(null);
        }
      }
      
      setIsLoading(false);
    };

    initializeSession();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const response = await apiClient.post('/v1/auth/login', credentials);
    const { userId, jwtToken, refreshToken } = response.data;
    
    TokenManager.setTokens(jwtToken, refreshToken);
    
    setSession({
      user: { id: userId },
      token: jwtToken,
      isAuthenticated: true
    });
  };

  const logout = () => {
    TokenManager.clearTokens();
    setSession(null);
  };

  return { session, login, logout, isLoading };
};
```

#### Session Persistence
```typescript
const SessionProvider = ({ children }) => {
  const [session, setSession] = useState(null);

  // Persist session state to localStorage
  useEffect(() => {
    if (session) {
      localStorage.setItem('trAIner_session', JSON.stringify({
        userId: session.user.id,
        lastActivity: Date.now()
      }));
    } else {
      localStorage.removeItem('trAIner_session');
    }
  }, [session]);

  // Check for session inactivity
  useEffect(() => {
    const checkInactivity = () => {
      const stored = localStorage.getItem('trAIner_session');
      if (stored) {
        const { lastActivity } = JSON.parse(stored);
        const inactiveTime = Date.now() - lastActivity;
        
        // Log out after 24 hours of inactivity
        if (inactiveTime > 24 * 60 * 60 * 1000) {
          logout();
        }
      }
    };

    const interval = setInterval(checkInactivity, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <SessionContext.Provider value={{ session, setSession }}>
      {children}
    </SessionContext.Provider>
  );
};
```

---

## Cross-References

- **Complete API Documentation**: [OpenAPI Specification](../../openapi.yaml)
- **Type Definitions**: [TypeScript Reference](./type-definitions.md)
- **Feature Guides**: [Frontend Integration Guides](../02-feature-guides/)
- **Error Handling**: [Troubleshooting Reference](./troubleshooting.md)

---

## Maintenance Notes

This document is automatically synchronized with the OpenAPI specification. When adding new endpoints or modifying existing ones:

1. Update the OpenAPI specification first
2. Review this document for frontend-specific patterns
3. Update examples to match current implementation
4. Test all code examples in the development environment

### CI/CD Pipeline Integration

For detailed CI/CD setup and automation workflows, see [TypeScript Reference - CI/CD Integration](./type-definitions.md#detailed-cicd-pipeline-setup-phase-4).

**Auto-sync triggers:**
- OpenAPI specification changes (`docs/openapi.yaml`)
- Backend route updates (`backend/routes/`)
- Frontend usage pattern updates

**Last Updated**: Auto-generated from OpenAPI spec
**Next Review**: Triggered by OpenAPI changes 