import { NextRequest } from 'next/server'
import { createErrorResponse } from '@/lib/auth/api-auth'

/**
 * POST /api/payments/verify
 * 
 * Verify payment after completion.
 * 
 * NOTE: Simplified for Supabase migration
 */
export async function POST(_req: NextRequest) {
  try {
    return createErrorResponse(
      'Payment verification is temporarily disabled during database migration.',
      503
    )
  } catch (error) {
    console.error('[API Payments Verify] Error:', error)
    return createErrorResponse('Failed to verify payment', 500, error)
  }
}
