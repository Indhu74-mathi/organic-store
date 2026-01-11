'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { calculateDiscountedPrice } from '@/lib/pricing'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const [imageError, setImageError] = useState(false)

  const slugOrId = product.slug ?? product.id
  // Determine stock status: check product stock or sum of variant stocks
  const hasVariants = product.variants && product.variants.length > 0
  const totalStock = hasVariants
    ? product.variants!.reduce((sum, v) => sum + (v.stock || 0), 0)
    : (product.stock ?? 0)

  const isOutOfStock = totalStock <= 0

  // Pricing Logic
  // product.price is in Rupees. calculateDiscountedPrice expects Paise.
  const originalPriceInRupees = product.price
  const originalPriceInPaise = originalPriceInRupees * 100
  const discountedPriceInPaise = calculateDiscountedPrice(originalPriceInPaise, product.discountPercent)
  const discountedPriceInRupees = discountedPriceInPaise / 100
  const hasDiscount = product.discountPercent != null && product.discountPercent > 0

  return (
    <article className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-300 ease-smooth ${isOutOfStock
      ? 'opacity-60'
      : 'hover:-translate-y-1 hover:shadow-organic hover:ring-2 hover:ring-primary-soft'
      }`}>
      <Link
        href={`/shop/${slugOrId}`} // Use filtered slug from props
        aria-label={`View details for ${product.name}, price ₹${discountedPriceInRupees}`}
        className="flex flex-1 flex-col"
        draggable="false"
      >
        {/* Product Image */}
        <div className="relative flex min-h-[150px] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary-50/30 via-neutral-50 to-primary-100/20 sm:min-h-[240px] select-none">
          {!imageError && product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              width={400}
              height={600}
              className={`product-image h-auto w-full max-w-full object-contain transition-transform duration-300 ${isOutOfStock
                ? 'grayscale'
                : 'group-hover:scale-[1.02]'
                }`}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              onError={() => setImageError(true)}
            />
          ) : (
            // Fallback placeholder
            <div className="flex h-full min-h-[150px] items-center justify-center sm:min-h-[240px]">
              <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-white/80 shadow-sm backdrop-blur-sm" />
            </div>
          )}

          {/* Out of Stock badge */}
          {isOutOfStock && (
            <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10">
              <span className="inline-flex items-center rounded-full bg-neutral-600 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-white shadow-lg shadow-neutral-600/30">
                Out of Stock
              </span>
            </div>
          )}

          {/* Discount badge */}
          {!isOutOfStock && hasDiscount && (
            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10">
              <span className="inline-flex items-center rounded-full bg-emerald-500 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold text-white shadow-lg shadow-emerald-500/30">
                {product.discountPercent}% OFF
              </span>
            </div>
          )}

          {/* Hover overlay */}
          {!isOutOfStock && (
            <div className="absolute inset-0 bg-primary-600/0 transition-colors duration-300 group-hover:bg-primary-600/5" />
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-3 sm:p-5">
          {/* Category */}
          <div className="mb-1 sm:mb-2">
            <span className={`inline-block text-[10px] sm:text-xs font-medium tracking-wide uppercase ${isOutOfStock
              ? 'text-neutral-400'
              : 'text-primary-600'
              }`}>
              {product.category}
            </span>
          </div>

          {/* Product name */}
          <h3 className={`mb-1 sm:mb-2 text-sm sm:text-lg font-semibold leading-tight transition-colors duration-200 ${isOutOfStock
            ? 'text-neutral-500'
            : 'text-neutral-900 group-hover:text-primary-700'
            }`}>
            {product.name}
          </h3>

          {/* Description (truncated) */}
          <p className={`mb-2 sm:mb-4 flex-1 text-xs sm:text-sm leading-relaxed line-clamp-2 ${isOutOfStock ? 'text-neutral-400' : 'text-neutral-600'
            }`}>
            {product.description}
          </p>

          {/* Pack Size / Variants Info */}
          <div className="mb-2 sm:mb-4">
            {hasVariants ? (
              <span className="inline-flex items-center rounded-md bg-neutral-100 px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-xs font-medium text-neutral-600">
                {product.variants!.length} sizes
              </span>
            ) : product.sizeGrams ? (
              <span className="inline-flex items-center rounded-md bg-neutral-100 px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-xs font-medium text-neutral-600">
                {product.sizeGrams}g
              </span>
            ) : (
              // Space filler if no size info
              <span className="block h-5 sm:h-6"></span>
            )}
          </div>

          {/* Price & Stock */}
          <div className="mt-auto flex items-end justify-between">
            <div className="flex flex-col">
              {/* Price Display */}
              {hasDiscount ? (
                <div className="flex flex-col">
                  <span className="text-[10px] sm:text-xs text-neutral-400 line-through">
                    ₹{originalPriceInRupees.toFixed(2)}
                  </span>
                  <span className={`text-base sm:text-lg font-bold ${isOutOfStock ? 'text-neutral-500' : 'text-primary-700'}`}>
                    ₹{discountedPriceInRupees.toFixed(2)}
                  </span>
                </div>
              ) : (
                <span className={`text-base sm:text-lg font-bold ${isOutOfStock ? 'text-neutral-500' : 'text-neutral-900'}`}>
                  ₹{originalPriceInRupees.toFixed(2)}
                </span>
              )}
            </div>

            {/* Low stock indicator */}
            {!isOutOfStock && totalStock < 20 && (
              <span className="text-[10px] sm:text-xs font-medium text-amber-600">
                Only {totalStock} left
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  )
}

