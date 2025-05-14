import dynamic from 'next/dynamic'

// Dynamically import WorkoutProvider with SSR disabled
const DynamicWorkoutProvider = dynamic(
  () => import('@/contexts/workout-context').then((mod) => mod.WorkoutProvider),
  { ssr: false } // Ensure it only runs on the client
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // Use the dynamically imported provider
    <DynamicWorkoutProvider>
      {children}
    </DynamicWorkoutProvider>
  )
} 