/**
 * Profile Completeness Indicator Component
 * Phase 2.1.4 - Visual feedback for profile completion progress
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  ArrowRight, 
  Target,
  TrendingUp,
  Award,
  Info
} from 'lucide-react';
import { useProfileCompleteness } from '@/lib/enhanced-profile-context';
import { cn } from '@/lib/utils';

interface ProfileCompletenessIndicatorProps {
  variant?: 'default' | 'compact' | 'detailed';
  showRecommendations?: boolean;
  onRecommendationClick?: (recommendationId: string) => void;
  className?: string;
}

export function ProfileCompletenessIndicator({
  variant = 'default',
  showRecommendations = true,
  onRecommendationClick,
  className,
}: ProfileCompletenessIndicatorProps) {
  const { completeness, isProfileComplete, getNextRecommendation } = useProfileCompleteness();
  
  const nextRecommendation = getNextRecommendation();
  const requiredRecommendations = completeness.recommendations.filter(r => r.type === 'required');
  const suggestedRecommendations = completeness.recommendations.filter(r => r.type === 'suggested');

  // Determine completion status and styling
  const getCompletionStatus = () => {
    if (completeness.overallPercentage >= 100) {
      return { color: 'green', icon: Award, label: 'Complete', description: 'Your profile is fully optimized!' };
    } else if (completeness.overallPercentage >= 80) {
      return { color: 'blue', icon: TrendingUp, label: 'Nearly Complete', description: 'Just a few more details needed' };
    } else if (completeness.overallPercentage >= 50) {
      return { color: 'yellow', icon: Clock, label: 'In Progress', description: 'Making good progress' };
    } else {
      return { color: 'red', icon: AlertCircle, label: 'Needs Attention', description: 'Important information missing' };
    }
  };

  const status = getCompletionStatus();

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-3 p-3 bg-muted/50 rounded-lg", className)}>
        <div className="flex items-center gap-2">
          <status.icon className={`h-4 w-4 text-${status.color}-600`} />
          <span className="text-sm font-medium">{completeness.overallPercentage}% Complete</span>
        </div>
        <Progress value={completeness.overallPercentage} className="flex-1 h-2" />
        {nextRecommendation && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRecommendationClick?.(nextRecommendation.id)}
            className="text-xs"
          >
            <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  // Detailed variant
  if (variant === 'detailed') {
    return (
      <div className={cn("space-y-4", className)}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <status.icon className={`h-5 w-5 text-${status.color}-600`} />
                <CardTitle className="text-lg">Profile Completion</CardTitle>
              </div>
              <Badge 
                variant={completeness.overallPercentage >= 80 ? "default" : "secondary"}
                className="font-semibold"
              >
                {completeness.overallPercentage}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium">{status.label}</span>
                <span className="text-muted-foreground">{status.description}</span>
              </div>
              <Progress value={completeness.overallPercentage} className="h-3" />
            </div>

            {/* Section breakdown */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Section Progress</h4>
              {Object.entries(completeness.sectionProgress).map(([key, section]) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {section.percentage === 100 ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : section.isRequired ? (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="text-sm capitalize">{key.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={section.percentage} className="w-16 h-2" />
                    <span className="text-xs text-muted-foreground w-8">
                      {section.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        {showRecommendations && completeness.recommendations.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {requiredRecommendations.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-medium text-sm text-red-700">Required</h5>
                  {requiredRecommendations.map((rec) => (
                    <Alert key={rec.id} className="border-red-200 bg-red-50">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-red-800">{rec.title}</div>
                            <div className="text-sm text-red-700">{rec.description}</div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onRecommendationClick?.(rec.id)}
                            className="border-red-300 text-red-700 hover:bg-red-100"
                          >
                            {rec.action}
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {suggestedRecommendations.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-medium text-sm text-blue-700">Suggested</h5>
                  {suggestedRecommendations.slice(0, 3).map((rec) => (
                    <Alert key={rec.id} className="border-blue-200 bg-blue-50">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertDescription>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-blue-800">{rec.title}</div>
                            <div className="text-sm text-blue-700">{rec.description}</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRecommendationClick?.(rec.id)}
                            className="text-blue-700 hover:bg-blue-100"
                          >
                            {rec.action}
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <status.icon className={`h-5 w-5 text-${status.color}-600`} />
            <CardTitle>Profile Completion</CardTitle>
          </div>
          <Badge 
            variant={isProfileComplete ? "default" : "secondary"}
            className="font-semibold"
          >
            {completeness.overallPercentage}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium">{status.label}</span>
            <span className="text-muted-foreground">
              {completeness.completedSections.length}/{Object.keys(completeness.sectionProgress).length} sections
            </span>
          </div>
          <Progress value={completeness.overallPercentage} className="h-3" />
          <div className="text-xs text-muted-foreground mt-1">
            {status.description}
          </div>
        </div>

        {/* Next recommendation */}
        {showRecommendations && nextRecommendation && (
          <Alert className={cn(
            nextRecommendation.type === 'required' ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'
          )}>
            <AlertCircle className={cn(
              "h-4 w-4",
              nextRecommendation.type === 'required' ? 'text-red-600' : 'text-blue-600'
            )} />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <div>
                  <div className={cn(
                    "font-medium",
                    nextRecommendation.type === 'required' ? 'text-red-800' : 'text-blue-800'
                  )}>
                    {nextRecommendation.title}
                  </div>
                  <div className={cn(
                    "text-sm",
                    nextRecommendation.type === 'required' ? 'text-red-700' : 'text-blue-700'
                  )}>
                    {nextRecommendation.description}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRecommendationClick?.(nextRecommendation.id)}
                  className={cn(
                    nextRecommendation.type === 'required' 
                      ? 'border-red-300 text-red-700 hover:bg-red-100'
                      : 'border-blue-300 text-blue-700 hover:bg-blue-100'
                  )}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Perfect completion state */}
        {isProfileComplete && (
          <Alert className="border-green-200 bg-green-50">
            <Award className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="text-green-800 font-medium">
                🎉 Perfect! Your profile is complete and optimized for the best workout recommendations.
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
