import { WorkoutPlanForm } from "@/components/workout/workout-plan-form"
import { CompleteProfileBanner } from "@/components/profile/complete-profile-banner"

export default function GeneratePlanPage() {
  return (
    <div className="container py-10">
      <CompleteProfileBanner />
      <h1 className="text-3xl font-bold mb-6 text-center">Create Your Custom Workout Plan</h1>
      <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
        Fill out the form below with your preferences and goals. Our AI will generate a personalized workout plan
        tailored specifically to your needs.
      </p>
      <WorkoutPlanForm />
    </div>
  )
}

