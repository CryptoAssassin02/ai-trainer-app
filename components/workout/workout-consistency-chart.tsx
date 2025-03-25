"use client"
import { useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"
import { TimePeriodSelector } from "@/components/progress/time-period-selector"
import { CustomChartTooltip } from "@/components/ui/chart-tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ExclamationTriangleIcon } from "@radix-ui/react-icons"
import { useWorkout } from "@/contexts/workout-context"

type TimePeriod = "1w" | "1m" | "3m" | "6m" | "1y" | "all"

export function WorkoutConsistencyChart() {
  const { workoutPlans, userProgress, fetchUserWorkoutPlans } = useWorkout()
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("1m")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartData, setChartData] = useState<any[]>([])

  // Fetch workout data on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        // Fetch workout plans if not already loaded
        if (workoutPlans.length === 0) {
          await fetchUserWorkoutPlans()
        }
        
        // Process the data for the chart
        processWorkoutData()
      } catch (err) {
        console.error("Error fetching workout consistency data:", err)
        setError("Failed to load workout consistency data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [fetchUserWorkoutPlans])

  // When progress data or time period changes, reprocess the data
  useEffect(() => {
    processWorkoutData()
  }, [userProgress, timePeriod])

  // Process workout data for the selected time period
  const processWorkoutData = () => {
    // Calculate date range for the selected time period
    const now = new Date()
    let startDate = new Date()
    
    switch (timePeriod) {
      case "1w":
        startDate.setDate(now.getDate() - 7)
        break
      case "1m":
        startDate.setMonth(now.getMonth() - 1)
        break
      case "3m":
        startDate.setMonth(now.getMonth() - 3)
        break
      case "6m":
        startDate.setMonth(now.getMonth() - 6)
        break
      case "1y":
        startDate.setFullYear(now.getFullYear() - 1)
        break
      case "all":
        // Use all data, no filtering needed
        startDate = new Date(0)
        break
    }

    try {
      // Different data aggregation based on time period
      if (timePeriod === "1w") {
        // Daily for a week
        const dailyData = generateDailyData(startDate, now)
        setChartData(dailyData)
      } else if (timePeriod === "1m") {
        // Daily for a month
        const dailyData = generateDailyData(startDate, now)
        setChartData(dailyData)
      } else if (timePeriod === "3m" || timePeriod === "6m") {
        // Weekly for 3-6 months
        const weeklyData = generateWeeklyData(startDate, now)
        setChartData(weeklyData)
      } else {
        // Monthly for 1y or all
        const monthlyData = generateMonthlyData(startDate, now)
        setChartData(monthlyData)
      }
    } catch (err) {
      console.error("Error processing workout data:", err)
      setError("Error processing workout data")
    }
  }

  // Generate daily workout data
  const generateDailyData = (startDate: Date, endDate: Date) => {
    const days: Record<string, { day: string, workouts: number, target: number }> = {}
    
    // Create all days in the range
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const dayString = currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      const dayOfWeek = currentDate.getDay()
      // Assume weekends (0 = Sunday, 6 = Saturday) are rest days by default
      const targetWorkouts = dayOfWeek === 0 || dayOfWeek === 6 ? 0 : 1
      
      days[dayString] = {
        day: dayString,
        workouts: 0,
        target: targetWorkouts
      }
      
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    // Count actual workouts completed
    userProgress.forEach(progress => {
      const progressDate = new Date(progress.date)
      if (progressDate >= startDate && progressDate <= endDate && progress.completed) {
        const dayString = progressDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        if (days[dayString]) {
          days[dayString].workouts += 1
        }
      }
    })
    
    // Convert to array and sort by date
    return Object.values(days).sort((a, b) => {
      const dateA = new Date(a.day)
      const dateB = new Date(b.day)
      return dateA.getTime() - dateB.getTime()
    })
  }

  // Generate weekly workout data
  const generateWeeklyData = (startDate: Date, endDate: Date) => {
    const weeks: Record<string, { day: string, workouts: number, target: number }> = {}
    
    // Initialize weeks
    const currentDate = new Date(startDate)
    let weekNumber = 1
    
    while (currentDate <= endDate) {
      const weekStart = new Date(currentDate)
      const weekEnd = new Date(currentDate)
      weekEnd.setDate(weekEnd.getDate() + 6)
      
      const weekLabel = `Week ${weekNumber}`
      weeks[weekLabel] = {
        day: weekLabel,
        workouts: 0,
        target: 5 // Assuming a default target of 5 workouts per week
      }
      
      currentDate.setDate(currentDate.getDate() + 7)
      weekNumber++
    }
    
    // Count actual workouts completed
    userProgress.forEach(progress => {
      const progressDate = new Date(progress.date)
      if (progressDate >= startDate && progressDate <= endDate && progress.completed) {
        // Find which week this belongs to
        const weeksSinceStart = Math.floor((progressDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
        const weekLabel = `Week ${weeksSinceStart + 1}`
        
        if (weeks[weekLabel]) {
          weeks[weekLabel].workouts += 1
        }
      }
    })
    
    // Convert to array and sort by week number
    return Object.values(weeks).sort((a, b) => {
      const weekNumA = parseInt(a.day.split(' ')[1])
      const weekNumB = parseInt(b.day.split(' ')[1])
      return weekNumA - weekNumB
    })
  }

  // Generate monthly workout data
  const generateMonthlyData = (startDate: Date, endDate: Date) => {
    const months: Record<string, { day: string, workouts: number, target: number }> = {}
    
    // Initialize months
    const currentDate = new Date(startDate)
    currentDate.setDate(1) // Start at the beginning of the month
    
    while (currentDate <= endDate) {
      const monthLabel = currentDate.toLocaleDateString("en-US", { month: "short", year: timePeriod === "all" ? "numeric" : undefined })
      months[monthLabel] = {
        day: monthLabel,
        workouts: 0,
        target: 20 // Assuming a default target of 20 workouts per month
      }
      
      currentDate.setMonth(currentDate.getMonth() + 1)
    }
    
    // Count actual workouts completed
    userProgress.forEach(progress => {
      const progressDate = new Date(progress.date)
      if (progressDate >= startDate && progressDate <= endDate && progress.completed) {
        const monthLabel = progressDate.toLocaleDateString("en-US", { month: "short", year: timePeriod === "all" ? "numeric" : undefined })
        
        if (months[monthLabel]) {
          months[monthLabel].workouts += 1
        }
      }
    })
    
    // Convert to array and sort by date
    return Object.values(months).sort((a, b) => {
      const dateA = new Date(a.day)
      const dateB = new Date(b.day)
      return dateA.getTime() - dateB.getTime()
    })
  }

  // Calculate completion percentage
  const calculateCompletionStats = () => {
    if (chartData.length === 0) return { percentage: 0, completed: 0, target: 0 }
    
    const totalWorkouts = chartData.reduce((sum, item) => sum + item.workouts, 0)
    const totalTargets = chartData.reduce((sum, item) => sum + item.target, 0)
    const completionPercentage = totalTargets > 0 ? Math.round((totalWorkouts / totalTargets) * 100) : 0
    
    return { percentage: completionPercentage, completed: totalWorkouts, target: totalTargets }
  }

  const { percentage, completed, target } = calculateCompletionStats()
  
  // Determine if we're showing days, weeks, or months based on the time period
  const xAxisLabel =
    timePeriod === "1w" || timePeriod === "1m" ? "Day" : timePeriod === "3m" || timePeriod === "6m" ? "Week" : "Month"

  // Calculate max value for Y axis to ensure consistent intervals
  const calculateMaxY = () => {
    if (chartData.length === 0) return 5
    
    const maxWorkout = Math.max(...chartData.map((d) => Math.max(d.workouts, d.target)))
    return Math.max(5, Math.ceil(maxWorkout * 1.2)) // At least 5, with 20% padding
  }

  const yAxisMax = calculateMaxY()

  // Calculate tick values for Y axis to ensure consistent intervals
  const yAxisTicks = Array.from({ length: yAxisMax + 1 }, (_, i) => i)

  // Render loading state
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Workout Consistency</CardTitle>
            <Skeleton className="h-4 w-32 mt-1" />
          </div>
          <Skeleton className="h-9 w-32" />
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
  if (chartData.length === 0) {
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
        <TimePeriodSelector selectedPeriod={timePeriod} onChange={setTimePeriod} />
      </CardHeader>
      <CardContent className="pt-4">
        <ChartContainer
          config={{
            workouts: {
              label: "Completed",
              color: "var(--chart-primary)",
            },
            target: {
              label: "Target",
              color: "var(--chart-secondary)",
            },
          }}
          className="h-[300px]"
        >
          <ResponsiveContainer width="99%" height="99%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 30, bottom: 70 }} barGap={2} barCategoryGap="10%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F5F5F5" opacity={0.1} />
              <XAxis
                dataKey="day"
                tick={{ fill: "#F5F5F5", fontSize: 12 }}
                axisLine={{ stroke: "#F5F5F5", opacity: 0.5 }}
                tickLine={{ stroke: "#F5F5F5", opacity: 0.5 }}
                height={60}
                tickMargin={10}
                interval={chartData.length > 12 ? Math.floor(chartData.length / 6) : 0}
                textAnchor="middle"
                angle={chartData.length > 12 ? -45 : 0}
              />
              <XAxis
                axisLine={false}
                tickLine={false}
                tick={false}
                xAxisId="label"
                label={{
                  value: xAxisLabel,
                  position: "insideBottom",
                  offset: -35,
                  fill: "#F5F5F5",
                  style: { fontWeight: "500", fontSize: 14 },
                }}
              />
              <YAxis
                tick={{ fill: "#F5F5F5", fontSize: 12 }}
                axisLine={{ stroke: "#F5F5F5", opacity: 0.5 }}
                tickLine={{ stroke: "#F5F5F5", opacity: 0.5 }}
                width={40}
                tickMargin={10}
                domain={[0, yAxisMax]}
                ticks={yAxisTicks}
                allowDecimals={false}
                label={{
                  value: "Workouts",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#F5F5F5",
                  offset: -15,
                  style: { fontWeight: "500", fontSize: 14 },
                }}
              />
              <Tooltip
                content={<CustomChartTooltip />}
                cursor={{ fill: "rgba(255, 255, 255, 0.1)" }}
                wrapperStyle={{ zIndex: 100 }}
              />
              <Bar
                dataKey="workouts"
                fill="var(--color-workouts)"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
                name="Completed"
              />
              <Bar
                dataKey="target"
                fill="var(--color-target)"
                radius={[4, 4, 0, 0]}
                opacity={0.7}
                maxBarSize={40}
                name="Target"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

