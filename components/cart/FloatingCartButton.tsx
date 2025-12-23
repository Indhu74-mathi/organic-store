'use client'

import { useCart } from '@/components/cart/CartContext'

export default function FloatingCartButton() {
  const { items, toggle } = useCart()
  const count = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-40 mb-[env(safe-area-inset-bottom)] mr-[env(safe-area-inset-right)] sm:bottom-24 sm:right-6">
      <button
        type="button"
        onClick={toggle}
        aria-label="Open cart"
        className="pointer-events-auto inline-flex items-center justify-center rounded-full bg-neutral-900/90 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-neutral-900/40 transition-all duration-300 ease-smooth hover:-translate-y-0.5 hover:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-50"
      >
        <span className="mr-2 text-base" aria-hidden="true">
          🛒
        </span>
        <span>Cart</span>
        {count > 0 && (
          <span className="ml-2 inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-primary-600 px-1 text-xs font-semibold text-white">
            {count}
          </span>
        )}
      </button>
    </div>
  )
}


