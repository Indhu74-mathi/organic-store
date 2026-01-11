'use client'

import Image from 'next/image'

const TESTIMONIALS = [
    {
        id: 1,
        name: 'Priya S.',
        city: 'Coimbatore',
        text: 'The millet malt is actually really good! My kids usually picky but they finish their glass every morning without complaining. It feels very fresh compared to the shop-bought ones.',
        rating: 5,
    },
    {
        id: 2,
        name: 'Ramesh K.',
        city: 'Chennai',
        text: 'The Saadha Podi tastes exactly like how my mother makes it. It’s a lifesaver for quick dinners after work. Highly recommend to anyone looking for real traditional taste.',
        rating: 5,
    },
    {
        id: 3,
        name: 'Anitha R.',
        city: 'Madurai',
        text: 'I’ve tried many organic brands, but Millets N Joy is different. The packaging is neat and the quality of the ABC nutri mix is top-notch. You can tell they use genuine ingredients.',
        rating: 5,
    },
    {
        id: 4,
        name: 'Suresh V.',
        city: 'Trichy',
        text: 'Love the health mix. It’s not too sweet and has a very rich, roasted aroma. Delivery was fast and arrived in perfect condition. Will definitely be a regular customer.',
        rating: 5,
    },
    {
        id: 5,
        name: 'Lakshmi P.',
        city: 'Salem',
        text: 'The coconut hearts are my absolute favorite snack now. It’s hard to find healthy treats that actually taste this delicious. My whole family is hooked!',
        rating: 5,
    },
    {
        id: 6,
        name: 'Vijay M.',
        city: 'Erode',
        text: 'Ordering was easy and the products are excellent value for money. The Red Banana Malt is a new favorite in our house. Tastes natural and very satisfying.',
        rating: 5,
    }
]

export default function TestimonialsSection() {
    return (
        <section id="feedback" className="relative py-20 sm:py-28 overflow-hidden bg-stone-50/80">
            {/* Background Accent Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-100/20 rounded-full blur-[120px] pointer-events-none -z-10" />

            <div className="mx-auto max-w-7xl px-6 lg:px-8 mb-16">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl">
                        Loved by Families
                    </h2>
                    <p className="mt-4 text-base sm:text-lg text-neutral-600">
                        Join thousands of happy families who have brought authentic tradition back to their modern tables.
                    </p>
                </div>
            </div>

            {/* Infinite Marquee Container */}
            <div className="relative flex overflow-hidden">
                <div className="flex animate-marquee hover:[animation-play-state:paused] whitespace-nowrap py-6 sm:py-10">
                    {/* First set of testimonials */}
                    {[...TESTIMONIALS, ...TESTIMONIALS].map((testimonial, index) => (
                        <div
                            key={`${testimonial.id}-${index}`}
                            className="inline-block w-[260px] sm:w-[380px] mx-3 sm:mx-6 whitespace-normal"
                        >
                            <div className="h-full flex flex-col justify-between rounded-[2rem] bg-white/50 backdrop-blur-xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-white/40 transition-all duration-700 hover:shadow-[0_20px_50px_rgba(34,197,94,0.12)] hover:bg-white/80 hover:-translate-y-2 group relative overflow-hidden">
                                {/* Decorative Background Quote */}
                                <div className="absolute top-6 right-6 text-primary-500/5 scale-[4] opacity-0 group-hover:opacity-100 transition-all duration-700 -rotate-12 pointer-events-none">
                                    <svg fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
                                        <path d="M14.017 21L14.017 18C14.017 16.899 15.011 15 16.011 15H19.011C19.563 15 20.011 14.552 20.011 14V11H15.011C14.459 11 14.011 10.552 14.011 10V5C14.011 4.448 14.459 4 15.011 4H20.011C20.563 4 21.011 4.448 21.011 5V14C21.011 16.761 18.772 21 15.011 21H14.017ZM3.011 21L3.011 18C3.011 16.899 4.005 15 5.005 15H8.005C8.557 15 9.005 14.552 9.005 14V11H4.005C3.453 11 3.005 10.552 3.005 10V5C3.005 4.448 3.453 4 4.005 4H9.005C9.557 4 10.005 4.448 10.005 5V14C10.005 16.761 7.766 21 4.005 21H3.011Z" />
                                    </svg>
                                </div>

                                <div className="relative z-10">
                                    <div className="flex gap-x-1.5 text-amber-400 mb-4 sm:mb-6">
                                        {[...Array(5)].map((_, i) => (
                                            <svg key={i} className="h-4 w-4 sm:h-5 sm:w-5 flex-none" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.453 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
                                            </svg>
                                        ))}
                                    </div>
                                    <div className="text-sm sm:text-lg text-neutral-800 leading-relaxed font-medium">
                                        &ldquo;{testimonial.text}&rdquo;
                                    </div>
                                </div>
                                <div className="mt-6 sm:mt-10 pt-4 sm:pt-6 border-t border-neutral-100/50 relative z-10">
                                    <div className="flex items-center gap-x-3 sm:gap-x-4">
                                        <div className="h-10 w-10 sm:h-12 sm:w-12 flex-none rounded-[1rem] bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center text-primary-700 font-bold text-base sm:text-lg shadow-sm border border-primary-200/50">
                                            {testimonial.name?.charAt(0) || 'U'}
                                            {testimonial.name?.split(' ')?.[1]?.charAt(0) || ''}
                                        </div>
                                        <div>
                                            <div className="font-bold text-neutral-900 text-sm sm:text-base tracking-tight">{testimonial.name}</div>
                                            <div className="text-xs font-semibold text-primary-600/80 uppercase tracking-widest">{testimonial.city}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Video Testimonials Placeholder - More integrated styling */}
            <div className="mt-12 sm:mt-24 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[2rem] bg-neutral-900 shadow-2xl lg:aspect-video aspect-[16/10] group">
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 sm:p-8 z-10">
                        <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-6 ring-1 ring-white/20 transition-all duration-500 group-hover:scale-110 group-hover:bg-primary-600 group-hover:ring-primary-400 cursor-pointer">
                            <svg className="h-8 w-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                        <h3 className="text-white font-bold text-xl sm:text-3xl mb-3">Customer Video Stories</h3>
                        <p className="text-neutral-400 text-sm sm:text-lg max-w-lg leading-relaxed">
                            Authentic moments from our community bringing tradition back to their modern tables. Coming soon!
                        </p>
                    </div>
                    {/* Abstract design elements */}
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent"></div>
                    <Image
                        src="/millet.png"
                        alt="Background pattern"
                        fill
                        className="object-cover opacity-20 scale-110 group-hover:scale-100 transition-transform duration-[2s]"
                    />
                </div>
            </div>
        </section>
    )
}
