export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center py-16">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-neutral-900 dark:text-neutral-50 sm:text-7xl">
          404
        </h1>
        <p className="mb-8 text-lg text-neutral-600 dark:text-neutral-400">
          Page not found
        </p>
        <a
          href="/"
          className="inline-block rounded-lg bg-primary-600 px-6 py-3 font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-950"
        >
          Return home
        </a>
      </div>
    </div>
  )
}

