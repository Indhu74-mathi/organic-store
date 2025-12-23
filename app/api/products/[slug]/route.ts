import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
    const product = await prisma.product.findUnique({
      where: {
        slug: params.slug,
        isActive: true,
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

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
    return createErrorResponse('Failed to fetch product', 500, error)
  }
}

