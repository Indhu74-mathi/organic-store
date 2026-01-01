import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createErrorResponse, unauthorizedResponse } from '@/lib/auth/api-auth'
import { validateArray, validateString, validateCartItemId } from '@/lib/auth/validate-input'
import { createRazorpayOrder } from '@/lib/payments/razorpay'
import { calculateDiscountedPrice } from '@/lib/pricing'
import { hasVariants } from '@/lib/products'

export const runtime = 'nodejs'

/**
 * POST /api/payments/create-order
 * 
 * Create a Razorpay order from cart items (NO database order created yet).
 * 
 * This endpoint:
 * 1. Validates cart items
 * 2. Calculates final payable amount (applies discounts)
 * 3. Validates stock availability
 * 4. Creates Razorpay Order ONLY
 * 5. Returns Razorpay order details + order data for verification
 * 
 * IMPORTANT: Database order is created ONLY after successful payment verification.
 * This prevents ghost orders if payment gateway fails.
 * 
 * SECURITY: Only authenticated users can create payment orders.
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
      .select('*')
      .eq('cartId', cartId)
      .in('id', selectedCartItemIds)

    if (itemsError || !cartItems || cartItems.length === 0) {
      return createErrorResponse('Selected cart items not found', 404)
    }

    // Fetch products for selected items
    const productIds = cartItems.map((item) => item.productId)
    const { data: products, error: productsError } = await supabase
      .from('Product')
      .select('*')
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
        .select('*')
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

      // Use the same calculation logic as cart
      // unitPriceInPaise is already in paise from database
      // Apply discount using the same logic as cart
      const discountedPriceInPaise = calculateDiscountedPrice(
        unitPriceInPaise,
        product.discountPercent
      )
      // Calculate final price for the quantity (in paise)
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

    // Create Razorpay order ONLY (no database order yet)
    // Order will be created only after successful payment verification
    let razorpayOrderId: string | null = null
    let razorpayAmount: number | null = null
    let razorpayCurrency: string | null = null

    try {
      // Use a temporary reference ID for Razorpay order
      // We'll store the actual order data in the verify endpoint
      const tempReferenceId = `temp_${Date.now()}_${user.id.substring(0, 8)}`
      const razorpayOrder = await createRazorpayOrder(
        totalAmount,
        'INR',
        tempReferenceId
      )
      razorpayOrderId = razorpayOrder.id
      razorpayAmount = razorpayOrder.amount
      razorpayCurrency = razorpayOrder.currency
    } catch (razorpayError) {
      console.error('[RAZORPAY] Failed to create Razorpay order:', razorpayError)
      
      // Check if it's a missing environment variable error
      const errorMessage = razorpayError instanceof Error ? razorpayError.message : String(razorpayError)
      if (errorMessage.includes('RAZORPAY_KEY_ID') || errorMessage.includes('RAZORPAY_KEY_SECRET')) {
        console.error('[RAZORPAY] Missing environment variables. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local')
        return createErrorResponse(
          'Payment gateway configuration error. Please contact support.',
          500
        )
      }
      
      return createErrorResponse(
        'Failed to initialize payment gateway. Please try again later.',
        500
      )
    }

    // Return Razorpay order details + order data for verification endpoint
    // NO database order created yet - will be created only after payment success
    return NextResponse.json({
      success: true,
      razorpayOrderId,
      amount: razorpayAmount,
      currency: razorpayCurrency,
      // Include order data for verification endpoint
      orderData: {
        selectedCartItemIds,
        orderItemsData,
        totalAmount,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country,
      },
    })
  } catch (error) {
    console.error('[API Payments Create Order] Error:', error)
    return createErrorResponse('Failed to create payment order', 500, error)
  }
}
