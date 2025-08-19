# Async State Patterns

## Table of Contents
- [Overview](#overview)
- [Loading State Management](#loading-state-management)
- [Error Handling and Recovery](#error-handling-and-recovery)
- [API Integration Patterns](#api-integration-patterns)
- [Optimistic Updates](#optimistic-updates)
- [Real-time State Updates](#real-time-state-updates)
- [Progress Tracking](#progress-tracking)
- [Request Queuing and Cancellation](#request-queuing-and-cancellation)
- [Retry Strategies](#retry-strategies)
- [Caching and Background Sync](#caching-and-background-sync)
- [Performance Optimization](#performance-optimization)

## Overview

Async state management in trAIner handles complex asynchronous operations including AI workout generation, real-time analytics, data synchronization, and progress tracking. The patterns prioritize user experience through optimistic updates, comprehensive error handling, and intelligent retry strategies.

### Core Principles
- **Immediate Feedback**: Show loading states instantly
- **Graceful Degradation**: Continue functioning with cached data when offline
- **Progressive Enhancement**: Add real-time features when available
- **Error Recovery**: Automatic retry with exponential backoff
- **Performance First**: Cancel unnecessary requests, debounce inputs

## Loading State Management

### 1. Granular Loading States
Track loading states for individual operations rather than global loading:

```typescript
interface AsyncOperationState<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
  lastFetch: Date | null
  isStale: boolean
}

const useAsyncOperation = <T,>(key: string) => {
  const [state, setState] = useState<AsyncOperationState<T>>({
    data: null,
    isLoading: false,
    error: null,
    lastFetch: null,
    isStale: false
  })
  
  const execute = useCallback(async (operation: () => Promise<T>) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const data = await operation()
      setState({
        data,
        isLoading: false,
        error: null,
        lastFetch: new Date(),
        isStale: false
      })
      return data
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error as Error
      }))
      throw error
    }
  }, [])
  
  return { ...state, execute }
}
```

### 2. Compound Loading States
For operations with multiple phases:

```typescript
type GenerationPhase = 
  | 'idle'
  | 'researching'
  | 'generating'
  | 'adjusting'
  | 'finalizing'
  | 'complete'
  | 'error'

interface WorkoutGenerationState {
  phase: GenerationPhase
  progress: number
  currentAgent: string | null
  estimatedTimeRemaining: number | null
  messages: AgentMessage[]
}

const useWorkoutGeneration = () => {
  const [state, setState] = useState<WorkoutGenerationState>({
    phase: 'idle',
    progress: 0,
    currentAgent: null,
    estimatedTimeRemaining: null,
    messages: []
  })
  
  const updatePhase = (phase: GenerationPhase, progress: number) => {
    setState(prev => ({
      ...prev,
      phase,
      progress,
      estimatedTimeRemaining: calculateETA(phase, progress)
    }))
  }
  
  return { state, updatePhase }
}
```

### 3. Loading State UI Patterns
```typescript
// Skeleton Loading
const WorkoutPlanSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-3/4 mb-4" />
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded" />
      ))}
    </div>
  </div>
)

// Progress Indicator
const GenerationProgress = ({ phase, progress }: WorkoutGenerationState) => (
  <div className="space-y-2">
    <div className="flex justify-between text-sm">
      <span>{getPhaseLabel(phase)}</span>
      <span>{progress}%</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
)
```

## Error Handling and Recovery

### 1. Error Classification
```typescript
enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  RATE_LIMIT = 'RATE_LIMIT',
  AUTH = 'AUTH',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

class AppError extends Error {
  constructor(
    message: string,
    public type: ErrorType,
    public retryable: boolean,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
  }
}

const classifyError = (error: any): AppError => {
  if (!navigator.onLine) {
    return new AppError('No internet connection', ErrorType.NETWORK, true)
  }
  
  if (error.status === 429) {
    return new AppError('Rate limit exceeded', ErrorType.RATE_LIMIT, true, {
      retryAfter: error.headers?.['retry-after']
    })
  }
  
  if (error.status === 401) {
    return new AppError('Authentication required', ErrorType.AUTH, false)
  }
  
  if (error.status >= 400 && error.status < 500) {
    return new AppError('Validation error', ErrorType.VALIDATION, false, error.errors)
  }
  
  if (error.status >= 500) {
    return new AppError('Server error', ErrorType.SERVER, true)
  }
  
  return new AppError('Unknown error', ErrorType.UNKNOWN, true)
}
```

### 2. Error Recovery Patterns
```typescript
const useErrorRecovery = () => {
  const [errors, setErrors] = useState<Map<string, AppError>>(new Map())
  
  const handleError = useCallback((key: string, error: any) => {
    const appError = classifyError(error)
    setErrors(prev => new Map(prev).set(key, appError))
    
    if (appError.retryable) {
      scheduleRetry(key, appError)
    }
    
    return appError
  }, [])
  
  const clearError = useCallback((key: string) => {
    setErrors(prev => {
      const next = new Map(prev)
      next.delete(key)
      return next
    })
  }, [])
  
  const getError = useCallback((key: string) => errors.get(key), [errors])
  
  return { handleError, clearError, getError, hasErrors: errors.size > 0 }
}
```

### 3. Error Boundary Integration
```typescript
class AsyncErrorBoundary extends React.Component<
  { fallback: React.ComponentType<{ error: Error, retry: () => void }> },
  { hasError: boolean, error: Error | null }
> {
  state = { hasError: false, error: null }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error reporting service
    console.error('Async operation failed:', error, errorInfo)
  }
  
  retry = () => {
    this.setState({ hasError: false, error: null })
  }
  
  render() {
    if (this.state.hasError && this.state.error) {
      const Fallback = this.props.fallback
      return <Fallback error={this.state.error} retry={this.retry} />
    }
    
    return this.props.children
  }
}
```

## API Integration Patterns

### 1. API Client with Interceptors
```typescript
class APIClient {
  private baseURL: string
  private interceptors: {
    request: ((config: RequestConfig) => RequestConfig)[]
    response: ((response: Response) => Response)[]
    error: ((error: any) => Promise<any>)[]
  }
  
  constructor(baseURL: string) {
    this.baseURL = baseURL
    this.interceptors = {
      request: [],
      response: [],
      error: []
    }
    
    this.setupDefaultInterceptors()
  }
  
  private setupDefaultInterceptors() {
    // Add auth token
    this.interceptors.request.push((config) => {
      const token = localStorage.getItem('jwtToken')
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`
        }
      }
      return config
    })
    
    // Handle token refresh
    this.interceptors.error.push(async (error) => {
      if (error.status === 401 && error.config && !error.config._retry) {
        error.config._retry = true
        const newToken = await refreshToken()
        error.config.headers.Authorization = `Bearer ${newToken}`
        return this.request(error.config)
      }
      throw error
    })
  }
  
  async request<T>(config: RequestConfig): Promise<T> {
    // Apply request interceptors
    let finalConfig = config
    for (const interceptor of this.interceptors.request) {
      finalConfig = interceptor(finalConfig)
    }
    
    try {
      const response = await fetch(`${this.baseURL}${finalConfig.url}`, finalConfig)
      
      if (!response.ok) {
        throw await this.handleErrorResponse(response)
      }
      
      // Apply response interceptors
      let finalResponse = response
      for (const interceptor of this.interceptors.response) {
        finalResponse = interceptor(finalResponse)
      }
      
      return finalResponse.json()
    } catch (error) {
      // Apply error interceptors
      let finalError = error
      for (const interceptor of this.interceptors.error) {
        try {
          return await interceptor(finalError)
        } catch (e) {
          finalError = e
        }
      }
      throw finalError
    }
  }
}
```

### 2. Request Deduplication
```typescript
class RequestDeduplicator {
  private pending = new Map<string, Promise<any>>()
  
  async dedupe<T>(
    key: string,
    request: () => Promise<T>
  ): Promise<T> {
    // Check if request is already pending
    const existing = this.pending.get(key)
    if (existing) {
      return existing
    }
    
    // Create new request
    const promise = request().finally(() => {
      this.pending.delete(key)
    })
    
    this.pending.set(key, promise)
    return promise
  }
}

// Usage
const deduplicator = new RequestDeduplicator()

const fetchUserProfile = (userId: string) => 
  deduplicator.dedupe(
    `profile-${userId}`,
    () => api.get(`/users/${userId}/profile`)
  )
```

## Optimistic Updates

### 1. Optimistic State Updates
```typescript
interface OptimisticUpdate<T> {
  id: string
  timestamp: number
  operation: 'create' | 'update' | 'delete'
  optimisticData: T
  rollbackData?: T
  status: 'pending' | 'confirmed' | 'failed'
}

const useOptimisticUpdates = <T extends { id: string }>() => {
  const [items, setItems] = useState<T[]>([])
  const [updates, setUpdates] = useState<Map<string, OptimisticUpdate<T>>>(new Map())
  
  const optimisticCreate = useCallback(async (
    tempId: string,
    data: T,
    createFn: () => Promise<T>
  ) => {
    // Add optimistically
    setItems(prev => [...prev, { ...data, id: tempId }])
    setUpdates(prev => new Map(prev).set(tempId, {
      id: tempId,
      timestamp: Date.now(),
      operation: 'create',
      optimisticData: data,
      status: 'pending'
    }))
    
    try {
      const created = await createFn()
      
      // Replace temp with real data
      setItems(prev => prev.map(item => 
        item.id === tempId ? created : item
      ))
      setUpdates(prev => {
        const next = new Map(prev)
        next.delete(tempId)
        return next
      })
      
      return created
    } catch (error) {
      // Rollback on error
      setItems(prev => prev.filter(item => item.id !== tempId))
      setUpdates(prev => {
        const next = new Map(prev)
        const update = next.get(tempId)
        if (update) {
          update.status = 'failed'
        }
        return next
      })
      throw error
    }
  }, [])
  
  const optimisticUpdate = useCallback(async (
    id: string,
    updates: Partial<T>,
    updateFn: () => Promise<T>
  ) => {
    const original = items.find(item => item.id === id)
    if (!original) throw new Error('Item not found')
    
    // Apply update optimistically
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, ...updates } : item
    ))
    setUpdates(prev => new Map(prev).set(id, {
      id,
      timestamp: Date.now(),
      operation: 'update',
      optimisticData: { ...original, ...updates },
      rollbackData: original,
      status: 'pending'
    }))
    
    try {
      const updated = await updateFn()
      
      // Confirm with server data
      setItems(prev => prev.map(item =>
        item.id === id ? updated : item
      ))
      setUpdates(prev => {
        const next = new Map(prev)
        next.delete(id)
        return next
      })
      
      return updated
    } catch (error) {
      // Rollback to original
      setItems(prev => prev.map(item =>
        item.id === id ? original : item
      ))
      setUpdates(prev => {
        const next = new Map(prev)
        const update = next.get(id)
        if (update) {
          update.status = 'failed'
        }
        return next
      })
      throw error
    }
  }, [items])
  
  return {
    items,
    updates,
    optimisticCreate,
    optimisticUpdate,
    hasPendingUpdates: updates.size > 0
  }
}
```

### 2. Conflict Resolution
```typescript
interface ConflictResolver<T> {
  resolve: (local: T, server: T) => T
  shouldResolve: (local: T, server: T) => boolean
}

const timestampResolver: ConflictResolver<any> = {
  shouldResolve: (local, server) => 
    new Date(local.updatedAt) !== new Date(server.updatedAt),
  resolve: (local, server) => 
    new Date(local.updatedAt) > new Date(server.updatedAt) ? local : server
}

const mergeResolver: ConflictResolver<any> = {
  shouldResolve: () => true,
  resolve: (local, server) => ({
    ...server,
    ...local,
    updatedAt: new Date().toISOString()
  })
}
```

### 3. React 19+ Form Handling with useActionState
```typescript
import { useActionState } from 'react';

function ProfileUpdateForm({ userId }: { userId: string }) {
  const updateProfile = async (prevState: any, formData: FormData) => {
    try {
      const updates = {
        name: formData.get('name') as string,
        age: parseInt(formData.get('age') as string),
        goals: formData.getAll('goals') as string[]
      }
      
      const response = await api.put(`/users/${userId}`, updates)
      return { 
        success: true, 
        data: response.data,
        message: 'Profile updated successfully' 
      }
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        data: prevState?.data 
      }
    }
  }
  
  const [state, formAction, isPending] = useActionState(updateProfile, {
    success: false,
    data: null,
    error: null,
    message: null
  })
  
  return (
    <form action={formAction}>
      <input name="name" required />
      <input name="age" type="number" required />
      
      {state.error && <div className="error">{state.error}</div>}
      {state.message && <div className="success">{state.message}</div>}
      
      <button type="submit" disabled={isPending}>
        {isPending ? 'Updating...' : 'Update Profile'}
      </button>
    </form>
  )
}
```

### 4. Prioritizing Updates with useTransition
```typescript
import { useTransition, useState } from 'react';

function WorkoutSearch({ workouts }: { workouts: WorkoutPlan[] }) {
  const [query, setQuery] = useState('')
  const [filteredWorkouts, setFilteredWorkouts] = useState(workouts)
  const [isPending, startTransition] = useTransition()
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value) // Urgent: update input immediately
    
    // Non-urgent: filter large list in background
    startTransition(() => {
      const filtered = workouts.filter(workout => 
        workout.name.toLowerCase().includes(value.toLowerCase()) ||
        workout.description.toLowerCase().includes(value.toLowerCase()) ||
        workout.exercises.some(ex => 
          ex.name.toLowerCase().includes(value.toLowerCase())
        )
      )
      setFilteredWorkouts(filtered)
    })
  }
  
  return (
    <div>
      <input 
        value={query} 
        onChange={handleSearch}
        placeholder="Search workouts..."
      />
      
      {isPending && <div className="pending">Updating results...</div>}
      
      <div className={isPending ? 'opacity-50' : ''}>
        {filteredWorkouts.map(workout => (
          <WorkoutCard key={workout.id} workout={workout} />
        ))}
      </div>
    </div>
  )
}
```

These React 19+ patterns provide:
- **useActionState**: Simplifies form submission handling with built-in pending states and error management
- **useTransition**: Allows marking state updates as non-urgent, keeping the UI responsive during expensive operations

## Real-time State Updates

### 1. WebSocket Integration
```typescript
class RealtimeConnection {
  private ws: WebSocket | null = null
  private listeners = new Map<string, Set<(data: any) => void>>()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  
  constructor(private url: string) {}
  
  connect(token: string) {
    if (this.ws?.readyState === WebSocket.OPEN) return
    
    this.ws = new WebSocket(`${this.url}?token=${token}`)
    
    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
      this.emit('connected', null)
    }
    
    this.ws.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data)
        this.emit(type, payload)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }
    
    this.ws.onclose = () => {
      this.emit('disconnected', null)
      this.handleReconnect(token)
    }
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      this.emit('error', error)
    }
  }
  
  private handleReconnect(token: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('reconnectFailed', null)
      return
    }
    
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    setTimeout(() => {
      console.log(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      this.connect(token)
    }, delay)
  }
  
  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
    
    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }
  
  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(callback => callback(data))
  }
  
  send(type: string, payload: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }))
    } else {
      console.warn('WebSocket not connected, queuing message')
      // Implement message queue if needed
    }
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

// React Hook
const useRealtime = () => {
  const [connection] = useState(() => new RealtimeConnection(WS_URL))
  const [isConnected, setIsConnected] = useState(false)
  const { token } = useAuth()
  
  useEffect(() => {
    if (token) {
      connection.connect(token)
      
      const unsubscribe = [
        connection.on('connected', () => setIsConnected(true)),
        connection.on('disconnected', () => setIsConnected(false))
      ]
      
      return () => {
        unsubscribe.forEach(fn => fn())
        connection.disconnect()
      }
    }
  }, [token, connection])
  
  return { connection, isConnected }
}
```

### 2. Real-time State Sync
```typescript
const useRealtimeSync = <T,>(
  channel: string,
  initialData: T
) => {
  const [data, setData] = useState<T>(initialData)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const { connection, isConnected } = useRealtime()
  
  useEffect(() => {
    if (!isConnected) return
    
    const unsubscribe = connection.on(channel, (update: Partial<T>) => {
      setData(prev => ({ ...prev, ...update }))
      setLastUpdate(new Date())
    })
    
    return unsubscribe
  }, [connection, isConnected, channel])
  
  const push = useCallback((update: Partial<T>) => {
    connection.send(`update:${channel}`, update)
    // Optimistic update
    setData(prev => ({ ...prev, ...update }))
  }, [connection, channel])
  
  return { data, push, lastUpdate, isConnected }
}
```

## Progress Tracking

### 1. Multi-phase Progress
```typescript
interface ProgressPhase {
  name: string
  weight: number
  progress: number
}

class ProgressTracker {
  private phases: Map<string, ProgressPhase> = new Map()
  private listeners: ((progress: number) => void)[] = []
  
  addPhase(name: string, weight: number) {
    this.phases.set(name, { name, weight, progress: 0 })
  }
  
  updatePhase(name: string, progress: number) {
    const phase = this.phases.get(name)
    if (!phase) return
    
    phase.progress = Math.min(100, Math.max(0, progress))
    this.notifyListeners()
  }
  
  private calculateOverallProgress(): number {
    const totalWeight = Array.from(this.phases.values())
      .reduce((sum, phase) => sum + phase.weight, 0)
    
    const weightedProgress = Array.from(this.phases.values())
      .reduce((sum, phase) => sum + (phase.progress * phase.weight), 0)
    
    return totalWeight > 0 ? weightedProgress / totalWeight : 0
  }
  
  onProgress(listener: (progress: number) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }
  
  private notifyListeners() {
    const progress = this.calculateOverallProgress()
    this.listeners.forEach(listener => listener(progress))
  }
}

// React Hook
const useProgressTracker = (phases: { name: string, weight: number }[]) => {
  const [tracker] = useState(() => {
    const t = new ProgressTracker()
    phases.forEach(phase => t.addPhase(phase.name, phase.weight))
    return t
  })
  
  const [progress, setProgress] = useState(0)
  
  useEffect(() => {
    return tracker.onProgress(setProgress)
  }, [tracker])
  
  return { tracker, progress }
}
```

### 2. Stream Processing Progress
```typescript
const useStreamProgress = <T,>() => {
  const [progress, setProgress] = useState({
    total: 0,
    processed: 0,
    percentage: 0,
    rate: 0,
    eta: null as number | null
  })
  
  const processStream = useCallback(async (
    stream: ReadableStream<T>,
    processor: (chunk: T) => Promise<void>,
    totalSize?: number
  ) => {
    const reader = stream.getReader()
    const startTime = Date.now()
    let processed = 0
    
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        await processor(value)
        processed++
        
        const elapsed = Date.now() - startTime
        const rate = processed / (elapsed / 1000)
        const percentage = totalSize ? (processed / totalSize) * 100 : 0
        const eta = totalSize && rate > 0 
          ? ((totalSize - processed) / rate) * 1000 
          : null
        
        setProgress({
          total: totalSize || 0,
          processed,
          percentage,
          rate,
          eta
        })
      }
    } finally {
      reader.releaseLock()
    }
  }, [])
  
  return { progress, processStream }
}
```

## Request Queuing and Cancellation

### 1. Request Queue Management
```typescript
class RequestQueue {
  private queue: Array<{
    id: string
    request: () => Promise<any>
    priority: number
    timestamp: number
  }> = []
  private active = new Map<string, AbortController>()
  private maxConcurrent = 3
  
  async add<T>(
    id: string,
    request: () => Promise<T>,
    priority = 0
  ): Promise<T> {
    // Cancel existing request with same ID
    this.cancel(id)
    
    return new Promise((resolve, reject) => {
      this.queue.push({
        id,
        request: async () => {
          try {
            const result = await request()
            resolve(result)
          } catch (error) {
            reject(error)
          }
        },
        priority,
        timestamp: Date.now()
      })
      
      this.queue.sort((a, b) => 
        b.priority - a.priority || a.timestamp - b.timestamp
      )
      
      this.processQueue()
    })
  }
  
  cancel(id: string) {
    const controller = this.active.get(id)
    if (controller) {
      controller.abort()
      this.active.delete(id)
    }
    
    this.queue = this.queue.filter(item => item.id !== id)
  }
  
  private async processQueue() {
    while (
      this.queue.length > 0 && 
      this.active.size < this.maxConcurrent
    ) {
      const item = this.queue.shift()!
      const controller = new AbortController()
      
      this.active.set(item.id, controller)
      
      item.request().finally(() => {
        this.active.delete(item.id)
        this.processQueue()
      })
    }
  }
}
```

### 2. Debounced Requests
```typescript
const useDebouncedRequest = <T,>(
  request: (...args: any[]) => Promise<T>,
  delay = 300
) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<T | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const execute = useCallback(async (...args: any[]) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // Set up new abort controller
    abortControllerRef.current = new AbortController()
    const { signal } = abortControllerRef.current
    
    return new Promise<T>((resolve, reject) => {
      timeoutRef.current = setTimeout(async () => {
        setLoading(true)
        setError(null)
        
        try {
          const result = await request(...args, { signal })
          if (!signal.aborted) {
            setData(result)
            resolve(result)
          }
        } catch (err) {
          if (!signal.aborted) {
            const error = err as Error
            setError(error)
            reject(error)
          }
        } finally {
          if (!signal.aborted) {
            setLoading(false)
          }
        }
      }, delay)
    })
  }, [request, delay])
  
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setLoading(false)
  }, [])
  
  useEffect(() => {
    return () => cancel()
  }, [cancel])
  
  return { execute, cancel, loading, error, data }
}
```

## Retry Strategies

### 1. Exponential Backoff
```typescript
interface RetryConfig {
  maxAttempts: number
  initialDelay: number
  maxDelay: number
  backoffFactor: number
  retryCondition?: (error: any, attempt: number) => boolean
}

const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  retryCondition: (error) => {
    const retryableStatuses = [408, 429, 500, 502, 503, 504]
    return retryableStatuses.includes(error.status) || !navigator.onLine
  }
}

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const options = { ...defaultRetryConfig, ...config }
  let lastError: any
  
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      if (
        attempt === options.maxAttempts ||
        !options.retryCondition?.(error, attempt)
      ) {
        throw error
      }
      
      const delay = Math.min(
        options.initialDelay * Math.pow(options.backoffFactor, attempt - 1),
        options.maxDelay
      )
      
      console.log(`Retry attempt ${attempt} after ${delay}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}
```

### 2. Circuit Breaker Pattern
```typescript
class CircuitBreaker {
  private failures = 0
  private lastFailureTime: number | null = null
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  
  constructor(
    private threshold = 5,
    private timeout = 60000
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime! > this.timeout) {
        this.state = 'half-open'
      } else {
        throw new Error('Circuit breaker is open')
      }
    }
    
    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }
  
  private onSuccess() {
    this.failures = 0
    this.state = 'closed'
  }
  
  private onFailure() {
    this.failures++
    this.lastFailureTime = Date.now()
    
    if (this.failures >= this.threshold) {
      this.state = 'open'
    }
  }
  
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    }
  }
}
```

## Caching and Background Sync

### 1. Smart Cache Management
```typescript
interface CacheEntry<T> {
  data: T
  timestamp: number
  etag?: string
  ttl: number
}

class SmartCache {
  private cache = new Map<string, CacheEntry<any>>()
  private listeners = new Map<string, Set<(data: any) => void>>()
  
  set<T>(
    key: string,
    data: T,
    options: { ttl?: number, etag?: string } = {}
  ) {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: options.ttl || 5 * 60 * 1000, // 5 minutes default
      etag: options.etag
    }
    
    this.cache.set(key, entry)
    this.notifyListeners(key, data)
    
    // Schedule cleanup
    setTimeout(() => {
      if (this.cache.get(key) === entry) {
        this.cache.delete(key)
      }
    }, entry.ttl)
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }
  
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { ttl?: number, forceFetch?: boolean }
  ): Promise<T> {
    if (!options?.forceFetch) {
      const cached = this.get<T>(key)
      if (cached !== null) return cached
    }
    
    const data = await fetcher()
    this.set(key, data, options)
    return data
  }
  
  invalidate(pattern: string | RegExp) {
    const keys = Array.from(this.cache.keys())
    const matcher = typeof pattern === 'string' 
      ? (key: string) => key.includes(pattern)
      : (key: string) => pattern.test(key)
    
    keys.filter(matcher).forEach(key => {
      this.cache.delete(key)
      this.notifyListeners(key, null)
    })
  }
  
  subscribe(key: string, listener: (data: any) => void) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set())
    }
    this.listeners.get(key)!.add(listener)
    
    // Immediately notify with current value
    const current = this.get(key)
    if (current !== null) {
      listener(current)
    }
    
    return () => {
      this.listeners.get(key)?.delete(listener)
    }
  }
  
  private notifyListeners(key: string, data: any) {
    this.listeners.get(key)?.forEach(listener => listener(data))
  }
}
```

### 2. Background Sync
```typescript
interface SyncTask {
  id: string
  type: 'create' | 'update' | 'delete'
  resource: string
  data: any
  timestamp: number
  attempts: number
}

class BackgroundSync {
  private queue: SyncTask[] = []
  private isOnline = navigator.onLine
  private isSyncing = false
  
  constructor() {
    this.loadQueue()
    this.setupEventListeners()
    this.startSync()
  }
  
  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.startSync()
    })
    
    window.addEventListener('offline', () => {
      this.isOnline = false
    })
  }
  
  async add(task: Omit<SyncTask, 'id' | 'timestamp' | 'attempts'>) {
    const syncTask: SyncTask = {
      ...task,
      id: generateId(),
      timestamp: Date.now(),
      attempts: 0
    }
    
    this.queue.push(syncTask)
    this.saveQueue()
    
    if (this.isOnline) {
      await this.startSync()
    }
  }
  
  private async startSync() {
    if (!this.isOnline || this.isSyncing || this.queue.length === 0) {
      return
    }
    
    this.isSyncing = true
    
    while (this.queue.length > 0 && this.isOnline) {
      const task = this.queue[0]
      
      try {
        await this.syncTask(task)
        this.queue.shift()
        this.saveQueue()
      } catch (error) {
        task.attempts++
        
        if (task.attempts >= 3) {
          // Move to dead letter queue
          this.queue.shift()
          this.handleFailedTask(task, error)
        } else {
          // Move to end of queue
          this.queue.push(this.queue.shift()!)
        }
        
        this.saveQueue()
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    this.isSyncing = false
  }
  
  private async syncTask(task: SyncTask) {
    const endpoint = `/${task.resource}${task.type === 'update' || task.type === 'delete' ? `/${task.data.id}` : ''}`
    const method = task.type === 'create' ? 'POST' : task.type === 'update' ? 'PUT' : 'DELETE'
    
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: task.type !== 'delete' ? JSON.stringify(task.data) : undefined
    })
    
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`)
    }
  }
  
  private loadQueue() {
    const saved = localStorage.getItem('syncQueue')
    if (saved) {
      this.queue = JSON.parse(saved)
    }
  }
  
  private saveQueue() {
    localStorage.setItem('syncQueue', JSON.stringify(this.queue))
  }
  
  private handleFailedTask(task: SyncTask, error: any) {
    console.error('Sync task failed permanently:', task, error)
    // Notify user or log to error service
  }
}
```

## Performance Optimization

### 1. Request Batching
```typescript
class RequestBatcher<T, R> {
  private batch: Array<{ key: T; resolve: (value: R) => void; reject: (error: any) => void }> = []
  private timeout: NodeJS.Timeout | null = null
  
  constructor(
    private batchProcessor: (keys: T[]) => Promise<Map<T, R>>,
    private maxBatchSize = 10,
    private batchDelay = 50
  ) {}
  
  async add(key: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.batch.push({ key, resolve, reject })
      
      if (this.batch.length >= this.maxBatchSize) {
        this.flush()
      } else {
        this.scheduleFlush()
      }
    })
  }
  
  private scheduleFlush() {
    if (this.timeout) return
    
    this.timeout = setTimeout(() => {
      this.flush()
    }, this.batchDelay)
  }
  
  private async flush() {
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }
    
    if (this.batch.length === 0) return
    
    const currentBatch = this.batch
    this.batch = []
    
    try {
      const keys = currentBatch.map(item => item.key)
      const results = await this.batchProcessor(keys)
      
      currentBatch.forEach(({ key, resolve, reject }) => {
        const result = results.get(key)
        if (result !== undefined) {
          resolve(result)
        } else {
          reject(new Error(`No result for key: ${key}`))
        }
      })
    } catch (error) {
      currentBatch.forEach(({ reject }) => reject(error))
    }
  }
}

// Usage
const userBatcher = new RequestBatcher<string, User>(
  async (userIds) => {
    const response = await api.post('/users/batch', { ids: userIds })
    return new Map(response.users.map(user => [user.id, user]))
  }
)

const getUser = (userId: string) => userBatcher.add(userId)
```

### 2. Lazy Loading and Suspense
```typescript
const LazyWorkoutPlan = lazy(() => import('./WorkoutPlan'))

const WorkoutPlanContainer = () => {
  const [shouldLoad, setShouldLoad] = useState(false)
  const observerRef = useRef<IntersectionObserver>()
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true)
          observerRef.current?.disconnect()
        }
      },
      { rootMargin: '100px' }
    )
    
    if (containerRef.current) {
      observerRef.current.observe(containerRef.current)
    }
    
    return () => observerRef.current?.disconnect()
  }, [])
  
  return (
    <div ref={containerRef}>
      {shouldLoad ? (
        <Suspense fallback={<WorkoutPlanSkeleton />}>
          <LazyWorkoutPlan />
        </Suspense>
      ) : (
        <WorkoutPlanSkeleton />
      )}
    </div>
  )
}
```

## Best Practices Summary

1. **Always show loading states**: Never leave users wondering
2. **Handle all error cases**: Network, validation, rate limits, auth
3. **Implement retry logic**: With exponential backoff for transient failures
4. **Use optimistic updates**: For better perceived performance
5. **Cache aggressively**: But invalidate intelligently
6. **Debounce user input**: Prevent unnecessary API calls
7. **Cancel obsolete requests**: Clean up when component unmounts
8. **Monitor performance**: Track API latencies and success rates
9. **Progressive enhancement**: Work offline when possible
10. **Test error scenarios**: Simulate failures in development 