/**
 * Height Input Component
 * Demonstrates complex nested validation for height with unit conversion
 */

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ruler, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { 
  heightFormSchema, 
  type HeightFormData,
  VALIDATION_CONSTANTS,
  validateHeightFormat
} from '@/lib/validation/profile-schemas';

interface HeightInputProps {
  initialHeight?: number | { feet: number; inches: number };
  initialUnit?: 'metric' | 'imperial';
  onHeightChange?: (height: number | { feet: number; inches: number }, unit: 'metric' | 'imperial') => void;
  disabled?: boolean;
}

export function HeightInput({ 
  initialHeight, 
  initialUnit = 'metric', 
  onHeightChange,
  disabled = false
}: HeightInputProps) {
  const [unitPreference, setUnitPreference] = useState<'metric' | 'imperial'>(initialUnit);
  const [convertedHeight, setConvertedHeight] = useState<string>('');

  const form = useForm<HeightFormData>({
    resolver: zodResolver(heightFormSchema),
    mode: 'onChange',
    defaultValues: {
      unitPreference,
      height: initialHeight || (unitPreference === 'metric' ? 0 : { feet: 0, inches: 0 }),
    },
  });

  // Watch for changes
  const watchedHeight = form.watch('height');
  const watchedUnit = form.watch('unitPreference');

  // Convert height between units
  const convertHeight = (
    height: number | { feet: number; inches: number },
    fromUnit: 'metric' | 'imperial',
    toUnit: 'metric' | 'imperial'
  ): number | { feet: number; inches: number } => {
    if (fromUnit === toUnit) return height;

    if (fromUnit === 'metric' && toUnit === 'imperial' && typeof height === 'number') {
      const totalInches = height / 2.54;
      const feet = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      return { feet, inches };
    }

    if (fromUnit === 'imperial' && toUnit === 'metric' && typeof height === 'object') {
      const totalInches = (height.feet * 12) + height.inches;
      return Math.round(totalInches * 2.54);
    }

    return height;
  };

  // Handle unit preference change
  const handleUnitChange = (newUnit: 'metric' | 'imperial') => {
    const currentHeight = form.getValues('height');
    const convertedHeight = convertHeight(currentHeight, unitPreference, newUnit);
    
    setUnitPreference(newUnit);
    form.setValue('unitPreference', newUnit);
    form.setValue('height', convertedHeight);
    
    // Update converted height display
    if (newUnit === 'metric' && typeof convertedHeight === 'number') {
      const imperial = convertHeight(convertedHeight, 'metric', 'imperial') as { feet: number; inches: number };
      setConvertedHeight(`${imperial.feet}' ${imperial.inches}"`);
    } else if (newUnit === 'imperial' && typeof convertedHeight === 'object') {
      const metric = convertHeight(convertedHeight, 'imperial', 'metric') as number;
      setConvertedHeight(`${metric} cm`);
    }
  };

  // Update converted height when height changes
  useEffect(() => {
    if (watchedHeight && validateHeightFormat(watchedHeight, unitPreference)) {
      if (unitPreference === 'metric' && typeof watchedHeight === 'number') {
        const imperial = convertHeight(watchedHeight, 'metric', 'imperial') as { feet: number; inches: number };
        setConvertedHeight(`${imperial.feet}' ${imperial.inches}"`);
      } else if (unitPreference === 'imperial' && typeof watchedHeight === 'object') {
        const metric = convertHeight(watchedHeight, 'imperial', 'metric') as number;
        setConvertedHeight(`${metric} cm`);
      }
      
      // Notify parent component
      onHeightChange?.(watchedHeight, unitPreference);
    }
  }, [watchedHeight, unitPreference, onHeightChange]);

  const resetHeight = () => {
    const defaultHeight = unitPreference === 'metric' 
      ? VALIDATION_CONSTANTS.HEIGHT_MIN_CM + 120 
      : { feet: 5, inches: 8 };
    form.setValue('height', defaultHeight);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ruler className="h-5 w-5" />
          Height Input
        </CardTitle>
        <CardDescription>
          Enter your height with automatic unit conversion and validation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <div className="space-y-4">
            
            {/* Unit Toggle */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${unitPreference === 'imperial' ? 'font-medium' : 'text-muted-foreground'}`}>
                  Imperial
                </span>
                <Switch
                  checked={unitPreference === 'metric'}
                  onCheckedChange={(checked) => handleUnitChange(checked ? 'metric' : 'imperial')}
                  disabled={disabled}
                />
                <span className={`text-sm ${unitPreference === 'metric' ? 'font-medium' : 'text-muted-foreground'}`}>
                  Metric
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetHeight}
                disabled={disabled}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            {/* Height Input Fields */}
            {unitPreference === 'metric' ? (
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height (Centimeters)</FormLabel>
                    <div className="flex items-center space-x-2">
                      <FormControl>
                        <Input
                          type="number"
                          min={VALIDATION_CONSTANTS.HEIGHT_MIN_CM}
                          max={VALIDATION_CONSTANTS.HEIGHT_MAX_CM}
                          placeholder="Height in cm"
                          value={typeof field.value === 'number' ? field.value || '' : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val ? Number.parseFloat(val) : 0);
                          }}
                          disabled={disabled}
                          className="flex-1"
                        />
                      </FormControl>
                      <span className="text-muted-foreground text-sm">cm</span>
                    </div>
                    <FormDescription>
                      Range: {VALIDATION_CONSTANTS.HEIGHT_MIN_CM}-{VALIDATION_CONSTANTS.HEIGHT_MAX_CM} cm
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div className="space-y-3">
                <FormLabel>Height (Feet & Inches)</FormLabel>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center space-x-2">
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={VALIDATION_CONSTANTS.HEIGHT_MAX_FEET}
                              placeholder="Feet"
                              value={typeof field.value === 'object' ? field.value.feet || '' : ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                const currentValue = typeof field.value === 'object' ? field.value : { feet: 0, inches: 0 };
                                field.onChange({
                                  ...currentValue,
                                  feet: val ? Number.parseInt(val, 10) : 0
                                });
                              }}
                              disabled={disabled}
                              className="flex-1"
                            />
                          </FormControl>
                          <span className="text-muted-foreground text-sm">ft</span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center space-x-2">
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={11}
                              placeholder="Inches"
                              value={typeof field.value === 'object' ? field.value.inches || '' : ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                const currentValue = typeof field.value === 'object' ? field.value : { feet: 0, inches: 0 };
                                field.onChange({
                                  ...currentValue,
                                  inches: val ? Number.parseInt(val, 10) : 0
                                });
                              }}
                              disabled={disabled}
                              className="flex-1"
                            />
                          </FormControl>
                          <span className="text-muted-foreground text-sm">in</span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormDescription>
                  Range: 0-{VALIDATION_CONSTANTS.HEIGHT_MAX_FEET} ft, 0-11 in
                </FormDescription>
              </div>
            )}

            {/* Conversion Display */}
            {convertedHeight && (
              <Alert>
                <AlertDescription>
                  <strong>Converted:</strong> {convertedHeight}
                </AlertDescription>
              </Alert>
            )}

            {/* Validation Status */}
            {form.formState.errors.height && (
              <Alert variant="destructive">
                <AlertDescription>
                  {form.formState.errors.height.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Form State Debug (for development) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                <div>Unit: {unitPreference}</div>
                <div>Valid: {form.formState.isValid ? 'Yes' : 'No'}</div>
                <div>Height: {JSON.stringify(watchedHeight)}</div>
              </div>
            )}
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}

// Example usage component
export function HeightInputExample() {
  const [height, setHeight] = useState<number | { feet: number; inches: number }>(175);
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');

  const handleHeightChange = (
    newHeight: number | { feet: number; inches: number }, 
    newUnit: 'metric' | 'imperial'
  ) => {
    setHeight(newHeight);
    setUnit(newUnit);
    console.log('Height changed:', { height: newHeight, unit: newUnit });
  };

  return (
    <div className="p-6 space-y-4">
      <HeightInput
        initialHeight={height}
        initialUnit={unit}
        onHeightChange={handleHeightChange}
      />
      
      <div className="text-sm text-muted-foreground">
        Current height: {JSON.stringify(height)} ({unit})
      </div>
    </div>
  );
}
