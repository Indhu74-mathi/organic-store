import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  requireAuth,
  createErrorResponse,
  unauthorizedResponse,
} from '@/lib/auth/api-auth'
import {
  validateArray,
  validateString,
  validateCartItemId,
  validateNumber,
} from '@/lib/auth/validate-input'
import {
  checkRateLimit,
  getClientIdentifier,
} from '@/lib/auth/rate-limit'
import { calculateDiscountedPrice } from '@/lib/pricing'
import { createRazorpayOrder } from '@/lib/payments/razorpay'

/**
 * POST /api/orders/create
 * 
 * Create an order from selected cart items.
 * 
 * Request body:
 * {
 *   selectedCartItemIds: string[],
 *   addressLine1: string,
 *   addressLine2?: string,
 *   city: string,
 *   state: string,
 *   postalCode: string,
 *   country?: string
 * }
 * 
 * Rules:
 * - Never accept prices or totals from frontend
 * - Never delete entire cart
 * - Only remove purchased cart items
 * - Use Prisma transaction for atomicity
 */
export async function POST(req: Request) {
  try {
    // SECURITY: Rate limit order creation (10 orders per minute per IP)
    const clientId = getClientIdentifier(req)
    const rateLimit = checkRateLimit(`order:${clientId}`, 10, 60 * 1000)
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
      selectedCartItemIds: rawSelectedIds,
      addressLine1: rawAddressLine1,
      addressLine2: rawAddressLine2,
      city: rawCity,
      state: rawState,
      postalCode: rawPostalCode,
      country: rawCountry,
    } = body as Record<string, unknown>

    // SECURITY: Validate and sanitize all inputs
    const selectedCartItemIds = validateArray(rawSelectedIds, {
      maxLength: 100, // Prevent mass assignment
      required: true,
      itemValidator: validateCartItemId,
    })

    if (!selectedCartItemIds || selectedCartItemIds.length === 0) {
      return createErrorResponse('At least one item must be selected', 400)
    }

    const addressLine1 = validateString(rawAddressLine1, {
      minLength: 1,
      maxLength: 200,
      required: true,
      trim: true,
    })
    const addressLine2 = validateString(rawAddressLine2, {
      maxLength: 200,
      required: false,
      trim: true,
    })
    const city = validateString(rawCity, {
      minLength: 1,
      maxLength: 100,
      required: true,
      trim: true,
    })
    const state = validateString(rawState, {
      minLength: 1,
      maxLength: 100,
      required: true,
      trim: true,
    })
    const postalCode = validateString(rawPostalCode, {
      minLength: 1,
      maxLength: 20,
      required: true,
      trim: true,
    })
    const country = validateString(rawCountry, {
      minLength: 2,
      maxLength: 2,
      required: false,
      trim: true,
    }) || 'IN'

    if (!addressLine1 || !city || !state || !postalCode) {
      return createErrorResponse('Missing or invalid required address fields', 400)
    }

    // SECURITY: Find user's cart - always scope by authenticated userId
    // Never trust cartId from request body
    const cart = await prisma.cart.findFirst({
      where: { userId: user.userId },
      include: {
        items: true,
      },
    })

    if (!cart) {
      return createErrorResponse('Cart not found', 404)
    }

    // SECURITY: Validate selectedCartItemIds belong to user's cart
    // Prevents cart hijacking - user can only select their own items
    const cartItemIds = cart.items.map((item) => item.id)
    const invalidIds = (selectedCartItemIds as string[]).filter(
      (id: string) => !cartItemIds.includes(id)
    )

    if (invalidIds.length > 0) {
      return createErrorResponse(
        'Some selected items do not belong to your cart',
        400,
        { invalidIds }
      )
    }

    // SECURITY: Fetch only selected cart items
    // Double-check items still exist (prevent double checkout)
    const selectedCartItems = cart.items.filter((item) =>
      (selectedCartItemIds as string[]).includes(item.id)
    )

    if (selectedCartItems.length === 0) {
      return createErrorResponse('No valid items selected', 400)
    }

    // SECURITY: Validate quantities (prevent cart poisoning)
    for (const item of selectedCartItems) {
      const quantity = validateNumber(item.quantity, {
        min: 1,
        max: 99, // Reasonable limit
        required: true,
        integer: true,
      })
      if (!quantity) {
        return createErrorResponse(
          `Invalid quantity for item ${item.id}`,
          400
        )
      }
    }

    // SECURITY: Fetch product data from database and calculate total on server
    // CRITICAL: Never trust prices from frontend - always calculate on server
    // CRITICAL: Check stock availability before creating order
    const productIds = selectedCartItems.map((item) => item.productId)
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true, // Only active products can be ordered
      },
    })

    // SECURITY: Validate all products exist and are active
    if (products.length !== productIds.length) {
      const foundIds = products.map((p: { id: string }) => p.id)
      const missingIds = productIds.filter((id) => !foundIds.includes(id))
      return createErrorResponse(
        `Some products are not available: ${missingIds.join(', ')}`,
        400
      )
    }

    // Calculate order total and prepare order items data
    // Note: Stock validation and deduction will happen INSIDE the transaction
    let totalAmount = 0
    const orderItemsData: Array<{
      productId: string
      productName: string
      unitPrice: number // priceAtPurchase (discounted unit price)
      discountPercent: number | null
      finalPrice: number // unitPrice * quantity
      quantity: number
    }> = []

    for (const cartItem of selectedCartItems) {
      const product = products.find((p: { id: string }) => p.id === cartItem.productId)
      if (!product) {
        return createErrorResponse(
          `Product not found: ${cartItem.productId}`,
          400
        )
      }

      // SECURITY: Price must come from database, never from frontend
      // CRITICAL: Calculate discounted price on server using discountPercent from database
      // This ensures discounts are applied correctly and prevents price tampering
      const originalPriceInPaise = product.price // Already in paise
      const discountedPriceInPaise = calculateDiscountedPrice(
        originalPriceInPaise,
        product.discountPercent
      )
      const finalPrice = discountedPriceInPaise * cartItem.quantity
      totalAmount += finalPrice

      orderItemsData.push({
        productId: product.id,
        productName: product.name,
        unitPrice: discountedPriceInPaise, // priceAtPurchase (snapshot of discounted unit price)
        discountPercent: product.discountPercent ?? null, // Snapshot of discount at time of order
        finalPrice, // Snapshot of final price (unitPrice * quantity)
        quantity: cartItem.quantity,
      })
    }

    // Use Prisma transaction to ensure atomicity
    // CRITICAL: Stock validation and deduction MUST happen inside the transaction
    // to prevent race conditions and ensure atomic stock updates
    const result = await prisma.$transaction(async (tx) => {
      // STEP 1: Re-fetch products WITHIN transaction to get latest stock and discount
      // This prevents race conditions where stock or discount changes between initial fetch and order creation
      const productsInTx = await tx.product.findMany({
        where: {
          id: { in: productIds },
          isActive: true,
        },
      })

      // Recalculate prices with latest discount values from transaction
      // This ensures we use the most up-to-date discount at checkout time
      totalAmount = 0
      for (let i = 0; i < orderItemsData.length; i++) {
        const cartItem = selectedCartItems[i]
        if (!cartItem) {
          throw new Error(`Cart item at index ${i} not found`)
        }
        const product = productsInTx.find((p: { id: string }) => p.id === cartItem.productId)
        if (!product) {
          throw new Error(`Product not found: ${cartItem.productId}`)
        }

        // Recalculate discounted price with latest discount from transaction
        const originalPriceInPaise = product.price
        const discountedPriceInPaise = calculateDiscountedPrice(
          originalPriceInPaise,
          product.discountPercent
        )
        const finalPrice = discountedPriceInPaise * cartItem.quantity
        totalAmount += finalPrice

        // Update order item with recalculated prices and snapshot data
        const orderItem = orderItemsData[i]
        if (orderItem) {
          orderItem.unitPrice = discountedPriceInPaise // priceAtPurchase
          orderItem.discountPercent = product.discountPercent ?? null
          orderItem.finalPrice = finalPrice
        }
      }

      // STEP 2: Validate stock availability INSIDE transaction
      // This ensures we check the most up-to-date stock values
      // NOTE: We only VALIDATE stock here, we do NOT deduct it
      // Stock will be deducted ONLY after payment success
      for (const cartItem of selectedCartItems) {
        const product = productsInTx.find((p: { id: string }) => p.id === cartItem.productId)
        if (!product) {
          throw new Error(`Product not found: ${cartItem.productId}`)
        }

        // CRITICAL: Check stock availability INSIDE transaction
        // Only validate - do NOT deduct stock yet
        if (product.stock < cartItem.quantity) {
          throw new Error(
            `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${cartItem.quantity}`
          )
        }
      }

      // STEP 3: Create Order with PAYMENT_PENDING status
      // NOTE: Stock is NOT deducted here - it will be deducted only after payment success
      // Cart items are NOT removed here - they will be removed only after payment success
      const order = await tx.order.create({
        data: {
          userId: user.userId,
          status: 'PAYMENT_PENDING', // Order created, awaiting payment
          totalAmount,
          currency: 'INR',
          addressLine1,
          addressLine2: addressLine2 || null,
          city,
          state,
          postalCode,
          country,
          items: {
            create: orderItemsData.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              unitPrice: item.unitPrice, // priceAtPurchase (snapshot)
              discountPercent: item.discountPercent, // Snapshot of discount at time of order
              finalPrice: item.finalPrice, // Snapshot of final price (unitPrice * quantity)
              quantity: item.quantity,
            })),
          },
        },
        include: {
          items: true,
        },
      })

      // Return order from transaction (razorpayOrderId will be added after transaction commits)
      return order
    })

    // STEP 4: Create Razorpay order after database order is committed
    // SECURITY: Use database-calculated totalAmount, never trust frontend
    if (result.totalAmount <= 0) {
      // If amount is invalid, we should delete the order or mark it as failed
      // For now, throw error (order will remain but without payment)
      throw new Error('Invalid order amount')
    }

    let razorpayOrder
    try {
      razorpayOrder = await createRazorpayOrder(
        result.totalAmount,
        result.currency,
        result.id
      )

      // STEP 5: Update order with razorpayOrderId
      await prisma.order.update({
        where: { id: result.id },
        data: {
          razorpayOrderId: razorpayOrder.id,
        },
      })
    } catch (razorpayError) {
      // If Razorpay order creation fails, log error but don't fail the entire request
      // The order is already created, user can retry payment later using /api/payments/create
      console.error('[RAZORPAY] Failed to create Razorpay order:', razorpayError)
      
      // Return order details without razorpayOrderId
      // Frontend should call /api/payments/create to retry payment
      return NextResponse.json({
        success: true,
        razorpayOrderId: null, // Indicates Razorpay order creation failed
        orderId: result.id,
        amount: result.totalAmount, // Use database amount
        currency: result.currency,
        order: {
          id: result.id,
          status: result.status,
          totalAmount: result.totalAmount,
          currency: result.currency,
          createdAt: result.createdAt,
        },
        warning: 'Order created but payment gateway initialization failed. You can retry payment from your orders page.',
      })
    }

    // Return razorpayOrderId, orderId, amount, and currency to frontend
    // Frontend will use razorpayOrderId to open Razorpay checkout
    // CRITICAL: Do NOT reduce stock or clear cart here - that happens only after payment success
    return NextResponse.json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      orderId: result.id,
      amount: razorpayOrder.amount, // Amount from Razorpay (should match totalAmount)
      currency: razorpayOrder.currency,
      order: {
        id: result.id,
        status: result.status,
        totalAmount: result.totalAmount,
        currency: result.currency,
        createdAt: result.createdAt,
      },
    })
  } catch (error) {
    // Handle stock-related errors with clear messages
    if (error instanceof Error) {
      // Check if it's a stock-related error from transaction
      if (error.message.includes('Insufficient stock')) {
        return createErrorResponse(error.message, 400)
      }
      // Check if it's a product not found error
      if (error.message.includes('Product not found')) {
        return createErrorResponse(error.message, 400)
      }
      // Check if it's a cart item error
      if (error.message.includes('cart items')) {
        return createErrorResponse(error.message, 400)
      }
    }
    // SECURITY: Never leak internal errors to client
    console.error('[Order Create] Error:', error)
    return createErrorResponse(
      'Failed to create order',
      500,
      error
    )
  }
}

