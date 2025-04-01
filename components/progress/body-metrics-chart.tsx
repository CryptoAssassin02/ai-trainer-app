"use client"
import { useEffect, useState, useCallback } from "react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TimePeriodSelector } from "@/components/progress/time-period-selector"
import { CustomChartTooltip } from "@/components/ui/chart-tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ExclamationTriangleIcon } from "@radix-ui/react-icons"
import { useWorkout } from "@/contexts/workout-context"
import { useProfile } from "@/lib/profile-context"

type TimePeriod = "1w" | "1m" | "3m" | "6m" | "1y" | "all"
type MetricType = "weight" | "bodyFat" | "chest" | "waist" | "arms" | "thighs"

const metricOptions = [
  { value: "weight", label: "Body Weight" },
  { value: "bodyFat", label: "Body Fat %" },
  { value: "chest", label: "Chest" },
  { value: "waist", label: "Waist" },
  { value: "arms", label: "Arms" },
  { value: "thighs", label: "Thighs" },
]

// Map metric types to colors
const metricColors = {
  weight: "#3E9EFF", // Electric blue
  bodyFat: "#FF5E7D", // Pink
  chest: "#4ADE80", // Green
  waist: "#FF5E7D", // Pink
  arms: "#A5DBFF", // Light blue
  thighs: "#9E9EFF", // Purple
}

interface ChartDataPoint {
  date: string;
  [key: string]: string | number | undefined;
}

export function BodyMetricsChart() {
  const { userCheckIns, getCheckInHistory } = useWorkout()
  const { profile } = useProfile()
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("3m")
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("weight")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])

  // Process check-in data for the selected time period and metric
  const processCheckInData = useCallback(() => {
    if (userCheckIns.length === 0) {
      setChartData([])
      return
    }

    // Filter check-ins for the selected time period
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

    // Filter and sort check-ins
    const filteredCheckIns = userCheckIns
      .filter(checkIn => new Date(checkIn.date) >= startDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Format data for the chart
    const formattedData = filteredCheckIns.map(checkIn => {
      const date = new Date(checkIn.date)
      const dateStr = date.toLocaleDateString("en-US", {
        month: "short",
        day: timePeriod === "1y" || timePeriod === "all" ? undefined : "numeric",
        year: timePeriod === "all" ? "numeric" : undefined,
      })

      let metricValue: number | undefined

      // Extract the selected metric value
      if (selectedMetric === "weight") {
        metricValue = checkIn.weight
      } else if (selectedMetric === "bodyFat") {
        metricValue = checkIn.body_fat_percentage
      } else if (checkIn.measurements) {
        // Get measurement value if it exists
        metricValue = checkIn.measurements[selectedMetric as keyof typeof checkIn.measurements]
      }

      return {
        date: dateStr,
        [selectedMetric]: metricValue,
      }
    })

    setChartData(formattedData)
  }, [userCheckIns, selectedMetric, timePeriod])

  // Fetch check-in data on mount and when time period changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        if (userCheckIns.length === 0) {
          await getCheckInHistory()
        }
        processCheckInData()
      } catch (err) {
        console.error("Error fetching body metrics data:", err)
        setError("Failed to load body metrics data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [timePeriod, getCheckInHistory, userCheckIns.length, processCheckInData])

  // When check-ins or selected metric changes, process the data
  useEffect(() => {
    processCheckInData()
  }, [userCheckIns, selectedMetric, timePeriod, processCheckInData])

  // Calculate progress metrics from the real data
  const calculateProgress = () => {
    if (chartData.length < 2) return { valueChange: 0, percentageChange: 0 }

    const firstValue = Number(chartData[0]?.[selectedMetric]) || 0
    const lastValue = Number(chartData[chartData.length - 1]?.[selectedMetric]) || 0
    const valueChange = +(Number(lastValue) - Number(firstValue)).toFixed(1)
    const percentageChange = firstValue > 0 ? +((valueChange / firstValue) * 100).toFixed(1) : 0

    return { valueChange, percentageChange }
  }

  const { valueChange, percentageChange } = calculateProgress()

  // Get the appropriate unit for the selected metric
  const getUnit = () => {
    if (selectedMetric === "bodyFat") return "%"
    if (selectedMetric === "weight") return profile?.unit_preference === "imperial" ? "lbs" : "kg"
    return profile?.unit_preference === "imperial" ? "in" : "cm"
  }

  // Get the label for the selected metric
  const metricLabel = metricOptions.find((m) => m.value === selectedMetric)?.label || ""

  // Calculate Y-axis domain with consistent intervals
  const calculateYAxisDomain = () => {
    if (chartData.length === 0) return [0, 10]
    
    const values = chartData
      .map((d) => d[selectedMetric] as number)
      .filter((value): value is number => value !== undefined && !isNaN(value))
    
    if (values.length === 0) return [0, 10]
    
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)

    let interval

    // Different intervals for different metrics
    if (selectedMetric === "weight") {
      interval = 5 // 5 lbs/kg intervals
    } else if (selectedMetric === "bodyFat") {
      interval = 2 // 2% intervals
    } else {
      interval = 1 // 1 inch/cm intervals
    }

    // Round down to nearest interval for min
    const minRounded = Math.floor(minValue / interval) * interval
    // Round up to nearest interval for max
    const maxRounded = Math.ceil(maxValue / interval) * interval

    return [minRounded, maxRounded]
  }

  // Generate consistent tick values
  const generateYAxisTicks = () => {
    const [min, max] = calculateYAxisDomain()

    let interval

    // Different intervals for different metrics
    if (selectedMetric === "weight") {
      interval = 5 // 5 lbs/kg intervals
    } else if (selectedMetric === "bodyFat") {
      interval = 2 // 2% intervals
    } else {
      interval = 1 // 1 inch/cm intervals
    }

    const ticks = []

    for (let i = min; i <= max; i += interval) {
      ticks.push(i)
    }

    return ticks
  }

  const yAxisDomain = calculateYAxisDomain()
  const yAxisTicks = generateYAxisTicks()

  // Render loading state
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Body Metrics</CardTitle>
            <Skeleton className="h-4 w-32 mt-1" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-[140px]" />
            <Skeleton className="h-9 w-32" />
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
          <CardTitle>Body Metrics</CardTitle>
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
          <CardTitle>Body Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="mb-2 text-muted-foreground">No body metrics data available</p>
            <p className="text-sm text-muted-foreground">
              Complete your check-ins to track your body measurements over time
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
          <CardTitle>Body Metrics</CardTitle>
          <CardDescription>
            {valueChange > 0 ? "+" : ""}
            {valueChange} {getUnit()} ({percentageChange > 0 ? "+" : ""}
            {percentageChange}%) in {timePeriod}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMetric} onValueChange={(value) => setSelectedMetric(value as MetricType)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent>
              {metricOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TimePeriodSelector selectedPeriod={timePeriod} onChange={setTimePeriod} />
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ChartContainer
          config={{
            [selectedMetric]: {
              label: metricLabel,
              color: metricColors[selectedMetric],
            },
          }}
          className="h-[300px]"
        >
          <ResponsiveContainer width="99%" height="99%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 30, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F5F5F5" opacity={0.1} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#F5F5F5", fontSize: 12 }}
                axisLine={{ stroke: "#F5F5F5", opacity: 0.5 }}
                tickLine={{ stroke: "#F5F5F5", opacity: 0.5 }}
                tickMargin={10}
                interval={chartData.length > 12 ? Math.floor(chartData.length / 12) : 0}
              />
              <YAxis
                domain={yAxisDomain}
                ticks={yAxisTicks}
                tick={{ fill: "#F5F5F5", fontSize: 12 }}
                axisLine={{ stroke: "#F5F5F5", opacity: 0.5 }}
                tickLine={{ stroke: "#F5F5F5", opacity: 0.5 }}
                tickMargin={10}
                width={40}
                label={{
                  value: `${metricLabel} (${getUnit()})`,
                  angle: -90,
                  position: "insideLeft",
                  offset: -15,
                  fill: "#F5F5F5",
                  style: { fontWeight: "500", fontSize: 12 },
                }}
              />
              <Tooltip
                content={<CustomChartTooltip />}
                wrapperStyle={{ zIndex: 100 }}
                cursor={{ stroke: "rgba(255, 255, 255, 0.2)" }}
              />
              <Line
                type="monotone"
                dataKey={selectedMetric}
                stroke={metricColors[selectedMetric]}
                strokeWidth={2.5}
                dot={{ r: 4, strokeWidth: 2 }}
                activeDot={{ r: 6, strokeWidth: 2 }}
                name={metricLabel}
                isAnimationActive={true}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

