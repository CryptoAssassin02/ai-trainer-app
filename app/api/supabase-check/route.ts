import { NextResponse } from 'next/server'

/**
 * Simple API route to check backend auth system status
 * This helps verify that our backend authentication system is working correctly
 */
export async function GET() {
  try {
    const startTime = Date.now()
    
    // Test backend API connectivity instead of Supabase
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1'
    const response = await fetch(`${backendUrl}/auth/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const responseTime = Date.now() - startTime
    
    if (!response.ok) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Failed to connect to backend auth system',
          error: `HTTP ${response.status}: ${response.statusText}`
        },
        { status: 500 }
      )
    }
    
    const data = await response.json()
    
    return NextResponse.json({
      status: 'ok',
      info: {
        connected: true,
        responseTime: `${responseTime}ms`,
        backendUrl: backendUrl,
        backendStatus: data.status || 'ok',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      }
    })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to check backend auth system',
        error: errorMessage
      },
      { status: 500 }
    )
  }
} 