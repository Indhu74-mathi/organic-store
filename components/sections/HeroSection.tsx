'use client'

import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'

export default function HeroSection() {
  const shouldReduceMotion = useReducedMotion()
  const { scrollY } = useScroll()
  
  // Fade in as user scrolls down (starts at 100px, fully visible at 300px)
  const opacity = useTransform(scrollY, [100, 300], [0, 1])
  const y = useTransform(scrollY, [100, 300], [30, 0])

  return (
    <section className="relative py-16 sm:py-20 lg:py-28" style={{ border: 'none', boxShadow: 'none', outline: 'none' }}>
      <div className="relative mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          animate={shouldReduceMotion ? { opacity: 1, y: 0 } : undefined}
          style={shouldReduceMotion ? {} : { opacity, y }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.7,
            ease: [0.4, 0, 0.2, 1],
          }}
          className="text-center"
        >
          {/* Premium badge */}
          <motion.p
            initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.6,
              delay: shouldReduceMotion ? 0 : 0.2,
              ease: [0.4, 0, 0.2, 1],
            }}
            className="mb-6 inline-block rounded-full border border-primary-200/60 bg-white/80 px-5 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-primary-700 shadow-sm backdrop-blur-sm"
          >
            Premium Malt & Traditional Foods
          </motion.p>

          {/* Main headline */}
          <motion.h1
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.7,
              delay: shouldReduceMotion ? 0 : 0.3,
              ease: [0.4, 0, 0.2, 1],
            }}
            className="mb-6 text-5xl font-bold tracking-tight text-neutral-900 sm:text-6xl lg:text-7xl"
          >
            Nutritious malt and millet products
            <span className="block mt-2 text-primary-600">
              made with care
            </span>
          </motion.h1>

          {/* Supporting text */}
          <motion.p
            initial={shouldReduceMotion ? false : { opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.7,
              delay: shouldReduceMotion ? 0 : 0.4,
              ease: [0.4, 0, 0.2, 1],
            }}
            className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-neutral-600 sm:text-xl"
          >
            Carefully crafted malt, saadha podi, and other traditional millet products. 
            Quality ingredients, authentic preparation, and delivered with complete transparency. Food you can trust.
          </motion.p>

        </motion.div>
      </div>
    </section>
  )
}

