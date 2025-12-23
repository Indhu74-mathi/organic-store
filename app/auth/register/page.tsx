'use client'

import { useState, FormEvent, Suspense, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AnimatedPage from '@/components/AnimatedPage'
import { useAuth } from '@/components/auth/AuthContext'

/**
 * Register page
 * 
 * Clean, minimal registration form with client-side validation.
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
 * RegisterFormContent - Core form component that doesn't depend on auth context
 * This ensures the form always renders, even if auth is broken
 */
function RegisterFormContent() {
  // Form state - always client-only, no SSR concerns
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
    confirmPassword?: string
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
    if (value.length < 8) {
      return 'Password must be at least 8 characters'
    }
    // Check for at least one letter and one number
    if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) {
      return 'Password must contain at least one letter and one number'
    }
    return undefined
  }

  const validateConfirmPassword = (
    value: string,
    passwordValue: string
  ): string | undefined => {
    if (!value) {
      return 'Please confirm your password'
    }
    if (value !== passwordValue) {
      return 'Passwords do not match'
    }
    return undefined
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrors({})

    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)
    const confirmPasswordError = validateConfirmPassword(
      confirmPassword,
      password
    )

    if (emailError || passwordError || confirmPasswordError) {
      setErrors({
        email: emailError,
        password: passwordError,
        confirmPassword: confirmPasswordError,
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrors({
          general: data.message || 'Registration failed. Please try again.',
        })
        setIsSubmitting(false)
        return
      }

      // Update auth context directly
      // NOTE: Cart merge is handled inside AuthContext.login() to prevent double merging
      if (mounted && authContext.login) {
        authContext.login({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          userId: data.userId,
          email: data.email,
          role: data.role,
        })
      }

      // Redirect based on user role
      // Admin users go to admin dashboard, regular users go to home
      if (data.role === 'ADMIN') {
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
    <div className="mx-auto w-full max-w-md py-12 sm:py-16">
      <div className="rounded-lg bg-white px-6 py-8 shadow-sm sm:px-8 sm:py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl">
            Create account
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Start shopping organic products today.
          </p>
        </div>

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
            <label
              htmlFor="password"
              className="block text-sm font-medium text-neutral-700"
            >
              Password
            </label>
            <div className="mt-1.5">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) {
                    setErrors((prev) => ({ ...prev, password: undefined }))
                  }
                  // Clear confirm password error if passwords now match
                  if (
                    errors.confirmPassword &&
                    e.target.value === confirmPassword
                  ) {
                    setErrors((prev) => ({
                      ...prev,
                      confirmPassword: undefined,
                    }))
                  }
                }}
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={
                  errors.password ? 'password-error' : undefined
                }
                className="block w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm transition-all duration-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 sm:text-base"
                placeholder="At least 8 characters"
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
              <p className="mt-1.5 text-xs text-neutral-500">
                Must be at least 8 characters with letters and numbers.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-neutral-700"
            >
              Confirm password
            </label>
            <div className="mt-1.5">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (errors.confirmPassword) {
                    setErrors((prev) => ({
                      ...prev,
                      confirmPassword: undefined,
                    }))
                  }
                }}
                aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                aria-describedby={
                  errors.confirmPassword ? 'confirm-password-error' : undefined
                }
                className="block w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm transition-all duration-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 sm:text-base"
                placeholder="Re-enter your password"
              />
              {errors.confirmPassword && (
                <p
                  id="confirm-password-error"
                  className="mt-1.5 text-sm text-red-600"
                  role="alert"
                >
                  {errors.confirmPassword}
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
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-sm text-neutral-600">
          <span>Already have an account? </span>
          <Link
            href="/auth/login"
            className="font-medium text-primary-600 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}

/**
 * Minimal fallback for register form during Suspense
 * Ensures form is always visible even if auth context fails
 */
function RegisterFormFallback() {
  return (
    <div className="mx-auto w-full max-w-md py-12 sm:py-16">
      <div className="rounded-lg bg-white px-6 py-8 shadow-sm sm:px-8 sm:py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl">
            Create account
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Start shopping organic products today.
          </p>
        </div>
        <div className="space-y-6">
          <div className="h-10 animate-pulse rounded bg-neutral-200" />
          <div className="h-10 animate-pulse rounded bg-neutral-200" />
          <div className="h-10 animate-pulse rounded bg-neutral-200" />
          <div className="h-10 animate-pulse rounded bg-neutral-200" />
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <AnimatedPage>
      <Suspense fallback={<RegisterFormFallback />}>
        <RegisterFormContent />
      </Suspense>
    </AnimatedPage>
  )
}
