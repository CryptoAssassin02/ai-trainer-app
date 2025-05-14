'use client'

import { ThemeProvider } from "@/components/ui/theme-provider"
import { ProfileProvider } from "@/lib/profile-context"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import dynamic from 'next/dynamic'

const DynamicWorkoutProvider = dynamic(
  () => import('@/contexts/workout-context').then((mod) => mod.WorkoutProvider),
  { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <ProfileProvider>
          <DynamicWorkoutProvider>
            {children}
          </DynamicWorkoutProvider>
        </ProfileProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
} 