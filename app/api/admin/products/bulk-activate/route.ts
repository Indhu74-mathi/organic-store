import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, createErrorResponse, forbiddenResponse } from '@/lib/auth/api-auth'
import { checkRateLimit, getClientIdentifier } from '@/lib/auth/rate-limit'

/**
 * POST /api/admin/products/bulk-activate
 * 
 * Make all products available (set isActive = true and stock > 0).
 * 
 * SECURITY:
 * - Admin-only access
 * - Rate limited
 */
export async function POST(req: NextRequest) {
  try {
    // SECURITY: Rate limit bulk operations (5 per hour per IP)
    const clientId = getClientIdentifier(req)
    const rateLimit = checkRateLimit(`admin:products:bulk-activate:${clientId}`, 5, 60 * 60 * 1000)
    if (!rateLimit.allowed) {
      return createErrorResponse('Too many requests. Please try again later.', 429)
    }

    // SECURITY: Require admin role
    const admin = requireAdmin(req)
    if (!admin) {
      return forbiddenResponse()
    }

    // For products with stock <= 0, set to 100
    // For products with stock > 0, keep existing stock
    await prisma.$executeRaw`
      UPDATE "Product"
      SET "isActive" = true, "stock" = CASE 
        WHEN "stock" <= 0 THEN 100 
        ELSE "stock" 
      END
    `

    // Get updated count
    const updatedCount = await prisma.product.count({
      where: { isActive: true },
    })

    return NextResponse.json({
      success: true,
      message: `All products have been activated. ${updatedCount} products are now available.`,
      updatedCount,
    })
  } catch (error) {
    return createErrorResponse('Failed to activate products', 500, error)
  }
}

