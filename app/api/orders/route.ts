import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, unauthorizedResponse } from '@/lib/auth/api-auth'
import { validateNumber } from '@/lib/auth/validate-input'

/**
 * GET /api/orders
 * 
 * Fetch user's order history.
 * 
 * SECURITY:
 * - Only authenticated users
 * - Fetch ONLY orders belonging to userId from token
 * - Never expose another user's orders
 * 
 * Query parameters:
 * - limit: Number of orders to return (default: 10, max: 50)
 * - offset: Number of orders to skip (default: 0)
 * 
 * Returns:
 * {
 *   orders: [...],
 *   total: number,
 *   limit: number,
 *   offset: number
 * }
 */
export async function GET(req: NextRequest) {
  try {
    // SECURITY: Require authentication - never trust request body for userId
    const user = requireAuth(req)
    if (!user) {
      return unauthorizedResponse()
    }

    // SECURITY: Parse and validate query parameters
    const searchParams = req.nextUrl.searchParams
    const rawLimit = searchParams.get('limit')
    const rawOffset = searchParams.get('offset')

    const limit = validateNumber(rawLimit ? parseInt(rawLimit, 10) : 10, {
      min: 1,
      max: 50, // Prevent excessive data retrieval
      required: false,
      integer: true,
    }) || 10

    const offset = validateNumber(rawOffset ? parseInt(rawOffset, 10) : 0, {
      min: 0,
      required: false,
      integer: true,
    }) || 0

    // SECURITY: Fetch orders - ALWAYS scope by authenticated userId
    // This ensures one user can NEVER see another user's orders
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: {
          userId: user.userId, // CRITICAL: Scope by authenticated user
        },
        include: {
          items: {
            select: {
              productName: true,
              quantity: true,
              unitPrice: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc', // Newest first
        },
        take: limit,
        skip: offset,
      }),
      prisma.order.count({
        where: {
          userId: user.userId, // CRITICAL: Count only user's orders
        },
      }),
    ])

    // SECURITY: Mask sensitive payment data
    // Only return payment status, not full payment IDs or signatures
    const safeOrders = orders.map((order) => ({
      orderId: order.id,
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
      // Payment status (masked)
      paymentStatus: ['ORDER_CONFIRMED', 'PAYMENT_SUCCESS'].includes(order.status) ? 'paid' 
        : order.status === 'CANCELLED' ? 'cancelled' 
        : ['PAYMENT_PENDING', 'ORDER_CREATED'].includes(order.status) ? 'pending'
        : 'unknown',
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

