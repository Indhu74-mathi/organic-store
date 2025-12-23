import Razorpay from 'razorpay'
import crypto from 'crypto'

/**
 * Razorpay payment utilities
 * 
 * SECURITY: All Razorpay keys must come from environment variables.
 * Never expose RAZORPAY_KEY_SECRET to frontend.
 * 
 * Environment variables required:
 * - RAZORPAY_KEY_ID: Your Razorpay key ID
 * - RAZORPAY_KEY_SECRET: Your Razorpay key secret
 */

/**
 * Get Razorpay instance (lazy initialization)
 * 
 * SECURITY: Validates keys at runtime, not build time.
 * This allows the app to build without keys, but fails fast when payment routes are accessed.
 */
function getRazorpayInstance(): Razorpay {
  const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID
  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error(
      'CRITICAL: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables are required. ' +
      'The application cannot process payments without these keys.'
    )
  }

  return new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  })
}

/**
 * Get Razorpay key secret for signature verification
 */
function getRazorpayKeySecret(): string {
  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET
  if (!RAZORPAY_KEY_SECRET) {
    throw new Error(
      'CRITICAL: RAZORPAY_KEY_SECRET environment variable is required.'
    )
  }
  return RAZORPAY_KEY_SECRET
}

/**
 * Create a Razorpay order
 * 
 * SECURITY: Amount must come from database, never from frontend.
 * 
 * @param amount - Amount in smallest currency unit (paise for INR)
 * @param currency - Currency code (default: INR)
 * @param orderId - Internal order ID for reference
 * @returns Razorpay order object
 */
export async function createRazorpayOrder(
  amount: number,
  currency: string = 'INR',
  orderId: string
): Promise<{ id: string; amount: number; currency: string }> {
  if (amount <= 0) {
    throw new Error('Amount must be greater than zero')
  }

  try {
    const options = {
      amount, // Amount in smallest currency unit (paise)
      currency,
      receipt: `order_${orderId}`, // Internal order reference
      notes: {
        orderId, // Store internal order ID for verification
      },
    }

    const razorpayInstance = getRazorpayInstance()
    const razorpayOrder = await razorpayInstance.orders.create(options)

    // SECURITY: Ensure amount is always a number (Razorpay may return string)
    const orderAmount = typeof razorpayOrder.amount === 'number'
      ? razorpayOrder.amount
      : parseInt(String(razorpayOrder.amount), 10)

    return {
      id: razorpayOrder.id,
      amount: orderAmount,
      currency: razorpayOrder.currency,
    }
  } catch (error) {
    console.error('[RAZORPAY] Failed to create order:', error)
    throw new Error('Failed to create Razorpay order')
  }
}

/**
 * Verify Razorpay payment signature
 * 
 * SECURITY: This uses constant-time comparison to prevent timing attacks.
 * Signature verification is CRITICAL - never skip this step.
 * 
 * @param razorpayOrderId - Razorpay order ID
 * @param razorpayPaymentId - Razorpay payment ID
 * @param razorpaySignature - Razorpay signature to verify
 * @returns true if signature is valid, false otherwise
 */
export function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  try {
    const keySecret = getRazorpayKeySecret()

    // SECURITY: Create expected signature using HMAC SHA256
    // Format: razorpay_order_id + "|" + razorpay_payment_id
    const payload = `${razorpayOrderId}|${razorpayPaymentId}`
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(payload)
      .digest('hex')

    // SECURITY: Use constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(razorpaySignature)
    )
  } catch (error) {
    console.error('[RAZORPAY] Signature verification error:', error)
    return false
  }
}

/**
 * Fetch Razorpay payment details
 * 
 * @param paymentId - Razorpay payment ID
 * @returns Payment details from Razorpay
 */
export async function getRazorpayPayment(
  paymentId: string
): Promise<{ id: string; status: string; amount: number; order_id: string } | null> {
  try {
    const razorpayInstance = getRazorpayInstance()
    const payment = await razorpayInstance.payments.fetch(paymentId)
    
    // SECURITY: Ensure amount is always a number (Razorpay may return string)
    const paymentAmount = typeof payment.amount === 'number'
      ? payment.amount
      : parseInt(String(payment.amount), 10)

    return {
      id: payment.id,
      status: payment.status,
      amount: paymentAmount,
      order_id: payment.order_id,
    }
  } catch (error) {
    console.error('[RAZORPAY] Failed to fetch payment:', error)
    return null
  }
}

/**
 * Create a Razorpay refund
 * 
 * SECURITY: Amount must come from database, never from frontend.
 * Only full refunds are supported for simplicity.
 * 
 * @param paymentId - Razorpay payment ID
 * @param amount - Refund amount in smallest currency unit (paise for INR). If not provided, full refund.
 * @param notes - Optional notes for the refund
 * @returns Razorpay refund object
 */
export async function createRazorpayRefund(
  paymentId: string,
  amount?: number,
  notes?: Record<string, string>
): Promise<{ id: string; amount: number; status: string; payment_id: string }> {
  if (!paymentId) {
    throw new Error('Payment ID is required')
  }

  try {
    const razorpayInstance = getRazorpayInstance()
    
    const refundOptions: {
      payment_id: string
      amount?: number
      notes?: Record<string, string>
    } = {
      payment_id: paymentId,
    }

    // If amount is provided, use it (for partial refunds)
    // Otherwise, Razorpay will process a full refund
    if (amount !== undefined && amount > 0) {
      refundOptions.amount = amount
    }

    if (notes) {
      refundOptions.notes = notes
    }

    const refund = await razorpayInstance.payments.refund(paymentId, refundOptions)

    // SECURITY: Ensure amount is always a number (Razorpay may return string)
    const refundAmount = typeof refund.amount === 'number'
      ? refund.amount
      : parseInt(String(refund.amount), 10)

    return {
      id: refund.id,
      amount: refundAmount,
      status: refund.status,
      payment_id: refund.payment_id,
    }
  } catch (error: any) {
    console.error('[RAZORPAY] Failed to create refund:', error)
    
    // Provide more specific error messages
    if (error.error?.description) {
      throw new Error(`Refund failed: ${error.error.description}`)
    }
    
    throw new Error('Failed to create Razorpay refund')
  }
}

