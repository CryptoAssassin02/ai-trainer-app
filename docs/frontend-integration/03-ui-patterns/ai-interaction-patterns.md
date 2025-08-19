# AI Interaction Patterns Documentation

## Table of Contents

1. [Overview](#overview)
2. [Long-Running Operations](#long-running-operations)
3. [Agent-Specific Loading States](#agent-specific-loading-states)
4. [Agent Reasoning Display](#agent-reasoning-display)
5. [Error Recovery Patterns](#error-recovery-patterns)
6. [Feedback Collection](#feedback-collection)
7. [Response Handling](#response-handling)
8. [Performance Considerations](#performance-considerations)
9. [Testing Strategies](#testing-strategies)
10. [Common Pitfalls](#common-pitfalls)
11. [Integration Examples](#integration-examples)

## Overview

This document outlines AI interaction patterns for the trAIner AI Fitness App, focusing on user-friendly interfaces for AI agent operations, reasoning display, and error handling.

### Key Technologies
- **OpenAI API**: AI agent backend
- **React Query**: Request state management
- **React Hook Form**: User input handling
- **Tailwind CSS**: Styling and animations
- **Framer Motion**: Loading animations

### Agent Specifications
Based on backend analysis:
- **WorkoutGenerationAgent**: 30s timeout, 3000 max tokens
- **InsightGenerator**: 3000 max tokens
- **AnalyticsAgent**: 6000 max tokens  
- **PlanAdjustmentAgent**: 60s timeout, 4096 max tokens

### Core Principles
- **Transparency**: Show AI reasoning when helpful
- **Responsiveness**: Immediate feedback for user actions
- **Error Recovery**: Graceful handling of AI failures
- **User Control**: Allow cancellation and retry
- **Progress Visibility**: Clear indication of operation status

## Long-Running Operations

### Multi-Step Progress Indicators

```jsx
import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';

const AGENT_STEPS = {
  WorkoutGenerationAgent: [
    { id: 'analyze', label: 'Analyzing your profile', duration: 5000 },
    { id: 'research', label: 'Researching exercises', duration: 10000 },
    { id: 'generate', label: 'Creating workout plan', duration: 12000 },
    { id: 'optimize', label: 'Optimizing for your goals', duration: 3000 }
  ],
  PlanAdjustmentAgent: [
    { id: 'review', label: 'Reviewing current plan', duration: 8000 },
    { id: 'analyze', label: 'Analyzing requested changes', duration: 15000 },
    { id: 'adjust', label: 'Making adjustments', duration: 20000 },
    { id: 'validate', label: 'Validating new plan', duration: 7000 }
  ]
};

function AIProcessingSteps({ agentType, onComplete, onCancel }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  
  const steps = AGENT_STEPS[agentType] || [];
  const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);
  const currentStepData = steps[currentStep];

  useEffect(() => {
    if (!currentStepData) return;

    const stepStartTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - stepStartTime;
      const stepProgress = Math.min(elapsed / currentStepData.duration, 1);
      
      // Calculate overall progress
      const completedSteps = steps.slice(0, currentStep);
      const completedDuration = completedSteps.reduce((sum, step) => sum + step.duration, 0);
      const overallProgress = ((completedDuration + (elapsed * stepProgress)) / totalDuration) * 100;
      
      setProgress(overallProgress);
      setTimeElapsed(Math.floor((Date.now() - stepStartTime) / 1000));

      if (stepProgress >= 1) {
        if (currentStep < steps.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          clearInterval(interval);
          onComplete?.();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [currentStep, currentStepData, onComplete]);

  const estimatedTimeRemaining = Math.max(0, Math.ceil(
    (totalDuration - (progress / 100 * totalDuration)) / 1000
  ));

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full">
          <Brain className="h-6 w-6 text-primary animate-pulse" />
        </div>
        <h3 className="text-lg font-semibold">AI is Working</h3>
        <p className="text-sm text-muted-foreground">
          This may take up to {Math.ceil(totalDuration / 1000)} seconds
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span>{currentStepData?.label || 'Processing...'}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{timeElapsed}s elapsed</span>
          <span>{estimatedTimeRemaining}s remaining</span>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              'flex items-center space-x-3 p-2 rounded-lg transition-colors',
              index === currentStep && 'bg-primary/5',
              index < currentStep && 'text-muted-foreground'
            )}
          >
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
              index < currentStep 
                ? 'bg-primary text-primary-foreground'
                : index === currentStep
                ? 'bg-primary/20 text-primary border-2 border-primary'
                : 'bg-muted text-muted-foreground'
            )}>
              {index < currentStep ? (
                <Check className="h-3 w-3" />
              ) : index === currentStep ? (
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              ) : (
                index + 1
              )}
            </div>
            <span className="text-sm font-medium">{step.label}</span>
          </div>
        ))}
      </div>

      {/* Cancel Button */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={onCancel}>
          Cancel Request
        </Button>
      </div>
    </div>
  );
}
```

### Estimated Time Remaining Calculations

```jsx
function useTimeEstimation(agentType, startTime) {
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [confidence, setConfidence] = useState(0);

  const AGENT_TIMEOUTS = {
    WorkoutGenerationAgent: 30000,
    InsightGenerator: 25000,
    AnalyticsAgent: 35000,
    PlanAdjustmentAgent: 60000
  };

  const HISTORICAL_AVERAGES = {
    WorkoutGenerationAgent: 18000,
    InsightGenerator: 12000,
    AnalyticsAgent: 22000,
    PlanAdjustmentAgent: 35000
  };

  useEffect(() => {
    if (!startTime || !agentType) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const maxTime = AGENT_TIMEOUTS[agentType];
      const avgTime = HISTORICAL_AVERAGES[agentType];

      // Use historical average if we're early in the process
      if (elapsed < avgTime * 0.5) {
        setEstimatedTime(avgTime);
        setConfidence(0.6);
      } 
      // Adjust based on elapsed time if we're past the average
      else if (elapsed < avgTime) {
        const remaining = avgTime - elapsed;
        setEstimatedTime(elapsed + remaining);
        setConfidence(0.8);
      }
      // If we're past average, estimate based on timeout
      else {
        const remaining = maxTime - elapsed;
        setEstimatedTime(elapsed + Math.max(remaining * 0.5, 5000));
        setConfidence(0.4);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, agentType]);

  return {
    estimatedTime,
    confidence,
    timeRemaining: estimatedTime ? Math.max(0, estimatedTime - (Date.now() - startTime)) : null
  };
}
```

### Cancellation Patterns with Cleanup

```jsx
function useCancellableAIRequest() {
  const [abortController, setAbortController] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const startRequest = async (requestFn, options = {}) => {
    const controller = new AbortController();
    setAbortController(controller);
    setIsCancelling(false);

    try {
      const result = await requestFn(controller.signal);
      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request was cancelled');
      }
      throw error;
    } finally {
      setAbortController(null);
      setIsCancelling(false);
    }
  };

  const cancelRequest = async () => {
    if (abortController && !isCancelling) {
      setIsCancelling(true);
      
      // Give user immediate feedback
      toast.info('Cancelling request...');
      
      // Abort the request
      abortController.abort();
      
      // Optional: Notify backend about cancellation
      try {
        await fetch('/api/v1/ai/cancel', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${getAuthToken()}` },
          body: JSON.stringify({ timestamp: Date.now() })
        });
      } catch (error) {
        console.warn('Failed to notify backend about cancellation:', error);
      }
    }
  };

  return {
    startRequest,
    cancelRequest,
    canCancel: !!abortController && !isCancelling,
    isCancelling
  };
}

// Usage in component
function WorkoutGenerationForm() {
  const { startRequest, cancelRequest, canCancel, isCancelling } = useCancellableAIRequest();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateWorkout = async (formData) => {
    setIsGenerating(true);
    
    try {
      const result = await startRequest(async (signal) => {
        const response = await fetch('/api/v1/workouts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
          },
          body: JSON.stringify(formData),
          signal
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
      });

      toast.success('Workout generated successfully!');
      return result;
    } catch (error) {
      if (error.message === 'Request was cancelled') {
        toast.info('Workout generation cancelled');
      } else {
        toast.error('Failed to generate workout');
      }
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <AIProcessingSteps
        agentType="WorkoutGenerationAgent"
        onCancel={canCancel ? cancelRequest : undefined}
        onComplete={() => setIsGenerating(false)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit(generateWorkout)}>
      {/* Form fields */}
    </form>
  );
}
```

## Agent-Specific Loading States

### WorkoutGenerationAgent: 30s Timeout

```jsx
function WorkoutGenerationLoader({ onCancel }) {
  return (
    <div className="text-center space-y-6 p-8">
      <div className="relative">
        <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto flex items-center justify-center">
          <Dumbbell className="h-8 w-8 text-white animate-pulse" />
        </div>
        <div className="absolute inset-0 w-20 h-20 border-4 border-blue-200 rounded-full animate-spin mx-auto border-t-blue-500" />
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Creating Your Perfect Workout</h3>
        <p className="text-muted-foreground">
          Our AI is analyzing your fitness profile and preferences to design a personalized workout plan.
        </p>
      </div>

      <div className="bg-muted/30 p-4 rounded-lg max-w-md mx-auto">
        <h4 className="font-medium mb-2">What's happening:</h4>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>• Analyzing your fitness level and goals</li>
          <li>• Selecting appropriate exercises</li>
          <li>• Optimizing sets, reps, and intensity</li>
          <li>• Ensuring proper progression</li>
        </ul>
      </div>

      <CountdownTimer 
        duration={30}
        onComplete={() => toast.error('Request timed out')}
        onCancel={onCancel}
      />
    </div>
  );
}
```

### InsightGenerator: Progressive Result Display

```jsx
function InsightGenerationLoader({ insights = [], isComplete = false }) {
  const [displayedInsights, setDisplayedInsights] = useState([]);

  useEffect(() => {
    insights.forEach((insight, index) => {
      setTimeout(() => {
        setDisplayedInsights(prev => [...prev, insight]);
      }, index * 1000);
    });
  }, [insights]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center space-x-2">
          <Brain className="h-5 w-5 text-primary animate-pulse" />
          <span className="font-medium">Generating Insights</span>
        </div>
      </div>

      <div className="space-y-4">
        {displayedInsights.map((insight, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-4 bg-card border rounded-lg"
          >
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Lightbulb className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-1">
                <h4 className="font-medium">{insight.title}</h4>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
              </div>
            </div>
          </motion.div>
        ))}

        {!isComplete && (
          <div className="flex items-center justify-center p-4">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              <span className="text-sm text-muted-foreground">Analyzing more data...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

### AnalyticsAgent: Chunked Data Processing

```jsx
function AnalyticsProcessingLoader({ 
  totalChunks = 10, 
  processedChunks = 0,
  currentOperation = 'Analyzing data'
}) {
  const progress = (processedChunks / totalChunks) * 100;

  return (
    <div className="space-y-6 p-6">
      <div className="text-center space-y-2">
        <BarChart3 className="h-12 w-12 text-primary mx-auto animate-pulse" />
        <h3 className="text-lg font-semibold">Processing Analytics</h3>
        <p className="text-sm text-muted-foreground">
          Analyzing your fitness data to generate insights
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span>{currentOperation}</span>
          <span>{processedChunks}/{totalChunks} chunks</span>
        </div>
        
        <Progress value={progress} className="h-3" />
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-primary">{processedChunks}</div>
            <div className="text-xs text-muted-foreground">Processed</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold">{totalChunks - processedChunks}</div>
            <div className="text-xs text-muted-foreground">Remaining</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold">{Math.round(progress)}%</div>
            <div className="text-xs text-muted-foreground">Complete</div>
          </div>
        </div>
      </div>

      <div className="bg-muted/30 p-4 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Processing Operations</span>
        </div>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Data aggregation</span>
            <span className={processedChunks > 0 ? 'text-green-600' : ''}>
              {processedChunks > 0 ? '✓' : '⋯'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Pattern detection</span>
            <span className={processedChunks > totalChunks * 0.5 ? 'text-green-600' : ''}>
              {processedChunks > totalChunks * 0.5 ? '✓' : '⋯'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Insight generation</span>
            <span className={processedChunks === totalChunks ? 'text-green-600' : ''}>
              {processedChunks === totalChunks ? '✓' : '⋯'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### PlanAdjustmentAgent: 60s Timeout Patterns

```jsx
function PlanAdjustmentLoader({ adjustmentType, onCancel }) {
  const [currentPhase, setCurrentPhase] = useState('reviewing');
  
  const phases = {
    reviewing: { label: 'Reviewing current plan', icon: FileText, duration: 15000 },
    analyzing: { label: 'Analyzing requested changes', icon: Search, duration: 20000 },
    adjusting: { label: 'Making adjustments', icon: Settings, duration: 20000 },
    validating: { label: 'Validating modifications', icon: CheckCircle, duration: 5000 }
  };

  useEffect(() => {
    const phaseKeys = Object.keys(phases);
    let currentIndex = 0;

    const progressPhase = () => {
      if (currentIndex < phaseKeys.length - 1) {
        setTimeout(() => {
          currentIndex++;
          setCurrentPhase(phaseKeys[currentIndex]);
          progressPhase();
        }, phases[phaseKeys[currentIndex]].duration);
      }
    };

    progressPhase();
  }, []);

  const CurrentIcon = phases[currentPhase].icon;

  return (
    <div className="space-y-6 p-6">
      <div className="text-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
            <CurrentIcon className="h-8 w-8 text-orange-600 animate-pulse" />
          </div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-orange-200 rounded-full animate-spin mx-auto border-t-orange-500" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Adjusting Your Plan</h3>
          <p className="text-muted-foreground">
            Making personalized modifications based on your feedback
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(phases).map(([phase, config]) => (
          <div
            key={phase}
            className={cn(
              'flex items-center space-x-3 p-3 rounded-lg transition-all',
              phase === currentPhase ? 'bg-orange-50 border border-orange-200' : 'opacity-50'
            )}
          >
            <config.icon className={cn(
              'h-5 w-5',
              phase === currentPhase ? 'text-orange-600' : 'text-muted-foreground'
            )} />
            <span className="font-medium">{config.label}</span>
            {phase === currentPhase && (
              <div className="ml-auto">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600" />
              </div>
            )}
          </div>
        ))}
      </div>

      <Alert>
        <Clock className="h-4 w-4" />
        <AlertTitle>Extended Processing Time</AlertTitle>
        <AlertDescription>
          Plan adjustments require careful analysis and may take up to 60 seconds to complete.
        </AlertDescription>
      </Alert>

      <div className="flex justify-center">
        <Button variant="outline" onClick={onCancel}>
          Cancel Adjustment
        </Button>
      </div>
    </div>
  );
}
```

## Agent Reasoning Display

### Toggleable Reasoning Panels

```jsx
function AIReasoningPanel({ reasoning, isVisible, onToggle }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">AI Reasoning</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="text-muted-foreground"
        >
          {isVisible ? (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              Hide Reasoning
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Show Reasoning
            </>
          )}
        </Button>
      </div>

      <Collapsible open={isVisible} onOpenChange={onToggle}>
        <CollapsibleContent className="space-y-4">
          {reasoning?.steps?.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border-l-4 border-primary/30 pl-4 space-y-2"
            >
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </div>
                <h5 className="font-medium">{step.title}</h5>
                {step.confidence && (
                  <Badge variant="secondary" className="text-xs">
                    {step.confidence}% confident
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{step.description}</p>
              
              {step.factors && (
                <div className="ml-8 space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Considered factors:
                  </span>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {step.factors.map((factor, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
```

### Step-by-Step Process Visualization

```jsx
function ProcessVisualization({ steps, currentStep }) {
  return (
    <div className="space-y-4">
      <h4 className="font-medium flex items-center space-x-2">
        <Brain className="h-4 w-4" />
        <span>AI Thought Process</span>
      </h4>

      <div className="relative">
        {/* Connection Lines */}
        <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-border" />

        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={index} className="relative flex items-start space-x-4">
              {/* Step Indicator */}
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center relative z-10',
                index < currentStep 
                  ? 'bg-green-500 text-white'
                  : index === currentStep
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}>
                {index < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : index === currentStep ? (
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                ) : (
                  <div className="w-3 h-3 bg-current rounded-full" />
                )}
              </div>

              {/* Step Content */}
              <div className={cn(
                'flex-1 space-y-2',
                index <= currentStep ? 'opacity-100' : 'opacity-50'
              )}>
                <h5 className="font-medium">{step.title}</h5>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                
                {step.result && index < currentStep && (
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                    <p className="text-sm text-green-800">{step.result}</p>
                  </div>
                )}

                {index === currentStep && (
                  <div className="flex items-center space-x-2 text-sm text-primary">
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-primary" />
                    <span>Processing...</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Confidence Score Indicators

```jsx
function ConfidenceIndicator({ confidence, label, showDetails = false }) {
  const getConfidenceColor = (score) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceLabel = (score) => {
    if (score >= 0.9) return 'Very High';
    if (score >= 0.8) return 'High';
    if (score >= 0.6) return 'Moderate';
    if (score >= 0.4) return 'Low';
    return 'Very Low';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center space-x-2">
          <div className={cn(
            'px-2 py-1 rounded-full text-xs font-medium',
            getConfidenceColor(confidence)
          )}>
            {getConfidenceLabel(confidence)}
          </div>
          <span className="text-sm text-muted-foreground">
            {Math.round(confidence * 100)}%
          </span>
        </div>
      </div>

      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={cn(
            'h-2 rounded-full transition-all duration-500',
            confidence >= 0.8 ? 'bg-green-500' :
            confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
          )}
          style={{ width: `${confidence * 100}%` }}
        />
      </div>

      {showDetails && (
        <div className="text-xs text-muted-foreground">
          {confidence >= 0.8 && "High confidence - recommendation strongly supported by data"}
          {confidence >= 0.6 && confidence < 0.8 && "Moderate confidence - generally reliable but consider alternatives"}
          {confidence < 0.6 && "Lower confidence - recommendation based on limited data"}
        </div>
      )}
    </div>
  );
}
```

## Error Recovery Patterns

### Partial Failure Handling

```jsx
function usePartialFailureRecovery() {
  const [failureStates, setFailureStates] = useState({});
  const [recoveryOptions, setRecoveryOptions] = useState({});

  const handlePartialFailure = useCallback((operationId, failures, successes) => {
    setFailureStates(prev => ({
      ...prev,
      [operationId]: {
        failures,
        successes,
        timestamp: Date.now()
      }
    }));

    // Determine recovery options based on failure type
    const options = determineRecoveryOptions(failures, successes);
    setRecoveryOptions(prev => ({
      ...prev,
      [operationId]: options
    }));
  }, []);

  const determineRecoveryOptions = (failures, successes) => {
    const options = [];

    if (failures.research && successes.profile) {
      options.push({
        id: 'retry_research',
        label: 'Retry Research Phase',
        description: 'Use basic recommendations without detailed research',
        action: 'retry_partial'
      });
    }

    if (failures.generation && successes.research) {
      options.push({
        id: 'fallback_template',
        label: 'Use Template Workout',
        description: 'Apply a proven template with your research',
        action: 'fallback'
      });
    }

    options.push({
      id: 'restart_full',
      label: 'Start Over',
      description: 'Retry the complete process',
      action: 'restart'
    });

    return options;
  };

  return {
    failureStates,
    recoveryOptions,
    handlePartialFailure
  };
}

function PartialFailureDialog({ operationId, onRecover, onDismiss }) {
  const { failureStates, recoveryOptions } = usePartialFailureRecovery();
  const failure = failureStates[operationId];
  const options = recoveryOptions[operationId] || [];

  if (!failure) return null;

  return (
    <Dialog open onOpenChange={onDismiss}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span>Partial Success</span>
          </DialogTitle>
          <DialogDescription>
            Some parts of the operation completed successfully, but others failed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Success summary */}
          {failure.successes.length > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Completed Successfully:</h4>
              <ul className="text-sm text-green-700 space-y-1">
                {failure.successes.map((success, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <Check className="h-3 w-3" />
                    <span>{success}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Failure summary */}
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-medium text-red-800 mb-2">Failed:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              {failure.failures.map((fail, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <X className="h-3 w-3" />
                  <span>{fail}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recovery options */}
          <div className="space-y-2">
            <h4 className="font-medium">How would you like to proceed?</h4>
            {options.map((option) => (
              <Button
                key={option.id}
                variant="outline"
                className="w-full justify-start text-left h-auto p-3"
                onClick={() => onRecover(option)}
              >
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-muted-foreground">
                    {option.description}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Retry Mechanisms with User Control

```jsx
function useRetryMechanism(maxRetries = 3) {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryHistory, setRetryHistory] = useState([]);

  const retry = useCallback(async (operation, options = {}) => {
    if (retryCount >= maxRetries) {
      throw new Error('Maximum retry attempts reached');
    }

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    const attempt = {
      attemptNumber: retryCount + 1,
      timestamp: Date.now(),
      delay: options.delay || Math.pow(2, retryCount) * 1000
    };

    setRetryHistory(prev => [...prev, attempt]);

    try {
      // Wait for delay if specified
      if (attempt.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, attempt.delay));
      }

      const result = await operation();
      
      // Reset on success
      setRetryCount(0);
      setRetryHistory([]);
      
      return result;
    } catch (error) {
      attempt.error = error.message;
      setRetryHistory(prev => 
        prev.map(h => h.attemptNumber === attempt.attemptNumber ? attempt : h)
      );
      throw error;
    } finally {
      setIsRetrying(false);
    }
  }, [retryCount, maxRetries]);

  const canRetry = retryCount < maxRetries;
  const nextRetryDelay = Math.pow(2, retryCount) * 1000;

  return {
    retry,
    retryCount,
    maxRetries,
    isRetrying,
    canRetry,
    nextRetryDelay,
    retryHistory
  };
}

function RetryDialog({ error, onRetry, onCancel }) {
  const { 
    retry, 
    retryCount, 
    maxRetries, 
    isRetrying, 
    canRetry, 
    nextRetryDelay,
    retryHistory 
  } = useRetryMechanism();

  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (nextRetryDelay > 0) {
      setCountdown(Math.ceil(nextRetryDelay / 1000));
      const interval = setInterval(() => {
        setCountdown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [nextRetryDelay]);

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5 text-orange-500" />
            <span>Operation Failed</span>
          </DialogTitle>
          <DialogDescription>
            {error.message || 'An unexpected error occurred during processing.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Retry history */}
          {retryHistory.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Previous Attempts:</h4>
              <div className="space-y-1">
                {retryHistory.map((attempt) => (
                  <div
                    key={attempt.attemptNumber}
                    className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded"
                  >
                    <span>Attempt {attempt.attemptNumber}</span>
                    <span className="text-red-600">
                      {attempt.error || 'Failed'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Retry options */}
          <div className="flex space-x-2">
            {canRetry && (
              <Button
                onClick={() => retry(onRetry)}
                disabled={isRetrying || countdown > 0}
                className="flex-1"
              >
                {isRetrying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Retrying...
                  </>
                ) : countdown > 0 ? (
                  `Retry in ${countdown}s`
                ) : (
                  `Retry (${retryCount}/${maxRetries})`
                )}
              </Button>
            )}
            
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>

          {!canRetry && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Maximum retries reached</AlertTitle>
              <AlertDescription>
                Please try again later or contact support if the problem persists.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Error Boundary Implementation

```jsx
class AIOperationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to monitoring service
    console.error('AI Operation Error:', error, errorInfo);
    
    // Send to error tracking service
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        tags: {
          component: 'AIOperation',
          operation: this.props.operationType
        },
        extra: errorInfo
      });
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Something went wrong</h3>
            <p className="text-muted-foreground">
              An unexpected error occurred during the AI operation.
            </p>
          </div>

          <div className="flex justify-center space-x-2">
            <Button onClick={this.handleRetry}>
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm font-mono">
                Error Details (Development)
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                {this.state.error && this.state.error.toString()}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage wrapper
function AIOperationWrapper({ operationType, children }) {
  return (
    <AIOperationErrorBoundary operationType={operationType}>
      {children}
    </AIOperationErrorBoundary>
  );
}
```

## Feedback Collection

### Rating Components for AI Responses

```jsx
function AIResponseRating({ responseId, onRatingSubmit }) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);

  const ratingLabels = {
    1: 'Poor',
    2: 'Fair', 
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent'
  };

  const handleSubmit = async () => {
    try {
      await onRatingSubmit({
        responseId,
        rating,
        feedback,
        timestamp: Date.now()
      });
      setIsSubmitted(true);
      toast.success('Thank you for your feedback!');
    } catch (error) {
      toast.error('Failed to submit feedback');
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex items-center space-x-2 text-green-600">
        <Check className="h-4 w-4" />
        <span className="text-sm">Feedback submitted</span>
      </div>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-2">
        <h4 className="font-medium">How was this AI response?</h4>
        
        {/* Star rating */}
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              className="p-1"
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              onClick={() => setRating(star)}
            >
              <Star
                className={cn(
                  'h-5 w-5 transition-colors',
                  (hoveredRating >= star || rating >= star)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                )}
              />
            </button>
          ))}
          {(hoveredRating > 0 || rating > 0) && (
            <span className="ml-2 text-sm text-muted-foreground">
              {ratingLabels[hoveredRating || rating]}
            </span>
          )}
        </div>
      </div>

      {/* Feedback text */}
      {rating > 0 && (
        <div className="space-y-2">
          <Label htmlFor="feedback">Additional feedback (optional)</Label>
          <Textarea
            id="feedback"
            placeholder={rating <= 2 
              ? "What could be improved?" 
              : "What did you like about this response?"
            }
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="min-h-[80px]"
          />
        </div>
      )}

      {/* Submit button */}
      {rating > 0 && (
        <Button onClick={handleSubmit} size="sm">
          Submit Feedback
        </Button>
      )}
    </Card>
  );
}
```

### Issue Reporting Workflow

```jsx
function useIssueReporting() {
  const [isReporting, setIsReporting] = useState(false);

  const reportIssue = useCallback(async (issueData) => {
    setIsReporting(true);
    
    try {
      const response = await fetch('/api/v1/feedback/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          ...issueData,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: Date.now()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit issue report');
      }

      return await response.json();
    } finally {
      setIsReporting(false);
    }
  }, []);

  return { reportIssue, isReporting };
}

function IssueReportDialog({ aiResponse, onClose }) {
  const { reportIssue, isReporting } = useIssueReporting();
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [reproductionSteps, setReproductionSteps] = useState('');

  const issueTypes = [
    { value: 'incorrect_response', label: 'Incorrect or inappropriate response' },
    { value: 'performance', label: 'Slow or unresponsive' },
    { value: 'error', label: 'Error or crash' },
    { value: 'ui_issue', label: 'Display or interface problem' },
    { value: 'other', label: 'Other issue' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await reportIssue({
        type: issueType,
        description,
        reproductionSteps,
        aiResponseId: aiResponse?.id,
        context: {
          agentType: aiResponse?.agentType,
          requestData: aiResponse?.requestData
        }
      });
      
      toast.success('Issue reported successfully. Thank you!');
      onClose();
    } catch (error) {
      toast.error('Failed to submit issue report');
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report an Issue</DialogTitle>
          <DialogDescription>
            Help us improve by reporting problems with the AI response.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type of issue</Label>
            <Select value={issueType} onValueChange={setIssueType}>
              <SelectTrigger>
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent>
                {issueTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe the issue you encountered"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reproduction">Steps to reproduce (optional)</Label>
            <Textarea
              id="reproduction"
              placeholder="1. I clicked on...&#10;2. Then I selected...&#10;3. The issue occurred when..."
              value={reproductionSteps}
              onChange={(e) => setReproductionSteps(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!issueType || !description || isReporting}
            >
              {isReporting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### Improvement Suggestion Forms

```jsx
function ImprovementSuggestionForm({ context }) {
  const [suggestion, setSuggestion] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const categories = [
    { value: 'accuracy', label: 'Response Accuracy' },
    { value: 'personalization', label: 'Personalization' },
    { value: 'speed', label: 'Response Speed' },
    { value: 'ui', label: 'User Interface' },
    { value: 'features', label: 'New Features' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await fetch('/api/v1/feedback/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          suggestion,
          category,
          context,
          timestamp: Date.now()
        })
      });
      
      setIsSubmitted(true);
      setTimeout(() => {
        setSuggestion('');
        setCategory('');
        setIsSubmitted(false);
      }, 3000);
    } catch (error) {
      toast.error('Failed to submit suggestion');
    }
  };

  if (isSubmitted) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center space-x-2 text-green-800">
          <Check className="h-4 w-4" />
          <span className="font-medium">Thank you for your suggestion!</span>
        </div>
        <p className="text-sm text-green-700 mt-1">
          We review all suggestions to improve our AI responses.
        </p>
      </div>
    );
  }

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Lightbulb className="h-4 w-4 mr-2" />
          Suggest Improvement
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-4">
        <Card className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Improvement Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="What aspect could be improved?" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="suggestion">Your suggestion</Label>
              <Textarea
                id="suggestion"
                placeholder="How could we make this better?"
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            <Button 
              type="submit" 
              size="sm"
              disabled={!category || !suggestion}
            >
              Submit Suggestion
            </Button>
          </form>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
```

## Response Handling

### Complete Response Processing

```jsx
function useAIResponseProcessor() {
  const [processing, setProcessing] = useState(false);
  const queryClient = useQueryClient();

  const processResponse = useCallback(async (response, options = {}) => {
    setProcessing(true);
    
    try {
      // Validate response structure
      const validatedResponse = validateResponseStructure(response);
      
      // Extract and format data
      const processedData = await formatResponseData(validatedResponse);
      
      // Cache processed response
      if (options.cacheKey) {
        queryClient.setQueryData(options.cacheKey, processedData);
      }
      
      // Update related queries
      if (options.invalidateQueries) {
        await queryClient.invalidateQueries(options.invalidateQueries);
      }
      
      // Trigger side effects
      if (options.onSuccess) {
        options.onSuccess(processedData);
      }
      
      return processedData;
    } catch (error) {
      console.error('Response processing failed:', error);
      throw new Error('Failed to process AI response');
    } finally {
      setProcessing(false);
    }
  }, [queryClient]);

  const validateResponseStructure = (response) => {
    const requiredFields = ['id', 'agentType', 'content', 'timestamp'];
    
    for (const field of requiredFields) {
      if (!(field in response)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    return response;
  };

  const formatResponseData = async (response) => {
    switch (response.agentType) {
      case 'WorkoutGenerationAgent':
        return formatWorkoutResponse(response);
      case 'InsightGenerator':
        return formatInsightResponse(response);
      case 'AnalyticsAgent':
        return formatAnalyticsResponse(response);
      case 'PlanAdjustmentAgent':
        return formatAdjustmentResponse(response);
      default:
        return response;
    }
  };

  return {
    processResponse,
    processing
  };
}
```

### Result Caching Strategies

```jsx
function useAIResponseCache() {
  const queryClient = useQueryClient();

  const cacheResponse = useCallback((cacheKey, response, options = {}) => {
    const {
      ttl = 30 * 60 * 1000, // 30 minutes default
      tags = [],
      metadata = {}
    } = options;

    const cacheEntry = {
      data: response,
      timestamp: Date.now(),
      ttl,
      tags,
      metadata
    };

    // Store in React Query cache
    queryClient.setQueryData(cacheKey, cacheEntry, {
      staleTime: ttl,
      cacheTime: ttl * 2
    });

    // Store in localStorage for persistence
    try {
      localStorage.setItem(
        `ai_cache_${cacheKey}`, 
        JSON.stringify(cacheEntry)
      );
    } catch (error) {
      console.warn('Failed to cache to localStorage:', error);
    }
  }, [queryClient]);

  const getCachedResponse = useCallback((cacheKey) => {
    // Check React Query cache first
    const queryData = queryClient.getQueryData(cacheKey);
    if (queryData && !isCacheExpired(queryData)) {
      return queryData;
    }

    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(`ai_cache_${cacheKey}`);
      if (stored) {
        const cacheEntry = JSON.parse(stored);
        if (!isCacheExpired(cacheEntry)) {
          // Restore to React Query cache
          queryClient.setQueryData(cacheKey, cacheEntry);
          return cacheEntry;
        } else {
          // Remove expired entry
          localStorage.removeItem(`ai_cache_${cacheKey}`);
        }
      }
    } catch (error) {
      console.warn('Failed to read from localStorage cache:', error);
    }

    return null;
  }, [queryClient]);

  const isCacheExpired = (cacheEntry) => {
    return Date.now() - cacheEntry.timestamp > cacheEntry.ttl;
  };

  const invalidateByTags = useCallback((tags) => {
    // Invalidate React Query cache
    queryClient.invalidateQueries({
      predicate: (query) => {
        const cacheEntry = query.state.data;
        return cacheEntry?.tags?.some(tag => tags.includes(tag));
      }
    });

    // Clear from localStorage
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith('ai_cache_')) {
          const stored = localStorage.getItem(key);
          const cacheEntry = JSON.parse(stored);
          if (cacheEntry.tags?.some(tag => tags.includes(tag))) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to clear localStorage cache by tags:', error);
    }
  }, [queryClient]);

  return {
    cacheResponse,
    getCachedResponse,
    invalidateByTags
  };
}
```

## Performance Considerations

### Memory Management for Long Sessions

```jsx
function useAISessionManager() {
  const [sessionData, setSessionData] = useState({
    interactions: [],
    memoryUsage: 0,
    startTime: Date.now()
  });

  const MAX_INTERACTIONS = 50; // Limit stored interactions
  const MAX_MEMORY_MB = 100; // Memory threshold

  const addInteraction = useCallback((interaction) => {
    setSessionData(prev => {
      const newInteractions = [...prev.interactions, interaction].slice(-MAX_INTERACTIONS);
      const memoryUsage = estimateMemoryUsage(newInteractions);

      // Clean up if memory usage is too high
      if (memoryUsage > MAX_MEMORY_MB * 1024 * 1024) {
        const cleaned = cleanupOldInteractions(newInteractions);
        return {
          ...prev,
          interactions: cleaned,
          memoryUsage: estimateMemoryUsage(cleaned)
        };
      }

      return {
        ...prev,
        interactions: newInteractions,
        memoryUsage
      };
    });
  }, []);

  const estimateMemoryUsage = (interactions) => {
    return interactions.reduce((total, interaction) => {
      return total + JSON.stringify(interaction).length * 2; // Rough estimate
    }, 0);
  };

  const cleanupOldInteractions = (interactions) => {
    // Keep only recent interactions and important ones
    const important = interactions.filter(i => i.important);
    const recent = interactions.slice(-20);
    
    // Merge and deduplicate
    const cleaned = [...important, ...recent].filter((item, index, arr) => 
      arr.findIndex(i => i.id === item.id) === index
    );

    return cleaned;
  };

  const clearSession = useCallback(() => {
    setSessionData({
      interactions: [],
      memoryUsage: 0,
      startTime: Date.now()
    });
  }, []);

  return {
    sessionData,
    addInteraction,
    clearSession
  };
}
```

### Request Debouncing and Throttling

```jsx
function useRequestThrottling() {
  const requestQueue = useRef([]);
  const activeRequests = useRef(new Set());
  const [isThrottled, setIsThrottled] = useState(false);

  const MAX_CONCURRENT = 2; // Maximum concurrent AI requests
  const THROTTLE_DELAY = 1000; // Minimum delay between requests

  const throttledRequest = useCallback(async (requestFn, options = {}) => {
    const requestId = generateId();
    
    return new Promise((resolve, reject) => {
      requestQueue.current.push({
        id: requestId,
        requestFn,
        options,
        resolve,
        reject,
        timestamp: Date.now()
      });

      processQueue();
    });
  }, []);

  const processQueue = useCallback(async () => {
    if (activeRequests.current.size >= MAX_CONCURRENT) {
      return; // Wait for current requests to complete
    }

    const nextRequest = requestQueue.current.shift();
    if (!nextRequest) {
      setIsThrottled(false);
      return;
    }

    setIsThrottled(true);
    activeRequests.current.add(nextRequest.id);

    try {
      // Ensure minimum delay between requests
      const timeSinceStart = Date.now() - nextRequest.timestamp;
      const delay = Math.max(0, THROTTLE_DELAY - timeSinceStart);
      
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const result = await nextRequest.requestFn();
      nextRequest.resolve(result);
    } catch (error) {
      nextRequest.reject(error);
    } finally {
      activeRequests.current.delete(nextRequest.id);
      
      // Process next request after a brief delay
      setTimeout(processQueue, 100);
    }
  }, []);

  const getQueueStatus = () => ({
    queueLength: requestQueue.current.length,
    activeRequests: activeRequests.current.size,
    isThrottled
  });

  return {
    throttledRequest,
    getQueueStatus,
    isThrottled
  };
}
```

## Testing Strategies

### E2E Testing with Cypress

```jsx
// cypress/e2e/ai-interactions.cy.js
describe('AI Interaction Patterns', () => {
  beforeEach(() => {
    cy.visit('/workout-generation');
    cy.login('testuser@example.com', 'password');
  });

  it('should handle workout generation flow', () => {
    // Start workout generation
    cy.get('[data-testid="fitness-level"]').select('intermediate');
    cy.get('[data-testid="goals"]').check(['build_muscle', 'lose_weight']);
    cy.get('[data-testid="generate-workout"]').click();

    // Verify loading state
    cy.get('[data-testid="ai-processing"]').should('be.visible');
    cy.get('[data-testid="progress-bar"]').should('exist');
    cy.get('[data-testid="current-step"]').should('contain.text', 'Analyzing');

    // Wait for completion (with timeout)
    cy.get('[data-testid="workout-result"]', { timeout: 35000 })
      .should('be.visible');
    
    // Verify result structure
    cy.get('[data-testid="exercise-list"]').should('have.length.at.least', 1);
    cy.get('[data-testid="workout-duration"]').should('contain.text', 'min');
  });

  it('should handle cancellation properly', () => {
    cy.get('[data-testid="generate-workout"]').click();
    cy.get('[data-testid="ai-processing"]').should('be.visible');
    
    // Cancel after 2 seconds
    cy.wait(2000);
    cy.get('[data-testid="cancel-request"]').click();
    
    // Verify cancellation
    cy.get('[data-testid="ai-processing"]').should('not.exist');
    cy.get('.toast').should('contain.text', 'cancelled');
  });

  it('should show error recovery options on failure', () => {
    // Mock API failure
    cy.intercept('POST', '/api/v1/workouts', { forceNetworkError: true });
    
    cy.get('[data-testid="generate-workout"]').click();
    
    // Verify error dialog
    cy.get('[data-testid="error-dialog"]').should('be.visible');
    cy.get('[data-testid="retry-button"]').should('be.visible');
    cy.get('[data-testid="cancel-button"]').should('be.visible');
  });

  it('should collect and submit feedback', () => {
    // Complete a successful generation first
    cy.completeWorkoutGeneration();
    
    // Rate the response
    cy.get('[data-testid="rating-stars"] button').eq(3).click(); // 4 stars
    cy.get('[data-testid="feedback-text"]').type('Great workout plan!');
    cy.get('[data-testid="submit-feedback"]').click();
    
    // Verify submission
    cy.get('.toast').should('contain.text', 'Thank you for your feedback');
  });
});
```

### Timeout Scenario Testing

```jsx
// __tests__/ai-timeouts.test.js
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '../mocks/server';
import { rest } from 'msw';
import WorkoutGenerationForm from '../WorkoutGenerationForm';

describe('AI Timeout Scenarios', () => {
  test('handles 30s timeout for workout generation', async () => {
    // Mock slow response that exceeds timeout
    server.use(
      rest.post('/api/v1/workouts', (req, res, ctx) => {
        return res(
          ctx.delay(35000), // 35 second delay
          ctx.json({ error: 'Timeout' }),
          ctx.status(408)
        );
      })
    );

    const user = userEvent.setup();
    render(<WorkoutGenerationForm />);
    
    // Start generation
    await user.click(screen.getByRole('button', { name: /generate/i }));
    
    // Verify timeout handling
    await waitFor(
      () => {
        expect(screen.getByText(/timed out/i)).toBeInTheDocument();
      },
      { timeout: 36000 }
    );
  });

  test('shows estimated time remaining accurately', async () => {
    server.use(
      rest.post('/api/v1/workouts', (req, res, ctx) => {
        return res(
          ctx.delay(15000), // 15 second delay
          ctx.json({ workout: mockWorkout })
        );
      })
    );

    const user = userEvent.setup();
    render(<WorkoutGenerationForm />);
    
    await user.click(screen.getByRole('button', { name: /generate/i }));
    
    // Check time estimates
    expect(screen.getByText(/30 seconds/i)).toBeInTheDocument();
    
    // Wait and check updated estimate
    await waitFor(() => {
      expect(screen.getByText(/remaining/i)).toBeInTheDocument();
    });
  });
});
```

### Error State Testing

```jsx
// __tests__/ai-error-states.test.js
describe('AI Error State Handling', () => {
  test('handles partial failures correctly', async () => {
    const mockPartialFailure = {
      successes: ['profile_analysis', 'research'],
      failures: ['workout_generation'],
      partialResult: { research: mockResearchData }
    };

    server.use(
      rest.post('/api/v1/workouts', (req, res, ctx) => {
        return res(
          ctx.status(207), // Multi-status
          ctx.json(mockPartialFailure)
        );
      })
    );

    const user = userEvent.setup();
    render(<WorkoutGenerationForm />);
    
    await user.click(screen.getByRole('button', { name: /generate/i }));
    
    // Verify partial failure dialog
    await waitFor(() => {
      expect(screen.getByText(/partial success/i)).toBeInTheDocument();
    });
    
    // Check recovery options
    expect(screen.getByText(/retry generation/i)).toBeInTheDocument();
    expect(screen.getByText(/use template/i)).toBeInTheDocument();
  });

  test('retry mechanism with exponential backoff', async () => {
    let attemptCount = 0;
    
    server.use(
      rest.post('/api/v1/workouts', (req, res, ctx) => {
        attemptCount++;
        if (attemptCount < 3) {
          return res(ctx.status(500), ctx.json({ error: 'Server error' }));
        }
        return res(ctx.json({ workout: mockWorkout }));
      })
    );

    const user = userEvent.setup();
    render(<WorkoutGenerationForm />);
    
    await user.click(screen.getByRole('button', { name: /generate/i }));
    
    // Wait for initial failure
    await waitFor(() => {
      expect(screen.getByText(/failed/i)).toBeInTheDocument();
    });
    
    // Retry
    await user.click(screen.getByRole('button', { name: /retry/i }));
    
    // Verify eventual success
    await waitFor(() => {
      expect(screen.getByTestId('workout-result')).toBeInTheDocument();
    });
    
    expect(attemptCount).toBe(3);
  });
});
```

## Common Pitfalls

### Over-Engineering Loading States

```jsx
// ❌ Bad: Too many granular loading states
function BadLoadingStates() {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  
  // Complex state management becomes error-prone
  const startGeneration = async () => {
    try {
      setIsInitializing(true);
      await initialize();
      setIsInitializing(false);
      
      setIsValidating(true);
      await validate();
      setIsValidating(false);
      
      // ... more state juggling
    } catch (error) {
      // Easy to forget to reset states
    }
  };
}

// ✅ Good: Simplified state with clear phases
function GoodLoadingStates() {
  const [phase, setPhase] = useState('idle');
  const [progress, setProgress] = useState(0);
  
  const phases = {
    idle: 'Ready to start',
    processing: 'AI is working...',
    error: 'Something went wrong',
    complete: 'Done!'
  };
  
  const startGeneration = async () => {
    setPhase('processing');
    setProgress(0);
    
    try {
      await processWithProgress((p) => setProgress(p));
      setPhase('complete');
    } catch (error) {
      setPhase('error');
    }
  };
}
```

### Insufficient Error Context

```jsx
// ❌ Bad: Generic error handling
function BadErrorHandling() {
  try {
    await generateWorkout();
  } catch (error) {
    toast.error('Something went wrong');
  }
}

// ✅ Good: Contextual error handling
function GoodErrorHandling({ agentType, userInput }) {
  try {
    await generateWorkout();
  } catch (error) {
    const context = {
      agentType,
      userInput,
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    };
    
    const message = getContextualErrorMessage(error, context);
    const recovery = getRecoveryOptions(error, context);
    
    showErrorDialog({ message, recovery, context });
  }
}
```

### Memory Leaks in Long Sessions

```jsx
// ❌ Bad: Memory leaks from uncleaned subscriptions
function BadMemoryManagement() {
  useEffect(() => {
    const subscription = subscribeToUpdates((data) => {
      // Handle update
    });
    
    // Missing cleanup!
  }, []);
}

// ✅ Good: Proper cleanup
function GoodMemoryManagement() {
  useEffect(() => {
    const subscription = subscribeToUpdates((data) => {
      // Handle update
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Also cleanup large objects
  useEffect(() => {
    return () => {
      // Clear large cached responses
      clearResponseCache();
    };
  }, []);
}
```

## Integration Examples

### Complete Workout Generation Flow

```jsx
function CompleteWorkoutGenerationFlow() {
  const [currentPhase, setCurrentPhase] = useState('form');
  const [workoutData, setWorkoutData] = useState(null);
  const [error, setError] = useState(null);

  const phases = {
    form: FormPhase,
    processing: ProcessingPhase,
    result: ResultPhase,
    error: ErrorPhase
  };

  const CurrentPhase = phases[currentPhase];

  return (
    <AIOperationWrapper operationType="workout_generation">
      <div className="max-w-4xl mx-auto p-6">
        <CurrentPhase
          workoutData={workoutData}
          error={error}
          onDataChange={setWorkoutData}
          onPhaseChange={setCurrentPhase}
          onError={setError}
        />
      </div>
    </AIOperationWrapper>
  );
}

function FormPhase({ onDataChange, onPhaseChange }) {
  const form = useWorkoutForm();

  const handleSubmit = async (data) => {
    onDataChange(data);
    onPhaseChange('processing');
  };

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Generate Your Workout</CardTitle>
        <CardDescription>
          Tell us about your fitness goals and preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        <WorkoutGenerationForm onSubmit={handleSubmit} />
      </CardContent>
    </Card>
  );
}

function ProcessingPhase({ workoutData, onPhaseChange, onError }) {
  const { processResponse } = useAIResponseProcessor();
  const { throttledRequest } = useRequestThrottling();

  useEffect(() => {
    const generateWorkout = async () => {
      try {
        const response = await throttledRequest(async () => {
          return fetch('/api/v1/workouts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify(workoutData)
          });
        });

        const result = await processResponse(response);
        onPhaseChange('result');
      } catch (error) {
        onError(error);
        onPhaseChange('error');
      }
    };

    generateWorkout();
  }, [workoutData]);

  return (
    <AIProcessingSteps
      agentType="WorkoutGenerationAgent"
      onCancel={() => onPhaseChange('form')}
    />
  );
}

function ResultPhase({ workoutData }) {
  const [showReasoning, setShowReasoning] = useState(false);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Personalized Workout</CardTitle>
          <CardDescription>
            Generated based on your goals and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkoutDisplay workout={workoutData} />
        </CardContent>
      </Card>

      <AIReasoningPanel
        reasoning={workoutData?.reasoning}
        isVisible={showReasoning}
        onToggle={setShowReasoning}
      />

      <AIResponseRating
        responseId={workoutData?.id}
        onRatingSubmit={handleRatingSubmit}
      />
    </div>
  );
}
```

This comprehensive AI interaction patterns documentation provides complete patterns for implementing user-friendly AI interfaces with proper loading states, reasoning display, error handling, feedback collection, and performance optimization. The patterns ensure users understand what the AI is doing while maintaining control over the process. 