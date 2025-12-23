'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface OrderItem {
  productName: string
  quantity: number
  unitPrice: number
}

interface Order {
  orderId: string
  userId: string
  userEmail: string
  status: string
  totalAmount: number
  currency: string
  createdAt: string
  paidAt: string | null
  items: OrderItem[]
  paymentStatus: string
  hasPayment: boolean
}

interface AdminOrdersListProps {
  accessToken: string | null
}

export default function AdminOrdersList({ accessToken }: AdminOrdersListProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => {
    if (!accessToken) return

    const fetchOrders = async () => {
      try {
        const url = statusFilter
          ? `/api/admin/orders?status=${statusFilter}`
          : '/api/admin/orders'
        const response = await fetch(url, {
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
      } catch (err) {
        console.error('[Admin Orders]', err)
        setError('Failed to load orders')
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrders()
  }, [accessToken, statusFilter])

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
      case 'REFUNDED':
        return `${baseClasses} bg-purple-100 text-purple-800`
      default:
        return `${baseClasses} bg-neutral-100 text-neutral-800`
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-600" />
          <p className="text-sm text-neutral-600">Loading orders...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {error}
      </div>
    )
  }

  return (
    <div>
      {/* Header and Filter */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            Orders Dashboard
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Manage all customer orders
          </p>
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Statuses</option>
            <option value="ORDER_CREATED">Order Created</option>
            <option value="PAYMENT_PENDING">Payment Pending</option>
            <option value="PAYMENT_FAILED">Payment Failed</option>
            <option value="ORDER_CONFIRMED">Order Confirmed</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-sm font-medium text-neutral-900">No orders found</p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {statusFilter ? 'Try adjusting your filter' : 'Orders will appear here once customers place them'}
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const totalInRupees = order.totalAmount / 100
                  return (
                    <tr key={order.orderId}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-neutral-900">
                        #{order.orderId.substring(0, 8)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                        {order.userEmail}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={getStatusBadge(order.status)}>{order.status}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-neutral-900">
                        ₹{totalInRupees.toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <Link
                          href={`/admin/orders/${order.orderId}`}
                          className="font-medium text-primary-600 hover:text-primary-700"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

