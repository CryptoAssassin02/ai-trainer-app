import { ExerciseCard } from "@/components/workout/exercise-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Clock, Dumbbell } from "lucide-react"

export default function WorkoutPage() {
  const exercises = [
    {
      name: "Barbell Bench Press",
      sets: 4,
      repsMin: 8,
      repsMax: 12,
      imageUrl: "/placeholder.svg?height=200&width=300",
      notes:
        "Keep your feet flat on the floor, back arched, and shoulders retracted. Lower the bar to mid-chest and press up in a slight arc.",
      technique: "Pyramid Set",
      targetMuscles: ["Chest", "Triceps", "Shoulders"],
      equipment: "Barbell, Bench",
      difficulty: "intermediate" as const,
    },
    {
      name: "Incline Dumbbell Press",
      sets: 3,
      repsMin: 10,
      repsMax: 12,
      imageUrl: "/placeholder.svg?height=200&width=300",
      notes:
        "Set the bench to a 30-45 degree angle. Press the dumbbells up in an arc motion until they nearly touch at the top.",
      targetMuscles: ["Upper Chest", "Shoulders", "Triceps"],
      equipment: "Dumbbells, Incline Bench",
      difficulty: "intermediate" as const,
    },
    {
      name: "Cable Flyes",
      sets: 3,
      repsMin: 12,
      repsMax: 15,
      imageUrl: "/placeholder.svg?height=200&width=300",
      notes:
        "Keep a slight bend in your elbows throughout the movement. Focus on squeezing your chest at the center point.",
      technique: "Super Set",
      targetMuscles: ["Chest", "Shoulders"],
      equipment: "Cable Machine",
      difficulty: "beginner" as const,
    },
  ]

  return (
    <div className="container max-w-md py-6">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="icon">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Chest Day</h1>
        <Button variant="ghost" size="icon">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Workout Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Exercises</p>
                <p className="font-medium">{exercises.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Est. Time</p>
                <p className="font-medium">45 min</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {exercises.map((exercise, index) => (
          <ExerciseCard key={index} {...exercise} />
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <Button className="bg-[#3E9EFF] hover:bg-[#3E9EFF]/90">Complete Workout</Button>
      </div>
    </div>
  )
}

