'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'

interface FloatingElement {
  id: number
  image: string
  alt: string
  x: number // Random horizontal position (0-100%)
  delay: number // Random delay for staggered effect
  duration: number // Random duration for variation
  rotation: number // Random rotation angle
}

const ELEMENT_TYPES = [
  { image: '/millet.png', alt: 'Millet grain' },
  { image: '/nuts.png', alt: 'Nut' },
]

// Generate random floating elements
const generateElements = (count: number): FloatingElement[] => {
  return Array.from({ length: count }, (_, i) => {
    const randomIndex = Math.floor(Math.random() * ELEMENT_TYPES.length)
    const randomType = ELEMENT_TYPES[randomIndex]!
    return {
      id: i,
      image: randomType.image,
      alt: randomType.alt,
      x: Math.random() * 100, // 0-100% horizontal position
      delay: Math.random() * 0.5, // 0-0.5s delay
      duration: 3 + Math.random() * 2, // 3-5s duration
      rotation: (Math.random() - 0.5) * 360, // -180 to 180 degrees
    }
  })
}

export default function FloatingMillets() {
  const shouldReduceMotion = useReducedMotion()
  const [elements, setElements] = useState<FloatingElement[]>([])
  const [viewportHeight, setViewportHeight] = useState(1000)

  useEffect(() => {
    // Get viewport height for proper animation on all screen sizes
    const updateViewportHeight = () => {
      setViewportHeight(window.innerHeight)
    }
    updateViewportHeight()
    window.addEventListener('resize', updateViewportHeight)
    return () => window.removeEventListener('resize', updateViewportHeight)
  }, [])

  useEffect(() => {
    // Generate 18-22 elements (increased count for more millet and nuts)
    // Reduce count on smaller screens for better performance
    const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 768
    const count = isSmallScreen 
      ? Math.floor(Math.random() * 3) + 12 // 12-14 elements on mobile
      : Math.floor(Math.random() * 5) + 18 // 18-22 elements on desktop
    setElements(generateElements(count))
  }, [])

  // Only disable if user prefers reduced motion
  if (shouldReduceMotion) {
    return null
  }

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 10 }}
      aria-hidden="true"
    >
      {elements.map((element) => {
        const imageSize = 60 + Math.random() * 40 // Random size between 60-100px
        return (
          <motion.div
            key={element.id}
            className="absolute"
            style={{
              left: `${element.x}%`,
              bottom: '-10%', // Start below viewport
            }}
            initial={{
              y: 0,
              opacity: 0,
              rotate: element.rotation,
              scale: 0.5 + Math.random() * 0.5, // Random scale between 0.5-1.0
            }}
            animate={{
              y: [
                -viewportHeight * 1.2, // Rise up past viewport
                -viewportHeight * 1.2, // Pause at top
                viewportHeight * 0.1, // Fall back down
              ],
              opacity: [0, 0.8, 0.8, 0], // Fade in, stay visible, fade out - increased opacity
              rotate: [
                element.rotation,
                element.rotation + (Math.random() - 0.5) * 180, // Rotate while rising
                element.rotation + (Math.random() - 0.5) * 360, // More rotation while falling
              ],
            }}
            transition={{
              duration: element.duration,
              delay: element.delay,
              times: [0, 0.4, 1], // Spend 40% rising, 60% falling
              ease: [
                [0.25, 0.1, 0.25, 1], // Ease out for rising (slower at top)
                [0.25, 0.1, 0.25, 1], // Hold at top
                [0.55, 0.055, 0.675, 0.19], // Ease in for falling (gravity effect)
              ],
            }}
          >
            <Image
              src={element.image}
              alt={element.alt}
              width={imageSize}
              height={imageSize}
              className="opacity-90"
              style={{
                filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15))',
              }}
            />
          </motion.div>
        )
      })}
    </div>
  )
}

