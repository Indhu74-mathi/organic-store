import RequireAuth from '@/components/auth/RequireAuth'
import AdminOrderDetailContent from '@/components/admin/AdminOrderDetailContent'

interface AdminOrderDetailPageProps {
  params: {
    orderId: string
  }
}

export default function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  return (
    <RequireAuth>
      <AdminOrderDetailContent orderId={params.orderId} />
    </RequireAuth>
  )
}

