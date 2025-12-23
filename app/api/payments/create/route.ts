import { NextRequest } from 'next/server'
import { createErrorResponse } from '@/lib/auth/api-auth'

/**
 * POST /api/payments/create
 * 
 * Create payment session for an order.
 * 
 * NOTE: Simplified for Supabase migration
 */
export async function POST(_req: NextRequest) {
  try {
    return createErrorResponse(
      'Payment creation is temporarily disabled during database migration.',
      503
    )
  } catch (error) {
    console.error('[API Payments Create] Error:', error)
    return createErrorResponse('Failed to create payment', 500, error)
  }
}
