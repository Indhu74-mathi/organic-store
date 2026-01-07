'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthContext'
import { useState, useEffect } from 'react'

export default function FloatingShopButton() {
  const pathname = usePathname()
  const { role, user } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [isFooterVisible, setIsFooterVisible] = useState(false)

  useEffect(() => {
    setMounted(true)

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          setIsFooterVisible(entry.isIntersecting)
        }
      },
      { threshold: 0.1 }
    )

    const footer = document.getElementById('main-footer')
    if (footer) {
      observer.observe(footer)
    }

    return () => {
      if (footer) {
        observer.unobserve(footer)
      }
    }
  }, [])

  // Hide on admin pages
  const isAdminPage = pathname?.startsWith('/admin')
  const userRole = mounted ? (role || user?.role) : null
  const isAdmin = userRole === 'ADMIN'

  if (isAdminPage || isAdmin) {
    return null
  }

  return (
    <div
      className={`pointer-events-none fixed right-6 z-40 transition-all duration-500 ease-in-out mb-[env(safe-area-inset-bottom)] mr-[env(safe-area-inset-right)] sm:right-8 ${isFooterVisible ? 'bottom-[360px] sm:bottom-[310px]' : 'bottom-6 sm:bottom-4'
        }`}
    >
      <Link
        href="/shop"
        aria-label="Shop organic food"
        className="group pointer-events-auto inline-flex items-center justify-center gap-2 rounded-full bg-primary-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 transition-all duration-300 ease-smooth hover:bg-primary-700 hover:shadow-xl hover:shadow-primary-600/35 hover:-translate-y-0.5 focus:outline-none sm:px-7 sm:py-4"
      >
        <svg
          className="h-5 w-5 transition-transform duration-300 group-hover:scale-110"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
        <span>Shop Now</span>
      </Link>
    </div>
  )
}


