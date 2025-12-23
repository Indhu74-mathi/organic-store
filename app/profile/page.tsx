import RequireAuth from '@/components/auth/RequireAuth'

export default function ProfilePage() {
  return (
    <RequireAuth>
      <div>My Profile</div>
    </RequireAuth>
  )
}
