'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/components/cart/CartContext'
import { useAuth } from '@/components/auth/AuthContext'
import { useRouter } from 'next/navigation'
import { calculateDiscountedPrice } from '@/lib/pricing'

export default function CartDrawer() {
  const { items, isOpen, close, setQuantity, removeItem, subtotal } = useCart()
  const { isAuthenticated, accessToken } = useAuth()
  const router = useRouter()
  const [selectedCartItemIds, setSelectedCartItemIds] = useState<string[]>([])
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch by only reading auth state after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  const hasItems = items.length > 0

  // Initialize all items as selected by default
  useEffect(() => {
    if (hasItems && isAuthenticated) {
      const allIds = items
        .map((item) => item.cartItemId)
        .filter((id): id is string => !!id)
      setSelectedCartItemIds(allIds)
    } else {
      setSelectedCartItemIds([])
    }
  }, [items, hasItems, isAuthenticated])

  const handleToggleItem = (cartItemId: string | undefined) => {
    if (!cartItemId) return
    setSelectedCartItemIds((prev) =>
      prev.includes(cartItemId)
        ? prev.filter((id) => id !== cartItemId)
        : [...prev, cartItemId]
    )
  }

  const handleCheckout = () => {
    if (!isAuthenticated || !accessToken) {
      router.push('/auth/login?redirect=/shop')
      return
    }

    if (selectedCartItemIds.length === 0) {
      alert('Please select at least one item to checkout')
      return
    }

    setIsCheckingOut(true)

    // Store selected cart item IDs in sessionStorage to pass to checkout page
    sessionStorage.setItem('checkoutCartItemIds', JSON.stringify(selectedCartItemIds))
    close()

    // Redirect to checkout review page
    router.push('/checkout')
  }

  // Calculate subtotal for selected items only (using discounted prices)
  // Exclude unavailable items from subtotal
  const selectedSubtotal = items
    .filter((item) => item.cartItemId && selectedCartItemIds.includes(item.cartItemId) && item.product.inStock)
    .reduce((sum, item) => {
      // Calculate discounted price for each item
      const originalPriceInPaise = item.product.price * 100 // Convert to paise
      const discountedPriceInPaise = calculateDiscountedPrice(
        originalPriceInPaise,
        item.product.discountPercent
      )
      const discountedPriceInRupees = discountedPriceInPaise / 100
      return sum + discountedPriceInRupees * item.quantity
    }, 0)

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end ${
        isOpen ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <button
        type="button"
        onClick={close}
        className={`h-full w-full bg-black/20 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Drawer */}
      <aside
        className={`relative flex h-full w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 ease-smooth pb-[env(safe-area-inset-bottom)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Shopping cart"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Your Cart</h2>
            <p className="text-xs text-neutral-500">
              {hasItems ? `${items.length} item(s)` : 'No items yet'}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close cart"
            className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          {hasItems ? (
            <ul className="space-y-4">
              {items.map((item) => {
                const slugOrId = item.product.slug ?? item.product.id
                // For authenticated users, items should have cartItemId
                // If not, it means the item was just added and cart hasn't reloaded yet
                const isSelected = item.cartItemId
                  ? selectedCartItemIds.includes(item.cartItemId)
                  : false
                // Show checkbox for authenticated users (even if cartItemId is missing temporarily)
                const canSelect = isAuthenticated
                // Disable checkbox if product is unavailable
                const isUnavailable = !item.product.inStock
                // Check for low stock
                const availableStock = item.product.stock ?? 0
                const isLowStock = availableStock > 0 && availableStock < 20
                const exceedsStock = availableStock > 0 && item.quantity > availableStock
                const canCheckout = canSelect && item.cartItemId && !isUnavailable && !exceedsStock

                return (
                  <li
                    key={item.product.id}
                    className={`flex items-start gap-4 rounded-2xl border p-3 ${
                      isUnavailable || exceedsStock
                        ? 'border-neutral-200 bg-neutral-50/40 opacity-75'
                        : 'border-neutral-200 bg-neutral-50/60'
                    }`}
                  >
                    {/* Checkbox (only for authenticated users, disabled if unavailable) */}
                    {canSelect && (
                      <div className="flex items-start pt-1">
                        <input
                          type="checkbox"
                          checked={isSelected && !isUnavailable}
                          onChange={() => {
                            if (canCheckout) {
                              handleToggleItem(item.cartItemId!)
                            }
                          }}
                          disabled={!canCheckout}
                          className="h-5 w-5 rounded border-neutral-300 text-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label={`Select ${item.product.name} for checkout`}
                        />
                      </div>
                    )}
                    <Link
                      href={`/shop/${slugOrId}`}
                      onClick={close}
                      className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-200 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      aria-label={`View ${item.product.name} details`}
                    >
                      {item.product.image ? (
                        <Image
                          src={item.product.image}
                          alt={item.product.name}
                          width={64}
                          height={64}
                          className="h-full w-full object-contain"
                          sizes="64px"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-white/70 shadow-sm" />
                      )}
                    </Link>
                    <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-neutral-900">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {item.product.category}
                        </p>
                        {isUnavailable && (
                          <p className="mt-1 text-xs font-medium text-amber-600">
                            Currently unavailable
                          </p>
                        )}
                        {!isUnavailable && exceedsStock && (
                          <p className="mt-1 text-xs font-medium text-amber-600">
                            Low stock: Only {availableStock} available (you have {item.quantity})
                          </p>
                        )}
                        {!isUnavailable && !exceedsStock && isLowStock && (
                          <p className="mt-1 text-xs font-medium text-amber-600">
                            Low stock: Only {availableStock} left
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.product.id)}
                        className="text-xs text-neutral-400 hover:text-neutral-700"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-2 py-1">
                        <button
                          type="button"
                          onClick={() =>
                            setQuantity(item.product.id, Math.max(item.quantity - 1, 1))
                          }
                          disabled={isUnavailable}
                          aria-label="Decrease quantity"
                          className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          −
                        </button>
                        <span className="min-w-[1.75rem] text-center text-xs font-medium text-neutral-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const maxQuantity = availableStock > 0 ? Math.min(availableStock, 99) : 99
                            setQuantity(item.product.id, Math.min(item.quantity + 1, maxQuantity))
                          }}
                          disabled={isUnavailable || (availableStock > 0 && item.quantity >= availableStock)}
                          aria-label="Increase quantity"
                          className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {item.product.discountPercent && item.product.discountPercent > 0 ? (
                          <>
                            <div className="flex items-baseline gap-2">
                            <span className="text-sm font-semibold text-neutral-900">
                              ₹{(
                                (calculateDiscountedPrice(item.product.price * 100, item.product.discountPercent) / 100) *
                                item.quantity
                              ).toFixed(2)}
                            </span>
                            <span className="text-xs text-neutral-400 line-through">
                              ₹{(item.product.price * item.quantity).toFixed(2)}
                              </span>
                              <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700">
                                {item.product.discountPercent}% OFF
                              </span>
                            </div>
                            <span className="text-xs text-neutral-500">
                              ₹{(calculateDiscountedPrice(item.product.price * 100, item.product.discountPercent) / 100).toFixed(2)} per unit
                            </span>
                          </>
                        ) : (
                          <>
                          <span className="text-sm font-semibold text-neutral-900">
                            ₹{(item.product.price * item.quantity).toFixed(2)}
                          </span>
                            <span className="text-xs text-neutral-500">
                              ₹{item.product.price.toFixed(2)} per unit
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              )
              })}
            </ul>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center text-sm text-neutral-500">
              <p>Your cart is empty.</p>
              <p className="mt-1">Browse products and add your favorites.</p>
            </div>
          )}
        </div>

        <div className="border-t border-neutral-200 px-4 py-4 sm:px-6 sm:py-5">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-neutral-600">
              {isAuthenticated && selectedCartItemIds.length > 0
                ? `Subtotal (${selectedCartItemIds.length} selected)`
                : 'Subtotal'}
            </span>
            <span className="text-base font-semibold text-neutral-900">
              ₹
              {isAuthenticated && selectedCartItemIds.length > 0
                ? selectedSubtotal.toFixed(2)
                : subtotal.toFixed(2)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCheckout}
            className="flex w-full items-center justify-center rounded-full bg-primary-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!hasItems || isCheckingOut || (isAuthenticated && selectedCartItemIds.length === 0)}
          >
            {isCheckingOut
              ? 'Processing...'
              : mounted && isAuthenticated
                ? 'Checkout'
                : 'Login to Checkout'}
          </button>
        </div>
      </aside>
    </div>
  )
}


