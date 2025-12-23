import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Security headers middleware
 * 
 * Adds security headers to all responses to protect against:
 * - XSS attacks
 * - Clickjacking
 * - MIME type sniffing
 * - Information leakage
 */
export function middleware(_request: NextRequest) {
  const response = NextResponse.next()

  // SECURITY: Content Security Policy
  // Adjust based on your app's needs
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self';"
  )

  // SECURITY: Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')

  // SECURITY: Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // SECURITY: Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // SECURITY: XSS Protection (legacy, but still useful)
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // SECURITY: Disable powered-by header (Next.js handles this, but ensure it)
  response.headers.delete('X-Powered-By')

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

