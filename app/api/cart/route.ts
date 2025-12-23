import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  requireAuth,
  createErrorResponse,
  unauthorizedResponse,
} from '@/lib/auth/api-auth'

/**
 * GET /api/cart
 * 
 * Fetch cart and cart items for the authenticated user.
 * Returns empty cart if none exists.
 * 
 * Auth required.
 */
export async function GET(req: Request) {
  try {
    // SECURITY: Require authentication - never trust request body for userId
    const user = requireAuth(req)
    if (!user) {
      return unauthorizedResponse()
    }

    // SECURITY: Find or create cart for user - always scope by authenticated userId
    // Never trust cartId from request body
    let cart = await prisma.cart.findFirst({
      where: { userId: user.userId },
      include: {
        items: true,
      },
    })

    // If no cart exists, create an empty one
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

    // Map cart items to include full product data and cartItem ID
    const cartItems = await Promise.all(
      cart.items.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        })
        if (!product) return null

        // Map database product to Product type
        // Note: We check isActive and stock to determine availability
        // Even if product is inactive or out of stock, we still return it
        // so the user can see it in their cart, but it won't be selectable for checkout
        return {
          cartItemId: item.id,
          product: {
            id: product.id,
            slug: product.slug,
            name: product.name,
            description: product.description,
            price: product.price / 100, // Convert to rupees (original price)
            discountPercent: product.discountPercent, // Include discount for frontend display
            category: product.category,
            image: product.imageUrl,
            inStock: product.isActive && product.stock > 0,
            stock: product.stock, // Include stock for low stock warnings
          },
          quantity: item.quantity,
        }
      })
    )

    const validCartItems = cartItems.filter(
      (item): item is { cartItemId: string; product: { id: string; slug: string; name: string; description: string; price: number; discountPercent: number | null; category: string; image: string; inStock: boolean; stock: number }; quantity: number } =>
        item !== null
    )

    return NextResponse.json({
      cartId: cart.id,
      items: validCartItems,
    })
  } catch (error) {
    // SECURITY: Never leak internal errors to client
    return createErrorResponse(
      'Failed to fetch cart',
      500,
      error
    )
  }
}

