import { NextRequest } from 'next/server'
import { createErrorResponse, forbiddenResponse, requireAdmin } from '@/lib/auth/api-auth'

/**
 * POST /api/admin/products/import-static
 * 
 * Import static products (admin only).
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
      'Product import is temporarily disabled during database migration.',
      503
    )
  } catch (error) {
    console.error('[API Admin Import] Error:', error)
    return createErrorResponse('Failed to import products', 500, error)
  }
}
