import RequireAuth from '@/components/auth/RequireAuth'
import OrdersListContent from '@/components/orders/OrdersListContent'

export default function OrdersPage() {
  return (
    <RequireAuth>
      <OrdersListContent />
    </RequireAuth>
  )
}
