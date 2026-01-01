'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const HERO_IMAGES = [
  {
    src: '/image0.png',
    alt: 'Millet products showcase - Traditional millets and grains',
  },
  {
    src: '/image1.png',
    alt: 'Millet products showcase - Premium quality millet foods',
  },
  {
    src: '/image2.png',
    alt: 'Millet products showcase - Nutritious and healthy options',
  },
  {
    src: '/image3.png',
    alt: 'Millet products showcase - Authentic millet collection',
  },
  {
    src: '/image4.png',
    alt: 'Millet products showcase - Trusted millet products',
  },
]

const TRANSITION_DURATION = 5000 // 5 seconds

export default function HeroImageCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isReducedMotion, setIsReducedMotion] = useState(false)

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setIsReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Auto-transition logic
  useEffect(() => {
    if (isReducedMotion) {
      // Don't auto-transition if user prefers reduced motion
      return
    }

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % HERO_IMAGES.length)
    }, TRANSITION_DURATION)

    return () => clearInterval(interval)
  }, [isReducedMotion])

  return (
    <section
      className="relative -mx-4 mb-0 mt-0 w-[calc(100%+2rem)] sm:-mx-6 sm:w-[calc(100%+3rem)] lg:-mx-8 lg:w-[calc(100%+4rem)]"
      aria-label="Hero image carousel"
    >
      <div
        className="relative overflow-hidden"
        style={{
          height: 'clamp(50vh, 65vh, 75vh)',
          minHeight: '250px',
        }}
      >
        {HERO_IMAGES.map((image, index) => {
          const isActive = index === currentIndex

          return (
            <Link
              key={image.src}
              href="/shop"
              className="absolute inset-0 transition-all duration-[3000ms] ease-in-out cursor-pointer"
              style={{
                opacity: isActive ? 1 : 0,
                zIndex: isActive ? 1 : 0,
                filter: isActive ? 'blur(0px) brightness(0.98)' : 'blur(4px) brightness(0.95)',
                transform: isActive ? 'scale(1)' : 'scale(1.05)',
              }}
              aria-hidden={!isActive}
              aria-label="Browse our malt and traditional products"
            >
              <div 
                className="absolute inset-0"
                style={{
                  filter: 'brightness(0.98) contrast(1.02) saturate(1.03)',
                }}
              >
                <Image
                  src={image.src}
                  alt={isActive ? image.alt : ''}
                  fill
                  priority={index === 0}
                  className="object-cover"
                  sizes="100vw"
                />
              </div>
              {/* Top and bottom fade gradients for seamless blending */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `
                    linear-gradient(to bottom, 
                      rgba(255,255,255,0.4) 0%, 
                      rgba(255,255,255,0.15) 8%, 
                      transparent 15%, 
                      transparent 85%, 
                      rgba(0,0,0,0.15) 92%, 
                      rgba(0,0,0,0.3) 100%
                    )
                  `,
                }}
              />
            </Link>
          )
        })}
        {/* Side edge fade gradients for seamless blending */}
        <div 
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: `
              linear-gradient(to right, 
                rgba(255,255,255,0.3) 0%, 
                transparent 5%, 
                transparent 95%, 
                rgba(255,255,255,0.3) 100%
              )
            `,
          }}
        />
      </div>
    </section>
  )
}

