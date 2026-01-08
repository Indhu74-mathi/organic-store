'use client'

import AnimatedPage from '@/components/AnimatedPage'
import { useCart } from '@/components/cart/CartContext'
import type { Product } from '@/types'
import { motion } from 'framer-motion'
import { useState } from 'react'
import Image from 'next/image'
import { calculateDiscountedPrice } from '@/lib/pricing'
import { hasVariants } from '@/lib/products'

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
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [imageError, setImageError] = useState(false)
  const [stockError, setStockError] = useState<string | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const { addItem } = useCart()

  const images = product.images && product.images.length > 0 ? product.images : [product.image]
  const usesVariants = hasVariants(product.category)
  const variants = product.variants || []

  // For variant-based products (Malt, saadha podi), use selected variant stock; otherwise use product stock
  const selectedVariant = usesVariants && selectedVariantId
    ? variants.find(v => v.id === selectedVariantId)
    : null

  const availableStock = selectedVariant
    ? selectedVariant.stock
    : (product.stock ?? 0)

  const displayPrice = selectedVariant
    ? selectedVariant.price
    : product.price

  const isLowStock = availableStock > 0 && availableStock < 20
  const maxQuantity = availableStock > 0 ? Math.min(availableStock, 99) : 0
  const canAddToCart = !usesVariants || (usesVariants && selectedVariantId && availableStock > 0)

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

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <AnimatedPage>
      <section className="py-10 sm:py-12 lg:py-16">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-start">
          {/* Image / media Gallery */}
          <div className="space-y-4">
            <motion.div
              className="relative product-detail-image-container group rounded-3xl border border-neutral-200 bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-200 aspect-square overflow-hidden"
              initial={{ opacity: 0.9, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            >
              {!imageError && images[currentImageIndex] ? (
                <Image
                  src={images[currentImageIndex]}
                  alt={`${product.name} - View ${currentImageIndex + 1}`}
                  fill
                  className="product-detail-image object-contain p-4"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="flex h-full min-h-[200px] items-center justify-center">
                  <div className="h-20 w-20 rounded-full bg-white/70 shadow-sm" />
                </div>
              )}

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); prevImage(); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-neutral-800 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-10"
                    aria-label="Previous image"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); nextImage(); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-neutral-800 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-10"
                    aria-label="Next image"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </motion.div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex flex-wrap gap-2 px-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`relative h-20 w-20 overflow-hidden rounded-xl border-2 transition-all ${currentImageIndex === idx ? 'border-primary-600 scale-105 shadow-sm' : 'border-neutral-200 opacity-60 hover:opacity-100'
                      }`}
                  >
                    <Image
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

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

            {/* Size selector for variant-based products (Malt, saadha podi) */}
            {usesVariants && variants.length > 0 && (
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-neutral-900">
                  Select Size <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-3">
                  {variants.map((variant) => {
                    const discountedPrice = calculateDiscountedPrice(variant.price * 100, product.discountPercent) / 100
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => {
                          setSelectedVariantId(variant.id)
                          setQuantity(1)
                          setStockError(null)
                        }}
                        disabled={variant.stock === 0}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${selectedVariantId === variant.id
                          ? 'bg-primary-600 text-white shadow-md'
                          : variant.stock === 0
                            ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                            : 'bg-white border-2 border-neutral-200 text-neutral-700 hover:border-primary-400 hover:text-primary-700'
                          }`}
                      >
                        <div className="flex flex-col items-center">
                          <span>{variant.sizeGrams}g</span>
                          {variant.stock === 0 ? (
                            <span className="text-xs opacity-75">Out of Stock</span>
                          ) : (
                            <span className="text-xs font-normal">
                              {product.discountPercent && product.discountPercent > 0 ? (
                                <>
                                  <span className="line-through opacity-75">₹{variant.price.toFixed(2)}</span>
                                  <span className="ml-1">₹{discountedPrice.toFixed(2)}</span>
                                </>
                              ) : (
                                `₹${variant.price.toFixed(2)}`
                              )}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
                {selectedVariant && (
                  <div className="text-sm text-neutral-600">
                    <span className="font-medium">Price:</span> ₹{selectedVariant.price.toFixed(2)}
                    {selectedVariant.stock > 0 && selectedVariant.stock < 20 && (
                      <span className="ml-4">
                        <span className="font-medium">Stock:</span> {selectedVariant.stock} available
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex flex-wrap items-baseline gap-3">
                {product.discountPercent && product.discountPercent > 0 ? (
                  <>
                    <span className="text-3xl font-bold text-neutral-900 sm:text-4xl">
                      ₹{(
                        calculateDiscountedPrice(displayPrice * 100, product.discountPercent) / 100
                      ).toFixed(2)}
                    </span>
                    <span className="text-lg text-neutral-400 line-through sm:text-xl">
                      ₹{displayPrice.toFixed(2)}
                    </span>
                    <span className="rounded-full bg-primary-100 px-3 py-1 text-sm font-semibold text-primary-700">
                      {product.discountPercent}% OFF
                    </span>
                  </>
                ) : (
                  <span className="text-3xl font-semibold text-neutral-900 sm:text-4xl">
                    ₹{displayPrice.toFixed(2)}
                  </span>
                )}
              </div>
              {availableStock > 0 ? (
                isLowStock ? (
                  <span className="block text-xs font-medium text-primary-700">
                    Only {availableStock} left in stock
                  </span>
                ) : null
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
                  className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>

              {/* Add to Cart button or Unavailable message */}
              {canAddToCart && availableStock > 0 ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (usesVariants && !selectedVariantId) {
                      setStockError('Please select a size')
                      return
                    }
                    if (availableStock > 0 && quantity <= availableStock) {
                      setStockError(null)
                      // Create product with variant info for addItem
                      const productToAdd = usesVariants && selectedVariant
                        ? { ...product, price: selectedVariant.price, stock: selectedVariant.stock, sizeGrams: selectedVariant.sizeGrams }
                        : product
                      await addItem(productToAdd, quantity, selectedVariantId || undefined)
                    } else {
                      setStockError(`Only ${availableStock} available in stock`)
                    }
                  }}
                  disabled={quantity > availableStock || availableStock === 0 || (usesVariants && !selectedVariantId)}
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-primary-700 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-primary-800 active:scale-95 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed sm:flex-none"
                >
                  {usesVariants && !selectedVariantId ? 'Select Size' : 'Add to Cart'}
                </button>
              ) : (
                <div className="inline-flex flex-1 items-center justify-center rounded-full bg-neutral-100 px-6 py-3 text-sm font-semibold text-neutral-500 sm:flex-none">
                  {usesVariants && !selectedVariantId ? 'Select Size to Add to Cart' : 'Currently unavailable'}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </AnimatedPage>
  )
}


