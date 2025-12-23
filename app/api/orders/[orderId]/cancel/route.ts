import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, unauthorizedResponse } from '@/lib/auth/api-auth'
import { validateString } from '@/lib/auth/validate-input'

/**
 * POST /api/orders/[orderId]/cancel
 * 
 * Cancel an order (user can cancel their own orders).
 * 
 * SECURITY:
 * - Verify order belongs to authenticated user
 * - Only allow cancellation of PAYMENT_PENDING or PAYMENT_FAILED orders
 * - Do NOT restore stock (stock was never reduced for these orders)
 * - Do NOT clear cart (cart was never cleared)
 * 
 * Rules:
 * - Only PAYMENT_PENDING and PAYMENT_FAILED orders can be cancelled
 * - ORDER_CONFIRMED orders cannot be cancelled (use admin endpoint)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // SECURITY: Require authentication
    const user = requireAuth(req)
    if (!user) {
      return unauthorizedResponse()
    }

    // SECURITY: Validate orderId format
    const orderId = validateString(params.orderId, {
      minLength: 1,
      maxLength: 100,
      required: true,
      trim: true,
    })

    if (!orderId) {
      return createErrorResponse('Invalid order ID', 400)
    }

    // SECURITY: Fetch order - ALWAYS scope by authenticated userId
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: user.userId, // CRITICAL: Ensure order belongs to authenticated user
      },
    })

    if (!order) {
      return createErrorResponse('Order not found', 404)
    }

    // Only allow cancellation of PAYMENT_PENDING or PAYMENT_FAILED orders
    if (order.status !== 'PAYMENT_PENDING' && order.status !== 'PAYMENT_FAILED') {
      return createErrorResponse(
        `Order cannot be cancelled. Current status: ${order.status}`,
        400
      )
    }

    // Update order status to CANCELLED
    // NOTE: Stock is NOT restored because it was never reduced for these orders
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
      },
    })

    return NextResponse.json({
      success: true,
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
      },
      message: 'Order cancelled successfully',
    })
  } catch (error) {
    return createErrorResponse('Failed to cancel order', 500, error)
  }
}

