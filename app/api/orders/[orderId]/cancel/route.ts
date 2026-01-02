import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSupabaseUser } from '@/lib/auth/supabase-auth'
import { createErrorResponse, unauthorizedResponse } from '@/lib/auth/api-auth'
import { validateString } from '@/lib/auth/validate-input'
import { hasVariants } from '@/lib/products'

/**
 * POST /api/orders/[orderId]/cancel
 * 
 * Cancel an order.
 * 
 * Supports both Supabase Auth (via cookies) and Bearer token (for compatibility)
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // Get authenticated user from Supabase Auth cookies
    const user = await getSupabaseUser()

    if (!user) {
      return unauthorizedResponse()
    }

    const orderId = validateString(params.orderId, {
      minLength: 1,
      maxLength: 100,
      required: true,
      trim: true,
    })

    if (!orderId) {
      return createErrorResponse('Invalid order ID', 400)
    }

    // Fetch order
    const { data: orders, error: orderError } = await supabase
      .from('Order')
      .select('*')
      .eq('id', orderId)
      .eq('userId', user.id)
      .limit(1)

    if (orderError || !orders || orders.length === 0) {
      return createErrorResponse('Order not found', 404)
    }

    const order = orders[0]

    // Only allow cancellation of pending/failed/confirmed orders (not shipped or later)
    const cancellableStatuses = ['PAYMENT_PENDING', 'PAYMENT_FAILED', 'ORDER_CONFIRMED']
    if (!cancellableStatuses.includes(order.status)) {
      return createErrorResponse(
        `Order cannot be cancelled. Cancellation is only available before shipping. Current status: ${order.status}`,
        400
      )
    }

    // Fetch order items to restore stock
    const { data: orderItems, error: itemsError } = await supabase
      .from('OrderItem')
      .select('*')
      .eq('orderId', orderId)

    if (itemsError) {
      console.error('[API Order Cancel] Failed to fetch order items:', itemsError)
      return createErrorResponse('Failed to fetch order items', 500)
    }

    // Restore stock for each item (works for both COD and prepaid orders)
    if (orderItems && orderItems.length > 0) {
      for (const orderItem of orderItems) {
        try {
          // Get product to check if it uses variants
          const { data: product, error: productError } = await supabase
            .from('Product')
            .select('category, stock')
            .eq('id', orderItem.productId)
            .single()

          if (productError || !product) {
            console.error('[API Order Cancel] Product not found:', orderItem.productId)
            continue
          }

          const usesVariants = hasVariants(product.category)
          const orderItemWithSize = orderItem as typeof orderItem & { sizeGrams?: number | null; variantId?: string | null }

          if (usesVariants && (orderItemWithSize.variantId || orderItemWithSize.sizeGrams)) {
            // Variant-based product: restore ProductVariant stock
            let variantQuery = supabase
              .from('ProductVariant')
              .select('stock, id')
              .eq('productId', orderItem.productId)

            // Use variantId if available, otherwise use sizeGrams
            if (orderItemWithSize.variantId) {
              variantQuery = variantQuery.eq('id', orderItemWithSize.variantId)
            } else if (orderItemWithSize.sizeGrams) {
              variantQuery = variantQuery.eq('sizeGrams', orderItemWithSize.sizeGrams)
            } else {
              console.error('[API Order Cancel] No variantId or sizeGrams for variant product:', orderItem.productId)
              continue
            }

            const { data: variant, error: fetchVariantError } = await variantQuery.single()

            if (fetchVariantError || !variant) {
              console.error('[API Order Cancel] Variant not found:', {
                productId: orderItem.productId,
                variantId: orderItemWithSize.variantId,
                sizeGrams: orderItemWithSize.sizeGrams,
              })
              continue
            }

            const newStock = variant.stock + orderItem.quantity
            const { error: updateStockError } = await supabase
              .from('ProductVariant')
              .update({ stock: newStock })
              .eq('id', variant.id)

            if (updateStockError) {
              console.error('[API Order Cancel] Failed to restore variant stock:', updateStockError)
            }
          } else {
            // Non-variant product: restore Product stock
            const { data: currentProduct, error: fetchProductError } = await supabase
              .from('Product')
              .select('stock')
              .eq('id', orderItem.productId)
              .single()

            if (fetchProductError || !currentProduct) {
              console.error('[API Order Cancel] Failed to fetch product for stock restore:', orderItem.productId)
              continue
            }

            const newStock = currentProduct.stock + orderItem.quantity
            const { error: updateStockError } = await supabase
              .from('Product')
              .update({ stock: newStock })
              .eq('id', orderItem.productId)

            if (updateStockError) {
              console.error('[API Order Cancel] Failed to restore product stock:', updateStockError)
            }
          }
        } catch (error) {
          console.error('[API Order Cancel] Error restoring stock for item:', orderItem.id, error)
          // Continue with other items even if one fails
        }
      }
    }

    // Update order status to CANCELLED
    const { error: updateError } = await supabase
      .from('Order')
      .update({ status: 'CANCELLED' })
      .eq('id', orderId)

    if (updateError) {
      console.error('[API Order Cancel] Update error:', updateError)
      return createErrorResponse('Failed to cancel order', 500)
    }

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully',
    })
  } catch (error) {
    console.error('[API Order Cancel] Error:', error)
    return createErrorResponse('Failed to cancel order', 500, error)
  }
}
