import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createErrorResponse } from '@/lib/auth/api-auth'

// Mark route as dynamic to allow searchParams usage
export const dynamic = 'force-dynamic'

/**
 * GET /api/products
 * 
 * Fetch all active products for the shop page.
 * 
 * SECURITY:
 * - Public endpoint (no auth required)
 * - Only returns active products (isActive = true)
 */
export async function GET(_req: NextRequest) {
  try {
    const searchParams = _req.nextUrl.searchParams
    const excludeOutOfStock = searchParams.get('excludeOutOfStock') === 'true'

    // Build query
    let query = supabase
      .from('Product')
      .select('*')
      .eq('isActive', true)
      .order('createdAt', { ascending: false })

    // Filter out of stock if requested
    if (excludeOutOfStock) {
      query = query.gt('stock', 0)
    }

    const { data: products, error } = await query

    if (error) {
      console.error('[API Products] Supabase error:', error)
      throw new Error(`Database query failed: ${error.message}`)
    }

    if (!products) {
      return NextResponse.json({ products: [] })
    }

    // Map products to API response format
    const mappedProducts = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: p.price / 100, // Convert to rupees
      discountPercent: p.discountPercent,
      imageUrl: p.imageUrl,
      category: p.category,
      stock: p.stock,
      inStock: p.stock > 0,
      isActive: p.isActive,
      image: p.imageUrl, // Map imageUrl to image for Product type
    }))

    return NextResponse.json({
      products: mappedProducts,
    })
  } catch (error) {
    console.error('[API Products] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch products'
    return createErrorResponse(errorMessage, 500, error)
  }
}
