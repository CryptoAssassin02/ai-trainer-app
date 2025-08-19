// TEMPORARILY DISABLED: WorkoutProvider until Phase 3 implementation
// import dynamic from 'next/dynamic'
// const DynamicWorkoutProvider = dynamic(
//   () => import('@/contexts/workout-context').then((mod) => mod.WorkoutProvider),
//   { ssr: false }
// );

import { ProfileQueryProvider } from '@/components/profile/profile-query-provider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProfileQueryProvider>
      {children}
    </ProfileQueryProvider>
  )
} 