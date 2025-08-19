# Responsive Patterns Documentation

## Table of Contents

1. [Overview](#overview)
2. [Breakpoint Strategy](#breakpoint-strategy)
3. [Touch Interactions](#touch-interactions)
4. [Mobile Navigation Patterns](#mobile-navigation-patterns)
5. [Design Token Usage](#design-token-usage)
6. [Performance Optimizations](#performance-optimizations)
7. [Animation Standards](#animation-standards)
8. [PWA Preparation](#pwa-preparation)
9. [Accessibility Considerations](#accessibility-considerations)
10. [Testing Strategies](#testing-strategies)
11. [Common Pitfalls](#common-pitfalls)
12. [Integration Examples](#integration-examples)

## Overview

This document outlines responsive design patterns for the trAIner AI Fitness App, focusing on mobile-first design, touch interactions, PWA capabilities, and performance optimization.

### Key Technologies
- **Tailwind CSS v3.4.1**: Utility-first responsive design
- **Next.js 14**: Server-side rendering and optimization
- **Framer Motion v12**: Performance-focused animations
- **React Responsive**: Media query hooks
- **PWA Tools**: Service workers and manifest

### Core Principles
- **Mobile-First**: Design for mobile, enhance for larger screens
- **Touch-Friendly**: 44px minimum touch targets
- **Performance**: 60fps animations, minimal layout shifts
- **Accessibility**: Support for reduced motion, high contrast
- **Progressive Enhancement**: Core functionality works everywhere

## Breakpoint Strategy

### Tailwind Breakpoint Usage

```jsx
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      'xs': '475px',    // Extra small devices
      'sm': '640px',    // Small devices (landscape phones)
      'md': '768px',    // Medium devices (tablets)
      'lg': '1024px',   // Large devices (laptops)
      'xl': '1280px',   // Extra large devices (desktops)
      '2xl': '1536px',  // 2X large devices (large desktops)
    },
    extend: {
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      minHeight: {
        'screen-safe': '100dvh', // Dynamic viewport height
      }
    }
  }
}

// Custom responsive hook
import { useMediaQuery } from 'react-responsive';

export function useResponsive() {
  const isXs = useMediaQuery({ maxWidth: 474 });
  const isSm = useMediaQuery({ minWidth: 640, maxWidth: 767 });
  const isMd = useMediaQuery({ minWidth: 768, maxWidth: 1023 });
  const isLg = useMediaQuery({ minWidth: 1024, maxWidth: 1279 });
  const isXl = useMediaQuery({ minWidth: 1280 });
  
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1023 });
  const isDesktop = useMediaQuery({ minWidth: 1024 });

  return {
    isXs, isSm, isMd, isLg, isXl,
    isMobile, isTablet, isDesktop,
    breakpoint: isXs ? 'xs' : isSm ? 'sm' : isMd ? 'md' : isLg ? 'lg' : 'xl'
  };
}
```

### Component Adaptation Patterns

```jsx
function ResponsiveWorkoutCard({ workout }) {
  const { isMobile, isTablet } = useResponsive();

  return (
    <Card className={cn(
      'transition-all duration-200',
      // Mobile: Full width, minimal padding
      'w-full p-4',
      // Tablet: Grid layout, more spacing
      'md:p-6',
      // Desktop: Compact card with hover effects
      'lg:max-w-sm lg:hover:shadow-lg lg:hover:scale-105'
    )}>
      <div className={cn(
        'space-y-4',
        // Mobile: Vertical layout
        'flex flex-col',
        // Tablet+: Horizontal layout for some elements
        'md:space-y-6'
      )}>
        {/* Workout title - responsive typography */}
        <h3 className={cn(
          'font-semibold truncate',
          'text-lg leading-tight',
          'md:text-xl md:leading-snug',
          'lg:text-lg lg:leading-tight'
        )}>
          {workout.title}
        </h3>

        {/* Exercise count and duration */}
        <div className={cn(
          'flex items-center justify-between',
          'text-sm text-muted-foreground',
          'md:text-base'
        )}>
          <span>{workout.exerciseCount} exercises</span>
          <span>{workout.duration} min</span>
        </div>

        {/* Exercise preview - adaptive layout */}
        <div className={cn(
          'grid gap-2',
          // Mobile: Single column
          'grid-cols-1',
          // Tablet: Two columns
          'md:grid-cols-2',
          // Desktop: Back to single for compact cards
          'lg:grid-cols-1'
        )}>
          {workout.exercises.slice(0, isMobile ? 2 : isTablet ? 4 : 3).map((exercise) => (
            <div
              key={exercise.id}
              className="p-2 bg-muted/50 rounded text-xs truncate"
            >
              {exercise.name}
            </div>
          ))}
        </div>

        {/* Action buttons - responsive layout */}
        <div className={cn(
          'flex gap-2',
          // Mobile: Full width buttons, stacked
          'flex-col',
          // Tablet+: Horizontal layout
          'md:flex-row md:justify-between'
        )}>
          <Button 
            className={cn(
              'flex-1 min-h-[44px]', // Touch-friendly height
              'md:min-h-[40px]' // Slightly smaller on larger screens
            )}
          >
            Start Workout
          </Button>
          <Button 
            variant="outline" 
            className={cn(
              'flex-1 min-h-[44px]',
              'md:min-h-[40px] md:flex-initial md:px-4'
            )}
          >
            Preview
          </Button>
        </div>
      </div>
    </Card>
  );
}
```

### Content Prioritization by Viewport

```jsx
function ResponsiveDashboard() {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  const getPriorityContent = () => {
    if (isMobile) {
      return {
        primary: ['todayWorkout', 'quickStats'],
        secondary: ['recentActivity'],
        hidden: ['detailedCharts', 'socialFeed']
      };
    } else if (isTablet) {
      return {
        primary: ['todayWorkout', 'quickStats', 'recentActivity'],
        secondary: ['detailedCharts'],
        hidden: ['socialFeed']
      };
    } else {
      return {
        primary: ['todayWorkout', 'quickStats', 'recentActivity', 'detailedCharts'],
        secondary: ['socialFeed'],
        hidden: []
      };
    }
  };

  const { primary, secondary, hidden } = getPriorityContent();

  return (
    <div className={cn(
      'space-y-6 p-4',
      'md:p-6',
      'lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0'
    )}>
      {/* Primary content */}
      <div className={cn(
        'space-y-6',
        'lg:col-span-8'
      )}>
        {primary.includes('todayWorkout') && <TodayWorkoutCard />}
        {primary.includes('quickStats') && <QuickStatsGrid />}
        {primary.includes('recentActivity') && <RecentActivityList />}
        {primary.includes('detailedCharts') && <DetailedChartsSection />}
      </div>

      {/* Secondary content - sidebar on desktop */}
      {(secondary.length > 0 || !isMobile) && (
        <div className={cn(
          'space-y-6',
          'lg:col-span-4'
        )}>
          {secondary.includes('detailedCharts') && <CompactChartsSection />}
          {secondary.includes('socialFeed') && <SocialFeedWidget />}
        </div>
      )}

      {/* Hidden content - show in expandable sections on mobile */}
      {isMobile && hidden.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full">
              Show More Content
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-6 mt-6">
            {hidden.includes('detailedCharts') && <DetailedChartsSection />}
            {hidden.includes('socialFeed') && <SocialFeedWidget />}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
```

## Touch Interactions

### Swipe Gesture Implementations

```jsx
import { useSwipeable } from 'react-swipeable';

function SwipeableWorkoutSlider({ workouts, onWorkoutChange }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handlers = useSwipeable({
    onSwipedLeft: () => nextWorkout(),
    onSwipedRight: () => previousWorkout(),
    onSwipeStart: () => setIsTransitioning(true),
    onSwiped: () => setIsTransitioning(false),
    trackMouse: false, // Only track touch
    trackTouch: true,
    delta: 50, // Minimum distance
    preventScrollOnSwipe: true,
    touchEventOptions: { passive: false }
  });

  const nextWorkout = () => {
    if (currentIndex < workouts.length - 1) {
      setCurrentIndex(prev => prev + 1);
      onWorkoutChange?.(workouts[currentIndex + 1]);
    }
  };

  const previousWorkout = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      onWorkoutChange?.(workouts[currentIndex - 1]);
    }
  };

  return (
    <div {...handlers} className="relative overflow-hidden">
      {/* Swipe indicator */}
      <div className="flex items-center justify-center py-2">
        <div className="w-12 h-1 bg-muted rounded-full" />
      </div>

      {/* Workout slides */}
      <div 
        className={cn(
          'flex transition-transform duration-300 ease-out',
          isTransitioning && 'transition-none'
        )}
        style={{ 
          transform: `translateX(-${currentIndex * 100}%)`,
          width: `${workouts.length * 100}%`
        }}
      >
        {workouts.map((workout, index) => (
          <div 
            key={workout.id}
            className="w-full flex-shrink-0 px-4"
            style={{ width: `${100 / workouts.length}%` }}
          >
            <WorkoutCard workout={workout} />
          </div>
        ))}
      </div>

      {/* Navigation dots */}
      <div className="flex justify-center space-x-2 mt-4">
        {workouts.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentIndex(index);
              onWorkoutChange?.(workouts[index]);
            }}
            className={cn(
              'w-2 h-2 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center',
              index === currentIndex ? 'bg-primary' : 'bg-muted'
            )}
            aria-label={`Go to workout ${index + 1}`}
          >
            <span className={cn(
              'w-2 h-2 rounded-full',
              index === currentIndex ? 'bg-primary-foreground' : 'bg-muted-foreground'
            )} />
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Pull-to-Refresh Patterns

```jsx
function usePullToRefresh(onRefresh, threshold = 80) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  
  const touchStartY = useRef(0);
  const lastTouchY = useRef(0);

  const handleTouchStart = useCallback((e) => {
    // Only trigger if scrolled to top
    if (window.scrollY > 0) return;
    
    touchStartY.current = e.touches[0].clientY;
    lastTouchY.current = e.touches[0].clientY;
    setIsPulling(true);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isPulling || window.scrollY > 0) return;

    const touchY = e.touches[0].clientY;
    const deltaY = touchY - touchStartY.current;

    if (deltaY > 0) {
      e.preventDefault(); // Prevent scroll
      
      // Apply resistance - gets harder to pull the further you go
      const resistance = Math.max(0.3, 1 - (deltaY / 200));
      const adjustedDelta = deltaY * resistance;
      
      setPullDistance(Math.min(adjustedDelta, threshold * 1.5));
    }

    lastTouchY.current = touchY;
  }, [isPulling, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;

    setIsPulling(false);

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, threshold, onRefresh]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    pullDistance,
    isRefreshing,
    isPulling
  };
}

function PullToRefreshContainer({ onRefresh, children }) {
  const { pullDistance, isRefreshing, isPulling } = usePullToRefresh(onRefresh);

  const refreshProgress = Math.min(pullDistance / 80, 1);

  return (
    <div className="relative">
      {/* Pull to refresh indicator */}
      <div 
        className={cn(
          'absolute top-0 left-0 right-0 flex items-center justify-center',
          'transition-all duration-200 ease-out z-10',
          'bg-background/80 backdrop-blur-sm'
        )}
        style={{ 
          height: `${pullDistance}px`,
          opacity: isPulling ? 1 : 0
        }}
      >
        <div className="flex items-center space-x-2">
          {isRefreshing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
              <span className="text-sm">Refreshing...</span>
            </>
          ) : (
            <>
              <RefreshCw 
                className={cn(
                  'h-5 w-5 transition-transform duration-200',
                  refreshProgress >= 1 && 'rotate-180'
                )}
                style={{
                  transform: `rotate(${refreshProgress * 180}deg)`
                }}
              />
              <span className="text-sm">
                {refreshProgress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main content */}
      <div 
        className="transition-transform duration-200 ease-out"
        style={{ 
          transform: `translateY(${isRefreshing ? 60 : 0}px)` 
        }}
      >
        {children}
      </div>
    </div>
  );
}
```

### Long Press Menus

```jsx
function useLongPress(onLongPress, delay = 500) {
  const [isPressed, setIsPressed] = useState(false);
  const timerRef = useRef(null);
  const isLongPress = useRef(false);

  const start = useCallback((event) => {
    setIsPressed(true);
    isLongPress.current = false;
    
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress(event);
    }, delay);
  }, [onLongPress, delay]);

  const cancel = useCallback(() => {
    setIsPressed(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const click = useCallback((event) => {
    if (isLongPress.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  return {
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchCancel: cancel,
    onClick: click,
    isPressed
  };
}

function LongPressWorkoutCard({ workout, onLongPress }) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const longPressProps = useLongPress((event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPosition({
      x: event.clientX || (rect.left + rect.width / 2),
      y: event.clientY || (rect.top + rect.height / 2)
    });
    setShowMenu(true);
    
    // Haptic feedback on supported devices
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  });

  return (
    <>
      <Card 
        {...longPressProps}
        className={cn(
          'cursor-pointer transition-all duration-200 select-none',
          longPressProps.isPressed && 'scale-95 bg-muted/50',
          'active:scale-95 active:bg-muted/50'
        )}
      >
        <CardContent className="p-4">
          <h3 className="font-semibold">{workout.title}</h3>
          <p className="text-sm text-muted-foreground">{workout.description}</p>
        </CardContent>
      </Card>

      {/* Context menu */}
      {showMenu && (
        <div 
          className="fixed z-50 bg-popover border rounded-lg shadow-lg py-2 min-w-[160px]"
          style={{
            left: `${menuPosition.x}px`,
            top: `${menuPosition.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <button 
            className="w-full px-4 py-2 text-left hover:bg-muted transition-colors"
            onClick={() => {
              onLongPress('edit', workout);
              setShowMenu(false);
            }}
          >
            Edit Workout
          </button>
          <button 
            className="w-full px-4 py-2 text-left hover:bg-muted transition-colors"
            onClick={() => {
              onLongPress('duplicate', workout);
              setShowMenu(false);
            }}
          >
            Duplicate
          </button>
          <button 
            className="w-full px-4 py-2 text-left hover:bg-muted transition-colors text-destructive"
            onClick={() => {
              onLongPress('delete', workout);
              setShowMenu(false);
            }}
          >
            Delete
          </button>
        </div>
      )}

      {/* Overlay to close menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </>
  );
}
```

### Touch Target Sizing

```jsx
// Touch target utility classes
const touchTargetClasses = {
  // Minimum 44px touch targets
  minTouch: 'min-h-[44px] min-w-[44px]',
  // Comfortable 48px targets
  comfortableTouch: 'min-h-[48px] min-w-[48px]',
  // Large 56px targets for primary actions
  largeTouch: 'min-h-[56px] min-w-[56px]'
};

function TouchFriendlyButton({ 
  children, 
  size = 'default', 
  variant = 'default',
  className,
  ...props 
}) {
  const sizeClasses = {
    sm: cn('h-9 px-3 text-sm', touchTargetClasses.minTouch),
    default: cn('h-10 px-4 py-2', touchTargetClasses.comfortableTouch),
    lg: cn('h-11 px-8 text-lg', touchTargetClasses.largeTouch),
    icon: cn('h-10 w-10', touchTargetClasses.comfortableTouch)
  };

  return (
    <Button
      className={cn(
        sizeClasses[size],
        // Ensure touch targets are well-spaced
        'relative',
        // Add visual feedback for touch
        'active:scale-95 transition-transform duration-150',
        className
      )}
      variant={variant}
      {...props}
    >
      {children}
    </Button>
  );
}

// Touch spacing utilities
function TouchFriendlyGrid({ children, columns = 2, className }) {
  return (
    <div className={cn(
      'grid gap-4', // Minimum 16px gaps for touch
      `grid-cols-${columns}`,
      // Larger gaps on mobile for better touch accuracy
      'gap-6 md:gap-4',
      className
    )}>
      {children}
    </div>
  );
}
```

## Mobile Navigation Patterns

### Bottom Navigation Implementation

```jsx
function BottomNavigation() {
  const router = useRouter();
  const pathname = router.pathname;

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home, href: '/dashboard' },
    { id: 'workouts', label: 'Workouts', icon: Dumbbell, href: '/workouts' },
    { id: 'nutrition', label: 'Nutrition', icon: Apple, href: '/nutrition' },
    { id: 'progress', label: 'Progress', icon: TrendingUp, href: '/progress' },
    { id: 'profile', label: 'Profile', icon: User, href: '/profile' }
  ];

  return (
    <nav className={cn(
      'fixed bottom-0 left-0 right-0 z-50',
      'bg-background border-t border-border',
      'pb-safe-area-inset-bottom', // Handle device safe areas
      'md:hidden' // Hide on larger screens
    )}>
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center space-y-1',
                'min-h-[44px] transition-colors duration-200',
                'active:bg-muted',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className={cn(
                'h-5 w-5',
                isActive && 'text-primary'
              )} />
              <span className={cn(
                'text-xs font-medium',
                isActive && 'text-primary'
              )}>
                {item.label}
              </span>
              
              {/* Active indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-primary rounded-t" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

### Gesture-Based Navigation

```jsx
function useSwipeNavigation() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const navigationRoutes = [
    '/dashboard',
    '/workouts', 
    '/nutrition',
    '/progress',
    '/profile'
  ];

  const getCurrentRouteIndex = useCallback(() => {
    return navigationRoutes.findIndex(route => 
      router.pathname.startsWith(route)
    );
  }, [router.pathname]);

  const navigateToRoute = useCallback(async (direction) => {
    if (isNavigating) return;

    const currentIndex = getCurrentRouteIndex();
    if (currentIndex === -1) return;

    let nextIndex;
    if (direction === 'left') {
      nextIndex = Math.min(currentIndex + 1, navigationRoutes.length - 1);
    } else {
      nextIndex = Math.max(currentIndex - 1, 0);
    }

    if (nextIndex !== currentIndex) {
      setIsNavigating(true);
      await router.push(navigationRoutes[nextIndex]);
      setTimeout(() => setIsNavigating(false), 300);
    }
  }, [router, getCurrentRouteIndex, isNavigating]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => navigateToRoute('left'),
    onSwipedRight: () => navigateToRoute('right'),
    trackMouse: false,
    trackTouch: true,
    delta: 100, // Require longer swipe for navigation
    preventScrollOnSwipe: false
  });

  return {
    swipeHandlers,
    isNavigating
  };
}

function SwipeableLayout({ children }) {
  const { swipeHandlers, isNavigating } = useSwipeNavigation();

  return (
    <div 
      {...swipeHandlers}
      className={cn(
        'min-h-screen transition-opacity duration-200',
        isNavigating && 'opacity-80'
      )}
    >
      {children}
      
      {/* Swipe hint on first visit */}
      <SwipeHintOverlay />
    </div>
  );
}
```

### Collapsible Headers

```jsx
function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState('up');
  const [scrollY, setScrollY] = useState(0);
  
  useEffect(() => {
    let lastScrollY = window.pageYOffset;

    const updateScrollDirection = () => {
      const currentScrollY = window.pageYOffset;
      const direction = currentScrollY > lastScrollY ? 'down' : 'up';
      
      if (direction !== scrollDirection && 
          Math.abs(currentScrollY - lastScrollY) > 10) {
        setScrollDirection(direction);
      }
      
      setScrollY(currentScrollY);
      lastScrollY = currentScrollY > 0 ? currentScrollY : 0;
    };

    window.addEventListener('scroll', updateScrollDirection);
    return () => window.removeEventListener('scroll', updateScrollDirection);
  }, [scrollDirection]);

  return { scrollDirection, scrollY };
}

function CollapsibleHeader({ title, children }) {
  const { scrollDirection, scrollY } = useScrollDirection();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // Collapse when scrolling down past threshold
    setIsCollapsed(scrollDirection === 'down' && scrollY > 100);
  }, [scrollDirection, scrollY]);

  return (
    <header className={cn(
      'sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b',
      'transition-all duration-300 ease-in-out',
      isCollapsed ? 'h-14' : 'h-20'
    )}>
      <div className="container mx-auto px-4 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Title - collapses to smaller size */}
          <h1 className={cn(
            'font-bold transition-all duration-300',
            isCollapsed ? 'text-lg' : 'text-2xl'
          )}>
            {title}
          </h1>

          {/* Actions - may hide when collapsed */}
          <div className={cn(
            'flex items-center space-x-2 transition-all duration-300',
            isCollapsed && 'scale-90 opacity-80'
          )}>
            {children}
          </div>
        </div>

        {/* Optional subtitle - hides when collapsed */}
        <div className={cn(
          'transition-all duration-300 overflow-hidden',
          isCollapsed ? 'h-0 opacity-0' : 'h-6 opacity-100'
        )}>
          <p className="text-sm text-muted-foreground">
            Scroll to see collapsible behavior
          </p>
        </div>
      </div>
    </header>
  );
}
```

## Design Token Usage

### Tailwind Configuration Documentation

```jsx
// tailwind.config.js - Design token implementation
module.exports = {
  theme: {
    extend: {
      colors: {
        // Semantic color tokens
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        // Fitness-specific tokens
        fitness: {
          strength: "hsl(var(--fitness-strength))",
          cardio: "hsl(var(--fitness-cardio))",
          flexibility: "hsl(var(--fitness-flexibility))",
          rest: "hsl(var(--fitness-rest))",
        }
      },
      spacing: {
        // Consistent spacing scale
        'xs': '0.5rem',   // 8px
        'sm': '0.75rem',  // 12px
        'md': '1rem',     // 16px
        'lg': '1.5rem',   // 24px
        'xl': '2rem',     // 32px
        '2xl': '3rem',    // 48px
        // Touch-friendly spacing
        'touch-sm': '2.75rem',  // 44px
        'touch-md': '3rem',     // 48px
        'touch-lg': '3.5rem',   // 56px
      },
      fontSize: {
        // Typographic scale
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        // Mobile-optimized sizes
        'mobile-sm': ['0.875rem', { lineHeight: '1.5rem' }],
        'mobile-base': ['1rem', { lineHeight: '1.75rem' }],
        'mobile-lg': ['1.25rem', { lineHeight: '2rem' }],
      },
      borderRadius: {
        // Consistent border radius scale
        'xs': '0.125rem',
        'sm': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
      }
    }
  }
}

// CSS custom properties for design tokens
:root {
  /* Color tokens */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  
  /* Fitness-specific colors */
  --fitness-strength: 0 73% 57%;      /* Red for strength */
  --fitness-cardio: 142 71% 45%;      /* Green for cardio */
  --fitness-flexibility: 271 91% 65%; /* Purple for flexibility */
  --fitness-rest: 210 17% 82%;        /* Gray for rest */
  
  /* Animation tokens */
  --animation-fast: 150ms;
  --animation-normal: 300ms;
  --animation-slow: 500ms;
  
  /* Shadow tokens */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
}
```

### Custom Color Schemes

```jsx
function useThemeColors() {
  const { theme } = useTheme();
  
  const getExerciseTypeColor = (type) => {
    const colorMap = {
      strength: 'hsl(var(--fitness-strength))',
      cardio: 'hsl(var(--fitness-cardio))',
      flexibility: 'hsl(var(--fitness-flexibility))',
      rest: 'hsl(var(--fitness-rest))'
    };
    
    return colorMap[type] || 'hsl(var(--muted))';
  };

  const getDifficultyColor = (difficulty) => {
    const colorMap = {
      beginner: 'hsl(142 71% 45%)',    // Green
      intermediate: 'hsl(45 93% 47%)', // Orange  
      advanced: 'hsl(0 73% 57%)'       // Red
    };
    
    return colorMap[difficulty] || 'hsl(var(--muted))';
  };

  return {
    getExerciseTypeColor,
    getDifficultyColor
  };
}

function ExerciseTypeIndicator({ type, className }) {
  const { getExerciseTypeColor } = useThemeColors();
  
  return (
    <div 
      className={cn(
        'w-3 h-3 rounded-full',
        className
      )}
      style={{ backgroundColor: getExerciseTypeColor(type) }}
      aria-label={`${type} exercise`}
    />
  );
}
```

### Spacing Scales

```jsx
// Consistent spacing utility
function useSpacing() {
  const spacing = {
    xs: 'space-y-2',      // 8px
    sm: 'space-y-3',      // 12px  
    md: 'space-y-4',      // 16px
    lg: 'space-y-6',      // 24px
    xl: 'space-y-8',      // 32px
    '2xl': 'space-y-12'   // 48px
  };

  const padding = {
    xs: 'p-2',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
    '2xl': 'p-12'
  };

  const margin = {
    xs: 'm-2',
    sm: 'm-3', 
    md: 'm-4',
    lg: 'm-6',
    xl: 'm-8',
    '2xl': 'm-12'
  };

  return { spacing, padding, margin };
}

// Component with consistent spacing
function SpacedContainer({ 
  children, 
  spacing = 'md', 
  padding = 'md',
  className 
}) {
  const { spacing: spacingClasses, padding: paddingClasses } = useSpacing();
  
  return (
    <div className={cn(
      spacingClasses[spacing],
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  );
}
```

### Typography Systems

```jsx
function TypographyScale() {
  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Heading 1 - 4xl
        </h1>
        <p className="text-muted-foreground">Primary page headings</p>
      </div>

      <div>
        <h2 className="text-3xl font-semibold text-foreground mb-2">
          Heading 2 - 3xl  
        </h2>
        <p className="text-muted-foreground">Section headings</p>
      </div>

      <div>
        <h3 className="text-2xl font-semibold text-foreground mb-2">
          Heading 3 - 2xl
        </h3>
        <p className="text-muted-foreground">Subsection headings</p>
      </div>

      <div>
        <h4 className="text-xl font-medium text-foreground mb-2">
          Heading 4 - xl
        </h4>
        <p className="text-muted-foreground">Card titles, component headings</p>
      </div>

      <div>
        <p className="text-lg text-foreground mb-2">
          Large text - lg
        </p>
        <p className="text-muted-foreground">Important body text, leads</p>
      </div>

      <div>
        <p className="text-base text-foreground mb-2">
          Body text - base
        </p>
        <p className="text-muted-foreground">Standard body text</p>
      </div>

      <div>
        <p className="text-sm text-foreground mb-2">
          Small text - sm
        </p>
        <p className="text-muted-foreground">Captions, helper text</p>
      </div>

      <div>
        <p className="text-xs text-muted-foreground">
          Extra small - xs - Labels, timestamps
        </p>
      </div>
    </div>
  );
}

// Responsive typography component
function ResponsiveHeading({ 
  level = 1, 
  children, 
  className,
  ...props 
}) {
  const Component = `h${level}`;
  
  const sizeClasses = {
    1: 'text-2xl md:text-4xl font-bold',
    2: 'text-xl md:text-3xl font-semibold', 
    3: 'text-lg md:text-2xl font-semibold',
    4: 'text-base md:text-xl font-medium',
    5: 'text-sm md:text-lg font-medium',
    6: 'text-xs md:text-base font-medium'
  };

  return (
    <Component 
      className={cn(
        sizeClasses[level],
        'text-foreground',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
```

This comprehensive responsive patterns documentation provides the foundation for implementing mobile-first, touch-friendly, and performant user interfaces. The patterns ensure the app works seamlessly across all device sizes while maintaining accessibility and performance standards.

## Performance Optimizations

### Core Web Vitals Optimization

```jsx
function usePerformanceOptimization() {
  const [performanceMetrics, setPerformanceMetrics] = useState({
    lcp: 0, // Largest Contentful Paint
    fcp: 0, // First Contentful Paint
    inp: 0, // Interaction to Next Paint
    cls: 0, // Cumulative Layout Shift
    tbt: 0  // Total Blocking Time
  });

  useEffect(() => {
    // Monitor Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        switch (entry.entryType) {
          case 'largest-contentful-paint':
            setPerformanceMetrics(prev => ({ ...prev, lcp: entry.startTime }));
            break;
          case 'first-contentful-paint':
            setPerformanceMetrics(prev => ({ ...prev, fcp: entry.startTime }));
            break;
          case 'layout-shift':
            if (!entry.hadRecentInput) {
              setPerformanceMetrics(prev => ({ 
                ...prev, 
                cls: prev.cls + entry.value 
              }));
            }
            break;
        }
      }
    });

    observer.observe({ entryTypes: ['largest-contentful-paint', 'layout-shift'] });

    return () => observer.disconnect();
  }, []);

  return performanceMetrics;
}

// Performance budget component
function PerformanceBudget() {
  const metrics = usePerformanceOptimization();
  
  const budgets = {
    lcp: { target: 2500, good: 2500, poor: 4000 }, // milliseconds
    fcp: { target: 1800, good: 1800, poor: 3000 },
    inp: { target: 200, good: 200, poor: 500 },
    cls: { target: 0.1, good: 0.1, poor: 0.25 },
    tbt: { target: 200, good: 200, poor: 600 }
  };

  const getStatus = (metric, value) => {
    const budget = budgets[metric];
    if (value <= budget.good) return 'good';
    if (value <= budget.poor) return 'needs-improvement';
    return 'poor';
  };

  return (
    <div className="p-4 bg-card rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Performance Budget</h3>
      <div className="space-y-3">
        {Object.entries(metrics).map(([metric, value]) => (
          <div key={metric} className="flex items-center justify-between">
            <span className="font-medium uppercase text-sm">{metric}</span>
            <div className="flex items-center space-x-2">
              <span>{typeof value === 'number' ? value.toFixed(2) : value}</span>
              <div className={cn(
                'w-3 h-3 rounded-full',
                getStatus(metric, value) === 'good' && 'bg-green-500',
                getStatus(metric, value) === 'needs-improvement' && 'bg-yellow-500',
                getStatus(metric, value) === 'poor' && 'bg-red-500'
              )} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Image Optimization and Lazy Loading

```jsx
import Image from 'next/image';

function OptimizedImage({ 
  src, 
  alt, 
  width, 
  height, 
  priority = false,
  className,
  ...props 
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={cn(
          'transition-all duration-300',
          isLoading ? 'blur-sm scale-110' : 'blur-0 scale-100',
          hasError && 'opacity-50'
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        // Generate responsive srcSet automatically
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        {...props}
      />
      
      {/* Loading placeholder */}
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      
      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

// Intersection Observer for lazy loading
function useLazyLoading(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    const currentElement = elementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [threshold]);

  return [elementRef, isVisible];
}

function LazyWorkoutList({ workouts }) {
  const [ref, isVisible] = useLazyLoading();

  return (
    <div ref={ref} className="space-y-4">
      {isVisible ? (
        workouts.map(workout => <WorkoutCard key={workout.id} workout={workout} />)
      ) : (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Bundle Size Optimization

```jsx
// Dynamic imports for code splitting
const WorkoutEditor = dynamic(() => import('../workout/WorkoutEditor'), {
  loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" />,
  ssr: false
});

const AnalyticsCharts = dynamic(() => import('../analytics/Charts'), {
  loading: () => <ChartsSkeleton />,
  ssr: false
});

// Conditional loading based on device capabilities
function ConditionalFeatures() {
  const { isMobile } = useResponsive();
  const [AdvancedFeatures, setAdvancedFeatures] = useState(null);

  useEffect(() => {
    // Only load advanced features on desktop
    if (!isMobile) {
      import('../components/AdvancedFeatures').then(module => {
        setAdvancedFeatures(() => module.default);
      });
    }
  }, [isMobile]);

  return (
    <div>
      <BasicFeatures />
      {AdvancedFeatures && <AdvancedFeatures />}
    </div>
  );
}

// Tree shaking optimization for utilities
export const performanceUtils = {
  // Only export what's actually used
  debounce: (fn, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(null, args), delay);
    };
  },
  
  throttle: (fn, limit) => {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        fn.apply(null, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
};
```

## Animation Standards

### Motion Design Principles

```jsx
// Animation configuration following Material Design 3 and iOS guidelines
export const animationConfig = {
  // Duration tokens
  duration: {
    instant: 100,      // Micro-interactions
    fast: 200,         // Hover states, simple transitions
    normal: 300,       // Standard transitions
    slow: 500,         // Complex animations
    emphasis: 700      // Attention-getting animations
  },
  
  // Easing curves
  easing: {
    linear: 'linear',
    easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',      // Material motion
    easeIn: 'cubic-bezier(0.4, 0.0, 1, 1)',
    easeInOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',    // Bouncy effect
    anticipate: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  },
  
  // Scale factors
  scale: {
    subtle: 1.02,
    normal: 1.05,
    emphasis: 1.1
  }
};

// Framer Motion variants for consistent animations
export const motionVariants = {
  // Page transitions
  pageTransition: {
    initial: { opacity: 0, x: 20 },
    animate: { 
      opacity: 1, 
      x: 0,
      transition: {
        duration: animationConfig.duration.normal / 1000,
        ease: animationConfig.easing.easeOut
      }
    },
    exit: { 
      opacity: 0, 
      x: -20,
      transition: {
        duration: animationConfig.duration.fast / 1000,
        ease: animationConfig.easing.easeIn
      }
    }
  },

  // List item animations
  listItem: {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: animationConfig.duration.normal / 1000,
        ease: animationConfig.easing.easeOut
      }
    }
  },

  // Stagger children
  container: {
    animate: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  },

  // Hover interactions
  hover: {
    scale: animationConfig.scale.subtle,
    transition: {
      duration: animationConfig.duration.fast / 1000,
      ease: animationConfig.easing.easeOut
    }
  },

  // Loading states
  loading: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear'
    }
  }
};
```

### Performance-Focused Animations

```jsx
import { motion, useReducedMotion } from 'framer-motion';

function ResponsiveAnimatedComponent({ children, variant = 'listItem' }) {
  const shouldReduceMotion = useReducedMotion();

  // Disable animations if user prefers reduced motion
  const animationProps = shouldReduceMotion 
    ? {} 
    : {
        variants: motionVariants[variant],
        initial: "initial",
        animate: "animate",
        exit: "exit"
      };

  return (
    <motion.div {...animationProps}>
      {children}
    </motion.div>
  );
}

// GPU-accelerated animations using transform properties
function OptimizedCard({ workout, isVisible }) {
  return (
    <motion.div
      className="bg-card rounded-lg overflow-hidden"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={isVisible ? { 
        opacity: 1, 
        scale: 1,
        // Use transform properties for GPU acceleration
        transform: 'translateZ(0)' 
      } : {}}
      transition={{
        duration: 0.3,
        ease: animationConfig.easing.easeOut
      }}
      // Optimize for animations
      style={{
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden'
      }}
      whileHover={{
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      whileTap={{
        scale: 0.98,
        transition: { duration: 0.1 }
      }}
    >
      <WorkoutCardContent workout={workout} />
    </motion.div>
  );
}

// Custom animation hook with performance monitoring
function usePerformantAnimation(triggerValue, onAnimationComplete) {
  const [isAnimating, setIsAnimating] = useState(false);
  const frameRef = useRef();

  useEffect(() => {
    if (triggerValue) {
      setIsAnimating(true);
      
      const startTime = performance.now();
      
      const animate = () => {
        const currentTime = performance.now();
        const elapsed = currentTime - startTime;
        
        if (elapsed < 300) { // 300ms animation
          frameRef.current = requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          onAnimationComplete?.();
        }
      };
      
      frameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [triggerValue, onAnimationComplete]);

  return isAnimating;
}
```

### Accessibility-Aware Animations

```jsx
function AccessibleMotion({ children, ...motionProps }) {
  const prefersReducedMotion = useReducedMotion();
  
  // Provide alternative feedback for reduced motion users
  const reduceMotionProps = prefersReducedMotion ? {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.1 }
  } : motionProps;

  return (
    <motion.div {...reduceMotionProps}>
      {children}
    </motion.div>
  );
}

// Focus management with animations
function AnimatedFocusManager({ children, isVisible }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (isVisible && containerRef.current) {
      // Wait for animation to complete before managing focus
      setTimeout(() => {
        const firstFocusable = containerRef.current.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }, 300);
    }
  }, [isVisible]);

  return (
    <AccessibleMotion
      ref={containerRef}
      initial={{ opacity: 0, y: 10 }}
      animate={isVisible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.3 }}
    >
      {children}
    </AccessibleMotion>
  );
}
```

## PWA Preparation

### Service Worker Implementation

```jsx
// public/sw.js - Service Worker for PWA functionality
const CACHE_NAME = 'trainer-app-v1';
const STATIC_CACHE = 'trainer-static-v1';
const DYNAMIC_CACHE = 'trainer-dynamic-v1';

const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/workouts',
  '/nutrition',
  '/progress',
  '/offline',
  '/manifest.json',
  // Add critical CSS and JS files
];

const CACHE_STRATEGIES = {
  // Cache first for static assets
  static: (request) => {
    return caches.match(request).then(response => {
      return response || fetch(request).then(fetchResponse => {
        const responseClone = fetchResponse.clone();
        caches.open(STATIC_CACHE).then(cache => {
          cache.put(request, responseClone);
        });
        return fetchResponse;
      });
    });
  },

  // Network first for API calls
  networkFirst: (request) => {
    return fetch(request).then(response => {
      const responseClone = response.clone();
      caches.open(DYNAMIC_CACHE).then(cache => {
        cache.put(request, responseClone);
      });
      return response;
    }).catch(() => {
      return caches.match(request);
    });
  },

  // Stale while revalidate for data
  staleWhileRevalidate: (request) => {
    const cachedResponse = caches.match(request);
    const networkResponse = fetch(request).then(response => {
      const responseClone = response.clone();
      caches.open(DYNAMIC_CACHE).then(cache => {
        cache.put(request, responseClone);
      });
      return response;
    });

    return cachedResponse.then(response => response || networkResponse);
  }
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(CACHE_STRATEGIES.networkFirst(request));
  } else if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(CACHE_STRATEGIES.static(request));
  } else {
    event.respondWith(CACHE_STRATEGIES.staleWhileRevalidate(request));
  }
});
```

### PWA Manifest Configuration

```json
// public/manifest.json
{
  "name": "trAIner - AI Fitness App",
  "short_name": "trAIner",
  "description": "AI-powered personal fitness trainer",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#3E9EFF",
  "orientation": "portrait-primary",
  "categories": ["health", "fitness", "lifestyle"],
  "lang": "en",
  "dir": "ltr",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-96x96.png", 
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128", 
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "shortcuts": [
    {
      "name": "Start Workout",
      "short_name": "Workout",
      "description": "Quick start your daily workout",
      "url": "/workouts/quick-start",
      "icons": [{ "src": "/icons/shortcut-workout.png", "sizes": "96x96" }]
    },
    {
      "name": "Log Progress",
      "short_name": "Progress", 
      "description": "Log your workout progress",
      "url": "/progress/log",
      "icons": [{ "src": "/icons/shortcut-progress.png", "sizes": "96x96" }]
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/mobile-dashboard.png",
      "sizes": "375x667",
      "type": "image/png",
      "form_factor": "narrow"
    },
    {
      "src": "/screenshots/desktop-dashboard.png", 
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    }
  ]
}
```

### Installation Prompts and App Updates

```jsx
function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return false;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }

    return outcome === 'accepted';
  };

  return {
    isInstallable,
    isInstalled,
    promptInstall
  };
}

function PWAInstallBanner() {
  const { isInstallable, promptInstall } = usePWAInstall();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (isInstallable) {
      // Show banner after 30 seconds of usage
      const timer = setTimeout(() => setShowBanner(true), 30000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable]);

  if (!showBanner || !isInstallable) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80"
    >
      <Card className="p-4 bg-primary text-primary-foreground shadow-lg">
        <div className="flex items-start space-x-3">
          <Smartphone className="h-6 w-6 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold">Install trAIner</h3>
            <p className="text-sm opacity-90">
              Get the app for faster access and offline workouts
            </p>
            <div className="flex space-x-2 mt-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={promptInstall}
              >
                Install
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowBanner(false)}
                className="text-primary-foreground hover:bg-primary-foreground/20"
              >
                Maybe Later
              </Button>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowBanner(false)}
            className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
```

## Testing Strategies

### Responsive Testing Framework

```jsx
// __tests__/responsive/viewport-testing.test.js
import { render, screen } from '@testing-library/react';
import { ResizeObserver } from '__mocks__/ResizeObserver';
import ResponsiveComponent from '../ResponsiveComponent';

// Mock viewport sizes
const viewportSizes = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 }
};

global.ResizeObserver = ResizeObserver;

describe('Responsive Component Testing', () => {
  beforeEach(() => {
    // Reset viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1440,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 900,
    });
  });

  const setViewport = (size) => {
    window.innerWidth = viewportSizes[size].width;
    window.innerHeight = viewportSizes[size].height;
    window.dispatchEvent(new Event('resize'));
  };

  test('renders mobile layout correctly', () => {
    setViewport('mobile');
    render(<ResponsiveComponent />);
    
    // Test mobile-specific elements
    expect(screen.getByTestId('mobile-navigation')).toBeInTheDocument();
    expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument();
  });

  test('renders tablet layout correctly', () => {
    setViewport('tablet');
    render(<ResponsiveComponent />);
    
    // Test tablet-specific layout
    expect(screen.getByTestId('tablet-grid')).toBeInTheDocument();
  });

  test('renders desktop layout correctly', () => {
    setViewport('desktop');
    render(<ResponsiveComponent />);
    
    // Test desktop-specific elements
    expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('desktop-header')).toBeInTheDocument();
  });

  test('maintains accessibility across viewports', () => {
    Object.keys(viewportSizes).forEach(size => {
      setViewport(size);
      render(<ResponsiveComponent />);
      
      // Check for proper touch targets on mobile
      if (size === 'mobile') {
        const buttons = screen.getAllByRole('button');
        buttons.forEach(button => {
          const styles = window.getComputedStyle(button);
          const minHeight = parseInt(styles.minHeight);
          expect(minHeight).toBeGreaterThanOrEqual(44); // 44px minimum touch target
        });
      }
    });
  });
});
```

### Touch Interaction Testing

```jsx
// __tests__/responsive/touch-interactions.test.js
import { fireEvent, render, screen } from '@testing-library/react';
import SwipeableComponent from '../SwipeableComponent';

describe('Touch Interaction Testing', () => {
  test('handles swipe gestures correctly', () => {
    const onSwipe = jest.fn();
    render(<SwipeableComponent onSwipe={onSwipe} />);
    
    const element = screen.getByTestId('swipeable-element');
    
    // Simulate touch events
    fireEvent.touchStart(element, {
      touches: [{ clientX: 100, clientY: 100 }]
    });
    
    fireEvent.touchMove(element, {
      touches: [{ clientX: 200, clientY: 100 }]
    });
    
    fireEvent.touchEnd(element, {
      changedTouches: [{ clientX: 200, clientY: 100 }]
    });
    
    expect(onSwipe).toHaveBeenCalledWith('left');
  });

  test('handles long press correctly', async () => {
    const onLongPress = jest.fn();
    render(<LongPressComponent onLongPress={onLongPress} />);
    
    const element = screen.getByTestId('long-press-element');
    
    fireEvent.touchStart(element);
    
    // Wait for long press duration
    await new Promise(resolve => setTimeout(resolve, 600));
    
    fireEvent.touchEnd(element);
    
    expect(onLongPress).toHaveBeenCalled();
  });

  test('provides haptic feedback when available', () => {
    const mockVibrate = jest.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      writable: true
    });

    render(<HapticComponent />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockVibrate).toHaveBeenCalledWith(50);
  });
});
```

### Performance Testing

```jsx
// __tests__/performance/core-web-vitals.test.js
import { render } from '@testing-library/react';
import PerformanceTestComponent from '../PerformanceTestComponent';

describe('Performance Testing', () => {
  test('meets Core Web Vitals thresholds', async () => {
    const performanceEntries = [];
    
    // Mock Performance Observer
    global.PerformanceObserver = class {
      constructor(callback) {
        this.callback = callback;
      }
      
      observe() {
        // Simulate performance entries
        setTimeout(() => {
          this.callback({
            getEntries: () => performanceEntries
          });
        }, 100);
      }
      
      disconnect() {}
    };

    render(<PerformanceTestComponent />);
    
    // Add performance entries
    performanceEntries.push({
      entryType: 'largest-contentful-paint',
      startTime: 1800 // Under 2.5s threshold
    });

    performanceEntries.push({
      entryType: 'layout-shift',
      value: 0.05, // Under 0.1 threshold
      hadRecentInput: false
    });

    // Wait for performance measurements
    await new Promise(resolve => setTimeout(resolve, 200));

    // Assertions would be made based on captured metrics
    expect(performanceEntries[0].startTime).toBeLessThan(2500);
    expect(performanceEntries[1].value).toBeLessThan(0.1);
  });

  test('animation performance stays above 60fps', () => {
    let frameCount = 0;
    const startTime = performance.now();
    
    const countFrames = () => {
      frameCount++;
      const elapsed = performance.now() - startTime;
      
      if (elapsed < 1000) {
        requestAnimationFrame(countFrames);
      } else {
        const fps = frameCount / (elapsed / 1000);
        expect(fps).toBeGreaterThan(55); // Allow some variance from 60fps
      }
    };
    
    requestAnimationFrame(countFrames);
  });
});
```

## Accessibility Considerations

### Screen Reader Support

```jsx
function AccessibleWorkoutCard({ workout, isActive }) {
  const announceRef = useRef(null);

  // Announce changes for screen readers
  useEffect(() => {
    if (isActive && announceRef.current) {
      announceRef.current.textContent = `${workout.title} is now selected. ${workout.description}`;
    }
  }, [isActive, workout]);

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      aria-describedby={`workout-description-${workout.id}`}
      className={cn(
        'cursor-pointer transition-all',
        'focus:ring-2 focus:ring-primary focus:ring-offset-2',
        isActive && 'ring-2 ring-primary bg-primary/5'
      )}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(workout);
        }
      }}
    >
      <CardContent className="p-4">
        <h3 className="font-semibold mb-2">{workout.title}</h3>
        <p id={`workout-description-${workout.id}`} className="text-sm text-muted-foreground">
          {workout.description}
        </p>
        
        {/* Additional context for screen readers */}
        <div className="sr-only">
          {workout.exercises.length} exercises, 
          approximately {workout.duration} minutes,
          difficulty level: {workout.difficulty}
        </div>
      </CardContent>
      
      {/* Live region for announcements */}
      <div
        ref={announceRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </Card>
  );
}
```

### Keyboard Navigation

```jsx
function useKeyboardNavigation(items, onSelect) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < items.length - 1 ? prev + 1 : 0
          );
          break;
          
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : items.length - 1
          );
          break;
          
        case 'Home':
          e.preventDefault();
          setSelectedIndex(0);
          break;
          
        case 'End':
          e.preventDefault();
          setSelectedIndex(items.length - 1);
          break;
          
        case 'Enter':
        case ' ':
          e.preventDefault();
          onSelect(items[selectedIndex]);
          break;
          
        case 'Escape':
          e.preventDefault();
          // Return focus to trigger element
          document.querySelector('[data-trigger]')?.focus();
          break;
      }
    };

    if (listRef.current) {
      listRef.current.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      if (listRef.current) {
        listRef.current.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [items, selectedIndex, onSelect]);

  // Auto-scroll selected item into view
  useEffect(() => {
    const selectedElement = listRef.current?.children[selectedIndex];
    if (selectedElement) {
      selectedElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedIndex]);

  return {
    listRef,
    selectedIndex,
    setSelectedIndex
  };
}

function KeyboardNavigableList({ items, onSelect }) {
  const { listRef, selectedIndex } = useKeyboardNavigation(items, onSelect);

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label="Workout list"
      tabIndex={0}
      className="space-y-2 p-2 max-h-80 overflow-y-auto focus:outline-none focus:ring-2 focus:ring-primary"
    >
      {items.map((item, index) => (
        <div
          key={item.id}
          role="option"
          aria-selected={index === selectedIndex}
          className={cn(
            'p-3 rounded cursor-pointer transition-colors',
            index === selectedIndex
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          )}
          onClick={() => onSelect(item)}
        >
          {item.name}
        </div>
      ))}
    </div>
  );
}
```

### High Contrast and Color Accessibility

```jsx
function useAccessibilityPreferences() {
  const [preferences, setPreferences] = useState({
    highContrast: false,
    reducedMotion: false,
    largeText: false
  });

  useEffect(() => {
    // Detect system preferences
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const updatePreferences = () => {
      setPreferences({
        highContrast: highContrastQuery.matches,
        reducedMotion: reducedMotionQuery.matches,
        largeText: false // User preference, not system
      });
    };

    updatePreferences();
    
    highContrastQuery.addEventListener('change', updatePreferences);
    reducedMotionQuery.addEventListener('change', updatePreferences);

    return () => {
      highContrastQuery.removeEventListener('change', updatePreferences);
      reducedMotionQuery.removeEventListener('change', updatePreferences);
    };
  }, []);

  return preferences;
}

function AccessibilityProvider({ children }) {
  const preferences = useAccessibilityPreferences();

  useEffect(() => {
    // Apply preferences to document
    document.documentElement.classList.toggle('high-contrast', preferences.highContrast);
    document.documentElement.classList.toggle('reduced-motion', preferences.reducedMotion);
    document.documentElement.classList.toggle('large-text', preferences.largeText);
  }, [preferences]);

  return (
    <div className={cn(
      // High contrast mode
      preferences.highContrast && 'contrast-more',
      // Large text mode
      preferences.largeText && 'text-lg',
      // Reduced motion
      preferences.reducedMotion && 'motion-reduce'
    )}>
      {children}
    </div>
  );
}
```

## Common Pitfalls

### Viewport Meta Tag Issues

```jsx
// ❌ Bad: Missing or incorrect viewport meta tag
<meta name="viewport" content="width=device-width" />

// ✅ Good: Complete viewport configuration
<meta 
  name="viewport" 
  content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" 
/>

// Handle safe areas for iOS devices
function SafeAreaWrapper({ children }) {
  return (
    <div className={cn(
      // Handle iPhone X+ safe areas
      'pt-safe-area-inset-top',
      'pb-safe-area-inset-bottom', 
      'pl-safe-area-inset-left',
      'pr-safe-area-inset-right'
    )}>
      {children}
    </div>
  );
}
```

### Touch Target Sizing Mistakes

```jsx
// ❌ Bad: Touch targets too small
function BadButton() {
  return (
    <button className="h-6 w-6 text-xs">
      ×
    </button>
  );
}

// ✅ Good: Minimum 44px touch targets
function GoodButton() {
  return (
    <button className="min-h-[44px] min-w-[44px] flex items-center justify-center">
      <X className="h-4 w-4" />
    </button>
  );
}

// Touch target validation utility
function validateTouchTargets() {
  const buttons = document.querySelectorAll('button, [role="button"], a');
  const violations = [];

  buttons.forEach((element, index) => {
    const rect = element.getBoundingClientRect();
    if (rect.width < 44 || rect.height < 44) {
      violations.push({
        element,
        index,
        size: { width: rect.width, height: rect.height }
      });
    }
  });

  if (violations.length > 0) {
    console.warn('Touch target violations found:', violations);
  }

  return violations;
}
```

### CSS Specificity and Responsive Conflicts

```jsx
// ❌ Bad: Conflicting responsive styles
<div className="text-sm md:text-lg text-xs"> {/* text-xs overrides md:text-lg */}
  Problematic text
</div>

// ✅ Good: Proper responsive cascade
<div className="text-xs md:text-sm lg:text-lg">
  Properly scaled text
</div>

// Utility for debugging responsive styles
function useResponsiveDebug() {
  const [currentBreakpoint, setCurrentBreakpoint] = useState('');

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 640) setCurrentBreakpoint('default');
      else if (width < 768) setCurrentBreakpoint('sm');
      else if (width < 1024) setCurrentBreakpoint('md'); 
      else if (width < 1280) setCurrentBreakpoint('lg');
      else setCurrentBreakpoint('xl');
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return currentBreakpoint;
}

function ResponsiveDebugger() {
  const breakpoint = useResponsiveDebug();
  
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed top-0 left-0 z-50 bg-red-500 text-white px-2 py-1 text-xs">
      {breakpoint}
    </div>
  );
}
```

### Performance Anti-Patterns

```jsx
// ❌ Bad: Heavy re-renders on resize
function BadResponsiveComponent() {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  
  useEffect(() => {
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    
    window.addEventListener('resize', updateSize); // Causes re-render on every pixel change
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return <div>Width: {windowSize.width}</div>;
}

// ✅ Good: Debounced resize handling
function GoodResponsiveComponent() {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  
  useEffect(() => {
    const updateSize = debounce(() => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    }, 150); // Debounce resize events
    
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return <div>Width: {windowSize.width}</div>;
}

// Utility for debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
```

## Integration Examples

### Complete Mobile-First Dashboard

```jsx
function ResponsiveFitnessDashboard() {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const { user } = useAuth();
  const { workouts, isLoading } = useWorkouts();

  return (
    <div className="min-h-screen bg-background">
      {/* Responsive header */}
      <CollapsibleHeader title="Dashboard">
        <TouchFriendlyButton size="icon" variant="outline">
          <Bell className="h-4 w-4" />
        </TouchFriendlyButton>
        <TouchFriendlyButton size="icon" variant="outline">
          <Settings className="h-4 w-4" />
        </TouchFriendlyButton>
      </CollapsibleHeader>

      {/* Main content with pull-to-refresh on mobile */}
      <PullToRefreshContainer onRefresh={refetchData}>
        <div className={cn(
          'p-4 space-y-6',
          'md:p-6 md:space-y-8',
          'lg:grid lg:grid-cols-12 lg:gap-8 lg:space-y-0'
        )}>
          {/* Primary content */}
          <div className="lg:col-span-8 space-y-6">
            {/* Today's workout - priority content */}
            <motion.div variants={motionVariants.listItem}>
              <TodayWorkoutCard />
            </motion.div>

            {/* Quick stats grid - responsive layout */}
            <motion.div variants={motionVariants.listItem}>
              <div className={cn(
                'grid gap-4',
                'grid-cols-2', // Mobile: 2 columns
                'md:grid-cols-4', // Tablet: 4 columns  
                'lg:grid-cols-2' // Desktop: back to 2 for better proportions
              )}>
                <StatCard title="Workouts" value="12" change="+2" />
                <StatCard title="Streak" value="5" change="+1" />
                {(isTablet || isDesktop) && (
                  <>
                    <StatCard title="Minutes" value="480" change="+45" />
                    <StatCard title="Calories" value="2,840" change="+240" />
                  </>
                )}
              </div>
            </motion.div>

            {/* Recent workouts with swipe navigation on mobile */}
            <motion.div variants={motionVariants.listItem}>
              {isMobile ? (
                <SwipeableWorkoutSlider 
                  workouts={workouts?.slice(0, 5) || []}
                  onWorkoutChange={handleWorkoutSelect}
                />
              ) : (
                <WorkoutGrid workouts={workouts} />
              )}
            </motion.div>
          </div>

          {/* Sidebar content - hidden on mobile, collapsible on tablet */}
          {!isMobile && (
            <div className="lg:col-span-4 space-y-6">
              <motion.div variants={motionVariants.listItem}>
                <WeeklyProgressChart />
              </motion.div>
              
              {isDesktop && (
                <motion.div variants={motionVariants.listItem}>
                  <UpcomingWorkouts />
                </motion.div>
              )}
            </div>
          )}

          {/* Mobile-only expandable content */}
          {isMobile && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <TouchFriendlyButton variant="outline" className="w-full">
                  Show Weekly Progress
                  <ChevronDown className="ml-2 h-4 w-4" />
                </TouchFriendlyButton>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-6">
                <WeeklyProgressChart />
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </PullToRefreshContainer>

      {/* Bottom navigation - mobile only */}
      <BottomNavigation />

      {/* PWA install prompt */}
      <PWAInstallBanner />

      {/* Accessibility provider */}
      <AccessibilityProvider>
        <ResponsiveDebugger />
      </AccessibilityProvider>
    </div>
  );
}

function StatCard({ title, value, change }) {
  return (
    <Card className="p-4">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{title}</p>
        <div className="flex items-baseline space-x-2">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-green-600">{change}</p>
        </div>
      </div>
    </Card>
  );
}
```

This comprehensive responsive patterns documentation provides complete implementation guidance for creating mobile-first, touch-friendly, and performant user interfaces in the trAIner AI Fitness App. The patterns ensure excellent user experience across all device sizes while maintaining accessibility standards and optimal performance. 