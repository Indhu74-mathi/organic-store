import { NextResponse } from 'next/server'
import { createErrorResponse } from '@/lib/auth/api-auth'

/**
 * POST /api/cart/merge
 * 
 * Merge cart items.
 * 
 * NOTE: Simplified for Supabase migration
 */
export async function POST() {
  try {
    return NextResponse.json({
      success: true,
      message: 'Cart merge functionality temporarily disabled during migration',
    })
  } catch (error) {
    console.error('[API Cart Merge] Error:', error)
    return createErrorResponse('Failed to merge cart', 500, error)
  }
}
