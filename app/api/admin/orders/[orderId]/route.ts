import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdmin, createErrorResponse, forbiddenResponse } from '@/lib/auth/api-auth'
import { validateString } from '@/lib/auth/validate-input'

/**
 * GET /api/admin/orders/[orderId]
 * 
 * Fetch order details (admin only).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const admin = requireAdmin(_req)
    if (!admin) {
      return forbiddenResponse()
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
      .select('*, user:User(*)')
      .eq('id', orderId)
      .limit(1)

    if (orderError || !orders || orders.length === 0) {
      return createErrorResponse('Order not found', 404)
    }

    const order = orders[0] as { id: string; userId: string; user?: { email?: string }; status: string; totalAmount: number; currency: string; addressLine1: string; addressLine2: string | null; city: string; state: string; postalCode: string; country: string; razorpayPaymentId: string | null; paidAt: string | null; createdAt: string }

    // Fetch order items
    const { data: orderItems, error: itemsError } = await supabase
      .from('OrderItem')
      .select('*')
      .eq('orderId', orderId)

    if (itemsError) {
      return createErrorResponse('Failed to fetch order items', 500)
    }

    return NextResponse.json({
      order: {
        id: order.id,
        userId: order.userId,
        userEmail: order.user?.email || 'Unknown',
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
        items: (orderItems || []).map((item: { id: string; productId: string; productName: string; quantity: number; unitPrice: number; discountPercent: number | null; finalPrice: number }) => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice / 100,
          discountPercent: item.discountPercent,
          finalPrice: item.finalPrice / 100,
        })),
      },
    })
  } catch (error) {
    console.error('[API Admin Order Detail] Error:', error)
    return createErrorResponse('Failed to fetch order', 500, error)
  }
}
