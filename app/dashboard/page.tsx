'use client'

import { BodyMetricsChart } from "@/components/progress/body-metrics-chart"
import { DashboardSummaryCards } from "@/components/progress/dashboard-summary-cards"
import { StrengthProgressionChart } from "@/components/progress/strength-progression-chart"
import { DashboardNavigation } from "@/components/ui/DashboardNavigation"
import { useProfile } from "@/hooks/use-profile-queries"
import { Sparkles } from "lucide-react"
// TEMPORARILY DISABLED: Workout features until Phase 3 implementation
// import { WorkoutConsistencyChart } from "@/components/workout/workout-consistency-chart"

export default function Dashboard() {
  const { profile, isLoading } = useProfile()
  
  // Extract first name from profile data
  const firstName = (profile?.data as any)?.name?.split(' ')[0] || 'there'
  
  return (
    <div className="min-h-screen bg-background">
      <DashboardNavigation />
      <main className="container py-8 relative">
        {/* Background Effects - consistent with landing page */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(100,149,237,0.1),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(100,149,237,0.05),transparent_50%)]" />
        </div>
        
        <div className="relative">
          {/* Header Section with Landing Page Styling */}
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-cornflower-blue/10 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-cornflower-blue" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
                trAIner <span className="text-cornflower-blue bg-gradient-to-r from-cornflower-blue to-blue-400 bg-clip-text text-transparent">Dashboard</span>
              </h1>
            </div>
          </div>

          {/* Welcome Section with Landing Page Design */}
          <div className="mb-8 relative bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50 hover:border-cornflower-blue/30 transition-all duration-300 hover:shadow-lg hover:shadow-cornflower-blue/10">
            <div className="flex items-start space-x-4">
              <div className="w-14 h-14 bg-gradient-to-r from-cornflower-blue to-blue-400 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground mb-2">
                  Welcome, {isLoading ? '...' : firstName}!
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Track your progress in real-time, log workouts and meals, and review your personalized recommendations
                </p>
              </div>
            </div>
            
            {/* Subtle background effect */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(100,149,237,0.1),transparent_50%)]" />
            </div>
          </div>

          {/* Dashboard Content */}
          <DashboardSummaryCards />

          <div className="mt-8 grid gap-8 md:grid-cols-2">
            {/* TEMPORARILY DISABLED: WorkoutConsistencyChart until Phase 3 */}
            <div className="group relative bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50 hover:border-cornflower-blue/30 transition-all duration-300 hover:shadow-lg hover:shadow-cornflower-blue/10">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-cornflower-blue/10 rounded-xl flex items-center justify-center group-hover:bg-cornflower-blue/20 transition-colors duration-300">
                  <Sparkles className="w-5 h-5 text-cornflower-blue" />
                </div>
                <h3 className="text-lg font-semibold text-foreground group-hover:text-cornflower-blue transition-colors duration-300">Workout Consistency</h3>
              </div>
              <p className="text-muted-foreground">Workout tracking will be available soon</p>
              
              {/* Subtle background effect */}
              <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(100,149,237,0.1),transparent_50%)]" />
              </div>
            </div>
            <StrengthProgressionChart />
          </div>

          <div className="mt-8">
            <BodyMetricsChart />
          </div>
        </div>
      </main>
    </div>
  )
} 