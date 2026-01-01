import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdmin, createErrorResponse, forbiddenResponse } from '@/lib/auth/api-auth'
// Note: Static product import is not currently supported
// Products should be added through the admin UI or imported via database migration
const staticProducts: any[] = []

/**
 * POST /api/admin/products/import-static
 * 
 * Import static products from a predefined list (admin only).
 */
export async function POST(_req: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return forbiddenResponse()
    }

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (const product of staticProducts) {
      try {
        const productSlug = product.slug || product.name.toLowerCase().replace(/\s+/g, '-')
        
        // Check if product with this slug already exists
        const { data: existing } = await supabase
          .from('Product')
          .select('id')
          .eq('slug', productSlug)
          .single()

        if (existing) {
          skipped++
          continue
        }

        // Calculate discount percent if originalPrice exists
        let discountPercent: number | null = null
        if ('originalPrice' in product && product.originalPrice && product.price) {
          const discount = ((product.originalPrice - product.price) / product.originalPrice) * 100
          discountPercent = Math.round(discount)
        }

        // Insert product
        const { error } = await supabase.from('Product').insert({
          name: product.name,
          slug: productSlug,
          description: product.description,
          price: Math.round(product.price * 100), // Convert to paise
          discountPercent,
          imageUrl: product.image || '',
          category: product.category,
          stock: ('stock' in product && typeof product.stock === 'number') ? product.stock : 100,
          isActive: true,
        })

        if (error) {
          errors.push(`${product.name}: ${error.message}`)
        } else {
          imported++
        }
      } catch (err) {
        errors.push(`${product.name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('[API Admin Import Static Products] Error:', error)
    return createErrorResponse('Failed to import products', 500, error)
  }
}
