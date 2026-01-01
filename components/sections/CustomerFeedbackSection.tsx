'use client'

const feedbacks = [
  {
    rating: 5,
    text: 'Switching to these products has been a game-changer for our family. The quality is exceptional, and I feel confident knowing exactly what we\'re eating. The malt products are perfect for our morning routine.',
    customerName: 'Priya Sharma',
    subtitle: 'Verified Buyer',
  },
  {
    rating: 5,
    text: 'As a health-conscious parent, finding trustworthy malt products was challenging. This store has become our go-to. The products are authentic, well-packaged, and the customer service is outstanding. Highly recommend!',
    customerName: 'Rajesh Kumar',
    subtitle: 'Verified Buyer',
  },
  {
    rating: 5,
    text: 'The quality and taste of these malt products is unmatched. We\'ve been using them for months now, and the difference in taste and nutrition is remarkable. Worth every rupee for our family\'s health. Loved the quality of the products.',
    customerName: 'Anjali Patel',
    subtitle: 'Verified Buyer',
  },
]

export default function CustomerFeedbackSection() {
  return (
    <section className="relative bg-neutral-50 py-16 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            Loved by families who care about what they eat
          </h2>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-neutral-600">
            Real feedback from customers who chose healthier, traditional malt and food products.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
          {feedbacks.map((feedback, index) => (
            <div
              key={index}
              className="group rounded-2xl bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 sm:p-8"
            >
              {/* Star Rating */}
              <div className="mb-4 flex items-center gap-1">
                {[...Array(feedback.rating)].map((_, i) => (
                  <svg
                    key={i}
                    className="h-5 w-5 fill-amber-400 text-amber-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Feedback Text */}
              <p className="mb-6 text-base leading-relaxed text-neutral-700">
                &ldquo;{feedback.text}&rdquo;
              </p>

              {/* Customer Info */}
              <div className="border-t border-neutral-100 pt-4">
                <p className="font-semibold text-neutral-900">
                  {feedback.customerName}
                </p>
                {feedback.subtitle && (
                  <p className="mt-1 text-sm text-neutral-500">
                    {feedback.subtitle}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

