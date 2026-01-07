'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Image from 'next/image'

const TESTIMONIALS = [
    {
        id: 1,
        name: 'Priya S.',
        location: 'Coimbatore',
        text: 'The millet malt is absolutely delicious! My kids love having it every morning. It feels good to give them something so healthy and traditional.',
        rating: 5,
        avatar: null, // Placeholder to use initials
    },
    {
        id: 2,
        name: 'Ramesh K.',
        location: 'Chennai',
        text: 'Authentic taste, just like my grandmother used to make. The saadha podi is a life saver for quick dinners. Highly recommended!',
        rating: 5,
        avatar: null,
    },
    {
        id: 3,
        name: 'Anitha R.',
        location: 'Bangalore',
        text: 'I switched to Millets N Joy products a month ago and I can feel the difference. Very fresh and high quality. Packaging was excellent too.',
        rating: 5,
        avatar: null,
    },
]

export default function TestimonialsSection() {
    const containerRef = useRef<HTMLDivElement>(null)
    const isInView = useInView(containerRef, { once: true, margin: '-100px' })

    return (
        <section ref={containerRef} className="relative py-16 sm:py-24 overflow-hidden bg-neutral-50/50">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6 }}
                        className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl"
                    >
                        Loved by Families
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="mt-4 text-lg text-neutral-600"
                    >
                        Don&apos;t just take our word for it. Here&apos;s what our community says about bringing tradition back to their tables.
                    </motion.p>
                </div>

                <div className="mx-auto grid max-w-2xl grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
                    {TESTIMONIALS.map((testimonial, index) => (
                        <motion.div
                            key={testimonial.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.6, delay: index * 0.1 + 0.2 }}
                            className="flex flex-col justify-between rounded-2xl bg-white p-6 shadow-sm ring-1 ring-neutral-200/50 sm:p-8"
                        >
                            <div>
                                <div className="flex gap-x-1 text-primary-500">
                                    {[...Array(5)].map((_, i) => (
                                        <svg key={i} className="h-5 w-5 flex-none" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.453 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
                                        </svg>
                                    ))}
                                </div>
                                <div className="mt-6 text-base text-neutral-700 leading-relaxed">
                                    &quot;{testimonial.text}&quot;
                                </div>
                            </div>
                            <div className="mt-8 border-t border-neutral-100 pt-6">
                                <div className="flex items-center gap-x-4">
                                    <div className="h-10 w-10 flex-none rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                                        {testimonial.name.slice(0, 2)}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-neutral-900">{testimonial.name}</div>
                                        <div className="text-sm text-neutral-500">{testimonial.location}</div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Video Testimonials Placeholder */}
                <div className="mt-16 sm:mt-24">
                    <div className="mx-auto max-w-2xl text-center mb-8">
                        <h3 className="text-2xl font-bold tracking-tight text-neutral-900">Video Stories</h3>
                    </div>
                    <div className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-2xl bg-neutral-900 shadow-xl lg:aspect-video aspect-[4/3]">
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6 ring-1 ring-white/40 group cursor-pointer transition-transform hover:scale-110">
                                <svg className="h-8 w-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            </div>
                            <p className="text-white font-medium text-lg">Customer Stories Coming Soon</p>
                            <p className="text-neutral-400 text-sm mt-2 max-w-md">We&apos;re gathering authentic stories from our happy customers. Stay tuned!</p>
                        </div>
                        {/* Abstract organic pattern background */}
                        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-neutral-800 to-neutral-900 opacity-50"></div>
                        <Image
                            src="/millet.png"
                            alt="Video placeholder"
                            fill
                            className="object-cover -z-20 opacity-30 mix-blend-overlay"
                        />
                    </div>
                </div>
            </div>
        </section>
    )
}
