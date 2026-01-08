import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createErrorResponse } from '@/lib/auth/api-auth'

// Node runtime is more stable for Supabase calls here
// export const runtime = 'edge'

/**
 * GET /api/products
 * 
 * Fetch all active products for the shop page.
 * Uses the same direct Supabase query pattern as cart routes to ensure consistency.
 * 
 * SECURITY:
 * - Public endpoint (no auth required)
 * - Only returns active products (isActive = true)
 */
export async function GET(_req: NextRequest) {
  try {
    const searchParams = _req.nextUrl.searchParams
    const excludeOutOfStock = searchParams.get('excludeOutOfStock') === 'true'
    const includeOutOfStock = searchParams.get('includeOutOfStock') === 'true'

    // Build query - join with ProductVariant for malt products
    // Explicit columns to reduce payload size
    const query = supabase
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
      .eq('isActive', true)
      .order('createdAt', { ascending: false })

    // Filter out of stock if requested (but allow out of stock if includeOutOfStock is true)
    // For non-malt products, check Product.stock
    // For malt products, check if any variant has stock
    if (excludeOutOfStock && !includeOutOfStock) {
      // This will be handled in mapping logic
    }

    const { data: products, error } = await query

    if (error) {
      console.error('[API Products] Supabase error:', error)
      throw new Error(`Database query failed: ${error.message}`)
    }

    if (!products) {
      return NextResponse.json({ products: [] })
    }

    // Helper function for variant categories (Edge runtime compatible, case-insensitive)
    const hasVariants = (category: string) => {
      if (!category) return false
      const normalized = category.trim().toLowerCase()
      return normalized === 'malt' || normalized === 'saadha podi'
    }

    // Map products to API response format
    const mappedProducts = products.map((p: any) => {
      const usesVariants = hasVariants(p.category)
      const variants = p.ProductVariant || []

      // For variant-based products: check if any variant has stock
      // For non-variant products: use product stock
      let inStock: boolean
      let stock: number

      if (usesVariants) {
        const hasStock = variants.some((v: any) => v.stock > 0)
        const totalStock = variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0)
        inStock = p.isActive && hasStock
        stock = totalStock
      } else {
        inStock = p.isActive && p.stock > 0
        stock = p.stock
      }

      // Apply excludeOutOfStock filter
      if (excludeOutOfStock && !includeOutOfStock && !inStock) {
        return null
      }

      // Discover images resilience
      let allImages: string[] = []
      try {
        // We use the server-side discovery logic
        // Since we are in the API route (server-side), we can import it
        const { getProductImages } = require('@/lib/products-server')
        allImages = getProductImages(p.category, p.name, p.imageUrl)
      } catch (e) {
        console.error('Error discovering images for', p.name, e)
      }

      const finalImage = allImages.length > 0 ? allImages[0] : p.imageUrl

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price / 100, // Convert paise to rupees - base price for non-variant products
        discountPercent: p.discountPercent,
        imageUrl: finalImage,
        category: p.category,
        stock: stock,
        inStock: inStock,
        isActive: p.isActive,
        image: finalImage,
        images: allImages,
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
      }
    }).filter((p: any): p is NonNullable<typeof p> => p !== null)

    // Cache public read-only endpoint for 60s, allow stale for 300s
    return NextResponse.json(
      { products: mappedProducts },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (error) {
    console.error('[API Products] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch products'
    return createErrorResponse(errorMessage, 500, error)
  }
}
