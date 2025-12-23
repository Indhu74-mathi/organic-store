import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, createErrorResponse, forbiddenResponse } from '@/lib/auth/api-auth'
import { checkRateLimit, getClientIdentifier } from '@/lib/auth/rate-limit'
import { products } from '@/lib/products'

/**
 * POST /api/admin/products/import-static
 * 
 * Import static products from lib/products.ts into the database.
 * 
 * SECURITY:
 * - Admin-only access
 * - Rate limited
 */
export async function POST(req: NextRequest) {
  try {
    // SECURITY: Rate limit import (5 per hour per IP)
    const clientId = getClientIdentifier(req)
    const rateLimit = checkRateLimit(`admin:products:import:${clientId}`, 5, 60 * 60 * 1000)
    if (!rateLimit.allowed) {
      return createErrorResponse('Too many requests. Please try again later.', 429)
    }

    // SECURITY: Require admin role
    const admin = requireAdmin(req)
    if (!admin) {
      return forbiddenResponse()
    }

    let imported = 0
    let skipped = 0
    let errors = 0

    for (const product of products) {
      try {
        // Check if product with this slug already exists
        const existing = await prisma.product.findUnique({
          where: { slug: product.slug || product.name.toLowerCase().replace(/\s+/g, '-') },
        })

        if (existing) {
          skipped++
          continue
        }

        // Convert price from rupees to paise (smallest currency unit)
        const priceInPaise = Math.round(product.price * 100)

        // Create product in database
        await prisma.product.create({
          data: {
            name: product.name,
            slug: product.slug || product.name.toLowerCase().replace(/\s+/g, '-'),
            description: product.description || '',
            price: priceInPaise,
            imageUrl: product.image || '/images/placeholders/product-placeholder.jpg',
            category: product.category,
            stock: 100, // Default stock
            isActive: true, // Make all products active
          },
        })

        imported++
      } catch (error) {
        console.error(`Error importing ${product.name}:`, error)
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import complete: ${imported} imported, ${skipped} skipped, ${errors} errors`,
      imported,
      skipped,
      errors,
    })
  } catch (error) {
    return createErrorResponse('Failed to import products', 500, error)
  }
}

