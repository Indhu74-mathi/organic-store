import PDFDocument from 'pdfkit'

// Type definitions (no longer from Prisma)
interface Order {
  id: string
  userId: string
  status: string
  totalAmount: number
  currency: string
  addressLine1: string
  addressLine2: string | null
  city: string
  state: string
  postalCode: string
  country: string
  razorpayPaymentId: string | null
  paidAt: string | null
  createdAt: string
}

interface OrderItem {
  id: string
  orderId: string
  productId: string
  productName: string
  unitPrice: number
  discountPercent: number | null
  finalPrice: number
  quantity: number
  createdAt: string
}

interface User {
  id: string
  email: string
  role: string
}

interface InvoiceData {
  order: Order & {
    items: OrderItem[]
    user: User
  }
  isAdmin: boolean
}

/**
 * Generate invoice PDF for an order
 * 
 * @param invoiceData - Order data with user and items
 * @returns PDF buffer
 */
export async function generateInvoicePDF(invoiceData: InvoiceData): Promise<Buffer> {
  const { order } = invoiceData

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' })
      const buffers: Buffer[] = []

      doc.on('data', buffers.push.bind(buffers))
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers)
        resolve(pdfBuffer)
      })
      doc.on('error', reject)

      // Header
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('Millets N Joy', 50, 50)
        .fontSize(12)
        .font('Helvetica')
        .text('Invoice', 50, 80)

      // Order Info
      let yPos = 120
      doc
        .fontSize(10)
        .text(`Order ID: ${order.id}`, 50, yPos)
        .text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 50, yPos + 15)

      // Customer Info
      yPos += 50
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Bill To:', 50, yPos)
        .fontSize(10)
        .font('Helvetica')
        .text(order.user.email, 50, yPos + 15)

      // Delivery Address
      yPos += 60
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Delivery Address:', 50, yPos)
        .fontSize(10)
        .font('Helvetica')
        .text(order.addressLine1, 50, yPos + 15)
      if (order.addressLine2) {
        doc.text(order.addressLine2, 50, yPos + 30)
      }
      doc
        .text(`${order.city}, ${order.state} ${order.postalCode}`, 50, yPos + 45)
        .text(order.country, 50, yPos + 60)

      // Items Table
      yPos += 120
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Items', 50, yPos)

      yPos += 20
      // Table header
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Product', 50, yPos)
        .text('Qty', 200, yPos)
        .text('Price', 250, yPos)
        .text('Amount', 350, yPos)

      yPos += 20
      doc
        .moveTo(50, yPos)
        .lineTo(550, yPos)
        .stroke()

      yPos += 10

      // Items
      doc.font('Helvetica')
      for (const item of order.items) {
        const unitPrice = item.unitPrice / 100
        const finalPrice = item.finalPrice / 100

        doc
          .text(item.productName, 50, yPos, { width: 140 })
          .text(item.quantity.toString(), 200, yPos)
          .text(`₹${unitPrice.toFixed(2)}`, 250, yPos)
          .text(`₹${finalPrice.toFixed(2)}`, 350, yPos)

        yPos += 20
      }

      // Price Breakdown
      yPos += 20
      doc
        .moveTo(50, yPos)
        .lineTo(550, yPos)
        .stroke()

      yPos += 15

      // Subtotal
      const subtotal = order.totalAmount / 100
      doc
        .fontSize(10)
        .font('Helvetica')
        .text('Subtotal:', 400, yPos)
        .text(`₹${subtotal.toFixed(2)}`, 450, yPos)

      yPos += 20

      // Tax (GST 18%)
      const taxRate = 0.18
      const taxAmount = subtotal * taxRate
      doc
        .text(`GST (18%):`, 400, yPos)
        .text(`₹${taxAmount.toFixed(2)}`, 450, yPos)

      yPos += 20

      // Total
      const total = subtotal + taxAmount
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Total:', 400, yPos)
        .text(`₹${total.toFixed(2)}`, 450, yPos)

      // Payment Info
      yPos += 40
      if (order.razorpayPaymentId) {
        doc
          .fontSize(10)
          .font('Helvetica')
          .text(`Payment ID: ${order.razorpayPaymentId.substring(0, 20)}...`, 50, yPos)
      }
      if (order.paidAt) {
        doc.text(`Paid: ${new Date(order.paidAt).toLocaleString()}`, 50, yPos + 15)
      }

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
