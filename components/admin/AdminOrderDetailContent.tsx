'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthContext'
import AnimatedPage from '@/components/AnimatedPage'
import { calculateDiscountedPrice } from '@/lib/pricing'
import { formatDateIST } from '@/lib/utils'

interface OrderItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  discountPercent?: number
  finalPrice?: number
  subtotal: number
}

interface Order {
  id: string
  userId: string
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
  razorpayPaymentId: string | null
  items: OrderItem[]
}

interface AdminOrderDetailContentProps {
  orderId: string
}

export default function AdminOrderDetailContent({ orderId }: AdminOrderDetailContentProps) {
  const router = useRouter()
  const { accessToken, isAuthenticated, role } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isRefunding, setIsRefunding] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      router.push('/auth/login')
      return
    }

    // Check admin role
    if (role !== 'ADMIN') {
      router.push('/')
      return
    }

    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/admin/orders/${orderId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!response.ok) {
          if (response.status === 404) {
            setError('Order not found')
          } else if (response.status === 403) {
            setError('Access denied. Admin access required.')
          } else {
            setError('Failed to load order')
          }
          return
        }

        const data = await response.json()
        setOrder(data.order)
      } catch (err) {
        console.error('[Admin Order Detail]', err)
        setError('Failed to load order')
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrder()
  }, [orderId, accessToken, isAuthenticated, role, router])

  const handleStatusUpdate = async (newStatus: string) => {
    if (!accessToken || !order) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.message || 'Failed to update order status')
        return
      }

      // Reload order to show updated status
      const fetchResponse = await fetch(`/api/admin/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (fetchResponse.ok) {
        const fetchData = await fetchResponse.json()
        setOrder(fetchData.order)
      }
    } catch (error) {
      console.error('[Update Order Status]', error)
      alert('Failed to update order status. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRefund = async () => {
    if (!accessToken || !order) return

    // Confirm refund action
    const confirmMessage = `Are you sure you want to refund this order?\n\nOrder ID: ${order.id?.substring(0, 8) || 'N/A'}\nAmount: ₹${order.totalAmount.toFixed(2)}\n\nThis action will:\n- Process refund through Razorpay\n- Restore product stock\n- Mark order as REFUNDED\n\nThis action cannot be undone.`
    
    if (!confirm(confirmMessage)) {
      return
    }

    // Optional: Ask for refund reason
    const reason = prompt('Enter reason for refund (optional):') || undefined

    setIsRefunding(true)
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          reason,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.message || 'Failed to process refund')
        return
      }

      // Show success message
      alert(`Refund processed successfully!\n\nRefund ID: ${data.refund.id}\nAmount: ₹${(data.refund.amount / 100).toFixed(2)}\nStatus: ${data.refund.status}`)

      // Reload order to show updated status
      const fetchResponse = await fetch(`/api/admin/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (fetchResponse.ok) {
        const fetchData = await fetchResponse.json()
        setOrder(fetchData.order)
      }
    } catch (error) {
      console.error('[Refund]', error)
      alert('Failed to process refund. Please try again.')
    } finally {
      setIsRefunding(false)
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

  /**
   * Get valid next status options for admin to change order status
   * Clean logic: ORDER_CONFIRMED → SHIPPED → DELIVERED
   */
  const getNextStatusOptions = (currentStatus: string): string[] => {
    switch (currentStatus) {
      case 'ORDER_CONFIRMED':
        // Admin can change ORDER_CONFIRMED to SHIPPED
        return ['SHIPPED']
      case 'SHIPPED':
        // Admin can change SHIPPED to DELIVERED (when delivery person confirms)
        return ['DELIVERED']
      default:
        // No status changes allowed for other statuses
        return []
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
              href="/admin"
              className="mt-6 inline-block rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            >
              Back to Admin Dashboard
            </Link>
          </div>
        </section>
      </AnimatedPage>
    )
  }

  // totalAmount from API is already in rupees (converted from paise)
  const totalInRupees = order.totalAmount
  const nextStatusOptions = getNextStatusOptions(order.status)

  return (
    <AnimatedPage>
      <section className="py-10 sm:py-12 lg:py-16">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
                Order Details
              </h1>
              <p className="mt-2 text-sm text-neutral-600">
                Order #{order.id?.substring(0, 8) || 'N/A'} • User ID: {order.userId?.substring(0, 8) || 'N/A'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {['ORDER_CONFIRMED', 'SHIPPED', 'DELIVERED'].includes(order.status) && (
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch(`/api/admin/orders/${orderId}/invoice`, {
                        headers: {
                          Authorization: `Bearer ${accessToken}`,
                        },
                      })

                      if (!response.ok) {
                        const error = await response.json()
                        alert(error.message || 'Failed to download invoice')
                        return
                      }

                      const blob = await response.blob()
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `invoice-${order.id?.substring(0, 8) || 'N/A'}.pdf`
                      document.body.appendChild(a)
                      a.click()
                      window.URL.revokeObjectURL(url)
                      document.body.removeChild(a)
                    } catch (error) {
                      console.error('[Invoice Download]', error)
                      alert('Failed to download invoice. Please try again.')
                    }
                  }}
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
                >
                  Download Invoice
                </button>
              )}
              <span className={getStatusBadge(order.status)}>
                {order.status}
              </span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Order Items - Takes 2 columns */}
            <div className="lg:col-span-2 space-y-6">
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
                    <span className="font-medium text-neutral-900">Free</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-neutral-200 pt-3">
                    <span className="text-lg font-semibold text-neutral-900">Total</span>
                    <span className="text-2xl font-bold text-neutral-900">
                      ₹{totalInRupees.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar - Order Information */}
            <div className="lg:col-span-1 space-y-6">
              {/* Customer Information */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-neutral-900">Customer</h2>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-neutral-600">User ID:</span>
                    <p className="font-mono text-xs text-neutral-700">{order.userId?.substring(0, 8) || 'N/A'}...</p>
                  </div>
                </div>
              </div>

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
                    <span className="text-neutral-600">Order Status</span>
                    <span className={getStatusBadge(order.status)}>{order.status}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Payment Method</span>
                    {order.paidAt && order.razorpayPaymentId ? (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                        Online Payment
                      </span>
                    ) : (
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                        Cash on Delivery (COD)
                      </span>
                    )}
                  </div>
                  {order.paidAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-600">Paid At</span>
                      <span className="text-neutral-900">
                        {formatDateIST(order.paidAt, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Asia/Kolkata',
                        })}
                      </span>
                    </div>
                  )}
                  {order.razorpayPaymentId && (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-600">Payment ID</span>
                      <span className="font-mono text-xs text-neutral-900">{order.razorpayPaymentId}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Information */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-neutral-900">Order Information</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Order Date</span>
                    <span className="text-neutral-900">
                      {formatDateIST(order.createdAt, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Asia/Kolkata',
                      })}
                    </span>
                  </div>
                  {order.updatedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-600">Last Updated</span>
                      <span className="text-neutral-900">
                        {formatDateIST(order.updatedAt, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Asia/Kolkata',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Refund Action (Only for CONFIRMED, SHIPPED, or DELIVERED orders) */}
              {['ORDER_CONFIRMED', 'SHIPPED', 'DELIVERED'].includes(order.status) && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-semibold text-red-900">Refund Order</h2>
                  <p className="mb-4 text-sm text-red-700">
                    Process a refund for this order. This will:
                  </p>
                  <ul className="mb-4 list-inside list-disc space-y-1 text-xs text-red-600">
                    <li>Initiate refund through Razorpay</li>
                    <li>Restore product stock</li>
                    <li>Mark order as REFUNDED</li>
                  </ul>
                  <button
                    onClick={handleRefund}
                    disabled={isRefunding}
                    className="w-full rounded-xl border border-red-300 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRefunding ? 'Processing Refund...' : 'Process Refund'}
                  </button>
                  <p className="mt-3 text-xs text-red-500">
                    Warning: This action cannot be undone
                  </p>
                </div>
              )}

              {/* Status Update (Only for ORDER_CONFIRMED and SHIPPED orders) */}
              {nextStatusOptions.length > 0 && (
                <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-semibold text-neutral-900">Update Order Status</h2>
                  <p className="mb-4 text-sm text-neutral-600">
                    {order.status === 'ORDER_CONFIRMED' 
                      ? 'Mark order as shipped when ready to dispatch'
                      : order.status === 'SHIPPED'
                      ? 'Mark order as delivered when delivery is confirmed'
                      : 'Update order status'}
                  </p>
                  <div className="space-y-2">
                    {nextStatusOptions.map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          const confirmMessage = order.status === 'ORDER_CONFIRMED'
                            ? `Mark this order as SHIPPED?\n\nThis indicates the order has been dispatched and is on its way to the customer.`
                            : order.status === 'SHIPPED'
                            ? `Mark this order as DELIVERED?\n\nThis confirms the order has been successfully delivered to the customer.`
                            : `Are you sure you want to mark this order as ${status}?`
                          
                          if (confirm(confirmMessage)) {
                            handleStatusUpdate(status)
                          }
                        }}
                        disabled={isUpdating}
                        className="w-full rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUpdating ? 'Updating...' : `Mark as ${status}`}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-neutral-500">
                    Status flow: Payment Success → Order Confirmed → Shipped → Delivered
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Back to Orders */}
          <div className="mt-8">
            <Link
              href="/admin"
              className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              ← Back to Admin Dashboard
            </Link>
          </div>
        </div>
      </section>
    </AnimatedPage>
  )
}

