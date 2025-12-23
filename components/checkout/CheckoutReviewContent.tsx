'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthContext'
import { useCart } from '@/components/cart/CartContext'
import AnimatedPage from '@/components/AnimatedPage'
import { calculateDiscountedPrice } from '@/lib/pricing'
import Image from 'next/image'
import Script from 'next/script'

// Razorpay is loaded dynamically from CDN
interface RazorpayConstructor {
  new (options: {
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

interface CheckoutItem {
  cartItemId: string
  product: {
    id: string
    name: string
    price: number
    discountPercent?: number | null
    image: string
    category: string
  }
  quantity: number
}

export default function CheckoutReviewContent() {
  const router = useRouter()
  const { accessToken, isAuthenticated } = useAuth()
  const { items, reload } = useCart()
  const [checkoutItems, setCheckoutItems] = useState<CheckoutItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  
  // Address form state
  const [address, setAddress] = useState({
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'IN',
  })

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/checkout')
      return
    }

    // Get selected cart item IDs from sessionStorage
    const storedIds = sessionStorage.getItem('checkoutCartItemIds')
    if (!storedIds) {
      router.push('/shop')
      return
    }

    const selectedCartItemIds: string[] = JSON.parse(storedIds)
    
    // Filter cart items to only selected ones
    const selectedItems = items.filter(
      (item) => item.cartItemId && selectedCartItemIds.includes(item.cartItemId) && item.product.inStock
    )

    if (selectedItems.length === 0) {
      router.push('/shop')
      return
    }

    setCheckoutItems(selectedItems as CheckoutItem[])
    setIsLoading(false)
  }, [isAuthenticated, items, router])

  const subtotal = checkoutItems.reduce((sum, item) => {
    const originalPriceInPaise = item.product.price * 100
    const discountedPriceInPaise = calculateDiscountedPrice(
      originalPriceInPaise,
      item.product.discountPercent
    )
    return sum + (discountedPriceInPaise / 100) * item.quantity
  }, 0)

  const handleCreateOrder = async () => {
    if (!accessToken) return

    // Validate address
    if (!address.addressLine1 || !address.city || !address.state || !address.postalCode) {
      alert('Please fill in all required address fields')
      return
    }

    setIsCreatingOrder(true)
    try {
      const selectedCartItemIds = checkoutItems.map(item => item.cartItemId).filter((id): id is string => !!id)
      
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          selectedCartItemIds,
          ...address,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.message || 'Failed to create order')
        return
      }

      // Clear checkout session
      sessionStorage.removeItem('checkoutCartItemIds')

      // Check if Razorpay order was created successfully
      if (!data.razorpayOrderId) {
        // Razorpay order creation failed, but order was created
        // Redirect to order detail page where user can retry payment
        if (data.warning) {
          alert(data.warning)
        } else {
          alert('Order created successfully. Please retry payment from your orders page.')
        }
        router.push(`/orders/${data.orderId}`)
        return
      }

      // Validate that we have all required data before opening Razorpay
      if (!data.razorpayOrderId || !data.orderId || !data.amount || !data.currency) {
        alert('Payment initialization incomplete. Please retry payment from your orders page.')
        router.push(`/orders/${data.orderId}`)
        return
      }

      // Open Razorpay checkout directly using razorpayOrderId from order creation
      await openRazorpayCheckout(data.razorpayOrderId, data.orderId, data.amount, data.currency)
    } catch (error) {
      console.error('[Checkout]', error)
      alert('An error occurred. Please try again.')
    } finally {
      setIsCreatingOrder(false)
    }
  }

  const openRazorpayCheckout = async (
    razorpayOrderId: string,
    orderId: string,
    amount: number,
    currency: string
  ) => {
    if (!accessToken) return

    // Validate inputs
    if (!razorpayOrderId || !orderId || !amount || !currency) {
      console.error('[Razorpay] Missing required parameters:', { razorpayOrderId, orderId, amount, currency })
      alert('Payment initialization failed. Please retry payment from your orders page.')
      router.push(`/orders/${orderId}`)
      return
    }

    setIsProcessingPayment(true)
    try {
      // Initialize Razorpay checkout with razorpayOrderId from order creation
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        amount: amount,
        currency: currency,
        name: 'Millets N Joy',
        description: `Order #${orderId}`,
        order_id: razorpayOrderId, // Use razorpayOrderId from order creation
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
                orderId: orderId, // Include orderId for fetching order
              }),
            })

            const verifyData = await verifyResponse.json()

            if (verifyResponse.ok) {
              // Reload cart to remove purchased items
              await reload()
              // Redirect to order detail page
              router.push(`/orders/${orderId}`)
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
            // Mark order as failed on error
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
          ondismiss: async function() {
            // User closed payment modal - mark order as PAYMENT_FAILED
            setIsProcessingPayment(false)
            try {
              await fetch(`/api/orders/${orderId}/mark-failed`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${accessToken}`,
                },
              })
              // Don't show alert - user intentionally closed the modal
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
    } finally {
      setIsProcessingPayment(false)
    }
  }

  if (isLoading) {
    return (
      <AnimatedPage>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-600" />
            <p className="text-sm text-neutral-600">Loading checkout...</p>
          </div>
        </div>
      </AnimatedPage>
    )
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <AnimatedPage>
        <div className="mx-auto max-w-4xl py-8 sm:py-12">
          <h1 className="mb-8 text-3xl font-bold tracking-tight text-neutral-900">Review Your Order</h1>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Order Summary */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Items */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold text-neutral-900">Order Items</h2>
                <div className="space-y-4">
                  {checkoutItems.map((item) => {
                    const originalPriceInPaise = item.product.price * 100
                    const discountedPriceInPaise = calculateDiscountedPrice(
                      originalPriceInPaise,
                      item.product.discountPercent
                    )
                    const discountedPrice = discountedPriceInPaise / 100
                    const itemTotal = discountedPrice * item.quantity

                    return (
                      <div key={item.cartItemId} className="flex gap-4 border-b border-neutral-100 pb-4 last:border-0">
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                          <Image
                            src={item.product.image}
                            alt={item.product.name}
                            fill
                            className="object-contain"
                            sizes="80px"
                          />
                        </div>
                        <div className="flex flex-1 flex-col">
                          <h3 className="font-semibold text-neutral-900">{item.product.name}</h3>
                          <p className="text-sm text-neutral-500">{item.product.category}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-sm font-medium text-neutral-700">Qty: {item.quantity}</span>
                            {item.product.discountPercent && item.product.discountPercent > 0 && (
                              <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700">
                                {item.product.discountPercent}% OFF
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {item.product.discountPercent && item.product.discountPercent > 0 ? (
                            <>
                              <div className="text-sm font-semibold text-neutral-900">₹{itemTotal.toFixed(2)}</div>
                              <div className="text-xs text-neutral-400 line-through">
                                ₹{(item.product.price * item.quantity).toFixed(2)}
                              </div>
                            </>
                          ) : (
                            <div className="text-sm font-semibold text-neutral-900">
                              ₹{(item.product.price * item.quantity).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Delivery Address */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold text-neutral-900">Delivery Address</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700">
                      Address Line 1 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={address.addressLine1}
                      onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      placeholder="Street address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700">Address Line 2</label>
                    <input
                      type="text"
                      value={address.addressLine2}
                      onChange={(e) => setAddress({ ...address, addressLine2: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      placeholder="Apartment, suite, etc. (optional)"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={address.city}
                        onChange={(e) => setAddress({ ...address, city: e.target.value })}
                        className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">
                        State <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={address.state}
                        onChange={(e) => setAddress({ ...address, state: e.target.value })}
                        className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">
                        Postal Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={address.postalCode}
                        onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                        className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">Country</label>
                      <input
                        type="text"
                        value={address.country}
                        onChange={(e) => setAddress({ ...address, country: e.target.value })}
                        className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        disabled
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold text-neutral-900">Order Summary</h2>
                <div className="space-y-3 border-b border-neutral-200 pb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">Subtotal</span>
                    <span className="font-medium text-neutral-900">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-600">Shipping</span>
                    <span className="font-medium text-neutral-900">Free</span>
                  </div>
                </div>
                <div className="mt-4 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary-600">₹{subtotal.toFixed(2)}</span>
                </div>
                <button
                  onClick={handleCreateOrder}
                  disabled={isCreatingOrder || isProcessingPayment}
                  className="mt-6 w-full rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingOrder ? 'Creating Order...' : isProcessingPayment ? 'Processing Payment...' : 'Place Order'}
                </button>
                <button
                  onClick={() => router.back()}
                  className="mt-3 w-full rounded-xl border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </AnimatedPage>
    </>
  )
}

