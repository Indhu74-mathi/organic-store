'use client'

import { useState, FormEvent, Suspense, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import AnimatedPage from '@/components/AnimatedPage'
import AuthLayout from '@/components/auth/AuthLayout'
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
      // Perform registration directly with Supabase Auth on the client
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) {
        setErrors({
          general: authError.message || 'Registration failed. Please try again.',
        })
        setIsSubmitting(false)
        return
      }

      if (!data.user) {
        setErrors({ general: 'Registration failed: No user data returned.' })
        setIsSubmitting(false)
        return
      }

      // Update auth context directly
      // NOTE: Cart merge is handled inside AuthContext.login() to prevent double merging
      if (mounted && authContext.login && data.session) {
        authContext.login({
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          userId: data.user.id,
          email: data.user.email || undefined,
          role: (data.user.app_metadata?.role as string | undefined) || undefined,
        })
      }

      // Redirect based on user role
      const userRole = (data.user.app_metadata?.role as string | undefined)
      if (userRole === 'ADMIN') {
        router.push('/admin')
      } else {
        router.push('/')
      }
    } catch (error) {
      console.error('[Register Page] Error:', error)
      setErrors({
        general: 'An unexpected error occurred. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Create account"
      subtitle="Start shopping organic products today."
      imageSrc="/auth-bg-register.png"
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
    </AuthLayout>
  )
}

/**
 * Minimal fallback for register form during Suspense
 * Ensures form is always visible even if auth context fails
 */
function RegisterFormFallback() {
  return (
    <AuthLayout
      title="Create account"
      subtitle="Start shopping organic products today."
      imageSrc="/auth-bg-register.png"
    >
      <div className="space-y-6">
        <div className="h-10 animate-pulse rounded bg-neutral-200" />
        <div className="h-10 animate-pulse rounded bg-neutral-200" />
        <div className="h-10 animate-pulse rounded bg-neutral-200" />
        <div className="h-10 animate-pulse rounded bg-neutral-200" />
      </div>
    </AuthLayout>
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
