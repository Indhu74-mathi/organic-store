'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import type { Product } from '@/types'
import { useCart } from '@/components/cart/CartContext'
import { calculateDiscountedPrice } from '@/lib/pricing'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart()
  const [imageError, setImageError] = useState(false)

  const slugOrId = product.slug ?? product.id
  const isOutOfStock = (product.stock ?? 0) === 0

  return (
    <article className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm transition-all duration-300 ease-smooth ${
      isOutOfStock 
        ? 'opacity-50' 
        : 'hover:-translate-y-1 hover:shadow-xl hover:shadow-neutral-900/5'
    }`}>
      <Link
        href={`/shop/${slugOrId}`}
        aria-label={`View details for ${product.name}`}
        className="flex flex-1 flex-col"
      >
        {/* Product Image */}
        <div className="relative flex min-h-[200px] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-primary-50/30 via-neutral-50 to-primary-100/20 sm:min-h-[240px]">
          {!imageError && product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              width={400}
              height={600}
              className={`product-image h-auto w-full max-w-full object-contain transition-transform duration-300 ${
                isOutOfStock 
                  ? 'grayscale' 
                  : 'group-hover:scale-[1.02]'
              }`}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              onError={() => setImageError(true)}
            />
          ) : (
            // Fallback placeholder if image fails to load
            <div className="flex h-full min-h-[200px] items-center justify-center sm:min-h-[240px]">
              <div className="h-16 w-16 rounded-full bg-white/80 shadow-sm backdrop-blur-sm" />
            </div>
          )}
          {/* Out of Stock badge on image */}
          {isOutOfStock && (
            <div className="absolute top-3 left-3 z-10">
              <span className="inline-flex items-center rounded-full bg-neutral-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-neutral-600/30 sm:px-3.5 sm:py-2 sm:text-sm">
                Out of Stock
              </span>
            </div>
          )}
          {/* Discount badge on image (only if not out of stock) */}
          {!isOutOfStock && product.discountPercent && product.discountPercent > 0 && (
            <div className="absolute top-3 right-3 z-10">
              <span className="inline-flex items-center rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/30 sm:px-3.5 sm:py-2 sm:text-sm">
                {product.discountPercent}% OFF
              </span>
            </div>
          )}
          {/* Subtle overlay on hover (only if in stock) */}
          {!isOutOfStock && (
            <div className="absolute inset-0 bg-primary-600/0 transition-colors duration-300 group-hover:bg-primary-600/5" />
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-5 sm:p-6">
          {/* Category badge */}
          <div className="mb-3">
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
              isOutOfStock 
                ? 'bg-neutral-100 text-neutral-400' 
                : 'bg-primary-50 text-primary-700'
            }`}>
              {product.category}
            </span>
          </div>

          {/* Product name */}
          <h3 className={`mb-2 text-xl font-semibold leading-tight transition-colors duration-200 ${
            isOutOfStock 
              ? 'text-neutral-400' 
              : 'text-neutral-900 group-hover:text-primary-700'
          }`}>
            {product.name}
          </h3>

          {/* Description */}
          <p className={`mb-5 flex-1 text-sm leading-relaxed line-clamp-3 ${
            isOutOfStock ? 'text-neutral-400' : 'text-neutral-600'
          }`}>
            {product.description}
          </p>

          {/* Price */}
          <div className={`mt-auto ${isOutOfStock ? 'text-neutral-400' : ''}`}>
            {product.discountPercent && product.discountPercent > 0 ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bold ${isOutOfStock ? 'text-neutral-400' : 'text-neutral-900'}`}>
                    ₹{(
                      calculateDiscountedPrice(product.price * 100, product.discountPercent) / 100
                    ).toFixed(2)}
                  </span>
                  <span className="text-base text-neutral-400 line-through">
                    ₹{product.price.toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <span className={`text-2xl font-bold ${isOutOfStock ? 'text-neutral-400' : 'text-neutral-900'}`}>
                ₹{product.price.toFixed(2)}
              </span>
            )}
          </div>
          
          {/* Low stock indicator */}
          {product.inStock && product.stock !== undefined && product.stock > 0 && product.stock < 20 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-amber-600">
                Only {product.stock} left in stock
              </p>
            </div>
          )}
        </div>
      </Link>

      {/* Add to Cart button or Unavailable message */}
      <div className="border-t border-neutral-100 bg-neutral-50/50 px-5 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-4.5">
        {isOutOfStock ? (
          <button
            type="button"
            disabled
            className="flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-neutral-200 px-5 py-3 text-sm font-semibold text-neutral-400 opacity-60"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            Out of Stock
          </button>
        ) : product.inStock ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              addItem(product, 1)
            }}
            className="flex w-full items-center justify-center rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-primary-600/20 transition-all duration-200 hover:bg-primary-700 hover:shadow-md hover:shadow-primary-600/30 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Add to Cart
          </button>
        ) : (
          <div className="flex w-full items-center justify-center rounded-xl bg-neutral-100 px-5 py-3 text-sm font-semibold text-neutral-500">
            Currently unavailable
          </div>
        )}
      </div>
    </article>
  )
}

