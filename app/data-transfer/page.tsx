import { WorkoutDataTransfer } from "@/components/workout/workout-data-transfer"

export default function DataTransferPage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6 text-center">Workout Plan Data Transfer</h1>
      <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
        Export your workout plans to different formats or import plans from external sources. Use this tool to backup
        your data or share your plans with others.
      </p>
      <WorkoutDataTransfer />
    </div>
  )
}

