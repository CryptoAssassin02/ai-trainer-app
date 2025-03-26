"use client"
import { useState } from "react"
import Image from "next/image"
import { ChevronDown, ChevronUp, Info, PlayCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ExerciseCardProps {
  name: string
  sets: number
  repsMin: number
  repsMax?: number
  imageUrl?: string
  notes?: string
  technique?: string
  restTime?: string
  targetMuscles?: string[]
  equipment?: string
  difficulty?: "beginner" | "intermediate" | "advanced"
  videoUrl?: string
  alternatives?: string[]
}

export function ExerciseCard({
  name,
  sets,
  repsMin,
  repsMax,
  imageUrl = "/placeholder.svg?height=200&width=300",
  notes = "",
  technique,
  restTime = "60-90 seconds",
  targetMuscles = [],
  equipment = "",
  difficulty = "intermediate",
  videoUrl = "",
  alternatives = [],
}: ExerciseCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Format reps display
  const repsDisplay = repsMax ? `${repsMin}-${repsMax}` : repsMin

  // Get difficulty color
  const getDifficultyColor = () => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-500/20 text-green-500"
      case "intermediate":
        return "bg-yellow-500/20 text-yellow-500"
      case "advanced":
        return "bg-red-500/20 text-red-500"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <Card className="overflow-hidden border-border/50 bg-background/95 transition-all hover:border-primary/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl font-bold">{name}</CardTitle>
            <CardDescription className="mt-1 text-sm">
              {sets} {sets === 1 ? "set" : "sets"} of {repsDisplay} {repsMin === 1 && repsMax === 1 ? "rep" : "reps"}
            </CardDescription>
          </div>
          {technique && (
            <Badge variant="outline" className="bg-primary/10 text-primary">
              {technique}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="relative mb-4 overflow-hidden rounded-md">
          <div className="aspect-video w-full overflow-hidden rounded-md bg-muted">
            <Image
              src={imageUrl || "/placeholder.svg"}
              alt={`${name} exercise`}
              width={300}
              height={200}
              className="h-full w-full object-cover transition-all hover:scale-105"
            />
            {videoUrl && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 rounded-full bg-background/80 text-primary hover:bg-background/90 hover:text-primary/90"
                >
                  <PlayCircle className="h-8 w-8" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {notes && (
          <div className="mb-4 rounded-md bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Info className="h-4 w-4 text-primary" />
              Form Tips
            </div>
            <p className="mt-1 text-sm">{notes}</p>
          </div>
        )}

        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between px-2 py-1">
              <span className="text-xs font-medium">{isOpen ? "Hide Details" : "Show Details"}</span>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-2">
            <Separator className="my-2" />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Rest Time</p>
                <p>{restTime}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Equipment</p>
                <p>{equipment || "None"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-medium text-muted-foreground">Target Muscles</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {targetMuscles.length > 0 ? (
                    targetMuscles.map((muscle) => (
                      <Badge key={muscle} variant="secondary" className="text-xs">
                        {muscle}
                      </Badge>
                    ))
                  ) : (
                    <p>Not specified</p>
                  )}
                </div>
              </div>
              {alternatives.length > 0 && (
                <div className="col-span-2">
                  <p className="text-xs font-medium text-muted-foreground">Alternatives</p>
                  <p>{alternatives.join(", ")}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className={`${getDifficultyColor()} text-xs capitalize`}>{difficulty}</Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Exercise difficulty level</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {videoUrl && (
                <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary">
                  Watch Tutorial
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}

