import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Since we've moved to backend auth with localStorage tokens,
  // we'll simplify middleware and rely on frontend auth provider for route protection
  // Server middleware can't access localStorage, so we'll handle auth client-side
  
  // Check for E2E test bypass header
  const isE2ETest = request.headers.get('x-e2e-test') === 'true';
  
  // Allow all requests to proceed - auth protection handled by frontend
  // This prevents server-side route protection conflicts with our localStorage approach
  if (isE2ETest) {
    console.log('[MIDDLEWARE] E2E test detected, bypassing any restrictions');
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - debug (debug page)
     * - test (test page)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|debug|test|login-test|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
