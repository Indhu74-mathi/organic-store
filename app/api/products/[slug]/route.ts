import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createErrorResponse } from '@/lib/auth/api-auth'

/**
 * GET /api/products/[slug]
 * 
 * Fetch a single product by slug for the product detail page.
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

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price / 100, // Convert to rupees
        discountPercent: product.discountPercent,
        imageUrl: product.imageUrl,
        category: product.category,
        stock: product.stock,
        inStock: product.stock > 0,
        image: product.imageUrl, // Map imageUrl to image for Product type
      },
    })
  } catch (error) {
    console.error('[API Products Slug] Error:', error)
    return createErrorResponse('Failed to fetch product', 500, error)
  }
}
