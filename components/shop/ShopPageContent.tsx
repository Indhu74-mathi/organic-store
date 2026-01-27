'use client'

import AnimatedPage from '@/components/AnimatedPage'
import ProductCard from '@/components/products/ProductCard'
import ShopFilters from '@/components/shop/ShopFilters'
import { useMemo, useState, useEffect } from 'react'
import type { Product } from '@/types'
import { getCinematicImage } from '@/lib/product-images'

export default function ShopPageContent() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch products from database API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Add cache-busting timestamp to ensure fresh data
        const response = await fetch(`/api/products?t=${Date.now()}`, {
          cache: 'no-store',
        })
        if (!response.ok) {
          throw new Error('Failed to load products')
        }
        const data = await response.json()
        // Map database products to Product type
        const mappedProducts: Product[] = (data.products || []).map((p: {
          product_id: string
          title: string
          description: string
          original_price: number
          sale_price: number
          category: string
          primary_image: string
          additional_images: string[]
          availability: number
          link: string
        }) => {
          // Remove weight suffix from title (e.g., "Red Banana Malt - 80g" -> "Red Banana Malt")
          const cleanTitle = p.title.replace(/\s*-\s*\d+g\s*$/i, '').trim()

          return {
            id: p.product_id,
            slug: p.link ? p.link.split('/').pop() || '' : '',
            name: cleanTitle,
            description: p.description,
            price: p.sale_price,
            discountPercent: null,
            category: p.category || 'Uncategorized',
            image: p.primary_image,
            images: p.additional_images,
            inStock: p.availability > 0,
            stock: p.availability,
          }
        })

        // Group products by name and track variant count + lowest price
        const productGroups = mappedProducts.reduce((acc: Map<string, Product[]>, product) => {
          const existing = acc.get(product.name) || []
          existing.push(product)
          acc.set(product.name, existing)
          return acc
        }, new Map())

        // Create unique products with variant count and lowest price
        const uniqueProducts = Array.from(productGroups.entries()).map(([_, variants]) => {
          // Find the variant with the lowest price
          const lowestPriceVariant = variants.reduce((lowest: Product, current: Product) =>
            current.price < lowest.price ? current : lowest
          )

          // Return the lowest price variant with variant count added
          return {
            ...lowestPriceVariant,
            variantCount: variants.length,
          }
        })

        const productsWithCinematicImages = uniqueProducts.map(product => ({
          ...product,
          image: getCinematicImage(product)
        }))

        setProducts(productsWithCinematicImages)
      } catch (err) {
        console.error('[Shop] Failed to load products:', err)
        setError(err instanceof Error ? err.message : 'Failed to load products')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()

    // Refetch when page becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchProducts()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const categories = useMemo(
    () =>
      Array.from(new Set(products.map((product) => product.category))).sort(),
    [products]
  )

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    )
  }

  const clearFilters = () => setSelectedCategories([])

  const filteredProducts =
    selectedCategories.length === 0
      ? products
      : products.filter((product) => selectedCategories.includes(product.category))

  return (
    <AnimatedPage>
      <section className="py-10 sm:py-12 lg:py-16">
        <div className="mb-8 text-center sm:mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            Shop Organic Food
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-neutral-600 sm:text-base">
            Browse our selection of thoughtfully sourced organic essentials. Filters help
            you quickly find what you&apos;re looking for.
          </p>
        </div>

        {/* Mobile filters toggle */}
        <div className="mb-6 flex items-center justify-between md:hidden">
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen((open) => !open)}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-800 shadow-sm focus:outline-none focus:outline-none"
          >
            <span>Filters</span>
            <span className="text-xs text-neutral-500">
              {selectedCategories.length > 0
                ? `${selectedCategories.length} selected`
                : 'All categories'}
            </span>
          </button>
        </div>

        {isMobileFiltersOpen && (
          <div className="mb-6 md:hidden">
            <ShopFilters
              categories={categories}
              selectedCategories={selectedCategories}
              onToggleCategory={toggleCategory}
              onClear={clearFilters}
              variant="mobile"
            />
          </div>
        )}

        <div className="flex flex-col gap-8 md:flex-row md:items-start">
          {/* Desktop sidebar filters */}
          <div className="hidden md:block md:w-64 md:shrink-0">
            <ShopFilters
              categories={categories}
              selectedCategories={selectedCategories}
              onToggleCategory={toggleCategory}
              onClear={clearFilters}
              variant="desktop"
            />
          </div>

          {/* Products grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-600" />
                  <p className="text-sm text-neutral-600">Loading products...</p>
                </div>
              </div>
            ) : error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                {error}
              </div>
            ) : (
              <>
                <div className="grid gap-3 grid-cols-2 sm:gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {filteredProducts.length === 0 && (
                  <div className="mt-8 text-center text-sm text-neutral-500">
                    No products match the selected filters.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </AnimatedPage>
  )
}
