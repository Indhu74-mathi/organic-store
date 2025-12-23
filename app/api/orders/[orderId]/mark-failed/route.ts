import { NextRequest } from 'next/server'
import { createErrorResponse } from '@/lib/auth/api-auth'

/**
 * POST /api/orders/[orderId]/mark-failed
 * 
 * Mark order as failed.
 * 
 * NOTE: Simplified for Supabase migration
 */
export async function POST(
  _req: NextRequest,
  { params: _params }: { params: { orderId: string } }
) {
  try {
    return createErrorResponse(
      'Order status update is temporarily disabled during database migration.',
      503
    )
  } catch (error) {
    console.error('[API Order Mark Failed] Error:', error)
    return createErrorResponse('Failed to update order status', 500, error)
  }
}
