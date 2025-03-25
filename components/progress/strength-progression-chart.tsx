"use client"
import { useState } from "react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TimePeriodSelector } from "@/components/progress/time-period-selector"
import { CustomChartTooltip } from "@/components/ui/chart-tooltip"
import { Badge } from "@/components/ui/badge"

type TimePeriod = "1w" | "1m" | "3m" | "6m" | "1y" | "all"
type Exercise = "benchPress" | "squat" | "deadlift" | "overheadPress" | "bentoverRow"

const exerciseOptions = [
  { value: "benchPress", label: "Bench Press" },
  { value: "squat", label: "Squat" },
  { value: "deadlift", label: "Deadlift" },
  { value: "overheadPress", label: "Overhead Press" },
  { value: "bentoverRow", label: "Bentover Row" },
]

// Generate sample data with realistic progression
const generateProgressionData = (exercise: Exercise, period: TimePeriod) => {
  // Base starting weights for different exercises (in lbs)
  const baseWeights = {
    benchPress: 135,
    squat: 185,
    deadlift: 225,
    overheadPress: 95,
    bentoverRow: 115,
  }

  // Progression rates (lbs per week)
  const progressionRates = {
    benchPress: 2.5,
    squat: 5,
    deadlift: 5,
    overheadPress: 1.5,
    bentoverRow: 2.5,
  }

  const baseWeight = baseWeights[exercise]
  const progressionRate = progressionRates[exercise]

  // Number of data points based on time period
  const dataPoints = {
    "1w": 4, // 4 workouts in a week
    "1m": 12, // 12 workouts in a month
    "3m": 24, // 24 workouts in 3 months
    "6m": 48, // 48 workouts in 6 months
    "1y": 52, // 52 weeks in a year
    all: 52, // Same as 1y for simplicity
  }

  const points = dataPoints[period]

  return Array.from({ length: points }, (_, i) => {
    // Add some randomness to the progression
    const randomVariation = Math.random() * 10 - 5 // Between -5 and +5

    // Calculate date
    const date = new Date()
    const daysToSubtract =
      period === "1w" ? i : period === "1m" ? i * 2 : period === "3m" ? i * 3 : period === "6m" ? i * 4 : i * 7 // 1y or all

    date.setDate(date.getDate() - (points - i - 1) * daysToSubtract)
    const dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: period === "1y" || period === "all" ? undefined : "numeric",
      year: period === "all" ? "numeric" : undefined,
    })

    // Calculate weight with some randomness
    const weight = Math.round(baseWeight + progressionRate * i + randomVariation)

    // Calculate 1RM (one-rep max) using Brzycki formula
    // 1RM = weight × (36 / (37 - reps))
    const reps = 5 // Assuming 5 reps for simplicity
    const oneRepMax = Math.round(weight * (36 / (37 - reps)))

    return {
      date: dateStr,
      weight,
      oneRepMax,
    }
  })
}

export function StrengthProgressionChart() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("3m")
  const [selectedExercise, setSelectedExercise] = useState<Exercise>("benchPress")

  const data = generateProgressionData(selectedExercise, timePeriod)

  // Calculate progress metrics
  const firstWeight = data[0]?.weight || 0
  const lastWeight = data[data.length - 1]?.weight || 0
  const weightIncrease = lastWeight - firstWeight
  const percentageIncrease = firstWeight > 0 ? Math.round((weightIncrease / firstWeight) * 100) : 0

  // Calculate Y-axis domain with consistent intervals
  const calculateYAxisDomain = () => {
    const allValues = data.flatMap((d) => [d.weight, d.oneRepMax])
    const minValue = Math.min(...allValues)
    const maxValue = Math.max(...allValues)

    // Round down to nearest 25 for min
    const minRounded = Math.floor(minValue / 25) * 25
    // Round up to nearest 25 for max
    const maxRounded = Math.ceil(maxValue / 25) * 25

    return [minRounded, maxRounded]
  }

  // Generate consistent tick values
  const generateYAxisTicks = () => {
    const [min, max] = calculateYAxisDomain()
    const interval = 25 // Use consistent interval of 25 lbs
    const ticks = []

    for (let i = min; i <= max; i += interval) {
      ticks.push(i)
    }

    return ticks
  }

  const yAxisDomain = calculateYAxisDomain()
  const yAxisTicks = generateYAxisTicks()

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Strength Progression</CardTitle>
          <CardDescription>
            {percentageIncrease > 0 ? "+" : ""}
            {percentageIncrease}% ({weightIncrease} lbs) in {timePeriod}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedExercise} onValueChange={(value) => setSelectedExercise(value as Exercise)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select exercise" />
            </SelectTrigger>
            <SelectContent>
              {exerciseOptions.map((option) => (
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
            weight: {
              label: "Working Weight",
              color: "var(--chart-primary)",
            },
            oneRepMax: {
              label: "Estimated 1RM",
              color: "var(--chart-tertiary)",
            },
          }}
          className="h-[300px]"
        >
          <ResponsiveContainer width="99%" height="99%">
            <LineChart data={data} margin={{ top: 20, right: 30, left: 50, bottom: 70 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F5F5F5" opacity={0.1} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#F5F5F5", fontSize: 12 }}
                axisLine={{ stroke: "#F5F5F5", opacity: 0.5 }}
                tickLine={{ stroke: "#F5F5F5", opacity: 0.5 }}
                height={60}
                tickMargin={10}
                interval={data.length > 12 ? Math.floor(data.length / 6) : 0}
                textAnchor="middle"
                angle={data.length > 12 ? -45 : 0}
              />
              <XAxis
                axisLine={false}
                tickLine={false}
                tick={false}
                xAxisId="label"
                label={{
                  value: "Date",
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
                width={50}
                tickMargin={10}
                domain={yAxisDomain}
                ticks={yAxisTicks}
                label={{
                  value: "Weight (lbs)",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#F5F5F5",
                  offset: -15,
                  style: { fontWeight: "500", fontSize: 14 },
                }}
              />
              <Tooltip
                content={<CustomChartTooltip />}
                cursor={{ stroke: "rgba(255, 255, 255, 0.2)" }}
                wrapperStyle={{ zIndex: 100 }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="var(--color-weight)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-weight)", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "var(--color-weight)", stroke: "#F5F5F5", strokeWidth: 2 }}
                isAnimationActive={false}
                name="Working Weight"
                connectNulls={true}
              />
              <Line
                type="monotone"
                dataKey="oneRepMax"
                stroke="var(--color-oneRepMax)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3, fill: "var(--color-oneRepMax)", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "var(--color-oneRepMax)", stroke: "#F5F5F5", strokeWidth: 2 }}
                isAnimationActive={false}
                name="Estimated 1RM"
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

