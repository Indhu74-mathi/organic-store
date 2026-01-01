import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSupabaseUser } from '@/lib/auth/supabase-auth'
import { createErrorResponse, unauthorizedResponse } from '@/lib/auth/api-auth'
import { validateString } from '@/lib/auth/validate-input'

/**
 * POST /api/orders/[orderId]/cancel
 * 
 * Cancel an order.
 * 
 * Supports both Supabase Auth (via cookies) and Bearer token (for compatibility)
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // Get authenticated user from Supabase Auth cookies
    const user = await getSupabaseUser()

    if (!user) {
      return unauthorizedResponse()
    }

    const orderId = validateString(params.orderId, {
      minLength: 1,
      maxLength: 100,
      required: true,
      trim: true,
    })

    if (!orderId) {
      return createErrorResponse('Invalid order ID', 400)
    }

    // Fetch order
    const { data: orders, error: orderError } = await supabase
      .from('Order')
      .select('*')
      .eq('id', orderId)
      .eq('userId', user.id)
      .limit(1)

    if (orderError || !orders || orders.length === 0) {
      return createErrorResponse('Order not found', 404)
    }

    const order = orders[0]

    // Only allow cancellation of pending/failed/confirmed orders (not shipped or later)
    const cancellableStatuses = ['PAYMENT_PENDING', 'PAYMENT_FAILED', 'ORDER_CONFIRMED']
    if (!cancellableStatuses.includes(order.status)) {
      return createErrorResponse(
        `Order cannot be cancelled. Cancellation is only available before shipping. Current status: ${order.status}`,
        400
      )
    }

    // Update order status
    const { error: updateError } = await supabase
      .from('Order')
      .update({ status: 'CANCELLED' })
      .eq('id', orderId)

    if (updateError) {
      console.error('[API Order Cancel] Update error:', updateError)
      return createErrorResponse('Failed to cancel order', 500)
    }

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully',
    })
  } catch (error) {
    console.error('[API Order Cancel] Error:', error)
    return createErrorResponse('Failed to cancel order', 500, error)
  }
}
