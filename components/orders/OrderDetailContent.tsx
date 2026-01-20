'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthContext'
import AnimatedPage from '@/components/AnimatedPage'
import { calculateDiscountedPrice } from '@/lib/pricing'
import { formatDateIST } from '@/lib/utils'

// Razorpay is loaded dynamically from CDN
interface RazorpayConstructor {
  new(options: {
    key: string
    amount: number
    currency: string
    name: string
    description: string
    order_id: string
    handler: (response: {
      razorpay_order_id: string
      razorpay_payment_id: string
      razorpay_signature: string
    }) => void | Promise<void>
    prefill?: { name?: string; email?: string }
    theme?: { color?: string }
    modal?: { ondismiss?: () => void | Promise<void> }
  }): {
    open: () => void
  }
}

interface OrderItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  discountPercent?: number | null
  finalPrice?: number
  subtotal: number
}

interface Order {
  id: string
  status: string
  totalAmount: number
  currency: string
  createdAt: string
  updatedAt?: string
  paidAt: string | null
  addressLine1: string
  addressLine2: string | null
  city: string
  state: string
  postalCode: string
  country: string
  items: OrderItem[]
  paymentStatus: string
  hasPayment: boolean
  paymentId: string | null
}

interface OrderDetailContentProps {
  orderId: string
}

export default function OrderDetailContent({ orderId }: OrderDetailContentProps) {
  const router = useRouter()
  const { accessToken, isAuthenticated } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRetryingPayment, setIsRetryingPayment] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      router.push('/auth/login')
      return
    }

    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!response.ok) {
          if (response.status === 404) {
            setError('Order not found')
          } else {
            setError('Failed to load order')
          }
          return
        }

        const data = await response.json()
        setOrder(data.order)
      } catch (err) {
        console.error('[Order Detail]', err)
        setError('Failed to load order')
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrder()
  }, [orderId, accessToken, isAuthenticated, router])

  const handleRetryPayment = async () => {
    if (!accessToken || !order) return

    setIsRetryingPayment(true)
    try {
      // Get payment details for this order
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ orderId: order.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.message || 'Failed to initiate payment')
        return
      }

      // Open Razorpay checkout
      await openRazorpayCheckout(data.razorpayOrderId, order.id, data.amount, data.currency)
    } catch (error) {
      console.error('[Retry Payment]', error)
      alert('Failed to retry payment. Please try again.')
    } finally {
      setIsRetryingPayment(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!accessToken || !order) return

    if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      return
    }

    setIsCancelling(true)
    try {
      const response = await fetch(`/api/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.message || 'Failed to cancel order')
        return
      }

      // Reload order to show updated status
      const fetchResponse = await fetch(`/api/orders/${order.id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (fetchResponse.ok) {
        const fetchData = await fetchResponse.json()
        setOrder(fetchData.order)
      }
    } catch (error) {
      console.error('[Cancel Order]', error)
      alert('Failed to cancel order. Please try again.')
    } finally {
      setIsCancelling(false)
    }
  }

  const openRazorpayCheckout = async (
    razorpayOrderId: string,
    orderId: string,
    amount: number,
    currency: string
  ) => {
    if (!accessToken) return

    try {
      // Load Razorpay script if not already loaded
      if (!(window as Window & { Razorpay?: RazorpayConstructor }).Razorpay) {
        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.async = true
        document.body.appendChild(script)
        await new Promise((resolve) => {
          script.onload = resolve
        })
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        amount: amount,
        currency: currency,
        name: 'Millets N Joy',
        description: `Order #${orderId}`,
        order_id: razorpayOrderId,
        handler: async function (response: {
          razorpay_order_id: string
          razorpay_payment_id: string
          razorpay_signature: string
        }) {
          // Verify payment
          try {
            const verifyResponse = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderId: orderId,
              }),
            })

            const verifyData = await verifyResponse.json()

            if (verifyResponse.ok) {
              // Reload order to show updated status
              const fetchResponse = await fetch(`/api/orders/${orderId}`, {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              })

              if (fetchResponse.ok) {
                const fetchData = await fetchResponse.json()
                setOrder(fetchData.order)
              }
            } else {
              // Payment verification failed - mark order as PAYMENT_FAILED
              await fetch(`/api/orders/${orderId}/mark-failed`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${accessToken}`,
                },
              })
              alert(verifyData.message || 'Payment verification failed')
            }
          } catch (error) {
            console.error('[Payment Verify]', error)
            try {
              await fetch(`/api/orders/${orderId}/mark-failed`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${accessToken}`,
                },
              })
            } catch (markFailedError) {
              console.error('[Payment] Failed to mark order as failed:', markFailedError)
            }
            alert('Payment verification failed. Please contact support.')
          }
        },
        prefill: {
          name: '',
          email: '',
        },
        theme: {
          color: '#4CAF50',
        },
        modal: {
          ondismiss: async function () {
            // User closed payment modal - mark order as PAYMENT_FAILED
            try {
              await fetch(`/api/orders/${orderId}/mark-failed`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${accessToken}`,
                },
              })
              // Reload order to show updated status
              const fetchResponse = await fetch(`/api/orders/${orderId}`, {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              })
              if (fetchResponse.ok) {
                const fetchData = await fetchResponse.json()
                setOrder(fetchData.order)
              }
            } catch (error) {
              console.error('[Payment] Failed to mark order as failed:', error)
            }
          },
        },
      }

      const razorpay = (window as Window & { Razorpay?: RazorpayConstructor }).Razorpay
      if (razorpay) {
        const razorpayInstance = new razorpay(options)
        razorpayInstance.open()
      } else {
        alert('Payment gateway not loaded. Please refresh the page.')
      }
    } catch (error) {
      console.error('[Payment]', error)
      alert('Failed to open payment gateway')
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = 'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold'
    switch (status) {
      case 'ORDER_CONFIRMED':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'PAYMENT_SUCCESS':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'SHIPPED':
        return `${baseClasses} bg-blue-100 text-blue-800`
      case 'DELIVERED':
        return `${baseClasses} bg-primary-100 text-primary-800`
      case 'PAYMENT_PENDING':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'ORDER_CREATED':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'PAYMENT_FAILED':
        return `${baseClasses} bg-red-100 text-red-800`
      case 'CANCELLED':
        return `${baseClasses} bg-red-100 text-red-800`
      case 'REFUNDED':
        return `${baseClasses} bg-purple-100 text-purple-800`
      default:
        return `${baseClasses} bg-neutral-100 text-neutral-800`
    }
  }

  if (isLoading) {
    return (
      <AnimatedPage>
        <section className="py-10 sm:py-12 lg:py-16">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-600" />
              <p className="text-sm text-neutral-600">Loading order...</p>
            </div>
          </div>
        </section>
      </AnimatedPage>
    )
  }

  if (error || !order) {
    return (
      <AnimatedPage>
        <section className="py-10 sm:py-12 lg:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
              {error || 'Order not found'}
            </h1>
            <p className="mt-3 text-sm text-neutral-600 sm:text-base">
              {error || 'We couldn\'t find the order you were looking for.'}
            </p>
            <Link
              href="/orders"
              className="mt-6 inline-block rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            >
              View All Orders
            </Link>
          </div>
        </section>
      </AnimatedPage>
    )
  }

  // totalAmount from API is already in rupees (converted from paise by API)
  const totalInRupees = order.totalAmount

  // Calculate items total to derive shipping fee
  const itemsTotalInRupees = order.items.reduce((sum, item) => {
    return sum + (item.finalPrice || 0)
  }, 0)

  const shippingFee = totalInRupees - itemsTotalInRupees
  // Allow for small floating point differences, assume < 1 rupee diff is zero/rounding
  const isFreeShipping = shippingFee < 1

  return (
    <AnimatedPage>
      <section className="py-10 sm:py-12 lg:py-16">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
                Order Details
              </h1>
              <p className="mt-2 text-sm text-neutral-600">
                Order #{order.id.substring(0, 8)}
              </p>
            </div>
            <div className="flex items-center gap-3">

              <span className={getStatusBadge(order.status)}>
                {order.status}
              </span>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Order Items */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-neutral-900">Order Items</h2>
              <div className="space-y-4">
                {order.items.map((item, index) => {
                  // Use the same calculation logic as cart
                  // API returns unitPrice and finalPrice in rupees (already divided by 100)
                  // But we need to convert back to paise to use calculateDiscountedPrice
                  // then convert back to rupees for display
                  const originalUnitPriceInRupees = item.unitPrice
                  const originalUnitPriceInPaise = originalUnitPriceInRupees * 100
                  const discountedUnitPriceInPaise = calculateDiscountedPrice(
                    originalUnitPriceInPaise,
                    item.discountPercent
                  )
                  const discountedUnitPriceInRupees = discountedUnitPriceInPaise / 100
                  const itemSubtotal = item.finalPrice || 0 // Already in rupees from API
                  const hasDiscount = item.discountPercent != null && item.discountPercent > 0

                  return (
                    <div
                      key={`${item.productId}-${index}`}
                      className="border-b border-neutral-100 pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-neutral-900">{item.productName}</p>
                          <div className="mt-1 space-y-1">
                            <p className="text-sm text-neutral-600">
                              Quantity: {item.quantity} × ₹{discountedUnitPriceInRupees.toFixed(2)}
                            </p>
                            {hasDiscount && (
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700">
                                  {item.discountPercent}% OFF
                                </span>
                                <span className="text-xs text-neutral-400 line-through">
                                  ₹{(originalUnitPriceInRupees * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-neutral-900">
                            ₹{itemSubtotal.toFixed(2)}
                          </p>
                          {hasDiscount && (
                            <p className="text-xs text-neutral-500">
                              ₹{discountedUnitPriceInRupees.toFixed(2)} per unit
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Price Breakdown */}
              <div className="mt-6 space-y-3 border-t border-neutral-200 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-600">Subtotal</span>
                  <span className="font-medium text-neutral-900">
                    ₹{totalInRupees.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-600">Shipping</span>
                  {isFreeShipping ? (
                    <span className="font-medium text-green-600">Free</span>
                  ) : (
                    <span className="font-medium text-neutral-900">₹{shippingFee.toFixed(2)}</span>
                  )}
                </div>
                <div className="flex items-center justify-between border-t border-neutral-200 pt-3">
                  <span className="text-lg font-semibold text-neutral-900">Total</span>
                  <span className="text-2xl font-bold text-neutral-900">
                    ₹{totalInRupees.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Order Information */}
            <div className="space-y-6">
              {/* Delivery Address */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-neutral-900">Delivery Address</h2>
                <div className="space-y-1 text-sm text-neutral-700">
                  <p>{order.addressLine1}</p>
                  {order.addressLine2 && <p>{order.addressLine2}</p>}
                  <p>
                    {order.city}, {order.state} {order.postalCode}
                  </p>
                  <p>{order.country}</p>
                </div>
              </div>

              {/* Payment Status */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-neutral-900">Payment Status</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Payment Method</span>
                    {order.paidAt && order.paymentId ? (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                        Online Payment
                      </span>
                    ) : (
                      <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
                        Payment Pending
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Order Status</span>
                    <span className={getStatusBadge(order.status)}>{order.status}</span>
                  </div>
                  {order.paidAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-600">Paid At</span>
                      <span className="text-neutral-900">
                        {new Date(order.paidAt).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                  {order.paymentId && (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-600">Payment ID</span>
                      <span className="font-mono text-xs text-neutral-900">{order.paymentId}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Date */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-neutral-900">Order Information</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Order Date</span>
                    <span className="text-neutral-900">
                      {formatDateIST(order.createdAt, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Asia/Kolkata',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Pending/Failed Orders */}
              {(order.status === 'PAYMENT_PENDING' || order.status === 'PAYMENT_FAILED') && (
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-semibold text-neutral-900">Order Actions</h2>
                  <div className="space-y-3">
                    <button
                      onClick={handleRetryPayment}
                      disabled={isRetryingPayment || isCancelling}
                      className="w-full rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus:outline-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isRetryingPayment ? 'Processing...' : 'Retry Payment'}
                    </button>
                    <button
                      onClick={handleCancelOrder}
                      disabled={isRetryingPayment || isCancelling}
                      className="w-full rounded-xl border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 focus:outline-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCancelling ? 'Cancelling...' : 'Cancel Order'}
                    </button>
                  </div>
                </div>
              )}

              {/* Cancel Button for Confirmed Orders (before shipping) */}
              {order.status === 'ORDER_CONFIRMED' && (
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-semibold text-neutral-900">Order Actions</h2>
                  <div className="space-y-3">
                    <p className="text-sm text-neutral-600">
                      Order cancellation is only available before shipping.
                    </p>
                    <button
                      onClick={handleCancelOrder}
                      disabled={isCancelling}
                      className="w-full rounded-xl border border-red-300 bg-white px-6 py-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 focus:outline-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCancelling ? 'Cancelling...' : 'Cancel Order'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Back to Orders */}
          <div className="mt-8">
            <Link
              href="/orders"
              className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              ← Back to Orders
            </Link>
          </div>
        </div>
      </section>
    </AnimatedPage>
  )
}

