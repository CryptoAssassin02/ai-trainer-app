/**
 * Gym Category Step Component
 * Phase 3 of Option 3: Frontend component replacement for equipment preferences
 * Replaces equipment-preferences-step.tsx with gym category selection
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormDescription, FormLabel, FormControl, FormMessage, FormItem } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

interface GymCategoryStepProps {
  form: any;
  isLoading?: boolean;
}

/**
 * Comprehensive gym categories based on use-gym-categories.md research
 * Updated with 2025 equipment standards including plate-loaded and pin-loaded machines
 */
const GYM_CATEGORIES = [
  {
    id: 'full_service_commercial',
    name: 'Full-Service Commercial Gym',
    description: 'Chain gyms like LA Fitness, Genesis with pools, classes, extensive equipment',
    icon: '🏢',
    examples: ['LA Fitness', 'Genesis Health Clubs', 'Vasa Fitness'],
    equipment: ['Full cardio section', 'Complete free weights', 'Machine circuit', 'Plate-loaded machines', 'Pin-loaded machines', 'Group fitness']
  },
  {
    id: 'budget_friendly',
    name: 'Budget-Friendly Gym',
    description: 'Basic setup focused on accessibility, light weights only',
    icon: '💰',
    examples: ['Planet Fitness'],
    equipment: ['Light dumbbells', 'Pin-loaded machines', 'Cardio'],
    note: 'No free barbells or heavy lifting equipment'
  },
  {
    id: 'hardcore_strength',
    name: 'Hardcore Strength/Powerlifting Gym',
    description: 'Serious lifting environment with heavy equipment',
    icon: '💪',
    examples: ['Iron Heaven', "Bob's Fitness Complex"],
    equipment: ['Heavy free weights', 'Multiple power racks', 'Plate-loaded machines', 'Pin-loaded machines', 'Competition plates']
  },
  {
    id: 'luxury_athletic_club',
    name: 'Luxury Athletic Club',
    description: 'Premium facilities with resort-like amenities',
    icon: '🏆',
    examples: ['Lifetime Fitness'],
    equipment: ['Premium equipment', 'Pools', 'Tennis courts', 'Spa facilities', 'Plate-loaded machines', 'Pin-loaded machines']
  },
  {
    id: 'franchise_24_7',
    name: '24/7 Franchise Gym',
    description: 'Convenient access with standard equipment',
    icon: '🕐',
    examples: ['Anytime Fitness', '24 Hour Fitness'],
    equipment: ['Standard free weights', 'Machines', 'Cardio', 'Basic functional area']
  },
  {
    id: 'community_recreation',
    name: 'Community Recreation Center',
    description: 'Family-oriented with varied amenities',
    icon: '🏛️',
    examples: ['YMCA', 'Community Centers'],
    equipment: ['Basic gym equipment', 'Pools', 'Courts', 'Group fitness']
  },
  {
    id: 'crossfit_functional',
    name: 'CrossFit/Functional Fitness Gym',
    description: 'High-intensity functional training focus',
    icon: '🔥',
    examples: ['Iron Hero CrossFit', 'CrossFit affiliates'],
    equipment: ['Olympic barbells', 'Bumper plates', 'Pull-up rigs', 'Functional tools']
  },
  {
    id: 'limited_residential',
    name: 'Limited Residential Gym',
    description: 'Basic apartment or condo fitness center',
    icon: '🏠',
    examples: ['Apartment fitness centers'],
    equipment: ['1-2 cardio machines', 'Light dumbbells', 'Basic bench']
  },
  {
    id: 'personal_home_setup',
    name: 'Personal Home Setup',
    description: 'Dedicated home gym with your own equipment',
    icon: '🏡',
    examples: ['Home gym', 'Garage gym'],
    equipment: ['Adjustable dumbbells', 'Bench', 'Resistance bands', 'Personal selection']
  },
  {
    id: 'minimal_home',
    name: 'Minimal/No-Equipment Home Workout',
    description: 'Bodyweight training in any space',
    icon: '🧘',
    examples: ['Living room workouts', 'Park workouts'],
    equipment: ['Bodyweight only', 'Yoga mat', 'Resistance bands (optional)']
  }
];

const workoutFrequencies = [
  { value: "1", label: "Once per week", description: "Light activity" },
  { value: "2", label: "Twice per week", description: "Moderate activity" },
  { value: "3", label: "3 times per week", description: "Regular activity" },
  { value: "4", label: "4 times per week", description: "Active lifestyle" },
  { value: "5", label: "5 times per week", description: "Very active" },
  { value: "6", label: "6 times per week", description: "Highly active" },
  { value: "7", label: "Daily", description: "Maximum frequency" },
];

/**
 * Gym Category Selection Step Component
 * Replaces the complex equipment preferences step with simplified gym category selection
 */
export function GymCategoryStep({ form, isLoading }: GymCategoryStepProps) {
  return (
    <div className="space-y-6">
      {/* Gym Category Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🏋️ Gym Type & Equipment Access
          </CardTitle>
          <FormDescription>
            Select the type of gym or workout space you primarily use. This helps us create workouts that match your available equipment.
          </FormDescription>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="gymCategory"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gym Category</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                  >
                    {GYM_CATEGORIES.map((category) => (
                      <div key={category.id} className="space-y-2">
                        <RadioGroupItem
                          value={category.id}
                          id={category.id}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={category.id}
                          className="flex flex-col space-y-3 rounded-lg border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{category.icon}</span>
                            <span className="font-semibold text-sm">{category.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {category.description}
                          </p>
                          {category.examples && (
                            <p className="text-xs text-muted-foreground font-medium">
                              Examples: {category.examples.join(', ')}
                            </p>
                          )}
                          <div className="text-xs text-muted-foreground">
                            <strong>Equipment:</strong> {category.equipment.join(', ')}
                          </div>
                          {category.note && (
                            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                              ⚠️ {category.note}
                            </p>
                          )}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

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
    </div>
  );
}
