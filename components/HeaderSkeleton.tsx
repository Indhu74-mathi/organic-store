/**
 * HeaderSkeleton - Minimal fallback for Header component
 *
 * Lightweight skeleton that matches Header structure to prevent layout shift.
 * Used as Suspense fallback to ensure navigation never results in blank screens.
 */
export default function HeaderSkeleton() {
  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-neutral-200/80 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60"
      role="banner"
    >
      <nav
        className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8"
        aria-label="Main navigation"
      >
        {/* Brand skeleton */}
        <div className="flex items-center">
          <div className="h-6 w-32 animate-pulse rounded bg-neutral-200" />
        </div>

        {/* Desktop navigation skeleton */}
        <div className="hidden items-center gap-6 md:flex">
          <div className="h-4 w-12 animate-pulse rounded bg-neutral-200" />
          <div className="h-4 w-16 animate-pulse rounded bg-neutral-200" />
          <div className="h-4 w-20 animate-pulse rounded bg-neutral-200" />
        </div>

        {/* Mobile menu button skeleton */}
        <div className="md:hidden">
          <div className="h-6 w-6 animate-pulse rounded bg-neutral-200" />
        </div>
      </nav>
    </header>
  )
}

