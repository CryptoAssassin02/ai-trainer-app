import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BodyMetricsChart } from "@/components/progress/body-metrics-chart"
import { DashboardSummaryCards } from "@/components/progress/dashboard-summary-cards"
import { StrengthProgressionChart } from "@/components/progress/strength-progression-chart"
import { WorkoutConsistencyChart } from "@/components/workout/workout-consistency-chart"

export default async function Dashboard() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const userEmail = data.user?.email || 'User'

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
        <WorkoutConsistencyChart />
        <StrengthProgressionChart />
      </div>

      <div className="mt-8">
        <BodyMetricsChart />
      </div>

      <div className="mt-8 flex justify-end">
        <form
          action={async () => {
            'use server'
            const supabase = await createClient()
            await supabase.auth.signOut()
            redirect('/login')
          }}
        >
          <button
            type="submit"
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
} 