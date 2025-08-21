// TEMPORARILY DISABLED: WorkoutProvider until Phase 3 implementation
// import dynamic from 'next/dynamic'
// const DynamicWorkoutProvider = dynamic(
//   () => import('@/contexts/workout-context').then((mod) => mod.WorkoutProvider),
//   { ssr: false }
// );

import React from 'react';
import { DashboardNavigation } from '@/components/ui/DashboardNavigation';
// REMOVED: ProfileQueryProvider - now handled at app level
// REMOVED: ProtectedRoute - middleware handles authentication now

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // Simplified layout - auth and profile context provided at app level
    <div className="min-h-screen bg-background">
      <DashboardNavigation />
      <main>
        {children}
      </main>
    </div>
  )
} 