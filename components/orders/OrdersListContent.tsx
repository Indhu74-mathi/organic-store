'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthContext'
import AnimatedPage from '@/components/AnimatedPage'
import { formatDateShortIST } from '@/lib/utils'

interface OrderItem {
  productName: string
  quantity: number
  unitPrice: number
}

interface Order {
  id: string
  status: string
  totalAmount: number
  currency: string
  createdAt: string
  paidAt?: string | null
  items?: OrderItem[]
  itemCount?: number // Item count from API
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
  const [, setTotal] = useState(initialTotal)
  const [isLoading, setIsLoading] = useState(initialOrders.length === 0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      router.push('/auth/login')
      return
    }

    if (initialOrders.length > 0) return

    const fetchOrders = async () => {
      try {
        const response = await fetch('/api/orders', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        if (!response.ok) {
          setError('Failed to load orders')
          return
        }

        const data = await response.json()
        setOrders(data.orders ?? [])
        setTotal(data.total ?? 0)
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
    const base =
      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold'
    switch (status) {
      case 'ORDER_CONFIRMED':
      case 'PAYMENT_SUCCESS':
        return `${base} bg-green-100 text-green-800`
      case 'SHIPPED':
        return `${base} bg-blue-100 text-blue-800`
      case 'DELIVERED':
        return `${base} bg-primary-100 text-primary-800`
      case 'PAYMENT_PENDING':
      case 'ORDER_CREATED':
        return `${base} bg-yellow-100 text-yellow-800`
      case 'PAYMENT_FAILED':
      case 'CANCELLED':
        return `${base} bg-red-100 text-red-800`
      default:
        return `${base} bg-neutral-100 text-neutral-800`
    }
  }

  if (isLoading) {
    return (
      <AnimatedPage>
        <section className="py-16 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-600" />
          <p className="mt-4 text-sm text-neutral-600">Loading orders...</p>
        </section>
      </AnimatedPage>
    )
  }

  if (error) {
    return (
      <AnimatedPage>
        <section className="py-16 text-center">
          <h1 className="text-2xl font-semibold">Error Loading Orders</h1>
          <p className="mt-2 text-neutral-600">{error}</p>
        </section>
      </AnimatedPage>
    )
  }

  if (orders.length === 0) {
    return (
      <AnimatedPage>
        <section className="py-16 text-center">
          <h1 className="text-2xl font-semibold">No Orders Yet</h1>
          <p className="mt-2 text-neutral-600">
            You haven&apos;t placed any orders yet.
          </p>
          <Link
            href="/shop"
            className="mt-6 inline-block rounded-full bg-primary-600 px-6 py-3 text-sm font-semibold text-white"
          >
            Browse Products
          </Link>
        </section>
      </AnimatedPage>
    )
  }

  return (
    <AnimatedPage>
      <section className="py-16">
        <div className="mx-auto max-w-4xl space-y-4">
          {orders.map((order) => {
            // Use itemCount from API if available, otherwise calculate from items array
            const itemCount = order.itemCount ?? (order.items?.reduce(
              (sum, item) => sum + item.quantity,
              0
            ) ?? 0)
            // totalAmount from API is already in rupees (converted from paise)
            const totalInRupees = order.totalAmount
            const orderDate = formatDateShortIST(order.createdAt)

            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md"
              >
                <div className="flex justify-between">
                  <div>
                    <div className="mb-2 flex gap-3">
                      <span className={getStatusBadge(order.status)}>
                        {order.status}
                      </span>
                      <span className="text-sm text-neutral-600">
                        {orderDate}
                      </span>
                    </div>
                    <p className="font-medium">
                      Order #{order.id?.slice(0, 8) || 'N/A'}
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      ₹{totalInRupees.toFixed(2)}
                    </p>
                    <p className="text-xs text-neutral-500">View Details →</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </AnimatedPage>
  )
}
