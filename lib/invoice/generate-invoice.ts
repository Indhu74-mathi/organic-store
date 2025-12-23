import PDFDocument from 'pdfkit'
import { Order, OrderItem, User } from '@prisma/client'

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
  const { order, isAdmin } = invoiceData

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

      // Company/Store Information
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('Organic Store', 50, 50)
        .fontSize(10)
        .font('Helvetica')
        .text('123 Organic Street, Green City', 50, 80)
        .text('Mumbai, Maharashtra 400001', 50, 95)
        .text('Phone: +91 98765 43210 | Email: info@organicstore.com', 50, 110)

      // Invoice Title
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('INVOICE', 50, 150)

      // Order Information
      const orderDate = new Date(order.createdAt)
      const formattedDate = orderDate.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Invoice #: ${order.id}`, 400, 150)
        .text(`Date: ${formattedDate}`, 400, 165)
        .text(`Order Status: ${order.status}`, 400, 180)

      // Customer Information
      let yPos = 220
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Bill To:', 50, yPos)
        .fontSize(10)
        .font('Helvetica')
        .text(order.user.email, 50, yPos + 20)
        .text(`User ID: ${order.userId.substring(0, 8)}...`, 50, yPos + 35)

      // Delivery Address
      yPos += 70
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Ship To:', 50, yPos)
        .fontSize(10)
        .font('Helvetica')
        .text(order.addressLine1, 50, yPos + 20)
      if (order.addressLine2) {
        doc.text(order.addressLine2, 50, yPos + 35)
        yPos += 15
      }
      doc
        .text(
          `${order.city}, ${order.state} ${order.postalCode}`,
          50,
          yPos + 35
        )
        .text(order.country, 50, yPos + 50)

      // Table Header
      yPos += 100
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Item', 50, yPos)
        .text('Quantity', 200, yPos)
        .text('Unit Price', 280, yPos)
        .text('Discount', 360, yPos)
        .text('Amount', 450, yPos)

      // Draw line under header
      doc
        .moveTo(50, yPos + 15)
        .lineTo(550, yPos + 15)
        .stroke()

      // Order Items
      yPos += 25
      let subtotal = 0

      order.items.forEach((item) => {
        const unitPriceInRupees = item.unitPrice / 100
        const itemSubtotal = item.finalPrice / 100
        const discountPercent = item.discountPercent ?? 0
        const originalPrice = discountPercent > 0
          ? unitPriceInRupees / (1 - discountPercent / 100)
          : unitPriceInRupees

        // Product name (may wrap)
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(item.productName, 50, yPos, { width: 140 })

        // Quantity
        doc.text(item.quantity.toString(), 200, yPos)

        // Unit Price
        if (discountPercent > 0) {
          doc
            .text(`₹${originalPrice.toFixed(2)}`, 280, yPos)
            .fontSize(8)
            .fillColor('gray')
            .text(`₹${unitPriceInRupees.toFixed(2)}`, 280, yPos + 12)
            .fontSize(9)
            .fillColor('black')
        } else {
          doc.text(`₹${unitPriceInRupees.toFixed(2)}`, 280, yPos)
        }

        // Discount
        if (discountPercent > 0) {
          doc.text(`${discountPercent}%`, 360, yPos)
        } else {
          doc.text('-', 360, yPos)
        }

        // Amount
        doc.text(`₹${itemSubtotal.toFixed(2)}`, 450, yPos)

        subtotal += itemSubtotal
        yPos += 30

        // Check if we need a new page
        if (yPos > 700) {
          doc.addPage()
          yPos = 50
        }
      })

      // Price Breakdown
      yPos += 20
      doc
        .moveTo(50, yPos)
        .lineTo(550, yPos)
        .stroke()

      yPos += 15

      // Subtotal
      doc
        .fontSize(10)
        .font('Helvetica')
        .text('Subtotal:', 400, yPos)
        .text(`₹${subtotal.toFixed(2)}`, 450, yPos)

      yPos += 20

      // Tax (GST 18%)
      // Calculate tax based on subtotal
      const taxRate = 0.18 // 18% GST
      const taxAmount = subtotal * taxRate
      doc
        .text(`GST (18%):`, 400, yPos)
        .text(`₹${taxAmount.toFixed(2)}`, 450, yPos)

      yPos += 20

      // Total - Use order totalAmount as source of truth
      const orderTotalInRupees = order.totalAmount / 100
      const calculatedTotal = subtotal + taxAmount
      
      // If calculated total matches order total (within rounding), use calculated
      // Otherwise, use order total and adjust tax display if needed
      const totalToShow = Math.abs(orderTotalInRupees - calculatedTotal) < 0.01 
        ? calculatedTotal 
        : orderTotalInRupees

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Total:', 400, yPos)
        .text(`₹${totalToShow.toFixed(2)}`, 450, yPos)

      // Payment Information
      yPos += 40
      if (order.paidAt) {
        const paidDate = new Date(order.paidAt)
        doc
          .fontSize(10)
          .font('Helvetica')
          .text(
            `Payment Date: ${paidDate.toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}`,
            50,
            yPos
          )
      }

      // Footer
      const pageHeight = doc.page.height
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('gray')
        .text(
          'Thank you for your business!',
          50,
          pageHeight - 50,
          { align: 'center', width: 500 }
        )
        .text(
          'This is a computer-generated invoice and does not require a signature.',
          50,
          pageHeight - 35,
          { align: 'center', width: 500 }
        )

      // Finalize PDF
      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

