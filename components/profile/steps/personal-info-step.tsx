/**
 * Personal Information Step Component
 * Phase 2.1.4 - Multi-step form component for basic personal details
 */

'use client';

import React from 'react';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { VALIDATION_CONSTANTS } from '@/lib/validation/profile-schemas';
import { 
  ValidationIndicator, 
  FieldStatusBadge, 
  ValidationFeedback,
  StepValidationSummary 
} from '../enhanced-field-validation';

interface PersonalInfoStepProps {
  form: any;
  unitPreference: 'metric' | 'imperial';
  isLoading?: boolean;
}

export function PersonalInfoStep({ form, unitPreference, isLoading }: PersonalInfoStepProps) {
  return (
    <div className="space-y-6">
      
      {/* Unit Preference */}
      <FormField
        control={form.control}
        name="unitPreference"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-base font-semibold">🌍 Unit System</FormLabel>
            <FormDescription>
              Choose your preferred unit system for measurements
            </FormDescription>
            <FormControl>
              <NativeSelect 
                onValueChange={field.onChange} 
                value={field.value || 'metric'}
                disabled={isLoading}
                data-testid="unit-preference-select"
                placeholder="Select unit system"
                options={[
                  { value: 'metric', label: 'Metric (kg, cm)' },
                  { value: 'imperial', label: 'Imperial (lbs, ft/in)' }
                ]}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Personal Details Grid - Mobile-First Responsive */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        
        {/* Full Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel className="text-base font-semibold flex items-center gap-2">
                  👤 Full Name *
                  <ValidationIndicator fieldName="name" form={form} />
                </FormLabel>
                <FieldStatusBadge 
                  fieldName="name" 
                  form={form} 
                  requiredFields={['name']}
                />
              </div>
              <FormControl>
                <Input 
                  placeholder="Enter your full name"
                  disabled={isLoading}
                  {...field} 
                  maxLength={VALIDATION_CONSTANTS.NAME_MAX_LENGTH}
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                  data-testid="name-input"
                />
              </FormControl>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{field.value?.length || 0}/{VALIDATION_CONSTANTS.NAME_MAX_LENGTH} characters</span>
              </div>
              <ValidationFeedback
                fieldName="name"
                form={form}
                helpText="Your name as you'd like it to appear in the app"
                validationRules={[
                  'At least 2 characters long',
                  `Maximum ${VALIDATION_CONSTANTS.NAME_MAX_LENGTH} characters`,
                  'Contains only letters, spaces, and common punctuation'
                ]}
              />
              <FormMessage data-testid="name-error" />
            </FormItem>
          )}
        />

        {/* Age */}
        <FormField
          control={form.control}
          name="age"
          render={({ field: { value, onChange, ...fieldProps } }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel className="text-base font-semibold flex items-center gap-2">
                  🎂 Age *
                  <ValidationIndicator fieldName="age" form={form} />
                </FormLabel>
                <FieldStatusBadge 
                  fieldName="age" 
                  form={form} 
                  requiredFields={['age']}
                />
              </div>
              <FormControl>
                <Input
                  type="number"
                  min={VALIDATION_CONSTANTS.AGE_MIN}
                  max={VALIDATION_CONSTANTS.AGE_MAX}
                  placeholder={`${VALIDATION_CONSTANTS.AGE_MIN}-${VALIDATION_CONSTANTS.AGE_MAX} years`}
                  disabled={isLoading}
                  value={value || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange(val ? Number.parseInt(val, 10) : undefined);
                  }}
                  data-testid="age-input"
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                  {...fieldProps}
                />
              </FormControl>
              <ValidationFeedback
                fieldName="age"
                form={form}
                helpText="Your age helps us provide appropriate fitness recommendations"
                validationRules={[
                  `Must be at least ${VALIDATION_CONSTANTS.AGE_MIN} years old`,
                  `Must be no more than ${VALIDATION_CONSTANTS.AGE_MAX} years old`,
                  'Required for personalized workout planning'
                ]}
              />
              <FormMessage data-testid="age-error" />
            </FormItem>
          )}
        />
      </div>

      {/* Gender Identity */}
      <FormField
        control={form.control}
        name="gender"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel className="text-base font-semibold flex items-center gap-2">
                ⚧️ Gender Identity *
                <ValidationIndicator fieldName="gender" form={form} />
              </FormLabel>
              <FieldStatusBadge 
                fieldName="gender" 
                form={form} 
                requiredFields={['gender']}
              />
            </div>
            <FormDescription>
              This helps us provide more personalized recommendations
            </FormDescription>
            <FormControl>
              <NativeSelect 
                onValueChange={field.onChange} 
                value={field.value || ''}
                disabled={isLoading}
                data-testid="gender-select"
                placeholder="Select gender"
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                  { value: 'prefer_not_to_say', label: 'Prefer not to say' }
                ]}
              />
            </FormControl>
            <ValidationFeedback
              fieldName="gender"
              form={form}
              helpText="Gender helps us tailor fitness recommendations to your physiology"
              validationRules={[
                'Required for personalized workout planning',
                'Helps optimize exercise selection and intensity',
                'Improves nutritional recommendations accuracy'
              ]}
            />
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Step Validation Summary */}
      <StepValidationSummary
        form={form}
        stepFields={['name', 'age', 'gender', 'unitPreference']}
        requiredFields={['name', 'age', 'gender']}
      />

      {/* Step Summary */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium mb-2">✨ Why we need this information:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• <strong>Name:</strong> Personalize your experience</li>
          <li>• <strong>Age:</strong> Adjust exercise recommendations for your life stage</li>
          <li>• <strong>Gender:</strong> Tailor fitness and nutrition guidance to your physiology</li>
          <li>• <strong>Units:</strong> Display measurements in your preferred system</li>
        </ul>
      </div>
    </div>
  );
}
