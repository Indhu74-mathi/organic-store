import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from './api-auth'

/**
 * Get authenticated user from Supabase session or Bearer token
 * 
 * This function supports both:
 * 1. Supabase session (via cookies) - for future use
 * 2. Bearer token (current implementation) - for API routes
 * 
 * @param req - Request object (optional, for compatibility)
 * @returns User info if authenticated, null otherwise
 */
export async function getSupabaseUser(req?: Request): Promise<{
  id: string
  email: string
  role?: string
} | null> {
  try {
    // For now, fall back to Bearer token auth since we're not using cookies yet
    // In the future, we can add cookie-based session support here
    const tokenUser = requireAuth(req || new Request('http://localhost'))
    if (tokenUser) {
      // Fetch user role from User table using admin client
      const { data: userProfile } = await supabaseAdmin
        .from('User')
        .select('role')
        .eq('id', tokenUser.userId)
        .single()

      return {
        id: tokenUser.userId,
        email: tokenUser.email || '',
        role: userProfile?.role || tokenUser.role || 'USER',
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Require authentication middleware for API routes (Supabase)
 * 
 * @param _req - Request object (optional, for compatibility)
 * @returns User info if authenticated, null otherwise
 */
export async function requireSupabaseAuth(_req?: Request): Promise<{
  id: string
  email: string
  role?: string
} | null> {
  return getSupabaseUser(_req)
}

/**
 * Require admin role middleware for API routes (Supabase)
 * 
 * @param _req - Request object (optional, for compatibility)
 * @returns User info if admin, null otherwise
 */
export async function requireSupabaseAdmin(_req?: Request): Promise<{
  id: string
  email: string
  role?: string
} | null> {
  const user = await getSupabaseUser(_req)
  if (!user || user.role !== 'ADMIN') {
    return null
  }
  return user
}
