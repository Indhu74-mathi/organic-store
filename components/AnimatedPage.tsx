'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { ReactNode, useEffect, useState } from 'react'

interface AnimatedPageProps {
  children: ReactNode
  className?: string
}

/**
 * AnimatedPage - A reusable wrapper component for page transitions
 * Provides subtle fade + slide animations that work with Next.js App Router
 * Respects prefers-reduced-motion and softens motion on small screens.
 */
export default function AnimatedPage({ children, className = '' }: AnimatedPageProps) {
  const shouldReduceMotion = useReducedMotion()
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia('(min-width: 768px)')

    const updateMatch = () => setIsDesktop(mediaQuery.matches)
    updateMatch()

    mediaQuery.addEventListener('change', updateMatch)
    return () => mediaQuery.removeEventListener('change', updateMatch)
  }, [])

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  const offset = isDesktop ? 18 : 10

  return (
    <motion.div
      initial={{ opacity: 0, y: offset }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -offset }}
      transition={{
        duration: 0.35,
        ease: [0.4, 0, 0.2, 1], // Custom easing for smooth, professional feel
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

