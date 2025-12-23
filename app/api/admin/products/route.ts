import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdmin, createErrorResponse, forbiddenResponse } from '@/lib/auth/api-auth'

/**
 * POST /api/admin/products
 * 
 * Create a new product (admin only).
 * 
 * NOTE: Simplified for Supabase migration
 */
export async function POST(_req: NextRequest) {
  try {
    const admin = requireAdmin(_req)
    if (!admin) {
      return forbiddenResponse()
    }

    return createErrorResponse(
      'Product creation is temporarily disabled during database migration.',
      503
    )
  } catch (error) {
    console.error('[API Admin Products Create] Error:', error)
    return createErrorResponse('Failed to create product', 500, error)
  }
}

/**
 * GET /api/admin/products
 * 
 * Fetch all products (admin only).
 */
export async function GET(_req: NextRequest) {
  try {
    const admin = requireAdmin(_req)
    if (!admin) {
      return forbiddenResponse()
    }

    const searchParams = _req.nextUrl.searchParams
    const includeInactive = searchParams.get('includeInactive') === 'true'

    let query = supabase
      .from('Product')
      .select('*')
      .order('createdAt', { ascending: false })

    if (!includeInactive) {
      query = query.eq('isActive', true)
    }

    const { data: products, error } = await query

    if (error) {
      console.error('[API Admin Products] Supabase error:', error)
      return createErrorResponse('Failed to fetch products', 500)
    }

    return NextResponse.json({
      products: (products || []).map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price / 100, // Convert to rupees
        discountPercent: p.discountPercent,
        imageUrl: p.imageUrl,
        category: p.category,
        stock: p.stock,
        isActive: p.isActive,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    })
  } catch (error) {
    console.error('[API Admin Products] Error:', error)
    return createErrorResponse('Failed to fetch products', 500, error)
  }
}
