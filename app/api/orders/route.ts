import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth, createErrorResponse, unauthorizedResponse } from '@/lib/auth/api-auth'

/**
 * GET /api/orders
 * 
 * Fetch all orders for the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req)
    if (!user) {
      return unauthorizedResponse()
    }

    const { data: orders, error } = await supabase
      .from('Order')
      .select('*')
      .eq('userId', user.userId)
      .order('createdAt', { ascending: false })

    if (error) {
      console.error('[API Orders] Supabase error:', error)
      return createErrorResponse('Failed to fetch orders', 500)
    }

    // Map orders to response format
    const mappedOrders = (orders || []).map((order) => ({
      id: order.id,
      status: order.status,
      totalAmount: order.totalAmount / 100, // Convert to rupees
      currency: order.currency,
      createdAt: order.createdAt,
      paymentStatus: getPaymentStatus(order.status),
    }))

    return NextResponse.json({ orders: mappedOrders })
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
