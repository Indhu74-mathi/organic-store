'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthContext'
import AnimatedPage from '@/components/AnimatedPage'

interface OrderItem {
  productName: string
  quantity: number
  unitPrice: number
}

interface Order {
  orderId: string
  status: string
  totalAmount: number
  currency: string
  createdAt: string
  paidAt: string | null
  items: OrderItem[]
  paymentStatus: string
}

interface OrdersListContentProps {
  initialOrders?: Order[]
  initialTotal?: number
}

export default function OrdersListContent({
  initialOrders = [],
  initialTotal = 0,
}: OrdersListContentProps) {
  const router = useRouter()
  const { accessToken, isAuthenticated } = useAuth()
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [total, setTotal] = useState(initialTotal)
  const [isLoading, setIsLoading] = useState(initialOrders.length === 0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      router.push('/auth/login')
      return
    }

    if (initialOrders.length > 0) {
      // Already have initial data
      return
    }

    const fetchOrders = async () => {
      try {
        const response = await fetch('/api/orders', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!response.ok) {
          setError('Failed to load orders')
          return
        }

        const data = await response.json()
        setOrders(data.orders)
        setTotal(data.total)
      } catch (err) {
        console.error('[Orders List]', err)
        setError('Failed to load orders')
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrders()
  }, [accessToken, isAuthenticated, router, initialOrders.length])

  const getStatusBadge = (status: string) => {
    const baseClasses = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold'
    switch (status) {
      case 'ORDER_CONFIRMED':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'PAYMENT_SUCCESS':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'SHIPPED':
        return `${baseClasses} bg-blue-100 text-blue-800`
      case 'DELIVERED':
        return `${baseClasses} bg-primary-100 text-primary-800`
      case 'PAYMENT_PENDING':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'ORDER_CREATED':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'PAYMENT_FAILED':
        return `${baseClasses} bg-red-100 text-red-800`
      case 'CANCELLED':
        return `${baseClasses} bg-red-100 text-red-800`
      default:
        return `${baseClasses} bg-neutral-100 text-neutral-800`
    }
  }

  if (isLoading) {
    return (
      <AnimatedPage>
        <section className="py-10 sm:py-12 lg:py-16">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-600" />
              <p className="text-sm text-neutral-600">Loading orders...</p>
            </div>
          </div>
        </section>
      </AnimatedPage>
    )
  }

  if (error) {
    return (
      <AnimatedPage>
        <section className="py-10 sm:py-12 lg:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
              Error Loading Orders
            </h1>
            <p className="mt-3 text-sm text-neutral-600 sm:text-base">{error}</p>
          </div>
        </section>
      </AnimatedPage>
    )
  }

  if (orders.length === 0) {
    return (
      <AnimatedPage>
        <section className="py-10 sm:py-12 lg:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
              No Orders Yet
            </h1>
            <p className="mt-3 text-sm text-neutral-600 sm:text-base">
              You haven&apos;t placed any orders yet. Start shopping to see your orders here.
            </p>
            <Link
              href="/shop"
              className="mt-6 inline-block rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            >
              Browse Products
            </Link>
          </div>
        </section>
      </AnimatedPage>
    )
  }

  return (
    <AnimatedPage>
      <section className="py-10 sm:py-12 lg:py-16">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
              My Orders
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              {total} {total === 1 ? 'order' : 'orders'} total
            </p>
          </div>

          <div className="space-y-4">
            {orders.map((order) => {
              const totalInRupees = order.totalAmount / 100
              const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
              const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })

              return (
                <Link
                  key={order.orderId}
                  href={`/orders/${order.orderId}`}
                  className="block rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <span className={getStatusBadge(order.status)}>{order.status}</span>
                        <span className="text-sm text-neutral-600">{orderDate}</span>
                      </div>
                      <p className="text-sm font-medium text-neutral-900">
                        Order #{order.orderId.substring(0, 8)}
                      </p>
                      <p className="mt-1 text-sm text-neutral-600">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'} • {order.items.length}{' '}
                        {order.items.length === 1 ? 'product' : 'products'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-neutral-900">
                        ₹{totalInRupees.toFixed(2)}
                      </p>
                      <p className="text-xs text-neutral-500">View Details →</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>
    </AnimatedPage>
  )
}

