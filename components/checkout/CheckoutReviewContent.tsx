'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthContext'
import { useCart } from '@/components/cart/CartContext'
import AnimatedPage from '@/components/AnimatedPage'
import { calculateDiscountedPrice, calculateShippingFee } from '@/lib/pricing'
import Image from 'next/image'
import Script from 'next/script'

// Indian States List
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
]

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
  const [isProcessingPaymentState, setIsProcessingPaymentState] = useState(false) // Track if payment is being processed
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('razorpay')

  // Address form state
  const [address, setAddress] = useState({
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'IN',
  })

  // State dropdown autocomplete
  const [stateInput, setStateInput] = useState('')
  const [showStateDropdown, setShowStateDropdown] = useState(false)
  const [filteredStates, setFilteredStates] = useState<string[]>(INDIAN_STATES)
  const [selectedStateIndex, setSelectedStateIndex] = useState(-1)
  const stateDropdownRef = useRef<HTMLDivElement>(null)
  const stateInputRef = useRef<HTMLInputElement>(null)

  // Filter states based on input
  useEffect(() => {
    if (stateInput.trim() === '') {
      setFilteredStates(INDIAN_STATES)
    } else {
      const filtered = INDIAN_STATES.filter(state =>
        state.toLowerCase().startsWith(stateInput.toLowerCase())
      )
      setFilteredStates(filtered)
    }
    setSelectedStateIndex(-1)
  }, [stateInput])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(event.target as Node)) {
        setShowStateDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle state selection
  const handleStateSelect = (state: string) => {
    setStateInput(state)
    setAddress({ ...address, state })
    setShowStateDropdown(false)
  }

  // Handle keyboard navigation
  const handleStateKeyDown = (e: React.KeyboardEvent) => {
    if (!showStateDropdown) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setShowStateDropdown(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedStateIndex(prev =>
          prev < filteredStates.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedStateIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedStateIndex >= 0 && filteredStates[selectedStateIndex]) {
          handleStateSelect(filteredStates[selectedStateIndex])
        } else if (filteredStates.length === 1 && filteredStates[0]) {
          handleStateSelect(filteredStates[0])
        }
        break
      case 'Escape':
        setShowStateDropdown(false)
        break
    }
  }

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

  // Use the same calculation logic as cart
  // item.product.price is in rupees (from cart API which converts product.price / 100)
  const subtotal = checkoutItems.reduce((sum, item) => {
    // Calculate discounted price for each item
    const originalPriceInPaise = item.product.price * 100 // Convert to paise
    const discountedPriceInPaise = calculateDiscountedPrice(
      originalPriceInPaise,
      item.product.discountPercent
    )
    const discountedPriceInRupees = discountedPriceInPaise / 100
    return sum + discountedPriceInRupees * item.quantity
  }, 0)

  // Calculate Shipping (Dynamic based on state and subtotal)
  const SHIPPING_THRESHOLD = 1000
  const shippingFee = calculateShippingFee(subtotal, address.state)
  const isFreeShipping = shippingFee === 0 && subtotal >= SHIPPING_THRESHOLD

  const finalTotal = subtotal + shippingFee

  const handleCreateOrder = async () => {
    if (!accessToken) {
      alert('Please log in to continue')
      return
    }

    // Validate address
    if (!address.addressLine1 || !address.city || !address.state || !address.postalCode) {
      alert('Please fill in all required address fields')
      return
    }

    // Prevent multiple clicks
    if (isCreatingOrder || isProcessingPayment) {
      return
    }

    setIsCreatingOrder(true)
    try {
      const selectedCartItemIds = checkoutItems.map(item => item.cartItemId).filter((id): id is string => !!id)

      // Handle COD orders
      if (paymentMethod === 'cod') {
        const response = await fetch('/api/orders/create-cod', {
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
          alert(data.error || data.message || 'Failed to create order. Please try again.')
          return
        }

        // Clear checkout session
        sessionStorage.removeItem('checkoutCartItemIds')

        // Reload cart to remove purchased items
        await reload()

        // Redirect to order success page
        router.push(`/orders/${data.orderId}?payment=cod`)
        return
      }

      // Handle Razorpay orders (existing flow)
      // Step 1: Create order and Razorpay order
      const response = await fetch('/api/payments/create-order', {
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
        alert(data.error || data.message || 'Failed to create order. Please try again.')
        return
      }

      // Validate response data
      if (!data.razorpayOrderId || !data.amount || !data.currency || !data.orderData) {
        alert('Payment initialization incomplete. Please try again.')
        return
      }

      // Clear checkout session
      sessionStorage.removeItem('checkoutCartItemIds')

      // Step 2: Open Razorpay checkout modal
      // Store orderData temporarily for verification
      await openRazorpayCheckout(
        data.razorpayOrderId,
        data.amount,
        data.currency,
        data.orderData
      )
    } catch (error) {
      console.error('[Checkout] Error creating order:', error)
      alert('An error occurred while creating your order. Please try again.')
    } finally {
      setIsCreatingOrder(false)
    }
  }

  const openRazorpayCheckout = async (
    razorpayOrderId: string,
    amount: number,
    currency: string,
    orderData: {
      selectedCartItemIds: string[]
      orderItemsData: Array<{
        productId: string
        productName: string
        unitPrice: number
        discountPercent: number | null
        finalPrice: number
        quantity: number
      }>
      totalAmount: number
      shippingFee?: number
      addressLine1: string
      addressLine2: string | null
      city: string
      state: string
      postalCode: string
      country: string
    }
  ) => {
    if (!accessToken) {
      alert('Please log in to continue')
      return
    }

    // Validate inputs
    if (!razorpayOrderId || !amount || !currency || !orderData) {
      console.error('[Razorpay] Missing required parameters:', { razorpayOrderId, amount, currency, orderData })
      alert('Payment initialization failed. Please try again.')
      return
    }

    // Check if Razorpay script is loaded
    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    if (!razorpayKey) {
      alert('Payment gateway configuration error. Please contact support.')
      return
    }

    setIsProcessingPayment(true)
    try {
      // Initialize Razorpay checkout
      const options = {
        key: razorpayKey,
        amount: amount, // Amount in paise
        currency: currency,
        name: 'Millets N Joy',
        description: `Order Payment`,
        order_id: razorpayOrderId,
        handler: async function (response: {
          razorpay_order_id: string
          razorpay_payment_id: string
          razorpay_signature: string
        }) {
          // Payment successful - verify on backend and create order
          setIsProcessingPaymentState(true)
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
                orderData: orderData, // Pass order data to create order after payment
              }),
            })

            const verifyData = await verifyResponse.json()

            if (verifyResponse.ok && verifyData.success) {
              // Payment verified and order created successfully
              // Reload cart to remove purchased items
              await reload()
              // Redirect to order success page
              router.push(`/orders/${verifyData.orderId}?payment=success`)
            } else {
              // Payment verification failed
              alert(verifyData.error || verifyData.message || 'Payment verification failed. Please contact support.')
              router.push('/shop')
            }
          } catch (error) {
            console.error('[Payment Verify] Error:', error)
            alert('Payment verification failed. Please contact support.')
            router.push('/shop')
          } finally {
            setIsProcessingPaymentState(false)
            setIsProcessingPayment(false)
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
            // User closed payment modal without completing payment
            setIsProcessingPayment(false)
            // Order remains in PAYMENT_PENDING status
            // User can retry payment from order details page
          },
        },
      }

      // Wait for Razorpay script to load
      const razorpay = (window as Window & { Razorpay?: RazorpayConstructor }).Razorpay
      if (!razorpay) {
        // Script not loaded yet, wait a bit and try again
        await new Promise(resolve => setTimeout(resolve, 500))
        const razorpayRetry = (window as Window & { Razorpay?: RazorpayConstructor }).Razorpay
        if (!razorpayRetry) {
          alert('Payment gateway not loaded. Please refresh the page and try again.')
          setIsProcessingPayment(false)
          return
        }
        const razorpayInstance = new razorpayRetry(options)
        razorpayInstance.open()
      } else {
        const razorpayInstance = new razorpay(options)
        razorpayInstance.open()
      }
    } catch (error) {
      console.error('[Payment] Error opening Razorpay:', error)
      alert('Failed to open payment gateway. Please try again.')
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
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onLoad={() => {
          console.log('[Razorpay] Script loaded successfully')
        }}
        onError={() => {
          console.error('[Razorpay] Failed to load script')
        }}
      />
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
                          <h3 className="font-semibold text-neutral-900">
                            {item.product.name}
                            {(item.product as typeof item.product & { sizeGrams?: number | null }).sizeGrams && ` – ${(item.product as typeof item.product & { sizeGrams?: number | null }).sizeGrams}g`}
                          </h3>
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

              {/* Payment Method */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold text-neutral-900">Payment Method</h2>
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="razorpay"
                      checked={paymentMethod === 'razorpay'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'razorpay' | 'cod')}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-neutral-900">Online Payment</div>
                      <div className="text-sm text-neutral-500">Pay securely with Razorpay</div>
                    </div>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'razorpay' | 'cod')}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-neutral-900">Cash on Delivery (COD)</div>
                      <div className="text-sm text-neutral-500">Pay when you receive your order</div>
                    </div>
                  </label>
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
                    <div className="relative" ref={stateDropdownRef}>
                      <label className="block text-sm font-medium text-neutral-700">
                        State <span className="text-red-500">*</span>
                      </label>
                      <input
                        ref={stateInputRef}
                        type="text"
                        required
                        value={stateInput}
                        onChange={(e) => {
                          setStateInput(e.target.value)
                          setShowStateDropdown(true)
                          // Update address state only if exact match
                          const exactMatch = INDIAN_STATES.find(s => s.toLowerCase() === e.target.value.toLowerCase())
                          if (exactMatch) {
                            setAddress({ ...address, state: exactMatch })
                          } else {
                            setAddress({ ...address, state: e.target.value })
                          }
                        }}
                        onFocus={() => setShowStateDropdown(true)}
                        onKeyDown={handleStateKeyDown}
                        className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="Start typing to search..."
                        autoComplete="off"
                      />
                      {showStateDropdown && filteredStates.length > 0 && (
                        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-neutral-300 bg-white shadow-lg">
                          {filteredStates.map((state, index) => (
                            <div
                              key={state}
                              onClick={() => handleStateSelect(state)}
                              className={`cursor-pointer px-3 py-2 text-sm transition-colors ${index === selectedStateIndex
                                ? 'bg-primary-100 text-primary-900'
                                : 'hover:bg-neutral-50'
                                }`}
                            >
                              {state}
                            </div>
                          ))}
                        </div>
                      )}
                      {showStateDropdown && filteredStates.length === 0 && (
                        <div className="absolute z-10 mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-500 shadow-lg">
                          No states found
                        </div>
                      )}
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
                  {/* Shipping Note */}
                  <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-3">
                    <div className="flex items-start gap-2">
                      <svg className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-xs text-blue-900">
                        <p className="font-semibold mb-1">Shipping Information</p>
                        <p>• <strong>Free Shipping</strong> on orders ≥ ₹1,000</p>
                        <p>• <strong>₹40 Shipping Fee</strong> for orders below ₹1,000</p>
                        <p className="mt-1 text-blue-700">Shipping fee updates automatically based on your order total.</p>
                      </div>
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

                    {isFreeShipping ? (
                      <span className="font-medium text-green-600">Free</span>
                    ) : (
                      <span className="font-medium text-neutral-900">₹{shippingFee.toFixed(2)}</span>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary-600">₹{finalTotal.toFixed(2)}</span>
                </div>
                <button
                  onClick={handleCreateOrder}
                  disabled={isCreatingOrder || isProcessingPayment || isProcessingPaymentState}
                  className="mt-6 w-full rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingOrder
                    ? 'Creating Order...'
                    : isProcessingPayment || isProcessingPaymentState
                      ? 'Processing Payment...'
                      : paymentMethod === 'cod'
                        ? 'Place Order (COD)'
                        : 'Pay Now'}
                </button>
                <button
                  onClick={() => router.back()}
                  className="mt-3 w-full rounded-xl border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 focus:outline-none"
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

