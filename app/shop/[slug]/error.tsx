'use client'

export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-neutral-900 mb-2">
          Something went wrong!
        </h2>
        <p className="text-neutral-600 mb-4">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Try again
        </button>
      </div>
    </div>
  )
}

