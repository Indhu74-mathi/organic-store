import { NextResponse } from 'next/server'
import { createErrorResponse } from '@/lib/auth/api-auth'

/**
 * PATCH /api/cart/items/[cartItemId]
 * 
 * Update cart item quantity.
 * 
 * NOTE: Simplified for Supabase migration
 */
export async function PATCH() {
  try {
    return NextResponse.json({
      success: true,
      message: 'Cart functionality temporarily disabled during migration',
    })
  } catch (error) {
    console.error('[API Cart Item Update] Error:', error)
    return createErrorResponse('Failed to update cart item', 500, error)
  }
}

/**
 * DELETE /api/cart/items/[cartItemId]
 * 
 * Remove item from cart.
 * 
 * NOTE: Simplified for Supabase migration
 */
export async function DELETE() {
  try {
    return NextResponse.json({
      success: true,
      message: 'Cart functionality temporarily disabled during migration',
    })
  } catch (error) {
    console.error('[API Cart Item Delete] Error:', error)
    return createErrorResponse('Failed to remove cart item', 500, error)
  }
}
