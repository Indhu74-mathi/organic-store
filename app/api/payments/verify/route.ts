import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, unauthorizedResponse } from '@/lib/auth/api-auth'
import {
  verifyRazorpaySignature,
  getRazorpayPayment,
} from '@/lib/payments/razorpay'
import {
  validateString,
} from '@/lib/auth/validate-input'
import {
  checkRateLimit,
  getClientIdentifier,
} from '@/lib/auth/rate-limit'

/**
 * POST /api/payments/verify
 * 
 * Verify Razorpay payment and mark order as PAID.
 * 
 * SECURITY FLOW:
 * 1. Validate payment details from request
 * 2. Fetch order from database (scoped by authenticated userId)
 * 3. Verify order status is PENDING
 * 4. Verify razorpayOrderId matches stored value
 * 5. Verify Razorpay signature (CRITICAL - prevents fraud)
 * 6. Fetch payment details from Razorpay API (double-check)
 * 7. Verify payment amount matches order amount
 * 8. Update order status to PAID (only after all verifications pass)
 * 9. Store payment metadata in database
 * 
 * Request body:
 * {
 *   razorpay_order_id: string,
 *   razorpay_payment_id: string,
 *   razorpay_signature: string,
 *   orderId: string
 * }
 */
export async function POST(req: Request) {
  try {
    // SECURITY: Rate limit payment verification (10 per minute per IP)
    const clientId = getClientIdentifier(req)
    const rateLimit = checkRateLimit(`payment-verify:${clientId}`, 10, 60 * 1000)
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

    const {
      razorpay_order_id: rawRazorpayOrderId,
      razorpay_payment_id: rawRazorpayPaymentId,
      razorpay_signature: rawRazorpaySignature,
      orderId: rawOrderId, // Internal order ID for fetching
    } = body as Record<string, unknown>

    // SECURITY: Validate and sanitize all payment details
    const razorpayOrderId = validateString(rawRazorpayOrderId, {
      minLength: 1,
      maxLength: 100,
      required: true,
      trim: true,
    })

    const razorpayPaymentId = validateString(rawRazorpayPaymentId, {
      minLength: 1,
      maxLength: 100,
      required: true,
      trim: true,
    })

    const razorpaySignature = validateString(rawRazorpaySignature, {
      minLength: 1,
      maxLength: 200,
      required: true,
      trim: true,
    })

    const orderId = validateString(rawOrderId, {
      minLength: 1,
      maxLength: 100,
      required: true,
      trim: true,
    })

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !orderId) {
      return createErrorResponse('Missing required payment details', 400)
    }

    // SECURITY: Fetch Order using orderId - always scope by authenticated userId
    // This ensures user can only verify payments for their own orders
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

    // SECURITY: Verify razorpayOrderId matches (prevents order ID tampering)
    if (order.razorpayOrderId !== razorpayOrderId) {
      return createErrorResponse(
        'Razorpay order ID mismatch',
        400
      )
    }

    // SECURITY: Idempotency check - prevent duplicate confirmations
    // If order is already confirmed, return success (idempotent)
    if (order.status === 'ORDER_CONFIRMED') {
      return NextResponse.json({
        success: true,
        orderId: order.id,
        status: 'ORDER_CONFIRMED',
        message: 'Order already confirmed',
      })
    }

    // SECURITY: Only allow verification for PAYMENT_PENDING orders
    if (order.status !== 'PAYMENT_PENDING') {
      return createErrorResponse(
        `Order cannot be verified. Current status: ${order.status}`,
        400
      )
    }

    // SECURITY: Verify Razorpay signature using constant-time comparison
    // This is CRITICAL - signature verification prevents payment fraud
    const isSignatureValid = verifyRazorpaySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    )

    if (!isSignatureValid) {
      // SECURITY: Log failed verification attempt
      console.error('[PAYMENT VERIFY] Invalid signature', {
        orderId: order.id,
        razorpayOrderId,
        razorpayPaymentId,
      })

      return createErrorResponse(
        'Payment verification failed. Invalid signature.',
        400
      )
    }

    // SECURITY: Double-check payment details with Razorpay API
    // This ensures payment actually exists and matches our records
    const razorpayPayment = await getRazorpayPayment(razorpayPaymentId)

    if (!razorpayPayment) {
      return createErrorResponse(
        'Payment not found in Razorpay',
        400
      )
    }

    // SECURITY: Verify payment status is captured (successful)
    if (razorpayPayment.status !== 'captured') {
      return createErrorResponse(
        `Payment not successful. Status: ${razorpayPayment.status}`,
        400
      )
    }

    // SECURITY: Verify payment order ID matches
    if (razorpayPayment.order_id !== razorpayOrderId) {
      return createErrorResponse(
        'Payment order ID mismatch',
        400
      )
    }

    // SECURITY: Verify payment amount matches order amount
    // This prevents amount manipulation attacks
    if (razorpayPayment.amount !== order.totalAmount) {
      console.error('[PAYMENT VERIFY] Amount mismatch', {
        orderId: order.id,
        expected: order.totalAmount,
        received: razorpayPayment.amount,
      })

      return createErrorResponse(
        'Payment amount mismatch',
        400
      )
    }

    // SECURITY: Update order status, reduce stock, and clear cart items using transaction
    // Only after ALL verifications pass
    // CRITICAL: Stock is reduced ONLY after successful payment verification
    // CRITICAL: Cart items are removed ONLY after successful payment
    let stockError: Error | null = null
    
    try {
      await prisma.$transaction(async (tx) => {
        // Re-check order status to prevent race conditions (idempotency check)
        const currentOrder = await tx.order.findUnique({
          where: { id: order.id },
          include: {
            items: true,
            user: {
              include: {
                carts: {
                  include: {
                    items: true,
                  },
                },
              },
            },
          },
        })

        if (!currentOrder) {
          throw new Error('Order not found')
        }

        // Idempotency check: If already confirmed, return early (transaction will be no-op)
        if (currentOrder.status === 'ORDER_CONFIRMED') {
          return // Transaction completes successfully but no changes made
        }

        // Ensure order status is PAYMENT_PENDING
        if (currentOrder.status !== 'PAYMENT_PENDING') {
          throw new Error(`Order status is ${currentOrder.status}, expected PAYMENT_PENDING`)
        }

        // STEP 1: For each OrderItem, check stock availability
        for (const orderItem of currentOrder.items) {
          const product = await tx.product.findUnique({
            where: { id: orderItem.productId },
          })

          if (!product) {
            throw new Error(`Product not found: ${orderItem.productId}`)
          }

          // Check if stock is sufficient
          if (product.stock < orderItem.quantity) {
            // Store error for later handling (transaction will rollback)
            stockError = new Error(
              `Insufficient stock for ${orderItem.productName}. Available: ${product.stock}, Required: ${orderItem.quantity}`
            )
            throw stockError
          }
        }

        // STEP 2: Reduce stock for each order item (atomic operation)
        for (const orderItem of currentOrder.items) {
          await tx.product.update({
            where: { id: orderItem.productId },
            data: {
              stock: {
                decrement: orderItem.quantity,
              },
            },
          })
        }

        // STEP 3: Update order status to ORDER_CONFIRMED with payment metadata
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'ORDER_CONFIRMED',
            razorpayPaymentId,
            razorpaySignature,
            paidAt: new Date(),
          },
        })

        // STEP 4: Remove purchased items from cart ONLY
        const userCart = currentOrder.user?.carts[0]
        if (userCart) {
          // Get product IDs from order items
          const productIds = currentOrder.items.map((item) => item.productId)
          
          // Remove ONLY the purchased items (matching productIds)
          await tx.cartItem.deleteMany({
            where: {
              cartId: userCart.id,
              productId: { in: productIds },
            },
          })
        }
      })
    } catch (error) {
      // If transaction failed due to insufficient stock, mark order as PAYMENT_FAILED
      if (stockError && error === stockError) {
        // TypeScript now knows stockError is Error (not null) due to the check above
        const errorMessage = stockError instanceof Error ? stockError.message : 'Insufficient stock'
        
        // Mark order as PAYMENT_FAILED (outside transaction since transaction rolled back)
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'PAYMENT_FAILED',
          },
        })
        
        return createErrorResponse(
          errorMessage,
          400
        )
      }
      // Re-throw other errors
      throw error
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      status: 'ORDER_CONFIRMED',
      message: 'Payment verified successfully. Order confirmed.',
    })
  } catch (error) {
    // SECURITY: Never leak internal errors to client
    return createErrorResponse(
      'Payment verification failed',
      500,
      error
    )
  }
}

