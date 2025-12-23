import { NextRequest } from 'next/server'
import { requireAuth, createErrorResponse, unauthorizedResponse } from '@/lib/auth/api-auth'

/**
 * POST /api/orders/create
 * 
 * Create a new order (checkout).
 * 
 * NOTE: Simplified for Supabase migration - returns error message
 */
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req)
    if (!user) {
      return unauthorizedResponse()
    }

    // For now, return error indicating order creation is not yet implemented
    return createErrorResponse(
      'Order creation is temporarily disabled during database migration. Please check back soon.',
      503
    )
  } catch (error) {
    console.error('[API Orders Create] Error:', error)
    return createErrorResponse('Failed to create order', 500, error)
  }
}
