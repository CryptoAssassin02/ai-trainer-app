import { ExerciseCard } from "@/components/workout/exercise-card"

export default function ExercisesPage() {
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
      restTime: "90-120 seconds",
      targetMuscles: ["Chest", "Triceps", "Shoulders"],
      equipment: "Barbell, Bench",
      difficulty: "intermediate" as const,
      videoUrl: "#",
      alternatives: ["Dumbbell Press", "Push-ups", "Machine Chest Press"],
    },
    {
      name: "Pull-ups",
      sets: 3,
      repsMin: 8,
      repsMax: 10,
      imageUrl: "/placeholder.svg?height=200&width=300",
      notes:
        "Start from a dead hang, pull up until your chin is over the bar. Focus on pulling with your back, not your arms.",
      technique: "Drop Set",
      restTime: "60-90 seconds",
      targetMuscles: ["Back", "Biceps", "Forearms"],
      equipment: "Pull-up Bar",
      difficulty: "advanced" as const,
      videoUrl: "#",
      alternatives: ["Lat Pulldown", "Assisted Pull-ups", "Inverted Rows"],
    },
    {
      name: "Goblet Squat",
      sets: 3,
      repsMin: 12,
      repsMax: 15,
      imageUrl: "/placeholder.svg?height=200&width=300",
      notes:
        "Hold a dumbbell or kettlebell close to your chest. Keep your chest up, back straight, and squat down until thighs are parallel to the floor.",
      restTime: "60 seconds",
      targetMuscles: ["Quadriceps", "Glutes", "Core"],
      equipment: "Dumbbell or Kettlebell",
      difficulty: "beginner" as const,
      alternatives: ["Bodyweight Squat", "Dumbbell Squat"],
    },
    {
      name: "Romanian Deadlift",
      sets: 3,
      repsMin: 10,
      repsMax: 12,
      imageUrl: "/placeholder.svg?height=200&width=300",
      notes:
        "Keep your back straight, hinge at the hips, and lower the weight while keeping the bar close to your legs. Feel the stretch in your hamstrings.",
      technique: "Super Set",
      restTime: "90 seconds",
      targetMuscles: ["Hamstrings", "Glutes", "Lower Back"],
      equipment: "Barbell or Dumbbells",
      difficulty: "intermediate" as const,
      videoUrl: "#",
      alternatives: ["Single-Leg RDL", "Good Mornings", "Leg Curl"],
    },
  ]

  return (
    <div className="container py-8">
      <h1 className="mb-8 text-3xl font-bold">Today&apos;s Workout</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {exercises.map((exercise, index) => (
          <ExerciseCard key={index} {...exercise} />
        ))}
      </div>
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="mb-2 text-muted-foreground">No exercises found</p>
        <p className="text-sm text-muted-foreground">
          Let&apos;s add some exercises to your library
        </p>
      </div>
    </div>
  )
}

