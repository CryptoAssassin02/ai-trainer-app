"use client"
import { useState } from "react"
import {
  BookOpen,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileSearch,
  Lightbulb,
  Scale,
  Search,
  Sparkles,
  Target,
  ThumbsUp,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ReasoningStep {
  id: string
  title: string
  description: string
  details?: string
  isKeyDecision?: boolean
  icon?: keyof typeof iconMap
}

interface ReasoningSection {
  id: string
  title: string
  description: string
  steps: ReasoningStep[]
  icon: keyof typeof iconMap
}

const iconMap = {
  search: Search,
  book: BookOpen,
  brain: BrainCircuit,
  target: Target,
  scale: Scale,
  file: FileSearch,
  clipboard: ClipboardList,
  lightbulb: Lightbulb,
  sparkles: Sparkles,
  thumbsUp: ThumbsUp,
}

interface AIReasoningVisualizationProps {
  title: string
  description?: string
  sections: ReasoningSection[]
}

export function AIReasoningVisualization({ title, description, sections }: AIReasoningVisualizationProps) {
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({})

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }))
  }

  return (
    <Card className="border-border/50 bg-background/95">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-primary" />
          <CardTitle>{title}</CardTitle>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={sections[0].id} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {sections.map((section) => {
              const IconComponent = iconMap[section.icon]
              return (
                <TabsTrigger key={section.id} value={section.id} className="flex items-center gap-2">
                  <IconComponent className="h-4 w-4" />
                  <span className="hidden sm:inline">{section.title}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {sections.map((section) => {
            const IconComponent = iconMap[section.icon]
            return (
              <TabsContent key={section.id} value={section.id} className="mt-4 space-y-4">
                <div className="flex items-center gap-2">
                  <IconComponent className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-medium">{section.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{section.description}</p>

                <div className="mt-6 space-y-4">
                  {section.steps.map((step, index) => {
                    const StepIcon = step.icon ? iconMap[step.icon] : undefined
                    const isExpanded = expandedSteps[step.id] || false

                    return (
                      <div key={step.id} className="relative">
                        {index > 0 && <div className="absolute left-[15px] top-[-16px] h-[16px] w-[1px] bg-border" />}
                        <div className="relative rounded-lg border border-border/50 bg-card p-4 transition-all hover:border-primary/20">
                          <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                              {StepIcon ? <StepIcon className="h-4 w-4" /> : index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{step.title}</h4>
                                  {step.isKeyDecision && (
                                    <Badge className="bg-primary text-primary-foreground">Key Decision</Badge>
                                  )}
                                </div>
                                {step.details && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={() => toggleStep(step.id)}
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>

                              {step.details && (
                                <Collapsible open={isExpanded} onOpenChange={() => toggleStep(step.id)}>
                                  <CollapsibleContent className="mt-2">
                                    <div className="rounded-md bg-muted/30 p-3 text-sm">{step.details}</div>
                                  </CollapsibleContent>
                                </Collapsible>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </TabsContent>
            )
          })}
        </Tabs>
      </CardContent>
    </Card>
  )
}

