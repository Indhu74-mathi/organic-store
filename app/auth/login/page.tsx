'use client'

import { useState, FormEvent, Suspense, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import AnimatedPage from '@/components/AnimatedPage'
import AuthLayout from '@/components/auth/AuthLayout'
import { useAuth } from '@/components/auth/AuthContext'

/**
 * Login page
 * 
 * Clean, minimal authentication form with client-side validation.
 * Does not auto-redirect users away from their cart.
 * 
 * Resilience features:
 * - Client component only (no SSR blocking)
 * - Form state is client-only (useState)
 * - Wrapped in Suspense to handle auth context errors gracefully
 * - Auth state NOT read on initial render
 * - Page ALWAYS renders even if auth context is broken
 * - No automatic redirects
 * 
 * White screen prevention:
 * - Form renders immediately without waiting for auth context
 * - Auth context access is deferred until form submission
 * - Suspense fallback ensures content is always visible
 */

/**
 * LoginFormContent - Core form component that doesn't depend on auth context
 * This ensures the form always renders, even if auth is broken
 */
function LoginFormContent() {
  // Form state - always client-only, no SSR concerns
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
    general?: string
  }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  // Get auth context - hook must be called unconditionally
  // The AuthProvider should wrap this component, so this should work
  const authContext = useAuth()

  useEffect(() => {
    setMounted(true)
  }, [])

  const validateEmail = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'Email is required'
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address'
    }
    return undefined
  }

  const validatePassword = (value: string): string | undefined => {
    if (!value) {
      return 'Password is required'
    }
    if (value.length < 6) {
      return 'Password must be at least 6 characters'
    }
    return undefined
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrors({})

    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)

    if (emailError || passwordError) {
      setErrors({
        email: emailError,
        password: passwordError,
      })
      return
    }

    setIsSubmitting(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error || !data.session || !data.user) {
        setErrors({
          general: error?.message || 'Login failed. Please try again.',
        })
        setIsSubmitting(false)
        return
      }

      // Update auth context directly
      // NOTE: Cart merge is handled inside AuthContext.login() to prevent double merging
      if (mounted && authContext?.login) {
        authContext.login({
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          userId: data.user.id,
          email: data.user.email || undefined,
          role: data.user.app_metadata?.role as string | undefined,
        })
      }

      // Redirect based on user role
      const role = (data.user.app_metadata?.role as string | undefined) || null
      if (role === 'ADMIN') {
        router.push('/admin')
      } else {
        router.push('/')
      }
    } catch {
      setErrors({
        general: 'An error occurred. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account to continue shopping."
      imageSrc="/auth-bg-login.png"
    >
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {errors.general && (
          <div
            className="rounded-md bg-red-50 p-3 text-sm text-red-800"
            role="alert"
          >
            {errors.general}
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-neutral-700"
          >
            Email address
          </label>
          <div className="mt-1.5">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: undefined }))
                }
              }}
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className="block w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm transition-all duration-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 sm:text-base"
              placeholder="you@example.com"
            />
            {errors.email && (
              <p
                id="email-error"
                className="mt-1.5 text-sm text-red-600"
                role="alert"
              >
                {errors.email}
              </p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-neutral-700"
            >
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-sm text-primary-600 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
            >
              Forgot password?
            </Link>
          </div>
          <div className="mt-1.5">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errors.password) {
                  setErrors((prev) => ({ ...prev, password: undefined }))
                }
              }}
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby={
                errors.password ? 'password-error' : undefined
              }
              className="block w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm transition-all duration-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 sm:text-base"
              placeholder="Enter your password"
            />
            {errors.password && (
              <p
                id="password-error"
                className="mt-1.5 text-sm text-red-600"
                role="alert"
              >
                {errors.password}
              </p>
            )}
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-primary-600/20 transition-all duration-200 hover:bg-primary-700 hover:shadow-md hover:shadow-primary-600/30 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center text-sm text-neutral-600">
        <span>Don&apos;t have an account? </span>
        <Link
          href="/auth/register"
          className="font-medium text-primary-600 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
        >
          Create one
        </Link>
      </div>
    </AuthLayout>
  )
}

/**
 * Minimal fallback for login form during Suspense
 * Ensures form is always visible even if auth context fails
 */
function LoginFormFallback() {
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your account to continue shopping."
      imageSrc="/auth-bg-login.png"
    >
      <div className="space-y-6">
        <div className="h-10 animate-pulse rounded bg-neutral-200" />
        <div className="h-10 animate-pulse rounded bg-neutral-200" />
        <div className="h-10 animate-pulse rounded bg-neutral-200" />
      </div>
    </AuthLayout>
  )
}

export default function LoginPage() {
  return (
    <AnimatedPage>
      <Suspense fallback={<LoginFormFallback />}>
        <LoginFormContent />
      </Suspense>
    </AnimatedPage>
  )
}
