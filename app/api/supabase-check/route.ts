import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Simple API route to check Supabase connection status
 * This helps verify that your Supabase credentials are working correctly
 */
export async function GET() {
  try {
    const startTime = Date.now()
    const supabase = await createClient()
    
    // Test authentication is initialized
    const { error } = await supabase.auth.getSession()
    
    if (error) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Failed to connect to Supabase',
          error: error.message
        },
        { status: 500 }
      )
    }
    
    const responseTime = Date.now() - startTime
    
    return NextResponse.json({
      status: 'ok',
      info: {
        connected: true,
        responseTime: `${responseTime}ms`,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL 
          ? process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/https:\/\/|\.supabase\.co/g, '') 
          : 'undefined',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      }
    })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to check Supabase connection',
        error: errorMessage
      },
      { status: 500 }
    )
  }
} 