'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/AuthContext'
import { useRouter } from 'next/navigation'
import AnimatedPage from '@/components/AnimatedPage'
import AdminProductsList from '@/components/admin/AdminProductsList'
import AdminOrdersList from '@/components/admin/AdminOrdersList'

export default function AdminDashboardContent() {
  const { accessToken, isAuthenticated, user, role } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    // SECURITY: Check if user is admin
    // Note: This is a client-side check. Server-side APIs enforce admin role.
    // Use role from state or user object
    const userRole = role || user?.role
    if (userRole !== 'ADMIN') {
      router.push('/')
      return
    }
  }, [mounted, isAuthenticated, user, role, router])

  if (!mounted || !isAuthenticated) {
    return (
      <AnimatedPage>
        <section className="py-10 sm:py-12 lg:py-16">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-600" />
              <p className="text-sm text-neutral-600">Loading...</p>
            </div>
          </div>
        </section>
      </AnimatedPage>
    )
  }

  // SECURITY: Check if user is admin
  const userRole = role || user?.role
  if (userRole !== 'ADMIN') {
    return (
      <AnimatedPage>
        <section className="py-10 sm:py-12 lg:py-16">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-600" />
              <p className="text-sm text-neutral-600">Loading...</p>
            </div>
          </div>
        </section>
      </AnimatedPage>
    )
  }

  return (
    <AnimatedPage>
      <section className="py-10 sm:py-12 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
              Admin Dashboard
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Manage products, inventory, and orders
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-neutral-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('products')}
                className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'products'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700'
                }`}
              >
                Products
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'orders'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700'
                }`}
              >
                Orders
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'products' && <AdminProductsList accessToken={accessToken} />}
          {activeTab === 'orders' && <AdminOrdersList accessToken={accessToken} />}
        </div>
      </section>
    </AnimatedPage>
  )
}

