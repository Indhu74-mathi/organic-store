'use client'


export default function HeroSection() {

  return (
    <section className="relative py-16 sm:py-20 lg:py-28" style={{ border: 'none', boxShadow: 'none', outline: 'none' }}>
      <div className="relative mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
        <div className="text-center">
          {/* Premium badge */}
          <div
            className="mb-4 inline-block rounded-full border border-primary-200/60 bg-white/80 px-4 py-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.15em] text-primary-700 shadow-sm backdrop-blur-sm"
          >
            Premium Malt & Traditional Foods
          </div>

          {/* Main headline */}
          <h1
            className="mb-6 text-2xl font-bold tracking-tight text-neutral-900 sm:text-6xl lg:text-7xl"
          >
            Nutritious malt and millet products
            <span className="block mt-2 text-primary-600">
              made with care
            </span>
          </h1>

          {/* Supporting text */}
          <p
            className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-neutral-600 sm:text-xl"
          >
            Carefully crafted malt, saadha podi, and other traditional millet products.
            Quality ingredients, authentic preparation, and delivered with complete transparency. Food you can trust.
          </p>
        </div>
      </div>
    </section>
  )
}

