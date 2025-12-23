import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { requireAdmin, createErrorResponse, forbiddenResponse } from '@/lib/auth/api-auth'
import { validateString } from '@/lib/auth/validate-input'
import { generateInvoicePDF } from '@/lib/invoice/generate-invoice'

export async function GET(
  _req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const admin = requireAdmin(_req)
    if (!admin) {
      return forbiddenResponse()
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
      .limit(1)

    if (orderError || !orders || orders.length === 0) {
      return createErrorResponse('Order not found', 404)
    }

    const order = orders[0]

    const confirmedStatuses = ['ORDER_CONFIRMED', 'SHIPPED', 'DELIVERED', 'REFUNDED']
    if (!confirmedStatuses.includes(order.status)) {
      return createErrorResponse(
        `Invoice can only be generated for confirmed orders. Current status: ${order.status}`,
        400
      )
    }

    // Fetch order items
    const { data: orderItems, error: itemsError } = await supabase
      .from('OrderItem')
      .select('*')
      .eq('orderId', orderId)

    if (itemsError) {
      return createErrorResponse('Failed to fetch order items', 500)
    }

    // Fetch user
    const { data: users, error: userError } = await supabase
      .from('User')
      .select('*')
      .eq('id', order.userId)
      .limit(1)

    if (userError || !users || users.length === 0) {
      return createErrorResponse('User not found', 404)
    }

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF({
      order: {
        ...order,
        items: orderItems || [],
        user: users[0],
      },
      isAdmin: true,
    })

    // Return PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
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
