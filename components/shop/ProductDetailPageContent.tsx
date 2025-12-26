'use client'

import AnimatedPage from '@/components/AnimatedPage'
import { useCart } from '@/components/cart/CartContext'
import type { Product } from '@/types'
import { motion } from 'framer-motion'
import { useState } from 'react'
import Image from 'next/image'
import { calculateDiscountedPrice } from '@/lib/pricing'

interface ProductDetailPageContentProps {
  product: Product
}

/**
 * We use a dedicated page (instead of a modal) for product detail because:
 * - It works better for deep linking, SEO, and sharing URLs.
 * - It provides a more focused experience on mobile where modals can feel cramped.
 * - It keeps routing simple while still allowing smooth Framer Motion transitions.
 */
export default function ProductDetailPageContent({
  product,
}: ProductDetailPageContentProps) {
  const [quantity, setQuantity] = useState(1)
  const [imageError, setImageError] = useState(false)
  const [stockError, setStockError] = useState<string | null>(null)
  const { addItem } = useCart()

  const availableStock = product.stock ?? 0
  const isLowStock = availableStock > 0 && availableStock < 20
  const maxQuantity = availableStock > 0 ? Math.min(availableStock, 99) : 0

  const increment = () => {
    if (quantity < maxQuantity) {
      setQuantity((q) => Math.min(q + 1, maxQuantity))
      setStockError(null)
    } else {
      setStockError(`Only ${availableStock} available in stock`)
    }
  }
  const decrement = () => {
    setQuantity((q) => Math.max(q - 1, 1))
    setStockError(null)
  }

  return (
    <AnimatedPage>
      <section className="py-10 sm:py-12 lg:py-16">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-start">
          {/* Image / media */}
          <motion.div
            className="relative product-detail-image-container rounded-3xl border border-neutral-200 bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-200"
            initial={{ opacity: 0.9, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            {!imageError && product.image ? (
              <Image
                src={product.image}
                alt={product.name}
                width={500}
                height={800}
                className="product-detail-image"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
                onError={() => setImageError(true)}
                style={{ objectFit: 'contain' }}
              />
            ) : (
              <div className="flex h-full min-h-[200px] items-center justify-center">
                <div className="h-20 w-20 rounded-full bg-white/70 shadow-sm" />
              </div>
            )}
          </motion.div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                {product.category}
              </p>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl lg:text-4xl">
                {product.name}
              </h1>
            </div>

            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-neutral-700 sm:text-base">
                {product.description}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline gap-3">
                {product.discountPercent && product.discountPercent > 0 ? (
                  <>
                    <span className="text-3xl font-bold text-neutral-900 sm:text-4xl">
                      ₹{(
                        calculateDiscountedPrice(product.price * 100, product.discountPercent) / 100
                      ).toFixed(2)}
                    </span>
                    <span className="text-lg text-neutral-400 line-through sm:text-xl">
                      ₹{product.price.toFixed(2)}
                    </span>
                    <span className="rounded-full bg-primary-100 px-3 py-1 text-sm font-semibold text-primary-700">
                      {product.discountPercent}% OFF
                    </span>
                  </>
                ) : (
                  <span className="text-3xl font-semibold text-neutral-900 sm:text-4xl">
                    ₹{product.price.toFixed(2)}
                  </span>
                )}
              </div>
              {product.inStock ? (
                <span className="block text-xs font-medium text-primary-700">
                  {isLowStock ? `Only ${availableStock} left in stock` : 'In stock, ships in 1–2 days'}
                </span>
              ) : (
                <span className="block text-xs font-medium text-neutral-500">
                  Currently unavailable
                </span>
              )}
            </div>
            
            {/* Stock error message */}
            {stockError && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                {stockError}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4">
              {/* Quantity selector */}
              <div className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-2 py-1.5">
                <button
                  type="button"
                  onClick={decrement}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  −
                </button>
                <span className="min-w-[2rem] text-center text-sm font-medium text-neutral-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={increment}
                  disabled={quantity >= maxQuantity}
                  aria-label="Increase quantity"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>

              {/* Add to Cart button or Unavailable message */}
              {product.inStock ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (availableStock > 0 && quantity <= availableStock) {
                      setStockError(null)
                      await addItem(product, quantity)
                    } else {
                      setStockError(`Only ${availableStock} available in stock`)
                    }
                  }}
                  disabled={quantity > availableStock || availableStock === 0}
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-primary-700 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary-800 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed sm:flex-none"
                >
                  Add to Cart
                </button>
              ) : (
                <div className="inline-flex flex-1 items-center justify-center rounded-full bg-neutral-100 px-6 py-3 text-sm font-semibold text-neutral-500 sm:flex-none">
                  Currently unavailable
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </AnimatedPage>
  )
}


