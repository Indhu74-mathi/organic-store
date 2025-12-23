import { valueCards } from '@/lib/data/values'

export default function WhyChooseUsSection() {
  return (
    <section id="why-choose-us" className="py-16 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            Why Choose Us
          </h2>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-neutral-600">
            We&apos;re committed to bringing you the best organic products with
            transparency and care.
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {valueCards.map((card) => (
            <div
              key={card.title}
              className="group rounded-2xl border border-neutral-200/80 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-neutral-900/5"
            >
              <div className="mb-5 text-5xl transition-transform duration-300 group-hover:scale-110">
                {card.icon}
              </div>
              <h3 className="mb-3 text-xl font-semibold text-neutral-900">
                {card.title}
              </h3>
              <p className="text-base leading-relaxed text-neutral-600">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

