import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createErrorResponse } from '@/lib/auth/api-auth'
import { getProductImages } from '@/lib/products-server'

// Node runtime for server-side image discovery
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/products/search
 * 
 * Search products by name with optional category filtering.
 * 
 * Query Parameters:
 * - q or search: Search query for product name (required)
 * - category: Optional category filter
 * - excludeOutOfStock: Filter out products with no stock
 * 
 * SECURITY:
 * - Public endpoint (no auth required)
 * - Only returns active products (isActive = true)
 */
export async function GET(_req: NextRequest) {
    try {
        const searchParams = _req.nextUrl.searchParams
        const searchQuery = searchParams.get('q') || searchParams.get('search')
        const categoryFilter = searchParams.get('category')
        const excludeOutOfStock = searchParams.get('excludeOutOfStock') === 'true'

        if (!searchQuery || searchQuery.trim().length === 0) {
            return createErrorResponse('Search query is required', 400)
        }

        // Build query
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
            .ilike('name', `%${searchQuery.trim()}%`)
            .order('name', { ascending: true })
            .limit(50) // Limit search results

        // Apply category filter if provided
        if (categoryFilter) {
            query = query.ilike('category', categoryFilter)
        }

        const { data: products, error } = await query

        if (error) {
            console.error('[API Products Search] Supabase error:', error)
            throw new Error(`Database query failed: ${error.message}`)
        }

        if (!products || products.length === 0) {
            return NextResponse.json({
                products: [],
                query: searchQuery,
                count: 0
            })
        }

        // Get base URL from environment
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

        // Helper function for variant categories
        const hasVariants = (category: string) => {
            if (!category) return false
            const normalized = category.trim().toLowerCase()
            return normalized === 'malt' || normalized === 'saadha podi'
        }

        // Helper function to get shipping weight
        const getShippingWeight = (category: string, sizeGrams?: number) => {
            const normalized = category.trim().toLowerCase()
            if ((normalized === 'malt' || normalized === 'saadha podi') && sizeGrams) {
                return sizeGrams
            }
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
            const additionalImages = allImages.slice(1)

            if (usesVariants && variants.length > 0) {
                // Create separate product entry for each variant
                for (const variant of variants) {
                    const variantPrice = variant.price / 100
                    const salePrice = p.discountPercent > 0
                        ? variantPrice - (variantPrice * p.discountPercent / 100)
                        : variantPrice
                    const availability = variant.stock > 0 ? 1 : 0

                    if (excludeOutOfStock && availability === 0) {
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
                const originalPrice = p.price / 100
                const salePrice = p.discountPercent > 0
                    ? originalPrice - (originalPrice * p.discountPercent / 100)
                    : originalPrice
                const availability = p.stock > 0 ? 1 : 0

                if (excludeOutOfStock && availability === 0) {
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

        // Cache search results for 2 minutes
        return NextResponse.json(
            {
                products: flattenedProducts,
                query: searchQuery,
                count: flattenedProducts.length
            },
            {
                headers: {
                    'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
                },
            }
        )
    } catch (error) {
        console.error('[API Products Search] Error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to search products'
        return createErrorResponse(errorMessage, 500, error)
    }
}
