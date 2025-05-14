"use client"

import React from 'react';

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircledIcon, CrossCircledIcon, ReloadIcon } from "@radix-ui/react-icons"
import { useWorkout } from "@/contexts/workout-context"
import { useProfile } from "@/lib/profile-context"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"

// Define form schema with Zod
const checkInFormSchema = z.object({
  date: z.date({
    required_error: "A date is required.",
  }),
  weight: z.coerce.number().min(1).optional(),
  bodyFatPercentage: z.coerce.number().min(1).max(50).optional(),
  measurements: z.object({
    chest: z.coerce.number().min(1).optional(),
    waist: z.coerce.number().min(1).optional(),
    hips: z.coerce.number().min(1).optional(),
    bicep_r: z.coerce.number().min(1).optional(),
    thigh_r: z.coerce.number().min(1).optional(),
  }).optional(),
  mood: z.enum(["poor", "fair", "good", "excellent"]),
  sleepQuality: z.enum(["poor", "fair", "good", "excellent"]),
  energyLevel: z.coerce.number().min(1).max(10),
  stressLevel: z.coerce.number().min(1).max(10),
  notes: z.string().optional(),
})

type CheckInFormValues = z.infer<typeof checkInFormSchema>

interface FormState {
  isSubmitting: boolean;
  isSuccess: boolean;
  error: string | null;
}

export function CheckInForm() {
  // --- TEMPORARILY REPLACE ENTIRE COMPONENT BODY ---
  // return <div>Simple CheckInForm Mock</div>;
  // --- ORIGINAL CODE BELOW COMMENTED OUT ---
  const { logCheckIn } = useWorkout()
  // Use the correct property name: isLoading
  const { profile, isLoading } = useProfile()
  const [formState, setFormState] = useState<FormState>({
    isSubmitting: false,
    isSuccess: false,
    error: null,
  })

  const form = useForm<CheckInFormValues>({
    resolver: zodResolver(checkInFormSchema),
    defaultValues: {
      date: new Date(),
      mood: "good",
      sleepQuality: "good",
      energyLevel: 7,
      stressLevel: 4,
      notes: "",
      measurements: {
        chest: undefined,
        waist: undefined,
        hips: undefined,
        bicep_r: undefined,
        thigh_r: undefined,
      }
    },
  })

  const onSubmit = async (data: CheckInFormValues) => {
    setFormState({ isSubmitting: true, isSuccess: false, error: null })
    
    try {
      // Format data for API
      const checkInData = {
        date: format(data.date, "yyyy-MM-dd"),
        weight: data.weight,
        body_fat_percentage: data.bodyFatPercentage,
        measurements: data.measurements ? {
          chest: data.measurements.chest,
          waist: data.measurements.waist,
          hips: data.measurements.hips,
          arms: data.measurements.bicep_r,
          thighs: data.measurements.thigh_r,
        } : undefined,
        mood: data.mood,
        sleep_quality: data.sleepQuality,
        energy_level: data.energyLevel,
        stress_level: data.stressLevel,
        notes: data.notes,
      }
      
      // Log check-in data
      const result = await logCheckIn(checkInData)
      
      if (result) {
        setFormState({ isSubmitting: false, isSuccess: true, error: null })
        // Reset the form
        form.reset({
          date: new Date(),
          mood: "good",
          sleepQuality: "good",
          energyLevel: 7,
          stressLevel: 4,
          notes: "",
          measurements: { chest: undefined, waist: undefined, hips: undefined, bicep_r: undefined, thigh_r: undefined }
        })
      } else {
        throw new Error("Failed to save check-in data")
      }
    } catch (err) {
      console.error("Error saving check-in:", err)
      setFormState({ isSubmitting: false, isSuccess: false, error: "Failed to save your check-in data. Please try again." })
    }
  }

  // --- Loading State --- 
  if (isLoading) {
    return <div>Loading profile...</div>; // Or a proper skeleton loader
  }

  // --- Profile not loaded/available (handle error or edge case) ---
  if (!profile) {
     return <Alert variant="destructive">
              <CrossCircledIcon className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>User profile could not be loaded. Cannot display check-in form.</AlertDescription>
            </Alert>;
  }

  // Get unit display based on preference (profile is guaranteed to exist here)
  const units = profile.unit_preference ?? 'imperial' // Default still useful if unit_preference itself is null/undefined
  const getUnitLabel = (type: 'weight' | 'length') => {
    return units === 'imperial' 
      ? (type === 'weight' ? 'lbs' : 'in')
      : (type === 'weight' ? 'kg' : 'cm')
  }

  return (
    <div className="space-y-6">
      {formState.error && (
        <Alert variant="destructive">
          <CrossCircledIcon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{formState.error}</AlertDescription>
        </Alert>
      )}
      
      {formState.isSuccess && (
        <Alert className="bg-green-50 text-green-900 border-green-200">
          <CheckCircledIcon className="h-4 w-4 text-green-600" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Your check-in has been saved successfully!</AlertDescription>
        </Alert>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Check-in Date */}
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Check-in Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[240px] pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-6 md:grid-cols-2">
            {/* Weight Field */}
            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight ({getUnitLabel('weight')})</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.1" 
                      placeholder={`Enter your weight in ${getUnitLabel('weight')}`}
                      {...field} 
                      value={field.value ?? ''} 
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Body Fat Field */}
            <FormField
              control={form.control}
              name="bodyFatPercentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Body Fat (%)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.1" 
                      placeholder="Enter body fat percentage" 
                      {...field} 
                      value={field.value ?? ''} 
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Body Measurements Accordion */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="body-measurements">
              <AccordionTrigger>Body Measurements</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="measurements.chest"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chest ({getUnitLabel('length')})</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="measurements.waist"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Waist ({getUnitLabel('length')})</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="measurements.hips"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hips ({getUnitLabel('length')})</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="measurements.bicep_r"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bicep R ({getUnitLabel('length')})</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="measurements.thigh_r"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Thigh R ({getUnitLabel('length')})</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Health Metrics - Using Select and Slider */}
          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="mood"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mood</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your mood" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="poor">Poor</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="excellent">Excellent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sleepQuality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sleep Quality</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sleep quality" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="poor">Poor</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="excellent">Excellent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div> 

          <div className="grid gap-6">
            <FormField
              control={form.control}
              name="energyLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Energy Level (1-10): {field.value}
                  </FormLabel>
                  <FormControl>
                    <Slider
                      aria-label="Energy Level"
                      defaultValue={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                      max={10}
                      step={1}
                      className="mt-2"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stressLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Stress Level (1-10): {field.value}
                  </FormLabel>
                  <FormControl>
                    <Slider
                      aria-label="Stress Level"
                      defaultValue={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                      max={10}
                      step={1}
                      className="mt-2"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div> 
          
          <div className="space-y-6">
            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any additional notes about your check-in..."
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="flex flex-col gap-4 md:flex-row md:gap-6">
            <Button variant="outline" type="button" onClick={() => form.reset()} className="w-full md:w-auto">
              Reset
            </Button>
            <Button type="submit" className="w-full md:w-auto" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? (
                <>
                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Check-in"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
  // */
} 