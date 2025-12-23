import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, createErrorResponse, forbiddenResponse } from '@/lib/auth/api-auth'
import { validateString, validateNumber } from '@/lib/auth/validate-input'
import { checkRateLimit, getClientIdentifier } from '@/lib/auth/rate-limit'

/**
 * POST /api/admin/products
 * 
 * Create a new product (admin only).
 * 
 * SECURITY:
 * - Admin-only access
 * - Validate all fields
 * - Prevent mass assignment
 * 
 * Request body:
 * {
 *   name: string,
 *   slug: string (unique),
 *   description: string,
 *   price: number (in rupees, will be converted to paise),
 *   imageUrl: string,
 *   category: string,
 *   stock?: number (default: 0),
 *   isActive?: boolean (default: true)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // SECURITY: Rate limit product creation (10 per minute per IP)
    const clientId = getClientIdentifier(req)
    const rateLimit = checkRateLimit(`admin:products:create:${clientId}`, 10, 60 * 1000)
    if (!rateLimit.allowed) {
      return createErrorResponse('Too many requests. Please try again later.', 429)
    }

    // SECURITY: Require admin role
    const admin = requireAdmin(req)
    if (!admin) {
      return forbiddenResponse()
    }

    // SECURITY: Parse and validate request body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return createErrorResponse('Invalid JSON in request body', 400)
    }

    if (typeof body !== 'object' || body === null) {
      return createErrorResponse('Invalid request body', 400)
    }

    const {
      name: rawName,
      slug: rawSlug,
      description: rawDescription,
      price: rawPrice,
      imageUrl: rawImageUrl,
      category: rawCategory,
      stock: rawStock,
      isActive: rawIsActive,
    } = body as Record<string, unknown>

    // SECURITY: Validate and sanitize all inputs
    const name = validateString(rawName, {
      minLength: 1,
      maxLength: 200,
      required: true,
      trim: true,
    })

    const slug = validateString(rawSlug, {
      minLength: 1,
      maxLength: 200,
      required: true,
      trim: true,
    })

    const description = validateString(rawDescription, {
      minLength: 0,
      maxLength: 2000,
      required: true,
      trim: true,
    })

    const imageUrl = validateString(rawImageUrl, {
      minLength: 1,
      maxLength: 500,
      required: true,
      trim: true,
    })

    const category = validateString(rawCategory, {
      minLength: 1,
      maxLength: 100,
      required: true,
      trim: true,
    })

    // SECURITY: Validate price (in rupees, convert to paise)
    const priceInRupees = validateNumber(rawPrice, {
      min: 0.01,
      max: 1000000,
      required: true,
      integer: false,
    })

    if (!name || !slug || !description || !imageUrl || !category || !priceInRupees) {
      return createErrorResponse('Missing required fields', 400)
    }

    // SECURITY: Validate stock (optional, default 0)
    const stock = validateNumber(rawStock, {
      min: 0,
      max: 1000000,
      required: false,
      integer: true,
    }) ?? 0

    // SECURITY: Validate isActive (optional, default true)
    const isActive = typeof rawIsActive === 'boolean' ? rawIsActive : true

    // SECURITY: Check if slug already exists
    const existingProduct = await prisma.product.findUnique({
      where: { slug },
    })

    if (existingProduct) {
      return createErrorResponse('Product with this slug already exists', 409)
    }

    // SECURITY: Convert price to smallest currency unit (paise)
    const priceInPaise = Math.round(priceInRupees * 100)

    // Create product
    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        price: priceInPaise,
        imageUrl,
        category,
        stock,
        isActive,
      },
    })

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price / 100, // Convert back to rupees
        imageUrl: product.imageUrl,
        category: product.category,
        stock: product.stock,
        isActive: product.isActive,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      },
    })
  } catch (error) {
    // SECURITY: Never leak internal errors to client
    return createErrorResponse('Failed to create product', 500, error)
  }
}

/**
 * GET /api/admin/products
 * 
 * List all products (admin only).
 * 
 * SECURITY:
 * - Admin-only access
 * - Returns all products (including inactive)
 */
export async function GET(req: NextRequest) {
  try {
    // SECURITY: Require admin role
    const admin = requireAdmin(req)
    if (!admin) {
      console.error('[Admin Products API] Access denied - user is not admin')
      return forbiddenResponse()
    }
    
    console.log('[Admin Products API] Admin access granted:', admin.userId)

    // SECURITY: Parse query parameters
    const searchParams = req.nextUrl.searchParams
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const products = await prisma.product.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: {
        createdAt: 'desc',
      },
    })

    console.log('[Admin Products API] Found products:', products.length)
    console.log('[Admin Products API] Products:', products.map(p => ({ id: p.id, name: p.name, isActive: p.isActive })))

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
        isActive: p.isActive,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    })
  } catch (error) {
    return createErrorResponse('Failed to fetch products', 500, error)
  }
}

