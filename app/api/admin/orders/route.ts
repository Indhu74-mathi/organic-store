import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdmin, createErrorResponse, forbiddenResponse } from '@/lib/auth/api-auth'

/**
 * GET /api/admin/orders
 * 
 * Fetch all orders (admin only).
 */
export async function GET(_req: NextRequest) {
  try {
    const admin = requireAdmin(_req)
    if (!admin) {
      return forbiddenResponse()
    }

    const searchParams = _req.nextUrl.searchParams
    const status = searchParams.get('status')

    let query = supabase
      .from('Order')
      .select('*, user:User(*)')
      .order('createdAt', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: orders, error } = await query

    if (error) {
      console.error('[API Admin Orders] Supabase error:', error)
      return createErrorResponse('Failed to fetch orders', 500)
    }

    return NextResponse.json({
      orders: (orders || []).map((order: { id: string; userId: string; user?: { email?: string }; status: string; totalAmount: number; currency: string; createdAt: string }) => ({
        id: order.id,
        userId: order.userId,
        userEmail: order.user?.email || 'Unknown',
        status: order.status,
        totalAmount: order.totalAmount / 100,
        currency: order.currency,
        createdAt: order.createdAt,
      })),
    })
  } catch (error) {
    console.error('[API Admin Orders] Error:', error)
    return createErrorResponse('Failed to fetch orders', 500, error)
  }
}
