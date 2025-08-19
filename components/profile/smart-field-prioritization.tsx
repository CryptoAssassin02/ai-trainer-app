/**
 * Smart Field Prioritization Component
 * Phase 2.1.4 - Intelligent field prioritization based on user context and completion strategy
 */

'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Star, 
  Zap, 
  Clock, 
  ArrowRight, 
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Brain,
  Lightbulb
} from 'lucide-react';
import { useProfileCompleteness, useEnhancedProfile } from '@/lib/enhanced-profile-context';
import { cn } from '@/lib/utils';

// Field priority calculation interface
interface FieldPriority {
  fieldName: string;
  displayName: string;
  section: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  score: number;
  reasoning: string[];
  impact: string;
  estimatedTime: string;
  dependencies: string[];
  unlocks: string[];
}

// User context factors
interface UserContext {
  profileCompleteness: number;
  hasWorkoutGoals: boolean;
  hasEquipment: boolean;
  hasExperience: boolean;
  hasMedicalConditions: boolean;
  timeInApp: 'new' | 'returning' | 'experienced';
  lastActiveSection: string;
}

interface SmartFieldPrioritizationProps {
  variant?: 'dashboard' | 'sidebar' | 'modal';
  maxSuggestions?: number;
  onFieldClick?: (fieldName: string) => void;
  showReasoningDetails?: boolean;
  className?: string;
}

export function SmartFieldPrioritization({
  variant = 'dashboard',
  maxSuggestions = 5,
  onFieldClick,
  showReasoningDetails = false,
  className,
}: SmartFieldPrioritizationProps) {
  const { profile } = useEnhancedProfile();
  const { completeness } = useProfileCompleteness();

  // Calculate user context
  const userContext = useMemo<UserContext>(() => {
    const profileData = profile;
    return {
      profileCompleteness: completeness.overallPercentage,
      hasWorkoutGoals: (profileData?.goals?.length || 0) > 0,
      hasEquipment: (profileData?.equipment?.length || 0) > 0,
      hasExperience: !!profileData?.experienceLevel,
      hasMedicalConditions: !!(profileData?.medicalConditions && profileData.medicalConditions.length > 0),
      timeInApp: completeness.overallPercentage > 50 ? 'returning' : 'new',
      lastActiveSection: 'personal', // This would come from analytics
    };
  }, [profile, completeness]);

  // Field priority scoring algorithm
  const calculateFieldPriorities = useMemo<FieldPriority[]>(() => {
    const fields: FieldPriority[] = [];

    // Critical safety fields
    if (!profile?.age) {
      fields.push({
        fieldName: 'age',
        displayName: 'Age',
        section: 'Personal Information',
        priority: 'critical',
        score: 100,
        reasoning: [
          'Required for safe exercise recommendations',
          'Needed for heart rate calculations',
          'Critical for intensity guidelines'
        ],
        impact: 'Enables safe, age-appropriate workout generation',
        estimatedTime: '30 seconds',
        dependencies: [],
        unlocks: ['Heart rate zones', 'Exercise intensity', 'Recovery recommendations']
      });
    }

    if (!profile?.experienceLevel) {
      fields.push({
        fieldName: 'experienceLevel',
        displayName: 'Fitness Experience Level',
        section: 'Fitness Information',
        priority: 'critical',
        score: 95,
        reasoning: [
          'Determines appropriate exercise complexity',
          'Prevents injury from inappropriate progressions',
          'Essential for workout plan generation'
        ],
        impact: 'Unlocks personalized workout plan creation',
        estimatedTime: '1 minute',
        dependencies: [],
        unlocks: ['Workout plans', 'Exercise progression', 'Difficulty levels']
      });
    }

    // High-impact fields
    if (!profile?.goals || profile.goals.length === 0) {
      fields.push({
        fieldName: 'goals',
        displayName: 'Fitness Goals',
        section: 'Fitness Information',
        priority: 'high',
        score: userContext.hasExperience ? 90 : 70,
        reasoning: [
          'Shapes entire workout structure',
          'Determines exercise selection and rep ranges',
          'Critical for motivation and progress tracking'
        ],
        impact: 'Dramatically improves workout relevance and effectiveness',
        estimatedTime: '2 minutes',
        dependencies: ['experienceLevel'],
        unlocks: ['Goal-specific workouts', 'Progress tracking', 'Motivation features']
      });
    }

    if (!profile?.height || !profile?.weight) {
      const missingFields = [];
      if (!profile?.height) missingFields.push('height');
      if (!profile?.weight) missingFields.push('weight');
      
      fields.push({
        fieldName: missingFields.join(','),
        displayName: `Physical Measurements (${missingFields.join(', ')})`,
        section: 'Physical Measurements',
        priority: 'high',
        score: userContext.hasWorkoutGoals ? 85 : 60,
        reasoning: [
          'Needed for caloric calculations',
          'Required for BMI and body composition tracking',
          'Important for exercise form recommendations'
        ],
        impact: 'Enables nutrition recommendations and progress tracking',
        estimatedTime: '1 minute',
        dependencies: [],
        unlocks: ['Calorie calculations', 'BMI tracking', 'Nutrition plans']
      });
    }

    // Equipment-based prioritization
    if (!profile?.equipment || profile.equipment.length === 0) {
      fields.push({
        fieldName: 'equipment',
        displayName: 'Available Equipment',
        section: 'Equipment & Preferences',
        priority: userContext.hasWorkoutGoals ? 'high' : 'medium',
        score: userContext.hasWorkoutGoals ? 80 : 50,
        reasoning: [
          'Ensures all exercises can be performed',
          'Maximizes workout variety and effectiveness',
          'Prevents frustration from inaccessible exercises'
        ],
        impact: 'Guarantees all recommended exercises are doable',
        estimatedTime: '3 minutes',
        dependencies: ['goals', 'experienceLevel'],
        unlocks: ['Equipment-specific workouts', 'Exercise variety', 'Home gym optimization']
      });
    }

    // Frequency for scheduling
    if (!profile?.workoutFrequency) {
      fields.push({
        fieldName: 'workoutFrequency',
        displayName: 'Workout Frequency',
        section: 'Equipment & Preferences',
        priority: userContext.hasWorkoutGoals ? 'medium' : 'low',
        score: userContext.hasWorkoutGoals ? 65 : 30,
        reasoning: [
          'Determines workout split and structure',
          'Affects recovery recommendations',
          'Important for realistic scheduling'
        ],
        impact: 'Optimizes workout timing and recovery',
        estimatedTime: '1 minute',
        dependencies: ['goals'],
        unlocks: ['Workout scheduling', 'Recovery planning', 'Split routines']
      });
    }

    // Medical conditions (context-sensitive)
    if (!profile?.medicalConditions && userContext.profileCompleteness > 60) {
      fields.push({
        fieldName: 'medicalConditions',
        displayName: 'Medical Conditions & Limitations',
        section: 'Fitness Information',
        priority: 'medium',
        score: 55,
        reasoning: [
          'Ensures exercise safety',
          'Prevents contraindicated movements',
          'Important for liability and user safety'
        ],
        impact: 'Provides safer, more appropriate exercise recommendations',
        estimatedTime: '2 minutes',
        dependencies: [],
        unlocks: ['Safe exercise filtering', 'Modification suggestions', 'Injury prevention']
      });
    }

    // Name for personalization (low priority but nice UX)
    if (!profile?.name) {
      fields.push({
        fieldName: 'name',
        displayName: 'Name',
        section: 'Personal Information',
        priority: 'low',
        score: 20,
        reasoning: [
          'Personalizes the experience',
          'Improves motivation through personal connection',
          'Makes workout plans feel more tailored'
        ],
        impact: 'Creates a more personalized, engaging experience',
        estimatedTime: '30 seconds',
        dependencies: [],
        unlocks: ['Personalized greetings', 'Custom workout names', 'Achievement recognition']
      });
    }

    // Sort by score and apply contextual adjustments
    return fields
      .map(field => ({
        ...field,
        score: adjustScoreForContext(field, userContext)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions);
  }, [profile, userContext, maxSuggestions]);

  // Adjust scores based on user context
  function adjustScoreForContext(field: FieldPriority, context: UserContext): number {
    let adjustedScore = field.score;

    // New users need basic info first
    if (context.timeInApp === 'new') {
      if (['age', 'experienceLevel'].includes(field.fieldName)) {
        adjustedScore += 20;
      }
    }

    // Users with goals need equipment info more urgently
    if (context.hasWorkoutGoals && field.fieldName === 'equipment') {
      adjustedScore += 15;
    }

    // Boost medical conditions for users with experience
    if (context.hasExperience && field.fieldName === 'medicalConditions') {
      adjustedScore += 10;
    }

    // Lower priority for cosmetic fields if core info is missing
    if (context.profileCompleteness < 50 && field.priority === 'low') {
      adjustedScore -= 15;
    }

    return adjustedScore;
  }

  const priorities = calculateFieldPriorities;

  // Get priority icon and color
  const getPriorityDisplay = (priority: FieldPriority['priority']) => {
    switch (priority) {
      case 'critical':
        return { icon: AlertTriangle, color: 'text-red-600 bg-red-100', label: 'Critical' };
      case 'high':
        return { icon: Star, color: 'text-orange-600 bg-orange-100', label: 'High' };
      case 'medium':
        return { icon: TrendingUp, color: 'text-blue-600 bg-blue-100', label: 'Medium' };
      case 'low':
        return { icon: Clock, color: 'text-gray-600 bg-gray-100', label: 'Low' };
    }
  };

  // Sidebar variant
  if (variant === 'sidebar') {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Smart Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {priorities.slice(0, 3).map((field) => {
            const display = getPriorityDisplay(field.priority);
            return (
              <div
                key={field.fieldName}
                className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => onFieldClick?.(field.fieldName)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{field.displayName}</span>
                  <Badge variant="outline" className={cn("text-xs", display.color)}>
                    {display.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{field.impact}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{field.estimatedTime}</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  // Dashboard variant (default)
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-[#3E9EFF]" />
          Smart Recommendations
          <Badge variant="outline" className="ml-auto">
            AI-Powered
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {priorities.length === 0 ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              🎉 Excellent! Your profile is optimally complete. You're ready for the best possible workout recommendations!
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Based on your current profile and goals
              </span>
              <span className="flex items-center gap-1">
                <Lightbulb className="h-3 w-3 text-yellow-500" />
                <span className="text-xs">Smart AI Analysis</span>
              </span>
            </div>

            <div className="space-y-3">
              {priorities.map((field, index) => {
                const display = getPriorityDisplay(field.priority);
                return (
                  <div
                    key={field.fieldName}
                    className="p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer"
                    onClick={() => onFieldClick?.(field.fieldName)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-full", display.color)}>
                          <display.icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium">{field.displayName}</div>
                          <div className="text-sm text-muted-foreground">{field.section}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={cn("mb-1", display.color)}>
                          {display.label}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          {field.estimatedTime}
                        </div>
                      </div>
                    </div>

                    <p className="text-sm mb-3">{field.impact}</p>

                    {showReasoningDetails && (
                      <div className="space-y-2 mb-3">
                        <div className="text-xs font-medium text-muted-foreground">Why this matters:</div>
                        <ul className="text-xs space-y-1">
                          {field.reasoning.map((reason, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-[#3E9EFF] font-bold">•</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {field.unlocks.length > 0 && (
                      <div className="space-y-2 mb-3">
                        <div className="text-xs font-medium text-muted-foreground">This unlocks:</div>
                        <div className="flex flex-wrap gap-1">
                          {field.unlocks.slice(0, 3).map((unlock) => (
                            <Badge key={unlock} variant="secondary" className="text-xs">
                              {unlock}
                            </Badge>
                          ))}
                          {field.unlocks.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{field.unlocks.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Progress value={(5 - index) * 20} className="w-16 h-2" />
                        <span className="text-xs text-muted-foreground">
                          Impact: {field.priority}
                        </span>
                      </div>
                      <Button variant="outline" size="sm">
                        Complete Now
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
