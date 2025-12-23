export default function VideoPlaceholderSection() {
  return (
    <section className="py-6 sm:py-8 lg:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-3xl border border-dashed border-neutral-200 bg-gradient-to-br from-neutral-50 via-neutral-50 to-neutral-100 px-6 py-10 sm:px-10 sm:py-12">
          <div className="space-y-3 text-center sm:space-y-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
              Upcoming
            </p>
            <p className="text-lg font-semibold text-neutral-900 sm:text-xl">
              Video Placeholder
            </p>
            <p className="mx-auto max-w-2xl text-sm text-neutral-600 sm:text-base">
              This space will soon feature a calm, autoplaying muted video
              that quietly showcases our farms, ingredients, and sourcing
              process—designed to build trust without distracting from your
              shopping experience.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}


