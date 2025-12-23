import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAuth, createErrorResponse, unauthorizedResponse } from '@/lib/auth/api-auth'
import { validateString } from '@/lib/auth/validate-input'

/**
 * GET /api/orders/[orderId]
 * 
 * Fetch a single order by ID for the authenticated user.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = requireAuth(req)
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
      .eq('userId', user.userId)
      .limit(1)

    if (orderError) {
      console.error('[API Order Detail] Supabase error:', orderError)
      return createErrorResponse('Failed to fetch order', 500)
    }

    if (!orders || orders.length === 0) {
      return createErrorResponse('Order not found', 404)
    }

    const order = orders[0]

    // Fetch order items
    const { data: orderItems, error: itemsError } = await supabase
      .from('OrderItem')
      .select('*')
      .eq('orderId', orderId)

    if (itemsError) {
      console.error('[API Order Detail] Items error:', itemsError)
      return createErrorResponse('Failed to fetch order items', 500)
    }

    // Map response
    const mappedItems = (orderItems || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice / 100,
      discountPercent: item.discountPercent,
      finalPrice: item.finalPrice / 100,
    }))

    return NextResponse.json({
      order: {
        id: order.id,
        status: order.status,
        totalAmount: order.totalAmount / 100,
        currency: order.currency,
        addressLine1: order.addressLine1,
        addressLine2: order.addressLine2,
        city: order.city,
        state: order.state,
        postalCode: order.postalCode,
        country: order.country,
        razorpayPaymentId: order.razorpayPaymentId,
        paidAt: order.paidAt,
        createdAt: order.createdAt,
        items: mappedItems,
        paymentStatus: getPaymentStatus(order.status),
      },
    })
  } catch (error) {
    console.error('[API Order Detail] Error:', error)
    return createErrorResponse('Failed to fetch order', 500, error)
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
