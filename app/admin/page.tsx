import RequireAuth from '@/components/auth/RequireAuth'
import AdminDashboardContent from '@/components/admin/AdminDashboardContent'

export default function AdminDashboardPage() {
  return (
    <RequireAuth>
      <AdminDashboardContent />
    </RequireAuth>
  )
}

