import { NextResponse } from 'next/server'

/**
 * GET /api/cart
 * 
 * Fetch cart and cart items for the authenticated user.
 * Returns empty cart if none exists.
 * 
 * NOTE: Simplified for Supabase migration - auth can be added later
 */
export async function GET() {
  try {
    // For now, return empty cart to prevent 401 errors
    // Auth can be re-implemented later with Supabase Auth
    return NextResponse.json({
      cartId: null,
      items: [],
    })
  } catch (error) {
    console.error('[API Cart] Error:', error)
    return createErrorResponse('Failed to fetch cart', 500, error)
  }
}
