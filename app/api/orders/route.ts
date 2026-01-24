import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createErrorResponse, unauthorizedResponse } from '@/lib/auth/api-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/orders
 * 
 * Fetch all orders for the authenticated user.
 * 
 * Uses Supabase Auth cookies for authentication.
 */
export async function GET(_req: NextRequest) {
  try {
    const supabase = createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return unauthorizedResponse()
    }

    // Fetch orders with explicit columns only
    const { data: orders, error } = await supabase
      .from('Order')
      .select('id, status, totalAmount, currency, createdAt, paidAt')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false })

    if (error) {
      console.error('[API Orders] Supabase error:', error)
      return createErrorResponse('Failed to fetch orders', 500)
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ orders: [] })
    }

    // Batch fetch all order items in parallel
    const orderIds = orders.map(o => o.id)
    const { data: allOrderItems } = await supabase
      .from('OrderItem')
      .select('orderId, quantity')
      .in('orderId', orderIds)

    // Group items by orderId for O(1) lookup
    const itemsByOrderId = new Map<string, number>()
    if (allOrderItems) {
      for (const item of allOrderItems) {
        const current = itemsByOrderId.get(item.orderId) || 0
        itemsByOrderId.set(item.orderId, current + item.quantity)
      }
    }

    // Map orders with item counts
    const ordersWithItems = orders.map((order) => ({
      id: order.id,
      status: order.status,
      totalAmount: order.totalAmount / 100, // Convert to rupees
      currency: order.currency,
      createdAt: order.createdAt,
      paidAt: order.paidAt || null,
      paymentStatus: getPaymentStatus(order.status),
      itemCount: itemsByOrderId.get(order.id) || 0,
      items: [], // Empty array for compatibility
    }))

    return NextResponse.json({ orders: ordersWithItems })
  } catch (error) {
    console.error('[API Orders] Error:', error)
    return createErrorResponse('Failed to fetch orders', 500, error)
  }
}

function getPaymentStatus(status: string): string {
  switch (status) {
    case 'PAYMENT_SUCCESS':
    case 'ORDER_CONFIRMED':
    case 'SHIPPED':
    case 'DELIVERED':
      return 'paid'
    case 'PAYMENT_PENDING':
    case 'ORDER_CREATED':
      return 'pending'
    case 'PAYMENT_FAILED':
      return 'failed'
    case 'CANCELLED':
      return 'cancelled'
    case 'REFUNDED':
      return 'refunded'
    default:
      return 'unknown'
  }
}
