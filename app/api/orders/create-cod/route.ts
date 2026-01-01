import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createErrorResponse, unauthorizedResponse } from '@/lib/auth/api-auth'
import { validateArray, validateString, validateCartItemId } from '@/lib/auth/validate-input'
import { calculateDiscountedPrice } from '@/lib/pricing'
import { hasVariants } from '@/lib/products'

export const runtime = 'nodejs'

/**
 * POST /api/orders/create-cod
 * 
 * Create a Cash on Delivery (COD) order directly.
 * 
 * This endpoint:
 * 1. Validates cart items
 * 2. Calculates final payable amount (applies discounts)
 * 3. Validates stock availability
 * 4. Creates Order in database with status 'ORDER_CONFIRMED'
 * 5. Sets payment fields to NULL (paidAt, razorpayPaymentId, razorpayOrderId, razorpaySignature)
 * 6. Creates OrderItems
 * 7. Reduces stock (same as prepaid orders)
 * 8. Clears cart items
 * 
 * IMPORTANT: COD orders are created immediately without payment verification.
 * Stock is reserved immediately upon order creation.
 * 
 * SECURITY: Only authenticated users can create COD orders.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return unauthorizedResponse()
    }

    // Parse and validate request body
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
      selectedCartItemIds: rawSelectedCartItemIds,
      addressLine1: rawAddressLine1,
      addressLine2: rawAddressLine2,
      city: rawCity,
      state: rawState,
      postalCode: rawPostalCode,
      country: rawCountry,
    } = body as Record<string, unknown>

    // Validate selectedCartItemIds
    const selectedCartItemIds = validateArray(rawSelectedCartItemIds, {
      maxLength: 50,
      required: true,
    })

    if (!selectedCartItemIds || selectedCartItemIds.length === 0) {
      return createErrorResponse('No items selected for checkout', 400)
    }

    // Validate each cart item ID
    for (const rawId of selectedCartItemIds) {
      const cartItemId = validateCartItemId(rawId)
      if (!cartItemId) {
        return createErrorResponse('Invalid cart item ID', 400)
      }
    }

    // Validate address
    const addressLine1 = validateString(rawAddressLine1, {
      minLength: 1,
      maxLength: 200,
      required: true,
      trim: true,
    })
    const city = validateString(rawCity, {
      minLength: 1,
      maxLength: 100,
      required: true,
      trim: true,
    })
    const state = validateString(rawState, {
      minLength: 1,
      maxLength: 100,
      required: true,
      trim: true,
    })
    const postalCode = validateString(rawPostalCode, {
      minLength: 1,
      maxLength: 20,
      required: true,
      trim: true,
    })
    const country = validateString(rawCountry, {
      minLength: 1,
      maxLength: 100,
      required: false,
      trim: true,
    }) || 'IN'
    const addressLine2 = rawAddressLine2
      ? validateString(rawAddressLine2, {
          minLength: 1,
          maxLength: 200,
          required: false,
          trim: true,
        })
      : null

    if (!addressLine1 || !city || !state || !postalCode) {
      return createErrorResponse('Invalid address', 400)
    }

    // Find user's cart
    const { data: carts, error: cartError } = await supabase
      .from('Cart')
      .select('id')
      .eq('userId', user.id)
      .limit(1)

    if (cartError || !carts || carts.length === 0) {
      return createErrorResponse('Cart not found', 404)
    }

    const firstCart = carts[0]
    if (!firstCart) {
      return createErrorResponse('Cart not found', 404)
    }
    const cartId = firstCart.id

    // Fetch selected cart items
    const { data: cartItems, error: itemsError } = await supabase
      .from('CartItem')
      .select('id, productId, variantId, quantity')
      .eq('cartId', cartId)
      .in('id', selectedCartItemIds)

    if (itemsError || !cartItems || cartItems.length === 0) {
      return createErrorResponse('Selected cart items not found', 404)
    }

    // Fetch products for selected items
    const productIds = cartItems.map((item) => item.productId)
    const { data: products, error: productsError } = await supabase
      .from('Product')
      .select('id, name, price, discountPercent, category, stock, isActive')
      .in('id', productIds)

    if (productsError || !products) {
      return createErrorResponse('Failed to fetch products', 500)
    }

    // Fetch variants for malt products
    const variantIds = cartItems
      .map((item: any) => item.variantId)
      .filter((id: string | null): id is string => id !== null && id !== undefined)
    
    let variants: any[] = []
    if (variantIds.length > 0) {
      const { data: variantsData } = await supabase
        .from('ProductVariant')
        .select('id, productId, sizeGrams, price, stock')
        .in('id', variantIds)
      
      variants = variantsData || []
    }

    // Validate stock and calculate totals
    let totalAmount = 0
    const orderItemsData: Array<{
      productId: string
      productName: string
      unitPrice: number
      discountPercent: number | null
      finalPrice: number
      quantity: number
      sizeGrams?: number | null
    }> = []

    for (const cartItem of cartItems) {
      const product = products.find((p) => p.id === cartItem.productId)
      if (!product) {
        return createErrorResponse(`Product not found: ${cartItem.productId}`, 404)
      }

      if (!product.isActive) {
        return createErrorResponse(`Product ${product.name} is no longer available`, 400)
      }

      const usesVariants = hasVariants(product.category)
      let variant: any = null
      let unitPriceInPaise: number
      let availableStock: number
      let sizeGrams: number | null = null

      if (usesVariants && cartItem.variantId) {
        variant = variants.find((v) => v.id === cartItem.variantId)
        if (!variant) {
          return createErrorResponse(`Variant not found for ${product.name}`, 404)
        }
        unitPriceInPaise = variant.price
        availableStock = variant.stock
        sizeGrams = variant.sizeGrams
      } else {
        unitPriceInPaise = product.price
        availableStock = product.stock
      }

      if (availableStock < cartItem.quantity) {
        const sizeText = sizeGrams ? ` (${sizeGrams}g)` : ''
        return createErrorResponse(
          `Insufficient stock for ${product.name}${sizeText}. Available: ${availableStock}, Requested: ${cartItem.quantity}`,
          400
        )
      }

      // Calculate discounted price
      const discountedPriceInPaise = calculateDiscountedPrice(
        unitPriceInPaise,
        product.discountPercent
      )
      const finalPriceInPaise = discountedPriceInPaise * cartItem.quantity

      const productName = sizeGrams ? `${product.name} – ${sizeGrams}g` : product.name

      orderItemsData.push({
        productId: product.id,
        productName: productName,
        unitPrice: unitPriceInPaise,
        discountPercent: product.discountPercent,
        finalPrice: finalPriceInPaise,
        quantity: cartItem.quantity,
        ...(sizeGrams && { sizeGrams }),
      })

      totalAmount += finalPriceInPaise
    }

    if (totalAmount <= 0) {
      return createErrorResponse('Invalid order amount', 400)
    }

    // Step 1: Validate stock availability BEFORE creating order
    for (const orderItem of orderItemsData) {
      const { data: product } = await supabase
        .from('Product')
        .select('stock, isActive, category')
        .eq('id', orderItem.productId)
        .single()

      if (!product) {
        return createErrorResponse(`Product not found: ${orderItem.productName}`, 404)
      }

      if (!product.isActive) {
        return createErrorResponse(`Product ${orderItem.productName} is no longer available`, 400)
      }

      const usesVariants = hasVariants(product.category)
      
      // For variant-based products with sizeGrams, check variant stock
      if (usesVariants && orderItem.sizeGrams) {
        const { data: variant } = await supabase
          .from('ProductVariant')
          .select('stock')
          .eq('productId', orderItem.productId)
          .eq('sizeGrams', orderItem.sizeGrams)
          .single()

        if (!variant) {
          return createErrorResponse(`Variant not found for ${orderItem.productName}`, 404)
        }

        if (variant.stock < orderItem.quantity) {
          return createErrorResponse(
            `Insufficient stock for ${orderItem.productName}. Available: ${variant.stock}, Required: ${orderItem.quantity}`,
            400
          )
        }
      } else {
        // For non-malt products, check product stock
        if (product.stock < orderItem.quantity) {
          return createErrorResponse(
            `Insufficient stock for ${orderItem.productName}. Available: ${product.stock}, Required: ${orderItem.quantity}`,
            400
          )
        }
      }
    }

    // Step 2: Create Order in database (COD - no payment verification needed)
    const { data: newOrder, error: orderError } = await supabase
      .from('Order')
      .insert({
        userId: user.id,
        status: 'ORDER_CONFIRMED', // Directly to ORDER_CONFIRMED for COD
        totalAmount: totalAmount,
        currency: 'INR',
        addressLine1: addressLine1,
        addressLine2: addressLine2 ?? undefined,
        city: city,
        state: state,
        postalCode: postalCode,
        country: country,
        // COD orders: payment fields are NULL
        razorpayOrderId: null,
        razorpayPaymentId: null,
        razorpaySignature: null,
        paidAt: null,
      })
      .select('id')
      .single()

    if (orderError || !newOrder) {
      console.error('[API Orders Create COD] Failed to create order:', orderError)
      return createErrorResponse('Failed to create order', 500)
    }

    const orderId = newOrder.id

    // Step 3: Create order items (with sizeGrams snapshot for malt products)
    const orderItemsInsert = orderItemsData.map((item) => ({
      orderId,
      productId: item.productId,
      productName: item.productName,
      unitPrice: item.unitPrice,
      discountPercent: item.discountPercent,
      finalPrice: item.finalPrice,
      quantity: item.quantity,
      ...(item.sizeGrams && { sizeGrams: item.sizeGrams }),
    }))

    const { error: orderItemsError } = await supabase
      .from('OrderItem')
      .insert(orderItemsInsert)

    if (orderItemsError) {
      console.error('[API Orders Create COD] Failed to create order items:', orderItemsError)
      return createErrorResponse('Failed to create order items', 500)
    }

    // Step 4: Reduce stock for each item (same logic as prepaid orders)
    for (const orderItem of orderItemsData) {
      // Check if this is a malt product with variant
      const { data: product } = await supabase
        .from('Product')
        .select('category, stock')
        .eq('id', orderItem.productId)
        .single()

      if (!product) {
        console.error('[API Orders Create COD] Product not found during stock update:', orderItem.productId)
        continue
      }

      const usesVariants = hasVariants(product.category)
      
      if (usesVariants && orderItem.sizeGrams) {
        // Reduce stock from ProductVariant for variant-based products
        const { data: variant, error: fetchVariantError } = await supabase
          .from('ProductVariant')
          .select('stock')
          .eq('productId', orderItem.productId)
          .eq('sizeGrams', orderItem.sizeGrams)
          .single()

        if (fetchVariantError || !variant) {
          console.error('[API Orders Create COD] Variant not found during stock update:', {
            productId: orderItem.productId,
            sizeGrams: orderItem.sizeGrams,
          })
          continue
        }

        const newStock = variant.stock - orderItem.quantity
        if (newStock < 0) {
          console.error('[API Orders Create COD] Variant stock went negative:', {
            productId: orderItem.productId,
            sizeGrams: orderItem.sizeGrams,
            currentStock: variant.stock,
            requested: orderItem.quantity,
          })
          continue
        }

        const { error: updateStockError } = await supabase
          .from('ProductVariant')
          .update({ stock: newStock })
          .eq('productId', orderItem.productId)
          .eq('sizeGrams', orderItem.sizeGrams)

        if (updateStockError) {
          console.error('[API Orders Create COD] Failed to update variant stock:', updateStockError)
        }
      } else {
        // Reduce stock from Product for non-malt products
        const { error: stockError } = await supabase.rpc('decrement_stock', {
          product_id: orderItem.productId,
          quantity: orderItem.quantity,
        })

        // If RPC doesn't exist, use update with decrement
        if (stockError) {
          const newStock = product.stock - orderItem.quantity
          if (newStock < 0) {
            console.error('[API Orders Create COD] Stock went negative:', {
              productId: orderItem.productId,
              currentStock: product.stock,
              requested: orderItem.quantity,
            })
            continue
          }

          const { error: updateStockError } = await supabase
            .from('Product')
            .update({ stock: newStock })
            .eq('id', orderItem.productId)

          if (updateStockError) {
            console.error('[API Orders Create COD] Failed to update product stock:', updateStockError)
          }
        }
      }
    }

    // Step 5: Remove purchased items from cart
    const { data: userCart } = await supabase
      .from('Cart')
      .select('id')
      .eq('userId', user.id)
      .limit(1)

    if (userCart && userCart.length > 0) {
      const firstCart = userCart[0]
      if (firstCart) {
        const productIds = orderItemsData.map((item) => item.productId)
        await supabase
          .from('CartItem')
          .delete()
          .eq('cartId', firstCart.id)
          .in('productId', productIds)
      }
    }

    return NextResponse.json({
      success: true,
      orderId: newOrder.id,
      status: 'ORDER_CONFIRMED',
      message: 'COD order created successfully.',
    })
  } catch (error) {
    console.error('[API Orders Create COD] Error:', error)
    return createErrorResponse('Failed to create COD order', 500, error)
  }
}

