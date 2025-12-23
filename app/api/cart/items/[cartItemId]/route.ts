import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  requireAuth,
  createErrorResponse,
  unauthorizedResponse,
} from '@/lib/auth/api-auth'
import { validateString } from '@/lib/auth/validate-input'

/**
 * DELETE /api/cart/items/:cartItemId
 * 
 * Remove a cart item from the authenticated user's cart.
 * 
 * SECURITY:
 * - Auth required
 * - Verify cartItemId belongs to user's cart
 * - Prevent cross-user deletion
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { cartItemId: string } }
) {
  try {
    // SECURITY: Require authentication
    const user = requireAuth(req)
    if (!user) {
      return unauthorizedResponse()
    }

    // SECURITY: Validate cartItemId
    const cartItemId = validateString(params.cartItemId, {
      minLength: 1,
      maxLength: 100,
      required: true,
      trim: true,
    })

    if (!cartItemId) {
      return createErrorResponse('Invalid cart item ID', 400)
    }

    // SECURITY: Find user's cart
    const cart = await prisma.cart.findFirst({
      where: { userId: user.userId },
      include: {
        items: true,
      },
    })

    if (!cart) {
      return createErrorResponse('Cart not found', 404)
    }

    // SECURITY: Verify cartItemId belongs to user's cart
    const cartItem = cart.items.find((item) => item.id === cartItemId)
    if (!cartItem) {
      return createErrorResponse('Cart item not found', 404)
    }

    // SECURITY: Delete cart item - scoped by cartId to prevent cross-user deletion
    await prisma.cartItem.delete({
      where: {
        id: cartItemId,
        cartId: cart.id, // Ensure item belongs to user's cart
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Cart item removed',
    })
  } catch (error) {
    return createErrorResponse('Failed to remove cart item', 500, error)
  }
}

