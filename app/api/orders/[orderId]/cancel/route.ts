import { NextRequest } from 'next/server'
import { createErrorResponse } from '@/lib/auth/api-auth'

/**
 * POST /api/orders/[orderId]/cancel
 * 
 * Cancel an order.
 * 
 * NOTE: Simplified for Supabase migration
 */
export async function POST(
  _req: NextRequest,
  { params: _params }: { params: { orderId: string } }
) {
  try {
    return createErrorResponse(
      'Order cancellation is temporarily disabled during database migration.',
      503
    )
  } catch (error) {
    console.error('[API Order Cancel] Error:', error)
    return createErrorResponse('Failed to cancel order', 500, error)
  }
}
