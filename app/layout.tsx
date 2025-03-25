import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import TanstackClientProvider from '@/components/providers/tanstack-client-provider'
import { SupabaseProvider } from '@/utils/supabase/context'
import { ThemeProvider } from "@/components/layout/theme-provider"
import { SiteHeader } from "@/components/layout/site-header"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { ProfileProvider } from "@/lib/profile-context"

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: 'trAIner - Your Personal Fitness Assistant',
  description: 'AI-powered fitness training and workout planning with personalized assistance',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <TanstackClientProvider>
          <SupabaseProvider>
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
              <ProfileProvider>
                <SidebarProvider>
                  <div className="relative flex min-h-screen flex-col">
                    <SiteHeader />
                    <div className="flex flex-1">
                      <AppSidebar />
                      <SidebarInset>
                        <main className="flex-1 p-4 md:p-6">{children}</main>
                      </SidebarInset>
                    </div>
                  </div>
                </SidebarProvider>
              </ProfileProvider>
            </ThemeProvider>
          </SupabaseProvider>
        </TanstackClientProvider>
      </body>
    </html>
  )
}
