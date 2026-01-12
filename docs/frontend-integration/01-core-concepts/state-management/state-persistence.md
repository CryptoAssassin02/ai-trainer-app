# State Persistence Patterns

## Table of Contents
- [Overview](#overview)
- [Storage Strategy Overview](#storage-strategy-overview)
- [Browser Storage Patterns](#browser-storage-patterns)
- [Cache Management](#cache-management)
- [Data Synchronization](#data-synchronization)
- [Offline Support](#offline-support)
- [Cross-Tab Synchronization](#cross-tab-synchronization)
- [Storage Security](#storage-security)
- [Migration Strategies](#migration-strategies)
- [Performance Considerations](#performance-considerations)
- [Testing Persistence](#testing-persistence)

## Overview

State persistence in the trAIner application ensures user data and preferences survive page refreshes, browser restarts, and network interruptions. The persistence layer provides seamless offline functionality, efficient caching, and automatic synchronization with the backend.

### Core Principles
- **Progressive Enhancement**: Work offline when possible
- **Data Integrity**: Ensure consistency between local and server state
- **Security First**: Protect sensitive data in storage
- **Performance**: Minimize storage operations and optimize retrieval
- **User Experience**: Transparent sync with clear feedback

## Storage Strategy Overview

### Storage Hierarchy
```typescript
interface StorageStrategy {
  // Sensitive, short-lived data
  memory: {
    tokens: AuthTokens
    tempData: any
  }
  
  // Session-specific data
  sessionStorage: {
    navigationState: NavigationState
    formDrafts: FormData
    tempUserId: string
  }
  
  // Persistent local data
  localStorage: {
    userPreferences: UserPreferences
    cachedProfiles: UserProfile
    offlineQueue: OfflineOperation[]
  }
  
  // Large or complex data
  indexedDB: {
    workoutPlans: WorkoutPlan[]
    exerciseHistory: ExerciseLog[]
    mediaFiles: Blob[]
  }
  
  // Server-side persistence
  supabase: {
    userProfiles: DatabaseProfile
    workoutData: DatabaseWorkout
    analytics: DatabaseAnalytics
  }
}
```

### Storage Selection Matrix

| Data Type | Storage Method | TTL | Sync Strategy |
|-----------|---------------|-----|---------------|
| **Auth Tokens** | Memory/Cookies | Session | No sync needed |
| **User Profile** | localStorage + Supabase | 30 days | On change |
| **Workout Plans** | IndexedDB + Supabase | Permanent | Background sync |
| **Form Drafts** | sessionStorage | Session | No sync |
| **Analytics Cache** | localStorage | 15 minutes | Invalidate on update |
| **Media Files** | IndexedDB | 7 days | On demand |

## Browser Storage Patterns

### 1. localStorage Implementation
```typescript
class LocalStorageManager {
  private prefix = 'trainer_'
  private encryption = new EncryptionService()
  
  set<T>(key: string, value: T, options?: StorageOptions): void {
    const storageKey = `${this.prefix}${key}`
    const data: StorageItem<T> = {
      value,
      timestamp: Date.now(),
      version: options?.version || 1,
      ttl: options?.ttl
    }
    
    try {
      const serialized = JSON.stringify(data)
      const stored = options?.encrypt 
        ? this.encryption.encrypt(serialized)
        : serialized
        
      localStorage.setItem(storageKey, stored)
      
      // Set up TTL cleanup if specified
      if (options?.ttl) {
        this.scheduleCleanup(storageKey, options.ttl)
      }
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        this.handleQuotaExceeded()
      }
      throw error
    }
  }
  
  get<T>(key: string, options?: RetrieveOptions): T | null {
    const storageKey = `${this.prefix}${key}`
    
    try {
      const stored = localStorage.getItem(storageKey)
      if (!stored) return null
      
      const decrypted = options?.encrypted
        ? this.encryption.decrypt(stored)
        : stored
        
      const data: StorageItem<T> = JSON.parse(decrypted)
      
      // Check TTL
      if (data.ttl && Date.now() - data.timestamp > data.ttl) {
        this.remove(key)
        return null
      }
      
      // Check version
      if (options?.version && data.version !== options.version) {
        if (options.migrate) {
          return options.migrate(data.value, data.version)
        }
        return null
      }
      
      return data.value
    } catch (error) {
      console.error(`Failed to retrieve ${key}:`, error)
      return null
    }
  }
  
  remove(key: string): void {
    localStorage.removeItem(`${this.prefix}${key}`)
  }
  
  clear(pattern?: RegExp): void {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        if (!pattern || pattern.test(key)) {
          localStorage.removeItem(key)
        }
      }
    })
  }
  
  private handleQuotaExceeded(): void {
    // Remove least recently used items
    const items = this.getAllItems()
    items.sort((a, b) => a.timestamp - b.timestamp)
    
    // Remove oldest 20% of items
    const toRemove = Math.ceil(items.length * 0.2)
    items.slice(0, toRemove).forEach(item => {
      localStorage.removeItem(item.key)
    })
  }
}
```

### 2. IndexedDB for Complex Data
```typescript
class IndexedDBManager {
  private dbName = 'TrainerDB'
  private version = 1
  private db: IDBDatabase | null = null
  
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Create object stores
        if (!db.objectStoreNames.contains('workoutPlans')) {
          const workoutStore = db.createObjectStore('workoutPlans', { 
            keyPath: 'id' 
          })
          workoutStore.createIndex('userId', 'userId', { unique: false })
          workoutStore.createIndex('updatedAt', 'updatedAt', { unique: false })
        }
        
        if (!db.objectStoreNames.contains('exerciseLogs')) {
          const logStore = db.createObjectStore('exerciseLogs', { 
            keyPath: 'id',
            autoIncrement: true 
          })
          logStore.createIndex('planId', 'planId', { unique: false })
          logStore.createIndex('date', 'date', { unique: false })
          logStore.createIndex('syncStatus', 'syncStatus', { unique: false })
        }
        
        if (!db.objectStoreNames.contains('mediaFiles')) {
          const mediaStore = db.createObjectStore('mediaFiles', { 
            keyPath: 'id' 
          })
          mediaStore.createIndex('type', 'type', { unique: false })
          mediaStore.createIndex('uploadedAt', 'uploadedAt', { unique: false })
        }
      }
    })
  }
  
  async save<T>(storeName: string, data: T): Promise<void> {
    if (!this.db) await this.initialize()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      
      const request = store.put({
        ...data,
        _localTimestamp: Date.now(),
        _syncStatus: 'pending'
      })
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
  
  async get<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
    if (!this.db) await this.initialize()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(key)
      
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }
  
  async query<T>(
    storeName: string,
    indexName: string,
    range?: IDBKeyRange
  ): Promise<T[]> {
    if (!this.db) await this.initialize()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const index = store.index(indexName)
      const request = range ? index.getAll(range) : index.getAll()
      
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }
  
  async bulkSave<T>(storeName: string, items: T[]): Promise<void> {
    if (!this.db) await this.initialize()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      
      items.forEach(item => {
        store.put({
          ...item,
          _localTimestamp: Date.now(),
          _syncStatus: 'pending'
        })
      })
      
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }
}
```

### 3. Session Storage for Temporary Data
```typescript
class SessionStorageManager {
  private prefix = 'trainer_session_'
  
  setFormDraft(formId: string, data: any): void {
    const key = `${this.prefix}form_${formId}`
    sessionStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }))
  }
  
  getFormDraft(formId: string): any | null {
    const key = `${this.prefix}form_${formId}`
    const stored = sessionStorage.getItem(key)
    
    if (!stored) return null
    
    try {
      const { data, timestamp } = JSON.parse(stored)
      
      // Auto-expire after 1 hour
      if (Date.now() - timestamp > 3600000) {
        sessionStorage.removeItem(key)
        return null
      }
      
      return data
    } catch {
      return null
    }
  }
  
  setNavigationState(state: NavigationState): void {
    sessionStorage.setItem(
      `${this.prefix}nav`,
      JSON.stringify(state)
    )
  }
  
  getNavigationState(): NavigationState | null {
    const stored = sessionStorage.getItem(`${this.prefix}nav`)
    return stored ? JSON.parse(stored) : null
  }
  
  clearFormDrafts(): void {
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(`${this.prefix}form_`)) {
        sessionStorage.removeItem(key)
      }
    })
  }
}
```

## Cache Management

### 1. Multi-Tier Cache Strategy
```typescript
class CacheManager {
  private memoryCache = new Map<string, CacheEntry>()
  private localStorage = new LocalStorageManager()
  private indexedDB = new IndexedDBManager()
  
  async get<T>(
    key: string,
    options?: CacheOptions
  ): Promise<T | null> {
    // L1: Memory cache
    const memoryHit = this.memoryCache.get(key)
    if (memoryHit && !this.isExpired(memoryHit)) {
      return memoryHit.data
    }
    
    // L2: localStorage
    const localHit = this.localStorage.get<T>(key)
    if (localHit) {
      // Promote to memory cache
      this.memoryCache.set(key, {
        data: localHit,
        timestamp: Date.now(),
        ttl: options?.ttl
      })
      return localHit
    }
    
    // L3: IndexedDB for large data
    if (options?.checkIndexedDB) {
      const dbHit = await this.indexedDB.get<T>('cache', key)
      if (dbHit) {
        // Promote to faster caches
        this.localStorage.set(key, dbHit, { ttl: options.ttl })
        this.memoryCache.set(key, {
          data: dbHit,
          timestamp: Date.now(),
          ttl: options?.ttl
        })
        return dbHit
      }
    }
    
    return null
  }
  
  async set<T>(
    key: string,
    data: T,
    options?: CacheOptions
  ): Promise<void> {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: options?.ttl,
      size: this.calculateSize(data)
    }
    
    // Always set in memory cache
    this.memoryCache.set(key, entry)
    
    // Determine storage strategy based on size
    if (entry.size < 5000) { // < 5KB
      this.localStorage.set(key, data, options)
    } else if (entry.size < 1000000) { // < 1MB
      await this.indexedDB.save('cache', { id: key, data })
    } else {
      // Too large for browser storage
      console.warn(`Data too large for cache: ${key}`)
    }
    
    // Enforce memory cache limits
    this.enforceMemoryLimit()
  }
  
  invalidate(pattern: string | RegExp): void {
    // Clear memory cache
    const keys = Array.from(this.memoryCache.keys())
    keys.forEach(key => {
      if (this.matchesPattern(key, pattern)) {
        this.memoryCache.delete(key)
      }
    })
    
    // Clear localStorage
    this.localStorage.clear(
      pattern instanceof RegExp ? pattern : new RegExp(pattern)
    )
    
    // Clear IndexedDB entries
    this.invalidateIndexedDB(pattern)
  }
  
  private enforceMemoryLimit(): void {
    const maxSize = 50 * 1024 * 1024 // 50MB
    let currentSize = 0
    const entries = Array.from(this.memoryCache.entries())
    
    // Calculate total size
    entries.forEach(([_, entry]) => {
      currentSize += entry.size || 0
    })
    
    // Remove least recently used if over limit
    if (currentSize > maxSize) {
      entries
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, Math.floor(entries.length * 0.3))
        .forEach(([key]) => this.memoryCache.delete(key))
    }
  }
}
```

### 2. Smart Cache Invalidation
```typescript
class CacheInvalidator {
  private dependencies = new Map<string, Set<string>>()
  
  registerDependency(cacheKey: string, dependsOn: string[]): void {
    dependsOn.forEach(dep => {
      if (!this.dependencies.has(dep)) {
        this.dependencies.set(dep, new Set())
      }
      this.dependencies.get(dep)!.add(cacheKey)
    })
  }
  
  invalidateWithDependencies(key: string): void {
    const cache = new CacheManager()
    
    // Invalidate the key itself
    cache.invalidate(key)
    
    // Invalidate all dependent keys
    const dependents = this.dependencies.get(key)
    if (dependents) {
      dependents.forEach(dependent => {
        this.invalidateWithDependencies(dependent)
      })
    }
  }
  
  // Intelligent invalidation based on data changes
  handleDataChange(changeType: DataChangeType, data: any): void {
    switch (changeType) {
      case 'PROFILE_UPDATE':
        this.invalidateWithDependencies('profile')
        this.invalidateWithDependencies('preferences')
        break
        
      case 'WORKOUT_COMPLETE':
        this.invalidateWithDependencies(`workout_${data.planId}`)
        this.invalidateWithDependencies('analytics')
        this.invalidateWithDependencies('progress')
        break
        
      case 'PLAN_GENERATED':
        this.invalidateWithDependencies('workout_plans')
        break
    }
  }
}
```

## Data Synchronization

### 1. Offline Queue Management
```typescript
interface OfflineOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  resource: string
  data: any
  timestamp: number
  attempts: number
  userId: string
}

class OfflineQueue {
  private queue: OfflineOperation[] = []
  private processing = false
  private storage = new LocalStorageManager()
  private QUEUE_KEY = 'offline_queue'
  
  constructor() {
    this.loadQueue()
    this.setupEventListeners()
  }
  
  private setupEventListeners(): void {
    window.addEventListener('online', () => this.processQueue())
    
    // Process queue on visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && navigator.onLine) {
        this.processQueue()
      }
    })
  }
  
  async add(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'attempts'>): Promise<void> {
    const op: OfflineOperation = {
      ...operation,
      id: generateId(),
      timestamp: Date.now(),
      attempts: 0
    }
    
    this.queue.push(op)
    this.saveQueue()
    
    if (navigator.onLine) {
      await this.processQueue()
    }
  }
  
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return
    
    this.processing = true
    
    while (this.queue.length > 0 && navigator.onLine) {
      const operation = this.queue[0]
      
      try {
        await this.executeOperation(operation)
        this.queue.shift()
        this.saveQueue()
      } catch (error) {
        operation.attempts++
        
        if (operation.attempts >= 3) {
          // Move to dead letter queue
          this.handleFailedOperation(operation, error)
          this.queue.shift()
        } else {
          // Exponential backoff
          await new Promise(resolve => 
            setTimeout(resolve, Math.pow(2, operation.attempts) * 1000)
          )
        }
      }
    }
    
    this.processing = false
  }
  
  private async executeOperation(op: OfflineOperation): Promise<void> {
    const endpoint = this.buildEndpoint(op)
    const method = this.getMethod(op.type)
    
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
        'X-Offline-Operation': op.id
      },
      body: op.type !== 'delete' ? JSON.stringify(op.data) : undefined
    })
    
    if (!response.ok) {
      throw new Error(`Operation failed: ${response.status}`)
    }
    
    // Update local state with server response
    if (op.type === 'create') {
      const created = await response.json()
      this.updateLocalRecord(op.data._tempId, created)
    }
  }
  
  private loadQueue(): void {
    const saved = this.storage.get<OfflineOperation[]>(this.QUEUE_KEY)
    if (saved) {
      this.queue = saved
    }
  }
  
  private saveQueue(): void {
    this.storage.set(this.QUEUE_KEY, this.queue)
  }
}
```

### 2. Conflict Resolution
```typescript
class ConflictResolver {
  async resolveConflict<T>(
    local: T & { updatedAt: string },
    server: T & { updatedAt: string },
    strategy: ConflictStrategy = 'server-wins'
  ): Promise<T> {
    switch (strategy) {
      case 'server-wins':
        return server
        
      case 'client-wins':
        return local
        
      case 'latest-wins':
        return new Date(local.updatedAt) > new Date(server.updatedAt) 
          ? local 
          : server
          
      case 'merge':
        return this.mergeChanges(local, server)
        
      case 'manual':
        return this.promptUserResolution(local, server)
        
      default:
        return server
    }
  }
  
  private mergeChanges<T>(local: T, server: T): T {
    const merged = { ...server }
    
    // Merge only changed fields
    Object.keys(local).forEach(key => {
      if (this.hasChanged(local[key], server[key])) {
        // Keep local changes for user-initiated fields
        if (this.isUserField(key)) {
          merged[key] = local[key]
        }
      }
    })
    
    return merged
  }
  
  private async promptUserResolution<T>(local: T, server: T): Promise<T> {
    // Show conflict resolution UI
    const resolution = await showConflictDialog({
      local,
      server,
      fields: this.getConflictingFields(local, server)
    })
    
    return resolution
  }
}
```

## Offline Support

### 1. Service Worker Implementation
```typescript
// service-worker.ts
const CACHE_NAME = 'trainer-v1'
const API_CACHE = 'trainer-api-v1'

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/static/css/main.css',
  '/static/js/main.js',
  '/static/images/logo.png'
]

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
})

self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event
  
  // API requests
  if (request.url.includes('/api/')) {
    event.respondWith(handleAPIRequest(request))
    return
  }
  
  // Static assets
  event.respondWith(
    caches.match(request).then(response => {
      return response || fetch(request).then(fetchResponse => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(request, fetchResponse.clone())
          return fetchResponse
        })
      })
    })
  )
})

async function handleAPIRequest(request: Request): Promise<Response> {
  // Try network first for API requests
  try {
    const response = await fetch(request)
    
    // Cache successful GET requests
    if (request.method === 'GET' && response.ok) {
      const cache = await caches.open(API_CACHE)
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    // Offline - check cache
    if (request.method === 'GET') {
      const cached = await caches.match(request)
      if (cached) {
        return new Response(cached.body, {
          ...cached,
          headers: {
            ...cached.headers,
            'X-From-Cache': 'true'
          }
        })
      }
    }
    
    // Queue non-GET requests
    if (request.method !== 'GET') {
      await queueOfflineRequest(request)
      return new Response(JSON.stringify({
        status: 'queued',
        message: 'Request queued for sync'
      }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME)
      return cache.match('/offline.html')!
    }
    
    throw error
  }
}
```

### 2. Offline State Management
```typescript
class OfflineManager {
  private isOnline = navigator.onLine
  private listeners: Set<(online: boolean) => void> = new Set()
  
  constructor() {
    this.setupEventListeners()
    this.checkConnectivity()
  }
  
  private setupEventListeners(): void {
    window.addEventListener('online', () => this.handleOnline())
    window.addEventListener('offline', () => this.handleOffline())
    
    // Periodic connectivity check
    setInterval(() => this.checkConnectivity(), 30000)
  }
  
  private async checkConnectivity(): Promise<void> {
    try {
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-store'
      })
      
      if (!this.isOnline && response.ok) {
        this.handleOnline()
      }
    } catch {
      if (this.isOnline) {
        this.handleOffline()
      }
    }
  }
  
  private handleOnline(): void {
    this.isOnline = true
    this.notifyListeners(true)
    
    // Trigger sync operations
    new OfflineQueue().processQueue()
    this.syncCachedData()
  }
  
  private handleOffline(): void {
    this.isOnline = false
    this.notifyListeners(false)
    
    // Show offline indicator
    showOfflineNotification()
  }
  
  onStatusChange(callback: (online: boolean) => void): () => void {
    this.listeners.add(callback)
    callback(this.isOnline) // Initial state
    
    return () => this.listeners.delete(callback)
  }
  
  private async syncCachedData(): Promise<void> {
    const syncManager = new SyncManager()
    
    // Sync in priority order
    await syncManager.syncProfile()
    await syncManager.syncWorkoutLogs()
    await syncManager.syncAnalytics()
  }
}

// React Hook
const useOfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  
  useEffect(() => {
    const manager = new OfflineManager()
    return manager.onStatusChange(setIsOnline)
  }, [])
  
  return isOnline
}
```

## Cross-Tab Synchronization

### 1. Broadcast Channel Implementation
```typescript
class CrossTabSync {
  private channel: BroadcastChannel
  private listeners = new Map<string, Set<(data: any) => void>>()
  
  constructor(channelName = 'trainer-sync') {
    this.channel = new BroadcastChannel(channelName)
    this.setupMessageHandler()
  }
  
  private setupMessageHandler(): void {
    this.channel.onmessage = (event) => {
      const { type, payload, tabId } = event.data
      
      // Ignore messages from self
      if (tabId === this.getTabId()) return
      
      const handlers = this.listeners.get(type)
      if (handlers) {
        handlers.forEach(handler => handler(payload))
      }
    }
  }
  
  broadcast(type: string, payload: any): void {
    this.channel.postMessage({
      type,
      payload,
      tabId: this.getTabId(),
      timestamp: Date.now()
    })
  }
  
  subscribe(type: string, handler: (data: any) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    
    this.listeners.get(type)!.add(handler)
    
    return () => {
      this.listeners.get(type)?.delete(handler)
    }
  }
  
  private getTabId(): string {
    if (!sessionStorage.getItem('tabId')) {
      sessionStorage.setItem('tabId', generateId())
    }
    return sessionStorage.getItem('tabId')!
  }
}

// React Integration
const useCrossTabState = <T,>(key: string, initialValue: T) => {
  const [value, setValue] = useState<T>(initialValue)
  const sync = useRef(new CrossTabSync())
  
  useEffect(() => {
    // Subscribe to changes from other tabs
    return sync.current.subscribe(key, (newValue) => {
      setValue(newValue)
    })
  }, [key])
  
  const updateValue = useCallback((newValue: T) => {
    setValue(newValue)
    sync.current.broadcast(key, newValue)
  }, [key])
  
  return [value, updateValue] as const
}

// React 19+ Pattern: useSyncExternalStore for External State
const useSyncedLocalStorage = <T,>(key: string, defaultValue: T) => {
  const subscribe = useCallback((callback: () => void) => {
    // Subscribe to both storage events and broadcast channel
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) callback()
    }
    
    const channel = new BroadcastChannel('trainer-sync')
    const handleBroadcast = (e: MessageEvent) => {
      if (e.data.type === key) callback()
    }
    
    window.addEventListener('storage', handleStorageChange)
    channel.addEventListener('message', handleBroadcast)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      channel.removeEventListener('message', handleBroadcast)
      channel.close()
    }
  }, [key])
  
  const getSnapshot = useCallback(() => {
    const stored = localStorage.getItem(key)
    if (!stored) return defaultValue
    try {
      return JSON.parse(stored) as T
    } catch {
      return defaultValue
    }
  }, [key, defaultValue])
  
  const getServerSnapshot = useCallback(() => {
    // Return default for SSR
    return defaultValue
  }, [defaultValue])
  
  const value = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )
  
  const setValue = useCallback((newValue: T) => {
    localStorage.setItem(key, JSON.stringify(newValue))
    // Broadcast to other tabs
    const channel = new BroadcastChannel('trainer-sync')
    channel.postMessage({ type: key, payload: newValue })
    channel.close()
  }, [key])
  
  return [value, setValue] as const
}
```

### 2. Storage Event Synchronization
```typescript
class StorageSync {
  private handlers = new Map<string, (value: any) => void>()
  
  constructor() {
    window.addEventListener('storage', this.handleStorageChange)
  }
  
  private handleStorageChange = (event: StorageEvent) => {
    if (!event.key || !event.newValue) return
    
    const handler = this.handlers.get(event.key)
    if (handler) {
      try {
        const value = JSON.parse(event.newValue)
        handler(value)
      } catch {
        handler(event.newValue)
      }
    }
  }
  
  watch(key: string, handler: (value: any) => void): () => void {
    this.handlers.set(key, handler)
    
    return () => {
      this.handlers.delete(key)
    }
  }
  
  set(key: string, value: any): void {
    const serialized = typeof value === 'string' 
      ? value 
      : JSON.stringify(value)
      
    localStorage.setItem(key, serialized)
    
    // Manually trigger for same tab
    const handler = this.handlers.get(key)
    if (handler) {
      handler(value)
    }
  }
}
```

## Storage Security

### 1. Encryption Service
```typescript
class EncryptionService {
  private algorithm = 'AES-GCM'
  private keyDerivationIterations = 100000
  
  async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    )
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.keyDerivationIterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.algorithm, length: 256 },
      false,
      ['encrypt', 'decrypt']
    )
  }
  
  async encrypt(data: string, password: string): Promise<string> {
    const encoder = new TextEncoder()
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const key = await this.deriveKey(password, salt)
    
    const encrypted = await crypto.subtle.encrypt(
      { name: this.algorithm, iv },
      key,
      encoder.encode(data)
    )
    
    // Combine salt, iv, and encrypted data
    const combined = new Uint8Array(
      salt.length + iv.length + encrypted.byteLength
    )
    combined.set(salt)
    combined.set(iv, salt.length)
    combined.set(new Uint8Array(encrypted), salt.length + iv.length)
    
    return btoa(String.fromCharCode(...combined))
  }
  
  async decrypt(encryptedData: string, password: string): Promise<string> {
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))
    
    const salt = combined.slice(0, 16)
    const iv = combined.slice(16, 28)
    const data = combined.slice(28)
    
    const key = await this.deriveKey(password, salt)
    
    const decrypted = await crypto.subtle.decrypt(
      { name: this.algorithm, iv },
      key,
      data
    )
    
    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  }
}
```

### 2. Secure Storage Wrapper
```typescript
class SecureStorage {
  private encryption = new EncryptionService()
  private storage = new LocalStorageManager()
  
  async setSecure(
    key: string,
    value: any,
    password: string
  ): Promise<void> {
    const serialized = JSON.stringify(value)
    const encrypted = await this.encryption.encrypt(serialized, password)
    
    this.storage.set(key, {
      encrypted: true,
      data: encrypted,
      timestamp: Date.now()
    })
  }
  
  async getSecure<T>(
    key: string,
    password: string
  ): Promise<T | null> {
    const stored = this.storage.get<{
      encrypted: boolean
      data: string
      timestamp: number
    }>(key)
    
    if (!stored || !stored.encrypted) return null
    
    try {
      const decrypted = await this.encryption.decrypt(stored.data, password)
      return JSON.parse(decrypted)
    } catch {
      // Invalid password or corrupted data
      return null
    }
  }
  
  // Store sensitive data with user-specific encryption
  async setUserData(userId: string, data: any): Promise<void> {
    const password = await this.getUserPassword(userId)
    await this.setSecure(`user_${userId}`, data, password)
  }
  
  private async getUserPassword(userId: string): Promise<string> {
    // Derive password from user credentials or secure token
    // This is a simplified example
    const token = await getAuthToken()
    return `${userId}_${token}`.substring(0, 32)
  }
}
```

## Migration Strategies

### 1. Storage Version Management
```typescript
interface MigrationDefinition {
  version: number
  up: (data: any) => any
  down: (data: any) => any
}

class StorageMigrator {
  private migrations: MigrationDefinition[] = [
    {
      version: 2,
      up: (data) => ({
        ...data,
        preferences: {
          ...data.preferences,
          theme: data.darkMode ? 'dark' : 'light'
        }
      }),
      down: (data) => ({
        ...data,
        darkMode: data.preferences?.theme === 'dark'
      })
    },
    {
      version: 3,
      up: (data) => ({
        ...data,
        workouts: data.workouts?.map(w => ({
          ...w,
          exercises: w.exercises || []
        }))
      }),
      down: (data) => data
    }
  ]
  
  async migrate(
    key: string,
    fromVersion: number,
    toVersion: number
  ): Promise<void> {
    const storage = new LocalStorageManager()
    const data = storage.get(key)
    
    if (!data) return
    
    let migrated = data
    
    // Apply migrations in sequence
    const direction = toVersion > fromVersion ? 'up' : 'down'
    const migrations = this.getMigrationPath(fromVersion, toVersion)
    
    for (const migration of migrations) {
      migrated = migration[direction](migrated)
    }
    
    storage.set(key, migrated, { version: toVersion })
  }
  
  private getMigrationPath(
    from: number,
    to: number
  ): MigrationDefinition[] {
    if (from < to) {
      return this.migrations
        .filter(m => m.version > from && m.version <= to)
        .sort((a, b) => a.version - b.version)
    } else {
      return this.migrations
        .filter(m => m.version <= from && m.version > to)
        .sort((a, b) => b.version - a.version)
    }
  }
}
```

## Performance Considerations

### 1. Lazy Loading and Chunking
```typescript
class ChunkedStorage {
  private chunkSize = 100 * 1024 // 100KB chunks
  
  async saveChunked(key: string, data: any[]): Promise<void> {
    const chunks = this.createChunks(data)
    const manifest = {
      key,
      totalChunks: chunks.length,
      totalItems: data.length,
      timestamp: Date.now()
    }
    
    // Save manifest
    await this.storage.set(`${key}_manifest`, manifest)
    
    // Save chunks
    await Promise.all(
      chunks.map((chunk, index) =>
        this.storage.set(`${key}_chunk_${index}`, chunk)
      )
    )
  }
  
  async loadChunked<T>(key: string): Promise<T[]> {
    const manifest = await this.storage.get<any>(`${key}_manifest`)
    if (!manifest) return []
    
    // Load chunks in parallel
    const chunkPromises = Array.from(
      { length: manifest.totalChunks },
      (_, i) => this.storage.get<T[]>(`${key}_chunk_${i}`)
    )
    
    const chunks = await Promise.all(chunkPromises)
    return chunks.flat().filter(Boolean)
  }
  
  private createChunks<T>(data: T[]): T[][] {
    const chunks: T[][] = []
    let currentChunk: T[] = []
    let currentSize = 0
    
    for (const item of data) {
      const itemSize = JSON.stringify(item).length
      
      if (currentSize + itemSize > this.chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk)
        currentChunk = []
        currentSize = 0
      }
      
      currentChunk.push(item)
      currentSize += itemSize
    }
    
    if (currentChunk.length > 0) {
      chunks.push(currentChunk)
    }
    
    return chunks
  }
}
```

### 2. Storage Optimization
```typescript
class StorageOptimizer {
  async analyzeStorageUsage(): Promise<StorageReport> {
    const usage = await navigator.storage.estimate()
    const localStorage = this.getLocalStorageSize()
    const sessionStorage = this.getSessionStorageSize()
    const indexedDB = await this.getIndexedDBSize()
    
    return {
      total: usage.usage || 0,
      quota: usage.quota || 0,
      breakdown: {
        localStorage,
        sessionStorage,
        indexedDB,
        cache: (usage.usage || 0) - localStorage - sessionStorage - indexedDB
      },
      recommendations: this.generateRecommendations(usage)
    }
  }
  
  private generateRecommendations(usage: StorageEstimate): string[] {
    const recommendations: string[] = []
    const usagePercent = ((usage.usage || 0) / (usage.quota || 1)) * 100
    
    if (usagePercent > 80) {
      recommendations.push('Storage usage is high. Consider cleaning old data.')
    }
    
    if (this.getLocalStorageSize() > 5 * 1024 * 1024) {
      recommendations.push('localStorage is large. Move big data to IndexedDB.')
    }
    
    return recommendations
  }
  
  async cleanup(options: CleanupOptions = {}): Promise<CleanupResult> {
    const result: CleanupResult = {
      freed: 0,
      errors: []
    }
    
    // Clean expired cache entries
    if (options.cache !== false) {
      result.freed += await this.cleanExpiredCache()
    }
    
    // Clean old IndexedDB entries
    if (options.indexedDB !== false) {
      result.freed += await this.cleanOldIndexedDBData()
    }
    
    // Clean orphaned data
    if (options.orphaned !== false) {
      result.freed += await this.cleanOrphanedData()
    }
    
    return result
  }
}
```

## Testing Persistence

### 1. Storage Mock Utilities
```typescript
class StorageMock implements Storage {
  private data = new Map<string, string>()
  
  get length(): number {
    return this.data.size
  }
  
  key(index: number): string | null {
    return Array.from(this.data.keys())[index] || null
  }
  
  getItem(key: string): string | null {
    return this.data.get(key) || null
  }
  
  setItem(key: string, value: string): void {
    this.data.set(key, value)
    
    // Simulate quota exceeded
    if (this.data.size > 100) {
      this.data.delete(key)
      throw new DOMException('QuotaExceededError')
    }
  }
  
  removeItem(key: string): void {
    this.data.delete(key)
  }
  
  clear(): void {
    this.data.clear()
  }
}

// Test helpers
export const setupStorageMocks = () => {
  const localStorageMock = new StorageMock()
  const sessionStorageMock = new StorageMock()
  
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
  })
  
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true
  })
  
  return { localStorageMock, sessionStorageMock }
}
```

## Best Practices Summary

1. **Layer your storage**: Use memory → localStorage → IndexedDB based on data size
2. **Encrypt sensitive data**: Never store tokens or passwords in plain text
3. **Handle quota limits**: Implement cleanup strategies for storage limits
4. **Sync intelligently**: Batch operations and use exponential backoff
5. **Version your data**: Plan for schema migrations from the start
6. **Test offline scenarios**: Ensure graceful degradation
7. **Monitor storage usage**: Track and optimize storage consumption
8. **Use broadcast channels**: Keep multiple tabs in sync
9. **Implement conflict resolution**: Handle concurrent updates gracefully
10. **Clean up on logout**: Remove sensitive data when users sign out 