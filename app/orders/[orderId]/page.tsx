import RequireAuth from '@/components/auth/RequireAuth'
import OrderDetailContent from '@/components/orders/OrderDetailContent'

interface OrderDetailPageProps {
  params: {
    orderId: string
  }
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  return (
    <RequireAuth>
      <OrderDetailContent orderId={params.orderId} />
    </RequireAuth>
  )
}

