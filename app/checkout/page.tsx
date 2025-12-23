import { Metadata } from 'next'
import RequireAuth from '@/components/auth/RequireAuth'
import CheckoutReviewContent from '@/components/checkout/CheckoutReviewContent'

export const metadata: Metadata = {
  title: 'Review Order | Millets N Joy',
  description: 'Review your order before checkout',
}

export default function CheckoutPage() {
  return (
    <RequireAuth>
      <CheckoutReviewContent />
    </RequireAuth>
  )
}

