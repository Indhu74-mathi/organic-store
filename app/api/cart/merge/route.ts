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
  validateNumber,
} from '@/lib/auth/validate-input'
import {
  checkRateLimit,
  getClientIdentifier,
} from '@/lib/auth/rate-limit'

/**
 * POST /api/cart/merge
 * 
 * Merge guest cart items into user's cart.
 * - If item exists in user cart → increase quantity
 * - Else → create new cart item
 * - Never overwrites or deletes existing user cart items
 * 
 * Auth required.
 * 
 * Request body:
 * {
 *   items: [{ productId: string, quantity: number }]
 * }
 */
export async function POST(req: Request) {
  try {
    // SECURITY: Rate limit cart merge (20 merges per minute per IP)
    const clientId = getClientIdentifier(req)
    const rateLimit = checkRateLimit(`cart-merge:${clientId}`, 20, 60 * 1000)
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

    const { items: rawItems } = body as Record<string, unknown>

    // SECURITY: Validate items array with size limits
    const items = validateArray(rawItems, {
      maxLength: 100, // Prevent mass assignment
      required: true,
    })

    if (!items) {
      return createErrorResponse('Invalid items array', 400)
    }

    // SECURITY: Find or create cart for user - always scope by authenticated userId
    // Never trust cartId from request body
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

    // SECURITY: Merge guest items into user cart using transaction
    // This prevents race conditions and ensures atomicity
    await prisma.$transaction(async (tx) => {
      // Re-fetch cart within transaction to get latest state
      const currentCart = await tx.cart.findUnique({
        where: { id: cart.id },
        include: {
          items: true,
        },
      })

      if (!currentCart) {
        throw new Error('Cart not found')
      }

      // SECURITY: Merge guest items into user cart
      // Validate each item to prevent cart poisoning
      for (const rawGuestItem of items) {
        if (typeof rawGuestItem !== 'object' || rawGuestItem === null) {
          continue
        }

        const guestItem = rawGuestItem as Record<string, unknown>

        // SECURITY: Validate and sanitize productId
        const productId = validateString(guestItem.productId, {
          minLength: 1,
          maxLength: 100,
          required: true,
          trim: true,
        })

        // SECURITY: Validate quantity with limits (prevent cart poisoning)
        const quantity = validateNumber(guestItem.quantity, {
          min: 1,
          max: 99, // Reasonable limit
          required: true,
          integer: true,
        })

        if (!productId || !quantity) {
          continue // Skip invalid items
        }

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
        continue // Skip invalid/unavailable products
      }

        // SECURITY: Check if item already exists in user cart (within transaction)
        const existingItem = currentCart.items.find((item) => item.productId === productId)

        if (existingItem) {
          // SECURITY: Merge quantities with limit check
          const newQuantity = Math.min(existingItem.quantity + quantity, 99)
          await tx.cartItem.update({
            where: { id: existingItem.id },
            data: {
              quantity: newQuantity,
            },
          })
        } else {
          // SECURITY: Create new cart item - always associate with authenticated user's cart
          await tx.cartItem.create({
            data: {
              cartId: currentCart.id, // Always use authenticated user's cart
              productId: productId as string,
              quantity: quantity as number,
            },
          })
        }
      }
    })

    // Fetch updated cart with all items
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: true,
      },
    })

    if (!updatedCart) {
      return NextResponse.json({ message: 'Cart not found after merge' }, { status: 500 })
    }

    // Map cart items to include full product data from database
    const cartItems = await Promise.all(
      updatedCart.items.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        })
        if (!product) return null

        // Map database product to Product type
        return {
          product: {
            id: product.id,
            slug: product.slug,
            name: product.name,
            description: product.description,
            price: product.price / 100, // Convert to rupees (original price)
            discountPercent: product.discountPercent, // Include discount for frontend display
            category: product.category,
            image: product.imageUrl,
            inStock: product.stock > 0,
          },
          quantity: item.quantity,
        }
      })
    )

    const validCartItems = cartItems.filter(
      (item): item is { product: { id: string; slug: string; name: string; description: string; price: number; discountPercent: number | null; category: string; image: string; inStock: boolean }; quantity: number } =>
        item !== null
    )

    return NextResponse.json({
      success: true,
      cartId: updatedCart.id,
      items: validCartItems,
    })
  } catch (error) {
    // SECURITY: Never leak internal errors to client
    return createErrorResponse(
      'Cart merge failed',
      500,
      error
    )
  }
}

