import { ExerciseCard } from "@/components/workout/exercise-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Clock, Dumbbell, Calendar } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

// Mock workout plans data - in a real app, this would come from a database
const workoutPlans = [
  {
    id: "1",
    title: "Beginner Strength",
    description: "Perfect for those new to strength training",
    duration: "4 weeks",
    sessions: 3,
    level: "Beginner",
    tags: ["Strength", "Full Body"],
    exercises: [
      {
        name: "Barbell Squat",
        sets: 3,
        repsMin: 8,
        repsMax: 12,
        imageUrl: "/placeholder.svg?height=200&width=300",
        notes: "Keep your chest up and push through your heels.",
        targetMuscles: ["Quads", "Glutes", "Core"],
        equipment: "Barbell, Squat Rack",
        difficulty: "intermediate" as const,
      },
      {
        name: "Bench Press",
        sets: 3,
        repsMin: 8,
        repsMax: 12,
        imageUrl: "/placeholder.svg?height=200&width=300",
        notes: "Keep your feet flat on the floor and maintain a slight arch in your back.",
        targetMuscles: ["Chest", "Triceps", "Shoulders"],
        equipment: "Barbell, Bench",
        difficulty: "intermediate" as const,
      },
      {
        name: "Bent-Over Row",
        sets: 3,
        repsMin: 8,
        repsMax: 12,
        imageUrl: "/placeholder.svg?height=200&width=300",
        notes: "Hinge at the hips and pull the bar to your lower ribcage.",
        targetMuscles: ["Back", "Biceps", "Forearms"],
        equipment: "Barbell",
        difficulty: "intermediate" as const,
      },
    ]
  },
  {
    id: "2",
    title: "HIIT Cardio Blast",
    description: "High intensity interval training for maximum calorie burn",
    duration: "6 weeks",
    sessions: 4,
    level: "Intermediate",
    tags: ["Cardio", "HIIT"],
    exercises: [
      {
        name: "Burpees",
        sets: 4,
        repsMin: 10,
        repsMax: 15,
        imageUrl: "/placeholder.svg?height=200&width=300",
        notes: "Complete the movement as quickly as possible while maintaining good form.",
        targetMuscles: ["Full Body", "Cardio"],
        equipment: "None",
        difficulty: "intermediate" as const,
      },
      {
        name: "Mountain Climbers",
        sets: 4,
        repsMin: 20,
        repsMax: 30,
        imageUrl: "/placeholder.svg?height=200&width=300",
        notes: "Keep your core tight and alternate legs as quickly as possible.",
        targetMuscles: ["Core", "Shoulders", "Cardio"],
        equipment: "None",
        difficulty: "beginner" as const,
      },
      {
        name: "Jump Squats",
        sets: 4,
        repsMin: 15,
        repsMax: 20,
        imageUrl: "/placeholder.svg?height=200&width=300",
        notes: "Land softly and immediately drop into the next squat.",
        targetMuscles: ["Quads", "Glutes", "Cardio"],
        equipment: "None",
        difficulty: "intermediate" as const,
      },
    ]
  },
]

export default function WorkoutPlanPage({ params }: { params: { id: string } }) {
  const plan = workoutPlans.find(plan => plan.id === params.id)
  
  if (!plan) {
    notFound()
  }

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/workouts">
          <Button variant="outline" size="sm">
            <ChevronLeft className="mr-1 h-4 w-4" /> Back to Plans
          </Button>
        </Link>
        <div className="flex items-center">
          <Calendar className="mr-2 h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{plan.duration}</span>
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">{plan.title}</h1>
        <p className="mt-2 text-muted-foreground">{plan.description}</p>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Workout Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Exercises</p>
                <p className="font-medium">{plan.exercises.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Est. Time</p>
                <p className="font-medium">45 min</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Sessions/week</p>
                <p className="font-medium">{plan.sessions}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 className="mb-4 text-xl font-semibold">Exercise List</h2>
      <div className="space-y-4">
        {plan.exercises.map((exercise, index) => (
          <ExerciseCard key={index} {...exercise} />
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Button className="bg-[#3E9EFF] hover:bg-[#3E9EFF]/90">Start Workout</Button>
      </div>
    </div>
  )
} 