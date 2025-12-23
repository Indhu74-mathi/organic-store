'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { ReactNode, useEffect, useState } from 'react'

interface PageTransitionProps {
  children: ReactNode
}

/**
 * PageTransition - Handles page transitions in Next.js App Router
 * Wraps page content with smooth fade + slide animations
 * Uses pathname to trigger transitions on route changes
 * SSR-safe: Prevents flash of unstyled content on initial load
 * Respects prefers-reduced-motion and softens motion on small screens.
 */
export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  // Prevent animation on initial mount to avoid SSR hydration issues
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia('(min-width: 768px)')

    const updateMatch = () => setIsDesktop(mediaQuery.matches)
    updateMatch()

    mediaQuery.addEventListener('change', updateMatch)
    return () => mediaQuery.removeEventListener('change', updateMatch)
  }, [])

  if (shouldReduceMotion) {
    return <>{children}</>
  }

  const offset = isDesktop ? 18 : 10

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={isMounted ? { opacity: 0, y: offset } : false}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -offset }}
        transition={{
          duration: 0.35,
          ease: [0.4, 0, 0.2, 1],
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

