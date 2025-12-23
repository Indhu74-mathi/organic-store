import { NextResponse } from 'next/server'
import { createErrorResponse } from '@/lib/auth/api-auth'

/**
 * POST /api/cart/items
 * 
 * Add an item to the authenticated user's cart.
 * 
 * NOTE: Simplified for Supabase migration
 */
export async function POST() {
  try {
    // For now, return success to prevent errors
    // Full implementation can be added later
    return NextResponse.json({
      success: true,
      message: 'Cart functionality temporarily disabled during migration',
    })
  } catch (error) {
    console.error('[API Cart Items] Error:', error)
    return createErrorResponse('Failed to add item to cart', 500, error)
  }
}
