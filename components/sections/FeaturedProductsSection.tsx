'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Product } from '@/types'
import { useReducedMotion } from 'framer-motion'

export default function FeaturedProductsSection() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const shouldReduceMotion = useReducedMotion()
  const carouselRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLElement | null)[]>([])
  
  // Single source of truth for carousel position
  const positionX = useRef<number>(0)
  const lastUpdateTime = useRef<number>(Date.now())
  const isInteracting = useRef<boolean>(false)
  const dragStartX = useRef<number>(0)
  const lastDragX = useRef<number>(0)
  const animationFrameRef = useRef<number | null>(null)
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const dragDistance = useRef<number>(0)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products?includeOutOfStock=true')
        if (!response.ok) {
          throw new Error('Failed to load products')
        }
        const data = await response.json()
        const mappedProducts: Product[] = (data.products || []).map((p: {
          id: string
          slug: string
          name: string
          description: string
          price: number
          discountPercent?: number | null
          category: string
          imageUrl: string
          stock: number
          inStock: boolean
        }) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          description: p.description,
          price: p.price,
          discountPercent: p.discountPercent,
          category: p.category,
          image: p.imageUrl,
          inStock: p.inStock,
          stock: p.stock,
        }))
        setProducts(mappedProducts)
      } catch (err) {
        console.error('[Featured Products] Failed to load products:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [])

  // Duplicate products for seamless infinite loop (3 sets)
  const duplicatedProducts = products.length > 0 
    ? [...products, ...products, ...products]
    : []
  
  // Calculate item width for seamless reset
  const getItemWidth = () => {
    if (typeof window === 'undefined') return 212
    if (window.innerWidth >= 1024) return 266 // 250px + 16px padding
    if (window.innerWidth >= 640) return 236 // 220px + 16px padding
    return 212 // 180px + 32px padding
  }
  
  const itemWidth = getItemWidth()
  const oneSetWidth = products.length > 0 ? products.length * itemWidth : 0

  // Drag handlers - directly mutate positionX
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    isInteracting.current = true
    setIsDragging(true)
    dragDistance.current = 0
    const clientX = 'touches' in e && e.touches[0] ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    dragStartX.current = clientX
    lastDragX.current = clientX
    lastUpdateTime.current = Date.now()
  }

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return
    e.preventDefault()
    e.stopPropagation()
    
    const clientX = 'touches' in e && e.touches[0] ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const deltaX = clientX - lastDragX.current
    lastDragX.current = clientX
    
    // Directly mutate positionX (reversed direction)
    positionX.current -= deltaX
    dragDistance.current += Math.abs(deltaX)
    
    lastUpdateTime.current = Date.now()
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    // Keep isInteracting true briefly to allow smooth transition
    setTimeout(() => {
      isInteracting.current = false
    }, 100)
  }

  // Handle wheel/trackpad scroll - directly mutate positionX
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Only handle horizontal scrolling
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
      e.preventDefault()
      return
    }
    
    isInteracting.current = true
    
    // Directly mutate positionX (reversed direction)
    const scrollSpeed = 1.5
    const delta = -e.deltaX * scrollSpeed
    positionX.current += delta
    
    lastUpdateTime.current = Date.now()

    // Resume auto-scroll after user stops scrolling
    if (wheelTimeoutRef.current) {
      clearTimeout(wheelTimeoutRef.current)
    }
    
    wheelTimeoutRef.current = setTimeout(() => {
      isInteracting.current = false
    }, 1500)
  }

  // Continuous auto-scroll animation - single source of truth
  useEffect(() => {
    if (shouldReduceMotion || duplicatedProducts.length === 0 || oneSetWidth === 0) return

    const autoScrollSpeed = oneSetWidth / 40000 // pixels per millisecond (40 seconds per set)

    const animate = () => {
      const now = Date.now()
      const deltaTime = now - lastUpdateTime.current
      lastUpdateTime.current = now

      if (!isInteracting.current) {
        // Auto-scroll: move left continuously
        positionX.current -= autoScrollSpeed * deltaTime
      } else {
        // During interaction: slow down auto-scroll (10% speed)
        positionX.current -= autoScrollSpeed * deltaTime * 0.1
      }

      // Infinite loop via modulo - wrap around seamlessly
      if (positionX.current <= -oneSetWidth) {
        positionX.current += oneSetWidth
      } else if (positionX.current >= 0) {
        positionX.current -= oneSetWidth
      }

      // Force re-render to update transform
      if (carouselRef.current) {
        carouselRef.current.style.transform = `translateX(${positionX.current}px)`
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    lastUpdateTime.current = Date.now()
    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [duplicatedProducts.length, shouldReduceMotion, oneSetWidth])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current)
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // Update scaling based on viewport center
  useEffect(() => {
    if (shouldReduceMotion || duplicatedProducts.length === 0 || !carouselRef.current) return

    const updateScaling = () => {
      if (!carouselRef.current) return
      const viewportCenter = window.innerWidth / 2

      itemRefs.current.forEach((item) => {
        if (!item) return
        const rect = item.getBoundingClientRect()
        const itemCenter = rect.left + rect.width / 2
        const distanceFromCenter = Math.abs(itemCenter - viewportCenter)
        const maxDistance = window.innerWidth / 2
        const normalizedDistance = Math.min(distanceFromCenter / maxDistance, 1)
        
        // Scale: center = 1.15, edges = 0.9
        const scale = 1.15 - normalizedDistance * 0.25
        // Opacity: center = 1, edges = 0.5
        const opacity = 1 - normalizedDistance * 0.5

        item.style.transform = `scale(${scale})`
        item.style.opacity = `${opacity}`
      })
    }

    // Update on animation frame for smooth scaling
    let animationFrame: number
    const animate = () => {
      updateScaling()
      animationFrame = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [duplicatedProducts.length, shouldReduceMotion])

  if (isLoading) {
    return (
      <section id="products" className="relative py-16 sm:py-20 lg:py-28">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-600" />
            <p className="text-sm text-neutral-600">Loading products...</p>
          </div>
        </div>
      </section>
    )
  }

  if (products.length === 0) {
    return null
  }

  return (
    <section id="products" className="relative py-16 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            Our Products
          </h2>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-neutral-600">
            A carefully curated selection of everyday essentials made from the
            purest organic ingredients.
          </p>
        </div>

        {/* Shop Organic Foods Button - Positioned above carousel */}
        <div className="mb-8 flex justify-center relative z-20">
          <Link
            href="/shop"
            className="group relative inline-flex items-center justify-center rounded-full bg-primary-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-primary-600/20 transition-all duration-300 hover:bg-primary-700 hover:shadow-xl hover:shadow-primary-600/30 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:px-10 sm:py-4.5"
          >
            Shop Organic Foods
            <svg
              className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>

      </div>

      {/* Continuous horizontal infinite carousel - Full width from edge to edge */}
      <div 
        className="relative w-full overflow-hidden" 
        style={{ 
          marginLeft: 'calc(-50vw + 50%)', 
          marginRight: 'calc(-50vw + 50%)', 
          width: '100vw',
          touchAction: 'none', // Prevent all browser touch gestures
          overscrollBehaviorX: 'contain', // Prevent horizontal overscroll navigation
        }}
        onWheel={(e) => {
          // Prevent page scroll when scrolling carousel
          if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
            e.preventDefault()
            e.stopPropagation()
          }
        }}
        onTouchStart={(e) => {
          // Prevent browser swipe navigation
          if (e.touches.length === 1) {
            e.preventDefault()
            e.stopPropagation()
          }
        }}
        onTouchMove={(e) => {
          // Prevent browser swipe navigation
          if (e.touches.length === 1) {
            e.preventDefault()
            e.stopPropagation()
          }
        }}
      >
        <div
          className="relative h-[350px] sm:h-[400px] lg:h-[450px] overflow-hidden cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleDragStart(e)
          }}
          onTouchMove={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleDragMove(e)
          }}
          onTouchEnd={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleDragEnd()
          }}
          onTouchCancel={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleDragEnd()
          }}
          onWheel={handleWheel}
          style={{
            touchAction: 'none', // Completely disable browser touch gestures
            WebkitTouchCallout: 'none', // Disable iOS callout menu
            userSelect: 'none', // Prevent text selection
          }}
        >
            <div
              ref={carouselRef}
              className="flex items-center h-full will-change-transform"
              style={{
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              }}
            >
            {duplicatedProducts.map((product, index) => (
              <Link
                key={`${product.id}-${index}`}
                href="/shop"
                className="flex-shrink-0 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 carousel-item group"
                ref={(el) => {
                  itemRefs.current[index] = el
                }}
                onClick={(e) => {
                  // Prevent navigation if user was dragging
                  if (dragDistance.current > 5) {
                    e.preventDefault()
                  }
                  dragDistance.current = 0
                }}
              >
                <div className="relative h-[180px] w-[180px] sm:h-[220px] sm:w-[220px] lg:h-[250px] lg:w-[250px] bg-white rounded-2xl shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:scale-105 overflow-hidden pointer-events-none">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-contain p-4 sm:p-6 transition-opacity duration-300 group-hover:opacity-95"
                      sizes="(max-width: 640px) 180px, (max-width: 1024px) 220px, 250px"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-primary-50 via-neutral-50 to-primary-100" />
                  )}
                </div>
                <p className="mt-3 sm:mt-4 text-sm sm:text-base font-semibold text-neutral-900 text-center max-w-[160px] sm:max-w-[200px] line-clamp-2 group-hover:text-primary-600 transition-colors pointer-events-none">
                  {product.name}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
