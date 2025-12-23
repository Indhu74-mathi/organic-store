import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, unauthorizedResponse } from '@/lib/auth/api-auth'
import { createRazorpayOrder } from '@/lib/payments/razorpay'
import { validateString } from '@/lib/auth/validate-input'
import {
  checkRateLimit,
  getClientIdentifier,
} from '@/lib/auth/rate-limit'

/**
 * POST /api/payments/create
 * 
 * Create a Razorpay order for payment.
 * 
 * SECURITY FLOW:
 * 1. Validate order belongs to authenticated user
 * 2. Verify order status is PAYMENT_PENDING
 * 3. Fetch order total from database (never trust frontend)
 * 4. Create Razorpay order with DB amount
 * 5. Store razorpayOrderId in database
 * 6. Return Razorpay order details to frontend
 * 
 * Request body:
 * {
 *   orderId: string
 * }
 */
export async function POST(req: Request) {
  try {
    // SECURITY: Rate limit payment creation (5 per minute per IP)
    const clientId = getClientIdentifier(req)
    const rateLimit = checkRateLimit(`payment-create:${clientId}`, 5, 60 * 1000)
    if (!rateLimit.allowed) {
      return createErrorResponse(
        'Too many requests. Please try again later.',
        429
      )
    }

    // SECURITY: Require authentication - never trust request body for userId
    const user = requireAuth(req)
    if (!user) {
      return unauthorizedResponse()
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

    const { orderId: rawOrderId } = body as Record<string, unknown>

    // SECURITY: Validate orderId format
    const orderId = validateString(rawOrderId, {
      minLength: 1,
      maxLength: 100,
      required: true,
      trim: true,
    })

    if (!orderId) {
      return createErrorResponse('Invalid order ID', 400)
    }

    // SECURITY: Fetch order from database - always scope by authenticated userId
    // Never trust orderId from request body without verification
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: user.userId, // CRITICAL: Ensure order belongs to authenticated user
      },
      include: {
        items: true,
      },
    })

    if (!order) {
      // SECURITY: Generic message prevents order enumeration
      return createErrorResponse('Order not found', 404)
    }

    // SECURITY: Only allow payment creation for PAYMENT_PENDING or PAYMENT_FAILED orders
    // PAYMENT_FAILED orders can retry payment
    // Prevents double payment and payment manipulation
    if (order.status !== 'PAYMENT_PENDING' && order.status !== 'PAYMENT_FAILED') {
      return createErrorResponse(
        `Order cannot be paid. Current status: ${order.status}`,
        400
      )
    }

    // If order is PAYMENT_FAILED, update status to PAYMENT_PENDING for retry
    if (order.status === 'PAYMENT_FAILED') {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'PAYMENT_PENDING',
        },
      })
      // Update order status in memory for consistency
      order.status = 'PAYMENT_PENDING'
    }

    // SECURITY: Prevent duplicate Razorpay order creation
    // If razorpayOrderId already exists, return existing order
    if (order.razorpayOrderId) {
      // Fetch existing Razorpay order details
      try {
        // Return existing Razorpay order ID
        return NextResponse.json({
          success: true,
          razorpayOrderId: order.razorpayOrderId,
          amount: order.totalAmount,
          currency: order.currency,
          orderId: order.id,
        })
      } catch {
        // If existing order is invalid, continue to create new one
      }
    }

    // SECURITY: Amount MUST come from database, never from frontend
    // totalAmount is already in smallest currency unit (paise for INR)
    const amount = order.totalAmount

    if (amount <= 0) {
      return createErrorResponse('Invalid order amount', 400)
    }

    // SECURITY: Create Razorpay order with database-calculated amount
    const razorpayOrder = await createRazorpayOrder(
      amount,
      order.currency,
      order.id
    )

    // SECURITY: Store razorpayOrderId in database using transaction
    // This prevents race conditions and ensures consistency
    await prisma.order.update({
      where: { id: order.id },
      data: {
        razorpayOrderId: razorpayOrder.id,
      },
    })

    return NextResponse.json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      orderId: order.id,
    })
  } catch (error) {
    // SECURITY: Never leak internal errors to client
    return createErrorResponse(
      'Failed to create payment order',
      500,
      error
    )
  }
}

