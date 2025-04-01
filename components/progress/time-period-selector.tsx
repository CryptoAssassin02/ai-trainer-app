"use client"
import { Button } from "@/components/ui/button"

type TimePeriod = "1w" | "1m" | "3m" | "6m" | "1y" | "all"

interface TimePeriodOption {
  value: TimePeriod;
  label: string;
}

interface TimePeriodSelectorProps {
  selectedPeriod: TimePeriod;
  onChange: (period: TimePeriod) => void;
  className?: string;
}

export function TimePeriodSelector({ selectedPeriod, onChange, className }: TimePeriodSelectorProps) {
  const periods: TimePeriodOption[] = [
    { value: "1w", label: "1W" },
    { value: "1m", label: "1M" },
    { value: "3m", label: "3M" },
    { value: "6m", label: "6M" },
    { value: "1y", label: "1Y" },
    { value: "all", label: "All" },
  ]

  return (
    <div className={`flex space-x-1 ${className}`}>
      {periods.map((period) => (
        <Button
          key={period.value}
          variant={selectedPeriod === period.value ? "default" : "outline"}
          size="sm"
          className={`px-2 py-1 text-xs ${selectedPeriod === period.value ? "bg-primary text-primary-foreground" : ""}`}
          onClick={() => onChange(period.value)}
        >
          {period.label}
        </Button>
      ))}
    </div>
  )
}

