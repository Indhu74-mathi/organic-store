import { NextRequest } from 'next/server'
import { createErrorResponse, forbiddenResponse, requireAdmin } from '@/lib/auth/api-auth'

/**
 * POST /api/admin/orders/[orderId]/refund
 * 
 * Process refund for an order (admin only).
 * 
 * NOTE: Simplified for Supabase migration
 */
export async function POST(
  _req: NextRequest,
  { params: _params }: { params: { orderId: string } }
) {
  try {
    const admin = requireAdmin(_req)
    if (!admin) {
      return forbiddenResponse()
    }

    return createErrorResponse(
      'Refund processing is temporarily disabled during database migration.',
      503
    )
  } catch (error) {
    console.error('[API Refund] Error:', error)
    return createErrorResponse('Failed to process refund', 500, error)
  }
}
