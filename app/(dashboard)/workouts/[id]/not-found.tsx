import Link from "next/link"
import { FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function WorkoutPlanNotFound() {
  return (
    <div className="flex h-[70vh] w-full flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <FileQuestion className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Workout Plan Not Found</h2>
        <p className="max-w-md text-muted-foreground">
          The workout plan you're looking for doesn't exist or may have been removed.
        </p>
        <Link href="/workouts">
          <Button className="mt-4">
            Browse Workout Plans
          </Button>
        </Link>
      </div>
    </div>
  )
} 