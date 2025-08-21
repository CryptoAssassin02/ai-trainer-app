/**
 * Equipment and Preferences Step Component
 * Phase 2.1.4 - Multi-step form component for workout equipment and exercise preferences
 */

'use client';

import React from 'react';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { NativeCheckbox } from '@/components/ui/native-checkbox';
import { NativeSelect } from '@/components/ui/native-select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSafeFormWatch } from '@/hooks/use-safe-form-watch';
// Use dynamic import for lucide-react to handle Jest environment issues
let Info: any = 'div';
try {
  const lucideReact = require("lucide-react");
  Info = lucideReact.Info || 'div';
} catch (e) {
  // Fallback to div in test environment
  Info = 'div';
}
import { VALIDATION_CONSTANTS } from '@/lib/validation/profile-schemas';

interface EquipmentPreferencesStepProps {
  form: any;
  unitPreference: 'metric' | 'imperial';
  isLoading?: boolean;
}

const equipmentCategories = [
  {
    category: "Free Weights",
    icon: "🏋️",
    equipment: [
      { id: "dumbbells", label: "Dumbbells", description: "Adjustable or fixed weight dumbbells" },
      { id: "barbells", label: "Barbells", description: "Olympic or standard barbells with plates" },
      { id: "kettlebells", label: "Kettlebells", description: "Traditional Russian kettlebells" },
      { id: "medicine_balls", label: "Medicine Balls", description: "Weighted balls for functional training" },
    ]
  },
  {
    category: "Machines & Stations",
    icon: "⚙️",
    equipment: [
      { id: "cable_machine", label: "Cable Machine", description: "Pulley system with adjustable weights" },
      { id: "smith_machine", label: "Smith Machine", description: "Guided barbell system" },
      { id: "power_rack", label: "Power Rack/Squat Rack", description: "Multi-purpose weight training station" },
      { id: "leg_press", label: "Leg Press Machine", description: "Seated or angled leg press" },
      { id: "lat_pulldown", label: "Lat Pulldown", description: "Upper body pulling machine" },
    ]
  },
  {
    category: "Cardio Equipment",
    icon: "🏃",
    equipment: [
      { id: "treadmill", label: "Treadmill", description: "Motorized running/walking machine" },
      { id: "stationary_bike", label: "Stationary Bike", description: "Upright or recumbent exercise bike" },
      { id: "elliptical", label: "Elliptical Machine", description: "Low-impact cardio machine" },
      { id: "rowing_machine", label: "Rowing Machine", description: "Full-body cardio and strength" },
      { id: "stair_climber", label: "Stair Climber", description: "Vertical climbing cardio machine" },
    ]
  },
  {
    category: "Bodyweight & Accessories",
    icon: "🤸",
    equipment: [
      { id: "pull_up_bar", label: "Pull-up Bar", description: "Fixed or doorway pull-up bar" },
      { id: "resistance_bands", label: "Resistance Bands", description: "Elastic bands for resistance training" },
      { id: "suspension_trainer", label: "Suspension Trainer", description: "TRX or similar suspension system" },
      { id: "yoga_mat", label: "Yoga/Exercise Mat", description: "Floor mat for bodyweight exercises" },
      { id: "foam_roller", label: "Foam Roller", description: "Recovery and mobility tool" },
    ]
  },
  {
    category: "Specialized Equipment",
    icon: "🎯",
    equipment: [
      { id: "battle_ropes", label: "Battle Ropes", description: "Heavy ropes for conditioning" },
      { id: "plyometric_box", label: "Plyometric Box", description: "Platform for jump training" },
      { id: "agility_ladder", label: "Agility Ladder", description: "Speed and coordination training" },
      { id: "parallette_bars", label: "Parallette Bars", description: "Low parallel bars for calisthenics" },
    ]
  }
];



const workoutFrequencies = [
  { value: "1", label: "1x per week", description: "Light activity, maintenance" },
  { value: "2", label: "2x per week", description: "Moderate activity" },
  { value: "3", label: "3x per week", description: "Regular training schedule" },
  { value: "4", label: "4x per week", description: "Active training routine" },
  { value: "5", label: "5x per week", description: "Dedicated fitness routine" },
  { value: "6", label: "6x per week", description: "High-volume training" },
  { value: "7", label: "Daily", description: "Maximum frequency" },
];

export function EquipmentPreferencesStep({ 
  form, 
  unitPreference, 
  isLoading 
}: EquipmentPreferencesStepProps) {
  
  const selectedEquipment = useSafeFormWatch(form, 'equipment', []);

  return (
    <div className="space-y-6">
      
      {/* Workout Frequency */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📅 Workout Frequency</CardTitle>
          <FormDescription>
            How often do you plan to work out each week?
          </FormDescription>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="workoutFrequency"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <NativeSelect
                    onValueChange={field.onChange}
                    value={field.value || ''}
                    disabled={isLoading}
                    data-testid="workout-frequency-input"
                    placeholder="Select workout frequency"
                    options={workoutFrequencies.map((freq) => ({
                      value: freq.value,
                      label: `${freq.label} - ${freq.description}`
                    }))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>



      {/* Available Equipment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🏋️ Available Equipment</CardTitle>
          <div className="space-y-2">
            <FormDescription>
              Select all equipment you have access to (gym, home, etc.)
            </FormDescription>
            {selectedEquipment.length > 0 && (
              <Badge variant="outline" className="inline-flex">
                {selectedEquipment.length} items selected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {equipmentCategories.map((category) => (
              <div key={category.category} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{category.icon}</span>
                  <h4 className="font-semibold text-lg">{category.category}</h4>
                </div>
                
                <div className="grid grid-cols-1 gap-3 pl-3 sm:pl-6 sm:grid-cols-2">
                  {category.equipment.map((item) => (
                    <FormField
                      key={item.id}
                      control={form.control}
                      name="equipment"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <label className={`flex items-start space-x-3 p-3 rounded-lg border transition-all hover:shadow-sm cursor-pointer touch-manipulation ${
                              selectedEquipment.includes(item.id) ? 'bg-[#3E9EFF]/5 border-[#3E9EFF]' : 'border-border hover:bg-muted/30'
                            }`}>
                              <input
                                type="checkbox"
                                value={item.id}
                                checked={selectedEquipment.includes(item.id)}
                                onChange={(e) => {
                                  const currentEquipment = field.value || [];
                                  if (e.target.checked) {
                                    field.onChange([...currentEquipment, item.id]);
                                  } else {
                                    field.onChange(currentEquipment.filter((eq: string) => eq !== item.id));
                                  }
                                }}
                                disabled={isLoading}
                                className="sr-only"
                                data-testid={`equipment-${item.id}`}
                              />
                              <div className="flex-1">
                                <span className="text-sm font-medium cursor-pointer">
                                  {item.label}
                                </span>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {item.description}
                                </div>
                              </div>
                            </label>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {selectedEquipment.length === 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>No equipment?</strong> No problem! Select "Yoga/Exercise Mat" and focus on bodyweight exercises, 
                or choose "Resistance Bands" for a versatile, affordable option that works anywhere.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Step Summary */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium mb-2">🎯 Customizing your workout experience:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• <strong>Frequency:</strong> Determines workout split and recovery time</li>
          <li>• <strong>Equipment:</strong> Ensures all recommended exercises can be performed with your available gear</li>
          <li>• <strong>Flexibility:</strong> Your preferences can be updated anytime as your situation changes</li>
        </ul>
      </div>
    </div>
  );
}
