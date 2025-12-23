'use client'

import { motion, useReducedMotion } from 'framer-motion'

export default function HeroSection() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <section className="relative py-16 sm:py-20 lg:py-28" style={{ border: 'none', boxShadow: 'none', outline: 'none' }}>
      <div className="relative mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
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
            Certified Organic
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
            Pure, honest food
            <span className="block mt-2 text-primary-600">
              from trusted farms
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
            Every product is carefully sourced from certified organic farms,
            independently verified for quality, and delivered with complete
            transparency. Food you can trust.
          </motion.p>

        </motion.div>
      </div>
    </section>
  )
}

