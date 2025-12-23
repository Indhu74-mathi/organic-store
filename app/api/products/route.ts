import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
 * - Only returns products with stock > 0 (unless includeOutOfStock=true)
 */
export async function GET(_req: NextRequest) {
  try {
    // Include all active products (including out of stock) by default
    // Products with stock === 0 will be displayed as unavailable in the UI
    const searchParams = _req.nextUrl.searchParams
    const excludeOutOfStock = searchParams.get('excludeOutOfStock') === 'true'

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(excludeOutOfStock ? { stock: { gt: 0 } } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      products: products.map((p) => ({
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
      })),
    })
  } catch (error) {
    return createErrorResponse('Failed to fetch products', 500, error)
  }
}

