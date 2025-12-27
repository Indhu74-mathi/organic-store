'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const HERO_IMAGES = [
  {
    src: '/image0.png',
    alt: 'Organic products showcase - Farm fresh millets and grains',
  },
  {
    src: '/image1.png',
    alt: 'Organic products showcase - Premium quality organic foods',
  },
  {
    src: '/image2.png',
    alt: 'Organic products showcase - Natural and healthy options',
  },
  {
    src: '/image3.png',
    alt: 'Organic products showcase - Certified organic collection',
  },
  {
    src: '/image4.png',
    alt: 'Organic products showcase - Trusted organic brands',
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
      className="relative mx-auto mb-0 mt-8 w-full px-0 sm:mt-12"
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
              className="absolute inset-0 transition-opacity duration-1000 ease-in-out cursor-pointer"
              style={{
                opacity: isActive ? 1 : 0,
                zIndex: isActive ? 1 : 0,
              }}
              aria-hidden={!isActive}
              aria-label="Browse our organic products"
            >
              <Image
                src={image.src}
                alt={isActive ? image.alt : ''}
                fill
                priority={index === 0}
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
              />
            </Link>
          )
        })}
      </div>
    </section>
  )
}

