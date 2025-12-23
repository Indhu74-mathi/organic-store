'use client'

import { useEffect } from 'react'
import Link from 'next/link'

/**
 * Global Error Boundary
 *
 * Catches all runtime crashes in the application and displays a friendly error UI.
 * This component is automatically used by Next.js App Router for error handling.
 *
 * Features:
 * - Logs error details to console for debugging
 * - Provides retry functionality to recover from errors
 * - Offers navigation options to escape the error state
 * - Ensures navigation can always recover
 * - Friendly, non-technical error message for users
 *
 * Error Recovery:
 * - reset() - Attempts to re-render the component tree (recovery)
 * - Navigation links - Allow users to navigate away from the error
 * - Home link - Always available as a fallback
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Log error details to console for debugging
  // This helps developers identify issues without exposing details to users
  useEffect(() => {
    console.error('[Error Boundary] Runtime error caught:', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      name: error.name,
      timestamp: new Date().toISOString(),
    })
  }, [error])

  const handleReset = () => {
    // Attempt to recover by re-rendering the component tree
    // This may resolve transient errors
    try {
      reset()
    } catch (resetError) {
      // If reset fails, log and allow navigation as fallback
      console.error('[Error Boundary] Reset failed:', resetError)
      // Navigation links below provide alternative recovery
    }
  }

  const handleGoHome = () => {
    // Navigate to home page - always safe and allows full recovery
    // Using window.location ensures a full page reload, clearing error state
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 py-16 sm:px-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-2xl font-semibold text-neutral-900 sm:text-3xl">
            Something went wrong
          </h1>
          <p className="text-sm text-neutral-600 sm:text-base">
            We encountered an unexpected error. Don&apos;t worry, your cart and
            account are safe.
          </p>
        </div>

        {/* Error details in development mode only */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-left">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-800">
              Error Details (Development Only)
            </p>
            <p className="mb-1 text-xs text-red-700">
              <span className="font-medium">Message:</span> {error.message}
            </p>
            {error.digest && (
              <p className="mb-1 text-xs text-red-700">
                <span className="font-medium">Digest:</span> {error.digest}
              </p>
            )}
            {error.stack && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium text-red-800">
                  Stack Trace
                </summary>
                <pre className="mt-2 max-h-40 overflow-auto rounded bg-red-100 p-2 text-xs text-red-900">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        )}

        <div className="space-y-3">
          {/* Retry button - attempts to recover from error */}
          <button
            onClick={handleReset}
            className="w-full rounded-md bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:text-base"
          >
            Try again
          </button>

          {/* Navigation options for recovery */}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/"
              onClick={handleGoHome}
              className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:text-base"
            >
              Go to home
            </Link>
            <Link
              href="/shop"
              className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:text-base"
            >
              Continue shopping
            </Link>
          </div>
        </div>

        {/* Help text */}
        <p className="mt-8 text-xs text-neutral-500">
          If this problem persists, please{' '}
          <Link
            href="/contact"
            className="font-medium text-primary-600 hover:text-primary-700 underline"
          >
            contact support
          </Link>
          .
        </p>
      </div>
    </div>
  )
}


