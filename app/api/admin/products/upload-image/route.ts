import { NextRequest } from 'next/server'
import { createErrorResponse, forbiddenResponse, requireAdmin } from '@/lib/auth/api-auth'

/**
 * POST /api/admin/products/upload-image
 * 
 * Upload product image (admin only).
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
      'Image upload is temporarily disabled during database migration.',
      503
    )
  } catch (error) {
    console.error('[API Admin Upload Image] Error:', error)
    return createErrorResponse('Failed to upload image', 500, error)
  }
}
