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
    // Log request for debugging
    console.log('[API Products] GET request received')
    console.log('[API Products] DATABASE_URL exists:', !!process.env.DATABASE_URL)
    console.log('[API Products] NODE_ENV:', process.env.NODE_ENV)

    // Include all active products (including out of stock) by default
    // Products with stock === 0 will be displayed as unavailable in the UI
    const searchParams = _req.nextUrl.searchParams
    const excludeOutOfStock = searchParams.get('excludeOutOfStock') === 'true'

    console.log('[API Products] Query params:', { excludeOutOfStock })

    // Test Prisma connection
    try {
      console.log('[API Products] Testing Prisma connection...')
      await prisma.$connect()
      console.log('[API Products] Prisma connected successfully')
    } catch (connectError) {
      console.error('[API Products] Prisma connection error:', connectError)
      throw new Error(`Database connection failed: ${connectError instanceof Error ? connectError.message : 'Unknown error'}`)
    }

    // Execute query with detailed error logging
    console.log('[API Products] Executing findMany query...')
    let products
    try {
      products = await prisma.product.findMany({
        where: {
          isActive: true,
          ...(excludeOutOfStock ? { stock: { gt: 0 } } : {}),
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
      console.log('[API Products] Query successful, found', products.length, 'products')
    } catch (queryError) {
      console.error('[API Products] Query error details:')
      console.error('[API Products] Error type:', queryError instanceof Error ? queryError.constructor.name : typeof queryError)
      console.error('[API Products] Error message:', queryError instanceof Error ? queryError.message : String(queryError))
      console.error('[API Products] Error stack:', queryError instanceof Error ? queryError.stack : 'No stack')
      
      // Check for common Prisma errors
      if (queryError instanceof Error) {
        if (queryError.message.includes('relation') || queryError.message.includes('does not exist')) {
          throw new Error(`Table not found. Check if table name matches Prisma model. Error: ${queryError.message}`)
        }
        if (queryError.message.includes('column') || queryError.message.includes('unknown column')) {
          throw new Error(`Column mismatch. Check if schema matches database. Error: ${queryError.message}`)
        }
        if (queryError.message.includes('connection') || queryError.message.includes('timeout')) {
          throw new Error(`Database connection issue. Error: ${queryError.message}`)
        }
      }
      throw queryError
    }

    // Map products with error handling
    console.log('[API Products] Mapping products...')
    const mappedProducts = products.map((p) => {
      try {
        return {
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
        }
      } catch (mapError) {
        console.error('[API Products] Error mapping product:', p.id, mapError)
        throw mapError
      }
    })

    console.log('[API Products] Successfully returning', mappedProducts.length, 'products')
    return NextResponse.json({
      products: mappedProducts,
    })
  } catch (error) {
    // Enhanced error logging
    console.error('[API Products] Fatal error:')
    console.error('[API Products] Error type:', error instanceof Error ? error.constructor.name : typeof error)
    console.error('[API Products] Error message:', error instanceof Error ? error.message : String(error))
    console.error('[API Products] Error stack:', error instanceof Error ? error.stack : 'No stack')
    
    // Return detailed error in development, generic in production
    const errorMessage = process.env.NODE_ENV === 'development'
      ? `Failed to fetch products: ${error instanceof Error ? error.message : 'Unknown error'}`
      : 'Failed to fetch products'
    
    return createErrorResponse(errorMessage, 500, error)
  }
}

