import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  if (code) {
    // Since we're using backend auth, we would need to send the code to our backend
    // For now, we'll just redirect to login page where user can sign in normally
    // OAuth integration would need to be implemented in the backend auth service
    console.log('[AUTH CALLBACK] OAuth code received, but backend auth integration needed');
    
    // Redirect to login page with a message
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('message', 'oauth_callback')
    return NextResponse.redirect(loginUrl)
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL('/login', request.url))
} 