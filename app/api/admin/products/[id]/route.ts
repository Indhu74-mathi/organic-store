import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createErrorResponse, forbiddenResponse, requireAdmin } from '@/lib/auth/api-auth'
import { validateString, validateNumber } from '@/lib/auth/validate-input'
import { hasVariants } from '@/lib/products'

/**
 * PATCH /api/admin/products/[id]
 * 
 * Update a product (admin only).
 * Supports updating: name, description, price, discountPercent, stock, isActive, category, imageUrl
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return forbiddenResponse()
    }

    const productId = validateString(params.id, {
      minLength: 1,
      maxLength: 100,
      required: true,
      trim: true,
    })

    if (!productId) {
      return createErrorResponse('Invalid product ID', 400)
    }

    // Parse request body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return createErrorResponse('Invalid JSON in request body', 400)
    }

    if (typeof body !== 'object' || body === null) {
      return createErrorResponse('Invalid request body', 400)
    }

    const updateData: Record<string, unknown> = {}

    // Validate and add optional fields
    if ('name' in body) {
      const name = validateString(body.name, {
        minLength: 1,
        maxLength: 200,
        required: true,
        trim: true,
      })
      if (!name) {
        return createErrorResponse('Invalid product name', 400)
      }
      updateData.name = name
    }

    if ('description' in body) {
      const description = validateString(body.description, {
        minLength: 1,
        maxLength: 5000,
        required: true,
        trim: true,
      })
      if (!description) {
        return createErrorResponse('Invalid product description', 400)
      }
      updateData.description = description
    }

    if ('price' in body) {
      // Check if product is Malt - if so, price updates must go to ProductVariant, not Product
      const { data: existingProduct } = await supabase
        .from('Product')
        .select('category')
        .eq('id', productId)
        .single()

      if (existingProduct && hasVariants(existingProduct.category)) {
        // For variant-based products (Malt, saadha podi), Product.price should NOT be editable
        // Variant prices must be updated via ProductVariant table
        return createErrorResponse(
          'Price updates for variant-based products must be done via variant prices. Product.price is not editable for these products.',
          400
        )
      }

      const price = validateNumber(body.price, {
        min: 0,
        required: true,
      })
      if (price === null) {
        return createErrorResponse('Invalid price', 400)
      }
      // Convert rupees to paise (smallest currency unit)
      updateData.price = Math.round(price * 100)
    }

    if ('discountPercent' in body) {
      if (body.discountPercent === null || body.discountPercent === undefined) {
        updateData.discountPercent = null
      } else {
        const discountPercent = validateNumber(body.discountPercent, {
          min: 0,
          max: 100,
          required: true,
          integer: true,
        })
        if (discountPercent === null) {
          return createErrorResponse('Invalid discount percent (must be 0-100)', 400)
        }
        updateData.discountPercent = discountPercent
      }
    }

    if ('stock' in body) {
      // Check if product is Malt - if so, stock updates must go to ProductVariant, not Product
      const { data: existingProduct } = await supabase
        .from('Product')
        .select('category')
        .eq('id', productId)
        .single()

      if (existingProduct && hasVariants(existingProduct.category)) {
        // For variant-based products (Malt, saadha podi), Product.stock should NOT be editable
        // Variant stock must be updated via ProductVariant table
        return createErrorResponse(
          'Stock updates for variant-based products must be done via variant stock. Product.stock is not editable for these products.',
          400
        )
      }

      const stock = validateNumber(body.stock, {
        min: 0,
        required: true,
        integer: true,
      })
      if (stock === null) {
        return createErrorResponse('Invalid stock quantity', 400)
      }
      updateData.stock = stock
    }

    if ('isActive' in body) {
      if (typeof body.isActive !== 'boolean') {
        return createErrorResponse('isActive must be a boolean', 400)
      }
      updateData.isActive = body.isActive
    }

    if ('category' in body) {
      const category = validateString(body.category, {
        minLength: 1,
        maxLength: 100,
        required: true,
        trim: true,
      })
      if (!category) {
        return createErrorResponse('Invalid category', 400)
      }
      updateData.category = category
    }

    if ('imageUrl' in body) {
      const imageUrl = validateString(body.imageUrl, {
        minLength: 1,
        maxLength: 500,
        required: true,
        trim: true,
      })
      if (!imageUrl) {
        return createErrorResponse('Invalid image URL', 400)
      }
      updateData.imageUrl = imageUrl
    }

    if (Object.keys(updateData).length === 0) {
      return createErrorResponse('No valid fields to update', 400)
    }

    // Update product
    const { data: updatedProduct, error } = await supabase
      .from('Product')
      .update(updateData)
      .eq('id', productId)
      .select()
      .single()

    if (error) {
      console.error('[API Admin Product Update] Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to update product' },
        { status: 500 }
      )
    }

    if (!updatedProduct) {
      return createErrorResponse('Product not found', 404)
    }

    return NextResponse.json({
      product: {
        id: updatedProduct.id,
        name: updatedProduct.name,
        slug: updatedProduct.slug,
        description: updatedProduct.description,
        price: updatedProduct.price / 100,
        discountPercent: updatedProduct.discountPercent,
        imageUrl: updatedProduct.imageUrl,
        category: updatedProduct.category,
        stock: updatedProduct.stock,
        isActive: updatedProduct.isActive,
        createdAt: updatedProduct.createdAt,
        updatedAt: updatedProduct.updatedAt,
      },
    })
  } catch (error) {
    console.error('[API Admin Product Update] Error:', error)
    return createErrorResponse('Failed to update product', 500, error)
  }
}

/**
 * DELETE /api/admin/products/[id]
 * 
 * Delete a product (admin only).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return forbiddenResponse()
    }

    const productId = validateString(params.id, {
      minLength: 1,
      maxLength: 100,
      required: true,
      trim: true,
    })

    if (!productId) {
      return createErrorResponse('Invalid product ID', 400)
    }

    // Check if product exists
    const { data: existingProduct, error: checkError } = await supabase
      .from('Product')
      .select('id')
      .eq('id', productId)
      .single()

    if (checkError || !existingProduct) {
      return createErrorResponse('Product not found', 404)
    }

    // Delete product
    const { error } = await supabase
      .from('Product')
      .delete()
      .eq('id', productId)

    if (error) {
      console.error('[API Admin Product Delete] Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to delete product' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API Admin Product Delete] Error:', error)
    return createErrorResponse('Failed to delete product', 500, error)
  }
}
