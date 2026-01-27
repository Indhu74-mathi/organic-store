import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createErrorResponse } from '@/lib/auth/api-auth'
import { getProductImages } from '@/lib/products-server'

// Node runtime is more stable for Supabase calls here
// export const runtime = 'edge'
export const dynamic = 'force-dynamic'

/**
 * GET /api/products
 * 
 * Fetch all active products for the shop page.
 * Uses the same direct Supabase query pattern as cart routes to ensure consistency.
 * 
 * Query Parameters:
 * - excludeOutOfStock: Filter out products with no stock
 * - includeOutOfStock: Include out-of-stock products
 * - category: Filter by category name (case-insensitive)
 * - q or search: Search products by name (case-insensitive partial match)
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
    const categoryFilter = searchParams.get('category')
    const searchQuery = searchParams.get('q') || searchParams.get('search')

    // Build query - join with ProductVariant for malt products
    // Explicit columns to reduce payload size
    let query = supabase
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

    // Apply category filter if provided
    if (categoryFilter) {
      query = query.ilike('category', categoryFilter)
    }

    // Apply search filter if provided (case-insensitive partial match)
    if (searchQuery) {
      query = query.ilike('name', `%${searchQuery}%`)
    }

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

    // Get base URL from environment
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    // Helper function for variant categories (Edge runtime compatible, case-insensitive)
    const hasVariants = (category: string) => {
      if (!category) return false
      const normalized = category.trim().toLowerCase()
      return normalized === 'malt' || normalized === 'saadha podi'
    }

    // Helper function to get shipping weight
    const getShippingWeight = (category: string, sizeGrams?: number) => {
      const normalized = category.trim().toLowerCase()
      // For Malt and Saadha Podi, use variant sizeGrams if available
      if ((normalized === 'malt' || normalized === 'saadha podi') && sizeGrams) {
        return sizeGrams
      }
      // Default weight for Millet and other categories
      return 300
    }

    // Flatten products - expand variants into separate product entries
    const flattenedProducts: any[] = []

    for (const p of products) {
      const usesVariants = hasVariants(p.category)
      const variants = p.ProductVariant || []

      // Discover images
      let allImages: string[] = []
      try {
        allImages = getProductImages(p.category, p.name, p.imageUrl)
      } catch (e) {
        console.error('Error discovering images for', p.name, e)
      }

      const primaryImage = allImages.length > 0 ? allImages[0] : p.imageUrl
      const additionalImages = allImages.slice(1) // All images except the first one

      if (usesVariants && variants.length > 0) {
        // Create separate product entry for each variant
        for (const variant of variants) {
          const variantPrice = variant.price / 100 // Convert paise to rupees
          const salePrice = p.discountPercent > 0
            ? variantPrice - (variantPrice * p.discountPercent / 100)
            : variantPrice
          const availability = variant.stock > 0 ? 1 : 0

          // Skip if excludeOutOfStock is true and variant is out of stock
          if (excludeOutOfStock && !includeOutOfStock && availability === 0) {
            continue
          }

          flattenedProducts.push({
            product_id: `${p.id}-${variant.id}`,
            title: `${p.name} - ${variant.sizeGrams}g`,
            description: p.description,
            original_price: variantPrice,
            sale_price: parseFloat(salePrice.toFixed(2)),
            category: p.category,
            shipping_weight: variant.sizeGrams,
            availability: availability,
            link: `${baseUrl}/shop/${p.slug}`,
            primary_image: primaryImage,
            additional_images: additionalImages,
          })
        }
      } else {
        // Regular product (non-variant)
        const originalPrice = p.price / 100 // Convert paise to rupees
        const salePrice = p.discountPercent > 0
          ? originalPrice - (originalPrice * p.discountPercent / 100)
          : originalPrice
        const availability = p.stock > 0 ? 1 : 0

        // Skip if excludeOutOfStock is true and product is out of stock
        if (excludeOutOfStock && !includeOutOfStock && availability === 0) {
          continue
        }

        flattenedProducts.push({
          product_id: p.id,
          title: p.name,
          description: p.description,
          original_price: originalPrice,
          sale_price: parseFloat(salePrice.toFixed(2)),
          category: p.category,
          shipping_weight: getShippingWeight(p.category),
          availability: availability,
          link: `${baseUrl}/shop/${p.slug}`,
          primary_image: primaryImage,
          additional_images: additionalImages,
        })
      }
    }

    // Cache public read-only endpoint for 60s, allow stale for 300s
    return NextResponse.json(
      { products: flattenedProducts },
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
