import { redirect } from 'next/navigation'
import { BodyMetricsChart } from "@/components/progress/body-metrics-chart"
import { DashboardSummaryCards } from "@/components/progress/dashboard-summary-cards"
import { StrengthProgressionChart } from "@/components/progress/strength-progression-chart"
// TEMPORARILY DISABLED: Workout features until Phase 3 implementation
// import { WorkoutConsistencyChart } from "@/components/workout/workout-consistency-chart"

export default function Dashboard() {
  // User email will be retrieved client-side via the AuthProvider
  // For now, we'll use a placeholder until we implement server-side user fetching with backend auth
  const userEmail = 'User'

  return (
    <div className="container py-8">
      <h1 className="mb-8 text-3xl font-bold">Progress Dashboard</h1>
      
      <div className="mb-8 rounded-lg bg-muted/50 p-4">
        <h2 className="mb-2 text-xl font-medium">Welcome, {userEmail}</h2>
        <p className="text-muted-foreground">
          Track your fitness progress and view your personalized recommendations
        </p>
      </div>

      <DashboardSummaryCards />

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        {/* TEMPORARILY DISABLED: WorkoutConsistencyChart until Phase 3 */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Workout Consistency</h3>
          <p className="text-muted-foreground">Workout tracking will be available soon</p>
        </div>
        <StrengthProgressionChart />
      </div>

      <div className="mt-8">
        <BodyMetricsChart />
      </div>

      <div className="mt-8 flex justify-end">
        <a
          href="/logout"
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Sign out
        </a>
      </div>
    </div>
  )
} 