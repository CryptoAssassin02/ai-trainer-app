"use client"

import { useEffect, useCallback, useState } from "react"
import { CartesianGrid, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CustomChartTooltip } from "@/components/ui/chart-tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { useWorkout } from "@/contexts/workout-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ExclamationTriangleIcon } from "@radix-ui/react-icons"

interface ChartDataPoint {
  date: string;
  completed: number;
  label: string;
  target: number;
}

export function WorkoutConsistencyChart() {
  const { workoutPlans } = useWorkout()
  const [data, setData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Process workout data for the chart
  const processWorkoutData = useCallback(() => {
    // Default to showing the last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return date
    })

    // Count workouts for each date
    const dataPoints: ChartDataPoint[] = last7Days.map((date) => {
      const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "short" })
      const target = 1 // Target one workout per day
      
      // Check if we have any workouts logged for this date
      const hasWorkout = workoutPlans.some((plan) => {
        if (!plan.created_at) return false
        const planDate = new Date(plan.created_at)
        return (
          planDate.getDate() === date.getDate() &&
          planDate.getMonth() === date.getMonth() &&
          planDate.getFullYear() === date.getFullYear()
        )
      })

      return {
        date: dayOfWeek,
        completed: hasWorkout ? 1 : 0,
        label: dayOfWeek,
        target,
      }
    })

    return dataPoints
  }, [workoutPlans])

  // Fetch workout data on mount
  useEffect(() => {
    try {
      setLoading(true)
      const chartData = processWorkoutData()
      setData(chartData)
    } catch (err) {
      console.error("Error processing workout data:", err)
      setError("Failed to process workout data")
    } finally {
      setLoading(false)
    }
  }, [processWorkoutData])

  // Calculate completion percentage
  const calculateCompletionStats = () => {
    if (data.length === 0) return { percentage: 0, completed: 0, target: 0 }
    
    const totalCompleted = data.reduce((sum, item) => sum + item.completed, 0)
    const totalTargets = data.reduce((sum, item) => sum + item.target, 0)
    const completionPercentage = totalTargets > 0 ? Math.round((totalCompleted / totalTargets) * 100) : 0
    
    return { percentage: completionPercentage, completed: totalCompleted, target: totalTargets }
  }

  const { percentage, completed, target } = calculateCompletionStats()
  
  // Calculate max value for Y axis
  const yAxisMax = 2 // Using a fixed value since we expect 0 or 1 workouts per day

  // Render loading state
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Workout Consistency</CardTitle>
            <Skeleton className="h-4 w-32 mt-1" />
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  // Render error state
  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Workout Consistency</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Render empty state
  if (data.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Workout Consistency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="mb-2 text-muted-foreground">No workout data available</p>
            <p className="text-sm text-muted-foreground">
              Complete workouts to track your consistency over time
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Workout Consistency</CardTitle>
          <CardDescription>
            {percentage}% completion rate ({completed}/{target} workouts)
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[300px]">
          <ResponsiveContainer width="99%" height="99%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 30, bottom: 20 }} barGap={2} barCategoryGap="10%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" />
              <YAxis domain={[0, yAxisMax]} allowDecimals={false} />
              <Tooltip content={<CustomChartTooltip />} />
              <Bar dataKey="completed" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={40} name="Completed" />
              <Bar dataKey="target" fill="var(--secondary)" radius={[4, 4, 0, 0]} opacity={0.7} maxBarSize={40} name="Target" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

