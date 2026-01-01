import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createErrorResponse } from '@/lib/auth/api-auth'

// Edge runtime for better performance on public read-only endpoint
export const runtime = 'edge'

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
    // Query with variants for malt products - explicit columns
    const { data: products, error } = await supabase
      .from('Product')
      .select(`
        id,
        name,
        slug,
        description,
        price,
        discountPercent,
        imageUrl,
        category,
        stock,
        isActive,
        ProductVariant (
          id,
          sizeGrams,
          price,
          stock
        )
      `)
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

    // Helper function for variant categories (Edge runtime compatible, case-insensitive)
    const hasVariants = (category: string) => {
      if (!category) return false
      const normalized = category.trim().toLowerCase()
      return normalized === 'malt' || normalized === 'saadha podi'
    }

    const product: any = products[0]
    const usesVariants = hasVariants(product.category)
    const variants = product.ProductVariant || []

    // For variant-based products: check if any variant has stock
    // For non-variant products: use product stock
    let inStock: boolean
    let stock: number

    if (usesVariants) {
      const hasStock = variants.some((v: any) => v.stock > 0)
      const totalStock = variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0)
      inStock = product.isActive && hasStock
      stock = totalStock
    } else {
      inStock = product.isActive && product.stock > 0
      stock = product.stock
    }

    return NextResponse.json(
      {
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: product.price / 100, // Convert paise to rupees - base price for non-variant products
          discountPercent: product.discountPercent,
          imageUrl: product.imageUrl,
          category: product.category,
          stock: stock,
          inStock: inStock,
          image: product.imageUrl,
          // Include variants for variant-based products
          ...(usesVariants && {
            variants: variants.map((v: any) => ({
              id: v.id,
              sizeGrams: v.sizeGrams,
              price: v.price / 100, // Convert paise to rupees
              stock: v.stock,
              inStock: v.stock > 0,
            })),
          }),
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (error) {
    console.error('[API Products Slug] Error:', error)
    return createErrorResponse('Failed to fetch product', 500, error)
  }
}
