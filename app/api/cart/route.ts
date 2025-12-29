import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createErrorResponse } from '@/lib/auth/api-auth'

export const runtime = "nodejs"

export async function GET(_req: NextRequest) {
  const supabaseAuth = createSupabaseServer()

  const { data: { user } } = await supabaseAuth.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Find or create cart for user
    const { data: carts, error: cartError } = await supabase
      .from('Cart')
      .select('id')
      .eq('userId', user.id)
      .limit(1)

    if (cartError) {
      console.error('[API Cart] Supabase error:', cartError)
      return createErrorResponse('Failed to fetch cart', 500)
    }

    let cartId: string | null = null

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
        console.error('[API Cart] Failed to create cart:', createError)
        return createErrorResponse('Failed to create cart', 500)
      }
    } else {
      const firstCart = carts[0]
      if (!firstCart) {
        return createErrorResponse('Failed to access cart', 500)
      }
      cartId = firstCart.id
    }

    // Fetch cart items with product and variant details in a single joined query
    const { data: cartItems, error: itemsError } = await supabase
      .from('CartItem')
      .select(`
        id,
        productId,
        variantId,
        quantity,
        Product (
          id,
          name,
          slug,
          description,
          price,
          discountPercent,
          imageUrl,
          category,
          stock,
          isActive
        ),
        ProductVariant (
          id,
          sizeGrams,
          price,
          stock
        )
      `)
      .eq('cartId', cartId)

    if (itemsError) {
      console.error('[API Cart] Failed to fetch items:', itemsError)
      return createErrorResponse('Failed to fetch cart items', 500)
    }

    // Map cart items with product and variant data
    const itemsWithProducts = (cartItems || [])
      .map((item: any) => {
        const product = item.Product
        const variant = item.ProductVariant

        if (!product) return null

        const isMalt = product.category === 'Malt'
        let price = product.price / 100
        let stock = product.stock
        let sizeGrams: number | null = null

        // If malt product with variant, use variant data
        if (isMalt && variant) {
          price = variant.price / 100
          stock = variant.stock
          sizeGrams = variant.sizeGrams
        }

        return {
          cartItemId: item.id,
          product: {
            id: product.id,
            slug: product.slug,
            name: product.name,
            description: product.description,
            price: price,
            discountPercent: product.discountPercent,
            category: product.category,
            image: product.imageUrl,
            inStock: product.isActive && stock > 0,
            stock: stock,
            ...(isMalt && sizeGrams && { sizeGrams }),
          },
          quantity: item.quantity,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    return NextResponse.json({
      cartId,
      items: itemsWithProducts,
    })
  } catch (error) {
    console.error('[API Cart] Error:', error)
    return createErrorResponse('Failed to fetch cart', 500, error)
  }
}
