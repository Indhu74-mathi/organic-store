import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, createErrorResponse, forbiddenResponse } from '@/lib/auth/api-auth'
import { validateString } from '@/lib/auth/validate-input'
import { generateInvoicePDF } from '@/lib/invoice/generate-invoice'

/**
 * GET /api/admin/orders/[orderId]/invoice
 * 
 * Generate and download invoice PDF for any order (admin only).
 * 
 * SECURITY:
 * - Admin-only access
 * - Can generate invoice for any order
 * - Only confirmed orders (ORDER_CONFIRMED, SHIPPED, DELIVERED) can generate invoices
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // SECURITY: Require admin role
    const admin = requireAdmin(req)
    if (!admin) {
      return forbiddenResponse()
    }

    // SECURITY: Validate orderId format
    const orderId = validateString(params.orderId, {
      minLength: 1,
      maxLength: 100,
      required: true,
      trim: true,
    })

    if (!orderId) {
      return createErrorResponse('Invalid order ID', 400)
    }

    // SECURITY: Fetch order (admin can view any order)
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        items: true,
      },
    })

    if (!order) {
      return createErrorResponse('Order not found', 404)
    }

    // Only allow invoice generation for confirmed orders
    const allowedStatuses = ['ORDER_CONFIRMED', 'SHIPPED', 'DELIVERED']
    if (!allowedStatuses.includes(order.status)) {
      return createErrorResponse(
        `Invoice can only be generated for confirmed orders. Current status: ${order.status}`,
        400
      )
    }

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF({
      order: order as any, // Type assertion needed due to Prisma select
      isAdmin: true,
    })

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${order.id.substring(0, 8)}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('[Admin Invoice Generation]', error)
    return createErrorResponse('Failed to generate invoice', 500, error)
  }
}

