/**
 * Physical Measurements Step Component
 * Phase 2.1.4 - Multi-step form component for height and weight with unit conversion
 */

'use client';

import React from 'react';
import { useSafeFormWatchMultiple } from '@/hooks/use-safe-form-watch';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { VALIDATION_CONSTANTS } from '@/lib/validation/profile-schemas';

interface PhysicalMeasurementsStepProps {
  form: any;
  unitPreference: 'metric' | 'imperial';
  isLoading?: boolean;
}

export function PhysicalMeasurementsStep({ 
  form, 
  unitPreference, 
  isLoading 
}: PhysicalMeasurementsStepProps) {
  // Safely watch form values to prevent infinite loops
  const formValues = useSafeFormWatchMultiple(form, ['height', 'weight'], {
    height: '',
    weight: ''
  });
  
  return (
    <div className="space-y-6">
      
      {/* Measurements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Height */}
        <Card>
          <CardContent className="pt-6">
            {unitPreference === 'imperial' ? (
              <div className="space-y-4">
                <FormLabel className="text-base font-semibold">📏 Height</FormLabel>
                <FormDescription>
                  Enter your height in feet and inches
                </FormDescription>
                
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="height.feet"
                    render={({ field: { value, onChange, ...fieldProps } }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max={VALIDATION_CONSTANTS.HEIGHT_MAX_FEET}
                            placeholder="Feet"
                            disabled={isLoading}
                            value={value || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              onChange(val ? Number.parseInt(val, 10) : undefined);
                            }}
                            data-testid="height-feet-input"
                            {...fieldProps}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="height.inches"
                    render={({ field: { value, onChange, ...fieldProps } }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="11"
                            placeholder="Inches"
                            disabled={isLoading}
                            value={value || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              onChange(val ? Number.parseInt(val, 10) : undefined);
                            }}
                            data-testid="height-inches-input"
                            {...fieldProps}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Height conversion display */}
                {formValues.height?.feet && formValues.height?.inches !== undefined && (
                  <div className="text-xs text-muted-foreground">
                    ≈ {Math.round(((formValues.height.feet * 12) + formValues.height.inches) * 2.54)} cm
                  </div>
                )}
              </div>
            ) : (
              <FormField
                control={form.control}
                name="height"
                render={({ field: { value, onChange, ...fieldProps } }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">📏 Height</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min={VALIDATION_CONSTANTS.HEIGHT_MIN_CM}
                        max={VALIDATION_CONSTANTS.HEIGHT_MAX_CM}
                        placeholder="Height in centimeters"
                        disabled={isLoading}
                        value={value || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          onChange(val ? Number.parseFloat(val) : undefined);
                        }}
                        data-testid="height-input"
                        {...fieldProps}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter your height in centimeters ({VALIDATION_CONSTANTS.HEIGHT_MIN_CM}-{VALIDATION_CONSTANTS.HEIGHT_MAX_CM} cm)
                    </FormDescription>
                    
                    {/* Height conversion display */}
                    {value && (
                      <div className="text-xs text-muted-foreground">
                        ≈ {Math.floor(value / 30.48)}'{Math.round((value % 30.48) / 2.54)}"
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Weight */}
        <Card>
          <CardContent className="pt-6">
            <FormField
              control={form.control}
              name="weight"
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">⚖️ Weight</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      placeholder={`Weight in ${unitPreference === 'metric' ? 'kg' : 'lbs'}`}
                      disabled={isLoading}
                      value={value || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        onChange(val ? Number.parseFloat(val) : undefined);
                      }}
                      data-testid="weight-input"
                      {...fieldProps}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter your weight in {unitPreference === 'metric' ? 'kilograms' : 'pounds'}
                    {unitPreference === 'metric' 
                      ? ` (${VALIDATION_CONSTANTS.WEIGHT_MIN_METRIC}-${VALIDATION_CONSTANTS.WEIGHT_MAX_METRIC} kg)`
                      : ` (${VALIDATION_CONSTANTS.WEIGHT_MIN_IMPERIAL}-${VALIDATION_CONSTANTS.WEIGHT_MAX_IMPERIAL} lbs)`
                    }
                  </FormDescription>
                  
                  {/* Weight conversion display */}
                  {value && (
                    <div className="text-xs text-muted-foreground">
                      {unitPreference === 'metric' 
                        ? `≈ ${Math.round(value * 2.20462)} lbs`
                        : `≈ ${Math.round(value * 0.453592 * 10) / 10} kg`
                      }
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </div>

      {/* BMI Calculation Display */}
      {(() => {
        const weight = formValues.weight;
        let height = formValues.height;
        
        // Convert imperial height to metric for BMI calculation
        if (unitPreference === 'imperial' && typeof height === 'object' && height?.feet !== undefined && height?.inches !== undefined) {
          height = ((height.feet * 12) + height.inches) * 2.54; // Convert to cm
        }
        
        if (weight && height && height > 0) {
          const heightInMeters = height / 100;
          const weightInKg = unitPreference === 'imperial' ? weight * 0.453592 : weight;
          const bmi = weightInKg / (heightInMeters * heightInMeters);
          
          return (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <h4 className="font-semibold mb-2">📊 Body Mass Index (BMI)</h4>
                  <div className="text-2xl font-bold mb-3">{bmi.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">
                    BMI is a general health indicator. Consult a healthcare professional for personalized advice.
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }
        
        return null;
      })()}

      {/* Step Summary */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium mb-2">💪 Why we need your measurements:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• <strong>Height & Weight:</strong> Calculate accurate calorie and nutrition targets</li>
          <li>• <strong>BMI Reference:</strong> Provide appropriate exercise intensity recommendations</li>
          <li>• <strong>Progress Tracking:</strong> Monitor your fitness journey over time</li>
          <li>• <strong>Equipment Sizing:</strong> Suggest appropriate weights and resistance levels</li>
        </ul>
      </div>
    </div>
  );
}
