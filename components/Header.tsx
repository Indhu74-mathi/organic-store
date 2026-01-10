'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthContext'
import { useCart } from '@/components/cart/CartContext'

/**
 * Global Header Component
 *
 * Features:
 * - Sticky header with backdrop blur
 * - Brand name/logo on left
 * - Authentication-aware navigation
 *   - When NOT logged in: Shop, Login, Register
 *   - When logged in: Shop, My Account, Logout
 * - Mobile hamburger menu
 * - Accessible navigation
 * - Subtle transitions
 *
 * CRITICAL: Logout does NOT clear cart (handled by AuthContext)
 */

export default function Header() {
  // Mounted state to prevent hydration mismatches
  // Only access auth state after client-side mount
  const [mounted, setMounted] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  // Always call hooks unconditionally (React rules)
  // But guard usage of auth state until after mount
  const authContext = useAuth()
  const cartContext = useCart()

  // Mark component as mounted after client-side hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  // Only use auth state after mount to avoid SSR/localStorage issues
  // During SSR and initial render, treat as not authenticated
  const isAuthenticated = mounted ? authContext.isAuthenticated : false
  const isLoading = mounted ? authContext.isLoading : true
  const userEmail = mounted ? authContext.email : null
  const userRole = mounted ? authContext.role : null
  const logout = authContext.logout
  const isAdmin = userRole === 'ADMIN'

  // Hide cart and shop links on admin pages
  const isAdminPage = pathname?.startsWith('/admin')

  // Cart state - only access after mount
  const cartItems = mounted ? cartContext.items : []
  const cartToggle = mounted ? cartContext.toggle : () => { }
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile menu is open (only after mount)
  useEffect(() => {
    if (!mounted) return

    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen, mounted])

  const handleLogout = () => {
    // CRITICAL: logout() does NOT clear cart (handled by AuthContext)
    if (logout) {
      logout()
    }
    setIsMobileMenuOpen(false)
  }

  const isActive = (href: string) => pathname === href

  // Safe fallback header during SSR and initial render
  // This ensures consistent HTML between server and client
  if (!mounted || isLoading) {
    return (
      <header
        className="sticky top-0 z-50 w-full backdrop-blur-md"
        style={{
          border: 'none',
          boxShadow: 'none',
          backgroundColor: 'rgba(246, 251, 247, 0.85)'
        }}
        role="banner"
      >
        <div className="flex items-center w-full">
          {/* Brand/Logo - Absolute left */}
          <div className="flex items-center shrink-0">
            <Link
              href="/"
              className="relative h-12 w-[200px] sm:h-14 sm:w-[300px] md:h-16 md:w-[400px] lg:w-[500px] transition-opacity hover:opacity-80 focus:outline-none overflow-hidden"
              aria-label="Millets N Joy home"
            >
              <Image
                src="/Logo.png"
                alt="Millets N Joy"
                fill
                className="object-contain rounded-full"
                priority
              />
            </Link>
          </div>

          <nav
            className="flex-1 flex items-center justify-end gap-6 pr-6 py-5 sm:pr-8 lg:pr-10"
            aria-label="Main navigation"
          >
            <div className="hidden items-center gap-6 md:flex">
              {/* Shop link - safe to show during SSR */}
              <Link
                href="/shop"
                aria-label="Browse organic products"
                className="text-sm font-medium text-neutral-700 transition-colors duration-200 hover:text-primary-600 focus:outline-none rounded"
              >
                Shop
              </Link>
              {/* Loading placeholder for auth links and cart */}
              <div className="ml-4 flex items-center gap-6 border-l border-neutral-200 pl-6 opacity-60">
                <div className="h-4 w-12 animate-pulse rounded bg-neutral-200" />
                <div className="h-4 w-16 animate-pulse rounded bg-neutral-200" />
                <div className="h-6 w-6 animate-pulse rounded-full bg-neutral-200" />
              </div>
            </div>
            {/* Mobile menu button - safe to show during SSR */}
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg p-2 text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none md:hidden"
              aria-label="Open menu"
              disabled
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </nav>
        </div>
      </header>
    )
  }

  return (
    <header
      className="sticky top-0 z-50 w-full backdrop-blur-md bg-background/85 border-b border-border/40"
      style={{
        boxShadow: 'none',
      }}
      role="banner"
    >
      <div className="flex items-center w-full">
        {/* Brand/Logo - Absolute left */}
        <div className="flex items-center shrink-0">
          <Link
            href="/"
            className="relative h-12 w-[200px] sm:h-14 sm:w-[300px] md:h-16 md:w-[400px] lg:w-[500px] transition-opacity hover:opacity-80 focus:outline-none overflow-hidden"
            aria-label="Millets N Joy home"
          >
            <Image
              src="/Logo.jpeg"
              alt="Millets N Joy"
              fill
              className="object-contain rounded-full"
              priority
            />
          </Link>
        </div>

        <nav
          className="flex-1 flex items-center justify-end gap-2 pr-2 py-5 sm:gap-4 sm:pr-4 md:gap-6 md:pr-6 lg:pr-10"
          aria-label="Main navigation"
        >

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-6 md:flex">
            {/* Shop link - hidden on admin pages */}
            {!isAdminPage && (
              <>
                <Link
                  href="/shop"
                  aria-label="Browse organic products"
                  className={`text-sm font-medium transition-colors duration-200 focus:outline-none rounded ${isActive('/shop')
                    ? 'text-primary-600'
                    : 'text-neutral-700 hover:text-primary-600'
                    }`}
                >
                  Shop
                </Link>
                <Link
                  href="/blog"
                  aria-label="Read health and nutrition articles"
                  className={`text-sm font-medium transition-colors duration-200 focus:outline-none rounded ${pathname?.startsWith('/blog')
                    ? 'text-primary-600'
                    : 'text-neutral-700 hover:text-primary-600'
                    }`}
                >
                  Blog
                </Link>
                {/* Orders link - only for authenticated users, not admins */}
                {isAuthenticated && !isAdmin && (
                  <Link
                    href="/orders"
                    aria-label="View my orders"
                    className={`text-sm font-medium transition-colors duration-200 focus:outline-none rounded ${isActive('/orders')
                      ? 'text-primary-600'
                      : 'text-neutral-700 hover:text-primary-600'
                      }`}
                  >
                    Orders
                  </Link>
                )}
              </>
            )}

            {/* Right-side navigation: Auth → Cart Icon */}
            <div className="ml-4 flex items-center gap-6 border-l border-neutral-200 pl-6">
              {/* Auth-aware navigation with smooth transitions */}
              <div className="flex items-center gap-4 transition-opacity duration-200">
                {isAuthenticated ? (
                  <>
                    {/* User email or icon */}
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700">
                        {userEmail ? (
                          userEmail.charAt(0).toUpperCase()
                        ) : (
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        )}
                      </div>
                      {userEmail && (
                        <span className="text-sm font-medium text-neutral-700 max-w-[120px] truncate">
                          {userEmail}
                        </span>
                      )}
                    </div>
                    {/* Logout button */}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="text-sm font-medium text-neutral-700 transition-colors duration-200 hover:text-primary-600 focus:outline-none rounded"
                      aria-label="Sign out"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    {/* Login link */}
                    <Link
                      href="/auth/login"
                      aria-label="Sign in to your account"
                      className={`text-sm font-medium transition-colors duration-200 focus:outline-none rounded ${isActive('/auth/login')
                        ? 'text-primary-600'
                        : 'text-neutral-700 hover:text-primary-600'
                        }`}
                    >
                      Login
                    </Link>
                    {/* Register link */}
                    <Link
                      href="/auth/register"
                      aria-label="Create a new account"
                      className={`text-sm font-medium transition-colors duration-200 focus:outline-none rounded ${isActive('/auth/register')
                        ? 'text-primary-600'
                        : 'text-neutral-700 hover:text-primary-600'
                        }`}
                    >
                      Register
                    </Link>
                  </>
                )}
              </div>

              {/* Cart Icon with Badge - hidden on admin pages */}
              {!isAdminPage && (
                <button
                  type="button"
                  onClick={cartToggle}
                  aria-label={`Shopping cart with ${cartCount} items`}
                  className="relative inline-flex items-center justify-center rounded-lg p-2 text-neutral-700 transition-all duration-200 hover:bg-neutral-100 hover:scale-105 focus:outline-none"
                >
                  {/* Shopping Cart SVG Icon */}
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                    />
                  </svg>

                  {/* Cart Count Badge */}
                  {cartCount > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary-600 px-1.5 text-xs font-semibold text-white shadow-sm">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Mobile: Cart Icon + Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            {/* Cart Icon for Mobile - hidden on admin pages */}
            {!isAdminPage && (
              <button
                type="button"
                onClick={cartToggle}
                aria-label={`Shopping cart with ${cartCount} items`}
                className="relative inline-flex items-center justify-center rounded-lg p-2 text-neutral-700 transition-all duration-200 hover:bg-neutral-100 hover:scale-105 focus:outline-none"
              >
                {/* Shopping Cart SVG Icon */}
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                  />
                </svg>

                {/* Cart Count Badge */}
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary-600 px-1.5 text-xs font-semibold text-white shadow-sm">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              className="inline-flex items-center justify-center rounded-lg p-2 text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              <span className="sr-only">{isMobileMenuOpen ? 'Close' : 'Open'} menu</span>
              {isMobileMenuOpen ? (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div
          id="mobile-menu"
          className="backdrop-blur-md md:hidden animate-fade-in"
          style={{
            border: 'none',
            backgroundColor: 'rgba(246, 251, 247, 0.85)'
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
        >
          <div className="px-4 py-4 space-y-1">
            {/* Shop link - hidden on admin pages */}
            {!isAdminPage && (
              <>
                <Link
                  href="/shop"
                  aria-label="Browse organic products"
                  className={`block rounded-md px-3 py-2 text-base font-medium transition-colors duration-200 focus:outline-none ${isActive('/shop')
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-neutral-700 hover:bg-neutral-50 hover:text-primary-600'
                    }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Shop
                </Link>
                <Link
                  href="/blog"
                  aria-label="Read health and nutrition articles"
                  className={`block rounded-md px-3 py-2 text-base font-medium transition-colors duration-200 focus:outline-none ${pathname?.startsWith('/blog')
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-neutral-700 hover:bg-neutral-50 hover:text-primary-600'
                    }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Blog
                </Link>
                {/* Orders link - only for authenticated users, not admins */}
                {isAuthenticated && !isAdmin && (
                  <Link
                    href="/orders"
                    aria-label="View my orders"
                    className={`block rounded-md px-3 py-2 text-base font-medium transition-colors duration-200 focus:outline-none ${isActive('/orders')
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-neutral-700 hover:bg-neutral-50 hover:text-primary-600'
                      }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Orders
                  </Link>
                )}
              </>
            )}

            {/* Auth-aware navigation */}
            {isAuthenticated ? (
              <>
                {/* User email display */}
                <div className="flex items-center gap-2 rounded-md px-3 py-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700">
                    {userEmail ? (
                      userEmail.charAt(0).toUpperCase()
                    ) : (
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    )}
                  </div>
                  {userEmail && (
                    <span className="text-sm font-medium text-neutral-700 truncate">
                      {userEmail}
                    </span>
                  )}
                </div>
                {/* Logout button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full rounded-md px-3 py-2 text-left text-base font-medium text-neutral-700 transition-colors duration-200 hover:bg-neutral-50 hover:text-primary-600 focus:outline-none"
                  aria-label="Sign out"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                {/* Login link */}
                <Link
                  href="/auth/login"
                  aria-label="Sign in to your account"
                  className={`block rounded-md px-3 py-2 text-base font-medium transition-colors duration-200 focus:outline-none ${isActive('/auth/login')
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-neutral-700 hover:bg-neutral-50 hover:text-primary-600'
                    }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Login
                </Link>
                {/* Register link */}
                <Link
                  href="/auth/register"
                  aria-label="Create a new account"
                  className={`block rounded-md px-3 py-2 text-base font-medium transition-colors duration-200 focus:outline-none ${isActive('/auth/register')
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-neutral-700 hover:bg-neutral-50 hover:text-primary-600'
                    }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

