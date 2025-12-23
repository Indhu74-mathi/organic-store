'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from './AuthContext'

/**
 * RequireAuth - Authentication Guard Component
 *
 * Protects routes by requiring authentication.
 * Redirects unauthenticated users to login page with return URL.
 *
 * Features:
 * - Shows loading state while auth is being checked
 * - Redirects to /auth/login with ?redirect=<current-path> if not authenticated
 * - Renders children if user is authenticated
 * - Prevents infinite redirect loops
 * - No hydration issues (uses useEffect for redirects)
 * - Never shows white screens (always renders something)
 *
 * Usage:
 * ```tsx
 * <RequireAuth>
 *   <ProtectedPageContent />
 * </RequireAuth>
 * ```
 *
 * IMPORTANT:
 * - Do NOT use this on /auth/login or /auth/register pages
 * - This component does NOT modify AuthContext or Header
 * - Redirects happen client-side only (no SSR redirects)
 */

interface RequireAuthProps {
  children: React.ReactNode
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isLoading } = useAuth()
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    // Mark as checked after mount to prevent hydration issues
    setHasChecked(true)
  }, [])

  useEffect(() => {
    // Only redirect after component has mounted and auth state is loaded
    if (!hasChecked || isLoading) {
      return
    }

    // Prevent redirect loops - don't redirect if already on login/register pages
    if (pathname?.startsWith('/auth/')) {
      return
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      const redirectUrl = pathname ? `/auth/login?redirect=${encodeURIComponent(pathname)}` : '/auth/login'
      router.push(redirectUrl)
    }
  }, [isAuthenticated, isLoading, hasChecked, pathname, router])

  // Show loading state while checking authentication
  if (!hasChecked || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-600" />
          <p className="text-sm text-neutral-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Prevent rendering children if not authenticated (redirect is in progress)
  // This prevents flash of protected content
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-600" />
          <p className="text-sm text-neutral-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // User is authenticated - render children
  return <>{children}</>
}

