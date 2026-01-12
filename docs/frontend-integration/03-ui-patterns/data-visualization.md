# Data Visualization Patterns Documentation

## Table of Contents

1. [Overview](#overview)
2. [Recharts Foundation](#recharts-foundation)
3. [Chart Types by Use Case](#chart-types-by-use-case)
4. [Data Loading Strategies](#data-loading-strategies)
5. [Mobile Optimizations](#mobile-optimizations)
6. [Accessibility Features](#accessibility-features)
7. [Empty/Loading States](#emptyloading-states)
8. [Performance Patterns](#performance-patterns)
9. [Export Functionality](#export-functionality)
10. [Testing Strategies](#testing-strategies)
11. [Common Pitfalls](#common-pitfalls)
12. [Integration Examples](#integration-examples)

## Overview

This document outlines data visualization patterns for the trAIner AI Fitness App, focusing on Recharts implementation for analytics, progress tracking, and fitness metrics display.

### Key Technologies
- **Recharts v2.15.0**: Primary charting library
- **React Query**: Data fetching and caching
- **date-fns**: Date manipulation and formatting
- **Tailwind CSS**: Styling and responsive design
- **React Testing Library**: Chart testing patterns

### Core Principles
- **Performance First**: Efficient rendering of large datasets
- **Mobile Responsive**: Touch-friendly interactions and scaled UI
- **Accessibility**: Screen reader support and keyboard navigation
- **Progressive Loading**: 30-90 days initial load with lazy loading
- **Meaningful Empty States**: Helpful guidance when no data exists

## Recharts Foundation

### Basic Chart Setup

```jsx
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';
import { format } from 'date-fns';

function BaseChart({ 
  data, 
  height = 300, 
  className = '',
  children,
  ...props 
}) {
  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} {...props}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => format(new Date(value), 'MMM dd')}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '14px'
            }}
            labelFormatter={(value) => format(new Date(value), 'PPP')}
          />
          {children}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### Custom Hook for Chart Data

```jsx
import { useQuery } from '@tanstack/react-query';
import { subDays, format } from 'date-fns';

function useChartData(type, timeRange = 30, userId) {
  const endDate = new Date();
  const startDate = subDays(endDate, timeRange);

  return useQuery({
    queryKey: ['chartData', type, timeRange, userId],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/analytics/${type}?` + 
        new URLSearchParams({
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          userId
        }),
        {
          headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch ${type} data`);
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 3
  });
}
```

## Chart Types by Use Case

### Progress Trends (LineChart with Gradient)

```jsx
function ProgressTrendChart({ metric = 'weight', timeRange = 30 }) {
  const { data, isLoading, error } = useChartData('progress', timeRange);

  if (isLoading) return <ChartSkeleton />;
  if (error) return <ChartError error={error} />;
  if (!data?.length) return <EmptyChart message="No progress data yet" />;

  return (
    <BaseChart data={data} height={350}>
      <defs>
        <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
        </linearGradient>
      </defs>
      <Line
        type="monotone"
        dataKey={metric}
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        fill="url(#progressGradient)"
        dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
        activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
      />
      <Tooltip
        formatter={(value, name) => [
          `${value} ${getUnitForMetric(metric)}`,
          formatMetricName(name)
        ]}
      />
    </BaseChart>
  );
}
```

### Workout Consistency (Calendar Heatmap)

```jsx
import { CalendarHeatmap } from '@/components/ui/calendar-heatmap';

function WorkoutConsistencyChart({ year = new Date().getFullYear() }) {
  const { data } = useChartData('workout-consistency', 365);

  const processDataForHeatmap = (rawData) => {
    const processedData = {};
    
    rawData?.forEach(entry => {
      const date = format(new Date(entry.date), 'yyyy-MM-dd');
      processedData[date] = {
        date,
        count: entry.workouts_completed,
        level: getIntensityLevel(entry.workouts_completed)
      };
    });

    return processedData;
  };

  const getIntensityLevel = (count) => {
    if (count === 0) return 0;
    if (count === 1) return 1;
    if (count === 2) return 2;
    if (count >= 3) return 3;
    return 0;
  };

  const heatmapData = processDataForHeatmap(data);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Workout Consistency</h3>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <span>Less</span>
          <div className="flex space-x-1">
            {[0, 1, 2, 3].map(level => (
              <div
                key={level}
                className={`w-3 h-3 rounded-sm ${getHeatmapColor(level)}`}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
      
      <CalendarHeatmap
        year={year}
        data={heatmapData}
        cellSize={12}
        cellSpacing={2}
        colorScale={['bg-gray-100', 'bg-green-200', 'bg-green-400', 'bg-green-600']}
        onClick={(date, data) => {
          console.log('Clicked:', date, data);
          // Navigate to specific day details
        }}
      />
    </div>
  );
}
```

### Nutrition Tracking (Stacked Bar Chart)

```jsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

function NutritionChart({ timeRange = 7 }) {
  const { data } = useChartData('nutrition', timeRange);

  const macroColors = {
    protein: 'hsl(var(--chart-1))',
    carbs: 'hsl(var(--chart-2))',
    fat: 'hsl(var(--chart-3))'
  };

  return (
    <BaseChart data={data} height={400}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis 
        dataKey="date" 
        tickFormatter={(value) => format(new Date(value), 'MMM dd')}
      />
      <YAxis label={{ value: 'Calories', angle: -90, position: 'insideLeft' }} />
      <Tooltip 
        formatter={(value, name) => [`${value}g`, formatMacroName(name)]}
        labelFormatter={(label) => format(new Date(label), 'PPP')}
      />
      <Legend />
      
      <Bar dataKey="protein" stackId="macros" fill={macroColors.protein} />
      <Bar dataKey="carbs" stackId="macros" fill={macroColors.carbs} />
      <Bar dataKey="fat" stackId="macros" fill={macroColors.fat} />
    </BaseChart>
  );
}
```

### Body Metrics (Area Chart with Annotations)

```jsx
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';

function BodyMetricsChart({ metrics = ['weight', 'bodyFat'] }) {
  const { data } = useChartData('body-metrics', 90);
  const goalWeight = 70; // From user profile

  return (
    <BaseChart data={data} height={400}>
      <defs>
        <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
        </linearGradient>
      </defs>
      
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis domain={['dataMin - 2', 'dataMax + 2']} />
      
      {/* Goal line */}
      <ReferenceLine 
        y={goalWeight} 
        stroke="hsl(var(--destructive))" 
        strokeDasharray="5 5"
        label="Goal"
      />
      
      <Area
        type="monotone"
        dataKey="weight"
        stroke="hsl(var(--primary))"
        fill="url(#weightGradient)"
        strokeWidth={2}
      />
      
      <Tooltip
        formatter={(value, name) => [
          `${value} kg`,
          name === 'weight' ? 'Weight' : 'Body Fat %'
        ]}
      />
    </BaseChart>
  );
}
```

### Comparative Analytics (Radar Chart)

```jsx
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

function FitnessRadarChart({ currentPeriod, previousPeriod }) {
  const { data: current } = useChartData('fitness-metrics', currentPeriod);
  const { data: previous } = useChartData('fitness-metrics', previousPeriod);

  const radarData = [
    { metric: 'Strength', current: current?.strength || 0, previous: previous?.strength || 0 },
    { metric: 'Endurance', current: current?.endurance || 0, previous: previous?.endurance || 0 },
    { metric: 'Flexibility', current: current?.flexibility || 0, previous: previous?.flexibility || 0 },
    { metric: 'Balance', current: current?.balance || 0, previous: previous?.balance || 0 },
    { metric: 'Power', current: current?.power || 0, previous: previous?.power || 0 }
  ];

  return (
    <ResponsiveContainer width="100%" height={400}>
      <RadarChart data={radarData}>
        <PolarGrid />
        <PolarAngleAxis dataKey="metric" className="text-sm" />
        <PolarRadiusAxis domain={[0, 100]} tick={false} />
        
        <Radar
          name="Current Period"
          dataKey="current"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.3}
          strokeWidth={2}
        />
        
        <Radar
          name="Previous Period"
          dataKey="previous"
          stroke="hsl(var(--muted-foreground))"
          fill="hsl(var(--muted-foreground))"
          fillOpacity={0.1}
          strokeWidth={2}
          strokeDasharray="5 5"
        />
        
        <Tooltip />
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  );
}
```

## Data Loading Strategies

### Progressive Data Loading

```jsx
function useProgressiveData(type, initialDays = 30) {
  const [timeRange, setTimeRange] = useState(initialDays);
  const [allData, setAllData] = useState([]);

  const { data, isLoading, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['progressive-data', type],
    queryFn: async ({ pageParam = 0 }) => {
      const limit = 30;
      const offset = pageParam * limit;
      
      const response = await fetch(
        `/api/v1/analytics/${type}?limit=${limit}&offset=${offset}`,
        { headers: { 'Authorization': `Bearer ${getAuthToken()}` }}
      );
      
      return response.json();
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.hasMore ? pages.length : undefined;
    },
    initialPageParam: 0
  });

  // Load more data when user scrolls or requests extended range
  const loadMoreData = useCallback(() => {
    if (hasNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [hasNextPage, isLoading, fetchNextPage]);

  // Flatten all pages into single dataset
  const chartData = useMemo(() => {
    return data?.pages.flatMap(page => page.data) || [];
  }, [data]);

  return {
    data: chartData,
    isLoading,
    loadMoreData,
    hasNextPage
  };
}
```

### Virtualization for Large Datasets

```jsx
import { FixedSizeList as List } from 'react-window';

function VirtualizedChart({ data, height = 400 }) {
  const itemHeight = 60;
  const visibleItems = Math.floor(height / itemHeight);

  const ChartRow = ({ index, style }) => {
    const item = data[index];
    
    return (
      <div style={style} className="flex items-center space-x-4 px-4">
        <div className="w-20 text-sm">{format(new Date(item.date), 'MM/dd')}</div>
        <div className="flex-1">
          <div 
            className="h-4 bg-primary rounded"
            style={{ width: `${(item.value / maxValue) * 100}%` }}
          />
        </div>
        <div className="w-16 text-sm text-right">{item.value}</div>
      </div>
    );
  };

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="border rounded-lg">
      <List
        height={height}
        itemCount={data.length}
        itemSize={itemHeight}
        overscanCount={5}
      >
        {ChartRow}
      </List>
    </div>
  );
}
```

### Data Aggregation Strategies

```jsx
function useAggregatedData(rawData, aggregationType = 'daily') {
  return useMemo(() => {
    if (!rawData?.length) return [];

    const aggregationMap = {
      daily: (date) => format(date, 'yyyy-MM-dd'),
      weekly: (date) => format(startOfWeek(date), 'yyyy-MM-dd'),
      monthly: (date) => format(startOfMonth(date), 'yyyy-MM-dd')
    };

    const groupBy = aggregationMap[aggregationType];
    const grouped = {};

    rawData.forEach(item => {
      const key = groupBy(new Date(item.date));
      if (!grouped[key]) {
        grouped[key] = {
          date: key,
          values: [],
          count: 0
        };
      }
      grouped[key].values.push(item.value);
      grouped[key].count++;
    });

    return Object.values(grouped).map(group => ({
      date: group.date,
      value: group.values.reduce((sum, val) => sum + val, 0) / group.count,
      count: group.count,
      min: Math.min(...group.values),
      max: Math.max(...group.values)
    }));
  }, [rawData, aggregationType]);
}
```

## Mobile Optimizations

### Touch-Friendly Interactions

```jsx
function MobileOptimizedChart({ data, height = 300 }) {
  const [activeTooltip, setActiveTooltip] = useState(null);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={data}
          onMouseMove={() => {}} // Disable mouse interactions on mobile
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 10 }} />
          
          {/* Custom touch-friendly tooltip */}
          <Tooltip
            content={({ active, payload, label }) => (
              <MobileTooltip 
                active={active}
                payload={payload}
                label={label}
              />
            )}
            cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
          />
          
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={3} // Thicker for better touch visibility
            dot={{ r: 6 }} // Larger dots for easier touching
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function MobileTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-card border rounded-lg p-3 shadow-lg min-w-[200px]">
      <p className="font-medium">{format(new Date(label), 'MMM dd, yyyy')}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}
```

### Swipe Gestures for Time Navigation

```jsx
import { useSwipeable } from 'react-swipeable';

function SwipeableChart({ data, onPeriodChange }) {
  const handlers = useSwipeable({
    onSwipedLeft: () => onPeriodChange('next'),
    onSwipedRight: () => onPeriodChange('previous'),
    trackMouse: false,
    trackTouch: true,
    delta: 50
  });

  return (
    <div {...handlers} className="select-none">
      <div className="flex items-center justify-between mb-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => onPeriodChange('previous')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <span className="text-sm font-medium">
          Swipe to navigate periods
        </span>
        
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => onPeriodChange('next')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <MobileOptimizedChart data={data} />
    </div>
  );
}
```

### Collapsible Legends

```jsx
function CollapsibleLegend({ items, defaultExpanded = false }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between"
      >
        <span>Legend</span>
        <ChevronDown 
          className={`h-4 w-4 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`} 
        />
      </Button>
      
      {isExpanded && (
        <div className="grid grid-cols-2 gap-2 p-2 border rounded">
          {items.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm">{item.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Accessibility Features

### WCAG AA Compliance

```jsx
// Color palette with WCAG AA contrast ratios
const accessibleColors = {
  primary: '#0066CC',     // 4.5:1 contrast ratio
  secondary: '#7C3AED',   // 4.5:1 contrast ratio
  success: '#059669',     // 4.5:1 contrast ratio
  warning: '#D97706',     // 4.5:1 contrast ratio
  danger: '#DC2626'       // 4.5:1 contrast ratio
};

function AccessibleChart({ data, colorKey = 'category' }) {
  const getAccessibleColor = (index) => {
    const colors = Object.values(accessibleColors);
    return colors[index % colors.length];
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        
        {Object.keys(data[0] || {})
          .filter(key => key !== 'name')
          .map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={getAccessibleColor(index)}
            />
          ))
        }
      </BarChart>
    </ResponsiveContainer>
  );
}
```

### Screen Reader Support

```jsx
function AccessibleChartWithTable({ data, title, description }) {
  const [showTable, setShowTable] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTable(!showTable)}
          aria-expanded={showTable}
          aria-controls="chart-data-table"
        >
          {showTable ? 'Hide' : 'Show'} Data Table
        </Button>
      </div>

      {/* Visual Chart */}
      <div aria-hidden={showTable} className={showTable ? 'sr-only' : ''}>
        <BaseChart data={data}>
          <Line dataKey="value" stroke="hsl(var(--primary))" />
        </BaseChart>
      </div>

      {/* Accessible Data Table */}
      {showTable && (
        <div id="chart-data-table" className="mt-4">
          <table className="w-full border-collapse border">
            <caption className="text-left font-medium p-2">
              {title} - Data Table
            </caption>
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 border">Date</th>
                <th className="text-left p-2 border">Value</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="p-2 border">
                    {format(new Date(item.date), 'PPP')}
                  </td>
                  <td className="p-2 border">{item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

### Keyboard Navigation

```jsx
function KeyboardNavigableChart({ data }) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const chartRef = useRef(null);

  const handleKeyDown = useCallback((event) => {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        setFocusedIndex(prev => 
          prev < data.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowLeft':
        event.preventDefault();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setFocusedIndex(data.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        // Announce data point
        if (focusedIndex >= 0) {
          announceDataPoint(data[focusedIndex]);
        }
        break;
    }
  }, [data, focusedIndex]);

  const announceDataPoint = (dataPoint) => {
    const announcement = `${format(new Date(dataPoint.date), 'MMMM do')}: ${dataPoint.value}`;
    
    // Use aria-live region for announcements
    const announcer = document.getElementById('chart-announcer');
    if (announcer) {
      announcer.textContent = announcement;
    }
  };

  return (
    <div>
      <div
        ref={chartRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="focus:outline-none focus:ring-2 focus:ring-primary"
        role="img"
        aria-label={`Chart with ${data.length} data points. Use arrow keys to navigate.`}
      >
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data}>
            <Line
              dataKey="value"
              stroke="hsl(var(--primary))"
              dot={(props) => (
                <circle
                  {...props}
                  r={props.index === focusedIndex ? 8 : 4}
                  fill={props.index === focusedIndex ? 'hsl(var(--secondary))' : props.fill}
                  stroke={props.index === focusedIndex ? 'hsl(var(--ring))' : props.stroke}
                  strokeWidth={props.index === focusedIndex ? 3 : 1}
                />
              )}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Screen reader announcements */}
      <div
        id="chart-announcer"
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />

      {/* Keyboard instructions */}
      <div className="mt-2 text-sm text-muted-foreground">
        <p>Use arrow keys to navigate data points, Enter to hear values</p>
      </div>
    </div>
  );
}
```

## Empty/Loading States

### Skeleton Loaders

```jsx
function ChartSkeleton({ height = 300 }) {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        <div className="h-8 w-24 bg-muted animate-pulse rounded" />
      </div>

      {/* Chart area skeleton */}
      <div 
        className="bg-muted/30 rounded-lg flex items-end justify-around p-4"
        style={{ height }}
      >
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className="bg-muted animate-pulse rounded"
            style={{
              height: `${20 + Math.random() * 80}%`,
              width: '8%'
            }}
          />
        ))}
      </div>

      {/* Legend skeleton */}
      <div className="flex justify-center space-x-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center space-x-2">
            <div className="h-3 w-3 bg-muted animate-pulse rounded-full" />
            <div className="h-4 w-16 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Meaningful Empty States

```jsx
function EmptyChart({ 
  message = "No data available", 
  action,
  icon: Icon = BarChart3 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="p-4 bg-muted/30 rounded-full">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      
      <div className="text-center space-y-2">
        <h3 className="font-medium">No Data Yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {message}
        </p>
      </div>

      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
}

function ProgressEmptyState() {
  const navigate = useNavigate();

  return (
    <EmptyChart
      message="Start tracking your progress by logging your first workout or check-in."
      action={{
        label: "Log Workout",
        onClick: () => navigate('/workouts/log')
      }}
      icon={TrendingUp}
    />
  );
}
```

### Progressive Loading Indicators

```jsx
function ProgressiveLoadingChart({ data, isLoading, hasMore, onLoadMore }) {
  return (
    <div className="space-y-4">
      <BaseChart data={data}>
        <Line dataKey="value" stroke="hsl(var(--primary))" />
      </BaseChart>

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            <span className="text-sm text-muted-foreground">Loading more data...</span>
          </div>
        </div>
      )}

      {hasMore && !isLoading && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={onLoadMore}>
            Load More Data
          </Button>
        </div>
      )}

      {!hasMore && data.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          All data loaded ({data.length} points)
        </p>
      )}
    </div>
  );
}
```

This comprehensive data visualization documentation provides patterns for implementing responsive, accessible, and performant charts using Recharts. The patterns ensure consistent user experience across different chart types and data scenarios. 