'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

// Selected product images for the cinematic reel
// Generated cinematic 16:9 backgrounds
const SLIDES = [
    {
        id: 1,
        image: '/hero-images/red-banana-v2.png',
        title: 'Red Banana Malt',
        subtitle: 'Nature\'s Sweetness, Pure Energy',
        description: 'Experience the unique nutritional benefits of red banana in a delicious, energizing malt.',
        color: 'from-amber-900/80 to-amber-600/40',
        link: '/shop/red-banana-malt'
    },
    {
        id: 2,
        image: '/hero-images/choco-ragi-v2.png',
        title: 'Choco Ragi Millet',
        subtitle: 'Healthy Meets Delicious',
        description: 'The perfect blend of nutritious finger millet and rich cocoa. Kids love it, moms trust it.',
        color: 'from-amber-950/80 to-stone-800/40',
        link: '/shop/choco-ragi-millet'
    },
    {
        id: 3,
        image: '/hero-images/abc-mix-v2.png',
        title: 'ABC Nutri Mix',
        subtitle: 'Apple, Beetroot, Carrot',
        description: 'A powerhouse of vitamins and minerals in one convenient, tasty mix for the whole family.',
        color: 'from-red-900/80 to-rose-700/40',
        link: '/shop/abc-nutri-mix'
    },
    {
        id: 4,
        image: '/hero-images/chilli-chatag-v2.png',
        title: 'Chilli Chatag',
        subtitle: 'Spicy Millet Crackle',
        description: 'Spice up your day with the fiery crunch of millet and chili. The perfect guilt-free snack.',
        color: 'from-orange-800/80 to-red-600/40',
        link: '/shop/chilli-chatag'
    },
    {
        id: 5,
        image: '/hero-images/masala-stick-v2.png',
        title: 'Masala Stick',
        subtitle: 'Savory Spice Burst',
        description: 'Authentic Indian spices blended with wholesome millets. A savory treat for every palate.',
        color: 'from-yellow-800/80 to-amber-600/40',
        link: '/shop/masala-stick'
    },
    {
        id: 6,
        image: '/hero-images/tangy-tomato-v2.png',
        title: 'Tangy Tomato',
        subtitle: 'Zesty Garden Fresh',
        description: 'Bursting with the fresh taste of ripe tomatoes and herbs. A tangy twist on healthy snacking.',
        color: 'from-red-800/80 to-rose-600/40',
        link: '/shop/tangy-tomato'
    }
]

export default function CinematicHeroSection() {
    const [currentIndex, setCurrentIndex] = useState(0)

    // Auto-advance slides
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % SLIDES.length)
        }, 6000) // 6 seconds per slide for cinematic feel

        return () => clearInterval(timer)
    }, [])

    const slide = SLIDES[currentIndex] || SLIDES[0]
    if (!slide) return null

    return (
        <div className="relative h-[40vh] sm:h-[60vh] md:h-[85vh] w-full overflow-hidden bg-black">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    className="relative h-full w-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5, ease: 'easeInOut' }} // Slow crossfade
                >
                    {/* Background Image with Ken Burns Effect - Clickable */}
                    <Link href={slide.link} className="absolute inset-0 z-0 cursor-pointer">
                        <motion.div
                            className="relative h-full w-full"
                            initial={{ scale: 1.1, x: '0%', y: '0%' }}
                            animate={{
                                scale: 1.0,
                                x: currentIndex % 2 === 0 ? '2%' : '-2%', // Subtle pan
                                y: currentIndex % 3 === 0 ? '2%' : '-2%'
                            }}
                            transition={{ duration: 7, ease: 'linear' }} // Continuous movement
                        >
                            <Image
                                src={slide.image}
                                alt={slide.title}
                                fill
                                className="object-cover object-center"
                                priority
                                quality={100}
                            />
                        </motion.div>
                    </Link>

                    {/* Cinematic Overlay Gradient - Darker for readability over full photos */}
                    <div className="absolute inset-0 z-10 bg-black/40 md:bg-black/30 pointer-events-none" />
                    <div className={`absolute inset-0 z-10 bg-gradient-to-r ${slide.color} via-transparent to-transparent opacity-70 mix-blend-multiply pointer-events-none`} />
                    <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/90 via-black/20 to-black/30 pointer-events-none" />

                    {/* Text Content */}
                    <div className="absolute inset-0 z-20 flex flex-col justify-center px-6 sm:px-12 md:px-20 lg:px-32 pointer-events-none">
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.8 }}
                            className="max-w-2xl"
                        >
                            <motion.span
                                className="mb-4 inline-block rounded-full bg-white/20 px-4 py-1 text-sm font-medium text-white backdrop-blur-sm border border-white/10"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.8 }}
                            >
                                {slide.subtitle}
                            </motion.span>

                            <motion.h1
                                className="mb-4 md:mb-6 text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold leading-tight text-white tracking-tight drop-shadow-lg"
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 1, duration: 0.8 }}
                            >
                                {slide.title}
                            </motion.h1>

                            <motion.p
                                className="mb-8 md:mb-10 text-base sm:text-lg md:text-xl lg:text-2xl font-light leading-relaxed max-w-xl drop-shadow-md text-gray-100"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.2, duration: 0.8 }}
                            >
                                {slide.description}
                            </motion.p>
                        </motion.div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Progress Indicators */}
            <div className="absolute bottom-6 md:bottom-10 left-0 right-0 z-30 flex justify-center gap-3">
                {SLIDES.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`h-1 md:h-1.5 w-8 md:w-12 rounded-full transition-all duration-300 ${idx === currentIndex ? 'bg-white opacity-100' : 'bg-white/30 opacity-50 hover:bg-white/50'
                            }`}
                        aria-label={`Go to slide ${idx + 1}`}
                    />
                ))}
            </div>
        </div>
    )
}
