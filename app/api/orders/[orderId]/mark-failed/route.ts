import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, unauthorizedResponse } from '@/lib/auth/api-auth'
import { validateString } from '@/lib/auth/validate-input'

/**
 * POST /api/orders/[orderId]/mark-failed
 * 
 * Mark an order as PAYMENT_FAILED (called when payment fails or is cancelled).
 * 
 * SECURITY:
 * - Verify order belongs to authenticated user
 * - Only allow marking PAYMENT_PENDING orders as failed
 * - Do NOT reduce stock
 * - Do NOT clear cart
 * 
 * Rules:
 * - Only PAYMENT_PENDING orders can be marked as failed
 * - Stock is NOT reduced (order was never confirmed)
 * - Cart is NOT cleared (items remain in cart)
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

    // Only allow marking PAYMENT_PENDING orders as failed
    if (order.status !== 'PAYMENT_PENDING') {
      // If already failed or confirmed, return success (idempotent)
      if (order.status === 'PAYMENT_FAILED' || order.status === 'ORDER_CONFIRMED') {
        return NextResponse.json({
          success: true,
          order: {
            id: order.id,
            status: order.status,
          },
          message: 'Order status unchanged',
        })
      }
      
      return createErrorResponse(
        `Order cannot be marked as failed. Current status: ${order.status}`,
        400
      )
    }

    // Update order status to PAYMENT_FAILED
    // NOTE: Stock is NOT reduced and cart is NOT cleared
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'PAYMENT_FAILED',
      },
    })

    return NextResponse.json({
      success: true,
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
      },
      message: 'Order marked as payment failed',
    })
  } catch (error) {
    return createErrorResponse('Failed to mark order as failed', 500, error)
  }
}

