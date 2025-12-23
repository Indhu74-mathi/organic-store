import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, createErrorResponse, forbiddenResponse } from '@/lib/auth/api-auth'
import { validateNumber } from '@/lib/auth/validate-input'
import { OrderStatus } from '@prisma/client'

/**
 * GET /api/admin/orders
 * 
 * Admin-only endpoint to view all orders.
 * 
 * SECURITY:
 * - Admin-only access (requires role check - TODO: implement role system)
 * - Read-only (no modifications allowed)
 * - Can view all orders
 * 
 * Query parameters:
 * - limit: Number of orders to return (default: 20, max: 100)
 * - offset: Number of orders to skip (default: 0)
 * - status: Filter by order status (optional)
 * 
 * NOTE: This is a placeholder for future admin functionality.
 * Currently requires authentication but does not check admin role.
 * TODO: Add role-based access control (RBAC) when user roles are implemented.
 */
export async function GET(req: NextRequest) {
  try {
    // SECURITY: Require admin role
    const admin = requireAdmin(req)
    if (!admin) {
      return forbiddenResponse()
    }

    // SECURITY: Parse and validate query parameters
    const searchParams = req.nextUrl.searchParams
    const rawLimit = searchParams.get('limit')
    const rawOffset = searchParams.get('offset')
    const status = searchParams.get('status')

    const limit = validateNumber(rawLimit ? parseInt(rawLimit, 10) : 20, {
      min: 1,
      max: 100, // Higher limit for admin
      required: false,
      integer: true,
    }) || 20

    const offset = validateNumber(rawOffset ? parseInt(rawOffset, 10) : 0, {
      min: 0,
      required: false,
      integer: true,
    }) || 0

    // SECURITY: Build where clause
    const where: {
      status?: OrderStatus
    } = {}

    if (status && [
      'ORDER_CREATED', 
      'PAYMENT_PENDING', 
      'PAYMENT_SUCCESS', 
      'PAYMENT_FAILED',
      'ORDER_CONFIRMED',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'REFUNDED'
    ].includes(status)) {
      where.status = status as OrderStatus
    }

    // SECURITY: Fetch all orders (admin view)
    // No userId scoping - admin can see all orders
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
          items: {
            select: {
              productName: true,
              quantity: true,
              unitPrice: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.order.count({ where }),
    ])

    // SECURITY: Mask sensitive payment data even for admin
    const safeOrders = orders.map((order) => ({
      orderId: order.id,
      userId: order.userId,
      userEmail: order.user.email,
      status: order.status,
      totalAmount: order.totalAmount,
      currency: order.currency,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      items: order.items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      paymentStatus: ['ORDER_CONFIRMED', 'PAYMENT_SUCCESS'].includes(order.status) ? 'paid' 
        : order.status === 'CANCELLED' ? 'cancelled' 
        : ['PAYMENT_PENDING', 'ORDER_CREATED'].includes(order.status) ? 'pending'
        : 'unknown',
      // Never expose full payment signatures or IDs
      hasPayment: !!order.razorpayPaymentId,
    }))

    return NextResponse.json({
      orders: safeOrders,
      total,
      limit,
      offset,
    })
  } catch (error) {
    // SECURITY: Never leak internal errors to client
    return createErrorResponse(
      'Failed to fetch orders',
      500,
      error
    )
  }
}

