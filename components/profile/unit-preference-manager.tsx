/**
 * Unit Preference Manager Component
 * Phase 2.1.4 - Comprehensive unit preference management across the application
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NativeRadioGroup } from '@/components/ui/native-radio-group';
import { FormLabel } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Globe, 
  Ruler, 
  Weight, 
  ArrowLeftRight, 
  Info,
  Check,
  AlertTriangle
} from 'lucide-react';
import { useUnitPreference } from '@/lib/enhanced-profile-context';
import { cn } from '@/lib/utils';

interface UnitPreferenceManagerProps {
  variant?: 'full' | 'compact' | 'toggle';
  showConversion?: boolean;
  onUnitChange?: (units: 'metric' | 'imperial') => void;
  className?: string;
}

export function UnitPreferenceManager({
  variant = 'full',
  showConversion = true,
  onUnitChange,
  className,
}: UnitPreferenceManagerProps) {
  const { unitPreference, setUnitPreference, converters } = useUnitPreference();
  const [isChanging, setIsChanging] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleUnitChange = async (newUnits: 'metric' | 'imperial') => {
    if (newUnits === unitPreference) return;

    setIsChanging(true);
    try {
      await setUnitPreference(newUnits);
      onUnitChange?.(newUnits);
      setShowConfirmation(true);
      setTimeout(() => setShowConfirmation(false), 3000);
    } catch (error) {
      console.error('Failed to update unit preference:', error);
    } finally {
      setIsChanging(false);
    }
  };

  // Example conversions for display
  const exampleConversions = {
    metric: {
      height: '175 cm',
      weight: '70 kg',
      description: 'Centimeters and kilograms'
    },
    imperial: {
      height: '5\' 9"',
      weight: '154 lbs',
      description: 'Feet/inches and pounds'
    }
  };

  // Toggle variant - simple switch
  if (variant === 'toggle') {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <Globe className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <Button
            variant={unitPreference === 'metric' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleUnitChange('metric')}
            disabled={isChanging}
            className="text-xs"
          >
            Metric
          </Button>
          <Button
            variant={unitPreference === 'imperial' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleUnitChange('imperial')}
            disabled={isChanging}
            className="text-xs"
          >
            Imperial
          </Button>
        </div>
        {showConfirmation && (
          <div className="flex items-center gap-1 text-green-600">
            <Check className="h-3 w-3" />
            <span className="text-xs">Updated</span>
          </div>
        )}
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="font-medium">Units</span>
            </div>
            <NativeRadioGroup
              name="unit-preference-compact"
              value={unitPreference}
              onValueChange={(value) => handleUnitChange(value as 'metric' | 'imperial')}
              className="flex gap-4"
              disabled={isChanging}
              options={[
                { value: 'metric', label: 'Metric' },
                { value: 'imperial', label: 'Imperial' }
              ]}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full variant - comprehensive unit management
  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Unit Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Unit selection */}
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-4 rounded-lg border transition-colors hover:bg-muted/50">
                <input
                  type="radio"
                  id="metric-full"
                  name="unit-preference-full"
                  value="metric"
                  checked={unitPreference === 'metric'}
                  onChange={(e) => handleUnitChange(e.target.value as 'metric' | 'imperial')}
                  disabled={isChanging}
                  className="mt-1 h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <div className="flex-1 space-y-1">
                  <label htmlFor="metric-full" className="text-base font-medium cursor-pointer">
                    Metric System
                  </label>
                  <p className="text-sm text-muted-foreground">
                    {exampleConversions.metric.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Ruler className="h-4 w-4" />
                      <span>{exampleConversions.metric.height}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Weight className="h-4 w-4" />
                      <span>{exampleConversions.metric.weight}</span>
                    </div>
                  </div>
                </div>
                {unitPreference === 'metric' && (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Active
                  </Badge>
                )}
              </div>

              <div className="flex items-start space-x-3 p-4 rounded-lg border transition-colors hover:bg-muted/50">
                <input
                  type="radio"
                  id="imperial-full"
                  name="unit-preference-full"
                  value="imperial"
                  checked={unitPreference === 'imperial'}
                  onChange={(e) => handleUnitChange(e.target.value as 'metric' | 'imperial')}
                  disabled={isChanging}
                  className="mt-1 h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <div className="flex-1 space-y-1">
                  <label htmlFor="imperial-full" className="text-base font-medium cursor-pointer">
                    Imperial System
                  </label>
                  <p className="text-sm text-muted-foreground">
                    {exampleConversions.imperial.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Ruler className="h-4 w-4" />
                      <span>{exampleConversions.imperial.height}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Weight className="h-4 w-4" />
                      <span>{exampleConversions.imperial.weight}</span>
                    </div>
                  </div>
                </div>
                {unitPreference === 'imperial' && (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Active
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Conversion examples */}
          {showConversion && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4" />
                <h4 className="font-medium">Quick Conversions</h4>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="font-medium text-sm mb-1">Height</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>170 cm = 5' 7"</div>
                    <div>180 cm = 5' 11"</div>
                    <div>6' 0" = 183 cm</div>
                  </div>
                </div>
                
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="font-medium text-sm mb-1">Weight</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>70 kg = 154 lbs</div>
                    <div>80 kg = 176 lbs</div>
                    <div>200 lbs = 91 kg</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Information alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> Changing your unit preference will update how measurements are displayed throughout the app. 
              Your actual measurement values will be automatically converted.
            </AlertDescription>
          </Alert>

          {/* Confirmation message */}
          {showConfirmation && (
            <Alert className="border-green-200 bg-green-50">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Unit preference updated successfully! All measurements will now display in{' '}
                <strong>{unitPreference === 'metric' ? 'metric' : 'imperial'}</strong> units.
              </AlertDescription>
            </Alert>
          )}

          {/* Warning for existing data */}
          {unitPreference && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Data Conversion:</strong> If you have existing height and weight data, 
                it will be automatically converted to the new unit system when you save changes.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Utility component for displaying unit-aware values
interface UnitAwareDisplayProps {
  value: number | { feet: number; inches: number };
  type: 'height' | 'weight';
  targetUnits?: 'metric' | 'imperial';
  className?: string;
}

export function UnitAwareDisplay({ 
  value, 
  type, 
  targetUnits,
  className 
}: UnitAwareDisplayProps) {
  const { unitPreference, converters } = useUnitPreference();
  const displayUnits = targetUnits || unitPreference;

  const formattedValue = type === 'height' 
    ? converters.formatHeight(value, displayUnits)
    : converters.formatWeight(value as number, displayUnits);

  return (
    <span className={className}>
      {formattedValue}
    </span>
  );
}

// Hook for unit-aware form inputs
export function useUnitAwareInput(type: 'height' | 'weight') {
  const { unitPreference, converters } = useUnitPreference();

  const convertToDisplay = (value: any) => {
    if (!value) return value;
    
    if (type === 'height') {
      return converters.convertHeight(value, 'metric', unitPreference);
    } else {
      return converters.convertWeight(value, 'metric', unitPreference);
    }
  };

  const convertToStorage = (value: any) => {
    if (!value) return value;
    
    if (type === 'height') {
      return converters.convertHeight(value, unitPreference, 'metric');
    } else {
      return converters.convertWeight(value, unitPreference, 'metric');
    }
  };

  const getPlaceholder = () => {
    if (type === 'height') {
      return unitPreference === 'metric' ? 'Height in cm' : 'Height (feet/inches)';
    } else {
      return unitPreference === 'metric' ? 'Weight in kg' : 'Weight in lbs';
    }
  };

  const getUnit = () => {
    if (type === 'height') {
      return unitPreference === 'metric' ? 'cm' : 'ft/in';
    } else {
      return unitPreference === 'metric' ? 'kg' : 'lbs';
    }
  };

  return {
    unitPreference,
    convertToDisplay,
    convertToStorage,
    getPlaceholder,
    getUnit,
  };
}
