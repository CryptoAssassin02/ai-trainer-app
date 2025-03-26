import { createBrowserClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createClient = () => createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      getAll() {
        return cookies().getAll()
      },
      setAll(cookiesToSet) {
        cookies().setAll(cookiesToSet)
      }
    }
  }
) 