import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createErrorResponse, unauthorizedResponse } from '@/lib/auth/api-auth'
import { validateString } from '@/lib/auth/validate-input'
import { verifyRazorpaySignature, getRazorpayPayment } from '@/lib/payments/razorpay'
import { hasVariants } from '@/lib/products'

export const runtime = 'nodejs'

/**
 * POST /api/payments/verify
 * 
 * Verify payment and create order ONLY after successful payment.
 * 
 * Flow:
 * 1. Verify Razorpay signature (HMAC SHA256)
 * 2. Verify payment status with Razorpay API
 * 3. Validate payment amount
 * 4. Create Order in database (ONLY after payment verified)
 * 5. Create OrderItems
 * 6. Validate stock availability
 * 7. Reduce stock (safely)
 * 8. Mark order as ORDER_CONFIRMED
 * 9. Clear cart items
 * 
 * IMPORTANT: Order is created ONLY after payment is verified.
 * This prevents ghost orders if payment fails.
 * 
 * SECURITY: Signature verification is mandatory. Never trust frontend alone.
 */
export async function POST(_req: NextRequest) {
  try {
    const supabase = createSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return unauthorizedResponse()
    }

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

    const {
      razorpay_order_id: rawRazorpayOrderId,
      razorpay_payment_id: rawRazorpayPaymentId,
      razorpay_signature: rawRazorpaySignature,
      orderData: rawOrderData,
    } = body as Record<string, unknown>

    const razorpayOrderId = validateString(rawRazorpayOrderId, {
      minLength: 1,
      maxLength: 100,
      required: true,
      trim: true,
    })
    const razorpayPaymentId = validateString(rawRazorpayPaymentId, {
      minLength: 1,
      maxLength: 100,
      required: true,
      trim: true,
    })
    const razorpaySignature = validateString(rawRazorpaySignature, {
      minLength: 1,
      maxLength: 200,
      required: true,
      trim: true,
    })

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return createErrorResponse('Invalid payment data', 400)
    }

    // Validate orderData
    if (!rawOrderData || typeof rawOrderData !== 'object') {
      return createErrorResponse('Order data is required', 400)
    }

    const orderData = rawOrderData as {
      selectedCartItemIds: string[]
      orderItemsData: Array<{
        productId: string
        productName: string
        unitPrice: number
        discountPercent: number | null
        finalPrice: number
        quantity: number
        sizeGrams?: number | null
      }>
      totalAmount: number
      addressLine1: string
      addressLine2: string | null
      city: string
      state: string
      postalCode: string
      country: string
    }

    if (!orderData.orderItemsData || orderData.orderItemsData.length === 0) {
      return createErrorResponse('Order items are required', 400)
    }

    // Step 1: Verify Razorpay signature FIRST (before creating order)
    const isValidSignature = verifyRazorpaySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    )

    if (!isValidSignature) {
      return createErrorResponse('Invalid payment signature', 400)
    }

    // Step 2: Verify payment with Razorpay API
    const razorpayPayment = await getRazorpayPayment(razorpayPaymentId)
    if (!razorpayPayment) {
      console.error('[API Payments Verify] Razorpay payment not found:', razorpayPaymentId)
      return createErrorResponse('Payment not found in Razorpay', 400)
    }

    if (razorpayPayment.status !== 'captured') {
      console.error('[API Payments Verify] Payment not captured. Status:', razorpayPayment.status)
      return createErrorResponse(`Payment not captured. Status: ${razorpayPayment.status}`, 400)
    }

    // Step 3: Verify payment amount matches expected amount
    if (razorpayPayment.amount !== orderData.totalAmount) {
      console.error('[API Payments Verify] Amount mismatch:', {
        razorpayAmount: razorpayPayment.amount,
        expectedAmount: orderData.totalAmount,
      })
      return createErrorResponse('Payment amount mismatch', 400)
    }

    // Step 4: Validate stock availability BEFORE creating order
    for (const orderItem of orderData.orderItemsData) {
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
      const orderItemWithSize = orderItem as typeof orderItem & { sizeGrams?: number | null }
      if (usesVariants && orderItemWithSize.sizeGrams) {
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

    // Step 5: Create Order in database (ONLY after payment verified)
    const { data: newOrder, error: orderError } = await supabase
      .from('Order')
      .insert({
        userId: user.id,
        status: 'ORDER_CONFIRMED', // Directly to ORDER_CONFIRMED since payment is verified
        totalAmount: orderData.totalAmount,
        currency: 'INR',
        addressLine1: orderData.addressLine1,
        addressLine2: orderData.addressLine2 ?? undefined,
        city: orderData.city,
        state: orderData.state,
        postalCode: orderData.postalCode,
        country: orderData.country,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        paidAt: new Date().toISOString(),
      })
      .select()
      .single()

    if (orderError || !newOrder) {
      console.error('[API Payments Verify] Failed to create order:', orderError)
      return createErrorResponse('Failed to create order', 500)
    }

    const orderId = newOrder.id

    // Step 6: Create order items (with sizeGrams snapshot for malt products)
    const orderItemsInsert = orderData.orderItemsData.map((item) => ({
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
      console.error('[API Payments Verify] Failed to create order items:', orderItemsError)
      // Order was created but items failed - this is a problem
      // In production, you might want to delete the order or handle this differently
      return createErrorResponse('Failed to create order items', 500)
    }

    // Step 7: Reduce stock for each item (safely)
    for (const orderItem of orderData.orderItemsData) {
      // Check if this is a variant-based product
      const { data: product } = await supabase
        .from('Product')
        .select('category, stock')
        .eq('id', orderItem.productId)
        .single()

      if (!product) {
        console.error('[API Payments Verify] Product not found during stock update:', orderItem.productId)
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
          console.error('[API Payments Verify] Variant not found during stock update:', {
            productId: orderItem.productId,
            sizeGrams: orderItem.sizeGrams,
          })
          continue
        }

        const newStock = variant.stock - orderItem.quantity
        if (newStock < 0) {
          console.error('[API Payments Verify] Variant stock went negative:', {
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
          console.error('[API Payments Verify] Failed to update variant stock:', updateStockError)
        }
      } else {
        // Reduce stock from Product for non-variant products
        const { error: stockError } = await supabase.rpc('decrement_stock', {
          product_id: orderItem.productId,
          quantity: orderItem.quantity,
        })

        // If RPC doesn't exist, use update with decrement
        if (stockError) {
          const newStock = product.stock - orderItem.quantity
          if (newStock < 0) {
            console.error('[API Payments Verify] Stock went negative:', {
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
            console.error('[API Payments Verify] Failed to update product stock:', updateStockError)
          }
        }
      }
    }

    // Step 8: Remove purchased items from cart
    const { data: userCart } = await supabase
      .from('Cart')
      .select('id')
      .eq('userId', user.id)
      .limit(1)

    if (userCart && userCart.length > 0) {
      const firstCart = userCart[0]
      if (firstCart) {
        const productIds = orderData.orderItemsData.map((item) => item.productId)
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
      message: 'Payment verified successfully. Order confirmed.',
    })
  } catch (error) {
    console.error('[API Payments Verify] Error:', error)
    return createErrorResponse('Failed to verify payment', 500, error)
  }
}
