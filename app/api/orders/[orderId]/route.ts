import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, unauthorizedResponse } from '@/lib/auth/api-auth'
import { validateString } from '@/lib/auth/validate-input'

/**
 * GET /api/orders/[orderId]
 * 
 * Fetch specific order details.
 * 
 * SECURITY:
 * - Verify order belongs to authenticated user
 * - Return full order + payment status
 * - Never expose internal IDs or secrets
 * 
 * Returns full order details including:
 * - Order information
 * - Items
 * - Address
 * - Payment status (masked)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // SECURITY: Require authentication - never trust request body for userId
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
    // This ensures one user can NEVER see another user's order
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: user.userId, // CRITICAL: Ensure order belongs to authenticated user
      },
      include: {
        items: {
          select: {
            productId: true,
            productName: true,
            quantity: true,
            unitPrice: true,
            discountPercent: true,
            finalPrice: true,
          },
        },
      },
    })

    if (!order) {
      // SECURITY: Generic message prevents order enumeration
      return createErrorResponse('Order not found', 404)
    }

    // SECURITY: Mask sensitive payment data
    // Never expose full payment IDs or signatures to frontend
    const safeOrder = {
      orderId: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      currency: order.currency,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      paidAt: order.paidAt,
      // Delivery address
      address: {
        line1: order.addressLine1,
        line2: order.addressLine2,
        city: order.city,
        state: order.state,
        postalCode: order.postalCode,
        country: order.country,
      },
      // Order items with discount information
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice, // Price at purchase (already discounted)
        discountPercent: item.discountPercent ?? 0, // Discount percentage at time of order
        finalPrice: item.finalPrice, // Final price (unitPrice * quantity) at time of order
        subtotal: item.finalPrice, // Use finalPrice as subtotal (already includes discount)
      })),
      // Payment status (masked - never expose full payment IDs or signatures)
      paymentStatus: ['ORDER_CONFIRMED', 'PAYMENT_SUCCESS'].includes(order.status) ? 'paid' 
        : order.status === 'CANCELLED' ? 'cancelled' 
        : ['PAYMENT_PENDING', 'ORDER_CREATED'].includes(order.status) ? 'pending'
        : 'unknown',
      hasPayment: !!order.razorpayPaymentId,
      // Only show if payment exists (don't expose full ID)
      paymentId: order.razorpayPaymentId ? `${order.razorpayPaymentId.substring(0, 8)}...` : null,
    }

    return NextResponse.json({
      order: safeOrder,
    })
  } catch (error) {
    // SECURITY: Never leak internal errors to client
    return createErrorResponse(
      'Failed to fetch order',
      500,
      error
    )
  }
}

