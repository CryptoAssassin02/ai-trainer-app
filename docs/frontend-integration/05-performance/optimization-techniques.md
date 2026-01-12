# Frontend Optimization Techniques

## Overview & Performance Goals

The trAIner AI Fitness App requires sophisticated performance optimization to deliver an exceptional user experience across diverse devices and network conditions. As an AI-powered fitness platform with real-time features, advanced visualizations, and complex data synchronization, our optimization strategy must address unique challenges while maintaining the responsiveness expected from modern web applications.

### Performance Targets

Based on Core Web Vitals benchmarks and fitness app user expectations:

- **LCP (Largest Contentful Paint)**: < 2.5s (75th percentile)
- **INP (Interaction to Next Paint)**: < 200ms (replacing FID as of March 2024)
- **CLS (Cumulative Layout Shift)**: < 0.1
- **FCP (First Contentful Paint)**: < 1.8s
- **TTFB (Time to First Byte)**: < 600ms

### Architecture-Specific Considerations

**AI-Powered Features**:
- OpenAI API response streaming for workout generation
- Real-time AI reasoning visualization
- Progressive enhancement for AI-dependent features
- Fallback mechanisms during AI service degradation

**Real-Time Data Synchronization**:
- Supabase real-time subscription optimization
- Optimistic updates for workout logging
- Background data synchronization
- Conflict resolution for offline-first scenarios

**Mobile-First Optimization Priorities**:
- Touch-optimized interfaces with 44px minimum tap targets
- Network-aware content delivery
- Device capability detection and adaptive loading
- Progressive Web App capabilities

**Complex Data Visualizations**:
- Chart rendering optimization with React + Recharts
- Virtual scrolling for large datasets
- Lazy loading of visualization components
- Canvas-based rendering for high-performance charts

---

## Bundle Optimization & Code Splitting

### Current Bundle Analysis

**Existing Dependencies Analysis** (from package.json):
- **UI Library**: Radix UI components (~180KB total)
- **Charts**: Recharts (~85KB)
- **State Management**: TanStack Query (~45KB)
- **AI Integration**: OpenAI (~30KB)
- **Styling**: Tailwind CSS + class-variance-authority
- **Forms**: React Hook Form + Zod validation

### Next.js Bundle Analyzer Setup

**Enhanced next.config.js Configuration**:

```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  // Existing image configuration
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
    minimumCacheTTL: 60,
  },
  
  // Performance optimizations
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'recharts',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast'
    ],
    webVitalsAttribution: ['CLS', 'LCP', 'INP'],
    serverComponentsExternalPackages: ['@tremor/react'],
  },
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // Vendor splitting
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            maxSize: 244000, // ~238KB
          },
          // UI components
          ui: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'ui',
            chunks: 'all',
            maxSize: 200000, // ~195KB
          },
          // Charts
          charts: {
            test: /[\\/]node_modules[\\/]recharts[\\/]/,
            name: 'charts',
            chunks: 'all',
          },
          // Common components
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            enforce: true,
            maxSize: 150000, // ~146KB
          },
        },
      };
    }
    return config;
  },
  
  // Compression
  compress: true,
  
  // Power optimization
  poweredByHeader: false,
};

module.exports = withBundleAnalyzer(nextConfig);
```

**Package.json Scripts Enhancement**:

```json
{
  "scripts": {
    "analyze": "ANALYZE=true npm run build",
    "analyze:server": "BUNDLE_ANALYZE=server npm run build",
    "analyze:browser": "BUNDLE_ANALYZE=browser npm run build",
    "build:profile": "npm run build -- --profile",
    "lighthouse": "lighthouse http://localhost:3000 --output=json --output-path=./lighthouse-report.json"
  }
}
```

### Route-Based Code Splitting

**Current Implementation Analysis** (from components/providers/index.tsx):
```typescript
// ✅ Existing: Dynamic WorkoutProvider loading
const DynamicWorkoutProvider = dynamic(
  () => import('@/contexts/workout-context').then((mod) => mod.WorkoutProvider),
  { ssr: false }
);
```

**Enhanced Route-Level Splitting Strategy**:

```typescript
// app/generate-plan/page.tsx - AI-heavy component
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const WorkoutGenerationInterface = dynamic(
  () => import('@/components/workout/workout-generation-interface'),
  {
    ssr: false,
    loading: () => <WorkoutGenerationSkeleton />
  }
);

const AIReasoningVisualization = dynamic(
  () => import('@/components/ai/ai-reasoning-visualization'),
  {
    ssr: false,
    loading: () => <div className="animate-pulse h-64 bg-gray-200 rounded" />
  }
);

export default function GeneratePlanPage() {
  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<PageSkeleton />}>
        <WorkoutGenerationInterface />
        <AIReasoningVisualization />
      </Suspense>
    </div>
  );
}
```

**Chart and Visualization Splitting**:

```typescript
// components/progress/body-metrics-chart.tsx optimization
import dynamic from 'next/dynamic';

const RechartsWrapper = dynamic(
  () => import('recharts').then((mod) => ({
    LineChart: mod.LineChart,
    Line: mod.Line,
    XAxis: mod.XAxis,
    YAxis: mod.YAxis,
    CartesianGrid: mod.CartesianGrid,
    Tooltip: mod.Tooltip,
    ResponsiveContainer: mod.ResponsiveContainer,
  })),
  {
    ssr: false,
    loading: () => <ChartSkeleton />
  }
);

// Heavy data processing components
const DataVisualizationSuite = dynamic(
  () => import('@/components/analytics/data-visualization-suite'),
  {
    ssr: false,
    loading: () => <DataVisualizationSkeleton />
  }
);
```

### Bundle Size Budgets

**Route-Specific Size Budgets**:

```typescript
const BUNDLE_SIZE_BUDGETS = {
  // Authentication flows
  '/login': { 
    js: '150KB', 
    css: '50KB', 
    total: '200KB',
    description: 'Minimal auth interface'
  },
  
  // Main dashboard
  '/dashboard': { 
    js: '250KB', 
    css: '75KB', 
    total: '325KB',
    description: 'Core features + basic charts'
  },
  
  // Workout management
  '/workouts/*': { 
    js: '200KB', 
    css: '60KB', 
    total: '260KB',
    description: 'Workout logging and history'
  },
  
  // AI-powered plan generation
  '/generate-plan': { 
    js: '180KB', 
    css: '50KB', 
    total: '230KB',
    description: 'AI interface without heavy visualizations'
  },
  
  // Analytics and progress tracking
  '/progress': { 
    js: '300KB', 
    css: '80KB', 
    total: '380KB',
    description: 'Heavy charts and data visualization'
  },
  
  // Data transfer and export
  '/data-transfer': { 
    js: '220KB', 
    css: '55KB', 
    total: '275KB',
    description: 'File processing and export features'
  }
};
```

**Budget Enforcement Implementation**:

```javascript
// scripts/check-bundle-size.js
const fs = require('fs');
const path = require('path');

function checkBundleSizes() {
  const buildManifest = JSON.parse(
    fs.readFileSync('.next/build-manifest.json', 'utf8')
  );
  
  const violations = [];
  
  Object.entries(BUNDLE_SIZE_BUDGETS).forEach(([route, budget]) => {
    const routeAssets = getRouteAssets(buildManifest, route);
    const totalSize = calculateTotalSize(routeAssets);
    
    if (totalSize > parseSize(budget.total)) {
      violations.push({
        route,
        actualSize: formatSize(totalSize),
        budgetSize: budget.total,
        overflow: formatSize(totalSize - parseSize(budget.total))
      });
    }
  });
  
  if (violations.length > 0) {
    console.error('❌ Bundle size budget violations:');
    violations.forEach(v => {
      console.error(`  ${v.route}: ${v.actualSize} (budget: ${v.budgetSize}, over by: ${v.overflow})`);
    });
    process.exit(1);
  } else {
    console.log('✅ All routes within bundle size budgets');
  }
}
```

### Third-Party Library Optimization

**Current Dependency Analysis**:

**Heavy Dependencies**:
- `@radix-ui/*` components: ~180KB total
- `recharts`: ~85KB
- `framer-motion`: ~75KB (if fully imported)
- `lucide-react`: ~60KB (if fully imported)

**Optimization Strategies**:

**1. Radix UI Tree Shaking**:
```typescript
// Instead of importing entire component libraries
// ❌ Avoid
import * as Dialog from '@radix-ui/react-dialog';

// ✅ Optimized - specific imports
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
```

**2. Lucide Icons Optimization**:
```typescript
// utils/icons.ts - Create icon bundle
export {
  Home,
  User,
  Settings,
  Calendar,
  TrendingUp,
  Activity,
  BarChart3,
  Download,
  Upload
} from 'lucide-react';

// Use in components
import { Home, User, Settings } from '@/utils/icons';
```

**3. Recharts Optimization**:
```typescript
// components/charts/optimized-chart.tsx
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer
} from 'recharts/es6';

// Avoid importing entire recharts library
```

**4. Alternative Lightweight Libraries**:

```typescript
// Replace heavy libraries with lighter alternatives
const LIBRARY_ALTERNATIVES = {
  'date-fns': 'day.js', // 2KB vs 67KB
  'lodash': 'modern utilities', // Tree-shakable
  'moment': 'date-fns', // 67KB vs 17KB
  'classnames': 'clsx', // 1KB vs 2KB
};
```

### Advanced Bundle Splitting Strategies

**Micro-Frontend Approach for Heavy Features**:

```typescript
// Advanced splitting for AI features
const AIWorkoutGenerator = dynamic(
  () => import('@/features/ai-workout-generation'),
  {
    ssr: false,
    loading: () => <FeatureSkeleton feature="AI Workout Generation" />
  }
);

const AdvancedAnalytics = dynamic(
  () => import('@/features/advanced-analytics'),
  {
    ssr: false,
    loading: () => <FeatureSkeleton feature="Advanced Analytics" />
  }
);
```

**Progressive Feature Loading**:

```typescript
// utils/progressive-loader.ts
export class ProgressiveFeatureLoader {
  private static loadedFeatures = new Set<string>();
  
  static async loadFeature(featureName: string) {
    if (this.loadedFeatures.has(featureName)) {
      return;
    }
    
    const featureMap = {
      'ai-reasoning': () => import('@/components/ai/ai-reasoning-visualization'),
      'advanced-charts': () => import('@/components/charts/advanced-chart-suite'),
      'data-export': () => import('@/components/data-transfer/export-suite'),
      'real-time-sync': () => import('@/features/real-time-synchronization')
    };
    
    const featureLoader = featureMap[featureName];
    if (featureLoader) {
      await featureLoader();
      this.loadedFeatures.add(featureName);
    }
  }
}
```

---

## React Performance Optimizations

### React 18 Concurrent Features Implementation

**Current State Analysis** (from app/layout.tsx and components/providers/index.tsx):
- Using React 18 with `suppressHydrationWarning`
- Basic dynamic loading implemented for WorkoutProvider
- QueryClient without optimization

**Enhanced Suspense Boundaries for AI Components**:

```typescript
// components/ai/workout-generation-boundary.tsx
import { Suspense, lazy } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

const WorkoutGenerationAgent = lazy(() => 
  import('./workout-generation-agent').then(module => ({
    default: module.WorkoutGenerationAgent
  }))
);

const AIReasoningVisualization = lazy(() => 
  import('./ai-reasoning-visualization')
);

function WorkoutGenerationSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-3/4"></div>
      <div className="h-64 bg-gray-200 rounded"></div>
      <div className="h-12 bg-gray-200 rounded w-1/2"></div>
    </div>
  );
}

export function WorkoutGenerationBoundary() {
  return (
    <ErrorBoundary fallback={<AIErrorFallback />}>
      <Suspense fallback={<WorkoutGenerationSkeleton />}>
        <WorkoutGenerationAgent />
        <Suspense fallback={<div className="h-32 bg-gray-100 rounded animate-pulse" />}>
          <AIReasoningVisualization />
        </Suspense>
      </Suspense>
    </ErrorBoundary>
  );
}
```

**Streaming SSR Optimization**:

```typescript
// app/workouts/page.tsx
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { Suspense } from 'react';

export default function WorkoutsPage() {
  return (
    <div className="container mx-auto py-6">
      {/* Critical above-the-fold content */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Your Workouts</h1>
      </div>
      
      {/* Stream in heavy components */}
      <Suspense fallback={<WorkoutListSkeleton />}>
        <WorkoutList />
      </Suspense>
      
      <Suspense fallback={<ChartSkeleton />}>
        <WorkoutProgressChart />
      </Suspense>
    </div>
  );
}
```

### Component Optimization Patterns

**Enhanced React.memo Implementation** (for components/progress/body-metrics-chart.tsx):

```typescript
import React, { memo, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface BodyMetricsChartProps {
  data: MetricData[];
  selectedMetric: string;
  dateRange: [Date, Date];
  isLoading?: boolean;
}

// Memoized chart component with custom comparison
const BodyMetricsChart = memo<BodyMetricsChartProps>(({
  data,
  selectedMetric,
  dateRange,
  isLoading = false
}) => {
  // Memoize expensive calculations
  const chartData = useMemo(() => {
    if (!data?.length) return [];
    
    return data
      .filter(item => {
        const date = new Date(item.date);
        return date >= dateRange[0] && date <= dateRange[1];
      })
      .map(item => ({
        date: item.date,
        value: item[selectedMetric],
        trend: calculateTrend(item, selectedMetric)
      }));
  }, [data, selectedMetric, dateRange]);
  
  // Memoize event handlers
  const handleDataPointClick = useCallback((data: any, index: number) => {
    // Handle chart interaction
    console.log('Chart point clicked:', data, index);
  }, []);
  
  // Early return for loading state
  if (isLoading) {
    return <ChartSkeleton />;
  }
  
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} onClick={handleDataPointClick}>
          <XAxis dataKey="date" />
          <YAxis />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#3E9EFF" 
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  return (
    prevProps.selectedMetric === nextProps.selectedMetric &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.dateRange[0].getTime() === nextProps.dateRange[0].getTime() &&
    prevProps.dateRange[1].getTime() === nextProps.dateRange[1].getTime() &&
    JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data)
  );
});

export { BodyMetricsChart };
```

**Context API Optimization** (enhancement for lib/profile-context.tsx):

```typescript
// Optimized ProfileContext implementation
import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";

// Split context into data and actions for better re-render control
const ProfileDataContext = createContext<ProfileData | undefined>(undefined);
const ProfileActionsContext = createContext<ProfileActions | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Memoize data context value
  const dataValue = useMemo(() => ({
    profile,
    isProfileComplete: requiredFields.every((field) => Boolean(profile[field])),
    isLoading,
    error
  }), [profile, isLoading, error]);
  
  // Memoize action context value (prevents unnecessary re-renders)
  const actionsValue = useMemo(() => ({
    updateProfile: useCallback(async (data: Partial<UserProfile>) => {
      // Implementation...
    }, [profile]),
    
    refreshProfile: useCallback(async () => {
      // Implementation...
    }, []),
    
    clearError: useCallback(() => {
      setError(null);
    }, [])
  }), [profile]);
  
  return (
    <ProfileDataContext.Provider value={dataValue}>
      <ProfileActionsContext.Provider value={actionsValue}>
        {children}
      </ProfileActionsContext.Provider>
    </ProfileDataContext.Provider>
  );
}

// Separate hooks for data and actions
export function useProfileData() {
  const context = useContext(ProfileDataContext);
  if (!context) throw new Error("useProfileData must be used within ProfileProvider");
  return context;
}

export function useProfileActions() {
  const context = useContext(ProfileActionsContext);
  if (!context) throw new Error("useProfileActions must be used within ProfileProvider");
  return context;
}
```

### Virtual Scrolling Implementation

**Large Workout Log Lists**:

```typescript
// components/workout/virtual-workout-list.tsx
import { FixedSizeList as List } from 'react-window';
import { useMemo } from 'react';

interface VirtualWorkoutListProps {
  workouts: Workout[];
  height: number;
  itemHeight: number;
}

function WorkoutItem({ index, style, data }: { 
  index: number; 
  style: React.CSSProperties; 
  data: Workout[] 
}) {
  const workout = data[index];
  
  return (
    <div style={style} className="p-4 border-b border-gray-200">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">{workout.name}</h3>
        <span className="text-sm text-gray-500">{workout.date}</span>
      </div>
      <p className="text-sm text-gray-600">{workout.exercises.length} exercises</p>
    </div>
  );
}

export function VirtualWorkoutList({ workouts, height, itemHeight }: VirtualWorkoutListProps) {
  const memoizedWorkouts = useMemo(() => workouts, [workouts]);
  
  return (
    <List
      height={height}
      itemCount={workouts.length}
      itemSize={itemHeight}
      itemData={memoizedWorkouts}
      overscanCount={5}
    >
      {WorkoutItem}
    </List>
  );
}
```

**Exercise Database Browsing**:

```typescript
// components/exercise/virtual-exercise-browser.tsx
import { VariableSizeList as List } from 'react-window';
import { useState, useMemo, useCallback } from 'react';

interface VirtualExerciseBrowserProps {
  exercises: Exercise[];
  onExerciseSelect: (exercise: Exercise) => void;
}

export function VirtualExerciseBrowser({ exercises, onExerciseSelect }: VirtualExerciseBrowserProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredExercises = useMemo(() => {
    if (!searchTerm) return exercises;
    return exercises.filter(exercise => 
      exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exercise.muscleGroup.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [exercises, searchTerm]);
  
  const getItemSize = useCallback((index: number) => {
    const exercise = filteredExercises[index];
    // Dynamic height based on content
    const baseHeight = 80;
    const descriptionHeight = exercise.description ? 40 : 0;
    return baseHeight + descriptionHeight;
  }, [filteredExercises]);
  
  return (
    <div className="h-96">
      <input
        type="text"
        placeholder="Search exercises..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full p-2 mb-4 border border-gray-300 rounded"
      />
      
      <List
        height={320}
        itemCount={filteredExercises.length}
        itemSize={getItemSize}
        itemData={{ exercises: filteredExercises, onSelect: onExerciseSelect }}
      >
        {ExerciseItem}
      </List>
    </div>
  );
}
```

### Debouncing & Throttling

**Search Functionality Optimization**:

```typescript
// hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// components/search/debounced-search.tsx
import { useState, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

export function DebouncedExerciseSearch({ onSearch }: { onSearch: (term: string) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  useMemo(() => {
    if (debouncedSearchTerm) {
      onSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, onSearch]);
  
  return (
    <input
      type="text"
      placeholder="Search exercises..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="w-full p-2 border border-gray-300 rounded"
    />
  );
}
```

**Real-time AI Suggestions**:

```typescript
// hooks/useThrottle.ts
import { useRef, useCallback } from 'react';

export function useThrottle<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());
  
  return useCallback((...args: any[]) => {
    if (Date.now() - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = Date.now();
    }
  }, [callback, delay]) as T;
}

// components/ai/throttled-suggestions.tsx
export function ThrottledAISuggestions({ userInput }: { userInput: string }) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const throttledGetSuggestions = useThrottle(async (input: string) => {
    if (input.length > 3) {
      const aiSuggestions = await getAISuggestions(input);
      setSuggestions(aiSuggestions);
    }
  }, 500);
  
  useEffect(() => {
    throttledGetSuggestions(userInput);
  }, [userInput, throttledGetSuggestions]);
  
  return (
    <div className="suggestions-list">
      {suggestions.map((suggestion, index) => (
        <div key={index} className="suggestion-item p-2 hover:bg-gray-100">
          {suggestion}
        </div>
      ))}
    </div>
  );
}
```

---

## Critical Rendering Path Optimization

### Above-the-Fold Content Prioritization

**Current Implementation Analysis** (from app/layout.tsx):
- Using Inter font from Google Fonts
- Basic dark mode theme setup
- No critical CSS extraction

**Enhanced Critical CSS Implementation**:

```css
/* app/critical.css - Inline critical styles */
.critical-above-fold {
  /* Navigation */
  .header {
    position: fixed;
    top: 0;
    width: 100%;
    height: 64px;
    background: #121212;
    z-index: 50;
  }
  
  /* Hero section */
  .hero-section {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #121212 0%, #1a1a1a 100%);
  }
  
  /* Primary CTA button */
  .cta-primary {
    background: #3E9EFF;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .cta-primary:hover {
    background: #2c87e6;
  }
}
```

**Font Loading Optimization** (enhancement for app/layout.tsx):

```typescript
import { Inter } from 'next/font/google';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial'],
  adjustFontFallback: false
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Critical font preload */}
        <link
          rel="preload"
          href="/fonts/inter-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        
        {/* Critical CSS */}
        <style dangerouslySetInnerHTML={{ __html: criticalCSS }} />
      </head>
      <body className={`${inter.className} bg-background text-foreground min-h-screen antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

### Progressive Loading Strategies

**Progressive Image Loading**:

```typescript
// components/ui/progressive-image.tsx
import Image from 'next/image';
import { useState } from 'react';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
}

export function ProgressiveImage({ 
  src, 
  alt, 
  width, 
  height, 
  priority = false,
  className 
}: ProgressiveImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Low quality placeholder */}
      {isLoading && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{ aspectRatio: `${width}/${height}` }}
        />
      )}
      
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkbHB0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyejFhZWzjvotEW17u/OV94PMNAx/2FiGDcCuNMo/i9gy5oBIjQNPvdJQ+XGIcXmqrJ3JhWMgA8cHuJp8fQAFhQFI9c1jhR7tG"
        onLoad={() => setIsLoading(false)}
        className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );
}
```

### LCP Optimization Techniques

**Image Optimization Strategies**:

```typescript
// next.config.js enhancement for images
const nextConfig = {
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
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Resource hints
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Link',
            value: '</fonts/inter-var.woff2>; rel=preload; as=font; type=font/woff2; crossorigin',
          },
        ],
      },
    ];
  },
};
```

**Resource Prioritization**:

```typescript
// components/layout/resource-hints.tsx
export function ResourceHints() {
  return (
    <>
      {/* DNS prefetch for external resources */}
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      <link rel="dns-prefetch" href="//api.openai.com" />
      
      {/* Preconnect to critical domains */}
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      
      {/* Prefetch likely next pages */}
      <link rel="prefetch" href="/dashboard" />
      <link rel="prefetch" href="/workouts" />
      
      {/* Preload critical assets */}
      <link
        rel="preload"
        href="/critical-icons.svg"
        as="image"
        type="image/svg+xml"
      />
    </>
  );
}
```

### CLS Prevention

**Layout Shift Mitigation**:

```typescript
// components/ui/aspect-ratio-container.tsx
interface AspectRatioContainerProps {
  aspectRatio: number;
  children: React.ReactNode;
  className?: string;
}

export function AspectRatioContainer({ 
  aspectRatio, 
  children, 
  className 
}: AspectRatioContainerProps) {
  return (
    <div 
      className={`relative w-full ${className}`}
      style={{ paddingBottom: `${(1 / aspectRatio) * 100}%` }}
    >
      <div className="absolute inset-0">
        {children}
      </div>
    </div>
  );
}

// Usage for charts to prevent layout shift
export function ChartContainer({ children }: { children: React.ReactNode }) {
  return (
    <AspectRatioContainer aspectRatio={16/9} className="bg-gray-50 rounded-lg">
      {children}
    </AspectRatioContainer>
  );
}
```

**Skeleton Loading States**:

```typescript
// components/ui/skeleton-loaders.tsx
export function WorkoutListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="p-4 border border-gray-200 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="w-full h-64 bg-gray-200 rounded-lg animate-pulse">
      <div className="flex items-end justify-between h-full p-4">
        {Array.from({ length: 7 }).map((_, index) => (
          <div 
            key={index}
            className="bg-gray-300 rounded-t"
            style={{ 
              height: `${Math.random() * 80 + 20}%`,
              width: '12%' 
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## Asset & Image Optimization

### Next.js Image Component Advanced Usage

**WebP/AVIF Format Serving**:

```typescript
// components/ui/optimized-image.tsx
import Image from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  quality?: number;
  sizes?: string;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  quality = 85,
  sizes,
}: OptimizedImageProps) {
  const [error, setError] = useState(false);
  
  if (error) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-200 text-gray-500"
        style={{ width, height }}
      >
        Image failed to load
      </div>
    );
  }
  
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      quality={quality}
      sizes={sizes || `(max-width: 768px) 100vw, (max-width: 1200px) 50vw, ${width}px`}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/..."
      onError={() => setError(true)}
      className="object-cover"
    />
  );
}
```

**Responsive Image Strategies**:

```typescript
// components/ui/responsive-hero-image.tsx
export function ResponsiveHeroImage({ src, alt }: { src: string; alt: string }) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={1920}
      height={1080}
      priority={true}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 1200px"
      quality={90}
    />
  );
}

// For profile avatars
export function AvatarImage({ src, alt, size = 96 }: { 
  src: string; 
  alt: string; 
  size?: number; 
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      sizes={`${size}px`}
      quality={75}
    />
  );
}
```

### Font Optimization

**Enhanced Font Loading** (improvement for app/layout.tsx):

```typescript
import { Inter, Roboto_Mono } from 'next/font/google';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif']
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  fallback: ['Monaco', 'Menlo', 'monospace']
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${robotoMono.variable}`}>
      <head>
        {/* Font optimization */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Icon Optimization

**SVG Sprite Implementation**:

```typescript
// utils/icons/svg-sprite.tsx
export function IconSprite() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'none' }}
      aria-hidden="true"
    >
      <defs>
        <symbol id="icon-home" viewBox="0 0 24 24">
          <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </symbol>
        <symbol id="icon-user" viewBox="0 0 24 24">
          <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </symbol>
        {/* Add more icons as needed */}
      </defs>
    </svg>
  );
}

// Icon component that uses the sprite
interface IconProps {
  name: string;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 24, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={`fill-current ${className}`}
      aria-hidden="true"
    >
      <use href={`#icon-${name}`} />
    </svg>
  );
}
```

**Tree-Shaken Icon Libraries**:

```typescript
// utils/icons/optimized-icons.ts
// Only import icons that are actually used
export {
  Home,
  User,
  Settings,
  Calendar,
  TrendingUp,
  Activity,
  BarChart3,
  Download,
  Upload,
  Menu,
  X,
  ChevronDown,
  Check,
  AlertCircle
} from 'lucide-react';

// Create a mapping for dynamic icon selection
export const iconMap = {
  home: Home,
  user: User,
  settings: Settings,
  calendar: Calendar,
  trending: TrendingUp,
  activity: Activity,
  chart: BarChart3,
  download: Download,
  upload: Upload,
  menu: Menu,
  close: X,
  chevronDown: ChevronDown,
  check: Check,
  alert: AlertCircle
} as const;

export type IconName = keyof typeof iconMap;
```

---

## Mobile Performance Optimization

### Device Capability Detection

**Network and Device Information**:

```typescript
// utils/device-detection.ts
export interface DeviceCapabilities {
  effectiveType: string;
  memory: number;
  cores: number;
  isMobile: boolean;
  isLowEndDevice: boolean;
  networkSpeed: 'slow' | 'fast' | 'unknown';
}

export function detectDeviceCapabilities(): DeviceCapabilities {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  const memory = (navigator as any).deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const isMobile = window.innerWidth < 768;
  
  // Determine if it's a low-end device
  const isLowEndDevice = memory <= 2 || cores <= 2;
  
  // Network speed classification
  const effectiveType = connection?.effectiveType || '4g';
  const networkSpeed = effectiveType === 'slow-2g' || effectiveType === '2g' ? 'slow' :
                      effectiveType === '3g' || effectiveType === '4g' ? 'fast' : 'unknown';
  
  return {
    effectiveType,
    memory,
    cores,
    isMobile,
    isLowEndDevice,
    networkSpeed
  };
}

// React hook for device capabilities
export function useDeviceCapabilities() {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null);
  
  useEffect(() => {
    setCapabilities(detectDeviceCapabilities());
  }, []);
  
  return capabilities;
}
```

### Adaptive Loading Strategies

**Network-Aware Content Delivery**:

```typescript
// components/adaptive/network-aware-component.tsx
import { useDeviceCapabilities } from '@/utils/device-detection';

interface NetworkAwareComponentProps {
  highQualityComponent: React.ComponentType;
  lowQualityComponent: React.ComponentType;
  children?: React.ReactNode;
}

export function NetworkAwareComponent({
  highQualityComponent: HighQualityComponent,
  lowQualityComponent: LowQualityComponent,
  children
}: NetworkAwareComponentProps) {
  const capabilities = useDeviceCapabilities();
  
  if (!capabilities) {
    return <LowQualityComponent />;
  }
  
  const shouldUseLowQuality = 
    capabilities.networkSpeed === 'slow' || 
    capabilities.isLowEndDevice;
  
  return shouldUseLowQuality ? <LowQualityComponent /> : <HighQualityComponent />;
}

// Usage example
export function AdaptiveChartContainer() {
  return (
    <NetworkAwareComponent
      highQualityComponent={() => (
        <Suspense fallback={<ChartSkeleton />}>
          <AdvancedInteractiveChart />
        </Suspense>
      )}
      lowQualityComponent={() => (
        <StaticChartImage />
      )}
    />
  );
}
```

**Progressive Enhancement**:

```typescript
// hooks/useProgressiveEnhancement.ts
export function useProgressiveEnhancement() {
  const [canUseAdvancedFeatures, setCanUseAdvancedFeatures] = useState(false);
  const capabilities = useDeviceCapabilities();
  
  useEffect(() => {
    if (!capabilities) return;
    
    const canUseAdvanced = 
      capabilities.memory > 2 && 
      capabilities.cores > 2 && 
      capabilities.networkSpeed !== 'slow';
    
    setCanUseAdvancedFeatures(canUseAdvanced);
  }, [capabilities]);
  
  return {
    canUseAdvancedFeatures,
    canUseAnimations: canUseAdvancedFeatures && !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    canUseHeavyComponents: canUseAdvancedFeatures,
    shouldLazyLoad: !canUseAdvancedFeatures
  };
}
```

### Touch-Optimized Interactions

**Gesture Handling Optimization**:

```typescript
// hooks/useOptimizedTouch.ts
import { useCallback, useRef } from 'react';

export function useOptimizedTouch() {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  }, []);
  
  const handleTouchEnd = useCallback((e: React.TouchEvent, onTap?: () => void, onSwipe?: (direction: string) => void) => {
    if (!touchStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Tap detection
    if (distance < 10 && deltaTime < 300) {
      onTap?.();
      return;
    }
    
    // Swipe detection
    if (distance > 50 && deltaTime < 500) {
      const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
      let direction: string;
      
      if (angle > -45 && angle < 45) direction = 'right';
      else if (angle > 45 && angle < 135) direction = 'down';
      else if (angle > 135 || angle < -135) direction = 'left';
      else direction = 'up';
      
      onSwipe?.(direction);
    }
    
    touchStartRef.current = null;
  }, []);
  
  return { handleTouchStart, handleTouchEnd };
}
```

**Touch Target Sizing**:

```typescript
// components/ui/touch-optimized-button.tsx
interface TouchOptimizedButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TouchOptimizedButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = ''
}: TouchOptimizedButtonProps) {
  const sizeClasses = {
    sm: 'min-h-[44px] px-4 py-2 text-sm',  // 44px minimum for accessibility
    md: 'min-h-[48px] px-6 py-3 text-base',
    lg: 'min-h-[52px] px-8 py-4 text-lg'
  };
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400'
  };
  
  return (
    <button
      onClick={onClick}
      className={`
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        rounded-lg font-medium transition-colors duration-150
        touch-manipulation select-none
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        active:scale-95 transition-transform
        ${className}
      `}
      style={{
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation'
      }}
    >
      {children}
    </button>
  );
}
```

**Scroll Performance**:

```typescript
// hooks/useOptimizedScroll.ts
import { useCallback, useEffect, useRef } from 'react';

export function useOptimizedScroll(
  onScroll?: (scrollTop: number) => void,
  throttleMs: number = 16
) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();
  const lastScrollTop = useRef(0);
  
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    rafRef.current = requestAnimationFrame(() => {
      if (!scrollRef.current) return;
      
      const scrollTop = scrollRef.current.scrollTop;
      
      // Only call onScroll if scroll position changed significantly
      if (Math.abs(scrollTop - lastScrollTop.current) > 1) {
        onScroll?.(scrollTop);
        lastScrollTop.current = scrollTop;
      }
    });
  }, [onScroll]);
  
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    
    element.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      element.removeEventListener('scroll', handleScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [handleScroll]);
  
  return scrollRef;
}
```

### Reduced Motion Preferences

**Motion-Sensitive Component Implementation**:

```typescript
// hooks/useReducedMotion.ts
import { useEffect, useState } from 'react';

export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return prefersReducedMotion;
}

// components/ui/motion-safe-animation.tsx
interface MotionSafeAnimationProps {
  children: React.ReactNode;
  animation: string;
  duration?: number;
  delay?: number;
}

export function MotionSafeAnimation({
  children,
  animation,
  duration = 300,
  delay = 0
}: MotionSafeAnimationProps) {
  const prefersReducedMotion = useReducedMotion();
  
  const animationStyle = prefersReducedMotion ? {} : {
    animation: `${animation} ${duration}ms ease-in-out ${delay}ms`,
  };
  
  return (
    <div style={animationStyle} className={prefersReducedMotion ? '' : 'will-change-transform'}>
      {children}
    </div>
  );
}
```

---

This comprehensive optimization techniques document covers all aspects of frontend performance optimization for the trAIner AI Fitness App, from bundle optimization and React performance patterns to mobile-specific optimizations and accessibility considerations. Each section includes practical code examples based on the current codebase implementation and research-backed best practices for 2025. 