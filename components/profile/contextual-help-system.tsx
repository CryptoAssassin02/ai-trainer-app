/**
 * Contextual Help System
 * Phase 2.1.4 - Contextual help and tooltips with accessibility features
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Temporarily disabled Tooltip to prevent Radix UI infinite loops
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  HelpCircle, 
  Info, 
  Lightbulb, 
  Target, 
  Shield,
  Zap,
  Heart,
  Dumbbell,
  Settings,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Help content database
const HELP_CONTENT = {
  // Personal Information
  name: {
    title: 'Your Name',
    description: 'This is how you\'ll be addressed in the app. You can use your real name or a preferred name.',
    tips: ['Use the name you\'re most comfortable with', 'This will appear in your workout plans and progress reports'],
    category: 'personal'
  },
  age: {
    title: 'Age',
    description: 'Your age helps us calculate appropriate exercise intensity, recovery needs, and safety considerations.',
    tips: [
      'Used for heart rate calculations and exercise intensity',
      'Helps determine appropriate workout progression',
      'Required for safety recommendations'
    ],
    category: 'personal'
  },
  gender: {
    title: 'Gender Identity',
    description: 'Optional information that helps us provide more personalized fitness and nutrition recommendations.',
    tips: [
      'Completely optional - choose what you\'re comfortable sharing',
      'Helps with metabolic calculations and exercise recommendations',
      'You can change this anytime in your settings'
    ],
    category: 'personal'
  },
  
  // Physical Measurements
  height: {
    title: 'Height',
    description: 'Your height is used for calculating BMI, caloric needs, and exercise form recommendations.',
    tips: [
      'Measure without shoes for accuracy',
      'Used for body composition calculations',
      'Choose your preferred unit system (metric/imperial)'
    ],
    category: 'physical'
  },
  weight: {
    title: 'Weight',
    description: 'Current weight helps us calculate caloric needs and track progress over time.',
    tips: [
      'Weigh yourself at the same time each day for consistency',
      'Morning weight after using the bathroom is most accurate',
      'Don\'t worry about daily fluctuations - focus on trends'
    ],
    category: 'physical'
  },
  
  // Fitness Information
  experienceLevel: {
    title: 'Fitness Experience Level',
    description: 'This determines the complexity and intensity of your workout recommendations.',
    tips: [
      'Beginner: 0-6 months of consistent training',
      'Intermediate: 6 months - 2 years of consistent training',
      'Advanced: 2+ years of consistent training',
      'Be honest - starting at the right level prevents injury'
    ],
    category: 'fitness'
  },
  goals: {
    title: 'Fitness Goals',
    description: 'Your goals shape the entire workout plan - exercise selection, rep ranges, and program structure.',
    tips: [
      'Choose up to 5 goals for best results',
      'More specific goals lead to better recommendations',
      'You can update these as your priorities change',
      'Consider both short-term and long-term objectives'
    ],
    category: 'fitness'
  },
  medicalConditions: {
    title: 'Medical Conditions',
    description: 'Help us provide safer workout recommendations by sharing relevant health information.',
    tips: [
      'Include any injuries, chronic conditions, or physical limitations',
      'Mention any exercises you should avoid',
      'This information is kept strictly confidential',
      'Always consult your doctor before starting a new exercise program'
    ],
    category: 'fitness',
    important: true
  },
  
  // Equipment & Preferences
  equipment: {
    title: 'Available Equipment',
    description: 'We\'ll only recommend exercises you can actually perform with your available equipment.',
    tips: [
      'Include home gym equipment, gym access, or bodyweight options',
      'Don\'t have equipment? Focus on bodyweight and resistance bands',
      'You can update this list as you acquire new equipment',
      'More equipment options = more exercise variety'
    ],
    category: 'equipment'
  },
  workoutFrequency: {
    title: 'Workout Frequency',
    description: 'How often you plan to work out affects program design and recovery recommendations.',
    tips: [
      'Be realistic about your schedule and commitments',
      'Quality over quantity - consistent 3x/week beats sporadic 6x/week',
      'Consider your recovery needs and other life stresses',
      'You can always adjust this as your schedule changes'
    ],
    category: 'equipment'
  }
} as const;

// Category icons and colors
const CATEGORY_CONFIG = {
  personal: { icon: Heart, color: 'blue', label: 'Personal Info' },
  physical: { icon: Dumbbell, color: 'green', label: 'Measurements' },
  fitness: { icon: Target, color: 'purple', label: 'Fitness Level' },
  equipment: { icon: Settings, color: 'orange', label: 'Equipment' }
} as const;

// Field help tooltip component
interface FieldHelpTooltipProps {
  fieldName: keyof typeof HELP_CONTENT;
  variant?: 'icon' | 'button' | 'inline';
  className?: string;
}

export function FieldHelpTooltip({ 
  fieldName, 
  variant = 'icon',
  className 
}: FieldHelpTooltipProps) {
  const content = HELP_CONTENT[fieldName];
  if (!content) return null;

  const categoryConfig = CATEGORY_CONFIG[content.category];

  const trigger = variant === 'button' ? (
    <Button variant="ghost" size="sm" className={cn("h-auto p-1", className)}>
      <HelpCircle className="h-4 w-4" />
    </Button>
  ) : variant === 'inline' ? (
    <div className={cn("inline-flex items-center gap-1 text-sm text-muted-foreground cursor-help", className)}>
      <HelpCircle className="h-3 w-3" />
      <span>Need help?</span>
    </div>
  ) : (
    <HelpCircle className={cn("h-4 w-4 text-muted-foreground cursor-help", className)} />
  );

  // Temporarily use title attribute instead of Tooltip to prevent Radix UI infinite loops
  const tooltipText = `${content.title}: ${content.description}${content.tips ? ` Tips: ${content.tips.slice(0, 2).join(', ')}` : ''}`;
  
  return (
    <div title={tooltipText}>
      {trigger}
    </div>
  );
}

// Detailed help dialog component
interface DetailedHelpDialogProps {
  fieldName: keyof typeof HELP_CONTENT;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DetailedHelpDialog({ 
  fieldName, 
  trigger,
  open,
  onOpenChange 
}: DetailedHelpDialogProps) {
  const content = HELP_CONTENT[fieldName];
  if (!content) return null;

  const categoryConfig = CATEGORY_CONFIG[content.category];

  const defaultTrigger = (
    <Button variant="ghost" size="sm">
      <Info className="h-4 w-4 mr-2" />
      Learn More
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <categoryConfig.icon className="h-5 w-5" />
            {content.title}
            {content.important && (
              <Badge variant="destructive">Important</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            <Badge variant="outline" className="mb-3">
              {categoryConfig.label}
            </Badge>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm">{content.description}</p>
          
          {content.tips && content.tips.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">Helpful Tips</span>
              </div>
              <ul className="space-y-2">
                {content.tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-primary font-bold">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {content.important && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-red-600 mt-0.5" />
                <div className="text-sm text-red-800">
                  <div className="font-medium">Important Health Information</div>
                  <div className="mt-1">
                    This information is crucial for your safety. Always consult with a healthcare 
                    professional before starting any new exercise program, especially if you have 
                    medical conditions.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Help overlay for entire forms
interface FormHelpOverlayProps {
  show: boolean;
  onClose: () => void;
  currentStep?: string;
}

export function FormHelpOverlay({ show, onClose, currentStep }: FormHelpOverlayProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (!show) return null;

  const fieldsInStep = Object.entries(HELP_CONTENT).filter(([_, content]) => {
    if (!currentStep) return true;
    
    const stepCategories: Record<string, string[]> = {
      personal: ['personal'],
      measurements: ['physical'],
      fitness: ['fitness'],
      preferences: ['equipment']
    };
    
    return stepCategories[currentStep]?.includes(content.category);
  });

  const categorizedFields = Object.entries(CATEGORY_CONFIG).map(([key, config]) => ({
    key,
    config,
    fields: fieldsInStep.filter(([_, content]) => content.category === key)
  })).filter(category => category.fields.length > 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Form Help Guide
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {categorizedFields.map(({ key, config, fields }) => (
            <div key={key} className="space-y-3">
              <Button
                variant="ghost"
                className="w-full justify-start p-3 h-auto"
                onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
              >
                <config.icon className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">{config.label}</div>
                  <div className="text-sm text-muted-foreground">
                    {fields.length} field{fields.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </Button>
              
              {selectedCategory === key && (
                <div className="ml-6 space-y-3">
                  {fields.map(([fieldName, content]) => (
                    <div key={fieldName} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{content.title}</span>
                        {content.important && (
                          <Badge variant="destructive" className="text-xs">Important</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {content.description}
                      </p>
                      {content.tips && content.tips.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-xs font-medium">Quick Tips:</div>
                          <ul className="text-xs space-y-1">
                            {content.tips.slice(0, 2).map((tip, index) => (
                              <li key={index} className="flex items-start gap-1">
                                <Zap className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          <div className="pt-4 border-t">
            <div className="text-center text-sm text-muted-foreground">
              Need more help? Each field has a <HelpCircle className="h-3 w-3 inline mx-1" /> icon 
              for quick tips and detailed information.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Quick help button for forms
interface QuickHelpButtonProps {
  currentStep?: string;
  className?: string;
}

export function QuickHelpButton({ currentStep, className }: QuickHelpButtonProps) {
  const [showOverlay, setShowOverlay] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowOverlay(true)}
        className={cn("text-muted-foreground hover:text-foreground", className)}
      >
        <HelpCircle className="h-4 w-4 mr-2" />
        Help
      </Button>
      <FormHelpOverlay 
        show={showOverlay} 
        onClose={() => setShowOverlay(false)}
        currentStep={currentStep}
      />
    </>
  );
}
