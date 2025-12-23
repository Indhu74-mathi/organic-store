import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  requireAuth,
  createErrorResponse,
  unauthorizedResponse,
} from '@/lib/auth/api-auth'
import { validateString, validateNumber } from '@/lib/auth/validate-input'

/**
 * POST /api/cart/items
 * 
 * Add an item to the authenticated user's cart.
 * 
 * SECURITY:
 * - Auth required
 * - Validate product exists and is available
 * - Merge quantities if item already exists
 * - Prevent cart poisoning
 * 
 * Request body:
 * {
 *   productId: string,
 *   quantity: number (default: 1)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // SECURITY: Require authentication
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

    const { productId: rawProductId, quantity: rawQuantity } = body as Record<
      string,
      unknown
    >

    // SECURITY: Validate productId
    const productId = validateString(rawProductId, {
      minLength: 1,
      maxLength: 100,
      required: true,
      trim: true,
    })

    if (!productId) {
      return createErrorResponse('Product ID is required', 400)
    }

    // SECURITY: Validate quantity
    const quantity = validateNumber(rawQuantity, {
      min: 1,
      max: 99,
      required: false,
      integer: true,
    }) || 1

    // SECURITY: Verify product exists and is available in database
    const product = await prisma.product.findUnique({
      where: {
        id: productId,
        isActive: true,
        stock: {
          gt: 0,
        },
      },
    })

    if (!product) {
      return createErrorResponse('Product not found or unavailable', 400)
    }

    // SECURITY: Find or create cart for user
    let cart = await prisma.cart.findFirst({
      where: { userId: user.userId },
      include: {
        items: true,
      },
    })

    if (!cart) {
      const cartId = `cart_${user.userId}_${Date.now()}`
      cart = await prisma.cart.create({
        data: {
          id: cartId,
          userId: user.userId,
        },
        include: {
          items: true,
        },
      })
    }

    // SECURITY: Check if item already exists in cart
    const existingItem = cart.items.find((item) => item.productId === productId)

    if (existingItem) {
      // SECURITY: Check stock availability before merging quantities
      const requestedQuantity = existingItem.quantity + quantity
      if (requestedQuantity > product.stock) {
        return createErrorResponse(
          `Only ${product.stock} available in stock. You already have ${existingItem.quantity} in your cart.`,
          400
        )
      }
      
      // SECURITY: Merge quantities with limit check
      const newQuantity = Math.min(requestedQuantity, 99, product.stock)
      const updatedItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
        },
      })

      return NextResponse.json({
        success: true,
        cartItemId: updatedItem.id,
        product,
        quantity: updatedItem.quantity,
      })
    } else {
      // SECURITY: Check stock availability before creating new item
      if (quantity > product.stock) {
        return createErrorResponse(
          `Only ${product.stock} available in stock`,
          400
        )
      }
      
      // SECURITY: Create new cart item
      const newItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity: Math.min(quantity, product.stock),
        },
      })

      return NextResponse.json({
        success: true,
        cartItemId: newItem.id,
        product,
        quantity: newItem.quantity,
      })
    }
  } catch (error) {
    return createErrorResponse('Failed to add item to cart', 500, error)
  }
}

