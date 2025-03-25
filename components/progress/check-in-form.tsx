"use client"

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
    arms: z.coerce.number().min(1).optional(),
    thighs: z.coerce.number().min(1).optional(),
  }).optional(),
  mood: z.enum(["poor", "fair", "good", "excellent"]),
  sleepQuality: z.enum(["poor", "fair", "good", "excellent"]),
  energyLevel: z.coerce.number().min(1).max(10),
  stressLevel: z.coerce.number().min(1).max(10),
  notes: z.string().optional(),
})

type CheckInFormValues = z.infer<typeof checkInFormSchema>

export function CheckInForm() {
  const { logCheckIn } = useWorkout()
  const { profile } = useProfile()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Set default values
  const defaultValues: Partial<CheckInFormValues> = {
    date: new Date(),
    mood: "good",
    sleepQuality: "good",
    energyLevel: 5,
    stressLevel: 5,
  }

  // Initialize form
  const form = useForm<CheckInFormValues>({
    resolver: zodResolver(checkInFormSchema),
    defaultValues,
  })

  const onSubmit = async (data: CheckInFormValues) => {
    setLoading(true)
    setError(null)
    setSuccess(false)
    
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
          arms: data.measurements.arms,
          thighs: data.measurements.thighs,
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
        setSuccess(true)
        // Reset the form
        form.reset(defaultValues)
      } else {
        throw new Error("Failed to save check-in data")
      }
    } catch (err) {
      console.error("Error saving check-in:", err)
      setError("Failed to save your check-in data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Get unit display based on preference
  const getUnitLabel = (type: 'weight' | 'length') => {
    if (!profile) return type === 'weight' ? 'lbs' : 'in'
    return profile.unit_preference === 'imperial' 
      ? (type === 'weight' ? 'lbs' : 'in')
      : (type === 'weight' ? 'kg' : 'cm')
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <CrossCircledIcon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="bg-green-50 text-green-900 border-green-200">
          <CheckCircledIcon className="h-4 w-4 text-green-600" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Your check-in has been saved successfully!</AlertDescription>
        </Alert>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Date Field */}
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
                            "w-full pl-3 text-left font-normal",
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
                      placeholder={`Enter your weight in ${getUnitLabel('weight')}`} 
                      {...field} 
                      value={field.value ?? ''} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            {/* Body Fat Percentage */}
            <FormField
              control={form.control}
              name="bodyFatPercentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Body Fat (%)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Enter your body fat percentage" 
                      {...field} 
                      value={field.value ?? ''} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Mood Field */}
            <FormField
              control={form.control}
              name="mood"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mood</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
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
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Body Measurements</h3>
            <p className="text-sm text-muted-foreground">All measurements are optional</p>
            
            <div className="grid gap-6 md:grid-cols-2 mt-4">
              {/* Chest Measurement */}
              <FormField
                control={form.control}
                name="measurements.chest"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chest ({getUnitLabel('length')})</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder={`Chest measurement in ${getUnitLabel('length')}`} 
                        {...field} 
                        value={field.value ?? ''} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Waist Measurement */}
              <FormField
                control={form.control}
                name="measurements.waist"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Waist ({getUnitLabel('length')})</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder={`Waist measurement in ${getUnitLabel('length')}`} 
                        {...field} 
                        value={field.value ?? ''} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Hips Measurement */}
              <FormField
                control={form.control}
                name="measurements.hips"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hips ({getUnitLabel('length')})</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder={`Hips measurement in ${getUnitLabel('length')}`} 
                        {...field} 
                        value={field.value ?? ''} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Arms Measurement */}
              <FormField
                control={form.control}
                name="measurements.arms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Arms ({getUnitLabel('length')})</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder={`Arms measurement in ${getUnitLabel('length')}`} 
                        {...field} 
                        value={field.value ?? ''} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Thighs Measurement */}
              <FormField
                control={form.control}
                name="measurements.thighs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thighs ({getUnitLabel('length')})</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder={`Thighs measurement in ${getUnitLabel('length')}`} 
                        {...field} 
                        value={field.value ?? ''} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Health Metrics</h3>
            
            {/* Sleep Quality */}
            <FormField
              control={form.control}
              name="sleepQuality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sleep Quality</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Rate your sleep quality" />
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
            
            {/* Energy Level */}
            <FormField
              control={form.control}
              name="energyLevel"
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <FormItem>
                  <FormLabel>Energy Level (1-10): {value}</FormLabel>
                  <FormControl>
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      defaultValue={[value]}
                      onValueChange={(vals) => onChange(vals[0])}
                      {...fieldProps}
                    />
                  </FormControl>
                  <FormDescription>
                    1 = Very low energy, 10 = Extremely energetic
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Stress Level */}
            <FormField
              control={form.control}
              name="stressLevel"
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <FormItem>
                  <FormLabel>Stress Level (1-10): {value}</FormLabel>
                  <FormControl>
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      defaultValue={[value]}
                      onValueChange={(vals) => onChange(vals[0])}
                      {...fieldProps}
                    />
                  </FormControl>
                  <FormDescription>
                    1 = Very relaxed, 10 = Extremely stressed
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <Button type="submit" className="w-full md:w-auto" disabled={loading}>
            {loading ? (
              <>
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : "Save Check-in"}
          </Button>
        </form>
      </Form>
    </div>
  )
} 