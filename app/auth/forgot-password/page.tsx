'use client'

import { useState, FormEvent, Suspense } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import AnimatedPage from '@/components/AnimatedPage'
import AuthLayout from '@/components/auth/AuthLayout'

/**
 * ForgotPasswordFormContent - Core form component
 */
function ForgotPasswordFormContent() {
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<{
    email?: string
    general?: string
  }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrors({})
    setIsSuccess(false)

    const emailError = validateEmail(email)

    if (emailError) {
      setErrors({ email: emailError })
      return
    }

    setIsSubmitting(true)

    try {
      // Get the current URL to construct the redirect URL
      const redirectUrl = `${window.location.origin}/auth/reset-password`

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      })

      if (error) {
        // Don't reveal if email exists or not for security
        // Show success message regardless
        console.error('[Forgot Password] Error:', error)
        setIsSuccess(true)
      } else {
        setIsSuccess(true)
      }
    } catch (error) {
      console.error('[Forgot Password] Unexpected error:', error)
      setIsSuccess(true) // Show success for security (don't reveal if email exists)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              Check your email
            </h1>
            <p className="mt-4 text-base text-neutral-600">
              If an account exists with <strong>{email}</strong>, we&apos;ve sent you a password reset link.
            </p>
            <p className="mt-2 text-sm text-neutral-500">
              Please check your inbox and click the link to reset your password. The link will expire in 1 hour.
            </p>
            <div className="mt-6">
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-primary-600/20 transition-all duration-200 hover:bg-primary-700 hover:shadow-md hover:shadow-primary-600/30 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Enter your email address and we'll send you a link to reset your password."
      imageSrc="/auth-bg-forgot.png"
    >

      <form onSubmit={handleSubmit} className="mt-8 space-y-6" noValidate>
        {errors.general && (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
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
              placeholder="Enter your email"
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
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-primary-600/20 transition-all duration-200 hover:bg-primary-700 hover:shadow-md hover:shadow-primary-600/30 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
          >
            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center text-sm text-neutral-600">
        <Link
          href="/auth/login"
          className="font-medium text-primary-600 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
        >
          Back to Sign In
        </Link>
      </div>
    </AuthLayout>
  )
}

/**
 * Minimal fallback for forgot password form during Suspense
 */
function ForgotPasswordFormFallback() {
  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Enter your email address and we'll send you a link to reset your password."
      imageSrc="/auth-bg-forgot.png"
    >
      <div className="mt-8">
        <div className="h-12 w-full animate-pulse rounded-xl bg-neutral-200" />
      </div>
    </AuthLayout>
  )
}

export default function ForgotPasswordPage() {
  return (
    <AnimatedPage>
      <Suspense fallback={<ForgotPasswordFormFallback />}>
        <ForgotPasswordFormContent />
      </Suspense>
    </AnimatedPage>
  )
}

