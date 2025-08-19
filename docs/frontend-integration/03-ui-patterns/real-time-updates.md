# Real-Time Updates Patterns Documentation

## Table of Contents

1. [Overview](#overview)
2. [Supabase Realtime Integration](#supabase-realtime-integration)
3. [Optimistic UI Patterns](#optimistic-ui-patterns)
4. [Offline-First Architecture](#offline-first-architecture)
5. [Connection Management](#connection-management)
6. [Push Notifications](#push-notifications)
7. [Conflict Resolution](#conflict-resolution)
8. [Performance Considerations](#performance-considerations)
9. [Testing Strategies](#testing-strategies)
10. [Common Pitfalls](#common-pitfalls)
11. [Integration Examples](#integration-examples)

## Overview

This document outlines real-time update patterns for the trAIner AI Fitness App, focusing on Supabase Realtime integration, optimistic UI updates, offline-first architecture, and push notifications.

### Key Technologies
- **Supabase Realtime**: Real-time database subscriptions
- **IndexedDB**: Offline storage and sync
- **Service Workers**: Background sync and push notifications
- **React Query**: Optimistic updates and cache management
- **Web Push API**: Browser notifications

### Core Principles
- **Offline-First**: App works without internet connection
- **Optimistic Updates**: Immediate UI feedback
- **Conflict Resolution**: Graceful handling of data conflicts
- **Connection Resilience**: Automatic reconnection with backoff
- **User Control**: Clear indication of sync status

## Supabase Realtime Integration

### Channel Subscription Patterns

```jsx
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

function useRealtimeSubscription(table, filter, onUpdate) {
  const channelRef = useRef(null);

  useEffect(() => {
    // Create channel with unique name
    const channelName = `${table}_${filter ? Object.values(filter).join('_') : 'all'}`;
    
    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: filter ? `${Object.keys(filter)[0]}=eq.${Object.values(filter)[0]}` : undefined
        },
        (payload) => {
          console.log('Realtime update:', payload);
          onUpdate(payload);
        }
      )
      .subscribe((status) => {
        console.log(`Subscription status: ${status}`);
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, JSON.stringify(filter), onUpdate]);

  return channelRef.current;
}

// Usage example
function WorkoutLogsList({ userId }) {
  const queryClient = useQueryClient();

  const { data: workoutLogs } = useQuery({
    queryKey: ['workoutLogs', userId],
    queryFn: () => fetchWorkoutLogs(userId)
  });

  useRealtimeSubscription(
    'workout_logs',
    { user_id: userId },
    useCallback((payload) => {
      switch (payload.eventType) {
        case 'INSERT':
          queryClient.setQueryData(
            ['workoutLogs', userId],
            (old) => [...(old || []), payload.new]
          );
          break;
        case 'UPDATE':
          queryClient.setQueryData(
            ['workoutLogs', userId],
            (old) => old?.map(log => 
              log.id === payload.new.id ? payload.new : log
            ) || []
          );
          break;
        case 'DELETE':
          queryClient.setQueryData(
            ['workoutLogs', userId],
            (old) => old?.filter(log => log.id !== payload.old.id) || []
          );
          break;
      }
    }, [queryClient, userId])
  );

  return (
    <div className="space-y-4">
      {workoutLogs?.map(log => (
        <WorkoutLogCard key={log.id} log={log} />
      ))}
    </div>
  );
}
```

### Event Handling and Cleanup

```jsx
function useRealtimeEvents() {
  const channels = useRef(new Map());

  const subscribe = useCallback((channelName, config) => {
    // Clean up existing channel if it exists
    if (channels.current.has(channelName)) {
      supabase.removeChannel(channels.current.get(channelName));
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', config.dbConfig, config.onDbChange)
      .on('broadcast', { event: config.broadcastEvent }, config.onBroadcast)
      .on('presence', { event: 'sync' }, config.onPresenceSync)
      .subscribe((status, err) => {
        if (err) {
          console.error('Subscription error:', err);
          config.onError?.(err);
        }
        config.onStatusChange?.(status);
      });

    channels.current.set(channelName, channel);
    return channel;
  }, []);

  const unsubscribe = useCallback((channelName) => {
    const channel = channels.current.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      channels.current.delete(channelName);
    }
  }, []);

  const unsubscribeAll = useCallback(() => {
    channels.current.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    channels.current.clear();
  }, []);

  useEffect(() => {
    // Cleanup on unmount
    return unsubscribeAll;
  }, [unsubscribeAll]);

  return {
    subscribe,
    unsubscribe,
    unsubscribeAll
  };
}
```

### Presence Features for Collaborative Features

```jsx
function usePresence(roomId, userInfo) {
  const [presenceState, setPresenceState] = useState({});
  const [isOnline, setIsOnline] = useState(false);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!roomId || !userInfo) return;

    channelRef.current = supabase
      .channel(`presence_${roomId}`)
      .on('presence', { event: 'sync' }, () => {
        const newState = channelRef.current.presenceState();
        setPresenceState(newState);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track this user's presence
          await channelRef.current.track({
            user_id: userInfo.id,
            name: userInfo.name,
            avatar: userInfo.avatar,
            online_at: new Date().toISOString(),
            activity: 'viewing' // viewing, editing, etc.
          });
          setIsOnline(true);
        }
      });

    return () => {
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
      }
      setIsOnline(false);
    };
  }, [roomId, userInfo]);

  const updateActivity = useCallback(async (activity) => {
    if (channelRef.current && isOnline) {
      await channelRef.current.track({
        ...userInfo,
        activity,
        online_at: new Date().toISOString()
      });
    }
  }, [isOnline, userInfo]);

  // Get list of online users excluding current user
  const onlineUsers = useMemo(() => {
    return Object.values(presenceState)
      .flat()
      .filter(user => user.user_id !== userInfo?.id);
  }, [presenceState, userInfo?.id]);

  return {
    onlineUsers,
    updateActivity,
    isOnline
  };
}

// Usage in collaborative workout planning
function CollaborativeWorkoutPlanner({ workoutId, currentUser }) {
  const { onlineUsers, updateActivity } = usePresence(
    `workout_${workoutId}`,
    currentUser
  );

  const handleExerciseEdit = useCallback(() => {
    updateActivity('editing');
  }, [updateActivity]);

  return (
    <div className="space-y-4">
      {/* Online users indicator */}
      {onlineUsers.length > 0 && (
        <div className="flex items-center space-x-2">
          <div className="flex -space-x-2">
            {onlineUsers.slice(0, 3).map((user) => (
              <Avatar key={user.user_id} className="border-2 border-background">
                <AvatarImage src={user.avatar} />
                <AvatarFallback>{user.name?.[0]}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">
            {onlineUsers.length === 1 
              ? `${onlineUsers[0].name} is online`
              : `${onlineUsers.length} users online`
            }
          </span>
        </div>
      )}

      {/* Workout content */}
      <WorkoutEditor onEdit={handleExerciseEdit} />
    </div>
  );
}
```

### Broadcasting Patterns

```jsx
function useBroadcast(channelName) {
  const channelRef = useRef(null);

  useEffect(() => {
    channelRef.current = supabase.channel(channelName);
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [channelName]);

  const broadcast = useCallback(async (event, payload) => {
    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event,
        payload
      });
    }
  }, []);

  const subscribe = useCallback((event, callback) => {
    if (channelRef.current) {
      channelRef.current.on('broadcast', { event }, callback).subscribe();
    }
  }, []);

  return { broadcast, subscribe };
}

// Live workout session
function LiveWorkoutSession({ sessionId }) {
  const { broadcast, subscribe } = useBroadcast(`workout_session_${sessionId}`);
  const [participants, setParticipants] = useState([]);
  const [currentExercise, setCurrentExercise] = useState(null);

  useEffect(() => {
    subscribe('exercise_start', (payload) => {
      setCurrentExercise(payload.exercise);
      toast.info(`Starting: ${payload.exercise.name}`);
    });

    subscribe('participant_progress', (payload) => {
      setParticipants(prev => 
        prev.map(p => 
          p.id === payload.userId 
            ? { ...p, progress: payload.progress }
            : p
        )
      );
    });
  }, [subscribe]);

  const startExercise = useCallback(async (exercise) => {
    await broadcast('exercise_start', { exercise });
    setCurrentExercise(exercise);
  }, [broadcast]);

  const updateProgress = useCallback(async (progress) => {
    await broadcast('participant_progress', {
      userId: currentUser.id,
      progress
    });
  }, [broadcast]);

  return (
    <div className="space-y-6">
      {currentExercise && (
        <ExerciseTimer
          exercise={currentExercise}
          onProgressUpdate={updateProgress}
        />
      )}
      
      <ParticipantsList participants={participants} />
    </div>
  );
}
```

## Optimistic UI Patterns

### Immediate Updates with Rollback on Failure

```jsx
function useOptimisticMutation(mutationFn, options = {}) {
  const queryClient = useQueryClient();
  const [optimisticUpdates, setOptimisticUpdates] = useState([]);

  const mutation = useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Generate optimistic update ID
      const optimisticId = `optimistic_${Date.now()}_${Math.random()}`;
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: options.queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(options.queryKey);

      // Optimistically update cache
      queryClient.setQueryData(options.queryKey, (old) => {
        return options.optimisticUpdater(old, variables, optimisticId);
      });

      // Track optimistic update
      setOptimisticUpdates(prev => [...prev, optimisticId]);

      return { previousData, optimisticId };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(options.queryKey, context.previousData);
      }
      
      // Remove from optimistic updates
      setOptimisticUpdates(prev => 
        prev.filter(id => id !== context?.optimisticId)
      );

      options.onError?.(err, variables, context);
    },
    onSuccess: (data, variables, context) => {
      // Remove from optimistic updates (real data is now available)
      setOptimisticUpdates(prev => 
        prev.filter(id => id !== context?.optimisticId)
      );

      // Update with real data
      queryClient.setQueryData(options.queryKey, (old) => {
        return options.successUpdater(old, data, variables);
      });

      options.onSuccess?.(data, variables, context);
    }
  });

  return {
    ...mutation,
    optimisticUpdates
  };
}

// Usage example
function WorkoutLogForm({ workoutId }) {
  const queryClient = useQueryClient();

  const logWorkoutMutation = useOptimisticMutation(
    async (exerciseData) => {
      const response = await fetch('/api/v1/workout-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(exerciseData)
      });

      if (!response.ok) {
        throw new Error('Failed to log workout');
      }

      return response.json();
    },
    {
      queryKey: ['workoutLogs', workoutId],
      optimisticUpdater: (old, variables, optimisticId) => [
        ...(old || []),
        {
          id: optimisticId,
          ...variables,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ],
      successUpdater: (old, data, variables) => 
        old?.map(item => 
          item.id.startsWith('optimistic_') && 
          item.exercise_name === variables.exercise_name
            ? data
            : item
        ) || [data],
      onError: (error) => {
        toast.error('Failed to log exercise. Please try again.');
      }
    }
  );

  const handleSubmit = (exerciseData) => {
    logWorkoutMutation.mutate(exerciseData);
    toast.success('Exercise logged!'); // Immediate feedback
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

### Pending State Indicators

```jsx
function OptimisticListItem({ item, isOptimistic, onRetry }) {
  return (
    <div className={cn(
      'p-4 border rounded-lg transition-all',
      isOptimistic && 'opacity-70 border-dashed'
    )}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="font-medium">{item.name}</h3>
          <p className="text-sm text-muted-foreground">
            {format(new Date(item.created_at), 'PPp')}
          </p>
        </div>

        {isOptimistic && (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            <span className="text-xs text-muted-foreground">Syncing...</span>
          </div>
        )}
      </div>

      {item.status === 'error' && (
        <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded">
          <div className="flex items-center justify-between">
            <span className="text-sm text-destructive">Failed to sync</span>
            <Button size="sm" variant="outline" onClick={() => onRetry(item)}>
              Retry
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Retry Queue Management

```jsx
function useRetryQueue() {
  const [retryQueue, setRetryQueue] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addToQueue = useCallback((operation) => {
    const queueItem = {
      id: `retry_${Date.now()}_${Math.random()}`,
      operation,
      attempts: 0,
      maxAttempts: 3,
      backoff: 1000, // Start with 1 second
      timestamp: Date.now()
    };

    setRetryQueue(prev => [...prev, queueItem]);
  }, []);

  const processQueue = useCallback(async () => {
    if (isProcessing || retryQueue.length === 0) return;

    setIsProcessing(true);

    const queue = [...retryQueue];
    
    for (const item of queue) {
      try {
        await item.operation();
        
        // Remove successful item
        setRetryQueue(prev => prev.filter(q => q.id !== item.id));
        
      } catch (error) {
        console.error('Retry failed:', error);

        setRetryQueue(prev => prev.map(q => {
          if (q.id === item.id) {
            const newAttempts = q.attempts + 1;
            
            if (newAttempts >= q.maxAttempts) {
              // Remove after max attempts
              return null;
            }
            
            return {
              ...q,
              attempts: newAttempts,
              backoff: q.backoff * 2, // Exponential backoff
              timestamp: Date.now() + q.backoff
            };
          }
          return q;
        }).filter(Boolean));
      }
    }

    setIsProcessing(false);
  }, [retryQueue, isProcessing]);

  // Process queue when items are added or connection is restored
  useEffect(() => {
    if (retryQueue.length > 0 && navigator.onLine) {
      const timer = setTimeout(processQueue, 1000);
      return () => clearTimeout(timer);
    }
  }, [retryQueue.length, processQueue]);

  return {
    addToQueue,
    retryQueue,
    isProcessing
  };
}
```

## Offline-First Architecture

### IndexedDB Data Model Design

```jsx
// db/schema.js
import Dexie from 'dexie';

export class OfflineDatabase extends Dexie {
  constructor() {
    super('TrainerAppDB');
    
    this.version(1).stores({
      // Core entities
      users: '++id, supabase_id, email, name, updated_at',
      profiles: '++id, user_id, data, updated_at, synced_at',
      workouts: '++id, user_id, data, created_at, updated_at, synced_at',
      workout_logs: '++id, user_id, workout_id, data, created_at, updated_at, synced_at',
      
      // Sync queue
      sync_queue: '++id, table_name, operation, data, created_at, attempts',
      
      // Cached data
      cached_responses: '++id, url, method, params_hash, data, expires_at',
      
      // Conflict resolution
      conflicts: '++id, table_name, local_data, remote_data, created_at'
    });
  }

  // Helper methods
  async addToSyncQueue(tableName, operation, data) {
    return await this.sync_queue.add({
      table_name: tableName,
      operation,
      data,
      created_at: new Date(),
      attempts: 0
    });
  }

  async getSyncQueue() {
    return await this.sync_queue.orderBy('created_at').toArray();
  }

  async clearSyncQueue(ids) {
    return await this.sync_queue.bulkDelete(ids);
  }
}

export const db = new OfflineDatabase();
```

### Sync Queue Implementation

```jsx
function useSyncManager() {
  const [syncStatus, setSyncStatus] = useState({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingCount: 0,
    lastSync: null
  });

  const syncToServer = useCallback(async () => {
    if (!navigator.onLine || syncStatus.isSyncing) return;

    setSyncStatus(prev => ({ ...prev, isSyncing: true }));

    try {
      const queue = await db.getSyncQueue();
      const processedIds = [];

      for (const item of queue) {
        try {
          switch (item.operation) {
            case 'CREATE':
              await syncCreate(item);
              break;
            case 'UPDATE':
              await syncUpdate(item);
              break;
            case 'DELETE':
              await syncDelete(item);
              break;
          }
          
          processedIds.push(item.id);
        } catch (error) {
          console.error('Sync item failed:', error);
          
          // Increment attempts
          await db.sync_queue.update(item.id, {
            attempts: item.attempts + 1
          });
          
          // Remove if too many attempts
          if (item.attempts >= 3) {
            processedIds.push(item.id);
            console.error('Max sync attempts reached for:', item);
          }
        }
      }

      // Remove processed items
      if (processedIds.length > 0) {
        await db.clearSyncQueue(processedIds);
      }

      setSyncStatus(prev => ({
        ...prev,
        pendingCount: queue.length - processedIds.length,
        lastSync: new Date()
      }));

    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, [syncStatus.isSyncing]);

  const syncCreate = async (item) => {
    const response = await fetch(`/api/v1/${item.table_name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify(item.data)
    });

    if (!response.ok) {
      throw new Error(`Failed to sync create: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Update local record with server ID
    await db[item.table_name].update(item.data.id, {
      id: result.id,
      synced_at: new Date()
    });
  };

  const syncUpdate = async (item) => {
    const response = await fetch(`/api/v1/${item.table_name}/${item.data.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify(item.data)
    });

    if (!response.ok) {
      throw new Error(`Failed to sync update: ${response.statusText}`);
    }

    await db[item.table_name].update(item.data.id, {
      synced_at: new Date()
    });
  };

  const syncDelete = async (item) => {
    const response = await fetch(`/api/v1/${item.table_name}/${item.data.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to sync delete: ${response.statusText}`);
    }

    // Remove from local database
    await db[item.table_name].delete(item.data.id);
  };

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: true }));
      syncToServer(); // Auto-sync when coming online
    };

    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncToServer]);

  // Update pending count
  useEffect(() => {
    const updatePendingCount = async () => {
      const count = await db.sync_queue.count();
      setSyncStatus(prev => ({ ...prev, pendingCount: count }));
    };

    updatePendingCount();
    
    // Check every 30 seconds
    const interval = setInterval(updatePendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    syncStatus,
    syncToServer,
    addToSyncQueue: db.addToSyncQueue.bind(db)
  };
}
```

### Conflict Detection and Resolution

```jsx
function useConflictResolver() {
  const [conflicts, setConflicts] = useState([]);

  const detectConflict = useCallback(async (tableName, localData, remoteData) => {
    // Compare timestamps
    const localTime = new Date(localData.updated_at);
    const remoteTime = new Date(remoteData.updated_at);
    
    // If remote is newer and local has unsaved changes
    if (remoteTime > localTime && localData.synced_at < localData.updated_at) {
      const conflict = {
        id: `conflict_${Date.now()}`,
        table_name: tableName,
        local_data: localData,
        remote_data: remoteData,
        created_at: new Date()
      };

      await db.conflicts.add(conflict);
      setConflicts(prev => [...prev, conflict]);
      
      return conflict;
    }

    return null;
  }, []);

  const resolveConflict = useCallback(async (conflictId, resolution) => {
    const conflict = await db.conflicts.get(conflictId);
    if (!conflict) return;

    let resolvedData;
    
    switch (resolution.type) {
      case 'use_local':
        resolvedData = conflict.local_data;
        break;
      case 'use_remote':
        resolvedData = conflict.remote_data;
        break;
      case 'merge':
        resolvedData = resolution.mergedData;
        break;
      default:
        throw new Error('Invalid resolution type');
    }

    // Update the local record
    await db[conflict.table_name].put({
      ...resolvedData,
      updated_at: new Date(),
      synced_at: new Date()
    });

    // Remove conflict
    await db.conflicts.delete(conflictId);
    setConflicts(prev => prev.filter(c => c.id !== conflictId));

    // Add to sync queue if we chose local or merged
    if (resolution.type !== 'use_remote') {
      await db.addToSyncQueue(conflict.table_name, 'UPDATE', resolvedData);
    }
  }, []);

  const getConflicts = useCallback(async () => {
    const allConflicts = await db.conflicts.toArray();
    setConflicts(allConflicts);
    return allConflicts;
  }, []);

  return {
    conflicts,
    detectConflict,
    resolveConflict,
    getConflicts
  };
}

// Conflict resolution UI
function ConflictResolutionModal({ conflict, onResolve, onClose }) {
  const [selectedResolution, setSelectedResolution] = useState('use_local');
  const [mergedData, setMergedData] = useState({});

  const handleResolve = () => {
    const resolution = {
      type: selectedResolution,
      mergedData: selectedResolution === 'merge' ? mergedData : undefined
    };
    
    onResolve(conflict.id, resolution);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Resolve Data Conflict</DialogTitle>
          <DialogDescription>
            This {conflict.table_name} has been modified both locally and remotely.
            Choose how to resolve the conflict.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <RadioGroup value={selectedResolution} onValueChange={setSelectedResolution}>
            <div className="grid grid-cols-2 gap-4">
              {/* Local version */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="use_local" id="use_local" />
                  <Label htmlFor="use_local">Use Local Version</Label>
                </div>
                <Card className="p-4">
                  <h4 className="font-medium mb-2">Your Changes</h4>
                  <DataPreview data={conflict.local_data} />
                </Card>
              </div>

              {/* Remote version */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="use_remote" id="use_remote" />
                  <Label htmlFor="use_remote">Use Server Version</Label>
                </div>
                <Card className="p-4">
                  <h4 className="font-medium mb-2">Server Changes</h4>
                  <DataPreview data={conflict.remote_data} />
                </Card>
              </div>
            </div>

            {/* Merge option */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="merge" id="merge" />
                <Label htmlFor="merge">Merge Changes</Label>
              </div>
              {selectedResolution === 'merge' && (
                <Card className="p-4">
                  <MergeEditor
                    localData={conflict.local_data}
                    remoteData={conflict.remote_data}
                    onMergedDataChange={setMergedData}
                  />
                </Card>
              )}
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleResolve}>
            Resolve Conflict
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## Connection Management

### Reconnection with Exponential Backoff

```jsx
function useConnectionManager() {
  const [connectionState, setConnectionState] = useState({
    status: 'connecting', // 'connecting', 'connected', 'disconnected', 'reconnecting'
    lastConnected: null,
    reconnectAttempts: 0,
    quality: 'good' // 'poor', 'fair', 'good', 'excellent'
  });

  const maxReconnectAttempts = 10;
  const baseDelay = 1000; // Start with 1 second
  const maxDelay = 30000; // Max 30 seconds between attempts

  const calculateBackoffDelay = useCallback((attemptNumber) => {
    const delay = Math.min(baseDelay * Math.pow(2, attemptNumber), maxDelay);
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay;
    return delay + jitter;
  }, []);

  const reconnect = useCallback(async () => {
    if (connectionState.reconnectAttempts >= maxReconnectAttempts) {
      setConnectionState(prev => ({ ...prev, status: 'disconnected' }));
      return;
    }

    setConnectionState(prev => ({
      ...prev,
      status: 'reconnecting',
      reconnectAttempts: prev.reconnectAttempts + 1
    }));

    const delay = calculateBackoffDelay(connectionState.reconnectAttempts);
    
    try {
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Attempt to reconnect to Supabase
      const { error } = await supabase.realtime.connect();
      
      if (error) {
        throw error;
      }

      setConnectionState(prev => ({
        ...prev,
        status: 'connected',
        lastConnected: Date.now(),
        reconnectAttempts: 0
      }));

      toast.success('Reconnected successfully');
    } catch (error) {
      console.error('Reconnection failed:', error);
      
      if (connectionState.reconnectAttempts < maxReconnectAttempts) {
        // Try again
        setTimeout(reconnect, 1000);
      } else {
        setConnectionState(prev => ({ ...prev, status: 'disconnected' }));
        toast.error('Unable to reconnect. Please refresh the page.');
      }
    }
  }, [connectionState.reconnectAttempts, calculateBackoffDelay]);

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => {
      if (connectionState.status === 'disconnected') {
        reconnect();
      }
    };

    const handleOffline = () => {
      setConnectionState(prev => ({ ...prev, status: 'disconnected' }));
    };

    // Listen for Supabase connection events
    const handleRealtimeStateChange = (state) => {
      switch (state) {
        case 'SUBSCRIBED':
          setConnectionState(prev => ({
            ...prev,
            status: 'connected',
            lastConnected: Date.now(),
            reconnectAttempts: 0
          }));
          break;
        case 'CHANNEL_ERROR':
        case 'TIMED_OUT':
        case 'CLOSED':
          if (connectionState.status === 'connected') {
            reconnect();
          }
          break;
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connectionState.status, reconnect]);

  return {
    connectionState,
    reconnect,
    isOnline: connectionState.status === 'connected'
  };
}
```

### Connection Status Indicators

```jsx
function ConnectionStatusIndicator() {
  const { connectionState, reconnect } = useConnectionManager();

  const statusConfig = {
    connected: {
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      icon: Wifi,
      label: 'Connected',
      description: 'Real-time updates active'
    },
    connecting: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      icon: Loader,
      label: 'Connecting...',
      description: 'Establishing connection'
    },
    reconnecting: {
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      icon: RefreshCw,
      label: 'Reconnecting...',
      description: `Attempt ${connectionState.reconnectAttempts}`
    },
    disconnected: {
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      icon: WifiOff,
      label: 'Offline',
      description: 'Real-time updates unavailable'
    }
  };

  const config = statusConfig[connectionState.status];
  const Icon = config.icon;

  return (
    <div className="fixed top-4 right-4 z-50">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 px-2 space-x-2',
              config.bgColor,
              config.color
            )}
          >
            <Icon className={cn(
              'h-3 w-3',
              connectionState.status === 'connecting' && 'animate-spin',
              connectionState.status === 'reconnecting' && 'animate-spin'
            )} />
            <span className="text-xs font-medium">{config.label}</span>
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Connection Status</h4>
              <p className="text-sm text-muted-foreground">
                {config.description}
              </p>
            </div>

            {connectionState.lastConnected && (
              <div className="text-xs text-muted-foreground">
                Last connected: {format(new Date(connectionState.lastConnected), 'PPp')}
              </div>
            )}

            {connectionState.status === 'disconnected' && (
              <Button onClick={reconnect} size="sm" className="w-full">
                Try Reconnecting
              </Button>
            )}

            {/* Connection quality indicator */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Connection Quality</span>
                <span className="text-xs capitalize">{connectionState.quality}</span>
              </div>
              <div className="flex space-x-1">
                {[1, 2, 3, 4].map((bar) => (
                  <div
                    key={bar}
                    className={cn(
                      'h-2 w-4 rounded-sm',
                      getQualityBarColor(connectionState.quality, bar)
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function getQualityBarColor(quality, barIndex) {
  const qualityLevels = {
    poor: 1,
    fair: 2,
    good: 3,
    excellent: 4
  };

  const level = qualityLevels[quality] || 0;
  
  if (barIndex <= level) {
    return level >= 3 ? 'bg-green-500' : level >= 2 ? 'bg-yellow-500' : 'bg-red-500';
  }
  
  return 'bg-gray-200';
}
```

### Offline Mode Detection

```jsx
function useOfflineDetection() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineSince, setOfflineSince] = useState(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setOfflineSince(null);
      
      // Show reconnection notification
      toast.success('Back online! Syncing data...');
    };

    const handleOffline = () => {
      setIsOffline(true);
      setOfflineSince(Date.now());
      
      // Show offline notification
      toast.warning('You\'re offline. Changes will sync when reconnected.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOffline,
    offlineSince,
    offlineDuration: offlineSince ? Date.now() - offlineSince : 0
  };
}

function OfflineBanner() {
  const { isOffline, offlineDuration } = useOfflineDetection();
  const [showDetails, setShowDetails] = useState(false);

  if (!isOffline) return null;

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="bg-orange-100 border-b border-orange-200 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <WifiOff className="h-4 w-4 text-orange-600" />
          <span className="text-sm font-medium text-orange-800">
            You're offline
          </span>
          {offlineDuration > 5000 && (
            <span className="text-xs text-orange-600">
              for {formatDuration(offlineDuration)}
            </span>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="text-orange-600 hover:text-orange-800"
        >
          {showDetails ? 'Hide' : 'Show'} Details
        </Button>
      </div>

      {showDetails && (
        <div className="mt-2 text-sm text-orange-700">
          <p>• Your changes are being saved locally</p>
          <p>• Data will sync automatically when reconnected</p>
          <p>• Some features may be limited while offline</p>
        </div>
      )}
    </div>
  );
}
```

## Push Notifications

### Web Push Setup and Permissions

```jsx
function usePushNotifications() {
  const [permission, setPermission] = useState(Notification.permission);
  const [subscription, setSubscription] = useState(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    if (supported) {
      // Register service worker
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);

      // Check for existing subscription
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        setSubscription(existingSubscription);
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  const requestPermission = async () => {
    if (!isSupported) {
      throw new Error('Push notifications are not supported');
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        await subscribeUser();
      }

      return result;
    } catch (error) {
      console.error('Permission request failed:', error);
      throw error;
    }
  };

  const subscribeUser = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      });

      setSubscription(subscription);

      // Send subscription to server
      await fetch('/api/v1/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      });

      return subscription;
    } catch (error) {
      console.error('Subscription failed:', error);
      throw error;
    }
  };

  const unsubscribe = async () => {
    if (subscription) {
      try {
        await subscription.unsubscribe();
        setSubscription(null);

        // Notify server
        await fetch('/api/v1/notifications/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint
          })
        });
      } catch (error) {
        console.error('Unsubscribe failed:', error);
        throw error;
      }
    }
  };

  return {
    permission,
    subscription,
    isSupported,
    requestPermission,
    unsubscribe,
    isSubscribed: !!subscription
  };
}
```

### Notification Scheduling

```jsx
function NotificationScheduler() {
  const [preferences, setPreferences] = useState({
    workoutReminders: true,
    progressUpdates: true,
    goalAchievements: true,
    quietHours: {
      enabled: true,
      start: '22:00',
      end: '07:00'
    }
  });

  const { isSubscribed, requestPermission } = usePushNotifications();

  const scheduleNotification = useCallback(async (notification) => {
    try {
      const response = await fetch('/api/v1/notifications/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          ...notification,
          preferences
        })
      });

      if (!response.ok) {
        throw new Error('Failed to schedule notification');
      }

      return await response.json();
    } catch (error) {
      console.error('Notification scheduling failed:', error);
      throw error;
    }
  }, [preferences]);

  const updatePreferences = async (newPreferences) => {
    try {
      const response = await fetch('/api/v1/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(newPreferences)
      });

      if (response.ok) {
        setPreferences(newPreferences);
        toast.success('Notification preferences updated');
      }
    } catch (error) {
      toast.error('Failed to update preferences');
    }
  };

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bell className="h-5 w-5" />
          <span>Notification Settings</span>
        </CardTitle>
        <CardDescription>
          Customize when and how you receive notifications
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {!isSubscribed && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Enable Notifications</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Turn on notifications to get reminders and updates.</p>
              <Button onClick={requestPermission} size="sm">
                Enable Notifications
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="workout-reminders">Workout Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Get reminded when it's time for your scheduled workouts
              </p>
            </div>
            <Switch
              id="workout-reminders"
              checked={preferences.workoutReminders}
              onCheckedChange={(checked) =>
                updatePreferences({ ...preferences, workoutReminders: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="progress-updates">Progress Updates</Label>
              <p className="text-sm text-muted-foreground">
                Weekly summaries of your fitness progress
              </p>
            </div>
            <Switch
              id="progress-updates"
              checked={preferences.progressUpdates}
              onCheckedChange={(checked) =>
                updatePreferences({ ...preferences, progressUpdates: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="goal-achievements">Goal Achievements</Label>
              <p className="text-sm text-muted-foreground">
                Celebrate when you reach your fitness goals
              </p>
            </div>
            <Switch
              id="goal-achievements"
              checked={preferences.goalAchievements}
              onCheckedChange={(checked) =>
                updatePreferences({ ...preferences, goalAchievements: checked })
              }
            />
          </div>
        </div>

        {/* Quiet hours settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="quiet-hours">Quiet Hours</Label>
            <Switch
              id="quiet-hours"
              checked={preferences.quietHours.enabled}
              onCheckedChange={(checked) =>
                updatePreferences({
                  ...preferences,
                  quietHours: { ...preferences.quietHours, enabled: checked }
                })
              }
            />
          </div>

          {preferences.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quiet-start">Start Time</Label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={preferences.quietHours.start}
                  onChange={(e) =>
                    updatePreferences({
                      ...preferences,
                      quietHours: { ...preferences.quietHours, start: e.target.value }
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="quiet-end">End Time</Label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={preferences.quietHours.end}
                  onChange={(e) =>
                    updatePreferences({
                      ...preferences,
                      quietHours: { ...preferences.quietHours, end: e.target.value }
                    })
                  }
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Deep Linking from Notifications

```jsx
// Service Worker: sw.js
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { action, data } = event.notification;
  let targetUrl = '/';

  // Handle different notification types
  switch (data?.type) {
    case 'workout_reminder':
      targetUrl = `/workouts/${data.workoutId}`;
      break;
    case 'progress_update':
      targetUrl = '/progress';
      break;
    case 'goal_achievement':
      targetUrl = `/goals/${data.goalId}`;
      break;
    case 'social_interaction':
      targetUrl = `/social/${data.interactionId}`;
      break;
    default:
      targetUrl = '/dashboard';
  }

  // Handle notification actions
  if (action) {
    switch (action) {
      case 'start_workout':
        targetUrl = `/workouts/${data.workoutId}/start`;
        break;
      case 'view_progress':
        targetUrl = '/progress';
        break;
      case 'dismiss':
        return; // Don't open anything
    }
  }

  // Focus existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Try to focus existing window
      for (const client of clientList) {
        if (client.url.includes(new URL(targetUrl, self.location.origin).pathname)) {
          return client.focus();
        }
      }
      
      // Open new window
      return clients.openWindow(targetUrl);
    })
  );
});

// React hook for handling notification deep links
function useNotificationDeepLinks() {
  useEffect(() => {
    // Handle URL parameters from notification clicks
    const urlParams = new URLSearchParams(window.location.search);
    const notificationData = urlParams.get('notification');
    
    if (notificationData) {
      try {
        const data = JSON.parse(decodeURIComponent(notificationData));
        handleNotificationAction(data);
        
        // Clean up URL
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      } catch (error) {
        console.error('Failed to parse notification data:', error);
      }
    }
  }, []);

  const handleNotificationAction = (data) => {
    switch (data.type) {
      case 'workout_reminder':
        toast.info('Starting your scheduled workout!', {
          action: {
            label: 'Begin',
            onClick: () => navigate(`/workouts/${data.workoutId}/start`)
          }
        });
        break;
      case 'goal_achievement':
        toast.success('Congratulations on reaching your goal!', {
          action: {
            label: 'View Details',
            onClick: () => navigate(`/goals/${data.goalId}`)
          }
        });
        break;
    }
  };
}
```

## Performance Considerations

### Efficient Data Synchronization

```jsx
function usePerformantSync() {
  const [syncMetrics, setSyncMetrics] = useState({
    bytesTransferred: 0,
    operationsPerSecond: 0,
    latency: 0
  });

  const throttledSync = useCallback(
    throttle(async (operations) => {
      const startTime = Date.now();
      let totalBytes = 0;

      try {
        // Batch operations for efficiency
        const batches = chunkArray(operations, 10);
        
        for (const batch of batches) {
          const batchSize = JSON.stringify(batch).length;
          totalBytes += batchSize;

          await processBatch(batch);
          
          // Add small delay between batches to prevent overwhelming
          if (batches.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }

        const endTime = Date.now();
        const latency = endTime - startTime;
        const opsPerSecond = operations.length / (latency / 1000);

        setSyncMetrics({
          bytesTransferred: totalBytes,
          operationsPerSecond: opsPerSecond,
          latency
        });

      } catch (error) {
        console.error('Sync failed:', error);
        throw error;
      }
    }, 1000), // Throttle to max 1 sync per second
    []
  );

  const chunkArray = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };

  return {
    syncMetrics,
    throttledSync
  };
}
```

### Memory Management for Real-time Data

```jsx
function useDataStreamManager(maxCacheSize = 1000) {
  const [cache, setCache] = useState(new Map());
  const [metrics, setMetrics] = useState({
    cacheSize: 0,
    memoryUsage: 0,
    hitRate: 0
  });

  const cacheHits = useRef(0);
  const cacheMisses = useRef(0);

  const addToCache = useCallback((key, data) => {
    setCache(prev => {
      const newCache = new Map(prev);
      
      // Remove oldest entries if cache is full
      if (newCache.size >= maxCacheSize) {
        const firstKey = newCache.keys().next().value;
        newCache.delete(firstKey);
      }

      newCache.set(key, {
        data,
        timestamp: Date.now(),
        accessCount: 0
      });

      return newCache;
    });
  }, [maxCacheSize]);

  const getFromCache = useCallback((key) => {
    const entry = cache.get(key);
    
    if (entry) {
      cacheHits.current++;
      entry.accessCount++;
      return entry.data;
    } else {
      cacheMisses.current++;
      return null;
    }
  }, [cache]);

  // Update metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const cacheSize = cache.size;
      const memoryUsage = JSON.stringify([...cache.entries()]).length;
      const totalRequests = cacheHits.current + cacheMisses.current;
      const hitRate = totalRequests > 0 ? cacheHits.current / totalRequests : 0;

      setMetrics({
        cacheSize,
        memoryUsage,
        hitRate
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [cache]);

  return {
    addToCache,
    getFromCache,
    metrics,
    clearCache: () => setCache(new Map())
  };
}
```

## Testing Strategies

### Network Condition Testing

```jsx
// __tests__/real-time/network-conditions.test.js
import { render, screen, waitFor } from '@testing-library/react';
import { server } from '../mocks/server';
import { rest } from 'msw';
import RealtimeComponent from '../RealtimeComponent';

describe('Network Condition Handling', () => {
  test('handles slow network gracefully', async () => {
    // Simulate slow network
    server.use(
      rest.post('/api/v1/subscribe', (req, res, ctx) => {
        return res(
          ctx.delay(5000), // 5 second delay
          ctx.json({ success: true })
        );
      })
    );

    render(<RealtimeComponent />);
    
    // Should show loading state
    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
    
    // Should eventually connect
    await waitFor(
      () => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      },
      { timeout: 6000 }
    );
  });

  test('handles intermittent connectivity', async () => {
    let requestCount = 0;
    
    server.use(
      rest.post('/api/v1/subscribe', (req, res, ctx) => {
        requestCount++;
        
        // Fail first two attempts, succeed on third
        if (requestCount <= 2) {
          return res(ctx.status(500));
        }
        
        return res(ctx.json({ success: true }));
      })
    );

    render(<RealtimeComponent />);
    
    // Should show reconnecting status
    await waitFor(() => {
      expect(screen.getByText(/reconnecting/i)).toBeInTheDocument();
    });
    
    // Should eventually connect after retries
    await waitFor(
      () => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });
});
```

### Conflict Resolution Testing

```jsx
// __tests__/real-time/conflict-resolution.test.js
describe('Conflict Resolution', () => {
  test('detects and resolves data conflicts', async () => {
    const localData = { id: '1', name: 'Local Name', updated_at: '2023-01-01T10:00:00Z' };
    const remoteData = { id: '1', name: 'Remote Name', updated_at: '2023-01-01T11:00:00Z' };

    const { detectConflict, resolveConflict } = renderHook(() => useConflictResolver()).result.current;
    
    // Simulate conflict detection
    const conflict = await detectConflict('users', localData, remoteData);
    expect(conflict).toBeTruthy();
    
    // Test resolution
    await resolveConflict(conflict.id, { type: 'use_remote' });
    
    // Verify resolution was applied
    // ... additional assertions
  });
});
```

## Common Pitfalls

### Over-Subscribing to Channels

```jsx
// ❌ Bad: Creating too many subscriptions
function BadSubscriptions() {
  const [workouts, setWorkouts] = useState([]);
  
  // Creates separate subscription for each workout
  workouts.forEach(workout => {
    useRealtimeSubscription(`workout_${workout.id}`, {}, (update) => {
      // Handle individual workout updates
    });
  });
}

// ✅ Good: Single subscription with filtering
function GoodSubscriptions() {
  const [workouts, setWorkouts] = useState([]);
  
  // Single subscription for all user workouts
  useRealtimeSubscription('workouts', { user_id: userId }, (update) => {
    // Handle all workout updates in one place
    setWorkouts(prev => updateWorkoutInList(prev, update));
  });
}
```

### Memory Leaks from Uncleared Listeners

```jsx
// ❌ Bad: Missing cleanup
function BadEventHandling() {
  useEffect(() => {
    const channel = supabase.channel('test');
    channel.on('postgres_changes', {}, handleUpdate);
    channel.subscribe();
    
    // Missing cleanup!
  }, []);
}

// ✅ Good: Proper cleanup
function GoodEventHandling() {
  useEffect(() => {
    const channel = supabase.channel('test');
    channel.on('postgres_changes', {}, handleUpdate);
    channel.subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
```

## Integration Examples

### Complete Real-time Workout Session

```jsx
function RealtimeWorkoutSession({ sessionId }) {
  const { connectionState } = useConnectionManager();
  const { addToSyncQueue } = useSyncManager();
  const [sessionData, setSessionData] = useState(null);
  const [participants, setParticipants] = useState([]);

  // Real-time subscription for session updates
  useRealtimeSubscription(
    'workout_sessions',
    { session_id: sessionId },
    useCallback((payload) => {
      switch (payload.eventType) {
        case 'UPDATE':
          setSessionData(payload.new);
          break;
        case 'participant_joined':
          setParticipants(prev => [...prev, payload.new]);
          break;
        case 'participant_left':
          setParticipants(prev => prev.filter(p => p.id !== payload.old.id));
          break;
      }
    }, [])
  );

  // Optimistic exercise completion
  const completeExercise = useOptimisticMutation(
    async (exerciseData) => {
      const response = await fetch(`/api/v1/sessions/${sessionId}/exercises`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(exerciseData)
      });

      if (!response.ok) {
        throw new Error('Failed to complete exercise');
      }

      return response.json();
    },
    {
      queryKey: ['workoutSession', sessionId],
      optimisticUpdater: (old, variables, optimisticId) => ({
        ...old,
        completedExercises: [
          ...(old?.completedExercises || []),
          { ...variables, id: optimisticId, status: 'pending' }
        ]
      }),
      onError: () => {
        toast.error('Failed to log exercise. Will retry when online.');
        if (connectionState.status === 'disconnected') {
          addToSyncQueue('workout_sessions', 'UPDATE', exerciseData);
        }
      }
    }
  );

  return (
    <div className="space-y-6">
      <ConnectionStatusIndicator />
      <OfflineBanner />
      
      <Card>
        <CardHeader>
          <CardTitle>Live Workout Session</CardTitle>
          <CardDescription>
            Real-time collaboration with {participants.length} participants
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <ParticipantsList participants={participants} />
          <ExerciseProgress
            exercises={sessionData?.exercises}
            onExerciseComplete={completeExercise.mutate}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

This comprehensive real-time updates documentation now provides complete patterns for implementing Supabase realtime integration, optimistic UI updates, offline-first architecture with IndexedDB, conflict resolution, connection management, push notifications, and performance optimization. The patterns ensure the app works seamlessly online and offline while maintaining data consistency and providing excellent user experience. 