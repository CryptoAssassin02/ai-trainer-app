# Frontend Caching Strategies

## Overview & Architecture

The trAIner AI Fitness App requires sophisticated caching strategies to deliver optimal performance across diverse network conditions and usage patterns. As an AI-powered fitness platform with real-time features, complex data synchronization, and offline capabilities, our caching approach must balance data freshness with performance while ensuring seamless user experiences.

### Caching Objectives

**Performance Goals**:
- **Initial Page Load**: < 2.5s (including cached resources)
- **Subsequent Navigation**: < 500ms (cached content)
- **Offline Availability**: Core features accessible without network
- **Data Synchronization**: < 200ms for cached API responses
- **Storage Efficiency**: < 50MB total cache size per user

### Multi-Layer Caching Architecture

**Layer 1: Browser HTTP Caching**
- Static assets (CSS, JS, images)
- Next.js page builds and chunks
- Font files and icons

**Layer 2: Service Worker Application Cache**
- Core application shell
- Critical API responses
- Offline fallback content

**Layer 3: Application State Caching**
- TanStack Query (React Query) for API data
- Redux/Zustand for application state
- IndexedDB for large datasets

**Layer 4: Database & CDN Caching**
- Supabase connection pooling
- CDN edge caching
- Database query result caching

---

## Browser HTTP Caching

### Static Asset Cache Headers

**Current Implementation Enhancement** (for next.config.js):

```javascript
const nextConfig = {
  // Enhanced static asset caching
  async headers() {
    return [
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable', // 1 year
          },
        ],
      },
      {
        source: '/icons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable', // 1 year
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable', // 1 year
          },
        ],
      },
      {
        source: '/_next/image',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400', // 1 day
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  
  // Enhanced image optimization caching
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'dummyimage.com',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
    dangerouslyAllowSVG: false,
  },
};
```

### Page-Level Cache Configuration

**Dynamic Cache Strategies by Route**:

```typescript
// app/dashboard/page.tsx
export const revalidate = 300; // 5 minutes
export const dynamic = 'force-dynamic';

// app/workouts/page.tsx  
export const revalidate = 60; // 1 minute

// app/profile/page.tsx
export const revalidate = false; // Static generation

// app/generate-plan/page.tsx
export const dynamic = 'force-dynamic'; // Always fresh for AI generation
```

### Resource Hints Optimization

**Enhanced Resource Hinting** (for app/layout.tsx):

```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* DNS and connection preloading */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        <link rel="dns-prefetch" href="//api.openai.com" />
        <link rel="dns-prefetch" href="//api.perplexity.ai" />
        
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        
        {/* Critical resource preloading */}
        <link
          rel="preload"
          href="/fonts/inter-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        
        {/* Prefetch likely navigation targets */}
        <link rel="prefetch" href="/dashboard" />
        <link rel="prefetch" href="/workouts" />
        <link rel="prefetch" href="/progress" />
        
        {/* Module preloading for critical chunks */}
        <link rel="modulepreload" href="/_next/static/chunks/pages/_app.js" />
      </head>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

## Service Worker Implementation

### Core Service Worker Architecture

**Service Worker Registration** (public/sw.js):

```javascript
// Service Worker for trAIner AI Fitness App
const CACHE_NAME = 'trainer-v1.2.0';
const RUNTIME_CACHE = 'trainer-runtime';

// Critical resources to cache immediately
const CRITICAL_RESOURCES = [
  '/',
  '/dashboard',
  '/offline',
  '/_next/static/css/app.css',
  '/_next/static/chunks/main.js',
  '/_next/static/chunks/webpack.js',
  '/fonts/inter-var.woff2',
  '/icons/sprite.svg'
];

// API endpoints to cache with stale-while-revalidate
const API_CACHE_PATTERNS = [
  /^\/api\/workouts$/,
  /^\/api\/profile$/,
  /^\/api\/exercises$/,
  /^\/api\/progress\/\w+$/
];

// Supabase endpoints to cache
const SUPABASE_CACHE_PATTERNS = [
  new RegExp(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/workout_logs`),
  new RegExp(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_profiles`),
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching critical resources');
      return cache.addAll(CRITICAL_RESOURCES);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle different request types with appropriate strategies
  if (request.method === 'GET') {
    if (url.pathname.startsWith('/_next/static/')) {
      // Cache-first for static assets
      event.respondWith(cacheFirstStrategy(request));
    } else if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname)) ||
               SUPABASE_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
      // Stale-while-revalidate for API calls
      event.respondWith(staleWhileRevalidateStrategy(request));
    } else if (url.pathname.startsWith('/')) {
      // Network-first for pages
      event.respondWith(networkFirstStrategy(request));
    }
  }
});

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Network failed for:', request.url);
    return new Response('Offline', { status: 503 });
  }
}

// Stale-while-revalidate for API responses
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });
  
  return cachedResponse || fetchPromise;
}

// Network-first for dynamic content
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(RUNTIME_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      return caches.match('/offline');
    }
    
    return new Response('Offline', { status: 503 });
  }
}
```

### Service Worker Registration

**Client-Side Registration** (utils/service-worker.ts):

```typescript
// Service worker registration and management
export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager;
  private registration: ServiceWorkerRegistration | null = null;
  private updateAvailable = false;

  static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager();
    }
    return ServiceWorkerManager.instance;
  }

  async register(): Promise<void> {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none'
        });

        console.log('Service Worker registered:', this.registration);

        // Check for updates
        this.registration.addEventListener('updatefound', () => {
          const newWorker = this.registration?.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.updateAvailable = true;
                this.notifyUpdateAvailable();
              }
            });
          }
        });

        // Check for updates every 10 minutes
        setInterval(() => {
          this.registration?.update();
        }, 10 * 60 * 1000);

      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  async updateServiceWorker(): Promise<void> {
    if (this.registration && this.updateAvailable) {
      const newWorker = this.registration.waiting;
      if (newWorker) {
        newWorker.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    }
  }

  private notifyUpdateAvailable(): void {
    // Show update notification to user
    const event = new CustomEvent('sw-update-available');
    window.dispatchEvent(event);
  }

  async clearCache(): Promise<void> {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
  }
}

// React hook for service worker
export function useServiceWorker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const swManager = ServiceWorkerManager.getInstance();
    swManager.register();

    const handleUpdateAvailable = () => {
      setUpdateAvailable(true);
    };

    window.addEventListener('sw-update-available', handleUpdateAvailable);
    return () => window.removeEventListener('sw-update-available', handleUpdateAvailable);
  }, []);

  const updateApp = useCallback(async () => {
    const swManager = ServiceWorkerManager.getInstance();
    await swManager.updateServiceWorker();
  }, []);

  return { updateAvailable, updateApp };
}
```

### Background Sync for Offline Actions

**Background Sync Implementation**:

```javascript
// In service worker (sw.js)
self.addEventListener('sync', (event) => {
  if (event.tag === 'workout-sync') {
    event.waitUntil(syncWorkoutData());
  } else if (event.tag === 'progress-sync') {
    event.waitUntil(syncProgressData());
  }
});

async function syncWorkoutData() {
  try {
    const store = await openIndexedDB();
    const pendingWorkouts = await store.getAll('pending-workouts');
    
    for (const workout of pendingWorkouts) {
      const response = await fetch('/api/workouts/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workout.data)
      });
      
      if (response.ok) {
        await store.delete('pending-workouts', workout.id);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Client-side background sync trigger
export function scheduleBackgroundSync(type: string) {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then((registration) => {
      return registration.sync.register(type);
    });
  }
}
```

---

## State Management Caching

### TanStack Query Optimization

**Enhanced Query Client Configuration** (components/providers/index.tsx):

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Optimized QueryClient configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache configuration
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Background refetch configuration
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchInterval: false,
      
      // Network mode
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 2,
      networkMode: 'offlineFirst',
    },
  },
});

// Persistent cache configuration
if (typeof window !== 'undefined') {
  queryClient.setMutationDefaults(['workout-log'], {
    mutationFn: async (data: WorkoutLog) => {
      // Try online first, fallback to IndexedDB
      try {
        return await postWorkoutLog(data);
      } catch (error) {
        // Store for background sync
        await storeWorkoutForSync(data);
        throw error;
      }
    },
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}
```

### Query-Specific Caching Strategies

**Workout Data Caching**:

```typescript
// hooks/useWorkoutData.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Workout logs with long cache time
export function useWorkoutLogs(userId: string, filters?: WorkoutFilters) {
  return useQuery({
    queryKey: ['workout-logs', userId, filters],
    queryFn: () => fetchWorkoutLogs(userId, filters),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    enabled: Boolean(userId),
  });
}

// User profile with very long cache time
export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => fetchUserProfile(userId),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    enabled: Boolean(userId),
  });
}

// Exercise database with infinite cache time
export function useExerciseDatabase() {
  return useQuery({
    queryKey: ['exercise-database'],
    queryFn: fetchExerciseDatabase,
    staleTime: Infinity, // Never stale
    gcTime: Infinity, // Never garbage collected
  });
}

// Optimistic updates for workout logging
export function useLogWorkout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: logWorkout,
    onMutate: async (newWorkout) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['workout-logs'] });
      
      // Snapshot the previous value
      const previousWorkouts = queryClient.getQueryData(['workout-logs', newWorkout.userId]);
      
      // Optimistically update
      queryClient.setQueryData(['workout-logs', newWorkout.userId], (old: any) => {
        return [...(old || []), { ...newWorkout, id: `temp-${Date.now()}` }];
      });
      
      return { previousWorkouts };
    },
    onError: (err, newWorkout, context) => {
      // Rollback on error
      queryClient.setQueryData(['workout-logs', newWorkout.userId], context?.previousWorkouts);
    },
    onSuccess: (data, variables) => {
      // Update with real data
      queryClient.invalidateQueries({ queryKey: ['workout-logs', variables.userId] });
    },
  });
}
```

### IndexedDB for Large Data Storage

**IndexedDB Wrapper Implementation**:

```typescript
// utils/indexed-db.ts
export class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'TrainerAppDB';
  private readonly version = 1;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Workout logs store
        if (!db.objectStoreNames.contains('workout-logs')) {
          const workoutStore = db.createObjectStore('workout-logs', { keyPath: 'id' });
          workoutStore.createIndex('userId', 'userId', { unique: false });
          workoutStore.createIndex('date', 'date', { unique: false });
        }
        
        // Exercise database store
        if (!db.objectStoreNames.contains('exercises')) {
          const exerciseStore = db.createObjectStore('exercises', { keyPath: 'id' });
          exerciseStore.createIndex('muscleGroup', 'muscleGroup', { unique: false });
          exerciseStore.createIndex('equipment', 'equipment', { unique: false });
        }
        
        // Pending sync actions
        if (!db.objectStoreNames.contains('pending-sync')) {
          db.createObjectStore('pending-sync', { keyPath: 'id', autoIncrement: true });
        }
        
        // User profile cache
        if (!db.objectStoreNames.contains('user-profile')) {
          db.createObjectStore('user-profile', { keyPath: 'userId' });
        }
      };
    });
  }

  async storeWorkoutLogs(userId: string, workouts: WorkoutLog[]): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['workout-logs'], 'readwrite');
    const store = transaction.objectStore('workout-logs');
    
    for (const workout of workouts) {
      await store.put({ ...workout, userId, cachedAt: Date.now() });
    }
  }

  async getWorkoutLogs(userId: string, limit = 50): Promise<WorkoutLog[]> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['workout-logs'], 'readonly');
    const store = transaction.objectStore('workout-logs');
    const index = store.index('userId');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(userId);
      request.onsuccess = () => {
        const results = request.result
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, limit);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async storeForSync(action: string, data: any): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['pending-sync'], 'readwrite');
    const store = transaction.objectStore('pending-sync');
    
    await store.add({
      action,
      data,
      timestamp: Date.now(),
      retryCount: 0
    });
  }

  async getPendingSync(): Promise<any[]> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['pending-sync'], 'readonly');
    const store = transaction.objectStore('pending-sync');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearSync(id: number): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['pending-sync'], 'readwrite');
    const store = transaction.objectStore('pending-sync');
    await store.delete(id);
  }
}

// React hook for IndexedDB
export function useIndexedDB() {
  const [dbManager] = useState(() => new IndexedDBManager());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    dbManager.init().then(() => setIsReady(true));
  }, [dbManager]);

  return { dbManager, isReady };
}
```

---

## API Response Caching

### Supabase Query Optimization

**Connection Pooling and Caching** (enhancement for backend services):

```javascript
// backend/services/supabase-cache.js
class SupabaseCacheManager {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = {
      'user-profile': 60 * 60 * 1000, // 1 hour
      'exercise-database': 24 * 60 * 60 * 1000, // 24 hours
      'workout-logs': 5 * 60 * 1000, // 5 minutes
      'user-preferences': 30 * 60 * 1000, // 30 minutes
    };
  }

  generateCacheKey(table, filters = {}, userId = null) {
    const filterStr = Object.keys(filters)
      .sort()
      .map(key => `${key}:${filters[key]}`)
      .join('|');
    return `${table}:${userId || 'global'}:${filterStr}`;
  }

  async get(key, type) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const ttl = this.cacheTTL[type] || 5 * 60 * 1000;
    if (Date.now() - cached.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  set(key, data, type) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      type
    });

    // Cleanup old entries periodically
    if (this.cache.size > 1000) {
      this.cleanup();
    }
  }

  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      const ttl = this.cacheTTL[value.type] || 5 * 60 * 1000;
      if (now - value.timestamp > ttl) {
        this.cache.delete(key);
      }
    }
  }

  invalidate(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

const cacheManager = new SupabaseCacheManager();

// Enhanced workout service with caching
class CachedWorkoutService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  async getWorkoutLogs(userId, filters = {}) {
    const cacheKey = cacheManager.generateCacheKey('workout-logs', filters, userId);
    let cachedData = await cacheManager.get(cacheKey, 'workout-logs');
    
    if (cachedData) {
      return { data: cachedData, fromCache: true };
    }

    let query = this.supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.startDate) {
      query = query.gte('date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('date', filters.endDate);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    
    if (error) throw error;

    // Cache the result
    cacheManager.set(cacheKey, data, 'workout-logs');
    
    return { data, fromCache: false };
  }

  async logWorkout(userId, workoutData) {
    const { data, error } = await this.supabase
      .from('workout_logs')
      .insert({ ...workoutData, user_id: userId })
      .select()
      .single();

    if (error) throw error;

    // Invalidate related caches
    cacheManager.invalidate(`workout-logs:${userId}`);
    
    return data;
  }

  async getUserProfile(userId) {
    const cacheKey = cacheManager.generateCacheKey('user-profile', {}, userId);
    let cachedData = await cacheManager.get(cacheKey, 'user-profile');
    
    if (cachedData) {
      return { data: cachedData, fromCache: true };
    }

    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    // Cache the profile for 1 hour
    cacheManager.set(cacheKey, data, 'user-profile');
    
    return { data, fromCache: false };
  }
}

module.exports = { CachedWorkoutService, cacheManager };
```

### AI Response Caching

**OpenAI API Response Caching** (enhancement for backend services):

```javascript
// backend/services/ai-response-cache.js
const Redis = require('redis');

class AIResponseCache {
  constructor() {
    this.redis = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    this.isConnected = false;
    this.fallbackCache = new Map();
    this.init();
  }

  async init() {
    try {
      await this.redis.connect();
      this.isConnected = true;
      console.log('Redis connected for AI response caching');
    } catch (error) {
      console.warn('Redis connection failed, using in-memory fallback:', error.message);
      this.isConnected = false;
    }
  }

  generateCacheKey(prompt, model, temperature, maxTokens, userId) {
    const crypto = require('crypto');
    const content = `${prompt}:${model}:${temperature}:${maxTokens}:${userId}`;
    return `ai:${crypto.createHash('sha256').update(content).digest('hex')}`;
  }

  async get(key) {
    try {
      if (this.isConnected) {
        const cached = await this.redis.get(key);
        return cached ? JSON.parse(cached) : null;
      } else {
        const cached = this.fallbackCache.get(key);
        if (cached && Date.now() - cached.timestamp < 60 * 60 * 1000) { // 1 hour TTL
          return cached.data;
        }
        return null;
      }
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, data, ttlMinutes = 60) {
    try {
      if (this.isConnected) {
        await this.redis.setEx(key, ttlMinutes * 60, JSON.stringify(data));
      } else {
        this.fallbackCache.set(key, {
          data,
          timestamp: Date.now()
        });
        
        // Cleanup fallback cache if it gets too large
        if (this.fallbackCache.size > 500) {
          const entries = Array.from(this.fallbackCache.entries());
          const now = Date.now();
          entries.forEach(([k, v]) => {
            if (now - v.timestamp > 60 * 60 * 1000) {
              this.fallbackCache.delete(k);
            }
          });
        }
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async invalidatePattern(pattern) {
    try {
      if (this.isConnected) {
        const keys = await this.redis.keys(`*${pattern}*`);
        if (keys.length > 0) {
          await this.redis.del(keys);
        }
      } else {
        for (const key of this.fallbackCache.keys()) {
          if (key.includes(pattern)) {
            this.fallbackCache.delete(key);
          }
        }
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }
}

// Enhanced AI service with response caching
class CachedAIService {
  constructor(openaiClient) {
    this.openai = openaiClient;
    this.cache = new AIResponseCache();
    this.cacheTTL = {
      'workout-generation': 120, // 2 hours
      'exercise-research': 480, // 8 hours
      'plan-adjustment': 60, // 1 hour
      'nutrition-calculation': 240, // 4 hours
    };
  }

  async generateWorkoutPlan(userProfile, preferences, userId) {
    const prompt = this.buildWorkoutPrompt(userProfile, preferences);
    const cacheKey = this.cache.generateCacheKey(
      prompt, 
      'gpt-4', 
      0.7, 
      2000, 
      userId
    );

    // Check cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return { ...cached, fromCache: true };
    }

    // Generate new response
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a professional fitness trainer...' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const result = this.parseWorkoutResponse(response);
    
    // Cache the response
    await this.cache.set(cacheKey, result, this.cacheTTL['workout-generation']);
    
    return { ...result, fromCache: false };
  }

  async researchExercises(muscleGroups, equipment, fitnessLevel) {
    const prompt = this.buildResearchPrompt(muscleGroups, equipment, fitnessLevel);
    const cacheKey = this.cache.generateCacheKey(
      prompt,
      'gpt-3.5-turbo',
      0.3,
      1500,
      'research'
    );

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return { ...cached, fromCache: true };
    }

    // Generate research
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a fitness research assistant...' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1500
    });

    const result = this.parseResearchResponse(response);
    
    // Cache for 8 hours (research changes less frequently)
    await this.cache.set(cacheKey, result, this.cacheTTL['exercise-research']);
    
    return { ...result, fromCache: false };
  }

  buildWorkoutPrompt(userProfile, preferences) {
    return `Generate a workout plan for:
- Fitness Level: ${userProfile.fitnessLevel}
- Goals: ${preferences.goals.join(', ')}
- Equipment: ${preferences.equipment.join(', ')}
- Frequency: ${preferences.workoutFrequency}
- Time: ${preferences.workoutDuration} minutes`;
  }

  buildResearchPrompt(muscleGroups, equipment, fitnessLevel) {
    return `Research effective exercises for:
- Muscle Groups: ${muscleGroups.join(', ')}
- Equipment: ${equipment.join(', ')}
- Fitness Level: ${fitnessLevel}`;
  }

  parseWorkoutResponse(response) {
    // Parse and structure the AI response
    const content = response.choices[0].message.content;
    // Implementation details...
    return {
      exercises: [],
      reasoning: content,
      researchInsights: []
    };
  }

  parseResearchResponse(response) {
    // Parse research response
    const content = response.choices[0].message.content;
    // Implementation details...
    return {
      insights: [],
      sources: [],
      recommendations: []
    };
  }
}

module.exports = { CachedAIService, AIResponseCache };
```

---

## Database Query Optimization

### Supabase Connection Pooling

**Enhanced Connection Management** (backend/config/supabase.js enhancement):

```javascript
const { createClient } = require('@supabase/supabase-js');

class SupabaseConnectionManager {
  constructor() {
    this.connections = new Map();
    this.maxConnections = 20;
    this.connectionTTL = 60 * 60 * 1000; // 1 hour
    this.cleanupInterval = 5 * 60 * 1000; // 5 minutes
    
    // Start connection cleanup
    this.startCleanup();
  }

  getConnection(userId = 'default') {
    const existing = this.connections.get(userId);
    
    if (existing && Date.now() - existing.created < this.connectionTTL) {
      existing.lastUsed = Date.now();
      return existing.client;
    }

    // Create new connection
    if (this.connections.size >= this.maxConnections) {
      this.evictOldest();
    }

    const client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: {
          schema: 'public'
        }
      }
    );

    this.connections.set(userId, {
      client,
      created: Date.now(),
      lastUsed: Date.now()
    });

    return client;
  }

  evictOldest() {
    let oldest = null;
    let oldestTime = Date.now();

    for (const [userId, connection] of this.connections.entries()) {
      if (connection.lastUsed < oldestTime) {
        oldest = userId;
        oldestTime = connection.lastUsed;
      }
    }

    if (oldest) {
      this.connections.delete(oldest);
    }
  }

  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [userId, connection] of this.connections.entries()) {
        if (now - connection.lastUsed > this.connectionTTL) {
          this.connections.delete(userId);
        }
      }
    }, this.cleanupInterval);
  }

  closeAll() {
    this.connections.clear();
  }
}

const connectionManager = new SupabaseConnectionManager();

function getSupabaseClient(userId) {
  return connectionManager.getConnection(userId);
}

module.exports = { getSupabaseClient, connectionManager };
```

### Query Result Caching

**Database Query Cache Layer** (backend/services/query-cache.js):

```javascript
class DatabaseQueryCache {
  constructor() {
    this.cache = new Map();
    this.statistics = new Map();
    this.maxCacheSize = 1000;
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
    
    this.queryTTLs = {
      'user_profiles': 60 * 60 * 1000, // 1 hour
      'exercises': 24 * 60 * 60 * 1000, // 24 hours
      'workout_logs': 5 * 60 * 1000, // 5 minutes
      'workout_plans': 15 * 60 * 1000, // 15 minutes
      'user_preferences': 30 * 60 * 1000, // 30 minutes
    };
  }

  generateQueryKey(table, query, params = {}) {
    const crypto = require('crypto');
    const queryString = JSON.stringify({ table, query, params });
    return crypto.createHash('md5').update(queryString).digest('hex');
  }

  async get(queryKey, table) {
    const cached = this.cache.get(queryKey);
    if (!cached) {
      this.updateStats(queryKey, 'miss');
      return null;
    }

    const ttl = this.queryTTLs[table] || this.defaultTTL;
    if (Date.now() - cached.timestamp > ttl) {
      this.cache.delete(queryKey);
      this.updateStats(queryKey, 'expired');
      return null;
    }

    this.updateStats(queryKey, 'hit');
    return cached.data;
  }

  set(queryKey, data, table) {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLRU();
    }

    this.cache.set(queryKey, {
      data,
      timestamp: Date.now(),
      table,
      accessCount: 0
    });
  }

  invalidateTable(table) {
    const keysToDelete = [];
    for (const [key, value] of this.cache.entries()) {
      if (value.table === table) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  invalidateUser(userId) {
    const keysToDelete = [];
    for (const [key, value] of this.cache.entries()) {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  evictLRU() {
    let lruKey = null;
    let lruTime = Date.now();
    
    for (const [key, value] of this.cache.entries()) {
      if (value.timestamp < lruTime) {
        lruKey = key;
        lruTime = value.timestamp;
      }
    }
    
    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  updateStats(queryKey, type) {
    const stats = this.statistics.get(queryKey) || { hits: 0, misses: 0, expired: 0 };
    stats[type] = (stats[type] || 0) + 1;
    this.statistics.set(queryKey, stats);
  }

  getStatistics() {
    const totalQueries = this.statistics.size;
    let totalHits = 0;
    let totalMisses = 0;
    let totalExpired = 0;

    for (const stats of this.statistics.values()) {
      totalHits += stats.hits || 0;
      totalMisses += stats.misses || 0;
      totalExpired += stats.expired || 0;
    }

    const hitRate = totalQueries > 0 ? (totalHits / (totalHits + totalMisses)) * 100 : 0;

    return {
      totalQueries,
      totalHits,
      totalMisses,
      totalExpired,
      hitRate: Math.round(hitRate * 100) / 100,
      cacheSize: this.cache.size,
      maxCacheSize: this.maxCacheSize
    };
  }

  clear() {
    this.cache.clear();
    this.statistics.clear();
  }
}

const queryCache = new DatabaseQueryCache();

// Cached query wrapper
async function cachedQuery(supabaseClient, table, queryBuilder, params = {}) {
  const queryKey = queryCache.generateQueryKey(table, queryBuilder.toString(), params);
  
  // Check cache first
  const cached = await queryCache.get(queryKey, table);
  if (cached) {
    return { data: cached, error: null, fromCache: true };
  }

  // Execute query
  const { data, error } = await queryBuilder;
  
  if (!error && data) {
    // Cache the result
    queryCache.set(queryKey, data, table);
  }

  return { data, error, fromCache: false };
}

module.exports = { DatabaseQueryCache, queryCache, cachedQuery };
```

### Index Optimization Recommendations

**Database Index Strategy** (backend/supabase/migrations/add_performance_indexes.sql):

```sql
-- Performance indexes for workout logs
CREATE INDEX CONCURRENTLY idx_workout_logs_user_date 
ON workout_logs(user_id, date DESC);

CREATE INDEX CONCURRENTLY idx_workout_logs_created_at 
ON workout_logs(created_at DESC);

CREATE INDEX CONCURRENTLY idx_workout_logs_plan_id 
ON workout_logs(plan_id);

-- Performance indexes for workout plans
CREATE INDEX CONCURRENTLY idx_workout_plans_user_status 
ON workout_plans(user_id, status);

CREATE INDEX CONCURRENTLY idx_workout_plans_created_at 
ON workout_plans(created_at DESC);

-- Performance indexes for user profiles
CREATE INDEX CONCURRENTLY idx_user_profiles_updated_at 
ON user_profiles(updated_at DESC);

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY idx_workout_logs_complex 
ON workout_logs(user_id, date DESC, completed);

-- Partial indexes for active records
CREATE INDEX CONCURRENTLY idx_workout_plans_active 
ON workout_plans(user_id, created_at DESC) 
WHERE status = 'active';

-- GIN indexes for JSONB columns
CREATE INDEX CONCURRENTLY idx_workout_logs_exercises_gin 
ON workout_logs USING gin(exercises_completed);

CREATE INDEX CONCURRENTLY idx_workout_plans_exercises_gin 
ON workout_plans USING gin(plan_data);

-- Full-text search indexes
CREATE INDEX CONCURRENTLY idx_exercises_search 
ON exercises USING gin(to_tsvector('english', name || ' ' || description));
```

---

## Static Asset Caching & CDN

### CDN Configuration Strategy

**Cloudflare/Vercel Edge Caching Rules**:

```javascript
// vercel.json configuration for edge caching
{
  "headers": [
    {
      "source": "/fonts/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/icons/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/_next/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/_next/image(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=86400"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1",
      "headers": {
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    }
  ]
}
```

### Asset Optimization Pipeline

**Build-Time Asset Processing** (scripts/optimize-assets.js):

```javascript
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

class AssetOptimizer {
  constructor() {
    this.outputDir = path.join(process.cwd(), 'public/optimized');
    this.sourceDir = path.join(process.cwd(), 'public/assets');
  }

  async optimizeImages() {
    console.log('Optimizing images...');
    
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    const imageFiles = glob.sync(`${this.sourceDir}/**/*.{jpg,jpeg,png,gif}`);
    
    for (const filePath of imageFiles) {
      const relativePath = path.relative(this.sourceDir, filePath);
      const outputPath = path.join(this.outputDir, relativePath);
      const outputDir = path.dirname(outputPath);
      
      // Ensure output subdirectory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Generate multiple formats and sizes
      await this.generateImageVariants(filePath, outputPath);
    }
  }

  async generateImageVariants(inputPath, outputBasePath) {
    const ext = path.extname(outputBasePath);
    const baseName = outputBasePath.replace(ext, '');
    
    try {
      const image = sharp(inputPath);
      const metadata = await image.metadata();
      
      // Generate WebP variants
      await image
        .webp({ quality: 85 })
        .toFile(`${baseName}.webp`);
      
      // Generate AVIF variants (smaller file size)
      await image
        .avif({ quality: 75 })
        .toFile(`${baseName}.avif`);
      
      // Generate responsive sizes for large images
      if (metadata.width > 1200) {
        const sizes = [480, 768, 1024, 1200];
        
        for (const size of sizes) {
          await image
            .resize(size, null, { withoutEnlargement: true })
            .webp({ quality: 85 })
            .toFile(`${baseName}-${size}w.webp`);
            
          await image
            .resize(size, null, { withoutEnlargement: true })
            .avif({ quality: 75 })
            .toFile(`${baseName}-${size}w.avif`);
        }
      }
      
      console.log(`Optimized: ${path.basename(inputPath)}`);
      
    } catch (error) {
      console.error(`Error optimizing ${inputPath}:`, error.message);
    }
  }

  async generateSpriteSheet() {
    console.log('Generating icon sprite sheet...');
    
    const iconDir = path.join(process.cwd(), 'public/icons');
    const svgFiles = glob.sync(`${iconDir}/*.svg`);
    
    let spriteContent = `<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">`;
    
    for (const svgFile of svgFiles) {
      const fileName = path.basename(svgFile, '.svg');
      const content = fs.readFileSync(svgFile, 'utf8');
      
      // Extract the path content from SVG
      const pathMatch = content.match(/<path[^>]*d="([^"]*)"[^>]*>/);
      if (pathMatch) {
        spriteContent += `
          <symbol id="icon-${fileName}" viewBox="0 0 24 24">
            <path d="${pathMatch[1]}" />
          </symbol>`;
      }
    }
    
    spriteContent += `</svg>`;
    
    fs.writeFileSync(
      path.join(process.cwd(), 'public/icons/sprite.svg'),
      spriteContent
    );
    
    console.log('Icon sprite sheet generated');
  }

  async minifyCSS() {
    console.log('Minifying CSS...');
    // Implementation for CSS minification
  }

  async run() {
    await this.optimizeImages();
    await this.generateSpriteSheet();
    await this.minifyCSS();
    console.log('Asset optimization complete!');
  }
}

// Package.json script: "optimize-assets": "node scripts/optimize-assets.js"
if (require.main === module) {
  const optimizer = new AssetOptimizer();
  optimizer.run().catch(console.error);
}

module.exports = AssetOptimizer;
```

### Cache Invalidation Strategy

**Intelligent Cache Invalidation**:

```typescript
// utils/cache-invalidation.ts
export class CacheInvalidationManager {
  private static instance: CacheInvalidationManager;
  
  static getInstance(): CacheInvalidationManager {
    if (!CacheInvalidationManager.instance) {
      CacheInvalidationManager.instance = new CacheInvalidationManager();
    }
    return CacheInvalidationManager.instance;
  }

  async invalidateUserData(userId: string): Promise<void> {
    const invalidationTasks = [
      this.invalidateQueryCache(userId),
      this.invalidateServiceWorkerCache(),
      this.invalidateIndexedDB(userId),
      this.invalidateBrowserCache(),
    ];

    await Promise.allSettled(invalidationTasks);
  }

  private async invalidateQueryCache(userId: string): Promise<void> {
    const queryClient = getQueryClient();
    
    // Invalidate user-specific queries
    await queryClient.invalidateQueries({ 
      predicate: (query) => {
        return query.queryKey.includes(userId);
      }
    });
    
    // Remove specific cache entries
    queryClient.removeQueries({ queryKey: ['user-profile', userId] });
    queryClient.removeQueries({ queryKey: ['workout-logs', userId] });
  }

  private async invalidateServiceWorkerCache(): Promise<void> {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_INVALIDATE',
        pattern: 'api'
      });
    }
  }

  private async invalidateIndexedDB(userId: string): Promise<void> {
    const dbManager = new IndexedDBManager();
    await dbManager.init();
    
    // Clear user-specific data
    const transaction = dbManager.db!.transaction(['workout-logs', 'user-profile'], 'readwrite');
    const workoutStore = transaction.objectStore('workout-logs');
    const profileStore = transaction.objectStore('user-profile');
    
    // Delete user data
    const workoutIndex = workoutStore.index('userId');
    const workoutRequest = workoutIndex.getAllKeys(userId);
    
    workoutRequest.onsuccess = () => {
      workoutRequest.result.forEach(key => workoutStore.delete(key));
    };
    
    await profileStore.delete(userId);
  }

  private async invalidateBrowserCache(): Promise<void> {
    // Force reload specific cached resources
    const criticalResources = [
      '/api/profile',
      '/api/workouts',
      '/api/exercises'
    ];

    for (const resource of criticalResources) {
      try {
        await fetch(resource, { cache: 'reload' });
      } catch (error) {
        console.warn(`Failed to invalidate cache for ${resource}:`, error);
      }
    }
  }

  async invalidateAssetCache(): Promise<void> {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      
      for (const cacheName of cacheNames) {
        if (cacheName.includes('static') || cacheName.includes('assets')) {
          await caches.delete(cacheName);
        }
      }
    }
  }

  // Method to handle app updates
  async handleAppUpdate(): Promise<void> {
    await Promise.all([
      this.invalidateAssetCache(),
      this.invalidateServiceWorkerCache(),
    ]);
    
    // Clear storage that might have outdated schemas
    localStorage.removeItem('app-version');
    sessionStorage.clear();
  }
}

// React hook for cache invalidation
export function useCacheInvalidation() {
  const manager = CacheInvalidationManager.getInstance();
  
  const invalidateUserData = useCallback(async (userId: string) => {
    await manager.invalidateUserData(userId);
  }, [manager]);
  
  const handleAppUpdate = useCallback(async () => {
    await manager.handleAppUpdate();
  }, [manager]);
  
  return { invalidateUserData, handleAppUpdate };
}
```

---

This comprehensive caching strategies document covers all aspects of frontend and backend caching for the trAIner AI Fitness App, from browser HTTP caching and service worker implementation to state management caching, API response optimization, and CDN configuration. Each section provides practical implementation details based on the current codebase architecture. 