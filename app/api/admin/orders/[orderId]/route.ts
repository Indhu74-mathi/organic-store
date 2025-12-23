import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, createErrorResponse, forbiddenResponse } from '@/lib/auth/api-auth'
import { validateString } from '@/lib/auth/validate-input'
import { checkRateLimit, getClientIdentifier } from '@/lib/auth/rate-limit'
import { OrderStatus } from '@prisma/client'

/**
 * GET /api/admin/orders/[orderId]
 * 
 * Get order details (admin only).
 * 
 * SECURITY:
 * - Admin-only access
 * - Can view any order
 * - Never expose full payment IDs or signatures
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
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

    // SECURITY: Fetch order (admin can view any order)
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
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
      return createErrorResponse('Order not found', 404)
    }

    // SECURITY: Mask sensitive payment data even for admin
    const safeOrder = {
      orderId: order.id,
      userId: order.userId,
      userEmail: order.user.email,
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
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent ?? 0,
        finalPrice: item.finalPrice,
        subtotal: item.finalPrice,
      })),
      // Payment status (masked)
      paymentStatus: ['ORDER_CONFIRMED', 'PAYMENT_SUCCESS'].includes(order.status) ? 'paid' 
        : order.status === 'CANCELLED' ? 'cancelled' 
        : ['PAYMENT_PENDING', 'ORDER_CREATED'].includes(order.status) ? 'pending'
        : 'unknown',
      hasPayment: !!order.razorpayPaymentId,
      paymentId: order.razorpayPaymentId ? `${order.razorpayPaymentId.substring(0, 8)}...` : null,
    }

    return NextResponse.json({
      order: safeOrder,
    })
  } catch (error) {
    return createErrorResponse('Failed to fetch order', 500, error)
  }
}

/**
 * PATCH /api/admin/orders/[orderId]
 * 
 * Update order status (admin only).
 * 
 * SECURITY:
 * - Admin-only access
 * - Validate status transitions
 * - Restore stock if order is cancelled
 * 
 * Request body:
 * {
 *   status: 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
 * }
 * 
 * Rules:
 * - Only ORDER_CONFIRMED → SHIPPED → DELIVERED transitions allowed
 * - CANCELLED allowed from ORDER_CONFIRMED or SHIPPED
 * - Stock restored if order is cancelled
 * - Admin CANNOT modify prices or quantities
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // SECURITY: Rate limit order updates (20 per minute per IP)
    const clientId = getClientIdentifier(req)
    const rateLimit = checkRateLimit(`admin:orders:update:${clientId}`, 20, 60 * 1000)
    if (!rateLimit.allowed) {
      return createErrorResponse('Too many requests. Please try again later.', 429)
    }

    // SECURITY: Require admin role
    const admin = requireAdmin(req)
    if (!admin) {
      return forbiddenResponse()
    }

    // SECURITY: Validate order ID
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
      return createErrorResponse('Invalid JSON in request body', 400)
    }

    if (typeof body !== 'object' || body === null) {
      return createErrorResponse('Invalid request body', 400)
    }

    const { status: rawStatus } = body as Record<string, unknown>

    // SECURITY: Validate status
    if (typeof rawStatus !== 'string') {
      return createErrorResponse('Status must be a string', 400)
    }

    const newStatus = rawStatus.toUpperCase() as OrderStatus

    // SECURITY: Validate status is allowed
    // Admin can only update: CONFIRMED → SHIPPED → DELIVERED
    // Also allow CANCELLED for order cancellation
    const allowedStatuses: OrderStatus[] = ['SHIPPED', 'DELIVERED', 'CANCELLED']
    if (!allowedStatuses.includes(newStatus)) {
      return createErrorResponse(
        `Invalid status. Allowed: ${allowedStatuses.join(', ')}`,
        400
      )
    }

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

    // SECURITY: Validate status transitions
    // Only allow: ORDER_CONFIRMED → SHIPPED → DELIVERED
    // Also allow CANCELLED from ORDER_CONFIRMED or SHIPPED
    if (newStatus === 'SHIPPED') {
      if (order.status !== 'ORDER_CONFIRMED') {
        return createErrorResponse(
          `Cannot mark order as SHIPPED. Current status: ${order.status}. Order must be ORDER_CONFIRMED.`,
          400
        )
      }
    } else if (newStatus === 'DELIVERED') {
      if (order.status !== 'SHIPPED') {
        return createErrorResponse(
          `Cannot mark order as DELIVERED. Current status: ${order.status}. Order must be SHIPPED.`,
          400
        )
      }
    } else if (newStatus === 'CANCELLED') {
      // Allow cancellation only from ORDER_CONFIRMED or SHIPPED
      if (order.status !== 'ORDER_CONFIRMED' && order.status !== 'SHIPPED') {
        return createErrorResponse(
          `Cannot cancel order. Current status: ${order.status}. Only ORDER_CONFIRMED or SHIPPED orders can be cancelled.`,
          400
        )
      }
    }

    // SECURITY: Update order status and restore stock if cancelled
    // Use transaction to ensure atomicity
    // NOTE: Admin CANNOT modify prices or quantities - only status
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // If cancelling an order that was confirmed/shipped, restore stock
      if (newStatus === 'CANCELLED' && (order.status === 'ORDER_CONFIRMED' || order.status === 'SHIPPED')) {
        // SECURITY: Restore stock for each order item
        for (const orderItem of order.items) {
          await tx.product.update({
            where: { id: orderItem.productId },
            data: {
              stock: {
                increment: orderItem.quantity,
              },
            },
          })
        }
      }

      // Update order status (ONLY status, no price/quantity changes)
      return await tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
        },
        include: {
          items: true,
        },
      })
    })

    return NextResponse.json({
      success: true,
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        totalAmount: updatedOrder.totalAmount,
        currency: updatedOrder.currency,
        createdAt: updatedOrder.createdAt,
        updatedAt: updatedOrder.updatedAt,
      },
    })
  } catch (error) {
    return createErrorResponse('Failed to update order', 500, error)
  }
}
