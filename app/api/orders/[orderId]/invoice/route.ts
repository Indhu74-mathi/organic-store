import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, unauthorizedResponse } from '@/lib/auth/api-auth'
import { validateString } from '@/lib/auth/validate-input'
import { generateInvoicePDF } from '@/lib/invoice/generate-invoice'

/**
 * GET /api/orders/[orderId]/invoice
 * 
 * Generate and download invoice PDF for a user's order.
 * 
 * SECURITY:
 * - User can only download invoice for their own orders
 * - Only confirmed orders (ORDER_CONFIRMED, SHIPPED, DELIVERED) can generate invoices
 * - Never expose sensitive payment data
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // SECURITY: Require authentication
    const user = requireAuth(req)
    if (!user) {
      return unauthorizedResponse()
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

    // SECURITY: Fetch order - ALWAYS scope by authenticated userId
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: user.userId, // CRITICAL: Ensure order belongs to authenticated user
      },
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
      isAdmin: false,
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
    console.error('[Invoice Generation]', error)
    return createErrorResponse('Failed to generate invoice', 500, error)
  }
}

