"use client"

import type * as React from "react"
import { ArrowDown, ArrowUp, Calendar, Dumbbell, Flame, Scale, Target, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface MetricCardProps {
  title: string
  value: string | number
  description: string
  trend?: number
  icon: React.ReactNode
  trendLabel?: string
}

function MetricCard({ title, value, description, trend = 0, icon, trendLabel }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-4 w-4 text-primary">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend !== 0 && (
          <div className="mt-2 flex items-center text-xs">
            {trend > 0 ? (
              <ArrowUp className="mr-1 h-3 w-3 text-green-500" />
            ) : (
              <ArrowDown className="mr-1 h-3 w-3 text-red-500" />
            )}
            <span className={trend > 0 ? "text-green-500" : "text-red-500"}>
              {trend > 0 ? "+" : ""}
              {trend}% {trendLabel}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardSummaryCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Weekly Workouts"
        value="4/5"
        description="Completed this week"
        trend={5}
        trendLabel="vs last week"
        icon={<Calendar />}
      />
      <MetricCard
        title="Current Streak"
        value="12 days"
        description="Last missed: Jun 10"
        trend={20}
        trendLabel="longer than previous"
        icon={<Flame />}
      />
      <MetricCard
        title="Weight"
        value="178.5 lbs"
        description="Updated yesterday"
        trend={-2.3}
        trendLabel="in last 30 days"
        icon={<Scale />}
      />
      <MetricCard
        title="Strength Score"
        value="315"
        description="Intermediate level"
        trend={8.5}
        trendLabel="in last 30 days"
        icon={<Dumbbell />}
      />
      <MetricCard
        title="Body Fat"
        value="16.8%"
        description="Athletic range"
        trend={-5.2}
        trendLabel="in last 90 days"
        icon={<Target />}
      />
      <MetricCard
        title="Volume"
        value="24,850 lbs"
        description="Last workout"
        trend={12}
        trendLabel="vs previous"
        icon={<TrendingUp />}
      />
    </div>
  )
}

