import { NextRequest } from 'next/server'
import { createErrorResponse, forbiddenResponse, requireAdmin } from '@/lib/auth/api-auth'

/**
 * POST /api/admin/products/bulk-activate
 * 
 * Bulk activate products (admin only).
 * 
 * NOTE: Simplified for Supabase migration
 */
export async function POST(_req: NextRequest) {
  try {
    const admin = requireAdmin(_req)
    if (!admin) {
      return forbiddenResponse()
    }

    return createErrorResponse(
      'Bulk operations are temporarily disabled during database migration.',
      503
    )
  } catch (error) {
    console.error('[API Admin Bulk Activate] Error:', error)
    return createErrorResponse('Failed to bulk activate products', 500, error)
  }
}
