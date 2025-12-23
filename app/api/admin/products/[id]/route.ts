import { NextRequest } from 'next/server'
import { createErrorResponse, forbiddenResponse, requireAdmin } from '@/lib/auth/api-auth'

/**
 * PATCH /api/admin/products/[id]
 * 
 * Update a product (admin only).
 * 
 * NOTE: Simplified for Supabase migration
 */
export async function PATCH(
  _req: NextRequest,
  { params: _params }: { params: { id: string } }
) {
  try {
    const admin = requireAdmin(_req)
    if (!admin) {
      return forbiddenResponse()
    }

    return createErrorResponse(
      'Product update is temporarily disabled during database migration.',
      503
    )
  } catch (error) {
    console.error('[API Admin Product Update] Error:', error)
    return createErrorResponse('Failed to update product', 500, error)
  }
}

/**
 * DELETE /api/admin/products/[id]
 * 
 * Delete a product (admin only).
 * 
 * NOTE: Simplified for Supabase migration
 */
export async function DELETE(
  _req: NextRequest,
  { params: _params }: { params: { id: string } }
) {
  try {
    const admin = requireAdmin(_req)
    if (!admin) {
      return forbiddenResponse()
    }

    return createErrorResponse(
      'Product deletion is temporarily disabled during database migration.',
      503
    )
  } catch (error) {
    console.error('[API Admin Product Delete] Error:', error)
    return createErrorResponse('Failed to delete product', 500, error)
  }
}
