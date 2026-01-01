import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createErrorResponse } from '@/lib/auth/api-auth'
import { validateString, validateNumber } from '@/lib/auth/validate-input'
import { hasVariants } from '@/lib/products'

export const runtime = "nodejs"

export async function POST(_req: NextRequest) {
  const supabaseAuth = createSupabaseServer()

  const { data: { user } } = await supabaseAuth.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Parse and validate request body
    let body: unknown
    try {
      body = await _req.json()
    } catch {
      return createErrorResponse('Invalid JSON in request body', 400)
    }

    if (typeof body !== 'object' || body === null) {
      return createErrorResponse('Invalid request body', 400)
    }

    const { productId: rawProductId, quantity: rawQuantity, variantId: rawVariantId } = body as Record<
      string,
      unknown
    >

    // Validate productId
    const productId = validateString(rawProductId, {
      minLength: 1,
      maxLength: 100,
      required: true,
      trim: true,
    })

    if (!productId) {
      return createErrorResponse('Product ID is required', 400)
    }

    // Validate quantity
    const quantity = validateNumber(rawQuantity, {
      min: 1,
      max: 99,
      required: false,
      integer: true,
    }) || 1

    // Verify product exists with explicit columns
    const { data: products, error: productError } = await supabase
      .from('Product')
      .select('id, name, slug, description, price, discountPercent, imageUrl, category, stock, isActive, ProductVariant(id, sizeGrams, price, stock)')
      .eq('id', productId)
      .eq('isActive', true)
      .single()

    if (productError || !products) {
      return createErrorResponse('Product not found or unavailable', 400)
    }

    const usesVariants = hasVariants(products.category)
    let variant: any = null
    let variantId: string | null = null

    // For variant-based products, variantId is required
    if (usesVariants) {
      variantId = validateString(rawVariantId, {
        minLength: 1,
        maxLength: 100,
        required: true,
        trim: true,
      })

      if (!variantId) {
        return createErrorResponse('Size selection is required for this product', 400)
      }

      // Verify variant exists and has stock (use variant from joined query if available)
      const variants = products.ProductVariant || []
      variant = variants.find((v: any) => v.id === variantId)
      
      if (!variant || variant.stock <= 0) {
        return createErrorResponse('Selected size is out of stock', 400)
      }
    }

    // Find or create cart
    const { data: carts, error: cartError } = await supabase
      .from('Cart')
      .select('id')
      .eq('userId', user.id)
      .limit(1)

    if (cartError) {
      console.error('[API Cart Items] Cart error:', cartError)
      return createErrorResponse('Failed to access cart', 500)
    }

    let cartId: string

    if (!carts || carts.length === 0) {
      // Create new cart
      cartId = `cart_${user.id}_${Date.now()}`
      const { error: createError } = await supabase
        .from('Cart')
        .insert({
          id: cartId,
          userId: user.id,
        })

      if (createError) {
        console.error('[API Cart Items] Failed to create cart:', createError)
        return createErrorResponse('Failed to create cart', 500)
      }
    } else {
      const firstCart = carts[0]
      if (!firstCart) {
        return createErrorResponse('Failed to access cart', 500)
      }
      cartId = firstCart.id
    }

    // Determine stock and price based on product type
    let availableStock: number
    let unitPrice: number
    let sizeGrams: number | null = null

    if (usesVariants) {
      // Use variant stock and price
      availableStock = variant.stock
      unitPrice = variant.price / 100
      sizeGrams = variant.sizeGrams
    } else {
      // Use product stock and price
      availableStock = products.stock
      unitPrice = products.price / 100
    }

    // Check if item already exists in cart (for variant-based products, also check variantId)
    let existingItemsQuery = supabase
      .from('CartItem')
      .select('id, quantity')
      .eq('cartId', cartId)
      .eq('productId', productId)

    if (usesVariants && variantId) {
      existingItemsQuery = existingItemsQuery.eq('variantId', variantId)
    }

    const { data: existingItems, error: existingError } = await existingItemsQuery.single()

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('[API Cart Items] Error checking existing item:', existingError)
      return createErrorResponse('Failed to check cart', 500)
    }

    if (existingItems) {
      // Update quantity
      const requestedQuantity = existingItems.quantity + quantity
      if (requestedQuantity > availableStock) {
        return createErrorResponse(
          `Only ${availableStock} available in stock. You already have ${existingItems.quantity} in your cart.`,
          400
        )
      }

      const newQuantity = Math.min(requestedQuantity, 99, availableStock)
      const { data: updatedItem, error: updateError } = await supabase
        .from('CartItem')
        .update({ quantity: newQuantity })
        .eq('id', existingItems.id)
        .select()
        .single()

      if (updateError || !updatedItem) {
        console.error('[API Cart Items] Update error:', updateError)
        return createErrorResponse('Failed to update cart item', 500)
      }

      return NextResponse.json({
        success: true,
        cartItemId: updatedItem.id,
        product: {
          id: products.id,
          name: products.name,
          slug: products.slug,
          description: products.description,
          price: unitPrice,
          discountPercent: products.discountPercent,
          imageUrl: products.imageUrl,
          category: products.category,
          stock: availableStock,
          ...(usesVariants && { sizeGrams }),
        },
        quantity: updatedItem.quantity,
      })
    } else {
      // Create new cart item
      if (quantity > availableStock) {
        return createErrorResponse(
          `Only ${availableStock} available in stock`,
          400
        )
      }

      const finalQuantity = Math.min(quantity, availableStock)
      const insertData: any = {
        cartId,
        productId,
        quantity: finalQuantity,
      }

      if (usesVariants && variantId) {
        insertData.variantId = variantId
      }

      const { error } = await supabase.from('CartItem').insert(insertData)

      if (error) {
        console.error('[API Cart Items] Create error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        product: {
          id: products.id,
          name: products.name,
          slug: products.slug,
          description: products.description,
          price: unitPrice,
          discountPercent: products.discountPercent,
          imageUrl: products.imageUrl,
          category: products.category,
          stock: availableStock,
          ...(usesVariants && { sizeGrams }),
        },
        quantity: finalQuantity,
      })
    }
  } catch (error) {
    console.error('[API Cart Items] Error:', error)
    return createErrorResponse('Failed to add item to cart', 500, error)
  }
}
