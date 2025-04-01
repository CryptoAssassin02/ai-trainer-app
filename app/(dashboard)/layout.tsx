import { WorkoutProvider } from '@/contexts/workout-context'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WorkoutProvider>
      {children}
    </WorkoutProvider>
  )
} 