import { BodyMetricsChart } from "@/components/progress/body-metrics-chart"
import { StrengthProgressionChart } from "@/components/progress/strength-progression-chart"
import { WorkoutConsistencyChart } from "@/components/workout/workout-consistency-chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckInForm } from "@/components/progress/check-in-form"
import { WorkoutLogForm } from "@/components/workout/workout-log-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ProgressPage() {
  return (
    <div className="container py-8">
      <h1 className="mb-2 text-3xl font-bold">Your Progress Tracking</h1>
      <p className="mb-8 text-muted-foreground">
        Track your fitness journey and see how far you've come
      </p>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="strength">Strength</TabsTrigger>
          <TabsTrigger value="body">Body Metrics</TabsTrigger>
          <TabsTrigger value="workouts">Workouts</TabsTrigger>
          <TabsTrigger value="check-in">Check-in</TabsTrigger>
          <TabsTrigger value="log-workout">Log Workout</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <WorkoutConsistencyChart />
            <StrengthProgressionChart />
          </div>
          <BodyMetricsChart />
        </TabsContent>
        
        <TabsContent value="strength">
          <StrengthProgressionChart />
        </TabsContent>
        
        <TabsContent value="body">
          <BodyMetricsChart />
        </TabsContent>
        
        <TabsContent value="workouts">
          <WorkoutConsistencyChart />
        </TabsContent>
        
        <TabsContent value="check-in">
          <Card>
            <CardHeader>
              <CardTitle>Log Your Fitness Check-In</CardTitle>
              <CardDescription>
                Record your body measurements, weight, and other metrics to track your progress over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CheckInForm />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="log-workout">
          <Card>
            <CardHeader>
              <CardTitle>Log Your Workout</CardTitle>
              <CardDescription>
                Record your completed workout, including exercises, sets, reps, and weights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WorkoutLogForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 