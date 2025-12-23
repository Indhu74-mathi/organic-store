import { NextResponse } from 'next/server'
import { verifyAccessToken } from './tokens'

/**
 * Extract and verify user from request Authorization header
 * 
 * SECURITY: Always validates token signature AND expiry.
 * Never trusts request body for userId or other user data.
 * 
 * @param req - Request object
 * @returns User info if token is valid, null otherwise
 */
export function getUserFromRequest(req: Request): { userId: string; email?: string; role?: string } | null {
  try {
    const authHeader = req.headers.get('authorization')
    
    // SECURITY: Reject requests without Authorization header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    
    // SECURITY: Verify token signature AND expiry
    const result = verifyAccessToken(token)

    if (!result.valid || !result.payload) {
      return null
    }

    // SECURITY: Extract userId and role from verified token, never from request body
    return {
      userId: result.payload.userId,
      email: result.payload.email,
      role: result.payload.role,
    }
  } catch {
    // SECURITY: Fail closed - return null on any error
    return null
  }
}

/**
 * Require authentication middleware for API routes
 * 
 * Returns 401 if user is not authenticated.
 * 
 * @param req - Request object
 * @returns User info if authenticated, or null if not
 */
export function requireAuth(req: Request): { userId: string; email?: string; role?: string } | null {
  const user = getUserFromRequest(req)
  
  if (!user) {
    return null
  }

  return user
}

/**
 * Require admin role middleware for API routes
 * 
 * SECURITY: Rejects non-admin users with 403 Forbidden.
 * Must be called after requireAuth() to ensure user is authenticated.
 * 
 * @param req - Request object
 * @returns User info if admin, or null if not admin
 */
export function requireAdmin(req: Request): { userId: string; email?: string; role?: string } | null {
  const user = requireAuth(req)
  
  if (!user) {
    return null
  }

  // SECURITY: Reject non-admin users
  if (user.role !== 'ADMIN') {
    return null
  }

  return user
}

/**
 * Create standardized error response
 * 
 * SECURITY: Never leaks stack traces or internal errors to client.
 * Uses generic messages for auth failures to prevent user enumeration.
 */
export function createErrorResponse(
  message: string,
  status: number,
  logDetails?: unknown
): NextResponse {
  // Log detailed error server-side only
  if (logDetails) {
    console.error(`[API ERROR ${status}]`, message, logDetails)
  }

  // Return generic message to client
  return NextResponse.json({ message }, { status })
}

/**
 * Create unauthorized response
 * 
 * SECURITY: Generic message prevents user enumeration attacks.
 */
export function unauthorizedResponse(): NextResponse {
  return createErrorResponse('Unauthorized', 401)
}

/**
 * Create forbidden response (for admin-only routes)
 * 
 * SECURITY: Generic message prevents role enumeration attacks.
 */
export function forbiddenResponse(): NextResponse {
  return createErrorResponse('Forbidden', 403)
}

