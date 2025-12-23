import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, createErrorResponse, forbiddenResponse } from '@/lib/auth/api-auth'
import { validateString } from '@/lib/auth/validate-input'
import { checkRateLimit, getClientIdentifier } from '@/lib/auth/rate-limit'
import { createRazorpayRefund, getRazorpayPayment } from '@/lib/payments/razorpay'

/**
 * POST /api/admin/orders/[orderId]/refund
 * 
 * Initiate refund for an order (admin only).
 * 
 * SECURITY:
 * - Admin-only access
 * - Validate order status and payment
 * - Trigger Razorpay refund
 * - Restore product stock atomically
 * - Update order status to REFUNDED
 * 
 * Request body (optional):
 * {
 *   amount?: number // Partial refund amount (in paise). If not provided, full refund.
 *   reason?: string // Reason for refund
 * }
 * 
 * Rules:
 * - Only ORDER_CONFIRMED, SHIPPED, or DELIVERED orders can be refunded
 * - Order must have a valid Razorpay payment ID
 * - Stock is restored atomically on refund success
 * - Order is kept for history (not deleted)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // SECURITY: Rate limit refund requests (10 per minute per IP)
    const clientId = getClientIdentifier(req)
    const rateLimit = checkRateLimit(`admin:orders:refund:${clientId}`, 10, 60 * 1000)
    if (!rateLimit.allowed) {
      return createErrorResponse('Too many requests. Please try again later.', 429)
    }

    // SECURITY: Require admin role
    const admin = requireAdmin(req)
    if (!admin) {
      return forbiddenResponse()
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

    // SECURITY: Parse and validate request body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      // Body is optional, continue with default values
      body = {}
    }

    if (typeof body !== 'object' || body === null) {
      return createErrorResponse('Invalid request body', 400)
    }

    const { amount: rawAmount, reason } = body as Record<string, unknown>

    // Validate optional amount
    let refundAmount: number | undefined
    if (rawAmount !== undefined) {
      if (typeof rawAmount !== 'number' || rawAmount <= 0) {
        return createErrorResponse('Refund amount must be a positive number', 400)
      }
      refundAmount = Math.round(rawAmount) // Ensure integer (paise)
    }

    // Validate optional reason
    const refundReason = typeof reason === 'string' ? reason : undefined

    // SECURITY: Fetch order with items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    })

    if (!order) {
      return createErrorResponse('Order not found', 404)
    }

    // SECURITY: Validate order status - only confirmed/shipped/delivered orders can be refunded
    const refundableStatuses = ['ORDER_CONFIRMED', 'SHIPPED', 'DELIVERED']
    if (!refundableStatuses.includes(order.status)) {
      return createErrorResponse(
        `Order cannot be refunded. Current status: ${order.status}. Only ${refundableStatuses.join(', ')} orders can be refunded.`,
        400
      )
    }

    // SECURITY: Validate that order has a payment ID
    if (!order.razorpayPaymentId) {
      return createErrorResponse(
        'Order does not have a payment ID. Cannot process refund.',
        400
      )
    }

    // SECURITY: Verify payment exists and is captured
    const paymentDetails = await getRazorpayPayment(order.razorpayPaymentId)
    if (!paymentDetails) {
      return createErrorResponse(
        'Payment not found in Razorpay. Cannot process refund.',
        404
      )
    }

    if (paymentDetails.status !== 'captured') {
      return createErrorResponse(
        `Payment status is ${paymentDetails.status}. Only captured payments can be refunded.`,
        400
      )
    }

    // SECURITY: Validate refund amount (if provided)
    if (refundAmount !== undefined) {
      if (refundAmount > paymentDetails.amount) {
        return createErrorResponse(
          `Refund amount (₹${(refundAmount / 100).toFixed(2)}) cannot exceed payment amount (₹${(paymentDetails.amount / 100).toFixed(2)})`,
          400
        )
      }
    }

    // SECURITY: Create Razorpay refund
    let razorpayRefund
    try {
      const refundNotes: Record<string, string> = {
        orderId: order.id,
        refundedBy: admin.userId,
        refundedAt: new Date().toISOString(),
      }
      if (refundReason) {
        refundNotes.reason = refundReason
      }

      razorpayRefund = await createRazorpayRefund(
        order.razorpayPaymentId,
        refundAmount,
        refundNotes
      )
    } catch (razorpayError: any) {
      console.error('[Refund] Razorpay refund failed:', razorpayError)
      return createErrorResponse(
        razorpayError.message || 'Failed to process refund with payment gateway',
        500
      )
    }

    // SECURITY: Update order status and restore stock atomically
    // Use transaction to ensure atomicity
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Re-fetch order within transaction to ensure we have latest data
      const currentOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
        },
      })

      if (!currentOrder) {
        throw new Error('Order not found')
      }

      // Double-check status hasn't changed
      if (!refundableStatuses.includes(currentOrder.status)) {
        throw new Error(`Order status changed. Current status: ${currentOrder.status}`)
      }

      // Restore stock for each order item
      for (const orderItem of currentOrder.items) {
        await tx.product.update({
          where: { id: orderItem.productId },
          data: {
            stock: {
              increment: orderItem.quantity,
            },
          },
        })
      }

      // Update order status to REFUNDED
      return await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'REFUNDED',
        },
        include: {
          items: true,
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Refund processed successfully',
      refund: {
        id: razorpayRefund.id,
        amount: razorpayRefund.amount,
        status: razorpayRefund.status,
      },
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        totalAmount: updatedOrder.totalAmount,
        currency: updatedOrder.currency,
      },
    })
  } catch (error: any) {
    console.error('[Refund] Error:', error)
    
    // Handle transaction errors
    if (error.message && error.message.includes('status changed')) {
      return createErrorResponse(error.message, 409) // Conflict
    }
    
    return createErrorResponse('Failed to process refund', 500, error)
  }
}

