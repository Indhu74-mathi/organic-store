import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, createErrorResponse, forbiddenResponse } from '@/lib/auth/api-auth'
import { validateString, validateNumber } from '@/lib/auth/validate-input'
import { checkRateLimit, getClientIdentifier } from '@/lib/auth/rate-limit'

/**
 * PATCH /api/admin/products/:id
 * 
 * Update a product (admin only).
 * 
 * SECURITY:
 * - Admin-only access
 * - Validate all fields
 * - Never allow negative stock
 * 
 * Request body (all fields optional):
 * {
 *   name?: string,
 *   description?: string,
 *   price?: number (in rupees),
 *   imageUrl?: string,
 *   category?: string,
 *   stock?: number,
 *   isActive?: boolean
 * }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // SECURITY: Rate limit product updates (20 per minute per IP)
    const clientId = getClientIdentifier(req)
    const rateLimit = checkRateLimit(`admin:products:update:${clientId}`, 20, 60 * 1000)
    if (!rateLimit.allowed) {
      return createErrorResponse('Too many requests. Please try again later.', 429)
    }

    // SECURITY: Require admin role
    const admin = requireAdmin(req)
    if (!admin) {
      return forbiddenResponse()
    }

    // SECURITY: Validate product ID
    const productId = validateString(params.id, {
      minLength: 1,
      maxLength: 100,
      required: true,
      trim: true,
    })

    if (!productId) {
      return createErrorResponse('Invalid product ID', 400)
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
      description: rawDescription,
      price: rawPrice,
      imageUrl: rawImageUrl,
      category: rawCategory,
      stock: rawStock,
      discountPercent: rawDiscountPercent,
      isActive: rawIsActive,
    } = body as Record<string, unknown>

    // SECURITY: Build update data object (only include provided fields)
    const updateData: {
      name?: string
      description?: string
      price?: number
      imageUrl?: string
      category?: string
      stock?: number
      discountPercent?: number | null
      isActive?: boolean
    } = {}

    if (rawName !== undefined) {
      const name = validateString(rawName, {
        minLength: 1,
        maxLength: 200,
        required: false,
        trim: true,
      })
      if (name) updateData.name = name
    }

    if (rawDescription !== undefined) {
      const description = validateString(rawDescription, {
        minLength: 0,
        maxLength: 2000,
        required: false,
        trim: true,
      })
      if (description !== null) updateData.description = description
    }

    if (rawImageUrl !== undefined) {
      const imageUrl = validateString(rawImageUrl, {
        minLength: 1,
        maxLength: 500,
        required: false,
        trim: true,
      })
      if (imageUrl) updateData.imageUrl = imageUrl
    }

    if (rawCategory !== undefined) {
      const category = validateString(rawCategory, {
        minLength: 1,
        maxLength: 100,
        required: false,
        trim: true,
      })
      if (category) updateData.category = category
    }

    if (rawPrice !== undefined) {
      const priceInRupees = validateNumber(rawPrice, {
        min: 0.01,
        max: 1000000,
        required: false,
        integer: false,
      })
      if (priceInRupees !== null) {
        // SECURITY: Convert to smallest currency unit (paise)
        updateData.price = Math.round(priceInRupees * 100)
      }
    }

    if (rawStock !== undefined) {
      const stock = validateNumber(rawStock, {
        min: 0, // SECURITY: Never allow negative stock
        max: 1000000,
        required: false,
        integer: true,
      })
      if (stock !== null) {
        updateData.stock = stock
      }
    }

    if (rawDiscountPercent !== undefined) {
      if (rawDiscountPercent === null) {
        updateData.discountPercent = null
      } else {
        const discountPercent = validateNumber(rawDiscountPercent, {
          min: 0,
          max: 100,
          required: false,
          integer: true,
        })
        if (discountPercent !== null) {
          updateData.discountPercent = discountPercent
        }
      }
    }

    if (rawIsActive !== undefined) {
      if (typeof rawIsActive === 'boolean') {
        updateData.isActive = rawIsActive
      }
    }

    // SECURITY: Ensure at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      return createErrorResponse('No fields to update', 400)
    }

    // SECURITY: Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!existingProduct) {
      return createErrorResponse('Product not found', 404)
    }

    // Update product
    const product = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
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
        isActive: product.isActive,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      },
    })
  } catch (error) {
    return createErrorResponse('Failed to update product', 500, error)
  }
}

/**
 * DELETE /api/admin/products/:id
 * 
 * Soft delete a product (admin only).
 * 
 * SECURITY:
 * - Admin-only access
 * - Soft delete ONLY (set isActive = false)
 * - Never hard delete products (preserves order history)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // SECURITY: Rate limit product deletions (5 per minute per IP)
    const clientId = getClientIdentifier(req)
    const rateLimit = checkRateLimit(`admin:products:delete:${clientId}`, 5, 60 * 1000)
    if (!rateLimit.allowed) {
      return createErrorResponse('Too many requests. Please try again later.', 429)
    }

    // SECURITY: Require admin role
    const admin = requireAdmin(req)
    if (!admin) {
      return forbiddenResponse()
    }

    // SECURITY: Validate product ID
    const productId = validateString(params.id, {
      minLength: 1,
      maxLength: 100,
      required: true,
      trim: true,
    })

    if (!productId) {
      return createErrorResponse('Invalid product ID', 400)
    }

    // SECURITY: Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!existingProduct) {
      return createErrorResponse('Product not found', 404)
    }

    // SECURITY: Soft delete ONLY - set isActive = false
    // Never hard delete products (preserves order history)
    const product = await prisma.product.update({
      where: { id: productId },
      data: { isActive: false },
    })

    return NextResponse.json({
      success: true,
      message: 'Product deactivated successfully',
      product: {
        id: product.id,
        name: product.name,
        isActive: product.isActive,
      },
    })
  } catch (error) {
    return createErrorResponse('Failed to delete product', 500, error)
  }
}

