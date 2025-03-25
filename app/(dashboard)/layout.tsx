import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WorkoutProvider } from '@/contexts/workout-context'
import { ProfileProvider } from '@/lib/profile-context'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  
  if (error || !data?.user) {
    redirect('/login')
  }

  return (
    <ProfileProvider>
      <WorkoutProvider>
        {children}
      </WorkoutProvider>
    </ProfileProvider>
  )
} 