"use client"

import type * as React from "react"
import type { TooltipProps } from "recharts"
import { Card, CardContent } from "@/components/ui/card"

interface TooltipPayloadItem {
  name: string;
  value: number | string;
  color?: string;
  stroke?: string;
  unit?: string;
}

interface ChartTooltipProps extends TooltipProps<number | string, string> {
  payload?: TooltipPayloadItem[];
}

export function CustomChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  // Calculate position to ensure tooltip stays within chart boundaries
  const tooltipStyle: React.CSSProperties = {
    opacity: 0.95,
    pointerEvents: "none",
    maxWidth: "200px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  }

  return (
    <div className="recharts-tooltip-wrapper" style={tooltipStyle}>
      <Card className="border-primary/20 bg-background/95 shadow-md">
        <CardContent className="p-3">
          <p className="mb-2 font-medium text-sm text-white">{label}</p>
          <div className="space-y-2">
            {payload.map((item: TooltipPayloadItem, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color || item.stroke }} />
                <span className="text-xs font-medium text-white">{item.name}:</span>
                <span className="text-xs text-white">{item.value}</span>
                {item.unit && <span className="text-xs text-gray-300">{item.unit}</span>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

