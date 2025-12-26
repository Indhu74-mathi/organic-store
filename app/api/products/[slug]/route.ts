import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createErrorResponse } from '@/lib/auth/api-auth'

// Prevent caching to ensure fresh product data
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/products/[slug]
 * 
 * Fetch a single product by slug for the product detail page.
 * Uses the same direct Supabase query pattern as cart routes to ensure consistency.
 * 
 * SECURITY:
 * - Public endpoint (no auth required)
 * - Only returns active products (isActive = true)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Same query pattern as cart routes
    const { data: products, error } = await supabase
      .from('Product')
      .select('*')
      .eq('slug', params.slug)
      .eq('isActive', true)
      .limit(1)

    if (error) {
      console.error('[API Products Slug] Supabase error:', error)
      throw new Error(`Database query failed: ${error.message}`)
    }

    if (!products || products.length === 0) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const product = products[0]

    // Map products to API response format - EXACTLY like cart routes do
    // Cart uses: price: product.price / 100, discountPercent: product.discountPercent, stock: product.stock
    // Cart uses: inStock: product.isActive && product.stock > 0
    return NextResponse.json(
      {
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: product.price / 100, // Convert paise to rupees - SAME as cart
          discountPercent: product.discountPercent, // SAME as cart
          imageUrl: product.imageUrl,
          category: product.category,
          stock: product.stock, // SAME as cart
          inStock: product.isActive && product.stock > 0, // SAME logic as cart
          image: product.imageUrl, // Map imageUrl to image for Product type
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  } catch (error) {
    console.error('[API Products Slug] Error:', error)
    return createErrorResponse('Failed to fetch product', 500, error)
  }
}
